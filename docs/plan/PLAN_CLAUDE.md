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

### Ajuste tras la revisión R1-R3 (2026-09-12)
Gemini avanzó más rápido de lo previsto: R1, R2 y R3 están aprobadas ([`revisiones/R1-R3.md`](./revisiones/R1-R3.md)). Lo único que le queda sin dependencias es R3b (G-15, G-16); después **se bloquea hasta que exista C-10**.
- **C-01/C-05** siguen en curso en la carpeta principal (rama `claude/C-01`, cambios sin commitear). No se tocan desde otra sesión.
- **C-10 y C-11 se adelantan** y se hacen **en paralelo** con C-01, en un worktree separado (`claude/C-10`, `claude/C-11`), porque no comparten archivos (`globals.css`, `layout.tsx`, fuentes) con órdenes y checkout.
- Orden efectivo: **C-01 + C-10 → C-05 + C-11 → C-02 → C-03 → C-04 → C-06 → C-07 → C-12 …**

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
- Verificación: una página de prueba con `bg-brand-500 text-ink border-line` se ve bien; el texto de un producto se puede seleccionar; `grep -cw "@keyframes fadeIn" app/globals.css` → 1 (con `-w`, para no contar `fadeInUp`).
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

## 4b. Ronda R11-R12 (desde 2026-09-15) · orden de trabajo vigente

> Antes de cada tarea, lee `docs/plan/SIGUIENTE.md` (estado de ramas, deploy pendiente y qué esperan Gemini y ChatGPT).
> Regla vigente de Andrés: **en todo lo que toques o leas, busca bugs, huecos de seguridad, código mal hecho y diseño inconsistente**; arregla lo del carril Claude y anota el resto en el estado.
> Del 16/09 al 21/09 hubo un tercer agente, **ChatGPT** (diseño y jerarquía). **Salió del equipo el 21/09:** su carril y sus tarjetas pendientes son de Claude (filas 15-17).

| Orden | Tarea | Estado |
|---|---|---|
| 1 | **Revisar y mergear `gemini/R10` (G-35…G-37)** | ✅ Hecho (C-77) |
| 2 | **C-74 · Flujo de órdenes del admin** | ✅ Hecho |
| 3 | **C-55 · Marco del panel del cliente** | ✅ Hecho |
| 4 | **C-78 · Retoques de la tienda** | ✅ Hecho |
| 4b | **C-82 · Hotfix aprobar cursos y creadores** | ✅ Hecho |
| 4c | **C-83 · Hotfix login con mayúsculas en el correo** | ✅ Hecho (causa del "Credenciales invalidas" del cliente) |
| 5 | **C-75 · Marketing y Contenido** | ✅ Hecho (campañas con imágenes, promotores, plantillas reales; crea 2 tablas en el deploy) |
| 5b | **C-84 · Registro más fácil y perfil blindado** | ✅ Hecho. Análisis y plan de Google en `AUDITORIA_REGISTRO.md` |
| 6 | **Revisar R10 (G-38, G-39) y R11 (G-40…G-43)** | ✅ Hecho (C-86, 6 arreglos) |
| 6b | **C-88 · Contraseñas con una sola regla** | ✅ Hecho (recuperar la clave cierra sesiones) |
| 7 | **C-85 · Google, cédula fuera del registro y datos en la primera compra** | ✅ Hecho (el botón aparece cuando Andrés ponga las claves; decisiones del 16/09 aplicadas) |
| 8 | **C-87 · Gift card solo con saldo** | ✅ Hecho (sin saldo se recarga en la misma página; `users/check` sin nombre y con tope) |
| 8b | **C-89 · Onboarding con física** | ✅ Hecho (recorrido con resortes y confeti, misiones del panel con progreso real) |
| 8c | **C-90 · Revisar `gemini/R12`** | ✅ Hecho (salió bien; 3 arreglos del carril Claude) |
| 8d | **C-91 · Revisar `chatgpt/R1` (GPT-01, GPT-02), super merge y push** | ✅ Hecho el 17/09 (sin editar código). Incidente de clientes borrados auditado. |
| — | **Descanso de Claude 17/09 → 20/09** | Gemini hace R13-R15 y ChatGPT R1-R3 en ramas encadenadas. Nadie mergea. |
| 9 | ~~Al volver: revisar `gemini/R13`, `R14`, `R15`~~ ✅ C-93 | Una rama sale de la anterior: mergear `R15` trae las tres. R14 toca APIs de dinero: revisar el `git diff -w` que pegó en cada estado y correr las pruebas de C-74, C-84, C-85, C-87 y C-88. |
| 10 | ~~Al volver: revisar `chatgpt/R1`, `R2` y `R3`~~ ✅ C-94 | ChatGPT solo hizo GPT-05 y GPT-06 (aprobadas). R2 y R3 no empezaron: **ChatGPT en pausa desde el 21/09**. |
| 8e | **C-93 · Revisar Gemini R13-R15 y ChatGPT GPT-03/04, merge y push** | ✅ Hecho el 17/09 (91 de 91 pruebas; ESLint 403→197 errores) |
| 10b | **C-94 · Revisar Gemini R16 y ChatGPT GPT-05/06, cerrar ChatGPT y plan final de Gemini** | ✅ Hecho el 21/09. Rama `claude/C-94` lista para mergear. |
| 10c | **C-95 · Home al día tras guardar productos y margen digital recordado** | ✅ Hecho el 21/09 (rama `claude/C-95`, sobre C-94). 24 pruebas HTTP y el flujo del wizard en el navegador. |
| 10d | ✅ API: **C-97 · Masivos de productos** (21/09, rama `claude/C-97`): valores validados y los digitales no cambian de precio. **"Duplicar" espera la decisión de Andrés** (su botón está en la pantalla de ChatGPT, en pausa). |
| 11 | **C-92 · Clientes: desactivar en vez de borrar** | `AUDITORIA_CLIENTES_BORRADOS.md`. **Decisión 17/09:** "Eliminar" borra de verdad solo si el cliente no tiene órdenes, saldo, transacciones ni gift cards (spam); si tiene algo, se desactiva. Con la salida del diagnóstico de Andrés. Migración de `onDelete` con su OK. |
| 12 | ✅ **C-80 · Login con límite de intentos en el servidor** (21/09, rama `claude/C-80`) | Más: cuentas desactivadas (junto con C-92), `GET /api/user/profile` sin DTO, y **`/api/debug/og-metadata` en producción** (revisar si se borra o se protege). |
| 12b | ~~Facebook (sobre C-85)~~ | **No va (decisión de Andrés, 24/09):** no se creará la app de Meta por ahora. No se deja ningún botón a medias. |
| 13 | ✅ **C-60b · Surtido de pedidos digitales** (21/09, rama `claude/C-60b`) | Proveedor, referencia y costo en el pedido; aviso "Pedido digital por entregar"; un código por unidad con bloqueo; `isDelivered` corregido; correo del código escapado. |
| 13a | ✅ **C-96 · Montos exactos en la base** (21/09, rama `claude/C-96`) | `montoDecimal()` en saldo, órdenes, recargas, Pago Móvil, gift cards, cursos y comisiones. **Falta el OK de Andrés para redondear los saldos que ya existen** (SQL en `estado/C-96.md`). |
| 13b | ✅ **C-98 · Revisar Gemini R17-R19** (21/09, rama `claude/C-98`) | Aprobadas las 7. ESLint 201 → 144 errores. Hallazgo: las acciones masivas de productos no tienen casillas para seleccionar (se perdieron en febrero) → pantalla de productos. |
| 13c | **Pendientes encontrados en C-94** | Reglas de hooks que no son de Gemini: `set-state-in-effect` (41), `purity` (9) y `exhaustive-deps` (18). `any` en `lib/auth.ts` (14) y `app/checkout/page.tsx` (9). `ImageUploadField` sobre fondo claro (pedido de GPT-05). `prompt()` en `verificar-email`. Cajones móviles (admin, cliente, creador) que dejan pasar el foco con Tab estando cerrados (`inert`). |
| 13d | ✅ **C-99 · Salida de ChatGPT, ronda R20 de Gemini y auditoría de envíos** (21/09, rama `claude/C-99`, solo documentos) | `AUDITORIA_ENVIOS.md`: 14 hallazgos (E1-E14) y la API de ZOOM probada. |
| 14 | **C-40 · Cierre** | README, checklist de `PLAN.md` §6 con Andrés, con el inventario G-61. |
| 15 | **C-100 · Envíos con ZOOM y MRW** 💰 | `AUDITORIA_ENVIOS.md` §5. **Espera las decisiones D-E1…D-E4 de Andrés** (quién paga el flete, qué es "a domicilio", cuentas corporativas, migración). Fase 1 sin credenciales: oficinas reales, datos del destinatario en la orden, no enviar sin pago, historial y avisos de ZOOM. Incluye los ajustes de órdenes de GPT-02. Prueba final de punta a punta en el navegador (física y digital). |
| 16 | **C-51 · Productos del admin** (vuelve de ChatGPT R2) | Después de Gemini R20. Mapa primero (lo de GPT-07), luego lista, masivos con sus casillas (se perdieron, C-98), edición rápida (`handleExcelChange` sin campo), "Duplicar" (decisión de Andrés) y wizard. `primaryCurrency` ya no se edita: USD y Bs. |
| 17 | **Rediseño del resto del panel** (ex R3 de ChatGPT) | `payments`, `inquiries`/`messages`, `product-requests`/`discount-requests`, `reviews`/`verifications`, `categories`/`servicios`/`legal`. Una pantalla por tarea, guía de `CHATGPT.md` §4. |
| 19 | **C-102 · Descuentos de verdad** 💰 | Hoy solo existe el descuento por producto que pide el cliente y aprueba el admin (`discount-requests`). Falta lo que pidió Andrés: descuentos creados por la tienda (por producto, categoría o cupón), con vigencia, tope de usos y su efecto en `lib/pricing.ts` y en la ficha. Dinero: lo calcula el servidor. |
| 20 | **C-103 · Firma de documentos con física y rediseño** | `components/modals/BalanceTermsModal.tsx` firma en un canvas solo para los términos del saldo. Falta: firmar cualquier documento legal, con el trazo bien en el teléfono, rediseñado y con la física de C-71/C-89. El documento firmado se guarda y se puede descargar (hoy `documentPath` queda en null). |
| 21 | **C-104 · Reportes reales y conectados** | `app/api/admin/reports/route.ts` ya consulta la base, pero "Interacciones" y "Seguridad" salen casi vacías: `AuditLog` solo se escribe en 3 sitios (promover super admin, activar gift cards y sumar saldo) y los inicios de sesión no quedan registrados ahí. Falta registrar los hechos importantes y que cada número de la pantalla diga de dónde sale. |
| 22 | **C-105 · IP real del dispositivo** 🔒 | A todos les aparece la misma IP ("1", casi seguro `::1`). El código lee bien `x-forwarded-for`, así que el problema está en el proxy del servidor: hay que ver el nginx de producción. Además: normalizar `::1` y `::ffff:`, quedarse con la primera IP pública de la lista, y no mostrar una IP que no es de confianza como si lo fuera. Toca `lib/audit-log.ts`, `lib/maintenance.ts`, `lib/auth.ts`, `app/api/analytics` y `app/api/customer/balance/terms`. |
| 22b | ✅ **C-106 · Cobro de envío transparente y logos de ZOOM y MRW** (24/09, rama `claude/C-106`) | Resumen con "Embalaje" y "Flete: al retirar", "Total a pagar hoy", logos oficiales y una sola caja de confianza. Falta verlo con datos tras el deploy y decidir si se promete seguro (`estado/C-106.md`). |
| 22c | **C-107 · Seguro del envío a elección del cliente** 💰 | **Decisión de Andrés (24/09):** se le pregunta al cliente. En el checkout, con ZOOM o MRW: "Asegurar mi envío (declarar el valor de la compra)". El seguro lo cobra la empresa junto con el flete, al retirar. La orden guarda la elección, y el panel la muestra en "Copiar datos para la guía". **Antes:** confirmar con ZOOM y MRW en Guanare cuánto cobran y si aplica con cobro a destino. **Necesita una columna nueva en `orders` (migración con el OK de Andrés).** Con esto vuelve a la caja de confianza un texto verdadero: "Puedes asegurar tu envío". |
| 18 | **Revisar `[Marketing]` de Gemini** (2 commits directos en `main`, 21/09) | Revisados en C-99 sin bloqueo. Falta: `GET /api/admin/campaigns/recipients` devuelve **todos** los correos sin límite a cualquiera con `MANAGE_CONTENT` → paginar y pedir también `MANAGE_USERS` (el permiso de clientes). |

Reasignadas el 17/09: **C-51** (productos del admin) → ChatGPT R2 (GPT-07…GPT-11). **C-76** (emojis de correos) → Gemini G-53.
Reasignadas el 16/09: **C-79** (panel de creadores en móvil) → ChatGPT GPT-05. **C-81** (`components/ui`, Footer, botón de cuenta, carrito del header con estilos viejos) → Gemini G-45 y G-46, solo clases.

### C-74 · Flujo de órdenes del admin 💰
**Archivos:** `app/api/orders/route.ts` (PATCH), `app/admin/(dashboard)/orders/page.tsx`, `app/admin/(dashboard)/orders/[id]/digital/page.tsx`, `app/api/orders/[id]/digital/route.ts`, `lib/stock.ts`.
Hallazgos confirmados leyendo el código (C-73):
1. **"Marcar como pagado" no descuenta stock.** El botón manda `status: 'PAID'`, pero el descuento solo corre con `paymentStatus: 'PAID'`. La reserva de 5 minutos vence y el producto se puede vender dos veces. Tampoco se llena `paidAt` ni `paymentStatus`, así que la página de pedido digital (que exige `paymentStatus === 'PAID'`) nunca deja entregar el código.
2. **Cancelar desde el panel siempre falla:** el servidor exige una nota de 10 caracteres y el botón no la envía. Hace falta un modal con el motivo.
3. **Cancelar devuelve stock aunque nunca se descontó** (órdenes sin pagar), también a productos digitales, y borra **todas** las reservas del cliente (otras órdenes pendientes pierden la suya). Pasar de CANCELLED a otro estado y cancelar otra vez devuelve stock dos veces.
4. **`updateData = { ...body }`:** asignación masiva. Quien tenga `MANAGE_ORDERS` puede cambiar `totalUSD`, `userId`, etc. → lista blanca con zod.
5. **Transiciones de estado sin validar** (se puede ir de DELIVERED a PENDING). Definir la máquina de estados permitida.
6. **Cancelar una orden pagada con saldo no reintegra el saldo** (TODO en el código). **Decisión de Andrés:** ¿reintegro automático al saldo o manual?
7. Los correos de cancelación insertan `body.notes` sin escapar.
- **Verificación:** pruebas HTTP del caso normal y del manipulado (doble clic en pagar, cancelar dos veces, `totalUSD` en el body, transición inválida). Stock y saldo nunca negativos ni duplicados. Eventos `ORDER_PAID`/`ORDER_CANCELLED` siguen saliendo (C-73).

### C-55 · Marco del panel del cliente 🔓 (desbloquea G-38, G-39)
**Archivos:** `app/customer/(dashboard)/layout.tsx` (393 líneas, copia del admin viejo).
- Mismo trabajo que C-52 en el admin:
  - Sin `transform`, `backdrop-blur-xl` ni manchas animadas.
  - Cajón móvil con capa, Escape y cierre al navegar. `useBodyScrollLock`.
  - `z-[var(--z-*)]`, `react-icons`, recetas de `lib/admin-ui`.
- **Campana:** usar `NotificationBell` de `components/notifications` (C-73).
- **Verificación:** modales de `/customer/profile` y "Recargar saldo" cubren 1440×900 y 390×844. Sin scroll doble. Cajón con teclado.
- Al terminar: `docs/plan/estado/C-55.md` en `main` (Gemini lo espera para G-38).

### C-75 · Marketing y Contenido (sección crítica) 🔍
**Archivos:** `app/admin/(dashboard)/marketing/page.tsx` (1.118 líneas, 6 pestañas: Influencers, Publicidad, Email, Plantillas, Redes Sociales, Configuración), `components/admin/SocialMediaGenerator.tsx` (869), `app/api/influencers/**`, `app/api/admin/email/**`, `app/api/admin/social/generate`, `lib/influencer-commission.ts`.
- **Primero auditar como Configuración (C-50b):** qué hace cada campo en la tienda, qué está muerto, flujos rotos, seguridad y diseño. Presentar el mapa a Andrés antes de rediseñar.
- **Ya visto:**
  - `approveConversion` lee el estado fuera de la transacción y acredita sin condición: doble aprobación = doble comisión.
  - La pestaña "Configuración" de Marketing muestra datos del SMTP.
  - El popup puede guardar la imagen como base64 en la BD (C-25 lo sirve como archivo; mejor subirla siempre a `/uploads`).
  - El badge del menú cuenta solicitudes de creador aunque están en `/admin/creators`.
- **Rediseño:** secciones por tarea, un archivo por sección, recetas de `lib/admin-ui`, validación con zod en las APIs.

### C-51 · Lista de productos del admin
- **Qué hacer:**
  - Rediseñar `app/admin/(dashboard)/products/page.tsx` con `lib/admin-ui`: tabla deslizable en móvil, filtros en la URL y acciones masivas con confirmación (sin `alert()` ni `confirm()`).
  - Borrar `_components/ProductForm.tsx` (sin uso; confirmar con `git grep`).
- **Pendiente de C-50b:** `primaryCurrency` ya no se edita; la lista debe mostrar USD y Bs.

### C-60b · Surtido de pedidos digitales (F7)
- Campos de proveedor, referencia y costo que ya existen en la BD (C-60) en `orders/[id]/digital`.
- Evento nuevo `DIGITAL_ORDER_PENDING` en `lib/admin-events/catalog.ts`: una orden pagada con productos digitales de entrega manual espera código.
- Revisar que `orderItemId` del body pertenezca a la orden (hoy se usa `order.items[0]`).

### C-76 · Correos
- Quitar los emojis de `lib/email-service.ts`, `lib/email-templates/*`, `app/api/admin/email/**`, `app/api/pago-movil/verificar` (asunto y cuerpo de la recarga aprobada) y `app/api/product-requests`.
- Una sola plantilla base con logo y colores de Configuración → Avisos. Valores escapados (hoy varias plantillas insertan nombres y referencias sin escapar).

---

## 5. Puntos de merge para Andrés

| Cuándo | Qué mergear | Por qué no esperar |
|--------|-------------|--------------------|
| Ahora | `gemini/G-01` | Ya está revisada. El diff muestra los docs "borrados" solo porque salió de antes del commit del plan; el merge **no** borra nada. |
| Apenas estén listas | `claude/C-01`, `claude/C-05` + **deploy** | Son vulnerabilidades y bugs que existen hoy en producción. |
| Fin de cada ronda de Gemini | `gemini/R1`, `gemini/R2`, … | La siguiente ronda de Gemini sale de `main`. |
| Apenas esté lista | `claude/C-10` | Desbloquea los 7 lotes de colores de Gemini. |
| Apenas estén listas | `claude/C-12`, `claude/C-21` | Desbloquean G-11 y G-10. |
