import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/email-service';
import { correoPromotorAprobado, correoPromotorNoAprobado } from '@/lib/email-templates/comunidad';
import { aprobarSolicitudSchema, crearPromotor, PromotorError, rechazarSolicitudSchema } from '@/lib/influencer-admin';
import { DIAS_PARA_ACREDITAR } from '@/lib/influencer-commission';
import { nombrePorId } from '@/lib/edicion/servidor';

type Params = { params: Promise<{ id: string }> };

// C-167: aprobar (crea el promotor con su código y su cupón) o rechazar una solicitud. Avisa al cliente.
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const solicitud = await prisma.influencerApplication.findUnique({ where: { id }, include: { user: { select: { id: true, name: true, email: true } } } });
  if (!solicitud) return NextResponse.json({ error: 'La solicitud no existe' }, { status: 404 });
  if (solicitud.status !== 'PENDING') {
    const quien = await nombrePorId(solicitud.reviewedById);
    return NextResponse.json({ error: quien ? `${quien} ya atendió esta solicitud` : 'Esta solicitud ya se atendió', conflicto: 'ya_resuelto' }, { status: 409 });
  }
  const revisor = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (body?.action === 'reject') {
    const datos = rechazarSolicitudSchema.safeParse(body);
    if (!datos.success) return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    // Con condición: dos clics seguidos no la atienden dos veces
    const hecha = await prisma.influencerApplication.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'REJECTED', reviewNote: datos.data.note || null, reviewedAt: new Date(), reviewedById: revisor },
    });
    if (hecha.count === 0) return NextResponse.json({ error: 'Otra persona ya atendió esta solicitud', conflicto: 'ya_resuelto' }, { status: 409 });
    void createNotification({
      userId: solicitud.userId,
      type: 'PROMOTER_APPLICATION',
      title: 'Tu solicitud de promotor',
      message: datos.data.note ? `Por ahora no la aprobamos: ${datos.data.note}` : 'Por ahora no la aprobamos. Puedes volver a pedirla más adelante.',
      link: '/customer/referrals',
      icon: 'gift',
    });
    // C-219: también por correo (antes solo la campanita). La nota la escribe el equipo: se escapa en la plantilla
    if (solicitud.user.email) {
      const destino = solicitud.user.email;
      void correoPromotorNoAprobado({ nombre: solicitud.user.name, nota: datos.data.note || null })
        .then(({ asunto, html }) => sendEmail({ to: destino, subject: asunto, html }))
        .catch((error) => console.error('Error enviando el correo de promotor no aprobado:', error));
    }
    await registrarAccionAdmin(session, 'CREATOR_STATUS_CHANGED', { type: 'USER', id: solicitud.userId }, { programa: 'promotores', cambio: 'Solicitud rechazada', motivo: datos.data.note ?? null }, request);
    return NextResponse.json({ ok: true });
  }

  const datos = aprobarSolicitudSchema.safeParse(body);
  if (!datos.success) return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  try {
    const promotor = await crearPromotor({ userId: solicitud.userId, ...datos.data, notes: `Solicitud: ${solicitud.channels}`.slice(0, 500) });
    await prisma.influencerApplication.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: revisor } });

    void createNotification({
      userId: solicitud.userId,
      type: 'PROMOTER_APPLICATION',
      title: 'Ya eres promotor de ElectroShop',
      message: `Tu código es ${promotor.code}: tus seguidores reciben ${promotor.customerDiscountPercent} % de descuento y tú ganas ${Number(promotor.commissionRate)} % en Puntos ES.`,
      link: '/customer/referrals',
      icon: 'gift',
    });
    // C-219: la plantilla está en lib/email-templates/comunidad
    const correo = solicitud.user.email;
    if (correo) {
      void correoPromotorAprobado({
        nombre: solicitud.user.name,
        codigo: promotor.code,
        descuento: promotor.customerDiscountPercent,
        comision: Number(promotor.commissionRate),
        diasParaAcreditar: DIAS_PARA_ACREDITAR,
      })
        .then(({ asunto, html }) => sendEmail({ to: correo, subject: asunto, html }))
        .catch((error) => console.error('Error enviando el correo de promotor:', error));
    }

    await registrarAccionAdmin(session, 'CREATOR_STATUS_CHANGED', { type: 'USER', id: solicitud.userId }, {
      programa: 'promotores', cambio: 'Solicitud aprobada', codigo: promotor.code, comision: Number(promotor.commissionRate), descuentoCliente: promotor.customerDiscountPercent,
    }, request);
    return NextResponse.json({ ok: true, code: promotor.code });
  } catch (error) {
    if (error instanceof PromotorError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error aprobando la solicitud:', error);
    return NextResponse.json({ error: 'No se pudo aprobar la solicitud' }, { status: 500 });
  }
}
