import { isIP } from 'node:net';

// IP real del cliente (C-105). Antes había seis copias de "x-forwarded-for.split(',')[0]":
// - tomaban el primer valor, que lo escribe el propio cliente y se puede falsificar;
// - detrás de nginx sin cabeceras, Next rellena x-forwarded-for con la dirección del socket (::1),
//   así que todos los clientes compartían la misma "IP" y también los límites de intentos por IP.
//
// Fuente de confianza, en este orden:
// 1. `x-real-ip`: nginx la pisa con `$remote_addr` (proxy_set_header X-Real-IP $remote_addr).
// 2. `x-forwarded-for` leído de derecha a izquierda: el último valor lo agrega nginx
//    ($proxy_add_x_forwarded_for); los de la izquierda los pudo escribir el cliente.
// Solo se aceptan IP públicas: loopback y redes privadas son el propio servidor o nginx, no el cliente.

/** "::ffff:1.2.3.4" → "1.2.3.4", "[::1]:443" → "::1", "1.2.3.4:5678" → "1.2.3.4". Devuelve null si no es una IP. */
export function normalizarIP(valor: string | null | undefined): string | null {
  let ip = (valor ?? '').trim().toLowerCase();
  if (!ip) return null;
  const conCorchetes = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (conCorchetes) ip = conCorchetes[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'));
  if (ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4) ip = ip.slice(7);
  return isIP(ip) ? ip : null;
}

/** Loopback, redes privadas, enlace local, CGNAT y "sin especificar": no identifican a un cliente de internet. */
export function esIPPrivada(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
}

/** IP pública del cliente, o null si ninguna cabecera la trae (nginx sin configurar o petición local). */
export function ipDelCliente(headers: Headers): string | null {
  const real = normalizarIP(headers.get('x-real-ip'));
  if (real && !esIPPrivada(real)) return real;

  const cadena = (headers.get('x-forwarded-for') ?? '').split(',');
  for (let i = cadena.length - 1; i >= 0; i--) {
    const ip = normalizarIP(cadena[i]);
    if (ip && !esIPPrivada(ip)) return ip;
  }
  return null;
}

/** Para límites de intentos y registros: siempre un texto. "desconocida" agrupa lo que no trae IP. */
export function ipParaRegistro(headers: Headers): string {
  return ipDelCliente(headers) ?? 'desconocida';
}
