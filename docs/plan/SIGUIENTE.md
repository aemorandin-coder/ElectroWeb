# Punto de partida (actualizado 2026-10-01, bloque de subida listo)

## Bloque único de subida del 01/10: de C-148b a C-151
Pedido de Andrés del 01/10: revisar todas las ramas y subir todo en un solo bloque.

**Cómo está todo (revisado el 01/10):**
- **Ramas:** las 154 ramas de trabajo están fusionadas en `main`, y `main` es igual a GitHub. La única sin fusionar es `chatgpt/product-fixes-main`, un borrador viejo de ChatGPT del 21/09 que Claude rehízo en C-95: no sube.
- **Producción hoy: C-148b** (`3f2db8d`). Se ve desde fuera: tiene la hoja de impresión de los presupuestos, "IVA incluido" y los términos nuevos; no tiene `/llms.txt`.
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

### Lo que sigue después del bloque (Claude)
- **Embalaje más inteligente** (aprobado por Andrés el 01/10): precio por tamaño del paquete, embalaje gratis desde un monto (sin que la tienda pague el flete) y el aviso "te faltan $X" en el carrito. Sin empezar.
- **Confianza antes de pagar:** garantía, despacho y embalaje junto al botón de compra. Sin empezar.

---

## Detalle de cada tarea (los pasos de arriba reemplazan los deploys sueltos de abajo)

En GitHub, `main` tiene todo hasta **C-151** (orden real: C-149, C-147, C-150, C-146b, C-147b, C-151).
- **C-151** (01/10, en `main`, falta el deploy, **una columna nueva**): los productos digitales no llevan IVA (`estado/C-151.md`). Decisión de Andrés del 01/10.
  - Interruptor en Configuración → Precios → IVA, **apagado por defecto**: no hay que tocar nada después del deploy.
  - SQL del deploy: `ALTER TABLE "company_settings" ADD COLUMN "taxDigitalProducts" BOOLEAN NOT NULL DEFAULT false;` (se suma al de C-147).
  - **Pruebas después del deploy (Andrés):** abrir un producto digital (no dice "IVA incluido") y uno físico (sí lo dice); un carrito con los dos dice "IVA incluido en los productos físicos".
  - **Para el contador:** las 4 preguntas del estado (la base es el art. 16 de la Ley del IVA, no que sean "de entretenimiento"; las recargas directas son el caso dudoso).
- **Pruebas de punta a punta:** el motor quedó en `scripts/e2e/lib.ts` (usuarios y sesiones de prueba, Firefox sin ventana) y la prueba de humo de todo junto, en `scripts/e2e/humo.ts`. Los guiones de cada tarea se escriben en `scripts/e2e/_tNNN.ts`, se corren con `npx tsx` y se borran: la carpeta temporal se vacía con cada desconexión.
- **C-147b** (01/10, en `main`, va con el deploy de C-147, sin cambio de base): cómo se factura el embalaje (`estado/C-147b.md`). Va en la misma factura, como renglón aparte y con IVA; el flete con cobro a destino lo factura ZOOM o MRW. "Copiar datos para facturar" y el recibo ya lo nombran "Embalaje" o "Delivery en Guanare", y la relación de ventas trae su columna. **Para el contador:** las 4 preguntas del estado.
- **C-146b** (01/10, en `main`, falta el deploy, **sin cambio de base**): precio sugerido desde el costo y margen real (`estado/C-146b.md`).
  - **Pruebas después del deploy (Andrés):**
    1. Productos → editar uno físico → paso "Precios": escribir el costo. Aparece "Precio sugerido" (costo + 30 % + IVA 16 %). "Usar este precio" lo pone en el precio; el margen queda en 30 %.
    2. Subir el precio a mano por encima: aparece el aviso del 30 % (solo lo ves tú).
    3. Editar un producto digital → "Montos y precios": cada monto dice su margen ya sin el IVA. Los que salgan en rojo se venden con pérdida si el IVA se paga.
  - **Resuelto el 01/10 (C-151):** los productos digitales no llevan IVA; su margen se calcula sin IVA.
- **C-150** (01/10, en `main`, falta el deploy, **sin cambio de base**): menú del panel por secciones y Dashboard de trabajo (`estado/C-150.md`). Aprobado por Andrés el 01/10 ("deja Dashboard como Dashboard").
  - **Pruebas después del deploy (Andrés):**
    1. En el teléfono, abrir el menú del panel: Dashboard y seis secciones, sin deslizar. Tocar "Ventas": se abren sus cinco páginas.
    2. Entrar a Configuración: "Administración" queda abierta y Configuración, marcada.
    3. Dashboard: las acciones rápidas arriba; "Ventas cobradas" de hoy y del mes deben parecerse a lo que sabes que cobraste (ahora solo cuenta lo pagado).
    4. "Tu tienda: por completar" lista lo que falta (marca de los productos, imagen para compartir…). Cada renglón desaparece al resolverlo.
- **Dicho por Andrés el 01/10:** ya puso 16 en el IVA (C-146). Los cursos se van a llenar: "Cursos" se queda en el menú. Las devoluciones de garantía quedan como en los términos (reparar, cambiar por uno igual y, si no hay, Puntos ES). No sabe si el deploy incluyó C-148b: se ve en Configuración → Negocio ("Sello y firma de los presupuestos").
- **C-147** (01/10, en `main`, falta el deploy, **siete columnas nuevas**): datos para la factura y relación de ventas del mes (`estado/C-147.md`).
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
- **C-149** (01/10, en `main`, falta el deploy, **sin cambio de base**): que Google, las redes y las IA encuentren el catálogo (`estado/C-149.md`). Incluye las seis correcciones técnicas del análisis externo que pasó Andrés.
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
  - **Decisiones abiertas para Andrés:** §3c.
- **C-148b** (01/10, en `main`, falta el deploy, **tres columnas nuevas**): segunda parte de las cotizaciones (`estado/C-148b.md`).
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
- **Producción: C-141 desplegada el 30/09** (Andrés configuró sus dos pasos). No se sabe con qué commit exacto: preguntarle si el deploy incluyó C-139 y C-142.
- **Incidente del deploy (C-143):** la cuenta de Andrés era ADMIN, no SUPER_ADMIN, y quedó sin Configuración, Métodos de Pago ni Equipo. Arreglo: `npx tsx scripts/create-master-admin.ts <su correo>` en el servidor y volver a entrar. **Resuelto el 30/09 (10:46 p. m.):** Andrés mandó la captura de Equipo con su cuenta como Super admin, con dos pasos activos. Es la única cuenta del equipo en producción; va a invitar al resto desde ahí.
- **Decidido por Andrés (30/09, después del incidente):** él es el super admin y desde ahí da los roles y los usuarios en Equipo. El rol Administrador queda como está (sin Configuración, Métodos de Pago ni Equipo). Todavía no corrió el diagnóstico de C-92.
- **C-144** (en `main`, falta el deploy): `/terminos` y los términos del pago ya no prometen bancos, Zelle ni "efectivo en tienda"; dicen "los métodos que la tienda muestra al pagar". **Tres afirmaciones de los términos por confirmar con Andrés** en `estado/C-144.md`.
- **Regla de Andrés (30/09): cuidado con los términos.** Ninguna promesa escrita a mano que la tienda no cumpla; ante la duda, preguntarle.
- **C-143** (en `main`, falta el deploy): el panel avisa cuando la tienda no tiene super admin, el guion cierra la sesión al promover, y el menú de la cuenta en la tienda trata al equipo como equipo (`estado/C-143.md`).
- Andrés dijo el 30/09 que las pruebas de los deploys del 30/09 salieron "excelentes", con algunos ajustes para más adelante. Sobre el deploy de C-140 respondió "recuerda que necesito probar": **no está confirmado**. Los pasos de C-141 sirven igual si ese deploy no se hizo (§00000).
- **C-139** (Puntos ES) hecha y en `main`: va en el mismo deploy que C-141 y no cambia la base (§000000).
- **C-142:** los términos de los Puntos ES que se firman ya traen la regla del cierre de cuenta (decisión de Andrés del 30/09). Se publican solos con el deploy y cada cliente los firma en su próxima recarga (`estado/C-142.md`).
- **C-120** (facturación, IVA y términos): investigación hecha y **rediseñada con las respuestas de Andrés del 30/09** (`estado/C-120.md`): la web no emite facturas (eso es de SADES y del talonario); la web prepara los datos. Sigue en C-146, C-147 y C-148.
- **C-148** (en `main`, falta el deploy, **con dos tablas nuevas**): **cotizaciones para empresas e instituciones**. El cliente la pide en `/cotizacion`, el equipo la arma en el panel y el cliente la abre con un enlace, la imprime (una hoja, con el logo largo en el membrete) y la aprueba. SQL y pruebas en `estado/C-148.md`.
- **C-146** (en `main`, falta el deploy): **"IVA incluido" con la base y el IVA** en ficha, carrito, pago, correo, recibo y panel; fuera "Impuestos (Exento)". El total no cambia. **Después del deploy, Andrés tiene que poner 16 en Configuración → Precios → IVA** (`estado/C-146.md`).
- **C-145** (en `main`, falta el deploy): el embudo de compra ya se mide (carrito, pago, compra y registro). Para que llegue a Google Analytics y a Meta faltan `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` en el `.env` del servidor (`estado/C-145.md`).
- **Datos de Andrés (30/09):** tiene contador; puede invertir unos $200 al mes en anuncios; falta que configure Google Analytics y el píxel de Meta (Claude le dio los pasos).
- **Meta de Andrés (30/09):** la tienda como vitrina digital para todo el país, con SEO, anuncios y ventas a empresas e instituciones. Plan de crecimiento en §3b.
- **Sigue:** la revisión final con Andrés (§3). C-107 y C-92 esperan datos suyos.

## 000000. C-139 · Página de Puntos ES: en `main`, va con el deploy de C-141
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

## 00000. C-141 · Equipo, roles y dos pasos: en `main`, falta el deploy
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

## 0000. C-140 (30/09, noche): en `main`; el deploy va con el de C-141 si no se hizo
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
- **C-141 · Equipo, roles y verificación en dos pasos:** hecha (§00000).

## 000. C-138 (30/09, noche): en `main` y en producción
- **C-138 · Mi perfil en pestañas y avisos de favoritos** (`claude/C-138`, sale de `main`). Detalle y pruebas en `estado/C-138.md`.
  - Perfil y Configuración en una página: **Datos personales · Seguridad · Notificaciones · Empresa**. `/customer/settings` redirige.
  - Solo lo que funciona (decisión de Andrés del 30/09): se quitaron 6 interruptores sin efecto, las estadísticas falsas y las promesas de la cuenta de empresa.
  - **Nuevo:** avisos cuando un favorito baja de precio, entra en oferta o vuelve a haber (en la tienda y por correo, con cron cada hora).
  - "Eliminar cuenta" ahora llega al equipo (Mensajes y Solicitudes + aviso) en vez de prometer un borrado que nadie hacía.
  - Actividad reciente, cambiar la contraseña cerrando las demás sesiones, y desactivar cierra también los otros dispositivos.
- **Hecho el 30/09:** merge y push (Claude, `64e8043`), deploy con el SQL (Andrés) y los crons (ver §2).
- **Cambio de base (aditivo):**
  ```sql
  ALTER TABLE "notification_preferences" ADD COLUMN "inAppFavoritos" BOOLEAN NOT NULL DEFAULT true, ADD COLUMN "emailFavoritos" BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE "wishlist_items" ADD COLUMN "avisoPrecioUSD" DECIMAL(65,30), ADD COLUMN "avisoAgotado" BOOLEAN NOT NULL DEFAULT false;
  ```
- **Cron nuevo** (con `crontab -e` en el servidor; `CRON_SECRET` es la misma del cron de envíos de C-100):
  `0 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://electroshopve.com/api/cron/favoritos`
  La primera corrida solo anota los precios; los avisos empiezan con el primer cambio.
- **Pruebas pendientes en producción** (Andrés):
  1. Mi perfil en el teléfono: las 4 pestañas; cambiar el teléfono y guardar; tocar un interruptor de Notificaciones.
  2. Guardar un producto en Favoritos, bajarle el precio desde el admin y esperar la hora del cron (o correr el `curl` a mano): aviso en la campana y correo.
  3. Con una cuenta de prueba: "Eliminar" → llega a Mensajes y Solicitudes y como aviso; "Cancelar el pedido".
  4. Admin → Verificaciones: rechazar una empresa de prueba con motivo → el cliente recibe el aviso.
- **Decidido por Andrés el 30/09:** quien cierra su cuenta **pierde sus Puntos ES**: no son reembolsables. La tienda le sugiere gastarlos en productos antes de cerrarla. Falta ponerlo en la pantalla y en los términos: va en C-139 (§3).
- **Aprobado el 30/09 y en fila:**
  - **C-140 · Sesiones con nombre.** Cliente: varias sesiones, cada una visible y con "Cerrar", y correo al entrar desde un dispositivo nuevo. Admin: una sola sesión (la nueva cierra la anterior), 12 h y cierre tras 1 h sin uso. Tabla de sesiones nueva (aditiva). Va en la pestaña Seguridad de C-138.
  - **C-139 · Página de Puntos ES:** historial completo con "Cargar más", recargas pendientes y rechazadas claras (con el motivo), "Cómo funcionan" con enlace a los términos y enlace al pedido en cada compra o devolución.

## 00. C-130 a C-137 (en `main` y en producción desde el 30/09)
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
- **Siguen del pedido del 29/09:** perfil en pestañas (hecho en C-138), la página de Puntos ES (C-139, después de C-140) y el taller cuando SADES vuelva.

## 0. Urgente: deploy del 29/09 (noche), C-118 a C-129
Todo está en `main` y en GitHub (merges de C-124 a C-129 hechos el 29/09 por pedido de Andrés).
- **Qué lleva:** lo del deploy anterior si todavía no se hizo (C-114 a C-123), más C-124 a C-129 (§0b).
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
  4. **Tiempo real:** Admin → Órdenes en dos navegadores; avanzar una orden en uno y verla cambiar en el otro sin recargar. Si dice "Reconectando…" todo el tiempo, revisar nginx (§2).
  5. **Órdenes:** abajo aparece "Cargar más órdenes (50 de N)" si hay más de 50, y "Cobrado" cuenta solo lo pagado.
  6. **Cliente, en el teléfono:** Inicio con saldo, compras activas y garantías, y los pedidos en curso con su stepper. Barra inferior: Inicio, Pedidos, Saldo, Favoritos y Más.
  7. Si el deploy anterior no se había hecho, también sus pruebas (en el historial de git de este archivo).
- **Si algo sale mal:** `git reset --hard 3267cfd && npm install && bash scripts/deploy.sh --sin-pull` vuelve a lo anterior. Las columnas nuevas no molestan al código viejo.

## 0b. Nuevo del 29/09 (tarde): 6 tareas pedidas por Andrés, ya en `main`
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
- **Decidido por Andrés (29 y 30/09):** el saldo se llama **"Puntos ES"** en toda la tienda; nunca "saldo" ni "billetera" (ley venezolana). Hecho en C-131. Falta publicar la versión 2 de los términos de recarga desde Admin → Legal (texto en `estado/C-131.md`).
- Detalle y pruebas de cada una en su `estado/C-12X.md`.

## 1. Estado de las ramas
- **`main`:** todo hasta C-151. **Producción: C-148b** (`3f2db8d`), comprobado desde fuera el 01/10. Lo que falta sube en un solo bloque (arriba).
- **Gemini:** R23 (G-69) cerrada y en `main`, con dos arreglos de Claude (resultado al final de `PLAN_GEMINI.md`). **No tiene ronda abierta.** Su carril no tiene deudas de reglas (verificado el 28/09 con `grep`: 0 hex, 0 textos de menos de 11 px, 0 `font-black`, 0 `z-[número]`, 0 `alert` o `console.log` y 0 emojis).
- **ChatGPT:** fuera del equipo desde el 21/09. Limpieza opcional en la máquina de Andrés: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- **Historial de tareas:** cada una tiene su `docs/plan/estado/C-XX.md`. Resumen en `PLAN_CLAUDE.md`, "Orden de trabajo".

## 2. Deploy
- Servidor `/var/www/electroshopve`, proceso de PM2 `electroshop`, usuario `luami`. `ecosystem.config.js` está desactualizado y no se usa.
- **Crons del servidor** (`crontab -l` de `luami`, puestos el 30/09). Cada guion lee `CRON_SECRET` del `.env`:
  - `0 * * * * /home/luami/cron-favoritos.sh`: avisos de favoritos (C-138).
  - `15 */2 * * * /home/luami/cron-envios.sh`: rastreo de las guías ZOOM (C-100). **No existía hasta el 30/09:** desde el 22/09 el rastreo solo avanzaba con "Consultar ZOOM ahora".
  - Para probar uno a mano, se corre el guion: responde JSON (`revisados`, `avisos`…).
- **Tiempo real (C-127):** `/api/realtime` usa Server-Sent Events y manda `X-Accel-Buffering: no`, así que nginx no necesita cambios. Si el panel dice "Reconectando…" todo el tiempo, revisar en el `location` de nginx que `proxy_read_timeout` sea de 60 s o más (el latido es cada 25 s) y que no haya `proxy_buffering on` forzado. PM2 debe seguir en **una sola instancia**: el bus de eventos vive en memoria.

**Cada deploy:**
```bash
cd /var/www/electroshopve
git pull --ff-only          # primero: el guion que corre no se actualiza a sí mismo en la misma corrida
bash scripts/deploy.sh
```
- Compila en `.next-a` o `.next-b` (la que no se sirve) y solo entonces reinicia. La tienda no se cae durante el build.
- **Si el build falla o la tienda no responde con la versión nueva, sigue la anterior.**
- **Si el deploy cambia la base, el guion para y muestra el SQL.** Si hay un DROP o un `ALTER ... TYPE`, avisa a Claude. Si no: `npx prisma db push` y se corre de nuevo.
- Instala dependencias cuando `package-lock.json` cambió desde la última instalación.
- Borra los tipos generados de la carpeta en uso y no copia la caché de Turbopack (causas de los dos fallos del 28/09).
- **Respaldo de la base antes de un deploy con cambios de base:**
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-<fecha>.dump`
  (`pg_dump` no acepta el `?schema=` de la URL de Prisma).
- **Volver atrás:** `git reset --hard <commit> && npm install && bash scripts/deploy.sh --sin-pull`.
- **Memoria:** el servidor tiene 7,8 GB. El build usa unos 2,7 GB. Andrés agregó 4 GB de swap el 28/09.
- **Respaldo de archivos:** incluir `private-uploads/signatures/` (constancias firmadas), `private-uploads/warranty/` (fotos de garantía, desde C-122) y `public/uploads/` (fotos de productos y de ElectroStudio).

**Deploys hechos:**
- **30/09 (noche):** C-138 (`d53d5b4`). `ADD COLUMN` en `notification_preferences` y `wishlist_items`. Respaldo `~/respaldo-antes-deploy-30-09-c138.dump`. Crons de favoritos y envíos.
- **30/09:** C-130 a C-137 (`1333928`), con el cambio de base de C-132.
- **26/09:** C-104 a C-40. Respaldos `~/respaldo-antes-deploy-26-09.dump` y `~/firmas-2026-09-26.tgz`.
- **28/09:** ElectroStudio (C-112 + C-113). Tablas `studio_flyers` y `studio_brand`. Respaldo `~/respaldo-antes-deploy-28-09.dump`.
  - Hubo dos fallos del build: los tipos de una ruta borrada y la falta de memoria. Los dos se arreglaron en `deploy.sh` y `next.config.js`.

## 3. Qué sigue (Claude, en orden)
1. ~~C-141 y C-139~~: hechas (§00000 y §000000). Antes de seguir, confirmar su deploy.
2. **Revisión final con Andrés** (`REVISION_FINAL.md`), y arreglar lo que salga. En producción:
   - Checkout: con el mínimo de compra activo, el aviso aparece antes de pagar. Una compra real con saldo y otra con Pago Móvil.
   - Una compra con cupón.
   - Firmar los términos desde "Recargar saldo".
   - Reportes → Seguridad con la IP real.
3. **Hechas y en `main`:** C-115 (mínimo en el carrito), C-116 (ElectroStudio, fases 1 y 2) y C-117 (cinta "ES" automática). Detalle en sus `estado/C-XX.md`.
4. **C-118 · Carga masiva con plantilla `.json`:** hecha el 29/09 (rama `claude/C-118`, `estado/C-118.md`). Productos → Más → "Importar (.json)". Sin cambio de base.
   - Andrés: probarla con 2 o 3 productos reales y claude.ai.
4b. **C-119 · Productos usados y reacondicionados:** hecha y en `main` el 29/09 (`estado/C-119.md`). Lleva cambio de base (§0).
   - "Usado" en el correo de compra: hecho en C-121 (29/09, rama `claude/C-121`), con 4 arreglos del correo (decía "debitado de tu billetera" también en un Pago Móvil por confirmar, faltaba el descuento, no escapaba el nombre y la dirección).
   - Módulo de garantías: hecho en C-122 (29/09, rama `claude/C-122`, sobre C-121; **lleva tablas nuevas**). Menú "Garantías" con estados, historial, notas internas, fotos privadas y devolución al saldo de verdad (`estado/C-122.md`).
4c. **C-120 · Facturación a empresa, IVA y términos:** investigada y rediseñada el 30/09 (`estado/C-120.md`). **La web no emite facturas**: prepara los datos y SADES o el talonario facturan. No construir un facturador ni integrar una imprenta digital. Se reparte en C-146, C-147 y C-148 (§3b).
5. **C-107:** seguro del envío a elección del cliente. Espera los costos de ZOOM y MRW y el OK de la migración.
6. **C-92:** desactivar clientes en vez de borrarlos. Detalle en `AUDITORIA_CLIENTES_BORRADOS.md`.
   - Falta de Andrés: correr el diagnóstico (un solo comando, solo lee: `docs/plan/scripts/diagnostico-c92.sql`, con las instrucciones arriba del archivo), pasarle la salida a Claude y cancelar esas órdenes con el motivo "Prueba: cliente eliminado".
   - Sumar (C-139): al cerrar una cuenta con Puntos ES, dejar un movimiento que anote que se perdieron (regla del 30/09).
   - Lleva una migración de `onDelete`, con su OK.
7. ~~Wizard de producto~~: hecho en C-134 (30/09, `estado/C-134.md`). Si Andrés quiere más cambios en el asistente, que diga cuáles.
8. **Menores:**
   - ~~Aviso cuando un favorito entra en oferta~~: hecho en C-138.
   - Ordenar el catálogo por el precio de oferta.
   - Ocultar el formulario de reseña a quien no puede reseñar.
   - `/terminos` y `/privacidad` como documentos editables.
   - Conservar el slug al renombrar una categoría.
   - Borrar `POST /api/customer/balance/deduct` si las gift cards no lo necesitan: ninguna pantalla lo llama (C-139).
   - Los errores de ESLint fuera de `app`, `components`, `lib` y `contexts`: `scripts/`, `prisma/seed.ts` y `docs/plan/scripts` (`proxy.ts` quedó limpio en C-141).
9. **ElectroStudio:** el artefacto "Flyers ElectroShop" ya se puede retirar. Si Andrés quiere pasar sus historias, se hace un importador.
10. **Al cerrar el ciclo:** borrar el esquema `rev10_demo` y los archivos de prueba de `private-uploads/signatures/` de la máquina local.

## 3b. Crecimiento (meta de Andrés del 30/09)
Andrés quiere que la tienda sea la vitrina digital de la empresa en todo el país y pagar anuncios. Orden recomendado por Claude; falta que Andrés lo confirme:
1. ✅ **C-145 · Medición del embudo** (hecha).
2. ✅ **C-146 y C-146b · "IVA incluido" a la vista y precio sugerido desde el costo** (hechas).
2b. ✅ **C-148 y C-148b · Cotizaciones** (hechas). Falta: retención del IVA de contribuyentes especiales, mandarla por correo y "Mis cotizaciones" en el panel del cliente.
3. ✅ **C-149 · Que Google, las redes y las IA encuentren el catálogo** (hecha, `estado/C-149.md`).
4. ✅ **C-147 · Datos para la factura** y relación de ventas del mes (hecha, `estado/C-147.md`).
5. **C-153 · Embalaje más inteligente** y **C-154 · Confianza antes de pagar** (salen del análisis externo del 01/10; §3e).
- **Google Merchant Center no admite a Venezuela** (lista oficial leída el 01/10). Los anuncios de Google que sí se pueden pagar son los de búsqueda (texto). Para medir sus ventas basta vincular Google Analytics con Google Ads e importar la conversión `purchase` (C-145): no hace falta otra etiqueta.
- **Regla para los documentos:** el repositorio es público. Aquí no se escriben datos fiscales ni financieros de la empresa (ventas, márgenes reales, cómo declara). Eso va en la conversación con Andrés.

## 3c. Análisis externo del 01/10: lo comercial (decide Andrés)
Andrés pasó un análisis que compara la tienda con otras dos. Lo técnico se hizo en C-149. Queda lo comercial:
0. **Resuelto el 01/10:** las devoluciones quedan como en los términos (punto 3) y "Cursos" se queda en el menú (punto 4).
1. **Garantía, despacho y entrega junto al botón de compra.** La ficha ya los muestra debajo del botón (envíos, delivery, retiro, garantía y formas de pago). Falta decidir si suben por encima del botón en el teléfono y si se agrega el embalaje.
2. **Entrega de los digitales:** decir un plazo y un horario reales, y distinguir "código" de "recarga directa". **Falta de Andrés:** cuánto tarda de verdad cada tipo y en qué horario se atiende.
3. **Devoluciones de garantía en Puntos ES.** Los términos dicen que, si no se puede reparar ni cambiar, se devuelve en Puntos ES. El análisis propone devolver al medio de pago original. Es una decisión de negocio (`PLAN.md` §7) y toca los términos: confirmar con el abogado.
4. **Cursos sin contenido:** quitar "Cursos" del menú mientras no haya cursos publicados. C-149 ya los sacó del sitemap cuando no hay ninguno.
5. **Reseñas verificadas:** pedir la reseña por correo unos días después de la entrega (hoy el cliente tiene que acordarse).
6. **Precios:** fuera del código. Es de Andrés con sus proveedores.

## 3d. Menú del panel: hecho en C-150 (aprobado por Andrés el 01/10; "Inicio" se llama Dashboard)
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

## 3e. Lo que falta del plan (al 01/10, después de C-150)
**Depende de Andrés (sin código):**
- Deploy de C-149, C-147 y C-150 (y C-148b si no entró), con sus pruebas.
- La revisión final en producción (`REVISION_FINAL.md`).
- Marca de los productos, imagen para compartir, Google Search Console, y las claves de Google Analytics y del píxel de Meta.
- Términos y privacidad con el abogado (`estado/C-120.md` §7 y las 3 afirmaciones de `estado/C-144.md`).
- Datos que esperan tareas: costos del seguro de ZOOM y MRW (C-107), el diagnóstico de clientes borrados (C-92), plazos reales de la entrega digital (§3c) y SADES arriba (taller).

**De Claude, en el orden recomendado:**
1. ✅ **C-146b · Precio sugerido desde el costo** (hecha, `estado/C-146b.md`).
2. **C-153 · Embalaje más inteligente** (aprobado por Andrés el 01/10): precio por tamaño del paquete, embalaje gratis desde un monto y aviso "te faltan $X" en el carrito.
2b. **C-154 · Confianza antes de pagar** (§3c): garantía, despacho y embalaje junto al botón; cómo se resuelve una garantía dicho antes del pago; plazo de los digitales.
3. **Reseñas por correo** unos días después de la entrega.
4. **Buscador de la tienda sin acentos** ("bateria" encuentra "Batería"), con lo hecho en C-148b.
5. **Cotizaciones:** mandarla por correo, "Mis cotizaciones" y la retención del 75 % del IVA.
6. **C-92 y C-107** cuando lleguen los datos.
7. **Menores** (§3, punto 8) y, al cerrar el ciclo, borrar `rev10_demo`.

## 4. Decisiones tomadas (no volver a preguntar)
- **Google:** vincular por correo; teléfono y cédula en la primera compra; admins nunca con Google.
- **Cédula:** fuera del registro.
- **Gift card:** solo con saldo.
- **Onboarding:** con física.
- **ChatGPT:** fuera del equipo.
- **Envíos:** ZOOM y MRW con cobro a destino.
- **Clientes:** se borran solo si no tienen nada; si tienen, se desactivan.
- **Dinero:**
  - Nunca sale de la empresa.
  - Comisiones solo por compras pagadas.
  - **Pago Móvil sin orden → al saldo del cliente** (28/09).
  - **Mínimo de compra solo sobre los productos**, sin embalaje ni envío. **Máximo sobre todo lo que paga el cliente** (28/09).
- **Productos (28/09):** el fondo de las fotos se quita desde el teléfono; los usados llevan etiqueta "Usado" y no el sello "ES".
- **Usados (28 y 29/09):** cuatro condiciones (Nuevo, Caja abierta, Reacondicionado, Usado); cupones no, ofertas sí; la garantía la da la tienda (30, 30, 90 y 30 días por defecto); **sin devoluciones por cambio de opinión** (falla, daño o producto distinto se atienden como garantía).
- **Migraciones:** Andrés autorizó siempre (29/09). Aditivas y con respaldo.
- **Panel (30/09, C-140 y C-141):**
  - Dos pasos con app de códigos, obligatorios para todo el panel y sin opción de desactivarlos.
  - Roles: Super admin (el dueño) y Administrador (sin Configuración, Métodos de pago, canales de aviso, publicar documentos legales ni Equipo). Soporte, ventas o contenido: no por ahora.
  - Admins nuevos solo por invitación al correo. Una cuenta de cliente no se convierte en admin.
  - Una sola sesión de admin, 12 horas y cierre tras 1 hora sin uso.
- **Puntos ES al cerrar la cuenta (30/09):** se pierden; no son reembolsables. Se sugiere gastarlos en productos antes.
- **IVA (29/09):** se deja para C-120, junto con la facturación a empresa y la revisión legal.
- **ElectroStudio (28/09):** dos pantallas (inicio y editor); lo agotado o sin publicar avisa y deja descargar; miniaturas reales en la lista.
- **Descuentos (25/09):**
  - Si hay varios, gana el mayor.
  - Los digitales, fuera.
  - Precio tachado.
  - "Pedir descuento" reemplazado por ofertas y cupones.
  - El cupón de monto fijo va primero a los productos sin oferta.
- **Duplicar producto:** el servidor copia todo. La copia nace en borrador y sin stock.
- **Reseñas:** solo con una orden entregada del producto.
- **ElectroStudio:**
  - Nombre, historias en la base y trabajo por fases (26/09).
  - Fase 2 (28/09): la tasa BCV, el aviso de historia vencida, qué historia vende, deshacer y estilos, y el fondo con foto propia. El plan semanal automático quedó fuera.
- **Credenciales del historial (C-40):**
  - Revisado el 26/09: no había nada que cambiar.
  - Si algún día se configura el webhook de SADES, usar un secreto nuevo.
  - Sigue recomendado poner el repositorio en privado.

- **Saldo y Pago Móvil, reglas legales (29/09, C-129):**
  - El saldo solo compra en la tienda: nunca se transfiere a otro cliente, nunca se retira, nunca paga a terceros. Así queda como "esquema de prepago", excluido de la regulación del BCV (Resolución 18-12-01, art. 19).
  - Nunca "billetera", "wallet" ni "monedero" en textos.
  - La comisión del Pago Móvil P2C (hasta 1,5 %, mínimo Bs. 14) la paga la tienda. **No se cobra recargo al cliente**: está prohibido.
  - Lo pagado de más se acredita completo.

## 5. Datos útiles para Claude
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Antes de tocar nada:** `git status`, `git log -3` y `git branch --show-current`. Gemini a veces trabaja en la carpeta principal.
- **Tienda de ejemplo:** esquema `rev10_demo`, con el esquema del 28/09 aplicado.
  - Productos de prueba: audífonos, teclado, gift card y Robux con montos.
  - Cupones de ejemplo (HOLA15, CINCO, FUTURO).
  - Un cliente con teléfono y cédula (`cliente@demo.test`) y un admin (`admin@demo.test`).
- **Servidor de prueba:** build con `DATABASE_URL` de `rev10_demo` y `NEXT_DIST_DIR=.next-test`, y `next start -p 3100` con estas variables:
  - Siempre: `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY= HCAPTCHA_SECRET=test NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"`.
  - Para ver el Pago Móvil en el checkout, además: `BDV_API_KEY=prueba BDV_TELEFONO_COMERCIO=04140000000`.
  - **Al terminar:** borrar `.next-test` y `git checkout tsconfig.json` (Next le agrega la carpeta).
- **Pruebas:**
  - HTTP con Node y un JWT firmado con `encode` de `next-auth/jwt`.
    - Admin: `userType: 'admin'` y, desde C-141, `dosPasos: true` (sin eso no tiene permisos y el `proxy` lo manda a Mi seguridad). Para el flujo real: login por HTTP y el código TOTP calculado con la clave que devuelve `POST /api/admin/dos-pasos {accion:'iniciar'}`.
    - Cliente: `userType: 'customer'` y `emailVerified`.
  - Navegador con Firefox headless y WebDriver BiDi.
    - Para leer un canvas, usar `canvas[role=img]`: el primer `<canvas>` puede ser una miniatura.
    - Detener las animaciones antes de capturar.
- **ESLint:** 0 errores en `app`, `components`, `lib` y `contexts`, y 6 avisos a propósito.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …`.
- **Repositorio público:** nada secreto en archivos versionados. Buscar credenciales antes de cada push.

## 6. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame cómo me fue invitando al equipo (si llegó el correo de invitación y si cada persona configuró sus dos pasos) y si el deploy de C-139 a C-149 terminó bien: hasta qué tarea llegó, si puse 16 en el IVA (C-146), las pruebas de las cotizaciones (C-148b) y las de C-149 (arriba), y mis decisiones de §3c.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la **revisión final** conmigo (`REVISION_FINAL.md`) y arregla lo que salga. Al terminar cada tarea: estado HECHO, `SIGUIENTE.md` con el SQL y las pruebas, merge y push (tú los haces, regla 2 de `CLAUDE.md`), y los pasos del deploy para mí.
> 5. Después, lo que falta del plan (§3e): C-146b (precio sugerido desde el costo), lo comercial de §3c con mis decisiones, y C-107 y C-92 cuando te pase los datos.
