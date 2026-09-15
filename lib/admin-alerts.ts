/**
 * ELECTRO SHOP — CORREOS DE ALERTA AL EQUIPO
 * Canal "correo" de los avisos (lib/admin-events, C-73). Los destinatarios se configuran en
 * Configuración → Avisos y mantenimiento (campo adminAlertEmails).
 */

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';

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

// Los valores vienen de clientes (nombres, referencias) o del catálogo: se escapan antes de ir al HTML
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildAlertEmailHtml({
  title,
  lines,
  actionUrl,
  actionLabel,
  companyName = 'Electro Shop',
}: {
  title: string;
  lines: { label: string; value: string }[];
  actionUrl?: string;
  actionLabel?: string;
  companyName?: string;
}): string {
  const rows = lines
    .map(
      ({ label, value }) => `
      <tr>
        <td style="padding:8px 0;color:#6a6c6b;font-size:14px;width:40%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:8px 0;color:#212529;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join('');

  const actionBtn = actionUrl
    ? `<div style="text-align:center;margin-top:28px;">
        <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2a63cd;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">${escapeHtml(actionLabel || 'Abrir en el panel')}</a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(42,99,205,0.10);">
    <div style="background:#2a63cd;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${escapeHtml(title)}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${escapeHtml(companyName)} · Aviso del panel</p>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e9ecef;">
        ${rows}
      </table>
      ${actionBtn}
    </div>
    <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e9ecef;">
      <p style="margin:0;color:#6a6c6b;font-size:12px;">Mensaje automático de ${escapeHtml(companyName)}. Cambia qué avisos llegan por correo en el panel → Notificaciones.</p>
    </div>
  </div>
</body>
</html>`;
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
  const settings = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { companyName: true } }).catch(() => null);
  const result = await sendEmail({
    to: emails,
    subject: subject.slice(0, 150),
    html: buildAlertEmailHtml({ title, lines, actionUrl, companyName: settings?.companyName || 'Electro Shop' }),
  }).catch((error) => {
    console.error('[ADMIN-ALERTS] Error sending alert:', error);
    return { success: false };
  });
  return Boolean(result?.success);
}
