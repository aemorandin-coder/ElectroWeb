// Una sola forma de escribir la referencia y el banco de un Pago Móvil (S-01). Módulo puro: lo usan la verificación y la
// orden en el servidor, y se prueba sin base de datos.
//
// Los dos datos llegan del navegador tal cual. La misma referencia puede venir con espacios de más, y el banco compara
// por los últimos dígitos: "5678" y "12345678" pueden ser el mismo pago. Para reconocerlo, el servidor trabaja siempre
// con la forma canónica de aquí: para buscar, para el candado, para consultar al banco y para guardar.

import { BANCOS_VENEZUELA } from './bancos-venezuela';

/** Referencia canónica: de 4 a 8 dígitos, sin ningún espacio. `null` si no viene como texto o no tiene ese formato. */
export function referenciaCanonica(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpia = valor.replace(/\s/g, '');
  return /^\d{4,8}$/.test(limpia) ? limpia : null;
}

/** Banco canónico: el código de 4 dígitos de un banco de la lista. `null` si no viene como texto o no es uno de ellos. */
export function bancoCanonico(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return BANCOS_VENEZUELA.some((banco) => banco.codigo === limpio) ? limpio : null;
}

/**
 * ¿Son la misma referencia? Las dos ya canónicas: iguales, o una termina en la otra (el banco compara por los últimos
 * dígitos, así que "5678" es el final de "12345678").
 */
export function mismaReferencia(a: string, b: string): boolean {
  return a === b || a.endsWith(b) || b.endsWith(a);
}

/**
 * Clave del candado de un pago: el banco y los últimos 4 dígitos. Todas las formas de escribir un mismo pago (4, 5, 6, 7
 * u 8 dígitos) comparten esa clave, así que se esperan entre sí.
 */
export function claveDeCandado(banco: string, referencia: string): string {
  return `${banco}:${referencia.slice(-4)}`;
}
