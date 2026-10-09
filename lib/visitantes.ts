// C-173: quién está conectado a la tienda ahora mismo. Solo servidor.
//
// Cada pestaña de la tienda avisa que sigue abierta cada 30 s (POST /api/analytics/presencia) y se apunta aquí, en memoria: no
// toca la base. Como el bus en tiempo real y la presencia del panel (C-169), vive en el único proceso de PM2. Una pestaña
// que deja de avisar caduca a los 90 s. Antes, "en vivo" contaba eventos de los últimos 5 minutos en la base: quien leía una
// ficha sin hacer clic desaparecía, y no se sabía quién era.
//
// Privacidad: al equipo se le muestra el nombre abreviado de quien tiene cuenta ("Carlos P.") y "Visitante A3F" de quien no.
// Nunca la IP, el correo, el identificador de sesión ni el de la cuenta. El propio equipo no cuenta como visitante.

const CADUCA_MS = 90_000;
const MAXIMO_SESIONES = 5_000;
const MAXIMO_LISTA = 60;
const NOMBRES_MS = 10 * 60_000;

export type Dispositivo = 'desktop' | 'mobile' | 'tablet';

interface Sesion {
  /** Identifica la pestaña (sessionStorage del navegador) */
  sesion: string;
  userId: string | null;
  /** Nombre abreviado, solo si tiene cuenta */
  nombre: string | null;
  esEquipo: boolean;
  pagina: string;
  dispositivo: Dispositivo;
  origen: string;
  desde: number;
  ultimo: number;
  carrito: number;
}

const global = globalThis as unknown as { __electroshopVisitantes?: Map<string, Sesion>; __electroshopNombres?: Map<string, { nombre: string | null; hasta: number }> };
const sesiones = global.__electroshopVisitantes ?? (global.__electroshopVisitantes = new Map());
const nombres = global.__electroshopNombres ?? (global.__electroshopNombres = new Map());

export function dispositivoDeUA(userAgent: string): Dispositivo {
  // Tableta: iPad o Android sin "Mobile" (así se anuncian las tabletas Android)
  if (/iPad|Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) return 'tablet';
  return /Mobile|Android|iPhone/i.test(userAgent) ? 'mobile' : 'desktop';
}

/** De dónde llegó, en palabras: el dominio que mandó a la persona ("instagram.com" → "Instagram"). Sin dato o el propio sitio: "Directo" */
export function origenLegible(host: string | null | undefined, propio: string): string {
  const h = (host ?? '').toLowerCase().replace(/^www\./, '').slice(0, 80);
  // El propio sitio (con o sin puerto, como llega en la cabecera Host) es tráfico directo
  if (!h || h === propio.toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '')) return 'Directo';
  if (/instagram|^l\.instagram/.test(h)) return 'Instagram';
  if (/facebook|^fb\.|^m\.facebook|^l\.facebook/.test(h)) return 'Facebook';
  if (/whatsapp|^wa\.me/.test(h)) return 'WhatsApp';
  if (/^t\.co$|twitter|^x\.com$/.test(h)) return 'X';
  if (/tiktok/.test(h)) return 'TikTok';
  if (/youtube|^youtu\.be$/.test(h)) return 'YouTube';
  if (/google/.test(h)) return 'Google';
  if (/bing|duckduckgo|yahoo/.test(h)) return h.split('.')[0].replace(/^./, (c) => c.toUpperCase());
  if (/^t\.me$|telegram/.test(h)) return 'Telegram';
  return h;
}

/** "Carlos Pérez Rojas" → "Carlos P." */
export function abreviarNombre(nombre: string | null | undefined): string | null {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return null;
  const primero = partes[0].slice(0, 20);
  return partes.length > 1 ? `${primero} ${partes[partes.length - 1][0].toUpperCase()}.` : primero;
}

/** Qué se ve en esa página, en palabras de la tienda ("/productos/teclado-k552" → "Producto: teclado k552") */
export function etiquetaDePagina(ruta: string): string {
  const limpia = ruta.split('?')[0].split('#')[0];
  const humano = (slug: string) => decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim().slice(0, 40);
  if (limpia === '/' || limpia === '') return 'Inicio';
  const [primero, resto] = limpia.replace(/^\//, '').split('/');
  switch (primero) {
    case 'productos': return resto ? `Producto: ${humano(resto)}` : 'Catálogo';
    case 'categorias': return resto ? `Categoría: ${humano(resto)}` : 'Categorías';
    case 'carrito': return 'Carrito';
    case 'checkout': return 'Pagando';
    case 'customer': return 'Su cuenta';
    case 'cursos': return resto ? `Curso: ${humano(resto)}` : 'Cursos';
    case 'servicios': return 'Servicios';
    case 'gift-cards': case 'canjear-gift-card': return 'Gift cards';
    case 'contacto': return 'Contacto';
    case 'cotizacion': return 'Cotización';
    case 'login': case 'registro': case 'recuperar-contrasena': case 'verificar-email': return 'Entrando o registrándose';
    case 'terminos': case 'privacidad': return 'Términos y privacidad';
    case 'solicitar-producto': return 'Pidiendo un producto';
    default: return 'Otra página';
  }
}

function barrer(ahora: number) {
  for (const [id, s] of sesiones) {
    if (ahora - s.ultimo > CADUCA_MS) sesiones.delete(id);
  }
  for (const [id, n] of nombres) {
    if (ahora > n.hasta) nombres.delete(id);
  }
}

/** El nombre abreviado de una cuenta, guardado 10 minutos para no ir a la base en cada latido */
export async function nombreDeCuenta(userId: string, buscar: (id: string) => Promise<string | null>): Promise<string | null> {
  const guardado = nombres.get(userId);
  if (guardado && Date.now() < guardado.hasta) return guardado.nombre;
  const nombre = abreviarNombre(await buscar(userId));
  nombres.set(userId, { nombre, hasta: Date.now() + NOMBRES_MS });
  return nombre;
}

export interface Latido {
  sesion: string;
  pagina: string;
  carrito: number;
  origen: string;
  dispositivo: Dispositivo;
  userId: string | null;
  nombre: string | null;
  esEquipo: boolean;
}

export function registrarLatido(l: Latido): void {
  const ahora = Date.now();
  if (sesiones.size >= MAXIMO_SESIONES) barrer(ahora);
  const previa = sesiones.get(l.sesion);
  if (!previa && sesiones.size >= MAXIMO_SESIONES) return; // tope contra quien invente sesiones sin fin
  sesiones.set(l.sesion, {
    sesion: l.sesion, userId: l.userId, nombre: l.nombre, esEquipo: l.esEquipo, pagina: l.pagina, dispositivo: l.dispositivo,
    // El origen es el de la llegada: se conserva el primero
    origen: previa?.origen ?? l.origen, desde: previa?.desde ?? ahora, ultimo: ahora, carrito: l.carrito,
  });
}

export function quitarSesion(sesion: string): void {
  sesiones.delete(sesion);
}

export interface PersonaConectada {
  /** Cliente con cuenta o visitante sin ella */
  tipo: 'cliente' | 'visitante';
  /** "Carlos P." o "Visitante A3F" */
  etiqueta: string;
  dispositivo: Dispositivo;
  pagina: string;
  carrito: number;
  origen: string;
  /** Segundos desde que llegó */
  segundos: number;
}

export interface ResumenVisitantes {
  total: number;
  conCuenta: number;
  sinCuenta: number;
  conCarrito: number;
  dispositivos: Record<Dispositivo, number>;
  paginas: Array<{ pagina: string; cantidad: number }>;
  origenes: Array<{ origen: string; cantidad: number }>;
  lista: PersonaConectada[];
  ahora: string;
}

/** Cuatro caracteres del identificador de sesión, para distinguir a un visitante de otro sin mostrar nada que lo identifique */
function codigoCorto(sesion: string): string {
  let h = 0;
  for (let i = 0; i < sesion.length; i++) h = (h * 31 + sesion.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(3, '0').slice(-3);
}

export function resumenVisitantes(): ResumenVisitantes {
  const ahora = Date.now();
  barrer(ahora);
  // Una persona con cuenta y dos pestañas es una sola; un visitante sin cuenta es una pestaña
  const personas = new Map<string, Sesion>();
  for (const s of sesiones.values()) {
    if (s.esEquipo) continue;
    const clave = s.userId ?? s.sesion;
    const previa = personas.get(clave);
    if (!previa || s.ultimo > previa.ultimo) personas.set(clave, { ...s, carrito: Math.max(s.carrito, previa?.carrito ?? 0), desde: Math.min(s.desde, previa?.desde ?? s.desde) });
  }
  const lista = [...personas.values()].sort((a, b) => b.desde - a.desde);
  const dispositivos: Record<Dispositivo, number> = { desktop: 0, mobile: 0, tablet: 0 };
  const paginas = new Map<string, number>();
  const origenes = new Map<string, number>();
  for (const p of lista) {
    dispositivos[p.dispositivo]++;
    const etiqueta = etiquetaDePagina(p.pagina);
    paginas.set(etiqueta, (paginas.get(etiqueta) ?? 0) + 1);
    origenes.set(p.origen, (origenes.get(p.origen) ?? 0) + 1);
  }
  const ordenar = <K extends string>(m: Map<string, number>, clave: K) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nombre, cantidad]) => ({ [clave]: nombre, cantidad }) as Record<K, string> & { cantidad: number });
  return {
    total: lista.length,
    conCuenta: lista.filter((p) => p.userId).length,
    sinCuenta: lista.filter((p) => !p.userId).length,
    conCarrito: lista.filter((p) => p.carrito > 0).length,
    dispositivos,
    paginas: ordenar(paginas, 'pagina'),
    origenes: ordenar(origenes, 'origen'),
    lista: lista.slice(0, MAXIMO_LISTA).map((p) => ({
      tipo: p.userId ? 'cliente' : 'visitante',
      etiqueta: p.userId ? p.nombre ?? 'Cliente' : `Visitante ${codigoCorto(p.sesion)}`,
      dispositivo: p.dispositivo,
      pagina: etiquetaDePagina(p.pagina),
      carrito: p.carrito,
      origen: p.origen,
      segundos: Math.max(0, Math.round((ahora - p.desde) / 1000)),
    })),
    ahora: new Date(ahora).toISOString(),
  };
}
