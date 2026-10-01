// Códigos de barras de un producto (C-155). Módulo puro.
// Un GTIN mal copiado es peor que ninguno (Meta y Google lo cruzan con su catálogo): solo se propone si la cifra de
// control cuadra y no es un código interno de una tienda.

/** Solo las cifras de un texto que parece un código de barras; '' si no lo parece */
export function soloCifras(texto: string): string {
  const cifras = texto.replace(/[\s-]/g, '');
  return /^\d{8,14}$/.test(cifras) ? cifras : '';
}

/** Cifra de control GS1 (EAN-8, UPC-A de 12, EAN-13 y GTIN-14) */
export function controlValido(codigo: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(codigo)) return false;
  const cifras = codigo.split('').map(Number);
  const control = cifras.pop() as number;
  // Desde la derecha, pesos 3 y 1 alternados
  const suma = cifras.reverse().reduce((total, cifra, i) => total + cifra * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === control;
}

/**
 * Prefijos GS1 de uso interno: 02, 04 y 2 (artículos de peso variable y códigos que cada tienda asigna en su caja).
 * No identifican el producto fuera de esa tienda.
 */
function esInterno(codigo: string): boolean {
  const ean13 = codigo.length === 12 ? `0${codigo}` : codigo.length === 14 ? codigo.slice(1) : codigo;
  if (ean13.length !== 13) return false;
  return /^(02|04|2)/.test(ean13) || /^0{6}/.test(ean13);
}

/** El código, normalizado, si sirve para identificar el producto; '' si no */
export function codigoUtil(texto: string): string {
  const codigo = soloCifras(texto);
  if (!codigo || !controlValido(codigo) || esInterno(codigo)) return '';
  // Un UPC escrito con un cero delante es el mismo código
  return codigo.length === 13 && codigo.startsWith('0') ? codigo.slice(1) : codigo;
}
