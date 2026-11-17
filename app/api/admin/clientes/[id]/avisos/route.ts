import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { reenviarActivacion } from '@/lib/clientes/activacion';
import { armarMensaje, PLANTILLAS, type Plantilla } from '@/lib/clientes/plantillas';
import { enviarAUsuario } from '@/lib/email-templates/enviar';
import { botonCorreo, parrafoCorreo, urlTienda } from '@/lib/email-templates/estilo';
import { marcoCorreo } from '@/lib/email-templates/marco';
import { escapeHtml } from '@/lib/html';
import { createNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

// C-276: "Escribirle" desde la ficha de un cliente: un aviso a su campana, un correo con el marco de la tienda, o los dos.
// WhatsApp lo abre el navegador con el mensaje listo; aquí solo queda anotado. El texto lo arma el servidor con la
// plantilla (lib/clientes/plantillas.ts): del navegador solo se aceptan la plantilla, el pedido elegido (suyo) y, en el
// mensaje libre, el título, el mensaje y un enlace de la tienda. Queda en la bitácora (su ficha lo muestra).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const limite = checkRateLimit(session.user.id, 'admin:clientes:avisos', { maxRequests: 20, windowSeconds: 60 });
  if (!limite.success) return NextResponse.json({ error: 'Muchos avisos seguidos: espera un minuto.' }, { status: 429 });

  const { id } = await params;
  const cliente = await prisma.user.findFirst({ where: { id, role: 'USER' }, select: { id: true, name: true, email: true, emailVerified: true, profile: { select: { accountStatus: true } } } });
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const plantilla = body?.plantilla as Plantilla;
  if (!PLANTILLAS.includes(plantilla)) return NextResponse.json({ error: 'Elige qué le dices' }, { status: 400 });
  const canales = (body?.canales ?? {}) as Record<string, unknown>;
  const campana = canales.campana === true;
  const correo = canales.correo === true;
  const whatsapp = canales.whatsapp === true;
  if (!campana && !correo && !whatsapp) return NextResponse.json({ error: 'Elige por dónde se lo dices' }, { status: 400 });

  let pedido: { numero: string; estado: string } | null = null;
  if (plantilla === 'pedido') {
    const o = typeof body?.pedidoId === 'string' ? await prisma.order.findFirst({ where: { id: body.pedidoId, userId: cliente.id }, select: { orderNumber: true, status: true } }) : null;
    if (!o) return NextResponse.json({ error: 'Ese pedido no es de este cliente' }, { status: 400 });
    pedido = { numero: o.orderNumber, estado: o.status };
  }
  if (plantilla === 'activar' && cliente.emailVerified) return NextResponse.json({ error: 'Su correo ya está verificado' }, { status: 409 });
  // "Te enviamos de nuevo el enlace" solo es verdad si el enlace sale por correo
  if (plantilla === 'activar' && !correo) return NextResponse.json({ error: 'El enlace de activación sale por correo: márcalo' }, { status: 400 });

  const armado = armarMensaje(plantilla, {
    nombre: cliente.name, pedido,
    titulo: typeof body?.titulo === 'string' ? body.titulo : undefined,
    mensaje: typeof body?.mensaje === 'string' ? body.mensaje : undefined,
    enlace: typeof body?.enlace === 'string' ? body.enlace : null,
  });
  if ('error' in armado) return NextResponse.json({ error: armado.error }, { status: 400 });

  const resultado = { campana: false, correo: false, whatsapp };
  let notificacionId: string | null = null;
  if (campana) {
    const n = await createNotification({ userId: cliente.id, type: 'MENSAJE_EQUIPO', title: armado.titulo, message: armado.mensaje, link: armado.enlace ?? undefined });
    resultado.campana = n !== null;
    notificacionId = n?.id ?? null;
  }
  if (correo) {
    if (plantilla === 'activar') {
      // El correo de "Activa tu cuenta" es el de la activación, con su enlace nuevo
      const r = await reenviarActivacion(cliente.id);
      if (!r.ok && !campana) return NextResponse.json({ error: r.error }, { status: r.status });
      resultado.correo = r.ok;
    } else {
      resultado.correo = await enviarAUsuario(cliente.id, async ({ name }) => ({
        asunto: armado.asunto,
        html: await marcoCorreo({
          preheader: armado.mensaje,
          encabezado: { sello: 'MENSAJE DE ELECTRO SHOP', titulo: escapeHtml(armado.titulo), texto: name ? `Hola, ${escapeHtml(name.trim().split(/\s+/)[0])}.` : undefined },
          cuerpo: `${parrafoCorreo(escapeHtml(armado.mensaje))}${armado.enlace ? botonCorreo(`${urlTienda()}${armado.enlace}`, armado.boton ?? 'Ver más') : ''}`,
        }),
      }));
    }
  }

  await registrarAccionAdmin(session, 'CUSTOMER_NOTIFIED', { type: 'USER', id: cliente.id }, {
    notificacionId, plantilla, titulo: armado.titulo,
    canales: [resultado.campana && 'campana', resultado.correo && 'correo', whatsapp && 'whatsapp'].filter(Boolean),
  }, request);

  if (!resultado.campana && !resultado.correo && !whatsapp) {
    return NextResponse.json({ error: correo && cliente.profile?.accountStatus && cliente.profile.accountStatus !== 'ACTIVE' ? 'Su cuenta no está activa: no recibe correos' : 'No se pudo enviar' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ...resultado, mensaje: armado });
}
