// C-210: el estado de una orden en su píldora, con su color (tonoEstadoOrden) y su ícono, como los sellos de la tienda
// (Andrés eligió la versión A el 13/11). La usan la lista de Órdenes y su detalle.

import type { ReactNode } from 'react';
import {
  IconoBillete, IconoCerrar, IconoCheck, IconoEntregado, IconoEnvio, IconoPaquete, IconoReloj, IconoRestablecer,
} from '@/components/iconos';
import { adminBadge } from '@/lib/admin-ui';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';
import { tonoEstadoOrden } from '@/lib/order-pago';

const ICONO = {
  PENDING: IconoReloj,
  CONFIRMED: IconoCheck,
  PAID: IconoBillete,
  PROCESSING: IconoPaquete,
  READY_FOR_PICKUP: IconoPaquete,
  SHIPPED: IconoEnvio,
  DELIVERED: IconoEntregado,
  CANCELLED: IconoCerrar,
  REFUNDED: IconoRestablecer,
} as const;

/** `children` sigue al nombre del estado dentro de la píldora (en el detalle, " · Envío por ZOOM") */
export default function PildoraEstadoOrden({ status, children }: { status: string; children?: ReactNode }) {
  const Icono = ICONO[status as keyof typeof ICONO];
  return (
    <span className={adminBadge(tonoEstadoOrden(status))}>
      {Icono && <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {ETIQUETA_ESTADO[status as keyof typeof ETIQUETA_ESTADO] ?? status}
      {children}
    </span>
  );
}
