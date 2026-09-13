# Plan de Claude — orden de trabajo por rondas

> Reglas: [`/CLAUDE.md`](../../CLAUDE.md). Diseño y carriles: [`PLAN.md`](./PLAN.md). Evidencias: [`AUDITORIA.md`](./AUDITORIA.md).
> Lo que hace Gemini al mismo tiempo: [`PLAN_GEMINI.md`](./PLAN_GEMINI.md).

## 1. Qué detectó la auditoría en el carril de Claude

Es lo que requiere criterio: dinero, datos, arquitectura y las piezas que todo el sitio comparte.

| Área | Problema principal | Tarea |
|------|--------------------|-------|
| 💰 Órdenes | Precios y totales vienen del navegador; `body.userId` permite gastar saldo ajeno; número de orden con carrera y año fijo | **C-01** |
| 🔒 Datos | `costPerItem` y borradores expuestos por `GET /api/products`, APIs públicas y HTML | **C-02** |
| 🔒 Settings | `CompanySettings` completo en el HTML; 5 fetch por carga | **C-03** |
| 🔒 Varios | Clave de super admin con valor por defecto; cabeceras duplicadas; cookie `x-is-admin` sin uso | **C-04** |
| 🛒 Carrito | Cantidades se duplican al recargar; sin tope de stock; contadores distintos | **C-05** |
| 🧭 Rutas | Redirects faltantes, `/comparar` y `/mis-pedidos` huérfanas, robots bloquea `/_next/` | **C-06** |
| 🧹 Código muerto | Módulos en `lib/` y `components/ui/` sin uso; 31 `console.log` en APIs | **C-07** |
| 🎨 CSS global | Tokens sin usar, keyframes duplicados, `user-select:none`, `overflow-x:hidden` | **C-10** |
| 🔤 Fuentes | Inter no carga, Nakadai sin uso | **C-11** |
| 🧱 Base UI | No hay tarjeta de producto correcta, ni formateo único de precios, ni hook de scroll | **C-12** |
| 📦 Datos del home | Decimals crudos, ajustes del admin ignorados | **C-13** |
| 🧭 Header / nav | Detección de color por className, doble navegación en tablet, z-index caótico | **C-20 · C-21** |
| 🏠 Home | Hero de mensaje en lugar de productos | **C-22 · C-23** |
| 🛍️ Catálogo | Búsqueda que no reacciona a la URL, todo cargado al cliente, self-fetch en detalle | **C-30…C-33** |

## 2. Cómo se trabaja

- **Una tarea = una rama** `claude/C-XX` desde `main`, commits `[C-XX]` y `docs/plan/estado/C-XX.md` en el último commit.
- C-01 y C-05 son **hotfix**: Andrés los mergea y **despliega** apenas estén revisados, sin esperar al resto de la ronda.
- Antes de cada tarea: releer la fila de `AUDITORIA.md` y consultar `node_modules/next/dist/docs/` para cualquier API de Next.
- Al terminar una tarea que **desbloquea** a Gemini (marcadas 🔓), avisar a Andrés para que la mergee pronto.

## 3. Rondas (en paralelo con Gemini)

| Ronda | Claude | 🔓 Desbloquea a Gemini | Gemini al mismo tiempo |
|-------|--------|------------------------|------------------------|
| **R1** | C-01 → C-05 | G-04b, G-05g, G-06g (carrito y checkout) | G-02, G-03, G-07, G-08, G-04a, G-12 |
| **R2** | C-02 → C-03 → C-04 → C-06 → C-07 | — | G-05a…e, G-13 |
| **R3** | C-10 → C-11 | **G-06a…f (colores)** | G-09, G-05f, G-04b, G-05g |
| **R4** | C-12 → C-13 | **G-11 (scroll)** | G-06a…e |
| **R5** | C-20 → C-21 | **G-10 (z-index)** | G-06f, G-06g, G-11 |
| **R6** | C-22 → C-23 | — | G-10 |
| **R7** | C-30 → C-31 → C-32 → C-33 | — | G-14 (inventario) |
| **R8** | C-40: revisión final, README y tarjetas nuevas para Gemini a partir de G-14 | — | — |

**Regla de oro:** si una tarea de Claude necesita editar un archivo del carril Gemini, no se edita. Se deja `PEDIDO PARA GEMINI:` en el estado y Claude escribe la tarjeta en `PLAN_GEMINI.md`.

---

## 4. Detalle de tareas

### R1 · C-01 — Órdenes calculadas en el servidor 💰 (hotfix)
**Archivos:** `app/api/orders/route.ts`, `lib/pricing.ts` (nuevo), `app/checkout/page.tsx`, `components/checkout/*`.
1. Crear `lib/pricing.ts` con **una sola** función de cálculo (`calculateOrder`), usada por el servidor (fuente de verdad) y por el checkout (solo para mostrar): subtotal, envío (`weightKg`, `isConsolidable`, `shippingCost`, `shippingCostPerKg`, `minConsolidatedShipping`, `packagingFeeUSD`, `freeDeliveryThresholdUSD`), impuesto (`taxEnabled`, `taxPercent`) y total. Extraer la lógica que hoy vive en `app/checkout/page.tsx` sin cambiar el resultado.
2. Nuevo contrato del POST: `items: [{ productId, quantity, digitalUsername? }]`, `deliveryMethod`, `shippingAddress`, `paymentMethod`, `mobilePaymentData?`, `notes?`. Todo lo demás que mande el cliente se ignora.
3. En el servidor: `quantity` entero ≥ 1; productos `PUBLISHED`; precios desde Prisma; `userId` **siempre** de la sesión; min/max de orden con el total calculado; saldo WALLET descontado con el total calculado dentro de la transacción; comisión de referido con el total del servidor.
4. Número de orden `ORD-{año actual}-{secuencia}` generado **dentro** de la transacción, con reintento ante violación de `@unique`.
5. Revisar si las gift cards pasan por este endpoint (sus ids son `gift-card-*`) y no romper ese flujo.
6. Verificar con el caso normal (Pago Móvil y WALLET) y los manipulados (`total: 0.01`, `userId` ajeno, `quantity: -3`, precio alterado). Anotar los resultados en el estado.

### R1 · C-05 — Carrito 🛒 (hotfix)
**Archivos:** `contexts/CartContext.tsx`, `components/CartIcon.tsx`, `components/public/MobileNavBar.tsx`.
1. Merge con la base de datos **una vez por sesión de login**, no en cada montaje: si el carrito local viene de la misma cuenta, gana la base de datos; si el usuario era invitado, se suman cantidades con tope de stock. Marcar la sincronización por `userId` en `sessionStorage`.
2. `addItem` limita la cantidad al stock también para productos nuevos.
3. Exponer `totalItems` (unidades) y usarlo en `CartIcon` y `MobileNavBar`.
4. Prueba: logueado, agregar 1 unidad y recargar 5 veces → sigue en 1. Invitado con 2 unidades que inicia sesión → se suman una sola vez.

### R2 · C-02 — DTO público de producto 🔒
**Archivos:** `lib/dto/product.ts` (nuevo), `app/api/products/route.ts`, `app/api/products/public/route.ts`, `app/api/products/slug/[slug]/route.ts`, `app/page.tsx`, `app/productos/page.tsx`, `app/categorias/**`.
- `toPublicProduct()` con lista blanca de campos: id, name, slug, shortCode, description, priceUSD, compareAtPriceUSD, stock, images, mainImage, productType, digitalPlatform, digitalRegion, category {id, name, slug}, brand {name, slug}, isFeatured, createdAt, specs, features y los campos SEO. Decimals convertidos a `number`.
- `GET /api/products` exige permiso de admin. Antes, buscar con grep qué pantallas públicas lo consumen y migrarlas a `/api/products/public`.
- Verificación: `grep -rn costPerItem app/api/products/public app/api/products/slug app/page.tsx app/productos app/categorias` → 0, y el HTML de `/productos` no contiene `costPerItem`.

### R2 · C-03 — Settings públicos 🔒
**Archivos:** `lib/site-settings.ts`, `app/layout.tsx`, `app/providers.tsx`, `contexts/SettingsContext.tsx`, `components/public/PublicHeader.tsx`, `components/Footer.tsx`, `components/WhatsAppButton.tsx`, `components/HotAdOverlay.tsx`, `components/DynamicFavicon.tsx`, `app/api/settings/public/route.ts`, `app/page.tsx`, `app/productos/page.tsx`.
- `getPublicSettings()` con lista blanca (misma forma que la API pública). El layout la llama y la pasa como `initialSettings` a `SettingsProvider`, que ya no hace fetch al montar.
- Header, Footer, WhatsApp, HotAd y DynamicFavicon leen `useSettings()`. `<PublicHeader />` sin props sigue funcionando.
- La API pública reutiliza `getPublicSettings()`.
- Nota para Gemini: G-09 funciona antes y después de este cambio (usa `useSettings()`).

### R2 · C-04 — Endurecimiento
- `promote-super-admin`: sin `SUPER_ADMIN_PROMOTION_KEY` → 503.
- Cabeceras de seguridad solo en `next.config.js`; quitarlas de `proxy.ts`.
- Cookie `x-is-admin`: se elimina, salvo que Andrés decida implementar el modo mantenimiento (D3).

### R2 · C-06 — Rutas y SEO
- `next.config.js` redirects: `/mis-pedidos`→`/customer/orders`, `/mi-cuenta`→`/customer`, `/customer/wallet`→`/customer/balance`, `/auth/login`→`/login`, `/comparar`→`/productos` (si D1 = eliminar).
- Borrar `app/mis-pedidos/`, `app/comparar/` (según D1) y `app/(public)/layout.tsx`; quitarlos de `proxy.ts` y `robots.ts`.
- `app/api/product-requests/route.ts:63`: el link apunta a `/customer` (o crear la página si Andrés la quiere).
- `robots.ts`: quitar `/_next/` y `/uploads/` de `disallow`.
- `app/layout.tsx` y `app/productos/page.tsx`: quitar los fallbacks a `favicon.ico` y `og-image.png`, que no existen (usar logo o favicon de settings).

### R2 · C-07 — Limpieza del carril Claude
- Verificar con grep y borrar: `lib/utils.ts`, `lib/validation.ts`, `lib/reviews.ts`, `lib/pago-movil/index.ts`, `components/ui/Card.tsx`, `components/ui/GlossyIcon.tsx`, `components/ui/ProductImage.tsx`, `components/ui/index.ts`. Comprobar los email templates `OrderStatusUpdate`, `PasswordReset` y `Welcome` antes de decidir.
- Quitar los `console.log` de `app/api/**` y `lib/**` (conservar `console.error`).
- Preguntar a Andrés si saca `public/uploads/` del índice de git (`git rm --cached`).

### R3 · C-10 — CSS global y tokens 🎨 🔓 (desbloquea G-06)
**Archivos:** `app/globals.css`, `components/public/PageAnimations.tsx` (borrar), `app/page.tsx` (quitar su uso).
- `@theme`: todos los colores de `PLAN.md` §1.1 con los **nombres exactos** que usa la tabla de `GEMINI.md` §4 (`brand-50…950`, `ink`, `ink-soft`, `muted`, `subtle`, `line`, `line-strong`, `surface`, `accent`, `deal`, `deal-bg`, `tag`, `success`, `success-strong`, `warning`, `warning-strong`, `danger`, `info`, `whatsapp`). `font-sans` y `font-brand`.
- `:root`: `--z-*` de §1.3 y `--bottom-nav-h`.
- Borrar keyframes y clases duplicadas, y las redefiniciones de `animate-spin`/`animate-pulse`.
- `user-select: none` solo en `button, nav, [role=button]`; `html, body { overflow-x: clip }`; quitar `a, button { transition: all }` y `body.hot-ad-active [class*="z-40"]`.
- Verificación: una página de prueba con `bg-brand-500 text-ink border-line` se ve bien; el texto de un producto se puede seleccionar; `grep -c "@keyframes fadeIn" app/globals.css` → 1.
- Al terminar, confirmar que la tabla de `GEMINI.md` §4 coincide con los tokens reales.

### R3 · C-11 — Fuentes
- Agregar `public/fonts/InterVariable.woff2` (licencia OFL) y cargarla con `next/font/local` como `--font-sans`. Tektrron como `--font-brand`. Eliminar Nakadai y el objeto falso `inter`.
- Header y Footer: `style={{fontFamily}}` → clase `font-brand`.

### R4 · C-12 — Componentes base 🧱 🔓 (desbloquea G-11)
- `lib/currency.ts`: `formatUSD`, `formatVES` (formato de D4).
- `lib/hooks/useBodyScrollLock.ts`: `export function useBodyScrollLock(locked: boolean): void`, con un contador global para que varios modales abiertos no se pisen. **Ruta y firma exactas**: G-11 depende de ellas.
- `components/ui/`: `Container`, `SectionHeader`, `Price`, `ProductBadge`, `ProductCard` (v2, *stretched link*), `ProductShelf` (scroll-snap CSS; flechas solo en `lg`), `AddToCartButton`, `ShareButton`.
- `components/ui/README.md` con un ejemplo de uso de cada uno.
- Migrar `MobileNavBar`, `ProductosClient` y demás usos manuales de `body.style.overflow` del carril Claude al hook.

### R4 · C-13 — Queries del home
`lib/queries/home.ts`: `getFeatured(max)`, `getDeals()`, `getBestSellers(days=90)`, `getNewArrivals()`, `getTopCategoriesWithProducts(n=3)`, `getCategoriesRail(max)`. Todas devuelven DTO y respetan `autoHideOutOfStock`. Envolverlas con `cache()` de React.

### R5 · C-20 — Header nuevo
Según `PLAN.md` §2: buscador en el header (`/productos?search=`), franja `brand-600` con mega menú de categorías, tasa BCV, sin detección de secciones ni animaciones infinitas, navegable con teclado. `<PublicHeader />` sin props sigue funcionando.

### R5 · C-21 — Barra móvil y flotantes 🔓 (desbloquea G-10)
- `MobileNavBar`: `z-[var(--z-bottomnav)]`, drawer con Esc, foco y `aria-*`, `totalItems`.
- Padding inferior global `< lg` con `--bottom-nav-h` y `safe-area-inset-bottom`.
- `WhatsAppButton`: por encima de la barra y sin badge "1" falso. Eliminar `MobileScrollProgress`.
- Toaster en `z-[var(--z-toast)]`.

### R6 · C-22 — Home vitrina
`app/page.tsx` según `PLAN.md` §3 con C-12 y C-13. Borrar `HomeSearchBar` y `ProductCarousel`. Respetar `maxFeaturedProducts`, `showCategories`, `maxCategoriesDisplay` y `heroVideo*`. QA: a 360px, el primer pantallazo muestra al menos 1 producto con precio y botón.

### R6 · C-23 — Popup promocional
Según D2: cierre inmediato, máximo 1 vez cada 24 h, solo en el home, sin bloquear el touch, `z-[var(--z-popup)]`, cierre con Esc.

### R7 · C-30…C-33 — Catálogo
- **C-30** `/productos`: búsqueda, filtros, orden y paginación en el servidor con `searchParams`; URL como fuente de verdad; drawer de filtros encima de la barra; "Destacados" ordena; sin tope de $10.000.
- **C-31** Detalle de producto: Prisma directo con `cache()` (sin self-fetch ni `NEXT_PUBLIC_APP_URL`), metadata una sola vez, barra sticky "Agregar" en móvil, `compareAtPriceUSD` visible, relacionados con ProductCard v2.
- **C-32** `/categorias` y `/categorias/[category]` con el nuevo sistema y Footer.
- **C-33** Imágenes: evaluar quitar `images.unoptimized`, migrar `<img>` del carril Claude y medir Lighthouse móvil antes y después.

### R8 · C-40 — Cierre
Revisar las ramas `gemini/*` pendientes, convertir el reporte G-14 en tarjetas nuevas (precios con `toFixed` → `formatUSD`, `<style jsx>`, `<img>`), actualizar el README y correr el checklist de `PLAN.md` §6 con Andrés.

---

## 5. Puntos de merge para Andrés

| Cuándo | Qué mergear | Por qué no esperar |
|--------|-------------|--------------------|
| Ahora | `gemini/G-01` | Ya está revisada. El diff muestra los docs "borrados" solo porque salió de antes del commit del plan; el merge **no** borra nada. |
| Apenas estén listas | `claude/C-01`, `claude/C-05` + **deploy** | Son vulnerabilidades y bugs que existen hoy en producción. |
| Fin de cada ronda de Gemini | `gemini/R1`, `gemini/R2`, … | La siguiente ronda de Gemini sale de `main`. |
| Apenas esté lista | `claude/C-10` | Desbloquea los 7 lotes de colores de Gemini. |
| Apenas estén listas | `claude/C-12`, `claude/C-21` | Desbloquean G-11 y G-10. |
