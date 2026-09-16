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

## Ronda R2 (borrador, se detalla al revisar R1)
- Resto del panel admin: métodos de pago, mensajes y solicitudes, reseñas, descuentos, solicitudes de producto, verificaciones, categorías, trabajos realizados y legales.
- Panel del cliente (cuando Gemini lo suelte): a 390 px el número de pedido se parte en tres líneas, la barra inferior deja ver el contenido detrás y el perfil abre la hoja "¿Sabías que…?" apenas entra.
- Páginas públicas de contenido (servicios, cursos, contacto, gift cards): jerarquía de la primera pantalla.

**Prompt de arranque:** ver `docs/plan/SIGUIENTE.md` §5.
