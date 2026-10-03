// Dashboard del panel (C-150). Solo servidor: la página lo llama directamente.
// Reemplaza a /api/stats, que contaba como "ventas" las órdenes sin pagar (estado PENDIENTE) y dejaba fuera las
// pagadas y las listas para recoger, contaba al equipo como clientes y los borradores sin stock como "agotados".
// Aquí una venta es una orden pagada que no se canceló ni se reembolsó, y el día es el de Venezuela.

import { OrderStatus, PaymentStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hoyCaracas } from '@/lib/pago-movil/monto';
import { pagoSinOrdenWhere } from '@/lib/pago-movil-sin-orden';
import { desglosePrecio } from '@/lib/precio-sugerido';

const VENTA: Prisma.OrderWhereInput = {
  paymentStatus: PaymentStatus.PAID,
  status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
};
const CLIENTES: Prisma.UserWhereInput = { role: { notIn: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] } };
const FISICO_PUBLICADO: Prisma.ProductWhereInput = { status: 'PUBLISHED', productType: 'PHYSICAL' };
const DIA_MS = 24 * 60 * 60 * 1000;

/** Medianoche de Venezuela (UTC−4, sin cambio de hora) del día "2026-10-01" */
const inicioDia = (fecha: string) => new Date(`${fecha}T00:00:00-04:00`);

export interface DashboardData {
  ventas: {
    hoyUSD: number;
    hoyOrdenes: number;
    mesUSD: number;
    mesOrdenes: number;
    /** Los últimos 7 días, el de hoy al final */
    semana: Array<{ fecha: string; etiqueta: string; totalUSD: number }>;
  };
  totales: { ventasUSD: number; ordenes: number; productos: number; publicados: number; clientes: number };
  porAtender: {
    pagosPorConfirmar: number;
    porPreparar: number;
    recargas: number;
    pagosSinOrden: number;
    facturasEmpresa: number;
    cotizaciones: number;
    garantias: number;
    mensajes: number;
    solicitudes: number;
    resenas: number;
    descuentos: number;
    verificaciones: number;
    creadores: number;
    cursos: number;
    referidos: number;
    sinStock: number;
  };
  ordenesRecientes: Array<{ id: string; orderNumber: string; cliente: string; totalUSD: number; status: OrderStatus; paymentStatus: PaymentStatus; createdAt: string }>;
  pocoInventario: { total: number; umbral: number; productos: Array<{ id: string; name: string; stock: number }> };
  /** Lo que le falta a la tienda por configurar; vacío si está todo */
  tienda: Array<{ clave: string; texto: string; href: string; soloDueno: boolean }>;
}

export async function getDashboard(): Promise<DashboardData> {
  const hoy = hoyCaracas();
  const desdeHoy = inicioDia(hoy);
  const desdeMes = inicioDia(`${hoy.slice(0, 7)}-01`);
  const desdeSemana = new Date(desdeHoy.getTime() - 6 * DIA_MS);

  const ajustes = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { lowStockThreshold: true, taxEnabled: true, taxPercent: true, taxDigitalProducts: true, homeMetaImage: true, rif: true, address: true },
  });
  const umbral = ajustes?.lowStockThreshold ?? 10;
  const pocoStock: Prisma.ProductWhereInput = { ...FISICO_PUBLICADO, stock: { gt: 0, lte: umbral } };

  const [
    ventasHoy, ventasMes, ventasSemana, ventasTotal,
    ordenes, productos, publicados, clientes,
    pagosPorConfirmar, porPreparar, recargas, pagosSinOrden, facturasEmpresa, cotizaciones, garantias, mensajes, solicitudes,
    resenas, descuentos, verificaciones, creadores, cursos, referidos, sinStock,
    recientes, pocos, pocosTotal, metodosActivos, sinMarca, sinFoto, sinMedidas, conCosto, variantesConCosto,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { ...VENTA, paidAt: { gte: desdeHoy } }, _sum: { totalUSD: true }, _count: true }),
    prisma.order.aggregate({ where: { ...VENTA, paidAt: { gte: desdeMes } }, _sum: { totalUSD: true }, _count: true }),
    prisma.order.findMany({ where: { ...VENTA, paidAt: { gte: desdeSemana } }, select: { paidAt: true, totalUSD: true } }),
    prisma.order.aggregate({ where: VENTA, _sum: { totalUSD: true } }),
    prisma.order.count(),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { status: 'PUBLISHED' } }),
    prisma.user.count({ where: CLIENTES }),

    // Pagos manuales (Binance, PayPal, Zelle…) que el equipo tiene que confirmar
    prisma.order.count({ where: { status: OrderStatus.PENDING, paymentStatus: PaymentStatus.PENDING } }),
    // Pagadas que todavía no se enviaron, no se entregaron ni están listas para recoger
    prisma.order.count({ where: { paymentStatus: PaymentStatus.PAID, status: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.PROCESSING] } } }),
    prisma.transaction.count({ where: { status: 'PENDING', type: 'RECHARGE' } }),
    prisma.pagoMovilVerificacion.count({ where: pagoSinOrdenWhere }),
    // C-147: compras a nombre de una empresa que siguen sin número de factura
    prisma.order.count({ where: { ...VENTA, billingType: 'COMPANY', invoiceNumber: null } }),
    prisma.quote.count({ where: { status: 'REQUESTED' } }),
    prisma.warrantyClaim.count({ where: { awaitingStaff: true, status: { notIn: ['RESOLVED', 'REJECTED'] } } }),
    prisma.contactMessage.count({ where: { status: 'PENDING' } }),
    prisma.productRequest.count({ where: { status: 'PENDING' } }),
    prisma.review.count({ where: { isApproved: false, rejectedAt: null } }),
    prisma.discountRequest.count({ where: { status: 'PENDING' } }),
    prisma.profile.count({ where: { businessVerificationStatus: 'PENDING' } }),
    prisma.courseCreator.count({ where: { status: 'PENDING' } }),
    prisma.course.count({ where: { isActive: false, creatorId: { not: null } } }),
    prisma.referralConversion.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { ...FISICO_PUBLICADO, stock: { lte: 0 } } }),

    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, orderNumber: true, status: true, paymentStatus: true, totalUSD: true, createdAt: true, billingName: true, guestName: true, user: { select: { name: true } } },
    }),
    prisma.product.findMany({ where: pocoStock, orderBy: [{ stock: 'asc' }, { name: 'asc' }], take: 5, select: { id: true, name: true, stock: true } }),
    prisma.product.count({ where: pocoStock }),
    prisma.companyPaymentMethod.count({ where: { isActive: true } }),
    prisma.product.count({ where: { ...FISICO_PUBLICADO, brandId: null } }),
    prisma.product.count({ where: { status: 'PUBLISHED', mainImage: null, images: { in: ['', '[]'] } } }),
    // C-153: sin peso o sin medidas, el empaque y la tarifa de referencia del envío se estiman
    prisma.product.count({ where: { ...FISICO_PUBLICADO, OR: [{ weightKg: null }, { weightKg: { lte: 0 } }, { dimensions: null }, { dimensions: '' }] } }),
    // C-146b: precio y costo de lo publicado, para avisar de lo que se vende sin ganancia. No sale del servidor
    prisma.product.findMany({ where: { ...FISICO_PUBLICADO, costPerItem: { gt: 0 } }, select: { id: true, priceUSD: true, costPerItem: true } }),
    prisma.digitalVariant.findMany({ where: { isActive: true, costUSD: { gt: 0 }, product: { status: 'PUBLISHED' } }, select: { productId: true, priceUSD: true, costUSD: true } }),
  ]);

  // Sin ganancia: quitando el IVA que el precio lleva dentro, queda el costo o menos
  const iva = ajustes?.taxEnabled ? Number(ajustes.taxPercent ?? 0) : 0;
  const sinGanancia = new Set<string>();
  for (const p of conCosto) if ((desglosePrecio(Number(p.priceUSD), Number(p.costPerItem), iva)?.gananciaUSD ?? 1) <= 0) sinGanancia.add(p.id);
  // C-151: los montos digitales solo descuentan el IVA si Configuración dice que lo llevan
  const ivaDigital = ajustes?.taxDigitalProducts ? iva : 0;
  for (const v of variantesConCosto) if ((desglosePrecio(Number(v.priceUSD), Number(v.costUSD), ivaDigital)?.gananciaUSD ?? 1) <= 0) sinGanancia.add(v.productId);

  // Los 7 días en hora de Venezuela, con los que no tuvieron ventas en cero
  const porDia = new Map<string, number>();
  for (let i = 6; i >= 0; i--) porDia.set(hoyCaracas(new Date(desdeHoy.getTime() - i * DIA_MS + DIA_MS / 2)), 0);
  for (const venta of ventasSemana) {
    const dia = venta.paidAt ? hoyCaracas(venta.paidAt) : null;
    if (dia && porDia.has(dia)) porDia.set(dia, (porDia.get(dia) ?? 0) + Math.round(Number(venta.totalUSD) * 100));
  }
  const etiquetaDia = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', weekday: 'short', day: 'numeric' });

  const tienda: DashboardData['tienda'] = [];
  // C-165: sin respaldo, un fallo del servidor puede costar las órdenes y los Puntos ES. Si la tabla aún no existe, el Dashboard no se rompe
  const [respaldoAjustes, respaldoAlDia] = await Promise.all([
    prisma.backupSettings.findUnique({ where: { id: 'default' }, select: { enabled: true } }).catch(() => undefined),
    prisma.backupRun.findFirst({ where: { kind: 'DB', status: 'OK', deletedAt: null, startedAt: { gte: new Date(Date.now() - 36 * 60 * 60_000) } }, select: { id: true } }).catch(() => undefined),
  ]);
  if (respaldoAjustes !== undefined) {
    if (!respaldoAjustes?.enabled) tienda.push({ clave: 'respaldos', texto: 'Los respaldos automáticos no están encendidos: si el servidor falla, se pierden las órdenes y los Puntos ES.', href: '/admin/settings#respaldos', soloDueno: true });
    else if (respaldoAlDia === null) tienda.push({ clave: 'respaldos', texto: 'El último respaldo bueno tiene más de un día o no hay ninguno: revisa el historial de respaldos.', href: '/admin/settings#respaldos', soloDueno: true });
  }
  if (metodosActivos === 0) tienda.push({ clave: 'pagos', texto: 'No hay ningún método de pago activo: nadie puede pagar.', href: '/admin/payments', soloDueno: true });
  if (!ajustes?.taxEnabled || !(Number(ajustes.taxPercent ?? 0) > 0)) tienda.push({ clave: 'iva', texto: 'Falta el porcentaje del IVA: la tienda no dice "IVA incluido".', href: '/admin/settings', soloDueno: true });
  if (!ajustes?.rif || !ajustes.address) tienda.push({ clave: 'negocio', texto: 'Faltan el RIF o la dirección de la tienda (salen en el pie, los presupuestos y Google).', href: '/admin/settings', soloDueno: true });
  if (sinGanancia.size > 0) tienda.push({ clave: 'ganancia', texto: `${sinGanancia.size} ${sinGanancia.size === 1 ? 'producto publicado se vende' : 'productos publicados se venden'} al costo o por debajo${iva > 0 ? ', quitando el IVA' : ''}.`, href: '/admin/products', soloDueno: true });
  if (sinMarca > 0) tienda.push({ clave: 'marca', texto: `${sinMarca} ${sinMarca === 1 ? 'producto publicado no tiene' : 'productos publicados no tienen'} marca (Google y el catálogo de Meta la piden).`, href: '/admin/products', soloDueno: false });
  if (sinFoto > 0) tienda.push({ clave: 'foto', texto: `${sinFoto} ${sinFoto === 1 ? 'producto publicado no tiene' : 'productos publicados no tienen'} foto.`, href: '/admin/products', soloDueno: false });
  if (sinMedidas > 0) tienda.push({ clave: 'medidas', texto: `${sinMedidas} ${sinMedidas === 1 ? 'producto publicado no tiene' : 'productos publicados no tienen'} peso o medidas: su empaque y su envío se estiman.`, href: '/admin/products', soloDueno: false });
  if (!ajustes?.homeMetaImage) tienda.push({ clave: 'compartir', texto: 'Falta la imagen para compartir (1200 × 630): al pegar el enlace de la tienda sale el logo cuadrado.', href: '/admin/settings', soloDueno: true });
  if (!process.env.NEXT_PUBLIC_GA_ID && !process.env.NEXT_PUBLIC_FB_PIXEL_ID) tienda.push({ clave: 'medicion', texto: 'Google Analytics y el píxel de Meta no están conectados: los anuncios no pueden medir sus ventas.', href: '/admin/reports', soloDueno: true });

  return {
    ventas: {
      hoyUSD: Number(ventasHoy._sum.totalUSD ?? 0),
      hoyOrdenes: ventasHoy._count,
      mesUSD: Number(ventasMes._sum.totalUSD ?? 0),
      mesOrdenes: ventasMes._count,
      semana: [...porDia.entries()].map(([fecha, centimos]) => ({ fecha, etiqueta: etiquetaDia.format(inicioDia(fecha).getTime() + DIA_MS / 2), totalUSD: centimos / 100 })),
    },
    totales: { ventasUSD: Number(ventasTotal._sum.totalUSD ?? 0), ordenes, productos, publicados, clientes },
    porAtender: {
      pagosPorConfirmar, porPreparar, recargas, pagosSinOrden, facturasEmpresa, cotizaciones, garantias, mensajes, solicitudes,
      resenas, descuentos, verificaciones, creadores, cursos, referidos, sinStock,
    },
    ordenesRecientes: recientes.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      cliente: o.billingName || o.user?.name || o.guestName || 'Cliente eliminado',
      totalUSD: Number(o.totalUSD),
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    })),
    pocoInventario: { total: pocosTotal, umbral, productos: pocos },
    tienda,
  };
}
