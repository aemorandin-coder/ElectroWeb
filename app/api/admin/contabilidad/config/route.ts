import { NextRequest, NextResponse } from 'next/server';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { configContableSchema } from '@/lib/contabilidad/esquemas';
import { guardarConfigContable, obtenerConfigContable } from '@/lib/contabilidad/hub';
import { errorDeEsquema, sesionCon } from '@/lib/contabilidad/ruta';

/** GET /api/admin/contabilidad/config (G-76): configuración fiscal y transición 2027 (solo Dueño). */
export async function GET() {
  const s = await sesionCon('CONFIG_CONTABLE');
  if (s instanceof NextResponse) return s;
  return NextResponse.json({ config: await obtenerConfigContable() }, { headers: { 'Cache-Control': 'no-store' } });
}

/** PUT /api/admin/contabilidad/config (G-76): guardar canal 2027 y parámetros de Alcaldía/Alquiler/Pensiones (solo Dueño). */
export async function PUT(request: NextRequest) {
  const s = await sesionCon('CONFIG_CONTABLE');
  if (s instanceof NextResponse) return s;
  const leido = configContableSchema.safeParse(await request.json().catch(() => null));
  if (!leido.success) return errorDeEsquema(leido.error.issues);

  const config = await guardarConfigContable(leido.data, s.usuarioId);
  await registrarAccionAdmin(s.session, 'ACCOUNTING_CONFIG_UPDATED', { type: 'CONFIG_CONTABLE', id: 'default' }, {
    canalEmision: config.canalEmision,
    imprentaAmbiente: config.imprentaAmbiente,
    alcaldiaAlicuota: config.alcaldiaAlicuota,
  }, request);
  return NextResponse.json({ config });
}
