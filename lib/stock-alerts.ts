// Avisos de stock (C-50b): "Avisar stock bajo" y "Avisar producto agotado" en Configuración → Tienda.
// Se avisa solo cuando una venta cruza el umbral (no en cada venta posterior). Los canales (panel, correo,
// Telegram) salen de Notificaciones → Qué avisar (C-73). Solo servidor; nunca rompe la venta.

import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';

export interface StockAlertProduct {
  name: string;
  sku: string | null;
  stock: number;
}

export interface StockChange {
  productId: string;
  /** Unidades que se acaban de descontar */
  quantity: number;
}

export interface StockCrossings {
  outOfStock: StockAlertProduct[];
  lowStock: StockAlertProduct[];
}

/** Qué productos cruzaron el umbral con este descuento. Sin base de datos para poder probarla. */
export function detectStockCrossings(
  products: { id: string; name: string; sku: string | null; stock: number; productType: string }[],
  changes: StockChange[],
  { threshold, notifyLowStock, notifyOutOfStock }: { threshold: number; notifyLowStock: boolean; notifyOutOfStock: boolean }
): StockCrossings {
  const sold = new Map<string, number>();
  for (const change of changes) sold.set(change.productId, (sold.get(change.productId) ?? 0) + change.quantity);

  const result: StockCrossings = { outOfStock: [], lowStock: [] };
  for (const product of products) {
    const quantity = sold.get(product.id) ?? 0;
    if (quantity <= 0 || product.productType === 'DIGITAL') continue;
    const before = product.stock + quantity;
    const entry = { name: product.name, sku: product.sku, stock: product.stock };
    if (product.stock <= 0) {
      if (notifyOutOfStock && before > 0) result.outOfStock.push(entry);
    } else if (notifyLowStock && product.stock <= threshold && before > threshold) {
      result.lowStock.push(entry);
    }
  }
  return result;
}

/** Revisa los productos después de descontar stock y avisa. Llamar sin await o con .catch. */
export async function notifyStockCrossings(changes: StockChange[]): Promise<StockCrossings | null> {
  if (changes.length === 0) return null;
  const [settings, products] = await Promise.all([
    prisma.companySettings.findUnique({
      where: { id: 'default' },
      select: { lowStockThreshold: true, notifyLowStock: true, notifyOutOfStock: true },
    }),
    prisma.product.findMany({
      where: { id: { in: [...new Set(changes.map((change) => change.productId))] } },
      select: { id: true, name: true, sku: true, stock: true, productType: true },
    }),
  ]);
  const options = {
    threshold: settings?.lowStockThreshold ?? 10,
    notifyLowStock: settings?.notifyLowStock ?? true,
    notifyOutOfStock: settings?.notifyOutOfStock ?? true,
  };
  if (!options.notifyLowStock && !options.notifyOutOfStock) return null;

  const crossings = detectStockCrossings(products, changes, options);
  if (crossings.outOfStock.length === 0 && crossings.lowStock.length === 0) return crossings;

  for (const product of crossings.outOfStock) {
    emitAdminEvent({
      type: 'STOCK_OUT',
      title: `Agotado · ${product.name}`.slice(0, 150),
      summary: 'Una venta dejó este producto sin stock',
      fields: [['SKU', product.sku], ['Stock', '0 unidades']],
      link: '/admin/products',
    });
  }
  for (const product of crossings.lowStock) {
    emitAdminEvent({
      type: 'STOCK_LOW',
      title: `Stock bajo · ${product.name}`.slice(0, 150),
      summary: `Quedan ${product.stock} ${product.stock === 1 ? 'unidad' : 'unidades'}`,
      fields: [['SKU', product.sku], ['Aviso desde', `${options.threshold} unidades`]],
      link: '/admin/products',
    });
  }
  return crossings;
}
