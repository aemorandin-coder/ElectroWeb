import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { cierrePeriodoSchema } from '@/lib/contabilidad/esquemas';
import { actualizarPeriodoContable, calcularHojaIva } from '@/lib/contabilidad/hub';
import { periodoDe } from '@/lib/contabilidad/montos';
import { errorDeEsquema, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { rangoMes } from '@/lib/relacion-ventas';

/** GET /api/admin/contabilidad/periodo?mes=YYYY-MM (G-76): hoja de IVA (Forma 99030) y estado del cierre. */
export async function GET(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const pedido = request.nextUrl.searchParams.get('mes');
  const mes = pedido && rangoMes(pedido) ? pedido : periodoDe(new Date());
  return NextResponse.json({ periodo: await calcularHojaIva(mes) }, { headers: { 'Cache-Control': 'no-store' } });
}

/** PATCH /api/admin/contabilidad/periodo (G-76): actualizar excedente, declarar, pagar o cerrar el mes con firma. */
export async function PATCH(request: NextRequest) {
  const s = await sesionCon('DECLARAR');
  if (s instanceof NextResponse) return s;
  const leido = cierrePeriodoSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const esDueno = isAuthorized(s.session, 'CONFIG_CONTABLE');
  const r = await actualizarPeriodoContable(leido.data.periodo, leido.data, s.usuarioId, esDueno);
  if (!r.ok) return respuestaError(r);

  await registrarAccionAdmin(s.session, 'FISCAL_PERIOD_CLOSED', { type: 'PERIODO_CONTABLE', id: r.datos.periodo }, {
    accion: leido.data.accion,
    estado: r.datos.estado,
    ivaAPagarBs: r.datos.ivaAPagarBs,
  }, request);
  return NextResponse.json({ periodo: r.datos });
}
