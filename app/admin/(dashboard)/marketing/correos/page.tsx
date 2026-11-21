'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { IconoEnviar, IconoVer, type IconType } from '@/components/iconos';
import { adminPageHeader, adminPageSubtitle, adminPageTitle, adminTab, adminTabList, adminTabScroll } from '@/lib/admin-ui';
import Campanas from '../_components/Campanas';
import Plantillas from '../_components/Plantillas';

type CorreoTab = 'campanas' | 'plantillas';

const SECCIONES: { id: CorreoTab; label: string; descripcion: string; icon: IconType }[] = [
  { id: 'campanas', label: 'Campañas de correo', descripcion: 'Correos con imágenes para los clientes que aceptan promociones.', icon: IconoEnviar },
  { id: 'plantillas', label: 'Correos de la tienda', descripcion: 'Vista previa de los correos automáticos que recibe el cliente.', icon: IconoVer },
];

function tabDelHash(): CorreoTab {
  const hash = window.location.hash.split('#').filter(Boolean).pop() ?? '';
  return hash === 'plantillas' ? 'plantillas' : 'campanas';
}

function suscribirHash(avisar: () => void) {
  window.addEventListener('hashchange', avisar);
  return () => window.removeEventListener('hashchange', avisar);
}

export default function CorreosAdminPage() {
  const activa = useSyncExternalStore(suscribirHash, tabDelHash, () => 'campanas' as CorreoTab);

  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const ir = useCallback((id: CorreoTab) => {
    window.history.replaceState(null, '', `#${id}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);

  const seccion = SECCIONES.find((s) => s.id === activa) ?? SECCIONES[0];

  return (
    <div className="min-w-0 space-y-5">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Correos</h1>
          <p className={adminPageSubtitle}>{seccion.descripcion}</p>
        </div>
      </div>

      <div className={adminTabScroll}>
        <div className={adminTabList} role="tablist" aria-label="Correos de marketing y tienda">
          {SECCIONES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activa === s.id}
                onClick={() => ir(s.id)}
                className={adminTab(activa === s.id)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {activa === 'campanas' ? <Campanas /> : <Plantillas />}
    </div>
  );
}
