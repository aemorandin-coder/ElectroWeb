import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { anotar, esRespuesta, exigirDueno } from '@/lib/respaldos/acceso';
import { canjearCodigo, carpetaExiste, crearCarpeta, datosDeCuenta, DriveError } from '@/lib/respaldos/drive';
import { COOKIE_ESTADO, urlDeRetorno } from '@/lib/respaldos/estado';
import { cifrarSecreto, leerSecreto } from '@/lib/respaldos/secreto';
import { leerAjustes, NOMBRE_CARPETA_DRIVE } from '@/lib/respaldos/servicio';
import { siteUrl } from '@/lib/seo';

// C-165: adonde vuelve Google después de que el dueño da el permiso. Cambia el código por el permiso duradero (cifrado
// en la base), crea la carpeta "Respaldos ElectroShop" en su Drive y regresa al panel.
export const dynamic = 'force-dynamic';

function volver(motivo: string, borrarCookie = true) {
  const respuesta = NextResponse.redirect(`${siteUrl()}/admin/settings?respaldos=${encodeURIComponent(motivo)}#respaldos`);
  if (borrarCookie) respuesta.cookies.delete({ name: COOKIE_ESTADO, path: '/api/admin/respaldos/drive' });
  return respuesta;
}

export async function GET(request: NextRequest) {
  const dueno = await exigirDueno('callback');
  if (esRespuesta(dueno)) return dueno;

  const params = request.nextUrl.searchParams;
  if (params.get('error')) return volver(params.get('error') === 'access_denied' ? 'cancelado' : 'error-google');

  const esperado = request.cookies.get(COOKIE_ESTADO)?.value ?? '';
  const recibido = params.get('state') ?? '';
  const a = Buffer.from(esperado);
  const b = Buffer.from(recibido);
  if (!esperado || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return volver('estado-invalido');

  const code = params.get('code');
  const actual = await leerAjustes();
  const clientSecret = leerSecreto(actual.driveClientSecret);
  if (!code || !actual.driveClientId || !clientSecret) return volver('falta-cliente');

  try {
    const { refreshToken, accessToken } = await canjearCodigo({ clientId: actual.driveClientId, clientSecret, redirectUri: urlDeRetorno(), code });
    const cuenta = await datosDeCuenta(accessToken);
    // La carpeta de una conexión anterior se reutiliza si sigue ahí; si no, se crea otra
    let carpetaId = actual.driveFolderId;
    if (!carpetaId || !(await carpetaExiste(accessToken, carpetaId))) carpetaId = await crearCarpeta(accessToken, NOMBRE_CARPETA_DRIVE);
    await prisma.backupSettings.update({
      where: { id: 'default' },
      data: { driveRefreshToken: cifrarSecreto(refreshToken), driveEmail: cuenta.email, driveFolderId: carpetaId, driveConnectedAt: new Date(), driveError: null },
    });
    await anotar(request, dueno, 'BACKUP_DRIVE_CONNECTED', { cuenta: cuenta.email });
    return volver('conectado');
  } catch (error) {
    console.error('Error conectando Drive:', error instanceof DriveError ? error.message : error);
    // El motivo no viaja en la dirección (cualquiera podría armar un enlace con un texto falso): queda en los ajustes y la pantalla lo muestra
    if (error instanceof DriveError) await prisma.backupSettings.update({ where: { id: 'default' }, data: { driveError: error.message } });
    return volver(error instanceof DriveError ? 'error-drive' : 'error');
  }
}
