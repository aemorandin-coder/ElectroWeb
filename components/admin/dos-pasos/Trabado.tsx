'use client';

import { FaWhatsapp } from 'react-icons/fa';
import { useSettings } from '@/contexts/SettingsContext';
import { enlaceWhatsApp } from '@/lib/whatsapp';

// C-290: la salida (skill herramientas-claras, regla 9): a quién escribir si alguien se traba con los dos pasos. Va al
// WhatsApp de la tienda, que atiende el equipo. Sin WhatsApp configurado no se muestra.

export default function Trabado({ mensaje, texto = '¿Te trabaste? Escríbenos por WhatsApp' }: { mensaje: string; texto?: string }) {
  const { settings } = useSettings();
  const enlace = enlaceWhatsApp(settings?.whatsapp, mensaje);
  if (!enlace) return null;
  return (
    <a href={enlace} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
      <FaWhatsapp className="h-4 w-4" aria-hidden="true" />
      {texto}
    </a>
  );
}
