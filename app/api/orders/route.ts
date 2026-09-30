import { NextRequest, NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import {
  createNotification,
  notifyOrderConfirmed,
  notifyOrderDelivered,
} from '@/lib/notifications';
import { emitAdminEvent } from '@/lib/admin-events';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { formatUSD, formatVES } from '@/lib/currency';
import { formatPaymentMethod } from '@/lib/format-helpers';
import { conditionBadge, warrantyDaysFor } from '@/lib/product-condition';
import { notifyStockCrossings } from '@/lib/stock-alerts';
import { OrderStatus, PaymentStatus, PaymentMethodType, Prisma } from '@prisma/client';
import {
  sendEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderPendingPaymentEmail
} from '@/lib/email-service';
import { generateOrderConfirmationEmail } from '@/lib/email-templates/OrderConfirmation';
import { generateReviewReminderEmail } from '@/lib/email-templates/ReviewReminder';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { orderBlockers, parseDeliveryMethod, parseOrderItems, quoteOrder, OrderInputError, type QuotedLine } from '@/lib/order-quote';
import { montoDecimal, type OrderGroupTotals } from '@/lib/pricing';
import {
  orderPatchSchema,
  problemaTransicion,
  transicionPermitida,
  estadosSiguientes,
  ETIQUETA_ESTADO,
  pideConfirmarPago,
  stockYaDescontado,
  devolverStock,
  liberarReservas,
  escaparHtml,
  MOTIVO_CANCELACION_MINIMO,
} from '@/lib/order-admin';
import { recordPaidOrder, rejectOrderConversions } from '@/lib/influencer-commission';
import { recordStudioOrder } from '@/lib/studio/tracking';
import { acreditarPagoSinOrden, pagoSinOrdenWhere } from '@/lib/pago-movil-sin-orden';
import { aCentimos, conciliar, montoBs, type Conciliacion } from '@/lib/pago-movil/monto';
import { STUDIO_COOKIE } from '@/lib/studio/code';
import { avisarPedidoDigitalPorEntregar } from '@/lib/digital-delivery';
import { DestinoError, leerDestino, type DestinoOrden } from '@/lib/envios/destino';
import { actualizarRastreoZoom } from '@/lib/envios/seguimiento';
import { customerOrderSelect } from '@/lib/dto/order';
import { publicarOrdenes, publicarStock } from '@/lib/realtime/bus';
import { ETIQUETA_ENTREGA, NOMBRE_EMPRESA, urlRastreo, usaEmpresa, type EmpresaGuia } from '@/lib/envios/empresas';


// GET - Get all orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    // Solo el equipo con MANAGE_ORDERS ve todas las órdenes. Antes bastaba no ser USER (un SUPPORT sin permiso las veía todas).
    // ?mine=1: el panel del cliente pide solo las propias aunque quien compra sea del equipo
    const esEquipo = isAuthorized(session, 'MANAGE_ORDERS') && searchParams.get('mine') !== '1';

    // PERFORMANCE: Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const all = searchParams.get('all') === 'true'; // For exports
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    // Cliente (o cuenta sin permiso de órdenes): solo las suyas
    if (!esEquipo) {
      where.userId = session.user.id;
    } else if (userId) {
      // Admin can filter by userId
      where.userId = userId;
    }

    if (status && status !== 'all') {
      where.status = status as Prisma.OrderWhereInput['status'];
    }

    // Count total for pagination
    const total = await prisma.order.count({ where });

    // El cliente recibe solo su lista blanca (C-100): sin notas internas ni costos de proveedor
    if (!esEquipo) {
      const orders = await prisma.order.findMany({
        where,
        select: customerOrderSelect,
        orderBy: { createdAt: 'desc' },
        ...(all ? {} : { take: limit, skip }),
      });

      // Guías ZOOM en camino: se consulta el rastreo después de responder; al volver a abrir ya se ve lo nuevo
      const enCamino = orders
        .filter((o) => o.status === 'SHIPPED' && o.shippingCarrier === 'ZOOM' && o.trackingNumber)
        .map((o) => o.id);
      if (enCamino.length > 0) {
        after(() => actualizarRastreoZoom({ orderIds: enCamino, intervaloMs: 30 * 60 * 1000 }).catch((error) => {
          console.error('Error actualizando el rastreo del cliente:', error);
        }));
      }

      return NextResponse.json({
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
      });
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                customerType: true,
                companyName: true,
                taxId: true,
                // C-126: datos de facturación en el detalle (antes solo nombre y correo)
                phone: true,
                idNumber: true,
              }
            }
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                mainImage: true,
                productType: true,
              },
            },
          },
        },
        shipmentEvents: { orderBy: { occurredAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      ...(all ? {} : { take: limit, skip }),
    });

    // C-126: los Pagos Móvil verificados de cada orden (referencia, banco, monto) para describir el pago
    const pagos = orders.length > 0
      ? await prisma.pagoMovilVerificacion.findMany({
          where: { orderId: { in: orders.map((o) => o.id) }, verificado: true },
          select: { orderId: true, referencia: true, bancoOrigen: true, importeVerificado: true, fechaPago: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];
    const pagosPorOrden = new Map<string, Array<{ referencia: string; bancoOrigen: string; importeBs: number; fechaPago: string; tasa: null }>>();
    for (const p of pagos) {
      if (!p.orderId) continue;
      const lista = pagosPorOrden.get(p.orderId) ?? [];
      lista.push({ referencia: p.referencia, bancoOrigen: p.bancoOrigen, importeBs: Number(p.importeVerificado ?? 0), fechaPago: p.fechaPago.toISOString(), tasa: null });
      pagosPorOrden.set(p.orderId, lista);
    }

    // C-126: las tarjetas del panel cuentan todas las órdenes, no solo la página cargada (antes: las últimas 25)
    const porEstado = await prisma.order.groupBy({ by: ['status'], where: userId ? { userId } : {}, _count: { _all: true } });
    const contar = (estados: string[]) => porEstado.filter((g) => estados.includes(g.status)).reduce((n, g) => n + g._count._all, 0);
    const summary = {
      total: porEstado.reduce((n, g) => n + g._count._all, 0),
      // Ingresos: solo lo cobrado (antes sumaba también las pendientes sin pagar)
      revenueUSD: Number((await prisma.order.aggregate({
        where: { ...(userId ? { userId } : {}), paymentStatus: 'PAID', status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        _sum: { totalUSD: true },
      }))._sum.totalUSD ?? 0),
      byStatus: Object.fromEntries(porEstado.map((g) => [g.status, g._count._all])),
      pending: contar(['PENDING']),
      inProgress: contar(['CONFIRMED', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED']),
      delivered: contar(['DELIVERED']),
    };

    // Return with pagination metadata
    return NextResponse.json({
      orders: orders.map((o) => ({ ...o, pagosMovil: pagosPorOrden.get(o.id) ?? [] })),
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Error al obtener órdenes' }, { status: 500 });
  }
}

// C-125: una compra se puede pagar con hasta 3 Pagos Móvil (el primero y lo que faltó)
const MAX_PAGOS_MOVIL_POR_COMPRA = 3;
const ORDER_NUMBER_RETRIES = 5;
const ACCEPTED_PAYMENT_METHODS: string[] = ['WALLET', ...Object.values(PaymentMethodType)];

type CreatedOrder = Prisma.OrderGetPayload<{
  include: { items: true; user: { select: { name: true; email: true } } };
}>;

interface OrderGroup {
  totals: OrderGroupTotals;
  lines: QuotedLine[];
  deliveryMethod: string;
  /** Solo la orden física: destino, destinatario y quién paga el flete (C-100) */
  destino: DestinoOrden | null;
  shippingPaidBy: string | null;
  tag: string;
}

// ORD-{año}-{secuencia}. Se llama dentro de la transacción. El advisory lock serializa la creación
// de órdenes hasta el commit, así dos compras simultáneas no leen la misma secuencia; si aun así
// chocan (p. ej. una orden creada por otra vía), el @unique falla y el POST reintenta.
async function getNextOrderSequence(tx: Prisma.TransactionClient, year: number): Promise<number> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(7426001)::text AS locked`;
  const rows = await tx.$queryRaw<Array<{ max: number | null }>>`
    SELECT MAX(CAST(split_part("orderNumber", '-', 3) AS INTEGER)) AS max
    FROM "orders"
    WHERE "orderNumber" LIKE ${`ORD-${year}-%`}
      AND split_part("orderNumber", '-', 3) ~ '^[0-9]{1,9}$'
  `;
  return Number(rows[0]?.max ?? 0) + 1;
}

function isOrderNumberConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
    && String(error.meta?.target ?? '').includes('orderNumber');
}

const DELIVERY_LABELS = ETIQUETA_ENTREGA;

async function sendNewOrderNotifications(order: CreatedOrder, userId: string, paymentMethod: string) {
  await notifyOrderConfirmed(userId, order.orderNumber, order.id);

  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const products = order.items.slice(0, 4).map((item) => `${item.productName || 'Producto'} x${item.quantity}`).join(', ')
    + (order.items.length > 4 ? ` y ${order.items.length - 4} más` : '');
  emitAdminEvent({
    type: 'ORDER_CREATED',
    title: `Nueva venta · ${order.orderNumber}`,
    summary: `${order.user?.name || order.user?.email || 'Un cliente'} compró ${units} ${units === 1 ? 'producto' : 'productos'}`,
    fields: [
      ['Total', `${formatUSD(Number(order.totalUSD))} (${formatVES(Number(order.totalVES))})`],
      ['Pago', `${formatPaymentMethod(paymentMethod)} · ${order.paymentStatus === 'PAID' || paymentMethod === 'WALLET' ? 'confirmado' : 'por verificar'}`],
      ['Entrega', DELIVERY_LABELS[order.deliveryMethod || ''] || order.deliveryMethod],
      ['Productos', products],
      ['Cliente', order.user?.email],
    ],
    link: '/admin/orders',
  });

  if (paymentMethod === 'WALLET') {
    await createNotification({
      userId,
      type: 'ORDER_PAID',
      title: 'Pago Confirmado',
      message: `El pago de tu orden #${order.orderNumber} quedó pagado con tus Puntos ES.`,
      link: `/customer/orders`,
      icon: 'payment'
    });
  }

  try {
    const companySettings = await prisma.companySettings.findFirst();

    const emailHtml = generateOrderConfirmationEmail({
      companyName: companySettings?.companyName || 'Electro Shop',
      companyLogo: companySettings?.logo || undefined,
      orderNumber: order.orderNumber,
      customerName: order.user?.name || 'Cliente',
      orderDate: format(new Date(order.createdAt), "d 'de' MMMM, yyyy", { locale: es }),
      items: order.items.map(item => ({
        name: item.productName || 'Producto',
        quantity: item.quantity,
        price: item.priceUSD.toString(),
        // C-121: lo que guardó el pedido al vender (C-119), igual que "Mis pedidos"
        condition: conditionBadge(item.productCondition, item.conditionGrade),
        warrantyDays: warrantyDaysFor(item.productCondition, item.warrantyDays),
      })),
      subtotal: order.subtotalUSD.toString(),
      discount: order.discountUSD.toString(),
      shipping: order.shippingUSD.toString(),
      tax: order.taxUSD.toString(),
      total: order.totalUSD.toString(),
      currency: 'USD',
      paymentMethod: formatPaymentMethod(order.paymentMethod),
      paid: order.paymentStatus === 'PAID',
      deliveryMethod: DELIVERY_LABELS[order.deliveryMethod || ''] || 'Entrega',
      deliveryAddress: order.shippingAddress || undefined,
    });

    await sendEmail({
      to: order.user?.email || '',
      subject: `Confirmación de Pedido - ${order.orderNumber}`,
      html: emailHtml,
    });

    // Si el pago no es con billetera, también se envía el correo de pago pendiente
    if (paymentMethod !== 'WALLET' && order.user?.email) {
      try {
        await sendOrderPendingPaymentEmail(order.user.email, {
          orderNumber: order.orderNumber,
          total: Number(order.totalUSD),
          customerName: order.user.name || 'Cliente',
        });
      } catch (pendingEmailError) {
        console.error('Error sending pending payment email:', pendingEmailError);
      }
    }
  } catch (emailError) {
    console.error('Error sending order confirmation email:', emailError);
    // No se falla la creación de la orden si el correo falla
  }
}

// POST - Create new order
// Contrato: { items: [{ productId, quantity, digitalVariantId?, digitalAmount?, digitalUsername? }], deliveryMethod,
//   shipping?: { carrier, mode, state, cityCode, city, officeCode, address, reference, recipient: { name, idNumber, phone } },
//   paymentMethod, mobilePaymentData?, notes?, expectedTotalUSD? }
// C-100: la dirección legible y los datos de la oficina los arma el servidor (lib/envios/destino.ts).
// Precios, envío, descuentos, total y dueño de la orden se calculan aquí; el resto del body se ignora.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // SEGURIDAD: el dueño de la orden y el saldo que se descuenta salen siempre de la sesión
    const userId = session.user.id;

    // Rate limiting - sensitive for order creation
    const rateLimit = checkRateLimit(userId, 'orders:create', RATE_LIMITS.SENSITIVE);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Has realizado demasiadas operaciones. Espera unos minutos.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.SENSITIVE)
        }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }

    // C-85: teléfono y cédula se piden en la primera compra (el registro ya no pide la cédula y Google no trae ninguno)
    const perfil = await prisma.profile.findUnique({ where: { userId }, select: { phone: true, idNumber: true } });
    if (!perfil?.phone?.trim() || !perfil?.idNumber?.trim()) {
      return NextResponse.json(
        { error: 'Completa tu teléfono y tu cédula antes de hacer el pedido.', field: 'datos-cliente' },
        { status: 400 }
      );
    }

    const items = parseOrderItems(body.items);
    const deliveryMethod = parseDeliveryMethod(body.deliveryMethod);

    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : '';
    if (!ACCEPTED_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : '';

    // Pago Móvil de compra ya verificado por el banco y todavía libre (sin orden ni crédito). C-114: si la orden no se
    // puede crear, ese dinero ya entró: o pasa al saldo del cliente (rechazo definitivo) o sigue libre para reintentar.
    const mobilePaymentData = (body.mobilePaymentData && typeof body.mobilePaymentData === 'object'
      ? body.mobilePaymentData
      : {}) as Record<string, unknown>;
    // C-125: `referencias` trae todos los Pagos Móvil de esta compra (el primero y lo que faltó); `referencia` sigue
    // valiendo para un solo pago
    const referencias = [...new Set(
      [mobilePaymentData.referencia, ...(Array.isArray(mobilePaymentData.referencias) ? mobilePaymentData.referencias : [])]
        .filter((r): r is string => typeof r === 'string' && r.trim() !== '')
        .map((r) => r.trim())
    )].slice(0, MAX_PAGOS_MOVIL_POR_COMPRA);
    const referencia = referencias[0] ?? '';
    const pagosLibres = paymentMethod === 'MOBILE_PAYMENT' && referencias.length > 0
      ? (await prisma.pagoMovilVerificacion.findMany({
          where: { userId, referencia: { in: referencias }, ...pagoSinOrdenWhere },
          orderBy: { createdAt: 'desc' },
        })).filter((v, i, todos) => todos.findIndex((w) => w.referencia === v.referencia) === i)
      : [];
    const pagoLibre = pagosLibres[0] ?? null;
    const refsTexto = pagosLibres.map((v) => v.referencia).join(', ');

    /** Rechazo que no se arregla reintentando: los Pagos Móvil ya verificados pasan al saldo del cliente */
    const rechazoDefinitivo = async (error: string, details?: string[]) => {
      if (pagosLibres.length === 0) return NextResponse.json({ error, details }, { status: 400 });
      let creditedUSD = 0;
      for (const pago of pagosLibres) {
        const credito = await acreditarPagoSinOrden(pago.id, [error, ...(details ?? [])].join(' ').slice(0, 300));
        if (credito.ok) creditedUSD += credito.montoUSD;
      }
      if (!(creditedUSD > 0)) return NextResponse.json({ error, details }, { status: 400 });
      return NextResponse.json(
        {
          error: `No pudimos crear tu pedido: ${[error, ...(details ?? [])].join(' ')} Tu Pago Móvil no se perdió: pasamos ${formatUSD(creditedUSD)} a tus Puntos ES para que los uses en tu compra.`,
          creditedUSD,
        },
        { status: 400 }
      );
    };
    /** Rechazo que el cliente corrige y vuelve a confirmar: el pago sigue libre para esta misma compra */
    const conPagoRegistrado = (error: string) =>
      pagoLibre ? `${error} Tu Pago Móvil (ref. ${refsTexto}) quedó registrado: corrige y confirma de nuevo con la misma referencia.` : error;

    // C-102: cupón escrito o elegido en la ficha; el servidor lo valida de nuevo al cobrar
    const couponCode = typeof body.couponCode === 'string' && body.couponCode.trim() ? body.couponCode.trim().slice(0, 40) : null;
    const quote = await quoteOrder(userId, items, deliveryMethod, couponCode);
    const { calculation, settings } = quote;

    if (quote.errors.length > 0) {
      return rechazoDefinitivo('Hay problemas con los productos de tu carrito.', quote.errors);
    }

    // C-114: montos mínimo y máximo y formas de entrega apagadas. La cotización ya los muestra y el checkout no deja
    // pagar mientras haya alguno: si igual llegan aquí (la regla cambió en medio), el pago pasa al saldo.
    const blockers = orderBlockers(calculation, settings, deliveryMethod);
    if (blockers.length > 0) {
      return rechazoDefinitivo(blockers[0], blockers.slice(1));
    }

    // C-100: destino y destinatario validados aquí (la oficina sale de la lista de ZOOM o MRW, no del navegador)
    let destino: DestinoOrden | null = null;
    if (calculation.physical) {
      try {
        destino = await leerDestino(body.shipping, deliveryMethod);
      } catch (destinoError) {
        if (destinoError instanceof DestinoError) {
          return NextResponse.json({ error: conPagoRegistrado(destinoError.message), field: destinoError.field }, { status: 400 });
        }
        throw destinoError;
      }
    }

    // Si el total que vio el cliente no coincide (precio o envío cambiaron), no se cobra nada:
    // se devuelve el cálculo actualizado para que lo revise y confirme de nuevo.
    if (typeof body.expectedTotalUSD === 'number' && Math.abs(body.expectedTotalUSD - calculation.totalUSD) > 0.01) {
      return NextResponse.json(
        {
          error: conPagoRegistrado(quote.coupon && !quote.coupon.applied && quote.coupon.message
            ? `${quote.coupon.message} Revisa el resumen actualizado y confirma de nuevo.`
            : 'El total de tu compra cambió. Revisa el resumen actualizado y confirma de nuevo.'),
          calculation,
          coupon: quote.coupon,
        },
        { status: 409 }
      );
    }

    // =============================================
    // SEGURIDAD: Verificar pago móvil en servidor
    // =============================================
    // NUNCA confiar en body.mobilePaymentData.verified del cliente: la verificación debe existir
    // en la base de datos, no estar usada y cubrir el total calculado aquí.
    const exchangeRateVES = settings?.exchangeRateVES ? Number(settings.exchangeRateVES) : 0;

    let mobilePaymentVerificationIds: string[] = [];
    let isPaymentConfirmed = paymentMethod === 'WALLET';
    /** C-125: cómo cuadró el Pago Móvil con el total (exacto, redondeo, de más). Null si no hubo */
    let conciliacion: Conciliacion | null = null;

    if (paymentMethod === 'MOBILE_PAYMENT' && referencia) {
      // Solo verificaciones libres: sin orden y sin haberse pasado al saldo (C-114)
      if (pagosLibres.length > 0) {
        // Cada pago vale en USD a SU tasa congelada (la de la cotización que vio el cliente). Antes se comparaba con la
        // tasa del momento de crear la orden y un 1 % de margen: con la tasa nueva, un pago exacto podía "no alcanzar"
        const tasaConciliacion = Number(pagoLibre?.tasaVES ?? 0) || exchangeRateVES;
        const pagadoBs = aCentimos(pagosLibres.reduce((suma, v) => {
          const tasa = Number(v.tasaVES ?? 0) || exchangeRateVES;
          return suma + (tasa > 0 ? (Number(v.importeVerificado ?? 0) / tasa) * tasaConciliacion : 0);
        }, 0)) / 100;
        conciliacion = tasaConciliacion > 0 ? conciliar(pagadoBs, calculation.totalUSD, tasaConciliacion) : null;

        if (conciliacion && conciliacion.estado !== 'FALTA') {
          isPaymentConfirmed = true;
          mobilePaymentVerificationIds = pagosLibres.map((v) => v.id);
        } else {
          // C-125: pago incompleto. Antes se creaba la orden "pendiente" con el pago adentro y el dinero quedaba
          // trabado hasta que alguien la revisara. Ahora no se crea: el pago sigue libre y el cliente paga lo que falta
          console.warn(`[PAGO MOVIL] ${refsTexto} no cubre el total (Bs. ${pagadoBs} de Bs. ${conciliacion?.esperadoBs ?? '?'}) - usuario ${userId}`);
          return NextResponse.json(
            {
              error: conciliacion
                ? `Recibimos ${formatVES(conciliacion.pagadoBs)} y el total es ${formatVES(conciliacion.esperadoBs)}. Te faltan ${formatVES(-conciliacion.diferenciaBs)}: haz otro Pago Móvil por esa diferencia y verifícalo. Lo que ya pagaste queda registrado.`
                : 'No pudimos confirmar el monto de tu pago porque falta la tasa de la tienda. Escríbenos por WhatsApp.',
              pagoIncompleto: conciliacion
                ? { faltaBs: -conciliacion.diferenciaBs, faltaUSD: -conciliacion.diferenciaUSD, pagadoBs: conciliacion.pagadoBs, esperadoBs: conciliacion.esperadoBs, tasa: tasaConciliacion, referencias: pagosLibres.map((v) => v.referencia) }
                : null,
            },
            { status: 402 }
          );
        }
      } else {
        console.warn(`[SECURITY] Intento de orden con pago móvil no verificado: ${referencia} por usuario ${userId}`);
      }
    }
    /** Pagó de más (fuera del redondeo): la diferencia pasa a su saldo en USD a la tasa congelada del pago */
    const sobranteUSD = conciliacion?.estado === 'SOBREPAGO' ? conciliacion.diferenciaUSD : 0;

    // Unidades físicas por producto (para descontar stock o reservarlo)
    const physicalQuantities = new Map<string, number>();
    for (const line of quote.lines) {
      if (line.productType !== 'DIGITAL') {
        physicalQuantities.set(line.productId, (physicalQuantities.get(line.productId) ?? 0) + line.quantity);
      }
    }

    const discountRequestIds = [...new Set(
      quote.lines.map(line => line.discountRequestId).filter((id): id is string => id !== null)
    )];

    // La compra se divide en una orden física (con envío) y una digital, como hasta ahora
    const groups: OrderGroup[] = [];
    if (calculation.physical) {
      groups.push({
        totals: calculation.physical,
        lines: quote.lines.filter(line => line.productType !== 'DIGITAL'),
        deliveryMethod,
        destino,
        shippingPaidBy: calculation.shipping.paidBy,
        tag: '[Productos Físicos]',
      });
    }
    if (calculation.digital) {
      groups.push({
        totals: calculation.digital,
        lines: quote.lines.filter(line => line.productType === 'DIGITAL'),
        deliveryMethod: 'DIGITAL',
        destino: null,
        shippingPaidBy: null,
        tag: '[Productos Digitales]',
      });
    }

    const createOrders = () => prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      let sequence = await getNextOrderSequence(tx, year);
      const orderNumbers = groups.map(() => `ORD-${year}-${String(sequence++).padStart(4, '0')}`);

      // Pago con billetera: se descuenta el total del servidor solo si el saldo alcanza (atómico)
      let balanceId: string | null = null;
      if (paymentMethod === 'WALLET') {
        const userBalance = await tx.userBalance.findUnique({
          where: { userId },
          select: { id: true },
        });

        const debited = userBalance
          ? await tx.userBalance.updateMany({
            // Montos como texto exacto (C-96): con number, un total de 9,45 llegaba como 9.449999999999999
            where: { id: userBalance.id, balance: { gte: montoDecimal(calculation.totalUSD) } },
            data: {
              balance: { decrement: montoDecimal(calculation.totalUSD) },
              totalSpent: { increment: montoDecimal(calculation.totalUSD) },
            },
          })
          : { count: 0 };

        if (!userBalance || debited.count === 0) {
          throw new OrderInputError('No te alcanzan los Puntos ES para esta compra');
        }
        balanceId = userBalance.id;
      }

      const orders: CreatedOrder[] = [];

      for (const [index, group] of groups.entries()) {
        const orderNumber = orderNumbers[index];
        const { totals } = group;

        if (balanceId) {
          await tx.transaction.create({
            data: {
              balanceId,
              type: 'PURCHASE',
              status: 'COMPLETED',
              amount: montoDecimal(totals.totalUSD),
              currency: 'USD',
              description: `Compra Orden #${orderNumber}`,
              reference: orderNumber,
              paymentMethod: 'WALLET',
            },
          });
        }

        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            deliveryMethod: group.deliveryMethod,
            ...(group.destino ?? { shippingAddress: '' }),
            shippingPaidBy: group.shippingPaidBy,
            subtotalUSD: montoDecimal(totals.subtotalUSD),
            taxUSD: montoDecimal(totals.taxUSD),
            shippingUSD: montoDecimal(totals.shippingUSD),
            discountUSD: montoDecimal(totals.discountUSD),
            totalUSD: montoDecimal(totals.totalUSD),
            exchangeRate: 1,
            // C-125: los mismos céntimos que se le cotizaron (montoDecimal redondeaba 37,595 a 37,59)
            totalVES: exchangeRateVES > 0 ? montoBs(totals.totalUSD, exchangeRateVES).toFixed(2) : 0,
            exchangeRateVES: settings?.exchangeRateVES ?? null,
            exchangeRateEUR: settings?.exchangeRateEUR ?? null,
            paymentMethod,
            // WALLET y MOBILE_PAYMENT verificado (en BD y por monto) se tratan como pagados
            status: isPaymentConfirmed ? OrderStatus.PROCESSING : OrderStatus.PENDING,
            paymentStatus: isPaymentConfirmed ? PaymentStatus.PAID : PaymentStatus.PENDING,
            paidAt: isPaymentConfirmed ? new Date() : null,
            notes: notes ? `${notes} ${group.tag}` : group.tag,
            items: {
              create: group.lines.map(line => ({
                productId: line.productId,
                productName: line.name,
                productSku: line.productSku,
                productImage: line.productImage,
                priceUSD: montoDecimal(line.unitPriceUSD),
                quantity: line.quantity,
                totalUSD: montoDecimal(line.unitPriceUSD * line.quantity),
                digitalVariantId: line.digitalVariantId,
                digitalVariantLabel: line.digitalVariantLabel,
                digitalAccount: line.digitalAccount,
                // C-119: copia de cómo se vendió; la garantía del cliente no cambia si después se edita el producto
                productCondition: line.productCondition,
                conditionGrade: line.conditionGrade,
                warrantyDays: line.warrantyDays,
              })),
            },
          },
          include: {
            items: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        orders.push(order);
      }

      // STOCK SEGÚN EL PAGO:
      // - Confirmado (WALLET o pago móvil verificado): se descuenta ya, solo si alcanza
      // - Sin confirmar: reserva de 5 minutos mientras el admin verifica el pago
      if (isPaymentConfirmed) {
        for (const [productId, quantity] of physicalQuantities) {
          const updated = await tx.product.updateMany({
            where: { id: productId, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          if (updated.count === 0) {
            throw new OrderInputError('Uno de los productos se agotó mientras procesábamos tu compra. Revisa tu carrito.');
          }
        }
      } else {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutos de reservación

        for (const [productId, quantity] of physicalQuantities) {
          await tx.stockReservation.create({
            data: { userId, productId, quantity, expiresAt },
          });
        }
      }

      // Descuentos aprobados que el servidor aplicó
      if (discountRequestIds.length > 0) {
        const used = await tx.discountRequest.updateMany({
          where: {
            id: { in: discountRequestIds },
            userId,
            status: 'APPROVED',
          },
          data: {
            status: 'USED',
            usedAt: new Date(),
          },
        });
        if (used.count !== discountRequestIds.length) {
          throw new OrderInputError('Uno de tus descuentos ya fue usado. Revisa el resumen y confirma de nuevo.');
        }
      }

      // Ofertas y cupones usados (C-102): una fila por promoción y orden con lo que ahorró el cliente.
      // Los topes (total y por cliente) se revisan aquí, dentro de la transacción: dos compras a la vez no pasan del tope.
      for (const [index, group] of groups.entries()) {
        const usos = new Map<string, number>();
        for (const line of group.lines) {
          if (line.promotionId && line.promotionSavingsUSD > 0) usos.set(line.promotionId, (usos.get(line.promotionId) ?? 0) + line.promotionSavingsUSD);
        }
        for (const [promotionId, amountUSD] of usos) {
          const promo = await tx.promotion.findUnique({
            where: { id: promotionId },
            select: { isActive: true, endsAt: true, maxUses: true, maxUsesPerUser: true },
          });
          if (!promo || !promo.isActive || (promo.endsAt && promo.endsAt <= new Date())) {
            throw new OrderInputError('Una oferta de tu carrito acaba de terminar. Revisa el resumen y confirma de nuevo.');
          }
          if (promo.maxUsesPerUser !== null) {
            const usados = await tx.promotionRedemption.count({ where: { promotionId, userId } });
            if (usados >= promo.maxUsesPerUser) throw new OrderInputError('Ya usaste este cupón en otra compra.');
          }
          const sumado = await tx.promotion.updateMany({
            where: { id: promotionId, ...(promo.maxUses !== null ? { usesCount: { lt: promo.maxUses } } : {}) },
            data: { usesCount: { increment: 1 } },
          });
          if (sumado.count === 0) throw new OrderInputError('Una oferta de tu carrito se agotó. Revisa el resumen y confirma de nuevo.');
          await tx.promotionRedemption.create({
            data: { promotionId, orderId: orders[index].id, userId, amountUSD: montoDecimal(amountUSD) },
          });
        }
      }

      // SEGURIDAD: Vincular los Pagos Móvil con la orden para prevenir reutilización (todos o ninguno)
      if (mobilePaymentVerificationIds.length > 0) {
        const linked = await tx.pagoMovilVerificacion.updateMany({
          where: { id: { in: mobilePaymentVerificationIds }, orderId: null, transactionId: null, archivadoEn: null },
          data: { orderId: orders[0].id },
        });
        if (linked.count !== mobilePaymentVerificationIds.length) {
          throw new OrderInputError('Este pago móvil ya fue usado en otra orden');
        }
      }

      // C-125: lo que pagó de más va a su saldo en la misma transacción (el dinero nunca sale de la empresa: decisión
      // de Andrés del 28/09 para los Pagos Móvil sin orden). Lo absorbido por redondeo queda anotado en la orden
      if (conciliacion && conciliacion.estado !== 'EXACTO') {
        const nota = conciliacion.estado === 'SOBREPAGO'
          ? `Pago Móvil: pagó ${formatVES(conciliacion.diferenciaBs)} de más (${formatVES(conciliacion.pagadoBs)} de ${formatVES(conciliacion.esperadoBs)}). ${formatUSD(sobranteUSD)} pasaron a sus Puntos ES.`
          : `Pago Móvil: diferencia de ${formatVES(conciliacion.diferenciaBs)} absorbida (menor que la comisión mínima de un Pago Móvil; ${formatVES(conciliacion.pagadoBs)} de ${formatVES(conciliacion.esperadoBs)}).`;
        await tx.order.update({ where: { id: orders[0].id }, data: { adminNotes: nota } });
      }
      if (sobranteUSD > 0) {
        const balance = await tx.userBalance.upsert({ where: { userId }, create: { userId }, update: {}, select: { id: true } });
        await tx.transaction.create({
          data: {
            balanceId: balance.id,
            type: 'REFUND',
            status: 'COMPLETED',
            amount: montoDecimal(sobranteUSD),
            currency: 'USD',
            description: `Pagaste de más en ${orders[0].orderNumber} (ref. ${refsTexto}): pasado a tus Puntos ES`,
            reference: referencia,
            paymentMethod: 'MOBILE_PAYMENT',
            metadata: JSON.stringify({ sobrepago: true, orderId: orders[0].id, orderNumber: orders[0].orderNumber, pagoMovilVerificacionIds: mobilePaymentVerificationIds, conciliacion }),
          },
        });
        await tx.userBalance.update({ where: { id: balance.id }, data: { balance: { increment: montoDecimal(sobranteUSD) } } });
      }

      return orders;
    }, { maxWait: 10000, timeout: 15000 });

    let orders: CreatedOrder[] = [];
    for (let attempt = 1; ; attempt++) {
      try {
        orders = await createOrders();
        break;
      } catch (error) {
        // C-114: la orden falló después de un Pago Móvil ya verificado. Si se agotó un producto no hay reintento
        // posible: el pago pasa al saldo. Si cambió una oferta o un descuento, el cliente confirma de nuevo con el mismo pago.
        if (error instanceof OrderInputError && pagoLibre) {
          if (error.message.startsWith('Uno de los productos se agotó')) return rechazoDefinitivo(error.message);
          if (error.message.startsWith('Este pago móvil ya fue usado')) return NextResponse.json({ error: error.message }, { status: error.status });
          return NextResponse.json({ error: conPagoRegistrado(error.message), details: error.details }, { status: error.status });
        }
        if (!isOrderNumberConflict(error) || attempt >= ORDER_NUMBER_RETRIES) throw error;
      }
    }

    if (sobranteUSD > 0 && conciliacion) {
      void createNotification({
        userId,
        type: 'BALANCE_RECHARGED',
        title: 'Pagaste de más: lo pasamos a tus Puntos ES',
        message: `En tu pedido ${orders[0].orderNumber} transferiste ${formatVES(conciliacion.diferenciaBs)} de más. Ya tienes ${formatUSD(sobranteUSD)} en tus Puntos ES para tu próxima compra.`,
        link: '/customer/balance',
      });
    }

    // C-127: la orden nueva aparece sola en el panel; si ya se descontó stock, la ficha muestra lo que queda
    void publicarOrdenes(orders.map((order) => order.id), { nueva: true });
    if (isPaymentConfirmed) void publicarStock([...physicalQuantities.keys()]);

    // ElectroStudio (C-113): la persona llegó por una historia de Instagram en los últimos 7 días
    void recordStudioOrder(request.cookies.get(STUDIO_COOKIE)?.value, orders.map((order) => order.id), userId);

    // Comisión de promotor solo si la orden ya nació pagada (saldo o pago móvil verificado).
    // Las demás la generan cuando el admin confirma el pago (C-75).
    if (isPaymentConfirmed) {
      const { recordPaidOrder } = await import('@/lib/influencer-commission');
      for (const order of orders) {
        recordPaidOrder(order.id).catch(() => {});
      }
    }

    // Nota: las reservas de pagos sin confirmar no se borran aquí; expiran solas
    // o se eliminan cuando el admin confirma el pago y se descuenta el stock.

    // Notificaciones fuera de la transacción para que un fallo no afecte la compra
    for (const order of orders) {
      await sendNewOrderNotifications(order, userId, paymentMethod);
    }
    // Pagada al crearla (saldo o Pago Móvil verificado): si trae digitales, el equipo tiene que enviarlos (C-60b)
    if (isPaymentConfirmed) {
      for (const order of orders) void avisarPedidoDigitalPorEntregar(order.id);
    }

    // Stock descontado ya (pago confirmado): aviso si algún producto quedó bajo o agotado
    if (isPaymentConfirmed) {
      notifyStockCrossings([...physicalQuantities].map(([productId, quantity]) => ({ productId, quantity })))
        .catch((error) => console.error('Error enviando avisos de stock:', error));
    }

    return NextResponse.json({ orders, totalUSD: calculation.totalUSD, ...(sobranteUSD > 0 ? { creditedUSD: sobranteUSD, sobrepago: true } : {}) }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
    }
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Error al crear la orden. Intenta de nuevo.' }, { status: 500 });
  }
}

/** Lo que queda en el historial del envío cuando el panel cambia el estado (C-100). */
function descripcionEventoPanel(
  estado: OrderStatus,
  orden: { deliveryMethod: string | null; shippingCarrier: string | null; trackingNumber: string | null }
): string | null {
  switch (estado) {
    case OrderStatus.PROCESSING:
      return 'Estamos preparando tu pedido';
    case OrderStatus.READY_FOR_PICKUP:
      return 'Listo para retirar en la tienda';
    case OrderStatus.SHIPPED: {
      if (orden.deliveryMethod === 'LOCAL_DELIVERY') return 'Salió a entregar en Guanare';
      if (!usaEmpresa(orden.deliveryMethod)) return 'Pedido enviado';
      const empresa = orden.shippingCarrier ? NOMBRE_EMPRESA[orden.shippingCarrier as EmpresaGuia] ?? orden.shippingCarrier : 'la empresa de envíos';
      return `Entregado a ${empresa}${orden.trackingNumber ? ` con la guía ${orden.trackingNumber}` : ''}`;
    }
    case OrderStatus.DELIVERED:
      return 'Pedido entregado';
    case OrderStatus.CANCELLED:
      return 'Pedido cancelado';
    default:
      return null;
  }
}

// PATCH - El panel cambia el estado de una orden (C-74)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_ORDERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Lista blanca: el body ya no se copia entero a la orden (antes se podía cambiar totalUSD o userId)
    const parseado = orderPatchSchema.safeParse(await request.json());
    if (!parseado.success) {
      const problema = parseado.error.issues[0];
      const campo = problema?.path.join('.') || 'body';
      const campoConocido = ['shippingCarrier', 'trackingNumber', 'trackingUrl', 'notes', 'adminNotes', 'shippingNotes', 'estimatedDelivery'].includes(campo);
      return NextResponse.json(
        { error: campoConocido && problema?.message ? problema.message : `No se puede cambiar "${campo}" desde el panel.`, detalle: problema?.message },
        { status: 400 }
      );
    }
    const patch = parseado.data;

    const resultado = await prisma.$transaction(async (tx) => {
      const orden = await tx.order.findUnique({
        where: { id },
        include: { items: true, user: { select: { name: true, email: true } } },
      });
      if (!orden) return { tipo: 'no-encontrada' as const };

      // Máquina de estados: ni saltos hacia atrás ni cancelar dos veces
      const esTerminal = orden.status === OrderStatus.CANCELLED || orden.status === OrderStatus.REFUNDED;
      if (patch.status && (!transicionPermitida(orden.status, patch.status) || (esTerminal && patch.status === orden.status))) {
        return {
          tipo: 'transicion-invalida' as const,
          repetida: esTerminal && patch.status === orden.status,
          desde: ETIQUETA_ESTADO[orden.status],
          hasta: ETIQUETA_ESTADO[patch.status],
          permitidos: estadosSiguientes(orden.status).map((e) => ETIQUETA_ESTADO[e]),
        };
      }

      const cancelando = patch.status === OrderStatus.CANCELLED && orden.status !== OrderStatus.CANCELLED;
      const motivo = patch.notes?.trim() ?? '';
      if (cancelando && motivo.length < MOTIVO_CANCELACION_MINIMO) {
        return { tipo: 'sin-motivo' as const };
      }

      const confirmandoPago = pideConfirmarPago(patch) && orden.paymentStatus !== PaymentStatus.PAID;

      // C-100: no se envía sin pago, cada tipo de entrega con sus estados y la guía obligatoria por ZOOM o MRW
      if (patch.status && patch.status !== orden.status) {
        const problema = problemaTransicion(orden, patch.status, { pagando: confirmandoPago, guia: patch.trackingNumber });
        if (problema) return { tipo: 'regla' as const, error: problema };
      }

      const data: Prisma.OrderUncheckedUpdateInput = {};
      if (patch.shippingCarrier !== undefined) data.shippingCarrier = patch.shippingCarrier;
      if (patch.trackingNumber !== undefined) data.trackingNumber = patch.trackingNumber || null;
      // El enlace de rastreo lo arma el servidor según la empresa; solo "Otra empresa" acepta uno escrito (https)
      if (patch.shippingCarrier !== undefined || patch.trackingNumber !== undefined || patch.trackingUrl !== undefined) {
        const empresa = (patch.shippingCarrier ?? orden.shippingCarrier) as EmpresaGuia | null;
        const guia = patch.trackingNumber ?? orden.trackingNumber;
        data.trackingUrl = empresa === 'OTHER'
          ? (patch.trackingUrl ?? orden.trackingUrl) || null
          : urlRastreo(empresa, guia);
      }
      if (patch.shippingNotes !== undefined) data.shippingNotes = patch.shippingNotes;
      if (patch.adminNotes !== undefined) data.adminNotes = patch.adminNotes;
      if (patch.estimatedDelivery !== undefined) {
        data.estimatedDelivery = patch.estimatedDelivery ? new Date(patch.estimatedDelivery) : null;
      }

      if (patch.status && patch.status !== orden.status) {
        data.status = patch.status;
        switch (patch.status) {
          case OrderStatus.CONFIRMED:
            data.confirmedAt = new Date();
            break;
          case OrderStatus.PROCESSING:
            data.processingAt = new Date();
            break;
          case OrderStatus.SHIPPED:
          case OrderStatus.READY_FOR_PICKUP:
            data.shippedAt = new Date();
            break;
          case OrderStatus.DELIVERED:
            data.deliveredAt = new Date();
            break;
          case OrderStatus.CANCELLED:
            data.cancelledAt = new Date();
            data.notes = motivo;
            break;
        }
      }

      // Confirmar el pago descuenta el stock una sola vez y llena paidAt,
      // venga del botón "Marcar pagado" o del estado de pago.
      const cambiosStock: { productId: string; quantity: number }[] = [];
      if (confirmandoPago) {
        data.paymentStatus = PaymentStatus.PAID;
        data.paidAt = new Date();

        for (const item of orden.items) {
          const producto = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, productType: true },
          });
          if (!producto || producto.productType === 'DIGITAL') continue;
          const descuento = Math.min(item.quantity, producto.stock); // nunca stock negativo
          if (descuento > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: descuento } },
            });
          }
          cambiosStock.push({ productId: item.productId, quantity: descuento });
        }
        await liberarReservas(tx, orden.userId, orden.items);
      }

      // Cancelar: devolver stock solo si se había descontado, y una sola vez
      let reintegro = 0;
      if (cancelando) {
        if (stockYaDescontado(orden.paymentStatus)) {
          await devolverStock(tx, orden.items);
        }
        await liberarReservas(tx, orden.userId, orden.items);

        // La comisión pendiente del promotor por esta orden se rechaza (C-75)
        await rejectOrderConversions(orden.id, tx);

        // Ofertas y cupones de esta orden vuelven a estar disponibles (C-102): el cliente puede usar su cupón otra vez
        const usos = await tx.promotionRedemption.findMany({ where: { orderId: orden.id }, select: { id: true, promotionId: true } });
        for (const uso of usos) {
          await tx.promotion.updateMany({ where: { id: uso.promotionId, usesCount: { gt: 0 } }, data: { usesCount: { decrement: 1 } } });
        }
        if (usos.length > 0) await tx.promotionRedemption.deleteMany({ where: { orderId: orden.id } });

        // Pago con saldo: el total vuelve al saldo de la tienda (nunca sale dinero de la empresa).
        // Decisión de Andrés (2026-09-15): es crédito para comprar aquí, no un reembolso.
        const pagoConSaldo = orden.paymentMethod === 'WALLET' && orden.paymentStatus === PaymentStatus.PAID;
        if (pagoConSaldo && orden.userId) {
          const saldo = await tx.userBalance.findUnique({
            where: { userId: orden.userId },
            select: { id: true },
          });
          if (saldo) {
            const total = Number(orden.totalUSD);
            await tx.userBalance.update({
              where: { id: saldo.id },
              data: {
                balance: { increment: montoDecimal(total) },
                totalSpent: { decrement: montoDecimal(total) },
              },
            });
            await tx.transaction.create({
              data: {
                balanceId: saldo.id,
                type: 'REFUND',
                status: 'COMPLETED',
                amount: montoDecimal(total),
                currency: 'USD',
                description: `Puntos ES devueltos por la cancelación de la orden #${orden.orderNumber}`,
                reference: orden.orderNumber,
                paymentMethod: 'WALLET',
              },
            });
            data.paymentStatus = PaymentStatus.REFUNDED;
            reintegro = total;
          }
        }
      }

      const actualizada = await tx.order.update({
        where: { id },
        data,
        include: { items: true, user: { select: { name: true, email: true } } },
      });

      // Historial del envío que ve el cliente (C-100)
      const eventoPanel = patch.status && patch.status !== orden.status
        ? descripcionEventoPanel(patch.status, actualizada)
        : null;
      if (eventoPanel) {
        await tx.shipmentEvent.create({
          data: { orderId: id, source: 'ADMIN', statusCode: patch.status, description: eventoPanel, occurredAt: new Date() },
        });
      }

      return {
        tipo: 'ok' as const,
        ordenPrevia: orden,
        orden: actualizada,
        confirmandoPago,
        cancelando,
        motivo,
        reintegro,
        cambiosStock,
      };
    });

    if (resultado.tipo === 'no-encontrada') {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }
    if (resultado.tipo === 'transicion-invalida') {
      return NextResponse.json(
        {
          error: resultado.repetida
            ? `La orden ya está ${resultado.desde.toLowerCase()}.`
            : `Una orden ${resultado.desde.toLowerCase()} no puede pasar a ${resultado.hasta.toLowerCase()}.`,
          permitidos: resultado.permitidos,
        },
        { status: 409 }
      );
    }
    if (resultado.tipo === 'regla') {
      return NextResponse.json({ error: resultado.error }, { status: 409 });
    }
    if (resultado.tipo === 'sin-motivo') {
      return NextResponse.json(
        { error: 'Se requiere una nota de cancelación con al menos 10 caracteres para informar al cliente del motivo.' },
        { status: 400 }
      );
    }

    const { ordenPrevia: oldOrder, orden: order, confirmandoPago, cancelando, motivo, reintegro, cambiosStock } = resultado;

    // C-127: el panel, la cuenta del cliente y la ficha del producto lo ven sin recargar
    void publicarOrdenes([order.id]);
    // Confirmar descuenta stock y cancelar lo devuelve: se publica el de todos sus productos
    if (oldOrder.status !== order.status) void publicarStock(order.items.map((item) => item.productId));

    if (cambiosStock.length > 0) {
      notifyStockCrossings(cambiosStock).catch((error) => console.error('Error enviando avisos de stock:', error));
    }

    // Pago confirmado: si el cliente llegó por un promotor, nace su comisión pendiente (C-75)
    if (confirmandoPago) {
      recordPaidOrder(order.id).catch((error) => console.error('Error registrando comisión de promotor:', error));
      void avisarPedidoDigitalPorEntregar(order.id);
    }

    // Avisos al cliente (fuera de la transacción: correos y notificaciones no deben bloquear el cambio)
    if (confirmandoPago && oldOrder.userId) {
      await createNotification({
        userId: oldOrder.userId,
        type: 'ORDER_PAID',
        title: 'Pago Confirmado',
        message: `El pago de tu orden #${oldOrder.orderNumber} ha sido confirmado.`,
        link: `/customer/orders`,
        icon: 'payment'
      });
    }

    if (patch.status && patch.status !== oldOrder.status && oldOrder.userId) {
      switch (patch.status) {
        case 'CONFIRMED':
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CONFIRMED',
            title: 'Pedido Confirmado',
            message: `Tu pedido #${oldOrder.orderNumber} ha sido confirmado y está siendo procesado.`,
            link: `/customer/orders`,
            icon: 'confirm'
          });
          break;

        case 'PROCESSING':
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CONFIRMED',
            title: 'Preparando tu Pedido',
            message: `Tu pedido #${oldOrder.orderNumber} está siendo preparado.`,
            link: `/customer/orders`,
            icon: 'package'
          });
          break;

        case 'READY_FOR_PICKUP':
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CONFIRMED',
            title: 'Listo para Recoger',
            message: `Tu pedido #${oldOrder.orderNumber} está listo para recoger en tienda.`,
            link: `/customer/orders`,
            icon: 'store'
          });
          break;

        case 'SHIPPED': {
          const local = order.deliveryMethod === 'LOCAL_DELIVERY';
          const empresa = order.shippingCarrier ? NOMBRE_EMPRESA[order.shippingCarrier as EmpresaGuia] ?? order.shippingCarrier : '';
          const carrierInfo = empresa ? ` por ${empresa}` : '';
          const trackingInfo = order.trackingNumber ? `. Guía: ${order.trackingNumber}` : '';
          const cobro = order.shippingPaidBy === 'CUSTOMER' ? '. El flete lo pagas al retirar (cobro a destino)' : '';
          // Una sola notificación (antes salían dos: la genérica y esta con guía y transportista)
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_SHIPPED',
            title: local ? 'Tu pedido va en camino' : 'Pedido enviado',
            message: local
              ? `Tu pedido #${oldOrder.orderNumber} salió a entregar en Guanare.`
              : `Tu pedido #${oldOrder.orderNumber} salió${carrierInfo}${trackingInfo}${cobro}.`,
            link: `/customer/orders`,
            icon: 'shipping'
          });
          if (order.user?.email) {
            try {
              await sendOrderShippedEmail(order.user.email, {
                orderNumber: oldOrder.orderNumber,
                customerName: order.user.name || 'Cliente',
                trackingNumber: order.trackingNumber || undefined,
                shippingCarrier: order.shippingCarrier ? NOMBRE_EMPRESA[order.shippingCarrier as EmpresaGuia] ?? order.shippingCarrier : undefined,
                destination: order.shippingAddress || undefined,
                payOnDelivery: order.shippingPaidBy === 'CUSTOMER',
              });
            } catch (emailError) {
              console.error('Error sending shipped email:', emailError);
            }
          }
          break;
        }

        case 'DELIVERED':
          await notifyOrderDelivered(oldOrder.userId, oldOrder.orderNumber, order.id);

          if (order.user?.email) {
            try {
              await sendOrderDeliveredEmail(order.user.email, {
                orderNumber: oldOrder.orderNumber,
                customerName: order.user.name || 'Cliente',
              });
            } catch (emailError) {
              console.error('Error sending delivered email:', emailError);
            }
          }

          // Recordatorio de reseña con el primer producto de la orden
          try {
            const orderWithUser = await prisma.order.findUnique({
              where: { id },
              include: {
                user: { select: { name: true, email: true } },
                items: {
                  include: {
                    product: { select: { name: true, mainImage: true, slug: true } }
                  }
                }
              },
            });

            if (orderWithUser && orderWithUser.items.length > 0 && orderWithUser.user) {
              const companySettings = await prisma.companySettings.findFirst();
              const firstProduct = orderWithUser.items[0].product;

              const emailHtml = generateReviewReminderEmail({
                companyName: companySettings?.companyName || 'Electro Shop',
                companyLogo: companySettings?.logo || undefined,
                customerName: orderWithUser.user?.name || 'Cliente',
                orderNumber: orderWithUser.orderNumber,
                productName: firstProduct.name,
                productImage: firstProduct.mainImage || undefined,
                reviewUrl: `${process.env.NEXTAUTH_URL}/productos/${firstProduct.slug}#reviews`,
              });

              await sendEmail({
                to: orderWithUser.user?.email || '',
                subject: `¿Qué te pareció tu compra? - ${orderWithUser.orderNumber}`,
                html: emailHtml,
              });
            }
          } catch (emailError) {
            console.error('Error sending review reminder email:', emailError);
          }
          break;

        case 'CANCELLED': {
          const avisoSaldo = reintegro > 0
            ? ` Devolvimos ${formatUSD(reintegro)} a tus Puntos ES para tu próxima compra.`
            : '';
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CANCELLED',
            title: 'Orden Cancelada',
            message: `Tu orden #${oldOrder.orderNumber} ha sido cancelada. ${motivo}${avisoSaldo}`,
            link: `/customer/orders`,
            icon: 'cancel'
          });

          try {
            const bloqueSaldo = reintegro > 0
              ? `
              <div style="background:#f0f7f4;border-left:4px solid #047857;padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
                <p style="margin:0;color:#047857;font-size:14px;font-weight:600;">Puntos ES devueltos</p>
                <p style="margin:8px 0 0;color:#047857;font-size:14px;">
                  Devolvimos ${escaparHtml(formatUSD(reintegro))} a tus Puntos ES para tu próxima compra.
                </p>
              </div>`
              : '';
            // Todo lo que escribe el admin o el cliente va escapado: antes entraba crudo en el HTML
            const cancellationEmailContent = `
              <h2 style="margin:0 0 20px;color:#dc3545;font-size:24px;font-weight:600;">Orden Cancelada</h2>
              <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">
                Hola <strong>${escaparHtml(order.user?.name || 'Cliente')}</strong>,
              </p>
              <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">
                Lamentamos informarte que tu orden <strong>#${escaparHtml(oldOrder.orderNumber)}</strong> ha sido cancelada.
              </p>

              <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
                <p style="margin:0;color:#856404;font-size:14px;font-weight:600;">Motivo de la cancelación:</p>
                <p style="margin:8px 0 0;color:#856404;font-size:14px;">${escaparHtml(motivo)}</p>
              </div>
              ${bloqueSaldo}
              <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0;color:#6a6c6b;font-size:14px;">
                  <strong>Número de orden:</strong> ${escaparHtml(oldOrder.orderNumber)}<br>
                  <strong>Total:</strong> ${escaparHtml(formatUSD(Number(oldOrder.totalUSD)))}<br>
                  <strong>Fecha de cancelación:</strong> ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <p style="color:#6a6c6b;font-size:14px;line-height:1.6;">
                Si tienes alguna pregunta, no dudes en contactarnos.
              </p>

              <div style="text-align:center;margin:30px 0;">
                <a href="${process.env.NEXTAUTH_URL || ''}/contacto" style="display:inline-block;background:#2a63cd;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
                  Contactar Soporte
                </a>
              </div>

              <p style="color:#adb5bd;font-size:12px;margin:30px 0 0;border-top:1px solid #e9ecef;padding-top:20px;">
                Gracias por tu comprensión. Esperamos poder atenderte en otra oportunidad.
              </p>
            `;

            const { getBaseTemplate } = await import('@/lib/email-service');
            const emailHtml = await getBaseTemplate(cancellationEmailContent, 'Tu orden ha sido cancelada');

            if (order.user?.email) {
              await sendEmail({
                to: order.user.email,
                subject: `Orden Cancelada - ${oldOrder.orderNumber}`,
                html: emailHtml,
              });
            }
          } catch (emailError) {
            console.error('Error sending cancellation email:', emailError);
            // Don't fail the cancellation if email fails
          }
          break;
        }
      }
    }

    // Bitácora (C-104): quién confirmó el pago, canceló o movió la orden
    if (confirmandoPago || cancelando || oldOrder.status !== order.status) {
      await registrarAccionAdmin(
        session,
        cancelando ? 'ORDER_CANCELLED' : confirmandoPago ? 'ORDER_PAYMENT_UPDATED' : 'ORDER_STATUS_CHANGED',
        { type: 'ORDER', id: order.id },
        {
          orden: oldOrder.orderNumber,
          total: Number(oldOrder.totalUSD),
          estadoAntes: oldOrder.status,
          estadoDespues: order.status,
          ...(cancelando ? { motivo: motivo.slice(0, 300), saldoDevuelto: reintegro } : {}),
        },
        request
      );
    }

    // Avisos al equipo (C-73): quién confirmó el pago o canceló, para que el resto lo sepa
    const actor = session?.user?.name || session?.user?.email || 'Un administrador';
    if (confirmandoPago) {
      emitAdminEvent({
        type: 'ORDER_PAID',
        title: `Pago confirmado · ${oldOrder.orderNumber}`,
        summary: `${actor} marcó la orden como pagada`,
        fields: [
          ['Total', formatUSD(Number(oldOrder.totalUSD))],
          ['Pago', formatPaymentMethod(oldOrder.paymentMethod)],
          ['Cliente', order.user?.name || order.user?.email],
        ],
        link: '/admin/orders',
      });
    }
    if (cancelando) {
      emitAdminEvent({
        type: 'ORDER_CANCELLED',
        title: `Orden cancelada · ${oldOrder.orderNumber}`,
        summary: `${actor} canceló la orden`,
        fields: [
          ['Total', formatUSD(Number(oldOrder.totalUSD))],
          ['Motivo', motivo.slice(0, 300)],
          ['Cliente', order.user?.name || order.user?.email],
          ['Puntos ES devueltos', reintegro > 0 ? formatUSD(reintegro) : null],
        ],
        link: '/admin/orders',
      });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
  }
}
