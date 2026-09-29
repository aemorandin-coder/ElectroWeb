// Eventos en tiempo real (C-127). Módulo puro: los tipos los comparten el servidor y el navegador.
//
// Viajan por Server-Sent Events (/api/realtime). Solo llevan lo mínimo para actualizar la pantalla: nunca montos,
// datos personales ni costos. Lo demás se vuelve a pedir a la API de siempre, que ya revisa permisos.

export type EventoTiempoReal =
  | {
      tipo: 'order:status_updated';
      orderId: string;
      orderNumber: string;
      /** Dueño de la orden: solo él y el equipo reciben el evento */
      userId: string | null;
      status: string;
      paymentStatus: string;
      /** true: la orden se acaba de crear */
      nueva?: boolean;
    }
  | {
      tipo: 'inventory:stock_changed';
      productId: string;
      /** Unidades disponibles (0 = agotado) */
      stock: number;
    }
  | {
      tipo: 'payment:verified';
      /** Quién pagó: solo él y el equipo reciben el evento */
      userId: string;
      contexto: 'ORDER' | 'RECHARGE';
      referencia: string;
      /** false: el equipo rechazó la recarga */
      aprobado: boolean;
      /** La recarga resuelta, si es una recarga */
      transactionId?: string | null;
    };

export type TipoEvento = EventoTiempoReal['tipo'];

export const TIPOS_EVENTO: TipoEvento[] = ['order:status_updated', 'inventory:stock_changed', 'payment:verified'];
