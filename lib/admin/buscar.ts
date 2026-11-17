// C-281 (A-07): buscar en el panel entre todas las órdenes y los movimientos de Puntos ES, en el servidor. Antes cada
// pantalla buscaba en el navegador solo entre lo cargado (50 órdenes, 200 movimientos): una orden de hace dos semanas
// "no existía". Solo servidor; las rutas que la usan ya exigen el permiso del equipo.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizarTelefonoVE } from '@/lib/pago-movil/bancos-venezuela';

const texto = (q: string) => ({ contains: q, mode: 'insensitive' as const });

/**
 * Los dígitos de lo escrito, si parece un número (teléfono, cédula, referencia, guía): "0414-123 4567" → "04141234567".
 * Con el teléfono también en la forma en que se guarda ("+58 414…" → "0414…").
 */
function numerosDe(q: string): string[] {
  const digitos = q.replace(/\D/g, '');
  if (digitos.length < 4) return [];
  return [...new Set([digitos, normalizarTelefonoVE(digitos)])];
}

/** Condiciones (en OR) de las órdenes que coinciden: número, cliente, teléfono, cédula, referencia de pago o guía */
export async function ordenesQueCoinciden(q: string): Promise<Prisma.OrderWhereInput[]> {
  const t = texto(q);
  const numeros = numerosDe(q);
  // La referencia del Pago Móvil vive en su verificación, no en la orden
  const pagos = numeros.length > 0
    ? await prisma.pagoMovilVerificacion.findMany({
        where: { verificado: true, orderId: { not: null }, OR: numeros.map((n) => ({ referencia: { contains: n } })) },
        select: { orderId: true },
        take: 50,
      })
    : [];
  const conPago = [...new Set(pagos.map((p) => p.orderId).filter((id): id is string => Boolean(id)))];
  return [
    { orderNumber: t },
    { trackingNumber: t },
    { paymentReference: t },
    { recipientName: t },
    { guestName: t },
    { guestEmail: t },
    { user: { is: { OR: [{ name: t }, { email: t }] } } },
    ...numeros.flatMap((n): Prisma.OrderWhereInput[] => [
      { guestPhone: { contains: n } },
      { recipientPhone: { contains: n } },
      { recipientIdNumber: { contains: n } },
      { user: { is: { profile: { is: { OR: [{ phone: { contains: n } }, { idNumber: { contains: n } }] } } } } },
    ]),
    ...(conPago.length > 0 ? [{ id: { in: conPago } }] : []),
  ];
}

/** Condiciones (en OR) de los movimientos de Puntos ES que coinciden: cliente, teléfono, cédula, referencia o descripción */
export function transaccionesQueCoinciden(q: string): Prisma.TransactionWhereInput[] {
  const t = texto(q);
  const numeros = numerosDe(q);
  return [
    { reference: t },
    { description: t },
    { balance: { user: { OR: [{ name: t }, { email: t }] } } },
    ...numeros.map((n): Prisma.TransactionWhereInput => ({
      balance: { user: { profile: { is: { OR: [{ phone: { contains: n } }, { idNumber: { contains: n } }] } } } },
    })),
  ];
}
