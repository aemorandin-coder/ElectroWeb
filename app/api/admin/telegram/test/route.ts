import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { formatTelegramEvent } from '@/lib/admin-events';
import { getNotificationSettings } from '@/lib/admin-events/settings';
import { sendToTelegramChats } from '@/lib/telegram/service';

/** POST /api/admin/telegram/test { chatId? } — mensaje de prueba a un chat o a todos los activos (C-73). */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!hasPermission(session, 'MANAGE_SETTINGS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { botToken } = await getNotificationSettings();
  if (!botToken) return NextResponse.json({ error: 'Primero conecta el bot con su token' }, { status: 409 });

  const body = await request.json().catch(() => null);
  const chatDbId = typeof body?.chatId === 'string' ? body.chatId : undefined;
  if (chatDbId && !(await prisma.telegramChat.findUnique({ where: { id: chatDbId }, select: { id: true } }))) {
    return NextResponse.json({ error: 'Chat no encontrado' }, { status: 404 });
  }

  const html = formatTelegramEvent({
    type: 'ORDER_CREATED',
    title: 'Mensaje de prueba',
    summary: `${session.user.name || session.user.email} probó la conexión desde el panel. Así se ven los avisos.`,
    fields: [['Total', '$289,00 (ejemplo)'], ['Pago', 'Saldo · confirmado'], ['Entrega', 'Retiro en tienda']],
  });
  const deliveries = await sendToTelegramChats(html, {}, chatDbId);
  if (deliveries.length === 0) return NextResponse.json({ error: 'No hay chats activos. Conecta uno primero.' }, { status: 409 });
  const failed = deliveries.filter((delivery) => !delivery.ok);
  return NextResponse.json({ deliveries, ok: failed.length === 0 }, { status: failed.length === deliveries.length ? 502 : 200 });
}
