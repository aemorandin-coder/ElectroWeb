import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { retencionIvaSchema } from '@/lib/contabilidad/esquemas';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { registrarRetencionIva } from '@/lib/contabilidad/servidor';

/** POST /api/admin/contabilidad/facturas/[id]/retencion (G-76): registrar comprobante de retención de IVA recibido. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sesionCon(['FACTURAR', 'DECLARAR']);
  if (s instanceof NextResponse) return s;
  const { id } = await params;
  const leido = retencionIvaSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await registrarRetencionIva(id, leido.data);
  if (!r.ok) return respuestaError(r);

  await registrarAccionAdmin(s.session, 'IVA_RETENTION_RECORDED', { type: 'DOCUMENTO_FISCAL', id }, {
    factura: r.datos.etiqueta,
    comprobante: leido.data.comprobanteRetencion,
    ivaRetenidoBs: leido.data.ivaRetenidoBs,
  }, request);
  return NextResponse.json({ factura: r.datos });
}
