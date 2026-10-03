import { porcentajeIva } from '@/lib/pricing';
import { getBaseTemplate } from '@/lib/email-service';
import { CORREO, COLOR, botonCorreo } from './estilo';
import { ETIQUETA_ENTREGA } from '@/lib/envios/empresas';
import { escapeHtml } from '@/lib/html';

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
  }>;
  subtotal: string;
  /** Descuento de cupón u ofertas; sin él, el total no cuadraba con el subtotal */
  discount?: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
  /** Ya legible ("Saldo de la tienda", "Pago Móvil") */
  paymentMethod: string;
  /** Saldo o Pago Móvil verificado. Si no, el pago está por confirmar */
  paid: boolean;
  deliveryMethod: string;
  deliveryAddress?: string;
  trackingUrl?: string;
}

/** El HTML completo del correo, con el marco de todos los correos (C-175). */
export async function generateOrderConfirmationEmail(data: OrderConfirmationData): Promise<string> {
  const {
    orderNumber,
    customerName,
    orderDate,
    items,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    currency,
    paymentMethod,
    paid,
    deliveryMethod,
    deliveryAddress,
    trackingUrl,
  } = data;
  // C-121: antes decía "debitado de tu billetera prepago" también en un Pago Móvil por verificar
  const hasSecondHand = items.some((item) => item.condition);
  const hasDiscount = !!discount && Number(discount) > 0;

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'PICKUP': return 'Retiro en Tienda';
      case 'HOME_DELIVERY': return 'Entrega a Domicilio';
      case 'SHIPPING': return 'Envío Nacional (ZOOM / MRW)';
      default: return method;
    }
  };

  // C-106: en ZOOM/MRW la tienda cobra solo el embalaje; el flete es cobro a destino y no va en este total.
  // `deliveryMethod` llega ya traducido con ETIQUETA_ENTREGA (app/api/orders/route.ts).
  const etiquetaEnvio = deliveryMethod === ETIQUETA_ENTREGA.SHIPPING
    ? 'Embalaje (el flete se paga al retirar):'
    : deliveryMethod === ETIQUETA_ENTREGA.LOCAL_DELIVERY ? 'Delivery en Guanare:' : 'Envío:';

  // C-146: los precios ya llevan el IVA. Se dice cuánto del total es; un pedido sin IVA guardado no muestra nada.
  // Antes decía "Impuestos (Exento)", que no es cierto para lo que vende la tienda.
  const ivaNum = Number(tax) || 0;
  const totalNum = Number(total) || 0;
  const ivaTexto = ivaNum > 0 && totalNum > ivaNum
    ? `Incluye IVA (${porcentajeIva(totalNum, ivaNum)} %): ${ivaNum.toFixed(2)} ${currency} · Base imponible: ${(totalNum - ivaNum).toFixed(2)} ${currency}`
    : '';

  const celda = `padding:12px 6px;border-bottom:1px solid ${COLOR.linea};font-size:14px;`;
  const encabezado = `padding:10px 6px;border-bottom:2px solid ${COLOR.linea};color:${COLOR.suave};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;`;
  const filaTotal = (etiqueta: string, valor: string, color: string = COLOR.texto) => `
              <tr>
                <td style="padding:4px 0;color:${COLOR.suave};font-size:14px;">${etiqueta}</td>
                <td style="padding:4px 0;text-align:right;font-weight:600;color:${color};font-size:14px;">${valor}</td>
              </tr>`;

  const content = `
    <h2 style="${CORREO.titulo}">¡Gracias por tu compra, ${escapeHtml(customerName)}!</h2>
    <p style="${CORREO.subtitulo}">Orden #${escapeHtml(orderNumber)}</p>
    <p style="${CORREO.texto}">${paid
      ? 'Recibimos tu pago y tu pedido ya está en preparación.'
      : 'Recibimos tu pedido. Te avisaremos apenas confirmemos el pago.'}</p>

    <div style="${CORREO.caja}">
      <p style="${CORREO.cajaTexto}${CORREO.tonoNeutro}">
        <strong style="${CORREO.fuerte}">Fecha:</strong> ${escapeHtml(orderDate)}<br>
        <strong style="${CORREO.fuerte}">Método de pago:</strong> ${escapeHtml(paymentMethod)}${paid ? '' : ' (por confirmar)'}<br>
        <strong style="${CORREO.fuerte}">Método de despacho:</strong> ${escapeHtml(getMethodLabel(deliveryMethod))}
        ${deliveryAddress ? `<br><strong style="${CORREO.fuerte}">Dirección de entrega:</strong> ${escapeHtml(deliveryAddress)}` : ''}
      </p>
    </div>

    <p style="${CORREO.rotulo}margin:24px 0 0;">Recibo digital</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:6px;">
      <tr>
        <th align="left" style="${encabezado}">Producto</th>
        <th align="center" style="${encabezado}">Cant.</th>
        <th align="right" style="${encabezado}">Total</th>
      </tr>
      ${items.map(item => {
        const priceNum = parseFloat(item.price.replace(',', '.')) || 0;
        const qty = item.quantity || 1;
        const rowTotal = priceNum * qty;
        return `
      <tr>
        <td style="${celda}color:${COLOR.tinta};">
          <strong>${escapeHtml(item.name)}</strong>
          ${item.condition ? `<br><span style="display:inline-block;margin-top:4px;padding:2px 6px;background-color:${COLOR.tinta};color:#ffffff;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">${escapeHtml(item.condition)}</span>
          <span style="font-size:12px;color:${COLOR.suave};">Garantía de la tienda: ${item.warrantyDays ?? 30} días</span>` : ''}
        </td>
        <td align="center" style="${celda}color:${COLOR.texto};">${qty}</td>
        <td align="right" style="${celda}font-weight:600;color:${COLOR.tinta};white-space:nowrap;">${rowTotal.toFixed(2)} ${currency}</td>
      </tr>`;
      }).join('')}
    </table>

    ${hasSecondHand ? `
    <p style="${CORREO.textoMenor}font-size:12px;margin:12px 0 0;">
      Los productos usados, reacondicionados o de caja abierta se venden en el estado descrito en su ficha. Tienen la garantía de la tienda indicada, contada desde la entrega, por fallas de funcionamiento.
    </p>
    ` : ''}

    <div style="${CORREO.caja}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        ${filaTotal('Subtotal:', `${subtotal} ${currency}`)}
        ${hasDiscount ? filaTotal('Descuento:', `-${discount} ${currency}`, COLOR.exito) : ''}
        ${shipping && shipping !== '0' && shipping !== '0.00' ? filaTotal(etiquetaEnvio, `${shipping} ${currency}`) : ''}
        <tr>
          <td style="padding:12px 0 0;border-top:2px solid ${COLOR.linea};color:${COLOR.marca};font-size:17px;font-weight:700;">${paid ? 'Total pagado:' : 'Total a pagar:'}</td>
          <td style="padding:12px 0 0;border-top:2px solid ${COLOR.linea};text-align:right;color:${COLOR.marca};font-size:17px;font-weight:700;white-space:nowrap;">${total} ${currency}</td>
        </tr>
        ${ivaTexto ? `
        <tr>
          <td colspan="2" style="padding:6px 0 0;text-align:right;font-size:12px;color:${COLOR.suave};">${ivaTexto}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${deliveryMethod !== ETIQUETA_ENTREGA.DIGITAL ? `
    <div style="${CORREO.cajaInfo}">
      <p style="${CORREO.cajaTitulo}${CORREO.tonoInfo}">Tu comprobante de compra</p>
      <p style="${CORREO.cajaTexto}${CORREO.tonoInfo}">Va dentro del paquete, junto con tus productos.</p>
    </div>
    ` : ''}

    ${trackingUrl ? botonCorreo(escapeHtml(trackingUrl), 'Seguimiento de envío') : ''}

    <p style="${CORREO.nota}text-align:center;">
      ¿Tienes alguna duda con tu compra? Escríbenos a nuestro WhatsApp de soporte.
    </p>`;

  return getBaseTemplate(content, paid ? `Tu pedido ${orderNumber} ya está en preparación` : `Recibimos tu pedido ${orderNumber}`);
}
