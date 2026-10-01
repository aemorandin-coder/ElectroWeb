# Lo de ahora (actualizado 2026-10-01, C-155)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **`main`:** todo hasta C-156, más C-161 (la foto de los usados) y C-155 (buscar el producto en la web). Igual a GitHub.
- **Producción: `6aae5a6`, hasta C-154.** Andrés subió C-153 y C-154 el 01/10 (captura del servidor, y desde fuera: los ajustes públicos ya traen `packagingRules` y la ficha dice "Garantía … · Envío nacional"). Las 3 columnas de C-153 ya están en la base. El embalaje sigue en **$1,00** hasta encender el cálculo.
- **Falta subir:** C-161 y C-155 (bloque de abajo), **sin cambio de base**. C-156 solo cambia documentos y un guion de SQL.
- **Gemini:** sin ronda abierta. La próxima la escribe Claude.
- **Confirmado por Andrés el 01/10:** el nginx ya pasa la IP real (C-105) y el resto del equipo ya está invitado y funcionando (C-141).

## 2. Deploy pendiente: C-161 y C-155
Pedidos de Andrés del 01/10. Detalle y pruebas en `estado/C-161.md` y `estado/C-155.md`.

- **Lo que sube:** dos tareas, **sin cambio de base** y sin dependencias nuevas.
- **Una variable de entorno nueva, opcional:** `GROQ_API_KEY` (la clave de Groq de Andrés). Sin ella todo funciona; la búsqueda de productos sale sin IA.
- Verificado todo junto: `tsc`, `npm run build` y la prueba de humo, **59 de 59**.

**Qué trae:**
- **Foto de los usados (C-161):** la foto recortada de un producto de caja abierta, reacondicionado o usado se arma con fondo blanco y centrada, sin la cinta ES.
- **Buscar el producto en la web (C-155):** en el asistente, debajo del nombre. Trae marca, código de barras, peso y medidas de la caja, especificaciones y un borrador de la descripción, con casillas para elegir. Y el campo **Marca**, que el asistente no tenía.

### Pasos (en el servidor, `/var/www/electroshopve`)
1. **Qué hay ahora:** `git log -1 --oneline`. Debe empezar por `6aae5a6`. Si dice otra cosa, avisar a Claude antes de seguir.
2. **La clave de Groq:** abrir el `.env` (`nano .env`) y agregar al final una línea con tu clave, entre comillas:
   `GROQ_API_KEY="pega-aquí-tu-clave"`
   Guardar (Ctrl+O, Enter) y salir (Ctrl+X). La clave va solo en ese archivo: no se sube a GitHub.
3. **Subir:** `git pull --ff-only` y `bash scripts/deploy.sh`.
   - Esta vez **no hay SQL**: el guion no debería parar. Si para y muestra SQL, no seguir y avisar a Claude.
4. **Comprobar:** `git log -1 --oneline` muestra el último commit de `main`.
5. **El redondeo de C-96** (pendiente desde el 24/09; cambia la base, por eso lleva su respaldo). En la misma carpeta, un comando después del otro:
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump`
   `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
   - Quita el arrastre de los Puntos ES guardados antes del 21/09 (por ejemplo `9.449999999999999` en vez de `9.45`). No cambia lo que ve ningún cliente.
   - Muestra tres números. El último debe ser 0. Si el del medio ("diferencia real") no es 0, pasarle la salida a Claude: esas cuentas no las toca.

### Pruebas después de subir (unos 10 minutos)
1. **Buscar un producto en la web (C-155):** Productos → Nuevo → Producto físico. Escribir "Teclado mecánico Redragon Kumara K552" y tocar "Buscar".
   - En menos de medio minuto sale la lista: "Redragon" marcado, el peso y las medidas como "Estimado" y sin marcar, las especificaciones y la descripción.
   - **Si arriba dice "Los datos vienen de la búsqueda con IA y no se pudieron contrastar"**, los buscadores no le responden al servidor: funciona, pero avisar a Claude.
   - "Usar lo marcado": la marca y la descripción quedan escritas. Salir sin guardar ("Descartar").
2. **La marca (C-155):** editar los audífonos Piston, el SSD y el teclado AOAS y escribirles la **Marca** (campo nuevo, junto a la categoría). Guardar.
3. **La carátula del Grand Theft Auto V PS5 (C-161):** Productos → editar → quitar las dos primeras fotos (son la misma) y volver a subir la carátula. Avisa "Foto lista con fondo blanco, centrada". En el inicio sale con aire alrededor y su etiqueta "CAJA ABIERTA · EXCELENTE".

### Pruebas de C-153 y C-154, si faltan (ya están en producción)
1. **Configuración → Envíos y retiro → "Embalaje según el paquete":** encender. Aparecen cinco empaques sugeridos a partir de tu $1,00 (sobre $0,30, caja pequeña $0,60, alargada $1,00, mediana $1,00, grande $1,60) y abajo "Así cobra la tienda con estos empaques".
   - **Corrige las medidas con las de tus sobres y cajas reales (por dentro) y pon tus precios.** Guardar.
2. **La ficha de los audífonos Piston** dice "Embalaje de este producto: $0,30 (sobre acolchado)". **Carrito** con ellos: "solo el embalaje ($0,30, sobre acolchado)". Agregar el SSD: sigue siendo un sobre.
3. **"Embalaje gratis desde":** pon un monto (por ejemplo $20) y Guardar. El carrito dice "Te faltan $X en productos para el embalaje gratis", con su barra.
4. **Una compra barata con envío.** En el panel, Órdenes → esa orden: bloque "Cómo empacar" con el empaque, lo que va dentro, las piezas y el peso. "Copiar datos para la guía" trae "Piezas", "Peso aprox." y "Empaque".
5. **Dashboard → "Tu tienda: por completar":** avisa del producto sin peso o medidas (hoy, el teclado AOAS). Ponérselos.

### Si algo sale mal
- **La búsqueda en la web** no toca nada si no se usa. Quitar la línea `GROQ_API_KEY` del `.env` la deja sin IA.
- **Volver atrás:** `git reset --hard 6aae5a6 && npm install && bash scripts/deploy.sh --sin-pull`.
- **El embalaje según el paquete** (C-153) se apaga con su interruptor: vuelve el precio único al instante.

## 3. Tareas de Andrés (sin código)
En el orden en que más destraban:

**En producción**
1. El deploy de arriba, con sus pruebas y el redondeo de C-96.
2. **La revisión final** ([`REVISION_FINAL.md`](./REVISION_FINAL.md)): en el teléfono real, marcando cada punto. Pendiente desde el 26/09.
3. Pasar a borrador el **"Producto Test"** (Consolas) y renombrar los productos digitales que dicen **"(SALDO)"** (`estado/C-136.md`).
4. **Marca** en cada producto físico (paso 3 de las pruebas) e **imagen para compartir** de 1200 × 630 px (Configuración → SEO → Inicio). El Dashboard lo recuerda.
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
1. **C-157 · Pedir la reseña por correo** unos días después de la entrega.
2. **C-158 · Buscador de la tienda sin acentos.**
3. **C-159 · Cotizaciones:** por correo, "Mis cotizaciones" y la retención del IVA.
4. **C-160 · Menores.**
- En cuanto lleguen los datos de la sección 3: C-154b (plazo de los digitales), C-107 (seguro) y C-92 (clientes).
- Lo que salga de la revisión final y de las pruebas del deploy se arregla antes que lo demás.

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Pregúntame si ya subí lo que falta (sección 2), cómo salieron las pruebas (sobre todo la búsqueda en la web desde el servidor) y el redondeo de C-96, y si tengo alguno de los datos de la sección 3.
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4). Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
