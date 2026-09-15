// Cliente mínimo de la API de bots de Telegram (C-73). Solo servidor.
import crypto from 'crypto';

// TELEGRAM_API_BASE solo existe para las pruebas (un servidor falso); en producción no se define
const API_BASE = (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');
const TIMEOUT_MS = 8000;

export const TELEGRAM_TOKEN_PATTERN = /^\d{5,15}:[A-Za-z0-9_-]{30,60}$/;

export class TelegramApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: number,
    readonly migrateToChatId?: number
  ) {
    super(message);
  }
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number; migrate_to_chat_id?: number };
}

export async function callTelegram<T>(token: string, method: string, payload: Record<string, unknown> = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    // El mensaje de fetch nunca incluye la URL (que lleva el token)
    throw new TelegramApiError(error instanceof Error && error.name === 'TimeoutError' ? 'Telegram no respondió a tiempo' : 'No hay conexión con Telegram', 0);
  }
  const data = (await response.json().catch(() => null)) as TelegramResponse<T> | null;
  if (!data?.ok) {
    throw new TelegramApiError(
      data?.description || `Telegram respondió ${response.status}`,
      data?.error_code || response.status,
      data?.parameters?.retry_after,
      data?.parameters?.migrate_to_chat_id
    );
  }
  return data.result as T;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export interface TelegramWebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_message?: string;
  last_error_date?: number;
}

export interface TelegramChatInfo {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChatInfo;
  from?: { id: number; is_bot: boolean; first_name?: string; last_name?: string; username?: string };
  text?: string;
  date: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: {
    chat: TelegramChatInfo;
    new_chat_member: { status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked' };
  };
}

/** Clave del encabezado X-Telegram-Bot-Api-Secret-Token: derivada, no hace falta guardarla. */
export function webhookSecret(botId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || '';
  return crypto.createHmac('sha256', secret).update(`telegram-webhook:${botId}`).digest('hex');
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
