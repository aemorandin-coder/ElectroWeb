import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { obligacionUpdateSchema } from '@/lib/contabilidad/esquemas';
import { actualizarObligacion, sincronizarObligacionesMes } from '@/lib/contabilidad/hub';
import { periodoDe } from '@/lib/contabilidad/montos';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { rangoMes } from '@/lib/relacion-ventas';

/** GET /api/admin/contabilidad/obligaciones?mes=YYYY-MM (G-76): calendario mensual de obligaciones. */
export async function GET(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const pedido = request.nextUrl.searchParams.get('mes');
  const mes = pedido && rangoMes(pedido) ? pedido : periodoDe(new Date());
  const obligaciones = await sincronizarObligacionesMes(mes);
  return NextResponse.json({ mes, obligaciones }, { headers: { 'Cache-Control': 'no-store' } });
}

/** PATCH /api/admin/contabilidad/obligaciones (G-76): actualizar monto, nómina, planilla o estado de una obligación. */
export async function PATCH(request: NextRequest) {
  const s = await sesionCon('DECLARAR');
  if (s instanceof NextResponse) return s;
  const leido = obligacionUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await actualizarObligacion(leido.data, s.usuarioId);
  if (!r.ok) return respuestaError(r);

  await registrarAccionAdmin(s.session, 'FISCAL_OBLIGATION_UPDATED', { type: 'OBLIGACION_FISCAL', id: r.datos.id }, {
    tipo: r.datos.tipo,
    estado: r.datos.estado,
    montoBs: r.datos.montoBs,
    planilla: r.datos.numeroPlanilla,
  }, request);
  return NextResponse.json({ obligacion: r.datos });
}
