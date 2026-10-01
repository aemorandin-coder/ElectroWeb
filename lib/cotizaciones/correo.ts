// Mandar una cotización por correo (C-159). Solo servidor.
// El correo lleva el resumen y el botón al enlace del presupuesto: el documento, la impresión y la aprobación siguen
// en esa página. No adjunta nada. Todo lo que escribe el equipo o el cliente va escapado.

import { getBaseTemplate, sendEmail } from '@/lib/email-service';
import { escaparHtml, urlBase } from '@/lib/email-campaigns';
import { formatUSD } from '@/lib/currency';
import { getPublicSettings } from '@/lib/site-settings';
import type { CotizacionAdmin } from '@/lib/cotizaciones';

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric' });

/** El correo y su asunto, sin enviarlo (también lo usa la vista previa del panel). */
export async function correoCotizacion(c: CotizacionAdmin, mensaje: string | null): Promise<{ asunto: string; html: string }> {
  const settings = await getPublicSettings();
  const marca = settings.companyName || 'Electro Shop';
  const asunto = `Presupuesto ${c.number} de ${marca}`;
  const nombre = (c.contactName || c.clientName).trim().split(/\s+/)[0];
  const enlace = `${urlBase()}/cotizacion/${c.token}`;
  const { totales } = c;

  const fila = (etiqueta: string, valor: string, fuerte = false) => `<tr>
      <td style="padding:6px 0;color:#6a6c6b;font-size:14px;">${escaparHtml(etiqueta)}</td>
      <td style="padding:6px 0;text-align:right;color:#212529;font-size:${fuerte ? 18 : 14}px;font-weight:${fuerte ? 700 : 600};">${escaparHtml(valor)}</td>
    </tr>`;
  const filas = [
    c.subject ? fila('Para', c.subject) : '',
    fila('Monto total (IVA incluido)', formatUSD(totales.totalUSD), totales.retencionUSD === 0),
    totales.retencionUSD > 0 ? fila(`Retención del IVA (${c.ivaRetentionPercent} %)`, `-${formatUSD(totales.retencionUSD)}`) : '',
    totales.retencionUSD > 0 ? fila('Neto a pagar', formatUSD(totales.netoUSD), true) : '',
    totales.anticipoUSD !== null ? fila(`Anticipo (${c.advancePercent} %)`, formatUSD(totales.anticipoUSD)) : '',
    c.venceEl ? fila('Válido hasta', fecha(c.venceEl)) : '',
  ].join('');

  const nota = mensaje
    ? `<p style="color:#212529;font-size:15px;line-height:1.6;margin:0 0 16px;padding:12px 16px;background:#f8f9fa;border-left:4px solid #2a63cd;border-radius:0 8px 8px 0;">${escaparHtml(mensaje).replace(/\n/g, '<br>')}</p>`
    : '';

  const contenido = `
    <h2 style="margin:0 0 10px;color:#212529;font-size:22px;font-weight:600;">Presupuesto N.º ${escaparHtml(c.number)}</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 12px;">Hola ${escaparHtml(nombre)}, te enviamos el presupuesto${c.subject ? ` para ${escaparHtml(c.subject)}` : ''}. Puedes verlo, imprimirlo o guardarlo en PDF, y aprobarlo ahí mismo con tu nombre y tu cédula o RIF.</p>
    ${nota}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:1px solid #e9ecef;border-bottom:1px solid #e9ecef;margin:8px 0;">${filas}</table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td bgcolor="#2a63cd" style="border-radius:8px;"><a href="${escaparHtml(enlace)}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Ver y aprobar el presupuesto</a></td></tr></table>
    <p style="color:#6a6c6b;font-size:13px;line-height:1.6;margin:0;">Este presupuesto no es una factura. El enlace es personal: quien lo tenga puede verlo y aprobarlo, así que no lo reenvíes a quien no corresponda.</p>`;
  return { asunto, html: await getBaseTemplate(contenido, escaparHtml(asunto)) };
}

/** Envía la cotización a `para`. `success` false si el servicio de correo no la aceptó. */
export async function enviarCotizacionPorCorreo(c: CotizacionAdmin, para: string, mensaje: string | null): Promise<{ success: boolean; error?: string }> {
  const { asunto, html } = await correoCotizacion(c, mensaje);
  const r = await sendEmail({ to: para, subject: asunto, html });
  return { success: r.success, error: r.error };
}
