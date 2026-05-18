import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('cliente123', 10);
  
  const customer = await prisma.user.upsert({
    where: { email: 'cliente@electroshop.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'cliente@electroshop.com',
      password: hashedPassword,
      name: 'Cliente de Prueba',
      role: 'USER',
    },
  });

  console.log('Cliente creado: cliente@electroshop.com / cliente123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
