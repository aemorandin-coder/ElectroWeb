# Plan maestro — Rediseño "vitrina" + saneamiento

> Diagnóstico con evidencias: [`AUDITORIA.md`](./AUDITORIA.md)
> Reglas por agente: [`/CLAUDE.md`](../../CLAUDE.md) y [`/GEMINI.md`](../../GEMINI.md)
> **Planes de trabajo en paralelo (rondas):** [`PLAN_CLAUDE.md`](./PLAN_CLAUDE.md) y [`PLAN_GEMINI.md`](./PLAN_GEMINI.md)
> Progreso: carpeta [`estado/`](./estado/) con **un archivo por tarea** (`C-01.md`, `G-05a.md`…). Cada agente crea solo archivos con su prefijo, así las ramas nunca chocan.

## 0. Objetivo

1. **El home vende.** Lo primero que se ve son productos con precio y botón de compra, no un mensaje. La estructura toma a BestBuy como referencia: buscador protagonista en el header, franja de categorías, vitrinas de productos y confianza.
2. **ElectroShop sigue siendo ElectroShop.** Se conservan el wordmark Tektrron con degradado azul, el azul `#2a63cd`, la barra inferior móvil oscura y el tono cercano en español venezolano.
3. **Primero se blindan el dinero y los datos**, antes de tocar un píxel (Fase 0).
4. **Dos agentes sin choques:** carriles de archivos separados, dependencias explícitas y un archivo de estado por tarea.

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

### Carril CLAUDE (Gemini tiene prohibido editar)
```
app/api/**            prisma/**             lib/**               contexts/**
proxy.ts              next.config.js        package.json         *.config.*
app/layout.tsx        app/providers.tsx     app/globals.css      app/page.tsx
app/(public)/**       app/productos/**      app/categorias/**    app/comparar/**
app/mis-pedidos/**    app/carrito/**   (*)  app/checkout/**  (*)  app/robots.ts  app/sitemap.ts
components/public/**  components/home/**    components/ui/**     components/notifications/**
components/catalog/**  components/product/**
components/checkout/** (*)   components/Footer.tsx   components/CartIcon.tsx
components/UserAccountButton.tsx   components/WhatsAppButton.tsx   components/HotAdOverlay.tsx
components/MobileScrollProgress.tsx   components/DynamicFavicon.tsx   components/AnalyticsTracker.tsx
app/login/**  app/registro/**  components/auth/**        (desde C-84: seguridad y registro con Google)
CLAUDE.md  GEMINI.md  CHATGPT.md  docs/plan/PLAN*.md  docs/plan/AUDITORIA*.md  docs/plan/estado/C-*.md
```
(*) Se **liberan para Gemini** cuando `estado/C-01.md` y `estado/C-05.md` digan `Estado: HECHO` en `main` (solo para las tareas G-05g y G-06g).

### Carril GEMINI
```
app/customer/**          components/customer/**
app/cursos/**            components/cursos/**
app/servicios/**         components/servicios/**
app/contacto/**          components/contact/**
app/gift-cards/**        app/canjear-gift-card/**
app/solicitar-producto/**  app/privacidad/**  app/terminos/**
components/modals/**  components/reviews/**  components/orders/**  components/social/**
components/pago-movil/**  components/onboarding/**
app/admin/**  components/admin/**   ← SOLO arreglos mecánicos pedidos por una tarjeta G (ver GEMINI.md §2). Nada de lógica.
                                        Excepto admin/(dashboard)/settings/** y products/** (C-50 y C-51).
docs/plan/estado/G-*.md
```
Desde R12 (2026-09-16), solo para cambiar clases: `components/ui/**`, `components/Footer.tsx`, `components/UserAccountButton.tsx`, `components/CartIcon.tsx` y el resumen de `app/checkout/page.tsx` (ver `PLAN_GEMINI.md`, Ronda R12).

### Ex carril CHATGPT · **ChatGPT salió del equipo el 21/09**
Estas pantallas vuelven a **Claude** (rediseño y jerarquía, con la guía de `CHATGPT.md` §4). Gemini solo entra con una tarjeta G que las nombre (R20: limpieza mecánica de `products/**`). Tabla de lo pendiente: "Salida del 21/09" en `PLAN_CHATGPT.md`.
Lo que era de cada ronda de ChatGPT, como referencia:
```
R1: app/admin/(dashboard)/page.tsx   app/admin/(dashboard)/orders/**   app/admin/(dashboard)/customers/**
    app/admin/(dashboard)/transactions/**   app/admin/(dashboard)/gift-cards/**   app/admin/(dashboard)/reports/**
    app/creator/**   app/recuperar-contrasena/**   app/verificar-email/**
    app/admin/(dashboard)/layout.tsx → solo el className del contenedor de {children} (GPT-01)
    app/customer/(dashboard)/orders/[id]/digital/** (autorizado por Andrés, GPT-02)
R2: app/admin/(dashboard)/products/**   (antes C-51 de Claude; reasignado el 17/09)
R3: app/admin/(dashboard)/{payments,inquiries,messages,product-requests,discount-requests,reviews,verifications,categories,servicios,legal}/**
docs/plan/estado/GPT-*.md
```
Si una ronda de Gemini necesita un archivo de Claude, Claude lo autoriza en la tarjeta antes de empezar.

Borrado de archivos muertos (G-02): **solo** la lista exacta de esa tarea, aunque el archivo esté en el carril de Claude.

### Protocolo anti-choque
1. **Worktrees separados.** Claude trabaja en la carpeta principal, en ramas `claude/<id>`. Gemini trabaja en su carpeta (`../ElectroShopVe-gemini`, ramas `gemini/RN`):
   ```bash
   git worktree add "../ElectroShopVe-gemini" -b gemini/base
   ```
   Gemini usa **una rama por ronda** (`gemini/R1`, `gemini/R2`…) creada desde `main` actualizado, con un commit por tarea. Claude usa una rama por tarea (`claude/C-XX`).
2. **Tú (Andrés) integras a `main`.** Ningún agente hace merge a `main`, push `--force`, `rebase` de ramas ajenas ni `reset --hard`.
3. **Una tarea = una rama = uno o varios commits con prefijo** `[C-01]` o `[G-05a]`.
4. **Dependencias duras:** una tarea no empieza si su dependencia no figura como `HECHO` y mergeada en `main`.
5. **Estado:** al terminar (o bloquearse) una tarea, el agente crea `docs/plan/estado/<ID>.md` con `Estado: HECHO` o `Estado: BLOQUEADO — motivo`, dentro del mismo commit. Nunca edita archivos de estado del otro prefijo.
6. **Si Gemini necesita algo del carril Claude** (un token nuevo, un componente, una ruta de API), lo escribe como `PEDIDO:` en el archivo `estado/G-XX.md` de su tarea actual y sigue con otra tarea.

---

## 5. Tablero de tareas

Leyenda de dependencias: `—` = puede empezar ya.

### FASE 0 — Blindaje (CLAUDE) · bloqueante · antes de cualquier cambio visual

| ID | Tarea | Depende | Criterio de hecho |
|----|-------|---------|-------------------|
| **C-01** | `POST /api/orders`: recalcular precio, subtotal, envío, impuesto y total **en el servidor** desde Prisma; ignorar `body.userId`; `quantity` entero > 0; número de orden `ORD-{año actual}-XXXX` generado dentro de la transacción con reintento por `@unique`; comisión de referidos con el total del servidor. Adaptar `app/checkout/page.tsx` al nuevo contrato. | — | Un POST manipulado (total 0.01 con WALLET, `userId` ajeno o cantidad negativa) se rechaza o se recalcula. Una compra normal sigue funcionando. |
| **C-02** | DTO público `lib/dto/product.ts` (lista blanca de campos) aplicado a `/api/products/public`, `/api/products/slug/[slug]`, home, `/productos` y categorías. `GET /api/products` pasa a exigir admin. | — | `grep costPerItem` en rutas públicas y páginas = 0. El HTML de `/productos` no contiene `costPerItem`. |
| **C-03** | `getPublicSettings()` con lista blanca; `SettingsProvider` recibe `initialSettings` desde el layout; Footer, WhatsApp, HotAd, DynamicFavicon y Header leen del contexto. | — | 0 requests a `/api/settings/public` al cargar el home. `adminAlertEmails` no aparece en el HTML. |
| **C-04** | Quitar el fallback de `SUPER_ADMIN_PROMOTION_KEY`; unificar cabeceras de seguridad en `next.config.js`; resolver la cookie `x-is-admin` (implementar mantenimiento o borrarla). | — | Sin clave → 503. Una sola fuente de cabeceras. |
| **C-05** | Carrito: arreglar el merge (no sumar en cada recarga); tope de stock al agregar; exponer `totalItems` (unidades) y usarlo en header y barra móvil. | — | Recargar 5 veces logueado no cambia las cantidades. Los dos contadores muestran lo mismo. |
| **C-06** | Rutas: redirects en `next.config.js` (`/mis-pedidos`→`/customer/orders`, `/mi-cuenta`→`/customer`, `/customer/wallet`→`/customer/balance`, `/auth/login`→`/login`); borrar `app/mis-pedidos`, `app/(public)/layout.tsx` y `/comparar` (**decisión pendiente**); link `/customer/product-requests` en la API; `robots.ts` sin `/_next/` ni `/uploads/`; quitar fallbacks a `favicon.ico`/`og-image.png` inexistentes. | — | Ningún `href` o `push` apunta a una ruta inexistente. |

### FASE 1 — Fundaciones de diseño (CLAUDE)

| ID | Tarea | Depende | Criterio de hecho |
|----|-------|---------|-------------------|
| **C-10** | `globals.css`: tokens de §1.1 y §1.3, borrar keyframes duplicados y `PageAnimations`, quitar `user-select:none` global (dejarlo solo en botones y nav), `overflow-x: clip`, quitar `transition: all` global y la regla `[class*="z-40"]`. | — | Las clases `bg-brand-500`, `text-ink`, `border-line` funcionan. Se puede seleccionar texto. |
| **C-11** | Fuentes: Inter variable local (`font-sans`), Tektrron (`font-brand`), eliminar Nakadai y el objeto falso `inter`. | — | En DevTools, el body usa Inter. |
| **C-12** | Primitivas: `Container`, `SectionHeader`, `Price`, `ProductBadge`, `ProductCard` v2, `ProductShelf` (scroll-snap CSS, flechas en desktop), `AddToCartButton`, `useBodyScrollLock` (contador de bloqueos), `lib/currency.ts`. Documentarlas en `components/ui/README.md`. | C-10 | Página de muestra interna o storybook mínimo verificable a 360px y 1280px. |
| **C-13** | `lib/queries/home.ts`: featured, deals, bestSellers, newArrivals, topCategories, categoriesRail. Todas devuelven DTO. | C-02 | Cada query probada con datos reales; sin Decimals crudos. |

### FASE 2 — Header y home (CLAUDE)

| ID | Tarea | Depende | Criterio de hecho |
|----|-------|---------|-------------------|
| **C-20** | Header nuevo (§2) con buscador, franja de categorías, mega menú y tasa BCV. `<PublicHeader />` **sin props debe seguir funcionando** (Gemini lo usa en sus páginas). | C-03, C-10, C-12 | Sin detección de secciones por className; sin animaciones infinitas; accesible con teclado. |
| **C-21** | Barra móvil: breakpoint `lg`, contador en unidades, drawer accesible (Esc, foco, aria); variable `--bottom-nav-h` y padding inferior global; WhatsApp encima de la barra y sin badge falso; eliminar `MobileScrollProgress`. | C-10, C-05 | A 360px nada queda tapado; a 768px hay una sola navegación. |
| **C-22** | Home nuevo (§3). Borrar `HomeSearchBar` y `ProductCarousel`. | C-12, C-13, C-20 | Primer pantallazo a 360px: header, buscador, chips y al menos 1 producto con precio y botón. |
| **C-23** | `HotAdOverlay`: se puede cerrar al instante, máximo 1 vez cada 24 h, solo en el home, sin bloquear el touch (**decisión pendiente**). | C-03 | — |

### FASE 3 — Catálogo (CLAUDE)

| ID | Tarea | Depende | Criterio de hecho |
|----|-------|---------|-------------------|
| **C-30** | `/productos`: búsqueda, filtros, orden y paginación en el servidor con la URL como fuente de verdad (`useSearchParams`); filtros móviles por encima de la barra; "Destacados" ordena en vez de filtrar; sin límite de $10.000. | C-12, C-20 | Buscar desde el header estando en `/productos` actualiza los resultados. El botón "Atrás" conserva los filtros. |
| **C-31** | Detalle de producto: Prisma directo (sin self-fetch) con `cache()` compartido entre metadata y página; relacionados con ProductCard v2; barra sticky "Agregar" en móvil por encima de la barra inferior; mostrar `compareAtPriceUSD`. | C-02, C-12 | Funciona sin `NEXT_PUBLIC_APP_URL`. |
| **C-32** | `/categorias` y `/categorias/[category]` al nuevo sistema, con Footer. | C-12 | — |
| **C-33** | Imágenes: evaluar quitar `images.unoptimized` (sharp ya está instalado) y migrar los `<img>` del carril Claude. | C-22 | Lighthouse móvil del home antes y después, anotado en el estado. |
| **C-40** | README actualizado, revisión de todas las ramas de Gemini y checklist QA final (§6). | todo | — |

### Tareas de GEMINI
Tarjetas G-01 a G-08 en **`/GEMINI.md`**; G-09 a G-14 y el orden por rondas en **`PLAN_GEMINI.md`**. Resumen:

| ID | Tarea | Depende |
|----|-------|---------|
| **G-01** | Corregir links a rutas inexistentes dentro de su carril | — |
| **G-02** | Borrar archivos muertos (lista cerrada) | — |
| **G-03** | Agregar `PublicHeader` y `Footer` a `privacidad`, `terminos` y `canjear-gift-card` | — |
| **G-04** | Reemplazar `alert()` por `toast` | G-04a: — · G-04b: C-01 y C-05 |
| **G-05a…g** | Tipografía: eliminar tamaños ilegibles y `font-black`/`font-extrabold` por lotes | a–e: — · f: al final · g: C-01 y C-05 |
| **G-06a…g** | Colores: hex → tokens por lotes | **C-10** (todos) · g: además C-01 y C-05 |
| **G-07** | `h-screen`/`min-h-screen` → `h-dvh`/`min-h-dvh` en su carril | — |
| **G-08** | Hacer visibles en táctil 4 controles que hoy solo aparecen con hover | — |
| **G-09** | Settings desde `useSettings()` en 5 páginas (sin fetch duplicado) | — |
| **G-10** | z-index gigantes → variables de capa | C-10 y C-21 |
| **G-11** | Bloqueo de scroll con `useBodyScrollLock` en 4 archivos | C-12 |
| **G-12** | Quitar `animate-pulse` de las manchas de blur | — |
| **G-13** | Contraste: `text-white/30…60` → `/80` | — |
| **G-14** | Inventario final (solo reporte) | R6 |

El orden por rondas, sincronizado con Claude, está en [`PLAN_GEMINI.md`](./PLAN_GEMINI.md) §3 y [`PLAN_CLAUDE.md`](./PLAN_CLAUDE.md) §3.

---

## 6. QA manual (lo haces tú antes de mergear cada fase)

Anchos a probar: **360 · 390 · 768 · 1024 · 1440 px** (DevTools → modo responsive). Incluir un Android real de gama media si es posible.

- [ ] Home a 360px: el primer pantallazo muestra al menos 1 producto con precio y botón "Agregar".
- [ ] Buscar desde el header, estando en el home y estando en `/productos`.
- [ ] Agregar al carrito desde una card del home, recargar 3 veces logueado: la cantidad no cambia.
- [ ] A 768px se ve **una** sola navegación.
- [ ] Panel de filtros móvil: el botón "Ver N productos" es visible y se puede tocar.
- [ ] Se puede seleccionar y copiar el nombre y el precio de un producto.
- [ ] El popup promocional se cierra al primer toque.
- [ ] Checkout completo con Pago Móvil y con saldo (WALLET).
- [ ] Ver el código fuente del home y de `/productos`: buscar `costPerItem` y `adminAlertEmails` → 0 resultados.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores nuevos.

## 7. Decisiones pendientes (Andrés)

| # | Decisión | Propuesta por defecto |
|---|----------|-----------------------|
| D1 | `/comparar`: ¿arreglar o eliminar? | Eliminar y redirigir a `/productos` (nadie la enlaza y está rota). |
| D2 | Popup promocional: ¿mantener la cuenta regresiva obligatoria de 5 s? | Quitarla; cierre inmediato; máximo 1 vez cada 24 h. |
| D3 | Modo mantenimiento: ¿implementarlo o eliminar el toggle del admin? | Implementarlo en `proxy.ts` (el campo ya existe). |
| D4 | Formato de precio USD | `$1.099,00` (separadores venezolanos). |
| D5 | Categorías fijas en la franja del header | Automáticas: las 2 con más productos. |
