<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Equipo de ElectroShopVe

- **ChatGPT:** antes de trabajar lee `CHATGPT.md` completo y tu ronda en `docs/plan/PLAN_CHATGPT.md`.
- **Gemini:** `GEMINI.md` y `docs/plan/PLAN_GEMINI.md`.
- **Claude:** `CLAUDE.md` y `docs/plan/PLAN_CLAUDE.md`.
- Punto de partida de todos: `docs/plan/SIGUIENTE.md`.

## Diseño (skills globales)

Las skills de diseño instaladas (`impeccable`, `design-taste-frontend` y variantes de Taste, `ui-ux-pro-max`) y el MCP de Refero Styles **sí se pueden usar** para criticar, pulir y elevar la UI de ElectroShopVe, pero **el sistema de diseño de este repo manda siempre**:

- Colores: solo los tokens de `app/globals.css` (`brand-*`, `ink`, `muted`, `line`, `surface`, `success`, `deal`…). Nunca un hex nuevo en un `className`, aunque una skill o un DESIGN.md de Refero lo proponga.
- Tipografía: nada de `text-[7px]`…`text-[10px]`, `font-black` ni `font-extrabold`. No se cambia la fuente del sitio.
- Sin dependencias nuevas (ni Framer Motion, ni GSAP, ni librerías de íconos): animaciones con CSS/Tailwind e íconos de `react-icons/fi`.
- Las skills proponen; la tarjeta de la ronda decide el alcance. Si una mejora visual no está en tu tarjeta, anótala como sugerencia en tu estado, no la apliques.
- Si una regla de una skill choca con `GEMINI.md`, `CLAUDE.md` o el plan, gana el archivo del repo.
