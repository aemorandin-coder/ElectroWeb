// C-246: el proveedor puede tener varios correos de despacho (Ferrecla dio tres, 15/11): cada venta les llega a todos.
// Se guardan en `suppliers.contactEmail`, separados por coma. Puro: lo usan la API, el despacho y el panel.

export const CORREOS_MAX = 3;
const CORREO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

/** "a@x.com, b@y.com" → ["a@x.com", "b@y.com"]. Lo guardado nunca trae uno inválido */
export const correosDe = (guardado: string | null | undefined): string[] =>
  (guardado ?? '').split(/[,;\s]+/).map((c) => c.trim().toLowerCase()).filter(Boolean);

/** Lo que escribió el equipo: los correos sin repetir, o null si alguno no es válido o son más de 3 */
export function leerCorreos(texto: unknown): string[] | null {
  if (typeof texto !== 'string') return null;
  const correos = [...new Set(correosDe(texto))];
  if (correos.length > CORREOS_MAX || correos.some((c) => c.length > 120 || !CORREO.test(c))) return null;
  return correos;
}
