import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getNotificationSettings } from '@/lib/admin-events/settings';
import { webhookSecret, type TelegramUpdate } from '@/lib/telegram/api';
import { handleTelegramUpdate } from '@/lib/telegram/bot';

/**
 * POST /api/webhooks/telegram — Telegram entrega aquí los mensajes del bot (C-73).
 * Solo se acepta con el encabezado secreto que se registró en setWebhook; cualquier otra llamada da 401.
 * Siempre responde 200 a Telegram (aunque falle el proceso) para que no reintente en bucle.
 */
export async function POST(request: NextRequest) {
  const { row, botToken } = await getNotificationSettings();
  if (!row?.telegramBotId || !botToken) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const expected = Buffer.from(webhookSecret(row.telegramBotId));
  const received = Buffer.from(request.headers.get('x-telegram-bot-api-secret-token') || '');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!update || typeof update.update_id !== 'number') {
    return NextResponse.json({ ok: true });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error('[TELEGRAM WEBHOOK] Error:', error);
  }
  return NextResponse.json({ ok: true });
}
