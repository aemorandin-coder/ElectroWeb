# Punto de partida (actualizado 2026-09-22: envíos y métodos de pago en `main`, deploy pendiente)

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

## 2. Deploy del 22/09 (envíos y métodos de pago) — `acecf42` en `origin/main`

**Este deploy sí cambia el esquema y agrega una variable de entorno.** En el servidor (`/var/www/electroshopve`, PM2 `electroshop-web`):

```bash
cd /var/www/electroshopve
git pull

# 1. Ver qué va a cambiar en la base (solo lee)
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
#    Esperado: solo ADD COLUMN y CREATE TABLE "shipment_events". Si aparece un DROP, PARA y avisa.

# 2. Aplicarlo
npx prisma db push          # si pide aceptar pérdida de datos, PARA

# 3. El cliente de Prisma no se regenera solo con el build
npx prisma generate

# 4. Variable nueva para el rastreo automático (32 caracteres al azar)
#    Agrega a .env:  CRON_SECRET="<pega aquí el valor>"
openssl rand -hex 16

npm run build
pm2 restart electroshop-web --update-env

# 5. Rastreo de ZOOM cada 2 horas (crontab -e)
# 0 */2 * * * curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<tu-dominio>/api/cron/envios >/dev/null
```

**Después del deploy, en el panel (obligatorio):**
- **Configuración → Envíos:** revisa el embalaje, pon "Envío gratis desde" si quieres, y **el delivery en Guanare viene apagado**: ponle tarifa y actívalo.
- **Métodos de pago:** edita el que dice "Binance" y cámbiale el tipo a **Binance Pay**; al guardar se limpia el "Banco Mercantil Panamá" que arrastraba. Completa titular y correo donde falten (ahora el servidor los exige).
- **Productos:** prende "Envío gratis" en los productos caros que quieras (paso "Precios y envío").

**Qué comprobar (en este orden):**
1. La tienda abre y un producto se agrega al carrito.
2. **Recargar saldo:** el modal muestra los métodos de pago. Si sale vacío, algo quedó mal: avísame.
3. Checkout con un producto físico: elige ZOOM → estado → ciudad → oficina (la lista debe traer oficinas reales) y confirma que solo se cobra el embalaje.
4. Repite con MRW (agencias) y con "A domicilio".
5. En Órdenes: la orden nueva muestra "Cobro a destino", el destinatario y "Copiar datos para la guía". Márcala enviada con una guía de prueba.
6. En Mis pedidos del cliente: guía, "Copiar", "Rastrear" y el historial.
7. Un producto con "Envío gratis": el badge sale en la tarjeta y el checkout cobra $0 de envío.

**Si algo sale mal:** `git reset --hard d1e1cc7 && npx prisma generate && npm run build && pm2 restart electroshop-web`. Las columnas nuevas pueden quedarse: no estorban a la versión anterior.

**Aún sin probar con datos:** C-100 y C-101 se verificaron con `tsc`, `build` y ESLint, y las APIs de ZOOM se probaron de verdad, pero **no se hizo la prueba de compra completa** (el entorno de Claude no pudo tocar la base). Los pasos 2 a 7 son esa prueba.

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

### Gemini · R20 (G-62 → G-66) y luego R21 (G-67)
> Trabajas en tu carpeta, `../ElectroShopVe-gemini`, **nunca en la principal**: el 22/09 commiteaste ahí, encima de una tarea de Claude sin terminar, y marcaste "HECHO" algo que no compilaba y dejaba la tienda sin métodos de pago. Desde ahora, todo va en tu rama y Claude lo revisa antes del merge.
>
> **Antes de empezar**, lee completo `GEMINI.md` y, en `docs/plan/PLAN_GEMINI.md`, "Ronda R20" y "Ronda R21". Para tipos, relee G-47, G-48 y G-59.
>
> **Ramas** (con `bash`):
> 1. `git status` → limpio. `git fetch origin && git switch -c gemini/R20 origin/main`.
> 2. **R20:** G-62, G-63, G-64, G-65 y G-66, en ese orden, un commit por tarjeta.
> 3. **R21:** `git switch -c gemini/R21 gemini/R20` → **G-67**, que es un informe: **no se toca código**.
>
> **Reglas de oro:**
> - Solo lo que dice cada tarjeta, en los archivos que nombra.
> - Fuera: `app/api/**`, `lib/**`, `prisma/**`, `app/checkout/**`, `app/admin/(dashboard)/orders/**`, `components/orders/**`, `components/checkout/**` y `app/admin/(dashboard)/payments/**` (Claude los acaba de rehacer).
> - No cambian `fetch`, URLs, `method`, cuerpos, permisos, cálculos ni textos visibles, salvo lo que pida la tarjeta.
> - G-63 es la **única** eliminación permitida (`ProductForm.tsx`, con el `git grep` pegado).
> - En G-65 **no borres** `handleExcelChange`, `handleSelectAll`, `handleSelectProduct` ni `slug`: van a Notas.
> - Nada de datos de ejemplo que parezcan reales (teléfonos, cuentas, wallets): si una plantilla los necesita, van vacíos e inactivos.
> - Sin `// eslint-disable`, sin `any` nuevos, sin emojis y sin reindentar archivos.
>
> **En cada tarjeta, antes del commit, pega en `docs/plan/estado/G-XX.md`:** ESLint por archivo antes y después, `npx tsc --noEmit` (salida real), `npm run build` (últimas 5 líneas) y `git diff --stat` contra `git diff -w --stat`. **Si `tsc` o el build fallan, la tarjeta no está hecha:** ponle `BLOQUEADO — motivo` y sigue con la siguiente.
>
> Un commit por tarjeta con el prefijo `[G-XX]`. No hagas merge, rebase ni push. Al terminar G-67, avisa a Andrés y pega `git log --oneline origin/main..gemini/R21`.

### Claude (siguiente sesión)
> Continúa ElectroShopVe (en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` (§2 el deploy del 22/09), `docs/plan/PLAN_CLAUDE.md` §4b y las auditorías `AUDITORIA_ENVIOS.md` y `AUDITORIA_PAGOS.md`.
> - **Antes de tocar nada:** `git status`, `git log -3` y `git branch --show-current`. Gemini a veces trabaja en la carpeta principal.
> - **Primero:** la prueba de punta a punta que quedó pendiente de C-100 y C-101 (compra física con ZOOM y con MRW, envío gratis, delivery en Guanare, recarga de saldo y Binance Pay), en la tienda de ejemplo con `db push`. Si algo falla en producción, eso manda.
> - **Después, en este orden:** C-105 (IP real, con el nginx del servidor), C-104 (reportes reales), C-102 (descuentos) y C-103 (firma de documentos con física).
> - Una rama por tarea, commits `[C-XX]` y su `docs/plan/estado/C-XX.md`. Nada de `git push` sin que Andrés lo pida.
> - Busca bugs, seguridad y diseño inconsistente en todo lo que toques.

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
