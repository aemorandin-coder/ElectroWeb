import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { getNotificationSettings, invalidateNotificationSettings } from '@/lib/admin-events/settings';
import { callTelegram, TELEGRAM_TOKEN_PATTERN, TelegramApiError, webhookSecret, type TelegramBotInfo, type TelegramWebhookInfo } from '@/lib/telegram/api';
import { BOT_COMMANDS } from '@/lib/telegram/bot';
import { encryptToken, maskToken } from '@/lib/telegram/token';

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  if (!hasPermission(session, 'MANAGE_SETTINGS')) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  return { session };
}

/** URL pública del webhook. Telegram solo acepta HTTPS. */
function webhookUrl(): string | null {
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  return /^https:\/\/(?!localhost|127\.)/i.test(base) ? `${base}/api/webhooks/telegram` : null;
}

async function status() {
  invalidateNotificationSettings();
  const { row, botToken } = await getNotificationSettings();
  const chats = await prisma.telegramChat.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, type: true, isActive: true, lastSentAt: true, lastError: true, createdAt: true },
  });

  let webhook: { active: boolean; url: string | null; pendingUpdates: number; lastError: string | null } = {
    active: false, url: null, pendingUpdates: 0, lastError: null,
  };
  if (botToken && row?.telegramWebhookActive) {
    try {
      const info = await callTelegram<TelegramWebhookInfo>(botToken, 'getWebhookInfo');
      webhook = {
        active: Boolean(info.url),
        url: info.url || null,
        pendingUpdates: info.pending_update_count,
        lastError: info.last_error_message || null,
      };
    } catch (error) {
      webhook = { ...webhook, lastError: error instanceof Error ? error.message : 'No se pudo consultar' };
    }
  }

  return {
    connected: Boolean(botToken),
    // Había token guardado pero no se pudo descifrar (cambió NEXTAUTH_SECRET)
    tokenUnreadable: Boolean(row?.telegramBotToken && !botToken),
    tokenPreview: botToken ? maskToken(botToken) : null,
    bot: botToken && row ? { id: row.telegramBotId, username: row.telegramBotUsername, name: row.telegramBotName } : null,
    webhook,
    webhookPossible: Boolean(webhookUrl()),
    linkPending: row?.telegramLinkCodeExpiresAt && row.telegramLinkCodeExpiresAt > new Date() ? { expiresAt: row.telegramLinkCodeExpiresAt } : null,
    chats,
  };
}

/** GET /api/admin/telegram — estado del bot y chats conectados. Nunca devuelve el token. */
export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await status());
  } catch (error) {
    console.error('[ADMIN TELEGRAM] GET:', error);
    return NextResponse.json({ error: 'No se pudo leer el estado de Telegram' }, { status: 500 });
  }
}

/** PUT /api/admin/telegram { token } — conecta el bot: valida con getMe, guarda cifrado y registra el webhook. */
export async function PUT(request: NextRequest) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!TELEGRAM_TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: 'Ese no parece un token de bot. Cópialo completo desde @BotFather (números, dos puntos y letras).' }, { status: 400 });
  }

  let bot: TelegramBotInfo;
  try {
    bot = await callTelegram<TelegramBotInfo>(token, 'getMe');
  } catch (error) {
    const unauthorized = error instanceof TelegramApiError && (error.status === 401 || error.status === 404);
    return NextResponse.json(
      { error: unauthorized ? 'Telegram no reconoce ese token. Revisa que esté completo o genera uno nuevo en @BotFather.' : 'No se pudo hablar con Telegram. Intenta de nuevo en un momento.' },
      { status: unauthorized ? 400 : 502 }
    );
  }

  try {
    const current = await prisma.adminNotificationSettings.findUnique({ where: { id: 'default' }, select: { telegramBotId: true } });
    const botId = String(bot.id);
    // Otro bot: los chats conectados al anterior ya no sirven (el nuevo bot no puede escribirles)
    if (current?.telegramBotId && current.telegramBotId !== botId) {
      await prisma.telegramChat.deleteMany({});
    }

    const url = webhookUrl();
    let webhookActive = false;
    let warning: string | null = null;
    if (url) {
      try {
        await callTelegram(token, 'setWebhook', {
          url,
          secret_token: webhookSecret(botId),
          allowed_updates: ['message', 'my_chat_member'],
          drop_pending_updates: true,
        });
        webhookActive = true;
      } catch (error) {
        warning = `No se pudo registrar el webhook (${error instanceof Error ? error.message : 'error'}). Los chats se conectarán con el botón "Ya lo abrí".`;
      }
    } else {
      // Sin HTTPS público: getUpdates (necesita que no haya webhook viejo)
      await callTelegram(token, 'deleteWebhook', { drop_pending_updates: false }).catch(() => {});
    }
    await callTelegram(token, 'setMyCommands', { commands: BOT_COMMANDS }).catch(() => {});

    const data = {
      telegramBotToken: encryptToken(token),
      telegramBotId: botId,
      telegramBotUsername: bot.username,
      telegramBotName: bot.first_name,
      telegramWebhookActive: webhookActive,
      telegramUpdateOffset: 0,
    };
    await prisma.adminNotificationSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
    invalidateNotificationSettings();
    return NextResponse.json({ ...(await status()), warning });
  } catch (error) {
    console.error('[ADMIN TELEGRAM] PUT:', error);
    return NextResponse.json({ error: 'No se pudo guardar el bot' }, { status: 500 });
  }
}

/** DELETE /api/admin/telegram — desconecta el bot. Los chats se conservan por si se vuelve a conectar el mismo bot. */
export async function DELETE() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  try {
    const { botToken } = await getNotificationSettings();
    if (botToken) await callTelegram(botToken, 'deleteWebhook', { drop_pending_updates: true }).catch(() => {});
    await prisma.adminNotificationSettings.updateMany({
      where: { id: 'default' },
      data: {
        telegramBotToken: null, telegramWebhookActive: false, telegramUpdateOffset: 0,
        telegramLinkCodeHash: null, telegramLinkCodeExpiresAt: null,
      },
    });
    invalidateNotificationSettings();
    return NextResponse.json(await status());
  } catch (error) {
    console.error('[ADMIN TELEGRAM] DELETE:', error);
    return NextResponse.json({ error: 'No se pudo desconectar el bot' }, { status: 500 });
  }
}
