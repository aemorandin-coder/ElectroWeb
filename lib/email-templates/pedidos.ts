/**
 * C-219: correos de un pedido que antes no existían o estaban escritos dentro de la ruta de órdenes.
 * Devuelven el asunto y el HTML sin enviar nada: los usa el envío real y la vista previa del panel.
 */
import { getPublicSettings } from '@/lib/site-settings';
import { formatPuntos, formatUSD } from '@/lib/currency';
import { escapeHtml } from '@/lib/html';
import { avisoCorreo, botonCorreo, datosCorreo, enlaceWhatsAppCorreo, exitoCorreo, seguimientoCorreo, urlTienda } from './estilo';
import { ajustesCorreo, marcoCorreo } from './marco';

export interface Correo { asunto: string; html: string }

const e = escapeHtml;
const nombreDe = (nombre: string | null | undefined) => e((nombre || '').trim().split(/\s+/)[0] || '');

const DIAS: Array<[string, string]> = [
  ['monday', 'lunes'], ['tuesday', 'martes'], ['wednesday', 'miércoles'], ['thursday', 'jueves'],
  ['friday', 'viernes'], ['saturday', 'sábado'], ['sunday', 'domingo'],
];

/** "Lunes a sábado, de 9:00 a 19:00" desde el horario de Configuración → Negocio. Vacío si no hay horario. */
export function horarioEnTexto(horario: Record<string, { open: string; close: string; enabled: boolean }> | null | undefined): string {
  if (!horario) return '';
  const abiertos = DIAS.filter(([clave]) => horario[clave]?.enabled);
  if (abiertos.length === 0) return '';
  const grupos: Array<{ desde: string; hasta: string; horas: string }> = [];
  for (const [clave, nombre] of abiertos) {
    const horas = `de ${horario[clave].open} a ${horario[clave].close}`;
    const ultimo = grupos[grupos.length - 1];
    const seguido = ultimo && DIAS.findIndex(([c]) => c === clave) === DIAS.findIndex(([, n]) => n === ultimo.hasta) + 1;
    if (ultimo && seguido && ultimo.horas === horas) ultimo.hasta = nombre;
    else grupos.push({ desde: nombre, hasta: nombre, horas });
  }
  const texto = grupos
    .map((g) => `${g.desde === g.hasta ? g.desde : `${g.desde} a ${g.hasta}`}, ${g.horas}`)
    .join('; ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** La orden se canceló (antes estaba escrita dentro de app/api/orders). Todo lo que escribe el equipo va escapado. */
export async function correoOrdenCancelada(d: {
  numero: string;
  nombre: string | null;
  motivo: string;
  total: number;
  /** Puntos ES devueltos; 0 si no hubo */
  reintegro: number;
}): Promise<Correo> {
  const a = await ajustesCorreo();
  const nombre = nombreDe(d.nombre);
  const fecha = new Date().toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric' });
  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'escríbenos por WhatsApp', `Hola, tengo una duda con mi orden cancelada ${d.numero}`);
  const html = await marcoCorreo({
    preheader: 'Aquí tienes el motivo y lo que pasa con tu dinero.',
    encabezado: {
      sello: 'ORDEN CANCELADA',
      titulo: `Cancelamos tu orden${nombre ? `, ${nombre}` : ''}`,
      texto: 'Lo sentimos. Aquí tienes el motivo y lo que pasa con tu dinero.',
      dato: `Orden ${e(d.numero)}`,
    },
    cuerpo: `
      ${datosCorreo([['Motivo', e(d.motivo)], ['Total de la orden', formatUSD(d.total)], ['Fecha', e(fecha)]])}
      ${d.reintegro > 0 ? exitoCorreo('Te devolvimos tus Puntos ES', `${e(formatPuntos(d.reintegro))} ya están en tu cuenta para tu próxima compra.`) : ''}
      ${botonCorreo(`${urlTienda()}/customer/orders`, 'Ver mis pedidos')}`,
    chispa: { pose: 'explica', texto: `Si quieres intentarlo de nuevo o tienes dudas con tu dinero, ${whatsapp || 'escríbenos'}: lo resolvemos contigo.` },
  });
  return { asunto: `Tu orden ${d.numero} fue cancelada`, html };
}

/** C-219: el pedido quedó listo para retirar en la tienda (antes solo había el aviso dentro de la web). */
export async function correoListoParaRetirar(d: { numero: string; nombre: string | null }): Promise<Correo> {
  const s = await getPublicSettings().catch(() => null);
  const nombre = nombreDe(d.nombre);
  const horario = horarioEnTexto(s?.businessHours);
  const donde = s?.pickupAddress || [s?.address, s?.city].filter(Boolean).join(', ');
  const instrucciones = (s?.pickupInstructions || '').replace(/\s*\n\s*/g, ' ').trim();
  const html = await marcoCorreo({
    preheader: 'Ya está empacado y con tu nombre. Te esperamos.',
    encabezado: {
      sello: 'LISTO PARA RETIRAR',
      titulo: `¡Tu pedido te espera${nombre ? `, ${nombre}` : ''}!`,
      texto: 'Ya está empacado y con tu nombre. Pásate por la tienda cuando quieras, dentro del horario.',
      dato: `Orden ${e(d.numero)}`,
    },
    cuerpo: `
      ${seguimientoCorreo(['Recibido', 'Pagado', 'Preparando', 'Listo', '¡Es tuyo!'], 3)}
      ${datosCorreo([donde ? ['Dónde', e(donde)] : null, horario ? ['Horario', e(horario)] : null].filter((f): f is [string, string] => f !== null))}
      ${avisoCorreo('Lleva tu cédula y el número de orden', e(instrucciones || 'Te los pedimos para entregarte el pedido.'), 'tienda')}
      ${botonCorreo(`${urlTienda()}/customer/orders`, 'Ver mi pedido')}`,
    chispa: { pose: 'pulgar', texto: '¡Te esperamos! Si va a buscarlo otra persona, avísanos antes por WhatsApp.' },
  });
  return { asunto: `¡Tu pedido ${d.numero} está listo para retirar!`, html };
}
