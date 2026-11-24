import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { pedidoFacturaSchema } from '@/lib/contabilidad/esquemas';
import { periodoDe } from '@/lib/contabilidad/montos';
import { errorDeEsquema, LEER_FACTURAS, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { comprasSinFactura, emitirFactura, facturaPorId, facturasDelMes } from '@/lib/contabilidad/servidor';
import { rangoMes } from '@/lib/relacion-ventas';
import { publicarOrdenes } from '@/lib/realtime/bus';

/** GET /api/admin/contabilidad/facturas?mes=2026-11 (C-229): las facturas del mes y lo cobrado sin factura. */
export async function GET(request: NextRequest) {
  const s = await sesionCon(LEER_FACTURAS);
  if (s instanceof NextResponse) return s;
  const pedido = request.nextUrl.searchParams.get('mes');
  const mes = pedido && rangoMes(pedido) ? pedido : periodoDe(new Date());
  const [facturas, compras] = await Promise.all([facturasDelMes(mes), comprasSinFactura(mes)]);
  return NextResponse.json({ mes, facturas, compras });
}

/**
 * POST /api/admin/contabilidad/facturas (C-229): registrar la factura que se escribió en el talonario. Los montos, el
 * número y el control los pone el servidor; `numeroEsperado` es el que vio el equipo en pantalla.
 */
export async function POST(request: NextRequest) {
  const s = await sesionCon('FACTURAR');
  if (s instanceof NextResponse) return s;
  const leido = pedidoFacturaSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await emitirFactura(leido.data, leido.data.numeroEsperado, s.usuarioId);
  if (!r.ok) return respuestaError(r);

  const factura = await facturaPorId(r.datos.id);
  await registrarAccionAdmin(s.session, 'INVOICE_ISSUED', { type: 'DOCUMENTO_FISCAL', id: r.datos.id }, {
    factura: r.datos.etiqueta,
    medio: factura?.medio,
    origen: leido.data.origen,
    ordenes: factura?.ordenes.map((o) => o.orderNumber) ?? [],
    totalBs: factura?.totalBs,
    compradorCambiado: r.datos.compradorCambiado,
  }, request);
  // El cliente ve el número en su pedido sin recargar (C-127)
  if (r.datos.ordenIds.length) void publicarOrdenes(r.datos.ordenIds);
  return NextResponse.json({ factura }, { status: 201 });
}
