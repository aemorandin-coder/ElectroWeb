import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { revisarCompraSchema } from '@/lib/contabilidad/esquemas';
import { revisarCompra } from '@/lib/contabilidad/hub';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';

/** PATCH /api/admin/contabilidad/compras/[id] (G-76): la contadora aprueba o devuelve la factura de compra. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sesionCon('DECLARAR');
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const leido = revisarCompraSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await revisarCompra(id, leido.data, s.usuarioId);
  if (!r.ok) return respuestaError(r);

  await registrarAccionAdmin(s.session, 'PURCHASE_EXPENSE_REVIEWED', { type: 'COMPRA_GASTO', id }, {
    estadoRevision: r.datos.estadoRevision,
    notaRevision: r.datos.notaRevision,
  }, request);
  return NextResponse.json({ compra: r.datos });
}
