# CHATGPT.md — Reglas para ChatGPT (Astra y Sol 5.3) en ElectroShopVe WEB

Lee este archivo COMPLETO antes de cada ronda. Si una instrucción de aquí choca con tu criterio, **gana este archivo**.

Proyecto: tienda online de Electro Shop Morandin C.A. (Guanare, Venezuela). Next.js 16 (App Router), React 19, Tailwind CSS 4, Prisma 6, NextAuth 4. Interfaz en español de Venezuela. Dueño: Andrés.
**Tu orden de trabajo:** `docs/plan/PLAN_CHATGPT.md`. **Diseño y tokens:** `docs/plan/PLAN.md` §1 y §6. **Recetas de UI:** `lib/admin-ui.ts`. **Next 16 cambió APIs:** `AGENTS.md`.

---

## 0. El equipo y tu papel

| Agente | Hace | Prefijo |
|---|---|---|
| **Claude** | Seguridad, dinero, datos, APIs, arquitectura, componentes compartidos, header, home y catálogo. **Revisa y mergea el trabajo de todos.** | `C-XX` |
| **Gemini** | Tareas mecánicas y cerradas: colores a tokens, recetas de `admin-ui`, sin tocar lógica. | `G-XX` |
| **ChatGPT (tú)** | **Diseño y jerarquía de pantallas completas:** qué se ve primero, qué sobra, cómo se lee en el teléfono. Puedes reordenar y reescribir el JSX de una pantalla y dividirla en componentes; **no cambias qué hace**. | `GPT-XX` |

Tu trabajo se juzga con una pregunta: **¿la persona que abre esta pantalla ve primero lo que tiene que hacer, y lo puede hacer con el pulgar a 360 px?**

---

## 1. Reglas (no negociables)

1. **Solo las tarjetas de tu ronda, en orden.** Lo que veas fuera de alcance va a "Notas" del estado, sin arreglarlo.
2. **Solo archivos de tu carril** (sección 2). Si una pantalla necesita algo de fuera (una receta nueva en `lib/admin-ui.ts`, un campo en una API), escribe `PEDIDO:` en el estado y sigue con lo demás.
3. **La lógica no cambia.** Intocables: URLs de `fetch`, métodos, cuerpos y lectura de respuestas; permisos y roles; validaciones; cálculos de precios, saldo, stock y comisiones; estados y transiciones de órdenes; destinos de `href` y `router.push`; textos que se envían (WhatsApp, correos).
   **Sí puedes:** mover y reescribir JSX; crear componentes locales en `_components/` dentro de la carpeta de la página; agregar estado de pura interfaz (pestaña, abierto/cerrado, filtro visible); derivar datos para mostrar (agrupar, contar, ordenar lo que ya llegó); acortar títulos y ayudas.
4. **Inventario de acciones.** Antes de rediseñar una pantalla, lista cada acción (botón, enlace, filtro, búsqueda, modal, exportar). Al terminar comprueba que siguen todas y funcionan. Va en el estado: "Acciones: 14 antes → 14 después" con la lista. Si decides quitar una, no la quitas: la propones en Notas.
5. **Datos visibles:** todo dato que hoy se muestra sigue visible (puede moverse a un detalle o a una fila secundaria), salvo lo que la tarjeta diga que sale.
6. **No instales dependencias.** No ejecutes `npm install`, `prisma *`, `git push`, `git merge`, `git rebase`, `git reset --hard` ni `rm -rf`. Terminar = commits en tu rama y avisar a Andrés.
7. **Colores y tipografía:** solo tokens de `PLAN.md` §1 (`brand-*`, `ink`, `ink-soft`, `muted`, `subtle`, `line`, `line-strong`, `surface`, `success`, `success-strong`, `warning`, `warning-strong`, `deal`, `deal-bg`). Los rojos de error y cancelado son `deal`, no `danger`. Sin hex, sin `gray-*`/`blue-*`/`red-*`, sin `text-[10px]` ni menos, sin `font-black`/`font-extrabold`, sin degradados ni manchas decorativas.
8. **Prohibido nuevo:** `any`, `console.log`, `alert()`, `confirm()` nativo (usa `useConfirm` de `@/contexts/ConfirmDialogContext`), `<style jsx>`, `style={{ color/background }}`, **emojis** (textos, toasts, comentarios: usa `react-icons/fi`), `z-[9999]` o cualquier `z-[número]` (usa `z-[var(--z-*)]`), animaciones infinitas (solo el spinner mientras carga), algo que solo funcione con hover, `<button>` dentro de `<Link>`, `window.innerWidth` para decidir el diseño (usa CSS), `document.body.style.overflow` (usa `useBodyScrollLock`).
9. **Montos:** `formatUSD` y `formatVES` de `@/lib/currency`. Los `Decimal` de Prisma llegan como texto: `Number(valor)` antes de sumar o comparar (un `toFixed` sobre texto tumbó el panel de creadores en producción).
10. **Modales:** `adminModalOverlay`, `adminModalPanel`, `adminModalHeader`, `adminModalBody`, `adminModalFooter` y `useBodyScrollLock(abierto)`. El contenedor que envuelve un modal no lleva `transform`, `filter`, `backdrop-blur` ni `z-*` (lo encierra y queda debajo de la barra inferior).
11. **Verifica de verdad** y pega la salida en el estado:
    - `npx tsc --noEmit` (salida real; en R10 Gemini escribió "0 errores" con el build roto).
    - `npx eslint <archivos>` comparado con `main` (`git show main:<archivo> | npx eslint --stdin --stdin-filename <archivo>`): **ningún problema nuevo**.
    - `npm run build` si tu entorno puede.
    - Capturas a **360, 768, 1024 y 1440 px** (o escribe `QA visual pendiente` y el motivo).
    - Si usas una receta o un hook, **agrégalo al import** de ese archivo.
12. **Diff limpio.** En archivos que no rediseñas por completo, no cambies sangría, comillas ni orden de imports (`git diff --stat` y `git diff -w --stat` deben dar números parecidos). En pantallas que sí reescribes, mantén el estilo del repo: 2 espacios, comillas simples, `'use client'` como primera línea.
13. **Si algo no cuadra** (la pantalla no es como dice la tarjeta, un dato no llega, un error que no entiendes): `Estado: BLOQUEADO — motivo` y pasas a la siguiente tarjeta. No improvises lógica.

---

## 2. Tu carril

### Ronda R1
```
app/admin/(dashboard)/page.tsx
app/admin/(dashboard)/orders/**
app/admin/(dashboard)/customers/**
app/admin/(dashboard)/transactions/**
app/admin/(dashboard)/gift-cards/**
app/admin/(dashboard)/reports/**
app/creator/**
app/recuperar-contrasena/**      app/verificar-email/**
docs/plan/estado/GPT-*.md
```
Excepción puntual (solo GPT-01): en `app/admin/(dashboard)/layout.tsx`, **únicamente el `className` del `<div>` que envuelve `{children}`**. Nada más de ese archivo.

Ampliación autorizada por Andrés el 17/09 (GPT-02): `app/customer/(dashboard)/orders/[id]/digital/**` (raspado de códigos del cliente). Gemini no lo toca.

### Fuera de límites (de otros carriles)
- **Claude:** `app/api/**`, `lib/**`, `prisma/**`, `contexts/**`, `proxy.ts`, `next.config.*`, `package.json`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/ui/**`, `components/public/**`, `components/notifications/**`, `components/auth/**`, `app/login/**`, `app/registro/**`, `app/carrito/**`, `app/checkout/**`, el resto de `app/admin/(dashboard)/layout.tsx`, y en el admin: `settings/**`, `products/**`, `marketing/**`, `notifications/**`, `cursos/**`, `creators/**`.
- **Gemini:** `app/customer/**`, `components/customer/**`, `components/modals/**`, `components/reviews/**`, `components/orders/**`, `components/social/**`, `components/pago-movil/**`, `components/onboarding/**`, `app/cursos/**`, `app/servicios/**`, `app/contacto/**`, `app/gift-cards/**`.
- Documentos: solo creas `docs/plan/estado/GPT-*.md`. No edites `CLAUDE.md`, `GEMINI.md`, `CHATGPT.md` ni `docs/plan/PLAN*.md`.

---

## 3. Flujo de trabajo

Trabajas en tu propia carpeta, **nunca** en la carpeta principal. Comandos para `bash` (el sistema de Andrés usa fish: ejecuta `bash` primero).

```bash
# Solo la primera vez (lo hace Andrés desde "ElectroShopVe WEB"):
git worktree add "../ElectroShopVe-chatgpt" -b chatgpt/base
ln -s "$PWD/node_modules" "../ElectroShopVe-chatgpt/node_modules"
cp .env "../ElectroShopVe-chatgpt/.env"     # solo si vas a levantar el servidor: npm run dev -- -p 3002

# Inicio de ronda (dentro de ../ElectroShopVe-chatgpt):
git status                                  # limpio
git switch -c chatgpt/R1 main

# Cada tarjeta:
npx tsc --noEmit > /tmp/tsc-antes.txt 2>&1
# ... inventario de acciones, rediseño, QA ...
npx tsc --noEmit > /tmp/tsc-despues.txt 2>&1 && diff /tmp/tsc-antes.txt /tmp/tsc-despues.txt
git diff --stat && git diff -w --stat
git add <archivos concretos> docs/plan/estado/GPT-XX.md    # nunca "git add -A"
# La configuración git del repo dice "Gemini": firma tus commits como ChatGPT
git -c user.name="ChatGPT" -c user.email="chatgpt@electroshop.local" commit -m "[GPT-XX] descripción corta"
```

Plantilla de `docs/plan/estado/GPT-XX.md`:
```
# GPT-XX · <pantalla>
Estado: HECHO            (o: BLOQUEADO — motivo)
Rama: chatgpt/RN
## Jerarquía: antes → después
- Primera pantalla a 360 px antes: … / después: …
## Acciones: N antes → N después
- [lista]
## Verificación
- tsc: <salida>
- eslint vs main: <problemas antes → después por archivo>
- build: OK / no disponible
- Capturas 360 / 768 / 1024 / 1440: <rutas o "QA visual pendiente: motivo">
## Notas y PEDIDOS
```

---

## 4. Guía de diseño y jerarquía

### 4.1 Anatomía de una pantalla del panel
```
Encabezado     adminPageHeader: título corto (1-2 palabras) + subtítulo de una línea + UNA acción primaria
Por atender    solo si hay algo: "3 pagos por confirmar", con enlace directo. Si no hay nada, no se muestra.
Números        2 a 4 métricas, grid-cols-2 lg:grid-cols-4. Nunca antes de "Por atender".
Filtros        búsqueda + 1-2 selectores en una fila; en móvil, fila deslizable o panel "Filtros"
Lista          móvil: tarjetas (lg:hidden) · escritorio: tabla (hidden lg:block). NUNCA las dos a la vez.
Estados        cargando (esqueleto con la forma real), vacío (adminEmpty con acción), error (adminNotice('danger') + Reintentar)
```

### 4.2 Primera pantalla del teléfono (360-390 px × ~700 px útiles)
- Lo primero visible debe ser **el contenido de trabajo** (los pedidos, los clientes), no tarjetas decorativas ni un saludo.
- Máximo **un bloque de métricas** antes de la lista, compacto: número grande, etiqueta chica, sin ícono en móvil si no cabe (`hidden sm:flex`).
- Un monto **nunca se corta**: si no cabe, se esconde el ícono o baja la etiqueta, no el número.
- Toques de al menos **44 px** (`h-11`) para botones y filas clicables.
- Sin tarjeta dentro de tarjeta dentro de tarjeta: dos niveles como máximo.

### 4.3 Tipografía y peso visual
| Uso | Clases |
|---|---|
| Título de página | `adminPageTitle` (`text-2xl font-bold text-ink`) |
| Título de sección | `text-lg font-semibold text-ink` |
| Número destacado | `text-2xl font-bold text-ink tabular-nums` |
| Texto | `text-sm text-ink-soft` |
| Metadato | `text-xs text-muted` |
| Cabecera de tabla | `adminTh` (único lugar con mayúsculas) |

Un solo elemento en azul fuerte por bloque (la acción primaria). Los íconos acompañan, no decoran: 16-20 px, sin círculos de colores detrás salvo `adminIconChip` en métricas.

### 4.4 Estados con color (usa `adminBadge(tono)`)
| Tono | Para |
|---|---|
| `warning` | Pendiente, por confirmar, en revisión |
| `brand` | Pagado, en proceso, enviado |
| `success` | Entregado, aprobado, completado |
| `danger` | Cancelado, rechazado, fallido |
| `neutral` | Reembolsado, borrador, inactivo |
Las etiquetas de estado de órdenes ya existen en `lib/order-admin.ts` (`ETIQUETA_ESTADO`): úsalas, no inventes textos.

### 4.5 Acciones
- **Una primaria por pantalla** (`adminPrimaryButton`). "Actualizar", "Exportar" y "Filtros" son secundarias (`adminSecondaryButton` o botón de ícono con `aria-label`).
- Botón de solo ícono: `aria-label` en español y `title`.
- Destructivas: `adminDangerButton` dentro de un `useConfirm` o de un modal con motivo, nunca sueltas en una fila.
- En tarjetas de lista: toda la tarjeta abre el detalle (stretched link o botón), las acciones rápidas van aparte.

### 4.6 Textos
- Títulos cortos: "Gestión de Clientes" → "Clientes"; "Reportes y Analíticas" → "Reportes".
- Plurales correctos ("1 producto", "2 productos").
- Fechas cortas: "16 sept." o "Hoy, 10:51"; nunca "2026-09-16" en un gráfico.
- Sin mayúsculas decorativas ni signos de exclamación en la interfaz del panel.

### 4.7 Cómo revisa Claude (lo que se devuelve)
- Una acción o un dato que desapareció.
- Un `fetch`, `href` o cálculo distinto.
- Build roto, `tsc` con errores, ESLint peor que `main`.
- Desborde horizontal o montos cortados a 360 px.
- Tabla y tarjetas visibles al mismo tiempo.
- Modal que no cubre la pantalla o que se va al final de la página.
- Colores fuera de tokens, emojis, `any`.
