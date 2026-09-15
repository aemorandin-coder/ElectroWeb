# Auditoría del panel admin (2026-09-14)
Hecha por Claude.
- **Código:** unas 21.000 líneas en 30 pantallas y 26 rutas `/api/admin`, más las APIs que el admin consume.
- **Navegador:** recorrido de las 23 páginas a 1440 y 390 px contra una tienda de ejemplo (Firefox + WebDriver BiDi). Incluye consola, peticiones fallidas, desbordes y apertura de modales.

Leyenda de estado: ✅ resuelto en rama · 🟦 tarjeta asignada · ⬜ pendiente de asignar.

## 1. Seguridad y dinero
| # | Hallazgo | Estado |
|---|---|---|
| S1 | **Gift cards gratis:** `POST /api/gift-cards` creaba una tarjeta activa de hasta $500 para cualquier cliente logueado sin verificar el pago. Se canjeaba a saldo y se compraba. | ✅ C-70 |
| S2 | **Precios editables por clientes:** `POST /api/products/bulk/update` solo pedía sesión. | ✅ C-70 |
| S3 | `GET /api/gift-cards` devolvía al comprador código + hash del PIN (4 dígitos, se descifra al instante). Quien regalaba podía canjear antes que el destinatario. | ✅ C-70 |
| S4 | `/api/contact` GET, PATCH y DELETE con cualquier sesión: lectura y borrado de mensajes de clientes. | ✅ C-70 |
| S5 | Chat: cualquier sesión leía conversaciones ajenas y escribía haciéndose pasar por el admin. | ✅ C-70 |
| S6 | `/api/stats` y `/api/admin/verifications/pending-count` visibles para clientes. | ✅ C-70 |
| S7 | El correo con código y PIN de una gift card comprada nunca salía: el destinatario no podía canjear. | ✅ C-70 |
| S8 | Gift cards impresas desde el admin: el PIN se guarda como hash y nunca se muestra, así que no se pueden canjear. | ⬜ decisión de Andrés (¿llevan PIN?) |
| S9 | PIN de 4 dígitos con SHA-256 sin sal. | ⬜ C-60e |
| S10 | La compra de gift card con saldo son 2 llamadas desde el navegador (`balance/deduct` + crear). C-70 las ata en el servidor, pero lo correcto es 1 sola llamada. | ⬜ Claude + tarjeta Gemini para `app/gift-cards/page.tsx` |

## 2. Estructura del panel ("modales padres", z-index, responsive)
| # | Hallazgo | Estado |
|---|---|---|
| E1 | El contenedor de cada página tenía `transform` y `backdrop-blur`. Con eso, **todo modal `position: fixed` quedaba encerrado en la caja de contenido**; por eso 13 modales usaban `createPortal` como parche. | ✅ C-52 (verificado: 6 modales cubren 1440×900 y 390×844 sin portal) |
| E2 | En móvil el menú lateral arrancaba abierto (`useState(true)` + `ml-64`) y aplastaba el contenido. No tenía capa ni cierre con Escape. | ✅ C-52 (cajón cerrado, capa, Escape, se cierra al navegar, bloquea el scroll) |
| E3 | Fondo con 3 manchas `blur-3xl animate-pulse` infinitas y rejilla. Cada navegación dejaba el contenido invisible 400 ms. | ✅ C-52 |
| E4 | Contenido con alto fijo `h-[calc(100vh-7.5rem)]` y scroll interno (doble barra de scroll). | ✅ C-52 (scroll normal de la página) |
| E5 | El tour de bienvenida de la tienda aparece encima del admin. | 🟦 G-34 |
| E6 | 31 capas `fixed inset-0` con z-index sueltos (`z-50`, `z-[9999]`, `z-[10000]`) y **ningún modal bloquea el scroll de fondo**. | 🟦 G-31…G-34 (R5) |
| E7 | `/admin/orders` a 390 px: el total queda encima del nombre y del estado. | 🟦 G-31 |
| E8 | `/admin/categories` a 390 px: el panel de detalle queda cortado (layout de 2 columnas fijo con márgenes negativos). | 🟦 G-33 |
| E9 | Pestañas cortadas a 390 px en reseñas, verificaciones, descuentos, mensajes (no se ve "Alertas del Sistema"), marketing y reportes. | 🟦 G-32, G-33 |
| E10 | 14 tablas; algunas sin `overflow-x-auto` (verificaciones se corta en móvil). | 🟦 R6 |

## 3. Flujos y datos que se muestran mal
| # | Hallazgo | Estado |
|---|---|---|
| F1 | **Canje de gift card y comisiones** (tipo `DEPOSIT`) salen como "Recarga" en rojo con signo menos en `/admin/transactions`, y como gasto en `/customer/balance`. | ✅ helper en C-52 · 🟦 G-31 (admin) y G-34 (cliente) |
| F2 | El dashboard muestra "BD: Conectado · Auth: Activo · Modo: Desarrollo" escritos a mano (en producción dice "Desarrollo"). | 🟦 G-34 |
| F3 | `/admin/orders` no tiene título de página. | 🟦 G-31 |
| F4 | Montos con formatos mezclados: `$1231.96`, `$1,252.00` y `$341.96` conviven con `$1.514,96`. 54 `toFixed` en el admin. | 🟦 R7 |
| F5 | `/admin/notifications` redirige a Mensajes y Alertas (no hay página propia). | ⬜ decidir si se quita del menú o se hace página |
| F6 | `favicon.ico` da 404 en todas las páginas cuando no hay favicon configurado. | ⬜ Claude (fallback estático) |
| F7 | Pedido digital: no hay campos para anotar proveedor, referencia y costo, aunque la BD ya los tiene (C-60). | ⬜ Claude (C-60b) |
| F8 | `alert()` (10) y `confirm()` nativo (1) en productos y configuración. | ⬜ Claude (C-51, C-50b) |

## 4. Diseño y tipografía
| # | Hallazgo | Estado |
|---|---|---|
| D1 | 2.148 clases de color fuera de la paleta (gray, blue, purple, emerald, amber, orange, rose…) en 24 archivos, más 34 hex. Cada página tiene su propio tema: gift cards naranja, descuentos naranja, clientes y legales con tarjetas verde/morado. | 🟦 G-31…G-34 con `lib/admin-ui.ts` |
| D2 | 97 degradados, 31 `shadow-xl/2xl`, `hover:scale`, `animate-pulse` decorativos. | 🟦 R4 |
| D3 | Textos de 10 px en reportes; `text-base` en badges del dashboard. | 🟦 R7 |
| D4 | Emojis en cursos, órdenes digitales, pagos, reportes y reseñas. | 🟦 G-30 (R8) |
| D5 | Botones de solo ícono sin `aria-label` (hamburguesa, ver, editar). | ✅ layout en C-52 · 🟦 R1 en páginas |
| D6 | Configuración (1.594 líneas, 16 campos sin efecto) y lista de productos (1.544 líneas, `ProductForm.tsx` de 1.057 líneas sin uso). | ⬜ Claude: C-50b y C-51 |

## 5. Reparto
- **Claude (hecho):** C-70 (seguridad), C-52 (marco del admin, `lib/admin-ui.ts`, abonos en `format-helpers`).
- **Gemini (R9, pesado):** G-31 → G-34. Unas 1.650 clases de color, 54 degradados, 20 modales, 30 `toFixed` y los arreglos de flujo E5, E7-E9, F1-F4.
- **Claude (siguiente):**
  - **C-51:** lista de productos del admin; borrar `ProductForm.tsx`, que no se usa.
  - **C-50b:** configuración, con los 16 campos sin efecto.
  - **C-60b:** surtido de pedidos digitales.
  - S8-S10 y F5-F6.
