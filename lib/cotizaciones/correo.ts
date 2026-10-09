// Mandar una cotización por correo (C-159). Solo servidor.
// El correo lleva el resumen y el botón al enlace del presupuesto: el documento, la impresión y la aprobación siguen
// en esa página. No adjunta nada. Todo lo que escribe el equipo o el cliente va escapado.

import { getBaseTemplate, sendEmail } from '@/lib/email-service';
import { escaparHtml, urlBase } from '@/lib/email-campaigns';
import { formatUSD } from '@/lib/currency';
import { CORREO, COLOR, botonCorreo } from '@/lib/email-templates/estilo';
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
      <td style="padding:8px 0;color:${COLOR.suave};font-size:14px;">${escaparHtml(etiqueta)}</td>
      <td style="padding:8px 0;text-align:right;color:${COLOR.tinta};font-size:${fuerte ? 18 : 14}px;font-weight:${fuerte ? 700 : 600};">${escaparHtml(valor)}</td>
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
    ? `<div style="${CORREO.cita}">${escaparHtml(mensaje)}</div>`
    : '';

  const contenido = `
    <h2 style="${CORREO.titulo}">Presupuesto N.º ${escaparHtml(c.number)}</h2>
    <p style="${CORREO.texto}">Hola ${escaparHtml(nombre)}, te enviamos el presupuesto${c.subject ? ` para ${escaparHtml(c.subject)}` : ''}. Puedes verlo, imprimirlo o guardarlo en PDF, y aprobarlo ahí mismo con tu nombre y tu cédula o RIF.</p>
    ${nota}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:1px solid ${COLOR.linea};border-bottom:1px solid ${COLOR.linea};margin:8px 0;">${filas}</table>
    ${botonCorreo(escaparHtml(enlace), 'Ver y aprobar el presupuesto')}
    <p style="${CORREO.nota}">Este presupuesto no es una factura. El enlace es personal: quien lo tenga puede verlo y aprobarlo, así que no lo reenvíes a quien no corresponda.</p>`;
  return { asunto, html: await getBaseTemplate(contenido, asunto) };
}

/** Envía la cotización a `para`. `success` false si el servicio de correo no la aceptó. */
export async function enviarCotizacionPorCorreo(c: CotizacionAdmin, para: string, mensaje: string | null): Promise<{ success: boolean; error?: string }> {
  const { asunto, html } = await correoCotizacion(c, mensaje);
  const r = await sendEmail({ to: para, subject: asunto, html });
  return { success: r.success, error: r.error };
}
