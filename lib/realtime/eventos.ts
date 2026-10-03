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
    }
  // C-169: trabajo en equipo en el panel. Solo los reciben administradores con el permiso del recurso (lib/realtime/recursos.ts)
  | {
      tipo: 'admin:presencia';
      /** `product:<id>`, `setting:envios`… */
      recurso: string;
      /** Quiénes tienen ese recurso abierto para editarlo, ahora */
      editores: PersonaEnLinea[];
    }
  | {
      tipo: 'admin:recurso_cambiado';
      recurso: string;
      accion: 'creado' | 'actualizado' | 'papelera' | 'restaurado' | 'eliminado';
      por: { id: string; nombre: string };
      /** ISO */
      en: string;
      /** En lenguaje del equipo ("precio", "stock"), no nombres de columnas */
      campos?: string[];
    };

export interface PersonaEnLinea {
  id: string;
  nombre: string;
  /** ISO: desde cuándo lo tiene abierto */
  desde: string;
}

export type TipoEvento = EventoTiempoReal['tipo'];

export const TIPOS_EVENTO: TipoEvento[] = [
  'order:status_updated', 'inventory:stock_changed', 'payment:verified', 'admin:presencia', 'admin:recurso_cambiado',
];
