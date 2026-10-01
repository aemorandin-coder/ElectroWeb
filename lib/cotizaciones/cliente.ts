// "Mis cotizaciones" (C-159), lado del servidor: las cotizaciones que un cliente con cuenta puede ver en su panel.
// Qué entra (y por qué):
// - Las que pidió con la sesión abierta (`userId`): en cualquier estado, para ver que el equipo las está preparando.
// - Las que el equipo le mandó a su correo (`contactEmail`) y que ya están enviadas o aprobadas, solo si su correo está
//   verificado. Pedir una cotización con el correo de otra persona no la mete en el panel de esa persona: las pedidas
//   y los borradores nunca salen por correo.
// Lista blanca: ni el correo ni el teléfono de contacto, ni la nota con la que se pidió, ni quién la armó, ni la IP.

import { prisma } from '@/lib/prisma';
import { estaVencida, totalesCotizacion, venceEl } from './core';

export type EstadoParaCliente = 'PREPARING' | 'SENT' | 'EXPIRED' | 'APPROVED' | 'CLOSED';

export interface CotizacionDelCliente {
  number: string;
  estado: EstadoParaCliente;
  /** Para quién o para qué es (lo que escribió el equipo o el cliente) */
  titulo: string;
  totalUSD: number;
  /** Lo que se paga tras la retención del IVA; null si el cliente no retiene */
  netoUSD: number | null;
  /** Hasta cuándo vale (enviadas y vencidas) */
  venceEl: string | null;
  approvedAt: string | null;
  createdAt: string;
  /** El enlace del documento: solo en las enviadas, vencidas y aprobadas (las demás no tienen página) */
  enlace: string | null;
}

const MAXIMO = 50;

export function estadoParaCliente(status: string, sentAt: Date | null, validityDays: number): EstadoParaCliente {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'CLOSED';
  if (status === 'SENT') return estaVencida(status, sentAt, validityDays) ? 'EXPIRED' : 'SENT';
  return 'PREPARING';
}

export async function cotizacionesDelCliente(userId: string, correo: string | null, correoVerificado: boolean): Promise<CotizacionDelCliente[]> {
  const filas = await prisma.quote.findMany({
    where: {
      OR: [
        { userId },
        ...(correo && correoVerificado
          ? [{ contactEmail: { equals: correo, mode: 'insensitive' as const }, status: { in: ['SENT', 'APPROVED'] } }]
          : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: MAXIMO,
    include: { items: { select: { quantity: true, unitPriceUSD: true } } },
  });

  return filas.map((q) => {
    const estado = estadoParaCliente(q.status, q.sentAt, q.validityDays);
    const totales = totalesCotizacion(q.items.map((l) => ({ quantity: l.quantity, unitPriceUSD: Number(l.unitPriceUSD) })), Number(q.taxPercent), q.advancePercent, q.ivaRetentionPercent);
    return {
      number: q.number,
      estado,
      titulo: q.subject || q.clientName,
      totalUSD: totales.totalUSD,
      netoUSD: totales.retencionUSD > 0 ? totales.netoUSD : null,
      venceEl: q.sentAt && (estado === 'SENT' || estado === 'EXPIRED') ? (venceEl(q.sentAt, q.validityDays)?.toISOString() ?? null) : null,
      approvedAt: q.approvedAt?.toISOString() ?? null,
      createdAt: q.createdAt.toISOString(),
      enlace: estado === 'SENT' || estado === 'EXPIRED' || estado === 'APPROVED' ? `/cotizacion/${q.token}` : null,
    };
  });
}

