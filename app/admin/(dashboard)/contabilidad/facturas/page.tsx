import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { calcularHojaIva, obtenerConfigContable } from '@/lib/contabilidad/hub';
import { hoyVe, periodoDe, ultimosMeses } from '@/lib/contabilidad/montos';
import { comprasSinFactura, facturasDelMes, talonarioActivo, tasaYAlicuota } from '@/lib/contabilidad/servidor';
import { talonarioDTO } from '@/lib/dto/contabilidad';
import { rangoMes } from '@/lib/relacion-ventas';
import FacturasSoloPanel from './_components/FacturasSoloPanel';

export const dynamic = 'force-dynamic';

export default async function PaginaFacturas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await getServerSession(authOptions);
  const puedeFacturar = hasPermission(session, 'FACTURAR');
  const verContabilidad = hasPermission(session, 'VER_CONTABILIDAD');
  if (!puedeFacturar && !verContabilidad) redirect('/admin');

  const { mes: pedido } = await searchParams;
  const actual = periodoDe(new Date());
  const mes = pedido && rangoMes(pedido) && pedido <= actual ? pedido : actual;

  if (verContabilidad) {
    redirect(`/admin/contabilidad?tab=facturacion&mes=${encodeURIComponent(mes)}`);
  }

  const meses = ultimosMeses(actual);
  if (!meses.includes(mes)) meses.push(mes);

  const [tNormal, tCont, facturas, compras, { tasa }, cfg, periodo] = await Promise.all([
    talonarioActivo(undefined, 'NORMAL'),
    talonarioActivo(undefined, 'CONTINGENCIA'),
    facturasDelMes(mes),
    comprasSinFactura(mes),
    tasaYAlicuota(),
    obtenerConfigContable(),
    calcularHojaIva(mes),
  ]);

  return (
    <FacturasSoloPanel
      mes={mes}
      meses={meses}
      hoy={hoyVe()}
      talonarioNormal={tNormal ? talonarioDTO(tNormal) : null}
      talonarioContingencia={tCont ? talonarioDTO(tCont) : null}
      facturas={facturas}
      compras={compras}
      tasaHoy={tasa}
      canalPublico={cfg.canalEmision}
      imprentaAmbientePublico={cfg.imprentaAmbiente}
      cerrado={periodo.estado === 'CERRADO'}
    />
  );
}
