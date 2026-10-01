// Productos del catálogo para armar una cotización (C-148b). Solo servidor.
// Devuelve una lista blanca: lo que el buscador del panel muestra y nada más (sin costo ni datos internos).

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseProductImages } from '@/lib/product-utils';
import { normalizar, puntaje, seParece, terminosDeBusqueda } from './busqueda';

export interface ProductoParaCotizar {
  id: string;
  name: string;
  sku: string;
  priceUSD: number;
  imagen: string | null;
  marca: string | null;
  categoria: string | null;
  digital: boolean;
  /** Unidades sin apartar por órdenes de la tienda. `null` en los digitales: no llevan inventario. */
  disponible: number | null;
}

const RESULTADOS = 8;
/** Candidatos que se traen de la base para ordenarlos aquí */
const CANDIDATOS = 60;
/** Tope de productos que se revisan cuando hay que perdonar un error de tecleo */
const TOPE_PARECIDOS = 4000;

// Postgres sin la extensión unaccent: los acentos se quitan con translate()
const CON_ACENTO = 'áéíóúàèìòùäëïöüâêîôûçñ';
const SIN_ACENTO = 'aeiouaeiouaeiouaeioucn';
const sinAcentos = (expresion: Prisma.Sql) => Prisma.sql`translate(lower(${expresion}), ${CON_ACENTO}, ${SIN_ACENTO})`;
const TEXTO = sinAcentos(Prisma.sql`concat_ws(' ', p."name", p."sku", p."barcode", b."name", c."name")`);
/** El término como patrón de LIKE, con sus comodines escapados */
const patron = (termino: string) => `%${termino.replace(/[\\%_]/g, '\\$&')}%`;

interface Fila {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  marca: string | null;
  categoria: string | null;
}

async function candidatos(terminos: string[], todos: boolean): Promise<Fila[]> {
  const condiciones = terminos.map((t) => Prisma.sql`${TEXTO} LIKE ${patron(t)}`);
  return prisma.$queryRaw<Fila[]>`
    SELECT p."id", p."name", p."sku", p."barcode", b."name" AS "marca", c."name" AS "categoria"
    FROM "products" p
    LEFT JOIN "brands" b ON b."id" = p."brandId"
    LEFT JOIN "categories" c ON c."id" = p."categoryId"
    WHERE p."status" = 'PUBLISHED' AND (${Prisma.join(condiciones, todos ? ' AND ' : ' OR ')})
    ORDER BY (${sinAcentos(Prisma.sql`p."name"`)} LIKE ${`${patron(terminos[0]).slice(1)}`}) DESC, p."name" ASC
    LIMIT ${CANDIDATOS}`;
}

/** Los productos pedidos, en ese orden, con lo que hay disponible ahora. Solo publicados. */
export async function productosParaCotizar(ids: string[]): Promise<ProductoParaCotizar[]> {
  if (ids.length === 0) return [];
  const [productos, apartados] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      select: {
        id: true, name: true, sku: true, priceUSD: true, stock: true, mainImage: true, images: true, productType: true,
        brand: { select: { name: true } }, category: { select: { name: true } },
      },
    }),
    prisma.stockReservation.groupBy({ by: ['productId'], where: { productId: { in: ids }, expiresAt: { gt: new Date() } }, _sum: { quantity: true } }),
  ]);
  const apartado = new Map(apartados.map((a) => [a.productId, a._sum.quantity ?? 0]));
  const porId = new Map(productos.map((p) => [p.id, p]));
  return ids.flatMap((id) => {
    const p = porId.get(id);
    if (!p) return [];
    const digital = p.productType === 'DIGITAL';
    return [{
      id: p.id,
      name: p.name,
      sku: p.sku,
      priceUSD: Number(p.priceUSD),
      imagen: p.mainImage || parseProductImages(p.images)[0] || null,
      marca: p.brand?.name ?? null,
      categoria: p.category?.name ?? null,
      digital,
      disponible: digital ? null : Math.max(0, p.stock - (apartado.get(p.id) ?? 0)),
    }];
  });
}

/**
 * Busca en los productos publicados por nombre, código (SKU o de barras), marca y categoría.
 * Primero exige todas las palabras; si no hay nada, acepta alguna de ellas, y al final perdona errores de tecleo.
 * `aproximado` avisa que lo que se muestra no coincide con todo lo escrito.
 */
export async function buscarProductosParaCotizar(busqueda: string): Promise<{ productos: ProductoParaCotizar[]; aproximado: boolean }> {
  const terminos = terminosDeBusqueda(busqueda.slice(0, 80));
  if (terminos.length === 0 || terminos.join('').length < 2) return { productos: [], aproximado: false };

  let aproximado = false;
  let filas = await candidatos(terminos, true);
  if (filas.length === 0 && terminos.length > 1) {
    filas = await candidatos(terminos, false);
    aproximado = filas.length > 0;
  }
  if (filas.length === 0) {
    const todos = await prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, name: true, sku: true, barcode: true, brand: { select: { name: true } }, category: { select: { name: true } } },
      take: TOPE_PARECIDOS,
    });
    filas = todos
      .map((p) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, marca: p.brand?.name ?? null, categoria: p.category?.name ?? null }))
      .filter((p) => {
        const palabras = normalizar(`${p.name} ${p.marca ?? ''}`).split(/[^a-z0-9ñ]+/).filter(Boolean);
        return terminos.some((t) => seParece(t, palabras));
      });
    aproximado = filas.length > 0;
  }

  const mejores = filas
    .map((fila) => ({ fila, puntos: puntaje(fila, busqueda, terminos) }))
    .sort((a, b) => b.puntos - a.puntos || a.fila.name.localeCompare(b.fila.name, 'es'))
    .slice(0, RESULTADOS)
    .map((x) => x.fila.id);
  return { productos: await productosParaCotizar(mejores), aproximado };
}
