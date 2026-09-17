# PLAN_CHATGPT.md — Rondas de ChatGPT (diseño y jerarquía)

Reglas: `CHATGPT.md` (léelo completo primero). Diseño: `docs/plan/PLAN.md` §1 y §6. Recetas: `lib/admin-ui.ts`.
Hallazgos tomados de capturas reales del 2026-09-16 (tienda de ejemplo, 390 y 1440 px). Los números de línea son aproximados: busca por texto.

**Referencias de cómo se hace en este repo (léelas antes de GPT-01):**
- `app/admin/(dashboard)/marketing/page.tsx` y `marketing/_components/*` (C-75): pantalla dividida por secciones, un archivo por sección, recetas de `admin-ui`, montos que no se cortan a 390 px.
- `app/customer/(dashboard)/layout.tsx` (C-55): cajón móvil con capa, Escape, cierre al navegar y `useBodyScrollLock`.
- `app/registro/page.tsx` (C-84): errores fijos bajo cada campo, foco en el primer error, marco `components/auth/AuthShell.tsx`.

---

## Ronda R1 (pesada) · Panel admin diario, panel de creadores y acceso · GPT-01 → GPT-06

- Rama `chatgpt/R1` desde `main`. Un commit por tarjeta con su `docs/plan/estado/GPT-XX.md`.
- Carga: ~5.900 líneas en 16 archivos.
- Para ver las pantallas con datos: `npm run dev -- -p 3002` con tu `.env`. Si tu base local está vacía, QA con estados vacíos y escribe `QA con datos pendiente`: Claude la repite con la tienda de ejemplo.

### GPT-01 · Dashboard del admin · Depende: —
Archivos: `app/admin/(dashboard)/page.tsx` (557 líneas) y el `className` del contenedor de `{children}` en `app/admin/(dashboard)/layout.tsx` (~l.399).

Hallazgos:
1. **Tarjeta dentro de tarjeta en todo el panel.** El layout envuelve cada página en `rounded-2xl border border-line bg-white p-4 md:p-6` y las páginas ponen sus tarjetas adentro: a 390 px se pierden ~40 px de ancho y todo se ve encajonado dos veces.
   → Quita esa tarjeta en móvil y en escritorio (el fondo `bg-surface` del layout ya separa). **Después abre las 21 secciones del menú a 390 y 1440** y anota en el estado las que quedan con texto suelto sobre gris (fuera de tu carril: `PEDIDO:` para Claude, no las edites).
2. **El saludo azul "Bienvenido, Admin Demo"** ocupa el primer bloque y no dice nada. Sale. Encabezado: "Resumen" + fecha de hoy + acción primaria "Ver tienda" o ninguna.
3. **"Centro de Alertas y Aprobaciones"** es lo más importante y está como tarjetas grandes con títulos de dos líneas ("Pedidos Pendientes", "Creadores de Cursos") y un badge "2 Alertas" que se parte en dos líneas a 390 px.
   → Bloque "Por atender" arriba de todo: una fila por pendiente (ícono, "1 pedido por procesar", flecha), toda la fila es el enlace. Si no hay pendientes, una línea "Todo al día" y nada más.
4. **Métricas:** a 390 px "$150,0" sale cortado y el chip "+1" se sale de su tarjeta; "+0%" no dice contra qué.
   → `grid-cols-2 lg:grid-cols-4`, ícono oculto en móvil, número completo; la variación con texto ("+1 esta semana") o fuera.
5. **Gráfico "Resumen de Ventas":** el total se repite arriba ("Total: $150,00"); fechas "10 sept." bien. Altura menor en móvil.
6. **"Accesos Rápidos":** 4 tarjetas de 120 px con acciones que ya están en el menú. → Fila de botones secundarios compactos o fuera (propónlo en Notas si lo quitas).

QA: 360, 768, 1024 y 1440 px. La primera pantalla a 390 px muestra "Por atender" y las métricas sin cortes.

### GPT-02 · Órdenes · Depende: GPT-01
Archivos: `app/admin/(dashboard)/orders/page.tsx` (976) y `orders/[id]/digital/page.tsx` (467).

**Lógica de C-74 que no se toca:** `estadosSiguientes`, `pideConfirmarPago`, el modal de cancelar con motivo (mínimo 10 caracteres), los `PATCH` a `/api/orders` y sus cuerpos, los toasts con el error del servidor, y la entrega de códigos en la página digital.

Hallazgos:
1. **A 390 px la lista no deja trabajar:** los botones "Comenzar Preparación", "Marcar Enviado" y "Confirmar Pedido" que se ven en escritorio **desaparecen**; solo queda el ojo. → La acción siguiente de cada orden visible en la tarjeta móvil (botón de 44 px de alto).
2. Las 4 métricas ocupan la primera pantalla del teléfono antes del primer pedido. → Una fila compacta deslizable o 2×2 de altura baja, y en móvil debajo de los filtros.
3. "Actualizar" es el único botón azul: es secundario. La búsqueda se corta ("Buscar orden o").
4. Tarjeta: ícono genérico de caja con un mini ícono de estado encima (se leen mal a 16 px), "1 productos", "USD" repetido debajo del monto que ya dice `$`.
   → Número de orden + badge de estado (tono según `CHATGPT.md` §4.4), cliente · fecha · "1 producto", monto a la derecha, acción siguiente. Toda la tarjeta abre el detalle.
5. Filtro "Todas" como `<select>`: en móvil, pestañas deslizables con conteo (Pendientes 1, En proceso 3…) usando los datos que ya llegan.
6. Detalle de la orden (modal): revisa jerarquía (cliente y pago arriba, productos, envío, historial) y que cubra la pantalla a 390 px.

QA: cambiar un estado desde la tarjeta móvil y desde escritorio; cancelar con motivo; abrir el detalle a 390 px.

### GPT-03 · Transacciones, clientes y gift cards · Depende: GPT-02
Archivos: `transactions/page.tsx` (859), `customers/page.tsx` (993), `gift-cards/page.tsx` (526).

Hallazgos:
1. **Transacciones a 390 px muestra la tarjeta móvil y la tabla de escritorio al mismo tiempo**; la tabla se sale de la pantalla. → `lg:hidden` / `hidden lg:block`.
2. Transacciones: "Rechazadas hoy" se sale de su tarjeta; "transacciones canceladas" como subtítulo de un 0; título con ícono azul grande y los botones "Actualizar"/"Exportar CSV" sueltos debajo; filtros en tres filas. Las **pendientes por aprobar** deben ser lo primero (es lo que el admin viene a hacer), con aprobar/rechazar a mano.
3. Clientes: "Gestión de Clientes" → "Clientes". "Clientes Activos" sin explicar qué es activo. La tabla tiene "Ver detalles" en enlace de 12 px; en móvil revisa que haya tarjetas. El modal de detalle: jerarquía y 390 px.
4. Gift cards: a 390 px la primera pantalla son 3 botones (uno de solo ícono sin texto) y 5 métricas; la lista empieza abajo. "Generar impresas" es la primaria; "Vender en caja" secundaria; "Actualizar" ícono con `aria-label`. Métricas en una fila compacta.

QA: aprobar y rechazar una transacción pendiente; exportar CSV; abrir un cliente; generar impresas (modal) a 390 px.

### GPT-04 · Reportes · Depende: GPT-03
Archivo: `reports/page.tsx` (1.150). Si lo divides, `reports/_components/`.

Hallazgos (390 px):
1. Bloque azul "EN VIVO AHORA · 2 activos" con rutas en `font-mono` arriba de todo: dato curioso, no lo primero. → Tarjeta pequeña más abajo o dentro de "Interacciones".
2. Pestañas "Resumen / Productos / In…" cortadas sin indicio de que se deslizan.
3. Métricas: el ícono pisa el monto ("$320,00" toca el ícono); "CLIENTES", "PEDIDOS" en mayúsculas.
4. Gráficos con fechas "2026-09-10" (usa el mismo formato corto del dashboard), dos gráficos de ~350 px apilados. Etiquetas del eje en 11 px sin contraste.
5. "Interacciones" y "Seguridad" con tarjetas grises dentro de tarjetas blancas.
6. El selector "7 días" y el botón de descarga sin texto: `aria-label`.

QA: cambiar el rango, cambiar de pestaña y descargar, a 390 y 1440 px.

### GPT-05 · Panel de creadores en móvil (antes C-79) · Depende: —
Archivos: `app/creator/dashboard/layout.tsx` (176), `dashboard/page.tsx` (204), `dashboard/cursos/page.tsx` (162), `cursos/nuevo/page.tsx` (187), `cursos/[id]/page.tsx` (346), `perfil/page.tsx` (137) y `app/creator/page.tsx` (299).

Hallazgos:
1. **A 390 px el menú lateral fijo de 240 px deja ~138 px al contenido**: "Solicitud en revisión" se lee una palabra por línea y la barra superior corta "Ver catálogo". → Cajón como `app/customer/(dashboard)/layout.tsx` (C-55): botón de menú, capa, Escape, cierre al navegar, `useBodyScrollLock`. Desde `lg`, menú lateral fijo como hoy.
   La barra inferior de la tienda ya no aparece en `/creator/dashboard` (C-84).
2. Flechas escritas como texto ("← Volver a la página de creadores", "Ver catálogo ↗") → `FiArrowLeft` / `FiExternalLink`.
3. Montos del creador: `app/creator/dashboard/page.tsx` y `cursos/page.tsx` tienen `toFixed` (3 y 2). Usa `formatUSD(Number(valor))`: esos valores llegan como texto (C-77).
4. Editor de curso (`cursos/[id]`): jerarquía de pasos (datos, contenido, precio, enviar a revisión) y botones de guardar visibles sin scroll largo en móvil.

QA: creador con solicitud en revisión y creador aprobado (menú, lista de cursos, crear curso) a 390 y 1440 px. El cajón se cierra al navegar y con Escape.

### GPT-06 · Recuperar contraseña y verificar correo · Depende: —
Archivos: `app/recuperar-contrasena/page.tsx` (259), `recuperar-contrasena/[token]/page.tsx` (183), `app/verificar-email/[token]/page.tsx` (127).

Qué hacer: que se vean y se comporten como `app/login` y `app/registro` después de C-84.
1. Marco `import AuthShell from '@/components/auth/AuthShell'` (no lo edites). En el teléfono va sin tarjeta, desde `lg` con tarjeta.
2. Errores fijos bajo el campo con `adminError`, no globos que se borran (`EpicTooltip`). Foco en el campo con error.
3. Campo de correo con `inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}`.
4. Nueva contraseña (`[token]`): muestra las reglas que exige el servidor mientras se escriben, igual que el registro (`REGLAS_CONTRASENA` de `@/lib/validations/registro`, solo importarlo). Si el servidor de esa ruta pide otras reglas, `PEDIDO:` y no inventes.
5. Estados de éxito y de enlace vencido con `FiCheckCircle` / `FiAlertCircle`, un título, una frase y un botón.

QA: pedir recuperación con un correo con mayúsculas; enlace vencido; verificación correcta y vencida; a 360 y 1440 px.

---

## Resultado de GPT-01 y GPT-02 (revisión C-91, 17/09)
**Aprobadas y en `main`.** Ninguna llamada, cuerpo, destino ni guardado cambió. El inventario de acciones se cumplió, y el raspado con física funciona con puntero real a 390 y 1440 px.

Pendientes que se corrigen dentro de R1:
- **Órdenes en el teléfono:**
  - El ojo de "ver detalle" queda solo en una fila: toda la tarjeta abre el detalle y el ojo sale.
  - "Actualizar" es un botón grande: pasa a botón de ícono con `aria-label`.
  - Las métricas se deslizan de lado sin indicio: 2×2 compactas o una fila con degradado de borde.
- Borra `docs/plan/estado/GPT-02-preview.html`: en `estado/` solo van los `GPT-XX.md`.
- Firma cada commit como ChatGPT (`CHATGPT.md` §3). GPT-02 salió firmado "Gemini".

### Resultado de GPT-03 y GPT-04 (revisión C-93, 17/09)
**Aprobadas y en producción.**
- Llamadas, cuerpos, CSV y condiciones de aprobar y rechazar iguales.
- En el teléfono ya no aparece la tabla de escritorio.
- Los reportes sin fechas ISO.

**Otra vez los dos commits salieron firmados "Gemini":** usa `git -c user.name="ChatGPT" -c user.email="chatgpt@electroshop.local" commit`.

Siguen pendientes de R1: los ajustes de GPT-02, **GPT-02b**, GPT-05 (a medias) y GPT-06.

### GPT-02b · "Cliente eliminado" en órdenes sin cliente · Depende: GPT-02
Incidente del 17/09 (`docs/plan/AUDITORIA_CLIENTES_BORRADOS.md`): al borrar clientes en la base, sus órdenes quedan con `userId` nulo y el panel las muestra como "Invitado".
- En `app/admin/(dashboard)/orders/page.tsx`, tarjeta, tabla y detalle:
  - Si `!order.userId && !order.guestEmail` → "Cliente eliminado", con `adminBadge('neutral')` e ícono `FiUserX`.
  - Si hay `guestEmail` → "Invitado" y el correo.
- Si la API no manda `userId` o `guestEmail` en la lista, **no la cambies**: `PEDIDO:` en el estado.

**Criterio:** una orden con `userId` nulo dice "Cliente eliminado" a 390 y 1440 px, y cancelar esa orden sigue funcionando.

---

## Cómo trabajar las rondas largas (R2 y R3)
Claude descansa 3 días: nadie revisa ni mergea hasta que vuelva. Trabaja así para que la revisión sea rápida y nada se pierda:

1. **Ramas encadenadas.** R2 sale de `chatgpt/R1` después del último commit de R1 (`git switch -c chatgpt/R2 chatgpt/R1`), y R3 sale de `chatgpt/R2`. No hagas `git merge main` ni `rebase`.
2. **Un commit por tarjeta, en orden**, firmado como ChatGPT. Si una tarjeta es muy grande, varios commits `[GPT-XX] parte 1/3…`; cada uno compila solo.
3. **Antes de escribir código, en cada tarjeta, crea `docs/plan/estado/GPT-XX.md` con cuatro secciones:**
   - **Mapa:** archivos, líneas, qué pide cada `fetch` y qué recibe.
   - **Inventario de acciones:** cada botón, filtro, atajo y modal, con su permiso.
   - **Problemas:** con captura o medida (px, número de clics hasta la tarea).
   - **Propuesta:** un boceto ASCII de la primera pantalla a 390 px y a 1440 px, y qué se mueve a segundo nivel.
4. **Implementa por partes:**
   1. La estructura: encabezado, barra de filtros y lista.
   2. El detalle y los modales.
   3. Los estados: vacío, cargando y error.

   Corre `npx tsc --noEmit` y `npx eslint` al cerrar cada parte.
5. **Autorrevisión antes del commit:**
   - Los mismos `fetch`, `method`, `body`, `href` y `router.push` que al inicio. Lístalos con `grep -oE "fetch\(|method:|router\.push|href=" <archivo> | sort | uniq -c` antes y después, y pega las dos salidas.
   - El inventario completo, la acción por acción probada, y las capturas a 360, 768, 1024 y 1440 px.
6. **Componentes locales** en `_components/` de la carpeta de la página. Si dos pantallas necesitan la misma pieza, **no la muevas a `components/`**: escribe `PEDIDO:` y Claude decide si pasa a `lib/admin-ui.ts` o a `components/admin/`.
7. **Si te bloqueas** (una API no devuelve lo que la pantalla necesita, un permiso raro):
   - `PEDIDO:` o `BLOQUEADO — motivo` en el estado, y sigues con otra parte.
   - **Nunca cambies una API**: el carril de APIs es de Claude.

---

## Ronda R2 (muy pesada) · Productos del admin · GPT-07 → GPT-11
La zona más compleja del panel (antes C-51 de Claude, reasignada a ChatGPT el 17/09). 5.211 líneas en 19 archivos:
- `products/page.tsx` (1.544): lista, estadísticas, filtros, carga masiva, exportar, edición rápida, pestaña SADES.
- `_components/ProductWizard.tsx` (520) y `wizard/**` (13 archivos): alta y edición por pasos, físico y digital.
- `_components/ProductForm.tsx` (1.057): **sin uso** (ningún archivo lo importa).
- `products/new` y `products/[id]`: envoltorios del wizard.

**Lo que no cambia en R2** (además de las reglas generales):
- `/api/products`, `/api/products/[id]`, `/api/products/bulk/*`, `/api/categories`, `/api/upload`, `/api/admin/sades/*`: mismas URLs, métodos y cuerpos.
- Los tipos de `wizard/types.ts` y las validaciones del wizard (qué campo es obligatorio en qué paso).
- Precios: el admin escribe USD; los bolívares se muestran con `formatVES(usd * tasa)` si la pantalla ya tiene la tasa. **No agregues pedidos de tasa nuevos.**

Hallazgos medidos el 17/09 (tienda de ejemplo):
- **A 390 px la barra de acciones se sale de la pantalla:** "Nuevo Producto" queda cortado a la derecha y "Edición Rápida" no se ve (9 elementos fuera del ancho).
- 5 tarjetas de estadísticas ocupan la primera pantalla del teléfono antes del primer producto.
- Filtros en 3 filas. La tarjeta del producto corta el nombre ("Producto demo…").
- **Precios con formato propio:** "$ 25.00" en el teléfono y "25 USD" en la tabla, en vez de `formatUSD` ("$25,00").
- En escritorio los botones de la barra ponen el ícono encima del texto; las acciones de la fila son 4 íconos sin texto ni `aria-label` visible.
- **7 `alert()` y 1 `confirm()` nativos** en `page.tsx`.

### GPT-07 · Mapa completo de productos · Depende: GPT-06
Solo el documento `docs/plan/estado/GPT-07.md` (sin código):
- **Mapa** de los 19 archivos: qué hace cada uno, qué pide a la API y qué recibe.
- **Inventario** de todas las acciones de la lista, la carga masiva, la edición rápida, la pestaña SADES y cada paso del wizard (físico y digital), con sus validaciones.
- **Flujos** con el número de clics y pasos de hoy:
  - crear un físico y crear un digital con montos,
  - editar el precio o el stock de uno,
  - cambiar muchos a la vez,
  - duplicar, desactivar y borrar.
- **Propuesta:** bocetos ASCII a 390 y 1440 de la lista, de la edición rápida y de cada paso del wizard; qué se fusiona, qué pasa a un menú "Más acciones" y qué sale.
- **Confirmar con `git grep` que `ProductForm.tsx` no se usa** (pega la salida).

### GPT-08 · Lista de productos · Depende: GPT-07
`products/page.tsx`: divídelo en `_components/` (estadísticas, barra de acciones, filtros, tabla, tarjeta móvil, modales), manteniendo el estado en la página.
- **Encabezado:** "Productos" con una sola primaria, "Nuevo producto". Carga masiva, Exportar y Edición rápida van en un menú "Más acciones" o como secundarias que caben a 360 px.
- Pestañas "Catálogo local / ElectroCaja-SADES" con `adminTab`, sin salirse.
- Estadísticas como filtros rápidos: tocar "Sin stock" filtra. En el teléfono, una fila compacta.
- Filtros: búsqueda, categoría y estado en una fila; en el teléfono, búsqueda + botón "Filtros" que abre un panel.
- **Tabla desde `lg`:** imagen, nombre con SKU debajo, categoría, precio con `formatUSD`, stock con color (sin stock `deal`, bajo `warning`), estado con `adminBadge`, y acciones con `aria-label`.
- **Tarjeta en el teléfono:** nombre en 2 líneas, precio, stock, estado; acciones Editar y "Más".
- **`alert()` → `toast`; `confirm()` → `useConfirm`**, con el mismo texto. Borrar un producto pide confirmación en rojo (`adminDangerButton`).
- Vacío, cargando (esqueleto con la forma de la tabla) y error con "Reintentar".

**Criterio:** nada se sale a 360 px, los 8 diálogos nativos quedan en 0 y el inventario de GPT-07 está completo.

### GPT-09 · Carga masiva, exportar y edición rápida · Depende: GPT-08
- **Carga masiva:** los pasos visibles (1. Descarga la plantilla → 2. Súbela → 3. Revisa el resultado); errores por fila legibles; sin cerrar el modal al fallar.
- **Edición rápida:** tabla editable con guardar por fila o "Guardar cambios (N)"; en el teléfono, una tarjeta por producto. Mismo `/api/products/bulk/update` y mismo cuerpo.
- **Pestaña SADES:** estado de conexión arriba (conectado / sin conexión, con la hora de la última sincronización si llega) y "Sincronizar" como única primaria de esa pestaña.

### GPT-10 · Wizard de alta y edición · Depende: GPT-09
`ProductWizard.tsx` y `wizard/**`:
- **Progreso** siempre visible (`WizardProgress`): en el teléfono, "Paso 2 de 4 · Precios" y una barra, no la fila de círculos cortada.
- **Barra inferior fija** con "Atrás" y "Siguiente/Publicar", siempre a mano (encima de `env(safe-area-inset-bottom)`), y "Guardar borrador" si el wizard ya lo tiene.
- **Errores** del paso junto al campo (`adminError`) y un resumen arriba si el servidor rechaza al publicar; foco en el primer campo con error.
- **Tipo de producto** (`StepTypeSelector`): dos tarjetas grandes, iguales de alto, con ejemplos.
- **Imágenes** (`ImagePanel`): arrastrar o tocar para subir, orden visible y la principal marcada; subida con progreso si ya existe. Mismo `/api/upload`.
- **Digital:** plataformas con ícono y nombre (`Step1Platform`), montos como chips editables (`Step2Variants`) y entrega clara (`Step3Delivery`).
- **Publicar** (`StepPublish`): resumen legible de lo que se va a publicar y precio con `formatUSD`.
- **Modal de SADES** (`SadesSearchModal`): recetas de modal y `useBodyScrollLock`; resultados con precio y stock.

**Criterio:** crear un físico y un digital de punta a punta a 390 y 1440 px con los mismos datos enviados que antes. Pega en el estado el cuerpo del `POST` de antes y de después (DevTools → Red): deben ser iguales.

### GPT-11 · Limpieza de productos · Depende: GPT-10
- Borra `_components/ProductForm.tsx` **solo si** `git grep -n "ProductForm" -- app components lib` no devuelve ningún `import` (pega la salida). Es la única eliminación permitida en R2.
- ESLint de todos los archivos de `products/**` sin problemas nuevos. Resuelve los `any` y las variables sin uso de los archivos que tocaste.
- Recorrido final a 360, 768, 1024 y 1440 px de la lista, la edición rápida, la carga masiva, SADES y el wizard.

---

## Ronda R3 (pesada) · El resto del panel con la misma anatomía · GPT-12 → GPT-16
Mismas reglas y método. Cada pantalla sigue `CHATGPT.md` §4.1 (encabezado → por atender → números → filtros → lista → estados).

| ID | Pantallas | Líneas | Foco |
|---|---|---|---|
| **GPT-12** | `payments/**` (métodos de pago) | 1.084 | Qué métodos están activos arriba. Editar cada método en un modal con sus campos. Datos bancarios legibles y con botón de copiar. |
| **GPT-13** | `inquiries/**`, `messages/**` | 990 | Bandeja: sin leer primero, respuesta rápida, estado con badge; en el teléfono lista → detalle a pantalla completa. |
| **GPT-14** | `product-requests/**`, `discount-requests/**` | 816 | Pendientes por aprobar arriba, aprobar y rechazar con motivo en `useConfirm` o modal, y el historial abajo. |
| **GPT-15** | `reviews/**`, `verifications/**` | 654 | Moderación en cola: una reseña o verificación a la vez con aprobar y rechazar a mano. Los documentos de empresa se abren en un visor (misma URL privada). |
| **GPT-16** | `categories/**`, `servicios/**` (trabajos realizados), `legal/**` | 2.101 | Categorías como árbol o lista ordenable si ya existe el orden. Servicios con galería. Legal con editor y vista previa lado a lado desde `lg`. |

**Fuera de R3:** `settings/**`, `marketing/**`, `notifications/**`, `cursos/**`, `creators/**` (Claude) y `layout.tsx`.

**Prompt de arranque:** ver `docs/plan/SIGUIENTE.md` §5.
