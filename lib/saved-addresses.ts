// Libreta de direcciones del cliente (C-24).
// Se guarda en Profile.savedAddresses (JSON) porque es lo que ya lee el checkout: así "Mis direcciones"
// y el checkout comparten los mismos datos sin migración. La tabla Address no se usa.
// Las entradas viejas que guardó el checkout ({ address, city, state, createdAt }) se normalizan al leer.

import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const ADDRESS_TYPES = ['HOME', 'WORK', 'ZOOM', 'MRW'] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];
export const MAX_SAVED_ADDRESSES = 10;

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

export const addressInputSchema = z
  .object({
    type: z.enum(ADDRESS_TYPES).default('HOME'),
    firstName: text(60).default(''),
    lastName: text(60).default(''),
    addressLine1: text(200).min(1, 'La dirección es obligatoria'),
    addressLine2: text(200).default(''),
    city: text(80).min(1, 'La ciudad es obligatoria'),
    state: text(80).min(1, 'El estado es obligatorio'),
    postalCode: text(12).default(''),
    country: text(60).default('Venezuela'),
    phone: text(30).default(''),
    isDefault: z.boolean().default(false),
    agencyName: text(100).default(''),
    agencyCode: text(30).default(''),
  })
  .refine((data) => (data.type === 'ZOOM' || data.type === 'MRW' ? data.agencyName.length > 0 : true), {
    message: 'Indica el nombre de la agencia',
    path: ['agencyName'],
  });

export type AddressInput = z.infer<typeof addressInputSchema>;

export interface SavedAddress extends AddressInput {
  id: string;
  /** Copia de addressLine1: el checkout lee `address`, `city` y `state` */
  address: string;
  createdAt: string;
  updatedAt?: string;
}

const str = (value: unknown) => (typeof value === 'string' ? value : '');

// Entradas viejas sin id: id estable derivado de su contenido, para poder editarlas o borrarlas
function legacyId(entry: Record<string, unknown>): string {
  const key = [str(entry.address), str(entry.city), str(entry.state), str(entry.createdAt)].join('|');
  return `legacy-${createHash('sha1').update(key).digest('hex').slice(0, 12)}`;
}

function normalizeEntry(raw: unknown): SavedAddress | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const entry = raw as Record<string, unknown>;
  const addressLine1 = str(entry.addressLine1) || str(entry.address);
  if (!addressLine1 && !str(entry.city)) return null;
  const type = (ADDRESS_TYPES as readonly string[]).includes(str(entry.type)) ? (entry.type as AddressType) : 'HOME';

  return {
    id: str(entry.id) || legacyId(entry),
    type,
    firstName: str(entry.firstName),
    lastName: str(entry.lastName),
    addressLine1,
    addressLine2: str(entry.addressLine2),
    city: str(entry.city),
    state: str(entry.state),
    postalCode: str(entry.postalCode),
    country: str(entry.country) || 'Venezuela',
    phone: str(entry.phone),
    isDefault: entry.isDefault === true,
    agencyName: str(entry.agencyName),
    agencyCode: str(entry.agencyCode),
    address: addressLine1,
    createdAt: str(entry.createdAt),
    ...(str(entry.updatedAt) ? { updatedAt: str(entry.updatedAt) } : {}),
  };
}

/** Lee el JSON guardado. Nunca lanza: si está corrupto devuelve una lista vacía. */
export function parseSavedAddresses(json: string | null | undefined): SavedAddress[] {
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  return data
    .map(normalizeEntry)
    .filter((entry): entry is SavedAddress => entry !== null && !seen.has(entry.id) && Boolean(seen.add(entry.id)));
}

/** Predeterminada primero (el checkout precarga la primera); a lo sumo una predeterminada. */
export function serializeSavedAddresses(list: SavedAddress[]): string {
  let defaultSeen = false;
  const cleaned = list.map((entry) => {
    const isDefault = entry.isDefault && !defaultSeen;
    if (isDefault) defaultSeen = true;
    return { ...entry, isDefault, address: entry.addressLine1 };
  });
  cleaned.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  return JSON.stringify(cleaned);
}

export function createSavedAddress(input: AddressInput): SavedAddress {
  return { ...input, id: randomUUID(), address: input.addressLine1, createdAt: new Date().toISOString() };
}

/** Primer mensaje de validación, para mostrarlo tal cual al cliente. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message || 'Datos de dirección inválidos';
}

/**
 * Lee y reescribe la libreta con el perfil bloqueado (SELECT … FOR UPDATE): dos pestañas guardando
 * a la vez no se pisan. Si el usuario no tiene perfil, se crea antes de la transacción; si otra
 * petición lo crea al mismo tiempo, el choque de userId único se ignora.
 */
export async function updateSavedAddresses<T>(
  userId: string,
  update: (list: SavedAddress[]) => { list: SavedAddress[]; result: T } | { error: string; status: number }
): Promise<{ result: T; list: SavedAddress[] } | { error: string; status: number }> {
  try {
    await prisma.profile.upsert({ where: { userId }, create: { userId }, update: {} });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ savedAddresses: string | null }>>`
      SELECT "savedAddresses" FROM "profiles" WHERE "userId" = ${userId} FOR UPDATE`;
    const outcome = update(parseSavedAddresses(rows[0]?.savedAddresses));
    if ('error' in outcome) return outcome;
    const json = serializeSavedAddresses(outcome.list);
    await tx.profile.update({ where: { userId }, data: { savedAddresses: json } });
    return { result: outcome.result, list: parseSavedAddresses(json) };
  });
}
