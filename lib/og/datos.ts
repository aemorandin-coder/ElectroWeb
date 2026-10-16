// Qué dice cada imagen para compartir (C-178) y su versión. Solo en el servidor.
// El precio, la oferta y el "Desde" salen de las mismas piezas que la tarjeta de la tienda (getProductBySlug con
// conOfertas, hasPriceRange y formatUSD): la imagen nunca dice otra cosa que la página.
// La versión va en la dirección (?v=): si cambia lo que se ve, cambia la dirección y WhatsApp y Facebook la vuelven a pedir.

import type { Metadata } from 'next';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache, type ReactElement } from 'react';
import { hasPriceRange } from '@/components/ui/productCardData';
import { formatUSD } from '@/lib/currency';
import { getPlatform } from '@/lib/digital-catalog';
import type { PublicProduct } from '@/lib/dto/product';
import { prisma } from '@/lib/prisma';
import { categoryText, getCategorySummary, type CategorySummary } from '@/lib/queries/catalog';
import { visibleProducts } from '@/lib/queries/home';
import { getProductBySlug } from '@/lib/queries/product';
import { absoluteUrl, plainText, siteUrl } from '@/lib/seo';
import { getPublicSettings } from '@/lib/site-settings';
import { cargarMarca, prepararFoto } from './imagen';
import { ALTO, ANCHO, TarjetaPagina, TarjetaProducto, TarjetaVitrina, type DatosProducto } from './tarjetas';

/** Se sube cuando cambia el diseño: todas las direcciones cambian y las redes piden las imágenes nuevas */
const DISENO = '1';
/** Lado de cada foto del mosaico (TarjetaVitrina, estilo oscuro): (630 − 2 × 36 − 12) / 2 */
const LADO_MOSAICO = 273;
const LADO_PRODUCTO = ALTO;

export type TipoTarjeta = 'producto' | 'categoria' | 'pagina';

/** Las páginas que tienen imagen propia. Solo estas: nadie puede pedir una imagen con un texto inventado */
export const PAGINAS = ['inicio', 'productos', 'categorias', 'servicios', 'cursos', 'gift-cards', 'contacto', 'cotizacion', 'solicitar-producto', 'terminos', 'privacidad'] as const;
export type PaginaCompartida = (typeof PAGINAS)[number];
export const esPagina = (valor: string): valor is PaginaCompartida => (PAGINAS as readonly string[]).includes(valor);

const version = (...partes: Array<string | number | null | undefined>) =>
  createHash('sha1').update([DISENO, ...partes].map((p) => String(p ?? '')).join('\u0000')).digest('hex').slice(0, 10);

// ---------- Producto

/** "STEAM CARD (SALDO)" → "STEAM CARD": la tienda no usa "saldo" (decisión del 16/10; el producto no cambia) */
export const nombreParaCompartir = (nombre: string) => nombre.replace(/\s*\(\s*saldo\s*\)\s*/gi, ' ').replace(/\s+/g, ' ').trim();

function datosDeProducto(p: PublicProduct): Omit<DatosProducto, 'foto'> {
  const oferta = p.compareAtPriceUSD !== null && p.compareAtPriceUSD > p.priceUSD;
  const digital = p.productType === 'DIGITAL';
  return {
    nombre: nombreParaCompartir(p.name),
    precio: formatUSD(p.priceUSD),
    desde: hasPriceRange(p),
    antes: oferta ? formatUSD(p.compareAtPriceUSD as number) : null,
    ahorro: oferta ? `Ahorra ${formatUSD((p.compareAtPriceUSD as number) - p.priceUSD)}` : null,
    condicion: digital ? 'Entrega digital' : p.condition?.badge ?? 'Nuevo',
    detalle: digital ? getPlatform(p.digitalPlatform)?.label ?? p.category.name : p.category.name,
  };
}

const fotoPrincipal = (p: Pick<PublicProduct, 'mainImage' | 'images'>) => p.mainImage || p.images[0] || null;

export function versionDeProducto(p: PublicProduct): string {
  const d = datosDeProducto(p);
  return version('producto', p.slug, d.nombre, d.precio, d.desde ? 1 : 0, d.antes, d.condicion, d.detalle, fotoPrincipal(p));
}

// ---------- Categoría

export const versionDeCategoria = (c: Pick<CategorySummary, 'slug' | 'name'>) => version('categoria', c.slug, c.name);

// ---------- Páginas

interface ContenidoPagina {
  titulo: string;
  bajada: string | null;
  /** De dónde salen las fotos del mosaico; sin fotos, la tarjeta lleva el ícono de la marca */
  fotos: 'destacados' | 'recientes' | null;
}

const listaEs = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}` : items[0] ?? '');

/** Las categorías con más productos a la vista, para decir qué vende la tienda sin escribirlo a mano */
const categoriasPrincipales = cache(async (cuantas: number): Promise<string[]> => {
  const filas = await prisma.product.groupBy({ by: ['categoryId'], where: await visibleProducts(), _count: { categoryId: true }, orderBy: { _count: { categoryId: 'desc' } }, take: cuantas });
  const nombres = await prisma.category.findMany({ where: { id: { in: filas.map((f) => f.categoryId) } }, select: { id: true, name: true } });
  const porId = new Map(nombres.map((c) => [c.id, c.name]));
  return filas.map((f) => porId.get(f.categoryId)).filter((n): n is string => Boolean(n));
});

const FIJAS: Record<Exclude<PaginaCompartida, 'inicio' | 'productos' | 'categorias' | 'servicios' | 'cursos'>, ContenidoPagina> = {
  'gift-cards': { titulo: 'Gift Cards', bajada: 'Elige el diseño y el monto. Llega al correo de quien la recibe.', fotos: null },
  contacto: { titulo: 'Contacto', bajada: 'WhatsApp, teléfono, correo, dirección y horario de la tienda.', fotos: null },
  cotizacion: { titulo: 'Cotizaciones para empresas', bajada: 'Pide un presupuesto formal para tu empresa o institución.', fotos: null },
  'solicitar-producto': { titulo: 'Solicitar un producto', bajada: '¿No encuentras lo que buscas? Cuéntanos qué necesitas.', fotos: null },
  terminos: { titulo: 'Términos y condiciones', bajada: null, fotos: null },
  privacidad: { titulo: 'Política de privacidad', bajada: null, fotos: null },
};

/** Lo que dice la tarjeta de una página: lo de Configuración → SEO si está, o un texto armado con datos de la tienda */
export const contenidoDePagina = cache(async (pagina: PaginaCompartida): Promise<ContenidoPagina> => {
  if (pagina in FIJAS) return FIJAS[pagina as keyof typeof FIJAS];
  const [ajustes, publicos] = await Promise.all([
    prisma.companySettings.findFirst({
      select: { tagline: true, productsMetaTitle: true, productsMetaDescription: true, servicesMetaTitle: true, servicesMetaDescription: true, coursesMetaTitle: true, coursesMetaDescription: true },
    }),
    getPublicSettings(),
  ]);
  const envios = publicos.deliveryEnabled ? ' Envíos a toda Venezuela.' : '';
  const corta = (texto: string | null | undefined) => (texto ? plainText(texto, 110) : null);
  switch (pagina) {
    case 'inicio': {
      const categorias = await categoriasPrincipales(3);
      return {
        titulo: ajustes?.tagline || 'Tu tienda de tecnología en Venezuela',
        bajada: categorias.length > 0 ? `${listaEs(categorias)}.${envios}` : null,
        fotos: 'destacados',
      };
    }
    case 'productos':
      return { titulo: ajustes?.productsMetaTitle || 'Todos los productos', bajada: corta(ajustes?.productsMetaDescription) ?? `Precios en dólares y bolívares.${envios}`, fotos: 'recientes' };
    case 'categorias': {
      const categorias = await categoriasPrincipales(4);
      return { titulo: 'Categorías', bajada: categorias.length > 0 ? `${listaEs(categorias)} y más.` : null, fotos: 'recientes' };
    }
    case 'servicios':
      return { titulo: ajustes?.servicesMetaTitle || 'Servicios', bajada: corta(ajustes?.servicesMetaDescription) ?? 'Instalación de CCTV, redes, puntos de venta y mantenimiento técnico.', fotos: null };
    default:
      return { titulo: ajustes?.coursesMetaTitle || 'Cursos', bajada: corta(ajustes?.coursesMetaDescription) ?? 'Aprende redes, electrónica, CCTV, gaming y más.', fotos: null };
  }
});

export const versionDePagina = (pagina: PaginaCompartida, c: ContenidoPagina) => version('pagina', pagina, c.titulo, c.bajada, c.fotos);

// ---------- Fotos

const SUBIDAS = path.join(process.cwd(), 'public', 'uploads');

/** Una foto de la tienda desde el disco. Solo de public/uploads: nunca se pide nada a otro sitio */
async function leerFoto(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  let ruta = url;
  if (/^https?:\/\//i.test(ruta)) {
    const propia = siteUrl();
    if (!ruta.startsWith(`${propia}/`)) return null;
    ruta = ruta.slice(propia.length);
  }
  const relativa = ruta.split('?')[0].replace(/^\/(api\/)?uploads\//, '');
  if (relativa === ruta.split('?')[0]) return null;
  const archivo = path.resolve(SUBIDAS, decodeURIComponent(relativa));
  if (!archivo.startsWith(SUBIDAS + path.sep)) return null;
  return readFile(archivo).catch(() => null);
}

/** Sin foto: el ícono de la marca sobre blanco */
async function fotoOIcono(url: string | null, lado: number): Promise<string> {
  const buffer = await leerFoto(url);
  if (buffer) {
    try { return await prepararFoto(buffer, lado); } catch { /* foto dañada: va el ícono */ }
  }
  const icono = (await cargarMarca()).icono;
  return prepararFoto(Buffer.from(icono.split(',')[1], 'base64'), lado);
}

async function fotosDelMosaico(donde: Parameters<typeof visibleProducts>[0], orden: 'destacados' | 'recientes'): Promise<string[]> {
  const filas = await prisma.product.findMany({
    where: await visibleProducts({ AND: [donde ?? {}, { mainImage: { not: null } }] }),
    orderBy: orden === 'destacados' ? [{ isFeatured: 'desc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }],
    select: { mainImage: true },
    take: 4,
  });
  const fotos = await Promise.all(filas.map((f) => leerFoto(f.mainImage)));
  return Promise.all(fotos.filter((f): f is Buffer => f !== null).map((f) => prepararFoto(f, LADO_MOSAICO)));
}

// ---------- La tarjeta pedida

export interface TarjetaLista {
  /** La que va en la dirección */
  version: string;
  /** Para la memoria del servidor: la versión más lo que no va en la dirección (las fotos del mosaico) */
  llave: string;
  dibujar: () => Promise<ReactElement>;
}

const marcaCompleta = async () => ({ ...(await cargarMarca()), dominio: new URL(siteUrl()).host });

export async function tarjetaPara(tipo: TipoTarjeta, clave: string): Promise<TarjetaLista | null> {
  if (tipo === 'producto') {
    const producto = await getProductBySlug(clave);
    if (!producto) return null;
    const v = versionDeProducto(producto);
    return {
      version: v,
      llave: v,
      dibujar: async () => {
        const [marca, foto] = await Promise.all([marcaCompleta(), fotoOIcono(fotoPrincipal(producto), LADO_PRODUCTO)]);
        return TarjetaProducto({ estilo: 'claro', marca, datos: { ...datosDeProducto(producto), foto } });
      },
    };
  }

  if (tipo === 'categoria') {
    const categoria = await getCategorySummary(clave);
    if (!categoria) return null;
    const v = versionDeCategoria(categoria);
    const fila = await prisma.category.findUnique({ where: { slug: clave }, select: { id: true } });
    const donde = { categoryId: fila?.id };
    const muestra = await prisma.product.findMany({ where: await visibleProducts(donde), orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }], select: { mainImage: true }, take: 4 });
    return {
      version: v,
      llave: version(v, ...muestra.map((m) => m.mainImage)),
      dibujar: async () => {
        const [marca, publicos, fotos] = await Promise.all([marcaCompleta(), getPublicSettings(), fotosDelMosaico(donde, 'destacados')]);
        const bajada = plainText(categoryText(categoria, publicos.deliveryEnabled), 110);
        return fotos.length > 0
          ? TarjetaVitrina({ estilo: 'oscuro', marca, titulo: categoria.name, bajada, fotos })
          : TarjetaPagina({ marca, titulo: categoria.name, bajada });
      },
    };
  }

  if (!esPagina(clave)) return null;
  const contenido = await contenidoDePagina(clave);
  const v = versionDePagina(clave, contenido);
  return {
    version: v,
    // Las fotos del mosaico cambian con el catálogo: la memoria se renueva cada hora para tomarlas
    llave: version(v, Math.floor(Date.now() / 3_600_000)),
    dibujar: async () => {
      const [marca, fotos] = await Promise.all([marcaCompleta(), contenido.fotos ? fotosDelMosaico(undefined, contenido.fotos) : Promise.resolve([])]);
      return fotos.length > 0
        ? TarjetaVitrina({ estilo: 'oscuro', marca, titulo: contenido.titulo, bajada: contenido.bajada, fotos })
        : TarjetaPagina({ marca, titulo: contenido.titulo, bajada: contenido.bajada });
    },
  };
}

// ---------- Para los metadatos de cada página

export interface ImagenCompartida { url: string; width: number; height: number; type: string; alt: string }

export const imagenGenerada = (tipo: TipoTarjeta, clave: string, v: string, alt: string): ImagenCompartida => ({
  url: `${siteUrl()}/og/${tipo}/${encodeURIComponent(clave)}?v=${v}`,
  width: ANCHO,
  height: ALTO,
  type: 'image/jpeg',
  alt,
});

/** La imagen de una página: la subida a mano en Configuración → SEO manda (decisión del 16/10); si no hay, la generada */
export async function imagenDePagina(pagina: PaginaCompartida, subidaAMano?: string | null): Promise<ImagenCompartida | { url: string; alt: string }> {
  const contenido = await contenidoDePagina(pagina);
  const propia = absoluteUrl(subidaAMano);
  if (propia) return { url: propia, alt: contenido.titulo };
  return imagenGenerada('pagina', pagina, versionDePagina(pagina, contenido), contenido.titulo);
}

/**
 * Open Graph y X de una página con su imagen. Cada página lleva los suyos: sin ellos heredaba los del layout y decía
 * ser la portada (C-149). og:title y og:description, si no se pasan, Next los toma del título y la descripción de la página.
 */
export async function compartirPagina(pagina: PaginaCompartida, ruta: string, subidaAMano?: string | null): Promise<Pick<Metadata, 'openGraph' | 'twitter'>> {
  const imagen = await imagenDePagina(pagina, subidaAMano);
  return {
    openGraph: { url: ruta, type: 'website', locale: 'es_VE', images: [imagen] },
    twitter: { card: 'summary_large_image', images: [imagen.url] },
  };
}
