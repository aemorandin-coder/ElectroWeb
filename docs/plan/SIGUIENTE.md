# Lo de ahora (actualizado 2026-10-03, C-175 · versión 1.0.0-rc.10)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **`main`:** versión **`v1.0.0-rc.10`** (C-171, C-170 y C-175), igual a GitHub. **Producción: `v1.0.0-rc.6`**, comprobado desde fuera el 03/10. El plan de este ciclo está en `PROPUESTA_C168-C172.md`.
- **Falta subir, en un solo lote: C-171, C-170 y C-175** (bloque de abajo). **Cambio de base: una tabla nueva** (aditiva). Sin crons ni variables. Trae una dependencia nueva (`@dnd-kit`).
- **Sigue:** C-172 (Destacados que rotan).
- **Activar "Continuar con Google"** (C-85) es aparte y solo de Andrés: un cliente OAuth nuevo y dos líneas en el `.env` (pasos al final de la sección 2). No cambia código.
- **Sin confirmar con Andrés:** la restauración de prueba del respaldo, el redondeo de C-96 y las pruebas visuales de C-162.
- **Gemini:** sin ronda abierta.

## 2. Deploy pendiente: C-171, C-170 y C-175 (de rc.6 a v1.0.0-rc.10)
- **C-175 · Todos los correos rediseñados, con el logo largo** (`estado/C-175.md`): los 30 correos de la tienda llevan arriba el **logo largo** (antes el logo chiquito en un cuadro), el mismo título, el mismo botón, las mismas cajas y el mismo pie con redes y contacto. Pedido recibido, reseña publicada, los avisos al equipo y la prueba de Configuración dejaron su diseño aparte. Hechos para verse igual en Gmail, Outlook y el teléfono. Sin cambio de base. **El logo largo es el del encabezado de la tienda** (el ícono y "Electro Shop" con la letra y el azul de la marca), hecho imagen para el correo (`public/images/brand/logo-correo.png`).
- **C-170 · Dos administradores sin pisarse, en el resto del panel** (`estado/C-170.md`): en **Promotores, Categorías, Ofertas y cupones, Cotizaciones y Campañas**, si otra persona guardó antes se combinan los cambios (solo pregunta por lo que las dos tocaron), se ve quién más lo tiene abierto y se pregunta antes de borrar algo que otra persona edita. **ElectroStudio** junta los cambios en su guardado automático. Aprobar a un creador, verificar una empresa o atender una solicitud de producto dos veces a la vez ya no avisa dos veces. Sin cambio de base.
- **C-171 · Dashboard a tu gusto** (`estado/C-171.md`), el diseño tipo panel rápido de Samsung One UI: en el Dashboard, **Editar** → cada tarjeta se quita con el botón rojo "−" (las necesarias llevan candado: Por atender, Ventas cobradas y Accesos rápidos), se arrastra para ordenar, se le cambia el tamaño y abajo está lo que se puede agregar con "+"; **Listo** guarda. **Cada administrador tiene el suyo.** Accesos rápidos a elección y diez tarjetas nuevas (Visitantes ahora, Embudo de hoy, Meta del mes, Tasa del día, Más vendidos, Actividad del equipo, Promotores, Cotizaciones abiertas, Reseñas recientes, Respaldo).
- **Verificado:** `tsc`, `npm run lint` (0 errores), `npm run build`, `check:modulos`, **prueba de humo 59 de 59**, 35 comprobaciones del Dashboard, 53 de C-170 (dos administradores en cada pantalla) y 273 sobre 22 correos generados con las funciones reales, más 52 de la vista previa del panel. **No probado:** arrastrar con el dedo en un teléfono real, Chrome y Safari, y **los correos recibidos en Gmail, Outlook y el iPhone de verdad** (no se envió ninguno).
- **SQL total que va a mostrar `deploy.sh`** (solo esto). Nada borra ni cambia lo que ya existe:
  - `CREATE TABLE "admin_dashboard_layouts"` con un índice único (`userId`) y una llave a `users`.
- **Dependencias nuevas** (`@dnd-kit`, para arrastrar): `deploy.sh` las instala solo porque cambió `package-lock.json`.
- Sin crons ni variables nuevas.

### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git describe --tags --abbrev=0` debe decir `v1.0.0-rc.6`. Si dice otra cosa, avisar a Claude.
2. **Respaldo antes de subir:** Admin → Configuración → **Respaldos** → "Respaldar ahora" y esperar las dos filas "Hecho". Si prefieres a mano:
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc10.dump`
3. **Subir:** `git pull --ff-only` y `bash scripts/deploy.sh`. El guion para y muestra el SQL de arriba (la tabla nueva). Si coincide: `npx prisma db push` y `bash scripts/deploy.sh` otra vez. Si aparece un `DROP` o algo distinto, no seguir y avisar a Claude.
4. **Comprobar:** `git describe --tags --abbrev=0` debe decir `v1.0.0-rc.10` y el pie del menú del panel, "Versión 1.0.0-rc.10".

### Pruebas después de subir (unos 15 minutos)
1. **Dashboard:** se ve como siempre. Arriba a la derecha, **Editar**.
2. **Editar:** quita "Órdenes recientes" con el botón rojo; en "Agregar" toca "Visitantes ahora" y "Meta del mes"; cambia el tamaño de una tarjeta; arrastra una con el ícono de la cruz (o usa las flechas); en "Tus accesos rápidos" agrega "Clientes". **Listo**. Recarga: sigue igual. Ábrelo en el teléfono: es el mismo.
3. **Meta del mes:** escribe tu meta en la tarjeta y guarda: muestra el porcentaje y cuánto falta.
4. **Luis:** su Dashboard sigue siendo el de siempre (no cambió con el tuyo) y en "Agregar" **no** le salen "Meta del mes" ni "Respaldo".
5. **Restablecer** (dentro de Editar) vuelve al diseño original.
6. **Sin pisarse (C-170)**, con dos cuentas de administrador: abran la misma **cotización**; uno cambia "Para qué es" y el otro el lugar, y guardan los dos: quedan los dos cambios sin preguntar. Si los dos cambian lo mismo, sale el cuadro para elegir. Lo mismo vale en Promotores (lápiz), Categorías, Ofertas y Campañas. En **ElectroStudio**, escribe en una historia: debe seguir diciendo "Guardado".
7. **Correos (C-175):** Admin → Marketing → Correos → **Plantillas**: abre "Pedido recibido", "Gift card" y "Reseña publicada": arriba el logo largo, un botón azul y el pie con las redes.
8. **Un correo de verdad:** Configuración → Correo → **"Probar conexión"** a tu Gmail. Ábrelo en la computadora y en el teléfono (también en modo oscuro): el logo largo se ve completo y nítido, y nada queda cortado. Si puedes, reenvíalo a un Outlook u Hotmail. Si algo se ve mal, manda la captura.
9. **Otro, de los de siempre:** en una ventana de incógnito, "Olvidé mi contraseña" con tu correo de cliente: llega con el mismo diseño y el botón funciona.

**Vuelta atrás:** `git reset --hard v1.0.0-rc.6 && npm install && bash scripts/deploy.sh --sin-pull`. La tabla nueva no molesta al código anterior (no se quita).

### Por confirmar del lote anterior (rc.6, ya en producción; detalle en `HISTORIAL.md`)
Versiones (Administración → Versiones), el caso de dos administradores sobre un producto (papelera, combinar, aviso al instante), la marquesina del equipo, Reportes en vivo y la línea del cron de la papelera en `crontab -l`.

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
1. **El deploy de arriba** (versión `v1.0.0-rc.10`: el Dashboard a tu gusto, el panel sin pisarse y los correos con el logo largo) con sus pruebas, y confirmar las del lote anterior (rc.6). De antes siguen pendientes **una restauración de prueba del respaldo** (`OPERACION.md`), el redondeo de C-96, las pruebas de C-157 y las visuales de C-162.
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
