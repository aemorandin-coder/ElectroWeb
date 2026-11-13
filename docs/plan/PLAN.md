# Plan maestro — ElectroShopVe WEB

> **Al día: 2026-11-10 (C-196).** Este archivo es el plan completo: objetivo, sistema de diseño, carriles, tablero y decisiones. Los números de sección no cambian: `CLAUDE.md` y `GEMINI.md` los citan.

| Documento | Para qué |
|---|---|
| [`SIGUIENTE.md`](./SIGUIENTE.md) | Lo de ahora: qué falta subir, las tareas de Andrés y la fila de Claude. Se lee al empezar cada sesión. |
| **`PLAN.md`** (este) | El plan: objetivo (§0), diseño (§1 a §3), carriles (§4), tablero y lista de pendientes (§5), QA (§6) y decisiones (§7). |
| [`OPERACION.md`](./OPERACION.md) | Servidor, deploy, vuelta atrás, entorno local y pruebas. |
| [`HISTORIAL.md`](./HISTORIAL.md) | Lo ya subido, con su SQL y sus pruebas. |
| [`PLAN_CLAUDE.md`](./PLAN_CLAUDE.md) | Registro de las tareas `C-*`: una fila por tarea. |
| [`PLAN_GEMINI.md`](./PLAN_GEMINI.md) | Rondas y tarjetas `G-*`. Hoy no hay ronda abierta. |
| [`estado/`](./estado/) | Un archivo por tarea (`C-01.md`, `G-05a.md`…): qué cambió, cómo se verificó y qué quedó. |
| `AUDITORIA*.md` | Los siete diagnósticos. Cada uno abre con su cierre: qué tarea resolvió cada hallazgo y qué sigue abierto. |
| [`REVISION_FINAL.md`](./REVISION_FINAL.md) | La lista de revisión en producción, con Andrés. |
| [`/CLAUDE.md`](../../CLAUDE.md) y [`/GEMINI.md`](../../GEMINI.md) | Reglas de cada agente. `CHATGPT.md` y `PLAN_CHATGPT.md` quedan como historial. |
| `docs/API_SADES_EWEB.md` y `docs/INTEGRACION_PAGO_MOVIL_BDV.md` | Referencia de dos sistemas externos: la API de SADES y la de Conciliación del BDV. |

## 0. Objetivo

**El plan original (12/09), cumplido:** las fases 0 a 3 están cerradas y en producción.
1. **El home vende.** Lo primero que se ve son productos con precio y botón de compra, no un mensaje. La estructura toma a BestBuy como referencia: buscador protagonista en el header, franja de categorías, vitrinas de productos y confianza.
2. **ElectroShop sigue siendo ElectroShop.** Se conservan el wordmark Tektrron con degradado azul, el azul `#2a63cd`, la barra inferior móvil oscura y el tono cercano en español venezolano.
3. **Primero se blindan el dinero y los datos**, antes de tocar un píxel (Fase 0).
4. **Dos agentes sin choques:** carriles de archivos separados, dependencias explícitas y un archivo de estado por tarea.

**Desde el 30/09 (meta de Andrés), en curso:**
5. **La tienda es la vitrina digital de la empresa para todo el país.** Que Google, las redes y las IA encuentren el catálogo; anuncios que se puedan medir; ventas a empresas e instituciones.
6. **Una empresa formal y seria.** La web no emite facturas: prepara los datos y SADES o el talonario facturan. El IVA va a la vista y los términos solo prometen lo que la tienda cumple.
7. **Que comprar sea fácil y dé confianza:** pagar con los métodos reales, saber cuánto cuesta el envío y el embalaje antes de pagar, y ver la garantía junto al botón.

---

## 1. Sistema de diseño (fuente de verdad)

Claude lo implementa en C-10/C-11. Gemini **solo usa** estas clases y no inventa otras.

### 1.1 Paleta (tokens `@theme` → clases Tailwind)

| Token | Hex | Clase ejemplo | Uso |
|-------|-----|---------------|-----|
| `brand-50` | `#f4f7fc` | `bg-brand-50` | Fondos de chips o estados seleccionados |
| `brand-100` | `#eaeffa` | `bg-brand-100` | Hover suave |
| `brand-200` | `#d4e0f5` | `border-brand-200` | Bordes activos |
| `brand-300` | `#aac1eb` | | Texto sobre azul oscuro |
| `brand-400` | `#7599de` | | Íconos sobre oscuro |
| **`brand-500`** | **`#2a63cd`** | `bg-brand-500` | **Color de marca: botones, links, precio destacado** |
| `brand-600` | `#1e4ba3` | `hover:bg-brand-600` | Hover de botón, franja de navegación |
| `brand-700` | `#1a3b7e` | | Fondos oscuros de marca |
| `brand-800` | `#142d61` | | |
| `brand-900` | `#0e1f44` | | |
| `brand-950` | `#0a1530` | `bg-brand-950` | Barra inferior móvil y drawer (reemplaza `#0f172a`) |
| `ink` | `#212529` | `text-ink` | Texto principal |
| `ink-soft` | `#495057` | `text-ink-soft` | Texto secundario fuerte |
| `muted` | `#6a6c6b` | `text-muted` | Texto secundario (gris de marca) |
| `subtle` | `#adb5bd` | `text-subtle` | Solo íconos, placeholders y deshabilitados (**no** para texto que haya que leer) |
| `line` | `#e9ecef` | `border-line` | Bordes |
| `line-strong` | `#dee2e6` | `border-line-strong` | Divisores marcados |
| `surface` | `#f8f9fa` | `bg-surface` | Fondo de secciones y página |
| `accent` | `#22d3ee` | `text-accent` | Detalle cian, solo sobre fondos oscuros |
| `deal` | `#dc2626` | `text-deal` | "Ahorra $X", % de descuento |
| `deal-bg` | `#fef2f2` | `bg-deal-bg` | Fondo del badge de oferta |
| `tag` | `#f59e0b` | `bg-tag text-ink` | Etiqueta amarilla estilo BestBuy ("Oferta del día") |
| `success` | `#10b981` | `text-success` | "En stock" |
| `success-strong` | `#047857` | | Texto verde sobre blanco (5,5:1; era `#059669`, 3,8:1, cambiado en C-30) |
| `warning` | `#f59e0b` | | "Quedan 3" |
| `warning-strong` | `#b45309` | | Texto ámbar sobre blanco (5,0:1; era `#d97706`, 3,2:1, cambiado en C-30) |
| `danger` | `#ef4444` | `text-danger` | Errores |
| `info` | `#3b82f6` | | Avisos informativos |
| `whatsapp` | `#25d366` | `bg-whatsapp` | Única excepción de marca externa |
| `navidad` | `#e0263a` | `fill-navidad`, `text-navidad` | Solo el tema navideño (C-186): el rojo del gorro de Santa. Las ofertas siguen con `deal` y los errores con `danger` |

**Reglas de color**
- Neutros: solo `ink`, `ink-soft`, `muted`, `subtle`, `line`, `line-strong`, `surface` y la escala `gray-*`. **`slate-*` desaparece.**
- Degradado de marca permitido: `from-brand-500 to-brand-600` (botón CTA) y `from-brand-600 to-brand-700` (bloques oscuros). Nada de `indigo`, `purple` o `pink` en la tienda.
- Prohibido `blur-[80px]` o mayor y blobs animados de fondo en la tienda: pesan demasiado en Android de gama baja.
- Texto sobre azul: `text-white` o `text-white/80` como mínimo. Nunca `/40` ni `/60` para texto que haya que leer.

**Jerarquía del color (C-192, 06/11: "el ámbar se repite en todo el proyecto y se ve genérico")**
- **Azul de marca:** lo que se hace (botones, enlaces) y lo que la tienda destaca ("Destacado", el nivel de un curso, el monto a pagar).
- **Azul noche (`brand-950`):** la pieza fuerte de una pantalla o de un correo, **una sola**, con texto blanco y el cian (`accent`) de acento: el certificado, la gift card, un código. Es la variante B que se eligió el 06/11 viendo las maquetas.
- **Neutros:** la estructura: tarjetas, notas, mensajes, datos.
- **Colores de estado, solo para estados:** verde = hecho (pagado, acreditado, en stock); **ámbar = alguien tiene que hacer algo** (falta pagar, falta verificar el correo, falta firmar, poco stock, por revisar, sin guardar); rojo = error, rechazo o descuento (`deal`).
  - Esperar no es un aviso: "En preparación", "Se acredita el…", "En revisión" (para quien espera) van en azul.
  - El ámbar nunca destaca, celebra ni clasifica (un nivel, una categoría, "Antes", una marca ajena como Binance).
- **Excepciones con nombre:** las estrellas de calificación (ámbar), la etiqueta amarilla `tag` de "Oferta del día" (con texto `ink`), el rojo `navidad` del tema y el recuadro ámbar de "Lo que no incluye" de las cotizaciones (Luis, C-182).
- **Nunca texto blanco sobre ámbar ni sobre el verde claro (`success`):** no llega a 3:1. Sobre el verde fuerte (`success-strong`) sí: 5,5:1, como "Envío gratis" en la tienda y las píldoras de lo hecho en el panel (§1.8).
- **Un correo, un acento:** el azul del botón y, si hace falta, una placa en azul noche (`placaCorreo` de `lib/email-templates/estilo.ts`). Lo demás, neutro.

### 1.2 Tipografía

| Rol | Fuente | Clase |
|-----|--------|-------|
| UI y lectura | **Inter** variable, local (`next/font/local`) | `font-sans` (default) |
| Wordmark "ELECTRO SHOP" | Tektrron | `font-brand` (solo logo en header y footer) |
| Nakadai | — | **Se elimina** |

| Nivel | Móvil | Desktop | Peso |
|-------|-------|---------|------|
| H1 de página | `text-2xl` | `lg:text-4xl` | `font-bold` |
| H2 de sección ("Ofertas", "Lo más vendido") | `text-xl` | `lg:text-2xl` | `font-bold` |
| H3 / título de card grande | `text-lg` | | `font-semibold` |
| Precio en card | `text-xl` | | `font-bold` |
| Nombre de producto en card | `text-sm` | | `font-medium` |
| Cuerpo | `text-base` / `text-sm` | | `font-normal` |
| Label, botón, nav | `text-sm` | | `font-semibold` |
| Metadatos, precio Bs., badges | `text-xs` (12px) | | `font-medium` |
| Badge en mayúsculas de 1 palabra | `text-[11px]` + `tracking-wide` | | `font-semibold` |

- **Prohibido:** `text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[9.5px]`, `text-[10px]`. El mínimo absoluto es 11px, y solo en badges.
- `font-black` y `font-extrabold` se eliminan de la tienda; se usa `font-bold`.

### 1.3 Capas (z-index)
Variables CSS definidas por Claude en C-10. Uso: `z-[var(--z-modal)]`.

| Variable | Valor | Quién |
|----------|-------|-------|
| `--z-sticky` | 30 | Barras sticky dentro de páginas |
| `--z-header` | 40 | Header |
| `--z-dropdown` | 50 | Menús del header, mega menú |
| `--z-bottomnav` | 60 | Barra inferior móvil, WhatsApp |
| `--z-drawer` | 70 | Filtros móviles, drawer "Más" |
| `--z-modal` | 80 | Modales |
| `--z-toast` | 90 | Toasts |
| `--z-popup` | 100 | Popup promocional |

Todo panel fijo en móvil que tenga botones abajo usa `pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))]` o una capa `--z-drawer` o superior.

### 1.4 Formato de precios
Un único módulo, `lib/currency.ts` (C-12): `formatUSD(1099)` → `$1.099,00` y `formatVES(40113.5)` → `Bs. 40.113,50`. Nadie más usa `toFixed` ni `Intl.NumberFormat` para precios.

### 1.5 Anchos: cada contenedor, del tamaño de lo que lleva (C-205)
Lo pidió Andrés el 13/11: un campo con un "30" ocupaba 380 px, y los contenedores anchos desordenaban las rejillas. Vale para el panel y para la web.

**La página:** en el panel empieza junto al menú y ocupa el ancho del marco (hasta 1600 px), como las demás. No se centra una página angosta dentro del marco ancho (`mx-auto max-w-…`): deja un hueco junto al menú y despega el título de la cabecera (Andrés lo marcó el 13/11). Lo que se limita es lo de adentro:
- un formulario o un ajuste, hasta 48 rem (`max-w-3xl`), a la izquierda de su tarjeta;
- un texto para leer, hasta 65 caracteres por línea (`max-w-prose`);
- una tabla o un tablero, todo el ancho.

**Los campos, según su dato:**
- un número corto con unidad (%, und., kg): `CampoUnidad`, 8 rem;
- un nombre, un proveedor, una categoría, una ciudad: hasta 24 rem (`sm:max-w-sm`);
- una búsqueda: hasta 24 rem; un texto largo, todo el ancho del formulario.

**Además:**
- Las rejillas de formulario no pasan de 2 columnas.
- Un dato corto no se estira para llenar una columna: si sobra espacio, queda a la izquierda.
- La ayuda de un campo no pasa de 65 caracteres por línea (`adminHint` ya lleva `max-w-prose`).
- No se mete una tarjeta dentro de otra: dentro de una tarjeta, los grupos se separan con espacio o con una línea.

### 1.6 Trabajos de varios pasos (C-205)
Un trabajo de más de dos pasos (cargar una lista, un asistente) lleva `components/admin/Pasos`, pegado bajo la cabecera.
- Se ve en qué paso estás, lo que ya hiciste (en verde, con un resumen de lo que elegiste) y lo que sigue. En el teléfono: "Paso N de M", lo que sigue, una barra y "Ver pasos".
- Un paso a la vez, en una tarjeta con su título, una línea de qué hacer y un pie pegado abajo:
  - a la izquierda, "Atrás";
  - a la derecha, "Siguiente: …", diciendo adónde lleva;
  - si todavía no se puede, el botón queda apagado y el pie dice por qué.
- Se puede volver a lo hecho, y saltar a un paso cuando ya tiene lo que necesita.
- Es el mismo dibujo del asistente de productos (`WizardProgress`).

### 1.7 Filtros en píldoras (C-205)
Los filtros de una lista van con `components/admin/Filtros`:
- **Cada píldora lleva** un ícono del pack, el nombre, la cuenta y un subtítulo de pocas palabras que dice qué junta ("Hay en su depósito", "Se pueden publicar").
- **La elegida**, en azul.
- **Una que junta lo que alguien tiene que revisar** lleva el ícono en ámbar (§1.1).
- **Una con cuenta 0** se apaga, pero se puede tocar.
- **En el teléfono** se deslizan de lado.
- Son botones con `aria-pressed`, no pestañas.

### 1.8 Píldoras de estado y botones del panel (C-210)
Andrés eligió la versión A ("como la tienda") el 13/11, para todo el panel.
- **El estado va lleno y con texto blanco,** como los sellos de la tienda ("DIGITAL", "Envío gratis"):
  - azul (`brand-600`) para lo que avanza;
  - verde fuerte (`success-strong`) para lo hecho;
  - rojo (`deal`) para lo cancelado o rechazado.
  - Es `adminBadge`. El estado de una orden lleva además su ícono (`components/admin/PildoraEstadoOrden`).
- **Lo que alguien tiene que hacer sigue en ámbar claro con texto oscuro:** nunca texto blanco sobre ámbar (§1.1).
- **Un dato en píldora** (una guía, un código) va en gris con su ícono (`adminDato`): informa sin competir con el estado.
- **Los botones** (`adminPrimaryButton`, `adminSecondaryButton`, `adminIconButton`…) se levantan un poco al pasar el ratón y se hunden al tocarlos. Con "reducir movimiento" solo cambian de color, y apagados no se mueven.

---

## 2. Rediseño del header

> **Hecho** (C-20, C-21, C-32, C-54). Queda como referencia del diseño. Cambios posteriores: "Ofertas" en la franja y en "Más" del teléfono (C-102), y el menú de la cuenta muestra el rol del equipo (C-143).

### Desktop (≥1024px)
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [logo] ELECTRO SHOP │ [🔍 Buscar laptops, gift cards, consolas…          ][Buscar] │ 🔔 🛒² (A) │  fila 1 · h-16 · blanco
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ☰ Categorías ▾ │ Ofertas │ Gift Cards │ {cat 1} │ {cat 2} │ Servicios │ Cursos │  Bs 36,50 · Envíos a toda VE │  fila 2 · h-10 · brand-600
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- Se mantiene la identidad: fondo blanco translúcido, wordmark con degradado y los mismos íconos de notificaciones, carrito y cuenta.
- **El buscador pasa al header**, centrado y ancho (máx. 720px). Envía a `/productos?search=`.
- La fila 2 es la franja estilo BestBuy. "☰ Categorías" abre un mega menú con las categorías de la base de datos y sus íconos (`Category.icon`). `{cat 1}` y `{cat 2}` son las 2 categorías con más productos, no texto fijo.
- A la derecha de la franja va la tasa BCV (`exchangeRateVES`) como señal de confianza.
- **Se elimina** el cambio de color por scroll (B14) y las animaciones perpetuas de los íconos.

### Móvil (<1024px)
```
┌─────────────────────────────────┐
│ [logo] ELECTRO SHOP    🔔 🛒² (A) │  h-14
│ [🔍 ¿Qué estás buscando?       ] │  h-12 · se oculta al bajar, reaparece al subir
└─────────────────────────────────┘
          … contenido …
┌─────────────────────────────────┐
│ Inicio  Productos  Categorías  Carrito  Más │  barra flotante brand-950 (se mantiene)
└─────────────────────────────────┘
```
- Un solo breakpoint: **todo lo "móvil" cambia en `lg`** (arregla B13).

---

## 3. Rediseño del home

> **Hecho** (C-22, C-26, C-95). Queda como referencia del diseño. Cambios posteriores: el popup promocional sale solo en el home y como mucho una vez al día (C-23, C-25), la barra de confianza muestra solo los métodos de pago activos y las tarjetas llevan oferta, "Usado" y la cinta ES (C-102, C-119, C-133).

Todo se renderiza en el servidor (`revalidate = 60`). Solo son componentes cliente: `AddToCartButton`, `ShareButton` y el buscador. Una sección con menos de 4 productos no se muestra.

### Orden de secciones

| # | Sección | Datos | Reemplaza |
|---|---------|-------|-----------|
| 1 | **Vitrina** (ocupa el lugar del hero) | destacados (`isFeatured`, límite `maxFeaturedProducts`) | Hero con título y buscador |
| 2 | Rail de categorías con íconos | `showCategories`, `maxCategoriesDisplay` | — |
| 3 | **Ofertas** | `compareAtPriceUSD > priceUSD`, orden por % de ahorro | — (el dato existía y nunca se mostraba) |
| 4 | **Lo más vendido** | `OrderItem` agrupado por producto, últimos 90 días, órdenes no canceladas | — |
| 5 | Franja digital: PlayStation, Xbox, Steam, Roblox, Google Play, Apple | fijo + link a `/gift-cards` | "Catálogo Digital" (más compacto) |
| 6 | **Recién llegados** | `createdAt desc` | — |
| 7 | 1 shelf por cada una de las 3 categorías principales | categorías con más productos publicados | — |
| 8 | Barra de confianza: Pago Móvil · Binance · Zelle · PayPal · efectivo · envíos nacionales · garantía · soporte WhatsApp | settings | "¿Cómo funciona?" |
| 9 | "Más de ElectroShop": 3 banners compactos (Servicio técnico, Academia, Creadores) | fijo | Servicios + promo cursos/creadores |
| 10 | Video reviews | `heroVideoEnabled` | igual |

**Sale del home:** el hero de mensaje, "¿Cómo funciona?" (ya existe en `/productos`), el CTA de registro para usuarios logueados, los blobs animados y el efecto de escritura en el placeholder.

### Vitrina — desktop
```
┌──────────────────────────────────── max-w-7xl ────────────────────────────────────┐
│ Destacados de la semana                                                  Ver todo →│
│ ┌──────────── Producto estrella (7/12) ────────────┐ ┌────── 2×2 (5/12) ─────────┐ │
│ │ [-15%] [OFERTA]                        [↗]       │ │ ┌─────────┐ ┌─────────┐   │ │
│ │           ┌──────────────┐                        │ │ │  img    │ │  img    │   │ │
│ │           │  imagen 1:1  │   MARCA · Categoría    │ │ │ nombre  │ │ nombre  │   │ │
│ │           │   grande     │   Nombre del producto  │ │ │ $199    │ │ $49     │   │ │
│ │           └──────────────┘   ★★★★☆ (12)           │ │ │[Agregar]│ │[Agregar]│   │ │
│ │                              $1.099,00 $̶1̶.̶2̶9̶9̶     │ │ └─────────┘ └─────────┘   │ │
│ │                              Ahorra $200          │ │ ┌─────────┐ ┌─────────┐   │ │
│ │                              Bs. 40.113,50        │ │ │  …      │ │  …      │   │ │
│ │                              ● En stock           │ │ └─────────┘ └─────────┘   │ │
│ │                              [Agregar al carrito] │ │                           │ │
│ └───────────────────────────────────────────────────┘ └───────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Vitrina — móvil
```
┌─────────────────────────────────┐
│ (Laptops)(Consolas)(Gift)(Audio)→│  chips de categorías, scroll horizontal
│ Destacados              Ver todo │
│ ┌──────────────────────┐ ┌──────│  cards a 78vw con scroll-snap (se asoma la siguiente)
│ │ [-15%]            [↗]│ │      │
│ │     imagen 1:1       │ │      │
│ │ Nombre producto      │ │      │
│ │ $1.099,00 $̶1̶.̶2̶9̶9̶     │ │      │
│ │ Bs. 40.113,50        │ │      │
│ │ [ Agregar al carrito ]│ │      │
│ └──────────────────────┘ └──────│
│ Ofertas                 Ver todo │
│ ┌─────────┐ ┌─────────┐ ┌───    │  shelves a 44vw (2 visibles + asomo)
└─────────────────────────────────┘
```

### ProductCard v2 (anatomía)
```
┌──────────────────────────┐
│ [-15%] [Nuevo]      [↗]  │  badges: Oferta (deal), Nuevo (≤14 días), ⚡ Digital, Agotado
│                          │
│       imagen 1:1         │  fondo blanco, object-contain, p-3, next/image con sizes correctos
│                          │
├──────────────────────────┤
│ MARCA · Categoría        │  text-xs text-muted
│ Nombre del producto en   │  text-sm font-medium text-ink line-clamp-2 min-h-10
│ dos líneas máximo        │
│ ★★★★☆ 4.5 (12)           │  text-xs, solo si hay reseñas aprobadas
│ $1.099,00                │  text-xl font-bold text-ink
│ $̶1̶.̶2̶9̶9̶,̶0̶0̶  Ahorra $200    │  text-xs line-through text-muted + text-deal font-semibold
│ Bs. 40.113,50            │  text-xs text-muted
│ ● En stock · Quedan 3    │  text-xs success / warning (usa lowStockThreshold)
│ [  Agregar al carrito  ] │  bg-brand-500 h-10 (h-11 en móvil), siempre visible, sin hover
└──────────────────────────┘
```
- Patrón *stretched link*: `<article class="relative">`, el nombre es un `<Link>` con `after:absolute after:inset-0` y los botones van `relative z-10`. Así no hay botones dentro de links (arregla B10).
- Nada importante depende del hover.

---

## 4. Carriles (quién puede tocar qué)

**El equipo (desde el 21/09):**
| Quién | Qué hace |
|---|---|
| **Claude** | Todo lo que pide criterio: seguridad, dinero, datos, arquitectura, componentes compartidos y el rediseño de las pantallas. Revisa el trabajo de Gemini, hace el merge a `main` y el push. |
| **Gemini** | Tareas mecánicas y cerradas, solo con una tarjeta `G-*` abierta. |
| **Andrés** | Decide el negocio (§7), hace el deploy y las pruebas en producción, y trae los datos reales. |

ChatGPT salió del equipo el 21/09. Sus pantallas (panel admin, `app/creator/**`, `app/recuperar-contrasena/**`, `app/verificar-email/**`) son de Claude, que las rediseña con el método de `CHATGPT.md` §4.

### Carril CLAUDE
Todo el repositorio, salvo el carril Gemini de abajo. Lo que más pesa:
```
app/api/**            prisma/**             lib/**               contexts/**          scripts/**
proxy.ts              next.config.js        package.json         *.config.*
app/layout.tsx        app/providers.tsx     app/globals.css      app/page.tsx         app/robots.ts   app/sitemap.ts
app/productos/**      app/categorias/**     app/carrito/**       app/checkout/**      app/p/**
app/cotizacion/**     app/feed/**           app/llms.txt/**      app/sesion/**        app/certificado/**
app/login/**          app/registro/**       app/recuperar-contrasena/**   app/verificar-email/**   components/auth/**
app/admin/**          components/admin/**   app/creator/**
components/public/**  components/home/**    components/ui/**     components/catalog/**   components/product/**
components/checkout/**   components/cart/**   components/cotizaciones/**   components/envios/**   components/warranty/**
components/notifications/**   components/legal/**   components/seo/**   components/forms/**   components/gift-card/**
components/Footer.tsx   components/CartIcon.tsx   components/UserAccountButton.tsx   components/WhatsAppButton.tsx
components/HotAdOverlay.tsx   components/AnalyticsTracker.tsx
CLAUDE.md  GEMINI.md  CHATGPT.md  README.md  docs/plan/*.md  docs/plan/estado/C-*.md
```

### Carril GEMINI (solo con una tarjeta `G-*` abierta)
```
app/customer/**          components/customer/**
app/cursos/**            components/cursos/**
app/servicios/**         components/servicios/**
app/contacto/**          components/contact/**
app/gift-cards/**        app/canjear-gift-card/**
app/solicitar-producto/**  app/privacidad/**  app/terminos/**
components/modals/**  components/reviews/**  components/orders/**  components/social/**
components/pago-movil/**  components/onboarding/**
docs/plan/estado/G-*.md
```
- La lista exacta y sus excepciones por ronda están en `GEMINI.md` §2, que es la que manda.
- **En el carril de Claude, Gemini solo hace arreglos mecánicos y solo cuando una tarjeta nombra el archivo** (clases, textos, tipos): nada de lógica, permisos, cálculos ni peticiones.
- **Claude entra al carril Gemini cuando Andrés pide un rediseño o hay dinero de por medio** (panel del cliente en C-128, C-137, C-138 y C-139; términos en C-144). Lo anota en el estado y en `GEMINI.md`.
- Si una ronda de Gemini necesita un archivo de Claude, Claude lo autoriza en la tarjeta antes de empezar.

### Protocolo anti-choque
1. **Carpetas separadas.** Claude trabaja en la carpeta principal, en ramas `claude/<ID>`. Gemini trabaja en su carpeta (`../ElectroShopVe-gemini`), en una rama por ronda (`gemini/RN`) creada desde `main` actualizado, con un commit por tarea.
2. **Claude integra a `main` y sube** (regla de Andrés del 30/09): `git merge --no-ff --no-edit`, comprobar que entra exactamente lo revisado y que no hay credenciales, y `git push`. Gemini nunca hace merge ni push. Nadie hace push `--force`, `rebase` de ramas ajenas ni `reset --hard` sobre `main`.
3. **Una tarea = una rama = uno o varios commits con prefijo** `[C-155]` o `[G-70]`.
4. **Dependencias duras:** una tarea no empieza si su dependencia no figura como `HECHO` en `main`.
5. **Estado:** al terminar (o bloquearse) una tarea, el agente crea `docs/plan/estado/<ID>.md` con `Estado: HECHO` o `Estado: BLOQUEADO — motivo`, dentro del mismo commit. Nunca edita archivos de estado del otro prefijo.
6. **Si Gemini necesita algo del carril Claude** (un token, un componente, una ruta de API), lo escribe como `PEDIDO:` en el estado de su tarea y sigue con otra.
7. **El deploy lo hace Andrés, en un solo bloque:** Claude deja en `SIGUIENTE.md` una sola sección con el SQL total, las pruebas y la vuelta atrás (`OPERACION.md` §2).
8. **Migraciones:** solo aditivas y con respaldo (autorizadas el 29/09). Borrar datos pide el OK de Andrés.

---

## 5. Tablero

Una fila por tarea en `PLAN_CLAUDE.md` y `PLAN_GEMINI.md`; el detalle, en `estado/<ID>.md`. Aquí va el mapa.

### 5.1 Lo hecho (132 tareas de Claude, 82 de Gemini y 6 de ChatGPT, al 02/10)

**Plan original (12/09):**
| Fase | Tareas | Qué dejó |
|---|---|---|
| 0 · Blindaje | C-01 a C-08, C-50a, C-70, C-72 | Órdenes y totales calculados en el servidor, DTO públicos, settings con lista blanca, carrito sin duplicados, rutas limpias, captcha real y los huecos de seguridad del panel cerrados. |
| 1 · Fundaciones | C-10 a C-13 | Tokens de color y capas, Inter, primitivas (`ProductCard`, `Price`, `useBodyScrollLock`, `lib/currency.ts`) y las queries del home. |
| 2 · Header y home | C-20 a C-27 | Header con buscador y franja de categorías, barra móvil, home vitrina, popup y enlaces cortos. |
| 3 · Catálogo y cierre | C-30 a C-33, C-40 | `/productos` con la URL como fuente de verdad, ficha sin self-fetch, categorías, imágenes optimizadas, README y `.env.example`. |
| Gemini | G-01 a G-69, en 23 rondas | Tipografía, colores a tokens, capas, toasts, `dvh`, contraste y limpieza mecánica. Su carril no tiene deudas de reglas (comprobado el 28/09). |

**Después del plan, por tema:**
| Tema | Tareas | Qué dejó |
|---|---|---|
| Panel del admin | C-168, C-50b, C-51 a C-54, C-60, C-60b, C-71, C-73 a C-75, C-82, C-95, C-97, C-104, C-109, C-110, C-150 | Marco del panel, Configuración, Productos, pedidos digitales, gift cards, notificaciones y Telegram, flujo de órdenes, Marketing, Reportes, el resto de las pantallas, y el menú por secciones con el Dashboard de trabajo. |
| Acceso y cuentas | C-80, C-83 a C-85, C-88, C-89, C-105, C-140, C-141, C-143 | Login con límites en el servidor, registro corto y con Google, una sola regla de contraseñas, IP real, sesiones con nombre, roles, equipo por invitación y verificación en dos pasos. |
| Dinero: pagos y Puntos ES | C-87, C-96, C-101, C-114, C-115, C-123, C-125, C-129 a C-132, C-135, C-139, C-142 | Montos exactos, métodos de pago bien hechos, Pago Móvil que verifica al primer intento, pagos sin orden, mínimo de compra, checkout con todos los métodos y pago mixto, y "Puntos ES" con sus términos. |
| Envíos y entrega | C-100, C-106, C-126, C-127, C-153 | ZOOM y MRW con oficinas reales y cobro a destino, rastreo, detalle de la orden, tiempo real y embalaje según el paquete. |
| Catálogo que vende | C-78, C-102, C-117 a C-119, C-121, C-122, C-124, C-133, C-134, C-136, C-154, C-155, C-157, C-158, C-161, C-162, C-163 | Ofertas y cupones, cinta ES, carga masiva, usados y reacondicionados, garantías, reseñas, el asistente de productos, la confianza junto al botón de compra y el correo que pide la reseña. |
| Panel del cliente | C-55, C-128, C-137, C-138 | Marco, inicio con resumen, Mis pedidos, Favoritos, Direcciones y Mi perfil en pestañas. |
| Legal y facturación | C-103, C-120, C-144, C-146, C-146b, C-147, C-147b, C-148, C-148b, C-151, C-159, C-181 | Firma de documentos, IVA incluido a la vista, precio sugerido desde el costo, datos para la factura, relación de ventas, cotizaciones y términos sin promesas falsas. |
| Crecimiento | C-112, C-113, C-116, C-145, C-149, C-167, C-178 | ElectroStudio, medición del embudo de compra y el catálogo legible para Google, las redes y las IA. |
| Equipo y documentos | C-53, C-77, C-86, C-90, C-91, C-93, C-94, C-98, C-99, C-108, C-111, C-152, C-156, C-160, C-164 | Revisiones de Gemini y de ChatGPT, deuda técnica (ESLint en 0), el bloque único de subida y este orden de documentos. |
| Operación y respaldos | C-165, C-166, C-176 | Respaldos automáticos cifrados a Google Drive desde Configuración → Respaldos, restauración con clave privada fuera del servidor, `CHANGELOG.md` y versiones con etiqueta de git (primera: `v1.0.0-rc.1`), y la Content-Security-Policy en modo "solo avisa" con sus avisos en Reportes → Seguridad. |

### 5.2 Lista única de pendientes
Lo que está **en `main` sin subir** y las **tareas de Andrés** (datos, configuración, abogado y contador) van en `SIGUIENTE.md`, que cambia cada día. Aquí va el trabajo de código.

**En curso (aprobado por Andrés el 02/10, `PROPUESTA_C168-C172.md`), en este orden:** C-168 versiones por módulo (**hecha**); C-169 productos sin pérdidas (borrador, papelera, conflicto, presencia) (**hecha**); C-174 marquesina del equipo (quién está conectado y en qué sector) (**hecha**); C-170 lo mismo en el resto del panel (**hecha**); C-173 Reportes en vivo con visitantes conectados, con y sin cuenta (**hecha**); C-172 Destacados que rotan (**hecha**); C-171 Dashboard a tu gusto (**hecha**, adelantada el 03/10 a pedido de Andrés). Lotes de deploy: rc.4 (C-168 y C-169, **etiquetada**), rc.5 (C-174, **etiquetada**), rc.6 (C-173, **etiquetada**), rc.7 (C-171, **etiquetada**); rc.8 (C-170, **etiquetada**); rc.9 (C-175, rediseño de todos los correos con el logo largo, pedido el 03/10; **hecha y etiquetada**; rc.10 corrige el logo para que sea el del encabezado); rc.11 (C-172, **hecha y etiquetada**). **El ciclo de `PROPUESTA_C168-C172.md` está completo.** Ideas opcionales que quedaron sin pedir: orden y fechas de los destacados desde el panel, estrella fija y cuenta regresiva de oferta en la estrella.

**En curso (pedido del 16/10: salud del servidor e imágenes para compartir; primero el plan y después el código), en este orden:**
- **C-176** mantenimiento del servidor (**hecha**).
- **C-177** dependencias seguras: Next, sharp y nodemailer sin las fallas conocidas, y la tienda escuchando solo en `127.0.0.1` (**hecha y en producción** el 16/10, versión `rc.12`).
- **C-178** imágenes para compartir los enlaces (Open Graph) (**hecha**, versión `rc.13`). Las decisiones de Andrés están en §7.2. Ideas que no se pidieron: la imagen generada en el paso SEO del editor de productos y una por curso cuando haya cursos publicados.

Quedan para después de C-177 (`estado/C-177.md`):
- **Prisma 7.** La falla que le queda a Prisma 6 está en su configuración de línea de comandos y no en la tienda, y pasar a Prisma 7 es un cambio grande.
- **Next 16.4**, revisando las rutas por la coincidencia estricta.
- **Antes de npm 12:** aprobar los scripts de instalación (`npm install-scripts approve <paquete>`) de Prisma, esbuild y unrs-resolver.
- **SSH solo con llave**, que espera las llaves de Andrés (`SIGUIENTE.md` §3).

**C-180 · El catálogo de la web en el perfil de WhatsApp** (investigado el 16/10, sin código todavía):
- **Cómo funciona:**
  - El catálogo de Commerce Manager se llena solo con `/feed/productos.xml` (URL programada, cada hora).
  - Se conecta desde la app: Herramientas → Catálogo → "Conectar un catálogo de Meta Business Suite".
  - Hay un catálogo por número.
- **Hecho el 16/10 (Luis):** se creó el catálogo y se cargó el feed. Todavía no está conectado a la app.
- **Espera la captura de Commerce Manager:** cuántos productos entraron y la pestaña de problemas.
- **La tarea de código:** que el feed entregue fotos en JPEG de 1200 × 1200, sobre blanco y **sin la cinta ES**. Meta pide JPEG o PNG y rechaza logos o marcas de agua, y 13 de las 19 fotos del feed son WebP con la cinta.
  - Se arman desde el `.orig.png` que la tienda guarda al subir cada foto (7 de los 9 productos lo tienen).
  - La dirección lleva versión, porque Meta guarda las imágenes por dirección.
- **Fotos para volver a subir:** el SSD Hiksemi y el teclado AOAS tienen la cinta dibujada a mano y no tienen original. Hay que subirlas de nuevo desde el panel.
- **Lo que ya está bien:** el feed trae solo productos físicos, que es lo que permite la política de comercio de WhatsApp (sin moneda virtual ni digitales).

**Cotizaciones desde Numen** (pedido de Luis del 16 y 17/10; Andrés puede cambiarlo). Numen es la app de precios y proveedores del equipo, en un repositorio privado aparte. Las cotizaciones las arma Numen y las emite la web; el costo, el proveedor y el margen se quedan en Numen.
- **C-181** la entrada de servidor a servidor y la "vista" del cliente (**hecha y en producción** el 17/10, versión `rc.15`). El código se sube sin la variable nueva (responde 503); `NUMEN_API_KEY` va en el `.env` cuando Numen esté instalado, con la confirmación de Andrés.
- **C-182** el documento de la cotización y su PDF con el estilo del presupuesto técnico que mandó Luis. **Luis eligió el 17/10 la maqueta A (la fiel), con la opción de imprimir en blanco y negro** (para impresoras sin color). **Hecha y en producción el 18/10 (versión `rc.16`).** Trae:
  - El membrete y el recuadro del documento, y las partidas con el encabezado azul noche.
  - El anticipo en verde y el saldo en rojo.
  - Lo que no incluye y el anexo técnico (campos nuevos y opcionales).
  - El botón "En blanco y negro".
  - El PDF armado en el servidor: "Descargar PDF" en el enlace del cliente, y la ruta para Numen.
- **C-183** (18/10, pedido de Luis, que eligió la variante A): las condiciones y las formas de pago van a lo ancho, debajo de los totales, que quedan pegados a las partidas. Con pocos datos no queda hueco, y con muchos las listas siguen en la otra hoja. **En producción el 18/10** (versión `rc.17`).
- **Del lado de Numen (su repositorio):**
  - Los campos "Lo que no incluye" y "Anexo técnico" en su cotización.
  - Pedir el PDF y mandarlo por watencion (el WhatsApp de la tienda) con el enlace, con vista previa y confirmación antes de enviar.

**En fila (Claude), aparte de lo anterior:** nada con código pendiente que no espere un dato de Andrés (tabla de abajo). Los menores se cerraron en C-164 (`balance/add` borrado, `seed.ts` sin contraseña por defecto, valoraciones con coma, `RechargeModalV2` sin `fetch`). Lo que queda en código es **C-166b**: pasar la Content-Security-Policy de "solo avisa" a "bloquea" (`CSP_ENFORCE="true"` y un deploy) cuando Reportes → Seguridad lleve una semana de visitas reales sin avisos legítimos. El resto no es código:
- Un monitor externo de que la tienda está arriba (UptimeRobot o similar a `/robots.txt`) y guardar la clave privada del respaldo y una copia del `.env` fuera del servidor (Andrés, `SIGUIENTE.md` §3).
- El abogado revisa `/terminos` y `/privacidad` desde Legal → Documentos (`estado/C-160.md`).

**Esperan un dato o una decisión de Andrés:**
| ID | Tarea | Qué falta |
|---|---|---|
| **C-92** | Clientes: desactivar en vez de borrar | La salida del diagnóstico (`docs/plan/scripts/diagnostico-c92.sql`, solo lee). Lleva una migración de `onDelete`. Suma: dejar un movimiento cuando se pierden Puntos ES al cerrar la cuenta. |
| **C-107** | Seguro del envío a elección del cliente | Cuánto cobran ZOOM y MRW en Guanare y si aplica con cobro a destino. Una columna nueva en `orders`. |
| **C-154b** | Plazo de entrega de los digitales en la ficha | Andrés dijo el 01/10: unas 2 horas, con la meta de 30 minutos. Falta el horario en que se atiende. |
| **C-153b** | Productos "frágiles" con más relleno | Decidir si se quiere. Una columna en productos. |
| **C-179** | Chispa (la mascota) se asoma en la esquina de la tienda, saluda y ofrece "Buscar" o "WhatsApp" | Andrés lo aprobó el 09/10 como plan, sin código (`chispa/conocimiento/02-chispa-el-personaje.md`). Se programa cuando Andrés lo pida. Figuraba como C-176 en los documentos de Chispa; ese número se usó el 16/10 para el mantenimiento del servidor. |
| — | Taller (equipos en reparación) | SADES arriba: los datos están ahí. |

**Sin fecha (dependen de terceros o no se pidieron):**
- **La miniatura de la portada en Google** (16/10): hoy Google elige sola una foto de producto de la portada (salió GTA V). Para influir, un `primaryImageOfPage` en los datos estructurados con una imagen cuadrada y sin texto (el mosaico de destacados sin título). Es la señal que Google mira primero, aunque no promete usarla. La tarjeta de compartir no sirve para esto: tiene texto y es ancha.
- Binance Pay y PayPal automáticos: piden cuenta de comercio (KYB) y cuenta Business. Hoy son manuales con reserva de 2 horas.
- Crear la guía de ZOOM desde el panel: pide cuenta corporativa de ZOOM. MRW no tiene API pública.
- Importador de las historias del artefacto viejo a ElectroStudio, si Andrés las quiere.
- Vista previa en Marketing → Plantillas de los correos que aún no la tienen (orden cancelada, recarga aprobada, promotor aprobado, empresa verificada, invitación al panel, inicio de sesión nuevo, favoritos, presupuesto, garantía y avisos al equipo), si Andrés la quiere (`estado/C-175.md`).
- Firma dibujada con el dedo al aprobar una cotización (hoy la aprobación es digital, con nombre y cédula).
- Entrar con Facebook o Apple: no va por ahora (24/09).
- Búsqueda de productos en la web (C-155): un buscador con API gratuita (Brave o Google) como tercera fuente, si en producción los buscadores no le responden al servidor; buscar por código de barras desde el teléfono; proponer también la categoría y las etiquetas.

**De C-187 (06/11):**
- Decidir si `/categorias` esconde las categorías sin productos (hoy 8 de 15 dicen "0 productos"). Es un dato visible: lo decide Andrés.
- Cuando vuelva SADES: una lista de SKU borrados de verdad, para que la sincronización no los recree como borrador.
- Propuestas menores de `estado/C-187.md`: orden de la lista, lista liviana, tarjetas en el teléfono, aviso de destacado en el asistente, `categoryId` en la edición masiva y 404 real en la ficha.

**De C-186 (06/11):** de las 5 recomendaciones de Navidad, Andrés eligió y C-190 hizo la 1 (Ideas para regalar), la 3 (la fecha límite antes del 24) y la 4 (los borradores de campaña). Quedan sin pedir la 2 (gift card con mensaje) y la 5 (combos y envoltorio).
- Tarea chica: `motion-safe:animate-fadeIn` no genera nada con Tailwind 4, así que el popup, `MobileNavBar` y `GuidedTour` no hacen su entrada. Hay que definir la animación en `@theme`.

**De C-188 (06/11), lo decide Andrés** (`estado/C-188.md`, "Propuesto"):
- Hecho en C-189 (06/11): el selector de categorías ofrece solo los íconos del pack, y se quitaron `lucide-react` y `@fortawesome`.
- "Accesorios Gaming": Andrés elige el ícono él mismo en Admin → Categorías (06/11).
- Dependencias (de `npm audit`, 06/11): pasar a Next 16.4.x en cuanto tenga dos semanas publicada, como dice la regla de dependencias; `zod` se arregla con `npm audit fix` sin cambio de versión mayor. Es una tarea corta aparte.
- Tarea aparte: los 10 métodos de pago de la recarga de Puntos ES, una etiqueta sin % y los íconos de los flyers de ElectroStudio, redibujados con el pack.
- Los dos tonos también en la lista de entrega de la ficha y en "Más de ElectroShop", si a Andrés le gustan en el inicio.

**Pedido del 06/11 (tres correcciones, desde la cuenta de Andrés; decididas viendo la página de maquetas):**
- **C-191** (**hecha**): Marketing decía "1 cliente" porque nada le preguntaba al cliente si quería promociones. Ahora se pregunta al registrarse y una vez en Mi panel, y el panel dice "N de M clientes" con el desglose. No se eligieron el toque después de comprar ni el correo de invitación (este lo autoriza Andrés si lo quiere).
- **C-192** (**hecha**): el ámbar solo para avisos, con la regla de §1.1 (variante B, placa azul noche). Queda como lo eligió Luis el recuadro de "Lo que no incluye" de las cotizaciones.
- **C-193** (**hecha**): ElectroStudio con Chispa, el toque navideño, los íconos del pack, el texto con las reglas de Chispa y dos plantillas (Regalos por presupuesto y Felicitación). Sin elegir, por si se quieren: "Arma la semana" con el calendario de Navidad y las plantillas "Fecha límite y gift card", "Antes y después" y "¿Cuál prefieres?".
- **C-194** (**hecha**): el popup navideño del inicio con el diseño de la felicitación (Andrés lo pidió al ver la maqueta).
- **C-195** (**hecha**, rc.23): Chispa 3.0 en `chispa/mascota/chispa.js`: manos y dedos (pulgares cortos, una silueta por mano, el OK chico), movimiento natural, cara y expresiones. Las imágenes de ElectroStudio y del popup salen de nuevo, en `chispa-3/`.
  - Queda para después, como dijo Andrés: el giro de tres cuartos de Chispa.
  - Sin pedir: volver a grabar los stickers y los reels para que tomen las manos nuevas (salen solos con `herramientas/sticker.mjs` y los `videos/*.src.html`).

**Pedido del 10/11 (Andrés): vender de todo, con la ferretería aliada.** Se mostró en una página de maquetas con datos de producción; las decisiones se preguntaron en el chat. Los productos de la ferretería están en La Victoria (Aragua) y se venden solo con envío.
- **C-196** (**hecha**, rc.24): Admin → Productos para miles de productos. La lista por páginas, el proveedor y el costo en cada producto, y la lista del proveedor en lote (Excel, fotos por código). `estado/C-196.md`.
- **C-196b** (**hecha**, rc.25): la casilla "Su lista trae el IVA incluido" en la carga en lote (el costo queda sin el IVA). `estado/C-196b.md`.
- **C-197** (**hecha**, rc.25): la ficha en una sola tarjeta (la maqueta A que eligió Andrés). `estado/C-197.md`.
- **C-205 · La Lista del proveedor por pasos y las reglas de ancho** (**hecha**, rc.33, 13/11; pedido de Andrés mirando la pantalla, la maqueta A): un paso a la vez con los pasos arriba, campos del ancho de su dato y filtros con ícono y subtítulo. Las reglas quedaron en §1.5 a §1.7. `estado/C-205.md`.
- **C-207 · El inicio que vende** (**hecha**, rc.34, 13/11; Andrés eligió después de ver el plan de los 5 cambios, §7.2): el saludo navideño en una franja dentro del inicio (ya no tapa la tienda), cada producto una sola vez, "Recién llegados" de toda la tienda y variado, las gift cards en una sola sección y "Compra por categoría" con fotos, sin "1 producto" y con las chicas juntas. `estado/C-207.md`.
- **C-209 · La portada y las pruebas de confianza** (pendiente, 2 y 5 del plan del inicio): primero maquetas con datos reales. La frase de arriba y los cuatro accesos los decide Andrés; las pruebas de confianza van con los videos de creadores (C-208).
- **C-210 · Correcciones del 13/11** (**hecha**, rc.35, pedido de Andrés mirando producción; eligió lo recomendado en las cuatro preguntas): las píldoras del panel llenas como las de la tienda y los botones animados (§1.8); "Destacados" solo con lo que tiene estrella, de toda la tienda; "Recién llegados" por la fecha de publicación (columna `products.publishedAt`, nueva), con hasta 4 por departamento. `estado/C-210.md`.
- **C-211 · Claude Haiku 5.5 en "Buscar en la web"** (**hecha**, rc.36, pedido de Andrés del 13/11 con su clave): lee las páginas, redacta la ficha y busca por su cuenta; Groq de respaldo; la ficha dice qué IA la redactó. En esfuerzo alto (el máximo pasa de los 60 s de nginx). `estado/C-211.md`.
  - **Pendiente:** quitar Groq cuando Claude lleve unos días sin fallar.
- **C-212 · El sorteo de la PlayStation 4** (**hecha**, rc.37, pedido de Andrés del 13/11; los números en §7.2): `/sorteo`, la tarjeta en Mi panel y Marketing → Sorteo. Boletos por compra de USD 10 o más y por invitar a 2 amigos; el sorteo, una sola vez, después del cierre. Dos tablas nuevas. `estado/C-212.md`.
  - **Después del deploy:** armarlo en el panel con la foto de la consola y encenderlo; el 20/12, "Sortear ahora".
  - **Sin pedir:** un correo automático al ganador, una franja del sorteo en el inicio y su flyer en ElectroStudio.
- **Haiku en el panel** (Andrés eligió 5 de las 7 ideas el 13/11). Esfuerzo alto para lo que se espera en pantalla; el máximo, solo para trabajos de fondo. La base común está en `lib/ia/claude.ts` y las reglas del texto en `lib/ia/texto.ts` (C-213).
  - **A · El resumen del cliente en su ficha** (**hecha**, C-213, rc.38): la pestaña Resumen con lo que hay que atender y cómo compra, y a pedido el resumen de Claude con qué ofrecerle. De paso, "Total gastado" ya no suma lo pendiente ni lo cancelado. `estado/C-213.md`.
    - **Probada con un Claude simulado:** la clave del 13/11 da 401. Falta una clave nueva (en el servidor y aquí) y probarla con el modelo de verdad.
  - **B · Las consultas y los "Solicitar producto":** ordenados por urgencia, buscando si ya está en la tienda o en la lista de la ferretería.
  - **C · Campañas de correo:** del objetivo ("gift cards para Navidad") al asunto y el texto, con los productos reales.
  - **D · Respuestas a clientes:** un borrador para cada consulta, con el estado real de su orden y lo que cobra ZOOM a su ciudad.
  - **F · El catálogo de la ferretería:** la categoría y el nombre de la tienda para los 3.114 códigos de su lista.
    - Necesita guardar antes la lista del proveedor en la base: hoy se lee del Excel en el navegador cada vez. La parte de B que busca en la ferretería depende de eso.
- **C-208 · Videos de creadores, fase 1** (pendiente; plan maestro de Andrés del 13/11): el equipo carga videos de TikTok y YouTube (Instagram como enlace) y salen en la ficha y en el inicio, con el código del promotor. Una tabla nueva (aditiva), una pantalla en Marketing y la revisión semanal de los enlaces. Las fases 2 y 3 esperan sus decisiones.
- **C-206 · La regla de anchos en todo el panel y en la web** (pendiente, sigue a C-205): las páginas que se centran angostas dentro del marco y dejan un hueco junto al menú (Configuración, Equipo, Seguridad, Notificaciones, Cotizaciones y Marketing), los campos cortos estirados y las píldoras de filtro sin ícono. Una por una, con capturas a 360, 768, 1024 y 1440 px. El asistente de productos puede pasar a `Pasos`.
- **C-198 · Variantes de color, talla y versión** (aprobada el 10/11, la propuesta recomendada; después de C-199 y C-200): familias de productos. Cada variante es un producto (su código, existencia, precio, fotos y enlace); la familia los une para el selector de la ficha y una sola tarjeta en el catálogo ("Elegir color"). El carrito, las órdenes y la existencia no cambian. El panel agrupa con "Agrupar como variantes" desde la lista.
- **C-199 · El envío desde el proveedor** (**hecha**, rc.32, 12/11, junto con "Calcula tu envío" en la ficha y el carrito; `estado/C-199.md`). Decidida el 10/11; el plan de abajo es el que se siguió. Antes, la tienda calculaba todo como si saliera de Guanare (ZOOM 43) y ofrecía retiro y delivery en Guanare para todo. La ferretería despacha y envía sus pedidos desde La Victoria (ZOOM 244).
  - **El proveedor:** "Despacha él mismo desde [ciudad de ZOOM]", con la lista de ciudades de `ciudadesZoom()`. Sus productos son solo envío.
  - **La ficha:**
    - "Se envía desde La Victoria, Aragua", con el flete de referencia desde su ciudad al centro y al más lejos. `tarifaZoom` hoy fija `ciudad_remitente` a Guanare: recibe el origen. La tarifa se guarda en memoria.
    - Sin "Retiro en tienda" ni "Delivery en Guanare".
  - **El checkout:**
    - Si el carrito lleva algo del proveedor, solo ZOOM o MRW. El servidor rechaza retiro y delivery (caso manipulado).
    - Un carrito mixto dice "Tu pedido llega en 2 paquetes", con el flete de referencia de cada uno y su origen.
  - **El dinero** (`calculateOrder` en `lib/pricing.ts`, una sola fuente para el servidor y el checkout):
    - **El embalaje se cobra en cada paquete** (Andrés, 10/11: "igual para los dos"). Con empaques configurados (C-153), cada paquete arma el suyo, y el embalaje gratis desde un monto vale igual para los dos.
    - **El envío gratis** (por producto o por monto) **vale solo para el paquete de Guanare.** El de la ferretería va siempre con cobro a destino: lo paga el cliente al retirar (Andrés, 10/11).
  - **La orden** guarda sus paquetes: el origen, los productos y la guía de cada uno. Hoy hay un solo `trackingNumber`.
    - **Panel:** cada paquete con su "Copiar datos para la guía" y su número de guía. En el de la ferretería, el aviso para pasarle el pedido.
    - **Cliente:** las dos guías con su rastreo; el cron de seguimiento mira las dos.
    - **Correos:** "llega en 2 paquetes".
  - **Base (aditiva):** la ciudad de despacho en `suppliers` y los paquetes de la orden (una tabla `order_packages` o un JSON en `orders`; elegir al empezar).
  - **Pruebas:**
    - Casos normales: solo de Guanare, solo de la ferretería y mixto, cada uno con y sin embalaje gratis y envío gratis.
    - Casos manipulados: retiro y delivery con un producto de la ferretería, y el embalaje y el total que manda el navegador.
    - El checkout a 360 y 1440.
    - La prueba de humo.
- **C-200 · El departamento Ferretería** (decidido el 10/11): una categoría madre "Ferretería" con las suyas adentro; el inicio sigue siendo de tecnología, con una sola vitrina de ferretería y un acceso en la franja. Hoy la tienda no usa las subcategorías (`parentId` existe pero nada lo lee). Va antes de publicar los productos de la ferretería.
- **La carga de los 60 productos de la ferretería** (12/11: pasó a los 70, sin pinturas; ver el pedido del 12/11): el archivo (80 códigos, con categoría, marca, peso y medidas estimados) está en la carpeta de proveedores de Andrés, fuera del repositorio. Se sube con Productos → Más → Lista del proveedor, con "Su lista trae el IVA incluido" marcada y sin descuento, junto con su listado de existencia. **Fotos (decidido el 10/11): solo las del fabricante**, buscadas en los sitios oficiales de cada marca y nombradas por código para "Fotos por código". **Esperan el modelo exacto de cada producto:** su lista no lo trae, y la búsqueda del 10/11 encontró al menos cuatro desmalezadoras Daewoo de 52 cc distintas. El archivo de los 60 trae la columna para llenarlo. Falta confirmar con ZOOM y MRW si llevan pintura con solvente. **Los 80 nombres se corrigieron el 10/11:** llevan todo lo de su lista y nada más (antes faltaban modelos y había tres datos cambiados), y la columna "Revisar antes de publicar" trae 22 preguntas para la ferretería.
- **De paso (C-196):** la búsqueda de la tienda (`buscarEnCatalogo`) lee todos los productos publicados para comparar en memoria. Con unos miles anda bien; si lo publicado pasa de 10.000, llevarla a la base como la del panel.

**Pedido del 10/11 (Andrés), mientras se espera lo de la ferretería:**
- **C-201** (**hecha**, rc.26): el inicio de Mi panel sin errores y más claro. `estado/C-201.md`. Quedan:
  - En el teléfono, el botón de WhatsApp tapa el final de las tarjetas del panel.
  - "1 a 2 días hábiles" en Garantía, a confirmar con los términos (A3).
  - "Para ti" en el inicio del panel: maquetas con datos de producción para que Andrés elija.
- **C-202** (**hecha**, rc.27): los nombres de producto bien escritos (la regla de §7.2), la columna "Nombre en la tienda" en la Lista del proveedor, el aviso del asistente, y renombrar ya no rompe el enlace (la dirección vieja responde 308). `estado/C-202.md`. Quedan:
  - **Los 14 productos publicados:** la propuesta está en `estado/C-202.md` y espera el OK de Andrés. Se renombran después de subir rc.27.
  - **Los de la ferretería:** las 28 preguntas y los modelos a confirmar van a la ferretería. Con el modelo exacto, el nombre se completa con el del fabricante.
- **C-200** (**hecha**, rc.28): el departamento Ferretería, con las maquetas que eligió Andrés. `estado/C-200.md`. Quedan:
  - ~~La línea "Sale desde La Victoria" en cada tarjeta~~: hecha en C-199.
  - Antes de crear los productos de la ferretería, correr en producción `scripts/ferreteria-departamento.ts --aplicar`, que crea las categorías.
- **Pack de íconos v1.2** (10/11, en C-200): los 10 de ferretería, redibujados de la tanda que generó Andrés. La página para Luis está en `ElectroShop Brand/Pack de íconos/iconos-electro-shop-v1.2.html`.
- **"Para ti" en Mi panel** (Andrés eligió la V1 el 10/11): cuatro tarjetas por motivo, después de "Pedidos en curso" (volvió a haber, bajó de precio, va con lo que compraste, lo viste hace poco). Maqueta privada "Para ti en Mi panel". Lo que pide para funcionar está en su página: el precio y la existencia del favorito al marcarlo, una regla de complementos por categoría y los vistos en el navegador del cliente.
- **Plan "Electro Shop lo tiene todo" con ElectroStudio** (10/11): documento privado, más sus maquetas de flyers.
  - Cuatro plantillas nuevas, cada una con su animación de 7 s: Lo tiene todo, Departamento, Arma tu proyecto y ¿Sabías que también…?
  - Calendario del 11/11 al 31/12, con el lanzamiento de Ferretería tentativo la semana del 23/11.
  - Las plantillas esperan que Andrés elija sus maquetas.

**Pedido del 11/11 (dos errores de la consola, desde la cuenta de Andrés):**
- **C-203** (**hecha y en producción**, rc.29): una pestaña abierta antes de un deploy se recarga entera al navegar, en vez de mezclar las dos versiones (el `TypeError` de Categorías del panel y los 404 de `/categorias`); el deploy sigue sirviendo 7 días los archivos de las versiones anteriores. De paso, las miniaturas de YouTube de `/servicios`. `estado/C-203.md`. Queda:
  - ~~Comprobar en producción que un pedido del router sin versión responde 204~~: comprobado el 12/11 (`HISTORIAL.md`). La prueba con una pestaña abierta durante un deploy va en el bloque de rc.30.
  - Si se actualiza Next: la prueba de humo comprueba que navegar por dentro no recarga la página. Si falla, el guion de `lib/version-build.ts` ya no llega a los pedidos del router.

**Pedido del 12/11 (Andrés): la carga masiva, completa, y los 70 de la ferretería sin pinturas.** La ferretería respondió las preguntas de los modelos (el .docx de Andrés, fuera del repositorio). Las pinturas quedan fuera porque ZOOM y MRW no las llevan (§7.2).
- **C-204** (**hecha**, rc.30): la carga masiva con las cinco respuestas de Andrés. `estado/C-204.md`.
  - El Excel y las fotos juntos.
  - Lo que no se envía, marcado y sin crear.
  - "Sugeridos".
  - La columna "Modelo".
  - El paso 5: la lista de control, "Completar con la web" en lote y "Publicar los listos".
  - **C-204b** (**hecha**, rc.31, 12/11): "Motobomba a gasolina" se marcaba como gasolina. Después de "a", "para" o "P/" la palabra no cuenta, y "Sí se envía" deja pasar un producto. De una carpeta solo se toman las fotos (los `.csv` de trabajo se leían como su lista). `estado/C-204b.md`.
  - Quedan:
    - **Publicar los de la ferretería:** ya se puede con C-199 (rc.32), después de elegir en la Lista del proveedor "Él mismo, desde La Victoria".
    - Probar a mano la primera vez elegir o soltar la carpeta "Fotos del fabricante": Firefox no deja hacerlo desde una prueba.
- **Los 70 de la ferretería** (archivo fuera del repositorio, en la carpeta de proveedores de Andrés):
  - Salen los 15 códigos de pinturas.
  - Entran 14 productos (20 códigos) con la regla de "Sugeridos": hidrolavadoras, bomba centrífuga, aspiradoras, herramientas Emtop con su batería y su cargador, esmeril de 2350 W, press control, breakers, cable #14 y disco para desmalezadora.
  - Los modelos que confirmó la ferretería mandan sobre los que se habían elegido el 10/11 por las fotos: el esmeril de 850 W, el panel de empotrar, la pistola DAPG500HM, la soldadora FW131M, el rotomartillo, el kit de alicates, la lijadora y la motosierra.
  - **Las fotos (12/11):** las rehizo un agente aparte, con las mismas reglas del 10/11. 50 de los 85 códigos tienen foto; lo que falta se le pidió a la ferretería (`SIGUIENTE.md`).
  - **El proponedor de nombres** (`lib/nombres/marcas.ts`) tiene que conocer Belt-G (su lista dice "BG"), Protektor y V-Teg para la próxima lista.

**Limpieza (sin urgencia):**
- Al cerrar el ciclo de pruebas: borrar el esquema `rev10_demo` y los archivos de prueba de `private-uploads/signatures/` (local).
- Hecho en C-185 (06/11): las ramas, el stash y los worktrees viejos de la máquina de Andrés, y los 40 uploads versionados (en el servidor se respaldan antes del próximo `git pull`, `SIGUIENTE.md` §2).

### 5.3 Crecimiento: qué frena y qué sigue
La base técnica está: el embudo se mide (C-145), el catálogo es legible para buscadores e IA (C-149), el precio dice su IVA, hay cotizaciones para empresas y la ficha da confianza antes de pagar.

**Lo que frena hoy no es código:**
1. **El catálogo es corto** (9 productos publicados el 01/10, ninguno con marca). Sin catálogo no hay qué posicionar ni qué anunciar. Herramientas, ya hechas: la carga masiva con plantilla (C-118) y la búsqueda del producto en la web (C-155).
2. **La medición no está encendida:** faltan las claves de Google Analytics y del píxel de Meta en el servidor, y dar de alta el dominio en Google Search Console.
3. **Los precios:** dependen de los proveedores (fuera del código).

**Orden recomendado:**
1. Catálogo: cargar productos con marca, medidas y fotos (C-155 ayuda con cada uno).
2. Encender la medición y Search Console; esperar una semana de datos.
3. Anuncios: búsqueda de Google (texto) y catálogo de Meta con `/feed/productos.xml`. Google Merchant Center no admite a Venezuela (lista oficial leída el 01/10).
4. Reseñas por correo (C-157, hecha: falta subirla): la prueba social que hoy falta.
5. Instituciones: la retención del IVA en las cotizaciones (C-159, hecha: falta subirla; la practican los sujetos pasivos especiales, no los órganos del Estado) y, del lado de Andrés, el Registro Nacional de Contratistas.

**Qué mirar cada semana** (Dashboard y Reportes del panel): productos publicados, visitas, agregados al carrito, compras y ventas cobradas. Los números de la empresa no se escriben en este repositorio, que es público.

---

## 6. QA manual

Anchos a probar: **360 · 390 · 768 · 1024 · 1440 px** (DevTools → modo responsive). Incluir un Android real de gama media si es posible.

- [ ] Home a 360px: el primer pantallazo muestra al menos 1 producto con precio y botón "Agregar".
- [ ] Buscar desde el header, estando en el home y estando en `/productos`.
- [ ] Agregar al carrito desde una card del home, recargar 3 veces logueado: la cantidad no cambia.
- [ ] A 768px se ve **una** sola navegación.
- [ ] Panel de filtros móvil: el botón "Ver N productos" es visible y se puede tocar.
- [ ] Se puede seleccionar y copiar el nombre y el precio de un producto.
- [ ] El popup promocional se cierra al primer toque.
- [ ] Checkout completo con Pago Móvil y con Puntos ES, y uno con pago mixto.
- [ ] Ver el código fuente del home y de `/productos`: buscar `costPerItem` y `adminAlertEmails` → 0 resultados.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores nuevos.

La lista completa para revisar en producción con Andrés, pantalla por pantalla, está en [`REVISION_FINAL.md`](./REVISION_FINAL.md). La prueba automática de todo junto es `scripts/e2e/humo.ts` (`OPERACION.md` §3).

## 7. Decisiones de negocio (Andrés)

Nada de esta sección se cambia sin Andrés. Tampoco se hace sin su confirmación: borrar datos, force push y cambiar variables de entorno de producción.

### 7.1 Abiertas
| # | Decisión o dato | Para qué |
|---|---|---|
| A1 | Entrega de un código y de una recarga: unas 2 horas, meta de 30 minutos (01/10). ¿En qué horario se atiende? | La ficha de los digitales (C-154b). Hoy dice "cuando confirmamos tu pago". |
| A2 | Costos del seguro de ZOOM y MRW en Guanare, y si aplica con cobro a destino | C-107. |
| A3 | Términos, 3 afirmaciones escritas a mano (`estado/C-144.md`): "comprobante vencido o ilegible" como motivo de rechazo, los plazos (24-48 h, 2 a 7 días, 5 a 10 días de garantía) y el contacto (correo, WhatsApp y horario) | Que los términos solo prometan lo que se cumple. |
| A4 | Términos y privacidad revisados por el abogado (`estado/C-120.md` §7) | Publicarlos como documento con versión. |
| A5 | Preguntas para el contador: IVA de los digitales (`estado/C-151.md`), embalaje (`estado/C-147b.md`) y las de `estado/C-120.md` §6 | Confirmar la lectura de la norma. |
| A6 | ¿Marcar productos "frágiles"? | C-153b. |
| A7 | Medidas y precios reales de los empaques, precio del "bulto aparte" y monto del embalaje gratis | Encender el embalaje según el paquete (C-153). |
| A8 | ¿Firma dibujada al aprobar una cotización? | Hoy no hace falta. |
| A9 | ¿Teléfono opcional en el registro? ¿Captcha? (`AUDITORIA_REGISTRO.md` §2) | Registro todavía más corto. |
| A10 | ¿Poner el repositorio en privado? (recomendado) | Hoy es público. |
| A12 | En las tarjetas chicas, ¿la etiqueta de un usado dice solo la condición ("CAJA ABIERTA") y el grado se lee en la ficha? | Hoy "CAJA ABIERTA · EXCELENTE" ocupa dos líneas y tapa parte de la foto (`estado/C-162.md`). |
| A13 | Promotores: ¿los productos digitales (códigos y recargas) pagan comisión? Hoy sí, pero no se acredita sola si supera la ganancia de la venta | `estado/C-167.md`. Opciones: no pagar en digitales, un % menor, o dejarlo. |
| A14 | Promotores: % por defecto de la comisión y del descuento del código (quedó 5 % y 5 %), y los términos del programa para el abogado | `estado/C-167.md`. |
| A11 | ¿La cinta ES también en los productos que no son nuevos (al menos en "Caja abierta")? | Hoy llevan su etiqueta de condición y no la cinta (decisión del 28/09). Andrés la echó de menos el 01/10 (`estado/C-161.md`). |

### 7.2 Tomadas (no volver a preguntar)
**Del plan original (D1 a D5):** `/comparar` se eliminó y redirige a `/productos` (C-06). El popup se cierra al instante y sale como mucho una vez cada 24 h (C-23). El modo mantenimiento se implementó (C-04). El precio se escribe `$1.099,00` (C-12). Las categorías de la franja son las dos con más productos (C-20).

- **Equipo y forma de trabajo:**
  - ChatGPT fuera del equipo (21/09).
  - Claude hace el merge a `main` y el push; el deploy lo hace Andrés, en un solo bloque (30/09 y 01/10).
  - Migraciones autorizadas siempre que sean aditivas y con respaldo (29/09).
  - Sin emojis en la web ni en el código (14/09).
  - Cuidado con los términos: ninguna promesa escrita a mano que la tienda no cumpla; ante la duda, preguntar (30/09).
- **Servidor e imágenes para compartir (16/10, C-176 a C-178; las decidió Luis, del equipo, con Claude):**
  - El mantenimiento del servidor se hace en vivo, con Claude conectado: Claude corre lo que no pide `sudo`, y lo que sí lo pide lo corre el equipo con los bloques que prepara Claude.
  - SSH solo con llave y con fail2ban.
  - De los volcados hechos a mano en el servidor se guarda solo el último.
  - Node 24 LTS.
  - En la imagen que se comparte de un producto, el precio va **solo en dólares**, tachado si está en oferta. En bolívares no, porque la vista previa de WhatsApp queda guardada para siempre.
  - El estilo de las imágenes se eligió viendo dos maquetas reales. Es **mixto**: los productos en claro, y la portada, las categorías y las páginas en oscuro.
  - Los nombres de los productos van tal cual están cargados, en mayúsculas. "(SALDO)" se quita solo en la imagen.
  - La imagen de la portada dice "Todo lo encuentras con nosotros." (elegida el 16/10 entre cuatro frases verdaderas; sin promesas de precio ni de plazo).
  - Si hay una imagen subida a mano en SEO (la del producto o la de Configuración), esa manda sobre la generada.
  - Para el diseño se usan las skills ya instaladas, sin agregar otra.
- **Registro y acceso:**
  - Google: se vincula por correo; teléfono y cédula en la primera compra; los admin nunca entran con Google.
  - Cédula fuera del registro. Onboarding con física.
  - Facebook y Apple: no por ahora (24/09).
- **Panel (30/09, C-140 y C-141):**
  - Dos pasos con app de códigos, obligatorios para todo el panel y sin opción de desactivarlos.
  - Roles: Super admin (el dueño) y Administrador (sin Configuración, Métodos de pago, canales de aviso, publicar documentos legales ni Equipo). Soporte, ventas o contenido: no por ahora.
  - Admins nuevos solo por invitación al correo. Una cuenta de cliente no se convierte en admin.
  - Una sola sesión de admin, 12 horas y cierre tras 1 hora sin uso.
  - Menú por secciones; "Dashboard" se llama Dashboard; "Cursos" se queda en el menú (01/10).
- **Clientes:** se borran solo si no tienen órdenes, Puntos ES, transacciones ni gift cards; si tienen algo, se desactivan (17/09).
- **Dinero:**
  - Nunca sale de la empresa.
  - Comisiones de promotores solo por compras pagadas (16/09).
  - **Promotores (02/10, C-167):** la comisión es sobre los **productos, sin IVA ni envío**; se paga en **Puntos ES, nunca en efectivo** (en efectivo se presta para lavar dinero; en Puntos ES compran en la tienda); cada promotor tiene un **código con descuento para el cliente** que cuenta la compra aunque el cliente ya tuviera cuenta; se entra con una **solicitud** que aprueba el equipo; la comisión se **acredita sola 7 días después de la entrega**, salvo las que parecen autocompra, pasan de $50 o superan la ganancia de la venta (esas las revisa el equipo).
  - Pago Móvil sin orden: pasa a los Puntos ES del cliente (28/09). Lo pagado de más se acredita completo (29/09).
  - Mínimo de compra solo sobre los productos, sin embalaje ni envío. Máximo sobre todo lo que paga el cliente (28/09).
  - Sin subir capturas: se usa la verificación con el BDV (29/09).
  - Binance Pay y PayPal manuales, con reserva de 2 horas (29/09).
  - Redondeo de los montos viejos de C-96: autorizado (24/09); lo corre Andrés en el servidor.
- **Puntos ES (reglas legales, 29 y 30/09):**
  - Se llaman "Puntos ES" en todo texto. Nunca "saldo", "billetera", "wallet" ni "monedero".
  - Solo compran en la tienda: nunca se transfieren a otro cliente, nunca se retiran, nunca pagan a terceros. Así quedan como "esquema de prepago", fuera de la regulación del BCV (Resolución 18-12-01, art. 19).
  - Quien cierra su cuenta los pierde: no son reembolsables. Se le sugiere gastarlos antes.
  - La comisión del Pago Móvil P2C (hasta 1,5 %, mínimo Bs. 14) la paga la tienda. No se cobra recargo al cliente: está prohibido.
  - Gift card: solo con Puntos ES.
- **Envíos:**
  - ZOOM y MRW con cobro a destino; delivery en Guanare con tarifa fija; envío gratis por producto o por monto (22/09).
  - Sin cuenta corporativa de MRW por ahora (24/09).
  - El seguro se le pregunta al cliente (24/09; espera los costos, C-107).
  - Embalaje según el paquete, apagado hasta que Andrés lo encienda (01/10).
- **Productos:**
  - El fondo de las fotos se quita desde el teléfono; los usados llevan etiqueta "Usado" y no el sello "ES" (28/09).
  - Cuatro condiciones: Nuevo, Caja abierta, Reacondicionado y Usado. Cupones no, ofertas sí. La garantía la da la tienda (30, 30, 90 y 30 días por defecto).
  - Sin devoluciones por cambio de opinión: falla, daño o producto distinto se atienden como garantía. Si no se puede reparar ni cambiar, se devuelve en Puntos ES, como dicen los términos (01/10).
  - Duplicar: el servidor copia todo; la copia nace en borrador y sin stock.
  - Especificaciones sin mínimo y sugeridas por categoría (30/09).
  - Buscar el producto en la web (C-155, 01/10): un botón por producto en el primer paso del asistente; sin API de pago; trae descripción, peso y medidas de la caja, especificaciones, marca y código de barras; busca por modelo y nombre; si no encuentra las medidas, propone un estimado marcado como tal. El mismo día Andrés dio una clave de Groq (capa gratuita) para ordenar los datos y redactar la descripción: va solo en el `.env`.
- **Descuentos (25/09):** si hay varios, gana el mayor. Los digitales, fuera. Precio tachado. "Pedir descuento" reemplazado por ofertas y cupones. El cupón de monto fijo va primero a los productos sin oferta.
- **Reseñas:** solo con una orden entregada del producto.
- **Facturación e IVA (30/09 y 01/10):**
  - La web no emite facturas: prepara los datos, y SADES o el talonario facturan. No se construye un facturador ni se integra una imprenta digital.
  - El precio publicado ya lleva el IVA y se dice cuánto es. El precio sugerido es costo + 30 % + IVA.
  - Los productos digitales no llevan IVA (interruptor en Configuración, apagado).
- **ElectroStudio:** historias en la base, dos pantallas (inicio y editor), trabajo por fases. El plan semanal automático quedó fuera (28/09).
- **La ferretería aliada (10/11, Andrés, en el chat):**
  - Su lista trabaja a BCV, igual que la tienda, y su "Precio Máximo" trae el IVA y es lo que la tienda le paga, sin descuento. El costo es su precio sin el IVA (C-196b).
  - Sus productos se venden solo con envío desde La Victoria (Aragua), en dos paquetes si el carrito mezcla (C-199). **La ferretería despacha y envía** los pedidos de la web (acordado con ella el 10/11).
  - **El embalaje se cobra igual en los dos paquetes;** el envío gratis vale solo para el de Guanare: el de la ferretería siempre con cobro a destino (C-199).
  - Un departamento Ferretería, y el inicio sigue siendo de tecnología (C-200).
  - Las fotos, del fabricante.
    - **Ampliado el 10/11:** lo decidió el dueño de la cuenta en otra sesión de Claude, la de las fotos, que lo avisó por mensaje.
    - Sin foto oficial, se usa una foto real del mismo producto, de un distribuidor o una tienda venezolana. Solo si coinciden la marca y el modelo y no tiene marca de agua.
    - Lo que no tiene marca ni modelo queda en borrador.
    - En las pinturas, solo la lata: el color lo resuelve el selector de colores de C-198.
  - Las variantes, como familias de productos (C-198).
- **El departamento Ferretería (Andrés, 10/11, C-200):** enlace en la franja al lado de Ofertas (en el teléfono, primer chip del inicio y entrada en "Más"); su vitrina, un estante con sus categorías después de "Recién llegados"; su página, el catálogo de siempre con el aviso del envío y sus categorías arriba.
- **"Calcula tu envío" (Andrés, 12/11, C-199):** en la ficha y en el carrito; el cliente elige estado y ciudad de ZOOM (se recuerda, y sale de "Mis direcciones" si inició sesión); ve lo que le cobra ZOOM retirando en su oficina, en $ y Bs, "lo pagas al retirar" y "MRW cobra parecido"; si ZOOM no responde, un estimado propio marcado como aproximado. Se hizo junto con C-199: cada paquete desde su origen.
- **El envío gratis cuando la compra llega en dos paquetes (Andrés, 13/11; cerró A15):** cada paquete calcula lo suyo.
  - **El de Guanare** es gratis si lo que sale de Guanare llega al monto de Configuración ($600 al 13/11). Lo de la ferretería no suma para ese monto.
  - **El de La Victoria** va siempre con cobro a destino.
  - **El embalaje gratis desde un monto** sigue contando toda la compra física, igual para los dos (10/11).
- **Las pinturas, fuera por ahora (Andrés, 12/11):** ZOOM y MRW no las transportan. Lo mismo vale para los solventes, los aerosoles, las pegas con solvente y el gas: la carga no los crea (C-204).
- **La carga masiva (Andrés, 12/11, C-204):**
  - el Excel y las fotos van juntos;
  - el modelo entra con el Excel, y la descripción la propone la web con IA, **pero el equipo la revisa antes de publicar**;
  - lo que no se envía no se crea;
  - "Publicar los listos" publica solo los completos;
  - "Sugeridos" es lo afín a la tienda (electricidad, iluminación, protectores de voltaje, herramientas eléctricas, bombas y cerrajería), con existencia y que aguanta solo su envío (de unos $25 o más). Lo más barato va como complemento.
- **Nombres de producto (Andrés, 10/11, C-202):** escritos normal, como una oración, en toda la tienda. Siglas, unidades y marcas como se escriben ("120 V", "LED", "Daewoo"). Primero lo que es, después lo que lo distingue, la marca y el modelo; el color o la talla al final. Nada inventado: lo que no se entiende se le pregunta al proveedor.
  - La ficha, en una sola tarjeta (C-197).
- **El inicio (Andrés, 13/11, después de ver el plan de los 5 cambios):**
  - La tarjeta navideña ya no sale en pantalla completa: va como franja dentro del inicio. Andrés va a mejorar su diseño.
  - "Recién llegados" muestra todo lo nuevo de la tienda, la ferretería incluida: "capaz mañana venda teléfonos o productos afines; se tiene que ver de todo". El resto del inicio sigue como decidió C-200.
  - Las pruebas de confianza van, con los videos de creadores (C-208).
  - **Cómo quedó (C-207):** un producto sale una sola vez, en la primera sección que le toca; las gift cards van solo en su sección. En "Compra por categoría", la cuenta sale desde 10 y las categorías con menos de 3 van juntas en "Más categorías".
  - **Destacados y "Recién llegados" (Andrés, 13/11, C-210; cambia lo de C-200 y C-207):**
    - "Destacados de la semana" muestra solo lo que tiene la estrella, de toda la tienda (la ferretería también) y sin relleno: "los he desactivado todos y siguen apareciendo los mismos". Sin ninguno, la sección no sale.
    - "Recién llegados" ordena por la fecha en que cada producto se publicó por primera vez, no por la de creación (la carga del proveedor crea en borrador). El mismo día, los destacados primero, y como mucho 4 de cada departamento o categoría.
- **El sorteo de la PlayStation 4 (Andrés, 13/11, C-212):** que la empresa no pierda.
  - **Boletos:** 1 por cada compra pagada de USD 10 o más; sin comprar, el enlace propio y 2 amigos que se registran y verifican el correo (1 boleto por cada 2, hasta 3). Las capturas del estado de WhatsApp no cuentan: no se pueden comprobar.
  - **El resultado, el 20/12,** para que el premio llegue a otro estado antes de Navidad. **El premio cuesta de USD 150 a 250.**
  - **Sin permiso de Conalot:** "El sorteo lo podemos hacer tranquilamente, no es necesario el Conalot; es simple, elegiremos un correo al azar". Es decisión de Andrés: Claude le avisó que las rifas, también las de redes, piden autorización previa (Providencia CONALOT/P/2025-001). Por eso no se vende ningún boleto, hay una forma sin comprar y las bases son públicas.
  - **El ganador:** al azar entre todos los boletos, publicado con el correo tapado. El equipo no participa.
- **Videos de creadores (Andrés, 13/11):** videos de quienes compraron el producto (TikTok, Instagram o YouTube), en la ficha y en el inicio, enganchados con el programa de promotores. El plan maestro está en un documento de Claude Docs de Andrés ("Plan maestro de videos de creadores"). Faltan sus decisiones de la fase 2: el premio, quién manda videos, Instagram, los en vivo y el abogado.
- **Taller:** espera a SADES (30/09).
- **Credenciales del historial (C-40):** revisado el 26/09, no había nada que cambiar. Si algún día se configura el webhook de SADES, usar un secreto nuevo.
