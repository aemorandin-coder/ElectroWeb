# Punto de partida (actualizado 2026-09-29)

Léelo antes de empezar. En producción: 70093de (hasta C-113), sirviendo `.next-b`. En GitHub, `main` ya tiene C-114, G-69, C-115, C-116 y C-117: **falta el deploy**.

## 0. Urgente: deploy (§2)
- **Qué lleva** (todo en `main`, merge y push autorizados por Andrés el 28 y 29/09):
  - **C-114:** el checkout no deja pagar si la orden no se puede crear. Un Pago Móvil sin orden va al saldo del cliente.
  - **G-69:** filtro "Reembolsos" en Mi saldo.
  - **C-115:** el carrito avisa el mínimo y el máximo. El mínimo cuenta solo los productos.
  - **C-116:** ElectroStudio con inicio, acciones directas, validaciones, asistente y editor paso a paso.
  - **C-117:** la cinta "ES" automática en las fotos de producto transparentes.
- **Sin cambios de base ni de dependencias.** Deploy normal (§2).
- **Después del deploy, en producción:**
  1. Transacciones → "Pagos Móvil de compra sin orden" → "Pasar a su saldo" el pago de prueba de Andrés (C-114).
  2. Configuración → Precios y pagos → Montos por compra: poner el mínimo que se quiera (ya explica qué cuenta) y verlo en `/carrito` con un producto barato.
  3. Productos → Nuevo → subir un PNG transparente sacado del teléfono: debe salir con fondo blanco y la cinta.
  4. ElectroStudio: "Nueva historia" con ese producto. La foto debe salir sin la cinta.
  5. Marketing ya no tiene la pestaña "ElectroStudio".

## 1. Estado de las ramas
- **`main`:** todo hasta C-117, subido el 29/09. En producción, hasta C-113.
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
1. **Deploy** (§0) y las pruebas de después.
2. **Revisión final con Andrés** (`REVISION_FINAL.md`), y arreglar lo que salga. En producción:
   - Checkout: con el mínimo de compra activo, el aviso aparece antes de pagar. Una compra real con saldo y otra con Pago Móvil.
   - Una compra con cupón.
   - Firmar los términos desde "Recargar saldo".
   - Reportes → Seguridad con la IP real.
3. **Hechas y en `main`:** C-115 (mínimo en el carrito), C-116 (ElectroStudio, fases 1 y 2) y C-117 (cinta "ES" automática). Detalle en sus `estado/C-XX.md`.
4. **C-118 · Carga masiva con plantilla `.json`** (idea de Andrés, 28/09). Sigue ahora: ya tiene la cinta (C-117).
   - "Descargar plantilla": campos, categorías y marcas válidas, e instrucciones para Claude en la nube. Claude llena la ficha desde las fotos; **el precio lo da Andrés**.
   - "Importar" el `.json` con las fotos: vista previa con errores por fila, y se crean en borrador.
   - El fondo se quita en el teléfono (iPhone: mantener el dedo sobre el producto; Samsung: "Extraer objeto").
   - Conviene hacerla después de C-119, para que la plantilla ya traiga la condición. Si no, se agrega luego.
4b. **C-119 · Productos usados y reacondicionados.** Propuesta lista en `estado/C-119.md`, con Amazon Renewed, eBay y la ley.
   - Decidido: cupones no, ofertas sí; la garantía la da la tienda; etiqueta "Usado" sin la cinta.
   - **Falta de Andrés:** qué condiciones usar, los días de garantía por condición, la devolución de usados y el OK de la migración.
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
- **Usados (28/09):** no aplican cupones, sí ofertas; la garantía la da la tienda.
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
> 2. Pregúntame si ya hice el deploy del §0 y cómo salieron las pruebas de después, y si decidí lo que falta de C-119 (`estado/C-119.md`, "Decisiones de Andrés").
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Después sigue el orden de `SIGUIENTE.md` §3: la revisión final, C-119 y C-118, C-107, C-92, el wizard de producto y C-120.
