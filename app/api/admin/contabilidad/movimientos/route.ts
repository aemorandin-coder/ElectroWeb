import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth-helpers';
import { obtenerMovimientosMes } from '@/lib/contabilidad/hub';
import { periodoDe } from '@/lib/contabilidad/montos';
import { sesionCon } from '@/lib/contabilidad/ruta';
import { rangoMes } from '@/lib/relacion-ventas';

/**
 * GET /api/admin/contabilidad/movimientos?mes=YYYY-MM (G-76): cobros por método, Puntos ES y gift cards.
 * El bloque `costos` solo se calcula y entrega cuando el usuario es el Dueño (CONFIG_CONTABLE).
 */
export async function GET(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const pedido = request.nextUrl.searchParams.get('mes');
  const mes = pedido && rangoMes(pedido) ? pedido : periodoDe(new Date());
  const incluirCostos = isAuthorized(s.session, 'CONFIG_CONTABLE');
  const movimientos = await obtenerMovimientosMes(mes, incluirCostos);
  return NextResponse.json({ movimientos }, { headers: { 'Cache-Control': 'no-store' } });
}
