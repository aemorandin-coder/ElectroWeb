import { NextResponse } from 'next/server';
import { esRespuesta, exigirDueno } from '@/lib/respaldos/acceso';
import { datosDeCuenta, DriveError } from '@/lib/respaldos/drive';
import { leerAjustes, prepararDrive } from '@/lib/respaldos/servicio';

// C-165: "Probar conexión": renueva el permiso, revisa la carpeta (la crea si se borró) y dice cuánto espacio queda.
export const dynamic = 'force-dynamic';

export async function POST() {
  const dueno = await exigirDueno('probar');
  if (esRespuesta(dueno)) return dueno;
  try {
    const drive = await prepararDrive(await leerAjustes());
    const cuenta = await datosDeCuenta(drive.token);
    return NextResponse.json({ ok: true, email: cuenta.email, usadoBytes: cuenta.usadoBytes, limiteBytes: cuenta.limiteBytes });
  } catch (error) {
    if (error instanceof DriveError) return NextResponse.json({ ok: false, error: error.message, reautorizar: error.reautorizar }, { status: 200 });
    console.error('Error probando Drive:', error);
    return NextResponse.json({ ok: false, error: 'No se pudo probar la conexión' }, { status: 500 });
  }
}
