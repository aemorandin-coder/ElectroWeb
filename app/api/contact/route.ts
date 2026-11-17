import { after, NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';
import { verifyCaptcha } from '@/lib/captcha';
import { emitAdminEvent } from '@/lib/admin-events';
import { sendEmail } from '@/lib/email-service';
import { correoContactoRecibido } from '@/lib/email-templates/servicio';
import { revisarAlLlegar } from '@/lib/ia/urgencia';
import { normalizarCorreo } from '@/lib/correo';

// C-285: el formulario de contacto, 10 mensajes cada 10 minutos por IP. El acuse al correo que escribe el visitante sale como
// mucho 5 veces cada 10 minutos por IP y 3 veces por hora a una misma dirección; pasado el tope, el mensaje se guarda igual y
// el acuse no sale.
const LIMITE_CONTACTO = { maxRequests: 10, windowSeconds: 10 * 60 };
const LIMITE_ACUSE_POR_IP = { maxRequests: 5, windowSeconds: 10 * 60 };
const LIMITE_ACUSE_POR_CORREO = { maxRequests: 3, windowSeconds: 60 * 60 };

// POST /api/contact - Submit contact form
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for contact form (prevents spam)
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, 'contact:submit', LIMITE_CONTACTO);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Has enviado demasiados mensajes. Intenta más tarde.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit, LIMITE_CONTACTO)
        }
      );
    }

    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // SEGURIDAD: el captcha se verifica en el servidor, no solo en el navegador
    const captcha = await verifyCaptcha(body?.captchaToken, clientIP);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: captcha.status });
    }

    // Validation
    if (!name || !email || !phone || !subject || !message) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }
    // Tipos y largos (C-73): antes un mensaje de varios MB o un objeto en lugar de texto llegaba a la base de datos
    if ([name, email, phone, subject, message].some((value) => typeof value !== 'string')
      || name.length > 100 || email.length > 150 || phone.length > 30 || subject.length > 150 || message.length > 5000
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Revisa los datos del formulario' }, { status: 400 });
    }

    // Save contact message to database
    const contact = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        status: 'PENDING', // PENDING, READ, RESPONDED
      },
    });

    // C-215: Claude le pone la urgencia después de responder (no hace esperar a quien escribe)
    after(() => revisarAlLlegar({ mensaje: contact.id }));

    emitAdminEvent({
      type: 'CONTACT_MESSAGE',
      title: `Mensaje de contacto · ${subject}`.slice(0, 150),
      summary: `${name} escribió desde el formulario de Contacto`,
      fields: [['Asunto', subject], ['Mensaje', message.slice(0, 600)], ['Correo', email], ['Teléfono', phone]],
      link: '/admin/inquiries',
    });

    // C-219: el acuse a quien escribió, con el diseño de la tienda. C-285: con tope por IP y por dirección (el de la dirección
    // solo cuenta cuando la IP pasó, es decir, cuando de verdad saldría un correo)
    const hayAcuse = checkRateLimit(clientIP, 'contact:acuse-ip', LIMITE_ACUSE_POR_IP).success
      && checkRateLimit(normalizarCorreo(email), 'contact:acuse-correo', LIMITE_ACUSE_POR_CORREO).success;
    if (hayAcuse) {
      void correoContactoRecibido({ nombre: name, asunto: subject })
        .then(({ asunto, html }) => sendEmail({ to: email, subject: asunto, html }))
        .catch((error) => console.error('Error enviando el acuse de contacto:', error));
    }

    return NextResponse.json(
      {
        message: 'Mensaje enviado exitosamente',
        contactId: contact.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error submitting contact form:', error);
    return NextResponse.json(
      { error: 'Error al enviar el mensaje' },
      { status: 500 }
    );
  }
}

// GET /api/contact - Get all messages (Admin only)
export async function GET() {
  try {
    // SEGURIDAD (C-70): antes bastaba cualquier sesión (un cliente leía y borraba los mensajes)
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // C-281 (A-08): con tope (antes, la tabla entera en cada carga). Los pendientes van todos, por viejos que sean: el
    // panel los filtra en la pantalla y no se pueden perder; del resto, los más nuevos
    const [pendientes, otros] = await Promise.all([
      prisma.contactMessage.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.contactMessage.findMany({ where: { status: { not: 'PENDING' } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);
    const messages = [...pendientes, ...otros].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Error al obtener mensajes' },
      { status: 500 }
    );
  }
}

// PATCH /api/contact - Update message status (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    // SEGURIDAD (C-70): antes bastaba cualquier sesión (un cliente leía y borraba los mensajes)
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID y estado son requeridos' },
        { status: 400 }
      );
    }
    // C-110: estados conocidos (antes cualquier texto)
    if (!['PENDING', 'READ', 'RESPONDED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Error al actualizar mensaje' },
      { status: 500 }
    );
  }
}

// DELETE /api/contact - Delete message (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    // SEGURIDAD (C-70): antes bastaba cualquier sesión (un cliente leía y borraba los mensajes)
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Mensaje eliminado' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Error al eliminar mensaje' },
      { status: 500 }
    );
  }
}
