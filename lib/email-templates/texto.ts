/**
 * C-219: la versión de solo texto de un correo, armada desde su HTML. Antes era el HTML sin etiquetas: quedaba el título de
 * la página, los espacios de las tablas y los enlaces sin dirección, y los filtros de spam castigan esa diferencia.
 * Aquí: sin la cabecera ni el texto escondido de la bandeja, un renglón por párrafo o fila, y cada enlace con su dirección.
 */

const ENTIDADES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#10003;': '✓', '&#847;': '', '&zwnj;': '',
  '&rarr;': '→', '&middot;': '·',
};

export function htmlATexto(html: string): string {
  let t = html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // El texto escondido que se ve en la bandeja (preheader)
    .replace(/<div style="display:none[\s\S]*?<\/div>/i, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Un enlace: su texto y, si el texto no es la dirección, la dirección entre paréntesis
  t = t.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, contenido: string) => {
    const texto = contenido.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '$1').replace(/<[^>]*>/g, '').trim();
    if (!/^https?:\/\//i.test(href)) return texto;
    if (!texto) return '';
    return texto.includes(href) ? texto : `${texto} (${href})`;
  });

  t = t
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|h1|h2|h3|tr|li|ol|ul|div|table)>/gi, '\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<[^>]*>/g, '');

  t = t.replace(/&[a-z]+;|&#\d+;/gi, (entidad) => ENTIDADES[entidad] ?? entidad);

  return t
    .split('\n')
    .map((linea) => linea.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
