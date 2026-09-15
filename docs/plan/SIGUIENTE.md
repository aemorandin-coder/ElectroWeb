# Punto de partida para la próxima conversación (actualizado 2026-09-15)

Léelo antes de empezar. Resume dónde quedó todo, qué falta subir a producción y qué hace cada agente.

## 1. Estado de las ramas

- **`main` local:** 20+ commits por delante de `origin/main`. **Nada de esto está en producción.** Contiene:
  - **C-54:** encabezado único y menú con Contáctanos.
  - **C-33:** imágenes optimizadas y header fijo con modales.
  - **C-23b:** popup a tamaño de escritorio.
  - **C-50b:** Configuración rediseñada.
  - **C-72:** hotfix de seguridad y dinero. **Urgente:** recargas por Pago Móvil aprobadas con cualquier monto.
  - **C-73:** notificaciones del equipo y bot de Telegram.
  - **Planes:** R10 de Gemini y R11 de Claude.
- **`gemini/R10`** (worktree `../ElectroShopVe-gemini`):
  - G-35, G-36 y G-37 terminadas, **sin revisar ni mergear**. Salió de `770e58f`; no comparte archivos con lo que entró después a `main`.
  - G-38 y G-39 esperan a C-55.
- **Andrés pidió esperar a Gemini para subir todo junto.** No hacer `git push` sin que lo pida.

## 2. Deploy pendiente (cuando Andrés dé el OK)
En el servidor (`/var/www/electroshopve`, PM2 `electroshop-web`):
```bash
git pull
npm ci                         # si cambió package-lock (no cambió en C-72/C-73)
npx prisma db push             # C-73: crea admin_notification_settings, telegram_chats y un índice. No borra nada.
npx tsx scripts/move-business-documents.ts          # C-72: muestra cuántos documentos moverá
npx tsx scripts/move-business-documents.ts --apply # los mueve a private-uploads/
npm run build
pm2 restart electroshop-web --update-env
```
- **Variables nuevas:** ninguna. El bot de Telegram se configura en el panel.
- **Después del deploy (Andrés):**
  1. Panel → Notificaciones → Telegram: crear el bot en @BotFather, pegar el token y "Conectar un chat".
  2. Configuración → Precios y pagos: decidir si la tasa BCV es automática.
- **Comprobar en producción:**
  - `/api/uploads/documents/<archivo>` sin sesión → 404.
  - `/uploads/documents/…` → 404.
  - Una recarga de prueba por Pago Móvil con monto menor al pedido no se aprueba sola.

## 3. Trabajo de Claude (detalle en `PLAN_CLAUDE.md` §4b)
1. **Revisar `gemini/R10` (G-35…G-37)** con el procedimiento de siempre:
   - `git diff --stat main...gemini/R10` frente a `-w` (sangría).
   - `'use client'` primero.
   - Los greps de cada tarjeta.
   - Capturas a 390 y 1440 px.
   - Merge local.
2. **C-74:** flujo de órdenes del admin. "Pagado" no descuenta stock, cancelar falla, stock devuelto de más, asignación masiva.
3. **C-55:** marco del panel del cliente (desbloquea G-38/G-39).
4. **C-75:** Marketing y Contenido. Primero la auditoría y el mapa para Andrés; después el rediseño.
5. **C-51**, **C-60b**, **C-76**, **C-40**.

**Decisiones que esperan a Andrés:**
- **C-74:** ¿cancelar una orden pagada con saldo reintegra el saldo automáticamente?
- **C-50b:** ¿borrar de la BD las 29 columnas muertas de Configuración? Es una migración; hoy no molestan.

## 4. Trabajo de Gemini (detalle en `PLAN_GEMINI.md`, Ronda R10)
- **G-35…G-37:** hechas en `gemini/R10`, esperan revisión de Claude.
- **G-38 y G-39:** esperan `docs/plan/estado/C-55.md` en `main`.
  - **G-38:** el modal de recarga lee la tasa de `/api/settings/public` desde C-72; no revertirlo.
  - **G-39:** la página de notificaciones del cliente usa `notification-meta` de C-73.
- **Próxima ronda (R11, la escribe Claude al cerrar R10):** reparto sugerido.
  - **Carril Gemini:** estilos de las pantallas del admin que queden fuera de C-51/C-75 y las páginas del cliente que falten.
  - **Carril Claude:** lo que toque APIs o dinero.

## 5. Mensajes para empezar

### Conversación nueva de Claude
> Continúa el proyecto ElectroShopVe. Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` y `docs/plan/PLAN_CLAUDE.md` §4b. Empieza por revisar la rama `gemini/R10` (G-35 a G-37) y mergearla a `main` local si pasa. Luego sigue con C-74, C-55 y C-75 en ese orden. Recuerda: busca bugs, seguridad y diseño inconsistente en todo lo que toques; nada de `git push` sin que yo lo pida.

### Conversación nueva de Gemini
> Continúa la Ronda R10 de `docs/plan/PLAN_GEMINI.md` en la rama `gemini/R10`. G-35 a G-37 ya están hechas y Claude las revisa. Antes de G-38 trae `main` a tu rama (`git merge main`) y comprueba que exista `docs/plan/estado/C-55.md`. Si no existe, no empieces G-38/G-39 y avisa. Lee otra vez "Lo que aprendimos en R9" y las notas nuevas de G-38 (tasa del modal de recarga) y G-39 (notificaciones). Un commit por tarjeta con su estado. No hagas merge ni push.

## 6. Datos útiles para el agente
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Pruebas E2E:**
  - Esquema aislado `cNN_demo` (reemplazar `schema=public` en `DATABASE_URL`), `prisma db push`, datos de prueba, `npm run build` y `next start -p 3100` con `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY=`.
  - Al final: `DROP SCHEMA … CASCADE`.
- **Servicios externos simulados** (Telegram, BDV, hCaptcha, DolarAPI) sin tocar el código: `NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"` (reemplaza `globalThis.fetch`; su estado vive en `scripts/e2e/mock/`: `telegram-calls.jsonl`, `telegram-updates.json`, `bdv-next.json`, `rate.json`).
- **Lint:** comparar contra `main` (`git show main:f | npx eslint --stdin --stdin-filename f`); el repo tiene errores viejos.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …`.
