// Alta de promotores y sus solicitudes (C-167). Solo servidor.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { codigoLibre, DESCUENTO_MAXIMO_CLIENTE, sincronizarCupon } from '@/lib/influencer-cupon';

export const COMISION_MAXIMA = 50;

const codigo = z.string().trim().min(3, 'El código debe tener entre 3 y 20 caracteres').max(20, 'El código debe tener entre 3 y 20 caracteres');
const comision = z.coerce.number().min(0, 'La comisión no puede ser negativa').max(COMISION_MAXIMA, `La comisión máxima es ${COMISION_MAXIMA} %`);
const descuento = z.coerce.number().int('El descuento es un número entero').min(1, 'El descuento al cliente va de 1 a 30 %').max(DESCUENTO_MAXIMO_CLIENTE, 'El descuento al cliente va de 1 a 30 %');

export const promotorSchema = z.object({
  userId: z.string().min(1, 'Elige el usuario').max(40),
  code: codigo,
  name: z.string().trim().min(2, 'El nombre es muy corto').max(80),
  commissionRate: comision.default(5),
  customerDiscountPercent: descuento.default(5),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const edicionPromotorSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre es muy corto').max(80).optional(),
    commissionRate: comision.optional(),
    customerDiscountPercent: descuento.optional(),
    status: z.enum(['ACTIVE', 'PAUSED']).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const aprobarSolicitudSchema = z.object({
  action: z.literal('approve'),
  code: codigo,
  name: z.string().trim().min(2, 'El nombre es muy corto').max(80),
  commissionRate: comision.default(5),
  customerDiscountPercent: descuento.default(5),
});

export const rechazarSolicitudSchema = z.object({
  action: z.literal('reject'),
  note: z.string().trim().max(300).optional(),
});

export const solicitudSchema = z.object({
  channels: z.string().trim().min(5, 'Cuéntanos dónde publicas (Instagram, TikTok, un grupo…)').max(300),
  followers: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  message: z.string().trim().max(600).optional().nullable(),
  wantedCode: z.string().trim().max(20).optional().nullable(),
});

export class PromotorError extends Error {
  status: number;
  constructor(mensaje: string, status = 400) {
    super(mensaje);
    this.status = status;
  }
}

/** Letras, números, guion y guion bajo, en mayúsculas. */
export function limpiarCodigo(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

/** Crea el promotor con su cupón. Lanza PromotorError con el motivo si no se puede. */
export async function crearPromotor(d: { userId: string; code: string; name: string; commissionRate: number; customerDiscountPercent: number; notes?: string | null }) {
  const code = limpiarCodigo(d.code);
  if (code.length < 3 || code.length > 20) throw new PromotorError('El código debe tener entre 3 y 20 caracteres (letras, números, _ -)');

  const user = await prisma.user.findUnique({ where: { id: d.userId }, select: { id: true, role: true, influencerProfile: { select: { id: true } } } });
  if (!user) throw new PromotorError('Usuario no encontrado', 404);
  if (user.influencerProfile) throw new PromotorError('Este usuario ya es promotor', 409);
  if (!(await codigoLibre(code))) throw new PromotorError('Ese código ya lo usa otro promotor o un cupón', 409);

  const promotor = await prisma.influencer.create({
    data: { userId: d.userId, code, name: d.name, commissionRate: d.commissionRate, customerDiscountPercent: d.customerDiscountPercent, notes: d.notes || null },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  await sincronizarCupon(promotor);
  return promotor;
}
