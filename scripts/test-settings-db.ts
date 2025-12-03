
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database connection...');
    try {
        // 1. Test basic connection
        await prisma.$connect();
        console.log('✅ Connected to database successfully.');

        // 2. Test CompanySettings table
        console.log('Testing CompanySettings table...');
        const settings = await prisma.companySettings.findFirst({
            where: { id: 'default' },
        });

        if (settings) {
            console.log('✅ Found existing settings:', settings);

            // Test JSON parsing manually
            if (settings.socialMedia) {
                try {
                    const parsed = JSON.parse(settings.socialMedia);
                    console.log('✅ socialMedia JSON is valid:', parsed);
                } catch (e) {
                    console.error('❌ socialMedia JSON is INVALID:', e);
                }
            } else {
                console.log('ℹ️ socialMedia is null/empty');
            }

            if (settings.businessHours) {
                try {
                    const parsed = JSON.parse(settings.businessHours);
                    console.log('✅ businessHours JSON is valid:', parsed);
                } catch (e) {
                    console.error('❌ businessHours JSON is INVALID:', e);
                }
            } else {
                console.log('ℹ️ businessHours is null/empty');
            }

        } else {
            console.log('⚠️ No settings found with id="default". Attempting to create...');
            const newSettings = await prisma.companySettings.create({
                data: {
                    id: 'default',
                    companyName: 'Test Company',
                },
            });
            console.log('✅ Created default settings:', newSettings);
        }

    } catch (error) {
        console.error('❌ Database Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
