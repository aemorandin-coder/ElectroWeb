# Punto de partida (actualizado 2026-09-30)

Léelo antes de empezar. En GitHub, `main` tiene todo hasta C-123 (subido el 29/09). **Falta el deploy, y lleva cambio de base.**
Producción ya mostraba C-114 el 29/09 (captura de Andrés): el commit exacto del servidor se anota tras este deploy.

## 00. Nuevo del 30/09: C-130 a C-134 (ramas listas, sin mergear)
Pedidos de Andrés del 29 y 30/09. **Dos cadenas independientes**; cada una se mergea en su orden:
- **Cadena A (dinero):** `claude/C-130` → `claude/C-131` → `claude/C-132`. C-131 sale de C-130 y C-132 de C-131.
  - **C-130 · Teléfono y cédula del BDV:** el checkout mandaba `584121234567` y el banco decía "Formato de teléfono inválido". Arreglado en el checkout, la recarga, la verificación y "Consultar Pago Móvil".
  - **C-131 · "Puntos ES":** regla legal de Andrés, nunca "saldo" ni "billetera" en textos. 186 textos. **Falta que Andrés publique la versión 2 de los términos de recarga desde Admin → Legal** (texto en `estado/C-131.md`; al publicarla, cada cliente la firma en su próxima recarga).
  - **C-132 · Checkout:** "¿Cómo deseas pagar?" con los métodos activos, Binance Pay y PayPal manuales con reserva de 2 h, pago mixto Puntos ES + Pago Móvil, reservas que apartan de verdad. **Lleva cambio de base (aditivo):**
    ```sql
    ALTER TABLE "orders" ADD COLUMN "paymentReference" TEXT, ADD COLUMN "pointsUSD" DECIMAL(65,30) NOT NULL DEFAULT 0;
    ALTER TABLE "stock_reservations" ADD COLUMN "orderId" TEXT;
    CREATE INDEX "stock_reservations_orderId_idx" ON "stock_reservations"("orderId");
    ```
- **Cadena B (productos, se puede subir sola y ya):** `claude/C-133` → `claude/C-134`. Sin cambio de base.
  - **C-133 · Cinta ES:** también con fondo blanco liso (la foto de los audífonos Piston del 30/09 no la tenía), la cinta en la esquina de la foto en la ficha, el catálogo y la vitrina, guardar sin la espera de 2,5 s, y al editar "Guardar cambios" en cada paso.
  - **C-134 · Asistente de productos:** menos espacio, sin redundancia, validaciones iguales en el formulario y el servidor.
- **Probado junto:** rama temporal con las 5 mezcladas: 0 conflictos, `tsc`, `build` y ESLint (0 errores). Pruebas de cada una en su `estado/C-13X.md`.
- **Después del deploy, en producción:**
  1. Una compra con Pago Móvil desde un perfil con teléfono `+58 …`: debe verificar al primer intento.
  2. Volver a subir la foto de los audífonos Piston (la de `~/Escritorio/AUDIFONOS-PISTON-con-cinta.png` o la original: ahora la cinta sale sola). Editar un producto cambiando solo el precio.
  3. Activar Binance Pay y PayPal en Métodos de pago (con su QR si hay) y hacer una compra de prueba con cada uno: queda "Por validar" y se confirma con "Marcar pagado".
  4. Una compra con pago mixto (algo de Puntos ES y el resto por Pago Móvil) y cancelarla: vuelven los Puntos ES.
- **Pendiente de Andrés:**
  - ¿Los Puntos ES se muestran como dinero ("$12,50 en Puntos ES", como ahora) o como número de puntos?
  - Servicio técnico en taller: "viene de otro sistema". ¿Cuál es, y tiene API o exportación?
  - Especificaciones: C-134 las dejó recomendadas (3), no obligatorias. ¿Está bien?
- **Siguen del pedido del 29/09 (en este orden):** panel del cliente (Mis pedidos con miniaturas y ZOOM, favoritos en grilla con "Mover al carrito", direcciones con el selector de oficinas ZOOM y MRW del checkout y cédula del receptor), perfil en pestañas y la página de Puntos ES, y el taller cuando Andrés diga de dónde salen los datos.

## 0. Urgente: deploy del 29/09 (noche), C-118 a C-129
Todo está en `main` y en GitHub (merges de C-124 a C-129 hechos el 29/09 por pedido de Andrés).
- **Qué lleva:** lo del deploy anterior si todavía no se hizo (C-114 a C-123), más C-124 a C-129 (§0b).
- **Cambio de base: solo aditivo.**
  - Si el deploy de C-118 a C-123 ya se hizo, el SQL son exactamente 3 `ADD COLUMN`:
    - `reviews`: `rejectedAt` y `rejectionReason`.
    - `pago_movil_verificaciones`: `tasaVES`.
  - Si no se hizo, se suman los `CREATE TYPE` y `CREATE TABLE` de garantías y las columnas de C-119 y C-123.
  - **Ningún `DROP` ni `ALTER ... TYPE`**: si aparece alguno, parar y avisar a Claude.
- **Pasos en el servidor** (`/var/www/electroshopve`):
  1. `git log -1 --oneline` (para anotar qué había).
  2. Respaldo de la base: `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-29-09c.dump`
  3. Respaldo de archivos: `tar czf ~/archivos-29-09c.tgz private-uploads public/uploads`
  4. `git pull --ff-only` y `bash scripts/deploy.sh`. El guion para y muestra el SQL.
  5. Si el SQL es como el de arriba: `npx prisma db push` y `bash scripts/deploy.sh` otra vez.
- **Después del deploy, en producción:**
  1. **Reseñas:** aprobar la de Luis Morandin. Sin 500; sale en la ficha del producto.
  2. **Pago Móvil:** una compra real, barata, copiando el monto con "Copiar monto". Si es de noche, mejor después de las 8 p. m. (el fallo de la fecha). Debe verificar al primer intento.
  3. **Transacciones → "Consultar Pago Móvil"** con los datos de ese pago: "El banco confirma" y "ya se usó en la tienda: orden …".
  4. **Tiempo real:** Admin → Órdenes en dos navegadores; avanzar una orden en uno y verla cambiar en el otro sin recargar. Si dice "Reconectando…" todo el tiempo, revisar nginx (§2).
  5. **Órdenes:** abajo aparece "Cargar más órdenes (50 de N)" si hay más de 50, y "Cobrado" cuenta solo lo pagado.
  6. **Cliente, en el teléfono:** Inicio con saldo, compras activas y garantías, y los pedidos en curso con su stepper. Barra inferior: Inicio, Pedidos, Saldo, Favoritos y Más.
  7. Si el deploy anterior no se había hecho, también sus pruebas (en el historial de git de este archivo).
- **Si algo sale mal:** `git reset --hard 3267cfd && npm install && bash scripts/deploy.sh --sin-pull` vuelve a lo anterior. Las columnas nuevas no molestan al código viejo.

## 0b. Nuevo del 29/09 (tarde): 6 tareas pedidas por Andrés, ya en `main`
**Orden de merge obligatorio:** `claude/C-124` → `claude/C-125` → `claude/C-126` → `claude/C-127` → `claude/C-128` → `claude/C-129`.
- C-127 sale de C-126 y ya integra C-125. C-128 sale de C-127.
- Probado en una rama temporal con los cinco mezclados: 0 conflictos, `tsc` y `build` pasan, y las pruebas de punta a punta de reseñas, Pago Móvil (24/24) y tiempo real dan lo esperado.
- **C-124 · Reseñas:** el 500 al aprobar era la columna `isPublished`, que no existe. Ahora hay estado "rechazada" con motivo y un panel de moderación nuevo.
- **C-125 · Pago Móvil:** el 1010 venía de un céntimo de diferencia entre la pantalla y el banco (3,5 % de los totales) y de la fecha UTC después de las 8 p. m. Además:
  - Monto congelado con cotización firmada.
  - Pagos de más al saldo, pagos de menos se completan con otro Pago Móvil, diferencias de hasta Bs. 1 absorbidas.
  - Formulario nuevo: "Copiar todos los datos" y solo la referencia.
- **C-126 · Detalle de la orden:**
  - El pago en palabras ("Billetera Electro Shop", "Pago Móvil · Banesco · Ref.") y la facturación separada del envío.
  - "Copiar guía" y "Consultar ZOOM ahora". El enlace de ZOOM no toma la guía: se verificó.
  - **La lista de Órdenes mostraba solo las últimas 25.**
- **C-127 · Tiempo real (SSE):** órdenes, stock y pagos sin recargar, optimista en el panel y respaldo si se cae la conexión.
- **C-128 · Panel del cliente:** resumen (saldo, compras activas, garantías), pedidos en curso con stepper en vivo y barra inferior con Saldo. Arregla las misiones que marcaban 0 %.
- **C-129 · Pago Móvil, lo legal y la API** (sale de C-128):
  - Se quitó "billetera" de los textos: es la palabra de la sanción de SUDEBAN a Yummy.
  - Tolerancia de Bs. 14, la comisión mínima P2C que paga la tienda.
  - `reqCed` solo en pagos BDV a BDV (otra causa probable del 1010).
  - Duplicados por referencia y banco, y una verificación a la vez por referencia.
  - El `orderId` del navegador se ignora.
  - Nuevo "Consultar Pago Móvil" en Transacciones.
  - La investigación con fuentes está en `estado/C-129.md`.
- **Cambio de base (todo aditivo), SQL esperado en el deploy:**
  - `ALTER TABLE "reviews" ADD COLUMN "rejectedAt" TIMESTAMP(3), ADD COLUMN "rejectionReason" TEXT;`
  - `ALTER TABLE "pago_movil_verificaciones" ADD COLUMN "tasaVES" DECIMAL(65,30);`
- **Decidido por Andrés el 29/09:**
  - El sobrepago va al saldo.
  - Sin subir capturas: se usa la verificación con el BDV.
  - La barra inferior del cliente queda aprobada.
- **Pendiente de Andrés:** ¿"saldo" se queda o pasa a "anticipo" / "abono" en toda la tienda? (ver `estado/C-129.md`).
- Detalle y pruebas de cada una en su `estado/C-12X.md`.

## 1. Estado de las ramas
- **`main`:** todo hasta C-129 (C-124 a C-129 mergeados y subidos el 29/09 en la noche). Las ramas `claude/C-118` a `claude/C-129` ya están en `main`.
- **Gemini:** R23 (G-69) cerrada y en `main`, con dos arreglos de Claude (resultado al final de `PLAN_GEMINI.md`). **No tiene ronda abierta.** Su carril no tiene deudas de reglas (verificado el 28/09 con `grep`: 0 hex, 0 textos de menos de 11 px, 0 `font-black`, 0 `z-[número]`, 0 `alert` o `console.log` y 0 emojis).
- **ChatGPT:** fuera del equipo desde el 21/09. Limpieza opcional en la máquina de Andrés: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- **Historial de tareas:** cada una tiene su `docs/plan/estado/C-XX.md`. Resumen en `PLAN_CLAUDE.md`, "Orden de trabajo".

## 2. Deploy
- Servidor `/var/www/electroshopve`, proceso de PM2 `electroshop`. `ecosystem.config.js` está desactualizado y no se usa.
- **Tiempo real (C-127):** `/api/realtime` usa Server-Sent Events y manda `X-Accel-Buffering: no`, así que nginx no necesita cambios. Si el panel dice "Reconectando…" todo el tiempo, revisar en el `location` de nginx que `proxy_read_timeout` sea de 60 s o más (el latido es cada 25 s) y que no haya `proxy_buffering on` forzado. PM2 debe seguir en **una sola instancia**: el bus de eventos vive en memoria.

**Cada deploy:**
```bash
cd /var/www/electroshopve
git pull --ff-only          # primero: el guion que corre no se actualiza a sí mismo en la misma corrida
bash scripts/deploy.sh
```
- Compila en `.next-a` o `.next-b` (la que no se sirve) y solo entonces reinicia. La tienda no se cae durante el build.
- **Si el build falla o la tienda no responde con la versión nueva, sigue la anterior.**
- **Si el deploy cambia la base, el guion para y muestra el SQL.** Si hay un DROP o un `ALTER ... TYPE`, avisa a Claude. Si no: `npx prisma db push` y se corre de nuevo.
- Instala dependencias cuando `package-lock.json` cambió desde la última instalación.
- Borra los tipos generados de la carpeta en uso y no copia la caché de Turbopack (causas de los dos fallos del 28/09).
- **Respaldo de la base antes de un deploy con cambios de base:**
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-<fecha>.dump`
  (`pg_dump` no acepta el `?schema=` de la URL de Prisma).
- **Volver atrás:** `git reset --hard <commit> && npm install && bash scripts/deploy.sh --sin-pull`.
- **Memoria:** el servidor tiene 7,8 GB. El build usa unos 2,7 GB. Andrés agregó 4 GB de swap el 28/09.
- **Respaldo de archivos:** incluir `private-uploads/signatures/` (constancias firmadas), `private-uploads/warranty/` (fotos de garantía, desde C-122) y `public/uploads/` (fotos de productos y de ElectroStudio).

**Deploys hechos:**
- **26/09:** C-104 a C-40. Respaldos `~/respaldo-antes-deploy-26-09.dump` y `~/firmas-2026-09-26.tgz`.
- **28/09:** ElectroStudio (C-112 + C-113). Tablas `studio_flyers` y `studio_brand`. Respaldo `~/respaldo-antes-deploy-28-09.dump`.
  - Hubo dos fallos del build: los tipos de una ruta borrada y la falta de memoria. Los dos se arreglaron en `deploy.sh` y `next.config.js`.

## 3. Qué sigue (Claude, en orden)
1. **Deploy** (§0) y las pruebas de después.
2. **Revisión final con Andrés** (`REVISION_FINAL.md`), y arreglar lo que salga. En producción:
   - Checkout: con el mínimo de compra activo, el aviso aparece antes de pagar. Una compra real con saldo y otra con Pago Móvil.
   - Una compra con cupón.
   - Firmar los términos desde "Recargar saldo".
   - Reportes → Seguridad con la IP real.
3. **Hechas y en `main`:** C-115 (mínimo en el carrito), C-116 (ElectroStudio, fases 1 y 2) y C-117 (cinta "ES" automática). Detalle en sus `estado/C-XX.md`.
4. **C-118 · Carga masiva con plantilla `.json`:** hecha el 29/09 (rama `claude/C-118`, `estado/C-118.md`). Productos → Más → "Importar (.json)". Sin cambio de base.
   - Andrés: probarla con 2 o 3 productos reales y claude.ai.
4b. **C-119 · Productos usados y reacondicionados:** hecha y en `main` el 29/09 (`estado/C-119.md`). Lleva cambio de base (§0).
   - "Usado" en el correo de compra: hecho en C-121 (29/09, rama `claude/C-121`), con 4 arreglos del correo (decía "debitado de tu billetera" también en un Pago Móvil por confirmar, faltaba el descuento, no escapaba el nombre y la dirección).
   - Módulo de garantías: hecho en C-122 (29/09, rama `claude/C-122`, sobre C-121; **lleva tablas nuevas**). Menú "Garantías" con estados, historial, notas internas, fotos privadas y devolución al saldo de verdad (`estado/C-122.md`).
4c. **C-120 · Facturación a empresa, IVA y términos** (pedida por Andrés el 29/09 para después, con investigación a fondo):
   - El flujo empieza cuando el cliente cambia a "empresa" en su panel, para facturar.
   - Revisar las leyes venezolanas (IVA, facturación, ventas en línea, protección al consumidor) y los términos y condiciones, pensando en el crecimiento de la empresa.
   - Mientras tanto, el interruptor "Cobrar IVA" de Configuración queda como está: no tiene efecto (`STORE_CHARGES_TAX = false`).
5. **C-107:** seguro del envío a elección del cliente. Espera los costos de ZOOM y MRW y el OK de la migración.
6. **C-92:** desactivar clientes en vez de borrarlos. Detalle en `AUDITORIA_CLIENTES_BORRADOS.md`.
   - Falta de Andrés: las 4 consultas de diagnóstico y cancelar esas órdenes con el motivo "Prueba: cliente eliminado".
   - Lleva una migración de `onDelete`, con su OK.
7. **Wizard de producto** (crear y editar): rediseño paso a paso, lo que quedó de C-51.
8. **Menores:**
   - Aviso cuando un favorito entra en oferta.
   - Ordenar el catálogo por el precio de oferta.
   - Ocultar el formulario de reseña a quien no puede reseñar.
   - `/terminos` y `/privacidad` como documentos editables.
   - Conservar el slug al renombrar una categoría.
   - Advertencias "Dynamic filesystem access" de `app/api/uploads/[...path]`.
   - Los 11 errores de ESLint fuera de `app`, `components`, `lib` y `contexts`: `scripts/`, `prisma/seed.ts`, `proxy.ts` y `docs/plan/scripts`.
9. **ElectroStudio:** el artefacto "Flyers ElectroShop" ya se puede retirar. Si Andrés quiere pasar sus historias, se hace un importador.
10. **Al cerrar el ciclo:** borrar el esquema `rev10_demo` y los archivos de prueba de `private-uploads/signatures/` de la máquina local.

## 4. Decisiones tomadas (no volver a preguntar)
- **Google:** vincular por correo; teléfono y cédula en la primera compra; admins nunca con Google.
- **Cédula:** fuera del registro.
- **Gift card:** solo con saldo.
- **Onboarding:** con física.
- **ChatGPT:** fuera del equipo.
- **Envíos:** ZOOM y MRW con cobro a destino.
- **Clientes:** se borran solo si no tienen nada; si tienen, se desactivan.
- **Dinero:**
  - Nunca sale de la empresa.
  - Comisiones solo por compras pagadas.
  - **Pago Móvil sin orden → al saldo del cliente** (28/09).
  - **Mínimo de compra solo sobre los productos**, sin embalaje ni envío. **Máximo sobre todo lo que paga el cliente** (28/09).
- **Productos (28/09):** el fondo de las fotos se quita desde el teléfono; los usados llevan etiqueta "Usado" y no el sello "ES".
- **Usados (28 y 29/09):** cuatro condiciones (Nuevo, Caja abierta, Reacondicionado, Usado); cupones no, ofertas sí; la garantía la da la tienda (30, 30, 90 y 30 días por defecto); **sin devoluciones por cambio de opinión** (falla, daño o producto distinto se atienden como garantía).
- **Migraciones:** Andrés autorizó siempre (29/09). Aditivas y con respaldo.
- **IVA (29/09):** se deja para C-120, junto con la facturación a empresa y la revisión legal.
- **ElectroStudio (28/09):** dos pantallas (inicio y editor); lo agotado o sin publicar avisa y deja descargar; miniaturas reales en la lista.
- **Descuentos (25/09):**
  - Si hay varios, gana el mayor.
  - Los digitales, fuera.
  - Precio tachado.
  - "Pedir descuento" reemplazado por ofertas y cupones.
  - El cupón de monto fijo va primero a los productos sin oferta.
- **Duplicar producto:** el servidor copia todo. La copia nace en borrador y sin stock.
- **Reseñas:** solo con una orden entregada del producto.
- **ElectroStudio:**
  - Nombre, historias en la base y trabajo por fases (26/09).
  - Fase 2 (28/09): la tasa BCV, el aviso de historia vencida, qué historia vende, deshacer y estilos, y el fondo con foto propia. El plan semanal automático quedó fuera.
- **Credenciales del historial (C-40):**
  - Revisado el 26/09: no había nada que cambiar.
  - Si algún día se configura el webhook de SADES, usar un secreto nuevo.
  - Sigue recomendado poner el repositorio en privado.

- **Saldo y Pago Móvil, reglas legales (29/09, C-129):**
  - El saldo solo compra en la tienda: nunca se transfiere a otro cliente, nunca se retira, nunca paga a terceros. Así queda como "esquema de prepago", excluido de la regulación del BCV (Resolución 18-12-01, art. 19).
  - Nunca "billetera", "wallet" ni "monedero" en textos.
  - La comisión del Pago Móvil P2C (hasta 1,5 %, mínimo Bs. 14) la paga la tienda. **No se cobra recargo al cliente**: está prohibido.
  - Lo pagado de más se acredita completo.

## 5. Datos útiles para Claude
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Antes de tocar nada:** `git status`, `git log -3` y `git branch --show-current`. Gemini a veces trabaja en la carpeta principal.
- **Tienda de ejemplo:** esquema `rev10_demo`, con el esquema del 28/09 aplicado.
  - Productos de prueba: audífonos, teclado, gift card y Robux con montos.
  - Cupones de ejemplo (HOLA15, CINCO, FUTURO).
  - Un cliente con teléfono y cédula (`cliente@demo.test`) y un admin (`admin@demo.test`).
- **Servidor de prueba:** build con `DATABASE_URL` de `rev10_demo` y `NEXT_DIST_DIR=.next-test`, y `next start -p 3100` con estas variables:
  - Siempre: `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY= HCAPTCHA_SECRET=test NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"`.
  - Para ver el Pago Móvil en el checkout, además: `BDV_API_KEY=prueba BDV_TELEFONO_COMERCIO=04140000000`.
  - **Al terminar:** borrar `.next-test` y `git checkout tsconfig.json` (Next le agrega la carpeta).
- **Pruebas:**
  - HTTP con Node y un JWT firmado con `encode` de `next-auth/jwt`.
    - Admin: `userType: 'admin'`.
    - Cliente: `userType: 'customer'` y `emailVerified`.
  - Navegador con Firefox headless y WebDriver BiDi.
    - Para leer un canvas, usar `canvas[role=img]`: el primer `<canvas>` puede ser una miniatura.
    - Detener las animaciones antes de capturar.
- **ESLint:** 0 errores en `app`, `components`, `lib` y `contexts`, y 6 avisos a propósito.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …`.
- **Repositorio público:** nada secreto en archivos versionados. Buscar credenciales antes de cada push.

## 6. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame si ya hice el deploy del §0 (con el cambio de base) y cómo salieron las pruebas de después.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Después sigue el orden de `SIGUIENTE.md` §3: la revisión final, C-118, C-107, C-92, el wizard de producto y C-120.
