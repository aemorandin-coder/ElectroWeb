import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { getNotificationSettings } from '@/lib/admin-events/settings';
import { TelegramApiError } from '@/lib/telegram/api';
import { createLinkCode, pollTelegramUpdates } from '@/lib/telegram/bot';

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  if (!hasPermission(session, 'MANAGE_SETTINGS')) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  return { session };
}

/**
 * POST /api/admin/telegram/link — código de un solo uso (15 min) y enlaces para abrir el bot (C-73).
 * El código viaja solo en esta respuesta; en la base de datos queda su hash.
 */
export async function POST() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { row, botToken } = await getNotificationSettings();
  if (!botToken || !row?.telegramBotUsername) {
    return NextResponse.json({ error: 'Primero conecta el bot con su token' }, { status: 409 });
  }
  const { code, expiresAt } = await createLinkCode(auth.session.user.id);
  const bot = row.telegramBotUsername;
  return NextResponse.json({
    code,
    expiresAt,
    privateUrl: `https://t.me/${bot}?start=${code}`,
    groupUrl: `https://t.me/${bot}?startgroup=${code}`,
  });
}

/**
 * GET /api/admin/telegram/link — ¿ya se conectó el chat? Sin webhook, lee los mensajes pendientes del bot.
 * Devuelve el último chat conectado por este administrador desde que pidió el código.
 */
export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { row, botToken } = await getNotificationSettings();
  if (!botToken) return NextResponse.json({ error: 'Primero conecta el bot con su token' }, { status: 409 });

  if (!row?.telegramWebhookActive) {
    try {
      await pollTelegramUpdates();
    } catch (error) {
      const conflict = error instanceof TelegramApiError && error.status === 409;
      return NextResponse.json(
        { error: conflict ? 'El bot tiene un webhook activo en otro servidor. Vuelve a guardar el token aquí para tomarlo.' : 'No se pudo leer los mensajes del bot' },
        { status: 502 }
      );
    }
  }

  // Releer después de procesar los mensajes: si el /start llegó, el código ya se consumió
  const { row: fresh } = await getNotificationSettings();
  const since = new Date(Date.now() - 16 * 60_000);
  const chat = await prisma.telegramChat.findFirst({
    where: { linkedById: auth.session.user.id, updatedAt: { gte: since }, isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, type: true },
  });
  const pending = Boolean(fresh?.telegramLinkCodeHash && fresh.telegramLinkCodeExpiresAt && fresh.telegramLinkCodeExpiresAt > new Date());
  return NextResponse.json({ linked: pending ? null : chat, pending });
}
