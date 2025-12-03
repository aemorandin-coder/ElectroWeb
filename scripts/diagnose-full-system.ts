import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting System Diagnosis...');

    try {
        // 1. Test Connection
        console.log('\n1️⃣ Testing Database Connection...');
        await prisma.$connect();
        console.log('✅ Database connection successful.');

        // 2. Check Settings
        console.log('\n2️⃣ Checking Company Settings...');
        const settings = await prisma.companySettings.findFirst({
            where: { id: 'default' },
        });

        if (settings) {
            console.log('✅ Settings found:', {
                name: settings.companyName,
                currency: settings.primaryCurrency,
                exchangeRate: settings.exchangeRateVES
            });
        } else {
            console.error('❌ NO SETTINGS FOUND! Admin panel will look empty.');
        }

        // 3. Check Products
        console.log('\n3️⃣ Checking Products...');
        const productCount = await prisma.product.count();
        console.log(`📊 Total Products in DB: ${productCount}`);

        if (productCount > 0) {
            const sampleProduct = await prisma.product.findFirst({
                include: { category: true }
            });
            console.log('✅ Sample Product:', {
                name: sampleProduct?.name,
                price: sampleProduct?.priceUSD,
                category: sampleProduct?.category.name,
                published: sampleProduct?.status
            });
        } else {
            console.warn('⚠️ NO PRODUCTS FOUND! Homepage will look empty.');
        }

        // 4. Check Categories
        console.log('\n4️⃣ Checking Categories...');
        const categoryCount = await prisma.category.count();
        console.log(`📊 Total Categories: ${categoryCount}`);

    } catch (error) {
        console.error('❌ CRITICAL DATABASE ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
