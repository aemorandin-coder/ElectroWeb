# Lo de ahora (actualizado 2026-10-02, C-164)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **`main`:** todo lo hecho hasta C-163, más C-157, C-158, C-159 (cotizaciones, tercera parte), C-160 (los menores) y C-164 (los últimos menores de código). Igual a GitHub.
- **Producción: C-158 seguro; C-159 y C-160 probablemente ya.** Visto desde fuera el 02/10: `/terminos` ya muestra el contacto y el horario de Configuración ("Lunes a Sábado 9:00 AM - 7:00 PM") y no el correo escrito a mano de antes, que es la marca de C-160 (y C-159 y C-160 salen en un solo lote). Desde fuera no se puede confirmar C-159 (sus rutas piden sesión). **Preguntárselo a Andrés:** `git log -1 --oneline` en el servidor (`2ccba36` = ya subidas; `ba6055c` o `7f996ef` = faltan). También **no se sabe** si el SQL de marcado de C-157 se corrió antes del cron, si la línea del cron está puesta (`crontab -l`), si se corrió el redondeo de C-96 ni si salieron bien las pruebas visuales de C-162.
- **Falta subir:** C-164 seguro, y C-159 y C-160 si el servidor todavía está en `ba6055c`/`7f996ef`, **todo en un solo lote** (bloque de abajo). **Cambio de base: tres columnas** en `quotes` (de C-159; C-160 y C-164 no cambian la base; si C-159 ya subió, no hay SQL). Sin crons. Una variable opcional (`SMTP_ALLOW_SELF_SIGNED`).
- **Gemini:** sin ronda abierta. Las tarjetas que quedaban (`RechargeModalV2` y las valoraciones con coma) las cerró Claude en C-164.

## 2. Deploy pendiente: C-159, C-160 y C-164
Cotizaciones (retención del IVA, correo, Mis cotizaciones), los menores (páginas legales editables, buscador, reseñas, SMTP y más) y los últimos menores de código. Detalle y pruebas en `estado/C-159.md`, `estado/C-160.md` y `estado/C-164.md`.

- **Lo que sube:** tres tareas (dos si C-159 y C-160 ya están). **Cambio de base: tres columnas** en `quotes` (solo si falta C-159). Sin dependencias, crons ni guiones.
- Verificado: `tsc`, `npm run lint` (0 errores), `npm run build`, las pruebas propias de C-159 y C-160 (57 y 84 comprobaciones) y la prueba de humo, **59 de 59** (esa última, antes de C-164; C-164 pasó `tsc`, `lint` y `build`).

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
   - Empieza por `ba6055c` o `7f996ef`: faltan C-159, C-160 y C-164. Seguir con los pasos 2 al 4.
   - Empieza por `2ccba36`: C-159 y C-160 ya están; solo falta C-164 (sin cambio de base). Saltar el paso 2 y en el 3 hacer solo `git pull --ff-only` y `bash scripts/deploy.sh` (no debe mostrar ningún SQL: si lo muestra, parar y avisar a Claude).
   - Otra cosa: avisar a Claude antes de seguir.
2. **Respaldo** (solo si falta C-159; cambia la base):
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-c159-c160.dump`
3. **Subir:** `git pull --ff-only` y `bash scripts/deploy.sh`.
   - El guion **para y muestra este SQL** (solo ese): `ALTER TABLE "quotes" ADD COLUMN "emailedAt" TIMESTAMP(3), ADD COLUMN "emailedTo" TEXT, ADD COLUMN "ivaRetentionPercent" INTEGER NOT NULL DEFAULT 0;` (puede salir en varias líneas).
   - Si coincide: `npx prisma db push` y `bash scripts/deploy.sh` otra vez. Si aparece un `DROP` o algo distinto, no seguir y avisar a Claude.
4. **Comprobar:** `git log -1 --oneline` muestra el último commit de `main`.
5. **Si falta el redondeo de C-96** (pendiente desde el 24/09), con su respaldo:
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump`
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
   - Muestra tres números. El último debe ser 0. Si el del medio ("diferencia real") no es 0, pasarle la salida a Claude.

### Pruebas después de subir (unos 20 minutos)
1. **Retención (C-159):** Admin → Cotizaciones → Nueva (o una de prueba) → una línea de $116 → Condiciones → "Retención del IVA": 75 % → debajo se ve "Retención del IVA (75 %): −$12,00 · Neto a pagar: $104,00". Guardar y enviar; abrir el enlace: el presupuesto muestra el neto a pagar. Con "No retiene", la hoja queda como antes.
2. **Correo (C-159):** en esa cotización, "Enviar por correo" a tu propio correo: llega con el resumen y un botón que abre el presupuesto. Si intentas mandarla otra vez, pide confirmación.
3. **Mis cotizaciones (C-159):** con una cuenta de cliente (con el correo verificado), en el menú "Mis cotizaciones". Pide una cotización con esa cuenta en `/cotizacion`: aparece "En preparación". Mándale otra a su correo desde el panel y aparece "Lista para revisar" con su botón.
4. **Páginas legales (C-160):** abre `/terminos` y `/privacidad` en el teléfono y en la computadora. Comprueba **el correo, el WhatsApp y el horario del final** (salen de Configuración → Negocio): si algo no es lo que quieres mostrar, se cambia ahí. `/terminos#garantia` baja a "Garantía y devoluciones". En Legal → Documentos aparecen con la etiqueta "Página pública" y "Nueva versión".
5. **Correo del panel (C-160):** Configuración → Correo → "Probar conexión" (si usas el servidor de correo del panel). Si da un error de certificado, avísame o pon `SMTP_ALLOW_SELF_SIGNED="true"` en el `.env` del servidor y reinicia con el deploy.
6. **Buscador y catálogo (C-160):** buscar `teclado` y ver que el primero es el que mejor responde; "Menor a mayor" con una oferta puesta (el producto rebajado sale donde le toca por su precio con la oferta).
7. **Reseña (C-160):** en la ficha de un producto, con una cuenta que no lo compró: una línea ("solo quienes compraron…") y ningún formulario; con una que sí lo recibió, el formulario.
8. **Últimos menores (C-164):** una valoración con decimales sale con coma ("4,5") en Admin → Cursos o en el panel del creador; Mi saldo → "Recargar": al escribir un monto aparece el equivalente en bolívares.

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
- **Volver atrás el código:** a `ba6055c` (antes de todo: `git reset --hard ba6055c && npm install && bash scripts/deploy.sh --sin-pull`) o, si solo quieres deshacer C-164, a `2ccba36`. Las columnas nuevas no molestan al código anterior (no se quitan). Las dos páginas legales que se crearon en la base (`terminos` y `privacidad`) tampoco molestan: el código anterior no las lee.
- **Si el correo del panel deja de salir** (certificado): `SMTP_ALLOW_SELF_SIGNED="true"` en el `.env` y el deploy, o volver atrás.
- **Si el cron de reseñas manda correos de más:** quitar su línea de `crontab -e` y avisar a Claude con lo que respondió `~/cron-resenas.sh`.

## 3. Tareas de Andrés (sin código)
En el orden en que más destraban:

**En producción**
1. El deploy de arriba, con sus pruebas, el redondeo de C-96, las pruebas de C-157 y las visuales de C-162. Confirmar que el cron de reseñas quedó en `crontab -l`.
2. **La revisión final** ([`REVISION_FINAL.md`](./REVISION_FINAL.md)): en el teléfono real, marcando cada punto. Pendiente desde el 26/09.
3. Pasar a borrador el **"Producto Test"** (Consolas) y renombrar los productos digitales que dicen **"(SALDO)"** (`estado/C-136.md`).
4. **Marca** en cada producto físico (campo nuevo, junto a la categoría) e **imagen para compartir** de 1200 × 630 px (Configuración → SEO → Inicio). El Dashboard lo recuerda.
5. **Cargar catálogo:** con la búsqueda en la web (C-155) o con la carga masiva (Productos → Más → "Importar (.json)").

**Medición (antes de pagar un anuncio)**
6. **Google Search Console:** agregar `electroshopve.com`, enviar `https://electroshopve.com/sitemap.xml` y revisar "Páginas" una semana después.
7. **Google Analytics y píxel de Meta:** poner `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` en el `.env` del servidor y correr el deploy (`estado/C-145.md`).
8. Cuando vaya a pagar anuncios en Meta: el catálogo con `https://electroshopve.com/feed/productos.xml` (pasos en `HISTORIAL.md`, C-149).

**Datos y decisiones que tienen tareas paradas** (`PLAN.md` §7.1)
9. Entrega de un código y de una recarga: **respondió el 01/10** que tarda unas 2 horas y que la meta es 30 minutos. **Falta el horario** en que se atiende (para el plazo en la ficha, C-154b).
10. Medidas y precios reales de los sobres y cajas, el precio del "bulto aparte" y el monto del embalaje gratis.
11. Cuánto cobran ZOOM y MRW en Guanare por el seguro, y si aplica con cobro a destino (C-107).
12. El diagnóstico de clientes borrados (C-92). En el servidor, solo lee:
    `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/diagnostico-c92.sql > ~/diagnostico-c92.txt 2>&1`
    y pasarle a Claude el contenido de `~/diagnostico-c92.txt`.
13. ¿La cinta ES también en los productos que no son nuevos (al menos en "Caja abierta")? Hoy llevan su etiqueta y no la cinta (`estado/C-161.md`).
14. Avisar cuando SADES vuelva (taller).

**Con el abogado y el contador**
15. Abogado: términos y privacidad (ahora se editan en Legal → Documentos; `estado/C-120.md` §7) y las 3 afirmaciones de `estado/C-144.md` (el motivo "comprobante vencido o ilegible", los plazos y los datos de contacto).
16. Contador: las preguntas de `estado/C-151.md` (IVA de los digitales), `estado/C-147b.md` (embalaje), `estado/C-120.md` §6 y **`estado/C-159.md` (retención del IVA: quiénes retienen, el comprobante y si hay retención de ISLR en los servicios)**.

**Limpieza opcional, en tu máquina** (todo ya está en `main` o fue reemplazado)
- ChatGPT: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- Ramas locales ya fusionadas: `git branch --merged main` las lista; se pueden borrar con `git branch -d <rama>`.

## 4. Fila de Claude
La lista completa, con lo que espera datos, está en `PLAN.md` §5.2. **No queda código en fila que no espere un dato tuyo:**
- Esperan datos: C-154b (plazo de los digitales: ya se sabe que son unas 2 horas, falta el horario), C-107 (seguro), C-92 (clientes) y C-153b (decidir si los "frágiles" llevan más relleno).
- Lo que salga de la revisión final y de las pruebas del deploy se arregla antes que lo demás.
- Mientras tanto Claude puede revisar `REVISION_FINAL.md` contigo (en el teléfono, punto por punto) o escribir la próxima ronda de Gemini cuando haya una tarea mecánica.
- El plazo de la reseña (C-157) queda en 5 días (2 si es digital), en `lib/resenas-avisos.ts` (`DIAS_FISICO`, `DIAS_DIGITAL`), hasta que Andrés diga otra cosa.

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame si ya subí lo que falta (sección 2), cómo salieron las pruebas (sobre todo la búsqueda en la web desde el servidor) y el redondeo de C-96, y si tengo alguno de los datos de la sección 3.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4). Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
