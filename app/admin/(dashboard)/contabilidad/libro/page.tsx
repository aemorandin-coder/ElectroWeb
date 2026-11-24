import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';

export default async function PaginaLibroRedirect({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'VER_CONTABILIDAD')) {
    redirect(hasPermission(session, 'FACTURAR') ? '/admin/contabilidad/facturas' : '/admin');
  }
  const { mes } = await searchParams;
  redirect(`/admin/contabilidad?tab=libros&libro=ventas${mes ? `&mes=${encodeURIComponent(mes)}` : ''}`);
}
