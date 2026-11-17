import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

// C-276: una nota interna del equipo sobre un cliente (él nunca la ve). Guarda quién la escribió y cuándo.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (!checkRateLimit(session.user.id, 'admin:clientes:notas', { maxRequests: 30, windowSeconds: 60 }).success) {
    return NextResponse.json({ error: 'Muchas notas seguidas: espera un minuto.' }, { status: 429 });
  }
  const { id } = await params;
  const cliente = await prisma.user.findFirst({ where: { id, role: 'USER' }, select: { id: true } });
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { texto?: unknown } | null;
  const texto = typeof body?.texto === 'string' ? body.texto.trim() : '';
  if (texto.length < 2) return NextResponse.json({ error: 'Escribe la nota' }, { status: 400 });
  if (texto.length > 1000) return NextResponse.json({ error: 'La nota va hasta 1000 letras' }, { status: 400 });
  const autor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });
  const nota = await prisma.notaCliente.create({
    data: { clienteId: cliente.id, autorId: session.user.id, autorNombre: autor?.name?.trim() || autor?.email?.split('@')[0] || 'El equipo', texto },
    select: { id: true, texto: true, autorNombre: true, createdAt: true },
  });
  return NextResponse.json({ nota }, { status: 201 });
}
