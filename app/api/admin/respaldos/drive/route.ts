import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { anotar, esRespuesta, exigirDueno } from '@/lib/respaldos/acceso';
import { revocarPermiso } from '@/lib/respaldos/drive';
import { estadoParaPanel } from '@/lib/respaldos/estado';
import { leerSecreto } from '@/lib/respaldos/secreto';
import { leerAjustes } from '@/lib/respaldos/servicio';

// C-165: desconectar Drive. Apaga el respaldo automático. Los respaldos que ya están en Drive no se tocan.
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const dueno = await exigirDueno('desconectar');
  if (esRespuesta(dueno)) return dueno;
  try {
    const actual = await leerAjustes();
    const permiso = leerSecreto(actual.driveRefreshToken);
    if (permiso) await revocarPermiso(permiso);
    await prisma.backupSettings.update({
      where: { id: 'default' },
      data: { enabled: false, driveRefreshToken: null, driveEmail: null, driveConnectedAt: null, driveError: null },
    });
    await anotar(request, dueno, 'BACKUP_DRIVE_DISCONNECTED');
    return NextResponse.json(await estadoParaPanel());
  } catch (error) {
    console.error('Error desconectando Drive:', error);
    return NextResponse.json({ error: 'No se pudo desconectar Drive' }, { status: 500 });
  }
}
