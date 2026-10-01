-- C-92 · Diagnóstico de órdenes sin cliente (incidente del 17/09, docs/plan/AUDITORIA_CLIENTES_BORRADOS.md).
-- Solo lee: no cambia nada. En el servidor:
--   cd /var/www/electroshopve
--   DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//')
--   psql "$DB" -f docs/plan/scripts/diagnostico-c92.sql > ~/diagnostico-c92.txt 2>&1
-- y se le pasa a Claude el contenido de ~/diagnostico-c92.txt.

\echo '== 1. Órdenes sin cliente (ni registrado ni invitado) =='
SELECT o."orderNumber", o.status, o."paymentStatus", o."paymentMethod", o."totalUSD", o."createdAt"
FROM orders o WHERE o."userId" IS NULL AND o."guestEmail" IS NULL ORDER BY o."createdAt" DESC;

\echo '== 2. Productos de esas órdenes =='
SELECT o."orderNumber", o.status, i."productName", p."productType", i.quantity, p.stock AS stock_actual
FROM orders o JOIN order_items i ON i."orderId" = o.id JOIN products p ON p.id = i."productId"
WHERE o."userId" IS NULL AND o."guestEmail" IS NULL ORDER BY o."createdAt" DESC;

\echo '== 3. Códigos digitales entregados o vendidos en esas órdenes =='
SELECT o."orderNumber", d.status, p.name FROM digital_codes d
JOIN orders o ON o.id = d."orderId" JOIN products p ON p.id = d."productId"
WHERE o."userId" IS NULL AND o."guestEmail" IS NULL;

\echo '== 4. Gift cards de cuentas que ya no existen (sin el correo completo) =='
SELECT left(g."recipientEmail", 3) || '***' AS destinatario, g.status, g."balanceUSD", g."createdAt" FROM gift_cards g
WHERE (g."purchasedBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = g."purchasedBy"))
   OR (g."redeemedBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = g."redeemedBy"));
