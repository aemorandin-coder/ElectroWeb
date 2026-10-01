// Limpieza del texto que viene de páginas ajenas (C-155). Módulo puro.
// Todo lo que sale de aquí es texto plano: nunca se inserta como HTML en la tienda ni en el panel.

const ENTIDADES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', hellip: '…',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
  deg: '°', times: '×', reg: '', trade: '', copy: '', iquest: '¿', iexcl: '¡', frac12: '1/2', micro: 'µ', ordm: 'º', ordf: 'ª',
};

export function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (todo, cuerpo: string) => {
    if (cuerpo[0] === '#') {
      const codigo = cuerpo[1].toLowerCase() === 'x' ? Number.parseInt(cuerpo.slice(2), 16) : Number.parseInt(cuerpo.slice(1), 10);
      // Sin caracteres de control ni fuera de rango
      if (!Number.isFinite(codigo) || codigo < 32 || codigo > 0x10ffff) return ' ';
      try { return String.fromCodePoint(codigo); } catch { return ' '; }
    }
    return cuerpo in ENTIDADES ? ENTIDADES[cuerpo] : todo;
  });
}

/** HTML a texto de una línea: sin etiquetas, sin guiones ni estilos, sin caracteres de control y con un solo espacio */
export function textoPlano(html: string, maximo = 400): string {
  const sinBloques = html
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decodificarEntidades(sinBloques)
    // Controles, marcas invisibles y símbolos de marca registrada
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060\ufeff\u00ae\u2122\u00a9]/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximo)
    .trim();
}

/** Para comparar textos: sin tildes ni mayúsculas, solo letras y números */
export function clave(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Palabras con significado de un nombre de producto (sin artículos ni preposiciones) */
export function palabras(texto: string): string[] {
  const vacias = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'para', 'por', 'y', 'en', 'un', 'una', 'the', 'and', 'with', 'for', 'of']);
  return clave(texto).split(' ').filter((p) => p.length > 1 && !vacias.has(p));
}
