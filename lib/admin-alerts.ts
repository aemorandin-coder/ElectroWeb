/**
 * ELECTRO SHOP — ADMIN ALERT EMAILS
 * Envía alertas por email a los admins configurados cuando ocurren eventos críticos.
 * Los destinatarios se configuran en /admin/settings → campo "adminAlertEmails".
 */

import { sendEmail } from '@/lib/email-service';

// Obtener lista de emails de alerta desde CompanySettings
async function getAdminAlertEmails(): Promise<string[]> {
  try {
    const { prisma } = await import('@/lib/prisma');
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
      select: { adminAlertEmails: true } as any,
    });
    const raw = (settings as any)?.adminAlertEmails;
    if (!raw) return [];
    // Puede ser JSON array o string separado por comas
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return raw.split(',').map((e: string) => e.trim()).filter(Boolean);
    }
  } catch (error) {
    console.error('[ADMIN-ALERTS] Error getting admin alert emails:', error);
    return [];
  }
}

// Plantilla base para emails de alerta
function buildAlertEmailHtml({
  title,
  icon,
  iconColor,
  lines,
  actionUrl,
  actionLabel,
  companyName = 'Electro Shop',
}: {
  title: string;
  icon: string;
  iconColor: string;
  lines: { label: string; value: string }[];
  actionUrl?: string;
  actionLabel?: string;
  companyName?: string;
}): string {
  const rows = lines
    .map(
      ({ label, value }) => `
      <tr>
        <td style="padding:8px 0;color:#6a6c6b;font-size:14px;width:40%;">${label}</td>
        <td style="padding:8px 0;color:#212529;font-size:14px;font-weight:600;">${value}</td>
      </tr>`
    )
    .join('');

  const actionBtn = actionUrl
    ? `<div style="text-align:center;margin-top:28px;">
        <a href="${actionUrl}" style="display:inline-block;background:#2a63cd;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">${actionLabel || 'Ver en Panel'}</a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(42,99,205,0.10);">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2a63cd);padding:28px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:10px;">${icon}</div>
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${title}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">${companyName} · Alerta del Sistema</p>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e9ecef;">
        ${rows}
      </table>
      ${actionBtn}
    </div>
    <div style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e9ecef;">
      <p style="margin:0;color:#adb5bd;font-size:12px;">Este es un mensaje automático de ${companyName}. No responder.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── NUEVA ORDEN ────────────────────────────────────────────────────────────

export async function sendNewOrderAlert({
  orderNumber,
  customerName,
  customerEmail,
  total,
  paymentMethod,
  itemCount,
  baseUrl,
}: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  itemCount: number;
  baseUrl?: string;
}) {
  const emails = await getAdminAlertEmails();
  if (emails.length === 0) return;

  const html = buildAlertEmailHtml({
    title: 'Nueva Orden Recibida',
    icon: '🛒',
    iconColor: '#2a63cd',
    lines: [
      { label: 'Número de Orden', value: orderNumber },
      { label: 'Cliente', value: customerName || 'Invitado' },
      { label: 'Email', value: customerEmail || '—' },
      { label: 'Total', value: `$${total.toFixed(2)} USD` },
      { label: 'Pago', value: paymentMethod },
      { label: 'Productos', value: `${itemCount} ítem(s)` },
      { label: 'Hora', value: new Date().toLocaleString('es-VE') },
    ],
    actionUrl: baseUrl ? `${baseUrl}/admin/orders` : undefined,
    actionLabel: 'Ver Orden en Panel',
  });

  await sendEmail({
    to: emails,
    subject: `Nueva Orden ${orderNumber} — $${total.toFixed(2)} USD`,
    html,
  }).catch((e) => console.error('[ADMIN-ALERTS] Error sending new order alert:', e));
}

// ─── NUEVA SOLICITUD DE RECARGA ──────────────────────────────────────────────

export async function sendNewRechargeAlert({
  customerName,
  customerEmail,
  amount,
  paymentMethod,
  reference,
  baseUrl,
}: {
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  baseUrl?: string;
}) {
  const emails = await getAdminAlertEmails();
  if (emails.length === 0) return;

  const html = buildAlertEmailHtml({
    title: 'Nueva Solicitud de Recarga',
    icon: '💳',
    iconColor: '#16a34a',
    lines: [
      { label: 'Cliente', value: customerName },
      { label: 'Email', value: customerEmail || '—' },
      { label: 'Monto', value: `$${amount.toFixed(2)} USD` },
      { label: 'Método de Pago', value: paymentMethod },
      { label: 'Referencia', value: reference || 'No especificada' },
      { label: 'Hora', value: new Date().toLocaleString('es-VE') },
    ],
    actionUrl: baseUrl ? `${baseUrl}/admin/transactions` : undefined,
    actionLabel: 'Aprobar/Rechazar en Panel',
  });

  await sendEmail({
    to: emails,
    subject: `Solicitud de Recarga — $${amount.toFixed(2)} USD de ${customerName}`,
    html,
  }).catch((e) => console.error('[ADMIN-ALERTS] Error sending recharge alert:', e));
}

// ─── NUEVA SOLICITUD DE CREADOR ──────────────────────────────────────────────

export async function sendNewCreatorAlert({
  creatorName,
  creatorEmail,
  expertise,
  baseUrl,
}: {
  creatorName: string;
  creatorEmail: string;
  expertise?: string;
  baseUrl?: string;
}) {
  const emails = await getAdminAlertEmails();
  if (emails.length === 0) return;

  const html = buildAlertEmailHtml({
    title: 'Nueva Solicitud de Creador de Cursos',
    icon: '🎓',
    iconColor: '#7c3aed',
    lines: [
      { label: 'Nombre', value: creatorName },
      { label: 'Email', value: creatorEmail || '—' },
      { label: 'Especialidad', value: expertise || 'No especificada' },
      { label: 'Hora', value: new Date().toLocaleString('es-VE') },
    ],
    actionUrl: baseUrl ? `${baseUrl}/admin/creators` : undefined,
    actionLabel: 'Revisar Solicitud en Panel',
  });

  await sendEmail({
    to: emails,
    subject: `Nueva Solicitud de Creador — ${creatorName}`,
    html,
  }).catch((e) => console.error('[ADMIN-ALERTS] Error sending creator alert:', e));
}
