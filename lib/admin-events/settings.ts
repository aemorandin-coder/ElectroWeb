// Configuración de avisos y del bot, con caché corta por proceso (C-73). Solo servidor.
import type { AdminNotificationSettings } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/telegram/token';
import { resolveChannels, type ChannelMatrix } from './catalog';

const CACHE_MS = 15_000;

export interface LoadedNotificationSettings {
  row: AdminNotificationSettings | null;
  channels: ChannelMatrix;
  /** Token descifrado; null si no hay bot o no se pudo descifrar */
  botToken: string | null;
}

let cached: { value: LoadedNotificationSettings; expires: number } | null = null;

export async function getNotificationSettings(): Promise<LoadedNotificationSettings> {
  const now = Date.now();
  if (cached && cached.expires > now) return cached.value;
  const row = await prisma.adminNotificationSettings.findUnique({ where: { id: 'default' } });
  let saved: unknown = null;
  try {
    saved = row?.channels ? JSON.parse(row.channels) : null;
  } catch {
    saved = null;
  }
  const value = { row, channels: resolveChannels(saved), botToken: decryptToken(row?.telegramBotToken) };
  cached = { value, expires: now + CACHE_MS };
  return value;
}

/** Llamar después de guardar canales, token o chats. */
export function invalidateNotificationSettings(): void {
  cached = null;
}
