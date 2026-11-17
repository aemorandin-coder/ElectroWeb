// Límite de intentos del inicio de sesión con contraseña (C-80, C-285).
// Antes solo existía en el navegador (localStorage) y el token del captcha nunca llegaba al servidor:
// quien llamaba directo a /api/auth/callback/unified-credentials probaba contraseñas sin freno.
//
// - Espera por correo e IP juntos (C-285): desde el 5.º fallo de ese correo desde esa IP, espera progresiva de 1, 5, 15 y
//   60 minutos (lib/rate-limit). Quien falla se bloquea a sí mismo desde su IP; quien entra a la misma cuenta desde otra no
//   espera. Entrar bien limpia ese contador.
// - Captcha por cuenta (el correo normalizado, exista o no), desde cualquier IP: desde el 2.º fallo del correo. Es fricción,
//   no deja a nadie fuera. Entrar bien lo limpia.
// - Por IP: 10 fallos en 15 minutos piden captcha para cualquier cuenta y 30 bloquean 15 minutos.
//   Es una segunda capa: la IP sale de lib/ip.ts (x-real-ip de nginx o el último x-forwarded-for) y es fiable con el nginx de C-105.
// - Sin IP conocida ('desconocida'), la espera cuenta por el correo solo, como antes de C-285.
// En memoria: vale para un proceso (PM2 en modo fork) y se reinicia con el servidor.
import { isBlocked, recordFailedAttempt, resetFailedAttempts } from '@/lib/rate-limit';

const ACCION = 'login';
// Acción aparte para el correo con la IP: su clave ("correo|ip") nunca coincide con la de un correo suelto
const ACCION_CORREO_IP = 'login-correo-ip';
const IP_DESCONOCIDA = 'desconocida';
const FALLOS_PARA_CAPTCHA = 2;
const IP_FALLOS_PARA_CAPTCHA = 10;
const IP_FALLOS_PARA_BLOQUEO = 30;
const IP_VENTANA_MS = 15 * 60 * 1000;

const fallosPorIp = new Map<string, { fallos: number; desde: number }>();

function fallosDeIp(ip: string, ahora = Date.now()): number {
  const entrada = fallosPorIp.get(ip);
  if (!entrada || ahora - entrada.desde > IP_VENTANA_MS) return 0;
  return entrada.fallos;
}

function segundosBloqueoIp(ip: string, ahora = Date.now()): number {
  const entrada = fallosPorIp.get(ip);
  if (!entrada || fallosDeIp(ip, ahora) < IP_FALLOS_PARA_BLOQUEO) return 0;
  return Math.ceil((entrada.desde + IP_VENTANA_MS - ahora) / 1000);
}

export interface EstadoLogin {
  /** Segundos que faltan para poder intentar otra vez (0 = puede intentar). */
  esperar: number;
  /** El próximo intento necesita un captcha válido. */
  pideCaptcha: boolean;
}

export function estadoLogin(email: string, ip: string): EstadoLogin {
  const cuenta = isBlocked(email, ACCION);
  const conIp = ip === IP_DESCONOCIDA ? cuenta : isBlocked(`${email}|${ip}`, ACCION_CORREO_IP);
  return {
    esperar: Math.max(conIp.blocked ? conIp.blockedFor : 0, segundosBloqueoIp(ip)),
    pideCaptcha: cuenta.attempts >= FALLOS_PARA_CAPTCHA || fallosDeIp(ip) >= IP_FALLOS_PARA_CAPTCHA,
  };
}

/** Contraseña incorrecta o cuenta inexistente. Devuelve los segundos de espera si este fallo bloquea. */
export function registrarFallo(email: string, ip: string): number {
  const ahora = Date.now();
  if (fallosPorIp.size > 5000) {
    for (const [clave, entrada] of fallosPorIp) if (ahora - entrada.desde > IP_VENTANA_MS) fallosPorIp.delete(clave);
  }
  const entrada = fallosPorIp.get(ip);
  if (!entrada || ahora - entrada.desde > IP_VENTANA_MS) fallosPorIp.set(ip, { fallos: 1, desde: ahora });
  else entrada.fallos++;

  const cuenta = recordFailedAttempt(email, ACCION);
  const conIp = ip === IP_DESCONOCIDA ? cuenta : recordFailedAttempt(`${email}|${ip}`, ACCION_CORREO_IP);
  return Math.max(conIp.blocked ? conIp.blockedFor : 0, segundosBloqueoIp(ip, ahora));
}

/** Entró bien: se limpian el contador del correo (el del captcha) y el del correo con esta IP; el de otra IP no se toca. */
export function registrarAcierto(email: string, ip: string): void {
  resetFailedAttempts(email, ACCION);
  if (ip !== IP_DESCONOCIDA) resetFailedAttempts(`${email}|${ip}`, ACCION_CORREO_IP);
}
