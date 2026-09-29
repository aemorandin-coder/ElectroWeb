// Bus de eventos en tiempo real (C-127). Solo servidor.
//
// La tienda corre en UN proceso de PM2 (`electroshop`, sin modo cluster): un EventEmitter en memoria alcanza y no
// hace falta Redis ni Socket.io. Si algún día hay varias instancias, este archivo es el único que cambia (por
// LISTEN/NOTIFY de PostgreSQL): quien publica y quien escucha no se enteran.
//
// Publicar nunca lanza errores ni bloquea: un fallo aquí no puede romper una venta.

import { EventEmitter } from 'events';
import { prisma } from '@/lib/prisma';
import type { EventoTiempoReal } from './eventos';

type Oyente = (evento: EventoTiempoReal) => void;

const global = globalThis as unknown as { __electroshopBus?: EventEmitter };
// En desarrollo el módulo se recarga: el emisor vive en globalThis para no perder a los conectados
const bus = global.__electroshopBus ?? (global.__electroshopBus = new EventEmitter());
// Cada pestaña conectada es un oyente: sin tope, Node avisaría a los 10
bus.setMaxListeners(0);

export function publicar(evento: EventoTiempoReal): void {
  try {
    bus.emit('evento', evento);
  } catch (error) {
    console.error('[realtime] publicar', evento.tipo, error);
  }
}

export function suscribir(oyente: Oyente): () => void {
  bus.on('evento', oyente);
  return () => {
    bus.off('evento', oyente);
  };
}

export function conectados(): number {
  return bus.listenerCount('evento');
}

/** Estado actual de una o varias órdenes, leído de la base, publicado como `order:status_updated`. */
export async function publicarOrdenes(orderIds: string[], opciones: { nueva?: boolean } = {}): Promise<void> {
  if (orderIds.length === 0) return;
  try {
    const ordenes = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, orderNumber: true, userId: true, status: true, paymentStatus: true },
    });
    for (const o of ordenes) {
      publicar({ tipo: 'order:status_updated', orderId: o.id, orderNumber: o.orderNumber, userId: o.userId, status: o.status, paymentStatus: o.paymentStatus, nueva: opciones.nueva });
    }
  } catch (error) {
    console.error('[realtime] publicarOrdenes', error);
  }
}

/** Stock actual de uno o varios productos, publicado como `inventory:stock_changed`. */
export async function publicarStock(productIds: string[]): Promise<void> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return;
  try {
    const productos = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true } });
    for (const p of productos) publicar({ tipo: 'inventory:stock_changed', productId: p.id, stock: Math.max(0, p.stock) });
  } catch (error) {
    console.error('[realtime] publicarStock', error);
  }
}
