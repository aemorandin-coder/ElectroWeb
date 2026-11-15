/**
 * C-227 · EL DESPACHO DEL ALIADO COMERCIAL
 * Lo que vende la tienda y despacha el proveedor desde su ciudad (C-199: la ferretería, desde La Victoria) le llega por
 * correo cuando el pago se confirma, nunca antes, con un enlace firmado y sin cuenta para "Lo estoy preparando" y la guía.
 * La guía deja la orden enviada y le avisa al cliente. El día del plazo (un día hábil después del pago, C-234), si no hay
 * guía, un recordatorio al proveedor y un aviso al equipo, una sola vez. Si la orden se cancela antes de la guía, "no la
 * despache". Las decisiones del equipo (14/11) están en PLAN.md §7.2 y el flujo en PROPUESTA_C227.md.
 *
 * El enlace es un HMAC del id de la orden y la hora del aviso: la base guarda solo su hash, y el recordatorio lo vuelve a
 * armar sin haberlo guardado. Al proveedor le llega lo que pide la guía y su costo; nunca el correo del cliente ni lo que pagó.
 */

import { createHash, createHmac } from 'node:crypto';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { getAdminAlertEmails } from '@/lib/admin-alerts';
import { emitAdminEvent } from '@/lib/admin-events';
import { createNotification } from '@/lib/notifications';
import { publicarOrdenes } from '@/lib/realtime/bus';
import { calendarioDe, enVenezuela, fechaDeSalida, fechaLarga, type Calendario } from '@/lib/horarios';
import { leerEmbalajeGuardado, renglonesEmbalaje } from '@/lib/embalaje';
import { NOMBRE_EMPRESA, urlRastreo, type EmpresaGuia } from '@/lib/envios/empresas';
import { problemaTransicion, transicionPermitida } from '@/lib/order-admin';
import { avisarClienteEnvio } from '@/lib/order-enviada';
import { slugEstado } from '@/lib/origen';
import { urlTienda } from '@/lib/email-templates/estilo';
import { fotoCorreo } from '@/lib/email-templates/marco';
import {
  correoCancelacionProveedor, correoRecordatorioProveedor, correoVentaProveedor, type DatosBienvenida, type DespachoCorreo,
} from '@/lib/email-templates/proveedores';

const DIA_MS = 24 * 60 * 60 * 1000;

/* ── El enlace firmado ──────────────────────────────────────────────────── */

function claveEnlaces(): Buffer {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('NEXTAUTH_SECRET no está configurado');
  return createHash('sha256').update(`proveedor-despacho:${secreto}`).digest();
}

/** 43 caracteres base64url. Sale de la orden y de la hora del aviso: el mismo aviso da siempre el mismo enlace */
export function tokenDeDespacho(orderId: string, avisoAt: Date): string {
  return createHmac('sha256', claveEnlaces()).update(`${orderId}.${avisoAt.getTime()}`).digest('base64url');
}

export const hashDeToken = (token: string) => createHash('sha256').update(`despacho:${token}`).digest('hex');
export const formatoDeToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
export const urlDeDespacho = (token: string) => `${urlTienda()}/proveedor/despacho/${token}`;

/* ── La orden y su proveedor ────────────────────────────────────────────── */

const seleccion = {
  id: true, orderNumber: true, userId: true, status: true, paymentStatus: true, paidAt: true, createdAt: true,
  deliveryMethod: true, shippingCarrier: true, shippingMode: true, shippingPaidBy: true, shippingAddress: true,
  shippingCity: true, shippingState: true, courierOfficeCode: true, courierOfficeName: true, courierOfficeAddress: true,
  recipientName: true, recipientIdNumber: true, recipientPhone: true, packagingPlan: true, dispatchCityCode: true,
  trackingNumber: true, proveedorAvisoAt: true, proveedorPreparandoAt: true, proveedorRecordatorioAt: true,
  user: { select: { name: true, email: true } },
  items: {
    select: {
      quantity: true, productName: true, productImage: true,
      product: {
        select: {
          name: true, mainImage: true, supplierSku: true, supplierName: true, costPerItem: true,
          supplier: {
            select: {
              id: true, name: true, contactName: true, contactEmail: true, contactWhatsapp: true, pricesIncludeTax: true,
              dispatchCityCode: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

type OrdenDespacho = Prisma.OrderGetPayload<{ select: typeof seleccion }>;
type ProveedorDespacho = NonNullable<OrdenDespacho['items'][number]['product']['supplier']>;

/** Pagada y sin salir: el proveedor todavía la puede despachar */
const ABIERTOS: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PAID, OrderStatus.PROCESSING];

/** El proveedor que despacha la orden: una orden por paquete y por ciudad de despacho desde C-199 */
function proveedorDe(o: OrdenDespacho): ProveedorDespacho | null {
  if (!o.dispatchCityCode) return null;
  return o.items.map((i) => i.product.supplier).find((s): s is ProveedorDespacho => Boolean(s && s.dispatchCityCode === o.dispatchCityCode)) ?? null;
}

/** null si se puede despachar; si no, por qué (lo que muestra su página) */
function motivoCerrada(o: Pick<OrdenDespacho, 'status' | 'paymentStatus'>): string | null {
  if (o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REFUNDED) return 'Esta orden se canceló: no la despache.';
  if (o.status === OrderStatus.DELIVERED) return 'El cliente ya recibió este pedido.';
  if (o.status === OrderStatus.SHIPPED) return 'Esta orden ya salió.';
  if (o.paymentStatus !== PaymentStatus.PAID) return 'Esta orden todavía no está pagada: no la despache.';
  return null;
}

interface AjustesDespacho { iva: number; calendario: Calendario }

async function ajustesDespacho(): Promise<AjustesDespacho> {
  const s = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { taxEnabled: true, taxPercent: true, horaCorte: true, diasCerrados: true, diasAbiertos: true },
  });
  return { iva: s?.taxEnabled === false ? 0 : Number(s?.taxPercent ?? 16), calendario: calendarioDe(s ?? {}) };
}

/** El último día para entregarlo en la agencia: un día hábil después del pago (decisión 5 del 14/11, con C-234) */
const plazoDe = (o: Pick<OrdenDespacho, 'paidAt' | 'createdAt'>, cal: Calendario) => fechaDeSalida(o.paidAt ?? o.createdAt, cal, 1);

/** Lo que va en sus correos y en su página: lo que pide la guía y su costo (DTO, sin objetos de Prisma) */
function aDespacho(o: OrdenDespacho, prov: ProveedorDespacho, aj: AjustesDespacho, url: string | null): DespachoCorreo {
  const puerta = o.shippingMode === 'DOOR';
  const plan = leerEmbalajeGuardado(o.packagingPlan);
  // Su lista trae el IVA (C-196b): el costo guardado va sin él, y él factura con él
  const factor = prov.pricesIncludeTax ? 1 + aj.iva / 100 : 1;
  return {
    proveedor: prov.name,
    contacto: prov.contactName,
    numero: o.orderNumber,
    pagadaEl: enVenezuela(o.paidAt ?? o.createdAt).fecha,
    plazo: plazoDe(o, aj.calendario),
    empresa: o.shippingCarrier ?? 'ZOOM',
    modo: puerta ? 'DOOR' : 'OFFICE',
    oficina: puerta ? null : { nombre: o.courierOfficeName ?? '', codigo: o.courierOfficeCode, direccion: o.courierOfficeAddress },
    ciudad: o.shippingCity,
    estado: o.shippingState,
    // Puerta a puerta, la guía pide la dirección (la decisión 2: "con lo que pide la guía")
    direccion: puerta ? o.shippingAddress : null,
    destinatario: { nombre: o.recipientName ?? '', cedula: o.recipientIdNumber ?? '', telefono: o.recipientPhone ?? '' },
    cobroADestino: o.shippingPaidBy !== 'STORE',
    productos: o.items
      .filter((i) => i.product.supplier?.id === prov.id)
      .map((i) => ({
        nombre: i.product.supplierName || i.productName || i.product.name,
        codigo: i.product.supplierSku,
        cantidad: i.quantity,
        costo: i.product.costPerItem === null ? null : Math.round(Number(i.product.costPerItem) * factor * 100) / 100,
        foto: fotoCorreo(i.productImage ?? i.product.mainImage, 128),
      })),
    ivaIncluido: prov.pricesIncludeTax && aj.iva > 0,
    empaque: plan ? { piezas: plan.piezas, pesoKg: plan.pesoKg, renglones: renglonesEmbalaje(plan) } : null,
    url,
  };
}

/** La copia al equipo (decisión 6: "con copia a los correos de avisos"), aparte: el proveedor no ve esos correos */
async function copiaAlEquipo(armar: () => Promise<{ asunto: string; html: string }>): Promise<void> {
  const equipo = await getAdminAlertEmails();
  if (equipo.length === 0) return;
  const { asunto, html } = await armar();
  await sendEmail({ to: equipo, subject: asunto, html }).catch((error) => console.error('Error enviando la copia del despacho al equipo:', error));
}

const nombreEmpresa = (empresa: string | null) => (empresa ? NOMBRE_EMPRESA[empresa as EmpresaGuia] ?? empresa : 'la empresa de envíos');

/* ── 1. "¡Se vendió su producto!" ───────────────────────────────────────── */

export type ResultadoAviso = 'enviado' | 'no-aplica' | 'sin-correo' | 'fallo';

/**
 * Al confirmarse el pago (al comprar con Pago Móvil verificado, o cuando el equipo lo confirma) y en el cron, por si no salió.
 * Una sola vez por orden: el primero que la reclama la envía. Solo órdenes con `dispatchCityCode` (las demás no aplican).
 */
export async function avisarVentaAlProveedor(orderId: string): Promise<ResultadoAviso> {
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, select: seleccion });
    if (!o || !o.dispatchCityCode || o.deliveryMethod !== 'SHIPPING' || o.proveedorAvisoAt || o.trackingNumber) return 'no-aplica';
    if (!ABIERTOS.includes(o.status) || o.paymentStatus !== PaymentStatus.PAID) return 'no-aplica';
    const prov = proveedorDe(o);
    if (!prov) return 'no-aplica';
    if (!prov.contactEmail) {
      emitAdminEvent({
        type: 'SUPPLIER_NO_CONTACT',
        title: `Avisar a ${prov.name} · ${o.orderNumber}`,
        summary: `Se vendió un producto que despacha ${prov.name} y no tiene correo de despacho: pásale el pedido por WhatsApp y carga su correo en Productos → Lista del proveedor.`,
        fields: [['Orden', o.orderNumber], ['Proveedor', prov.name], ['Va por', nombreEmpresa(o.shippingCarrier)]],
        link: '/admin/orders',
        throttleKey: `proveedor-sin-correo:${o.id}`,
        throttleMs: 20 * 60 * 60 * 1000,
      });
      return 'sin-correo';
    }
    const avisoAt = new Date();
    const token = tokenDeDespacho(o.id, avisoAt);
    const reclamada = await prisma.order.updateMany({
      where: { id: o.id, proveedorAvisoAt: null },
      data: { proveedorAvisoAt: avisoAt, proveedorTokenHash: hashDeToken(token) },
    });
    if (reclamada.count !== 1) return 'no-aplica';

    const aj = await ajustesDespacho();
    const datos = aDespacho(o, prov, aj, urlDeDespacho(token));
    const { asunto, html } = await correoVentaProveedor(datos);
    const envio = await sendEmail({ to: prov.contactEmail, subject: asunto, html });
    if (!envio.success) {
      // Lo vuelve a intentar el cron de los despachos (el enlace de este intento no llegó a nadie)
      await prisma.order.updateMany({ where: { id: o.id, proveedorAvisoAt: avisoAt }, data: { proveedorAvisoAt: null, proveedorTokenHash: null } });
      return 'fallo';
    }
    const para = prov.contactEmail;
    await copiaAlEquipo(() => correoVentaProveedor(datos, { para }));
    void publicarOrdenes([o.id]);
    return 'enviado';
  } catch (error) {
    console.error('Error avisando la venta al proveedor:', error);
    return 'fallo';
  }
}

/* ── 2. Su página: "Lo estoy preparando" y la guía ──────────────────────── */

async function ordenPorToken(token: string): Promise<OrdenDespacho | null> {
  if (!formatoDeToken(token)) return null;
  return prisma.order.findFirst({ where: { proveedorTokenHash: hashDeToken(token) }, select: seleccion });
}

export interface DespachoPublico {
  /** abierta: falta la guía; las demás ya no aceptan cambios */
  estado: 'abierta' | 'enviada' | 'entregada' | 'cancelada' | 'sin-pago';
  /** Por qué ya no se puede (el mismo texto que responde la API) */
  motivo: string | null;
  guia: string | null;
  preparando: boolean;
  datos: DespachoCorreo;
}

/** Lo que muestra /proveedor/despacho/[token]. null: el enlace no existe */
export async function despachoPorToken(token: string): Promise<DespachoPublico | null> {
  const o = await ordenPorToken(token);
  if (!o) return null;
  const prov = proveedorDe(o);
  if (!prov) return null;
  const aj = await ajustesDespacho();
  const estado: DespachoPublico['estado'] =
    o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REFUNDED ? 'cancelada'
      : o.status === OrderStatus.DELIVERED ? 'entregada'
        : o.status === OrderStatus.SHIPPED ? 'enviada'
          : o.paymentStatus !== PaymentStatus.PAID ? 'sin-pago' : 'abierta';
  return {
    estado,
    motivo: motivoCerrada(o),
    guia: o.trackingNumber,
    preparando: Boolean(o.proveedorPreparandoAt),
    datos: aDespacho(o, prov, aj, null),
  };
}

export type FalloDespacho = { ok: false; status: number; error: string };

/** "Lo estoy preparando": el panel lo ve en la orden y, si estaba pagada, pasa a "En preparación" (el cliente lo ve) */
export async function marcarPreparando(token: string): Promise<{ ok: true } | FalloDespacho> {
  const o = await ordenPorToken(token);
  if (!o) return { ok: false, status: 404, error: 'Este enlace no existe.' };
  const cerrada = motivoCerrada(o);
  if (cerrada) return { ok: false, status: 409, error: cerrada };
  if (o.proveedorPreparandoAt) return { ok: true };

  const ahora = new Date();
  const pasa = o.status !== OrderStatus.PROCESSING && transicionPermitida(o.status, OrderStatus.PROCESSING);
  const cambio = await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({
      where: { id: o.id, status: o.status, proveedorPreparandoAt: null, trackingNumber: null },
      data: { proveedorPreparandoAt: ahora, ...(pasa ? { status: OrderStatus.PROCESSING, processingAt: ahora } : {}) },
    });
    if (r.count === 1 && pasa) {
      await tx.shipmentEvent.create({
        data: { orderId: o.id, source: 'PROVEEDOR', statusCode: OrderStatus.PROCESSING, description: 'Estamos preparando tu pedido', occurredAt: ahora },
      });
    }
    return r.count === 1;
  });
  // Otro clic llegó primero: el resultado es el mismo
  if (!cambio) return { ok: true };
  void publicarOrdenes([o.id]);
  if (pasa && o.userId) {
    await createNotification({
      userId: o.userId,
      type: 'ORDER_CONFIRMED',
      title: 'Preparando tu Pedido',
      message: `Tu pedido #${o.orderNumber} está siendo preparado.`,
      link: '/customer/orders',
      icon: 'package',
    }).catch((error) => console.error('Error avisando al cliente que se prepara su pedido:', error));
  }
  return { ok: true };
}

const GUIA = /^[A-Z0-9][A-Z0-9 -]{3,39}$/;

/** La guía como la escribe el proveedor: sin espacios de más y en mayúsculas. null si no parece una guía */
export function limpiarGuia(texto: unknown): string | null {
  if (typeof texto !== 'string') return null;
  const guia = texto.trim().replace(/\s+/g, ' ').toUpperCase();
  return GUIA.test(guia) ? guia : null;
}

/**
 * La guía: la orden pasa a "Enviada" con la empresa que eligió el cliente, el historial lo dice y al cliente le llega
 * "va en camino" con su número (lo mismo que cuando la marca el panel). El rastreo de ZOOM sigue solo (C-100).
 */
export async function anotarGuia(token: string, escrita: unknown): Promise<{ ok: true; guia: string } | FalloDespacho> {
  const guia = limpiarGuia(escrita);
  if (!guia) return { ok: false, status: 400, error: 'Escriba el número de guía como sale en el recibo: letras, números y guiones (4 o más).' };
  const o = await ordenPorToken(token);
  if (!o) return { ok: false, status: 404, error: 'Este enlace no existe.' };
  if (o.trackingNumber) {
    return o.trackingNumber === guia ? { ok: true, guia } : { ok: false, status: 409, error: `Esta orden ya tiene la guía ${o.trackingNumber}.` };
  }
  const cerrada = motivoCerrada(o);
  if (cerrada) return { ok: false, status: 409, error: cerrada };
  const problema = transicionPermitida(o.status, OrderStatus.SHIPPED)
    ? problemaTransicion(o, OrderStatus.SHIPPED, { pagando: false, guia })
    : 'Esta orden ya no se puede marcar enviada.';
  if (problema) return { ok: false, status: 409, error: problema };

  const ahora = new Date();
  const empresa = nombreEmpresa(o.shippingCarrier);
  const anotada = await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({
      where: { id: o.id, status: o.status, trackingNumber: null },
      data: {
        status: OrderStatus.SHIPPED,
        shippedAt: ahora,
        trackingNumber: guia,
        trackingUrl: urlRastreo(o.shippingCarrier, guia),
        proveedorPreparandoAt: o.proveedorPreparandoAt ?? ahora,
      },
    });
    if (r.count !== 1) return false;
    await tx.shipmentEvent.create({
      data: { orderId: o.id, source: 'PROVEEDOR', statusCode: OrderStatus.SHIPPED, description: `Entregado a ${empresa} con la guía ${guia}`, occurredAt: ahora },
    });
    return true;
  });
  if (!anotada) return { ok: false, status: 409, error: 'La orden cambió mientras anotaba la guía. Recargue la página.' };

  void publicarOrdenes([o.id]);
  await avisarClienteEnvio({ ...o, trackingNumber: guia }).catch((error) => console.error('Error avisando al cliente su guía:', error));
  const prov = proveedorDe(o);
  emitAdminEvent({
    type: 'SUPPLIER_GUIDE_ADDED',
    title: `Guía anotada · ${o.orderNumber}`,
    summary: `${prov?.name ?? 'El proveedor'} anotó la guía de ${empresa}: la orden quedó enviada y el cliente recibió su correo.`,
    fields: [['Orden', o.orderNumber], ['Guía', guia], ['Va por', empresa]],
    link: '/admin/orders',
  });
  return { ok: true, guia };
}

/* ── 3. "Se canceló: no lo despache" ────────────────────────────────────── */

/** Al cancelar una orden que ya se le avisó y que todavía no tiene guía. El enlace deja de aceptar cambios solo */
export async function avisarCancelacionAlProveedor(orderId: string): Promise<void> {
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, select: seleccion });
    if (!o || !o.proveedorAvisoAt || o.trackingNumber || o.status !== OrderStatus.CANCELLED) return;
    const prov = proveedorDe(o);
    if (!prov?.contactEmail) return;
    const datos = aDespacho(o, prov, await ajustesDespacho(), null);
    const { asunto, html } = await correoCancelacionProveedor(datos);
    await sendEmail({ to: prov.contactEmail, subject: asunto, html });
    const para = prov.contactEmail;
    await copiaAlEquipo(() => correoCancelacionProveedor(datos, { para }));
  } catch (error) {
    console.error('Error avisando la cancelación al proveedor:', error);
  }
}

/* ── 4. El cron diario: los avisos que no salieron y los recordatorios ── */

/**
 * - Los avisos de los últimos 3 días que no salieron (el proveedor no tenía correo o el correo falló). Lo de antes del
 *   deploy lo sigue llevando el equipo a mano.
 * - El recordatorio: desde el día del plazo, sin guía, una sola vez, con un aviso al equipo.
 */
export async function revisarDespachos(ahora = new Date()): Promise<{ avisos: number; recordatorios: number }> {
  const aj = await ajustesDespacho();
  const hoy = enVenezuela(ahora).fecha;
  const base: Prisma.OrderWhereInput = {
    dispatchCityCode: { not: null },
    deliveryMethod: 'SHIPPING',
    paymentStatus: PaymentStatus.PAID,
    status: { in: ABIERTOS },
    trackingNumber: null,
  };

  const pendientes = await prisma.order.findMany({
    where: { ...base, proveedorAvisoAt: null, paidAt: { gte: new Date(ahora.getTime() - 3 * DIA_MS) } },
    select: { id: true },
    orderBy: { paidAt: 'asc' },
    take: 50,
  });
  let avisos = 0;
  for (const p of pendientes) if ((await avisarVentaAlProveedor(p.id)) === 'enviado') avisos++;

  const sinGuia = await prisma.order.findMany({
    where: { ...base, proveedorAvisoAt: { not: null }, proveedorRecordatorioAt: null },
    select: seleccion,
    orderBy: { paidAt: 'asc' },
    take: 50,
  });
  let recordatorios = 0;
  for (const o of sinGuia) {
    const plazo = plazoDe(o, aj.calendario);
    const prov = proveedorDe(o);
    if (hoy < plazo || !prov?.contactEmail || !o.proveedorAvisoAt) continue;
    const reclamada = await prisma.order.updateMany({ where: { id: o.id, proveedorRecordatorioAt: null }, data: { proveedorRecordatorioAt: ahora } });
    if (reclamada.count !== 1) continue;
    const datos = aDespacho(o, prov, aj, urlDeDespacho(tokenDeDespacho(o.id, o.proveedorAvisoAt)));
    const { asunto, html } = await correoRecordatorioProveedor(datos, hoy);
    await sendEmail({ to: prov.contactEmail, subject: asunto, html }).catch((error) => console.error('Error enviando el recordatorio al proveedor:', error));
    emitAdminEvent({
      type: 'SUPPLIER_DISPATCH_LATE',
      title: `Sin guía · ${o.orderNumber}`,
      summary: `${prov.name} todavía no anota la guía (el plazo es ${fechaLarga(plazo)}). Le llegó un recordatorio: escríbele${prov.contactWhatsapp ? ` por WhatsApp al ${prov.contactWhatsapp}` : ''}.`,
      fields: [['Orden', o.orderNumber], ['Proveedor', prov.name], ['Va por', nombreEmpresa(o.shippingCarrier)]],
      link: '/admin/orders',
    });
    recordatorios++;
  }
  return { avisos, recordatorios };
}

/* ── 5. La bienvenida (el botón del panel) ──────────────────────────────── */

/** Los datos de su bienvenida y a quién le llega. null si el proveedor no existe */
export async function datosBienvenida(supplierId: string): Promise<{ para: string | null; enviadaEl: Date | null; datos: DatosBienvenida } | null> {
  const s = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { name: true, contactName: true, contactEmail: true, dispatchStateName: true, bienvenidaAt: true },
  });
  if (!s) return null;
  const publicados = await prisma.product.count({ where: { supplierId, status: 'PUBLISHED', deletedAt: null } });
  return {
    para: s.contactEmail,
    enviadaEl: s.bienvenidaAt,
    datos: {
      proveedor: s.name,
      contacto: s.contactName,
      publicados,
      // La credencial dice desde cuándo: la primera bienvenida (reenviarla no cambia la fecha)
      desde: enVenezuela(s.bienvenidaAt ?? new Date()).fecha,
      enlaceCatalogo: s.dispatchStateName ? `${urlTienda()}/productos?desde=${slugEstado(s.dispatchStateName)}` : `${urlTienda()}/productos`,
      estado: s.dispatchStateName,
    },
  };
}
