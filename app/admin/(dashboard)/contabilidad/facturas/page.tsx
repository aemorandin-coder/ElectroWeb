import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { hoyVe, periodoDe, ultimosMeses } from '@/lib/contabilidad/montos';
import { comprasSinFactura, facturasDelMes, talonarioActivo, ventasDe30Dias } from '@/lib/contabilidad/servidor';
import { talonarioDTO } from '@/lib/dto/contabilidad';
import { rangoMes } from '@/lib/relacion-ventas';
import PanelFacturas from './_components/PanelFacturas';

// C-229: Contabilidad → Facturas. Para quien factura (administradores y dueño, FACTURAR); cargar un talonario, solo el dueño.
// C-230: el talonario dice hasta cuándo alcanza, al ritmo de las ventas de los últimos 30 días.
export const dynamic = 'force-dynamic';

export default async function PaginaFacturas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await getServerSession(authOptions);
  const puedeFacturar = hasPermission(session, 'FACTURAR');
  // C-235: la contadora las ve (VER_CONTABILIDAD) pero no factura
  if (!puedeFacturar && !hasPermission(session, 'VER_CONTABILIDAD')) redirect('/admin');
  const { mes: pedido } = await searchParams;
  const actual = periodoDe(new Date());
  const mes = pedido && rangoMes(pedido) && pedido <= actual ? pedido : actual;
  const meses = ultimosMeses(actual);
  if (!meses.includes(mes)) meses.push(mes);

  const [activo, facturas, compras, ventas30] = await Promise.all([talonarioActivo(), facturasDelMes(mes), comprasSinFactura(mes), ventasDe30Dias()]);
  return (
    <PanelFacturas
      mes={mes}
      meses={meses}
      talonario={activo ? talonarioDTO(activo) : null}
      facturas={facturas}
      compras={compras}
      ventas30={ventas30}
      hoy={hoyVe()}
      esDueno={hasPermission(session, 'CARGAR_TALONARIO')}
      puedeFacturar={puedeFacturar}
    />
  );
}
