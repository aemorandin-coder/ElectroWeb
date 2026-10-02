// Formato de los documentos legales (C-103). Módulo puro: lo usan el modal de firma, el panel y el PDF.
// Texto simple, sin HTML (nada que escapar ni que inyectar):
//   "## Título"      → subtítulo
//   "### Título"     → subtítulo menor (C-160)
//   "- texto"        → viñeta
//   "!! texto"       → aviso destacado
//   línea en blanco  → separa párrafos
// C-160 (para las páginas /terminos y /privacidad, que se editan desde el panel):
//   "## Título {#ancla}"  → el título lleva un ancla (/terminos#garantia)
//   "**texto**"           → negrita dentro de una línea
//   "{{correo}}"          → un dato de Configuración o del código (`reemplazarVariables`)

export type BloqueDoc =
  | { tipo: 'subtitulo'; texto: string; id?: string }
  | { tipo: 'subsubtitulo'; texto: string; id?: string }
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'aviso'; texto: string }
  | { tipo: 'lista'; items: string[] };

/** "Garantía {#garantia}" → el texto y su ancla. El ancla: minúsculas, números y guiones. */
function conAncla(texto: string): { texto: string; id?: string } {
  const m = texto.match(/\s*\{#([a-z0-9-]{1,40})\}\s*$/);
  return m ? { texto: texto.slice(0, m.index).trim(), id: m[1] } : { texto: texto.trim() };
}

export function parsearDocumento(contenido: string): BloqueDoc[] {
  const bloques: BloqueDoc[] = [];
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length > 0) bloques.push({ tipo: 'parrafo', texto: parrafo.join(' ') });
    parrafo = [];
  };
  for (const cruda of contenido.replace(/\r\n/g, '\n').split('\n')) {
    const linea = cruda.trim();
    if (!linea) { cerrarParrafo(); continue; }
    if (linea.startsWith('### ')) { cerrarParrafo(); bloques.push({ tipo: 'subsubtitulo', ...conAncla(linea.slice(4)) }); continue; }
    if (linea.startsWith('## ')) { cerrarParrafo(); bloques.push({ tipo: 'subtitulo', ...conAncla(linea.slice(3)) }); continue; }
    if (linea.startsWith('!! ')) { cerrarParrafo(); bloques.push({ tipo: 'aviso', texto: linea.slice(3).trim() }); continue; }
    if (linea.startsWith('- ')) {
      cerrarParrafo();
      const ultimo = bloques[bloques.length - 1];
      if (ultimo?.tipo === 'lista') ultimo.items.push(linea.slice(2).trim());
      else bloques.push({ tipo: 'lista', items: [linea.slice(2).trim()] });
      continue;
    }
    parrafo.push(linea);
  }
  cerrarParrafo();
  return bloques;
}

/** Para qué se exige la firma. null: documento informativo que se firma una vez. */
export const REQUERIDO_PARA: Record<string, string> = {
  RECHARGE: 'Recargar Puntos ES',
};

/** Cédula venezolana: V o E y 6 a 9 dígitos (sin puntos ni guiones). */
export function normalizarCedula(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const limpia = raw.trim().toUpperCase().replace(/[\s.-]/g, '');
  const conLetra = /^\d/.test(limpia) ? `V${limpia}` : limpia;
  return /^[VE]\d{6,9}$/.test(conLetra) ? conLetra : null;
}

/** El texto partido en tramos con y sin negrita ("**Email:** x" → [Email: negrita, x]). Sin HTML: el que muestra lo arma. */
export function segmentosNegrita(texto: string): { texto: string; negrita: boolean }[] {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((tramo) => (/^\*\*[^*]+\*\*$/.test(tramo) ? { texto: tramo.slice(2, -2), negrita: true } : { texto: tramo, negrita: false }));
}

/** El texto sin las marcas de negrita, para el PDF. */
export const sinNegrita = (texto: string): string => texto.replace(/\*\*([^*]+)\*\*/g, '$1');

/**
 * Cambia `{{nombre}}` por su valor. Un nombre que no existe se deja como está (así se ve el error de tecleo); uno que
 * existe pero no tiene dato se muestra como "[nombre: sin dato]" para que se note en la página y se configure.
 */
export function reemplazarVariables(contenido: string, variables: Record<string, string | null | undefined>): string {
  return contenido.replace(/\{\{\s*([a-z0-9_]{1,40})\s*\}\}/g, (original, nombre: string) => {
    if (!(nombre in variables)) return original;
    const valor = variables[nombre];
    return valor && valor.trim() ? valor.trim() : `[${nombre}: sin dato]`;
  });
}
