// Ítems del carrito → lo que se manda al servidor (C-102: lo comparten el carrito y el checkout).
// Solo ids, cantidades y la cuenta de recarga: el precio siempre lo pone el servidor.

export interface CartItemRef {
  id: string;
  quantity: number;
  productType?: 'PHYSICAL' | 'DIGITAL';
  digitalVariantId?: string;
  digitalUsername?: string;
}

// Los productos digitales usan ids de carrito "productId-variante[-cuenta]" (C-60) o, en carritos
// guardados antes, "productId-monto[-usuario]": el servidor acepta ambos
export function parseCartItemId(item: CartItemRef): { productId: string; digitalAmount?: number; digitalVariantId?: string } {
  if (item.productType !== 'DIGITAL' || !item.id.includes('-')) return { productId: item.id };
  const [productId, amount] = item.id.split('-');
  if (item.digitalVariantId) return { productId, digitalVariantId: item.digitalVariantId };
  const digitalAmount = Number(amount);
  return Number.isFinite(digitalAmount) && digitalAmount > 0 ? { productId, digitalAmount } : { productId };
}

// Lo único que se envía al servidor por producto: el precio lo pone el servidor
export function toOrderItem(item: CartItemRef) {
  return {
    ...parseCartItemId(item),
    quantity: item.quantity,
    digitalUsername: item.digitalUsername,
  };
}
