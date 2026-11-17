// ¿Este Pago Móvil ya está registrado? (S-01). Solo servidor.
//
// Una verificación aprobada es "el mismo pago" que uno nuevo si es del mismo banco y, además, la referencia es la misma o
// el monto en bolívares es el mismo al céntimo y una referencia termina en la otra. El banco busca por monto exacto y
// compara por los últimos dígitos de la referencia, así que todas las formas de escribir un mismo pago ("5678" y
// "12345678") traen el mismo monto. La comparación se hace en la base con la referencia guardada sin espacios, para
// reconocer también las filas viejas que se guardaron tal como llegaron.

import type { PagoMovilVerificacion, Prisma } from '@prisma/client';
import { montoParaAPI } from './monto';

export interface DatosDePago {
  /** Código del banco, ya canónico (bancoCanonico) */
  banco: string;
  /** Referencia de 4 a 8 dígitos, ya canónica (referenciaCanonica) */
  referencia: string;
  /** Monto en bolívares del pago */
  importeBs: number;
}

/**
 * Ids de las verificaciones aprobadas que son el mismo pago, de la más vieja a la más nueva. `db` es `prisma` o el
 * cliente de una transacción. Lo escrito va siempre como parámetro de la plantilla, nunca pegado al texto de la consulta.
 */
export async function idsDelMismoPago(db: Prisma.TransactionClient, { banco, referencia, importeBs }: DatosDePago, tope: number): Promise<string[]> {
  // Céntimos exactos como texto: el número de JS arrastra el error de la coma flotante
  const importe = montoParaAPI(importeBs);
  // [[:space:]] y no \s: dentro de una plantilla de JS la barra se pierde y la consulta quitaría la letra "s"
  const filas = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "pago_movil_verificaciones"
    WHERE "verificado" = true
      AND btrim("bancoOrigen") = ${banco}::text
      AND length(regexp_replace("referencia", '[[:space:]]', '', 'g')) >= 4
      AND (
        regexp_replace("referencia", '[[:space:]]', '', 'g') = ${referencia}::text
        OR (
          round(COALESCE("importeVerificado", "importeSolicitado")::numeric, 2) = round(${importe}::text::numeric, 2)
          AND (
            regexp_replace("referencia", '[[:space:]]', '', 'g') LIKE '%' || ${referencia}::text
            OR ${referencia}::text LIKE '%' || regexp_replace("referencia", '[[:space:]]', '', 'g')
          )
        )
      )
    ORDER BY "createdAt" ASC
    LIMIT ${tope}`;
  return filas.map((fila) => fila.id);
}

/** La verificación aprobada más vieja que es el mismo pago, completa, o `null` si no hay ninguna. */
export async function buscarMismoPago(db: Prisma.TransactionClient, datos: DatosDePago): Promise<PagoMovilVerificacion | null> {
  const [id] = await idsDelMismoPago(db, datos, 1);
  return id ? db.pagoMovilVerificacion.findUnique({ where: { id } }) : null;
}
