import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { facturaPorId } from '@/lib/contabilidad/servidor';
import FichaFactura from '../_components/FichaFactura';

// C-229: una factura registrada: la réplica, quién la registró, sus órdenes y "Anular".
export const dynamic = 'force-dynamic';

export default async function PaginaFactura({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const puedeFacturar = hasPermission(session, 'FACTURAR');
  if (!puedeFacturar && !hasPermission(session, 'VER_CONTABILIDAD')) redirect('/admin');
  const { id } = await params;
  const factura = await facturaPorId(id);
  if (!factura) notFound();
  return <FichaFactura factura={factura} puedeAnular={puedeFacturar} />;
}
