// C-210: cuándo salió cada producto a la tienda (`products.publishedAt`). "Recién llegados" ordena por esto, y no por la
// fecha de creación: la carga del proveedor crea en borrador y se publica días después (Andrés, 13/11: "estoy incluyendo
// todos los productos nuevos y no aparecen"). Se llena al publicar por primera vez y nunca se pisa: despublicar y volver a
// publicar no lo vuelve "nuevo".
// Un producto suelto la lleva en su misma escritura (`fechaDePublicacion`): una segunda escritura le cambiaría la versión
// al editor abierto (C-169) y daría un conflicto falso. Los cambios en lote usan `marcarPublicados`.

import { prisma } from '@/lib/prisma';

/** Lo que se suma a la escritura de un producto: la fecha, solo si con esto queda publicado y nunca lo estuvo. */
export function fechaDePublicacion(estadoNuevo: unknown, publicadoAntes: Date | null | undefined): { publishedAt?: Date } {
  return estadoNuevo === 'PUBLISHED' && !publicadoAntes ? { publishedAt: new Date() } : {};
}

/** Pone la fecha de hoy a los de `ids` que ya están publicados y todavía no la tienen. */
export async function marcarPublicados(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { count } = await prisma.product.updateMany({
    where: { id: { in: ids }, status: 'PUBLISHED', publishedAt: null },
    data: { publishedAt: new Date() },
  });
  return count;
}
