'use client';

import type { MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa6';
import { useSettings } from '@/contexts/SettingsContext';

// Números de ejemplo del seed: el botón avisa en vez de abrir un chat que no existe
const SEED_PHONE_NUMBERS = ['584241234567', '4241234567'];

/**
 * Botón flotante de WhatsApp (C-21). En móvil va encima de la barra inferior (`--bottom-nav-h`),
 * en la capa de la barra. Sin badge falso ni animaciones infinitas, y funciona igual en táctil.
 */
export default function WhatsAppButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { settings } = useSettings();

  // En contacto ya hay una tarjeta de WhatsApp; el admin no lo necesita
  if (!pathname || pathname.startsWith('/admin') || pathname.toLowerCase().includes('contacto')) return null;

  const cleanedNumber = settings?.whatsapp?.replace(/\D/g, '') ?? '';
  if (!cleanedNumber) return null;

  const isSeedNumber = SEED_PHONE_NUMBERS.some((seed) => cleanedNumber.includes(seed));
  const message = `Hola! Tengo una consulta sobre los productos de ${settings?.companyName || 'Electro Shop'}`;
  const href = `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isSeedNumber) return;
    event.preventDefault();
    const role = session?.user?.role;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      toast.error('El número de WhatsApp es provisional. Te llevo a Configuración para cambiarlo.');
      router.push('/admin/settings');
    } else {
      toast('El número de WhatsApp es provisional. Pronto estará disponible el número oficial.');
    }
  };

  return (
    <a
      id="global-whatsapp-button"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label="Escríbenos por WhatsApp"
      title="¿Necesitas ayuda? Escríbenos"
      className="fixed right-4 z-[var(--z-bottomnav)] flex h-12 w-12 items-center justify-center rounded-full bg-success-strong text-white shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-strong lg:right-6 lg:h-14 lg:w-14 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-6"
    >
      <FaWhatsapp className="h-6 w-6 lg:h-7 lg:w-7" aria-hidden="true" />
    </a>
  );
}
