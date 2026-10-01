// Búsqueda de productos para cotizar (C-148b): la parte pura, sin base de datos, para poder probarla sola.
// Lo que hace "inteligente" al buscador: no distingue mayúsculas ni acentos, acepta varias palabras en cualquier
// orden, entiende plurales ("cargadores" encuentra "Cargador") y perdona un error de tecleo ("samsumg").

/** Minúsculas y sin acentos: "Batería" → "bateria". */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Las palabras de la búsqueda, normalizadas y sin plural. Seis como máximo. */
export function terminosDeBusqueda(busqueda: string): string[] {
  return normalizar(busqueda)
    .split(/[^a-z0-9ñ.+#/-]+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => {
      // Solo palabras: a un código ("a55s") no se le quita nada
      if (!/^[a-zñ]+$/.test(t)) return t;
      if (t.length > 5 && t.endsWith('es')) return t.slice(0, -2);
      if (t.length > 3 && t.endsWith('s')) return t.slice(0, -1);
      return t;
    });
}

/**
 * Distancia de edición con tope: devuelve `tope + 1` en cuanto la supera. Cuenta como un solo error el cambio de dos
 * letras seguidas ("tecaldo" por "teclado"), que es el descuido más común al teclear.
 */
export function distancia(a: string, b: string, tope: number): number {
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let antesDeAnterior: number[] = [];
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    let minimo = i;
    for (let j = 1; j <= b.length; j++) {
      let valor = Math.min(anterior[j] + 1, fila[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) valor = Math.min(valor, antesDeAnterior[j - 2] + 1);
      fila.push(valor);
      if (valor < minimo) minimo = valor;
    }
    if (minimo > tope) return tope + 1;
    antesDeAnterior = anterior;
    anterior = fila;
  }
  return Math.min(anterior[b.length], tope + 1);
}

/** Errores de tecleo que se perdonan según el largo de la palabra. */
const erroresPermitidos = (termino: string) => (termino.length < 4 ? 0 : termino.length < 8 ? 1 : 2);

/** ¿El término se parece a alguna palabra del texto? Compara contra el comienzo de cada palabra. */
export function seParece(termino: string, palabras: string[]): boolean {
  const tope = erroresPermitidos(termino);
  if (tope === 0) return false;
  return palabras.some((p) => p.length >= termino.length - tope && distancia(termino, p.slice(0, termino.length + tope), tope) <= tope);
}

export interface TextoDeProducto {
  name: string;
  sku: string;
  barcode: string | null;
  marca: string | null;
  categoria: string | null;
}

/**
 * Qué tan bien responde un producto a la búsqueda (más es mejor). El código exacto manda; después, el nombre que
 * empieza por lo escrito; después, las palabras que empiezan por cada término; al final, marca y categoría.
 */
export function puntaje(producto: TextoDeProducto, busqueda: string, terminos: string[]): number {
  const nombre = normalizar(producto.name);
  const sku = normalizar(producto.sku);
  const codigo = normalizar(producto.barcode ?? '');
  const resto = normalizar(`${producto.marca ?? ''} ${producto.categoria ?? ''}`);
  const entera = normalizar(busqueda).trim();
  const palabras = nombre.split(/[^a-z0-9ñ]+/).filter(Boolean);

  let puntos = 0;
  if (entera && (sku === entera || codigo === entera)) puntos += 100;
  if (entera && nombre.startsWith(entera)) puntos += 40;
  else if (entera && nombre.includes(entera)) puntos += 20;
  for (const t of terminos) {
    if (palabras.some((p) => p.startsWith(t))) puntos += 10;
    else if (nombre.includes(t)) puntos += 6;
    else if (sku.includes(t) || codigo.includes(t)) puntos += 5;
    else if (resto.includes(t)) puntos += 3;
    else if (seParece(t, palabras)) puntos += 2;
  }
  return puntos;
}
