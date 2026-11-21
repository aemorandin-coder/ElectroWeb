'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { IconoBuscar, IconoInicio, IconoNovedad, IconoPopup, type IconType } from '@/components/iconos';
import { useRouter } from 'next/navigation';
import { adminPageHeader, adminPageSubtitle, adminPageTitle, adminTab, adminTabList, adminTabScroll } from '@/lib/admin-ui';
import { IconoGorro } from '@/components/navidad/GorroSanta';
import Popup from './_components/Popup';
import Navidad from './_components/Navidad';
import Lanzamiento from './_components/Lanzamiento';
import PortadaStudio from './_components/PortadaStudio';
import AjustesDeContenido from './_components/AjustesDeContenido';
import SeoSection from '../settings/_components/SeoSection';
import type { SettingsKey } from '../settings/_components/settings-form';
import { SEO_FIELDS } from '@/lib/validations/settings';

type SeccionId = 'portada' | 'lanzamiento' | 'popup' | 'navidad' | 'google';

const SECCIONES: { id: SeccionId; label: string; descripcion: string; icon: IconType }[] = [
  { id: 'portada', label: 'Portada', descripcion: 'Los destacados, las categorías y el video de la página de inicio.', icon: IconoInicio },
  { id: 'lanzamiento', label: 'Lanzamiento', descripcion: 'Bloque protagonista arriba del inicio y píldora en la barra para grandes estrenos.', icon: IconoNovedad },
  { id: 'popup', label: 'Popup del home', descripcion: 'La imagen promocional que aparece al entrar a la tienda.', icon: IconoPopup },
  { id: 'navidad', label: 'Navidad', descripcion: 'El tema navideño: el gorro en el logo, la franja de inicio y fecha límite de entrega.', icon: IconoGorro },
  { id: 'google', label: 'Google y redes', descripcion: 'El título, la descripción y la imagen al compartir en Google, WhatsApp y Facebook.', icon: IconoBuscar },
];

const REDIRECTS_LEGACY: Record<string, string> = {
  redes: '/admin/studio',
  campanas: '/admin/marketing/correos#campanas',
  plantillas: '/admin/marketing/correos#plantillas',
  sorteo: '/admin/discount-requests?vista=sorteo',
  promotores: '/admin/discount-requests?vista=afiliados',
};

function seccionDelHash(): SeccionId {
  const hash = window.location.hash.split('#').filter(Boolean).pop() ?? '';
  return SECCIONES.some((s) => s.id === hash) ? (hash as SeccionId) : 'portada';
}

function suscribirHash(avisar: () => void) {
  window.addEventListener('hashchange', avisar);
  return () => window.removeEventListener('hashchange', avisar);
}

export default function MarketingPage() {
  const activa = useSyncExternalStore(suscribirHash, seccionDelHash, () => 'portada' as SeccionId);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      const partes = window.location.hash.split('#').filter(Boolean);
      const ultimo = partes[partes.length - 1] ?? '';
      if (REDIRECTS_LEGACY[ultimo]) {
        router.replace(REDIRECTS_LEGACY[ultimo]);
        return;
      }
      if (partes.length > 1) window.history.replaceState(window.history.state, '', `#${ultimo}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  const ir = useCallback((id: SeccionId) => {
    window.history.replaceState(null, '', `#${id}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);

  const seccion = SECCIONES.find((s) => s.id === activa) ?? SECCIONES[0];

  return (
    <div className="min-w-0 space-y-5">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Vitrina y Portada</h1>
          <p className={adminPageSubtitle}>{seccion.descripcion}</p>
        </div>
      </div>

      <nav aria-label="Secciones de vitrina" className={adminTabScroll}>
        <ul className={adminTabList} role="tablist">
          {SECCIONES.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.id} role="presentation">
                <button type="button" role="tab" aria-selected={activa === s.id} onClick={() => ir(s.id)} className={adminTab(activa === s.id)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {activa === 'portada' && <PortadaStudio onIrSeccion={ir} />}
      {activa === 'lanzamiento' && <Lanzamiento />}
      {activa === 'popup' && <Popup />}
      {activa === 'navidad' && <Navidad />}
      {activa === 'google' && (
        <AjustesDeContenido campos={SEO_FIELDS as readonly SettingsKey[]}>{(p) => <SeoSection {...p} />}</AjustesDeContenido>
      )}
    </div>
  );
}
