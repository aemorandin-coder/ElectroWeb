import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';

// Descarga segura de páginas públicas (C-155). Solo servidor.
//
// El asistente de productos lee páginas que salen de un buscador: direcciones que la tienda no eligió. Sin estas
// reglas, una dirección que apunte a la red interna dejaría leer servicios del propio servidor (SSRF):
// - Solo http y https, en sus puertos de siempre, y sin usuario ni clave en la dirección.
// - La IP se comprueba **al conectar** (no antes): un dominio no puede dar una IP pública al revisar y una privada
//   al conectar. Las redirecciones pasan por la misma comprobación, una por una.
// - Tiempo y tamaño limitados, y solo texto (HTML o JSON).
// No se usa `fetch`: no deja fijar la IP de la conexión.

export const TIEMPO_MAXIMO_MS = 7000;
export const TAMANO_MAXIMO = 2_500_000;
const REDIRECCIONES_MAXIMAS = 3;

/** Se identifica como un navegador corriente: muchas tiendas responden vacío a un agente desconocido */
const AGENTE = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';

export class ErrorDescarga extends Error {
  constructor(public motivo: 'direccion' | 'bloqueada' | 'tiempo' | 'tamano' | 'tipo' | 'estado' | 'red', detalle?: string) {
    super(detalle ? `${motivo}: ${detalle}` : motivo);
  }
}

/** IPv4 que no es de internet: propia máquina, redes privadas, enlace local, CGNAT, multidifusión y reservadas */
function ipv4Privada(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** true si la IP no se puede visitar: privada, local o con un formato que no se reconoce */
export function ipBloqueada(ip: string): boolean {
  const tipo = net.isIP(ip);
  if (tipo === 4) return ipv4Privada(ip);
  if (tipo !== 6) return true;
  const limpia = ip.toLowerCase().split('%')[0];
  // IPv4 dentro de IPv6 (::ffff:10.0.0.1)
  const mapeada = limpia.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapeada) return ipv4Privada(mapeada[1]);
  if (limpia === '::' || limpia === '::1') return true;
  // fc00::/7 (privadas), fe80::/10 (enlace local), ff00::/8 (multidifusión), ::ffff:0:0/96 en hexadecimal y 64:ff9b::/96
  return /^(f[cd]|fe[89ab]|ff)/.test(limpia) || limpia.startsWith('::ffff:') || limpia.startsWith('64:ff9b:');
}

/** La dirección, si se puede visitar. Lanza ErrorDescarga('direccion') si no */
export function direccionPermitida(texto: string): URL {
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new ErrorDescarga('direccion', 'no es una dirección');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new ErrorDescarga('direccion', 'protocolo');
  if (url.username || url.password) throw new ErrorDescarga('direccion', 'credenciales');
  if (url.port && url.port !== '80' && url.port !== '443') throw new ErrorDescarga('direccion', 'puerto');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new ErrorDescarga('bloqueada', 'nombre local');
  }
  // Una IP escrita a mano se revisa aquí; un nombre, al conectar
  if (net.isIP(host) && ipBloqueada(host)) throw new ErrorDescarga('bloqueada', 'IP privada');
  return url;
}

/** Resolución de nombres que rechaza las IP privadas. Es la que usa la conexión: no hay una segunda resolución */
const resolverPublico: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...(options as dns.LookupOptions), all: true }, (error, direcciones) => {
    if (error) return callback(error, '', 4);
    const lista = direcciones as unknown as dns.LookupAddress[];
    const mala = lista.find((d) => ipBloqueada(d.address));
    if (mala || lista.length === 0) {
      return callback(Object.assign(new Error('IP privada'), { code: 'EBLOQUEADA' }), '', 4);
    }
    if ((options as dns.LookupOptions).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, lista);
    callback(null, lista[0].address, lista[0].family);
  });
};

export interface Pagina {
  /** Dirección final, después de las redirecciones */
  url: string;
  estado: number;
  tipo: string;
  texto: string;
}

interface Opciones {
  /** Tipos de contenido que se aceptan (por defecto, HTML) */
  acepta?: 'html' | 'json';
  tiempoMs?: number;
  /** Idioma que se pide: las fichas en español traen las especificaciones ya traducidas */
  idioma?: string;
}

function pedir(url: URL, opciones: Opciones, limite: number): Promise<{ estado: number; cabeceras: http.IncomingHttpHeaders; cuerpo: Buffer }> {
  return new Promise((resolve, reject) => {
    const cliente = url.protocol === 'https:' ? https : http;
    let terminado = false;
    const fin = (error: Error | null, valor?: { estado: number; cabeceras: http.IncomingHttpHeaders; cuerpo: Buffer }) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(reloj);
      if (error) reject(error);
      else resolve(valor!);
    };
    const peticion = cliente.request(url, {
      method: 'GET',
      lookup: resolverPublico,
      headers: {
        'User-Agent': AGENTE,
        Accept: opciones.acepta === 'json' ? 'application/json' : 'text/html,application/xhtml+xml',
        'Accept-Language': opciones.idioma ?? 'es-419,es;q=0.9,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    }, (respuesta) => {
      const estado = respuesta.statusCode ?? 0;
      // Una redirección o un error no se leen: basta la cabecera
      if (estado >= 300) {
        respuesta.resume();
        return fin(null, { estado, cabeceras: respuesta.headers, cuerpo: Buffer.alloc(0) });
      }
      const codificacion = String(respuesta.headers['content-encoding'] ?? '').toLowerCase();
      const flujo = codificacion === 'gzip' ? respuesta.pipe(zlib.createGunzip())
        : codificacion === 'deflate' ? respuesta.pipe(zlib.createInflate())
        : codificacion === 'br' ? respuesta.pipe(zlib.createBrotliDecompress())
        : respuesta;
      const trozos: Buffer[] = [];
      let total = 0;
      flujo.on('data', (trozo: Buffer) => {
        total += trozo.length;
        // Con lo leído hasta el tope alcanza: los datos del producto van arriba de la página
        if (total > limite) {
          trozos.push(trozo.subarray(0, Math.max(0, trozo.length - (total - limite))));
          peticion.destroy();
          return fin(null, { estado, cabeceras: respuesta.headers, cuerpo: Buffer.concat(trozos) });
        }
        trozos.push(trozo);
      });
      flujo.on('end', () => fin(null, { estado, cabeceras: respuesta.headers, cuerpo: Buffer.concat(trozos) }));
      flujo.on('error', () => fin(null, { estado, cabeceras: respuesta.headers, cuerpo: Buffer.concat(trozos) }));
    });
    const reloj = setTimeout(() => {
      peticion.destroy();
      fin(new ErrorDescarga('tiempo'));
    }, opciones.tiempoMs ?? TIEMPO_MAXIMO_MS);
    peticion.on('error', (error: NodeJS.ErrnoException) => {
      fin(error.code === 'EBLOQUEADA' ? new ErrorDescarga('bloqueada', 'IP privada') : new ErrorDescarga('red', error.code));
    });
    peticion.end();
  });
}

function textoDe(cuerpo: Buffer, tipo: string): string {
  const declarado = tipo.match(/charset=["']?([\w-]+)/i)?.[1]?.toLowerCase();
  const enPagina = cuerpo.subarray(0, 2048).toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]?.toLowerCase();
  const juego = declarado ?? enPagina ?? 'utf-8';
  try {
    return new TextDecoder(juego === 'iso-8859-1' ? 'windows-1252' : juego).decode(cuerpo);
  } catch {
    return cuerpo.toString('utf8');
  }
}

/** Descarga una página pública. Lanza ErrorDescarga con el motivo; nunca devuelve algo a medias sin avisar */
export async function descargar(direccion: string, opciones: Opciones = {}): Promise<Pagina> {
  let url = direccionPermitida(direccion);
  for (let salto = 0; salto <= REDIRECCIONES_MAXIMAS; salto++) {
    const { estado, cabeceras, cuerpo } = await pedir(url, opciones, TAMANO_MAXIMO);
    if (estado >= 300 && estado < 400 && cabeceras.location) {
      url = direccionPermitida(new URL(cabeceras.location, url).toString());
      continue;
    }
    if (estado !== 200) throw new ErrorDescarga('estado', String(estado));
    const tipo = String(cabeceras['content-type'] ?? '').toLowerCase();
    const esperado = opciones.acepta === 'json' ? /json/ : /html|xml/;
    if (!esperado.test(tipo)) throw new ErrorDescarga('tipo', tipo.slice(0, 40));
    return { url: url.toString(), estado, tipo, texto: textoDe(cuerpo, tipo) };
  }
  throw new ErrorDescarga('direccion', 'demasiadas redirecciones');
}
