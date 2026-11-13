# Historial de subidas y detalle por tarea

> **Registro, no lista de pendientes.** Todo lo de este archivo está en producción desde la fecha de su título (producción: versión `v1.0.0-rc.34`, comprobada el 13/11/2026).
> Lo que falta por subir y por hacer está en [`SIGUIENTE.md`](./SIGUIENTE.md). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). El plan completo, en [`PLAN.md`](./PLAN.md).
> Cada bloque conserva el SQL que se aplicó y las pruebas que se dieron entonces: sirven para repetir una comprobación o para saber qué cambió en la base. Lo más nuevo va arriba.
> De antes del 29/09 no hay bloque aquí: el detalle está en el `estado/C-XX.md` de cada tarea.


## 13/11 · C-207 (de rc.33 a `v1.0.0-rc.34`)
La subió Andrés el 13/11 con los pasos de abajo. Claude lo comprobó el mismo día desde fuera, como un visitante:
- **La portada dice `1.0.0-rc.34`.** Trae la franja "Feliz Navidad" (sin popup), "Lo último que llegó a la tienda", "Más categorías" y la sección de gift cards.
- **Ningún producto se repite:** Destacados 5, gift cards 6, Recién llegados 6 y Ferretería 12.
- **Lo que Andrés vio mal ese mismo día lo arregló C-210** (rc.35):
  - Destacados se completaba con relleno;
  - "Recién llegados" ordenaba por la fecha de creación, y la lijadora, el esmeril y la aspiradora (publicados el 13/11) no subían;
  - las píldoras del panel, al revés de las de la tienda.

### El bloque que se subió: `v1.0.0-rc.34` (C-207; unos 10 minutos)
Producción está en `v1.0.0-rc.33` (C-205), comprobada desde fuera el 13/11; su bloque está en `HISTORIAL.md`.
- **C-207 (rc.34):** el saludo navideño en una franja (ya no tapa la tienda), cada producto una sola vez en el inicio, "Recién llegados" de toda la tienda, las gift cards en una sola sección y "Compra por categoría" con fotos.

Sin cambio de base, sin variables nuevas, sin crons y sin dependencias nuevas.

**Paso a paso.** En la terminal del servidor, en `/var/www/electroshopve`:
```bash
git describe --tags --abbrev=0 && git status -sb   # v1.0.0-rc.33 y sin cambios
bash scripts/deploy.sh                             # no hay SQL: compila y reinicia
git describe --tags --abbrev=0                     # v1.0.0-rc.34
```

**Pruebas** (unos 10 minutos):
1. **En la computadora, en una ventana de incógnito,** abre el inicio y espera unos segundos.
   - Nada tapa la tienda.
   - Debajo de los destacados está la franja "Feliz Navidad", con "Ver ideas para regalar", que lleva a la página de regalos.
2. **Ningún producto se repite.** De arriba abajo:
   - "Destacados de la semana";
   - "Gift cards y recargas digitales", con las 6 tarjetas, su "Desde $…" y "Elegir monto";
   - "Recién llegados": la hidrolavadora, el taladro, el panel LED, Sonic, GTA V y el teclado;
   - "Ferretería", con lo demás de la ferretería.
3. **En la computadora, "Compra por categoría":**
   - Ferretería, con "12 productos";
   - Gift Cards y Recargas, y Videojuegos, cada una con la foto de un producto;
   - "Más categorías", con cuatro fotos redondas.
   - Ninguna dice "1 producto".
4. **En el teléfono,** la franja lleva el saludo y "Ver ideas para regalar →", y se toca en cualquier parte.
5. **En el panel, Marketing → Navidad:**
   - "El saludo en el inicio" tiene marcada "La franja navideña", con "Recomendada";
   - la vista previa muestra la franja;
   - en "Popup del home", el aviso dice que el inicio lleva la franja navideña.

**Vuelta atrás:** `git reset --hard v1.0.0-rc.33 && npm install && bash scripts/deploy.sh --sin-pull`. No hay nada de la base que deshacer.


## 12-13/11 · C-204, C-204b, C-199 y C-205 (de rc.29 a `v1.0.0-rc.33`, con rc.30 a rc.32 adentro)
**rc.30 (C-204)** la subió el equipo entre el 12 y el 13/11, sin anotarlo (usuario `luami`). El 13/11 el servidor decía `v1.0.0-rc.30` y la portada, `1.0.0-rc.30`. **rc.33** la subió el equipo el 13/11 desde rc.30, con los pasos de abajo. Por eso el SQL fue de 4 columnas: `suppliers.noShipTerms` ya estaba desde rc.30.

Claude lo comprobó el 13/11 desde fuera, como un visitante:
- **La portada dice `1.0.0-rc.33`.**
- **Los 12 productos publicados de la ferretería** traen `despacho` = La Victoria (ZOOM 244) en la API pública: en el panel ya se eligió "Él mismo, desde La Victoria".
- **"Calcula tu envío":**
  - `/api/public/envio/destinos` responde `200`;
  - el estimado de un cable de la ferretería a Caracas da un paquete desde La Victoria: ZOOM real, Bs 6.923,77 ($7,59), no aproximado.
- **Falta probar con una cuenta:** la Lista del proveedor por pasos (C-205) y una compra mixta en dos paquetes.

### El bloque que se subió: `v1.0.0-rc.33` (C-204, C-204b, C-199 y C-205, con rc.30 a rc.32 adentro; unos 25 minutos)
Producción está en `v1.0.0-rc.29` (C-203), comprobada desde fuera el 12/11; su bloque está en `HISTORIAL.md`.
- **C-204 (rc.30):** la carga masiva completa: el Excel y las fotos juntos, lo que no se envía, "Sugeridos", la columna "Modelo" y el paso 5 (la lista de control, "Completar con la web" y "Publicar los listos").
- **C-204b (rc.31):** lo que no se envía, sin falsos positivos ("Motobomba a gasolina" se crea), el botón "Sí se envía", y de una carpeta solo se toman las fotos.
- **C-199 (rc.32):** el envío desde el proveedor (dos paquetes y dos órdenes, solo envío) y "Calcula tu envío" en la ficha y el carrito.
- **C-205 (rc.33):** la Lista del proveedor por pasos, los campos del tamaño de su dato y los filtros con ícono y subtítulo. Sin cambio de base.

**SQL total** (`prisma migrate diff` contra el esquema de `v1.0.0-rc.29`). Es aditivo: cinco columnas nuevas.
```sql
ALTER TABLE "suppliers" ADD COLUMN "dispatchCityCode" TEXT, ADD COLUMN "dispatchCityName" TEXT, ADD COLUMN "noShipTerms" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "orders" ADD COLUMN "dispatchCityCode" TEXT, ADD COLUMN "dispatchCityName" TEXT;
```
Sin variables nuevas, sin crons y sin dependencias nuevas.

**Paso a paso.** En la terminal del servidor, en `/var/www/electroshopve`:
```bash
git describe --tags --abbrev=0 && git status -sb                       # v1.0.0-rc.29 y sin cambios
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc33.dump
bash scripts/deploy.sh                       # se detiene y muestra el SQL de arriba
npx prisma db push && bash scripts/deploy.sh # aplica las cinco columnas y compila
git describe --tags --abbrev=0               # v1.0.0-rc.33
```
- `prisma db push` no debería preguntar nada: las columnas son nuevas. Si avisa de perder datos, no sigas y pásale el texto a Claude.

**Después del deploy, en el panel:** Productos → Más → Lista del proveedor. Elige el proveedor de la ferretería y, en "Quién despacha sus pedidos", "Él mismo, desde La Victoria" (está en el grupo Aragua).

**Pruebas** (unos 15 minutos, en la computadora; la consola se abre con F12):
1. **Una pestaña de antes del deploy (C-203):** antes de correr el guion, deja abierta la Lista del proveedor. Después, sin recargar, toca "Productos": se carga entera y sin errores rojos.
2. **"Calcula tu envío":** en la ficha de cualquier producto físico publicado, elige tu estado y tu ciudad. Sale lo que cobra ZOOM, en $ y Bs. En otra ficha, recuerda la ciudad.
3. **La Lista del proveedor (C-204 y C-205):** arriba se ven los 5 pasos.
   - En el paso 1, elige el proveedor y marca "Su lista trae el IVA incluido": el descuento y el margen son campos chicos, y "Así queda" muestra la cuenta.
   - En el paso 2, suelta juntos el archivo de los 70, su listado de existencia y la carpeta "Fotos para subir": dice "105 fotos · 74 códigos de su lista con foto".
   - En el paso 3, las píldoras llevan ícono y subtítulo, la "Motobomba a gasolina" dice "Nuevo" y cada fila con foto muestra su miniatura.
4. **Lo de la ferretería** (cuando publiques el primero):
   - su ficha dice "Sale desde La Victoria", sin delivery ni retiro en Guanare;
   - en el carrito, con algo de la tienda, "Tu pedido llega en 2 paquetes";
   - el checkout no ofrece retiro ni delivery.

**Vuelta atrás:**
- `git reset --hard v1.0.0-rc.29 && npm install && bash scripts/deploy.sh --sin-pull`.
- Las columnas no molestan al código anterior.
- Una compra hecha en dos paquetes queda como dos órdenes normales.

## 11-12/11 · C-203 (de rc.28 a `v1.0.0-rc.29`)
Lo subió el equipo entre el 11 y el 12/11 (no quedó anotado quién). Claude lo comprobó el 12/11 desde fuera, como un visitante:
- **El filtro de las pestañas viejas está activo.** Un pedido del router sin versión a `/categorias` (`Sec-Fetch-Dest: empty` y `Sec-Fetch-Site: same-origin`) responde `204`, y la página normal, `200`.
- **La miniatura de un video de `/servicios`,** por el optimizador de imágenes, responde `200` (`image/jpeg`). Antes daba 400.
- **La prueba con una pestaña abierta durante el deploy** pasó al bloque de rc.30 (`SIGUIENTE.md`), porque se hace en el próximo deploy.

### El bloque que se subió: `v1.0.0-rc.29` (C-203; unos 10 minutos)
Producción está en `v1.0.0-rc.28` (C-201, C-202 y C-200), subida el 10/11 por Andrés y comprobada desde fuera. Su bloque está en `HISTORIAL.md`.
- **C-203 (rc.29):**
  - una pestaña abierta antes de un deploy se recarga entera al navegar, en vez de mezclar las dos versiones;
  - el deploy sigue sirviendo 7 días los archivos del navegador de las versiones anteriores;
  - las miniaturas de los videos de `/servicios` se ven.

**Sin SQL**, sin variables nuevas y sin crons. `package-lock.json` cambió solo en el número de versión: el guion corre `npm install` y no instala nada nuevo.

**Paso a paso.** En la terminal del servidor, en `/var/www/electroshopve`:
```bash
git describe --tags --abbrev=0 && git status -sb   # v1.0.0-rc.28 y sin cambios
git pull --ff-only                                 # primero: este deploy cambia deploy.sh, y el que corre no se actualiza solo
bash scripts/deploy.sh                             # en el paso 4 dice "Archivos de versiones anteriores que se siguen sirviendo: N"
git describe --tags --abbrev=0                     # v1.0.0-rc.29
curl -s -o /dev/null -w '%{http_code}\n' -H 'sec-fetch-dest: empty' -H 'sec-fetch-site: same-origin' http://127.0.0.1:3000/categorias   # 204
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/categorias                                                                # 200
```
- El primer `curl` hace de una pestaña de antes del deploy, sin versión: responde `204`, vacío. El segundo es abrir la página: `200`.
- Si el primero responde `200`, el filtro no está activo: no sigas con las pruebas y pásale la salida a Claude.

**Pruebas** (unos 5 minutos, en la computadora; la consola se abre con F12 → Consola):
1. **Una pestaña vieja:** antes del deploy, deja abiertas `/categorias` y el panel de Categorías. Después del deploy, sin recargar, haz clic en un enlace en cada una. La página se carga entera (se ve el parpadeo) y la consola no muestra errores rojos.
2. **Navegar normal:** en una pestaña nueva, recorre la tienda (Productos, una ficha, el carrito) y el panel. Las páginas cambian sin recargarse enteras, como siempre.
3. **Servicios:** `/servicios` muestra las miniaturas de los videos.

**Vuelta atrás:** `git reset --hard v1.0.0-rc.28 && npm install && bash scripts/deploy.sh --sin-pull`. Sin cambio de base.


## 10/11 (noche) · C-201, C-202 y C-200 (de rc.25 a `v1.0.0-rc.28`, con rc.26 y rc.27 adentro)
Subido el 10/11 por Andrés, con `scripts/ferreteria-departamento.ts --aplicar`. Claude lo comprobó el mismo día desde fuera, como un visitante:
- `/`, `/productos`, `/categorias`, `/llms.txt`, `/sitemap.xml`, `/feed/productos.xml` y `/api/products/public` responden 200.
- **C-200:**
  - `/categorias/ferreteria` tiene el aviso del envío y los chips de sus categorías.
  - `/categorias/pinturas` existe, con la miga hacia Ferretería y el aviso.
  - `/categorias` muestra Ferretería sin sus 9 categorías sueltas.
  - El inicio todavía no muestra la vitrina ni el acceso, porque no hay productos publicados: así tiene que ser.
- **C-202:**
  - Las direcciones viejas de los productos renombrados responden 308 a la nueva: `fuente-poder-hp-pce011-250-watts` y `nintendo-eshop-card-saldo`.
  - El producto renombrado comparte con su nombre nuevo en `og:title`, y su imagen (200, JPEG) se ve también por la dirección vieja.
- Lo que necesita una cuenta quedó en `SIGUIENTE.md`, "Por confirmar de rc.28".
- **Los 14 nombres:** Andrés los cambió con el botón "Usar este nombre", y 10 quedaron con los nombres propios en minúscula o en inglés (lista en `SIGUIENTE.md`).

### El bloque que se subió: `v1.0.0-rc.28` (C-201, C-202 y C-200, con rc.26 y rc.27 adentro; unos 20 minutos)
Producción está en `v1.0.0-rc.25`, subida el 10/11 y comprobada desde fuera; su bloque está en `HISTORIAL.md`.
- **C-201 (rc.26):** el inicio de Mi panel sin errores y más claro.
- **C-202 (rc.27):** los nombres de producto escritos normal (la columna "Nombre en la tienda" y el aviso del asistente), y cambiar un nombre ya no rompe el enlace.
- **C-200 (rc.28):** el departamento Ferretería, que no se ve hasta que tenga productos publicados, y el pack de íconos v1.2.

**SQL total** (`prisma migrate diff` contra el esquema de `v1.0.0-rc.25`). Es aditivo: tres columnas nuevas.
```sql
ALTER TABLE "products" ADD COLUMN "previousSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[], ADD COLUMN "supplierName" TEXT;
ALTER TABLE "categories" ADD COLUMN "isDepartment" BOOLEAN NOT NULL DEFAULT false;
```
Sin variables nuevas, sin crons y sin dependencias nuevas. Un guion para después: `scripts/ferreteria-departamento.ts`.

**Paso a paso.** En la terminal del servidor, en `/var/www/electroshopve`:
```bash
git describe --tags --abbrev=0 && git status -sb                       # v1.0.0-rc.25 y sin cambios
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc28.dump
bash scripts/deploy.sh                       # se detiene y muestra el SQL de arriba
npx prisma db push && bash scripts/deploy.sh # aplica las tres columnas y compila
git describe --tags --abbrev=0                                          # v1.0.0-rc.28
npx tsx scripts/ferreteria-departamento.ts            # muestra lo que haría: Ferretería y sus 9 categorías
npx tsx scripts/ferreteria-departamento.ts --aplicar  # las crea
```
- `prisma db push` no debería preguntar nada, porque las tres columnas son nuevas. Si avisa de perder datos, no sigas y pásale el texto a Claude.
- El guion no cambia nada de lo que ve el cliente: el departamento aparece cuando tenga productos publicados, y eso espera a C-199.

**Pruebas** (unos 20 minutos; si no ves un cambio, recarga):
1. **Mi panel (C-201), en el teléfono, con una cuenta de cliente que tenga alguna compra:**
   - Nada se sale de la pantalla.
   - Dice "Actividad reciente" y nunca "Saldo".
   - No sale "En vivo", y en Garantía se ven enteras las tres pestañas.
2. **Lista del proveedor (C-202):**
   - Sube el archivo de los 60 con su listado de existencia.
   - En "Nuevos", la columna se llama "Nombre en la tienda", y "Nombres para revisar" filtra lo que va en ámbar. No hace falta crear nada.
3. **El aviso del asistente (C-202):** edita el teclado AOAS sin guardar. Sale "Está en mayúsculas" con el nombre propuesto.
4. **Categorías (C-200):**
   - Están Ferretería y sus 9 categorías, con los íconos nuevos.
   - Ferretería tiene marcada "Departamento aparte".
   - En la tienda no cambió nada: ni la franja ni el inicio la muestran, porque todavía no tiene productos publicados.
5. **Cambiar un nombre (C-202), cuando apruebes los 14 de `estado/C-202.md`:** renombra uno y abre su dirección vieja en una ventana de incógnito. Lleva sola a la nueva.

**Vuelta atrás:**
- `git reset --hard v1.0.0-rc.25 && npm install && bash scripts/deploy.sh --sin-pull`.
- Las tres columnas y las categorías del guion no molestan al código anterior.
- Si ya se renombró algún producto, sus direcciones viejas vuelven a dar "no encontrado" hasta subir de nuevo.


## 10/11 · C-196, C-196b y C-197 (de rc.23 a `v1.0.0-rc.25`, con rc.24 adentro)
Subido el 10/11 por Andrés. Claude lo comprobó el mismo día desde fuera, como un visitante:
- La ficha del teclado AOAS tiene la tarjeta nueva: "De un vistazo", "Tipo de LED" (no en mayúsculas), las especificaciones en dos columnas y sin "No especificado" en pantalla (C-197).
- **La base nueva está aplicada:** la ficha lee todas las columnas del producto (`findFirst` con `include`), y sin `supplierId`, `supplierSku` y `supplierSyncedAt` daría error. Responde 200.
- `/`, `/productos` y `/api/products/public` responden 200; la API pública no dice proveedor ni costo; `/admin/products/proveedor` pide sesión (307).

Lo que necesita una cuenta (el panel y la Lista del proveedor) quedó en `SIGUIENTE.md`, "Por confirmar de rc.25".

Producción estaba en `v1.0.0-rc.23`; rc.24 fue adentro. Después de este deploy, `git describe --tags --abbrev=0` en el servidor dice `v1.0.0-rc.25`.
- **C-196:** Admin → Productos para miles de productos: la lista por páginas, el proveedor y el costo en cada producto, y Productos → Más → Lista del proveedor (su Excel en lote y las fotos por código).
- **C-196b:** en la Lista del proveedor, la casilla "Su lista trae el IVA incluido".
- **C-197:** la ficha del producto en una sola tarjeta, sin el hueco de la Descripción.

**SQL total** (`prisma migrate diff` contra el esquema de `v1.0.0-rc.23`). Es aditivo: una tabla, tres columnas, cinco índices y una clave:
```sql
ALTER TABLE "products" ADD COLUMN "supplierId" TEXT, ADD COLUMN "supplierSku" TEXT, ADD COLUMN "supplierSyncedAt" TIMESTAMP(3);
CREATE TABLE "suppliers" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "discountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0, "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");
CREATE INDEX "products_status_idx" ON "products"("status");
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");
CREATE UNIQUE INDEX "products_supplierId_supplierSku_key" ON "products"("supplierId", "supplierSku");
ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```
Sin variables nuevas, sin crons y sin dependencias nuevas.

**Paso a paso.** En la terminal del servidor, en `/var/www/electroshopve`:
```bash
git describe --tags --abbrev=0 && git status -sb                       # v1.0.0-rc.23 y sin cambios
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc25.dump
bash scripts/deploy.sh                       # para y muestra el SQL de arriba
npx prisma db push && bash scripts/deploy.sh # aplica y compila (ver la nota de abajo)
git describe --tags --abbrev=0                                          # v1.0.0-rc.25
```
(`git describe --tags` sin `--abbrev=0` dice `v1.0.0-rc.25-2-g…`: son los dos commits de documentación que van después de la etiqueta. Es normal.)
**Nota sobre `prisma db push`:** va a avisar "There might be data loss" por el índice único de `supplierId` y `supplierSku`, y a preguntar si sigue. **No se pierde nada:** las dos columnas son nuevas y están vacías (probado el 10/11 en una copia con productos: quedan intactos). Si el aviso es solo ese, responde `y`. Si en vez de preguntar dice "Use the --accept-data-loss flag", corre `npx prisma db push --accept-data-loss && bash scripts/deploy.sh`. Si el aviso nombra otra cosa (un DROP o un cambio de tipo), para y avísale a Claude.

**Pruebas** (unos 15 minutos; si al probar no ves un cambio, recarga la página):
1. **Productos:** arriba dice "N en el catálogo · N activos · N destacados" y abajo "Mostrando 1 a N de N". Los filtros (Todos, Activos, Borradores, Sin stock, Archivados y Por revisar) tienen sus números.
2. **El buscador:** escribe `teclado aoas` (en otro orden y en minúsculas) y aparece el teclado. Ordena por "Precio: menor a mayor".
3. **Un proveedor:** edita un producto físico → paso **Precios** → "Proveedor" → **+ Agregar proveedor…**, escribe el nombre de la ferretería, **Agregar**, pon su código en "Código en el proveedor" y guarda. En la lista, el producto dice el proveedor y el código bajo el SKU, y la columna Costo trae el margen. El filtro "Todos los proveedores" lo encuentra.
4. **Productos → Más → Lista del proveedor:** elige el proveedor (el de la ferretería), marca **"Su lista trae el IVA incluido"**, deja el descuento en 0 y sube su listado de existencia y su lista de precios (los dos `.xls`). Dice cuántos hay en su lista y cuántos con existencia, y en la vista previa la bomba Daewoo de 1/2 HP (R023127) dice costo $47,33 y precio sugerido $71,37. **No crees nada todavía:** primero C-199 y C-200 (sección 4).
5. **La ficha, en la computadora y en el teléfono:** abre el teclado AOAS. La descripción y las especificaciones van en una sola tarjeta, sin hueco; al lado de la descripción, Aoas, M-880, 30 días y Nuevo; las especificaciones en dos columnas, con "Tamaño" y "Tipo de LED" (no en mayúsculas) y sin "Switches: No especificado". En el teléfono, todo en una columna.
6. **Teléfono:** Productos se ve en tarjetas, sin scroll de lado, y abajo están las páginas.
7. **Exportar:** Más → Exportar todo (CSV) abre en Excel con los acentos bien y las columnas de costo y proveedor.

**Vuelta atrás:**
- El código: `git reset --hard v1.0.0-rc.23 && npm install && bash scripts/deploy.sh --sin-pull`. La tabla y las columnas nuevas no molestan al código anterior: se quedan.
- Si hace falta la base de antes (no debería): `~/respaldo-antes-rc25.dump`, con el guion de `OPERACION.md`.

## Entre el 07 y el 10/11 · C-195 (de rc.22 a `v1.0.0-rc.23`)
Subido después del 07/11 (no quedó anotado quién ni cuándo). Claude lo comprobó el 10/11 desde fuera: `/images/studio/chispa-3/senala.png`, que solo existe desde rc.23, responde 200.
- **C-195:** Chispa 3.0. Cambian sus 10 imágenes de ElectroStudio, que también usa el popup navideño: pulgares cortos, una silueta por mano y la mano de señalar nueva. Las imágenes van en otra carpeta, `/images/studio/chispa-3/`, porque la tienda guarda 30 días las imágenes optimizadas.

Sin SQL, sin variables nuevas y sin crons. El paso a paso fue `bash scripts/deploy.sh` y `git describe --tags` → `v1.0.0-rc.23`.

**Pruebas** (unos 5 minutos; siguen por confirmar en `SIGUIENTE.md`):
1. **Teléfono, en incógnito, con el tema navideño encendido:** el popup muestra a Chispa saludando con la mano nueva: los dedos abiertos y el pulgar corto.
2. **ElectroStudio → Nueva historia → Felicitación → Contenido:** en el selector de Chispa, "Pulgar arriba" tiene el pulgar corto y grueso, y "Señala", el pulgar cruzado. La historia muestra la misma pose.
3. **Una historia vieja con Chispa** se abre y lo muestra con las manos nuevas.

**Vuelta atrás:** `git reset --hard v1.0.0-rc.22 && bash scripts/deploy.sh --sin-pull`. Vuelven la carpeta y las imágenes de antes. Sin cambio de base.

## 06/11 · C-191 a C-194 (de rc.21 a `v1.0.0-rc.22`)
Subido el 06/11 por Andrés: los archivos nuevos tienen en el servidor la fecha de las 20:05, hora de Venezuela. Claude lo comprobó el 07/11, pidiendo las páginas como un visitante:
- `/registro` tiene la casilla "Quiero recibir ofertas y novedades por correo" (C-191).
- El inicio trae el popup navideño nuevo: "Electro Shop te desea", "De parte de todo el equipo" y Chispa con el gorro (C-194).
- `/servicios` tiene "Antes" y "Después" (C-192). `/ideas-para-regalar` responde 200.
- Las 10 imágenes de Chispa de ElectroStudio son las del repositorio (C-193).

Lo que necesita una cuenta (el panel, Mi panel y que se aplicó la columna nueva) quedó en `SIGUIENTE.md`, "Por confirmar de rc.22".

Producción está en `v1.0.0-rc.21`. Después de este deploy, `git describe --tags` en el servidor dice `v1.0.0-rc.22`.
- **C-191:** el permiso para las promociones (registro y Mi panel) y el desglose en Marketing.
- **C-192:** el ámbar solo para avisos, con la placa azul noche en los correos.
- **C-193:** ElectroStudio con Chispa, el toque navideño, los íconos del pack, el texto nuevo y las plantillas Regalos y Felicitación.
- **C-194:** el popup navideño con la felicitación.

**SQL total** (`prisma migrate diff` contra el esquema de `v1.0.0-rc.21`). Es aditivo:
```sql
ALTER TABLE "notification_preferences" ADD COLUMN "emailPromotionsAt" TIMESTAMP(3);
```
Sin variables nuevas y sin crons.

**Paso a paso.** En la terminal del servidor, en `/var/www/electroshopve`:
```bash
git describe --tags --abbrev=0 && git status -sb                       # v1.0.0-rc.21 y sin cambios
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc22.dump
bash scripts/deploy.sh                       # para y muestra el SQL de arriba (1 ADD COLUMN)
npx prisma db push && bash scripts/deploy.sh # si es solo eso; compila
git describe --tags                                                     # v1.0.0-rc.22
```

**Pruebas** (unos 15 minutos; si al probar no ves un cambio, recarga la página):
1. **Marketing → Campañas de correo:** dice "N de M clientes" (todos los clientes) y debajo cuántos no han decidido, cuántos dijeron que no y cuántos no verificaron el correo.
2. **Teléfono, en incógnito, `/registro`:** debajo de los términos, la casilla de las ofertas, sin marcar.
3. **Con una cuenta de cliente que nunca decidió:** Mi panel muestra "¿Te avisamos de las ofertas?". "Sí, por correo" la quita y en Marketing sube "aceptan".
4. **Marketing → Correos de la tienda:** "Certificado de curso", "Gift card" y "Código digital" llevan la placa azul noche; "Pago en revisión" ya no tiene la caja ámbar.
5. **Productos:** "Destacado" en azul. **Teléfono, `/servicios`:** "Antes" y "Después" se leen.
6. **ElectroStudio → Nueva historia → Regalos por presupuesto:** elige "De $20 a $50": salen solo productos de ese tramo. Con tres, la historia muestra las tarjetas y el QR.
7. **Nueva historia → Felicitación:** "¡Feliz Navidad!" con Chispa saludando con el gorro. En Diseño, el "Toque navideño" pone el gorro en el logo; en una historia de un producto físico, con las fechas cargadas, sale la franja del 24.
8. **Publicar → Escribir el texto:** trae el WhatsApp y unos 10 hashtags.
9. **Teléfono, en incógnito, con el tema navideño encendido:** al entrar sale el popup nuevo con Chispa. "Ver ideas para regalar" lleva a la página de regalos.

**Vuelta atrás:**
- El código: `git reset --hard v1.0.0-rc.21 && npm install && bash scripts/deploy.sh --sin-pull`. La columna no molesta al código anterior.
- Las historias de Regalos o Felicitación que se hayan creado se abrirían como "1 producto" con el código anterior: conviene borrarlas antes.

## 06/11 · C-189 y C-190 (de rc.20 a `v1.0.0-rc.21`)
Subido el 06/11 por Andrés. Claude comprobó desde fuera que `/ideas-para-regalar` responde 200.

Producción está en `v1.0.0-rc.20`, con el tema navideño ya encendido; ese bloque pasó a `HISTORIAL.md`. Después de este deploy, `git describe --tags` en el servidor dice `v1.0.0-rc.21`.
- **C-189:** el selector de íconos de categorías, cerrado al pack. El checkout baja de 6,3 a 1,3 MB de JS. Se quitan dos librerías: el `deploy.sh` reinstala las dependencias porque cambió el lockfile.
- **C-190:** la página Ideas para regalar, la franja "pide hasta el … para que llegue antes del 24" y los dos borradores de campaña.

**SQL total** (`prisma migrate diff` contra el esquema de `v1.0.0-rc.20`). Es aditivo:
```sql
ALTER TABLE "company_settings" ADD COLUMN "christmasCutoffLocal" DATE,
ADD COLUMN "christmasCutoffShipping" DATE;
```
Sin variables nuevas y sin crons.

**Paso a paso.** En la terminal del servidor, en `/var/www/electroshopve`:
```bash
git describe --tags --abbrev=0 && git status -sb                       # v1.0.0-rc.20 y sin cambios
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc21.dump
bash scripts/deploy.sh                       # para y muestra el SQL de arriba (2 ADD COLUMN)
npx prisma db push && bash scripts/deploy.sh # si es solo eso; instala las dependencias y compila
git describe --tags                                                     # v1.0.0-rc.21
npx tsx scripts/campanas-navidad.ts            # muestra lo que haría
npx tsx scripts/campanas-navidad.ts --aplicar  # crea los 2 borradores (otra vez: 0). Nunca envía
```

**En el panel** (Marketing → Navidad → "Para que llegue antes del 24"): el último día para pedir por ZOOM o MRW y el de delivery en Guanare, **confirmados con ZOOM, MRW y el delivery**. Sin fechas no sale ninguna franja.

**Pruebas** (unos 10 minutos; si al probar no ves un cambio, recarga la página):
1. **Teléfono, en incógnito:** `/ideas-para-regalar` abre con los tres presupuestos y el rótulo "Navidad". "Más de $50" lleva a su sección.
2. **Sin fechas cargadas:** la ficha de un físico y el carrito no dicen nada de "antes del 24".
3. **Con las fechas cargadas y guardadas:** sale la franja en la ficha de un físico, en el carrito con un físico y en Ideas para regalar. Una ficha digital no la lleva.
4. **La tarjeta navideña de la portada:** "Ver ideas para regalar" lleva a la página nueva. Si lleva a `/productos`, borra el campo "Enlace del botón" en Marketing → Navidad.
5. **Marketing → Campañas de correo:** los dos borradores, sin enviar. Mándate una prueba de cada uno antes de enviarlos en su fecha.
6. **Admin → Categorías → Consolas → Editar:** salen los 35 íconos del pack, dice "Seleccionado: Consolas" y ya no está el campo de importar.
7. **Checkout en el teléfono:** abre más rápido y siguen los logos de Binance, Zelle y PayPal.
8. **WhatsApp desde el teléfono:** comparte `https://electroshopve.com/ideas-para-regalar` y sale su imagen.

**Vuelta atrás:**
- La franja: borra las fechas o apaga el tema, sin deploy.
- Las campañas: borra los borradores.
- El código: `git reset --hard v1.0.0-rc.20 && npm install && bash scripts/deploy.sh --sin-pull`. Las columnas no molestan al código anterior.
- Una categoría guardada con un ícono del pack se vería como "Otros" con el código anterior, hasta volver a elegirlo.

**Decidido por Andrés (06/11, C-190):** las gift cards con varios montos salen en cada presupuesto donde tienen un monto, y la franja es solo para Navidad, sin versión de Reyes.

## 06/11 · C-186 y C-188 (de rc.19 a `v1.0.0-rc.20`)
Subido el 06/11 por Andrés. Claude lo comprobó desde fuera:
- los ajustes públicos dicen `gorroNavidad: "ajustado"`: Andrés ya encendió el tema;
- la portada trae los íconos propios, con la clase `iconos-marca`.

- **C-186 · Tema navideño:** el gorro de Santa en el logo, en dos versiones; la tarjeta navideña del popup; Marketing → Navidad con fechas y sin deploy. Tiene 9 columnas en `company_settings` (`estado/C-186.md`).
- **C-188 · Los íconos propios:** 156 íconos del pack en lugar de react-icons, en la tienda y el panel. El sello "Digital" va sin el rayito (`estado/C-188.md`).

Andrés decidió subir los dos juntos. C-188 no cambia la base: el SQL de abajo es solo el de C-186.

Producción está en `v1.0.0-rc.19`; el bloque de rc.19 pasó a `HISTORIAL.md`. Después de este deploy, `git describe --tags` en el servidor dice `v1.0.0-rc.20`. **Desde el deploy se ven los íconos nuevos. La Navidad, en cambio, no se ve hasta que se encienda en el panel.**

**SQL total** (`prisma migrate diff` contra el esquema de `v1.0.0-rc.19`). Es aditivo, todo en `company_settings`:
```sql
ALTER TABLE "company_settings" ADD COLUMN "christmasHat" TEXT NOT NULL DEFAULT 'ajustado',
ADD COLUMN "christmasPopup" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "christmasPopupButton" TEXT,
ADD COLUMN "christmasPopupLink" TEXT,
ADD COLUMN "christmasPopupText" TEXT,
ADD COLUMN "christmasPopupTitle" TEXT,
ADD COLUMN "christmasTheme" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "christmasThemeFrom" DATE,
ADD COLUMN "christmasThemeUntil" DATE;
```
Sin variables nuevas, sin crons y sin dependencias nuevas.

**Paso a paso.** En el servidor, en `/var/www/electroshopve`:
```bash
git describe --tags --abbrev=0 && git status -sb                       # v1.0.0-rc.19 y sin cambios
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc20.dump
bash scripts/deploy.sh                       # para y muestra el SQL de arriba (9 ADD COLUMN en company_settings)
npx prisma db push && bash scripts/deploy.sh # si es solo eso
git describe --tags                                                     # v1.0.0-rc.20
```

**Encenderlo (Admin → Marketing → Navidad):**
1. El gorro "Ajustado al sello" ya viene elegido. "Clásico" es la otra opción.
2. "Popup al entrar": "La tarjeta navideña" ya viene elegida. Elige "La imagen del popup" si prefieres una pieza tuya de ElectroStudio.
3. **Para verlo hoy:** enciéndelo sin fechas y guarda. **Para dejarlo listo:** toca "Del 1 de diciembre al 6 de enero de 2027", enciende y guarda. Queda "Programado" y se prende solo el 1/12.

**Pruebas** (unos 10 minutos):
1. **Antes de encender**, en incógnito: la portada y el popup de siempre ("Ofertas de bienvenida"), sin gorros.
2. **Encendido sin fechas**, en incógnito, en el teléfono y en la computadora:
   - el gorro en el logo de arriba y en el del pie;
   - a los 2 segundos y medio, la tarjeta: la pantalla del sello se enciende y el gorro cae y se mece;
   - "Ver ideas para regalar" lleva a los productos.
3. **Cambia al otro gorro** y guarda: la tienda cambia en la siguiente visita.
4. En la pestaña **"Popup del home"** sale el aviso de que se muestra la tarjeta en lugar de la imagen.
5. **Apaga y guarda:** la tienda vuelve a ser la de siempre. Después déjalo programado del 1/12 al 6/1.
6. **Íconos, inicio en la computadora:** "Compra por categoría" va en dos tonos, "Gift Cards y Recargas" muestra una tarjeta y no la cuadrícula, y los sellos "Digital" ya no tienen el rayito.
7. **Íconos, menú y ficha:**
   - el menú "Categorías" del encabezado muestra cada categoría con su dibujo;
   - en la ficha de un digital, "Recarga directa" o "Entrega digital" llevan la pantalla;
   - el corazón de favoritos se llena al tocarlo.
8. **Íconos, checkout:** los íconos de "Información de contacto", "Método de pago", "Notas" y "Resumen del pedido" se ven. Antes no.
9. **Íconos, panel:**
   - el menú de la izquierda;
   - la estrella de destacado llena en Productos;
   - en Categorías, el selector con los dibujos nuevos;
   - en Transacciones, "Salida" en lugar de "Retiro".
10. **Íconos, teléfono:** la barra inferior y el menú "Más".

**Vuelta atrás:**
- Del tema: apagarlo en el panel. Es inmediato y sin deploy.
- Del código: `git reset --hard v1.0.0-rc.19 && npm install && bash scripts/deploy.sh --sin-pull`. Las columnas nuevas no molestan al código anterior. La base está en `~/respaldo-antes-rc20.dump`.

## 06/11 · C-187, la limpieza de C-185 y los stickers (de rc.18 a `v1.0.0-rc.19`)
Subido el 06/11 por Andrés. Claude lo comprobó desde fuera: `/api/categories` ya cuenta solo lo publicado (Gift Cards y Recargas 6, Consolas 0, Misceláneos 1).
- **C-187 · Productos:**
  - Un producto con ventas que se borra para siempre queda **eliminado** (`products.eliminadoAt`), fuera de la lista, de la papelera y de la tienda, con su historia intacta.
  - Lo archivado va en su filtro y sin estrella.
  - Mejoras: "Por revisar", la vista que se recuerda, "Deshacer" al cambiar el estado, la estrella en la lista y el panel en el teléfono (`estado/C-187.md`).
- **C-185:** la limpieza del repositorio. Los 40 uploads versionados se respaldaron antes del pull y se devolvieron después.
- **Los stickers de Chispa de Luis** (`chispa/`).

**Diagnóstico de producción** (`docs/plan/scripts/diagnostico-c187.sql`, corrido por Andrés el 06/11):
- **Los 5 "Archivados" fuera de la papelera tienen órdenes**, por eso no se podían borrar:
  - con órdenes canceladas: STEAM CARD (SALDO) `W2313131` y MINI CONSOLA NINTENDO SUP-400 `INT6154`, los dos destacados, y CABLE HDMI 3 METROS REFORZADO `INT17552800001`;
  - con órdenes entregadas: "Producto Test" `TEST` (2) y "Test Digital" `TESTCARD` (1, con un código digital).
- **La bitácora muestra el ciclo del error:** el 05/11 cerca de las 22:30 (hora de Venezuela) los 5 se movieron a la papelera y se borraron para siempre. Cada uno volvió como "archivado".
- **`/api/categories` contaba de más** en Celulares y Tablets (1 contra 0), Consolas (3 contra 0), Gift Cards y Recargas (7 contra 6) y Misceláneos (2 contra 1).
- **2 archivados seguían destacados.**

El bloque de C-184 (rc.18), con el SQL, lo comprobado y su vuelta atrás, pasó a `HISTORIAL.md`. Después del deploy, `git describe --tags` en el servidor dice `v1.0.0-rc.19`.

**SQL total** (`prisma migrate diff` contra el esquema de `v1.0.0-rc.18`). Es aditivo:
```sql
ALTER TABLE "products" ADD COLUMN "eliminadoAt" TIMESTAMP(3);
```
Sin variables nuevas y sin crons nuevos. El cron de la papelera sigue igual; solo su registro cambia "archivados" por "conservados".

**Paso a paso (como se dio).** En el servidor, en `/var/www/electroshopve`:
```bash
# 0. Tu cuenta: en el panel, arriba a la derecha, debe decir "Super Admin" (recuperar un eliminado es solo del dueño)
# 1. Comprobar sin cambiar nada
git describe --tags --abbrev=0 && git status -sb                       # v1.0.0-rc.18 y sin cambios
crontab -l | grep papelera && tail -n 5 ~/cron-papelera.log            # "archivados" mayor que 0 = los zombis que devolvía el cron
# 2. Respaldo de la base (hay cambio de base)
DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc19.dump
# 3. Los 40 uploads de C-185, ANTES del pull (después git ya no los lista y el pull los borraría)
git ls-files public/uploads | tar czf ~/uploads-versionados-C185.tgz -T - && tar tzf ~/uploads-versionados-C185.tgz | wc -l   # 40
# 4. Deploy: para y muestra el SQL de arriba. Si es solo esa línea:
bash scripts/deploy.sh
npx prisma db push && bash scripts/deploy.sh
# 5. Devolver los uploads (quedan en disco, ignorados por git) y comprobar
tar xzf ~/uploads-versionados-C185.tgz && git status --short           # vacío
git describe --tags                                                     # v1.0.0-rc.19
# 6. Diagnóstico de los zombis (solo lee). Pasarle a Claude el archivo
psql "$DB" -f docs/plan/scripts/diagnostico-c187.sql > ~/diagnostico-c187.txt 2>&1
```

**Limpieza de los zombis, desde el panel y sin SQL** (después del deploy):
1. Productos → **Archivados** → la casilla de arriba → **A la papelera**.
2. **Papelera → Vaciar la papelera.** Lo que tiene ventas queda eliminado y oculto; lo que no, se borra.
3. Comprobar: "Archivados" dice 0, y la papelera dice "Eliminados que se conservan por sus ventas (N)".
4. Si quieres conservar uno archivado que estaba destacado y lo activas, vuelve destacado. Quítale la estrella en la lista.

**Pruebas** (unos 10 minutos):
1. **Teléfono:** Productos muestra enteras las pestañas Catálogo, SADES y Papelera, y "Todos" ya no trae los archivados.
2. **Mañana, después del cron de las 9:45:** lo eliminado no volvió.
3. **Sin sesión**, `https://electroshopve.com/api/categories`: Gift Cards y Recargas igual a sus publicados (6), Misceláneos 1 y Consolas 0.
4. **"Por revisar":** dice "Sin marca 4" y "Sin peso o medidas 1". Ponle la marca a uno y baja. El aviso del Dashboard lleva al filtro.
5. **La vista se recuerda:** filtra "Activos", busca algo, edita un producto y guarda: vuelves a la misma vista.
6. **Deshacer y la estrella:** cambia el estado de un producto y toca "Deshacer". Pon la estrella de Destacado en uno y quítala.

**Vuelta atrás:** `git reset --hard e3479bc && npm install && bash scripts/deploy.sh --sin-pull`.
- La columna se queda y no molesta.
- Lo eliminado reaparece en la papelera del código viejo (tiene `deletedAt`) y el cron viejo lo volvería a archivar. No se pierde nada.
- Los uploads están en `~/uploads-versionados-C185.tgz` y la base en `~/respaldo-antes-rc19.dump`.

**Lo decide Andrés:** `/categorias` muestra 8 de 15 categorías con "0 productos". C-187 propone esconderlas y no lo aplicó, porque es un dato visible de la tienda.


## 28/10 · C-184 (de rc.17 a `v1.0.0-rc.18`)
Subido el 28/10 con Claude conectado y la aprobación de Luis para este deploy (`estado/C-184.md`). La tienda no se cortó.
- **C-184 · El descuento del convenio y la mano de obra, a la vista:**
  - En las cotizaciones del convenio CCIET que arma Numen, los equipos y la mano de obra van en tablas separadas.
  - Cada equipo lleva su precio de lista tachado, y en los totales va el descuento en verde.
  - Igual en la página, la hoja impresa y el PDF.
- **Pasos que se dieron:**
  1. Respaldo `~/respaldo-antes-c184.dump` (1,1 MB, 72 tablas con datos).
  2. `git pull --ff-only` y `bash scripts/deploy.sh --sin-pull`: se detuvo y mostró el SQL, igual al del bloque.
  3. El SQL, a mano y en una transacción (`psql -v ON_ERROR_STOP=1 -1`).
  4. `bash scripts/deploy.sh --sin-pull` otra vez: compiló en `.next-b` y cambió.
- **SQL aplicado:**
  ```sql
  ALTER TABLE "quotes" ADD COLUMN "discountLabel" TEXT;
  ALTER TABLE "quote_items" ADD COLUMN "kind" TEXT, ADD COLUMN "listPriceUSD" DECIMAL(65,30);
  ```
- **Comprobado en producción:**
  - `v1.0.0-rc.18`, escuchando en `127.0.0.1:3000`.
  - Inicio, `/cotizacion` y `/productos` con `200`.
  - Dos cotizaciones de producción, una enviada y una aprobada, abren con `200` y su PDF da `200 application/pdf`. Se ven como antes, porque no traen precio de lista ni mano de obra.
  - La entrada de Numen sin clave da `401`.
  - Las columnas nuevas existen, y en las líneas que ya había están vacías.
  - En el registro de errores, solo el ruido conocido de los bots.
- **Vuelta atrás:** `git reset --hard v1.0.0-rc.17 && npm install && bash scripts/deploy.sh --sin-pull`. Las columnas nuevas no molestan al código anterior y no se quitan.
- **Después:** el mismo 28/10 se instaló Numen 0.3.5, que manda los campos nuevos.

## 18/10 · C-183 (de rc.16 a `v1.0.0-rc.17`)
Subido el 18/10 con Claude conectado y la aprobación de Luis para este deploy (`estado/C-183.md`). La tienda no se cortó.
- **C-183 · Las condiciones y las formas de pago, a lo ancho:**
  - Los totales quedan pegados a las partidas.
  - Las condiciones (dos columnas desde tres) y las formas de pago (una por línea) van debajo, a lo ancho.
  - Igual en la página, la hoja impresa y el PDF.
- **Pasos:** `git pull --ff-only` y `bash scripts/deploy.sh --sin-pull`: compiló 185 de 185 en `.next-a` y cambió.
- **Comprobado en producción:**
  - `v1.0.0-rc.17`, escuchando en `127.0.0.1:3000`.
  - Inicio y `/cotizacion` con `200`.
  - La cotización de producción (PRES-2026-0001) con las secciones nuevas. Su PDF da `200 application/pdf`, en una hoja, con los totales al lado de las partidas y las formas de pago una por línea.
  - En el registro de errores, solo el ruido conocido de los bots.
- **SQL:** ninguno. Sin variables ni crons.
- **Vuelta atrás:** `git reset --hard v1.0.0-rc.16 && npm install && bash scripts/deploy.sh --sin-pull`.

## 18/10 · C-182 (de rc.15 a `v1.0.0-rc.16`)
Subido el 18/10 con Claude conectado y la aprobación de Luis para este deploy (`estado/C-182.md`). La tienda no se cortó.
- **C-182 · El presupuesto con el estilo de la referencia, en blanco y negro y en PDF:**
  - El documento con la maqueta A que eligió Luis.
  - "Lo que no incluye" y el anexo técnico en el editor.
  - El botón "En blanco y negro".
  - "Descargar PDF" en el enlace del cliente (`/api/cotizaciones/<token>/pdf`), y el PDF para Numen (`/api/numen/cotizaciones/<id>/pdf`).
- **Pasos que se dieron:**
  1. Respaldo `~/respaldo-antes-c182.dump` (1,1 MB, 72 tablas).
  2. `git pull --ff-only` y `bash scripts/deploy.sh --sin-pull`: se detuvo y mostró el SQL, igual al del bloque.
  3. El SQL, a mano y en una transacción (`psql -v ON_ERROR_STOP=1 -1`): las 3 columnas quedaron como `text` y aceptan vacío.
  4. `bash scripts/deploy.sh --sin-pull` otra vez: compiló 185 de 185 en `.next-b` y cambió.
- **SQL aplicado:**
  ```sql
  ALTER TABLE "quotes" ADD COLUMN "annex" TEXT, ADD COLUMN "annexTitle" TEXT, ADD COLUMN "notice" TEXT;
  ```
- **Comprobado en producción:**
  - `v1.0.0-rc.16`, escuchando en `127.0.0.1:3000`.
  - Inicio, `/cotizacion` y los ajustes públicos con `200`.
  - El PDF con un token que no existe da `404`, y el de Numen sin clave, `503` (todavía no hay clave).
  - **La cotización de producción** (aprobada, del panel) abre con "Descargar PDF" y "En blanco y negro". Su PDF da `200 application/pdf`, una hoja, en color y en blanco y negro, con el sello dibujado, la aprobación y las formas de pago.
  - En el registro de errores, solo el ruido conocido de los bots.
- **Vuelta atrás:** `git reset --hard v1.0.0-rc.15 && npm install && bash scripts/deploy.sh --sin-pull`. Las columnas nuevas no molestan al código anterior y no se quitan.
- **Falta:** las pruebas del equipo (`SIGUIENTE.md` §2) y, del lado de Numen, mandar los campos nuevos y el PDF por watencion.

## 17/10 · C-181 (de rc.14 a `v1.0.0-rc.15`)
Subido el 17/10 con Claude conectado, con la aprobación de Luis para este deploy (`estado/C-181.md`). La tienda no se cortó.
- **C-181 · Cotizaciones desde Numen y la vista del cliente:**
  - La entrada de servidor a servidor para Numen (`/api/numen/cotizaciones`), que sin `NUMEN_API_KEY` responde 503.
  - Cuándo el cliente abre su cotización (no cuentan la vista previa de WhatsApp ni el equipo), visible en el detalle del panel.
  - Enviar, aprobar, cerrar y reabrir pasaron a `lib/cotizaciones/acciones.ts`.
- **Pasos que se dieron:**
  1. Respaldo `~/respaldo-antes-c181.dump` (1,1 MB).
  2. `git pull --ff-only` y `bash scripts/deploy.sh --sin-pull`: se detuvo y mostró el SQL, igual al del bloque.
  3. `npx prisma db push` pidió `--accept-data-loss` por el índice único: es un aviso genérico, y la columna es nueva y está toda en NULL. En vez de esa opción se aplicó **el mismo SQL a mano, en una transacción**, con `psql -v ON_ERROR_STOP=1`.
  4. `bash scripts/deploy.sh --sin-pull` otra vez: compiló en `.next-a` y cambió.
- **SQL aplicado:**
  ```sql
  ALTER TABLE "quotes" ADD COLUMN "externalRef" TEXT,
  ADD COLUMN "lastViewedAt" TIMESTAMP(3),
  ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "viewedAt" TIMESTAMP(3);
  CREATE UNIQUE INDEX "quotes_externalRef_key" ON "quotes"("externalRef");
  ```
- **Comprobado en producción:**
  - `v1.0.0-rc.15`, escuchando en `127.0.0.1:3000`.
  - Inicio, productos, `/cotizacion`, los ajustes públicos y `/llms.txt` con `200`.
  - `POST /api/numen/cotizaciones` da `503` (todavía sin clave). La vista con un token que no existe da `404`. `/admin` sin sesión manda al login.
  - La única cotización de producción quedó igual (sin referencia y con 0 vistas). En el registro de errores, solo el ruido conocido de los bots.
- **Vuelta atrás:** `git reset --hard v1.0.0-rc.14 && npm install && bash scripts/deploy.sh --sin-pull`. Las columnas nuevas no molestan al código anterior y no se quitan.
- **Falta:**
  - La clave de Numen, cuando Numen esté instalado y con la confirmación de Andrés (`SIGUIENTE.md` §2).
  - Las pruebas del equipo en el panel y el teléfono (`SIGUIENTE.md` §2).

## 16/10 · C-178, ajuste (de rc.13 a `v1.0.0-rc.14`)
Subido el 16/10 con Claude conectado, después de que la portada se probó en WhatsApp (`estado/C-178.md`, "Ajuste del 16/10").
- La portada dice "Todo lo encuentras con nosotros." (lema en cian) y "Envíos a toda Venezuela."; las fotos del mosaico entran en la versión de la portada, el catálogo y las categorías.
- **Comprobado en producción:** `v1.0.0-rc.14`; la portada con la dirección nueva (`v=ec8d495830`, antes `ae2ec2b2e0`), `200` image/jpeg de 97 KB, con los 4 destacados y el lema; catálogo, categoría y producto con su imagen.
- **SQL:** ninguno. **Vuelta atrás:** `git reset --hard v1.0.0-rc.13 && npm install && bash scripts/deploy.sh --sin-pull`.

## 16/10 · C-178 (de rc.12 a `v1.0.0-rc.13`)
Subido el 16/10 con Claude conectado (`estado/C-178.md`). La tienda no se cortó.
- **C-178 · Imágenes para compartir:** cada enlace de la tienda lleva su imagen de 1200 × 630 (`/og/<tipo>/<clave>`). Productos en claro, con foto, condición y precio en USD; portada, categorías y páginas en oscuro. Configuración → SEO muestra la imagen generada.
- **Pasos:** `git pull --ff-only` y `bash scripts/deploy.sh`. Instaló dependencias (en `package-lock.json` solo cambió la versión), compiló 185 de 185 en `.next-a` y cambió.
- **Comprobado en producción:**
  - `v1.0.0-rc.13`, sin errores en el registro.
  - Inicio, Assassin's Creed (oferta), Steam (sin "(SALDO)", con "Desde"), la categoría Gift Cards, contacto y servicios, pedidos como los lectores de Facebook y WhatsApp: cada una con su `og:image` de ancho 1200, `200` image/jpeg de 35 a 100 KB y caché de un año.
  - Contacto con su propio título.
- **SQL:** ninguno. Sin crons ni variables.
- **Vuelta atrás:** `git reset --hard v1.0.0-rc.12 && npm install && bash scripts/deploy.sh --sin-pull`.
- **Pruebas de Andrés por confirmar:** en `SIGUIENTE.md` §2.

## 16/10 · C-177 (de rc.11 a `v1.0.0-rc.12`)
Subido el 16/10 con Claude conectado (`estado/C-177.md`). La tienda no se cortó.
- **C-177 · Dependencias seguras:** Next 16.3.8, sharp 0.35.5 y nodemailer 10.0.13. Fuera `@auth/prisma-adapter`. La tienda escucha solo en `127.0.0.1:3000` y nginx apunta ahí. `npm audit` pasa de 11 fallas (3 críticas) a 3 altas de Prisma 6 (solo su línea de comandos).
- **Pasos que se dieron:**
  1. nginx: `proxy_pass http://localhost:3000;` → `proxy_pass http://127.0.0.1:3000;` (`sudo sed -i … /etc/nginx/sites-available/electroshopve`, `nginx -t` y `reload`).
  2. Antes: `v1.0.0-rc.11`, sin archivos modificados.
  3. Respaldo `~/respaldo-antes-rc12.dump` (72 tablas).
  4. `git pull --ff-only` y `bash scripts/deploy.sh`: instaló dependencias, compiló 185 de 185 en `.next-b` y cambió.
- **Comprobado:** `v1.0.0-rc.12`; `ss -tln` muestra `127.0.0.1:3000` y el puerto no responde desde afuera; 10 páginas con `200`, el tiempo real, las fotos en WebP y `/admin` sin sesión manda al login; ninguna línea nueva en el registro de errores.
- **SQL:** ninguno. Sin crons ni variables.
- **Vuelta atrás:** `git reset --hard v1.0.0-rc.11 && npm install && bash scripts/deploy.sh --sin-pull`. nginx en `127.0.0.1` sirve igual a la versión anterior.
- **Pruebas de Andrés por confirmar:** en `SIGUIENTE.md` §2.


## 16/10 · Mantenimiento del servidor (C-176, sin código)
Hecho el 16/10 con Claude conectado al servidor y los pasos con `sudo` corridos a mano (`estado/C-176.md`). La tienda estuvo caída unos 10 segundos (el reinicio).
- Respaldo antes de empezar: `~/respaldo-antes-mantenimiento-16-10.dump` (72 tablas, se lee con `pg_restore --list`). Se borró después del deploy de rc.12, que dejó el suyo.
- Sistema al día (43 paquetes; los 3 que faltan los libera Ubuntu de a poco), **Node 20 → 24 LTS** (probado antes con la compilación de producción en un puerto aparte) y reinicio al kernel nuevo.
- fail2ban en SSH, SSH sin `root`, nginx con HTTP/2 y sin versión, registros del sistema con tope de 500 MB (de 3,6 GB a 462 MB) y rotación de los registros de PM2.
- Limpieza aprobada: 17 volcados viejos, 2 paquetes de fotos, el de firmas y la carpeta `.next` vieja (809 MB, sin uso). Quedan `respaldo-antes-rc7.dump`, `archivos-30-09.tgz` y el de hoy.
- **Comprobado después:** kernel nuevo, tienda en Node 24 sirviendo `.next-a`, 11 páginas con `200`, tiempo real, fotos optimizadas, `www` con `308`, HTTP/2, los servicios y los 6 crons.
- **Vuelta atrás de nginx:** `sudo cp /etc/nginx/electroshopve.bak-16-10 /etc/nginx/sites-available/electroshopve && sudo cp /etc/nginx/nginx.conf.bak-16-10 /etc/nginx/nginx.conf && sudo nginx -t && sudo systemctl reload nginx`.

## 16/10 · C-171, C-170, C-175 y C-172 (de rc.6 a `v1.0.0-rc.11`)
Subido por Andrés entre el 03 y el 16/10. Comprobado en el servidor el 16/10: `git describe --tags` dice `v1.0.0-rc.11` (`f47bb08`), sin archivos modificados. **Pruebas de Andrés sin confirmar** (en `SIGUIENTE.md` §2).

- **C-172 · Destacados que rotan** (`estado/C-172.md`): en el inicio, el destacado grande cambia cada día y, en la computadora, rota con el siguiente de la columna cada 7 segundos (una vuelta y se detiene; flechas, contador y pausa arriba a la derecha de la tarjeta). En el teléfono no gira. Sin cambio de base.
- **C-175 · Todos los correos rediseñados, con el logo largo** (`estado/C-175.md`): los 30 correos de la tienda llevan arriba el logo largo del encabezado de la tienda, el mismo título, el mismo botón, las mismas cajas y el mismo pie con redes y contacto. Sin cambio de base.
- **C-170 · Dos administradores sin pisarse, en el resto del panel** (`estado/C-170.md`): Promotores, Categorías, Ofertas y cupones, Cotizaciones y Campañas combinan los cambios, muestran quién más lo tiene abierto y preguntan antes de borrar lo que otra persona edita. Sin cambio de base.
- **C-171 · Dashboard a tu gusto** (`estado/C-171.md`), desde rc.7: editar, quitar, agregar, ordenar y cambiar el tamaño de las tarjetas; un diseño por administrador. Una tabla nueva (con rc.7).
- **Verificado entonces:** `tsc`, `npm run lint` (0 errores), `npm run build`, `check:modulos`, prueba de humo 59 de 59, 35 comprobaciones del Dashboard, 53 de C-170, 273 sobre 22 correos, 52 de la vista previa del panel y 31 de los Destacados. **No probado:** arrastrar con el dedo en un teléfono real, Chrome y Safari, los correos recibidos en Gmail, Outlook y el iPhone, y Lighthouse del inicio después de C-172.
- **SQL:** ninguno desde rc.7. Sin crons ni variables nuevas.
- **Vuelta atrás:** `git reset --hard v1.0.0-rc.10 && npm install && bash scripts/deploy.sh --sin-pull` (solo C-172).

## 03/10 · C-168, C-169, C-174 y C-173 (de rc.3 a `v1.0.0-rc.6`)
Subido por Andrés entre el 02 y el 03/10 (comprobado desde fuera el 03/10: responden `/api/analytics/presencia` y las rutas de la papelera). **Pruebas de Andrés sin confirmar** (las de abajo).

- **C-173 · Reportes en vivo** (`estado/C-173.md`): arriba de Reportes, **cuántas personas están conectadas a la tienda ahora, con cuenta y sin cuenta**, qué miran, de dónde llegaron, desde qué equipo y quién es cada una ("Carlos R.", "Visitante A3F"; nunca IP ni correo). Se actualiza cada 5 s; "Cobrado hoy" y las cifras del reporte se ponen al día solas con cada orden o pago. Sin cambio de base ni de cron.
- **C-174 · Marquesina del equipo** (`estado/C-174.md`): una franja bajo la barra de arriba, en todas las pantallas del panel, dice **quién del equipo está conectado y en qué sector**: "Luis está en Productos, editando «Teclado Redragon K552»". Corre sola si el texto no cabe y se detiene al pasar el ratón o al tocarla. Sin cambio de base ni de cron.
- **C-169 · Productos sin pérdidas** (`estado/C-169.md`), el caso de los 20 minutos perdidos: **"Eliminar" manda a la papelera** (pestaña nueva en Productos; 30 días; "Deshacer" al instante; solo el dueño borra para siempre antes), el editor **avisa en vivo** si otro administrador lo está editando, lo cambió o lo movió a la papelera, **combina solo** lo que cada uno cambió (pregunta solo por lo que los dos tocaron), guarda un **borrador en el navegador** y deja **historial** de quién cambió qué. Tres columnas nuevas en productos. **Un cron nuevo** (papelera).
- **C-168 · Versiones por módulo** (`estado/C-168.md`): cada módulo del panel (Productos, ElectroStudio, Cursos, Configuración…) tiene su versión, que se ve en la barra de arriba, y el pie del menú dice la del sistema. Página nueva **Administración → Versiones** con qué cambió en cada módulo. Si alguien tiene el panel abierto cuando subes una versión, le sale "El panel se actualizó" con el botón para recargar; y cada administrador ve una vez "Qué hay de nuevo".
- **C-167 · Promotores** (`estado/C-167.md`): cada promotor tiene un **código** que el cliente escribe en el carrito (descuento para el cliente; la compra cuenta para el promotor aunque el cliente ya tuviera cuenta). La comisión es sobre los **productos sin IVA ni envío**, en **Puntos ES**, y se **acredita sola 7 días después de la entrega**; quedan para tu revisión las que parecen autocompra, pasan de $50 o superan la ganancia de la venta. **Solicitud para ser promotor** desde la cuenta del cliente, con aprobación de un clic. La página del promotor ya no promete dinero, ni comisión por recargas, registros o cursos.
- **C-166 · Content-Security-Policy en modo "solo avisa"** (`estado/C-166.md`): no bloquea nada; los avisos se ven en Reportes → Seguridad.
- **Verificado (lote rc.4):** `tsc`, `npm run lint` (0 errores), `npm run build`, **prueba de humo 59 de 59**, C-168 con 20 comprobaciones y C-169 con 79 (dos administradores y un cliente contra un build de producción). Antes, en C-166 y C-167: `tsc`, `npm run lint` y `npm run build` sin avisos; C-167 con **80 comprobaciones con compras reales** y C-166 con un barrido de 65 pantallas; la prueba de humo, **59 de 59**. **No probado:** el correo de "Ya eres promotor" (simulado), el cron en el servidor, Chrome y Safari, y tráfico real de la política de contenido.
- **SQL total que va a mostrar `deploy.sh`** desde rc.3 (solo esto; puede salir en otro orden y en varias líneas). Nada borra ni cambia lo que ya existe:
  - `ALTER TABLE "users" ADD COLUMN "panelVersionVista" TEXT` (C-168).
  - `ALTER TABLE "products" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "deletedById" TEXT, ADD COLUMN "statusAntesDePapelera" "ProductStatus"` y `CREATE INDEX "products_deletedAt_idx"` (C-169).
  - **Lo de abajo ya lo aplicó rc.3**; solo saldría si la base estuviera en rc.1 (en ese caso avísale a Claude antes de seguir):
  - `CREATE TABLE "csp_violations"` con sus dos índices (C-166).
  - `CREATE TABLE "influencer_applications"` con sus dos índices y una llave a `users`.
  - `ALTER TABLE "orders" ADD COLUMN "referralInfluencerId" TEXT`
  - `ALTER TABLE "promotions" ADD COLUMN "influencerId" TEXT`, con un índice único y una llave a `influencers`.
  - `ALTER TABLE "influencers" ADD COLUMN "customerDiscountPercent" INTEGER NOT NULL DEFAULT 5`
  - `ALTER TABLE "referral_conversions" ADD COLUMN "baseAmount" DECIMAL(65,30), ADD COLUMN "heldReason" TEXT, ADD COLUMN "source" TEXT`

#### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git describe --tags` debe decir `v1.0.0-rc.3`. Si dice otra cosa, avisar a Claude.
2. **Respaldo antes de subir:** Admin → Configuración → **Respaldos** → "Respaldar ahora" y esperar las dos filas "Hecho". Si prefieres a mano:
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-rc6.dump`
3. **Subir:** `git pull --ff-only` y `bash scripts/deploy.sh`. El guion para y muestra el SQL de arriba. Si coincide: `npx prisma db push` y `bash scripts/deploy.sh` otra vez. Si aparece un `DROP` o algo distinto, no seguir y avisar a Claude.
4. **Comprobar:** `git describe --tags --abbrev=0` debe decir `v1.0.0-rc.6` (y el pie del menú del panel, "Versión 1.0.0-rc.6"), y
   `curl -sI https://electroshopve.com/ | grep -ci content-security-policy-report-only` debe dar `1`.
5. **El cron de promotores** (una vez al día). **Si ya lo pusiste al subir rc.3, sáltate este paso** (`crontab -l` lo muestra):
   `cp /var/www/electroshopve/docs/plan/scripts/cron-promotores.sh ~/cron-promotores.sh && chmod +x ~/cron-promotores.sh && ~/cron-promotores.sh`
   Debe responder algo como `{"acreditadas":0,"rechazadas":0,"revisadas":0}`. Luego `crontab -e` y agregar:
   `30 9 * * * /home/luami/cron-promotores.sh >> /home/luami/cron-promotores.log 2>&1`
6. **El cron de la papelera** (una vez al día; borra lo que lleva más de 30 días en la papelera de productos):
   `cp /var/www/electroshopve/docs/plan/scripts/cron-papelera.sh ~/cron-papelera.sh && chmod +x ~/cron-papelera.sh && ~/cron-papelera.sh`
   Debe responder `{"revisados":0,"borrados":0,"archivados":0}`. Luego `crontab -e` y agregar:
   `45 9 * * * /home/luami/cron-papelera.sh >> /home/luami/cron-papelera.log 2>&1`

#### Pruebas después de subir (unos 20 minutos)
1. **Promotores que ya tengas** (Admin → Marketing → Promotores): cada uno muestra "gana X % · su código descuenta 5 %". Con el lápiz se cambia la comisión y el descuento. Las comisiones pendientes de antes salen **"por revisar"** (se calcularon sobre el total): apruébalas o recházalas a mano.
2. **Solicitud:** con una cuenta de cliente (correo verificado), menú **Promotores** → "Pide entrar al programa" → enviar. En el panel aparece "Solicitudes para ser promotor" → **Revisar** → Aprobar. El cliente recibe el aviso con su código y un correo.
3. **Compra con el código:** con **otra** cuenta, poner un producto físico nuevo en el carrito, escribir el código en "¿Tienes un cupón?": baja el precio. Pagar. En Marketing → Promotores → el ojo: la comisión aparece "Por acreditar", con la base (productos sin IVA) y "Se acredita sola 7 días después de la entrega".
4. **El promotor con su propio código:** en su carrito, su código responde "Este es tu código de promotor…" y no descuenta.
5. **Página del promotor** (teléfono y computadora): su código con "Copiar código", su enlace, "Tus últimas ventas" con el estado de cada una, y ningún texto que diga dinero, recargas o beneficios por nivel.
6. **Política de contenido (C-166):** navegar la tienda y el panel unos minutos; todo debe verse igual que antes. Reportes → Seguridad → abajo, "Política de contenido (CSP)": lo esperado es "Sin avisos". Dejarla una semana; si sigue limpia, se pasa a bloquear (C-166b).
7. **Versiones (C-168):** Administración → **Versiones**: arriba dice `1.0.0-rc.4`, la etiqueta de git, el commit y la hora del build; abajo, los 16 módulos. En cada pantalla del panel, la barra de arriba muestra el módulo y su versión ("Productos 1.0.0"). La primera vez que entra cada administrador sale "Qué hay de nuevo" con **Entendido**.
8. **Papelera y trabajo en equipo (C-169)** — con dos cuentas de administrador (tú y Luis), cada uno en su navegador:
   a. Tú abres un producto y cambias el nombre **sin guardar**. Luis, en Productos, ve "Andrés lo edita" junto al producto, lo manda a la papelera y le pregunta "Lo están editando ahora… ¿moverlo igual?". En tu pantalla sale **al instante** la franja roja "Luis movió este producto a la papelera", con **lo que escribiste intacto**. "Restaurar y seguir editando" lo devuelve y puedes guardar.
   b. Recarga la página en medio de una edición: sale "Tienes cambios sin guardar… Recuperar".
   c. Tú cambias el precio y Luis el stock del mismo producto: al guardar tú, **no pregunta nada** y quedan los dos cambios.
   d. Los dos cambian el nombre: sale el cuadro con las dos versiones para elegir.
   e. Productos → **Papelera**: el producto con quién lo movió y cuándo se borra solo. "Deshacer" a los pocos segundos de mandar algo a la papelera. Luis (Administrador) ve "Restaurar" pero **no** "Borrar para siempre" (solo tú).
   f. Al final de un producto: **Historial** con quién cambió qué.
9. **Marquesina del equipo (C-174)** — con dos cuentas de administrador abiertas a la vez: cada una ve, debajo de la barra de arriba, "<el otro> está en <sector>"; al abrir un producto en edición, "…, editando «nombre del producto»". Al cambiar de pantalla, cambia el sector. Con la otra pestaña cerrada (o la ventana en segundo plano) desaparece en un minuto; si no hay nadie más, la franja no existe. En el teléfono, con un nombre largo, el texto corre; tocarla lo detiene. Un cliente no la ve ni la recibe.
10. **Reportes en vivo (C-173)**: abre la tienda en el teléfono (sin iniciar sesión) y en la computadora (con una cuenta de cliente), y en otro navegador Admin → **Reportes**: arriba, "En vivo" debe mostrar **2 conectados, 1 con cuenta y 1 sin cuenta**, lo que cada uno está mirando y de dónde llegó. Agrega algo al carrito: "con productos en el carrito" sube. Cierra la pestaña de la tienda: baja en segundos. Con una compra o un pago nuevo, "Cobrado hoy" cambia solo. (Tú, como administrador navegando la tienda, **no** cuentas como visitante.)

**Vuelta atrás:** `git reset --hard v1.0.0-rc.3 && npm install && bash scripts/deploy.sh --sin-pull`. Las tablas y columnas nuevas no molestan al código anterior (no se quitan). Antes, quitar la línea de `cron-papelera.sh` de `crontab -e` (la de promotores se queda: rc.3 también la usa). Lo que esté en la papelera queda como producto archivado (no se ve en la tienda) y se puede reactivar desde la base. Los cupones de promotor que ya se crearon quedan como cupones normales: pausarlos en Ofertas si no se quieren.

## 02/10 · C-165, C-164 y C-159/C-160 (`2480457`, v1.0.0-rc.1)
Comprobado desde fuera el 02/10: sin `X-Powered-By` y `POST /api/cron/respaldos` responde 401. El servidor estaba en `d453809` antes de subir C-165. **Cambio de base: dos tablas nuevas** (C-165).
- **C-165 · Respaldos automáticos a Google Drive** (`estado/C-165.md`): Configuración → Respaldos, cifrado con clave pública (la privada se muestra una vez), Drive con permiso `drive.file`, verificación por MD5, retención, avisos y restauración con guion. Cron `5 * * * * ~/cron-respaldos.sh` (`docs/plan/scripts/cron-respaldos.sh`). Sin `X-Powered-By`. `CHANGELOG.md` y primera etiqueta.
  ```sql
  CREATE TABLE "backup_settings" (
      "id" TEXT NOT NULL DEFAULT 'default', "enabled" BOOLEAN NOT NULL DEFAULT false, "hour" INTEGER NOT NULL DEFAULT 3,
      "retentionDays" INTEGER NOT NULL DEFAULT 14, "includeFiles" BOOLEAN NOT NULL DEFAULT true, "publicKeyPem" TEXT, "keyFingerprint" TEXT,
      "keyCreatedAt" TIMESTAMP(3), "driveClientId" TEXT, "driveClientSecret" TEXT, "driveRefreshToken" TEXT, "driveEmail" TEXT,
      "driveFolderId" TEXT, "driveConnectedAt" TIMESTAMP(3), "driveError" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "backup_settings_pkey" PRIMARY KEY ("id"));
  CREATE TABLE "backup_runs" (
      "id" TEXT NOT NULL, "kind" TEXT NOT NULL, "trigger" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'RUNNING',
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finishedAt" TIMESTAMP(3), "fileName" TEXT, "sizeBytes" BIGINT, "md5" TEXT,
      "driveFileId" TEXT, "items" INTEGER, "error" TEXT, "verifiedAt" TIMESTAMP(3), "verifiedOk" BOOLEAN, "deletedAt" TIMESTAMP(3),
      CONSTRAINT "backup_runs_pkey" PRIMARY KEY ("id"));
  CREATE INDEX "backup_runs_kind_startedAt_idx" ON "backup_runs"("kind", "startedAt");
  CREATE INDEX "backup_runs_status_idx" ON "backup_runs"("status");
  ```
- **C-164 · Los últimos menores de código** (`estado/C-164.md`): `balance/add` borrado, `seed.ts` sin contraseña por defecto, valoraciones con coma, `RechargeModalV2` sin `fetch`. Sin cambio de base.
- **C-159 y C-160** (`estado/C-159.md`, `estado/C-160.md`; ya estaban desde `2ccba36`, visto el 02/10 por `/terminos` "Versión 4"): cotizaciones con retención del IVA, correo y Mis cotizaciones, y los menores. C-159 trajo tres columnas en `quotes`:
  ```sql
  ALTER TABLE "quotes" ADD COLUMN "emailedAt" TIMESTAMP(3), ADD COLUMN "emailedTo" TEXT, ADD COLUMN "ivaRetentionPercent" INTEGER NOT NULL DEFAULT 0;
  ```
- Andrés confirmó el 02/10 ("sí a todo"): Google conectado, el primer respaldo bueno con sus dos archivos en Drive, el cron y la clave guardada. Sin confirmar: la restauración de prueba, el redondeo de C-96 y las pruebas de `SIGUIENTE.md`.

## 01/10 (noche) · C-157 y C-158 (`ba6055c`)
Comprobado desde fuera el 01/10: `POST /api/cron/resenas` responde 401 (la ruta existe y pide la clave) y `/productos?search=audifonos` ya encuentra los productos. **Cambio de base: una columna** (`orders.reviewRequestedAt`).
- **C-157 · Pedir la reseña por correo** (`estado/C-157.md`): un cron diario manda un correo por cliente, 5 días después de la entrega (2 si es solo digital), con hasta tres productos que no ha reseñado. Interruptor en Mi perfil → Notificaciones → "Tus reseñas".
  ```sql
  ALTER TABLE "orders" ADD COLUMN "reviewRequestedAt" TIMESTAMP(3);
  ```
  Pasos que llevaba: `docs/plan/scripts/marcar-resenas-c157.sql` (marcar las órdenes ya entregadas, antes del cron) y `~/cron-resenas.sh` copiado de `cron-favoritos.sh` con `0 15 * * *` en `crontab`.
- **C-158 · Buscador sin acentos** (`estado/C-158.md`): "audifonos" encuentra "Audífonos", plurales y errores de tecleo con aviso. Sin cambio de base.
- Sin confirmar con Andrés: que el SQL de marcado se corrió **antes** del cron, que la línea del cron está puesta (`crontab -l`) y las pruebas de `SIGUIENTE.md`.

## 01/10 (noche) · C-162 y C-163 (`71703ab`)
Sin cambio de base. Comprobado desde fuera el 01/10: `/categorias` ya muestra "Gift Cards y Recargas", "Videojuegos" y "Celulares y Tablets", o sea que el guion de C-163 también se corrió en el servidor.
- **C-162 · Tarjeta estrella del inicio y cinta ES sin corte** (`estado/C-162.md`).
- **C-163 · Guion para ordenar las categorías** (`estado/C-163.md`; `scripts/reorganizar-categorias.ts`, con `--aplicar --borrar-vacias`).
- Sin confirmar con Andrés: las pruebas visuales (la tarjeta estrella en la computadora y volver a subir las fotos de la tablet W&O, los audífonos Piston y GTA V) y el redondeo de C-96.

## 01/10 (noche) · C-161 y C-155 (`57840db`)
Sin cambio de base. Visto desde fuera: la tablet W&O tiene marca (campo de C-155) y la foto del Sonic Frontier está armada sin cinta (C-161).
- **C-161 · La foto de un producto usado, bien encuadrada** (`estado/C-161.md`).
- **C-155 · Buscar el producto en la web desde el asistente**, con Groq y el campo Marca (`estado/C-155.md`). Variable opcional `GROQ_API_KEY` en el `.env` del servidor.
- **C-156 · Orden de los documentos** (`estado/C-156.md`): no cambia la tienda.
- Sin confirmar con Andrés: si la búsqueda respondió bien desde el servidor y si se corrió el redondeo de C-96.

## 01/10 (noche) · C-153 y C-154 (`6aae5a6`)
Andrés los subió el mismo 01/10, antes de recibir el bloque que los juntaba con C-161 y C-155. Comprobado desde fuera: los ajustes públicos traen `packagingRules` y `freePackagingThresholdUSD`, y la ficha dice "Garantía … · Envío nacional".
- **C-153 · Embalaje según el paquete** (`estado/C-153.md`): 3 columnas nuevas. Apagado hasta que se encienda en Configuración → Envíos y retiro.
  ```sql
  ALTER TABLE "orders" ADD COLUMN "packagingPlan" TEXT;
  ALTER TABLE "company_settings" ADD COLUMN "freePackagingThresholdUSD" DECIMAL(65,30),
  ADD COLUMN "packagingRules" TEXT;
  ```
- **C-154 · Confianza antes de pagar** (`estado/C-154.md`): la garantía, el envío y el embalaje junto al botón de compra. Sin cambio de base.
- Las pruebas de las dos siguen en `SIGUIENTE.md` hasta que Andrés las confirme.

## 01/10 · Bloque C-149 a C-152 (`866afe5`)
Pedido de Andrés del 01/10: revisar todas las ramas y subir todo en un solo bloque. **Subido el 01/10** (comprobado desde fuera). Queda como registro de lo que entró y de sus pruebas.

**Cómo está todo (revisado el 01/10):**
- **Ramas:** las 154 ramas de trabajo están fusionadas en `main`, y `main` es igual a GitHub. La única sin fusionar es `chatgpt/product-fixes-main`, un borrador viejo de ChatGPT del 21/09 que Claude rehízo en C-95: no sube.
- **Producción antes del bloque: C-148b** (`3f2db8d`). Se ve desde fuera: tiene la hoja de impresión de los presupuestos, "IVA incluido" y los términos nuevos; no tiene `/llms.txt`.
- **Lo que sube:** 6 tareas, 71 archivos, **8 columnas nuevas** (todas aditivas). Sin dependencias nuevas ni variables de entorno nuevas.

| Tarea | Qué trae | Base |
|---|---|---|
| C-149 | Sitemap y `robots.txt` corregidos, `www` redirige, categorías con dirección y texto propios, datos estructurados, `/llms.txt`, feed para Meta, títulos propios | — |
| C-147 | "Datos de la factura" en el pago, facturación en el detalle de la orden, relación de ventas del mes | 7 columnas |
| C-150 | Menú del panel por secciones y Dashboard nuevo | — |
| C-146b | Precio sugerido desde el costo y margen real | — |
| C-147b | El embalaje con su nombre en los datos para facturar y en el recibo | — |
| C-151 | Los productos digitales no llevan IVA (interruptor apagado por defecto) | 1 columna |

**Verificado todo junto sobre `main`:** `tsc`, `npm run build` y la prueba de humo `scripts/e2e/humo.ts`: **59 de 59** (todas las páginas públicas, una compra mixta real, el panel con los dos roles y el teléfono). Cada tarea tiene además sus pruebas en su `estado/C-XX.md`.

### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git log -1 --oneline`. Debe empezar por `3f2db8d`. Si dice otra cosa, avisar a Claude antes de seguir.
2. **Respaldo:**
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-bloque-01-10.dump`
3. **Código y primer intento:** `git pull --ff-only` y `bash scripts/deploy.sh`. El guion **para** y muestra el SQL. Tiene que ser exactamente esto (el orden puede variar):
   ```sql
   ALTER TABLE "profiles" ADD COLUMN "businessFiscalAddress" TEXT;
   ALTER TABLE "orders" ADD COLUMN "billingAddress" TEXT,
   ADD COLUMN "billingName" TEXT,
   ADD COLUMN "billingTaxId" TEXT,
   ADD COLUMN "billingType" TEXT,
   ADD COLUMN "invoiceNumber" TEXT,
   ADD COLUMN "invoicedAt" TIMESTAMP(3);
   ALTER TABLE "company_settings" ADD COLUMN "taxDigitalProducts" BOOLEAN NOT NULL DEFAULT false;
   ```
   - Solo `ADD COLUMN`. **Si aparece un `DROP`, un `ALTER ... TYPE` o una tabla que no está aquí: no seguir y avisar a Claude.**
   - Mientras tanto la tienda sigue igual, con la versión anterior.
4. **Aplicar y subir:** `npx prisma db push` y `bash scripts/deploy.sh` otra vez. Compila (unos minutos) y cambia a la versión nueva sin tumbar la tienda.
5. **Comprobar:** `git log -1 --oneline` muestra el último commit de `main`, y `curl -s -o /dev/null -w '%{http_code}\n' https://electroshopve.com/llms.txt` responde `200`.

### Pruebas después de subir (unos 15 minutos, en este orden)
**Desde el servidor:**
1. `curl -sI https://www.electroshopve.com/ | head -5` → `308` y `location: https://electroshopve.com/`. Si dice `200`, nginx no le pasa el dominio a la tienda: avisar a Claude (se arregla con un bloque `server` para `www` en nginx).

**En la tienda, con el teléfono:**
2. Un producto físico dice "IVA incluido"; uno digital, no.
3. Un carrito con uno de cada uno: "IVA incluido en los productos físicos".
4. En el pago aparece "Datos de la factura" a tu nombre y tu cédula. Hacer una compra barata.
5. Mis pedidos → "Detalle y recibo": dice "Factura a nombre de" y, si hubo envío, "Embalaje".
6. `https://electroshopve.com/sitemap.xml`: las categorías salen como `/categorias/accesorios-gaming`. `https://electroshopve.com/llms.txt` se lee.

**En el panel:**
7. El menú: "Dashboard" y seis secciones. En el teléfono cabe sin deslizar.
8. Dashboard: acciones rápidas arriba; "Ventas cobradas" de hoy incluye la compra de prueba; "Tu tienda: por completar" lista lo que falta.
9. Órdenes → la compra de prueba: bloque "Facturación", "Copiar datos para facturar" (pegarlo en un bloc de notas) y escribir un número en "N.º de la factura emitida". El cliente lo ve en su pedido.
10. Reportes → "Relación de ventas del mes" → Descargar: se abre en Excel, una fila por orden. Si las columnas salen todas juntas en una, avisar a Claude.
11. Productos → editar uno físico → "Precios": al escribir el costo aparece el precio sugerido.
12. Configuración → Precios → IVA: está el interruptor "Los productos digitales también llevan IVA", apagado.

### Si algo sale mal
`git reset --hard 3f2db8d && npm install && bash scripts/deploy.sh --sin-pull` vuelve a la versión de hoy. Las columnas nuevas no molestan al código anterior: no hay que quitarlas.

### Después de subir, sin prisa (sin código)
- Poner la **marca** a los productos físicos y subir la **imagen para compartir** (Configuración → SEO → Inicio, 1200 × 630). El Dashboard lo recuerda.
- **Google Search Console:** agregar el dominio y enviar el sitemap.
- **Para el contador:** las preguntas de `estado/C-151.md` (IVA de los digitales), `estado/C-147b.md` (embalaje) y `estado/C-120.md` §6.

## 01/10 · Menú del panel (C-150): cómo se agrupó
Hoy son 25 ítems en una lista. La propuesta no fusiona páginas ni cambia direcciones: las agrupa en secciones que se abren y se cierran, con la suma de sus avisos en el título.
| Sección | Lo que lleva |
|---|---|
| Inicio | Dashboard |
| Ventas | Órdenes, Cotizaciones, Transacciones, Garantías, Gift Cards |
| Catálogo | Productos, Categorías, Descuentos, Reseñas |
| Clientes | Clientes, Mensajes y Solicitudes |
| Marketing | Marketing y Contenido, ElectroStudio, Trabajos Realizados |
| Cursos | Cursos, Creadores |
| Administración | Reportes, Notificaciones, Documentos Legales, Métodos de Pago, Equipo, Configuración, Mi seguridad |
- Se abre sola la sección de la página en la que estás. En el teléfono, el menú cabe sin deslizar.
- **Por qué no meter todo dentro de Configuración:** Configuración, Métodos de Pago y Equipo son solo del dueño; Notificaciones y Documentos Legales también los usa el Administrador. Como sección del menú, cada quien ve lo suyo.

## 30/09 a 01/10 · Detalle por tarea (C-143 a C-151)

Orden real en que entraron a `main`: C-143 a C-148b (30/09 y 01/10) y, en el bloque del 01/10, C-149, C-147, C-150, C-146b, C-147b, C-151 y C-152.
- **C-151** (01/10, en producción, **una columna nueva**): los productos digitales no llevan IVA (`estado/C-151.md`). Decisión de Andrés del 01/10.
  - Interruptor en Configuración → Precios → IVA, **apagado por defecto**: no hay que tocar nada después del deploy.
  - SQL del deploy: `ALTER TABLE "company_settings" ADD COLUMN "taxDigitalProducts" BOOLEAN NOT NULL DEFAULT false;` (se suma al de C-147).
  - **Pruebas después del deploy (Andrés):** abrir un producto digital (no dice "IVA incluido") y uno físico (sí lo dice); un carrito con los dos dice "IVA incluido en los productos físicos".
  - **Para el contador:** las 4 preguntas del estado (la base es el art. 16 de la Ley del IVA, no que sean "de entretenimiento"; las recargas directas son el caso dudoso).
- **Pruebas de punta a punta:** el motor quedó en `scripts/e2e/lib.ts` (usuarios y sesiones de prueba, Firefox sin ventana) y la prueba de humo de todo junto, en `scripts/e2e/humo.ts`. Los guiones de cada tarea se escriben en `scripts/e2e/_tNNN.ts`, se corren con `npx tsx` y se borran: la carpeta temporal se vacía con cada desconexión.
- **C-147b** (01/10, en producción, sin cambio de base): cómo se factura el embalaje (`estado/C-147b.md`). Va en la misma factura, como renglón aparte y con IVA; el flete con cobro a destino lo factura ZOOM o MRW. "Copiar datos para facturar" y el recibo ya lo nombran "Embalaje" o "Delivery en Guanare", y la relación de ventas trae su columna. **Para el contador:** las 4 preguntas del estado.
- **C-146b** (01/10, en producción, **sin cambio de base**): precio sugerido desde el costo y margen real (`estado/C-146b.md`).
  - **Pruebas después del deploy (Andrés):**
    1. Productos → editar uno físico → paso "Precios": escribir el costo. Aparece "Precio sugerido" (costo + 30 % + IVA 16 %). "Usar este precio" lo pone en el precio; el margen queda en 30 %.
    2. Subir el precio a mano por encima: aparece el aviso del 30 % (solo lo ves tú).
    3. Editar un producto digital → "Montos y precios": cada monto dice su margen ya sin el IVA. Los que salgan en rojo se venden con pérdida si el IVA se paga.
  - **Resuelto el 01/10 (C-151):** los productos digitales no llevan IVA; su margen se calcula sin IVA.
- **C-150** (01/10, en producción, **sin cambio de base**): menú del panel por secciones y Dashboard de trabajo (`estado/C-150.md`). Aprobado por Andrés el 01/10 ("deja Dashboard como Dashboard").
  - **Pruebas después del deploy (Andrés):**
    1. En el teléfono, abrir el menú del panel: Dashboard y seis secciones, sin deslizar. Tocar "Ventas": se abren sus cinco páginas.
    2. Entrar a Configuración: "Administración" queda abierta y Configuración, marcada.
    3. Dashboard: las acciones rápidas arriba; "Ventas cobradas" de hoy y del mes deben parecerse a lo que sabes que cobraste (ahora solo cuenta lo pagado).
    4. "Tu tienda: por completar" lista lo que falta (marca de los productos, imagen para compartir…). Cada renglón desaparece al resolverlo.
- **Dicho por Andrés el 01/10:** ya puso 16 en el IVA (C-146). Los cursos se van a llenar: "Cursos" se queda en el menú. Las devoluciones de garantía quedan como en los términos (reparar, cambiar por uno igual y, si no hay, Puntos ES). No sabe si el deploy incluyó C-148b: se ve en Configuración → Negocio ("Sello y firma de los presupuestos").
- **C-147** (01/10, en producción, **siete columnas nuevas**): datos para la factura y relación de ventas del mes (`estado/C-147.md`).
  - En el pago: "¿A nombre de quién va la factura?" (la persona o su empresa verificada, con RIF y domicilio fiscal). La orden guarda la copia.
  - En el panel, detalle de la orden: "Copiar datos para facturar" y "N.º de la factura emitida". El cliente ve el número en su pedido.
  - Reportes: "Relación de ventas del mes" para el contador.
  - Cerrado: una empresa verificada podía cambiarse el nombre y el RIF desde su perfil.
  - **SQL del deploy** (el guion para y lo muestra; debe ser solo esto, más lo de C-148b si no se había desplegado):
    ```sql
    ALTER TABLE "orders" ADD COLUMN "billingAddress" TEXT, ADD COLUMN "billingName" TEXT, ADD COLUMN "billingTaxId" TEXT,
    ADD COLUMN "billingType" TEXT, ADD COLUMN "invoiceNumber" TEXT, ADD COLUMN "invoicedAt" TIMESTAMP(3);
    ALTER TABLE "profiles" ADD COLUMN "businessFiscalAddress" TEXT;
    ```
  - **Deploy (Andrés, en el servidor):**
    1. `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-c147.dump`
    2. `git pull --ff-only` y `bash scripts/deploy.sh`. Para y muestra el SQL: si hay un `DROP` o un `ALTER ... TYPE`, avisar a Claude.
    3. `npx prisma db push` y `bash scripts/deploy.sh` otra vez.
  - **Pruebas después del deploy (Andrés):**
    1. Una compra barata con tu cuenta de cliente: en el pago aparece "Datos de la factura" a tu nombre y tu cédula.
    2. En el panel, Órdenes → esa orden: el bloque "Facturación" dice a nombre de quién va. "Copiar datos para facturar" y pegarlo en un bloc de notas: salen el cliente, los productos, la base, el IVA y el total.
    3. Escribir un número en "N.º de la factura emitida" y Guardar. En Mis pedidos del cliente, "Detalle y recibo" muestra "Factura n.º".
    4. Reportes → "Relación de ventas del mes" → Descargar: se abre en Excel con una fila por orden y los totales al final. Si las columnas salen todas juntas en una sola, avisar a Claude.
    5. Con una cuenta de empresa verificada (Verificaciones → aprobar una de prueba): el pago ofrece "A nombre de mi empresa" y pide el domicilio fiscal la primera vez.
- **C-149** (01/10, en producción, **sin cambio de base**): que Google, las redes y las IA encuentren el catálogo (`estado/C-149.md`). Incluye las seis correcciones técnicas del análisis externo que pasó Andrés.
  - Sitemap corregido (las 14 categorías daban "no encontrado") y regenerado cada hora; sin `/login` ni `/registro`.
  - `robots.txt` deja leer las fotos de los productos; `www` redirige al dominio principal.
  - Una dirección por categoría (`/categorias/<slug>`) con título y texto propios.
  - Datos estructurados completos: producto (código de barras, reseñas, oferta), tienda (RIF, dirección, horario) y catálogo.
  - Nuevos: `/llms.txt` y `/feed/productos.xml` (catálogo de Meta).
  - Título y descripción propios en contacto, términos, privacidad, gift cards, solicitar producto, servicios y cursos.
  - **Venezuela no está en la lista de países de Google Merchant Center:** el feed sirve hoy para Meta, no para Google Shopping.
  - **Deploy:** `git pull --ff-only` y `bash scripts/deploy.sh`. Sin SQL.
  - **Pruebas después del deploy (Andrés):**
    1. En el servidor: `curl -sI https://www.electroshopve.com/ | head -5`. Debe decir `308` y `location: https://electroshopve.com/`. Si dice `200`, nginx no le pasa el dominio a la tienda: avisar a Claude (se arregla con un bloque `server` para `www` en nginx que haga `return 301 https://electroshopve.com$request_uri;`).
    2. Abrir `https://electroshopve.com/sitemap.xml`: las categorías salen como `/categorias/accesorios-gaming` y no están `/login` ni `/registro`.
    3. Abrir `https://electroshopve.com/robots.txt`: tiene `Allow: /api/uploads/`.
    4. Abrir `https://electroshopve.com/llms.txt` y `https://electroshopve.com/feed/productos.xml`: se leen, con los productos y sus precios.
    5. En el navegador, la pestaña de Contacto dice "Contacto | Electro Shop" y la de Servicios, "Servicios | Electro Shop" (una sola vez).
    6. Pegar la dirección de un producto en https://search.google.com/test/rich-results : debe reconocer "Fragmentos de productos" sin errores.
  - **Tareas de Andrés (sin código):**
    1. **Marca en los productos físicos** (Productos → editar → Marca): hoy ninguno la tiene, y Meta y Google la piden.
    2. **Imagen para compartir:** Configuración → SEO → Inicio, una imagen de 1200 × 630 px (se puede hacer en ElectroStudio). Hoy sale el logo cuadrado.
    3. **Google Search Console** (gratis): agregar `electroshopve.com`, enviar `https://electroshopve.com/sitemap.xml` y revisar "Páginas" una semana después.
    4. **Catálogo de Meta** (cuando vaya a pagar anuncios): Administrador de ventas → Catálogo → Orígenes de datos → Lista de datos → URL programada, con `https://electroshopve.com/feed/productos.xml`, cada día, moneda USD.
    5. Opcional: escribir la descripción de cada categoría en Categorías (si no, la tienda arma el texto con las marcas).
  - **Decisiones abiertas para Andrés:** `PLAN.md` §7.
- **C-148b** (01/10, en producción, **tres columnas nuevas**): segunda parte de las cotizaciones (`estado/C-148b.md`).
  - Al aprobarse descuenta del inventario lo cotizado (y lo devuelve con "No se concretó"); "Marcar como aprobada" desde el panel.
  - El documento muestra los datos de los métodos de pago activos.
  - **Buscador de productos del editor rehecho:** en vivo, sin acentos, varias palabras, por código, marca o categoría, con lo disponible.
  - **Sello de la tienda** dibujado con el logo largo, el RIF, el teléfono y la ciudad; opcional, subir el sello firmado en Configuración → Negocio.
  - **Aprobación:** es digital (nombre, cédula o RIF, fecha y hora). La página lo explica, avisa al imprimir sin aprobar y la hoja sin aprobar trae un QR.
  - **Impresión:** márgenes propios, se acomoda a carta, A4 u oficio, y cabe en una hoja.
  - SQL del deploy: `ALTER TABLE "company_settings" ADD COLUMN "quoteStamp"` y, en `quote_items`, `stockDeducted` y `stockMissing` (dentro del `CREATE TABLE` si C-148 no se había desplegado).
  - **Pruebas después del deploy (Andrés):**
    1. Configuración → Negocio: que estén el logo, el RIF, el teléfono, la ciudad y el estado (salen en el sello).
    2. Cotizaciones → Nueva: escribir en "Agregar del catálogo" sin acentos y con dos palabras; agregar dos productos y pedir de uno más de lo que hay (debe avisar).
    3. Enviarla, abrir el enlace en el teléfono: el aviso de cómo se aprueba, el sello y "Pendiente de aprobación".
    4. "Imprimir o guardar en PDF" sin aprobar: avisa. Con "Imprimir así": una hoja, con márgenes, el sello y el QR.
    5. Aprobar con nombre y cédula: el inventario de esos productos baja, y el panel dice qué se descontó. Imprimir de nuevo: sale "Aprobado".
    6. En el panel, "No se concretó: devolver al inventario": el inventario vuelve.
  - **Pregunta abierta para Andrés:** si además quiere una firma dibujada con el dedo al aprobar (hoy no hace falta).
- **C-141 se desplegó el 30/09** (Andrés configuró sus dos pasos). C-139 y C-142 a C-148b entraron después: producción estaba en `3f2db8d` (C-148b) antes del bloque del 01/10.
- **Incidente del deploy (C-143):** la cuenta de Andrés era ADMIN, no SUPER_ADMIN, y quedó sin Configuración, Métodos de Pago ni Equipo. Arreglo: `npx tsx scripts/create-master-admin.ts <su correo>` en el servidor y volver a entrar. **Resuelto el 30/09 (10:46 p. m.):** Andrés mandó la captura de Equipo con su cuenta como Super admin, con dos pasos activos. Es la única cuenta del equipo en producción; va a invitar al resto desde ahí.
- **Decidido por Andrés (30/09, después del incidente):** él es el super admin y desde ahí da los roles y los usuarios en Equipo. El rol Administrador queda como está (sin Configuración, Métodos de Pago ni Equipo). El 01/10 confirmó que ya invitó al resto del equipo y que todo funciona.
- **C-144** (en producción): `/terminos` y los términos del pago ya no prometen bancos, Zelle ni "efectivo en tienda"; dicen "los métodos que la tienda muestra al pagar". **Tres afirmaciones de los términos por confirmar con Andrés** en `estado/C-144.md`.
- **Regla de Andrés (30/09): cuidado con los términos.** Ninguna promesa escrita a mano que la tienda no cumpla; ante la duda, preguntarle.
- **C-143** (en producción): el panel avisa cuando la tienda no tiene super admin, el guion cierra la sesión al promover, y el menú de la cuenta en la tienda trata al equipo como equipo (`estado/C-143.md`).
- Andrés dijo el 30/09 que las pruebas de los deploys del 30/09 salieron "excelentes", con algunos ajustes para más adelante. C-140 entró con C-141.
- **C-139** (Puntos ES): en producción, sin cambio de base (bloque de C-139, abajo).
- **C-142:** los términos de los Puntos ES que se firman ya traen la regla del cierre de cuenta (decisión de Andrés del 30/09). Se publican solos con el deploy y cada cliente los firma en su próxima recarga (`estado/C-142.md`).
- **C-120** (facturación, IVA y términos): investigación hecha y **rediseñada con las respuestas de Andrés del 30/09** (`estado/C-120.md`): la web no emite facturas (eso es de SADES y del talonario); la web prepara los datos. Se repartió en C-146, C-147 y C-148, las tres hechas.
- **C-148** (en producción, **con dos tablas nuevas**): **cotizaciones para empresas e instituciones**. El cliente la pide en `/cotizacion`, el equipo la arma en el panel y el cliente la abre con un enlace, la imprime (una hoja, con el logo largo en el membrete) y la aprueba. SQL y pruebas en `estado/C-148.md`.
- **C-146** (en producción): **"IVA incluido" con la base y el IVA** en ficha, carrito, pago, correo, recibo y panel; fuera "Impuestos (Exento)". El total no cambia. Andrés puso 16 en Configuración → Precios → IVA el 01/10 (`estado/C-146.md`).
- **C-145** (en producción): el embudo de compra ya se mide (carrito, pago, compra y registro). Para que llegue a Google Analytics y a Meta faltan `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` en el `.env` del servidor (`estado/C-145.md`).
- **Datos de Andrés (30/09):** tiene contador; puede invertir unos $200 al mes en anuncios; falta que configure Google Analytics y el píxel de Meta (Claude le dio los pasos).
- **Meta de Andrés (30/09):** la tienda como vitrina digital para todo el país, con SEO, anuncios y ventas a empresas e instituciones. Plan de crecimiento en `PLAN.md` §5.

## 30/09 · C-139 · Página de Puntos ES
Detalle y pruebas en `estado/C-139.md`. **Sin cambio de base.**
- **Puntos ES** (panel del cliente): historial completo con "Cargar más", recargas por confirmar y rechazadas claras (con el motivo), enlace al pedido en cada compra o devolución y "Cómo funcionan".
- **Eliminar la cuenta:** si el cliente tiene Puntos ES, el modal dice cuántos, que se pierden y le ofrece "Ver productos". Tiene que marcar que lo entiende. El equipo recibe el monto y la aceptación.
- **`/terminos`** (sección 3.1) dice que los Puntos ES se pierden al cerrar la cuenta.
- La API de movimientos ya no devuelve datos internos (antes salía `metadata`).

**Pruebas después del deploy:**
1. Puntos ES en el teléfono: el historial, "Cargar más" y los filtros. Tocar "Ver el pedido" en una compra.
2. Una recarga de prueba sin pagar: aparece "Por confirmar" y el aviso arriba. Rechazarla desde Transacciones con un motivo: el cliente ve "Rechazada" y el motivo.
3. Con una cuenta de prueba con Puntos ES: Mi perfil → Seguridad → "Eliminar". El modal dice cuántos tiene y no deja seguir sin marcar la casilla. En Mensajes y Solicitudes llega con "(aceptó que los pierde al cerrar la cuenta)". Después, "Cancelar el pedido".
4. Movimientos viejos (de antes del 30/09): deben decir "Puntos ES", nunca "saldo" ni "billetera". Si alguno se ve raro, avisar a Claude con el texto.

**Términos firmados (C-142, decisión de Andrés del 30/09):** la versión nueva, con la regla del cierre de cuenta en la sección 5, se publica sola con este mismo deploy.
5. Prueba: abrir "Recargar Puntos ES" con una cuenta de cliente pide firmar de nuevo, y Admin → Legal muestra una versión más como vigente.

## 30/09 · C-141 · Equipo, roles y verificación en dos pasos
Detalle, hallazgos y pruebas en `estado/C-141.md`.
- **Dos pasos obligatorios para todo el panel:** contraseña y un código de una app (Google Authenticator o Authy), con 10 códigos de respaldo.
- **Roles:** Super admin (todo) y Administrador (todo menos Configuración, Métodos de pago, canales de aviso, publicar documentos legales y Equipo).
- **Equipo** (menú nuevo, solo el super admin): invitar por correo, cambiar el rol, quitar y devolver el acceso, reiniciar los dos pasos y cerrar sesiones.
- **Mi seguridad** (menú nuevo, todos los admin): configurar los dos pasos y generar códigos de respaldo.
- **Arreglos de seguridad al pasar:** la API de clientes dejaba editar o borrar cuentas del equipo y devolvía el hash de la contraseña.

**Cambio de base (aditivo): una tabla nueva**, `segundo_factor` (SQL en `estado/C-141.md`). Ningún `DROP` ni `ALTER ... TYPE`.

**Antes del deploy (Andrés):**
- **Comprueba que tu cuenta es super admin.** Si tu cuenta es Administrador (el panel lo dice arriba a la derecha), después del deploy no verás Configuración, Métodos de Pago ni Equipo. Se arregla en el servidor con `npx tsx scripts/create-master-admin.ts <tu correo>` (no cambia tu contraseña) y volviendo a entrar.
- Instala **Google Authenticator** o **Authy** en tu teléfono.
- Ten a mano dónde guardar 10 códigos fuera del teléfono (papel, o un archivo en otra computadora).
- Hazlo cuando puedas terminar los pasos de una vez: entre el deploy y tu configuración, quien tenga tu contraseña podría registrar su propia app.

**Deploy siguiente (C-139, C-142 a C-148b; C-141 ya está en producción):** igual que abajo, con el respaldo como `~/respaldo-antes-deploy-c148.dump`. El guion para y muestra el SQL: debe ser solo `CREATE TABLE "quotes"`, `CREATE TABLE "quote_items"` (ya con `stockDeducted` y `stockMissing`), sus índices y su llave, y `ALTER TABLE "company_settings" ADD COLUMN "quoteStamp"` (`estado/C-148.md` y `estado/C-148b.md`). Si C-148 ya estaba desplegada, en vez de los `CREATE TABLE` salen dos `ADD COLUMN` en `quote_items`. Después: poner 16 en Configuración → Precios → IVA (C-146) y las pruebas de `estado/C-148.md` y de C-148b (arriba).

**Deploy (Andrés, en el servidor):**
1. `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-c141.dump`
2. `git pull --ff-only` y `bash scripts/deploy.sh`. El guion para y muestra el SQL. Debe ser solo:
   - `CREATE TABLE "segundo_factor"` con su llave (`ADD CONSTRAINT ... FOREIGN KEY`).
   - Si el deploy de C-140 no se había hecho, también `CREATE TABLE "user_sessions"`, su índice y su llave.
   - Si aparece un `DROP` o un `ALTER ... TYPE`, parar y avisar a Claude.
3. `npx prisma db push` y `bash scripts/deploy.sh` otra vez.
4. **Enseguida, en el panel:** entra con tu correo y tu contraseña. Te lleva a **Mi seguridad**:
   1. "Ya tengo la app: seguir".
   2. Escanea el QR con la app (o "Abrir en la app de códigos" si estás en el teléfono).
   3. Escribe el código de 6 dígitos y "Activar la verificación".
   4. Guarda los 10 códigos (Copiar o Descargar .txt), marca la casilla y "Entrar al panel".
5. **Equipo:** revisa la lista. A cada cuenta que ya no se use, "Administrar" → "Quitar el acceso". Las demás salen como "Dos pasos sin configurar" hasta que cada persona entre y los configure: avísales.

**Si pierdes el teléfono y los códigos** (y no hay otro super admin), en el servidor:
`cd /var/www/electroshopve && npx tsx scripts/reset-dos-pasos.ts <tu correo>`. Después entra y configúralos de nuevo enseguida.

**Pruebas después del deploy:**
1. Cierra sesión y vuelve a entrar: después de la contraseña pide el código de la app. Con un código equivocado dice "El código no es correcto".
2. Entra una vez con "Usar un código de respaldo": en Mi seguridad baja a "Te quedan 9 códigos".
3. Mi seguridad → "Generar códigos nuevos" con un código de la app: muestra 10 nuevos.
4. Equipo → "Invitar" con un correo tuyo de prueba, como Administrador:
   - Llega el correo "Invitación al panel de Electro Shop". El enlace abre "Crea tu contraseña".
   - Entra con esa cuenta: configura sus dos pasos y su menú **no** tiene Configuración, Métodos de Pago ni Equipo.
   - Con tu cuenta: "Administrar" → "Quitar el acceso". Esa cuenta ya no entra.
5. Telegram y la campana: llega "Dos pasos activados" e "Invitación al panel". En Notificaciones → Qué avisar aparece **"Cambios en el equipo"**.
6. El build ya no muestra la advertencia "Dynamic filesystem access".

**Si algo sale mal:** `git reset --hard 86bc22d && npm install && bash scripts/deploy.sh --sin-pull` vuelve a C-140. La tabla nueva no molesta al código viejo.

## 30/09 · C-140 · Sesiones con nombre, una sola sesión de admin y "No fui yo"
- **C-140 · Sesiones con nombre, una sola sesión de admin y "No fui yo"**. Detalle y pruebas en `estado/C-140.md`.
  - **Clientes:** Mi perfil → Seguridad lista cada sesión (dispositivo, último uso) con "Cerrar" y "Cerrar las demás". Correo al entrar desde un dispositivo nuevo.
  - **Admin:** una sola sesión (la nueva cierra la anterior), 12 horas, y cierre tras 1 hora sin uso con aviso a los 55 min.
  - **"No fui yo":** el aviso de entrada al panel (Telegram y campana) trae un botón que cierra todas las sesiones de esa cuenta, bloquea la contraseña y manda al correo el enlace para crear una nueva.
- **Cambio de base (aditivo): una tabla nueva**, `user_sessions` (SQL en `estado/C-140.md`). Ningún `DROP` ni `ALTER ... TYPE`.
- **Deploy (Andrés, en el servidor):**
  1. `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-c140.dump`
  2. `git pull --ff-only` y `bash scripts/deploy.sh`. El guion para y muestra el SQL: debe ser solo `CREATE TABLE "user_sessions"`, su índice y su llave.
  3. `npx prisma db push` y `bash scripts/deploy.sh` otra vez.
  4. **Después del deploy los admin tienen que volver a entrar una vez** (sus sesiones viejas no tienen nombre). Los clientes no.
- **Pruebas después del deploy:**
  1. Admin: entrar en la computadora y después en el teléfono → la computadora vuelve al login con el aviso.
  2. Telegram: llega "Inicio de sesión en el panel" con el botón "No fui yo". Abrirlo muestra la confirmación; **no confirmar** (bloquearía tu cuenta).
  3. Admin → Notificaciones: "Inicio de sesión en el panel" con Panel y Telegram activos (si la tabla ya estaba guardada, el valor nuevo por defecto no se aplica solo).
  4. Cliente: entrar desde el teléfono y la computadora; en Mi perfil → Seguridad aparecen las dos; "Cerrar" la otra.
- **C-141 · Equipo, roles y verificación en dos pasos:** hecha (bloque de C-141, abajo).

## 30/09 · C-138 · Mi perfil en pestañas y avisos de favoritos
- **C-138 · Mi perfil en pestañas y avisos de favoritos** (`claude/C-138`, sale de `main`). Detalle y pruebas en `estado/C-138.md`.
  - Perfil y Configuración en una página: **Datos personales · Seguridad · Notificaciones · Empresa**. `/customer/settings` redirige.
  - Solo lo que funciona (decisión de Andrés del 30/09): se quitaron 6 interruptores sin efecto, las estadísticas falsas y las promesas de la cuenta de empresa.
  - **Nuevo:** avisos cuando un favorito baja de precio, entra en oferta o vuelve a haber (en la tienda y por correo, con cron cada hora).
  - "Eliminar cuenta" ahora llega al equipo (Mensajes y Solicitudes + aviso) en vez de prometer un borrado que nadie hacía.
  - Actividad reciente, cambiar la contraseña cerrando las demás sesiones, y desactivar cierra también los otros dispositivos.
- **Hecho el 30/09:** merge y push (Claude, `64e8043`), deploy con el SQL (Andrés) y los crons (ver `OPERACION.md`).
- **Cambio de base (aditivo):**
  ```sql
  ALTER TABLE "notification_preferences" ADD COLUMN "inAppFavoritos" BOOLEAN NOT NULL DEFAULT true, ADD COLUMN "emailFavoritos" BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE "wishlist_items" ADD COLUMN "avisoPrecioUSD" DECIMAL(65,30), ADD COLUMN "avisoAgotado" BOOLEAN NOT NULL DEFAULT false;
  ```
- **Cron nuevo** (con `crontab -e` en el servidor; `CRON_SECRET` es la misma del cron de envíos de C-100):
  `0 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://electroshopve.com/api/cron/favoritos`
  La primera corrida solo anota los precios; los avisos empiezan con el primer cambio.
- **Pruebas en producción** (Andrés):
  1. Mi perfil en el teléfono: las 4 pestañas; cambiar el teléfono y guardar; tocar un interruptor de Notificaciones.
  2. Guardar un producto en Favoritos, bajarle el precio desde el admin y esperar la hora del cron (o correr el `curl` a mano): aviso en la campana y correo.
  3. Con una cuenta de prueba: "Eliminar" → llega a Mensajes y Solicitudes y como aviso; "Cancelar el pedido".
  4. Admin → Verificaciones: rechazar una empresa de prueba con motivo → el cliente recibe el aviso.
- **Decidido por Andrés el 30/09:** quien cierra su cuenta **pierde sus Puntos ES**: no son reembolsables. La tienda le sugiere gastarlos en productos antes de cerrarla. En la pantalla desde C-139 y en los términos firmados desde C-142.
- **Aprobado el 30/09 y hecho después:**
  - **C-140 · Sesiones con nombre.** Cliente: varias sesiones, cada una visible y con "Cerrar", y correo al entrar desde un dispositivo nuevo. Admin: una sola sesión (la nueva cierra la anterior), 12 h y cierre tras 1 h sin uso. Tabla de sesiones nueva (aditiva). Va en la pestaña Seguridad de C-138.
  - **C-139 · Página de Puntos ES:** historial completo con "Cargar más", recargas pendientes y rechazadas claras (con el motivo), "Cómo funcionan" con enlace a los términos y enlace al pedido en cada compra o devolución.

## 30/09 · C-130 a C-137 · Pago Móvil, Puntos ES, checkout, productos y panel del cliente
Pedidos de Andrés del 29 y 30/09.
- **Merge más simple: `git merge --no-ff claude/C-137`** trae todo (C-130 a C-137): C-137 sale de las dos cadenas. Probado: build, `tsc` y ESLint.
- Si se quiere subir solo lo de productos antes: `claude/C-136` (trae C-133, C-134 y C-136, sin cambio de base).
- **Dos cadenas independientes** (para saber qué trae cada una):
- **Cadena A (dinero):** `claude/C-130` → `claude/C-131` → `claude/C-132` → `claude/C-135`. Cada una sale de la anterior.
  - **C-130 · Teléfono y cédula del BDV:** el checkout mandaba `584121234567` y el banco decía "Formato de teléfono inválido". Arreglado en el checkout, la recarga, la verificación y "Consultar Pago Móvil".
  - **C-131 · "Puntos ES":** regla legal de Andrés, nunca "saldo" ni "billetera" en textos. 186 textos.
  - **C-132 · Checkout:** "¿Cómo deseas pagar?" con los métodos activos, Binance Pay y PayPal manuales con reserva de 2 h, pago mixto Puntos ES + Pago Móvil, reservas que apartan de verdad. **Lleva cambio de base (aditivo):**
    ```sql
    ALTER TABLE "orders" ADD COLUMN "paymentReference" TEXT, ADD COLUMN "pointsUSD" DECIMAL(65,30) NOT NULL DEFAULT 0;
    ALTER TABLE "stock_reservations" ADD COLUMN "orderId" TEXT;
    CREATE INDEX "stock_reservations_orderId_idx" ON "stock_reservations"("orderId");
    ```
  - **C-135 · "$12,50 Puntos ES":** el formato en todo lo que ve el cliente y la explicación en los términos. **Los términos "de los Puntos ES" se publican solos** con el deploy (Andrés pidió que lo hiciera Claude): la primera visita crea la versión siguiente si la vigente aún dice "saldo". Cada cliente la firma en su próxima recarga.
- **Cadena B (productos, se puede subir sola y ya):** `claude/C-133` → `claude/C-134` → `claude/C-136`. Sin cambio de base.
  - **C-133 · Cinta ES:** también con fondo blanco liso (la foto de los audífonos Piston del 30/09 no la tenía), la cinta en la esquina de la foto en la ficha, el catálogo y la vitrina, guardar sin la espera de 2,5 s, y al editar "Guardar cambios" en cada paso.
  - **C-134 · Asistente de productos:** menos espacio, sin redundancia, validaciones iguales en el formulario y el servidor.
  - **C-136 · Especificaciones:** sugerencias según la categoría (lo que ya usan sus productos y una lista base por tipo), valores con un toque, ninguna obligatoria.
- **C-137 · Panel del cliente** (sobre las dos cadenas):
  - Mis pedidos con fotos, estado en palabras, paso a paso, "Rastrear en" con logo y recibo imprimible (no fiscal).
  - Favoritos en grilla de 2 a 4 columnas, con precio en Bs., disponibilidad y "Mover al carrito".
  - Direcciones con agencias ZOOM y MRW elegidas de la lista real y quién recibe (con cédula). El checkout trae la agencia predeterminada ya elegida. Editar una dirección fallaba siempre: arreglado.
- **Probado junto:** rama temporal con C-130 a C-134 mezcladas: 0 conflictos, `tsc`, `build` y ESLint (0 errores). C-135 y C-136: `tsc` y ESLint. Pruebas de cada una en su `estado/C-13X.md`.
- **Después del deploy, en producción:**
  1. Una compra con Pago Móvil desde un perfil con teléfono `+58 …`: debe verificar al primer intento.
  2. Volver a subir la foto de los audífonos Piston (la de `~/Escritorio/AUDIFONOS-PISTON-con-cinta.png` o la original: ahora la cinta sale sola). Editar un producto cambiando solo el precio.
  3. Activar Binance Pay y PayPal en Métodos de pago (con su QR si hay) y hacer una compra de prueba con cada uno: queda "Por validar" y se confirma con "Marcar pagado".
  4. Una compra con pago mixto (algo de Puntos ES y el resto por Pago Móvil) y cancelarla: vuelven los Puntos ES.
  5. Admin → Legal: aparece "Términos y condiciones de los Puntos ES" como vigente después de la primera visita a una recarga.
  6. **Panel del cliente, en el teléfono:** Mis pedidos (tocar "Detalle y recibo" e imprimir), Favoritos ("Mover al carrito") y Direcciones: agregar tu agencia ZOOM de la lista como predeterminada y abrir el checkout: debe venir elegida.
  7. En producción hay un **"Producto Test" publicado** en Consolas y productos digitales con **"(SALDO)" en el nombre**: pasarlo a borrador y renombrarlos (ver `estado/C-136.md`).
- **Decidido por Andrés el 30/09:** "$12,50 Puntos ES" explicado en los términos (C-135); especificaciones sin mínimo y sugeridas por categoría (C-136); **el taller espera a SADES** (está caído; los datos de los equipos en reparación están ahí).
- **Del pedido del 29/09:** perfil en pestañas (C-138) y la página de Puntos ES (C-139), hechos. Queda el taller, cuando SADES vuelva.

## 29/09 · Deploy de C-118 a C-129
Subido entre el 29 y el 30/09 (el deploy de C-130 a C-137 del 30/09 salió encima). Merges de C-124 a C-129 hechos el 29/09 por pedido de Andrés.
- **Qué lleva:** lo del deploy anterior si todavía no se hizo (C-114 a C-123), más C-124 a C-129 (bloque siguiente).
- **Cambio de base: solo aditivo.**
  - Si el deploy de C-118 a C-123 ya se hizo, el SQL son exactamente 3 `ADD COLUMN`:
    - `reviews`: `rejectedAt` y `rejectionReason`.
    - `pago_movil_verificaciones`: `tasaVES`.
  - Si no se hizo, se suman los `CREATE TYPE` y `CREATE TABLE` de garantías y las columnas de C-119 y C-123.
  - **Ningún `DROP` ni `ALTER ... TYPE`**: si aparece alguno, parar y avisar a Claude.
- **Pasos en el servidor** (`/var/www/electroshopve`):
  1. `git log -1 --oneline` (para anotar qué había).
  2. Respaldo de la base: `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-29-09c.dump`
  3. Respaldo de archivos: `tar czf ~/archivos-29-09c.tgz private-uploads public/uploads`
  4. `git pull --ff-only` y `bash scripts/deploy.sh`. El guion para y muestra el SQL.
  5. Si el SQL es como el de arriba: `npx prisma db push` y `bash scripts/deploy.sh` otra vez.
- **Después del deploy, en producción:**
  1. **Reseñas:** aprobar la de Luis Morandin. Sin 500; sale en la ficha del producto.
  2. **Pago Móvil:** una compra real, barata, copiando el monto con "Copiar monto". Si es de noche, mejor después de las 8 p. m. (el fallo de la fecha). Debe verificar al primer intento.
  3. **Transacciones → "Consultar Pago Móvil"** con los datos de ese pago: "El banco confirma" y "ya se usó en la tienda: orden …".
  4. **Tiempo real:** Admin → Órdenes en dos navegadores; avanzar una orden en uno y verla cambiar en el otro sin recargar. Si dice "Reconectando…" todo el tiempo, revisar nginx (`OPERACION.md`, "Tiempo real").
  5. **Órdenes:** abajo aparece "Cargar más órdenes (50 de N)" si hay más de 50, y "Cobrado" cuenta solo lo pagado.
  6. **Cliente, en el teléfono:** Inicio con saldo, compras activas y garantías, y los pedidos en curso con su stepper. Barra inferior: Inicio, Pedidos, Saldo, Favoritos y Más.
  7. Si el deploy anterior no se había hecho, también sus pruebas (en el historial de git de este archivo).
- **Si algo sale mal:** `git reset --hard 3267cfd && npm install && bash scripts/deploy.sh --sin-pull` vuelve a lo anterior. Las columnas nuevas no molestan al código viejo.

## 29/09 · C-124 a C-129 · Reseñas, Pago Móvil, detalle de la orden, tiempo real y panel del cliente
**Orden de merge obligatorio:** `claude/C-124` → `claude/C-125` → `claude/C-126` → `claude/C-127` → `claude/C-128` → `claude/C-129`.
- C-127 sale de C-126 y ya integra C-125. C-128 sale de C-127.
- Probado en una rama temporal con los cinco mezclados: 0 conflictos, `tsc` y `build` pasan, y las pruebas de punta a punta de reseñas, Pago Móvil (24/24) y tiempo real dan lo esperado.
- **C-124 · Reseñas:** el 500 al aprobar era la columna `isPublished`, que no existe. Ahora hay estado "rechazada" con motivo y un panel de moderación nuevo.
- **C-125 · Pago Móvil:** el 1010 venía de un céntimo de diferencia entre la pantalla y el banco (3,5 % de los totales) y de la fecha UTC después de las 8 p. m. Además:
  - Monto congelado con cotización firmada.
  - Pagos de más al saldo, pagos de menos se completan con otro Pago Móvil, diferencias de hasta Bs. 1 absorbidas.
  - Formulario nuevo: "Copiar todos los datos" y solo la referencia.
- **C-126 · Detalle de la orden:**
  - El pago en palabras ("Billetera Electro Shop", "Pago Móvil · Banesco · Ref.") y la facturación separada del envío.
  - "Copiar guía" y "Consultar ZOOM ahora". El enlace de ZOOM no toma la guía: se verificó.
  - **La lista de Órdenes mostraba solo las últimas 25.**
- **C-127 · Tiempo real (SSE):** órdenes, stock y pagos sin recargar, optimista en el panel y respaldo si se cae la conexión.
- **C-128 · Panel del cliente:** resumen (saldo, compras activas, garantías), pedidos en curso con stepper en vivo y barra inferior con Saldo. Arregla las misiones que marcaban 0 %.
- **C-129 · Pago Móvil, lo legal y la API** (sale de C-128):
  - Se quitó "billetera" de los textos: es la palabra de la sanción de SUDEBAN a Yummy.
  - Tolerancia de Bs. 14, la comisión mínima P2C que paga la tienda.
  - `reqCed` solo en pagos BDV a BDV (otra causa probable del 1010).
  - Duplicados por referencia y banco, y una verificación a la vez por referencia.
  - El `orderId` del navegador se ignora.
  - Nuevo "Consultar Pago Móvil" en Transacciones.
  - La investigación con fuentes está en `estado/C-129.md`.
- **Cambio de base (todo aditivo), SQL esperado en el deploy:**
  - `ALTER TABLE "reviews" ADD COLUMN "rejectedAt" TIMESTAMP(3), ADD COLUMN "rejectionReason" TEXT;`
  - `ALTER TABLE "pago_movil_verificaciones" ADD COLUMN "tasaVES" DECIMAL(65,30);`
- **Decidido por Andrés el 29/09:**
  - El sobrepago va al saldo.
  - Sin subir capturas: se usa la verificación con el BDV.
  - La barra inferior del cliente queda aprobada.
- **Decidido por Andrés (29 y 30/09):** el saldo se llama **"Puntos ES"** en toda la tienda; nunca "saldo" ni "billetera" (ley venezolana). Hecho en C-131. La versión nueva de los términos de recarga se publicó sola con el deploy de C-135, y la regla del cierre de cuenta, con C-142.
- Detalle y pruebas de cada una en su `estado/C-12X.md`.
