import { NextRequest, NextResponse } from 'next/server';
import { pedidoFacturaSchema } from '@/lib/contabilidad/esquemas';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { prepararFactura } from '@/lib/contabilidad/servidor';

/**
 * POST /api/admin/contabilidad/facturas/preparar (C-229): lo que hay que escribir en el talonario, calculado en el
 * servidor (renglones sin IVA, base, IVA, total, el número que toca y su control). No guarda nada.
 */
export async function POST(request: NextRequest) {
  const s = await sesionCon('FACTURAR');
  if (s instanceof NextResponse) return s;
  const leido = pedidoFacturaSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);
  const r = await prepararFactura(leido.data);
  if (!r.ok) return respuestaError(r);
  return NextResponse.json({ borrador: r.datos });
}
