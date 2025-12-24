/**
 * Migration Script: Fix Data URI Images in Database
 * 
 * This script finds all settings with base64/data URI images and converts them
 * to proper file URLs by saving them to the public/uploads directory.
 * 
 * Run with: npx ts-node scripts/fix-data-uri-images.ts
 */

import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Fields that might contain data URIs
const imageFields = ['logo', 'favicon', 'heroBackgroundImage', 'hotAdImage'];

/**
 * Convert a data URI to a file and return the public URL
 */
async function convertDataURIToFile(
    dataUri: string,
    fieldName: string,
    uploadDir: string
): Promise<string | null> {
    try {
        // Extract the base64 data and mime type
        const matches = dataUri.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (!matches) {
            console.warn(`  ⚠️  Invalid data URI format for ${fieldName}`);
            return null;
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Determine file extension
        let extension = mimeType.toLowerCase();
        if (extension === 'jpeg') extension = 'jpg';
        if (extension === 'svg+xml') extension = 'svg';
        if (extension === 'x-icon' || extension === 'vnd.microsoft.icon') extension = 'ico';

        // Create unique filename
        const timestamp = Date.now();
        const filename = `${fieldName}-${timestamp}.${extension}`;
        const filepath = path.join(uploadDir, filename);

        // Convert base64 to buffer and save
        const buffer = Buffer.from(base64Data, 'base64');
        await writeFile(filepath, buffer);

        console.log(`  ✅ Saved ${fieldName}: /uploads/${filename} (${buffer.length} bytes)`);

        return `/uploads/${filename}`;
    } catch (error) {
        console.error(`  ❌ Error converting ${fieldName}:`, error);
        return null;
    }
}

async function main() {
    console.log('🔍 Scanning database for data URI images...\n');

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
        console.log(`📁 Created upload directory: ${uploadDir}\n`);
    }

    // Get company settings
    const settings = await prisma.companySettings.findFirst({
        where: { id: 'default' },
    });

    if (!settings) {
        console.log('ℹ️  No settings found in database.');
        return;
    }

    let updatedFields: Record<string, string> = {};
    let hasChanges = false;

    // Check each image field
    for (const field of imageFields) {
        const value = (settings as any)[field];

        if (!value) {
            console.log(`⏭️  ${field}: empty`);
            continue;
        }

        if (value.startsWith('data:')) {
            console.log(`📦 ${field}: Found data URI (${value.length} chars)`);

            const newUrl = await convertDataURIToFile(value, field, uploadDir);
            if (newUrl) {
                updatedFields[field] = newUrl;
                hasChanges = true;
            }
        } else if (value.startsWith('/') || value.startsWith('http')) {
            console.log(`✓  ${field}: Already a proper URL - ${value}`);
        } else {
            console.log(`❓ ${field}: Unknown format - ${value.substring(0, 50)}...`);
        }
    }

    // Update database if there are changes
    if (hasChanges) {
        console.log('\n💾 Updating database...');

        await prisma.companySettings.update({
            where: { id: 'default' },
            data: updatedFields,
        });

        console.log('✅ Database updated successfully!\n');
        console.log('Updated fields:');
        for (const [field, url] of Object.entries(updatedFields)) {
            console.log(`  - ${field}: ${url}`);
        }
    } else {
        console.log('\nℹ️  No data URIs found that need conversion.');
    }

    console.log('\n🎉 Migration complete!');
}

main()
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
