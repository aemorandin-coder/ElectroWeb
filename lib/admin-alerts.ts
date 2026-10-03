/**
 * ELECTRO SHOP — CORREOS DE ALERTA AL EQUIPO
 * Canal "correo" de los avisos (lib/admin-events, C-73). Los destinatarios se configuran en
 * Configuración → Avisos y mantenimiento (campo adminAlertEmails).
 */

import { prisma } from '@/lib/prisma';
import { getBaseTemplate, sendEmail } from '@/lib/email-service';
import { escapeHtml } from '@/lib/html';
import { CORREO, COLOR, botonCorreo } from '@/lib/email-templates/estilo';

async function getAdminAlertEmails(): Promise<string[]> {
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
// Mismo marco que los correos de los clientes (C-175): antes era otra plantilla, sin logo.
async function buildAlertEmailHtml({
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
  const rows = lines
    .map(
      ({ label, value }) => `
      <tr>
        <td style="padding:10px 12px 10px 0;border-bottom:1px solid ${COLOR.linea};color:${COLOR.suave};font-size:14px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLOR.linea};color:${COLOR.tinta};font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join('');

  const contenido = `
    <p style="${CORREO.rotulo}color:${COLOR.marca};font-weight:700;">Aviso del panel</p>
    <h2 style="${CORREO.titulo}">${escapeHtml(title)}</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:1px solid ${COLOR.linea};margin-top:8px;">
      ${rows}
    </table>
    ${actionUrl ? botonCorreo(escapeHtml(actionUrl), escapeHtml(actionLabel || 'Abrir en el panel')) : ''}
    <p style="${CORREO.nota}text-align:center;">Mensaje automático para el equipo. Cambia qué avisos llegan por correo en el panel, en Notificaciones.</p>`;
  return getBaseTemplate(contenido, title);
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
