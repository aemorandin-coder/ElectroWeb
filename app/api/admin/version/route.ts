import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { VERSION_BUILD } from '@/lib/version-build';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// C-168. La versión exacta del sistema (commit y hora del build) es solo para el equipo: sin sesión de admin, 401.

/** GET: la versión que corre en el servidor ahora y la última cuyas novedades vio este administrador. El panel la compara con la suya. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  // 403 y no 401: con 401 el panel cierra la sesión (C-140), y el admin sin dos pasos debe poder configurarlos
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const usuario = await prisma.user.findUnique({ where: { id: session.user.id }, select: { panelVersionVista: true } });
  return NextResponse.json({ ...VERSION_BUILD, visto: usuario?.panelVersionVista ?? null });
}

/** POST: el administrador cerró "Qué hay de nuevo". Se anota la versión del servidor, no una que mande el navegador. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  await prisma.user.update({ where: { id: session.user.id }, data: { panelVersionVista: VERSION_BUILD.version } });
  return NextResponse.json({ visto: VERSION_BUILD.version });
}
