# Lo de ahora (actualizado 2026-10-01, C-159)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **`main`:** todo lo hecho hasta C-163, más C-157, C-158 y C-159 (cotizaciones, tercera parte). Igual a GitHub cuando se fusione C-159.
- **Producción: hasta C-158** (debería ser `ba6055c`, o `7f996ef` si se subió un momento antes: los dos tienen C-157 y C-158). Visto desde fuera el 01/10: `/api/cron/resenas` responde 401 y la búsqueda sin acento funciona. **No se sabe** si el SQL de marcado se corrió antes del cron, si la línea del cron está puesta (`crontab -l`), si se corrió el redondeo de C-96 ni si salieron bien las pruebas visuales de C-162: preguntárselo a Andrés.
- **Falta subir:** C-159 (bloque de abajo). **Cambio de base: tres columnas** en `quotes`. Sin crons ni variables.
- **Gemini:** sin ronda abierta. La próxima la escribe Claude.

## 2. Deploy pendiente: C-159 (cotizaciones, tercera parte)
La retención del IVA, la cotización por correo y "Mis cotizaciones". Detalle y pruebas en `estado/C-159.md`.

- **Lo que sube:** una tarea. **Cambio de base: tres columnas** en `quotes`. Sin dependencias, variables, crons ni guiones.
- Verificado: `tsc`, `npm run build`, la prueba propia (57 comprobaciones por HTTP y en el navegador) y la prueba de humo, **59 de 59**.

**Qué trae:**
- **Retención del IVA:** en el editor de cotizaciones, "Retención del IVA que practica el cliente" (No retiene / 75 % / 100 %), que marca el equipo. El presupuesto muestra el IVA que retiene el cliente y el **neto a pagar** (y el anticipo se calcula sobre el neto). **Ojo:** los órganos del Estado, las gobernaciones, las alcaldías y los entes públicos sin fines empresariales **no** retienen (Providencia SNAT/2025/000054, art. 3); retienen los contribuyentes especiales.
- **Enviar por correo:** en el editor, dentro de "Enlace para el cliente": el correo del cliente ya puesto, un mensaje opcional y el botón. Le llega el resumen con un botón para ver y aprobar el presupuesto.
- **Mis cotizaciones:** menú nuevo en el panel del cliente, con las que pidió con su cuenta y las que le enviaste a su correo (verificado).

### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git log -1 --oneline`. Debe empezar por `ba6055c` (o `7f996ef`). Si dice otra cosa, avisar a Claude antes de seguir.
2. **Respaldo** (cambia la base):
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-c159.dump`
3. **Subir:** `git pull --ff-only` y `bash scripts/deploy.sh`.
   - El guion **para y muestra este SQL** (solo ese): `ALTER TABLE "quotes" ADD COLUMN "emailedAt" TIMESTAMP(3), ADD COLUMN "emailedTo" TEXT, ADD COLUMN "ivaRetentionPercent" INTEGER NOT NULL DEFAULT 0;` (puede salir en varias líneas).
   - Si coincide: `npx prisma db push` y `bash scripts/deploy.sh` otra vez. Si aparece un `DROP` o algo distinto, no seguir y avisar a Claude.
4. **Comprobar:** `git log -1 --oneline` muestra el último commit de `main`.
5. **Si falta el redondeo de C-96** (pendiente desde el 24/09), con su respaldo:
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump`
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
   - Muestra tres números. El último debe ser 0. Si el del medio ("diferencia real") no es 0, pasarle la salida a Claude.

### Pruebas después de subir (unos 10 minutos)
1. **Retención:** Admin → Cotizaciones → Nueva (o una de prueba) → una línea de $116 → Condiciones → "Retención del IVA": 75 % → debajo se ve "Retención del IVA (75 %): −$12,00 · Neto a pagar: $104,00". Guardar y enviar; abrir el enlace: el presupuesto muestra el neto a pagar. Con "No retiene", la hoja queda como antes.
2. **Correo:** en esa cotización, "Enviar por correo" a tu propio correo: llega con el resumen y un botón que abre el presupuesto. Si intentas mandarla otra vez, pide confirmación.
3. **Mis cotizaciones:** con una cuenta de cliente (con el correo verificado), en el menú "Mis cotizaciones". Pide una cotización con esa cuenta en `/cotizacion`: aparece "En preparación". Mándale otra a su correo desde el panel y aparece "Lista para revisar" con su botón.

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
- **Volver atrás el código:** `git reset --hard ba6055c && npm install && bash scripts/deploy.sh --sin-pull`. Las columnas nuevas no molestan al código anterior (no se quitan).
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
15. Abogado: términos y privacidad (`estado/C-120.md` §7) y las 3 afirmaciones de `estado/C-144.md` (el motivo "comprobante vencido o ilegible", los plazos y los datos de contacto).
16. Contador: las preguntas de `estado/C-151.md` (IVA de los digitales), `estado/C-147b.md` (embalaje), `estado/C-120.md` §6 y **`estado/C-159.md` (retención del IVA: quiénes retienen, el comprobante y si hay retención de ISLR en los servicios)**.

**Limpieza opcional, en tu máquina** (todo ya está en `main` o fue reemplazado)
- ChatGPT: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- Ramas locales ya fusionadas: `git branch --merged main` las lista; se pueden borrar con `git branch -d <rama>`.

## 4. Fila de Claude
La lista completa, con lo que espera datos, está en `PLAN.md` §5.2. Lo próximo, en orden:
1. **C-160 · Menores** (lista en `PLAN.md` §5.2).
- En cuanto lleguen los datos de la sección 3: C-154b (plazo de los digitales: ya se sabe que son unas 2 horas, falta el horario), C-107 (seguro) y C-92 (clientes).
- Lo que salga de la revisión final y de las pruebas del deploy se arregla antes que lo demás.
- El plazo de la reseña (C-157) queda en 5 días (2 si es digital), en `lib/resenas-avisos.ts` (`DIAS_FISICO`, `DIAS_DIGITAL`), hasta que Andrés diga otra cosa.

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame si ya subí lo que falta (sección 2), cómo salieron las pruebas (sobre todo la búsqueda en la web desde el servidor) y el redondeo de C-96, y si tengo alguno de los datos de la sección 3.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4). Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
