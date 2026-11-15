// C-249d: lo que leen del servidor las páginas del asistente de promotores (nuevo y cambiar). Solo servidor.
import { prisma } from '@/lib/prisma';
import { getPublicSettings } from '@/lib/site-settings';
import type { Ejemplo } from './AsistentePromotor';

/**
 * Para el ejemplo de la vista previa: un producto nuevo y físico de la tienda (el código de un promotor no aplica a los usados
 * ni a los digitales, C-119) y el IVA que va dentro de los precios hoy (la comisión es sobre los productos sin IVA, C-167).
 */
export async function ejemploDeCompra(): Promise<Ejemplo> {
  const [producto, ajustes] = await Promise.all([
    prisma.product.findFirst({
      where: { status: 'PUBLISHED', productType: 'PHYSICAL', condition: 'NEW', deletedAt: null, stock: { gt: 0 }, priceUSD: { gt: 0 } },
      select: { name: true, priceUSD: true },
      orderBy: { updatedAt: 'desc' },
    }),
    getPublicSettings(),
  ]);
  return {
    producto: producto ? { nombre: producto.name, precioUSD: Number(producto.priceUSD) } : null,
    ivaPorcentaje: ajustes.taxEnabled ? ajustes.taxPercent : 0,
  };
}
