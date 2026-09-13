# C-fix-cursos — Filtro por categoría de /cursos
Estado: HECHO
Rama: claude/fix-cursos-filtro (desde `main` con C-10). Pedido explícito de Andrés: el archivo es del carril de Gemini.

## Qué cambió
- `app/cursos/page.tsx`: en Next 16 `searchParams` es una Promise. El código lo leía como objeto, así que `searchParams?.cat` siempre era `undefined` y **el filtro por categoría nunca se aplicaba** (el chip activo tampoco cambiaba). Ahora hace `await searchParams`, y solo acepta un valor de la lista `CATEGORIES`; un valor inventado o repetido (`?cat=A&cat=B`) muestra todos los cursos.
- Es la única página con ese patrón (búsqueda de `searchParams`/`params` tipados como objeto en `app/`).

## Cómo se verificó
- `npx tsc --noEmit` → 0 errores. `eslint app/cursos/page.tsx`: 3 → 3 (igual que `main`).
- Arnés con la página real y Prisma simulado. **Rama:** `?cat=REDES` → `where.category = "REDES"`; sin filtro, `?cat=INVENTADA` y `?cat=REDES&cat=GAMING` → sin filtro. **`main`:** `?cat=REDES` → `undefined` (bug reproducido).
- `next dev`: en `/cursos?cat=REDES` el chip "Redes" queda activo (`bg-[#2a63cd] text-white`) y el resto no; en `/cursos`, ninguno.
- `git merge-tree` con `gemini/R3b` (G-16 tocó el mismo archivo) → sin conflicto.

## Nota para Gemini
- Las tarjetas G-06 (colores) y G-17 (settings) que tocan `app/cursos/page.tsx` se basan en texto, no en números de línea: siguen válidas.
