// Formato de los documentos legales (C-103). Módulo puro: lo usan el modal de firma, el panel y el PDF.
// Texto simple, sin HTML (nada que escapar ni que inyectar):
//   "## Título"      → subtítulo
//   "- texto"        → viñeta
//   "!! texto"       → aviso destacado
//   línea en blanco  → separa párrafos

export type BloqueDoc =
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'aviso'; texto: string }
  | { tipo: 'lista'; items: string[] };

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
    if (linea.startsWith('## ')) { cerrarParrafo(); bloques.push({ tipo: 'subtitulo', texto: linea.slice(3).trim() }); continue; }
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
