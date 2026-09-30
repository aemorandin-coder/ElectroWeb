import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { cerrarLasDemas, cerrarSesion, sesionesAbiertas } from '@/lib/sesiones';

// Sesiones abiertas del cliente (C-140): Mi perfil → Seguridad. Sin IP en la respuesta.

async function quien(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return { userId: session.user.id, sid: typeof token?.sid === 'string' ? token.sid : undefined };
}

export async function GET(request: NextRequest) {
  const yo = await quien(request);
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const sesiones = await sesionesAbiertas(yo.userId);
  return NextResponse.json({
    // Sin sid es una sesión de antes de C-140: no aparece en la lista, "Cerrar las demás" la conserva igual
    actualConNombre: Boolean(yo.sid),
    sesiones: sesiones.map((s) => ({ ...s, actual: s.id === yo.sid })),
  });
}

export async function DELETE(request: NextRequest) {
  const yo = await quien(request);
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!/^[a-z0-9]{10,40}$/.test(id)) return NextResponse.json({ error: 'Sesión inválida' }, { status: 400 });
  if (!(await cerrarSesion(yo.userId, id))) {
    return NextResponse.json({ error: 'Esa sesión ya estaba cerrada' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, actual: id === yo.sid });
}

const postSchema = z.object({ accion: z.literal('cerrar_otras') });

export async function POST(request: NextRequest) {
  const yo = await quien(request);
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!postSchema.safeParse(await request.json().catch(() => null)).success) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }
  await cerrarLasDemas(yo.userId, yo.sid);
  // Sin sid (sesión de antes de C-140) también cae la actual: el navegador vuelve al login
  return NextResponse.json({ ok: true, actualCerrada: !yo.sid });
}
