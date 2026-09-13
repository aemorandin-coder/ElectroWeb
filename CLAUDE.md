# CLAUDE.md — Reglas para Claude en ElectroShopVe WEB

Responde a Andrés en español. Tienda online de Electro Shop Morandin C.A. (Guanare, Venezuela).
Stack: Next.js 16 (App Router, `proxy.ts` como middleware), React 19, Tailwind CSS 4 (`@theme` en `app/globals.css`), Prisma 6 + PostgreSQL, NextAuth 4, react-hot-toast.

**Antes de trabajar:** lee `docs/plan/PLAN_CLAUDE.md` (tu orden por rondas y el detalle de cada tarea), `docs/plan/PLAN.md` (diseño y carriles) y, si la tarea toca un bug, su fila en `docs/plan/AUDITORIA.md`.
**Next.js 16 tiene cambios incompatibles** con versiones anteriores (ver `AGENTS.md`, generado por `next dev`). Antes de usar una API de Next (caché, `params`, `proxy`, fuentes, imágenes), consulta `node_modules/next/dist/docs/`.

## Rol en el equipo
Hay dos agentes. **Gemini** hace tareas mecánicas y cerradas (`G-*`, reglas en `GEMINI.md`). **Claude** hace todo lo que requiere criterio: seguridad, dinero, datos, arquitectura, componentes compartidos, header, home y catálogo (`C-*`).

1. Solo edita archivos del **carril Claude** (`PLAN.md` §4). Los archivos del carril Gemini no se tocan salvo que Andrés lo pida explícitamente.
2. Una tarea = rama `claude/<ID>` = commits con prefijo `[C-XX]`. No se hace merge a `main`: eso lo hace Andrés.
3. Al terminar, crea `docs/plan/estado/C-XX.md` con `Estado: HECHO` (o `BLOQUEADO — motivo`) en el mismo commit: qué cambió, cómo se verificó y qué queda pendiente.
4. Si una tarea C cambia algo que Gemini usa (tokens, `<PublicHeader />`, `Footer`, rutas), mantén la compatibilidad o deja una nota en el estado **y** actualiza `GEMINI.md`.
5. Si una tarjeta de Gemini queda desactualizada (líneas que se movieron, tokens que cambiaron), actualiza `GEMINI.md` antes de que Gemini la tome.
6. Antes de mergear, revisa las ramas `gemini/*`: el diff debe quedar dentro del carril Gemini y los greps de verificación deben dar lo esperado.

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
- Cambios mínimos y del estilo del código que los rodea. No reformatees archivos enteros.

## Verificación
- `npm run lint`, `npx tsc --noEmit` y `npm run build`. Si el entorno no tiene Node, dilo explícitamente en el estado ("no verificado en ejecución") en lugar de asumir que pasa.
- Cambios de UI: revisar a 360, 768, 1024 y 1440 px (checklist en `PLAN.md` §6).
- Cambios en órdenes, carrito o saldo: probar el caso normal **y** el caso manipulado.

## Prohibido sin confirmación de Andrés
Migraciones de Prisma, borrar datos, `git push`, force push, cambiar variables de entorno de producción y decisiones de negocio listadas en `PLAN.md` §7.
