import { NextRequest, NextResponse } from 'next/server';
import { agregarNota, notasDelMes, notaSchema } from '@/lib/contabilidad/mesa';
import { periodoDe } from '@/lib/contabilidad/montos';
import { errorDeEsquema, sesionCon } from '@/lib/contabilidad/ruta';

/** GET /api/admin/contabilidad/notas?mes=2026-11 (C-235): las notas del mes entre el dueño y la contadora. */
export async function GET(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const pedido = request.nextUrl.searchParams.get('mes') ?? '';
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? pedido : periodoDe(new Date());
  return NextResponse.json({ mes, notas: await notasDelMes(mes, s.usuarioId) }, { headers: { 'Cache-Control': 'no-store' } });
}

/** POST /api/admin/contabilidad/notas (C-235): una nota para el mes ("Falta la factura de la luz de noviembre"). */
export async function POST(request: NextRequest) {
  const s = await sesionCon('VER_CONTABILIDAD');
  if (s instanceof NextResponse) return s;
  const leido = notaSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);
  await agregarNota(leido.data.mes, s.usuarioId, leido.data.texto);
  return NextResponse.json({ notas: await notasDelMes(leido.data.mes, s.usuarioId) }, { status: 201 });
}
