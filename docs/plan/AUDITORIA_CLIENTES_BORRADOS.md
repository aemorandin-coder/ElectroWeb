# Incidente: clientes borrados con pedidos en curso (17/09)

Autor: Claude (auditoría sin tocar código) · Para: Andrés, y las tareas para el equipo

## Qué pasó
Andrés pidió unas tarjetas de saldo en una compra de prueba. Con los pedidos en proceso borró a los clientes, y ahora 3 productos quedaron en pedidos cuyo cliente ya no existe.

## Por qué pasa (leyendo el esquema y las APIs)
1. **La orden no protege a su cliente.** En `prisma/schema.prisma` la relación es `Order.user User? @relation(fields: [userId], references: [id])`, sin `onDelete`. Como es opcional, Prisma aplica `SetNull`: al borrar el usuario **la orden sigue viva con `userId = NULL`**. El panel la muestra como "Invitado".
2. **El botón "Eliminar" del admin sí protege** (`DELETE /api/customers/[id]` rechaza clientes con órdenes). Entonces los clientes se borraron por otro camino: directo en la base (pgAdmin, Prisma Studio, SQL) o con `scripts/reset-customers.ts`.
3. **`scripts/reset-customers.ts` es peligroso:** borra **todas** las órdenes, saldos, perfiles y **todos los usuarios, incluidos los administradores**, y crea `cliente@test.com` con clave `password123`. No debe existir en el repositorio de producción.
4. **Lo que se pierde al borrar un cliente** (todo tiene `onDelete: Cascade` hacia el usuario):
   - Perfil (cédula y teléfono), direcciones, reservas de stock, reseñas de servicios, lista de deseos, notificaciones y cursos.
   - **Su saldo y todas sus transacciones** (`UserBalance` → `Transaction`): se pierde el historial de recargas y compras con saldo. Es dinero que la empresa recibió.
   - Las gift cards guardan `purchasedBy` y `redeemedBy` como texto sin relación: quedan apuntando a una cuenta que ya no existe.
5. **Lo que sí se conserva:** las verificaciones de Pago Móvil (`PagoMovilVerificacion.userId` es texto sin relación). Por eso **una referencia bancaria ya usada no se puede volver a cobrar** en otra cuenta. Eso está bien.
6. **Stock:** los productos digitales (tarjetas de saldo) no descuentan stock, así que no hay unidades perdidas. Si alguno era físico y la orden se pagó, el stock ya se descontó y solo vuelve al cancelar la orden.

## Qué hacer hoy en producción (Andrés, sin código)
1. **Diagnóstico (solo lee, no cambia nada).** En el servidor: `psql "$DATABASE_URL"`, y pega:
   ```sql
   -- 1. Órdenes sin cliente (ni registrado ni invitado)
   SELECT o."orderNumber", o.status, o."paymentStatus", o."paymentMethod", o."totalUSD", o."createdAt"
   FROM orders o WHERE o."userId" IS NULL AND o."guestEmail" IS NULL ORDER BY o."createdAt" DESC;

   -- 2. Productos de esas órdenes
   SELECT o."orderNumber", o.status, i."productName", p."productType", i.quantity, p.stock AS stock_actual
   FROM orders o JOIN order_items i ON i."orderId" = o.id JOIN products p ON p.id = i."productId"
   WHERE o."userId" IS NULL AND o."guestEmail" IS NULL ORDER BY o."createdAt" DESC;

   -- 3. Códigos digitales entregados o vendidos en esas órdenes
   SELECT o."orderNumber", d.status, p.name FROM digital_codes d
   JOIN orders o ON o.id = d."orderId" JOIN products p ON p.id = d."productId"
   WHERE o."userId" IS NULL AND o."guestEmail" IS NULL;

   -- 4. Gift cards de cuentas que ya no existen
   SELECT g."recipientEmail", g.status, g."balanceUSD", g."createdAt" FROM gift_cards g
   WHERE (g."purchasedBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = g."purchasedBy"))
      OR (g."redeemedBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = g."redeemedBy"));
   ```
   (Probadas contra la tienda de ejemplo: corren sin errores.)
2. **Limpiar las órdenes de prueba desde el panel:** Órdenes → abrir cada una (sale como "Invitado") → **Cancelar** con el motivo "Prueba: cliente eliminado". Producción ya tiene el flujo de C-74:
   - Si estaba pagada, devuelve el stock físico.
   - No intenta devolver saldo a una cuenta que no existe.
   - Las enviadas o entregadas no se cancelan: esas se dejan como están.
3. Si la consulta 4 muestra gift cards activas, **no las borres**: anótalas y se revisan con Claude.
4. **No vuelvas a borrar clientes directo en la base** ni corras `scripts/reset-customers.ts`. Para pruebas, crea clientes con correos de prueba y déjalos.
5. Guarda la salida de las consultas en un mensaje para Claude: con eso se decide si hace falta un script de reparación.

## Tareas para el equipo
| ID | Quién | Qué |
|---|---|---|
| **GPT-02b** | ChatGPT (R1) | En órdenes del admin: una orden con `userId` nulo **y** sin `guestEmail` dice "Cliente eliminado" (no "Invitado"), con un badge neutral. Solo presentación. |
| **G-52** | Gemini (R15) | ✅ Borrado `scripts/reset-customers.ts` (C-93). |
| **C-92** | Claude (después del descanso) | 1. "Eliminar cliente" pasa a **desactivar**: `accountStatus SUSPENDED` (no `DEACTIVATED`: ese lo usa el propio cliente en Configuración y entrar la reactiva), sale de listados y campañas; nunca se borra si tiene órdenes, saldo, transacciones o gift cards. 2. ✅ C-80: el login y Google rechazan `SUSPENDED`, y la sesión abierta se corta en la siguiente petición. 3. Esquema: `Order.user` con `onDelete: Restrict`, y `UserBalance` y `Transaction` que no se borren en cascada (**migración: necesita OK de Andrés**). 4. `scripts/ordenes-sin-cliente.ts` con modo de prueba y `--apply`, si el diagnóstico lo pide. |
| **Decisión de Andrés (17/09)** | — | **Sí:** se borra de verdad un cliente **sin** órdenes, sin saldo ni transacciones y sin gift cards (por ejemplo, spam). Si tiene cualquiera de esas cosas, se **desactiva**. |
