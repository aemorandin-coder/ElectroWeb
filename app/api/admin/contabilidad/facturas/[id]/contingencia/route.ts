import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { reportarContingenciaSchema } from '@/lib/contabilidad/esquemas';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { reportarContingencia } from '@/lib/contabilidad/servidor';

/** POST /api/admin/contabilidad/facturas/[id]/contingencia (G-76): marcar documento de contingencia reportado al día siguiente. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sesionCon('FACTURAR');
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const leido = reportarContingenciaSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await reportarContingencia(id, leido.data);
  if (!r.ok) return respuestaError(r);

  await registrarAccionAdmin(s.session, 'CONTINGENCIA_REPORTED', { type: 'DOCUMENTO_FISCAL', id }, {
    factura: r.datos.etiqueta,
    pdfPrivadoRuta: leido.data.pdfPrivadoRuta ?? null,
  }, request);
  return NextResponse.json({ factura: r.datos });
}
