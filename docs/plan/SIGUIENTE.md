# Lo de ahora (actualizado 2026-10-02, C-168 · versión 1.0.0-rc.4)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **`main`:** versión **`1.0.0-rc.4`** en armado (C-166, C-167 y C-168; la etiqueta `v1.0.0-rc.4` se pone al cerrar el lote con C-169). Antes de esa etiqueta la última es `v1.0.0-rc.3`. Lo que viene después de C-168 está en `PROPUESTA_C168-C172.md` (aprobada el 02/10). **Producción: `v1.0.0-rc.1`** (C-165; `2480457`), comprobado desde fuera el 02/10 por la noche: todavía sin la cabecera `Content-Security-Policy-Report-Only` y sin la ruta `/api/cron/promotores`.
- **Falta subir, en un solo lote: C-166, C-167 y C-168** (bloque de abajo). **Cambio de base: dos tablas nuevas y siete columnas** (todo aditivo). **Un cron nuevo** (promotores). Sin variables obligatorias.
- **Activar "Continuar con Google"** (C-85) es aparte y solo de Andrés: un cliente OAuth nuevo y dos líneas en el `.env` (pasos al final de la sección 2). No cambia código.
- **Sin confirmar con Andrés:** la restauración de prueba del respaldo, el redondeo de C-96 y las pruebas visuales de C-162.
- **Gemini:** sin ronda abierta.

## 2. Deploy pendiente: C-166, C-167 y C-168 (v1.0.0-rc.4)
- **C-168 · Versiones por módulo** (`estado/C-168.md`): cada módulo del panel (Productos, ElectroStudio, Cursos, Configuración…) tiene su versión, que se ve en la barra de arriba, y el pie del menú dice la del sistema. Página nueva **Administración → Versiones** con qué cambió en cada módulo. Si alguien tiene el panel abierto cuando subes una versión, le sale "El panel se actualizó" con el botón para recargar; y cada administrador ve una vez "Qué hay de nuevo".
- **C-167 · Promotores** (`estado/C-167.md`): cada promotor tiene un **código** que el cliente escribe en el carrito (descuento para el cliente; la compra cuenta para el promotor aunque el cliente ya tuviera cuenta). La comisión es sobre los **productos sin IVA ni envío**, en **Puntos ES**, y se **acredita sola 7 días después de la entrega**; quedan para tu revisión las que parecen autocompra, pasan de $50 o superan la ganancia de la venta. **Solicitud para ser promotor** desde la cuenta del cliente, con aprobación de un clic. La página del promotor ya no promete dinero, ni comisión por recargas, registros o cursos.
- **C-166 · Content-Security-Policy en modo "solo avisa"** (`estado/C-166.md`): no bloquea nada; los avisos se ven en Reportes → Seguridad.
- **Verificado:** `tsc`, `npm run lint` (0 errores) y `npm run build` sin avisos; C-167 con **80 comprobaciones con compras reales** y C-166 con un barrido de 65 pantallas; la prueba de humo, **59 de 59**. **No probado:** el correo de "Ya eres promotor" (simulado), el cron en el servidor, Chrome y Safari, y tráfico real de la política de contenido.
- **SQL total que va a mostrar `deploy.sh`** (solo esto; puede salir en otro orden y en varias líneas). Nada borra ni cambia lo que ya existe:
  - `CREATE TABLE "csp_violations"` con sus dos índices (C-166).
  - `CREATE TABLE "influencer_applications"` con sus dos índices y una llave a `users`.
  - `ALTER TABLE "users" ADD COLUMN "panelVersionVista" TEXT` (C-168).
  - `ALTER TABLE "orders" ADD COLUMN "referralInfluencerId" TEXT`
  - `ALTER TABLE "promotions" ADD COLUMN "influencerId" TEXT`, con un índice único y una llave a `influencers`.
  - `ALTER TABLE "influencers" ADD COLUMN "customerDiscountPercent" INTEGER NOT NULL DEFAULT 5`
  - `ALTER TABLE "referral_conversions" ADD COLUMN "baseAmount" DECIMAL(65,30), ADD COLUMN "heldReason" TEXT, ADD COLUMN "source" TEXT`

### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git log -1 --oneline` debe empezar por `2480457` (o `4cbaca1`). Si dice otra cosa, avisar a Claude.
2. **Respaldo antes de subir:** Admin → Configuración → **Respaldos** → "Respaldar ahora" y esperar las dos filas "Hecho". Si prefieres a mano:
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc3.dump`
3. **Subir:** `git pull --ff-only` y `bash scripts/deploy.sh`. El guion para y muestra el SQL de arriba. Si coincide: `npx prisma db push` y `bash scripts/deploy.sh` otra vez. Si aparece un `DROP` o algo distinto, no seguir y avisar a Claude.
4. **Comprobar:** `git describe --tags` debe decir `v1.0.0-rc.4`, y
   `curl -sI https://electroshopve.com/ | grep -ci content-security-policy-report-only` debe dar `1`.
5. **El cron de promotores** (una vez al día):
   `cp /var/www/electroshopve/docs/plan/scripts/cron-promotores.sh ~/cron-promotores.sh && chmod +x ~/cron-promotores.sh && ~/cron-promotores.sh`
   Debe responder algo como `{"acreditadas":0,"rechazadas":0,"revisadas":0}`. Luego `crontab -e` y agregar:
   `30 9 * * * /home/luami/cron-promotores.sh >> /home/luami/cron-promotores.log 2>&1`

### Pruebas después de subir (unos 20 minutos)
1. **Promotores que ya tengas** (Admin → Marketing → Promotores): cada uno muestra "gana X % · su código descuenta 5 %". Con el lápiz se cambia la comisión y el descuento. Las comisiones pendientes de antes salen **"por revisar"** (se calcularon sobre el total): apruébalas o recházalas a mano.
2. **Solicitud:** con una cuenta de cliente (correo verificado), menú **Promotores** → "Pide entrar al programa" → enviar. En el panel aparece "Solicitudes para ser promotor" → **Revisar** → Aprobar. El cliente recibe el aviso con su código y un correo.
3. **Compra con el código:** con **otra** cuenta, poner un producto físico nuevo en el carrito, escribir el código en "¿Tienes un cupón?": baja el precio. Pagar. En Marketing → Promotores → el ojo: la comisión aparece "Por acreditar", con la base (productos sin IVA) y "Se acredita sola 7 días después de la entrega".
4. **El promotor con su propio código:** en su carrito, su código responde "Este es tu código de promotor…" y no descuenta.
5. **Página del promotor** (teléfono y computadora): su código con "Copiar código", su enlace, "Tus últimas ventas" con el estado de cada una, y ningún texto que diga dinero, recargas o beneficios por nivel.
6. **Política de contenido (C-166):** navegar la tienda y el panel unos minutos; todo debe verse igual que antes. Reportes → Seguridad → abajo, "Política de contenido (CSP)": lo esperado es "Sin avisos". Dejarla una semana; si sigue limpia, se pasa a bloquear (C-166b).
7. **Versiones (C-168):** Administración → **Versiones**: arriba dice `1.0.0-rc.4`, la etiqueta de git, el commit y la hora del build; abajo, los 16 módulos. En cada pantalla del panel, la barra de arriba muestra el módulo y su versión ("Productos 1.0.0"). La primera vez que entra cada administrador sale "Qué hay de nuevo" con **Entendido**.

**Vuelta atrás:** `git reset --hard 2480457 && npm install && bash scripts/deploy.sh --sin-pull`. Las tablas y columnas nuevas no molestan al código anterior (no se quitan). Antes, quitar la línea de `cron-promotores.sh` de `crontab -e`. Los cupones de promotor que ya se crearon quedan como cupones normales: pausarlos en Ofertas si no se quieren.

### Activar "Continuar con Google" (C-85, cuando quieras; no necesita deploy de código)
1. Google Cloud → proyecto ElectroWeb → Google Auth Platform → **Clientes** → Crear cliente → **Aplicación web**, nombre `ElectroShop inicio de sesión`, y en "URIs de redireccionamiento autorizados": `https://electroshopve.com/api/auth/callback/google`. Es un cliente distinto del de los respaldos.
2. En el servidor, `nano .env` y agregar `GOOGLE_CLIENT_ID="…"` y `GOOGLE_CLIENT_SECRET="…"`; luego `bash scripts/deploy.sh --sin-pull`.
3. En una ventana de incógnito, `/login` y `/registro` muestran "Continuar con Google". Probar con un Gmail que **no** sea el de administrador (los administradores no entran con Google, a propósito). Nunca se probó con Google real (`estado/C-85.md`): si falla, mandar la captura.

### Por confirmar de lo que ya está en producción (C-165 y anteriores)
No hay más deploy pendiente que el de arriba. Estas son las pruebas que Andrés debe dar por buenas (o avisar a Claude con lo que falle). Detalle en `estado/C-165.md`, `estado/C-164.md`, `estado/C-159.md` y `estado/C-160.md`; lo subido, con su SQL, en `HISTORIAL.md`.

### Respaldos (C-165), lo más importante
1. **La clave privada guardada fuera del servidor** (gestor de contraseñas) y una copia del `.env`.
2. **Google conectado:** Configuración → Respaldos → Google Drive muestra "Conectado" y su correo. Requiere la app **publicada** ("En producción" en Google Auth Platform → Público), si no el permiso vence a los 7 días.
3. **"Respaldar ahora":** dos filas "Hecho" (base y fotos/constancias) y dos archivos `.enc` en la carpeta "Respaldos ElectroShop" de su Drive. Si sale "Falló", pasar el texto del historial a Claude.
4. **"Verificar el último":** dice que coincide con Drive.
5. **Respaldo encendido y el cron puesto:** `crontab -l` muestra `5 * * * * /home/luami/cron-respaldos.sh …`; al día siguiente aparece un respaldo "automático" en el historial.
6. **Una restauración de prueba** (`OPERACION.md`, "Restaurar un respaldo", pasos 1 a 3): un respaldo que nunca se abrió no es un respaldo. Repetirla cada trimestre.

### Otras pruebas pendientes (unas 20 minutos)
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
- **El respaldo falla o Google no conecta:** no afecta a la tienda. Ver el motivo en el historial de Configuración → Respaldos y pasárselo a Claude. Mientras tanto sirve `~/respaldo-antes-c165.dump` (hecho antes de subir).
- **Volver atrás el código:** `git reset --hard <commit> && npm install && bash scripts/deploy.sh --sin-pull`, con `<commit>` = `d453809` (deshacer solo C-165) o `2ccba36` (también C-164). Las tablas nuevas no molestan al código anterior (no se quitan). Antes, quitar la línea de `cron-respaldos.sh` de `crontab -e`: la ruta ya no existiría y el cron daría error cada hora.
- **Si el correo del panel deja de salir** (certificado): `SMTP_ALLOW_SELF_SIGNED="true"` en el `.env` y el deploy, o volver atrás.
- **Si el cron de reseñas manda correos de más:** quitar su línea de `crontab -e` y avisar a Claude con lo que respondió `~/cron-resenas.sh`.
- **Redondeo de C-96** (pendiente desde el 24/09, si falta), con su respaldo:
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump`
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
  Muestra tres números: el último debe ser 0; si el del medio ("diferencia real") no es 0, pasarle la salida a Claude.

## 3. Tareas de Andrés (sin código)
En el orden en que más destraban:

**En producción**
1. **El deploy de arriba** (versión `v1.0.0-rc.4`: promotores, política de contenido y versiones del panel) con sus pruebas y la línea del cron de promotores. De lo anterior siguen pendientes **una restauración de prueba del respaldo** (`OPERACION.md`), el redondeo de C-96, las pruebas de C-157 y las visuales de C-162.
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
- **Decisiones abiertas de promotores** (`PLAN.md` §7.1, A13 y A14): si los digitales pagan comisión, los % por defecto y los términos del programa para el abogado.
- **C-166b (después de una semana con C-166 limpia):** pasar la Content-Security-Policy a "bloquea" (`CSP_ENFORCE="true"` y un deploy) y, con una restauración probada, evaluar subir el volcado directo a Drive sin pasar por disco si la base crece.
- Lo que salga de la revisión final y de las pruebas del deploy se arregla antes que lo demás.
- Mientras tanto Claude puede revisar `REVISION_FINAL.md` contigo (en el teléfono, punto por punto) o escribir la próxima ronda de Gemini cuando haya una tarea mecánica.
- El plazo de la reseña (C-157) queda en 5 días (2 si es digital), en `lib/resenas-avisos.ts` (`DIAS_FISICO`, `DIAS_DIGITAL`), hasta que Andrés diga otra cosa.

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame si ya subí lo que falta (sección 2), cómo salieron las pruebas (sobre todo la búsqueda en la web desde el servidor) y el redondeo de C-96, y si tengo alguno de los datos de la sección 3.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4). Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
