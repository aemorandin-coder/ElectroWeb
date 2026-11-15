/**
 * C-219: los correos de los Puntos ES. Antes solo tenía correo la recarga que aprueba sola el BDV (escrito dentro de la
 * ruta); la aprobada o rechazada a mano, el pago que pasa a Puntos ES y la comisión del promotor quedaban en la campanita.
 * "Puntos ES", nunca saldo ni billetera, y nunca se dice que se retira o se transfiere (regla del 30/09).
 */
import { formatPuntos, formatUSD } from '@/lib/currency';
import { escapeHtml } from '@/lib/html';
import { avisoCorreo, botonCorreo, datosCorreo, enlaceWhatsAppCorreo, urlTienda } from './estilo';
import { ajustesCorreo, marcoCorreo } from './marco';
import type { Correo } from './pedidos';

const e = escapeHtml;
const nombreDe = (nombre: string | null | undefined) => e((nombre || '').trim().split(/\s+/)[0] || '');
const misPuntos = () => botonCorreo(`${urlTienda()}/customer/balance`, 'Ver mis Puntos ES');

/** La recarga quedó aprobada: sola (Pago Móvil del BDV) o por el equipo. La referencia y el banco los escribe el cliente. */
export async function correoRecargaAprobada(d: {
  nombre: string | null;
  monto: number;
  automatica: boolean;
  referencia?: string | null;
  banco?: string | null;
}): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const datos: [string, string][] = [['Recarga', e(formatPuntos(d.monto))]];
  if (d.referencia) datos.push(['Referencia', e(d.referencia)]);
  if (d.banco) datos.push(['Banco', e(d.banco)]);
  const html = await marcoCorreo({
    preheader: `${formatPuntos(d.monto)} ya están en tu cuenta.`,
    encabezado: {
      sello: 'RECARGA APROBADA',
      titulo: `¡+${e(formatUSD(d.monto))} en tus Puntos ES${nombre ? `, ${nombre}` : ''}!`,
      texto: d.automatica
        ? 'Tu Pago Móvil se verificó solo con el Banco de Venezuela y ya puedes usarlos.'
        : 'El equipo verificó tu pago y tus Puntos ES ya están disponibles.',
    },
    cuerpo: `${datosCorreo(datos)}${misPuntos()}`,
    chispa: { pose: 'celebra', texto: 'Con Puntos ES pagas en un toque, sin esperar verificaciones. ¡A comprar!' },
  });
  return { asunto: `¡Recarga aprobada! +${formatPuntos(d.monto)}`, html };
}

/** El equipo no aprobó la recarga. El motivo lo escribe el equipo. */
export async function correoRecargaRechazada(d: { nombre: string | null; monto: number; motivo?: string | null }): Promise<Correo> {
  const a = await ajustesCorreo();
  const nombre = nombreDe(d.nombre);
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'escríbenos por WhatsApp', 'Hola, mi recarga de Puntos ES no fue aprobada');
  const html = await marcoCorreo({
    preheader: 'Revisamos tu recarga y no la pudimos aprobar. Te contamos por qué.',
    encabezado: {
      sello: 'RECARGA NO APROBADA',
      titulo: `No pudimos aprobar tu recarga${nombre ? `, ${nombre}` : ''}`,
      texto: `Revisamos tu recarga de ${e(formatUSD(d.monto))} y no la pudimos aprobar.`,
    },
    cuerpo: `
      ${d.motivo ? datosCorreo([['Motivo', e(d.motivo)]]) : ''}
      ${avisoCorreo('Revisa los datos del pago', 'La referencia, el monto y el banco tienen que coincidir con tu Pago Móvil. Si ya pagaste, escríbenos con el comprobante y lo resolvemos.', 'pago')}
      ${misPuntos()}`,
    chispa: { pose: 'explica', texto: `Si el dinero salió de tu cuenta, no se pierde: ${whatsapp || 'escríbenos'} con el comprobante.` },
  });
  return { asunto: 'Tu recarga de Puntos ES no fue aprobada', html };
}

/** Pagó por Pago Móvil y la orden no se pudo crear: el dinero quedó en sus Puntos ES (lib/pago-movil-sin-orden). */
export async function correoPagoAPuntos(d: { nombre: string | null; monto: number; referencia: string }): Promise<Correo> {
  const a = await ajustesCorreo();
  const nombre = nombreDe(d.nombre);
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'escríbenos por WhatsApp', `Hola, mi pago con referencia ${d.referencia} pasó a mis Puntos ES`);
  const html = await marcoCorreo({
    preheader: 'Tu dinero no se perdió: quedó en tus Puntos ES.',
    encabezado: {
      sello: 'TU PAGO ESTÁ A SALVO',
      titulo: `Tu pago quedó en tus Puntos ES${nombre ? `, ${nombre}` : ''}`,
      texto: 'Recibimos tu Pago Móvil, pero la orden no se pudo completar. El dinero no se perdió: quedó en tus Puntos ES para que compres cuando quieras.',
    },
    cuerpo: `${datosCorreo([['Puntos ES', e(formatPuntos(d.monto))], ['Referencia', e(d.referencia)]])}${misPuntos()}`,
    chispa: { pose: 'explica', texto: `Puedes usarlos ya mismo en tu próxima compra. Si prefieres que te ayudemos, ${whatsapp || 'escríbenos'}.` },
  });
  return { asunto: `Tu pago de ${formatUSD(d.monto)} quedó en tus Puntos ES`, html };
}

/** La comisión de promotor se acreditó (7 días después de la entrega, lib/influencer-commission). */
export async function correoComisionAcreditada(d: { nombre: string | null; monto: number }): Promise<Correo> {
  const nombre = nombreDe(d.nombre);
  const html = await marcoCorreo({
    preheader: `${formatPuntos(d.monto)} de comisión ya están en tu cuenta.`,
    encabezado: {
      sello: 'COMISIÓN ACREDITADA',
      titulo: `¡Ganaste ${e(formatUSD(d.monto))}${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Tu comisión de promotor ya está en tus Puntos ES: úsala en lo que quieras de la tienda.',
    },
    cuerpo: botonCorreo(`${urlTienda()}/customer/referrals`, 'Ver mi panel de promotor'),
    chispa: { pose: 'celebra', texto: '¡Sigue compartiendo tu código! Cada compra de tus seguidores suma.' },
  });
  return { asunto: `¡Ganaste ${formatPuntos(d.monto)} como promotor!`, html };
}
