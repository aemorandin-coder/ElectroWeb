import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { verificarPagoMovil, interpretarErrorBDV } from '@/lib/pago-movil/verificar-pago';
import { getBancoPorCodigo, validarReferencia, validarTelefonoVenezolano } from '@/lib/pago-movil/bancos-venezuela';
import { hoyCaracas, leerMontoBs, montoParaAPI } from '@/lib/pago-movil/monto';

// POST /api/admin/pago-movil/consultar (C-129): el equipo le pregunta al BDV por un Pago Móvil que un cliente dice
// haber hecho ("pagué y no me aparece"). Solo consulta: no crea verificaciones, no acredita saldo, no toca órdenes.
// Además dice si esa referencia ya se usó en la tienda y dónde. Queda en la bitácora.

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAuthorized(session, 'MANAGE_ORDERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!checkRateLimit(session.user.id, 'admin:pago-movil:consultar', RATE_LIMITS.STANDARD).success) {
    return NextResponse.json({ error: 'Demasiadas consultas. Espera un minuto.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const referencia = typeof body?.referencia === 'string' ? body.referencia.replace(/\D/g, '') : '';
  const bancoOrigen = typeof body?.bancoOrigen === 'string' ? body.bancoOrigen.trim() : '';
  const telefonoPagador = typeof body?.telefonoPagador === 'string' ? body.telefonoPagador.replace(/\D/g, '') : '';
  const cedulaPagador = typeof body?.cedulaPagador === 'string' ? body.cedulaPagador.trim().toUpperCase().replace(/[.\-\s]/g, '') : '';
  const fechaPago = typeof body?.fechaPago === 'string' ? body.fechaPago.slice(0, 10) : '';
  const importe = typeof body?.importe === 'number' ? body.importe : leerMontoBs(String(body?.importe ?? ''));

  if (!validarReferencia(referencia)) return NextResponse.json({ error: 'La referencia lleva de 4 a 8 dígitos' }, { status: 400 });
  if (!getBancoPorCodigo(bancoOrigen)) return NextResponse.json({ error: 'Elige el banco desde el que se pagó' }, { status: 400 });
  if (!validarTelefonoVenezolano(telefonoPagador)) return NextResponse.json({ error: 'Teléfono inválido. Ejemplo: 04121234567' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaPago) || fechaPago > hoyCaracas()) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  if (!importe || !(importe > 0)) return NextResponse.json({ error: 'Escribe el monto exacto en Bs.' }, { status: 400 });

  const resultado = await verificarPagoMovil({
    referencia,
    bancoOrigen,
    telefonoPagador,
    fechaPago,
    importe,
    cedulaPagador,
    reqCed: bancoOrigen === '0102' && Boolean(cedulaPagador),
  });

  // ¿Esa referencia ya pasó por la tienda? (mismo banco: la referencia la pone el banco que envía)
  const usos = await prisma.pagoMovilVerificacion.findMany({
    where: { referencia, bancoOrigen, verificado: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true, userId: true, contexto: true, orderId: true, transactionId: true, archivadoEn: true, archivadoNota: true,
      importeVerificado: true, createdAt: true,
    },
  });
  const [usuarios, ordenes] = await Promise.all([
    usos.length ? prisma.user.findMany({ where: { id: { in: [...new Set(usos.map((u) => u.userId))] } }, select: { id: true, name: true, email: true } }) : [],
    usos.some((u) => u.orderId) ? prisma.order.findMany({ where: { id: { in: usos.map((u) => u.orderId).filter((x): x is string => Boolean(x)) } }, select: { id: true, orderNumber: true } }) : [],
  ]);
  const usuario = new Map(usuarios.map((u) => [u.id, u]));
  const orden = new Map(ordenes.map((o) => [o.id, o.orderNumber]));

  await registrarAccionAdmin(session, 'PAGO_MOVIL_CONSULTADO', { type: 'PAYMENT_VERIFICATION', id: referencia }, {
    banco: bancoOrigen,
    monto: montoParaAPI(importe),
    fecha: fechaPago,
    encontrado: resultado.verified,
    codigoBDV: resultado.code,
  }, request);

  return NextResponse.json({
    encontrado: resultado.verified,
    codigo: resultado.code,
    // El texto del banco tal cual (para soporte) y la explicación para el equipo
    mensajeBanco: resultado.message,
    explicacion: resultado.verified ? 'El banco confirma el pago con esos datos.' : interpretarErrorBDV(resultado.code, resultado.message),
    montoBanco: resultado.verified ? leerMontoBs(String(resultado.amount ?? '')) ?? importe : null,
    consultado: { referencia, banco: getBancoPorCodigo(bancoOrigen)?.nombre ?? bancoOrigen, monto: montoParaAPI(importe), fecha: fechaPago },
    usos: usos.map((u) => ({
      cliente: usuario.get(u.userId) ?? null,
      contexto: u.contexto,
      orden: u.orderId ? orden.get(u.orderId) ?? u.orderId : null,
      recarga: u.transactionId,
      archivado: u.archivadoEn ? u.archivadoNota ?? 'Archivado' : null,
      montoBs: Number(u.importeVerificado ?? 0),
      fecha: u.createdAt.toISOString(),
    })),
  });
}
