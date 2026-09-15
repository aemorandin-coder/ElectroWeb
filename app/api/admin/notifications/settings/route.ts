import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ADMIN_EVENT_TYPES, isAdminEventType, resolveChannels, type ChannelSet } from '@/lib/admin-events/catalog';
import { getNotificationSettings, invalidateNotificationSettings } from '@/lib/admin-events/settings';

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!hasPermission(session, 'MANAGE_SETTINGS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  return null;
}

async function alertEmailCount(): Promise<number> {
  const row = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { adminAlertEmails: true } });
  if (!row?.adminAlertEmails) return 0;
  try {
    const parsed: unknown = JSON.parse(row.adminAlertEmails);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return row.adminAlertEmails.split(',').filter((email) => email.trim()).length;
  }
}

/** GET /api/admin/notifications/settings — qué evento llega por qué canal (C-73). */
export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  invalidateNotificationSettings();
  const { channels, botToken } = await getNotificationSettings();
  const activeChats = await prisma.telegramChat.count({ where: { isActive: true } });
  return NextResponse.json({ channels, emailRecipients: await alertEmailCount(), telegramReady: Boolean(botToken) && activeChats > 0 });
}

/** PUT /api/admin/notifications/settings { channels: { EVENT: { panel, email, telegram } } } — solo eventos del catálogo. */
export async function PUT(request: NextRequest) {
  const denied = await authorize();
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const incoming = body?.channels;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
  const { channels: current } = await getNotificationSettings();
  const next = { ...current };
  for (const [type, row] of Object.entries(incoming as Record<string, Partial<ChannelSet>>)) {
    if (!isAdminEventType(type) || !row || typeof row !== 'object') {
      return NextResponse.json({ error: `Evento desconocido: ${String(type).slice(0, 40)}` }, { status: 400 });
    }
    next[type] = {
      panel: typeof row.panel === 'boolean' ? row.panel : current[type].panel,
      email: typeof row.email === 'boolean' ? row.email : current[type].email,
      telegram: typeof row.telegram === 'boolean' ? row.telegram : current[type].telegram,
    };
  }
  const serialized = JSON.stringify(Object.fromEntries(ADMIN_EVENT_TYPES.map((type) => [type, next[type]])));
  await prisma.adminNotificationSettings.upsert({ where: { id: 'default' }, update: { channels: serialized }, create: { id: 'default', channels: serialized } });
  invalidateNotificationSettings();
  return NextResponse.json({ channels: resolveChannels(JSON.parse(serialized)) });
}
