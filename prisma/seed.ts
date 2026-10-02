import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. CREATE ADMIN USER
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'admin123', 10);

  await prisma.user.upsert({
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
      where: { slug: 'computadores-portatiles' },
      update: {
        name: 'Computadores y Portátiles',
        description: 'Laptops, PCs de escritorio, All-in-One y más',
      },
      create: {
        name: 'Computadores y Portátiles',
        slug: 'computadores-portatiles',
        description: 'Laptops, PCs de escritorio, All-in-One y más',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'codigos-digitales' },
      update: {
        name: 'Códigos Digitales',
        description: 'Tarjetas de regalo, juegos y recargas digitales',
      },
      create: {
        name: 'Códigos Digitales',
        slug: 'codigos-digitales',
        description: 'Tarjetas de regalo, juegos y recargas digitales',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'redes-conectividad' },
      update: {
        name: 'Redes y Conectividad',
        description: 'Routers, switches, antenas y equipos de red',
      },
      create: {
        name: 'Redes y Conectividad',
        slug: 'redes-conectividad',
        description: 'Routers, switches, antenas y equipos de red',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'cables-adaptadores' },
      update: {
        name: 'Cables y Adaptadores',
        description: 'Todo tipo de cables, convertidores y adaptadores',
      },
      create: {
        name: 'Cables y Adaptadores',
        slug: 'cables-adaptadores',
        description: 'Todo tipo de cables, convertidores y adaptadores',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'energia-proteccion' },
      update: {
        name: 'Energía y Protección',
        description: 'UPS, protectores de voltaje, regletas y baterías',
      },
      create: {
        name: 'Energía y Protección',
        slug: 'energia-proteccion',
        description: 'UPS, protectores de voltaje, regletas y baterías',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'software-licencias' },
      update: {
        name: 'Software y Licencias Originales',
        description: 'Sistemas operativos, antivirus y ofimática',
      },
      create: {
        name: 'Software y Licencias Originales',
        slug: 'software-licencias',
        description: 'Sistemas operativos, antivirus y ofimática',
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

  // Clear existing products to avoid conflicts/duplicates if rerunning without reset
  // Note: upsert handles updates, but we want to simulate a clean state for these 3 specific items or just ensure they exist.
  // Since we are replacing the whole list, we just define the new ones.

  const products = await Promise.all([
    // 1. Códigos Digitales - Gift Card
    prisma.product.upsert({
      where: { slug: 'gift-card-playstation-50' },
      update: {
        images: JSON.stringify(['/images/no-image.png']),
        mainImage: '/images/no-image.png',
      },
      create: {
        name: 'Gift Card PlayStation Network $50',
        sku: 'DIG-PSN-50',
        slug: 'gift-card-playstation-50',
        description: 'Tarjeta de regalo digital para PlayStation Store. Código canjeable por $50 USD.',
        priceUSD: 50,
        stock: 999, // Digital unlimited ish
        categoryId: getCatId('codigos-digitales'),
        productType: 'DIGITAL',
        digitalPlatform: 'PLAYSTATION',
        digitalRegion: 'USA',
        deliveryMethod: 'INSTANT',
        images: JSON.stringify(['/images/no-image.png']),
        mainImage: '/images/no-image.png',
        features: JSON.stringify(['Saldo instantáneo', 'Región USA', 'Sin fecha de expiración']),
        isFeatured: true,
        status: 'PUBLISHED',
      },
    }),

    // 2. Redes y Conectividad - Router
    prisma.product.upsert({
      where: { slug: 'router-tp-link-archer-ax50' },
      update: {
        images: JSON.stringify(['/images/no-image.png']),
        mainImage: '/images/no-image.png',
      },
      create: {
        name: 'Router Wi-Fi 6 TP-Link Archer AX50',
        sku: 'NET-TPL-AX50',
        slug: 'router-tp-link-archer-ax50',
        description: 'Router Gigabit de doble banda AX3000 con tecnología Wi-Fi 6 para baja latencia.',
        priceUSD: 149.99,
        stock: 12,
        categoryId: getCatId('redes-conectividad'),
        images: JSON.stringify(['/images/no-image.png']),
        mainImage: '/images/no-image.png',
        features: JSON.stringify(['Wi-Fi 6 AX3000', 'Baja Latencia', 'Intel Home Wi-Fi Chipset', 'Cobertura Amplia']),
        status: 'PUBLISHED',
      },
    }),

    // 3. Gaming - Control (Generico para probar)
    prisma.product.upsert({
      where: { slug: 'control-xbox-carbon-black' },
      update: {
        images: JSON.stringify(['/images/no-image.png']),
        mainImage: '/images/no-image.png',
      },
      create: {
        name: 'Control Inalámbrico Xbox - Carbon Black',
        sku: 'GAM-XBX-CTRL-BLK',
        slug: 'control-xbox-carbon-black',
        description: 'Control moderno con geometría refinada para mayor comodidad durante el juego.',
        priceUSD: 59.99,
        stock: 25,
        categoryId: getCatId('gaming'), // Using Gaming category as requested, though could be Accesorios
        images: JSON.stringify(['/images/no-image.png']),
        mainImage: '/images/no-image.png',
        features: JSON.stringify(['Tecnología Xbox Wireless', 'Bluetooth', 'Mapeo de botones', 'Agarre texturizado']),
        isFeatured: true,
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
