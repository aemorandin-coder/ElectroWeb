import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcryptjs';

async function resetCustomers() {
  console.log('🗑️  Eliminando datos relacionados...');

  // Delete related data first (to avoid foreign key constraints)
  await prisma.order.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.comparison.deleteMany({});
  await prisma.userBalance.deleteMany({});
  await prisma.chatConversation.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});

  console.log('✅ Datos relacionados eliminados');

  console.log('🗑️  Eliminando todos los clientes existentes...');

  // Delete all customers
  await prisma.user.deleteMany({});

  console.log('✅ Clientes eliminados');

  console.log('👤 Creando cliente de prueba...');

  // Create test customer
  const hashedPassword = await bcrypt.hash('password123', 10);

  const testCustomer = await prisma.user.create({
    data: {
      email: 'cliente@test.com',
      password: hashedPassword,
      name: 'Cliente de Prueba',
      emailVerified: new Date(),
      profile: {
        create: {
          phone: '+58 424-1234567',
          whatsapp: '+584241234567',
          customerType: 'PERSON',
        },
      },
    },
    include: {
      profile: true,
    },
  });

  console.log('✅ Cliente de prueba creado:');
  console.log('   Email: cliente@test.com');
  console.log('   Password: password123');
  console.log('   ID:', testCustomer.id);

  console.log('\n🎉 Proceso completado exitosamente!');
}

resetCustomers()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
