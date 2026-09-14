/**
 * C-60: convierte los montos de productos digitales guardados en specs.digitalPricing en filas de DigitalVariant.
 *
 * Uso (en el servidor, después de `npx prisma db push`):
 *   npx tsx scripts/migrate-digital-variants.ts           → solo muestra lo que haría (no escribe)
 *   npx tsx scripts/migrate-digital-variants.ts --apply   → crea las variantes
 *
 * Es idempotente: salta los productos que ya tienen variantes. No borra ni cambia specs
 * (la tienda deja de leer digitalPricing en cuanto el producto tiene variantes).
 */
import { PrismaClient } from '@prisma/client';
import { formatFaceValue, getPlatform, guessLegacyUnit } from '../lib/digital-catalog';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

interface LegacyRow {
  amount?: unknown;
  cost?: unknown;
  salePrice?: unknown;
  enabled?: unknown;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { productType: 'DIGITAL' },
    select: { id: true, name: true, specs: true, digitalPlatform: true, deliveryMethod: true, accountFieldLabel: true, accountFieldHint: true, _count: { select: { digitalVariants: true } } },
  });

  let migrated = 0;
  let skipped = 0;
  for (const product of products) {
    if (product._count.digitalVariants > 0) {
      skipped++;
      console.log(`= ${product.name}: ya tiene ${product._count.digitalVariants} variantes, se salta`);
      continue;
    }
    let rows: LegacyRow[] = [];
    try {
      const parsed = product.specs ? JSON.parse(product.specs) : null;
      rows = Array.isArray(parsed?.digitalPricing) ? parsed.digitalPricing : [];
    } catch {
      rows = [];
    }

    const variants = rows
      .map((row, index) => {
        const faceValue = Number(row.amount);
        const priceUSD = Number(row.salePrice);
        const costUSD = Number(row.cost);
        const unit = guessLegacyUnit(product.digitalPlatform, faceValue);
        return {
          productId: product.id,
          faceValue,
          unit,
          label: formatFaceValue(faceValue, unit),
          costUSD: Number.isFinite(costUSD) && costUSD >= 0 ? costUSD : 0,
          priceUSD,
          isActive: row.enabled !== false,
          sortOrder: index,
        };
      })
      .filter((v) => Number.isFinite(v.faceValue) && v.faceValue > 0 && Number.isFinite(v.priceUSD) && v.priceUSD > 0);

    if (variants.length === 0) {
      console.log(`! ${product.name}: sin montos en specs; créalos desde el admin`);
      continue;
    }

    // En recargas directas se completa el dato de cuenta con el de la plataforma si falta
    const preset = getPlatform(product.digitalPlatform);
    const accountUpdate =
      product.deliveryMethod === 'MANUAL' && !product.accountFieldLabel && preset
        ? { accountFieldLabel: preset.accountFieldLabel, accountFieldHint: product.accountFieldHint || preset.accountFieldHint || null }
        : null;

    console.log(`${apply ? '+' : '~'} ${product.name}: ${variants.map((v) => `${v.label} → $${v.priceUSD}${v.isActive ? '' : ' (inactiva)'}`).join(', ')}`);
    if (apply) {
      await prisma.$transaction(async (tx) => {
        await tx.digitalVariant.createMany({ data: variants });
        if (accountUpdate) await tx.product.update({ where: { id: product.id }, data: accountUpdate });
      });
    }
    migrated++;
  }

  console.log(`\n${apply ? 'Migrados' : 'Se migrarían'}: ${migrated} · Ya migrados: ${skipped} · Productos digitales: ${products.length}`);
  if (!apply && migrated > 0) console.log('Nada se escribió. Revisa la lista y vuelve a correr con --apply.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
