// Datos para la factura (C-147). La web no emite facturas: la tienda las hace en SADES o en el talonario.
// Aquí se decide a nombre de quién va, se guarda la copia en la orden y se arma el texto para pasarla a mano.
// Módulo puro (sin base de datos): lo usan la API de órdenes, el panel y las pruebas.

import { formatUSD, formatVES } from '@/lib/currency';

export type BillingType = 'PERSON' | 'COMPANY';

/** La copia que guarda la orden */
export interface DatosFactura {
  billingType: BillingType;
  billingName: string;
  /** Cédula (persona) o RIF (empresa) */
  billingTaxId: string;
  /** Domicilio fiscal; solo en empresas */
  billingAddress: string | null;
}

/** Lo que el servidor lee de la cuenta para decidirlo */
export interface CuentaFacturacion {
  name: string | null;
  idNumber: string | null;
  companyName: string | null;
  taxId: string | null;
  businessVerified: boolean;
  businessFiscalAddress: string | null;
}

export type LecturaFactura =
  | { ok: true; datos: DatosFactura; /** Domicilio fiscal nuevo: se guarda en el perfil para la próxima compra */ guardarDomicilio: string | null }
  | { ok: false; error: string };

export const DOMICILIO_MIN = 10;
export const DOMICILIO_MAX = 300;

/** Domicilio fiscal en una línea, sin etiquetas. null si no sirve. */
export function leerDomicilioFiscal(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return limpio.length >= DOMICILIO_MIN && limpio.length <= DOMICILIO_MAX ? limpio : null;
}

/**
 * A nombre de quién va la factura. Del navegador solo se acepta la elección (persona o empresa) y, la primera vez,
 * el domicilio fiscal: el nombre, la cédula, la razón social y el RIF salen siempre de la cuenta.
 * Una empresa sin verificar no puede pedir factura a su nombre.
 */
export function resolverFactura(cuenta: CuentaFacturacion, pedido: unknown): LecturaFactura {
  const elegido = pedido && typeof pedido === 'object' ? (pedido as { type?: unknown; fiscalAddress?: unknown }) : {};

  if (elegido.type === 'COMPANY') {
    if (!cuenta.businessVerified || !cuenta.companyName?.trim() || !cuenta.taxId?.trim()) {
      return { ok: false, error: 'Tu empresa todavía no está verificada: por ahora la factura va a tu nombre.' };
    }
    const guardado = leerDomicilioFiscal(cuenta.businessFiscalAddress);
    const domicilio = guardado ?? leerDomicilioFiscal(elegido.fiscalAddress);
    if (!domicilio) {
      return { ok: false, error: `Escribe el domicilio fiscal de tu empresa (de ${DOMICILIO_MIN} a ${DOMICILIO_MAX} letras), como aparece en su RIF.` };
    }
    return {
      ok: true,
      datos: { billingType: 'COMPANY', billingName: cuenta.companyName.trim(), billingTaxId: cuenta.taxId.trim(), billingAddress: domicilio },
      guardarDomicilio: guardado ? null : domicilio,
    };
  }

  if (elegido.type !== undefined && elegido.type !== 'PERSON') {
    return { ok: false, error: 'Elige si la factura va a tu nombre o al de tu empresa.' };
  }
  return {
    ok: true,
    datos: { billingType: 'PERSON', billingName: (cuenta.name ?? '').trim() || 'Cliente', billingTaxId: (cuenta.idNumber ?? '').trim(), billingAddress: null },
    guardarDomicilio: null,
  };
}

/** Número de factura del talonario o de SADES: letras, números, guiones, puntos y barras. '' lo borra. */
export const NUMERO_FACTURA = /^[A-Za-z0-9][A-Za-z0-9 ./-]{0,29}$/;

/** IVA que la orden llevaba dentro y su base (C-146). Las órdenes de antes tienen IVA 0. */
export function baseEIva(totalUSD: number, taxUSD: number): { baseUSD: number; ivaUSD: number } {
  const iva = Math.max(0, Math.round(taxUSD * 100) / 100);
  return { baseUSD: Math.round((totalUSD - iva) * 100) / 100, ivaUSD: iva };
}

export interface OrdenParaFacturar {
  orderNumber: string;
  createdAt: string | Date;
  billingType?: string | null;
  billingName?: string | null;
  billingTaxId?: string | null;
  billingAddress?: string | null;
  /** Para las órdenes de antes de C-147, que no guardaron la copia */
  respaldo?: { name?: string | null; idNumber?: string | null };
  phone?: string | null;
  email?: string | null;
  items: Array<{ productName: string; quantity: number; priceUSD: number | string; totalUSD: number | string }>;
  discountUSD?: number | string | null;
  shippingUSD?: number | string | null;
  taxUSD: number | string;
  totalUSD: number | string;
  totalVES?: number | string | null;
  exchangeRateVES?: number | string | null;
  /** "Pago Móvil · Banesco" */
  pago?: string | null;
}

/** El texto de "Copiar datos para facturar": lo que hay que escribir en SADES o en el talonario, en ese orden. */
export function textoParaFacturar(orden: OrdenParaFacturar): string {
  const empresa = orden.billingType === 'COMPANY';
  const nombre = orden.billingName || orden.respaldo?.name || 'Sin nombre';
  const documento = orden.billingTaxId || orden.respaldo?.idNumber || '';
  const total = Number(orden.totalUSD) || 0;
  const { baseUSD, ivaUSD } = baseEIva(total, Number(orden.taxUSD) || 0);
  const descuento = Number(orden.discountUSD) || 0;
  const envio = Number(orden.shippingUSD) || 0;
  const tasa = Number(orden.exchangeRateVES) || 0;
  const bs = Number(orden.totalVES) || 0;
  const fecha = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(orden.createdAt));

  return [
    `Pedido ${orden.orderNumber} · ${fecha}`,
    `${empresa ? 'Razón social' : 'Nombre'}: ${nombre}`,
    documento ? `${empresa ? 'RIF' : 'Cédula'}: ${documento}` : null,
    orden.billingAddress ? `Domicilio fiscal: ${orden.billingAddress}` : null,
    orden.phone ? `Teléfono: ${orden.phone}` : null,
    orden.email ? `Correo: ${orden.email}` : null,
    '',
    ...orden.items.map((item) => `${item.quantity} × ${item.productName} · ${formatUSD(Number(item.priceUSD) || 0)} c/u · ${formatUSD(Number(item.totalUSD) || 0)}`),
    descuento > 0 ? `Descuento: -${formatUSD(descuento)}` : null,
    envio > 0 ? `Embalaje o delivery: ${formatUSD(envio)}` : null,
    '',
    ivaUSD > 0 ? `Base imponible: ${formatUSD(baseUSD)}` : null,
    ivaUSD > 0 ? `IVA: ${formatUSD(ivaUSD)}` : null,
    `Total: ${formatUSD(total)}`,
    tasa > 0 && bs > 0 ? `Tasa BCV: ${formatVES(tasa)} · Total: ${formatVES(bs)}` : null,
    orden.pago ? `Pago: ${orden.pago}` : null,
  ].filter((linea): linea is string => linea !== null).join('\n');
}
