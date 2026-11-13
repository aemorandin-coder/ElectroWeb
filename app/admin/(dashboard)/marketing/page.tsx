'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { IconoEnviar, IconoPopup, IconoRegalo, IconoVer, IconoVerificado } from '@/components/iconos';
import type { IconType } from '@/components/iconos';
import { useRouter } from 'next/navigation';
import { adminPageHeader, adminPageSubtitle, adminPageTitle, adminTab } from '@/lib/admin-ui';
import { IconoGorro } from '@/components/navidad/GorroSanta';
import Promotores from './_components/Promotores';
import Popup from './_components/Popup';
import Navidad from './_components/Navidad';
import Sorteo from './_components/Sorteo';
import Campanas from './_components/Campanas';
import Plantillas from './_components/Plantillas';

// Marketing (C-75): una sección por tarea y un archivo por sección. Antes: 1.118 líneas en un archivo con 6 pestañas,
// una de ellas la configuración SMTP (ahora en Configuración → Correo).

type SeccionId = 'promotores' | 'campanas' | 'popup' | 'navidad' | 'sorteo' | 'plantillas';

const SECCIONES: { id: SeccionId; label: string; descripcion: string; icon: IconType }[] = [
  { id: 'promotores', label: 'Promotores', descripcion: 'Códigos de referido y comisiones por compras pagadas.', icon: IconoVerificado },
  { id: 'campanas', label: 'Campañas de correo', descripcion: 'Correos con imágenes para los clientes que aceptan promociones.', icon: IconoEnviar },
  { id: 'popup', label: 'Popup del home', descripcion: 'La imagen promocional que aparece al entrar a la tienda.', icon: IconoPopup },
  // C-186: el ícono es el gorro de la tienda en la versión de un color del pack de íconos, no uno de librería
  { id: 'navidad', label: 'Navidad', descripcion: 'El tema navideño: el gorro de Santa en el logo, la franja navideña del inicio y hasta cuándo pedir para que llegue antes del 24.', icon: IconoGorro },
  // C-212: el sorteo (la PlayStation 4 del 20/12)
  { id: 'sorteo', label: 'Sorteo', descripcion: 'El sorteo de la tienda: las fechas, el premio, quiénes participan, lo que dejó y el sorteo en sí.', icon: IconoRegalo },
  { id: 'plantillas', label: 'Correos de la tienda', descripcion: 'Cómo se ven los correos automáticos que recibe el cliente.', icon: IconoVer },
  // C-116: la pestaña "ElectroStudio" (acceso directo desde C-112) se quitó: el estudio tiene su entrada en la barra lateral
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
  const router = useRouter();
  // Enlaces viejos a la pestaña de redes: van directo al estudio
  useEffect(() => {
    if (window.location.hash === '#redes') router.replace('/admin/studio');
  }, [router]);

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
      {activa === 'navidad' && <Navidad />}
      {activa === 'sorteo' && <Sorteo />}
      {activa === 'plantillas' && <Plantillas />}
    </div>
  );
}
