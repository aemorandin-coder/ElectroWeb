# Lo de ahora (actualizado 2026-10-01, C-158)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **`main`:** todo hasta C-161 y C-155, más C-162 (la tarjeta estrella y la cinta), C-163 (el guion de categorías), C-157 (pedir la reseña por correo) y C-158 (buscador sin acentos). Igual a GitHub.
- **Producción: hasta C-155** (debería ser `57840db`). Visto desde fuera el 01/10: la tablet W&O ya tiene marca (el campo es de C-155) y la foto del Sonic está armada sin cinta (C-161). **No se sabe** si la búsqueda en la web respondió bien desde el servidor ni si se corrió el redondeo de C-96: preguntárselo a Andrés.
- **Falta subir:** C-162, C-163, C-157 y C-158 (bloque de abajo). **Cambio de base: una columna** (`orders.reviewRequestedAt`) y **un cron nuevo**.
- **Gemini:** sin ronda abierta. La próxima la escribe Claude.

## 2. Deploy pendiente: C-162, C-163, C-157 y C-158
Avisos de Andrés del 01/10, la reseña por correo y el buscador. Detalle y pruebas en `estado/C-162.md`, `estado/C-163.md`, `estado/C-157.md` y `estado/C-158.md`.

- **Lo que sube:** cuatro tareas. **Cambio de base: una columna** (`orders.reviewRequestedAt`). Un **cron nuevo**. Sin dependencias ni variables nuevas.
- Verificado todo junto: `tsc`, `npm run build` y la prueba de humo, **59 de 59**.

**Qué trae:**
- **Tarjeta estrella del inicio (C-162):** la foto llena el alto de la tarjeta (antes quedaba una franja blanca arriba) y la etiqueta va en la esquina. Al lado quedan dos tarjetas a la vista en vez de tres; las demás, con la flecha.
- **Cinta ES (C-162):** la franja azul baja en diagonal hasta el borde de la foto, como en las fotos hechas a mano. Antes terminaba en un corte vertical.
- **Guion de categorías (C-163):** ordena las categorías de producción con un comando (pasos 7 y 8).
- **Reseña por correo (C-157):** 5 días después de la entrega (2 si es solo digital) el cliente recibe **un** correo con los productos que todavía no reseñó y un botón a cada uno. Ya no sale el correo que se mandaba al instante de la entrega. El cliente puede apagarlo en Mi perfil → Notificaciones → "Tus reseñas".
- **Buscador sin acentos (C-158):** "audifonos" encuentra "Audífonos" (también la ñ y las mayúsculas), entiende plurales y, si lo escrito no coincide, muestra lo que se parece con un aviso ("tecaldo" encuentra el teclado). Sin cambio de base ni pasos en el servidor.

### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git log -1 --oneline`. Debe empezar por `57840db`. Si dice otra cosa, avisar a Claude antes de seguir.
2. **Respaldo** (cambia la base y mueve productos; sirve para todo este bloque):
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-c157.dump`
3. **Subir:** `git pull --ff-only` y `bash scripts/deploy.sh`.
   - El guion **para y muestra este SQL** (solo ese): `ALTER TABLE "orders" ADD COLUMN "reviewRequestedAt" TIMESTAMP(3);`
   - Si coincide: `npx prisma db push` y `bash scripts/deploy.sh` otra vez. Si aparece un `DROP` o algo distinto, no seguir y avisar a Claude.
4. **Comprobar:** `git log -1 --oneline` muestra el último commit de `main`.
5. **Marcar las órdenes ya entregadas** (una vez, **antes** de poner el cron: ya recibieron el correo viejo y sin esto recibirían un segundo):
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/marcar-resenas-c157.sql`
   - Muestra `UPDATE n` y después "sin_marcar", que debe ser 0.
6. **Cron nuevo** (una vez al día a las 15:00, hora del servidor). Se copia el de favoritos:
   `sed 's/favoritos/resenas/g' ~/cron-favoritos.sh > ~/cron-resenas.sh && chmod +x ~/cron-resenas.sh && cat ~/cron-resenas.sh`
   - Debe nombrar `/api/cron/resenas`. Si el contenido no se parece al de `cron-favoritos.sh`, no seguir y avisar a Claude.
   `crontab -e` y agregar al final la línea `0 15 * * * /home/luami/cron-resenas.sh`; después `crontab -l` para ver que quedó.
   - Probarlo a mano: `~/cron-resenas.sh`. Responde `{"ordenes":0,"clientes":0,"correos":0}` si el paso 5 salió bien y no hay entregas nuevas.
7. **Categorías, primero mirar** (no cambia nada; muestra la lista de lo que haría):
   `npx tsx scripts/reorganizar-categorias.ts`
8. **Categorías, aplicar** (si la lista está bien; el respaldo ya está hecho en el paso 2):
   `npx tsx scripts/reorganizar-categorias.ts --aplicar --borrar-vacias`
   - Crea "Gift Cards y Recargas", "Videojuegos" y "Audio"; "Smartphones" pasa a "Celulares y Tablets"; mueve las gift cards y recargas, los dos juegos y los audífonos; corrige las descripciones; sube a 6 las categorías del inicio; y borra "General" y "Otros" si están vacías.
   - Sin `--borrar-vacias` hace todo menos borrar.
9. **Si falta el redondeo de C-96** (pendiente desde el 24/09), con su respaldo:
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump`
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
   - Muestra tres números. El último debe ser 0. Si el del medio ("diferencia real") no es 0, pasarle la salida a Claude.

### Pruebas después de subir (unos 15 minutos)
1. **Inicio en la computadora:** en "Destacados de la semana", la foto del primer producto llena el alto de su tarjeta, sin franja blanca arriba, y "NUEVO" está en la esquina.
2. **Categorías:** en un par de minutos, "Compra por categoría" muestra seis. Las gift cards están en "Gift Cards y Recargas"; Sonic y GTA V, en "Videojuegos"; los audífonos Piston, en "Audio"; la tablet, en "Celulares y Tablets". En `/categorias`, cada una con su descripción.
3. **Volver a subir tres fotos** (las ya armadas no cambian solas). En cada producto: editar, quitar la foto y subirla otra vez.
   - **Tablet W&O** y **audífonos Piston**: para que la cinta salga sin el corte.
   - **Grand Theft Auto V PS5**: para que quede centrada y con aire (quitar las dos primeras, que son la misma).
   - Si no tienes el original, la tienda lo guarda: la dirección de la foto, terminada en `.orig.png` en vez de `.webp`.
4. **Reseña por correo (C-157):**
   - Admin → Marketing → Correos → "Pedir la reseña": se ve el correo de ejemplo con dos botones.
   - Mi perfil → Notificaciones: aparece "Tus reseñas" con su interruptor (encendido).
   - **Prueba real con tu cuenta:** busca una orden tuya entregada (o marca una de prueba como entregada) y adelanta su fecha:
     `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -c "UPDATE orders SET \"deliveredAt\" = now() - interval '6 days', \"reviewRequestedAt\" = NULL WHERE \"orderNumber\" = 'ORD-2026-00XX'"` (con su número) y corre `~/cron-resenas.sh`: debe responder `"correos":1` y llegarte el correo. El botón abre la ficha y baja hasta "Reseñas".
   - El enlace "No recibir más este pedido de reseñas" del correo muestra su confirmación y apaga el interruptor.
5. **Buscador (C-158):** en la tienda, buscar `audifonos` y `teclado` sin acento y escribir mal una palabra (`tecaldo`): salen los productos y, en el mal escrito, el aviso azul "Estos productos se le parecen". En Admin → Productos, buscar con y sin acento.

### Pruebas de lo anterior, si faltan (ya está en producción)
- **Buscar en la web (C-155):** Productos → Nuevo → Producto físico, "Teclado mecánico Redragon Kumara K552", "Buscar". Si arriba dice "Los datos vienen de la búsqueda con IA y no se pudieron contrastar", los buscadores no le responden al servidor: avisar a Claude. La clave va en el `.env` del servidor como `GROQ_API_KEY`.
- **Marca (C-155):** ponerla en los audífonos Piston, el SSD y el teclado AOAS.
- **Embalaje según el paquete (C-153):** Configuración → Envíos y retiro → encender, corregir las medidas y los precios de tus sobres y cajas, y poner el monto del embalaje gratis. Una compra barata con envío: en la orden, "Cómo empacar".

### Si algo sale mal
- **Volver atrás el código:** `git reset --hard 57840db && npm install && bash scripts/deploy.sh --sin-pull`. La columna nueva no molesta al código anterior (no se quita). Con el código anterior el cron de reseñas no hace nada útil: quitar la línea con `crontab -e`.
- **Las categorías:** el guion hace todo o nada. Para deshacerlo después, el respaldo del paso 2, o mover los productos desde el panel.
- **Si el cron manda correos de más:** quitar la línea de `crontab -e` y avisar a Claude con lo que respondió `~/cron-resenas.sh`.

## 3. Tareas de Andrés (sin código)
En el orden en que más destraban:

**En producción**
1. El deploy de arriba, con sus pruebas y el redondeo de C-96.
2. **La revisión final** ([`REVISION_FINAL.md`](./REVISION_FINAL.md)): en el teléfono real, marcando cada punto. Pendiente desde el 26/09.
3. Pasar a borrador el **"Producto Test"** (Consolas) y renombrar los productos digitales que dicen **"(SALDO)"** (`estado/C-136.md`).
4. **Marca** en cada producto físico (campo nuevo, junto a la categoría) e **imagen para compartir** de 1200 × 630 px (Configuración → SEO → Inicio). El Dashboard lo recuerda.
5. **Cargar catálogo:** con la búsqueda en la web (C-155) o con la carga masiva (Productos → Más → "Importar (.json)").

**Medición (antes de pagar un anuncio)**
6. **Google Search Console:** agregar `electroshopve.com`, enviar `https://electroshopve.com/sitemap.xml` y revisar "Páginas" una semana después.
7. **Google Analytics y píxel de Meta:** poner `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` en el `.env` del servidor y correr el deploy (`estado/C-145.md`).
8. Cuando vaya a pagar anuncios en Meta: el catálogo con `https://electroshopve.com/feed/productos.xml` (pasos en `HISTORIAL.md`, C-149).

**Datos y decisiones que tienen tareas paradas** (`PLAN.md` §7.1)
9. Cuánto tarda de verdad la entrega de un código y de una recarga, y en qué horario se atiende.
10. Medidas y precios reales de los sobres y cajas, el precio del "bulto aparte" y el monto del embalaje gratis.
11. Cuánto cobran ZOOM y MRW en Guanare por el seguro, y si aplica con cobro a destino (C-107).
12. El diagnóstico de clientes borrados (C-92). En el servidor, solo lee:
    `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/diagnostico-c92.sql > ~/diagnostico-c92.txt 2>&1`
    y pasarle a Claude el contenido de `~/diagnostico-c92.txt`.
13. ¿La cinta ES también en los productos que no son nuevos (al menos en "Caja abierta")? Hoy llevan su etiqueta y no la cinta (`estado/C-161.md`).
14. Avisar cuando SADES vuelva (taller).

**Con el abogado y el contador**
15. Abogado: términos y privacidad (`estado/C-120.md` §7) y las 3 afirmaciones de `estado/C-144.md` (el motivo "comprobante vencido o ilegible", los plazos y los datos de contacto).
16. Contador: las preguntas de `estado/C-151.md` (IVA de los digitales), `estado/C-147b.md` (embalaje) y `estado/C-120.md` §6.

**Limpieza opcional, en tu máquina** (todo ya está en `main` o fue reemplazado)
- ChatGPT: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- Ramas locales ya fusionadas: `git branch --merged main` las lista; se pueden borrar con `git branch -d <rama>`.

## 4. Fila de Claude
La lista completa, con lo que espera datos, está en `PLAN.md` §5.2. Lo próximo, en orden:
1. **C-159 · Cotizaciones:** por correo, "Mis cotizaciones" y la retención del IVA.
2. **C-160 · Menores.**
- En cuanto lleguen los datos de la sección 3: C-154b (plazo de los digitales), C-107 (seguro) y C-92 (clientes).
- Lo que salga de la revisión final y de las pruebas del deploy se arregla antes que lo demás.
- **Pregunta abierta para Andrés (C-157):** ¿5 días después de la entrega (2 si es digital) le parece bien? Se cambia en `lib/resenas-avisos.ts` (`DIAS_FISICO`, `DIAS_DIGITAL`).

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame si ya subí lo que falta (sección 2), cómo salieron las pruebas (sobre todo la búsqueda en la web desde el servidor) y el redondeo de C-96, y si tengo alguno de los datos de la sección 3.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4). Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
