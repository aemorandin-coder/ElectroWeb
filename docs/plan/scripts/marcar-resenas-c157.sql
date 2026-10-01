-- C-157 · Marcar como "ya pedida" la reseña de las órdenes entregadas antes del cron (docs/plan/estado/C-157.md).
-- Se corre una sola vez, justo después del deploy y antes de poner el cron; correrlo de nuevo no cambia nada.
--
-- Por qué: hasta C-157 la tienda mandaba el correo de reseña en el mismo instante de la entrega. Esas órdenes ya
-- lo recibieron; sin este paso el cron les mandaría un segundo correo a las entregadas en los últimos 30 días.
-- Solo escribe la columna nueva `orders.reviewRequestedAt`.
--
-- En el servidor:
--   cd /var/www/electroshopve
--   DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//')
--   psql "$DB" -f docs/plan/scripts/marcar-resenas-c157.sql
-- Muestra dos números: cuántas órdenes se marcaron y cuántas entregadas quedan sin marcar (debe ser 0).

\set ON_ERROR_STOP on

UPDATE orders
   SET "reviewRequestedAt" = "deliveredAt"
 WHERE status = 'DELIVERED' AND "reviewRequestedAt" IS NULL AND "deliveredAt" IS NOT NULL;

\echo '== Entregadas sin marcar (debe ser 0, salvo las que no tienen fecha de entrega) =='
SELECT count(*) AS sin_marcar FROM orders
 WHERE status = 'DELIVERED' AND "reviewRequestedAt" IS NULL AND "deliveredAt" IS NOT NULL;
