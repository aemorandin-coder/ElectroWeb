'use client';

// C-234: cuándo sale el pedido, dicho antes de comprar (el equipo, 14/11: "un cliente que compra un sábado al mediodía, su
// producto sí o sí sale el lunes; ser lo más transparente"). En la ficha y el carrito, con la cuenta regresiva del corte:
// "Compra en las próximas 2 h 15 min y sale hoy", o "Compra hoy y sale el lunes 16". Lo digital dice cuándo llega, según el
// horario de atención. Las reglas están en lib/horarios (las mismas del servidor y de los correos).

import { useSyncExternalStore } from 'react';
import { IconoReloj } from '@/components/iconos';
import { useSettings } from '@/contexts/SettingsContext';
import { calendarioDe, entregaDigital, mensajeDeSalida } from '@/lib/horarios';

// La hora cambia mientras se mira la página: el texto se rehace cada minuto (cambia el número, no hay animación)
function suscribirMinuto(aviso: () => void) {
  const id = setInterval(aviso, 60_000);
  return () => clearInterval(id);
}
const minutoActual = () => Math.floor(Date.now() / 60_000);

interface Props {
  /** Días hábiles de más de quien despacha: 0 la tienda, 1 un proveedor (PLAN.md §7.2, 14/11) */
  diasProveedor?: number;
  digital?: boolean;
  /** "desde Aragua": lo de C-222, en la misma línea ("…y sale el lunes 23 desde Aragua") */
  desde?: string;
  className?: string;
}

export default function SalidaDelPedido({ diasProveedor = 0, digital = false, desde, className = '' }: Props) {
  const { settings } = useSettings();
  // En el servidor y al hidratar, nada: la hora es la del navegador
  const minuto = useSyncExternalStore(suscribirMinuto, minutoActual, () => null);
  if (!settings || minuto === null) return null;
  const ahora = new Date(minuto * 60_000);
  const calendario = calendarioDe(settings);
  const texto = digital
    ? entregaDigital(ahora, settings.businessHours, calendario).texto
    : `${mensajeDeSalida(ahora, calendario, diasProveedor).texto}${desde ? ` ${desde}` : ''}`;
  return (
    <p className={`flex items-start gap-2 text-sm font-semibold text-brand-900 ${className}`}>
      <IconoReloj className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
      <span>{texto}</span>
    </p>
  );
}
