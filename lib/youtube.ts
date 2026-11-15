// C-254: un enlace de YouTube, leído de una sola forma. La usa el servidor para validar lo que se guarda (el video de la
// entrega del sorteo) y el panel para decir, mientras se escribe, si el enlace sirve. Pura: sin dependencias.
// Acepta solo YouTube (youtube.com, m.youtube.com, youtu.be y youtube-nocookie.com) y un id de 11 letras: cualquier otra
// cosa (Instagram, un "javascript:", un id cortado) no es un video.

export interface VideoYoutube {
  /** El id de 11 letras */
  id: string;
  /** Un Short: se ve vertical */
  vertical: boolean;
}

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);

/** El video de un enlace de YouTube, o null si no lo es */
export function leerYoutube(enlace: string | null | undefined): VideoYoutube | null {
  const texto = (enlace ?? '').trim();
  if (!texto || texto.length > 300) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || (url.port && url.port !== '443' && url.port !== '80')) return null;
  const host = url.hostname.toLowerCase();
  const partes = url.pathname.split('/').filter(Boolean);
  let id: string | null = null;
  let vertical = false;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = partes[0] ?? null;
  } else if (HOSTS.has(host)) {
    if (partes[0] === 'watch') id = url.searchParams.get('v');
    else if (partes[0] === 'shorts') { id = partes[1] ?? null; vertical = true; }
    else if (partes[0] === 'embed' || partes[0] === 'live' || partes[0] === 'v') id = partes[1] ?? null;
  }
  return id && ID.test(id) ? { id, vertical } : null;
}

/** El enlace que se guarda: siempre el mismo para el mismo video */
export const enlaceYoutube = (v: VideoYoutube) => (v.vertical ? `https://www.youtube.com/shorts/${v.id}` : `https://youtu.be/${v.id}`);

/** El reproductor sin cookies (el CSP ya lo permite), para abrirlo cuando alguien toca el video */
export const reproductorYoutube = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
