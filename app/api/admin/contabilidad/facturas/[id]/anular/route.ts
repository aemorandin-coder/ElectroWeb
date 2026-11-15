import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { motivoSchema } from '@/lib/contabilidad/esquemas';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { anularFactura } from '@/lib/contabilidad/servidor';
import { publicarOrdenes } from '@/lib/realtime/bus';

/**
 * POST /api/admin/contabilidad/facturas/[id]/anular (C-229): una factura escrita con un error no se corrige: se anula
 * con su motivo (el papel se guarda, Providencia 00093, art. 21) y se escribe la siguiente. La orden vuelve a quedar
 * sin factura.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sesionCon('FACTURAR');
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const leido = motivoSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await anularFactura(id, leido.data.motivo, s.usuarioId);
  if (!r.ok) return respuestaError(r);
  await registrarAccionAdmin(s.session, 'INVOICE_VOIDED', { type: 'DOCUMENTO_FISCAL', id }, {
    factura: r.datos.etiqueta,
    motivo: leido.data.motivo,
  }, request);
  if (r.datos.ordenIds.length) void publicarOrdenes(r.datos.ordenIds);
  return NextResponse.json({ ok: true });
}
