// C-257: un ícono del pack que se dibuja trazo a trazo al aparecer (las clases `.onb-dibuja` de app/globals.css), una
// sola vez, y después hace su gesto (`accion`): la lupa busca, el carrito llega rodando, la cuadrícula se acomoda, la
// cuenta saluda, el destello brilla, lo demás da un salto. Con "reducir movimiento" aparece quieto y completo.
// Para volver a dibujarlo, se monta de nuevo con otra `key`.
import type { CSSProperties } from 'react';
import type { IconType } from '@/components/iconos';

export type AccionIcono = 'buscar' | 'carrito' | 'catalogo' | 'cuenta' | 'destello' | 'salta' | 'gira';

export default function IconoDibujado({
  Icono,
  className = '',
  retraso = 0,
  accion,
}: {
  Icono: IconType;
  className?: string;
  /** Segundos antes de empezar a dibujarse */
  retraso?: number;
  accion?: AccionIcono;
}) {
  return (
    <span className="onb-dibuja inline-flex" data-accion={accion} style={{ '--onb-retraso': `${retraso}s` } as CSSProperties}>
      <Icono className={className} aria-hidden="true" />
    </span>
  );
}
