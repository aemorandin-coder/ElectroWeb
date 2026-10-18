# Operación: servidor, deploy y pruebas

> Lo que no cambia de una tarea a otra. Lo pendiente está en [`SIGUIENTE.md`](./SIGUIENTE.md); lo ya subido, en [`HISTORIAL.md`](./HISTORIAL.md).
> El repositorio es público: aquí no va ninguna clave, ni datos fiscales o financieros de la empresa.

## 1. Servidor
- Carpeta `/var/www/electroshopve`, proceso de PM2 `electroshop`, usuario `luami`. PM2 en **una sola instancia**: el bus de eventos del tiempo real vive en memoria. Los guiones lo buscan por nombre (desde el reinicio del 16/10 su número en `pm2 ls` es el 1, no el 0).
- `ecosystem.config.js` está desactualizado (otro nombre y otra carpeta) y no se usa: nunca `pm2 start ecosystem.config.js`.
- **Memoria:** 7,8 GB y 4 GB de swap (28/09). El build usa unos 2,7 GB.
- **Sistema (C-176, 16/10):** Ubuntu 24.04 y **Node 24 LTS** (repositorio de NodeSource `node_24.x`; Node 20 quedó sin soporte el 30/04/2026). PostgreSQL 16.
  - Las actualizaciones de seguridad se instalan solas (`unattended-upgrades`). El resto se instala a mano con un respaldo antes: `sudo apt-get update && sudo apt-get full-upgrade`. Si después existe `/var/run/reboot-required`, el kernel nuevo recién corre con un reinicio (`sudo reboot`, la tienda vuelve sola en unos segundos: PM2 arranca con el sistema).
  - Antes de reiniciar: `pm2 save` (guarda `NEXT_DIST_DIR`) y `systemctl is-enabled pm2-luami` debe decir `enabled`. Después: `uname -r`, `pm2 ls`, la tienda y `crontab -l`.
  - Registros: los del sistema con tope de 500 MB (`/etc/systemd/journald.conf.d/limite.conf`); los de PM2 rotan con `pm2-logrotate` (10 MB, 7 archivos, comprimidos).
  - **fail2ban** protege SSH (bloquea una hora tras 5 intentos fallidos en 10 minutos; `sudo fail2ban-client status sshd`). SSH no acepta `root` (`/etc/ssh/sshd_config.d/00-sin-root.conf`). Para entrar al servidor hace falta una llave autorizada en `~/.ssh/authorized_keys`.
  - Los volcados y paquetes a mano (`~/respaldo-antes-*.dump`, `~/archivos-*.tgz`) **no están cifrados**: se guarda solo el último. Los respaldos de verdad son los cifrados de Drive (abajo).
- **nginx:**
  - HTTP/2 (`listen 443 ssl http2`) y sin mostrar su versión (`server_tokens off` en `nginx.conf`), desde el 16/10. Copias de antes del cambio en `/etc/nginx/*.bak-16-10`.
  - **La tienda escucha solo en `127.0.0.1:3000`** (`npm start` = `next start -H 127.0.0.1`, desde C-177): `proxy_pass http://127.0.0.1:3000;`. No `localhost`: en el servidor también resuelve a `::1`, donde ya no hay nadie escuchando.
  - Pasa la IP real del cliente (`X-Real-IP` y `X-Forwarded-For`). Confirmado por Andrés el 01/10 (C-105). De eso dependen los límites de intentos, el modo mantenimiento y la bitácora.
  - `www.electroshopve.com` debe redirigir a `electroshopve.com` (C-149). Si `curl -sI https://www.electroshopve.com/` responde `200` en vez de `308`, falta un bloque `server` para `www` con `return 301 https://electroshopve.com$request_uri;`.
  - **Tiempo real (C-127):** `/api/realtime` usa Server-Sent Events y manda `X-Accel-Buffering: no`. Si el panel dice "Reconectando…" todo el tiempo: `proxy_read_timeout` de 60 s o más (el latido es cada 25 s) y sin `proxy_buffering on` forzado.
- **Crons** (`crontab -l` de `luami`, desde el 30/09). Cada guion lee `CRON_SECRET` del `.env`:
  - `0 * * * * /home/luami/cron-favoritos.sh`: avisos de favoritos (C-138).
  - `15 */2 * * * /home/luami/cron-envios.sh`: rastreo de las guías de ZOOM (C-100).
  - `30 9 * * * /home/luami/cron-promotores.sh`: acredita en Puntos ES las comisiones de promotores cuya orden lleva 7 días entregada (C-167, guion en `docs/plan/scripts/cron-promotores.sh`; responde `acreditadas`, `rechazadas` y `revisadas`).
  - `5 * * * * /home/luami/cron-respaldos.sh`: respaldo diario a Google Drive (C-165, guion en `docs/plan/scripts/cron-respaldos.sh`).
  - `0 15 * * * /home/luami/cron-resenas.sh`: pide la reseña por correo a quien recibió su pedido hace unos días (C-157, una vez al día). Puesta (comprobado el 16/10).
  - `45 9 * * * /home/luami/cron-papelera.sh`: borra para siempre los productos que llevan 30 días en la papelera (C-169). Puesta (comprobado el 16/10).
  - Para probar uno a mano se corre el guion: responde JSON (`revisados`, `avisos`…).
- **Variables de entorno:** todas explicadas en `.env.example`. Opcionales que todavía no están en el servidor: `GROQ_API_KEY` (C-155, la pone Andrés con el deploy), `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` (C-145), `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (C-85) y `SMTP_ALLOW_SELF_SIGNED` (C-160, solo si el servidor de correo del panel tiene un certificado autofirmado).

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

### Respaldos automáticos a Google Drive (C-165)
Configuración → Respaldos (solo el dueño). Cada día, a la hora elegida (Venezuela), la tienda vuelca la base (`pg_dump -Fc`), comprueba que el volcado se lee (`pg_restore --list`), lo **cifra** con la clave pública del dueño, lo sube a la carpeta "Respaldos ElectroShop" de su Drive y comprueba que Drive lo guardó completo (tamaño y MD5). Los domingos, y al pulsar "Respaldar ahora", también empaqueta `private-uploads/` y `public/uploads/` (constancias firmadas, fotos de garantía, de productos y de ElectroStudio). Solo cuenta como hecho lo que pasó todo eso.
- **Dónde está cada cosa:** código en `lib/respaldos/` (`formato.ts` cifrado, `volcado.ts` pg_dump y tar, `drive.ts` API de Drive, `servicio.ts` el respaldo y la retención); rutas en `app/api/admin/respaldos/**` y `app/api/cron/respaldos`; pantalla en `settings/_components/BackupsSection.tsx`; tablas `backup_settings` (una fila) y `backup_runs` (el historial).
- **Clave:** RSA-4096 creada desde el panel. La **privada se muestra una sola vez** y no se guarda en ningún lado (ni en la base ni en el `.env`); solo queda la pública. Sin la privada no hay forma de abrir un respaldo: va en el gestor de contraseñas de Andrés, fuera del servidor. Cambiar la clave solo afecta a los respaldos nuevos.
- **Google:** un cliente OAuth propio, creado por Andrés en Google Cloud (pasos en la pantalla). Permiso `drive.file`: la tienda solo ve lo que ella misma sube. El ID y el secreto se pegan en el panel (el secreto y el permiso se guardan cifrados con `NEXTAUTH_SECRET`; si ese valor cambia, hay que volver a conectar Drive). La dirección de redireccionamiento autorizada es `https://electroshopve.com/api/admin/respaldos/drive/callback`. **Publicar la aplicación** en la pantalla de consentimiento: en modo "Prueba" Google vence el permiso a los 7 días.
- **Cron** (`docs/plan/scripts/cron-respaldos.sh`): una llamada por hora, `5 * * * *`. La ruta decide si toca (encendido, ya pasó la hora, no hay uno bueno hoy; máximo 3 intentos fallidos al día) y responde enseguida. Un respaldo que falla avisa por los canales de "Respaldo fallido" (panel, correo y Telegram; Notificaciones → Qué avisar).
- **Retención:** los días elegidos (14 por defecto), y **nunca se borran los últimos 3 buenos** de cada tipo. Solo se borra de Drive lo que la tienda registró.
- **Dashboard:** el dueño ve un recordatorio si los respaldos están apagados o el último bueno tiene más de 36 horas.
- **Requisitos del servidor:** `pg_dump`, `pg_restore` y `tar` instalados, y `pg_dump` de la misma versión mayor que PostgreSQL o más nueva (`pg_dump --version` y `psql "$DB" -Atc 'show server_version'`). Espacio libre en `/tmp` (o en `RESPALDOS_DIR_TEMPORAL`) para el volcado y su copia cifrada.
- **Verificar:** el botón "Verificar el último" pregunta a Drive por el MD5 y el tamaño del último respaldo de cada tipo (Drive calcula el suyo). Lo que **no** comprueba es que se pueda restaurar: eso se prueba con la clave privada, **una vez al trimestre** (abajo).

**Restaurar un respaldo** (nunca desde el panel, a propósito: una sesión robada no debe poder bajar ni pisar la base):
1. Bajar el `.enc` de la carpeta "Respaldos ElectroShop" de Drive (`electroshop-base-AAAA-MM-DD-HHMM.dump.enc`).
2. Descifrar, en una computadora con Node y este repositorio, con la clave privada guardada como `clave.pem`: `npx tsx scripts/respaldo-descifrar.ts electroshop-base-….dump.enc clave.pem`. Si el archivo está alterado o la clave no es la suya, no deja nada a medias.
3. **Prueba de restauración (sin tocar producción):** crear una base nueva y vacía (`createdb prueba_restauracion`) y `pg_restore --no-owner --no-acl -d prueba_restauracion electroshop-base-….dump`; contar filas de `users`, `orders` y `user_balances`. Borrarla después.
4. **Restauración real** (el servidor se perdió): instalar el servidor, crear la base, `pg_restore --no-owner --no-acl -d <base> …dump`, y desde el paquete de archivos (`electroshop-archivos-….tar.gz.enc`, descifrado igual) `tar -xzf … -C /var/www/electroshopve`. El `.env` no está en el respaldo: guardar una copia aparte (sobre todo `NEXTAUTH_SECRET`, `DATABASE_URL`, `CRON_SECRET` y las claves de pago).

### Content-Security-Policy (C-166)
Una política de qué puede cargar la tienda: scripts, conexiones y marcos solo de la propia tienda y de los dominios de la lista (Google Analytics, píxel de Meta, hCaptcha, YouTube, Vimeo y TikTok); imágenes y videos de cualquier `https`. Está en `lib/csp-policy.js` (una sola lista, con la razón de cada dominio) y las cabeceras se ponen en `next.config.js`.
- **Hoy solo avisa** (`Content-Security-Policy-Report-Only`): no bloquea nada. Cada aviso del navegador llega a `/api/csp-report` (pública, con límite por IP y de tamaño) y se guarda **agrupado** en `csp_violations` (directiva, a quién bloquea, página, cuántas veces; tope de 400 casos). Se ve en **Reportes → Seguridad → "Política de contenido (CSP)"**.
- **Pasar a bloquear:** `CSP_ENFORCE="true"` en el `.env` del servidor y volver a correr `bash scripts/deploy.sh` (las cabeceras se fijan al compilar). Se hace cuando el panel lleve unos días de visitas reales sin avisos legítimos. Al bloquear se suman `frame-ancestors 'self'` y `upgrade-insecure-requests`. **Volver atrás:** quitar la línea (o `false`) y otro deploy.
- **Cada aviso legítimo** (algo de la tienda que la política bloquea) se arregla agregando el dominio a `lib/csp-policy.js` con su motivo, no apagando la política.
- **Lo que no hace:** no impide un script en línea inyectado (`'unsafe-inline'`: Next, Analytics y el píxel lo necesitan). Para eso haría falta un nonce, que obliga a renderizar cada página en cada visita. Lo que sí impide es cargar scripts de otros dominios, conectarse a ellos, usar `eval`, `<object>`, cambiar `<base>` o enviar formularios a otro sitio.
- **Pantalla nueva que carga algo de otro dominio** (un video, un widget): pasar por el panel de avisos antes de pasar a bloquear. Cuando se pongan `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` (C-145), mirar el panel esa semana.
- Los esquemas de `zod` que se usan en el navegador se importan de `@/lib/zod`, no de `'zod'`: apaga la optimización con `new Function`, que la política cuenta como violación.

**Emergencias del panel** (en el servidor, C-141 y C-143):
- La tienda quedó sin super admin, o el dueño quedó como Administrador: `npx tsx scripts/create-master-admin.ts <correo>` (no cambia la contraseña) y volver a entrar.
- Se perdieron el teléfono y los códigos de respaldo: `npx tsx scripts/reset-dos-pasos.ts <correo>` y configurar los dos pasos enseguida.

### Deploys hechos
| Fecha | Qué subió | Commit | Base |
|---|---|---|---|
| 16/10 | C-178, ajuste (`v1.0.0-rc.14`): lema de la portada y fotos en la versión | `535bbb8` | sin cambio |
| 16/10 | C-178 (`v1.0.0-rc.13`): imágenes para compartir | `2c274a0` | sin cambio |
| 16/10 | C-177 (`v1.0.0-rc.12`): dependencias seguras y la tienda en `127.0.0.1` (nginx apunta ahí) | `19b07c0` | sin cambio |
| 16/10 | Mantenimiento del servidor (C-176): sistema al día, Node 24, kernel nuevo con reinicio, fail2ban, HTTP/2 y registros con tope | — (sin código) | sin cambio; respaldo `~/respaldo-antes-mantenimiento-16-10.dump` |
| 03/10 a 16/10 | rc.7 a rc.11 (C-171, C-170, C-175 y C-172) | `f47bb08` (`v1.0.0-rc.11`) | 1 tabla (la de C-171, con rc.7) |
| 01/10 (noche) | C-157 y C-158 | `ba6055c` | 1 columna (`orders.reviewRequestedAt`); cron nuevo |
| 01/10 (noche) | C-162 y C-163 | `71703ab` | sin cambio; guion de categorías |
| 01/10 (noche) | C-161 y C-155 (con C-156, documentos) | `57840db` | sin cambio; variable `GROQ_API_KEY` |
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
- **Otra máquina, Windows (desde el 16/10):** la laptop del equipo con Node 24, Docker Desktop y sin Firefox, así que la prueba de humo con navegador no corre. Para el build y las pruebas por HTTP, una base de prueba en Docker:
  - `docker run -d --name prueba-pg -e POSTGRES_PASSWORD=<una> -e POSTGRES_DB=electroshop -p 127.0.0.1:55432:5432 postgres:16-alpine`
  - `DATABASE_URL=…/electroshop?schema=<algo>_test`, después `npx prisma db push` y el `seed` con `NODE_ENV=development` y `ADMIN_DEFAULT_PASSWORD`.
  - Sin una base, el build falla al prerenderizar.
  - **Al terminar:** borrar el contenedor.
  - **Commits:** git tiene configurado otro nombre global, así que también la fusión lleva `-c user.name=… -c user.email=…`.
  - **Conexión al servidor de la tienda:** con la llave de esa laptop. Ningún alias del `~/.ssh/config` apunta a la tienda: `electroshop-vps` es el servidor de SADES.
  - **Trampas que ya costaron tiempo (16/10):**
    - **Saltos de línea de Windows (CRLF):** varios archivos los tienen. Un reemplazo con `node`, `sed` o una expresión regular que busca `\n` no entra y no da error. Hay que usar la herramienta de edición exacta, o `\r?\n`, y después confirmar con `grep` que el cambio está.
    - **`scripts/` está fuera del `tsconfig`:** un guion con JSX que se corre con `tsx` necesita `/** @jsxRuntime automatic */` en la primera línea (si no, "React is not defined").
    - **El build agrega la carpeta `.next-test` a `tsconfig.json`:** al terminar, `git checkout -- tsconfig.json`.
    - **sharp 0.35** no deja leer su `package.json` con `require`. La versión se lee con `grep '"version"' node_modules/sharp/package.json`.
    - **Por SSH, `pgrep -f` o `grep` encuentran su propio comando** (un `kill` así cortó la sesión). Para saber si algo escucha, `ss -tlnH | grep ':PUERTO '`.
    - **Los registros de nginx** (`/var/log/nginx/`) solo se leen con `sudo`, que pide clave: no se ven desde la sesión de Claude.
    - **npm 11.19 del servidor:** avisa "not yet covered by allowScripts". Es normal y no frena nada (se bloqueará en npm 12: `PLAN.md` §5.2).
  - **Más trampas (17 y 18/10, al probar C-182 y C-183):**
    - **Playwright no está en el repositorio.** Se usa el Chrome instalado (`channel: 'chrome'`) con `NODE_PATH=C:/tmp/pw_test/node_modules`.
      - `waitUntil: 'networkidle'` nunca llega en la tienda, porque el canal en vivo queda abierto.
      - En su lugar, `load` y una espera.
    - **Git Bash convierte en ruta de Windows** una variable que empieza con `/`, por ejemplo una `/api/uploads/…` para la prueba del sello.
      - No da error: el valor llega cambiado, y el PDF salió sin el sello que se quería probar.
      - Se evita con `MSYS_NO_PATHCONV=1 MSYS2_ENV_CONV_EXCL=<VARIABLE>`.
    - **El PDF del servidor se revisa viéndolo**, pasado a imagen con `uv run --with pymupdf==1.24.10`.
      - El QR se lee con `opencv-python-headless==4.10.0.84` y tiene que dar el enlace exacto.
    - **Un `next start` en segundo plano puede seguir vivo** después de detener la tarea, con el puerto tomado.
      - Se busca por su línea de comando y se corta por PID.
- **Deploy desde la laptop, con la aprobación del equipo para ese deploy** (`CLAUDE.md`, regla 2):
  - **Antes:** `git describe --tags --abbrev=0`, `git status -sb` y la memoria libre.
  - **Respaldo** (si hace falta): el `pg_dump` del bloque.
  - **Subir:** `ssh … 'cd /var/www/electroshopve && git pull --ff-only && bash scripts/deploy.sh --sin-pull'`, guardando la salida en un archivo, porque el build tarda.
  - **Después:** la versión, `ss -tln` con `127.0.0.1:3000`, páginas y API con `200`, y el registro de errores de PM2 sin líneas nuevas.
- **Comprobar lo que se comparte, como los lectores:**
  - **Metadatos:** `curl -s -A "facebookexternalhit/1.1" https://electroshopve.com/<ruta> | grep og:image`.
  - **La imagen:** `curl -s -A "WhatsApp/2.24" -o x.jpg -w "%{http_code} %{content_type} %{size_download}" <og:image>`.
  - **Dónde están las etiquetas:** con `grep -bo`; WhatsApp exige que estén en los primeros 300 KB del HTML.
- **Antes de tocar nada:** `git status`, `git log -3 --format='%h %an %s'` y `git branch --show-current`. Gemini a veces trabaja en la carpeta principal.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …` (la carpeta tiene configurado el nombre de Gemini).
  - Antes del push, `git log --format='%h %an %s' origin/main..` tiene que decir solo Claude.
  - Los commits de C-182 salieron con el nombre global de la laptop, y ya no se cambian (habría que forzar el push).
- **Merge:** `git merge --no-ff --no-edit claude/C-XX`, después `git diff main claude/C-XX` vacío, buscar credenciales y `git push`.
- **Verificación de código:** `npm run lint`, `npx tsc --noEmit` y `npm run build`. ESLint: 0 errores en `app`, `components`, `lib` y `contexts`, y 5 avisos a propósito (16/10).

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
