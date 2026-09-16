# Punto de partida para la próxima conversación (actualizado 2026-09-15, tarde)

Léelo antes de empezar. Resume dónde quedó todo, qué falta subir a producción y qué hace cada agente.

## 1. Estado de las ramas

- **`main` local = `origin/main`.** Todo lo revisado ya está subido a GitHub (46 commits). Contiene:
  - **C-54** encabezado único · **C-33** imágenes optimizadas · **C-23b** popup de escritorio · **C-50b** Configuración rediseñada.
  - **C-72** hotfix de seguridad y dinero (recargas por Pago Móvil, documentos privados).
  - **C-73** notificaciones del equipo y bot de Telegram.
  - **R10 de Gemini** (G-35 acceso, G-36 páginas públicas, G-37 panel de creadores), revisada y corregida en **C-77**.
  - **C-74** flujo de órdenes del admin (stock, saldo y estados).
- **C-55** (marco del panel del cliente) está en `main` local desde el 16/09 con su estado: **G-38 y G-39 quedan desbloqueadas**. Trajo un arreglo global de animaciones (`globals.css`): cajones y modales ya no quedan debajo de la barra inferior.
- **`gemini/R10`** (worktree `../ElectroShopVe-gemini`): G-35…G-37 mergeadas. Sigue con G-38 y G-39 y, en la misma sesión, **R11** en `gemini/R11` (G-40…G-43: carrito, checkout, modales compartidos, páginas de error).

## 2. Deploy pendiente (el código ya está en GitHub; falta aplicarlo en el servidor)

En el servidor (`/var/www/electroshopve`, PM2 `electroshop-web`):

```bash
git pull
npx prisma db push      # ← solo esto necesita tu OK; ver abajo
npx tsx scripts/move-business-documents.ts          # muestra cuántos documentos movería (no toca nada)
npx tsx scripts/move-business-documents.ts --apply  # los mueve de verdad
npm run build
pm2 restart electroshop-web --update-env
```

`npm ci` no hace falta: `package-lock.json` no cambió.

### 2.1 Base de datos — qué hace exactamente `prisma db push`

Crea **2 tablas nuevas y 1 índice**, nada más. **No borra ni modifica ninguna tabla ni columna existente**, así que los datos de la tienda no corren riesgo. Es lo que necesita C-73 para guardar la configuración de avisos y los chats del bot de Telegram:

```sql
CREATE TABLE "admin_notification_settings" (…);  -- qué se avisa y por dónde, token del bot
CREATE TABLE "telegram_chats" (…);               -- los chats conectados al bot
CREATE UNIQUE INDEX "telegram_chats_chatId_key" ON "telegram_chats"("chatId");
```

**Puedes comprobarlo tú mismo antes de aplicarlo.** Este comando imprime el SQL que se ejecutaría, sin tocar la base:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
```

Si en esa salida solo ves `CREATE TABLE` y `CREATE INDEX` (sin `DROP` ni `ALTER … DROP COLUMN`), es seguro. Y si quieres respaldo antes, `pg_dump` de la base y listo. **Este es el paso que dijiste que necesita tu OK: sin él, la página de Notificaciones del panel no puede guardar nada.**

### 2.2 Documentos de empresa — qué hace `move-business-documents.ts`

C-72 arregló un hueco de seguridad: las cédulas, RIF y documentos que suben los clientes para verificar su empresa estaban en `public/uploads/documents/`, o sea que **cualquiera con el enlace podía abrirlos sin iniciar sesión**. Ahora se sirven por una ruta que exige sesión.

El script mueve los archivos que ya existen de `public/uploads/documents/` a `private-uploads/` y actualiza la ruta guardada en la base:
- **Sin `--apply`** solo cuenta y lista lo que movería. Córrelo así primero.
- **Con `--apply`** mueve de verdad. Si no lo corres, los documentos viejos siguen siendo públicos.

### 2.3 Después del deploy (cosas que haces tú en el panel)
1. **Notificaciones → Telegram:** crear el bot con @BotFather, pegar el token y "Conectar un chat".
2. **Configuración → Precios y pagos:** decidir si la tasa BCV se actualiza sola.

### 2.4 Cómo comprobar que quedó bien
- `/api/uploads/documents/<archivo>` sin sesión → 404, y `/uploads/documents/…` → 404.
- Una recarga de prueba por Pago Móvil con un monto menor al pedido **no** se aprueba sola.
- En el panel de órdenes (C-74): "Marcar pagado" descuenta stock, y cancelar pide el motivo.
- Entrar a la tienda, abrir un modal (por ejemplo el video de un curso) con la página desplazada: el modal debe salir centrado en la pantalla, no al final de la página.

## 3. Trabajo de Claude (detalle en `PLAN_CLAUDE.md` §4b)
1. ~~Revisar y mergear `gemini/R10`~~ → **hecho (C-77)**.
2. ~~C-74 flujo de órdenes del admin~~ → **hecho**.
3. ~~C-55 marco del panel del cliente~~ → **hecho**.
4. **C-78 · Retoques de la tienda** (pedido de Andrés el 16/09): Contáctanos más compacto, esqueletos de carga sin el hero viejo, logo del favicon en la gift card, `Modal` compartido con portal, `relative z-10` de `/servicios`.
5. **C-75 · Marketing y Contenido:** Andrés aprobó el rediseño; los correos deben poder llevar imágenes de verdad.
6. **C-79** panel de creadores en móvil, **C-80** límite de intentos en el login, **C-81** `components/ui` con estilos viejos, **C-51**, **C-60b**, **C-76**, **C-40**. Orden en `PLAN_CLAUDE.md` §4b.


**Decisiones ya tomadas por Andrés (no volver a preguntar):**
- **C-74:** cancelar una orden pagada con saldo **devuelve ese saldo como crédito de la tienda**; el dinero nunca sale de la empresa (no hay ni habrá retiros). Una orden enviada o entregada no se cancela.
- **C-50b:** queda pendiente decidir si se borran de la BD las 29 columnas muertas de Configuración (es una migración; hoy no molestan).

## 4. Trabajo de Gemini (detalle en `PLAN_GEMINI.md`, Ronda R10)
- **G-35, G-36, G-37:** hechas, revisadas y en `main`. Lo que salió mal está en `PLAN_GEMINI.md` ("Lo que salió mal en G-35…G-37") y en `GEMINI.md`: **no corrió `tsc` y el build quedó roto por dos imports que faltaban**, volvió a dejar texto blanco sobre fondo claro y usó `danger` en vez de `deal` para los rojos.
- **G-38 y G-39:** desbloqueadas (C-55 en `main`).
- **R11 (G-40…G-43):** carrito, checkout (2.356 líneas), modales compartidos y páginas de error. Se hace en la misma sesión, en `gemini/R11` desde `gemini/R10`.
  - **G-38:** el modal de recarga lee la tasa de `/api/settings/public` desde C-72; no revertirlo.
  - **G-39:** la página de notificaciones del cliente usa `notification-meta` de C-73.

## 5. Mensajes para empezar

### Conversación nueva de Claude
> Continúa el proyecto ElectroShopVe. Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` y `docs/plan/PLAN_CLAUDE.md` §4b. Sigue el orden de la tabla (C-78 retoques de la tienda, C-75 Marketing). Cuando Gemini avise, revisa `gemini/R10` (G-38, G-39) y `gemini/R11` (G-40…G-43) antes de mergear. Busca bugs, seguridad y diseño inconsistente en todo lo que toques; nada de `git push` sin que yo lo pida.

### Conversación nueva de Gemini (sesión larga: R10 + R11)
> Trabajo pesado en dos rondas seguidas de `docs/plan/PLAN_GEMINI.md`, sin esperar revisión entre ellas.
> 1. **Ronda R10:** en la rama `gemini/R10`, trae `main` (`git merge main`) y comprueba que existe `docs/plan/estado/C-55.md`. Lee "Lo que salió mal en G-35…G-37" y `docs/plan/estado/C-55.md` ("Para Gemini"). Haz **G-38** y **G-39**.
> 2. **Ronda R11:** después del commit de G-39, crea `gemini/R11` desde `gemini/R10` y haz **G-40, G-41, G-42 y G-43** en orden. Lee "Reglas de R11": el carrito y el checkout mueven dinero, **solo cambias `className`** salvo los "Arreglos permitidos".
> En cada tarjeta, antes del commit: `npx tsc --noEmit` (pega la salida real), `git diff --stat` vs `git diff -w --stat` (misma cifra aproximada), `'use client'` en la primera línea, greps de la tarjeta y QA a 390 y 1440 px. Un commit por tarjeta con su `docs/plan/estado/G-XX.md`. Si algo no cuadra, `BLOQUEADO` en el estado y pasas a la siguiente. No hagas merge ni push: al terminar, avisa a Andrés.

## 6. Datos útiles para el agente
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Pruebas E2E:**
  - Esquema aislado `cNN_demo` (reemplazar `schema=public` en `DATABASE_URL`), `prisma db push`, datos de prueba, `npm run build` y `next start -p 3100` con `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY=`.
  - Al final: `DROP SCHEMA … CASCADE`.
- **Servicios externos simulados** (Telegram, BDV, hCaptcha, DolarAPI): `NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"`; su estado vive en `scripts/e2e/mock/`.
- **Navegador:** Firefox headless con `--remote-debugging-port` + WebDriver BiDi (conectar a `ws://127.0.0.1:9333/session`, no a la raíz). Sirve para capturas con espera, clics y medir estilos calculados.
- **Sesión sin login:** firmar el JWT con `encode` de `next-auth/jwt` y ponerlo en la cookie `next-auth.session-token` con `storage.setCookie`.
- **Lint:** comparar contra `main` (`git show main:f | npx eslint --stdin --stdin-filename f`); el repo tiene errores viejos.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …`.
