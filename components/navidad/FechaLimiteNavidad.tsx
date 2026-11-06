'use client';

// La franja "Para que llegue antes del 24, pide hasta el …" (C-190): en la ficha de los productos físicos, en el carrito y en
// Ideas para regalar. Sale solo con el tema navideño activo y con la fecha cargada en Marketing → Navidad: sin fecha no se
// promete nada. Pasado el último día se va sola: el servidor ya no manda esa fecha y, si la página quedó guardada de antes,
// el navegador la quita con su propio día (en Venezuela).
// El calendario va con el lenguaje del pack de íconos: contorno azul marino, relleno plano y un solo acento, el rojo
// navideño en el mes.

import { useSyncExternalStore } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { diaEnCaracas, franjaNavidad, partesDelDia, type FranjaNavidad } from '@/lib/navidad';

// El día no cambia mientras se mira la página: no hace falta escuchar nada
const sinSuscripcion = () => () => {};

interface VistaProps {
  franja: FranjaNavidad;
  /** Una frase más al final del detalle (en Ideas para regalar, la de las gift cards) */
  nota?: string;
  className?: string;
}

/** La franja ya armada. La usan la tienda y la vista previa del panel. */
export function VistaFranjaNavidad({ franja, nota, className = '' }: VistaProps) {
  const { numero, mes } = partesDelDia(franja.dia);
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3 ${className}`}>
      <span aria-hidden="true" className="flex w-12 shrink-0 flex-col overflow-hidden rounded-lg border-2 border-brand-900 bg-white text-center">
        <span className="bg-navidad text-[11px] font-semibold uppercase leading-5 tracking-wide text-white">{mes.slice(0, 3)}</span>
        <span className="py-0.5 text-xl font-bold leading-7 text-brand-900">{numero}</span>
      </span>
      <p className="min-w-0 text-sm leading-snug text-ink-soft">
        <span className="block font-semibold text-brand-900">{franja.titulo}</span>
        <span className="mt-1 block text-xs leading-relaxed">
          {franja.detalle}
          {nota ? ` ${nota}` : ''}
        </span>
      </p>
    </div>
  );
}

export default function FechaLimiteNavidad({ nota, className }: { nota?: string; className?: string }) {
  const { settings } = useSettings();
  // En el servidor y al hidratar, null (el servidor ya dejó fuera las fechas vencidas); después, el día del navegador
  const hoy = useSyncExternalStore(sinSuscripcion, () => diaEnCaracas(), () => null);
  if (!settings) return null;
  const franja = franjaNavidad(
    settings.entregaNavidad,
    { envio: settings.deliveryEnabled, delivery: settings.localDeliveryEnabled, retiro: settings.pickupEnabled },
    hoy
  );
  return franja ? <VistaFranjaNavidad franja={franja} nota={nota} className={className} /> : null;
}
