// Seguimiento de envíos ZOOM (C-100). Solo servidor.
// Lo llaman el proceso programado (/api/cron/envios) y el panel del cliente cuando abre sus pedidos.
// Guarda los movimientos nuevos, avisa al cliente cuando el paquete llega a la oficina y marca la orden
// entregada cuando ZOOM lo confirma. MRW no tiene rastreo automatizable: esas órdenes las mueve el panel.

import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createNotification, notifyOrderDelivered } from '@/lib/notifications';
import { sendOrderDeliveredEmail, sendShipmentUpdateEmail } from '@/lib/email-service';
import { eventoEsEnOficina, eventoEsEntrega, rastreoZoom } from '@/lib/envios/zoom';

/** No se le pregunta a ZOOM por la misma guía más de una vez cada tanto. */
export const RASTREO_INTERVALO_MS = 60 * 60 * 1000;
const MAX_POR_CORRIDA = 40;

export interface ResultadoRastreo {
  revisadas: number;
  sinRespuesta: number;
  eventosNuevos: number;
  entregadas: number;
}

export async function actualizarRastreoZoom(opciones: { orderIds?: string[]; intervaloMs?: number } = {}): Promise<ResultadoRastreo> {
  const limite = new Date(Date.now() - (opciones.intervaloMs ?? RASTREO_INTERVALO_MS));
  const ordenes = await prisma.order.findMany({
    where: {
      status: OrderStatus.SHIPPED,
      shippingCarrier: 'ZOOM',
      trackingNumber: { not: null },
      OR: [{ trackingCheckedAt: null }, { trackingCheckedAt: { lt: limite } }],
      ...(opciones.orderIds ? { id: { in: opciones.orderIds } } : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      trackingNumber: true,
      courierOfficeName: true,
      user: { select: { name: true, email: true } },
      shipmentEvents: { where: { source: 'ZOOM' }, select: { occurredAt: true, description: true } },
    },
    orderBy: { trackingCheckedAt: { sort: 'asc', nulls: 'first' } },
    take: MAX_POR_CORRIDA,
  });

  const resultado: ResultadoRastreo = { revisadas: 0, sinRespuesta: 0, eventosNuevos: 0, entregadas: 0 };

  for (const orden of ordenes) {
    const eventos = await rastreoZoom(orden.trackingNumber ?? '');
    if (eventos === null) {
      resultado.sinRespuesta++;
      continue;
    }
    resultado.revisadas++;

    const conocidos = new Set(orden.shipmentEvents.map((e) => `${e.occurredAt.getTime()}|${e.description}`));
    const nuevos = eventos.filter((e) => !conocidos.has(`${e.fecha.getTime()}|${e.descripcion}`));

    await prisma.order.update({ where: { id: orden.id }, data: { trackingCheckedAt: new Date() } });
    if (nuevos.length === 0) continue;

    const creados = await prisma.shipmentEvent.createMany({
      data: nuevos.map((e) => ({
        orderId: orden.id,
        source: 'ZOOM',
        statusCode: e.codigo,
        description: e.descripcion,
        location: e.lugar,
        occurredAt: e.fecha,
      })),
      skipDuplicates: true,
    });
    resultado.eventosNuevos += creados.count;
    if (creados.count === 0) continue;

    const entrega = nuevos.find((e) => eventoEsEntrega(e.descripcion));
    const enOficina = nuevos.find((e) => eventoEsEnOficina(e.descripcion));
    const nombre = orden.user?.name || 'Cliente';

    if (entrega) {
      // Solo si nadie la cambió mientras tanto
      const cerrada = await prisma.order.updateMany({
        where: { id: orden.id, status: OrderStatus.SHIPPED },
        data: { status: OrderStatus.DELIVERED, deliveredAt: entrega.fecha },
      });
      if (cerrada.count === 0) continue;
      resultado.entregadas++;
      if (orden.userId) await notifyOrderDelivered(orden.userId, orden.orderNumber, orden.id);
      if (orden.user?.email) {
        sendOrderDeliveredEmail(orden.user.email, { orderNumber: orden.orderNumber, customerName: nombre })
          .catch((error) => console.error('Error enviando correo de entrega:', error));
      }
      continue;
    }

    if (!orden.userId) continue;
    const ultimo = nuevos[nuevos.length - 1];
    if (enOficina) {
      const donde = orden.courierOfficeName ? ` ${orden.courierOfficeName}` : '';
      const detalle = `Tu pedido #${orden.orderNumber} llegó a la oficina de ZOOM${donde}. Retíralo con tu cédula; el flete se paga ahí si tu envío es con cobro a destino.`;
      await createNotification({
        userId: orden.userId,
        type: 'ORDER_SHIPPED',
        title: 'Tu pedido llegó a la oficina',
        message: detalle,
        link: '/customer/orders',
        icon: 'shipping',
      });
      if (orden.user?.email) {
        sendShipmentUpdateEmail(orden.user.email, {
          orderNumber: orden.orderNumber,
          customerName: nombre,
          title: 'Tu pedido llegó a la oficina',
          detail: detalle,
        }).catch((error) => console.error('Error enviando aviso de oficina:', error));
      }
    } else {
      await createNotification({
        userId: orden.userId,
        type: 'ORDER_SHIPPED',
        title: 'Novedades de tu envío',
        message: `Pedido #${orden.orderNumber}: ${ultimo.descripcion}.`,
        link: '/customer/orders',
        icon: 'shipping',
      });
    }
  }

  return resultado;
}
