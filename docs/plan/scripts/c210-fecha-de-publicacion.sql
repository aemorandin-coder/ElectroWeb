-- C-210: la fecha en que salió a la tienda cada producto ya publicado ("Recién llegados" ordena por ella).
-- Correr una sola vez, después de `npx prisma db push` (que agrega la columna "publishedAt"). No toca nada más.
-- 1. Si la bitácora vio cambiar su estado, la última vez que lo vio.
-- 2. Si no: lo creado desde la carga del proveedor (en borrador, desde el 10/11) toma su última modificación, que es
--    cuando se publicó si no se tocó después; lo demás se publicaba al crearlo (el asistente), y toma su creación.
UPDATE "products" p
SET "publishedAt" = COALESCE(
  (SELECT MAX(a."createdAt") FROM "audit_logs" a
    WHERE a."targetId" = p."id" AND a."action" = 'PRODUCT_UPDATED' AND a."details" LIKE '%"estado"%'),
  CASE WHEN p."createdAt" >= '2026-11-10' THEN p."updatedAt" ELSE p."createdAt" END
)
WHERE p."status" = 'PUBLISHED' AND p."publishedAt" IS NULL;

-- Comprobación: debe decir 0 (ningún publicado sin fecha)
SELECT COUNT(*) AS publicados_sin_fecha FROM "products" WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NULL;
