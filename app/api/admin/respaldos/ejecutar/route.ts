import { NextRequest, NextResponse, after } from 'next/server';
import { anotar, esRespuesta, exigirDueno } from '@/lib/respaldos/acceso';
import { ejecutarRespaldo, hayRespaldoEnCurso, leerAjustes, problemaDeConfiguracion } from '@/lib/respaldos/servicio';

// C-165: "Respaldar ahora". Responde enseguida y el respaldo sigue en segundo plano; el panel consulta el estado.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const dueno = await exigirDueno('ejecutar');
  if (esRespuesta(dueno)) return dueno;
  const problema = problemaDeConfiguracion(await leerAjustes());
  if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  if (hayRespaldoEnCurso()) return NextResponse.json({ error: 'Ya hay un respaldo en marcha.' }, { status: 409 });
  await anotar(request, dueno, 'BACKUP_RUN_REQUESTED');
  after(() => ejecutarRespaldo('MANUAL').catch((error) => console.error('[RESPALDOS] Respaldo manual:', error)));
  return NextResponse.json({ ok: true }, { status: 202 });
}
