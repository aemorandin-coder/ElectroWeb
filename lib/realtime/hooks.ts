'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { alCambiarConexion, escuchar, estadoConexion, type EstadoConexion } from './cliente';
import type { EventoTiempoReal } from './eventos';

// Hooks de tiempo real (C-127). Sin React Query ni SWR (la tienda no los usa): cada pantalla ya guarda sus datos
// en estado y aquí solo se le avisa qué cambió.

interface OpcionesTiempoReal {
  /** Al volver la conexión: recargar lo que pudo cambiar mientras estuvo caída */
  onReconectar?: () => void;
  /** Respaldo: mientras la conexión esté caída, llamar a onReconectar cada tantos ms (sin esto, nada) */
  respaldoMs?: number;
}

/** Escucha todos los eventos que esta sesión puede ver. Devuelve el estado de la conexión. */
export function useTiempoReal(onEvento: (evento: EventoTiempoReal) => void, opciones: OpcionesTiempoReal = {}): EstadoConexion {
  const alEvento = useRef(onEvento);
  const alReconectar = useRef(opciones.onReconectar);
  useEffect(() => {
    alEvento.current = onEvento;
    alReconectar.current = opciones.onReconectar;
  });

  useEffect(() => escuchar((e) => alEvento.current(e), () => alReconectar.current?.()), []);

  const estado = useSyncExternalStore(alCambiarConexion, estadoConexion, () => 'desconectado' as EstadoConexion);

  // Respaldo sin conexión (proxy que corta SSE, red inestable): se consulta de a ratos. Depende de "caído" y no del
  // estado: entre reintentos pasa de "desconectado" a "conectando" y eso reiniciaba el temporizador sin cumplirse nunca
  const respaldoMs = opciones.respaldoMs;
  const caido = estado !== 'conectado';
  useEffect(() => {
    if (!respaldoMs || !caido) return;
    const t = setInterval(() => alReconectar.current?.(), respaldoMs);
    return () => clearInterval(t);
  }, [caido, respaldoMs]);

  return estado;
}

export interface EstadoOrdenEnVivo {
  status: string;
  paymentStatus: string;
}

/**
 * Estado en vivo de una orden: `order:status_updated` de esa orden. Devuelve el último estado recibido (o null si no
 * llegó ninguno: se usa el que ya tenía la pantalla) y si la conexión está activa.
 */
export function useOrderRealtime(
  orderId: string | null | undefined,
  opciones: OpcionesTiempoReal & { onCambio?: (estado: EstadoOrdenEnVivo) => void } = {},
): { enVivo: EstadoOrdenEnVivo | null; conectado: boolean } {
  const [enVivo, setEnVivo] = useState<{ orderId: string; estado: EstadoOrdenEnVivo } | null>(null);
  const estado = useTiempoReal((evento) => {
    if (evento.tipo !== 'order:status_updated' || !orderId || evento.orderId !== orderId) return;
    const nuevo = { status: evento.status, paymentStatus: evento.paymentStatus };
    setEnVivo({ orderId, estado: nuevo });
    opciones.onCambio?.(nuevo);
  }, opciones);
  return { enVivo: enVivo && enVivo.orderId === orderId ? enVivo.estado : null, conectado: estado === 'conectado' };
}

/** Stock en vivo de un producto (`inventory:stock_changed`). Sin eventos, el que trajo la página. */
export function useStockEnVivo(productId: string, inicial: number): number {
  const [vivo, setVivo] = useState<{ productId: string; stock: number } | null>(null);
  useTiempoReal((evento) => {
    if (evento.tipo === 'inventory:stock_changed' && evento.productId === productId) setVivo({ productId, stock: evento.stock });
  });
  return vivo && vivo.productId === productId ? vivo.stock : inicial;
}
