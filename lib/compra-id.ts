// La llave de la compra (C-284). Módulo puro: la crea el checkout y la lee POST /api/orders.
//
// Cada intento de compra del checkout lleva su llave. Las órdenes que salen de un mismo envío (dos paquetes, o lo físico
// y lo digital) la comparten en `Order.compraId`. Si el envío llega dos veces (un doble toque, un reintento por la red),
// el servidor devuelve las órdenes que ya existen: no crea otras ni cobra otra vez.

/** Letras, números, guion y guion bajo, de 16 a 64 caracteres (un UUID cumple). */
const FORMATO_COMPRA_ID = /^[A-Za-z0-9_-]{16,64}$/;

/** La llave que mandó el navegador si tiene la forma esperada; si no, null (el servidor pone la suya). */
export function leerCompraId(valor: unknown): string | null {
  return typeof valor === 'string' && FORMATO_COMPRA_ID.test(valor) ? valor : null;
}

/**
 * Una llave nueva, para el navegador: `crypto.randomUUID()` y, donde no exista (una página sin HTTPS o un navegador
 * viejo), 128 bits al azar en hexadecimal (`getRandomValues` o, si tampoco hay, `Math.random`).
 */
export function nuevaCompraId(): string {
  const web = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (typeof web?.randomUUID === 'function') return web.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof web?.getRandomValues === 'function') web.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
