import { porcentajeIva } from '@/lib/pricing';
import { formatUSD, formatVES } from '@/lib/currency';
import { escapeHtml } from '@/lib/html';
import { ETIQUETA_ENTREGA } from '@/lib/envios/empresas';
import { paqueteDesde } from '@/lib/origen';
import {
  CORREO, avisoCorreo, botonCorreo, enlaceWhatsAppCorreo, notaCorreo, productosCorreo, rotuloCorreo, seguimientoCorreo,
  totalesCorreo, urlTienda,
} from './estilo';
import { ajustesCorreo, fotoCorreo, marcoCorreo } from './marco';

/**
 * C-219: de dónde sale un paquete que no es de Guanare, en una sola frase, con el estado y la ciudad de C-222:
 * "Paquete desde Aragua (La Victoria), con su propia guía".
 */
export function origenDelPaquete(estado: string | null | undefined, ciudad: string | null | undefined): string {
  return `Paquete ${paqueteDesde(estado, ciudad)}, con su propia guía`;
}

interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
    /** C-119: "Usado · Muy bueno" (conditionBadge); null si es nuevo */
    condition?: string | null;
    /** Garantía de la tienda que guardó el pedido */
    warrantyDays?: number | null;
    /** C-219: la foto del producto (ruta de la tienda) */
    image?: string | null;
  }>;
  subtotal: string;
  /** Descuento de cupón u ofertas; sin él, el total no cuadraba con el subtotal */
  discount?: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
  /** Ya legible ("Puntos ES", "Pago Móvil") */
  paymentMethod: string;
  /** Puntos ES o Pago Móvil verificado. Si no, el pago está por confirmar */
  paid: boolean;
  /** C-219: el método tal cual (SHIPPING, LOCAL_DELIVERY, PICKUP, DIGITAL); `deliveryMethod` queda por compatibilidad */
  deliveryCode?: string | null;
  deliveryMethod: string;
  deliveryAddress?: string;
  /** C-199 y C-222: el estado y la ciudad de los que sale el paquete, si no es Guanare */
  dispatchCityName?: string | null;
  dispatchStateName?: string | null;
  /** C-219: el total en bolívares y la tasa que guardó la orden */
  totalVES?: number | null;
  exchangeRate?: number | null;
  trackingUrl?: string;
  /** C-234: "Sale el lunes 16 de noviembre" (lo físico pagado) o cuándo llega lo digital ("Te llega en minutos") */
  salida?: string | null;
}

const e = escapeHtml;

/** El asunto del correo de la compra, según si el pago ya entró. */
export function asuntoConfirmacion(data: Pick<OrderConfirmationData, 'orderNumber' | 'paid'>): string {
  return data.paid
    ? `¡Pago confirmado! Tu pedido ${data.orderNumber} ya arrancó`
    : `Recibimos tu pedido ${data.orderNumber}: estamos revisando tu pago`;
}

/**
 * El correo de la compra (C-219: uno solo, antes eran dos a la vez cuando el pago quedaba en revisión). Si el pago ya entró
 * dice "¡Es oficial!"; si no, "¡Pedido recibido!" y que el pago se está revisando. También es el de "Pago confirmado".
 */
export async function generateOrderConfirmationEmail(data: OrderConfirmationData): Promise<string> {
  const a = await ajustesCorreo();
  const app = urlTienda();
  const nombre = e((data.customerName || '').trim().split(/\s+/)[0] || '');
  const codigo = data.deliveryCode
    || Object.entries(ETIQUETA_ENTREGA).find(([, etiqueta]) => data.deliveryMethod.startsWith(etiqueta))?.[0]
    || '';
  const digital = codigo === 'DIGITAL';
  const num = (v: string | undefined) => Number(String(v ?? '').replace(',', '.')) || 0;
  const pago = e(data.paymentMethod);

  // C-121: con Puntos ES no hay que verificar nada; con un Pago Móvil por confirmar, sí
  const encabezado = data.paid
    ? {
      sello: 'PAGO CONFIRMADO',
      titulo: `¡Es oficial${nombre ? `, ${nombre}` : ''}!<br>Tu pedido ya arrancó`,
      texto: digital
        ? `Tu pago con ${pago} entró perfecto. ${data.salida ? `${e(data.salida)}: por correo y en Mi pedido.` : 'Ya estamos preparando tu compra digital: te llega por correo y en Mi pedido.'}`
        : `Tu pago con ${pago} entró perfecto. Ya estamos armando tu caja y te avisamos en cuanto salga.`,
    }
    : {
      sello: 'PEDIDO RECIBIDO',
      titulo: `¡Pedido recibido${nombre ? `, ${nombre}` : ''}!`,
      texto: `Ya lo tenemos. Estamos confirmando tu pago con ${pago} y, apenas esté, arrancamos. No tienes que hacer nada más.`,
    };

  const pasos = digital ? ['Recibido', 'Pagado', 'Te llega'] : ['Recibido', 'Pagado', 'Preparando', 'En camino', '¡Es tuyo!'];
  const hayUsados = data.items.some((item) => item.condition);

  const productos = productosCorreo(data.items.map((item) => {
    const cantidad = item.quantity || 1;
    const detalle = [`Cantidad: ${cantidad}`, item.condition ? `${e(item.condition)} · garantía de ${item.warrantyDays ?? 30} días` : ''].filter(Boolean).join(' · ');
    return { nombre: e(item.name), detalle, monto: formatUSD(num(item.price) * cantidad), foto: fotoCorreo(item.image) };
  }));

  // C-106: en ZOOM y MRW la tienda cobra solo el embalaje; el flete es cobro a destino y no va en este total
  const envio = num(data.shipping);
  const etiquetaEnvio = codigo === 'SHIPPING' ? 'Embalaje' : codigo === 'LOCAL_DELIVERY' ? 'Delivery en Guanare' : 'Envío';
  const filas: [string, string][] = [['Subtotal', formatUSD(num(data.subtotal))]];
  if (num(data.discount) > 0) filas.push(['Descuento', `-${formatUSD(num(data.discount))}`]);
  if (envio > 0) filas.push([etiquetaEnvio, formatUSD(envio)]);

  // C-146: los precios ya llevan el IVA; se dice cuánto del total es. C-219: y el total en bolívares, con la tasa de la orden
  const total = num(data.total);
  const iva = num(data.tax);
  const notas = [
    data.totalVES && data.exchangeRate ? `${formatVES(Number(data.totalVES))} al cambio BCV del día (${Number(data.exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })})` : '',
    iva > 0 && total > iva ? `Incluye IVA (${porcentajeIva(total, iva)} %): ${formatUSD(iva)}` : '',
  ].filter(Boolean).join('<br>');

  const entrega = digital ? '' : `
    ${rotuloCorreo('Así te llega')}
    ${data.salida ? `<p style="margin:0 0 6px;font-size:17px;line-height:1.4;font-weight:800;color:#0e1f44;">${e(data.salida)}</p>` : ''}
    <p style="margin:0;font-size:15px;line-height:1.5;font-weight:700;color:#212529;">${e(ETIQUETA_ENTREGA[codigo] || data.deliveryMethod)}</p>
    ${data.deliveryAddress ? `<p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#495057;">${e(data.deliveryAddress)}</p>` : ''}
    ${data.dispatchCityName || data.dispatchStateName ? `<p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#495057;">${e(origenDelPaquete(data.dispatchStateName, data.dispatchCityName))}</p>` : ''}
    ${codigo === 'SHIPPING' ? avisoCorreo('Al retirar: tu cédula y el flete', 'Tu caja viaja con cobro a destino: el flete se lo pagas a ZOOM o MRW en la oficina y, con tu cédula en mano, es tuya.', 'envio') : ''}`;

  const whatsapp = enlaceWhatsAppCorreo(a.whatsapp, 'Escríbenos por WhatsApp', `Hola, tengo una duda con mi pedido ${data.orderNumber}`);
  const chispa = data.paid
    ? { pose: 'celebra' as const, texto: `¡Buena elección${nombre ? `, ${nombre}` : ''}! Ya le pasé tu pedido al equipo de despacho.${whatsapp ? ` ¿Una duda? ${whatsapp} y lo resolvemos.` : ''}` }
    : { pose: 'explica' as const, texto: `Estoy pendiente de tu pago: apenas el banco lo confirme, te escribo otra vez.${whatsapp ? ` ¿Una duda? ${whatsapp}.` : ''}` };

  return marcoCorreo({
    preheader: data.paid ? `Tu pedido ${data.orderNumber} ya está en marcha. Mira lo que viene.` : `Recibimos tu pedido ${data.orderNumber}. Estamos revisando tu pago.`,
    encabezado: { ...encabezado, dato: `Orden ${e(data.orderNumber)} · ${e(data.orderDate)}` },
    cuerpo: `
      ${seguimientoCorreo(pasos, data.paid ? 1 : 0)}
      ${rotuloCorreo(digital ? 'Lo que compraste' : 'Lo que viene en tu caja')}
      ${productos}
      ${hayUsados ? `<p style="${CORREO.textoMenor}font-size:12px;margin:10px 0 0;">Los productos usados, reacondicionados o de caja abierta se venden en el estado de su ficha, con la garantía de la tienda indicada, contada desde la entrega.</p>` : ''}
      ${totalesCorreo(filas, [data.paid ? 'Total pagado' : 'Total a pagar', formatUSD(total)], notas)}
      ${entrega}
      ${data.trackingUrl ? botonCorreo(e(data.trackingUrl), 'Seguir mi envío') : botonCorreo(`${app}/customer/orders`, 'Seguir mi pedido')}
      ${digital ? '' : notaCorreo('Tu comprobante de compra viaja dentro de la caja, junto con tus productos.')}`,
    chispa,
    motivo: `Te escribimos por tu compra en ${e(app.replace(/^https?:\/\//, ''))}.`,
  });
}
