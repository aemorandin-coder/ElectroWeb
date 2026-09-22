# Punto de partida (actualizado 2026-09-21 noche: en producción, ChatGPT fuera del equipo, Gemini R20 y auditoría de envíos)

Léelo antes de empezar.

## 1. Estado de las ramas
- **`main` = `origin/main`** (en producción): super merge del 21/09 (C-94…C-98, Gemini R16-R19, GPT-05/06) más **dos commits `[Marketing]` de Gemini** hechos directo en `main` (destinatarios de campañas, logo e íconos de redes en los correos).
  - Claude los revisó en C-99: sin bloqueo. Queda un ajuste para Claude (fila 18 de `PLAN_CLAUDE.md`): la lista de destinatarios devuelve todos los correos sin límite.
- **`claude/C-99`** (desde `main`, solo documentos): salida de ChatGPT, ronda R20 de Gemini y `AUDITORIA_ENVIOS.md`.
- **`claude/C-100`** (desde C-99): envíos con ZOOM y MRW, fase 1. Compila y pasa ESLint; **falta `db push` y la prueba con datos** (`estado/C-100.md`).
- **`claude/C-101`** (desde C-100): métodos de pago. Un commit de Gemini tal cual y otro de Claude con la revisión (`estado/C-101.md`): el build estaba roto y la tienda se quedaba sin métodos de pago.
- **Aviso de proceso (22/09):** Gemini trabajó en la carpeta principal, encima de una tarea de Claude sin terminar, y firmó un commit como "HECHO" sin compilar. Antes de empezar, revisa `git status` y `git log`: lo de Gemini va en `../ElectroShopVe-gemini` y se revisa antes de mergear.
- **Gemini** (`../ElectroShopVe-gemini`, hoy en `gemini/marketing-correos` = `main`): **R20** lista para empezar desde `claude/C-99` (prompt en §5).
- **ChatGPT: salió del equipo el 21/09.** No se le manda nada. Todo lo suyo está en `main` o lo reemplazó C-95. Para limpiar (Andrés, cuando quiera; borra la carpeta y las ramas):
  ```bash
  git worktree remove ../ElectroShopVe-chatgpt
  git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main
  git stash drop stash@{0}
  ```

## 2. Deploy del 21/09 (super merge)
En el servidor (`/var/www/electroshopve`, PM2 `electroshop-web`):
```bash
git pull
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script   # debe salir vacío: este deploy no cambia el esquema
npm run build
pm2 restart electroshop-web --update-env
```
- **Sin cambios de esquema, dependencias ni variables de entorno.**
  - No hace falta `npm ci` ni `prisma db push`.
  - Si el `migrate diff` muestra algo, es de un deploy anterior sin aplicar: no se corre y se revisa con Claude.
- `next.config.js` cambió: permite las fotos de Google. Se aplica con el build.
- **Después del deploy, con tu OK:** el SQL de `docs/plan/estado/C-96.md`. Primero el diagnóstico, que solo lee; después el `UPDATE` que redondea al centavo los saldos con arrastre binario.

**Cómo comprobar:**
- `/recuperar-contrasena` en el teléfono: formulario sin tarjeta, errores bajo el campo.
- Enlace de recuperación viejo → "Enlace vencido o inválido" con "Solicitar otro enlace".
- Editar un producto en el panel y abrir el home: el cambio se ve de inmediato (antes tardaba hasta un minuto).
- Editar un producto digital: el margen del paso "Montos y precios" es el último que usaste, no 12.
- Login: 2 claves malas → el tercer intento pide el captcha; 5 → "Demasiados intentos… Espera 1 minuto".
- Un cliente que desactivó su cuenta en Configuración entra de nuevo y su cuenta queda activa.
- Pedido digital pagado: llega "Pedido digital por entregar" (panel, correo y Telegram); en el pedido se anotan proveedor, referencia y costo, y un doble clic no manda dos códigos.
- **Notificaciones → Qué avisar:** revisar el aviso nuevo "Pedido digital por entregar" (sale por los tres canales por defecto).
- `/creator/dashboard` en el teléfono: botón de menú arriba a la izquierda; el menú se cierra con la capa, con Escape y al elegir una sección.
- Correos de envío, código digital, gift card y certificado sin círculos de color vacíos.

## 3. Incidente: clientes borrados con pedidos en curso (sigue abierto)
Detalle en **`docs/plan/AUDITORIA_CLIENTES_BORRADOS.md`**.
- **Falta de Andrés:** correr las 4 consultas de diagnóstico (solo leen) y pasarle la salida a Claude. Cancelar esas órdenes desde **Admin → Órdenes** con el motivo "Prueba: cliente eliminado".
- **No borres clientes en la base.**
- **Tareas:**
  - G-57 (Gemini R18, antes GPT-02b): "Cliente eliminado" en el panel.
  - C-92 (Claude): desactivar en vez de borrar, y la migración de `onDelete` con tu OK.

## 4. Decisiones ya tomadas (no volver a preguntar)
- **Google:** vincular por correo; teléfono y cédula en la primera compra; **admins nunca con Google**.
- **Cédula:** fuera del registro.
- **Gift card:** solo con saldo, primero se recarga.
- **Onboarding:** con física.
- **ChatGPT:** fuera del equipo desde el 21/09. Sus pantallas las rediseña Claude.
- **Envíos:** se trabaja con ZOOM y MRW. Lo que falta decidir está en `AUDITORIA_ENVIOS.md` §6.
- **Clientes:** se borran de verdad solo si no tienen órdenes, saldo, transacciones ni gift cards; si no, se desactivan.
- **Dinero:** nunca sale de la empresa (C-74). Comisiones solo por compras pagadas, como saldo (C-75).
- **Recorrido de la tienda:** no aparece en `/creator` (G-55, pedido de GPT-05).

## 5. Mensajes para empezar

### Gemini · Ronda R20 (G-62 → G-66)
> Tienes una ronda nueva, la **R20**: limpieza de productos y dos paneles antes de que Claude los rediseñe. Desde hoy el equipo es Claude + Gemini: **ChatGPT salió**. Sus pantallas son de Claude y tú entras solo a lo que nombra cada tarjeta.
>
> **Antes de empezar**, lee completo `GEMINI.md` y, en `docs/plan/PLAN_GEMINI.md`, "Resultado de R17, R18 y R19" y "Ronda R20". Para tipos, relee G-47 y G-48 ("Ronda R13") y G-59.
>
> **Rama** (en `../ElectroShopVe-gemini`, con `bash`):
> 1. `git status` → limpio. Estás en `gemini/marketing-correos`: ya está en `main`, no la toques más.
> 2. `git switch -c gemini/R20 claude/C-99` → **G-62, G-63, G-64, G-65, G-66**, en ese orden.
>
> **Reglas de oro:**
> - Haz solo lo que dice cada tarjeta, en los archivos que nombra. Fuera en R20: `app/admin/(dashboard)/orders/**`, `components/orders/**`, `app/checkout/**` (Claude rehace los envíos), `app/api/**`, `lib/**` y `prisma/**`.
> - No cambian `fetch`, URLs, `method`, cuerpos, permisos, cálculos ni textos visibles, salvo lo que la tarjeta pida.
> - G-63 es la **única** eliminación permitida (`ProductForm.tsx`, con el `git grep` pegado).
> - En G-65 **no borres** `handleExcelChange`, `handleSelectAll`, `handleSelectProduct` ni `slug`: van a Notas.
> - Sin `// eslint-disable`, sin `any` nuevos, sin emojis y sin reindentar archivos.
> - **Nada directo en `main`.** Los dos commits `[Marketing]` del 21/09 entraron a `main` sin revisión: no se repite. Si Andrés te pide algo fuera de la ronda, va en una rama `gemini/<tema>` y Claude la revisa antes del merge.
>
> **En cada tarjeta, antes del commit, pega en `docs/plan/estado/G-XX.md`:**
> - ESLint por archivo, antes y después.
> - `npx tsc --noEmit` (salida real).
> - `npm run build` (últimas 5 líneas).
> - `git diff --stat` contra `git diff -w --stat`.
> - Lo que pida la "Verificación" o el "Criterio" de la tarjeta.
>
> Un commit por tarjeta, con el prefijo `[G-XX]`. Si algo no cuadra, pon `BLOQUEADO — motivo` y sigue con la siguiente: no te quedes esperando. No hagas merge, rebase ni push. Al terminar G-66, avisa a Andrés y pega `git log --oneline claude/C-99..gemini/R20`.

### ChatGPT
**Fuera del equipo desde el 21/09.** No se le manda nada.

### Claude (siguiente sesión)
> Continúa el proyecto ElectroShopVe (en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md`, `docs/plan/PLAN_CLAUDE.md` §4b y `docs/plan/AUDITORIA_ENVIOS.md`.
> - ChatGPT salió del equipo: sus pantallas son tuyas (filas 15-17). Lo nuevo sale de `main` (o de `claude/C-99` si no se mergeó).
> - **Prioridad: C-100, envíos con ZOOM y MRW**, cuando Andrés responda D-E1…D-E4. La fase 1 no necesita credenciales.
> - Esperan a Andrés: el OK del SQL de C-96, "Duplicar" (C-97) y el diagnóstico para **C-92**. Sin dependencias: fila 13c y fila 18.
> - Cuando Gemini avise, revisa R20 con el método de C-86 y C-98. Después, C-51 (productos).
> - Busca bugs, seguridad y diseño inconsistente en todo lo que toques. Nada de `git push` sin que yo lo pida.

## 6. Datos útiles para Claude
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Tienda de ejemplo:** esquema `rev10_demo` (en `DATABASE_URL`, cambiar `schema=public` por `schema=rev10_demo`).
  - Tiene productos, órdenes, cliente, admin y una creadora en `PENDING`.
  - Build con esa URL y `next start -p 3100` con `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY= HCAPTCHA_SECRET=test NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"`.
  - Tiene las tablas de C-75.
  - **Borrarlo al cerrar el ciclo** (`DROP SCHEMA "rev10_demo" CASCADE` con `prisma db execute --url`).
- **Navegador:** Firefox headless con `--remote-debugging-port 9333` + WebDriver BiDi (`ws://127.0.0.1:9333/session`).
  - Reiniciar Firefox antes de cada script ("Maximum number of active sessions").
  - Borrar las cookies al empezar: el perfil guarda la sesión de la corrida anterior.
- **Sesión sin login:** JWT firmado con `encode` de `next-auth/jwt` en la cookie `next-auth.session-token` (con `id`, `role` y `sessionVersion` de la base).
- **Carrito en pruebas con sesión:** escribir `localStorage.cart` estando en `/carrito`, con `cart-owner = 'guest'`, y recargar.
- **Revisar ramas de otros agentes:**
  - Comparar contra `git merge-base`, no contra `main`: si `main` avanzó, la comparación directa mezcla cambios ajenos.
  - Contar `fetch`, `method`, `router` y `href` antes y después.
  - Comparar sin `className` ni sangría para ver solo la lógica (script de C-86).
  - ESLint por archivo contra `main`.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …`.
