// Bot de Telegram (C-73): conectar chats con un código del panel y responder comandos. Solo servidor.
// Solo los chats conectados reciben datos de la tienda; a los demás el bot no les cuenta nada.
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { formatUSD, formatVES } from '@/lib/currency';
import { getNotificationSettings, invalidateNotificationSettings } from '@/lib/admin-events/settings';
import { callTelegram, escapeHtml, type TelegramChatInfo, type TelegramMessage, type TelegramUpdate } from './api';
import { sendTelegramMessage } from './service';

const LINK_CODE_TTL_MS = 15 * 60_000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');
const timeFormat = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', dateStyle: 'medium', timeStyle: 'short' });

export const BOT_COMMANDS = [
  { command: 'resumen', description: 'Ventas, clientes y recargas de hoy' },
  { command: 'pendientes', description: 'Lo que espera por el equipo' },
  { command: 'tasa', description: 'Tasa BCV que usa la tienda' },
  { command: 'pausar', description: 'Dejar de recibir avisos en este chat' },
  { command: 'reanudar', description: 'Volver a recibir avisos' },
  { command: 'ayuda', description: 'Qué puede hacer este bot' },
];

/** Código de un solo uso para conectar un chat. Reemplaza al anterior. */
export async function createLinkCode(adminId: string): Promise<{ code: string; expiresAt: Date }> {
  const bytes = crypto.randomBytes(12);
  const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
  await prisma.adminNotificationSettings.upsert({
    where: { id: 'default' },
    update: { telegramLinkCodeHash: hashCode(code), telegramLinkCodeExpiresAt: expiresAt, telegramLinkCreatedById: adminId },
    create: { id: 'default', telegramLinkCodeHash: hashCode(code), telegramLinkCodeExpiresAt: expiresAt, telegramLinkCreatedById: adminId },
  });
  invalidateNotificationSettings();
  return { code, expiresAt };
}

function chatTitle(chat: TelegramChatInfo, message?: TelegramMessage): string {
  if (chat.type !== 'private') return (chat.title || 'Grupo sin nombre').slice(0, 120);
  const from = message?.from;
  const name = [chat.first_name ?? from?.first_name, chat.last_name ?? from?.last_name].filter(Boolean).join(' ') || 'Chat privado';
  const username = chat.username ?? from?.username;
  return `${name}${username ? ` (@${username})` : ''}`.slice(0, 120);
}

const caracasDayStart = (date = new Date()) => {
  const day = date.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  // Venezuela no cambia de hora: UTC-4 todo el año
  return new Date(`${day}T00:00:00-04:00`);
};

async function summaryText(companyName: string): Promise<string> {
  const since = caracasDayStart();
  const paidStatuses = ['PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED'] as const;
  const [orders, paid, customers, recharges] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } }, _count: true, _sum: { totalUSD: true } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: since }, OR: [{ paymentStatus: 'PAID' }, { status: { in: [...paidStatuses] } }] },
      _count: true,
      _sum: { totalUSD: true },
    }),
    prisma.user.count({ where: { role: 'USER', createdAt: { gte: since } } }),
    prisma.transaction.aggregate({ where: { type: 'RECHARGE', status: 'COMPLETED', updatedAt: { gte: since } }, _count: true, _sum: { amount: true } }),
  ]);
  return [
    `<b>Resumen de hoy · ${escapeHtml(companyName)}</b>`,
    '',
    `Órdenes: <b>${orders._count}</b> por ${escapeHtml(formatUSD(Number(orders._sum.totalUSD ?? 0)))}`,
    `Pagadas: <b>${paid._count}</b> por ${escapeHtml(formatUSD(Number(paid._sum.totalUSD ?? 0)))}`,
    `Clientes nuevos: <b>${customers}</b>`,
    `Recargas aprobadas: <b>${recharges._count}</b> por ${escapeHtml(formatUSD(Number(recharges._sum.amount ?? 0)))}`,
    '',
    `<i>Desde las 12:00 a. m. (hora de Venezuela)</i>`,
  ].join('\n');
}

async function pendingText(): Promise<string> {
  const [orders, recharges, messages, productRequests, discounts, creators, reviews, businesses, courses] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.transaction.count({ where: { type: 'RECHARGE', status: 'PENDING' } }),
    prisma.contactMessage.count({ where: { status: 'PENDING' } }),
    prisma.productRequest.count({ where: { status: 'PENDING' } }),
    prisma.discountRequest.count({ where: { status: 'PENDING' } }),
    prisma.courseCreator.count({ where: { status: 'PENDING' } }),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.profile.count({ where: { businessVerificationStatus: 'PENDING' } }),
    prisma.course.count({ where: { isActive: false, creatorId: { not: null } } }),
  ]);
  const rows: [string, number][] = [
    ['Órdenes por confirmar', orders],
    ['Recargas por aprobar', recharges],
    ['Mensajes de contacto', messages],
    ['Solicitudes de producto', productRequests],
    ['Solicitudes de descuento', discounts],
    ['Solicitudes de creador', creators],
    ['Cursos por revisar', courses],
    ['Reseñas por aprobar', reviews],
    ['Empresas por verificar', businesses],
  ];
  const pending = rows.filter(([, count]) => count > 0);
  if (pending.length === 0) return '<b>Pendientes</b>\n\nNo hay nada esperando. Todo al día.';
  return ['<b>Pendientes</b>', '', ...pending.map(([label, count]) => `${escapeHtml(label)}: <b>${count}</b>`)].join('\n');
}

async function rateText(): Promise<string> {
  const settings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { exchangeRateVES: true, lastRateUpdate: true, autoExchangeRates: true },
  });
  const rate = settings?.exchangeRateVES ? Number(settings.exchangeRateVES) : 0;
  if (!rate) return 'La tienda aún no tiene tasa configurada.';
  return [
    `<b>Tasa BCV de la tienda</b>`,
    '',
    `1 dólar = <b>${escapeHtml(formatVES(rate))}</b>`,
    `Modo: ${settings?.autoExchangeRates ? 'automático (cada hora)' : 'manual'}`,
    settings?.lastRateUpdate ? `Último cambio: ${escapeHtml(timeFormat.format(settings.lastRateUpdate))}` : null,
  ].filter((line) => line !== null).join('\n');
}

const HELP_TEXT = [
  '<b>Comandos</b>',
  '',
  ...BOT_COMMANDS.map(({ command, description }) => `/${command} — ${escapeHtml(description)}`),
  '',
  'Qué avisos llegan aquí se elige en el panel → Notificaciones → Qué avisar.',
].join('\n');

/** Procesa un update de Telegram (webhook o getUpdates). */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const { botToken, row } = await getNotificationSettings();
  if (!botToken || !row) return;

  // El bot salió de un grupo o la persona lo bloqueó
  if (update.my_chat_member) {
    const status = update.my_chat_member.new_chat_member.status;
    if (status === 'left' || status === 'kicked') {
      await prisma.telegramChat.updateMany({
        where: { chatId: String(update.my_chat_member.chat.id) },
        data: { isActive: false, lastError: status === 'kicked' ? 'El bot fue bloqueado o expulsado' : 'El bot salió del grupo' },
      });
    }
    return;
  }

  const message = update.message;
  const text = message?.text?.trim();
  if (!message || !text || !text.startsWith('/')) return;

  // "/pendientes@ElectroShopBot argumento": se ignora si el comando es para otro bot del grupo
  const match = /^\/([a-z_]+)(?:@(\w+))?(?:\s+(.+))?$/i.exec(text);
  if (!match) return;
  const [, rawCommand, mention, argument] = match;
  if (mention && row.telegramBotUsername && mention.toLowerCase() !== row.telegramBotUsername.toLowerCase()) return;
  const command = rawCommand.toLowerCase();
  const chatId = String(message.chat.id);
  const reply = (html: string) => sendTelegramMessage(botToken, chatId, html).catch((error) => console.error('[TELEGRAM] reply:', error));

  const linked = await prisma.telegramChat.findUnique({ where: { chatId } });

  if (command === 'start') {
    const code = argument?.trim();
    const valid =
      code &&
      row.telegramLinkCodeHash &&
      row.telegramLinkCodeExpiresAt &&
      row.telegramLinkCodeExpiresAt > new Date() &&
      crypto.timingSafeEqual(Buffer.from(hashCode(code)), Buffer.from(row.telegramLinkCodeHash));
    if (valid) {
      // Consumir el código antes de conectar: dos /start con el mismo código no conectan dos veces
      const consumed = await prisma.adminNotificationSettings.updateMany({
        where: { id: 'default', telegramLinkCodeHash: row.telegramLinkCodeHash },
        data: { telegramLinkCodeHash: null, telegramLinkCodeExpiresAt: null },
      });
      invalidateNotificationSettings();
      if (consumed.count === 1) {
        const title = chatTitle(message.chat, message);
        await prisma.telegramChat.upsert({
          where: { chatId },
          update: { title, type: message.chat.type, isActive: true, lastError: null, linkedById: row.telegramLinkCreatedById },
          create: { chatId, title, type: message.chat.type, linkedById: row.telegramLinkCreatedById },
        });
        const company = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { companyName: true } });
        await reply([
          `<b>Conectado a ${escapeHtml(company?.companyName || 'Electro Shop')}</b>`,
          '',
          'Desde ahora este chat recibe los avisos del panel: ventas, recargas, solicitudes y más.',
          '',
          HELP_TEXT,
        ].join('\n'));
        return;
      }
    }
    if (linked) {
      await reply('Este chat ya está conectado.\n\n' + HELP_TEXT);
    } else if (message.chat.type === 'private') {
      await reply(code ? 'Ese código venció o ya se usó. Genera uno nuevo en el panel → Notificaciones → Telegram.' : 'Este bot es privado. Para conectarlo, entra al panel → Notificaciones → Telegram.');
    }
    return;
  }

  // El resto de comandos solo para chats conectados
  if (!linked) {
    if (message.chat.type === 'private') await reply('Este bot es privado. Para conectarlo, entra al panel → Notificaciones → Telegram.');
    return;
  }

  switch (command) {
    case 'resumen': {
      const company = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { companyName: true } });
      await reply(await summaryText(company?.companyName || 'Electro Shop'));
      break;
    }
    case 'pendientes':
      await reply(await pendingText());
      break;
    case 'tasa':
      await reply(await rateText());
      break;
    case 'pausar':
      await prisma.telegramChat.update({ where: { id: linked.id }, data: { isActive: false } });
      await reply('Avisos pausados en este chat. Escribe /reanudar para volver a recibirlos.');
      break;
    case 'reanudar':
      await prisma.telegramChat.update({ where: { id: linked.id }, data: { isActive: true, lastError: null } });
      await reply('Avisos reanudados.');
      break;
    case 'ayuda':
    case 'help':
      await reply(HELP_TEXT);
      break;
    default:
      await reply('No conozco ese comando.\n\n' + HELP_TEXT);
  }
}

/**
 * Sin webhook (servidor sin HTTPS público), los mensajes se leen con getUpdates cuando el panel lo pide.
 * Devuelve cuántos updates se procesaron.
 */
export async function pollTelegramUpdates(): Promise<number> {
  const { botToken, row } = await getNotificationSettings();
  if (!botToken || !row || row.telegramWebhookActive) return 0;
  const updates = await callTelegram<TelegramUpdate[]>(botToken, 'getUpdates', {
    offset: row.telegramUpdateOffset || undefined,
    timeout: 0,
    allowed_updates: ['message', 'my_chat_member'],
  });
  for (const update of updates) {
    await handleTelegramUpdate(update).catch((error) => console.error('[TELEGRAM] update:', error));
  }
  if (updates.length > 0) {
    await prisma.adminNotificationSettings.update({
      where: { id: 'default' },
      data: { telegramUpdateOffset: updates[updates.length - 1].update_id + 1 },
    });
    invalidateNotificationSettings();
  }
  return updates.length;
}
