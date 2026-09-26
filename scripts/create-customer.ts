/**
 * Crea un cliente de prueba.
 *
 *   npx tsx scripts/create-customer.ts <correo> "<Nombre>"
 *
 * La contraseña se lee de CUSTOMER_PASSWORD o se genera y se muestra una vez (C-40: antes era una contraseña fija).
 */
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { normalizarCorreo } from '../lib/correo';

async function main() {
  const [correoArg, nombreArg] = process.argv.slice(2);
  const email = normalizarCorreo(correoArg);
  if (!email || !email.includes('@')) {
    console.error('Uso: npx tsx scripts/create-customer.ts <correo> "<Nombre>"');
    process.exitCode = 1;
    return;
  }
  const password = process.env.CUSTOMER_PASSWORD || `${randomBytes(9).toString('base64url')}Aa1!`;
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { password: hash, sessionVersion: { increment: 1 } },
    create: { email, name: nombreArg || 'Cliente de prueba', password: hash, role: 'USER' },
  });
  console.log(`[OK] Cliente listo: ${email}`);
  if (!process.env.CUSTOMER_PASSWORD) console.log(`[AVISO] Contraseña generada (se muestra una vez): ${password}`);
}

main()
  .catch((error) => { console.error('[ERROR]', error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
