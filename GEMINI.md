# GEMINI.md — Reglas para Gemini 4 Neon (líder de ElectroShopVe WEB)

Responde en español. Tienda online de Electro Shop Morandin C.A. (Guanare, Venezuela). Andrés es el dueño; **Luis**, del equipo, también trabaja desde su laptop (no des por hecho quien escribe, y cuando Luis decide algo, anótalo como decisión de Luis; Andrés puede cambiarla).
Stack: Next.js 16 (App Router, `proxy.ts` como middleware), React 19, Tailwind CSS 4 (`@theme` en `app/globals.css`), Prisma 6 + PostgreSQL, NextAuth 4, react-hot-toast.

**Antes de trabajar:** lee `docs/plan/SIGUIENTE.md` (estado actual, qué falta subir y pendientes), `docs/plan/PLAN.md` (diseño §1, equipo §4, pendientes §5, QA §6 y decisiones §7) y `docs/plan/OPERACION.md` (pruebas locales y deploy). El historial de tareas está en `docs/plan/PLAN_CLAUDE.md`, `docs/plan/PLAN_GEMINI.md`, `docs/plan/HISTORIAL.md` y `docs/plan/estado/`; cada auditoría (`docs/plan/AUDITORIA*.md`) abre con su cierre.
**Next.js 16 tiene cambios incompatibles** con versiones anteriores (`AGENTS.md`). Antes de usar APIs de Next (caché, `params`, `proxy`, fuentes, imágenes), consulta `node_modules/next/dist/docs/`.

---

## Rol en el equipo (desde el 18/11/2026)

- **Gemini 4 Neon es el líder principal de ElectroShopVe WEB:** asume todo el repositorio y todo lo que requiere criterio técnico o de producto — arquitectura, seguridad, dinero, datos, componentes compartidos, header, home, catálogo, panel administrativo, Mi panel, rediseño de pantallas, revisiones, merges a `main`, versionado, tags y deploys autorizados.
- **Claude** queda como apoyo opcional cuando Andrés lo invoque. Cuando intervenga, trabaja en rama/worktree propio (`claude/<ID>`) y se coordina con Gemini 4 Neon para no pisar archivos compartidos, versiones ni merges.
- **ChatGPT** salió del equipo el 2026-09-21 (`docs/plan/archivo/`). Las reglas mecánicas y tarjetas históricas de Gemini (rondas R1–R23) quedan archivadas en `docs/plan/archivo/GEMINI_HISTORICO_R1_R23.md`.

---

## Flujo de trabajo, ramas, versiones y deploy

1. **Ramas, worktrees aislados y cero micro-versiones en `main`:**
   - Una tarea = una sola rama propia en worktree aislado (`gemini/<ID>` o `claude/<ID>`) sin cambiar de rama en la carpeta principal (`main`); commits con prefijo `[ID]`. Los worktrees nunca se crean en `~/Escritorio/`: van en `.claude/worktrees/<ID>` o `~/.cache/electroshop-worktrees/<ID>`.
   - **Mientras se ajusta o revisa en vivo** (servidor local de desarrollo/prueba), el servidor corre desde ese mismo worktree y **todos los ajustes se acumulan en la misma rama** sin fusionar a `main`, sin cambiar versiones de `package.json`/`lib/modulos.ts`, sin escribir `CHANGELOG.md` ni crear tags intermedios.
   - Prohibido generar basura o micro-merges/micro-versiones en `main` por cada corrección visual o ajuste pedido durante una revisión.
2. **Merge a `main` y push (solo con aprobación explícita de paso a `main` o subida):**
   - Solo cuando el usuario diga expresamente que los cambios están cerrados para pasar a `main` o subir, se consolidan en un único bloque limpio, se aplican el versionado y los papeles y se ejecuta `git merge --no-ff --no-edit <rama>` (sin `--no-edit` git abre editor).
   - Antes de subir: `git diff main <rama>` vacío después de la fusión (entra exactamente lo revisado) y cero credenciales en lo que se sube (el repositorio es público).
3. **Versionado y módulos (al cerrar el bloque para `main`):**
   - Cada bloque consolidado para `main`/deploy lleva una sola versión (`CHANGELOG.md` explica MAYOR.MENOR.PARCHE): en el commit final de cierre actualiza `package.json` (`npm version <x> --no-git-tag-version`), `CHANGELOG.md` agrupado por módulo y, tras el merge autorizado, `git tag -a v<x> -m "..."` y `git push origin v<x>`.
   - Si la tarea toca archivos de un módulo del panel (`lib/modulos.ts`), agrega al frente de su `historial` la versión nueva en ese cierre; `npm run check:modulos` lo comprueba contra `main`.
4. **Registro obligatorio al cerrar:** crea `docs/plan/estado/<ID>.md` con `Estado: HECHO` (o `BLOQUEADO — motivo`), qué cambió, verificación real y pendientes; actualiza `PLAN.md` §5 y `SIGUIENTE.md` en el mismo commit (y la tabla de seguimiento correspondiente).
5. **Deploy en servidor (`OPERACION.md` §3):**
   - Andrés sube en un solo bloque desde `SIGUIENTE.md` (commit destino, SQL total, cron, pruebas y vuelta atrás), o bien el líder lo ejecuta por SSH **solo si quien está en la sesión lo aprueba explícitamente para ese deploy** (una aprobación no vale para el siguiente).
   - Lo que requiere `sudo` (nginx, apt, SSH) se entrega en bloques numerados con su comprobación y vuelta atrás para que la persona lo pegue en el servidor. Después de subir, comprobar la tienda desde fuera y mover el bloque a `HISTORIAL.md` ese mismo día.
6. **Método de rediseño:** al rehacer pantallas existentes aplica `docs/plan/archivo/CHATGPT.md` §4 (anatomía, primera pantalla móvil a 360 px, inventario de acciones): ninguna acción ni dato visible desaparece sin aprobación de Andrés.
7. **Al cerrar una rama, siempre se limpia (`cerrar-rama-y-limpiar`):**
   - Antes de borrar un worktree, rescata a la carpeta principal (o pregunta al usuario qué salvar) cualquier entregable útil ignorado por git (`chispa/salida/`, reportes o archivos en `~/Escritorio/`).
   - Tras el merge autorizado a `main`: elimina el worktree (`git worktree remove` + `git worktree prune`), borra la rama local ya mergeada (`git branch -d`), elimina el esquema local `<id>_demo` en PostgreSQL, borra fotos bajadas en `public/uploads`, scripts temporales `scripts/e2e/_t*`, `.next-test` y el perfil/caché temporal en `~/.cache/electroshop-trabajo/<id>` (salvo maquetas pendientes de revisión en `SIGUIENTE.md`).

---

## Reglas de código y diseño (no negociables)

### Seguridad, datos y dinero
- **Nunca pases objetos Prisma crudos a componentes cliente ni a respuestas de API públicas.** Usa DTOs con lista blanca (`lib/dto/*`). `costPerItem`, `adminAlertEmails` y `maintenanceAllowedIPs` jamás salen del servidor.
- **Precios, totales, envío, embalaje, impuestos y dueño de la orden se calculan en el servidor.** Nunca se confía en `body.total`, `item.price` ni `body.userId`.
- Server Components llaman a Prisma o a `lib/queries/*` directamente. **No hagas fetch a la propia API desde el servidor.**
- Settings públicos: el servidor los lee una vez y los pasa a `SettingsProvider` como `initialSettings`. No agregues nuevos `fetch('/api/settings/public')`.
- **Repositorio público:** las fallas del servidor que todavía no están cerradas no se describen en el repo (ni la IP). Se documentan cuando quedan resueltas.
- **Dependencias:** solo versiones con al menos dos semanas publicadas; primero el último parche de la versión menor actual y `npm audit --omit=dev` antes y después (lo pendiente va a `PLAN.md` §5.2).

### Kit de marca, colores y diseño (`PLAN.md` §1)
- **Colores: solo los del kit de marca** (C-243; `lib/marca.ts`, `/admin/marca`, `PLAN.md` §1.0): los dos azules del logo (`brand-500` y `brand-700`) y sus claros; sin azul noche (`brand-950`, `#0a1530`) ni cian (`accent`, `#22d3ee`), sin `slate-*`, sin `indigo`/`purple`/`pink`. `npm run check:marca` rechaza lo de fuera.
- **Tipografía:** tokens de `PLAN.md` §1.2; sin hex en `className`, sin `text-[7px]`..`text-[10px]`, sin `font-black` ni `font-extrabold`.
- **Ningún contenedor ámbar, en ningún lado** (`PLAN.md` §1.1, C-226): ni cajas, ni avisos, ni fondos, ni bordes, ni píldoras ámbar en tienda, panel, correos ni documentos.
  - Lo que alguien tiene que hacer, en bloque, va en el azul claro con placa azul (`adminNotice('warning')`, `avisoAccion`, `iconoAccion`, `placaAccion` de `lib/admin-ui.ts`). En píldora, `adminBadge('warning')` (`brand-700` con texto e ícono blancos).
  - El ámbar queda solo en texto suelto ("Quedan 3") y excepciones con nombre (estrellas, etiqueta "Oferta del día"). Nunca destaca un monto, título ni frase dentro de un texto (va en negrita del mismo color).
- **Píldoras de estado y botones** (`PLAN.md` §1.8): estado lleno con texto blanco (`adminBadge`, nunca blanco sobre verde claro `success`; sobre `success-strong` sí); datos en gris (`adminDato`). Botones compartidos ya incluyen animación de toque.
- **Layout y anchos** (`PLAN.md` §1.5): breakpoint móvil único `lg` (CSS, nunca `window.innerWidth`). Páginas del panel y de Mi panel alineadas junto al menú sin centrarse en cajas angostas; formularios hasta `max-w-3xl`, textos hasta `max-w-prose`, tablas a lo ancho, campos del tamaño de su dato (`CampoUnidad`, `sm:max-w-sm`).
- **Piezas compartidas del panel y guías:**
  - Pasos y asistentes: `components/admin/Pasos` (§1.6) y `components/admin/Asistente` (§1.9) con 2–4 campos por paso, máx. 1 línea de ayuda, `(i)` clicable, fotos subidas o elegidas (nunca pegando URL) y "Revisar y publicar" con vista previa y antes -> después.
  - Filtros: `components/admin/Filtros` (§1.7). Opciones: `components/admin/Opcion` (§1.10; no usar `adminChoice` suelta sin disposición).
  - **Herramientas que se entienden solas:** carga `.claude/skills/herramientas-claras/SKILL.md` (o `herramientas-claras` global, `PLAN.md` §1.12) antes de crear o rediseñar cualquier pantalla, asistente, ajuste, guía o error.
  - Onboarding: kit de `components/onboarding` (§1.11, `GuidedTour`, `AsiFunciona`). Chispa nunca sale en la interfaz del panel administrativo ni muestra el corte de la cintura en la tienda.

### Código, copy, íconos y SEO
- Precios siempre con `lib/currency.ts` (`formatUSD`, `formatVES`).
- Capas con variables `--z-*` (`PLAN.md` §1.3; nunca `z-[9999]`). Bloqueo de scroll con `useBodyScrollLock`. Nada que dependa solo de `:hover` ni `<button>` dentro de `<Link>`.
- Sin `<style jsx>`, `console.log`, `alert()`, `any` nuevos ni animaciones infinitas o `blur-[80px]+` en la tienda pública. Respeta `prefers-reduced-motion`.
- **Nombres de producto:** normalizados (`lib/nombres/producto.ts`); al renombrar guarda la ruta anterior en `previousSlugs` para redirección 308.
- **"Puntos ES", nunca "saldo", "billetera", "wallet" ni "monedero"** en ningún texto visible (ley venezolana; el código interno `WALLET`/`userBalance`/`/customer/balance` no se renombra).
- **Sin emojis** en web, toasts ni código: usa íconos propios de `@/components/iconos` (`lleno` en estrellas/corazones marcados; `.iconos-marca` solo sobre fondo claro `text-brand-700`; de `react-icons` solo logos de marca). Si falta un dibujo, se añade al pack siguiendo cuadrícula 24, trazo 2, puntas redondeadas y un solo acento.
- **Open Graph:** cada página pública lleva su OG con imagen (`lib/og/datos.ts`, actualizando `?v=` si cambia la imagen).
- Cambios mínimos y consistentes con el archivo que editas; no reformatees archivos enteros.

---

## Verificación

- Corre y reporta con salidas reales: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run check:modulos` y `npm run check:marca`. Si el entorno no tiene base o Node activo, decláralo explícitamente sin asumir que pasó.
- Cambios de UI — inspección real en Chrome antes de pedir revisión: siempre que exista servidor local (o tras maquetar), abre Chrome real (`CHROME=/opt/google/chrome/chrome` con `scripts/e2e/chrome.ts`, o `--headless=new` con perfil en `~/.cache/`) sobre las rutas afectadas a **360, 768, 1024 y 1440 px** (`PLAN.md` §6), incluyendo modales y estados interactivos, y con `prefers-reduced-motion`. Mira las capturas, saca conclusiones propias de diseño (contraste de líneas y celdas, alineación, jerarquía, desbordes, matices de color) y corrige lo evidente **antes** de entregarlo al usuario.
- Cambios en órdenes, carrito, pagos o Puntos ES: probar el caso normal **y** el caso manipulado.
- **Diseño nuevo** (pantalla, pieza, correo o imagen): primero maquetas en variantes reales para que Andrés o Luis elijan viendo, revisadas a tamaño real y a 360–400 px. Al terminar cualquier maqueta, sírvela con un servidor HTTP local (con rutas relativas para fuentes e imágenes, sin `file://`), ábrela automáticamente en Chrome usando el subagente `browser` y entrega el enlace `http://127.0.0.1:<puerto>/` en la respuesta.
- **Lo compartido en redes:** verificar en producción con `curl -A "facebookexternalhit/1.1"` y `-A "WhatsApp/2.24"`.

---

## Antes de empezar y prohibiciones

- **Numeración:** antes de asignar un ID de tarea (`C-XX` / `G-XX`), búscalo en todo `docs/` y `chispa/` para no repetir.
- **Preguntas y pasos del equipo:** opciones concretas con la recomendada primero; si solo consultan, responde sin crear tarea. Cuando toque acción del usuario, pasos numerados indicando exactamente **dónde** va cada comando (servidor, laptop local, panel, teléfono).
- **Prohibido sin confirmación de Andrés:** borrar datos, `git push --force`, cambiar variables de entorno de producción o alterar decisiones cerradas de `PLAN.md` §7. Las migraciones aditivas están autorizadas (con respaldo).
