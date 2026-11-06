// C-169: papelera de productos. Solo servidor.
//
// "Eliminar" un producto ya no lo borra: lo deja en ARCHIVED (la tienda solo muestra PUBLISHED, así que desaparece al instante
// del catálogo, el buscador, el sitemap y el feed) con `deletedAt`, quién lo movió y el estado que tenía. Se restaura con un
// toque. Se borra de verdad solo desde la papelera, por el dueño o a los 30 días (cron `/api/cron/papelera`).
//
// C-187: un producto con ventas no se puede borrar de la base (sus órdenes, garantías, reseñas y códigos entregados lo usan).
// Antes salía de la papelera como "Archivado" y volvía a la lista: el zombi que Andrés no podía eliminar. Ahora queda
// ELIMINADO (`eliminadoAt`): fuera de la lista, de la papelera y de la tienda para siempre, con toda su historia intacta.

import { Prisma } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';

export const DIAS_PAPELERA = 30;

/** `conservado`: tenía ventas; quedó eliminado y oculto, sin tocar su historia */
export type ResultadoBorrado = 'borrado' | 'conservado' | 'no_existe';

/** Lo que está en la papelera (lo eliminado ya no cuenta como papelera) */
export const EN_PAPELERA: Prisma.ProductWhereInput = { deletedAt: { not: null }, eliminadoAt: null };
/** Lo eliminado que se conserva por sus ventas */
export const ELIMINADOS: Prisma.ProductWhereInput = { eliminadoAt: { not: null } };

/**
 * Borra el producto de la base. Si ya se vendió (tiene órdenes) no se puede: queda eliminado, que para el panel y la tienda
 * es lo mismo que borrado, pero sus órdenes siguen completas. Los códigos digitales ya vendidos tampoco se borran; si una
 * llave impide el borrado, pasa lo mismo.
 */
export async function borrarParaSiempre(id: string): Promise<ResultadoBorrado> {
  const producto = await prisma.product.findUnique({
    where: { id },
    select: { id: true, deletedAt: true, eliminadoAt: true, _count: { select: { orderItems: true } } },
  });
  if (!producto) return 'no_existe';
  if (producto.eliminadoAt) return 'conservado';

  const conservar = async (): Promise<ResultadoBorrado> => {
    // No se toca nada de lo relacionado (reseñas, códigos, favoritos): si el dueño lo recupera, vuelve entero.
    // Un producto eliminado no se destaca: si algún día se recupera, vuelve como borrador y sin destacar.
    await prisma.product.updateMany({
      where: { id, eliminadoAt: null },
      data: { status: 'ARCHIVED', isFeatured: false, eliminadoAt: new Date(), deletedAt: producto.deletedAt ?? new Date() },
    });
    return 'conservado';
  };
  if (producto._count.orderItems > 0) return conservar();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.review.deleteMany({ where: { productId: id } });
      await tx.stockReservation.deleteMany({ where: { productId: id } });
      await tx.wishlistItem.deleteMany({ where: { productId: id } });
      await tx.digitalCode.deleteMany({ where: { productId: id, status: { in: ['AVAILABLE', 'RESERVED', 'EXPIRED', 'INVALID'] } } });
      await tx.product.delete({ where: { id } });
    });
    return 'borrado';
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Una llave que no se esperaba (una venta que entró mientras tanto): se conserva en vez de fallar
      if (error.code === 'P2003') return conservar();
      // Otra persona lo borró en el mismo momento
      if (error.code === 'P2025') return 'no_existe';
    }
    throw error;
  }
}

/** Borra lo que lleva más de 30 días en la papelera. Lo llama el cron diario. Lo eliminado no se vuelve a mirar. */
export async function vaciarPapeleraVencida(): Promise<{ revisados: number; borrados: number; conservados: number }> {
  const limite = new Date(Date.now() - DIAS_PAPELERA * 24 * 3_600_000);
  const vencidos = await prisma.product.findMany({ where: { ...EN_PAPELERA, deletedAt: { lt: limite } }, select: { id: true, name: true, sku: true } });
  let borrados = 0;
  let conservados = 0;
  for (const p of vencidos) {
    const resultado = await borrarParaSiempre(p.id);
    if (resultado === 'borrado') borrados++;
    if (resultado === 'conservado') conservados++;
    await createAuditLog({
      action: 'PRODUCT_PURGED',
      targetType: 'PRODUCT',
      targetId: p.id,
      details: { origen: `Papelera: pasaron ${DIAS_PAPELERA} días`, producto: p.name, sku: p.sku, resultado },
    });
  }
  return { revisados: vencidos.length, borrados, conservados };
}
