/**
 * Crea (o promueve) un super administrador en la tabla de usuarios.
 *
 *   npx tsx scripts/create-master-admin.ts <correo> "<Nombre>"
 *
 * La contraseña se lee de ADMIN_PASSWORD (debe cumplir la regla del registro). Si no se pasa, se genera una
 * aleatoria y se muestra UNA vez. Si el correo ya existe, pide --reset para cambiarle la contraseña.
 *
 * C-40: la versión anterior tenía la contraseña escrita en el código (y el repositorio es público) y usaba el
 * modelo AdminUser, que ya no existe.
 */
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { normalizarCorreo } from '../lib/correo';
import { contrasenaSchema } from '../lib/validations/registro';

async function main() {
  const [correoArg, nombreArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const reset = process.argv.includes('--reset');
  const email = normalizarCorreo(correoArg);
  if (!email || !email.includes('@')) {
    console.error('Uso: npx tsx scripts/create-master-admin.ts <correo> "<Nombre>" [--reset]');
    process.exitCode = 1;
    return;
  }
  const generada = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || `${randomBytes(9).toString('base64url')}Aa1!`;
  const regla = contrasenaSchema.safeParse(password);
  if (!regla.success) {
    console.error(`La contraseña no cumple la regla: ${regla.error.issues[0]?.message}`);
    process.exitCode = 1;
    return;
  }

  const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existente && !reset) {
    await prisma.user.update({ where: { id: existente.id }, data: { role: 'SUPER_ADMIN' } });
    console.log(`[OK] ${email} ya existía: ahora es super admin. La contraseña no se cambió (usa --reset para cambiarla).`);
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    // Cambiar la contraseña cierra las sesiones abiertas de esa cuenta
    update: { password: hash, role: 'SUPER_ADMIN', sessionVersion: { increment: 1 } },
    create: { email, name: nombreArg || 'Administrador', password: hash, role: 'SUPER_ADMIN', emailVerified: new Date() },
  });
  console.log(`[OK] Super admin listo: ${email}`);
  if (generada) console.log(`[AVISO] Contraseña generada (cópiala ahora, no se vuelve a mostrar): ${password}`);
}

main()
  .catch((error) => { console.error('[ERROR]', error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
