// Avisos de favoritos (C-138): cuando un favorito baja de precio (también al entrar en oferta) o vuelve a estar
// disponible, el cliente recibe un aviso en la tienda y un correo con todos los de esa revisión.
// Lo llama el cron del servidor (/api/cron/favoritos). Cada favorito guarda el precio y la disponibilidad de la
// última revisión (`avisoPrecioUSD`, `avisoAgotado`): se avisa una sola vez por cambio.

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getOfertasVigentes } from '@/lib/promotions';
import { mejorOferta } from '@/lib/promotions-core';
import { montoDecimal } from '@/lib/pricing';
import { formatUSD } from '@/lib/currency';
import { createNotification } from '@/lib/notifications';
import { getBaseTemplate, sendEmail } from '@/lib/email-service';
import { enlaceBaja, escaparHtml, urlAbsoluta, urlBase } from '@/lib/email-campaigns';

/** Baja mínima para avisar: 1 %. Un ajuste de centavos no es noticia. */
const BAJA_MINIMA = 0.01;

export interface EstadoFavorito {
  /** Precio y disponibilidad de la revisión anterior; precio null = nunca revisado */
  antesUSD: number | null;
  antesAgotado: boolean;
  ahoraUSD: number;
  ahoraAgotado: boolean;
}

/** Qué aviso corresponde. La primera revisión solo anota: no avisa de cambios que no vio. */
export function avisoDeFavorito(e: EstadoFavorito): 'precio' | 'disponible' | null {
  if (e.antesUSD === null || e.ahoraAgotado) return null;
  if (e.antesAgotado) return 'disponible';
  return e.ahoraUSD <= e.antesUSD * (1 - BAJA_MINIMA) ? 'precio' : null;
}

interface Aviso {
  tipo: 'precio' | 'disponible';
  nombre: string;
  slug: string;
  imagen: string | null;
  ahoraUSD: number;
  antesUSD: number | null;
  enOferta: boolean;
}

export interface ResultadoRevision {
  revisados: number;
  avisos: number;
  clientes: number;
  correos: number;
}

/** Precio con la mejor oferta vigente y disponibilidad de cada producto físico publicado. */
async function precioYStock<T extends { id: string; categoryId: string; priceUSD: Prisma.Decimal; stock: number }>(productos: T[]) {
  const ofertas = await getOfertasVigentes();
  return new Map(productos.map((p) => {
    const lista = Number(p.priceUSD);
    const oferta = mejorOferta(ofertas, { id: p.id, categoryId: p.categoryId, productType: 'PHYSICAL' }, lista);
    return [p.id, { precioUSD: oferta ? oferta.priceUSD : lista, enOferta: Boolean(oferta), agotado: p.stock <= 0 }] as const;
  }));
}

export async function revisarFavoritos(): Promise<ResultadoRevision> {
  // Los digitales no tienen stock ni ofertas: quedan fuera
  const items = await prisma.wishlistItem.findMany({
    where: { product: { status: 'PUBLISHED', productType: 'PHYSICAL' } },
    select: {
      id: true,
      avisoPrecioUSD: true,
      avisoAgotado: true,
      wishlist: { select: { userId: true } },
      product: { select: { id: true, name: true, slug: true, mainImage: true, images: true, priceUSD: true, stock: true, categoryId: true } },
    },
  });
  const estado = await precioYStock(items.map((i) => i.product));

  const porCliente = new Map<string, Aviso[]>();
  for (const item of items) {
    const ahora = estado.get(item.product.id)!;
    const antesUSD = item.avisoPrecioUSD === null ? null : Number(item.avisoPrecioUSD);
    if (antesUSD === ahora.precioUSD && item.avisoAgotado === ahora.agotado) continue;

    // Se reclama el cambio antes de avisar: si dos revisiones corren a la vez, solo una lo ve
    const reclamado = await prisma.wishlistItem.updateMany({
      where: { id: item.id, avisoPrecioUSD: item.avisoPrecioUSD, avisoAgotado: item.avisoAgotado },
      data: { avisoPrecioUSD: montoDecimal(ahora.precioUSD), avisoAgotado: ahora.agotado },
    });
    if (reclamado.count !== 1) continue;

    const tipo = avisoDeFavorito({ antesUSD, antesAgotado: item.avisoAgotado, ahoraUSD: ahora.precioUSD, ahoraAgotado: ahora.agotado });
    if (!tipo) continue;
    const lista = porCliente.get(item.wishlist.userId) ?? [];
    lista.push({
      tipo,
      nombre: item.product.name,
      slug: item.product.slug,
      imagen: item.product.mainImage || primeraImagen(item.product.images),
      ahoraUSD: ahora.precioUSD,
      antesUSD,
      enOferta: ahora.enOferta,
    });
    porCliente.set(item.wishlist.userId, lista);
  }

  let avisos = 0;
  let correos = 0;
  for (const [userId, lista] of porCliente) {
    const enviados = await avisarCliente(userId, lista);
    avisos += enviados.avisos;
    if (enviados.correo) correos += 1;
  }
  return { revisados: items.length, avisos, clientes: porCliente.size, correos };
}

async function avisarCliente(userId: string, lista: Aviso[]): Promise<{ avisos: number; correo: boolean }> {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      emailVerified: true,
      profile: { select: { accountStatus: true } },
      notificationPreferences: { select: { inAppFavoritos: true, emailFavoritos: true } },
    },
  });
  // Cuentas desactivadas, suspendidas o por eliminar no reciben avisos
  if (!usuario || (usuario.profile?.accountStatus ?? 'ACTIVE') !== 'ACTIVE') return { avisos: 0, correo: false };
  const enTienda = usuario.notificationPreferences?.inAppFavoritos ?? true;
  const porCorreo = usuario.notificationPreferences?.emailFavoritos ?? true;

  let avisos = 0;
  if (enTienda) {
    for (const a of lista) {
      await createNotification({
        userId,
        type: a.tipo === 'precio' ? 'FAVORITE_PRICE_DROP' : 'FAVORITE_BACK_IN_STOCK',
        title: a.tipo === 'precio' ? (a.enOferta ? 'Un favorito está en oferta' : 'Un favorito bajó de precio') : 'Un favorito volvió a estar disponible',
        message: textoAviso(a),
        link: `/productos/${a.slug}`,
      });
      avisos += 1;
    }
  }

  let correo = false;
  if (porCorreo && usuario.email && usuario.emailVerified) {
    const r = await sendEmail({
      to: usuario.email,
      subject: asunto(lista),
      html: await correoFavoritos(userId, usuario.name, lista),
      headers: { 'List-Unsubscribe': `<${enlaceBaja(userId, 'favoritos')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    correo = r.success;
  }
  return { avisos, correo };
}

/** `images` es un JSON con la lista de fotos: la primera sirve si no hay foto principal. */
function primeraImagen(images: string): string | null {
  try {
    const lista: unknown = JSON.parse(images);
    return Array.isArray(lista) && typeof lista[0] === 'string' ? lista[0] : null;
  } catch {
    return null;
  }
}

function textoAviso(a: Aviso): string {
  if (a.tipo === 'disponible') return `${a.nombre} está disponible otra vez a ${formatUSD(a.ahoraUSD)}.`;
  return `${a.nombre}: ahora ${formatUSD(a.ahoraUSD)}${a.antesUSD !== null ? ` (antes ${formatUSD(a.antesUSD)})` : ''}.`;
}

function asunto(lista: Aviso[]): string {
  if (lista.length > 1) return `${lista.length} de tus favoritos tienen novedades`;
  const a = lista[0];
  return a.tipo === 'precio' ? `Bajó de precio: ${a.nombre}` : `Volvió a estar disponible: ${a.nombre}`;
}

async function correoFavoritos(userId: string, nombreCliente: string | null, lista: Aviso[]): Promise<string> {
  const nombre = (nombreCliente || '').trim().split(/\s+/)[0] || 'cliente';
  const filas = lista.map((a) => {
    const url = escaparHtml(`${urlBase()}/productos/${a.slug}`);
    const foto = a.imagen
      ? `<img src="${escaparHtml(urlAbsoluta(a.imagen))}" alt="" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:contain;border-radius:8px;background:#ffffff;border:1px solid #e9ecef;">`
      : '';
    const etiqueta = a.tipo === 'precio' ? (a.enOferta ? 'En oferta' : 'Bajó de precio') : 'Disponible otra vez';
    const antes = a.tipo === 'precio' && a.antesUSD !== null
      ? ` <span style="color:#6a6c6b;text-decoration:line-through;font-weight:400;">${escaparHtml(formatUSD(a.antesUSD))}</span>`
      : '';
    return `<tr>
      <td style="padding:12px 12px 12px 0;width:72px;vertical-align:top;"><a href="${url}">${foto}</a></td>
      <td style="padding:12px 0;vertical-align:top;">
        <p style="margin:0 0 4px;color:#2a63cd;font-size:12px;font-weight:600;">${escaparHtml(etiqueta)}</p>
        <a href="${url}" style="color:#212529;font-size:15px;font-weight:600;text-decoration:none;">${escaparHtml(a.nombre)}</a>
        <p style="margin:4px 0 0;color:#212529;font-size:16px;font-weight:700;">${escaparHtml(formatUSD(a.ahoraUSD))}${antes}</p>
      </td>
    </tr>`;
  }).join('');
  const contenido = `
    <h2 style="margin:0 0 10px;color:#212529;font-size:22px;font-weight:600;">Novedades de tus favoritos</h2>
    <p style="color:#495057;font-size:15px;line-height:1.6;margin:0 0 8px;">Hola ${escaparHtml(nombre)}, esto cambió en los productos que guardaste:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${filas}</table>
    <p style="color:#6a6c6b;font-size:13px;line-height:1.6;margin:12px 0 0;">Los precios y la disponibilidad pueden cambiar. Se confirman al pagar.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td bgcolor="#2a63cd" style="border-radius:8px;"><a href="${escaparHtml(urlBase())}/customer/wishlist" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Ver mis favoritos</a></td></tr></table>
    <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e9ecef;color:#6a6c6b;font-size:12px;line-height:1.5;text-align:center;">Recibes este correo porque guardaste estos productos en Favoritos. <a href="${escaparHtml(enlaceBaja(userId, 'favoritos'))}" style="color:#2a63cd;">No recibir más estos avisos</a></p>`;
  return getBaseTemplate(contenido, asunto(lista));
}

