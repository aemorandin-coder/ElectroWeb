# Punto de partida (actualizado 2026-09-28)

Léelo antes de empezar. En producción: 70093de (ElectroStudio C-112 + C-113), sirviendo `.next-b`. En GitHub, `main` ya tiene C-114 y G-69: falta el deploy.

## 0. Urgente: desplegar C-114 (Pago Móvil cobrado y orden rechazada)
- **En `main` y subida el 28/09** (merge y push autorizados por Andrés). Falta el deploy (§2). Detalle en `estado/C-114.md`.
- **Qué pasaba:** el mínimo de compra (y el máximo, las entregas apagadas y los problemas de stock) solo se revisaban al crear la orden, **después** de verificar el Pago Móvil. Andrés lo probó en producción con "Test Digital" (menos de $5): cobrado y sin pedido. Esos pagos no aparecían en ninguna pantalla del panel.
- **Qué hace C-114:**
  - El checkout no muestra el Pago Móvil ni deja completar mientras la orden no se pueda crear. Dice qué falta.
  - Si igual pasa, el dinero va al saldo del cliente, en USD a la tasa de la tienda (decisión de Andrés del 28/09).
  - En Transacciones aparece "Pagos Móvil de compra sin orden", con "Pasar a su saldo".
  - Aviso al equipo: `ORDER_PAYMENT_ORPHAN`.
- **Sin cambios de base.** Deploy normal (§2).
- **Después del deploy:** Andrés pasa a su saldo su pago de prueba, desde Transacciones.

## 1. Estado de las ramas
- **`main`:** todo hasta C-114 y G-69, subido el 28/09. En producción, hasta C-113.
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
- **Respaldo de archivos:** incluir `private-uploads/signatures/` (constancias firmadas) y `public/uploads/` (fotos de productos y de ElectroStudio).

**Deploys hechos:**
- **26/09:** C-104 a C-40. Respaldos `~/respaldo-antes-deploy-26-09.dump` y `~/firmas-2026-09-26.tgz`.
- **28/09:** ElectroStudio (C-112 + C-113). Tablas `studio_flyers` y `studio_brand`. Respaldo `~/respaldo-antes-deploy-28-09.dump`.
  - Hubo dos fallos del build: los tipos de una ruta borrada y la falta de memoria. Los dos se arreglaron en `deploy.sh` y `next.config.js`.

## 3. Qué sigue (Claude, en orden)
1. **C-114:** deploy (§0). Pasar a saldo el pago de prueba.
2. **Revisión final con Andrés** (`REVISION_FINAL.md`), y arreglar lo que salga. En producción:
   - Checkout: con el mínimo de compra activo, el aviso aparece antes de pagar. Una compra real con saldo y otra con Pago Móvil.
   - Una compra con cupón.
   - Firmar los términos desde "Recargar saldo".
   - Reportes → Seguridad con la IP real.
   - ElectroStudio ya lo probó Andrés el 28/09: "muy bien". Sus pedidos de mejora son C-116.
3. **C-115:** en `main` desde el 28/09.
   - `/carrito` avisa el mínimo y el máximo de compra antes del checkout, también sin sesión, y los productos que el servidor rechaza.
   - El mínimo cuenta solo los productos y el máximo, todo lo cobrado (decisión del 28/09). Configuración lo explica con un ejemplo.
4. **C-116: ElectroStudio más fácil de usar.** Fases 1 y 2 en `main` desde el 28/09. Detalle en `estado/C-116.md`.
   - Inicio con tarjetas, miniaturas y acciones directas; editor en `/admin/studio/<id>`; validaciones antes de descargar; una sola entrada.
   - Asistente de "Nueva historia" (`/admin/studio/nueva`) con dibujos de ejemplo, editor paso a paso y aviso de letra muy chica.
4b. **Ideas nuevas de Andrés (28/09), en este orden:**
   - **C-117 · Sello "ES" automático.** Al subir un PNG transparente: fondo blanco, producto centrado y sello abajo a la derecha. **Andrés manda el archivo del sello.**
   - **C-118 · Carga masiva con plantilla `.json`.** Plantilla con instrucciones para Claude en la nube; importar el `.json` con las fotos; se crean en borrador. El fondo se quita en el teléfono (iPhone: mantener el dedo sobre el producto; Samsung: "Extraer objeto").
   - **C-119 · Productos usados.** Lleva migración (con OK). Etiqueta "Usado" encima de la foto, sin el sello. Faltan las decisiones de garantía y cupones.
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
> 2. Pregúntame si ya desplegué C-114 y si pasé a saldo el pago de prueba (Transacciones → "Pagos Móvil de compra sin orden").
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Después sigue el orden de `SIGUIENTE.md` §3: la revisión final (`REVISION_FINAL.md`), C-115, C-116 (ElectroStudio), C-107, C-92 y el wizard de producto.
