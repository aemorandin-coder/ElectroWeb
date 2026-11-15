import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import AsistenteCategoria from '../_components/AsistenteCategoria';
import { categoriasParaElegir } from '../_components/servidor';

// C-249b: cambiar una categoría, por pasos (PLAN.md §1.9). El último paso dice qué cambia y cuántos productos y
// subcategorías van con ella; guarda con la versión con que se abrió (C-170).
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambiar categoría' };

export default async function PaginaCambiarCategoria({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_PRODUCTS')) redirect('/admin');
  const { id } = await params;
  const [c, categorias] = await Promise.all([
    prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: { where: { eliminadoAt: null } }, children: true } } } }),
    categoriasParaElegir(),
  ]);
  if (!c) notFound();
  return (
    <AsistenteCategoria
      key={c.updatedAt.toISOString()}
      categoria={{
        id: c.id, name: c.name, slug: c.slug, description: c.description, image: c.image, icon: c.icon, color: c.color, parentId: c.parentId,
        isDepartment: c.isDepartment, updatedAt: c.updatedAt.toISOString(), productos: c._count.products, subcategorias: c._count.children,
      }}
      categorias={categorias}
    />
  );
}
