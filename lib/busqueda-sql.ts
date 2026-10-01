// Piezas de SQL para buscar sin distinguir mayúsculas ni acentos (C-148b, C-158). Van de la mano de `normalizar()` de
// lib/cotizaciones/busqueda.ts: lo que ese texto hace en JavaScript, esto lo hace dentro de Postgres.

import { Prisma } from '@prisma/client';

// Postgres sin la extensión unaccent: los acentos se quitan con translate(). Las mayúsculas acentuadas van también
// en la lista: lower() de Postgres no las baja en todas las configuraciones de idioma de la base.
const CON_ACENTO = 'áéíóúàèìòùäëïöüâêîôûçñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÇÑ';
const SIN_ACENTO = 'aeiouaeiouaeiouaeioucnaeiouaeiouaeiouaeioucn';

export const sinAcentos = (expresion: Prisma.Sql) => Prisma.sql`translate(lower(${expresion}), ${CON_ACENTO}, ${SIN_ACENTO})`;

/** El término como patrón de LIKE, con sus comodines escapados */
export const patron = (termino: string) => `%${termino.replace(/[\\%_]/g, '\\$&')}%`;
