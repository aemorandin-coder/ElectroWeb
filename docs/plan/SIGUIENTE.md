# Punto de partida (actualizado 2026-09-29)

Léelo antes de empezar. En GitHub, `main` tiene todo hasta C-123 (subido el 29/09). **Falta el deploy, y lleva cambio de base.**
Producción ya mostraba C-114 el 29/09 (captura de Andrés): el commit exacto del servidor se anota tras este deploy.

## 0. Urgente: deploy del 29/09 (§2)
- **Qué lleva** (todo en `main`, deploy pedido por Andrés el 29/09):
  - **C-114, G-69, C-115, C-116, C-117 y C-119** si todavía no estaban en el servidor (ver el §0 anterior en el historial de git).
  - **C-118:** Productos → Más → "Importar (.json)" (carga masiva con plantilla para Claude).
  - **C-121:** el correo de compra dice "Usado", el pago real (pagado o por confirmar) y el descuento.
  - **C-122:** menú "Garantías" (estados, historial, fotos privadas, devolución al saldo).
  - **C-123:** en Transacciones, "Es esta orden" y "Ya se atendió" para los Pagos Móvil sin orden.
- **Cambio de base: solo aditivo.** Sin dependencias nuevas. Contra el esquema de 70093de, el SQL tiene: 6 `CREATE TYPE`, 2 `CREATE TABLE` (`warranty_claims`, `warranty_claim_events`), `ADD COLUMN` en `products`, `order_items` y `pago_movil_verificaciones`, índices y `ADD CONSTRAINT` **solo de las tablas nuevas**. Si C-119 ya estaba aplicado, saldrá menos. **Ningún `DROP` ni `ALTER ... TYPE`**: si aparece alguno, parar y avisar a Claude.
- **Pasos en el servidor** (`/var/www/electroshopve`):
  1. `git log -1 --oneline` (para anotar qué había).
  2. Respaldo de la base: `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-29-09b.dump`
  3. Respaldo de archivos: `tar czf ~/archivos-29-09b.tgz private-uploads public/uploads`
  4. `git pull --ff-only` y `bash scripts/deploy.sh`. El guion para y muestra el SQL.
  5. Si el SQL es como el de arriba: `npx prisma db push` y `bash scripts/deploy.sh` otra vez.
- **Después del deploy, en producción:**
  1. **Transacciones, los 2 pagos de diciembre (ref. 9601 y 189689): NO "Pasar a su saldo".** Si sale una orden con "mismo monto" → "Es esta orden". Si no → "Ya se atendió" con una nota ("Pagado y entregado en diciembre de 2025").
  2. Menú "Garantías": aparece, vacío, sin error.
  3. Productos → Más → "Importar (.json)" → "Descargar plantilla": trae las categorías reales.
  4. Una compra de prueba barata con saldo: el correo dice "Recibimos tu pago" y "Total pagado".
  5. Si C-119 entra en este deploy, también: producto **Usado** de prueba en borrador, `/terminos` 3.0 y la página "Garantía" del cliente.

## 0b. Nuevo del 29/09 (tarde): 5 módulos pedidos por Andrés, en ramas, sin mergear
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
- **`main`:** todo hasta C-123 (C-118, C-121, C-122 y C-123 mergeados el 29/09). Las ramas `claude/C-118` a `claude/C-123` ya están en `main`.
- **Gemini:** R23 (G-69) cerrada y en `main`, con dos arreglos de Claude (resultado al final de `PLAN_GEMINI.md`). **No tiene ronda abierta.** Su carril no tiene deudas de reglas (verificado el 28/09 con `grep`: 0 hex, 0 textos de menos de 11 px, 0 `font-black`, 0 `z-[número]`, 0 `alert` o `console.log` y 0 emojis).
- **ChatGPT:** fuera del equipo desde el 21/09. Limpieza opcional en la máquina de Andrés: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- **Historial de tareas:** cada una tiene su `docs/plan/estado/C-XX.md`. Resumen en `PLAN_CLAUDE.md`, "Orden de trabajo".

## 2. Deploy
- Servidor `/var/www/electroshopve`, proceso de PM2 `electroshop`. `ecosystem.config.js` está desactualizado y no se usa.

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
