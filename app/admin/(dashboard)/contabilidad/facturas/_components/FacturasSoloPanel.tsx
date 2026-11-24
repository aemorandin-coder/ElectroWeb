'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconoMas } from '@/components/iconos';
import { adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton } from '@/lib/admin-ui';
import { nombreMes } from '@/lib/contabilidad/montos';
import type { CompraSinFactura } from '@/lib/contabilidad/servidor';
import type { FacturaDTO, TalonarioDTO } from '@/lib/dto/contabilidad';
import TabFacturacion from '../../_components/TabFacturacion';

export default function FacturasSoloPanel({
  mes, meses, hoy, talonarioNormal, talonarioContingencia, facturas, compras, tasaHoy, canalPublico, imprentaAmbientePublico, cerrado,
}: {
  mes: string;
  meses: string[];
  hoy: string;
  talonarioNormal: TalonarioDTO | null;
  talonarioContingencia: TalonarioDTO | null;
  facturas: FacturaDTO[];
  compras: CompraSinFactura[];
  tasaHoy: number | null;
  canalPublico: 'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL';
  imprentaAmbientePublico: 'SANDBOX' | 'PRODUCCION';
  cerrado: boolean;
}) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Facturas</h1>
          <p className={adminPageSubtitle}>Emisión y seguimiento de documentos fiscales del mes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="facturas-solo-mes" className="sr-only">Mes</label>
          <select
            id="facturas-solo-mes"
            value={mes}
            onChange={(e) => router.push(`/admin/contabilidad/facturas?mes=${e.target.value}`)}
            className="h-11 rounded-lg border border-line-strong bg-white px-3 text-sm font-semibold text-ink"
          >
            {meses.map((m) => (
              <option key={m} value={m}>{nombreMes(m).replace(/^./, (c) => c.toUpperCase())}</option>
            ))}
          </select>
          {!cerrado && (
            <Link href="/admin/contabilidad/facturas/nueva" className={`${adminPrimaryButton} w-full sm:w-auto`}>
              <IconoMas className="h-4 w-4" aria-hidden="true" /> Nueva factura
            </Link>
          )}
        </div>
      </header>

      <TabFacturacion
        mes={mes}
        hoy={hoy}
        talonarioNormal={talonarioNormal}
        talonarioContingencia={talonarioContingencia}
        facturas={facturas}
        compras={compras}
        tasaHoy={tasaHoy}
        canalPublico={canalPublico}
        imprentaAmbientePublico={imprentaAmbientePublico}
        esDueno={false}
        puedeFacturar
        cerrado={cerrado}
      />
    </div>
  );
}
