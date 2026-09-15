/**
 * C-27: da enlace corto (/p/<código>) a los productos que no lo tienen.
 *
 * Uso (en el servidor):
 *   npx tsx scripts/backfill-short-codes.ts           → solo cuenta y muestra ejemplos (no escribe)
 *   npx tsx scripts/backfill-short-codes.ts --apply   → asigna los códigos
 *
 * Es idempotente: solo toca productos con shortCode vacío. No cambia slugs ni nada más.
 */
import { PrismaClient } from '@prisma/client';
import { generateShortCode } from '../lib/short-code';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const products = await prisma.product.findMany({
    where: { OR: [{ shortCode: null }, { shortCode: '' }] },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });
  const total = await prisma.product.count();

  let assigned = 0;
  for (const product of products) {
    const code = await generateShortCode(prisma);
    if (apply) await prisma.product.update({ where: { id: product.id }, data: { shortCode: code } });
    assigned++;
    if (assigned <= 10 || apply) console.log(`${apply ? '+' : '~'} /p/${code} → /productos/${product.slug}`);
  }

  console.log(`\n${apply ? 'Asignados' : 'Se asignarían'}: ${assigned} · Ya tenían código: ${total - products.length} · Productos: ${total}`);
  if (!apply) console.log('Nada se escribió. Vuelve a correr con --apply.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
