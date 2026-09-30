/**
 * "Android (Chrome)" a partir del user-agent: el último acceso del perfil y la actividad reciente de Seguridad (C-138).
 * Edge y Opera se miran antes que Chrome: su user-agent también dice "Chrome" (antes Edge salía como Chrome).
 */
export function describirDispositivo(userAgent: string | null | undefined): string {
  const ua = userAgent || '';
  let sistema = 'Desconocido';
  if (ua.includes('iPhone')) sistema = 'iPhone';
  else if (ua.includes('iPad')) sistema = 'iPad';
  else if (ua.includes('Android')) sistema = 'Android';
  else if (ua.includes('Windows')) sistema = 'Windows';
  else if (ua.includes('Macintosh')) sistema = 'macOS';
  else if (ua.includes('Linux')) sistema = 'Linux';

  let navegador = '';
  if (ua.includes('Edg/')) navegador = 'Edge';
  else if (ua.includes('OPR/')) navegador = 'Opera';
  else if (ua.includes('Firefox') || ua.includes('FxiOS')) navegador = 'Firefox';
  else if (ua.includes('Chrome') || ua.includes('CriOS')) navegador = 'Chrome';
  else if (ua.includes('Safari')) navegador = 'Safari';

  return navegador ? `${sistema} (${navegador})` : sistema;
}
