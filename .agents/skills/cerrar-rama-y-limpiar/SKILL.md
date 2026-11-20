---
name: cerrar-rama-y-limpiar
description: >-
  Checklist obligatorio al cerrar cualquier rama tras hacer merge a main o al
  limpiar temporales en la PC de trabajo de ElectroShopVe. Rescata salidas
  útiles, elimina worktrees, ramas mergeadas, esquemas *_demo y cachés sin
  borrar archivos personales ni del Escritorio sin confirmación.
---

# Cerrar rama y limpiar el entorno

Ejecutar siempre inmediatamente después de fusionar una rama (`gemini/<ID>` o `claude/<ID>`) en `main`, o cuando el usuario pida limpiar la PC.

## 1. Salvar antes de borrar (obligatorio)
1. Verificar si el worktree tiene salidas útiles ignoradas por git (por ejemplo `chispa/salida/`, capturas finales o documentos) y copiarlas al repo principal o a la carpeta indicada por el usuario.
2. Si existen archivos en `~/Escritorio/` generados para una tarea ya cerrada o duplicados en el repo, **listar primero al usuario qué hay y qué ya está respaldado**; nunca borrar archivos del Escritorio ni respaldos sin confirmación explícita.
3. Revisar `docs/plan/SIGUIENTE.md` por si menciona alguna maqueta activa en `~/.cache/electroshop-trabajo/` antes de limpiarla.

## 2. Cerrar el worktree y la rama
1. Confirmar que no hay commits sin fusionar (`git branch --no-merged main`) ni archivos rastreados modificados sin commit (`git -C <worktree> status -s`).
2. Retirar el worktree y depurar la rama:
   ```bash
   git worktree remove --force <ruta-worktree>
   git worktree prune
   git branch -d <rama>
   ```
3. Si se usó `scripts/e2e/_t*.ts`, `.next-test` o `public/uploads` de prueba, eliminarlos.

## 3. Limpiar base local, cachés y `/tmp` de la tarea
1. Borrar el esquema local de prueba de esa tarea (nunca `public`):
   ```bash
   DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//')
   psql "$DB" -c 'DROP SCHEMA IF EXISTS "<id>_demo" CASCADE;'
   ```
2. Borrar el caché de la tarea cerrada (`~/.cache/electroshop-trabajo/<id>`, `~/.cache/electroshop-capturas/<ID>`, `/tmp/chispa-*` o perfiles temporales de Chrome).

## 4. Verificación final
- `git worktree list` muestra solo el repositorio principal en `main`.
- `git branch --no-merged main` está vacío.
- `git status -s` en el repo principal está limpio.
