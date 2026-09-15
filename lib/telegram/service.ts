// Envío de mensajes a los chats conectados (C-73). Solo servidor.
import { prisma } from '@/lib/prisma';
import { getNotificationSettings } from '@/lib/admin-events/settings';
import { callTelegram, TelegramApiError } from './api';

export const TELEGRAM_MESSAGE_LIMIT = 4096;

export interface SendOptions {
  silent?: boolean;
  button?: { text: string; url: string };
}

/** Un solo mensaje. Si Telegram movió el grupo a supergrupo, reintenta con el id nuevo y lo guarda. */
export async function sendTelegramMessage(token: string, chatId: string, html: string, options: SendOptions = {}): Promise<void> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: html.length > TELEGRAM_MESSAGE_LIMIT ? `${html.slice(0, TELEGRAM_MESSAGE_LIMIT - 20)}…` : html,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    disable_notification: Boolean(options.silent),
  };
  // Telegram rechaza botones con enlaces a localhost o http: solo se agregan con https público
  if (options.button && /^https:\/\/(?!localhost|127\.)/i.test(options.button.url)) {
    payload.reply_markup = { inline_keyboard: [[{ text: options.button.text, url: options.button.url }]] };
  }
  try {
    await callTelegram(token, 'sendMessage', payload);
  } catch (error) {
    if (error instanceof TelegramApiError && error.migrateToChatId) {
      const newId = String(error.migrateToChatId);
      await prisma.telegramChat.updateMany({ where: { chatId }, data: { chatId: newId } });
      await callTelegram(token, 'sendMessage', { ...payload, chat_id: newId });
      return;
    }
    throw error;
  }
}

/** Errores de Telegram en palabras del panel (llegan en inglés). */
export function describeTelegramError(error: unknown): string {
  const raw = error instanceof Error ? error.message : '';
  if (/blocked by the user/i.test(raw)) return 'La persona bloqueó al bot. Pídele que lo desbloquee y reanuda el chat.';
  if (/kicked|not a member|bot was removed/i.test(raw)) return 'Sacaron al bot del grupo. Agrégalo otra vez y reanuda el chat.';
  if (/chat not found/i.test(raw)) return 'Telegram no encuentra este chat. Quítalo y conéctalo de nuevo.';
  if (/Too Many Requests/i.test(raw)) return 'Telegram pidió esperar por exceso de mensajes. Se reintenta con el próximo aviso.';
  return (raw || 'Error desconocido').slice(0, 300);
}

export interface ChatDelivery {
  chatId: string;
  title: string;
  ok: boolean;
  error?: string;
}

/**
 * Envía a todos los chats activos (o a uno). Registra la última entrega o el error en cada chat.
 * Un chat que bloqueó al bot o del que lo sacaron (403) queda pausado para no insistir.
 */
export async function sendToTelegramChats(html: string, options: SendOptions = {}, onlyChatDbId?: string): Promise<ChatDelivery[]> {
  const { botToken } = await getNotificationSettings();
  if (!botToken) return [];
  const chats = await prisma.telegramChat.findMany({
    where: onlyChatDbId ? { id: onlyChatDbId } : { isActive: true },
    select: { id: true, chatId: true, title: true },
  });

  return Promise.all(
    chats.map(async (chat): Promise<ChatDelivery> => {
      try {
        await sendTelegramMessage(botToken, chat.chatId, html, options);
        await prisma.telegramChat.update({ where: { id: chat.id }, data: { lastSentAt: new Date(), lastError: null } });
        return { chatId: chat.chatId, title: chat.title, ok: true };
      } catch (error) {
        const message = describeTelegramError(error);
        const blocked = error instanceof TelegramApiError && error.status === 403;
        await prisma.telegramChat
          .update({ where: { id: chat.id }, data: { lastError: message, ...(blocked ? { isActive: false } : {}) } })
          .catch(() => {});
        return { chatId: chat.chatId, title: chat.title, ok: false, error: message };
      }
    })
  );
}
