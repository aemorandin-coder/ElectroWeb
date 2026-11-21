'use client';

import { useEffect, useState } from 'react';
import { IconoClientes, IconoCupon, IconoInfo, IconoPorcentaje, IconoRegalo, IconoVerificado } from '@/components/iconos';
import {
  adminIconChip, adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminTab, adminTabList, adminTabScroll,
} from '@/lib/admin-ui';
import Promociones from './_components/Promociones';
import Solicitudes from './_components/Solicitudes';
import Sorteo from '../marketing/_components/Sorteo';
import Promotores from '../marketing/_components/Promotores';

type VistaPromocion = 'promos' | 'sorteo' | 'solicitudes' | 'afiliados';

/** Promociones y Sorteo (G-73 F1 + P1): ofertas, cupones, sorteo activo, historial de solicitudes y archivo de afiliados. */
export default function PromocionesYSorteoPage() {
  const [tab, setTab] = useState<VistaPromocion>('promos');

  useEffect(() => {
    const leerVista = () => {
      const vista = new URLSearchParams(window.location.search).get('vista');
      if (vista === 'sorteo' || vista === 'solicitudes' || vista === 'afiliados') setTab(vista);
      else setTab('promos');
    };
    const t = window.setTimeout(leerVista, 0);
    window.addEventListener('popstate', leerVista);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('popstate', leerVista);
    };
  }, []);

  const cambiarTab = (next: VistaPromocion) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'promos') url.searchParams.delete('vista');
    else url.searchParams.set('vista', next);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className={adminPageHeader}>
        <div className="flex items-center gap-3">
          <span className={adminIconChip('brand')}><IconoPorcentaje className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h1 className={adminPageTitle}>Promociones y Sorteo</h1>
            <p className={adminPageSubtitle}>Ofertas con precio tachado, cupones para campañas, sorteo activo y archivo histórico.</p>
          </div>
        </div>
      </div>

      <div className={adminTabScroll}>
        <div className={adminTabList} role="tablist" aria-label="Promociones y Sorteo">
          <button type="button" role="tab" aria-selected={tab === 'promos'} onClick={() => cambiarTab('promos')} className={adminTab(tab === 'promos')}>
            <IconoCupon className="h-4 w-4" aria-hidden="true" /> Ofertas y cupones
          </button>
          <button type="button" role="tab" aria-selected={tab === 'sorteo'} onClick={() => cambiarTab('sorteo')} className={adminTab(tab === 'sorteo')}>
            <IconoRegalo className="h-4 w-4" aria-hidden="true" /> Sorteo
          </button>
          <button type="button" role="tab" aria-selected={tab === 'solicitudes'} onClick={() => cambiarTab('solicitudes')} className={adminTab(tab === 'solicitudes')}>
            <IconoClientes className="h-4 w-4" aria-hidden="true" /> Solicitudes (historial)
          </button>
          <button type="button" role="tab" aria-selected={tab === 'afiliados'} onClick={() => cambiarTab('afiliados')} className={adminTab(tab === 'afiliados')}>
            <IconoVerificado className="h-4 w-4" aria-hidden="true" /> Afiliados (en pausa)
          </button>
        </div>
      </div>

      {tab === 'promos' && <Promociones />}
      {tab === 'sorteo' && <Sorteo />}
      {tab === 'solicitudes' && <Solicitudes />}
      {tab === 'afiliados' && (
        <div className="space-y-4">
          <div className={`${adminNotice('neutral')} flex items-start gap-3`}>
            <IconoInfo className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <p>
              <strong>Archivo de promotores (en pausa).</strong> Los códigos antiguos y comisiones históricas se conservan aquí sin borrar datos. Para nuevos descuentos usa <em>Ofertas y cupones</em>.
            </p>
          </div>
          <Promotores />
        </div>
      )}
    </div>
  );
}
