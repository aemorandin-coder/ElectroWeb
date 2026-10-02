import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { anotar, esRespuesta, exigirDueno } from '@/lib/respaldos/acceso';
import { estadoParaPanel } from '@/lib/respaldos/estado';
import { cifrarSecreto } from '@/lib/respaldos/secreto';
import { leerAjustes, problemaDeConfiguracion } from '@/lib/respaldos/servicio';

// C-165: ajustes de los respaldos a Google Drive. Solo el dueño. Nunca devuelve secretos.
export const dynamic = 'force-dynamic';

export async function GET() {
  const dueno = await exigirDueno('leer');
  if (esRespuesta(dueno)) return dueno;
  try {
    return NextResponse.json(await estadoParaPanel());
  } catch (error) {
    console.error('Error leyendo los respaldos:', error);
    return NextResponse.json({ error: 'No se pudo leer el estado de los respaldos' }, { status: 500 });
  }
}

const CLIENT_ID = /^[A-Za-z0-9._-]{10,200}\.apps\.googleusercontent\.com$/;

export async function PUT(request: NextRequest) {
  const dueno = await exigirDueno('guardar');
  if (esRespuesta(dueno)) return dueno;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const antes = await leerAjustes();
    const datos: Record<string, unknown> = {};

    if (body.hour !== undefined) {
      if (!Number.isInteger(body.hour) || (body.hour as number) < 0 || (body.hour as number) > 23) return NextResponse.json({ error: 'La hora debe ser un número de 0 a 23.' }, { status: 400 });
      datos.hour = body.hour;
    }
    if (body.retentionDays !== undefined) {
      if (!Number.isInteger(body.retentionDays) || (body.retentionDays as number) < 7 || (body.retentionDays as number) > 90) return NextResponse.json({ error: 'Los días que se guardan deben estar entre 7 y 90.' }, { status: 400 });
      datos.retentionDays = body.retentionDays;
    }
    if (body.includeFiles !== undefined) {
      if (typeof body.includeFiles !== 'boolean') return NextResponse.json({ error: 'Dato no válido.' }, { status: 400 });
      datos.includeFiles = body.includeFiles;
    }

    let cambioElCliente = false;
    if (typeof body.driveClientId === 'string') {
      const id = body.driveClientId.trim();
      if (!CLIENT_ID.test(id)) return NextResponse.json({ error: 'El ID del cliente de Google termina en ".apps.googleusercontent.com". Cópialo completo.' }, { status: 400 });
      if (id !== antes.driveClientId) cambioElCliente = true;
      datos.driveClientId = id;
    }
    if (typeof body.driveClientSecret === 'string' && body.driveClientSecret.trim()) {
      const secreto = body.driveClientSecret.trim();
      if (secreto.length < 10 || secreto.length > 200 || /\s/.test(secreto)) return NextResponse.json({ error: 'El secreto del cliente no es válido. Cópialo completo, sin espacios.' }, { status: 400 });
      datos.driveClientSecret = cifrarSecreto(secreto);
      cambioElCliente = true;
    }
    // Otro cliente de Google no reconoce el permiso del anterior: hay que volver a conectar
    if (cambioElCliente && antes.driveRefreshToken) {
      Object.assign(datos, { driveRefreshToken: null, driveEmail: null, driveConnectedAt: null, driveError: null, enabled: false });
    }

    // Si se cambió el cliente de Google, el respaldo queda apagado hasta volver a conectar (ya está en `datos`)
    const reconectar = cambioElCliente && Boolean(antes.driveRefreshToken);
    if (body.enabled !== undefined && !reconectar) {
      if (typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'Dato no válido.' }, { status: 400 });
      const problema = body.enabled ? problemaDeConfiguracion(antes) : null;
      if (problema) return NextResponse.json({ error: `No se puede encender todavía. ${problema}` }, { status: 400 });
      datos.enabled = body.enabled;
    }

    await prisma.backupSettings.update({ where: { id: 'default' }, data: datos });
    // Sin valores en la bitácora (hay secretos): solo qué campos cambiaron
    await anotar(request, dueno, 'BACKUP_SETTINGS_CHANGED', { campos: Object.keys(datos) });
    return NextResponse.json(await estadoParaPanel());
  } catch (error) {
    console.error('Error guardando los respaldos:', error);
    return NextResponse.json({ error: 'No se pudieron guardar los ajustes' }, { status: 500 });
  }
}
