# Lo de ahora (actualizado 2026-10-01, C-161)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **`main`:** todo hasta C-154, más C-156 (el orden de los documentos) y C-161 (la foto de los usados). Igual a GitHub.
- **Producción:** el bloque del 01/10 (`866afe5`, hasta C-151), comprobado desde fuera. En producción el embalaje es de **$1,00** y el envío gratis, desde $300.
- **Falta subir:** C-153, C-154 y C-161 (bloque de abajo). C-156 solo cambia documentos y un guion de SQL: no cambia la tienda.
- **Gemini:** sin ronda abierta. La próxima la escribe Claude.
- **Confirmado por Andrés el 01/10:** el nginx ya pasa la IP real (C-105) y el resto del equipo ya está invitado y funcionando (C-141).

## 2. Deploy pendiente: C-153 · Embalaje según el paquete, C-154 · Confianza antes de pagar y C-161 · Foto de los usados
Pedidos de Andrés del 01/10. Detalle, investigación y pruebas en `estado/C-153.md`, `estado/C-154.md` y `estado/C-161.md`.

- **Lo que sube:** tres tareas, **3 columnas nuevas** (aditivas, todas de C-153). Sin dependencias ni variables de entorno nuevas.
- **El embalaje no cambia** hasta encender el cálculo en Configuración. **La ficha del producto sí cambia al subir** (C-154).

**Qué trae:**
- La tienda arma el paquete con las medidas de cada producto y cobra el empaque que hace falta: un sobre para unos audífonos, una caja para un teclado, y todo lo que se pueda en un solo paquete.
- Embalaje gratis desde un monto, sin que la tienda pague el flete, con el aviso "te faltan $X" en el carrito y en el pago.
- Cada orden guarda cómo se despacha: el panel dice qué empaque usar, qué va dentro, cuántas piezas y el peso para la guía.
- El Dashboard avisa de los productos sin peso o medidas.
- **Ficha del producto (C-154):** una línea encima del botón de compra con la garantía, el envío y el embalaje; la garantía con sus días también en los productos nuevos y cómo se resuelve; el embalaje de ese producto y los montos de embalaje y envío gratis.
- **Foto de los usados (C-161):** la foto recortada de un producto de caja abierta, reacondicionado o usado se arma con fondo blanco y centrada, sin la cinta ES. Antes quedaba pegada a los bordes.

### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git log -1 --oneline`. Debe empezar por `866afe5`. Si dice otra cosa, avisar a Claude antes de seguir.
2. **Respaldo:**
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-c153.dump`
3. **Código y primer intento:** `git pull --ff-only` y `bash scripts/deploy.sh`. El guion **para** y muestra el SQL. Tiene que ser exactamente esto (el orden puede variar):
   ```sql
   ALTER TABLE "orders" ADD COLUMN "packagingPlan" TEXT;
   ALTER TABLE "company_settings" ADD COLUMN "freePackagingThresholdUSD" DECIMAL(65,30),
   ADD COLUMN "packagingRules" TEXT;
   ```
   - Solo `ADD COLUMN`. **Si aparece un `DROP`, un `ALTER ... TYPE` o una tabla que no está aquí: no seguir y avisar a Claude.**
4. **Aplicar y subir:** `npx prisma db push` y `bash scripts/deploy.sh` otra vez.
5. **Comprobar:** `git log -1 --oneline` muestra el último commit de `main`.
6. **De una vez, el redondeo de C-96** (pendiente desde el 24/09; un solo comando, en la misma carpeta):
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
   - Quita el arrastre de los Puntos ES guardados antes del 21/09 (por ejemplo `9.449999999999999` en vez de `9.45`). No cambia lo que ve ningún cliente.
   - Muestra tres números. El último debe ser 0. Si el del medio ("diferencia real") no es 0, pasarle la salida a Claude: esas cuentas no las toca.
   - El respaldo del paso 2 sirve también para esto.

### Pruebas después de subir (unos 10 minutos, en este orden)
1. **Sin tocar nada:** un carrito con un producto físico dice lo de siempre, embalaje de $1,00.
   - **La ficha de un producto físico** (en el teléfono): encima del botón, "Garantía 30 días · Envío nacional · Embalaje $1,00". Debajo, "Garantía de la tienda: 30 días" con "Ver condiciones", y en el envío, "Envío gratis en compras desde $300,00".
   - Una gift card o una recarga: no dice garantía en días ni embalaje.
2. **Configuración → Envíos y retiro → "Embalaje según el paquete":** encender. Aparecen cinco empaques sugeridos a partir de tu $1,00 (sobre $0,30, caja pequeña $0,60, alargada $1,00, mediana $1,00, grande $1,60) y abajo "Así cobra la tienda con estos empaques".
   - **Corrige las medidas con las de tus sobres y cajas reales (por dentro) y pon tus precios.** Guardar.
3. **La ficha de los audífonos Piston** ya dice "Embalaje de este producto: $0,30 (sobre acolchado)". **Carrito** con ellos: "solo el embalaje ($0,30, sobre acolchado)". Agregar el SSD: sigue siendo un sobre.
4. **"Embalaje gratis desde":** pon un monto (por ejemplo $20) y Guardar. El carrito dice "Te faltan $X en productos para el embalaje gratis", con su barra.
5. **Una compra barata con envío.** En el panel, Órdenes → esa orden: bloque "Cómo empacar" con el empaque, lo que va dentro, las piezas y el peso. "Copiar datos para la guía" y pegarlo en un bloc de notas: trae "Piezas", "Peso aprox." y "Empaque".
6. **Dashboard → "Tu tienda: por completar":** avisa del producto sin peso o medidas (hoy, el teclado AOAS). Ponérselos.
7. **La carátula del Grand Theft Auto V PS5 (C-161):** Productos → editar → quitar las dos primeras fotos (son la misma) y volver a subir la carátula. Avisa "Foto lista con fondo blanco, centrada". En el inicio sale con aire alrededor y su etiqueta "CAJA ABIERTA · EXCELENTE".

### Si algo sale mal
- **Sin deploy:** apagar el interruptor de "Embalaje según el paquete". Vuelve el precio único al instante y los empaques se conservan.
- **Volver atrás:** `git reset --hard 866afe5 && npm install && bash scripts/deploy.sh --sin-pull`. Las columnas nuevas no molestan al código anterior.

## 3. Tareas de Andrés (sin código)
En el orden en que más destraban:

**En producción**
1. El deploy de arriba, con sus pruebas y el redondeo de C-96.
2. **La revisión final** ([`REVISION_FINAL.md`](./REVISION_FINAL.md)): en el teléfono real, marcando cada punto. Pendiente desde el 26/09.
3. Pasar a borrador el **"Producto Test"** (Consolas) y renombrar los productos digitales que dicen **"(SALDO)"** (`estado/C-136.md`).
4. **Marca** en cada producto físico (Productos → editar → Marca) e **imagen para compartir** de 1200 × 630 px (Configuración → SEO → Inicio). El Dashboard lo recuerda.

**Medición (antes de pagar un anuncio)**
5. **Google Search Console:** agregar `electroshopve.com`, enviar `https://electroshopve.com/sitemap.xml` y revisar "Páginas" una semana después.
6. **Google Analytics y píxel de Meta:** poner `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` en el `.env` del servidor y correr el deploy (`estado/C-145.md`).
7. Cuando vaya a pagar anuncios en Meta: el catálogo con `https://electroshopve.com/feed/productos.xml` (pasos en `HISTORIAL.md`, C-149).

**Datos que tienen tareas paradas** (`PLAN.md` §7.1)
8. Cuánto tarda de verdad la entrega de un código y de una recarga, y en qué horario se atiende.
9. Medidas y precios reales de los sobres y cajas, el precio del "bulto aparte" y el monto del embalaje gratis.
10. Cuánto cobran ZOOM y MRW en Guanare por el seguro, y si aplica con cobro a destino (C-107).
11. El diagnóstico de clientes borrados (C-92). En el servidor, solo lee:
    `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/diagnostico-c92.sql > ~/diagnostico-c92.txt 2>&1`
    y pasarle a Claude el contenido de `~/diagnostico-c92.txt`.
12. Avisar cuando SADES vuelva (taller).

**Con el abogado y el contador**
13. Abogado: términos y privacidad (`estado/C-120.md` §7) y las 3 afirmaciones de `estado/C-144.md` (el motivo "comprobante vencido o ilegible", los plazos y los datos de contacto).
14. Contador: las preguntas de `estado/C-151.md` (IVA de los digitales), `estado/C-147b.md` (embalaje) y `estado/C-120.md` §6.

**Limpieza opcional, en tu máquina** (todo ya está en `main` o fue reemplazado)
- ChatGPT: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- Ramas locales ya fusionadas: `git branch --merged main` las lista; se pueden borrar con `git branch -d <rama>`.

## 4. Fila de Claude
La lista completa, con lo que espera datos, está en `PLAN.md` §5.2. Lo próximo, en orden:
1. **C-155 · Buscar el producto en la web desde el asistente** (decisiones de Andrés en `PLAN.md` §7.2).
2. **C-157 · Pedir la reseña por correo** unos días después de la entrega.
3. **C-158 · Buscador de la tienda sin acentos.**
4. **C-159 · Cotizaciones:** por correo, "Mis cotizaciones" y la retención del IVA.
5. **C-160 · Menores.**
- En cuanto lleguen los datos de la sección 3: C-154b (plazo de los digitales), C-107 (seguro) y C-92 (clientes).
- Lo que salga de la revisión final se arregla antes que lo demás.

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame si ya subí lo que falta (sección 2), cómo salieron las pruebas y el redondeo de C-96, y si tengo alguno de los datos de la sección 3.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4). Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
