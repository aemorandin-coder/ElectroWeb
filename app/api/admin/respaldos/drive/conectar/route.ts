import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { esRespuesta, exigirDueno } from '@/lib/respaldos/acceso';
import { urlDeAutorizacion } from '@/lib/respaldos/drive';
import { COOKIE_ESTADO, urlDeRetorno } from '@/lib/respaldos/estado';
import { leerSecreto } from '@/lib/respaldos/secreto';
import { leerAjustes } from '@/lib/respaldos/servicio';
import { siteUrl } from '@/lib/seo';

// C-165: empieza la conexión con Google (el botón "Conectar con Google" es un enlace a esta ruta). Guarda un `state`
// aleatorio en una cookie y manda al dueño a la pantalla de permisos de Google.
export const dynamic = 'force-dynamic';

function volver(motivo: string) {
  return NextResponse.redirect(`${siteUrl()}/admin/settings?respaldos=${encodeURIComponent(motivo)}#respaldos`);
}

export async function GET() {
  const dueno = await exigirDueno('conectar');
  if (esRespuesta(dueno)) return dueno;
  const a = await leerAjustes();
  if (!a.driveClientId || !leerSecreto(a.driveClientSecret)) return volver('falta-cliente');

  const state = crypto.randomBytes(24).toString('hex');
  const respuesta = NextResponse.redirect(urlDeAutorizacion({ clientId: a.driveClientId, redirectUri: urlDeRetorno(), state }));
  respuesta.cookies.set(COOKIE_ESTADO, state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/admin/respaldos/drive', maxAge: 600 });
  return respuesta;
}
