/**
 * Emergencia (C-141): reinicia la verificación en dos pasos de una cuenta del equipo.
 *
 *   npx tsx scripts/reset-dos-pasos.ts <correo>
 *
 * Para cuando el dueño pierde el teléfono Y los códigos de respaldo y no hay otro super admin que lo reinicie
 * desde Equipo. Se corre en el servidor (quien puede correrlo ya tiene acceso a la base).
 * Borra su app de códigos y sus códigos de respaldo y cierra sus sesiones: al volver a entrar con su correo y
 * su contraseña, el panel le pide configurar los dos pasos otra vez. No cambia la contraseña ni el rol.
 */
import { prisma } from '../lib/prisma';
import { normalizarCorreo } from '../lib/correo';

async function main() {
  const correo = normalizarCorreo(process.argv[2]);
  if (!correo || !correo.includes('@')) {
    console.error('Uso: npx tsx scripts/reset-dos-pasos.ts <correo>');
    process.exitCode = 1;
    return;
  }
  const usuario = await prisma.user.findUnique({ where: { email: correo }, select: { id: true, role: true, segundoFactor: { select: { activadoAt: true } } } });
  if (!usuario || (usuario.role !== 'ADMIN' && usuario.role !== 'SUPER_ADMIN')) {
    console.error(`[ERROR] ${correo} no es una cuenta del equipo.`);
    process.exitCode = 1;
    return;
  }
  const [borrados, , sesiones] = await prisma.$transaction([
    prisma.segundoFactor.deleteMany({ where: { userId: usuario.id } }),
    prisma.user.update({ where: { id: usuario.id }, data: { sessionVersion: { increment: 1 } } }),
    prisma.userSession.updateMany({ where: { userId: usuario.id, revokedAt: null }, data: { revokedAt: new Date(), motivoCierre: 'CERRADA' } }),
    prisma.auditLog.create({
      data: {
        action: 'SECURITY_ADMIN_ACTION',
        userEmail: correo,
        targetType: 'USER',
        targetId: usuario.id,
        details: JSON.stringify({ accion: 'Verificación en dos pasos reiniciada con el guion de emergencia (scripts/reset-dos-pasos.ts)' }),
        ipAddress: 'servidor',
        severity: 'CRITICAL',
      },
    }),
  ]);
  console.log(borrados.count > 0 ? `[OK] Dos pasos reiniciados para ${correo}.` : `[OK] ${correo} no tenía los dos pasos configurados.`);
  console.log(`[OK] Sesiones cerradas: ${sesiones.count}.`);
  console.log('[AVISO] Entra ahora al panel con tu correo y tu contraseña y configura los dos pasos de inmediato:');
  console.log('        hasta que lo hagas, quien tenga la contraseña puede registrar su propia app de códigos.');
}

main()
  .catch((error) => { console.error('[ERROR]', error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
