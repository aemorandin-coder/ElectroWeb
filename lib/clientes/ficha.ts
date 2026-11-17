// C-276: la ficha de un cliente para el panel (la A que eligió el equipo el 16/11), en lista blanca: quién es, sus sellos de
// confianza, sus cifras, sus pedidos, sus documentos y firmas, sus datos, los avisos que recibió, lo que le interesa, la
// línea de tiempo y las notas del equipo. Solo en el servidor. Nunca salen la IP, los tokens, la clave, la versión de
// sesión, las rutas de los archivos de firma ni el carrito tal como lo guardó el navegador (solo nombres y cantidades).
import { prisma } from '@/lib/prisma';
import { documentosDelCliente, documentoVigente, firmaVigente, SLUG_TERMINOS_SALDO } from '@/lib/legal-docs';
import { getSorteoVigente, resumenDelSorteo } from '@/lib/sorteo/servidor';
import { ABIERTAS, NO_CUENTAN } from '@/lib/clientes/lista';
import { estadoCuenta, estadoEmpresa, type EstadoCuenta, type EstadoEmpresa, type SellosCliente } from '@/lib/dto/cliente';
import { NOMBRE_CAMPO, type CampoEditable } from '@/lib/clientes/edicion';

export type TipoHito = 'registro' | 'activacion' | 'ingreso' | 'pedido' | 'puntos' | 'firma' | 'sorteo' | 'garantia' | 'resena' | 'aviso' | 'equipo';
export interface Hito { tipo: TipoHito; en: string; titulo: string; detalle: string | null; quien: string | null }

export interface FichaCliente {
  id: string;
  nombre: string | null;
  correo: string | null;
  foto: string | null;
  registro: string;
  correoVerificadoEn: string | null;
  sellos: SellosCliente;
  cuenta: EstadoCuenta;
  cifras: {
    gastado: number;
    pedidosValidos: number;
    pedidos: number;
    activos: number;
    puntos: number;
    recargaPorRevisar: number;
    boletos: number | null;
    ultimoIngreso: { en: string; dispositivo: string | null; metodo: string | null } | null;
  };
  pedidos: Array<{ id: string; numero: string; estado: string; total: number; fecha: string; resumen: string; factura: string | null }>;
  documentos: {
    vigentes: Array<{ slug: string; titulo: string; version: number; paraQue: string | null; firmado: boolean; firmaId: string | null; firmadoEn: string | null; legado: boolean }>;
    anteriores: Array<{ id: string; titulo: string; version: number; firmadoEn: string; revocada: boolean }>;
  };
  datos: {
    telefono: string | null;
    whatsapp: string | null;
    cedula: string | null;
    ciudad: string | null;
    estado: string | null;
    entraCon: { google: boolean; clave: boolean };
    dispositivos: Array<{ dispositivo: string; metodo: string | null; ultimo: string; abierta: boolean }>;
  };
  empresa: null | {
    nombre: string | null;
    rif: string | null;
    estado: EstadoEmpresa;
    notas: string | null;
    domicilioFiscal: string | null;
    verificadaEn: string | null;
    acta: string | null;
    rifDocumento: string | null;
  };
  avisos: Array<{ id: string; tipo: string; titulo: string; mensaje: string; leido: boolean; fecha: string; enlace: string | null; porEquipo: string | null }>;
  interesa: { favoritos: { total: number; nombres: string[] }; carrito: { productos: number; nombres: string[] } | null };
  actividad: Hito[];
  notas: Array<{ id: string; texto: string; autor: string; fecha: string; autorId: string | null }>;
}

const num = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;
const PALABRA_TRANSACCION: Record<string, string> = { RECHARGE: 'Recarga', DEPOSIT: 'Abono', PURCHASE: 'Compra', REFUND: 'Reembolso', WITHDRAWAL: 'Retiro' };
const ESTADO_TRANSACCION: Record<string, string> = { PENDING: 'por revisar', COMPLETED: 'hecha', FAILED: 'fallida', CANCELLED: 'cancelada', REJECTED: 'rechazada' };

/** El carrito que guardó el navegador: solo nombres y cantidades (es un JSON que escribe el cliente; se lee con cuidado) */
function leerCarrito(json: string | null | undefined): { productos: number; nombres: string[] } | null {
  if (!json) return null;
  try {
    const items: unknown = JSON.parse(json);
    if (!Array.isArray(items) || items.length === 0) return null;
    const nombres: string[] = [];
    let productos = 0;
    for (const it of items.slice(0, 100)) {
      if (!it || typeof it !== 'object') continue;
      const o = it as Record<string, unknown>;
      const cantidad = Number(o.quantity ?? o.cantidad ?? 1);
      productos += Number.isFinite(cantidad) && cantidad > 0 ? Math.min(cantidad, 999) : 1;
      const nombre = typeof o.name === 'string' ? o.name : typeof o.nombre === 'string' ? o.nombre : null;
      if (nombre && nombres.length < 4) nombres.push(nombre.slice(0, 80));
    }
    return productos > 0 ? { productos, nombres } : null;
  } catch {
    return null;
  }
}

export async function fichaDelCliente(id: string): Promise<FichaCliente | null> {
  const u = await prisma.user.findFirst({
    where: { id, role: 'USER' },
    select: {
      id: true, name: true, email: true, image: true, createdAt: true, emailVerified: true, password: true,
      profile: {
        select: {
          phone: true, whatsapp: true, idNumber: true, city: true, state: true, customerType: true, isBusinessAccount: true, companyName: true,
          taxId: true, businessRIF: true, businessVerificationStatus: true, businessVerificationNotes: true, businessFiscalAddress: true,
          businessVerifiedAt: true, businessConstitutiveAct: true, businessRIFDocument: true, accountStatus: true, lastLoginAt: true, savedCart: true,
        },
      },
      accounts: { select: { provider: true } },
      balance: { select: { balance: true, transactions: { orderBy: { createdAt: 'desc' }, take: 15, select: { type: true, status: true, amount: true, createdAt: true } } } },
      orders: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, totalUSD: true, createdAt: true, invoiceNumber: true, items: { select: { productName: true }, take: 2 }, _count: { select: { items: true } } },
      },
      sesiones: { where: { esAdmin: false }, orderBy: { lastSeenAt: 'desc' }, take: 12, select: { dispositivo: true, metodo: true, createdAt: true, lastSeenAt: true, revokedAt: true, expiresAt: true } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 12, select: { id: true, type: true, title: true, message: true, read: true, link: true, createdAt: true } },
      wishlist: { select: { items: { orderBy: { createdAt: 'desc' }, take: 4, select: { product: { select: { name: true } } } }, _count: { select: { items: true } } } },
      warrantyClaims: { orderBy: { createdAt: 'desc' }, take: 5, select: { createdAt: true, status: true } },
      reviews: { orderBy: { createdAt: 'desc' }, take: 5, select: { createdAt: true, rating: true } },
      participacionesSorteo: { orderBy: { createdAt: 'desc' }, take: 3, select: { createdAt: true, sorteo: { select: { titulo: true } } } },
      notasDelEquipo: { orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, texto: true, autorNombre: true, autorId: true, createdAt: true } },
    },
  });
  if (!u) return null;

  const p = u.profile;
  const [docs, terminos, sorteo, bitacora, firmas] = await Promise.all([
    documentosDelCliente(u.id),
    documentoVigente(SLUG_TERMINOS_SALDO),
    getSorteoVigente(),
    prisma.auditLog.findMany({ where: { targetType: 'USER', targetId: u.id }, orderBy: { createdAt: 'desc' }, take: 25, select: { action: true, userEmail: true, userId: true, details: true, createdAt: true } }),
    prisma.documentSignature.findMany({ where: { userId: u.id }, orderBy: { signedAt: 'desc' }, take: 10, select: { signedAt: true, revokedAt: true, document: { select: { title: true, version: true } } } }),
  ]);
  const firmoTerminos = terminos ? (await firmaVigente(u.id, terminos)) !== null : false;
  let boletos: number | null = null;
  if (sorteo) {
    const fila = (await resumenDelSorteo(sorteo)).participantes.find((x) => x.userId === u.id);
    boletos = fila ? fila.porCompra + fila.porInvitar : 0;
  }
  // Quién del equipo hizo cada cosa: el nombre de su cuenta
  const idsEquipo = [...new Set(bitacora.map((b) => b.userId).filter((x): x is string => Boolean(x)))];
  const equipo = new Map((await prisma.user.findMany({ where: { id: { in: idsEquipo } }, select: { id: true, name: true } })).map((x) => [x.id, x.name]));
  const quien = (b: { userId: string | null; userEmail: string | null }) => (b.userId && equipo.get(b.userId)) || b.userEmail?.split('@')[0] || 'El equipo';
  const avisoDe = new Map<string, string>();
  for (const b of bitacora) {
    const d = leerDetalles(b.details);
    if (b.action === 'CUSTOMER_NOTIFIED' && d && typeof d.notificacionId === 'string') avisoDe.set(d.notificacionId, quien(b));
  }

  const validos = u.orders.filter((o) => o.paymentStatus === 'PAID' && !NO_CUENTAN.includes(o.status));
  const sesion = u.sesiones[0];
  const ultimo = sesion?.lastSeenAt ?? p?.lastLoginAt ?? null;
  const esEmpresa = p?.customerType === 'COMPANY' || p?.isBusinessAccount === true;
  const transacciones = u.balance?.transactions ?? [];

  // La línea de tiempo: lo del cliente y lo que el equipo hizo con su cuenta, lo más nuevo arriba
  const hitos: Hito[] = [
    { tipo: 'registro', en: u.createdAt.toISOString(), titulo: 'Se registró', detalle: u.accounts.some((a) => a.provider === 'google') && !u.password ? 'Con Google' : 'Con correo y clave', quien: null },
  ];
  if (u.emailVerified) hitos.push({ tipo: 'activacion', en: u.emailVerified.toISOString(), titulo: 'Activó su correo', detalle: null, quien: null });
  for (const s of u.sesiones) hitos.push({ tipo: 'ingreso', en: s.createdAt.toISOString(), titulo: `Entró desde ${s.dispositivo}`, detalle: s.metodo === 'google' ? 'Con Google' : s.metodo ? 'Con su clave' : null, quien: null });
  for (const o of u.orders.slice(0, 12)) {
    const resumen = o.items[0]?.productName ? `${o.items[0].productName}${o._count.items > 1 ? ` y ${o._count.items - 1} más` : ''}` : null;
    hitos.push({ tipo: 'pedido', en: o.createdAt.toISOString(), titulo: `Hizo el pedido ${o.orderNumber} (${num(o.totalUSD).toFixed(2).replace('.', ',')} $)`, detalle: resumen, quien: null });
  }
  for (const t of transacciones) {
    hitos.push({ tipo: 'puntos', en: t.createdAt.toISOString(), titulo: `${PALABRA_TRANSACCION[t.type] ?? 'Movimiento'} de Puntos ES por ${num(t.amount).toFixed(2).replace('.', ',')} $`, detalle: ESTADO_TRANSACCION[t.status] ?? null, quien: null });
  }
  for (const f of firmas) {
    hitos.push({ tipo: 'firma', en: f.signedAt.toISOString(), titulo: `Firmó ${f.document.title}`, detalle: `Versión ${f.document.version}${f.revokedAt ? ' · revocada después' : ''}`, quien: null });
  }
  for (const ps of u.participacionesSorteo) hitos.push({ tipo: 'sorteo', en: ps.createdAt.toISOString(), titulo: `Entró al ${ps.sorteo.titulo}`, detalle: null, quien: null });
  for (const g of u.warrantyClaims) hitos.push({ tipo: 'garantia', en: g.createdAt.toISOString(), titulo: 'Pidió una garantía', detalle: null, quien: null });
  for (const r of u.reviews) hitos.push({ tipo: 'resena', en: r.createdAt.toISOString(), titulo: `Dejó una reseña de ${r.rating} ${r.rating === 1 ? 'estrella' : 'estrellas'}`, detalle: null, quien: null });
  for (const n of u.notifications) {
    const por = avisoDe.get(n.id) ?? null;
    hitos.push({ tipo: 'aviso', en: n.createdAt.toISOString(), titulo: por ? `${por} le escribió: «${n.title}»` : `Recibió el aviso «${n.title}»`, detalle: n.read ? 'Leído' : 'Sin leer', quien: por });
  }
  const QUE: Record<string, string> = {
    VERIFICATION_REVIEWED: 'revisó la verificación de su empresa', USER_BALANCE_MODIFIED: 'movió sus Puntos ES', USER_UPDATED: 'cambió sus datos',
    CUSTOMER_SUSPENDED: 'suspendió su cuenta', CUSTOMER_REACTIVATED: 'reactivó su cuenta', CUSTOMER_ACTIVATION_SENT: 'le reenvió el enlace de activación',
  };
  for (const b of bitacora) {
    if (b.action === 'CUSTOMER_NOTIFIED' || !QUE[b.action]) continue;
    const d = leerDetalles(b.details);
    const detalle = typeof d?.motivo === 'string' ? d.motivo
      : typeof d?.estado === 'string' ? `Quedó ${d.estado === 'APPROVED' ? 'aprobada' : d.estado === 'REJECTED' ? 'rechazada' : 'por revisar'}`
        : Array.isArray(d?.campos) ? `Cambió: ${(d.campos as unknown[]).filter((x): x is string => typeof x === 'string').map((c) => NOMBRE_CAMPO[c as CampoEditable] ?? c).join(', ')}` : null;
    hitos.push({ tipo: 'equipo', en: b.createdAt.toISOString(), titulo: `${quien(b)} ${QUE[b.action]}`, detalle, quien: quien(b) });
  }
  hitos.sort((a, b) => b.en.localeCompare(a.en));

  return {
    id: u.id,
    nombre: u.name,
    correo: u.email,
    foto: u.image,
    registro: u.createdAt.toISOString(),
    correoVerificadoEn: u.emailVerified?.toISOString() ?? null,
    sellos: {
      correo: u.emailVerified !== null,
      telefono: Boolean(p?.phone?.trim() || p?.whatsapp?.trim()),
      cedula: Boolean(p?.idNumber?.trim()),
      terminos: firmoTerminos,
      empresa: esEmpresa ? estadoEmpresa(p?.businessVerificationStatus) : null,
      google: u.accounts.some((a) => a.provider === 'google'),
    },
    cuenta: estadoCuenta(p?.accountStatus),
    cifras: {
      gastado: num(validos.reduce((n, o) => n + Number(o.totalUSD), 0)),
      pedidosValidos: validos.length,
      pedidos: u.orders.length,
      activos: u.orders.filter((o) => ABIERTAS.includes(o.status)).length,
      puntos: num(u.balance?.balance),
      recargaPorRevisar: num(transacciones.filter((t) => t.type === 'RECHARGE' && t.status === 'PENDING').reduce((n, t) => n + Number(t.amount), 0)),
      boletos,
      ultimoIngreso: ultimo ? { en: ultimo.toISOString(), dispositivo: sesion?.dispositivo ?? null, metodo: sesion?.metodo ?? null } : null,
    },
    pedidos: u.orders.slice(0, 12).map((o) => ({
      id: o.id,
      numero: o.orderNumber,
      estado: o.status,
      total: num(o.totalUSD),
      fecha: o.createdAt.toISOString(),
      resumen: o.items[0]?.productName ? `${o.items[0].productName}${o._count.items > 1 ? ` y ${o._count.items - 1} más` : ''}` : 'Sin productos',
      factura: o.invoiceNumber,
    })),
    documentos: {
      vigentes: docs.documents.map((d) => ({ slug: d.slug, titulo: d.title, version: d.version, paraQue: d.requiredFor, firmado: d.signed, firmaId: d.signatureId, firmadoEn: d.signedAt, legado: d.legacy })),
      anteriores: docs.history.map((h) => ({ id: h.id, titulo: h.title, version: h.version, firmadoEn: h.signedAt, revocada: h.revoked })),
    },
    datos: {
      telefono: p?.phone?.trim() || null,
      whatsapp: p?.whatsapp?.trim() || null,
      cedula: p?.idNumber?.trim() || null,
      ciudad: p?.city?.trim() || null,
      estado: p?.state?.trim() || null,
      entraCon: { google: u.accounts.some((a) => a.provider === 'google'), clave: Boolean(u.password) },
      dispositivos: u.sesiones.slice(0, 5).map((s) => ({ dispositivo: s.dispositivo, metodo: s.metodo, ultimo: s.lastSeenAt.toISOString(), abierta: !s.revokedAt && s.expiresAt > new Date() })),
    },
    empresa: esEmpresa ? {
      nombre: p?.companyName?.trim() || null,
      rif: p?.businessRIF?.trim() || p?.taxId?.trim() || null,
      estado: estadoEmpresa(p?.businessVerificationStatus),
      notas: p?.businessVerificationNotes?.trim() || null,
      domicilioFiscal: p?.businessFiscalAddress?.trim() || null,
      verificadaEn: p?.businessVerifiedAt?.toISOString() ?? null,
      acta: p?.businessConstitutiveAct || null,
      rifDocumento: p?.businessRIFDocument || null,
    } : null,
    avisos: u.notifications.map((n) => ({ id: n.id, tipo: n.type, titulo: n.title, mensaje: n.message, leido: n.read, fecha: n.createdAt.toISOString(), enlace: n.link, porEquipo: avisoDe.get(n.id) ?? null })),
    interesa: {
      favoritos: { total: u.wishlist?._count.items ?? 0, nombres: (u.wishlist?.items ?? []).map((i) => i.product.name) },
      carrito: leerCarrito(p?.savedCart),
    },
    actividad: hitos.slice(0, 40),
    notas: u.notasDelEquipo.map((n) => ({ id: n.id, texto: n.texto, autor: n.autorNombre, fecha: n.createdAt.toISOString(), autorId: n.autorId })),
  };
}

/** La bitácora guarda los detalles como texto JSON (lib/audit-log.ts): se leen con cuidado */
function leerDetalles(texto: string | null): Record<string, unknown> | null {
  if (!texto) return null;
  try {
    const d: unknown = JSON.parse(texto);
    return d && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
