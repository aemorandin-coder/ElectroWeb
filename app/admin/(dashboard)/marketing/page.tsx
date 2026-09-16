'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import { FiEye, FiImage, FiSend, FiTv, FiUserCheck } from 'react-icons/fi';
import { adminPageHeader, adminPageSubtitle, adminPageTitle, adminTab } from '@/lib/admin-ui';
import SocialMediaGenerator from '@/components/admin/SocialMediaGenerator';
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
  { id: 'redes', label: 'Imágenes para redes', descripcion: 'Historias y posts con un producto o una convocatoria.', icon: FiImage },
];

function seccionDelHash(): SeccionId {
  if (typeof window === 'undefined') return 'promotores';
  const hash = window.location.hash.slice(1);
  return SECCIONES.some((s) => s.id === hash) ? (hash as SeccionId) : 'promotores';
}

export default function MarketingPage() {
  const [activa, setActiva] = useState<SeccionId>('promotores');

  useEffect(() => {
    setActiva(seccionDelHash());
    const onHash = () => setActiva(seccionDelHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const ir = useCallback((id: SeccionId) => {
    setActiva(id);
    window.history.replaceState(null, '', `#${id}`);
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
      {activa === 'redes' && <SocialMediaGenerator />}
    </div>
  );
}
