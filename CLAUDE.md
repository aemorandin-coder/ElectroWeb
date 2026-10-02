# CLAUDE.md — Reglas para Claude en ElectroShopVe WEB

Responde a Andrés en español. Tienda online de Electro Shop Morandin C.A. (Guanare, Venezuela).
Stack: Next.js 16 (App Router, `proxy.ts` como middleware), React 19, Tailwind CSS 4 (`@theme` en `app/globals.css`), Prisma 6 + PostgreSQL, NextAuth 4, react-hot-toast.

**Antes de trabajar:** lee `docs/plan/SIGUIENTE.md` (lo de ahora: qué falta subir, las tareas de Andrés y tu fila) y `docs/plan/PLAN.md` (el plan maestro: diseño §1, carriles §4, lista de pendientes §5 y decisiones §7). Antes de probar o de dar pasos de deploy, `docs/plan/OPERACION.md`. El registro de tus tareas está en `docs/plan/PLAN_CLAUDE.md`; lo ya subido, en `docs/plan/HISTORIAL.md`; y cada auditoría (`docs/plan/AUDITORIA*.md`) abre con su cierre.
**Next.js 16 tiene cambios incompatibles** con versiones anteriores (ver `AGENTS.md`, generado por `next dev`). Antes de usar una API de Next (caché, `params`, `proxy`, fuentes, imágenes), consulta `node_modules/next/dist/docs/`.

## Rol en el equipo
Hay dos agentes. **Gemini** hace tareas mecánicas y cerradas (`G-*`, reglas en `GEMINI.md`). **Claude** hace todo lo que requiere criterio: seguridad, dinero, datos, arquitectura, componentes compartidos, header, home y catálogo, y desde el 21/09 también el rediseño y la jerarquía de pantallas (`C-*`); revisa y mergea el trabajo de Gemini.
**ChatGPT salió del equipo el 2026-09-21** (orden de Andrés). No se le asigna nada. Su carril y sus tarjetas pendientes pasaron a Claude (tabla en `docs/plan/PLAN_CHATGPT.md`, "Salida del 21/09"). `CHATGPT.md` y `PLAN_CHATGPT.md` quedan solo como historial.

1. Solo edita archivos del **carril Claude** (`PLAN.md` §4). Los archivos del carril Gemini no se tocan salvo que Andrés lo pida explícitamente.
2. Una tarea = rama `claude/<ID>` = commits con prefijo `[C-XX]`. **Claude hace el merge a `main` y el push** cuando la tarea está verificada (regla de Andrés del 2026-09-30):
   - `git merge --no-ff --no-edit claude/C-XX` (sin `--no-edit` git abre un editor que no existe y la fusión queda a medias).
   - Antes de subir: `git diff main claude/C-XX` vacío después de la fusión (entra exactamente lo revisado) y sin credenciales en lo que se sube (el repositorio es público).
   - El deploy en el servidor lo sigue haciendo Andrés: dale los pasos en `SIGUIENTE.md`, **en un solo bloque** con todo lo que falta subir (commit que debe tener producción, SQL total, cron, pruebas y vuelta atrás). Cuando Andrés lo sube, el bloque pasa a `HISTORIAL.md`.
   - **Versión (desde C-165):** cada bloque de deploy lleva su número (`CHANGELOG.md` explica MAYOR.MENOR.PARCHE). En el mismo commit que arma el bloque: `package.json` (`npm version <x> --no-git-tag-version`), la entrada de `CHANGELOG.md` y, después del merge, `git tag -a v<x> -m "…"` y empujarla con `git push origin v<x>`. El bloque de `SIGUIENTE.md` dice qué `git describe --tags` debe mostrar el servidor.
3. Al terminar, crea `docs/plan/estado/C-XX.md` con `Estado: HECHO` (o `BLOQUEADO — motivo`) en el mismo commit: qué cambió, cómo se verificó y qué queda pendiente. En el mismo commit: su fila en `PLAN_CLAUDE.md`, y `PLAN.md` §5 y `SIGUIENTE.md` al día. Lo que quede pendiente va a la lista única de `PLAN.md` §5.2, no solo al estado.
4. Si una tarea C cambia algo que Gemini usa (tokens, `<PublicHeader />`, `Footer`, rutas), mantén la compatibilidad o deja una nota en el estado **y** actualiza `GEMINI.md`.
5. Si una tarjeta de Gemini queda desactualizada (líneas que se movieron, tokens que cambiaron), actualiza `GEMINI.md` antes de que Gemini la tome.
6. Antes de mergear, revisa las ramas `gemini/*`: el diff debe quedar dentro de su carril y los greps de verificación deben dar lo esperado. Para ver solo la lógica que cambió, compara las dos versiones sin `className` ni sangría (C-86). Revisa también los commits de Gemini que lleguen a `main` sin rama (como `[Marketing]` del 21/09).
7. Cuando Claude rediseña una pantalla que era de ChatGPT, aplica el método de `CHATGPT.md` §4 (anatomía, primera pantalla del teléfono, inventario de acciones): ninguna acción ni dato visible desaparece sin que Andrés lo apruebe.

## Reglas de código (aprendidas en la auditoría)
- **Nunca pases objetos Prisma crudos a componentes cliente ni a respuestas de API públicas.** Usa DTOs con lista blanca (`lib/dto/*`). `costPerItem`, `adminAlertEmails` y `maintenanceAllowedIPs` jamás salen del servidor.
- **Precios, totales, envío, impuestos y dueño de la orden se calculan en el servidor.** Nunca se confía en `body.total`, `item.price` ni `body.userId`.
- Server Components llaman a Prisma o a `lib/queries/*` directamente. **No hagas fetch a la propia API desde el servidor.**
- Settings públicos: el servidor los lee una sola vez y los pasa a `SettingsProvider` como `initialSettings`. No agregues nuevos `fetch('/api/settings/public')`.
- Colores y tipografía: solo los tokens de `PLAN.md` §1. Sin hex en className, sin `text-[<11px]`, sin `font-black`.
- Breakpoint móvil único: `lg`. Nada de `window.innerWidth` para decidir el layout: usa CSS.
- Capas: variables `--z-*` de `PLAN.md` §1.3. No uses `z-[9999]`.
- Bloqueo de scroll: usa el hook `useBodyScrollLock`; no toques `document.body.style.overflow` a mano.
- Nada que solo funcione con hover. Nada de `<button>` dentro de `<Link>` (usa *stretched link*).
- Precios con `lib/currency.ts` (`formatUSD`, `formatVES`).
- Sin `<style jsx>`, `console.log` ni `any` nuevos. Sin animaciones infinitas en la tienda.
- **"Puntos ES", nunca "saldo" ni "billetera"** (ley venezolana; regla de Andrés del 2026-09-30). El saldo del cliente se llama **Puntos ES** (Puntos ElectroShop) en todo texto visible: tienda, panel, correos, toasts y admin. Tampoco "wallet" ni "monedero", ni decir que se retira o se transfiere. Si un pedido usa esas palabras, se traduce a "Puntos ES". El código interno (`WALLET`, `userBalance`, `/customer/balance`) no se renombra.
- **Sin emojis** en la web ni en el código (textos, toasts, badges, comentarios): usa íconos de `react-icons` (`Fi*`). Regla vieja del proyecto que Andrés reafirmó el 2026-09-14.
- Cambios mínimos y del estilo del código que los rodea. No reformatees archivos enteros.

## Verificación
- `npm run lint`, `npx tsc --noEmit` y `npm run build`. Si el entorno no tiene Node, dilo explícitamente en el estado ("no verificado en ejecución") en lugar de asumir que pasa.
- Cambios de UI: revisar a 360, 768, 1024 y 1440 px (checklist en `PLAN.md` §6).
- Cambios en órdenes, carrito o saldo: probar el caso normal **y** el caso manipulado.

## Prohibido sin confirmación de Andrés
Borrar datos, force push, cambiar variables de entorno de producción y decisiones de negocio listadas en `PLAN.md` §7 (las tomadas no se cambian; las abiertas no se dan por resueltas). Las migraciones aditivas están autorizadas (29/09) y el merge con push a `main` también (30/09, ver regla 2).
