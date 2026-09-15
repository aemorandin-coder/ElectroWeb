import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!hasPermission(session, 'MANAGE_SETTINGS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  return null;
}

const select = { id: true, title: true, type: true, isActive: true, lastSentAt: true, lastError: true, createdAt: true } as const;

/** PATCH /api/admin/telegram/chats/:id { isActive?, title? } — pausar, reanudar o renombrar un chat (C-73). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorize();
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const data: { isActive?: boolean; title?: string; lastError?: null } = {};
  if (typeof body?.isActive === 'boolean') {
    data.isActive = body.isActive;
    if (body.isActive) data.lastError = null;
  }
  if (typeof body?.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 120);
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nada que cambiar' }, { status: 400 });

  const updated = await prisma.telegramChat.updateMany({ where: { id }, data });
  if (updated.count === 0) return NextResponse.json({ error: 'Chat no encontrado' }, { status: 404 });
  return NextResponse.json(await prisma.telegramChat.findUnique({ where: { id }, select }));
}

/** DELETE /api/admin/telegram/chats/:id — deja de enviar a ese chat. Para volver, se conecta con un código nuevo. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorize();
  if (denied) return denied;
  const { id } = await params;
  const deleted = await prisma.telegramChat.deleteMany({ where: { id } });
  if (deleted.count === 0) return NextResponse.json({ error: 'Chat no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
