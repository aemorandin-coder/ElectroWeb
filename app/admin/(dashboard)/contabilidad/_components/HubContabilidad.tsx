'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconoAyuda, IconoBillete, IconoConfiguracion, IconoCuadricula, IconoDocumento, IconoMas, IconoReportes,
} from '@/components/iconos';
import AsiFunciona from '@/components/onboarding/AsiFunciona';
import {
  adminBadge, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton, adminTab, adminTabList,
  adminTabScroll,
} from '@/lib/admin-ui';
import { nombreMes } from '@/lib/contabilidad/montos';
import HubTabAjustes from './TabAjustesFiscal';
import ModalGuiaContadora from './ModalGuiaContadora';
import TabFacturacion from './TabFacturacion';
import TabLibrosIva from './TabLibrosIva';
import TabMovimientos from './TabMovimientos';
import TabResumenCierre from './TabResumenCierre';
import type { HubDatosProps, SubTabLibro, TabHubId } from './tipos';

export default function HubContabilidad({ datos }: { datos: HubDatosProps }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabHubId>(datos.tabInicial);
  const [subTabLibro, setSubTabLibro] = useState<SubTabLibro>(datos.subTabLibroInicial ?? 'ventas');
  const [guiaAbierta, setGuiaAbierta] = useState(false);

  const pendientesFacturacion = datos.comprasPendientes.length
    + datos.facturas.filter((f) => f.estado === 'EMITIDA' && f.estadoTransmision === 'PENDIENTE_REPORTE').length;

  const cambiarTab = (nuevoTab: TabHubId, subLibro?: SubTabLibro) => {
    setTab(nuevoTab);
    if (subLibro) setSubTabLibro(subLibro);
    const params = new URLSearchParams();
    params.set('mes', datos.mes);
    params.set('tab', nuevoTab);
    if (nuevoTab === 'libros' && (subLibro || subTabLibro)) {
      params.set('libro', subLibro ?? subTabLibro);
    }
    window.history.replaceState(null, '', `/admin/contabilidad?${params.toString()}`);
  };

  const cambiarMes = (nuevoMes: string) => {
    const params = new URLSearchParams();
    params.set('mes', nuevoMes);
    params.set('tab', tab);
    router.push(`/admin/contabilidad?${params.toString()}`);
  };

  const cerrado = datos.periodo.estado === 'CERRADO';

  const tabs: Array<{ id: TabHubId; etiqueta: string; icono: React.ReactNode; badge?: number }> = [
    { id: 'resumen', etiqueta: 'Resumen y Cierre', icono: <IconoCuadricula className="h-4 w-4" aria-hidden="true" /> },
    { id: 'facturacion', etiqueta: 'Facturación', icono: <IconoDocumento className="h-4 w-4" aria-hidden="true" />, badge: pendientesFacturacion || undefined },
    { id: 'libros', etiqueta: 'Libros e IVA', icono: <IconoReportes className="h-4 w-4" aria-hidden="true" /> },
    { id: 'movimientos', etiqueta: 'Movimientos', icono: <IconoBillete className="h-4 w-4" aria-hidden="true" /> },
    ...(datos.yo.esDueno && datos.config
      ? [{ id: 'ajustes' as const, etiqueta: 'Ajustes de contabilidad', icono: <IconoConfiguracion className="h-4 w-4" aria-hidden="true" /> }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Contabilidad</h1>
          <p className={adminPageSubtitle}>Facturación fiscal, libros mensuales, obligaciones y preparación 2027.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="hub-mes" className="sr-only">Mes de trabajo</label>
          <select
            id="hub-mes"
            value={datos.mes}
            onChange={(e) => cambiarMes(e.target.value)}
            className="h-11 rounded-lg border border-line-strong bg-white px-3 text-sm font-semibold text-ink"
          >
            {datos.meses.map((m) => (
              <option key={m} value={m}>{nombreMes(m).replace(/^./, (c) => c.toUpperCase())}</option>
            ))}
          </select>
          <button type="button" onClick={() => setGuiaAbierta(true)} className={adminSecondaryButton}>
            <IconoAyuda className="h-4 w-4" aria-hidden="true" /> Guía rápida
          </button>
          {datos.yo.puedeFacturar && !cerrado && (
            <Link href="/admin/contabilidad/facturas/nueva" className={`${adminPrimaryButton} w-full sm:w-auto`}>
              <IconoMas className="h-4 w-4" aria-hidden="true" /> Nueva factura
            </Link>
          )}
        </div>
      </header>

      <div className={adminTabScroll}>
        <nav className={adminTabList} aria-label="Secciones de Contabilidad" role="tablist">
          {tabs.map((t) => {
            const activa = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => cambiarTab(t.id)}
                className={adminTab(activa)}
              >
                {t.icono}
                <span>{t.etiqueta}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className={activa ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white' : adminBadge('warning')}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === 'resumen' && (
        <TabResumenCierre datos={datos} onIrTab={cambiarTab} />
      )}

      {tab === 'facturacion' && (
        <TabFacturacion
          mes={datos.mes}
          hoy={datos.hoy}
          talonarioNormal={datos.talonarioNormal}
          talonarioContingencia={datos.talonarioContingencia}
          facturas={datos.facturas}
          compras={datos.comprasPendientes}
          tasaHoy={datos.tasaHoy}
          canalPublico={datos.canalPublico}
          imprentaAmbientePublico={datos.imprentaAmbientePublico}
          esDueno={datos.yo.esDueno}
          puedeFacturar={datos.yo.puedeFacturar}
          puedeDeclarar={datos.yo.puedeDeclarar}
          cerrado={cerrado}
          onIrAjustes={datos.yo.esDueno ? () => cambiarTab('ajustes') : undefined}
        />
      )}

      {tab === 'libros' && (
        <TabLibrosIva
          mes={datos.mes}
          meses={datos.meses}
          hoy={datos.hoy}
          venceIvaMes={datos.venceIvaMes}
          empresa={datos.empresa}
          libro={datos.libro}
          comprasGastos={datos.comprasGastos}
          periodo={datos.periodo}
          cerrado={cerrado}
          puedeDeclarar={datos.yo.puedeDeclarar}
          subTabInicial={subTabLibro}
        />
      )}

      {tab === 'movimientos' && (
        <TabMovimientos movimientos={datos.movimientos} esDueno={datos.yo.esDueno} />
      )}

      {tab === 'ajustes' && datos.yo.esDueno && datos.config && (
        <HubTabAjustes configInicial={datos.config} talonarios={datos.talonariosTodos} />
      )}

      <AsiFunciona
        clave="contabilidad-hub-2"
        sinChispa
        activa={datos.yo.esContadora}
        titulo="Así funciona Contabilidad"
        nota="Alcaldía hasta el 10, IVA hasta el 15 y Pensiones hasta el 18. La parte técnica es nuestra."
        pasos={[
          { icono: 'ver', texto: 'Revisas compras y retenciones del mes' },
          { icono: 'calendario', texto: 'Declaras el IVA (Forma 99030) y obligaciones' },
          { icono: 'verificado', texto: 'Descargas el Excel y firmas el cierre con tu C.P.C.' },
        ]}
        boton="Ver guía completa y PDF"
        alAceptar={() => setGuiaAbierta(true)}
      />

      <ModalGuiaContadora abierta={guiaAbierta} onCerrar={() => setGuiaAbierta(false)} esDueno={datos.yo.esDueno} />
    </div>
  );
}
