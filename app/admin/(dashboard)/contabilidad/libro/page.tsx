import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { periodoDe, ultimosMeses, venceIva } from '@/lib/contabilidad/montos';
import { datosEmpresa, libroDeVentas } from '@/lib/contabilidad/servidor';
import { rangoMes } from '@/lib/relacion-ventas';
import LibroVentas from './_components/LibroVentas';

// C-230: el libro de ventas del mes, con las columnas que pidió la contadora el 16/11 (docs/plan/CONTABILIDAD.md §9). Lo
// ven el dueño y la contadora (VER_CONTABILIDAD); quien solo factura vuelve a Facturas.
export const dynamic = 'force-dynamic';

export default async function PaginaLibro({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'VER_CONTABILIDAD')) redirect('/admin/contabilidad/facturas');
  const { mes: pedido } = await searchParams;
  const actual = periodoDe(new Date());
  const mes = pedido && rangoMes(pedido) && pedido <= actual ? pedido : actual;
  const meses = ultimosMeses(actual);
  if (!meses.includes(mes)) meses.push(mes);

  const [libro, empresa] = await Promise.all([libroDeVentas(mes), datosEmpresa()]);
  return <LibroVentas libro={libro} meses={meses} vence={venceIva(mes)} empresa={{ nombre: empresa.nombre, rif: empresa.rif }} />;
}
