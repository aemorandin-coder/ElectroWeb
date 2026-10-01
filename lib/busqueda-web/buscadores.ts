import { descargar } from './descarga';
import { textoPlano } from './texto';

// Buscadores sin clave (C-155). Decisión de Andrés del 01/10: sin API de pago, leyendo páginas.
// Es frágil a propósito: si un buscador cambia su página o deja de responder al servidor, se prueba el siguiente y,
// si ninguno responde, la búsqueda dice que no encontró. Nada de esto tumba el asistente.

export interface ResultadoBusqueda {
  url: string;
  titulo: string;
  resumen: string;
}

/** Sitios que no dan ficha técnica (videos, redes) o que al servidor le responden con un muro de JavaScript (Mercado Libre) */
const DOMINIOS_SIN_FICHA = /(^|\.)(mercadolibre\.[a-z.]+|mercadolivre\.[a-z.]+|youtube\.com|youtu\.be|facebook\.com|instagram\.com|tiktok\.com|pinterest\.[a-z.]+|twitter\.com|x\.com|reddit\.com|linkedin\.com|wikipedia\.org|duckduckgo\.com|bing\.com|google\.[a-z.]+)$/i;

export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function utilizable(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/\.(pdf|docx?|xlsx?|zip|jpe?g|png|webp)(\?|#|$)/i.test(url)) return false;
  const dominio = dominioDe(url);
  return Boolean(dominio) && !DOMINIOS_SIN_FICHA.test(dominio);
}

/** DuckDuckGo (versión HTML): cada resultado enlaza a /l/?uddg=<dirección real>. Los anuncios pasan por y.js */
export function leerDuckDuckGo(html: string): ResultadoBusqueda[] {
  const resultados: ResultadoBusqueda[] = [];
  const bloques = html.split(/<div[^>]+class="[^"]*\bresult\b[^"]*"/i).slice(1);
  for (const bloque of bloques) {
    const enlace = bloque.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!enlace) continue;
    const crudo = enlace[1].replace(/&amp;/g, '&');
    let url = crudo;
    const uddg = crudo.match(/[?&]uddg=([^&]+)/);
    if (uddg) {
      try { url = decodeURIComponent(uddg[1]); } catch { continue; }
    } else if (crudo.startsWith('//')) {
      url = `https:${crudo}`;
    }
    if (/duckduckgo\.com\/y\.js/i.test(url)) continue;
    const resumen = bloque.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '';
    resultados.push({ url, titulo: textoPlano(enlace[2]), resumen: textoPlano(resumen) });
  }
  return resultados;
}

/** Bing: <li class="b_algo"> con el enlace en <h2>. A veces el enlace pasa por /ck/a?…&u=a1<base64> */
export function leerBing(html: string): ResultadoBusqueda[] {
  const resultados: ResultadoBusqueda[] = [];
  const bloques = html.split(/<li[^>]+class="b_algo"/i).slice(1);
  for (const bloque of bloques) {
    const enlace = bloque.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!enlace) continue;
    let url = enlace[1].replace(/&amp;/g, '&');
    const codificada = url.match(/[?&]u=a1([A-Za-z0-9_-]+)/);
    if (/bing\.com\/ck\/a/i.test(url) && codificada) {
      try { url = Buffer.from(codificada[1], 'base64url').toString('utf8'); } catch { continue; }
    }
    const resumen = bloque.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '';
    resultados.push({ url, titulo: textoPlano(enlace[2]), resumen: textoPlano(resumen) });
  }
  return resultados;
}

const BUSCADORES: Array<{ nombre: string; direccion: (q: string) => string; leer: (html: string) => ResultadoBusqueda[] }> = [
  { nombre: 'duckduckgo', direccion: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=xl-es`, leer: leerDuckDuckGo },
  { nombre: 'bing', direccion: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=es&cc=us`, leer: leerBing },
];

/**
 * Resultados utilizables de la primera página del primer buscador que responda, sin repetir dominio.
 * `buscador` es null si ninguno respondió.
 */
export async function buscarEnLaWeb(consulta: string, maximo = 8): Promise<{ buscador: string | null; resultados: ResultadoBusqueda[] }> {
  for (const buscador of BUSCADORES) {
    try {
      const pagina = await descargar(buscador.direccion(consulta), { tiempoMs: 6000 });
      const vistos = new Set<string>();
      const resultados = buscador.leer(pagina.texto).filter((r) => {
        if (!utilizable(r.url)) return false;
        const dominio = dominioDe(r.url);
        if (vistos.has(dominio)) return false;
        vistos.add(dominio);
        return true;
      });
      if (resultados.length > 0) return { buscador: buscador.nombre, resultados: resultados.slice(0, maximo) };
    } catch {
      // El siguiente buscador
    }
  }
  return { buscador: null, resultados: [] };
}
