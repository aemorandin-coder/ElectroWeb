// C-276: el número de WhatsApp de un cliente, en un solo lugar (antes, cada pantalla lo armaba a su manera: Garantías no
// agregaba el 58). wa.me pide el número con su código de país y sin signos: "0414-111.22.33" → "584141112233".

export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const d = telefono.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('58')) return d;
  if (d.length === 11 && d.startsWith('0')) return `58${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('4')) return `58${d}`;
  return d.length >= 11 ? d : null;
}

/** El enlace para abrir el chat, con el mensaje escrito si se pasa */
export function enlaceWhatsApp(telefono: string | null | undefined, mensaje?: string): string | null {
  const numero = numeroWhatsApp(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
}

/** "04141112233" o "+58 414 1112233" → "0414-111-2233", para leerlo en pantalla */
export function telefonoLegible(telefono: string | null | undefined): string | null {
  const numero = numeroWhatsApp(telefono);
  if (!numero || !numero.startsWith('58') || numero.length !== 12) return telefono?.trim() || null;
  const local = `0${numero.slice(2)}`;
  return `${local.slice(0, 4)}-${local.slice(4, 7)}-${local.slice(7)}`;
}
