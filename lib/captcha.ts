// Verificación de hCaptcha en el servidor (C-08). Antes solo se comprobaba en el navegador:
// un bot que llamaba directo a la API se saltaba el captcha.
//
// Variables: HCAPTCHA_SECRET (clave secreta, solo servidor) y NEXT_PUBLIC_HCAPTCHA_SITE_KEY (pública).
// - Producción sin HCAPTCHA_SECRET: se rechaza (503). Mejor un formulario detenido que abierto a bots.
// - Desarrollo sin HCAPTCHA_SECRET: se omite la verificación.
// Para probar en local: claves de prueba oficiales de hCaptcha (site 10000000-ffff-ffff-ffff-000000000001,
// secret 0x0000000000000000000000000000000000000000).

const VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

export type CaptchaResult = { ok: true } | { ok: false; status: number; error: string };

export async function verifyCaptcha(token: unknown, remoteIp?: string | null): Promise<CaptchaResult> {
  const secret = process.env.HCAPTCHA_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] HCAPTCHA_SECRET no está configurado: se rechazan los formularios con captcha');
      return { ok: false, status: 503, error: 'La verificación de seguridad no está disponible. Intenta más tarde.' };
    }
    return { ok: true };
  }

  if (typeof token !== 'string' || token.length === 0 || token.length > 10_000) {
    return { ok: false, status: 400, error: 'Completa la verificación de seguridad.' };
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== 'unknown') params.set('remoteip', remoteIp);
    const sitekey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
    if (sitekey) params.set('sitekey', sitekey);

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };

    if (data.success === true) return { ok: true };
    return { ok: false, status: 400, error: 'La verificación de seguridad falló o expiró. Inténtalo de nuevo.' };
  } catch (error) {
    console.error('Error verifying hCaptcha:', error);
    return { ok: false, status: 503, error: 'No pudimos comprobar la verificación de seguridad. Intenta de nuevo.' };
  }
}
