// Avisos de stock (C-50b): "Avisar stock bajo" y "Avisar producto agotado" en Configuración → Tienda.
// Se avisa solo cuando una venta cruza el umbral (no en cada venta posterior), por correo a la lista
// de alertas y como notificación a los administradores. Solo servidor; nunca rompe la venta.

import { prisma } from '@/lib/prisma';
import { sendStockAlert, type StockAlertProduct } from '@/lib/admin-alerts';
import { createNotification } from '@/lib/notifications';

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

  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } });
  const messages = [
    ...crossings.outOfStock.map((product) => ({ title: 'Producto agotado', message: `${product.name} se quedó sin stock.` })),
    ...crossings.lowStock.map((product) => ({ title: 'Stock bajo', message: `${product.name}: quedan ${product.stock} unidades.` })),
  ];
  await Promise.all(
    admins.flatMap((admin) =>
      messages.map(({ title, message }) =>
        createNotification({ userId: admin.id, type: 'STOCK_ALERT', title, message, link: '/admin/products', icon: 'package' })
      )
    )
  );
  await sendStockAlert({ ...crossings, threshold: options.threshold, baseUrl: process.env.NEXTAUTH_URL });
  return crossings;
}
