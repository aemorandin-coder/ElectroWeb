import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { motivoSchema } from '@/lib/contabilidad/esquemas';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { anularEnBlanco } from '@/lib/contabilidad/servidor';

/**
 * POST /api/admin/contabilidad/facturas/en-blanco (C-229): un papel del talonario que se dañó antes de escribirlo, o que
 * se saltó. Queda anulado con su motivo y el talonario pasa a la siguiente. El papel se guarda.
 */
export async function POST(request: NextRequest) {
  const s = await sesionCon('FACTURAR');
  if (s instanceof NextResponse) return s;
  const leido = motivoSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);
  if (!leido.data.numeroEsperado) return NextResponse.json({ error: 'Falta el número del papel que se anula.', campo: 'numeroEsperado' }, { status: 400 });

  const r = await anularEnBlanco(leido.data.numeroEsperado, leido.data.motivo, s.usuarioId);
  if (!r.ok) return respuestaError(r);
  await registrarAccionAdmin(s.session, 'INVOICE_VOIDED', { type: 'DOCUMENTO_FISCAL', id: r.datos.id }, {
    factura: r.datos.etiqueta,
    enBlanco: true,
    motivo: leido.data.motivo,
  }, request);
  return NextResponse.json({ id: r.datos.id, etiqueta: r.datos.etiqueta }, { status: 201 });
}
