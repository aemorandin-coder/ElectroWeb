# Punto de partida para la próxima conversación (actualizado 2026-09-15, tarde)

Léelo antes de empezar. Resume dónde quedó todo, qué falta subir a producción y qué hace cada agente.

## 1. Estado de las ramas

- **`main` local = `origin/main`.** Todo lo revisado ya está subido a GitHub (46 commits). Contiene:
  - **C-54** encabezado único · **C-33** imágenes optimizadas · **C-23b** popup de escritorio · **C-50b** Configuración rediseñada.
  - **C-72** hotfix de seguridad y dinero (recargas por Pago Móvil, documentos privados).
  - **C-73** notificaciones del equipo y bot de Telegram.
  - **R10 de Gemini** (G-35 acceso, G-36 páginas públicas, G-37 panel de creadores), revisada y corregida en **C-77**.
  - **C-74** flujo de órdenes del admin (stock, saldo y estados).
- **`claude/C-55`**: marco del panel del cliente **a medio hacer**. El layout ya está reescrito (cajón móvil, sin `backdrop-blur` ni `transform`, `useBodyScrollLock`, campana de C-73) y pasa `tsc` y ESLint, pero **le falta la prueba visual a 390 y 1440 px y su archivo de estado**. No mergear hasta terminar eso.
- **`gemini/R10`** (worktree `../ElectroShopVe-gemini`): ya mergeada. Gemini trajo `main` a su rama el 15/09 a las 18:21; **G-38 y G-39 siguen esperando `docs/plan/estado/C-55.md` en `main`**.

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
3. **C-55 · Marco del panel del cliente** → *en curso* en `claude/C-55`. Falta QA a 390/1440 y el estado. **Gemini está bloqueado esperándolo.**
4. **C-75 · Marketing y Contenido:** primero la auditoría y el mapa para Andrés, después el rediseño.
5. **C-51**, **C-60b**, **C-76**, **C-40**.

**Tareas nuevas que salieron de la revisión (proponer a Andrés):**
- **Panel de creadores a 390 px:** la barra lateral fija de 240 px deja ~138 px de contenido y todo se apila. Necesita cajón móvil como el admin y el cliente.
- **Login sin límite de intentos en el servidor** (ya anotado en `C-08.md`): el captcha solo se exige en el navegador y no se envía a NextAuth. Un atacante puede probar contraseñas contra cuentas de admin sin freno.

**Decisiones ya tomadas por Andrés (no volver a preguntar):**
- **C-74:** cancelar una orden pagada con saldo **devuelve ese saldo como crédito de la tienda**; el dinero nunca sale de la empresa (no hay ni habrá retiros). Una orden enviada o entregada no se cancela.
- **C-50b:** queda pendiente decidir si se borran de la BD las 29 columnas muertas de Configuración (es una migración; hoy no molestan).

## 4. Trabajo de Gemini (detalle en `PLAN_GEMINI.md`, Ronda R10)
- **G-35, G-36, G-37:** hechas, revisadas y en `main`. Lo que salió mal está en `PLAN_GEMINI.md` ("Lo que salió mal en G-35…G-37") y en `GEMINI.md`: **no corrió `tsc` y el build quedó roto por dos imports que faltaban**, volvió a dejar texto blanco sobre fondo claro y usó `danger` en vez de `deal` para los rojos.
- **G-38 y G-39:** esperan `docs/plan/estado/C-55.md` en `main`.
  - **G-38:** el modal de recarga lee la tasa de `/api/settings/public` desde C-72; no revertirlo.
  - **G-39:** la página de notificaciones del cliente usa `notification-meta` de C-73.

## 5. Mensajes para empezar

### Conversación nueva de Claude
> Continúa el proyecto ElectroShopVe. Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` y `docs/plan/PLAN_CLAUDE.md` §4b. Termina **C-55** (está a medias en `claude/C-55`: falta la prueba visual a 390 y 1440 px y el archivo de estado) y mergéala a `main` para desbloquear a Gemini. Luego sigue con C-75 y C-51. Busca bugs, seguridad y diseño inconsistente en todo lo que toques; nada de `git push` sin que yo lo pida.

### Conversación nueva de Gemini
> Continúa la Ronda R10 de `docs/plan/PLAN_GEMINI.md` en la rama `gemini/R10`. G-35 a G-37 ya están revisadas y en `main`. Antes de G-38 trae `main` a tu rama (`git merge main`) y comprueba que exista `docs/plan/estado/C-55.md`. Si no existe, no empieces y avisa. Lee "Lo que salió mal en G-35…G-37" antes de tocar nada. Un commit por tarjeta con su estado. No hagas merge ni push.

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
