# Plan maestro — ElectroShopVe WEB

> **Al día: 2026-10-01 (C-156).** Este archivo es el plan completo: objetivo, sistema de diseño, carriles, tablero y decisiones. Los números de sección no cambian: `CLAUDE.md` y `GEMINI.md` los citan.

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

**Reglas de color**
- Neutros: solo `ink`, `ink-soft`, `muted`, `subtle`, `line`, `line-strong`, `surface` y la escala `gray-*`. **`slate-*` desaparece.**
- Degradado de marca permitido: `from-brand-500 to-brand-600` (botón CTA) y `from-brand-600 to-brand-700` (bloques oscuros). Nada de `indigo`, `purple` o `pink` en la tienda.
- Prohibido `blur-[80px]` o mayor y blobs animados de fondo en la tienda: pesan demasiado en Android de gama baja.
- Texto sobre azul: `text-white` o `text-white/80` como mínimo. Nunca `/40` ni `/60` para texto que haya que leer.

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
| Legal y facturación | C-103, C-120, C-144, C-146, C-146b, C-147, C-147b, C-148, C-148b, C-151, C-159 | Firma de documentos, IVA incluido a la vista, precio sugerido desde el costo, datos para la factura, relación de ventas, cotizaciones y términos sin promesas falsas. |
| Crecimiento | C-112, C-113, C-116, C-145, C-149, C-167 | ElectroStudio, medición del embudo de compra y el catálogo legible para Google, las redes y las IA. |
| Equipo y documentos | C-53, C-77, C-86, C-90, C-91, C-93, C-94, C-98, C-99, C-108, C-111, C-152, C-156, C-160, C-164 | Revisiones de Gemini y de ChatGPT, deuda técnica (ESLint en 0), el bloque único de subida y este orden de documentos. |
| Operación y respaldos | C-165, C-166 | Respaldos automáticos cifrados a Google Drive desde Configuración → Respaldos, restauración con clave privada fuera del servidor, `CHANGELOG.md` y versiones con etiqueta de git (primera: `v1.0.0-rc.1`), y la Content-Security-Policy en modo "solo avisa" con sus avisos en Reportes → Seguridad. |

### 5.2 Lista única de pendientes
Lo que está **en `main` sin subir** y las **tareas de Andrés** (datos, configuración, abogado y contador) van en `SIGUIENTE.md`, que cambia cada día. Aquí va el trabajo de código.

**En curso (aprobado por Andrés el 02/10, `PROPUESTA_C168-C172.md`), en este orden:** C-168 versiones por módulo (**hecha**); C-169 productos sin pérdidas (borrador, papelera, conflicto, presencia) (**hecha**); C-174 marquesina del equipo (quién está conectado y en qué sector) (**hecha**); C-170 lo mismo en el resto del panel (**hecha**); C-173 Reportes en vivo con visitantes conectados, con y sin cuenta (**hecha**); C-172 Destacados que rotan (**hecha**); C-171 Dashboard a tu gusto (**hecha**, adelantada el 03/10 a pedido de Andrés). Lotes de deploy: rc.4 (C-168 y C-169, **etiquetada**), rc.5 (C-174, **etiquetada**), rc.6 (C-173, **etiquetada**), rc.7 (C-171, **etiquetada**); rc.8 (C-170, **etiquetada**); rc.9 (C-175, rediseño de todos los correos con el logo largo, pedido el 03/10; **hecha y etiquetada**; rc.10 corrige el logo para que sea el del encabezado); rc.11 (C-172, **hecha y etiquetada**). **El ciclo de `PROPUESTA_C168-C172.md` está completo.** Ideas opcionales que quedaron sin pedir: orden y fechas de los destacados desde el panel, estrella fija y cuenta regresiva de oferta en la estrella.

**En fila (Claude), aparte de lo anterior:** **C-176 · Chispa en la tienda** (aprobada el 09/10; Andrés pidió dejarla como plan, sin código todavía): la mascota se asoma en la esquina izquierda y ofrece Buscar o WhatsApp. Plan, verificación y 4 preguntas abiertas en [`PROPUESTA_C176_CHISPA.md`](./PROPUESTA_C176_CHISPA.md). Fuera de C-176, nada con código pendiente que no espere un dato de Andrés (tabla de abajo). Los menores se cerraron en C-164 (`balance/add` borrado, `seed.ts` sin contraseña por defecto, valoraciones con coma, `RechargeModalV2` sin `fetch`). Lo que queda en código es **C-166b**: pasar la Content-Security-Policy de "solo avisa" a "bloquea" (`CSP_ENFORCE="true"` y un deploy) cuando Reportes → Seguridad lleve una semana de visitas reales sin avisos legítimos. El resto no es código:
- Un monitor externo de que la tienda está arriba (UptimeRobot o similar a `/robots.txt`) y guardar la clave privada del respaldo y una copia del `.env` fuera del servidor (Andrés, `SIGUIENTE.md` §3).
- El abogado revisa `/terminos` y `/privacidad` desde Legal → Documentos (`estado/C-160.md`).

**Esperan un dato o una decisión de Andrés:**
| ID | Tarea | Qué falta |
|---|---|---|
| **C-92** | Clientes: desactivar en vez de borrar | La salida del diagnóstico (`docs/plan/scripts/diagnostico-c92.sql`, solo lee). Lleva una migración de `onDelete`. Suma: dejar un movimiento cuando se pierden Puntos ES al cerrar la cuenta. |
| **C-107** | Seguro del envío a elección del cliente | Cuánto cobran ZOOM y MRW en Guanare y si aplica con cobro a destino. Una columna nueva en `orders`. |
| **C-154b** | Plazo de entrega de los digitales en la ficha | Andrés dijo el 01/10: unas 2 horas, con la meta de 30 minutos. Falta el horario en que se atiende. |
| **C-153b** | Productos "frágiles" con más relleno | Decidir si se quiere. Una columna en productos. |
| — | Taller (equipos en reparación) | SADES arriba: los datos están ahí. |

**Sin fecha (dependen de terceros o no se pidieron):**
- Binance Pay y PayPal automáticos: piden cuenta de comercio (KYB) y cuenta Business. Hoy son manuales con reserva de 2 horas.
- Crear la guía de ZOOM desde el panel: pide cuenta corporativa de ZOOM. MRW no tiene API pública.
- Importador de las historias del artefacto viejo a ElectroStudio, si Andrés las quiere.
- Vista previa en Marketing → Plantillas de los correos que aún no la tienen (orden cancelada, recarga aprobada, promotor aprobado, empresa verificada, invitación al panel, inicio de sesión nuevo, favoritos, presupuesto, garantía y avisos al equipo), si Andrés la quiere (`estado/C-175.md`).
- Firma dibujada con el dedo al aprobar una cotización (hoy la aprobación es digital, con nombre y cédula).
- Entrar con Facebook o Apple: no va por ahora (24/09).
- Búsqueda de productos en la web (C-155): un buscador con API gratuita (Brave o Google) como tercera fuente, si en producción los buscadores no le responden al servidor; buscar por código de barras desde el teléfono; proponer también la categoría y las etiquetas.

**Limpieza (sin urgencia):**
- Máquina de Andrés: la carpeta y las ramas de ChatGPT, y las ramas locales ya fusionadas (comandos en `SIGUIENTE.md`).
- Al cerrar el ciclo de pruebas: borrar el esquema `rev10_demo` y los archivos de prueba de `private-uploads/signatures/` (local).
- `public/uploads/` tiene 40 archivos versionados (favicons y fotos viejas de productos) aunque está en `.gitignore`: decidir si se sacan del índice (`git rm --cached`). Ojo: el próximo `git pull` en el servidor los borraría del disco; respaldar la carpeta antes (`estado/C-164.md`).

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
- **Taller:** espera a SADES (30/09).
- **Credenciales del historial (C-40):** revisado el 26/09, no había nada que cambiar. Si algún día se configura el webhook de SADES, usar un secreto nuevo.
