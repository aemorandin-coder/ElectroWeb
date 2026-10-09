// C-169: papelera de productos. Solo servidor.
//
// "Eliminar" un producto ya no lo borra: lo deja en ARCHIVED (la tienda solo muestra PUBLISHED, así que desaparece al instante
// del catálogo, el buscador, el sitemap y el feed) con `deletedAt`, quién lo movió y el estado que tenía. Se restaura con un
// toque. Se borra de verdad solo desde la papelera, por el dueño o a los 30 días (cron `/api/cron/papelera`).

import { Prisma } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';

export const DIAS_PAPELERA = 30;

export type ResultadoBorrado = 'borrado' | 'archivado' | 'no_existe';

/**
 * Borra el producto de la base. Si ya se vendió (tiene órdenes) no se puede: sale de la papelera y queda archivado, como
 * siempre se hizo. Los códigos digitales ya vendidos tampoco se borran; si impiden el borrado, pasa lo mismo.
 */
export async function borrarParaSiempre(id: string): Promise<ResultadoBorrado> {
  const producto = await prisma.product.findUnique({ where: { id }, select: { id: true, orderItems: { select: { id: true }, take: 1 } } });
  if (!producto) return 'no_existe';

  const archivar = async (): Promise<ResultadoBorrado> => {
    await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: null, deletedById: null, statusAntesDePapelera: null } });
    return 'archivado';
  };
  if (producto.orderItems.length > 0) return archivar();

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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return archivar();
    throw error;
  }
}

/** Borra lo que lleva más de 30 días en la papelera. Lo llama el cron diario. */
export async function vaciarPapeleraVencida(): Promise<{ revisados: number; borrados: number; archivados: number }> {
  const limite = new Date(Date.now() - DIAS_PAPELERA * 24 * 3_600_000);
  const vencidos = await prisma.product.findMany({ where: { deletedAt: { lt: limite } }, select: { id: true, name: true, sku: true } });
  let borrados = 0;
  let archivados = 0;
  for (const p of vencidos) {
    const resultado = await borrarParaSiempre(p.id);
    if (resultado === 'borrado') borrados++;
    if (resultado === 'archivado') archivados++;
    await createAuditLog({
      action: 'PRODUCT_PURGED',
      targetType: 'PRODUCT',
      targetId: p.id,
      details: { origen: `Papelera: pasaron ${DIAS_PAPELERA} días`, producto: p.name, sku: p.sku, resultado },
    });
  }
  return { revisados: vencidos.length, borrados, archivados };
}
