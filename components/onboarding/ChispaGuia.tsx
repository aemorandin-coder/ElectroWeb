'use client';

// C-257: Chispa, el guía de las piezas del kit de onboarding. Siempre se asoma por detrás de algo (la tarjeta del
// recorrido o la hoja "Así funciona"): la pieza le tapa la cintura y el corte del dibujo nunca se ve (regla del equipo, 15/11).
// Las cinco poses están cargadas a la vez, una encima de otra: cambiar de pose es cambiar cuál se ve, sin esperar a la red.
// Con la Navidad encendida, con su gorro (lib/studio/chispa.ts, las mismas imágenes del popup navideño).
import Image from 'next/image';
import { useSettings } from '@/contexts/SettingsContext';
import { chispaSrc } from '@/lib/studio/chispa';

export type PoseGuia = 'saluda' | 'senala' | 'explica' | 'pulgar' | 'celebra';
const POSES: PoseGuia[] = ['saluda', 'senala', 'explica', 'pulgar', 'celebra'];

/** Las imágenes miden 600 × 735 (arriba queda lugar para el gorro) */
export const PROPORCION_CHISPA = 735 / 600;

export default function ChispaGuia({ pose, ancho, className = '' }: { pose: PoseGuia; ancho: number; className?: string }) {
  const { settings } = useSettings();
  const gorro = Boolean(settings?.gorroNavidad);
  return (
    <span aria-hidden="true" className={`pointer-events-none relative block select-none ${className}`} style={{ width: ancho, height: Math.round(ancho * PROPORCION_CHISPA) }}>
      {POSES.map((p) => (
        <Image
          key={p}
          src={chispaSrc(p, gorro)}
          alt=""
          fill
          sizes={`${Math.round(ancho)}px`}
          draggable={false}
          className={`object-contain transition-opacity duration-100 ${p === pose ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
    </span>
  );
}
