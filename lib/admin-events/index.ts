// Avisos al equipo (C-73): un solo punto de entrada para panel, correo y Telegram. Solo servidor.
//
//   emitAdminEvent({ type: 'ORDER_CREATED', title: 'Nueva venta · ORD-2026-0012', summary: '…', fields: [['Total', '$289,00']], link: '/admin/orders' })
//
// Nunca lanza errores ni bloquea la respuesta: una caída de Telegram o del correo no puede romper una venta.
import { prisma } from '@/lib/prisma';
import { sendAdminEventEmail } from '@/lib/admin-alerts';
import { escapeHtml } from '@/lib/telegram/api';
import { sendToTelegramChats, type ChatDelivery } from '@/lib/telegram/service';
import { ADMIN_EVENTS, CATEGORY_LABELS, type AdminEventDefinition, type AdminEventType } from './catalog';
import { getNotificationSettings } from './settings';

export interface AdminEventInput {
  type: AdminEventType;
  /** Título corto con la referencia: "Nueva venta · ORD-2026-0012" */
  title: string;
  /** Una frase con lo que pasó: "María González compró 2 productos" */
  summary: string;
  /** Datos clave en orden: [["Total", "$289,00"], ["Pago", "Saldo"]] */
  fields?: [string, string | number | null | undefined][];
  /** Ruta del panel: "/admin/orders" */
  link?: string;
  /** Evita repetir el mismo aviso: se ignora si ya salió uno con esta clave dentro de `throttleMs` */
  throttleKey?: string;
  throttleMs?: number;
}

export interface DeliveryReport {
  skipped?: 'throttled';
  panel: number;
  email: boolean;
  telegram: ChatDelivery[];
}

const recent = new Map<string, number>();
const CLEANUP_EVERY_MS = 24 * 60 * 60_000;
let lastCleanup = 0;

/** Las leídas de más de 60 días se borran (una vez al día por proceso): antes la tabla crecía sin límite. */
function cleanupOldNotifications() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_EVERY_MS) return;
  lastCleanup = now;
  prisma.notification
    .deleteMany({ where: { read: true, createdAt: { lt: new Date(now - 60 * 24 * 60 * 60_000) } } })
    .catch((error) => console.error('[ADMIN-EVENTS] limpieza:', error));
}
const dateFormat = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', dateStyle: 'medium', timeStyle: 'short' });

function cleanFields(fields: AdminEventInput['fields']): [string, string][] {
  return (fields ?? [])
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([label, value]) => [label, String(value)]);
}

/** Mensaje de Telegram en HTML (todo el texto variable escapado). */
export function formatTelegramEvent(input: AdminEventInput, when = new Date()): string {
  const definition: AdminEventDefinition = ADMIN_EVENTS[input.type];
  const lines = [
    `<b>${escapeHtml(CATEGORY_LABELS[definition.category].toUpperCase())}</b>`,
    `<b>${escapeHtml(input.title)}</b>`,
    escapeHtml(input.summary),
  ];
  const fields = cleanFields(input.fields);
  if (fields.length > 0) {
    lines.push('');
    for (const [label, value] of fields) lines.push(`${escapeHtml(label)}: <b>${escapeHtml(value)}</b>`);
  }
  lines.push('', `<i>${escapeHtml(dateFormat.format(when))}</i>`);
  return lines.join('\n');
}

export async function notifyAdmins(input: AdminEventInput): Promise<DeliveryReport> {
  const report: DeliveryReport = { panel: 0, email: false, telegram: [] };
  if (input.throttleKey) {
    const key = `${input.type}:${input.throttleKey}`;
    const last = recent.get(key);
    const now = Date.now();
    if (last && now - last < (input.throttleMs ?? 10 * 60_000)) return { ...report, skipped: 'throttled' };
    recent.set(key, now);
    if (recent.size > 500) recent.clear();
  }

  cleanupOldNotifications();
  const definition: AdminEventDefinition = ADMIN_EVENTS[input.type];
  const { channels } = await getNotificationSettings();
  const channel = channels[input.type];
  const fields = cleanFields(input.fields);
  const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const absoluteLink = input.link && baseUrl ? `${baseUrl}${input.link}` : undefined;

  const tasks: Promise<void>[] = [];

  if (channel.panel) {
    tasks.push(
      (async () => {
        const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } });
        const detail = fields.slice(0, 3).map(([label, value]) => `${label}: ${value}`).join(' · ');
        const message = [input.summary, detail].filter(Boolean).join(' · ').slice(0, 500);
        const created = await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: input.type,
            title: input.title.slice(0, 150),
            message,
            link: input.link ?? null,
            icon: definition.category,
          })),
        });
        report.panel = created.count;
      })()
    );
  }

  if (channel.email) {
    tasks.push(
      sendAdminEventEmail({
        subject: input.title,
        title: definition.label,
        lines: [{ label: 'Detalle', value: input.summary }, ...fields.map(([label, value]) => ({ label, value }))],
        actionUrl: absoluteLink,
      }).then((sent) => {
        report.email = sent;
      })
    );
  }

  if (channel.telegram) {
    tasks.push(
      sendToTelegramChats(formatTelegramEvent(input), {
        silent: definition.silent,
        button: absoluteLink ? { text: 'Abrir en el panel', url: absoluteLink } : undefined,
      }).then((deliveries) => {
        report.telegram = deliveries;
      })
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === 'rejected') console.error(`[ADMIN-EVENTS] ${input.type}:`, result.reason);
  }
  return report;
}

/** Sin await: para usar dentro de las rutas después de guardar. */
export function emitAdminEvent(input: AdminEventInput): void {
  notifyAdmins(input).catch((error) => console.error(`[ADMIN-EVENTS] ${input.type}:`, error));
}
