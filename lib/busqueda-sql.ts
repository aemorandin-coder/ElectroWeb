// Piezas de SQL para buscar sin distinguir mayúsculas ni acentos (C-148b, C-158). Van de la mano de `normalizar()` de
// lib/cotizaciones/busqueda.ts: lo que ese texto hace en JavaScript, esto lo hace dentro de Postgres.

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { terminosDeBusqueda } from '@/lib/cotizaciones/busqueda';

// Postgres sin la extensión unaccent: los acentos se quitan con translate(). Las mayúsculas acentuadas van también
// en la lista: lower() de Postgres no las baja en todas las configuraciones de idioma de la base.
const CON_ACENTO = 'áéíóúàèìòùäëïöüâêîôûçñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÇÑ';
const SIN_ACENTO = 'aeiouaeiouaeiouaeioucnaeiouaeiouaeiouaeioucn';

export const sinAcentos = (expresion: Prisma.Sql) => Prisma.sql`translate(lower(${expresion}), ${CON_ACENTO}, ${SIN_ACENTO})`;

/** El término como patrón de LIKE, con sus comodines escapados */
export const patron = (termino: string) => `%${termino.replace(/[\\%_]/g, '\\$&')}%`;

const IDENTIFICADOR = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Ids de las filas de `tabla` cuyo texto (las `columnas` juntas) contiene todas las palabras de `busqueda`, sin
 * distinguir acentos ni mayúsculas (C-160): "jose" encuentra a "José", "perez" a "Pérez". Para las búsquedas del panel
 * (clientes, firmas, garantías, destinatarios, cotizaciones) y de los cursos, que usaban `contains` de Prisma.
 * `tabla` y `columnas` son nombres fijos del código, nunca del usuario (se validan igual); lo escrito va como parámetro.
 */
export async function idsPorTexto(tabla: string, columnas: string[], busqueda: string, tope = 5000): Promise<string[]> {
  const terminos = terminosDeBusqueda(busqueda.slice(0, 100));
  if (terminos.length === 0) return [];
  if (!IDENTIFICADOR.test(tabla) || columnas.length === 0 || !columnas.every((c) => IDENTIFICADOR.test(c))) {
    throw new Error('Nombre de tabla o de columna no válido');
  }
  const texto = sinAcentos(Prisma.sql`concat_ws(' ', ${Prisma.raw(columnas.map((c) => `"${c}"`).join(', '))})`);
  const condiciones = terminos.map((t) => Prisma.sql`${texto} LIKE ${patron(t)}`);
  const filas = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM ${Prisma.raw(`"${tabla}"`)} WHERE ${Prisma.join(condiciones, ' AND ')} LIMIT ${tope}`;
  return filas.map((f) => f.id);
}
