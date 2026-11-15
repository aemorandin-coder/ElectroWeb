import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { talonarioSchema } from '@/lib/contabilidad/esquemas';
import { errorDeEsquema, LEER_FACTURAS, respuestaError, sesionCon } from '@/lib/contabilidad/ruta';
import { crearTalonario, talonarioActivo, talonarios } from '@/lib/contabilidad/servidor';
import { talonarioDTO } from '@/lib/dto/contabilidad';

/** GET /api/admin/contabilidad/talonarios (C-229): los talonarios y el que está en uso. Quien factura los ve. */
export async function GET() {
  const s = await sesionCon(LEER_FACTURAS);
  if (s instanceof NextResponse) return s;
  const activo = await talonarioActivo();
  return NextResponse.json({ talonarios: await talonarios(), activo: activo ? talonarioDTO(activo) : null });
}

/** POST /api/admin/contabilidad/talonarios (C-229): cargar un talonario. Solo el dueño (ni la contadora, C-235). */
export async function POST(request: NextRequest) {
  const s = await sesionCon('CARGAR_TALONARIO');
  if (s instanceof NextResponse) return s;
  const leido = talonarioSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const r = await crearTalonario(leido.data, s.usuarioId);
  if (!r.ok) return respuestaError(r);
  await registrarAccionAdmin(s.session, 'TALONARIO_CREATED', { type: 'TALONARIO', id: r.datos.id }, {
    serie: r.datos.serie,
    desde: r.datos.numeroDesde,
    hasta: r.datos.numeroHasta,
    proxima: r.datos.proximo,
  }, request);
  return NextResponse.json({ talonario: r.datos }, { status: 201 });
}
