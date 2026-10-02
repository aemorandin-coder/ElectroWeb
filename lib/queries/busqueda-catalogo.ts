// Búsqueda del catálogo de la tienda (C-158). Solo servidor.
// No distingue mayúsculas ni acentos ("bateria" encuentra "Batería"), acepta varias palabras en cualquier orden y
// entiende plurales ("cargadores" encuentra "Cargador"): las mismas reglas del buscador de cotizaciones (C-148b).
// Si ninguna coincide exacto, perdona un error de tecleo ("samsumg") y lo avisa con `aproximado`.
// Busca en nombre, descripción, marca, categoría, SKU y código de barras (C-160) y devuelve los ids por relevancia
// (`puntaje` de cotizaciones: el código exacto, el nombre que empieza por lo escrito, las palabras…); a igualdad, el más nuevo.

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { patron, sinAcentos } from '@/lib/busqueda-sql';
import { normalizar, puntaje, seParece, terminosDeBusqueda } from '@/lib/cotizaciones/busqueda';

/** Cada palabra puede estar en el nombre, la descripción, el código (SKU o de barras), la marca o la categoría ("teclado aoas") */
const TEXTO = sinAcentos(Prisma.sql`concat_ws(' ', p."name", p."description", p."sku", p."barcode", b."name", c."name")`);

/** Tope de ids que se pasan a la consulta del catálogo */
const TOPE_COINCIDENCIAS = 3000;
/** Tope de productos que se revisan cuando hay que perdonar un error de tecleo */
const TOPE_PARECIDOS = 4000;

export interface CoincidenciasCatalogo {
  /** Ids de los productos publicados que responden a la búsqueda, los más relevantes primero; el catálogo les suma sus filtros */
  ids: string[];
  /** true si no hubo coincidencia exacta y se muestran productos que se parecen */
  aproximado: boolean;
}

interface Candidato {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  marca: string | null;
  categoria: string | null;
  createdAt: Date;
}

/** Los candidatos, de más a menos relevantes; a igualdad, el más nuevo primero. */
function porRelevancia(candidatos: Candidato[], busqueda: string, terminos: string[]): string[] {
  return candidatos
    .map((c) => ({ c, puntos: puntaje({ name: c.name, sku: c.sku, barcode: c.barcode, marca: c.marca, categoria: c.categoria }, busqueda, terminos) }))
    .sort((a, b) => b.puntos - a.puntos || b.c.createdAt.getTime() - a.c.createdAt.getTime() || a.c.id.localeCompare(b.c.id))
    .map((x) => x.c.id);
}

export async function buscarEnCatalogo(busqueda: string): Promise<CoincidenciasCatalogo> {
  const terminos = terminosDeBusqueda(busqueda.slice(0, 80));
  if (terminos.length === 0) return { ids: [], aproximado: false };

  const condiciones = terminos.map((t) => Prisma.sql`${TEXTO} LIKE ${patron(t)}`);
  const exactos = await prisma.$queryRaw<Candidato[]>`
    SELECT p."id", p."name", p."sku", p."barcode", b."name" AS "marca", c."name" AS "categoria", p."createdAt"
    FROM "products" p
    LEFT JOIN "brands" b ON b."id" = p."brandId"
    LEFT JOIN "categories" c ON c."id" = p."categoryId"
    WHERE p."status" = 'PUBLISHED' AND ${Prisma.join(condiciones, ' AND ')}
    LIMIT ${TOPE_COINCIDENCIAS}`;
  if (exactos.length > 0) return { ids: porRelevancia(exactos, busqueda, terminos), aproximado: false };

  // Sin coincidencia exacta: cada palabra debe estar escrita igual o parecerse a alguna palabra del producto
  const todos = await prisma.product.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, name: true, sku: true, barcode: true, createdAt: true, brand: { select: { name: true } }, category: { select: { name: true } } },
    take: TOPE_PARECIDOS,
  });
  const parecidos: Candidato[] = todos
    .filter((p) => {
      const texto = normalizar(`${p.name} ${p.brand?.name ?? ''} ${p.category?.name ?? ''}`);
      const palabras = texto.split(/[^a-z0-9ñ]+/).filter(Boolean);
      return terminos.every((t) => texto.includes(t) || seParece(t, palabras));
    })
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, marca: p.brand?.name ?? null, categoria: p.category?.name ?? null, createdAt: p.createdAt }));
  return { ids: porRelevancia(parecidos, busqueda, terminos), aproximado: parecidos.length > 0 };
}
