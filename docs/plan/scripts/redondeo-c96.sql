-- C-96 · Redondeo al centavo de los Puntos ES guardados antes del 21/09 (docs/plan/estado/C-96.md).
-- Autorizado por Andrés el 24/09. Se corre una sola vez; correrlo de nuevo no cambia nada.
--
-- Qué arregla: antes de C-96 un monto como 9,45 se guardaba como 9.449999999999999.
-- Solo toca cuentas cuya diferencia con el centavo es menor que una millonésima de dólar:
-- si alguna tuviera una diferencia real, no la cambia y la muestra.
--
-- En el servidor:
--   cd /var/www/electroshopve
--   DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//')
--   pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump
--   psql "$DB" -f docs/plan/scripts/redondeo-c96.sql
-- y se le pasa a Claude lo que salga en pantalla.

\set ON_ERROR_STOP on

\echo '== 1. Antes: cuentas con arrastre (se van a redondear) =='
SELECT count(*) AS con_arrastre FROM user_balances
 WHERE balance <> round(balance, 2) OR "totalRecharges" <> round("totalRecharges", 2) OR "totalSpent" <> round("totalSpent", 2);

\echo '== 2. Cuentas con una diferencia real (no se tocan; si no es 0, avisar a Claude) =='
SELECT count(*) AS diferencia_real FROM user_balances
 WHERE abs(balance - round(balance, 2)) >= 0.000001
    OR abs("totalRecharges" - round("totalRecharges", 2)) >= 0.000001
    OR abs("totalSpent" - round("totalSpent", 2)) >= 0.000001;

BEGIN;
UPDATE user_balances
   SET balance          = CASE WHEN abs(balance - round(balance, 2)) < 0.000001 THEN round(balance, 2) ELSE balance END,
       "totalRecharges" = CASE WHEN abs("totalRecharges" - round("totalRecharges", 2)) < 0.000001 THEN round("totalRecharges", 2) ELSE "totalRecharges" END,
       "totalSpent"     = CASE WHEN abs("totalSpent" - round("totalSpent", 2)) < 0.000001 THEN round("totalSpent", 2) ELSE "totalSpent" END
 WHERE balance <> round(balance, 2) OR "totalRecharges" <> round("totalRecharges", 2) OR "totalSpent" <> round("totalSpent", 2);
COMMIT;

\echo '== 3. Después: debe decir 0 (o el número del punto 2) =='
SELECT count(*) AS con_arrastre FROM user_balances
 WHERE balance <> round(balance, 2) OR "totalRecharges" <> round("totalRecharges", 2) OR "totalSpent" <> round("totalSpent", 2);
