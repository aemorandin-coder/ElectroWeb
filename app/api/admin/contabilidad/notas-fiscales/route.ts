import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { notaFiscalSchema } from '@/lib/contabilidad/esquemas';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { emitirNotaFiscal, facturaPorId } from '@/lib/contabilidad/servidor';

/** POST /api/admin/contabilidad/notas-fiscales (G-76): emitir Nota de Crédito o Débito sobre una factura emitida. */
export async function POST(request: NextRequest) {
  const s = await sesionCon('FACTURAR');
  if (s instanceof NextResponse) return s;
  const leido = notaFiscalSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await emitirNotaFiscal(leido.data, s.usuarioId);
  if (!r.ok) return respuestaError(r);

  const documento = await facturaPorId(r.datos.id);
  await registrarAccionAdmin(s.session, 'CREDIT_DEBIT_NOTE_ISSUED', { type: 'DOCUMENTO_FISCAL', id: r.datos.id }, {
    etiqueta: r.datos.etiqueta,
    tipo: leido.data.tipo,
    afectadaId: leido.data.documentoAfectadoId,
    totalBs: documento?.totalBs,
  }, request);
  return NextResponse.json({ documento }, { status: 201 });
}
