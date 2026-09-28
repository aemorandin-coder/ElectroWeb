'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { IconType } from 'react-icons';
import Link from 'next/link';
import { FiArrowRight, FiEye, FiFilm, FiSend, FiTv, FiUserCheck } from 'react-icons/fi';
import { adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminTab } from '@/lib/admin-ui';
import Promotores from './_components/Promotores';
import Popup from './_components/Popup';
import Campanas from './_components/Campanas';
import Plantillas from './_components/Plantillas';

// Marketing (C-75): una sección por tarea y un archivo por sección. Antes: 1.118 líneas en un archivo con 6 pestañas,
// una de ellas la configuración SMTP (ahora en Configuración → Correo).

type SeccionId = 'promotores' | 'campanas' | 'popup' | 'plantillas' | 'redes';

const SECCIONES: { id: SeccionId; label: string; descripcion: string; icon: IconType }[] = [
  { id: 'promotores', label: 'Promotores', descripcion: 'Códigos de referido y comisiones por compras pagadas.', icon: FiUserCheck },
  { id: 'campanas', label: 'Campañas de correo', descripcion: 'Correos con imágenes para los clientes que aceptan promociones.', icon: FiSend },
  { id: 'popup', label: 'Popup del home', descripcion: 'La imagen promocional que aparece al entrar a la tienda.', icon: FiTv },
  { id: 'plantillas', label: 'Correos de la tienda', descripcion: 'Cómo se ven los correos automáticos que recibe el cliente.', icon: FiEye },
  // C-112: las imágenes para redes pasaron a ElectroStudio (/admin/studio); la pestaña queda como acceso directo
  { id: 'redes', label: 'ElectroStudio', descripcion: 'Historias y videos para Instagram con los productos de la tienda.', icon: FiFilm },
];

function seccionDelHash(): SeccionId {
  const hash = window.location.hash.slice(1);
  return SECCIONES.some((s) => s.id === hash) ? (hash as SeccionId) : 'promotores';
}

function suscribirHash(avisar: () => void) {
  window.addEventListener('hashchange', avisar);
  return () => window.removeEventListener('hashchange', avisar);
}

export default function MarketingPage() {
  const activa = useSyncExternalStore(suscribirHash, seccionDelHash, () => 'promotores' as SeccionId);

  // Cambiar el hash dispara hashchange y la sección se lee de ahí; replaceState no lo dispara, por eso se avisa a mano
  const ir = useCallback((id: SeccionId) => {
    window.history.replaceState(null, '', `#${id}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);

  const seccion = SECCIONES.find((s) => s.id === activa) ?? SECCIONES[0];

  return (
    <div className="mx-auto max-w-7xl">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Marketing</h1>
          <p className={adminPageSubtitle}>{seccion.descripcion}</p>
        </div>
      </div>

      <nav aria-label="Secciones de marketing" className="-mx-1 mb-5 overflow-x-auto px-1 pb-1">
        <ul className="flex w-max gap-2">
          {SECCIONES.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <button type="button" onClick={() => ir(s.id)} aria-current={activa === s.id ? 'page' : undefined} className={adminTab(activa === s.id)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {activa === 'promotores' && <Promotores />}
      {activa === 'campanas' && <Campanas />}
      {activa === 'popup' && <Popup />}
      {activa === 'plantillas' && <Plantillas />}
      {activa === 'redes' && (
        <div className={`${adminNotice('brand')} flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <p>
            Las imágenes para redes ahora se hacen en <strong>ElectroStudio</strong>: historias y videos con el precio, la oferta y la foto de
            cada producto tomados de la tienda.
          </p>
          <Link href="/admin/studio" className={`${adminPrimaryButton} shrink-0`}>
            Abrir ElectroStudio
            <FiArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
