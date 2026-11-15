// C-249b: lo que leen del servidor las páginas del asistente de categorías (nueva y cambiar). Solo servidor.
import { prisma } from '@/lib/prisma';
import type { CategoriaRef } from './AsistenteCategoria';

export async function categoriasParaElegir(): Promise<CategoriaRef[]> {
  return prisma.category.findMany({ select: { id: true, name: true, parentId: true }, orderBy: { name: 'asc' } });
}
