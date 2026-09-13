# Auditoría técnica — ElectroShopVe WEB

Fecha: 2026-09-12 · Rama auditada: `main` @ `0f86604`
Alcance: home, header/nav, tienda pública, carrito, APIs públicas y de órdenes, CSS global, tipografía, rutas.
No auditado a fondo: panel admin (UI), dashboard de creador, flujos de email.
Limitación: en el entorno de auditoría no había Node instalado, así que **no se corrió `tsc`, `lint` ni `build`**. Todo lo de abajo sale de leer el código; lo marcado "(verificar)" requiere confirmarlo en ejecución.

Severidad: **P0** = dinero, datos o caída · **P1** = funcionalidad rota que ve el cliente · **P2** = deuda, rendimiento o consistencia.

---

## 1. Seguridad y datos (P0)

| # | Problema | Evidencia | Impacto |
|---|----------|-----------|---------|
| S1 | **`POST /api/orders` confía en precios y totales del cliente.** Guarda `item.priceUSD`/`item.price` y `body.total` tal cual llegan. Con pago `WALLET` descuenta `body.total` del saldo. | `app/api/orders/route.ts:270-289`, `:304-335` | Cualquier cliente puede comprar con saldo a $0.01 un producto de $500 y la orden queda `PAID`. |
| S2 | **IDOR en órdenes: se acepta `body.userId`.** El saldo que se descuenta y el dueño de la orden salen de `body.userId \|\| session.user.id`. | `app/api/orders/route.ts:267, 302, 391, 406, 453, 478` | Un usuario puede gastar el saldo de otro usuario. |
| S3 | **Número de orden con año fijo y condición de carrera.** `ORD-2025-XXXX` calculado como "última + 1" fuera de la transacción; `orderNumber` es `@unique`. | `app/api/orders/route.ts:251-260` | Dos compras simultáneas → error 500 en checkout. Año siempre 2025. |
| S4 | **Comisión de referidos calculada con el total del cliente.** | `app/api/orders/route.ts:441` | Se pueden inflar o anular comisiones. |
| S5 | **`GET /api/products` es público, no filtra por estado y expone `costPerItem`.** Sin sesión devuelve borradores y el costo interno; con `?all=true` devuelve todo. | `app/api/products/route.ts:8-67`; permitido en `proxy.ts:110` | Competencia ve tus costos y productos no publicados. |
| S6 | **APIs públicas de producto devuelven el objeto Prisma completo** (`...product`): `costPerItem`, `barcode`, `minStock`, etc. | `app/api/products/slug/[slug]/route.ts:30-36`, `app/api/products/public/route.ts:35-41` | Fuga de costo interno. |
| S7 | **Home y /productos mandan objetos Prisma completos a componentes cliente.** En `/productos` el `JSON.parse(JSON.stringify())` mete `costPerItem` en el HTML. En el home se pasa `...p` sin convertir `compareAtPriceUSD`/`costPerItem` (Decimal) a un componente cliente. | `app/productos/page.tsx:133`, `app/page.tsx:31-38, 351` | Fuga en el HTML. En home, si un destacado tiene precio de comparación o costo cargado, React no puede serializar el Decimal y la página falla (verificar). |
| S8 | **`CompanySettings` completo serializado al cliente** (incluye `adminAlertEmails`, `maintenanceAllowedIPs`). | `app/page.tsx:40, 56`; `app/productos/page.tsx:66` | Correos internos e IPs visibles en el código fuente de la página. |
| S9 | **Clave de respaldo fija para promover a SUPER_ADMIN.** Si falta la variable de entorno, la clave es `PROMOTE_TO_SUPER_ADMIN_2024`. | `app/api/admin/promote-super-admin/route.ts` (validación de `secretKey`) | Escalada de admin a super admin si el entorno no la define. |
| S10 | `dangerouslySetInnerHTML` con el título del hero (texto de admin + regex). | `app/page.tsx:74` | XSS si una cuenta admin se ve comprometida. Innecesario. |
| S11 | Cookie `x-is-admin` legible por JS "para saltar mantenimiento", pero **el modo mantenimiento no está implementado en ningún lado**. | `proxy.ts:84-98` | Código inerte que filtra el rol. |
| S12 | Cabeceras de seguridad duplicadas y contradictorias (`geolocation=(self)` vs `geolocation=()`). | `next.config.js` vs `proxy.ts:30-34` | Confusión: la que gana depende de la ruta. |

## 2. Bugs funcionales (P1)

### Carrito
| # | Problema | Evidencia |
|---|----------|-----------|
| B1 | **Las cantidades se duplican en cada recarga para usuarios logueados.** `dbSynced` vuelve a `false` al recargar; se suma cantidad local + cantidad guardada en la base de datos (1→2→4→8… hasta el stock). | `contexts/CartContext.tsx:54-100` |
| B2 | Agregar un producto nuevo no respeta el stock (solo se limita al sumar a uno existente). | `contexts/CartContext.tsx:137` |
| B3 | Contadores distintos: la barra móvil cuenta líneas y el ícono del header cuenta unidades. | `components/public/MobileNavBar.tsx:275` vs `components/CartIcon.tsx:39` |

### Catálogo / producto
| # | Problema | Evidencia |
|---|----------|-----------|
| B4 | **La búsqueda solo lee la URL al montar.** Si ya estás en `/productos` y buscas otra vez, no pasa nada. Bloquea mover el buscador al header. | `app/productos/ProductosClient.tsx:120-132` |
| B5 | `/productos` carga **todos** los productos publicados sin paginar en el servidor (`revalidate = 0`) y filtra en el navegador. | `app/productos/page.tsx:9, 53-57` |
| B6 | El filtro de precio excluye productos de más de $10.000; "★ Destacados" **filtra** en vez de ordenar. | `ProductosClient.tsx:149-150` |
| B7 | **Móvil: el botón "Ver N productos" del panel de filtros queda tapado por la barra flotante** (z-50 contra z-[999]). | `ProductosClient.tsx:264, 343` vs `MobileNavBar.tsx:390` |
| B8 | Móvil: el buscador sticky usa `top-16` (64px), pero el header mide `h-20` (80px): se monta 16px debajo del header. | `ProductosClient.tsx:200` vs `PublicHeader.tsx:140` |
| B9 | **La página de producto hace fetch HTTP a su propia API** (`NEXT_PUBLIC_APP_URL \|\| localhost:3000`), 3 veces por visita (layout, metadata y página). Si la variable está mal en producción, **todos los productos dan 404**. | `app/productos/[id]/page.tsx:14, 54`; `app/productos/[id]/layout.tsx` |
| B10 | `ProductCard`: un `<button>` (compartir) va dentro de un `<Link>` (HTML inválido). La descripción y "Ver detalles" solo aparecen con hover (en táctil no se ven). No hay botón "Agregar". Nunca muestra `compareAtPriceUSD`. | `components/ui/ProductCard.tsx:54-69, 93-100, 148` |
| B11 | `ProductCarousel` dice "Arrow navigation preserved", pero no pinta flechas (`handleNext`/`handlePrev` son código muerto). En el servidor pinta el diseño de escritorio y en el móvil cambia al montar (salto visual). Se reordena solo cada 60 s y te devuelve a la página 1. | `components/home/ProductCarousel.tsx:67-77, 116-138, 183` |
| B12 | `/comparar` no tiene ningún enlace que lleve a ella, usa `/api/products/[id]` (pide sesión, así que falla para invitados) y lee campos que no existen en el schema (`brand` string, `model`, `specifications`). | `app/comparar/page.tsx:43-48` |

### Header, navegación y overlays
| # | Problema | Evidencia |
|---|----------|-----------|
| B13 | **Entre 768 y 1023px se ven las dos navegaciones** (links del header desde `md` y barra inferior hasta `lg`). | `PublicHeader.tsx:171` vs `MobileNavBar.tsx:343, 390` |
| B14 | El color del header se decide leyendo los `className` de todos los `<section>` en cada scroll. Es frágil y se rompe con cualquier rediseño. | `PublicHeader.tsx:59-98` |
| B15 | **Popup promocional que no se puede cerrar durante 5 s**, bloquea el scroll y el touch, y aparece en cada sesión. | `components/HotAdOverlay.tsx:37-39, 180-183` |
| B16 | WhatsApp flotante con un badge rojo "1" falso; en móvil queda pegado a la barra inferior (`bottom-20`). | `components/WhatsAppButton.tsx:157, 213-217` |
| B17 | "Solicitar cotización por WhatsApp" lleva a `/contacto`. Los 4 servicios apuntan a la misma URL sin ancla. | `app/page.tsx:366-390` |
| B18 | El CTA "Únete gratis / Inicia sesión" se muestra también a usuarios logueados. | `app/page.tsx:316-329` |
| B19 | 31 manipulaciones manuales de `document.body.style.overflow` que compiten entre sí: al cerrar un modal se desbloquea el scroll aunque otro siga abierto. | grep `body.style.overflow` |

## 3. Rutas inertes y código muerto

### Enlaces a rutas que no existen
| Enlace | Dónde | Debería ir a |
|--------|-------|--------------|
| `/customer/wallet` | `app/canjear-gift-card/page.tsx:122`, `components/cursos/CourseDetailClient.tsx:524` | `/customer/balance` |
| `/auth/login` | `app/admin/(dashboard)/orders/[id]/digital/page.tsx:73`, `app/customer/(dashboard)/orders/[id]/digital/page.tsx:225` | `/login` |
| `/auth/signin` (funciona con doble redirect) | `app/customer/(dashboard)/layout.tsx:61, 150, 156` | `/login` |
| `/mi-cuenta` | `app/mis-pedidos/page.tsx:168` | `/customer` |
| `/customer/product-requests` (link de notificación) | `app/api/product-requests/route.ts:63` | página inexistente → `/customer` o crear la página |
| `/favicon.ico`, `/og-image.png` (fallbacks) | `app/layout.tsx:64, 68`; `app/productos/page.tsx:29` | archivos inexistentes en `public/` |

### Páginas huérfanas o duplicadas
- `/mis-pedidos`: duplica `/customer/orders`, no tiene header ni footer y nada enlaza a ella.
- `/comparar`: rota (ver B12) y nada enlaza a ella.
- `app/(public)/layout.tsx`: grupo de rutas **sin páginas**; nunca se ejecuta.

### Ajustes del admin que el sitio ignora
Se guardan en `CompanySettings` pero la tienda nunca los lee: `maxFeaturedProducts` (el home fija `take: 8`), `showCategories`, `maxCategoriesDisplay`, `showStats` y `stat1..4*`, `ctaEnabled`/`ctaTitle`/`ctaDescription`/`ctaButton*`, `heroButtonText`/`heroButtonLink`/`heroBackgroundImage`, `heroVideoDescription`, `autoHideOutOfStock`, `lowStockThreshold`, **`maintenanceMode`** y **`compareAtPriceUSD`** (precio tachado de cada producto).

### Componentes y módulos sin ningún import (candidatos a borrar)
`components/AdminButton.tsx`, `components/FloatingTechIcons.tsx`, `components/ShaderWave.tsx`, `components/SubtleParticles.tsx`, `components/YouTubeEmbed.tsx`, `components/admin/NotificationBell.tsx`, `components/admin/ReviewsWidget.tsx`, `components/admin/VerificationsTab.tsx`, `components/home/CategoryCarousel.tsx`, `components/modals/RechargeModal.tsx` (se usa la V2), `components/ui/Card.tsx`, `components/ui/GlossyIcon.tsx`, `components/ui/ProductImage.tsx`, `components/ui/index.ts`, `lib/utils.ts`, `lib/validation.ts`, `lib/reviews.ts`, `lib/pago-movil/index.ts`.
Verificar antes de borrar (pueden cargarse dinámicamente): `lib/email-templates/OrderStatusUpdate.ts`, `PasswordReset.ts`, `Welcome.ts`.

### SEO
- `robots.ts` bloquea `/_next/`, así que Google no puede descargar el CSS ni el JS para renderizar. También bloquea `/uploads/`, así que las imágenes de productos no se indexan.
- Páginas sin `Footer`: `categorias/[category]`, `checkout/success`, `canjear-gift-card`, `privacidad`, `terminos`, `mis-pedidos`.

## 4. Paleta de color (P2)

- **196 colores hex distintos** hardcodeados en las clases.
- `#2a63cd` aparece **1632 veces**; el token `primary` definido en `globals.css` se usa **0 veces**.
- Conviven 17 paletas de Tailwind: gray (2242), blue (885), red (597), green (396), amber (323), **slate (303)**, purple (293), emerald (262)…, gray y slate mezcladas como neutros.
- Colores fuera de marca: barra de progreso verde neón `#00FF88` (`MobileScrollProgress.tsx:51`), `from-blue-600 to-indigo-600` en el buscador del home, nav móvil `#0f172a` (slate).
- Contrastes dudosos: `text-white/40`, `text-white/60` sobre azul; `text-gray-400` para texto informativo.

## 5. Tipografía (P2)

- **Inter nunca se carga.** `app/layout.tsx:18-20` es un objeto falso: el body recibe la clase literal `--font-inter` y se usa la fuente del sistema. El README dice Inter.
- **Nakadai se descarga y no se usa** en ningún componente (`app/layout.tsx:22-27`).
- Tektrron solo se usa en el wordmark (header y footer), con `style={{fontFamily}}` inline.
- Tamaños ilegibles en móvil: `text-[10px]` ×339, `text-[9px]` ×47, `text-[8px]` ×33, **`text-[7px]` ×10**, `text-[9.5px]` ×2.
- No hay escala: `font-bold` ×1089, `font-semibold` ×621, `font-black` ×187, `font-extrabold` ×8 usados sin criterio. Los H2 del home van de `text-xl` a `text-5xl`.

## 6. Mobile (P1/P2)

- Doble navegación entre 768 y 1023px (B13). Elementos fijos que chocan con la barra flotante (B7, B16).
- Breakpoints calculados con `window.innerWidth` en JS: salto visual al hidratar (`ProductCarousel`, `ProductosClient`, `MobileScrollProgress`, `customer/(dashboard)/layout`).
- 64 usos de `h-screen`/`min-h-screen` y 0 de `dvh`: la barra de direcciones de iOS/Android corta contenido.
- 19 reveals `opacity-0 group-hover:opacity-100`: la información no aparece en pantallas táctiles.
- Capas `blur-[80px..120px]` apiladas + `backdrop-blur` + `animate-pulse` infinitos: jank en Android de gama baja, que es el público real.
- Animaciones perpetuas en los íconos del header (`animate-periodic-bounce`, `-wave`, `animate-pulse` en el avatar).
- Placeholders con efecto de escritura que re-renderizan cada 40-80 ms para siempre (`HomeSearchBar.tsx:25-50`, `ProductosClient.tsx:51-94`).
- `/api/settings/public` se pide **5 veces por carga** con `no-store` (SettingsContext, Footer, HotAdOverlay, WhatsAppButton, DynamicFavicon), aunque el servidor ya tiene esos datos.
- `images.unoptimized: true` en `next.config.js`: cero optimización de imágenes (peso completo en 3G/4G).

## 7. CSS global (`app/globals.css`)

- `* { user-select: none }` (l. 202-218): **no se pueden copiar** nombres de productos, precios, números de orden ni datos de Pago Móvil (h1-h6, span, td, li).
- `html, body { overflow-x: hidden }` (l. 851): rompe `position: sticky` en varios navegadores. Usar `overflow-x: clip`.
- Keyframes y clases duplicados que se pisan entre sí: `fadeIn` (l. 51 y 321, además de `PageAnimations` y `MobileNavBar`), `shimmer` (37/406), `slideInUp` (67/513), `slideInLeft` (354/878), `scaleIn` (372/957), `float-delayed` (555/883), `.animation-delay-200` (678/952). Además se redefinen `animate-spin` y `animate-pulse`, que Tailwind ya trae.
- `a, button { transition: all }` global (l. 624-632): todo anima, incluidos layout y colores de foco.
- `body.hot-ad-active [class*="z-40"]` (l. 253): oculta cualquier elemento cuyo class contenga "z-40".
- Dos bloques `:root` y `@theme inline` con tokens que nadie usa.
- `@media (max-width:1023px) input { font-size:16px !important }`: pisa todos los estilos de inputs.

## 8. Calidad de código (P2)

- Archivos gigantes: `app/checkout/page.tsx` (2537 líneas), `app/gift-cards/page.tsx` (1358), `app/productos/[id]/ProductClient.tsx` (1249), `app/registro/page.tsx` (828).
- 379 `any`, 31 `console.log`, 22 bloques `<style jsx>`, 421 objetos `style={{}}` inline, 30 `<img>` sin `next/image`.
- No existe una capa de DTO: cada ruta hace spread del modelo Prisma y convierte Decimals a mano.
- `public/uploads/` está en `.gitignore` pero hay archivos versionados dentro.
- `README.md` desactualizado (dice Next 14 e Inter).
- Sin tests.
