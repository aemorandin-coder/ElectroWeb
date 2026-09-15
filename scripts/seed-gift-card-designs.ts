/**
 * C-71: guarda los 4 diseños de gift card (lib/gift-card-designs.ts) en gift_card_designs.
 * Así la tarjeta comprada recuerda su diseño y el canje la muestra igual.
 *
 * Uso: npx tsx scripts/seed-gift-card-designs.ts            → muestra qué haría
 *      npx tsx scripts/seed-gift-card-designs.ts --apply    → crea o actualiza por slug (no borra nada)
 */
import { PrismaClient } from '@prisma/client';
import { GIFT_CARD_DESIGNS } from '../lib/gift-card-designs';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  for (const [index, design] of GIFT_CARD_DESIGNS.entries()) {
    const existing = await prisma.giftCardDesign.findUnique({ where: { slug: design.slug }, select: { id: true } });
    const data = {
      name: design.name,
      category: design.category,
      backgroundColor: design.background,
      textColor: design.text,
      accentColor: design.accent,
      isActive: true,
      isDefault: index === 0,
      sortOrder: index,
    };
    console.log(`${existing ? '~ actualizar' : '+ crear'} ${design.slug} (${design.name})`);
    if (!apply) continue;
    await prisma.giftCardDesign.upsert({ where: { slug: design.slug }, create: { slug: design.slug, ...data }, update: data });
  }
  if (!apply) console.log('\nNada se escribió. Vuelve a correr con --apply.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
