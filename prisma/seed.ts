import { PrismaClient, Role, OrderStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. CREATE ADMIN USER
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@electroshop.com' },
    update: {},
    create: {
      email: 'admin@electroshop.com',
      password: hashedPassword,
      name: 'Administrador',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin created: admin@electroshop.com');

  // 2. CREATE COMPANY SETTINGS
  console.log('⚙️  Creating company settings...');
  await prisma.companySettings.upsert({
    where: { id: 'default' },
    update: {
      instagram: 'https://instagram.com/electroshop',
      facebook: 'https://facebook.com/electroshop',
      twitter: 'https://twitter.com/electroshop',
      youtube: 'https://youtube.com/@electroshop',
      telegram: 'https://t.me/electroshop',
    },
    create: {
      id: 'default',
      companyName: 'Electro Shop Morandin C.A.',
      tagline: 'Tu tienda de tecnología en Guanare',
      phone: '+58 424-1234567',
      whatsapp: '+58 424-1234567',
      email: 'ventas@electroshop.com',
      address: 'Calle 5 con Avenida 11, Guanare, Portuguesa',
      instagram: 'https://instagram.com/electroshop',
      facebook: 'https://facebook.com/electroshop',
      twitter: 'https://twitter.com/electroshop',
      youtube: 'https://youtube.com/@electroshop',
      telegram: 'https://t.me/electroshop',
      exchangeRateVES: 36.50,
      exchangeRateEUR: 0.92,
      deliveryEnabled: true,
      deliveryFeeUSD: 5,
      freeDeliveryThresholdUSD: 100,
      pickupEnabled: true,
      pickupAddress: 'Calle 5 con Avenida 11, Local 123, Guanare',
      taxEnabled: true,
      taxPercent: 16,
      minOrderAmountUSD: 10,
    },
  });
  console.log('✅ Company settings created');

  // 3. CREATE CATEGORIES
  console.log('📁 Creating categories...');
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'laptops' },
      update: {},
      create: {
        name: 'Laptops',
        slug: 'laptops',
        description: 'Laptops para gaming, trabajo y estudio',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'gaming' },
      update: {},
      create: {
        name: 'Gaming',
        slug: 'gaming',
        description: 'Equipos y accesorios para gamers',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'consolas' },
      update: {},
      create: {
        name: 'Consolas',
        slug: 'consolas',
        description: 'PlayStation, Xbox, Nintendo Switch',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'accesorios' },
      update: {},
      create: {
        name: 'Accesorios',
        slug: 'accesorios',
        description: 'Teclados, mouse, audífonos y más',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'componentes' },
      update: {},
      create: {
        name: 'Componentes',
        slug: 'componentes',
        description: 'RAM, SSD, GPU y otros componentes',
      },
    }),
  ]);
  console.log(`✅ Created ${categories.length} categories`);

  // 4. CREATE PRODUCTS
  console.log('📦 Creating products...');
  // Helper to get category ID
  const getCatId = (slug: string) => categories.find(c => c.slug === slug)?.id || categories[0].id;

  const products = await Promise.all([
    // Laptops
    prisma.product.upsert({
      where: { slug: 'laptop-asus-rog-strix-g15' },
      update: {},
      create: {
        name: 'Laptop ASUS ROG Strix G15',
        sku: 'LAP-ASUS-ROG-G15',
        slug: 'laptop-asus-rog-strix-g15',
        description: 'Laptop gaming con procesador AMD Ryzen 7, RTX 3060, 16GB RAM, 512GB SSD',
        priceUSD: 1299,
        stock: 5,
        categoryId: getCatId('laptops'),
        images: JSON.stringify(['/images/products/laptop-asus-rog.jpg']),
        mainImage: '/images/products/laptop-asus-rog.jpg',
        features: JSON.stringify(['AMD Ryzen 7 5800H', 'NVIDIA RTX 3060 6GB', '16GB DDR4', '512GB NVMe SSD']),
        isFeatured: true,
        status: 'PUBLISHED',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'macbook-pro-14-m3' },
      update: {},
      create: {
        name: 'MacBook Pro 14" M3',
        sku: 'LAP-MAC-PRO14-M3',
        slug: 'macbook-pro-14-m3',
        description: 'MacBook Pro con chip M3, 16GB RAM unificada, 512GB SSD',
        priceUSD: 1999,
        stock: 3,
        categoryId: getCatId('laptops'),
        images: JSON.stringify(['/images/products/macbook-pro-m3.jpg']),
        features: JSON.stringify(['Apple M3', '16GB Unified Memory', '512GB SSD', '14.2" Liquid Retina XDR']),
        isFeatured: true,
        status: 'PUBLISHED',
      },
    }),
    // Gaming
    prisma.product.upsert({
      where: { slug: 'pc-gaming-rtx-4070' },
      update: {},
      create: {
        name: 'PC Gaming RTX 4070',
        sku: 'PC-GAM-RTX4070',
        slug: 'pc-gaming-rtx-4070',
        description: 'PC Gaming armado con Intel i7, RTX 4070, 32GB RAM, 1TB SSD',
        priceUSD: 1599,
        stock: 2,
        categoryId: getCatId('gaming'),
        images: JSON.stringify(['/images/products/pc-gaming-rtx4070.jpg']),
        features: JSON.stringify(['Intel Core i7-13700K', 'NVIDIA RTX 4070 12GB', '32GB DDR5', '1TB NVMe Gen4']),
        isFeatured: true,
        status: 'PUBLISHED',
      },
    }),
    // Consolas
    prisma.product.upsert({
      where: { slug: 'playstation-5-slim' },
      update: {},
      create: {
        name: 'PlayStation 5 Slim',
        sku: 'CON-PS5-SLIM',
        slug: 'playstation-5-slim',
        description: 'Consola PlayStation 5 modelo Slim con lector de discos',
        priceUSD: 499,
        stock: 8,
        categoryId: getCatId('consolas'),
        images: JSON.stringify(['/images/products/ps5-slim.jpg']),
        isFeatured: true,
        status: 'PUBLISHED',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'xbox-series-x' },
      update: {},
      create: {
        name: 'Xbox Series X',
        sku: 'CON-XBOX-SX',
        slug: 'xbox-series-x',
        description: 'Consola Xbox Series X 1TB con 4K gaming',
        priceUSD: 499,
        stock: 6,
        categoryId: getCatId('consolas'),
        images: JSON.stringify(['/images/products/xbox-series-x.jpg']),
        status: 'PUBLISHED',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'nintendo-switch-oled' },
      update: {},
      create: {
        name: 'Nintendo Switch OLED',
        sku: 'CON-NSW-OLED',
        slug: 'nintendo-switch-oled',
        description: 'Nintendo Switch modelo OLED con pantalla de 7 pulgadas',
        priceUSD: 349,
        stock: 10,
        categoryId: getCatId('consolas'),
        images: JSON.stringify(['/images/products/switch-oled.jpg']),
        isFeatured: true,
        status: 'PUBLISHED',
      },
    }),
    // Accesorios
    prisma.product.upsert({
      where: { slug: 'teclado-logitech-g-pro' },
      update: {},
      create: {
        name: 'Teclado Mecánico Logitech G Pro',
        sku: 'ACC-KEY-LOGI-GPRO',
        slug: 'teclado-logitech-g-pro',
        description: 'Teclado mecánico gaming con switches GX Blue',
        priceUSD: 129,
        stock: 15,
        categoryId: getCatId('accesorios'),
        images: JSON.stringify(['/images/products/teclado-logitech-g-pro.jpg']),
        status: 'PUBLISHED',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'mouse-razer-deathadder-v3' },
      update: {},
      create: {
        name: 'Mouse Razer DeathAdder V3',
        sku: 'ACC-MOU-RAZ-DAV3',
        slug: 'mouse-razer-deathadder-v3',
        description: 'Mouse gaming óptico con sensor de 30000 DPI',
        priceUSD: 69,
        stock: 20,
        categoryId: getCatId('accesorios'),
        images: JSON.stringify(['/images/products/mouse-razer-deathadder.jpg']),
        status: 'PUBLISHED',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'audifonos-hyperx-cloud-ii' },
      update: {},
      create: {
        name: 'Audífonos HyperX Cloud II',
        sku: 'ACC-HEAD-HYP-CLD2',
        slug: 'audifonos-hyperx-cloud-ii',
        description: 'Audífonos gaming con sonido 7.1 surround',
        priceUSD: 99,
        stock: 12,
        categoryId: getCatId('accesorios'),
        images: JSON.stringify(['/images/products/audifonos-hyperx.jpg']),
        isFeatured: true,
        status: 'PUBLISHED',
      },
    }),
    // Componentes
    prisma.product.upsert({
      where: { slug: 'ram-corsair-vengeance-32gb-ddr5' },
      update: {},
      create: {
        name: 'RAM Corsair Vengeance 32GB DDR5',
        sku: 'COMP-RAM-COR-32D5',
        slug: 'ram-corsair-vengeance-32gb-ddr5',
        description: 'Memoria RAM DDR5 32GB (2x16GB) 6000MHz RGB',
        priceUSD: 149,
        stock: 8,
        categoryId: getCatId('componentes'),
        images: JSON.stringify(['/images/products/ram-corsair-vengeance.jpg']),
        status: 'PUBLISHED',
      },
    }),
    prisma.product.upsert({
      where: { slug: 'ssd-samsung-990-pro-1tb' },
      update: {},
      create: {
        name: 'SSD Samsung 990 Pro 1TB',
        sku: 'COMP-SSD-SAM-990P',
        slug: 'ssd-samsung-990-pro-1tb',
        description: 'SSD NVMe Gen4 1TB con velocidades de hasta 7450 MB/s',
        priceUSD: 119,
        stock: 10,
        categoryId: getCatId('componentes'),
        images: JSON.stringify(['/images/products/ssd-samsung-990.jpg']),
        status: 'PUBLISHED',
      },
    }),
  ]);
  console.log(`✅ Created ${products.length} products`);

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Credentials:');
  console.log('   Admin: admin@electroshop.com / admin123');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
