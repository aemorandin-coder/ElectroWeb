# Punto de partida (actualizado 2026-09-21: C-94, ChatGPT en pausa, plan final de Gemini)

Léelo antes de empezar.

## 1. Estado de las ramas
- **`main` = `origin/main`** (`d07ca1f`, deploy del 17/09 con Prisma fijado en 6.19.3).
- **`claude/C-94`**, lista para mergear. Trae:
  - `gemini/R16`: G-54, correos sin círculos vacíos.
  - `chatgpt/R1`: GPT-05, panel de creadores en el teléfono, y GPT-06, recuperar contraseña y verificar correo.
  - La revisión y los documentos de C-94.
  - Verificada: `tsc` 0, build OK y navegador a 390 y 1440 px.
- **Gemini** (`../ElectroShopVe-gemini`, hoy en `gemini/R16`): siguiente, **R17 → R18 → R19** desde `claude/C-94`. Son sus últimas rondas (§5).
- **ChatGPT** (`../ElectroShopVe-chatgpt`): **en pausa desde el 21/09**, hasta nueva orden de Andrés.
  - Carpeta limpia en `chatgpt/product-fixes-main`, con su arreglo de productos a medias guardado en el commit `386e56c`. Lo termina Claude en **C-95**.
  - Queda `stash@{0}`, una versión vieja del mismo arreglo. Se borra cuando C-95 esté en `main`.

## 2. Deploy de C-94 (Andrés)
```bash
# En la carpeta principal:
git switch main && git merge --no-ff claude/C-94 && git push
# En el servidor (/var/www/electroshopve, PM2 electroshop-web):
git pull && npm run build && pm2 restart electroshop-web --update-env
```
- **Sin cambios de esquema, dependencias ni variables de entorno.** No hace falta `npm ci` ni `prisma db push`.

**Cómo comprobar:**
- `/recuperar-contrasena` en el teléfono: formulario sin tarjeta, errores bajo el campo.
- Enlace de recuperación viejo → "Enlace vencido o inválido" con "Solicitar otro enlace".
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
- **ChatGPT:** puede rediseñar el raspado del cliente. **En pausa desde el 21/09.**
- **Clientes:** se borran de verdad solo si no tienen órdenes, saldo, transacciones ni gift cards; si no, se desactivan.
- **Dinero:** nunca sale de la empresa (C-74). Comisiones solo por compras pagadas, como saldo (C-75).
- **Recorrido de la tienda:** no aparece en `/creator` (G-55, pedido de GPT-05).

## 5. Mensajes para empezar

### Gemini (ahora: plan final, R17 → R18 → R19)
> Tienes trabajo largo sin revisión intermedia. Son tus **tres últimas rondas**: con ellas terminas tu trabajo en el proyecto hasta nueva orden de Andrés.
>
> **Antes de empezar**, lee completo `GEMINI.md`. En `docs/plan/PLAN_GEMINI.md` lee las secciones del final: "Resultado de R16", "Plan final de Gemini", "Ronda R17", "Ronda R18" y "Ronda R19". Para tipos y variables sin uso, relee también G-47 y G-48 ("Ronda R13").
>
> **Ramas** (en `../ElectroShopVe-gemini`, con `bash`):
> 1. `git status` → limpio.
> 2. `git switch -c gemini/R17 claude/C-94` → **G-55, G-56**.
> 3. `git switch -c gemini/R18 gemini/R17` → **G-57, G-58, G-59, G-60**.
> 4. `git switch -c gemini/R19 gemini/R18` → **G-61** (solo el informe, sin tocar código).
>
> **Reglas de oro:**
> - Haz solo lo que dice cada tarjeta, en los archivos que nombra. ChatGPT está en pausa: en el admin haces limpieza, no rediseño.
> - No cambian `fetch`, URLs, `method`, cuerpos, permisos, cálculos ni textos visibles, salvo lo que la tarjeta pida.
> - En G-56 y G-60 solo cambian dos líneas por función: `const nombre = async (…) => {` pasa a `async function nombre(…) {`, y `};` pasa a `}`. **Nada se mueve.**
> - Sin `// eslint-disable`, sin `any` nuevos y sin reindentar archivos.
> - `app/admin/(dashboard)/products/_components/**` no se toca.
>
> **En cada tarjeta, antes del commit, pega en `docs/plan/estado/G-XX.md`:**
> - ESLint por archivo, antes y después.
> - `npx tsc --noEmit` (salida real).
> - `npm run build` (últimas 5 líneas).
> - `git diff --stat` contra `git diff -w --stat`.
> - Lo que pida la "Verificación" o el "Criterio" de la tarjeta.
>
> Un commit por tarjeta, con el prefijo `[G-XX]`. Si algo no cuadra, pon `BLOQUEADO — motivo` y sigue con la siguiente: no te quedes esperando. No hagas merge, rebase ni push. Al terminar G-61, avisa a Andrés y pega `git log --oneline claude/C-94..gemini/R19`.

### ChatGPT
**En pausa. No se le manda nada** hasta que Andrés lo decida. Cuando vuelva:
> Volviste de la pausa. Lee completo `CHATGPT.md` y, en `docs/plan/PLAN_CHATGPT.md`, "Resultado de GPT-05 y GPT-06" y "Pausa del 21/09". Crea `chatgpt/R2` **desde `main`** (`git switch -c chatgpt/R2 main`) y empieza por **GPT-07** (el mapa de productos, sin código). Antes, revisa `docs/plan/estado/G-57.md` a `G-60.md`: Gemini limpió tipos y diálogos en tus pantallas. Firma cada commit como ChatGPT (`git -c user.name="ChatGPT" -c user.email="chatgpt@electroshop.local" commit …`). No cambies APIs, no hagas merge, rebase ni push. Lo que necesite otro carril va como `PEDIDO:`.

### Claude (siguiente sesión)
> Continúa el proyecto ElectroShopVe. Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` y `docs/plan/PLAN_CLAUDE.md` §4b.
> - Si `claude/C-94` ya está en `main`, haz **C-95**: el Home al día y el margen recordado, retomando `chatgpt/product-fixes-main`.
> - Después **C-92**, con la salida del diagnóstico de clientes borrados, y **C-80**.
> - Cuando Gemini avise, revisa R17-R19 con el método de C-86 y C-94.
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
