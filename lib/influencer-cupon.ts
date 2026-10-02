// Código de promotor (C-167): cada promotor tiene un cupón con su mismo código. El cliente lo escribe en el carrito,
// recibe el descuento que eligió la tienda para ese promotor y la compra cuenta para él (lib/influencer-commission.ts).
// El cupón vive en `promotions` (con influencerId) para reutilizar todo lo de los cupones: dónde aplica (no a usados ni
// digitales), los topes y el registro de usos. Se edita solo desde Marketing → Promotores.
import { prisma } from '@/lib/prisma';

export const DESCUENTO_MAXIMO_CLIENTE = 30;

type Promotor = { id: string; code: string; name: string; status: string; customerDiscountPercent: number };

/** Crea o actualiza el cupón del promotor para que coincida con su código, su % y su estado. */
export async function sincronizarCupon(p: Promotor): Promise<void> {
  const datos = {
    name: `Código de promotor · ${p.name}`.slice(0, 120),
    label: `Código ${p.code}`,
    kind: 'COUPON' as const,
    code: p.code,
    isPublic: false,
    percentOff: Math.min(Math.max(Math.round(p.customerDiscountPercent), 1), DESCUENTO_MAXIMO_CLIENTE),
    amountOffUSD: null,
    scope: 'ALL' as const,
    productIds: [],
    categoryIds: [],
    isActive: p.status === 'ACTIVE',
  };
  await prisma.promotion.upsert({
    where: { influencerId: p.id },
    create: { ...datos, influencerId: p.id },
    update: datos,
  });
}

/** Los promotores que todavía no tienen cupón (los de antes de C-167) lo reciben. */
export async function asegurarCupones(): Promise<void> {
  const sinCupon = await prisma.influencer.findMany({
    where: { coupon: null },
    select: { id: true, code: true, name: true, status: true, customerDiscountPercent: true },
  });
  for (const p of sinCupon) {
    // Si un cupón normal ya usa ese código, el promotor se queda sin código hasta que se le cambie (se avisa en el panel)
    const ocupado = await prisma.promotion.findUnique({ where: { code: p.code }, select: { influencerId: true } });
    if (ocupado && ocupado.influencerId !== p.id) continue;
    await sincronizarCupon(p).catch((error) => console.error('[PROMOTORES] Cupón:', error));
  }
}

/** ¿El código está libre para un promotor? (no lo usa un cupón normal ni otro promotor) */
export async function codigoLibre(code: string, influencerId?: string): Promise<boolean> {
  const [cupon, promotor] = await Promise.all([
    prisma.promotion.findUnique({ where: { code }, select: { influencerId: true } }),
    prisma.influencer.findUnique({ where: { code }, select: { id: true } }),
  ]);
  if (cupon && (!influencerId || cupon.influencerId !== influencerId)) return false;
  if (promotor && promotor.id !== influencerId) return false;
  return true;
}

/** Código propuesto a partir de un nombre o lo que pidió la persona: letras y números, 4 a 12, en mayúsculas. */
export function proponerCodigo(base: string): string {
  const limpio = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (limpio.slice(0, 10) || 'PROMO') + (limpio.length < 4 ? 'ES' : '');
}
