// Pedir la reseña por correo (C-157): unos días después de la entrega, a quien recibió el producto.
// Lo llama el cron del servidor una vez al día (/api/cron/resenas). Cada orden se revisa una sola vez
// (`orders.reviewRequestedAt`, haya salido el correo o no) y un cliente con varias órdenes listas recibe un solo correo.
// La regla para reseñar es la misma de siempre (/api/reviews): una orden entregada con ese producto.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getBaseTemplate, sendEmail } from '@/lib/email-service';
import { enlaceBaja, escaparHtml, urlAbsoluta, urlBase } from '@/lib/email-campaigns';
import { primeraImagen } from '@/lib/favoritos-avisos';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Un físico necesita unos días de uso; un código o una recarga se prueban el mismo día. */
export const DIAS_FISICO = 5;
export const DIAS_DIGITAL = 2;
/** Una orden entregada hace más de esto ya no se pide: la tarea no revive el pasado. */
export const VENTANA_DIAS = 30;
/** Más de tres botones en un correo ya no se toca ninguno: se ofrecen los de mayor precio. */
const MAX_PRODUCTOS = 3;
/** Tope por corrida: si se acumulan, el resto sale al día siguiente. */
const MAX_ORDENES = 200;

type TipoProducto = 'PHYSICAL' | 'DIGITAL';

/** Días que se esperan tras la entrega: los de un físico si la orden lleva alguno, si no los de un digital. */
export function diasDeEspera(tipos: TipoProducto[]): number {
  return tipos.includes('PHYSICAL') ? DIAS_FISICO : DIAS_DIGITAL;
}

/** ¿Ya pasaron los días de espera y todavía está dentro de la ventana? */
export function ordenLista(entregadaEl: Date, tipos: TipoProducto[], ahora: number): boolean {
  const edad = ahora - entregadaEl.getTime();
  return edad >= diasDeEspera(tipos) * DIA_MS && edad <= VENTANA_DIAS * DIA_MS;
}

export interface ProductoAResenar {
  nombre: string;
  slug: string;
  imagen: string | null;
  precioUSD: number;
}

export interface ResultadoResenas {
  ordenes: number;
  clientes: number;
  correos: number;
}

export async function pedirResenas(ahora: number = Date.now()): Promise<ResultadoResenas> {
  const candidatas = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      reviewRequestedAt: null,
      // Los invitados no tienen cuenta: no pueden reseñar
      userId: { not: null },
      deliveredAt: { gte: new Date(ahora - VENTANA_DIAS * DIA_MS), lte: new Date(ahora - DIAS_DIGITAL * DIA_MS) },
      // Con un reclamo de garantía abierto no es el momento de pedir una opinión
      warrantyClaims: { none: { closedAt: null } },
    },
    orderBy: { deliveredAt: 'asc' },
    take: MAX_ORDENES,
    select: {
      id: true,
      userId: true,
      deliveredAt: true,
      items: {
        select: {
          productId: true,
          priceUSD: true,
          product: { select: { name: true, slug: true, mainImage: true, images: true, status: true, productType: true } },
        },
      },
    },
  });

  const listas = candidatas.filter((o) => o.deliveredAt && ordenLista(o.deliveredAt, o.items.map((i) => i.product.productType), ahora));

  const porCliente = new Map<string, typeof listas>();
  for (const orden of listas) {
    const lista = porCliente.get(orden.userId!) ?? [];
    lista.push(orden);
    porCliente.set(orden.userId!, lista);
  }

  let clientes = 0;
  let correos = 0;
  for (const [userId, ordenes] of porCliente) {
    // Se reclama cada orden antes de pedir: si dos corridas coinciden, solo una la ve
    const reclamadas: string[] = [];
    for (const orden of ordenes) {
      const r = await prisma.order.updateMany({
        where: { id: orden.id, reviewRequestedAt: null },
        data: { reviewRequestedAt: new Date(ahora) },
      });
      if (r.count === 1) reclamadas.push(orden.id);
    }
    if (reclamadas.length === 0) continue;

    const productos = await productosPendientes(userId, ordenes.filter((o) => reclamadas.includes(o.id)));
    if (productos.length === 0) continue;

    const enviado = await pedirAlCliente(userId, productos);
    if (enviado === 'omitido') continue;
    if (enviado === 'fallo') {
      // El correo no salió: se libera para que la próxima corrida lo intente de nuevo
      await prisma.order.updateMany({ where: { id: { in: reclamadas } }, data: { reviewRequestedAt: null } });
      continue;
    }
    clientes += 1;
    correos += 1;
  }
  return { ordenes: listas.length, clientes, correos };
}

/** Los productos de esas órdenes que se pueden reseñar y que el cliente todavía no reseñó, los más caros primero. */
async function productosPendientes(
  userId: string,
  ordenes: {
    items: { productId: string; priceUSD: Prisma.Decimal; product: { name: string; slug: string; mainImage: string | null; images: string; status: string } }[];
  }[]
): Promise<ProductoAResenar[]> {
  const porProducto = new Map<string, ProductoAResenar>();
  for (const orden of ordenes) {
    for (const item of orden.items) {
      // Una ficha sin publicar no abre: no tiene sentido mandar al cliente a ella
      if (item.product.status !== 'PUBLISHED') continue;
      const precioUSD = Number(item.priceUSD);
      const actual = porProducto.get(item.productId);
      if (actual && actual.precioUSD >= precioUSD) continue;
      porProducto.set(item.productId, {
        nombre: item.product.name,
        slug: item.product.slug,
        imagen: item.product.mainImage || primeraImagen(item.product.images),
        precioUSD,
      });
    }
  }
  if (porProducto.size === 0) return [];

  const yaReseñados = await prisma.review.findMany({
    where: { userId, productId: { in: [...porProducto.keys()] } },
    select: { productId: true },
  });
  for (const r of yaReseñados) porProducto.delete(r.productId);

  return [...porProducto.values()].sort((a, b) => b.precioUSD - a.precioUSD).slice(0, MAX_PRODUCTOS);
}

async function pedirAlCliente(userId: string, productos: ProductoAResenar[]): Promise<'enviado' | 'omitido' | 'fallo'> {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      emailVerified: true,
      profile: { select: { accountStatus: true } },
      notificationPreferences: { select: { emailReviews: true } },
    },
  });
  // Cuentas desactivadas, suspendidas o por eliminar, correos sin verificar y quien dio de baja este correo: no
  if (!usuario || !usuario.email || !usuario.emailVerified) return 'omitido';
  if ((usuario.profile?.accountStatus ?? 'ACTIVE') !== 'ACTIVE') return 'omitido';
  if (usuario.notificationPreferences?.emailReviews === false) return 'omitido';

  const { asunto, html } = await correoPedirResenas(userId, usuario.name, productos);
  const r = await sendEmail({
    to: usuario.email,
    subject: asunto,
    html,
    headers: { 'List-Unsubscribe': `<${enlaceBaja(userId, 'resenas')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
  return r.success ? 'enviado' : 'fallo';
}

/** El correo y su asunto. También lo usa la vista previa del panel (Marketing → Correos). */
export async function correoPedirResenas(
  userId: string,
  nombreCliente: string | null,
  productos: ProductoAResenar[]
): Promise<{ asunto: string; html: string }> {
  const nombre = (nombreCliente || '').trim().split(/\s+/)[0] || 'cliente';
  const asunto = productos.length === 1 ? `¿Qué te pareció ${productos[0].nombre}?` : '¿Qué te parecieron tus productos?';

  const filas = productos.map((p) => {
    const url = escaparHtml(`${urlBase()}/productos/${p.slug}#resenas`);
    // Sin foto no se deja el hueco de la columna
    const foto = p.imagen
      ? `<td style="padding:12px 12px 12px 0;width:72px;vertical-align:top;"><a href="${url}"><img src="${escaparHtml(urlAbsoluta(p.imagen))}" alt="" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:contain;border-radius:8px;background:#ffffff;border:1px solid #e9ecef;"></a></td>`
      : '';
    return `<tr>
      ${foto}
      <td style="padding:12px 0;vertical-align:middle;">
        <a href="${url}" style="color:#212529;font-size:15px;font-weight:600;text-decoration:none;">${escaparHtml(p.nombre)}</a>
        <p style="margin:8px 0 0;"><a href="${url}" style="display:inline-block;padding:8px 16px;border-radius:8px;background-color:#2a63cd;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Dejar mi reseña</a></p>
      </td>
    </tr>`;
  }).join('');

  const contenido = `
    <h2 style="margin:0 0 10px;color:#212529;font-size:22px;font-weight:600;">¿Qué te pareció tu compra?</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 8px;">Hola ${escaparHtml(nombre)}, ya pasaron unos días desde que recibiste tu pedido. Tu opinión ayuda a otros clientes a decidir y a nosotros a mejorar.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${filas}</table>
    <p style="color:#6a6c6b;font-size:13px;line-height:1.6;margin:12px 0 0;">Solo opinan quienes compraron y recibieron el producto. El equipo revisa cada reseña antes de publicarla.</p>
    <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e9ecef;color:#6a6c6b;font-size:12px;line-height:1.5;text-align:center;">Recibes este correo porque compraste en nuestra tienda. <a href="${escaparHtml(enlaceBaja(userId, 'resenas'))}" style="color:#2a63cd;">No recibir más este pedido de reseñas</a></p>`;
  return { asunto, html: await getBaseTemplate(contenido, escaparHtml(asunto)) };
}
