import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { periodoDe } from '@/lib/contabilidad/montos';
import { comprasSinFactura, facturasDelMes, talonarioActivo } from '@/lib/contabilidad/servidor';
import { talonarioDTO } from '@/lib/dto/contabilidad';
import { rangoMes } from '@/lib/relacion-ventas';
import PanelFacturas from './_components/PanelFacturas';

// C-229: Contabilidad → Facturas. Para quien factura (administradores y dueño, FACTURAR); cargar un talonario, solo el dueño.
export const dynamic = 'force-dynamic';

/** Los últimos 12 meses en Venezuela, del más nuevo al más viejo */
function ultimosMeses(hoy: string): string[] {
  const [anio, mes] = hoy.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const total = anio * 12 + (mes - 1) - i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  });
}

export default async function PaginaFacturas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'FACTURAR')) redirect('/admin');
  const { mes: pedido } = await searchParams;
  const actual = periodoDe(new Date());
  const mes = pedido && rangoMes(pedido) && pedido <= actual ? pedido : actual;
  const meses = ultimosMeses(actual);
  if (!meses.includes(mes)) meses.push(mes);

  const [activo, facturas, compras] = await Promise.all([talonarioActivo(), facturasDelMes(mes), comprasSinFactura(mes)]);
  return (
    <PanelFacturas
      mes={mes}
      meses={meses}
      talonario={activo ? talonarioDTO(activo) : null}
      facturas={facturas}
      compras={compras}
      esDueno={hasPermission(session, 'VER_CONTABILIDAD')}
    />
  );
}
