import { NextResponse } from 'next/server';
import { esRespuesta, exigirDueno } from '@/lib/respaldos/acceso';
import { DriveError } from '@/lib/respaldos/drive';
import { verificarUltimos } from '@/lib/respaldos/servicio';

// C-165: "Verificar el último": comprueba en Drive que el último respaldo de cada tipo siga ahí y con la misma huella (MD5).
export const dynamic = 'force-dynamic';

export async function POST() {
  const dueno = await exigirDueno('verificar');
  if (esRespuesta(dueno)) return dueno;
  try {
    const resultados = await verificarUltimos();
    return NextResponse.json({ resultados });
  } catch (error) {
    if (error instanceof DriveError) return NextResponse.json({ error: error.message }, { status: 502 });
    console.error('Error verificando los respaldos:', error);
    return NextResponse.json({ error: 'No se pudo verificar' }, { status: 500 });
  }
}
