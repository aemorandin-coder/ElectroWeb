import type { Prisma } from '@prisma/client';
import { normalizeKey, toSlug } from '@/lib/product-import';

// Marca de un producto escrita a mano en el asistente (C-155).
// Hasta C-155 solo la carga masiva (C-118) ponía la marca: el asistente no tenía el campo, y sin marca el producto
// sale incompleto en el catálogo de Meta y en los datos estructurados (C-149).

export const MARCA_MAXIMO = 60;

/** La marca tal como se guarda, '' si viene vacía, o el motivo por el que no vale */
export function leerNombreMarca(valor: unknown): { nombre: string } | { error: string } {
  if (valor === null || valor === undefined) return { nombre: '' };
  if (typeof valor !== 'string') return { error: 'Marca inválida' };
  const nombre = valor.replace(/\s+/g, ' ').trim();
  if (!nombre) return { nombre: '' };
  if (nombre.length > MARCA_MAXIMO) return { error: `La marca pasa de ${MARCA_MAXIMO} caracteres` };
  // Letras, números y los signos que llevan las marcas reales (AT&T, D-Link, Hewlett-Packard, B+W, L'Oréal)
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .&+'-]*$/u.test(nombre) || !toSlug(nombre)) return { error: 'La marca solo lleva letras, números, espacios y . & + -' };
  return { nombre };
}

/**
 * El id de la marca: la que ya existe con ese nombre (sin distinguir mayúsculas ni tildes: "xiaomi" es "Xiaomi") o
 * una nueva. null si el nombre está vacío.
 */
export async function resolverMarca(tx: Prisma.TransactionClient, nombre: string): Promise<string | null> {
  if (!nombre) return null;
  const slug = toSlug(nombre);
  const marcas = await tx.brand.findMany({ select: { id: true, name: true, slug: true } });
  const existente = marcas.find((m) => m.slug === slug || normalizeKey(m.name) === normalizeKey(nombre));
  if (existente) return existente.id;
  const creada = await tx.brand.upsert({ where: { slug }, update: {}, create: { name: nombre, slug } });
  return creada.id;
}
