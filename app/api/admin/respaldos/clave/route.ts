import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { anotar, esRespuesta, exigirDueno } from '@/lib/respaldos/acceso';
import { generarParDeClaves } from '@/lib/respaldos/formato';
import { leerAjustes } from '@/lib/respaldos/servicio';

// C-165: crea el par de claves del respaldo. La PRIVADA se devuelve una sola vez y no se guarda en ningún lado:
// si se pierde, los respaldos cifrados con ella no se pueden abrir. Solo el dueño.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const dueno = await exigirDueno('clave');
  if (esRespuesta(dueno)) return dueno;
  try {
    const body = (await request.json().catch(() => ({}))) as { reemplazar?: boolean };
    const actual = await leerAjustes();
    if (actual.publicKeyPem && body.reemplazar !== true) {
      return NextResponse.json({ error: 'Ya hay una clave. Si la cambias, los respaldos anteriores solo se abren con la clave anterior.' }, { status: 409 });
    }
    const par = await generarParDeClaves();
    await prisma.backupSettings.update({
      where: { id: 'default' },
      data: { publicKeyPem: par.publicKeyPem, keyFingerprint: par.fingerprint, keyCreatedAt: new Date() },
    });
    await anotar(request, dueno, 'BACKUP_KEY_CREATED', { huella: par.fingerprint, reemplazo: Boolean(actual.publicKeyPem) });
    return NextResponse.json({ privateKeyPem: par.privateKeyPem, huella: par.fingerprint }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error creando la clave del respaldo:', error);
    return NextResponse.json({ error: 'No se pudo crear la clave' }, { status: 500 });
  }
}
