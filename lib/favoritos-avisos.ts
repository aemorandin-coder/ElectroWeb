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
import { sendEmail } from '@/lib/email-service';
import { CORREO, botonCorreo, productosCorreo } from '@/lib/email-templates/estilo';
import { fotoCorreo, marcoCorreo } from '@/lib/email-templates/marco';
import { enlaceBaja, escaparHtml, urlBase } from '@/lib/email-campaigns';

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

export interface Aviso {
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
export function primeraImagen(images: string): string | null {
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

/** El correo de los favoritos (también lo usa la vista previa del panel, C-219). */
export async function correoFavoritos(userId: string, nombreCliente: string | null, lista: Aviso[]): Promise<string> {
  const nombre = (nombreCliente || '').trim().split(/\s+/)[0] || '';
  const bajo = lista.some((a) => a.tipo === 'precio');
  // C-219: el marco nuevo; cada producto con su foto en JPEG, su etiqueta, su precio y el de antes
  return marcoCorreo({
    preheader: asunto(lista),
    encabezado: {
      sello: 'TUS FAVORITOS',
      titulo: bajo
        ? `¡Bajó lo que te gusta${nombre ? `, ${escaparHtml(nombre)}` : ''}!`
        : `¡Volvió lo que te gusta${nombre ? `, ${escaparHtml(nombre)}` : ''}!`,
      texto: lista.length > 1 ? 'Esto cambió en los productos que guardaste.' : 'Esto cambió en un producto que guardaste.',
    },
    cuerpo: `
      ${productosCorreo(lista.map((a) => ({
        nombre: escaparHtml(a.nombre),
        detalle: a.tipo === 'precio' ? (a.enOferta ? 'En oferta' : 'Bajó de precio') : 'Disponible otra vez',
        monto: escaparHtml(formatUSD(a.ahoraUSD)),
        antes: a.tipo === 'precio' && a.antesUSD !== null ? escaparHtml(formatUSD(a.antesUSD)) : undefined,
        foto: fotoCorreo(a.imagen),
        enlace: escaparHtml(`${urlBase()}/productos/${a.slug}`),
      })))}
      <p style="${CORREO.textoMenor}margin:14px 0 0;">Los precios y la disponibilidad pueden cambiar: se confirman al pagar.</p>
      ${botonCorreo(`${escaparHtml(urlBase())}/customer/wishlist`, 'Ver mis favoritos')}`,
    chispa: { pose: 'senala', texto: 'Te aviso apenas cambian: así no te pierdes nada de lo que te gusta.' },
    motivo: `Recibes este correo porque guardaste estos productos en Favoritos. <a href="${escaparHtml(enlaceBaja(userId, 'favoritos'))}" style="color:inherit;text-decoration:underline;">No recibir más estos avisos</a>`,
  });
}

