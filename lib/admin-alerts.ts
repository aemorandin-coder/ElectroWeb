/**
 * ELECTRO SHOP — CORREOS DE ALERTA AL EQUIPO
 * Canal "correo" de los avisos (lib/admin-events, C-73). Los destinatarios se configuran en
 * Configuración → Avisos y mantenimiento (campo adminAlertEmails).
 */

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { escapeHtml } from '@/lib/html';
import { botonCorreo, datosCorreo } from '@/lib/email-templates/estilo';
import { marcoCorreo } from '@/lib/email-templates/marco';

/** La lista de Configuración → Avisos y mantenimiento. C-227: también la usa la copia de los despachos al equipo */
export async function getAdminAlertEmails(): Promise<string[]> {
  try {
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
      select: { adminAlertEmails: true, companyName: true },
    });
    const raw = settings?.adminAlertEmails;
    if (!raw) return [];
    // Puede ser JSON array o string separado por comas (formato viejo)
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((email): email is string => typeof email === 'string' && email.length > 0) : [];
    } catch {
      return raw.split(',').map((email) => email.trim()).filter(Boolean);
    }
  } catch (error) {
    console.error('[ADMIN-ALERTS] Error getting admin alert emails:', error);
    return [];
  }
}

// Los valores vienen de clientes (nombres, referencias) o del catálogo: se escapan antes de ir al HTML.
// C-219: el mismo marco de los correos de los clientes, con el pie del equipo (sin el cierre "sin miedo").
/** El HTML del aviso (también lo usa la vista previa del panel, C-219). */
export async function buildAlertEmailHtml({
  title,
  lines,
  actionUrl,
  actionLabel,
}: {
  title: string;
  lines: { label: string; value: string }[];
  actionUrl?: string;
  actionLabel?: string;
}): Promise<string> {
  return marcoCorreo({
    preheader: title,
    encabezado: { sello: 'AVISO DEL PANEL', titulo: escapeHtml(title) },
    cuerpo: `
      ${datosCorreo(lines.map(({ label, value }) => [escapeHtml(label), escapeHtml(value)]))}
      ${actionUrl ? botonCorreo(escapeHtml(actionUrl), escapeHtml(actionLabel || 'Abrir en el panel')) : ''}`,
    pie: 'equipo',
    motivo: 'Recibes este correo porque estás en la lista de avisos del panel (Ajustes → Avisos y mantenimiento).',
  });
}

/** Envía un aviso a la lista de correos de alerta. Devuelve false si no hay lista o falló el envío. */
export async function sendAdminEventEmail({
  subject,
  title,
  lines,
  actionUrl,
}: {
  subject: string;
  title: string;
  lines: { label: string; value: string }[];
  actionUrl?: string;
}): Promise<boolean> {
  const emails = await getAdminAlertEmails();
  if (emails.length === 0) return false;
  const result = await sendEmail({
    to: emails,
    subject: subject.slice(0, 150),
    html: await buildAlertEmailHtml({ title, lines, actionUrl }),
  }).catch((error) => {
    console.error('[ADMIN-ALERTS] Error sending alert:', error);
    return { success: false };
  });
  return Boolean(result?.success);
}
