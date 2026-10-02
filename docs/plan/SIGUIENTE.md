# Lo de ahora (actualizado 2026-10-02, C-165 · versión 1.0.0-rc.1)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **`main`:** todo lo hecho hasta C-165. Es la versión **`v1.0.0-rc.1`** (primera con número y etiqueta; `CHANGELOG.md` explica cómo se numera). Igual a GitHub.
- **Producción: C-158 seguro; C-159 y C-160 probablemente ya** (el 02/10 `/terminos` pasó a "Versión 4" y muestra el contacto de Configuración, la marca de C-160, que salió junto con C-159). **Preguntarle a Andrés** `git log -1 --oneline` en el servidor. Sigue sin saberse: el redondeo de C-96 y las pruebas visuales de C-162. Confirmado por Andrés el 02/10: el SQL de marcado de C-157 y la línea del cron de reseñas.
- **Falta subir: C-164 y C-165, en un solo lote** (bloque de abajo), y C-159 y C-160 si el servidor sigue en `ba6055c` o `7f996ef`. **Cambio de base: dos tablas nuevas** (`backup_settings` y `backup_runs`, de C-165) y, solo si falta C-159, tres columnas en `quotes`. **Un cron nuevo** (respaldos) y un paso de Google Cloud que hace Andrés. Sin variables obligatorias.
- **Gemini:** sin ronda abierta.

## 2. Deploy pendiente: C-164 y C-165 (y C-159 y C-160 si faltan)
**Lo más importante de este bloque es C-165: el primer respaldo fuera del servidor.** Hasta hoy, si el servidor se daña, se pierden las órdenes, los clientes y los Puntos ES. Detalle y pruebas en `estado/C-165.md`, `estado/C-164.md`, `estado/C-159.md` y `estado/C-160.md`.

- **Verificado (C-165):** `tsc`, `npm run lint` (0 errores), `npm run build`; 22 comprobaciones del cifrado y el volcado, 43 del respaldo de punta a punta (con restauración real), 82 del servidor y el flujo OAuth, 29 en el navegador a 360 y 1440 px, y la prueba de humo, **59 de 59**. **No probado: Google real** (se probó con un Drive simulado): por eso el paso 7 de abajo es probar de verdad.
- **El SQL total que va a mostrar `deploy.sh`** (solo ese; puede salir en varias líneas y en otro orden):
  - **Siempre (C-165):** dos `CREATE TABLE` (`"backup_settings"` y `"backup_runs"`) y dos `CREATE INDEX` sobre `"backup_runs"`. Nada que borre o cambie lo que ya existe.
  - **Además, solo si faltaba C-159:** `ALTER TABLE "quotes" ADD COLUMN "emailedAt" TIMESTAMP(3), ADD COLUMN "emailedTo" TEXT, ADD COLUMN "ivaRetentionPercent" INTEGER NOT NULL DEFAULT 0;`

**Qué trae (C-165):**
- **Configuración → Respaldos** (solo el dueño): clave de cifrado (la privada se muestra **una sola vez**), conexión con tu Google Drive, hora y días que se guardan, "Respaldar ahora", "Verificar el último" e historial.
- Cada día, a la hora que elijas, la base se copia, se **cifra** y se sube a la carpeta "Respaldos ElectroShop" de tu Drive; los domingos también las fotos y las constancias firmadas. Solo cuenta como hecho si Drive confirma que lo guardó completo. Si falla, avisa por el panel, el correo y Telegram, y el Dashboard lo recuerda.
- Se quitó la cabecera `X-Powered-By`. Versión `1.0.0-rc.1`, `CHANGELOG.md` y etiqueta de git.

**Qué trae (C-159):**
- **Retención del IVA:** en el editor de cotizaciones, "Retención del IVA que practica el cliente" (No retiene / 75 % / 100 %), que marca el equipo. El presupuesto muestra el IVA que retiene el cliente y el **neto a pagar** (y el anticipo se calcula sobre el neto). **Ojo:** los órganos del Estado, las gobernaciones, las alcaldías y los entes públicos sin fines empresariales **no** retienen (Providencia SNAT/2025/000054, art. 3); retienen los contribuyentes especiales.
- **Enviar por correo:** en el editor, dentro de "Enlace para el cliente": el correo del cliente ya puesto, un mensaje opcional y el botón. Le llega el resumen con un botón para ver y aprobar el presupuesto.
- **Mis cotizaciones:** menú nuevo en el panel del cliente, con las que pidió con su cuenta y las que le enviaste a su correo (verificado).

**Qué trae (C-164):**
- Se borró `POST /api/customer/balance/add` (ninguna pantalla lo usaba y dejaba acreditar Puntos ES con el permiso de órdenes). `seed.ts` ya no trae contraseña por defecto ni corre en producción. Las valoraciones salen con coma ("4,5") y el modal de recargar toma la tasa del contexto en vez de pedirla otra vez.

**Qué trae (C-160):**
- **`/terminos` y `/privacidad` se editan en el panel** (Legal → Documentos → "Nueva versión") y **el contacto sale de Configuración**. El que estaba escrito a mano no era el de Configuración (decía `electroshopgre@gmail.com` y de lunes a viernes). **Léelas después de subir.**
- **Buscador:** ordena por relevancia, busca por SKU y código de barras, y las búsquedas del panel (clientes, firmas, garantías, cotizaciones, destinatarios) y de cursos ignoran los acentos.
- **Precio con oferta:** "menor a mayor" ordena por lo que paga el cliente, no por el precio de lista.
- **Reseñas:** el formulario solo aparece a quien compró y recibió el producto (antes, un candado que solo se veía con hover y un campo "Título" que no hacía nada).
- **Correo (SMTP):** la contraseña del servidor de correo del panel se guarda cifrada y la conexión verifica el certificado.
- Renombrar una categoría **conserva su dirección**; correos y avisos con el formato de precios de la tienda ("$1.250,50"); se borró `balance/deduct`; ESLint en 0 errores.

### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git log -1 --oneline`.
   - `d453809` (C-164 ya está) o `2ccba36`: solo cambia lo de C-165 (y C-164 si estaba en `2ccba36`). No hay SQL de `quotes`.
   - `ba6055c` o `7f996ef`: faltan C-159, C-160, C-164 y C-165. El SQL incluye también las columnas de `quotes`.
   - Otra cosa: avisar a Claude antes de seguir.
2. **Respaldo a mano antes de subir** (cambia la base; es el último que haces a mano):
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-c165.dump`
3. **Requisitos del respaldo** (que `pg_dump` sea de la misma versión mayor que PostgreSQL o más nueva, que exista `tar` y que haya espacio en `/tmp`):
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump --version && psql "$DB" -Atc 'show server_version' && tar --version | head -1 && df -h /tmp | tail -1`
   Si `pg_dump` es de una versión mayor **menor** que la de `server_version` (por ejemplo 15 contra 16), avisar a Claude antes de seguir.
4. **Subir:** `git pull --ff-only` y `bash scripts/deploy.sh`.
   - El guion **para y muestra el SQL**. Si coincide con el de arriba: `npx prisma db push` y `bash scripts/deploy.sh` otra vez. Si aparece un `DROP` o algo distinto, no seguir y avisar a Claude.
5. **Comprobar:** `git describe --tags` debe decir `v1.0.0-rc.1` y `curl -sI https://electroshopve.com/ | grep -ci x-powered` debe dar `0`.
6. **El cron del respaldo** (una llamada por hora; la hora real la eliges en el panel):
   `cp /var/www/electroshopve/docs/plan/scripts/cron-respaldos.sh ~/cron-respaldos.sh && chmod +x ~/cron-respaldos.sh && ~/cron-respaldos.sh`
   Debe responder `{"respaldo":"no","motivo":"apagado"}`. Luego `crontab -e` y agregar la línea:
   `5 * * * * /home/luami/cron-respaldos.sh >> /home/luami/cron-respaldos.log 2>&1`
7. **Conectar y probar de verdad** (20 minutos, una sola vez): Admin → Configuración → **Respaldos**.
   1. **Crear la clave.** Se muestra la clave privada **una sola vez**: copiarla o descargar el archivo y guardarla **fuera del servidor** (gestor de contraseñas). Sin ella no se puede abrir ningún respaldo. Marcar "Ya guardé la clave".
   2. **Google Drive:** abrir "Cómo obtener el ID y el secreto" y seguir los 5 pasos en `console.cloud.google.com` (proyecto nuevo, activar **Google Drive API**, pantalla de consentimiento externa con el permiso `drive.file` y **publicarla**, credenciales de "Aplicación web" con la dirección que muestra la pantalla). Pegar el ID y el secreto, "Guardar", "Conectar con Google" y aceptar. Debe volver con "Google Drive conectado" y la cuenta.
   3. **Respaldo automático:** encender, elegir la hora (3:00 a. m. está bien) y guardar la programación.
   4. **"Respaldar ahora".** Tarda unos minutos. En el historial deben salir dos filas "Hecho" (base y fotos/constancias) y en tu Drive, carpeta "Respaldos ElectroShop", dos archivos que terminan en `.enc`. Si sale "Falló", el historial dice por qué: pásale el texto a Claude.
   5. **"Verificar el último":** debe decir que están en Drive y su huella coincide.
   6. Al día siguiente (o al otro), mirar que haya un respaldo "automático" nuevo.
8. **Probar una restauración, esa misma tarde** (`OPERACION.md`, "Restaurar un respaldo", pasos 1 a 3): bajar el `.dump.enc` de Drive, descifrarlo con tu clave privada y restaurarlo en una base de prueba. **Un respaldo que nunca se abrió no es un respaldo.**
9. **Si falta el redondeo de C-96** (pendiente desde el 24/09), con su respaldo:
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump`
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
   - Muestra tres números. El último debe ser 0. Si el del medio ("diferencia real") no es 0, pasarle la salida a Claude.

### Pruebas después de subir (unas 20 minutos, además del paso 7)
1. **Últimos menores (C-164):** una valoración con decimales sale con coma ("4,5") en Admin → Cursos o en el panel del creador; Puntos ES → "Recargar": al escribir un monto aparece el equivalente en bolívares.
2. **Dashboard:** con el respaldo encendido y hecho, no sale el recordatorio de respaldos; apagado, sí.
3. **Retención (C-159, si faltaba):** Admin → Cotizaciones → Nueva → una línea de $116 → "Retención del IVA" 75 %: "Retención del IVA (75 %): −$12,00 · Neto a pagar: $104,00". "Enviar por correo" a tu correo: llega con un botón. "Mis cotizaciones" en una cuenta de cliente.
4. **Páginas legales (C-160, si faltaba):** `/terminos` y `/privacidad`: **leer el correo, el WhatsApp y el horario del final** (salen de Configuración → Negocio). Configuración → Correo → "Probar conexión". Buscar `teclado` y ordenar "Menor a mayor". La reseña solo aparece a quien compró.

### Pruebas de lo anterior, si faltan (ya está en producción)
- **Reseña por correo (C-157):** Admin → Marketing → Correos → "Pedir la reseña" (correo de ejemplo con dos botones); Mi perfil → Notificaciones → "Tus reseñas". **Prueba real:** adelantar una orden tuya entregada y correr el cron:
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -c "UPDATE orders SET \"deliveredAt\" = now() - interval '6 days', \"reviewRequestedAt\" = NULL WHERE \"orderNumber\" = 'ORD-2026-00XX'"` (con su número) y `~/cron-resenas.sh`: debe responder `"correos":1` y llegarte el correo.
- **Buscador (C-158):** en la tienda, `audifonos` sin acento y `tecaldo` mal escrito; en Admin → Productos, buscar con y sin acento.
- **Inicio y categorías (C-162, C-163):** en la computadora, "Destacados de la semana" con la foto llenando la tarjeta y "NUEVO" en la esquina; "Compra por categoría" con seis categorías y cada producto en la suya.
- **Volver a subir tres fotos** (las ya armadas no cambian solas): editar el producto, quitar la foto y subirla otra vez. **Tablet W&O** y **audífonos Piston** (para que la cinta salga sin el corte) y **Grand Theft Auto V PS5** (centrada y con aire; quitar las dos primeras, que son la misma). Si no tienes el original, la tienda lo guarda: la dirección de la foto, terminada en `.orig.png` en vez de `.webp`.
- **Buscar en la web (C-155):** Productos → Nuevo → Producto físico, "Teclado mecánico Redragon Kumara K552", "Buscar". Si arriba dice "Los datos vienen de la búsqueda con IA y no se pudieron contrastar", los buscadores no le responden al servidor: avisar a Claude. La clave va en el `.env` del servidor como `GROQ_API_KEY`.
- **Marca (C-155):** ponerla en los audífonos Piston, el SSD y el teclado AOAS.
- **Embalaje según el paquete (C-153):** Configuración → Envíos y retiro → encender, corregir las medidas y los precios de tus sobres y cajas, y poner el monto del embalaje gratis. Una compra barata con envío: en la orden, "Cómo empacar".

### Si algo sale mal
- **El respaldo falla o Google no conecta:** no afecta a la tienda. Ver el motivo en el historial de Configuración → Respaldos y pasárselo a Claude. Mientras tanto, el respaldo a mano del paso 2 y `~/respaldo-antes-c165.dump` sirven.
- **Volver atrás el código:** `git reset --hard <commit> && npm install && bash scripts/deploy.sh --sin-pull`, con `<commit>` = `d453809` (deshacer solo C-165), `2ccba36` (deshacer también C-164) o `ba6055c` (antes de todo). Las tablas y columnas nuevas no molestan al código anterior (no se quitan). Quitar la línea de `cron-respaldos.sh` de `crontab -e` si se vuelve a un commit sin C-165 (la ruta ya no existiría y el cron daría error cada hora).
- **Si el correo del panel deja de salir** (certificado): `SMTP_ALLOW_SELF_SIGNED="true"` en el `.env` y el deploy, o volver atrás.
- **Si el cron de reseñas manda correos de más:** quitar su línea de `crontab -e` y avisar a Claude con lo que respondió `~/cron-resenas.sh`.

## 3. Tareas de Andrés (sin código)
En el orden en que más destraban:

**En producción**
1. **El deploy de arriba** (versión `v1.0.0-rc.1`), con el respaldo conectado y **una restauración de prueba** (pasos 7 y 8), el redondeo de C-96, las pruebas de C-157 y las visuales de C-162.
2. **Guardar aparte, fuera del servidor, la clave privada del respaldo y una copia del `.env`** (gestor de contraseñas). La clave la muestra el panel una sola vez; el `.env` no va dentro del respaldo y trae `NEXTAUTH_SECRET`, `DATABASE_URL` y las claves de pago.
3. **Un monitor de que la tienda está arriba** (gratis, sin código): UptimeRobot o similar apuntando a `https://electroshopve.com/robots.txt` cada 5 minutos, con aviso a tu correo y a Telegram. Todo lo demás (avisos, respaldos) vive en el mismo servidor y no puede avisar si se cae.
4. **El certificado HTTPS vence el 12/11/2026:** comprobar en el servidor que la renovación sigue sola (`systemctl list-timers | grep certbot` debe mostrar una línea) y, si no, avisar a Claude antes de esa fecha.
5. **La revisión final** ([`REVISION_FINAL.md`](./REVISION_FINAL.md)): en el teléfono real, marcando cada punto. Pendiente desde el 26/09. **Antes de `v1.0.0`, al menos el dinero:** una compra con Pago Móvil, una con Puntos ES, recargar Puntos ES, un cupón y cancelar una orden (que vuelvan el stock y el cupón).
6. Pasar a borrador el **"Producto Test"** (Consolas) y renombrar los productos digitales que dicen **"(SALDO)"** (`estado/C-136.md`).
7. **Marca** en cada producto físico (campo nuevo, junto a la categoría) e **imagen para compartir** de 1200 × 630 px (Configuración → SEO → Inicio). El Dashboard lo recuerda.
8. **Cargar catálogo:** con la búsqueda en la web (C-155) o con la carga masiva (Productos → Más → "Importar (.json)").

**Medición (antes de pagar un anuncio)**
9. **Google Search Console:** agregar `electroshopve.com`, enviar `https://electroshopve.com/sitemap.xml` y revisar "Páginas" una semana después.
10. **Google Analytics y píxel de Meta:** poner `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` en el `.env` del servidor y correr el deploy (`estado/C-145.md`).
11. Cuando vaya a pagar anuncios en Meta: el catálogo con `https://electroshopve.com/feed/productos.xml` (pasos en `HISTORIAL.md`, C-149).

**Datos y decisiones que tienen tareas paradas** (`PLAN.md` §7.1)
12. Entrega de un código y de una recarga: **respondió el 01/10** que tarda unas 2 horas y que la meta es 30 minutos. **Falta el horario** en que se atiende (para el plazo en la ficha, C-154b).
13. Medidas y precios reales de los sobres y cajas, el precio del "bulto aparte" y el monto del embalaje gratis.
14. Cuánto cobran ZOOM y MRW en Guanare por el seguro, y si aplica con cobro a destino (C-107).
15. El diagnóstico de clientes borrados (C-92). En el servidor, solo lee:
    `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/diagnostico-c92.sql > ~/diagnostico-c92.txt 2>&1`
    y pasarle a Claude el contenido de `~/diagnostico-c92.txt`.
16. ¿La cinta ES también en los productos que no son nuevos (al menos en "Caja abierta")? Hoy llevan su etiqueta y no la cinta (`estado/C-161.md`).
17. Avisar cuando SADES vuelva (taller).

**Con el abogado y el contador**
18. Abogado: términos y privacidad (ahora se editan en Legal → Documentos; `estado/C-120.md` §7) y las 3 afirmaciones de `estado/C-144.md` (el motivo "comprobante vencido o ilegible", los plazos y los datos de contacto).
19. Contador: las preguntas de `estado/C-151.md` (IVA de los digitales), `estado/C-147b.md` (embalaje), `estado/C-120.md` §6 y **`estado/C-159.md` (retención del IVA: quiénes retienen, el comprobante y si hay retención de ISLR en los servicios)**.

**Limpieza opcional, en tu máquina** (todo ya está en `main` o fue reemplazado)
- ChatGPT: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- Ramas locales ya fusionadas: `git branch --merged main` las lista; se pueden borrar con `git branch -d <rama>`.

## 4. Fila de Claude
La lista completa, con lo que espera datos, está en `PLAN.md` §5.2. **No queda código en fila que no espere un dato tuyo:**
- Esperan datos: C-154b (plazo de los digitales: ya se sabe que son unas 2 horas, falta el horario), C-107 (seguro), C-92 (clientes) y C-153b (decidir si los "frágiles" llevan más relleno).
- **C-166 (opcional, después del deploy):** Content-Security-Policy en modo "solo reportar" (la defensa que limita qué scripts carga la página; con Analytics, Meta y hCaptcha activarla de golpe rompería cosas). Y, con una restauración probada, evaluar subir el volcado directo a Drive sin pasar por disco si la base crece.
- Lo que salga de la revisión final y de las pruebas del deploy se arregla antes que lo demás.
- Mientras tanto Claude puede revisar `REVISION_FINAL.md` contigo (en el teléfono, punto por punto) o escribir la próxima ronda de Gemini cuando haya una tarea mecánica.
- El plazo de la reseña (C-157) queda en 5 días (2 si es digital), en `lib/resenas-avisos.ts` (`DIAS_FISICO`, `DIAS_DIGITAL`), hasta que Andrés diga otra cosa.

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame si ya subí lo que falta (sección 2), cómo salieron las pruebas (sobre todo la búsqueda en la web desde el servidor) y el redondeo de C-96, y si tengo alguno de los datos de la sección 3.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4). Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
