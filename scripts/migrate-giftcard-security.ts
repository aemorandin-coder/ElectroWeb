/**
 * Migration script to add hashes to existing gift cards
 * Run this once after deploying the security update
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Inline the crypto functions since we can't import .ts from scripts easily
function hashGiftCardCode(code: string): string {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

function getCodeLastFour(code: string): string {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normalized.slice(-4);
}

function hashPin(pin: string): string {
    return crypto.createHash('sha256').update(pin).digest('hex');
}

const prisma = new PrismaClient();

async function migrateGiftCards() {
    console.log('🔐 Starting gift card security migration...\n');

    // Find all gift cards without codeHash
    const cardsToMigrate = await prisma.giftCard.findMany({
        where: {
            codeHash: null
        }
    });

    console.log(`Found ${cardsToMigrate.length} gift cards to migrate.\n`);

    let migrated = 0;
    let errors = 0;

    for (const card of cardsToMigrate) {
        try {
            const codeHash = hashGiftCardCode(card.code);
            const codeLast4 = getCodeLastFour(card.code);

            // Check if PIN needs hashing (if it's not already 64 chars)
            let newPin = card.pin;
            if (card.pin && card.pin.length < 64) {
                // PIN is plain text, hash it
                newPin = hashPin(card.pin);
                console.log(`  Hashing PIN for card ****${codeLast4}`);
            }

            await prisma.giftCard.update({
                where: { id: card.id },
                data: {
                    codeHash,
                    codeLast4,
                    pin: newPin
                }
            });

            migrated++;
            console.log(`✅ Migrated card ****${codeLast4}`);
        } catch (error) {
            errors++;
            console.error(`❌ Error migrating card ${card.id}:`, error);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Migration complete!`);
    console.log(`  ✅ Migrated: ${migrated}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log('='.repeat(50));
}

migrateGiftCards()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
