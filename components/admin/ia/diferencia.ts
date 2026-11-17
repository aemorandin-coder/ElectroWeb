// C-288 · Qué líneas cambian entre unas instrucciones y otras, para el paso "Revisar y publicar" (antes → después). Puro.

export interface LineaDeDiferencia {
  tipo: 'igual' | 'quita' | 'agrega';
  texto: string;
}

/** Las líneas de un texto con la marca de lo que se quitó y lo que se agregó (la subsecuencia común más larga, por líneas) */
export function diferenciaDeLineas(antes: string, despues: string): LineaDeDiferencia[] {
  const a = antes.split('\n');
  const b = despues.split('\n');
  // Un texto enorme no se compara línea por línea: se muestra todo lo viejo como quitado y todo lo nuevo como agregado
  if (a.length * b.length > 1_000_000) {
    return [...a.map((texto) => ({ tipo: 'quita' as const, texto })), ...b.map((texto) => ({ tipo: 'agrega' as const, texto }))];
  }
  const ancho = b.length + 1;
  const tabla = new Uint16Array((a.length + 1) * ancho);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      tabla[i * ancho + j] = a[i] === b[j] ? tabla[(i + 1) * ancho + j + 1] + 1 : Math.max(tabla[(i + 1) * ancho + j], tabla[i * ancho + j + 1]);
    }
  }
  const salida: LineaDeDiferencia[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      salida.push({ tipo: 'igual', texto: a[i] });
      i++; j++;
    } else if (tabla[(i + 1) * ancho + j] >= tabla[i * ancho + j + 1]) {
      salida.push({ tipo: 'quita', texto: a[i++] });
    } else {
      salida.push({ tipo: 'agrega', texto: b[j++] });
    }
  }
  while (i < a.length) salida.push({ tipo: 'quita', texto: a[i++] });
  while (j < b.length) salida.push({ tipo: 'agrega', texto: b[j++] });
  return salida;
}
