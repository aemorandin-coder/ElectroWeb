import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { compraGastoSchema } from '@/lib/contabilidad/esquemas';
import { crearCompra, listarCompras } from '@/lib/contabilidad/hub';
import { periodoDe } from '@/lib/contabilidad/montos';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { rangoMes } from '@/lib/relacion-ventas';

/** GET /api/admin/contabilidad/compras?mes=YYYY-MM (G-76): libro de compras y crédito fiscal del mes. */
export async function GET(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const pedido = request.nextUrl.searchParams.get('mes');
  const mes = pedido && rangoMes(pedido) ? pedido : periodoDe(new Date());
  return NextResponse.json({ mes, ...(await listarCompras(mes)) }, { headers: { 'Cache-Control': 'no-store' } });
}

/** POST /api/admin/contabilidad/compras (G-76): cargar factura de compra o gasto. */
export async function POST(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const leido = compraGastoSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await crearCompra(leido.data, s.usuarioId);
  if (!r.ok) return respuestaError(r);

  await registrarAccionAdmin(s.session, 'PURCHASE_EXPENSE_CREATED', { type: 'COMPRA_GASTO', id: r.datos.id }, {
    proveedor: r.datos.proveedorNombre,
    factura: r.datos.numeroFactura,
    totalBs: r.datos.totalBs,
  }, request);
  return NextResponse.json({ compra: r.datos }, { status: 201 });
}
