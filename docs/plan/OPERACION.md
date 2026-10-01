# Operación: servidor, deploy y pruebas

> Lo que no cambia de una tarea a otra. Lo pendiente está en [`SIGUIENTE.md`](./SIGUIENTE.md); lo ya subido, en [`HISTORIAL.md`](./HISTORIAL.md).
> El repositorio es público: aquí no va ninguna clave, ni datos fiscales o financieros de la empresa.

## 1. Servidor
- Carpeta `/var/www/electroshopve`, proceso de PM2 `electroshop`, usuario `luami`. PM2 en **una sola instancia**: el bus de eventos del tiempo real vive en memoria.
- `ecosystem.config.js` está desactualizado (otro nombre y otra carpeta) y no se usa: nunca `pm2 start ecosystem.config.js`.
- **Memoria:** 7,8 GB y 4 GB de swap (28/09). El build usa unos 2,7 GB.
- **nginx:**
  - Pasa la IP real del cliente (`X-Real-IP` y `X-Forwarded-For`). Confirmado por Andrés el 01/10 (C-105). De eso dependen los límites de intentos, el modo mantenimiento y la bitácora.
  - `www.electroshopve.com` debe redirigir a `electroshopve.com` (C-149). Si `curl -sI https://www.electroshopve.com/` responde `200` en vez de `308`, falta un bloque `server` para `www` con `return 301 https://electroshopve.com$request_uri;`.
  - **Tiempo real (C-127):** `/api/realtime` usa Server-Sent Events y manda `X-Accel-Buffering: no`. Si el panel dice "Reconectando…" todo el tiempo: `proxy_read_timeout` de 60 s o más (el latido es cada 25 s) y sin `proxy_buffering on` forzado.
- **Crons** (`crontab -l` de `luami`, desde el 30/09). Cada guion lee `CRON_SECRET` del `.env`:
  - `0 * * * * /home/luami/cron-favoritos.sh`: avisos de favoritos (C-138).
  - `15 */2 * * * /home/luami/cron-envios.sh`: rastreo de las guías de ZOOM (C-100).
  - Para probar uno a mano se corre el guion: responde JSON (`revisados`, `avisos`…).
- **Variables de entorno:** todas explicadas en `.env.example`. Opcionales que todavía no están en el servidor: `GROQ_API_KEY` (C-155, la pone Andrés con el deploy), `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` (C-145), `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (C-85).

## 2. Deploy
El deploy lo hace Andrés. Claude deja en `SIGUIENTE.md` **un solo bloque** con todo lo que falta subir: el commit que debe tener producción, el SQL total, las pruebas en orden y la vuelta atrás.

```bash
cd /var/www/electroshopve
git log -1 --oneline        # anotar qué había
git pull --ff-only          # primero: el guion que corre no se actualiza a sí mismo en la misma corrida
bash scripts/deploy.sh
```
- Compila en `.next-a` o `.next-b` (la que no se sirve) y solo entonces reinicia. La tienda no se cae durante el build.
- **Si el build falla o la tienda no responde con la versión nueva, sigue la anterior.**
- **Si el deploy cambia la base, el guion para y muestra el SQL.**
  - Solo se sigue si son `ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX` o `CREATE TYPE` y coinciden con el bloque de `SIGUIENTE.md`.
  - Si aparece un `DROP` o un `ALTER ... TYPE`: no seguir y avisar a Claude.
  - Si coincide: `npx prisma db push` y `bash scripts/deploy.sh` otra vez.
- Instala dependencias cuando `package-lock.json` cambió desde la última instalación.
- **No usar `npm run build` a mano con la tienda corriendo:** borra la carpeta que se está sirviendo.

**Respaldo antes de un deploy con cambio de base:**
```bash
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-<fecha>.dump
```
(`pg_dump` y `psql` no aceptan el `?schema=` de la URL de Prisma: por eso el `sed`.)

**Respaldo de archivos:** `tar czf ~/archivos-<fecha>.tgz private-uploads public/uploads`. Incluye las constancias firmadas (`private-uploads/signatures/`), las fotos de garantía (`private-uploads/warranty/`) y las fotos de productos y de ElectroStudio (`public/uploads/`).

**Volver atrás:** `git reset --hard <commit> && npm install && bash scripts/deploy.sh --sin-pull`. Las columnas y tablas nuevas no molestan al código anterior: no se quitan.

**Emergencias del panel** (en el servidor, C-141 y C-143):
- La tienda quedó sin super admin, o el dueño quedó como Administrador: `npx tsx scripts/create-master-admin.ts <correo>` (no cambia la contraseña) y volver a entrar.
- Se perdieron el teléfono y los códigos de respaldo: `npx tsx scripts/reset-dos-pasos.ts <correo>` y configurar los dos pasos enseguida.

### Deploys hechos
| Fecha | Qué subió | Commit | Base |
|---|---|---|---|
| 01/10 (noche) | C-153 y C-154 | `6aae5a6` | 3 columnas (`packagingPlan`, `packagingRules`, `freePackagingThresholdUSD`) |
| 01/10 | C-149 a C-152 (bloque único) | `866afe5` | 8 columnas |
| 30/09 a 01/10 | C-139 y C-142 a C-148b | `3f2db8d` | tablas `quotes` y `quote_items`, columna `quoteStamp` |
| 30/09 (noche) | C-140 y C-141 | — | tablas `user_sessions` y `segundo_factor` |
| 30/09 (noche) | C-138 | `d53d5b4` | columnas en `notification_preferences` y `wishlist_items`; crons |
| 30/09 | C-130 a C-137 | `1333928` | columnas de C-132 |
| 29 a 30/09 | C-114 a C-129 | — | garantías, usados, reseñas y Pago Móvil |
| 28/09 | ElectroStudio (C-112 y C-113) | — | tablas `studio_flyers` y `studio_brand` |
| 26/09 | C-104 a C-40 | — | — |

- El 28/09 el build falló dos veces (los tipos de una ruta borrada y la falta de memoria): arreglado en `deploy.sh` y `next.config.js`.
- El detalle de cada bloque, con su SQL y sus pruebas, está en `HISTORIAL.md`.

## 3. Entorno local de Claude
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Antes de tocar nada:** `git status`, `git log -3 --format='%h %an %s'` y `git branch --show-current`. Gemini a veces trabaja en la carpeta principal.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …` (la carpeta tiene configurado el nombre de Gemini).
- **Merge:** `git merge --no-ff --no-edit claude/C-XX`, después `git diff main claude/C-XX` vacío, buscar credenciales y `git push`.
- **Verificación de código:** `npm run lint`, `npx tsc --noEmit` y `npm run build`. ESLint: 0 errores en `app`, `components`, `lib` y `contexts`, y 6 avisos a propósito.

### Tienda de ejemplo
- Esquema `rev10_demo` de la base local, con las columnas de cada tarea hasta C-153.
- Productos de prueba: audífonos, teclado, gift card y Robux con montos. Cupones `HOLA15`, `CINCO` y `FUTURO`.
- Un cliente con teléfono y cédula (`cliente@demo.test`) y un admin (`admin@demo.test`).
- Al cerrar el ciclo de pruebas se borran el esquema `rev10_demo` y los archivos de prueba de `private-uploads/signatures/` de la máquina local.

### Servidor de prueba
Build con el `DATABASE_URL` de `rev10_demo` y `NEXT_DIST_DIR=.next-test`, y `next start -p 3100`.
- Siempre: `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY= HCAPTCHA_SECRET=test NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"` (el SMTP del `.env` es real: sin esto salen correos de verdad).
- `NEXT_PUBLIC_BASE_URL=http://localhost:3100`: sin eso la prueba de humo falla en la redirección de `www` y en la dirección propia de las categorías.
- Para ver el Pago Móvil en el checkout: `BDV_API_KEY=prueba BDV_TELEFONO_COMERCIO=04140000000`.
- `next dev` con `NEXT_DIST_DIR=.next-test` se rompe a la segunda carga (Tailwind lee su propia carpeta): para `next dev`, la carpeta normal.
- **Al terminar:** borrar `.next-test` y `git checkout tsconfig.json` (Next le agrega la carpeta).

### Pruebas
- **Motor:** `scripts/e2e/lib.ts` (usuarios y sesiones de prueba, Firefox sin ventana). **Prueba de humo de todo junto:** `scripts/e2e/humo.ts` (59 comprobaciones: páginas públicas, una compra mixta, el panel con los dos roles y el teléfono). Se corre sobre `main` antes de cada bloque de deploy.
- Los guiones de cada tarea se escriben en `scripts/e2e/_tNNN.ts`, se corren con `npx tsx` y se borran.
- **HTTP** con Node y un JWT firmado con `encode` de `next-auth/jwt`:
  - Admin: `userType: 'admin'` y `dosPasos: true` (sin eso no tiene permisos y el `proxy` lo manda a Mi seguridad). Para el flujo real: login por HTTP y el código TOTP calculado con la clave que devuelve `POST /api/admin/dos-pasos {accion:'iniciar'}`.
  - Cliente: `userType: 'customer'` y `emailVerified`.
- **Navegador:** Firefox headless con WebDriver BiDi, a 360, 768, 1024 y 1440 px.
  - Para leer un canvas, `canvas[role=img]`: el primer `<canvas>` puede ser una miniatura.
  - Detener las animaciones antes de capturar.
- **Cambios en órdenes, carrito o Puntos ES:** el caso normal y el caso manipulado.
- **Búsqueda de productos en la web (C-155):** sale a internet de verdad (buscadores, páginas y Groq con la clave del `.env` local). Groq da 8.000 tokens por minuto: entre una búsqueda con IA y la siguiente, esperar un minuto, o la segunda sale con las reglas. Para probar sin red, simular `globalThis.fetch` (Groq) y usar páginas guardadas.
- **BiDi devuelve bien los textos y los números, no los objetos:** para leer una lista de la página, `JSON.stringify` dentro y `JSON.parse` fuera.
- **Producción desde fuera:** `https://electroshopve.com/api/settings/public` da los ajustes reales (leerlos antes de proponer precios o valores por defecto) y las marcas de cada versión (`/llms.txt` existe desde C-149).

## 4. Equipo y permisos en producción
- Andrés es el único Super admin. El resto del equipo entra por invitación al correo, con rol Administrador y sus dos pasos (confirmado el 01/10: invitados y funcionando).
- Antes de un deploy que cambie permisos o roles, comprobar con Andrés los roles reales de producción (C-143).
