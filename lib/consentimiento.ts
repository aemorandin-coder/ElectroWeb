// C-223: el permiso de cookies del cliente (el equipo, 14/11: el aviso va antes de encender Google Analytics y el píxel).
// Las necesarias (sesión, carrito, pago) van siempre. La medición (Google Analytics) y los anuncios (el píxel de Meta),
// solo con su sí: hasta entonces Google va en modo sin cookies (Consent Mode) y el píxel no se carga.
// Se guarda en el navegador del cliente; sin herramientas de terceros configuradas no hay nada que pedir y no sale el aviso.

export interface Consentimiento {
  v: 1;
  /** Google Analytics: qué páginas se ven */
  medicion: boolean;
  /** Píxel de Meta: medir y mostrar anuncios */
  anuncios: boolean;
  /** Cuándo eligió (ISO) */
  fecha: string;
}

const CLAVE = 'es-cookies';
/** Sin almacenamiento (navegación privada estricta), la elección vale al menos para esta visita */
let enMemoria: string | null = null;
/** Se avisa a la página cuando el cliente elige (el rastreador enciende o apaga lo que corresponde) */
export const EVENTO_CONSENTIMIENTO = 'es-cookies-elegido';
/** "Preferencias de cookies" del pie vuelve a abrir el aviso */
export const EVENTO_ABRIR_PREFERENCIAS = 'es-cookies-abrir';

/** Hay algo de terceros que pedir: Google Analytics o el píxel, con su clave en el servidor */
export const hayTerceros = (): boolean => Boolean(process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID);

export function leerConsentimiento(): Consentimiento | null {
  try {
    const c = JSON.parse(consentimientoGuardado() || 'null') as Partial<Consentimiento> | null;
    return c && c.v === 1 && typeof c.medicion === 'boolean' && typeof c.anuncios === 'boolean'
      ? { v: 1, medicion: c.medicion, anuncios: c.anuncios, fecha: typeof c.fecha === 'string' ? c.fecha : '' }
      : null;
  } catch {
    // Sin almacenamiento (navegación privada estricta): como si no hubiera elegido
    return null;
  }
}

/** Lo guardado, tal cual ('' si todavía no eligió): para useSyncExternalStore, que necesita un valor que no cambie solo */
export function consentimientoGuardado(): string {
  try { return localStorage.getItem(CLAVE) ?? enMemoria ?? ''; } catch { return enMemoria ?? ''; }
}

export function guardarConsentimiento(medicion: boolean, anuncios: boolean): Consentimiento {
  const c: Consentimiento = { v: 1, medicion, anuncios, fecha: new Date().toISOString() };
  enMemoria = JSON.stringify(c);
  try { localStorage.setItem(CLAVE, enMemoria); } catch { /* no se recuerda, pero vale para esta visita */ }
  window.dispatchEvent(new CustomEvent<Consentimiento>(EVENTO_CONSENTIMIENTO, { detail: c }));
  return c;
}

export const abrirPreferencias = () => window.dispatchEvent(new Event(EVENTO_ABRIR_PREFERENCIAS));
