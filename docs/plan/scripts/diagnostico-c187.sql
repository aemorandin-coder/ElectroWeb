-- C-187 · Diagnóstico de los productos "zombis" del panel. SOLO LEE: no cambia nada.
-- Uso, en el servidor (carpeta de la tienda):
--   DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/diagnostico-c187.sql > ~/diagnostico-c187.txt 2>&1
-- Y pasarle a Claude el contenido de ~/diagnostico-c187.txt.

\echo '1. Archivados fuera de la papelera (los que salen como "Archivado" en la lista), con lo que los ata'
SELECT p.sku, p.name, p."isFeatured" AS destacado, p.stock, c.name AS categoria,
       (SELECT count(DISTINCT oi."orderId") FROM order_items oi WHERE oi."productId" = p.id) AS ordenes,
       (SELECT string_agg(DISTINCT o.status::text, ', ') FROM order_items oi JOIN orders o ON o.id = oi."orderId" WHERE oi."productId" = p.id) AS estados_de_esas_ordenes,
       (SELECT count(*) FROM reviews r WHERE r."productId" = p.id) AS resenas,
       (SELECT count(*) FROM digital_codes d WHERE d."productId" = p.id) AS codigos,
       (SELECT count(*) FROM wishlist_items w WHERE w."productId" = p.id) AS favoritos,
       p."updatedAt"::date AS cambiado
FROM products p JOIN categories c ON c.id = p."categoryId"
WHERE p.status = 'ARCHIVED' AND p."deletedAt" IS NULL
ORDER BY p."updatedAt" DESC;

\echo '2. En la papelera ahora (los de más de 30 días los toma el cron de las 9:45)'
SELECT p.sku, p.name, p."deletedAt"::date AS movido, p."statusAntesDePapelera" AS estaba,
       (SELECT count(DISTINCT oi."orderId") FROM order_items oi WHERE oi."productId" = p.id) AS ordenes
FROM products p
WHERE p."deletedAt" IS NOT NULL
ORDER BY p."deletedAt";

\echo '3. Qué hizo la papelera (bitácora: movidos, restaurados y borrados para siempre; "archivado" = volvió a la lista)'
SELECT a."createdAt"::timestamp(0) AS cuando, a.action AS accion, left(a.details, 200) AS detalle
FROM audit_logs a
WHERE a.action IN ('PRODUCT_TRASHED', 'PRODUCT_RESTORED', 'PRODUCT_PURGED', 'PRODUCT_DELETED')
ORDER BY a."createdAt" DESC
LIMIT 60;

\echo '4. Categorías donde /api/categories contaba de más (todos los productos contra los publicados)'
SELECT c.name AS categoria, count(p.id) AS todos, count(p.id) FILTER (WHERE p.status = 'PUBLISHED') AS publicados
FROM categories c LEFT JOIN products p ON p."categoryId" = c.id
GROUP BY c.name
HAVING count(p.id) <> count(p.id) FILTER (WHERE p.status = 'PUBLISHED')
ORDER BY c.name;

\echo '5. Archivados que siguen marcados como destacados (la lista decía "Destacado (no se ve: inactivo)")'
SELECT count(*) AS archivados_destacados FROM products WHERE status = 'ARCHIVED' AND "isFeatured";
