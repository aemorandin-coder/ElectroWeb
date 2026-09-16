# Punto de partida para la próxima conversación (actualizado 2026-09-16, noche)

Léelo antes de empezar. Resume dónde quedó todo, qué falta subir, qué decide Andrés y qué hace cada agente.

## 1. Estado de las ramas

- **`origin/main` = `dbd2027`** (último push, 15/09).
- **`main` local va 31 commits adelante y NO está subido** (Andrés: "No subas nada todavía"). Contiene, todo revisado y probado:
  - **C-55** marco del panel del cliente · **C-78** retoques de la tienda · **C-82** hotfix aprobar cursos y creadores.
  - **C-83** hotfix "Credenciales invalidas" (correo con mayúsculas).
  - **C-75** Marketing: campañas de correo con imágenes, promotores con comisión solo por compras pagadas, plantillas reales, correo en Configuración.
  - **C-84** registro más fácil, login con el mismo marco, `/api/user/profile` blindado.
  - **Gemini R10 (G-38, G-39) y R11 (G-40…G-43)** con los 6 arreglos de **C-86**.
  - **C-88** contraseñas con una sola regla; recuperar la clave cierra las sesiones.
- Worktree de Gemini `../ElectroShopVe-gemini`: `gemini/R11` ya está en `main`. R12 se empieza desde `main`.
- Worktree de ChatGPT `../ElectroShopVe-chatgpt`: **no existe todavía** (ver §5).

## 2. Deploy pendiente (cuando Andrés pida el push)

En el servidor (`/var/www/electroshopve`, PM2 `electroshop-web`):

```bash
git pull
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script   # mira antes qué SQL correría
npx prisma db push                                   # ← necesita el OK de Andrés
npx tsx scripts/move-business-documents.ts           # cuenta, no mueve
npx tsx scripts/move-business-documents.ts --apply   # mueve
npm run build
pm2 restart electroshop-web --update-env
```
`npm ci` no hace falta: `package-lock.json` no cambió. **No hay variables de entorno nuevas obligatorias.**

### 2.1 Qué crea `prisma db push`
Solo tablas nuevas. **No borra ni cambia ninguna tabla ni columna existente.**
- Si el deploy del 15/09 no se aplicó: `admin_notification_settings` y `telegram_chats` (C-73, avisos y bot de Telegram).
- Siempre: `email_campaigns` y `email_campaign_recipients` (C-75, campañas de correo y a quién se le envió cada una).

En la salida de `migrate diff` solo deben aparecer `CREATE TABLE`, `CREATE INDEX` y `ADD CONSTRAINT … FOREIGN KEY` de esas tablas. Si aparece un `DROP`, no se corre y se avisa a Claude.

### 2.2 Documentos de empresa (`move-business-documents.ts`)
Mueve las cédulas, RIF y actas que suben los clientes de `public/uploads/documents/` (se podían abrir sin sesión) a `private-uploads/` y actualiza la ruta en la base. Sin `--apply` solo cuenta.

### 2.3 Después del deploy (Andrés, en el panel)
1. **Configuración → Correo:** activar "Correos de marketing" y revisar el límite diario.
2. **Marketing → Campañas:** mandar una campaña de prueba a tu correo (con imagen).
3. **Notificaciones → Telegram:** token de @BotFather y "Conectar un chat" (si no se hizo).

### 2.4 Cómo comprobar que quedó bien
- Entrar escribiendo el correo en MAYÚSCULAS → entra (C-83).
- Registrarse desde el teléfono: errores bajo cada campo, la barra inferior no tapa la contraseña (C-84).
- Recuperar la contraseña con una clave de 6 caracteres → la rechaza con el motivo (C-88).
- `/admin/cursos`: un curso de creador aparece "En revisión" y se puede aprobar (C-82).
- Carrito con una gift card: la miniatura tiene el diseño elegido y los bolívares usan la tasa de la tienda (C-86).
- `/api/uploads/documents/<archivo>` sin sesión → 404.

## 3. Decisiones de Andrés que desbloquean trabajo

| Tema | Pregunta | Recomendación | Detalle |
|---|---|---|---|
| **Google (C-85)** | Crear el cliente OAuth en Google Cloud y poner `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` en el `.env` del servidor | 20-30 min, gratis | `AUDITORIA_REGISTRO.md` §3, paso a paso |
| Google | Si ya existe una cuenta con ese correo: ¿vincular sola? | Sí | Google solo entrega correos verificados |
| Google | Teléfono y cédula que Google no trae: ¿dónde se piden? | En el checkout, la primera compra | |
| Google | ¿Admins entran con Google? | No | |
| **Registro** | ¿Sacar la cédula del registro y pedirla en la primera compra? | Sí | El registro baja a 4 campos |
| **Gift cards (C-87)** | Sin saldo suficiente, ¿qué pasa? | Recargar saldo primero | Hoy va al carrito y el checkout la rechaza |
| Facebook / Apple | ¿Cuándo? | Facebook después de Google; Apple (99 USD/año) cuando haya volumen de iPhone | |

**Ya decidido (no volver a preguntar):** el dinero nunca sale de la empresa: cancelar una orden pagada con saldo devuelve crédito de la tienda, sin retiros (C-74). Comisiones de promotores solo por compras pagadas, se acreditan como saldo (C-75). Campañas completas en el panel; IA fuera del generador de redes; SMTP en Configuración.

## 4. Qué hace cada agente

### Claude (`PLAN_CLAUDE.md` §4b)
1. **C-85 Google** en cuanto Andrés cree el cliente OAuth y decida (§3).
2. **C-87** gift card sin saldo (con la decisión de Andrés).
3. **C-80** límite de intentos de login en el servidor, cuentas desactivadas, DTO del perfil.
4. **Revisar `chatgpt/R1` y `gemini/R12`** cuando avisen.
5. C-51, C-60b, C-76, C-40.

### Gemini (`PLAN_GEMINI.md`, Ronda R12)
- **G-44** terminar el checkout (G-41 quedó a medias: 55 clases viejas y "USD 50,00$" en el resumen).
- **G-45** `components/ui` con tokens · **G-46** Footer, botón de cuenta y carrito del header.
- Lo que salió mal en R10/R11 está en `PLAN_GEMINI.md`: cambió lógica "de paso" (gift card del carrito, `disabled` de Empresa), borró un bloque entero y volvió a reindentar archivos.

### ChatGPT (`PLAN_CHATGPT.md`, Ronda R1) · nuevo
- Diseño y jerarquía de pantallas completas, sin cambiar lógica.
- **GPT-01** dashboard admin · **GPT-02** órdenes · **GPT-03** transacciones, clientes y gift cards · **GPT-04** reportes · **GPT-05** panel de creadores en móvil (antes C-79) · **GPT-06** recuperar contraseña y verificar correo.

## 5. Mensajes para empezar

### Preparar la carpeta de ChatGPT (una sola vez, Andrés, desde "ElectroShopVe WEB")
```bash
git worktree add "../ElectroShopVe-chatgpt" -b chatgpt/base main
ln -s "$PWD/node_modules" "../ElectroShopVe-chatgpt/node_modules"
cp .env "../ElectroShopVe-chatgpt/.env"
```

### Conversación nueva de Claude
> Continúa el proyecto ElectroShopVe. Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` y `docs/plan/PLAN_CLAUDE.md` §4b. Revisa en §3 qué decisiones ya tomé y sigue el orden de la tabla. Cuando Gemini o ChatGPT avisen, revisa `gemini/R12` o `chatgpt/R1` antes de mergear. Busca bugs, seguridad y diseño inconsistente en todo lo que toques; nada de `git push` sin que yo lo pida.

### Conversación nueva de Gemini (Ronda R12)
> Haz la **Ronda R12** de `docs/plan/PLAN_GEMINI.md` (G-44, G-45 y G-46) en la rama `gemini/R12` creada desde `main` (`git switch -c gemini/R12 main`; `main` ya trae R10 y R11 mergeadas con arreglos, no sigas en `gemini/R11`). Antes de empezar lee completo `GEMINI.md` (el carril cambió el 16/09) y la sección "Lo que salió mal en R10 y R11": **solo cambias `className`** y los "Arreglos permitidos"; un `disabled`, un `if` o un bloque con datos raros no se tocan, se anotan con `PEDIDO:`. En cada tarjeta, antes del commit: el grep de colores de la tarjeta (pega el número), `npx tsc --noEmit` (pega la salida real), `npx eslint` de los archivos (sin problemas nuevos), `git diff --stat` contra `git diff -w --stat` (cifras parecidas) y QA a 390 y 1440 px. Un commit por tarjeta con su `docs/plan/estado/G-XX.md`. Si algo no cuadra, `BLOQUEADO` y sigues. No hagas merge ni push: al terminar avisa a Andrés.

### Conversación nueva de ChatGPT (Ronda R1, trabajo pesado)
> Eres parte del equipo de ElectroShopVe (tienda online en Next.js 16, React 19 y Tailwind 4) junto con Claude y Gemini. Tu papel: **diseño y jerarquía de pantallas completas**. Trabajas en la carpeta `../ElectroShopVe-chatgpt`.
> 1. Lee **completo** `CHATGPT.md` (reglas, carril y guía de diseño), `docs/plan/PLAN_CHATGPT.md` (tu ronda), `docs/plan/PLAN.md` §1 (tokens) y `lib/admin-ui.ts` (recetas). Mira como referencia `app/admin/(dashboard)/marketing/`, `app/customer/(dashboard)/layout.tsx` y `app/registro/page.tsx`.
> 2. Crea la rama `chatgpt/R1` desde `main` y haz **GPT-01 a GPT-06 en orden**, un commit por tarjeta (`[GPT-XX] …`) con su `docs/plan/estado/GPT-XX.md`.
> 3. En cada pantalla: primero el **inventario de acciones** (botones, enlaces, filtros, modales), después el rediseño, y al final comprueba que siguen todas. **No cambias qué hace la pantalla**: mismos `fetch`, cuerpos, permisos, cálculos y destinos. Puedes reescribir el JSX y dividirlo en `_components/`.
> 4. Lo primero que se ve a 360 px tiene que ser lo que el admin viene a hacer. Montos nunca cortados, tabla y tarjetas nunca a la vez, una acción primaria por pantalla, solo tokens y recetas, sin emojis.
> 5. Verificación real pegada en el estado: `npx tsc --noEmit`, ESLint de cada archivo contra `main` (sin problemas nuevos), `npm run build` si puedes, capturas a 360, 768, 1024 y 1440 px (o `QA visual pendiente` con el motivo).
> 6. Lo que esté fuera de tu carril va como `PEDIDO:` en el estado. Si algo no cuadra, `BLOQUEADO` y sigues con la siguiente. No instales dependencias, no hagas merge ni push: al terminar la ronda avisa a Andrés; Claude la revisa y la mergea.

## 6. Datos útiles para Claude
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Tienda de ejemplo:** esquema `rev10_demo` (en `DATABASE_URL`, `schema=public` → `schema=rev10_demo`), con productos, órdenes, cliente, admin y creadora. `npm run build` con esa URL y `next start -p 3100` con `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY= HCAPTCHA_SECRET=test NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"`. Tiene las tablas de C-75. **Borrarlo al cerrar el ciclo** (`DROP SCHEMA "rev10_demo" CASCADE` con `prisma db execute --url`).
- **Navegador:** Firefox headless con `--remote-debugging-port 9333` + WebDriver BiDi (`ws://127.0.0.1:9333/session`). Reiniciar Firefox antes de cada script ("Maximum number of active sessions"). Borrar cookies al empezar: el perfil guarda la sesión de la corrida anterior.
- **Sesión sin login:** JWT firmado con `encode` de `next-auth/jwt` en la cookie `next-auth.session-token`.
- **Carrito en pruebas con sesión:** escribir `localStorage.cart` estando en `/carrito`, con `cart-owner = 'guest'`, y recargar.
- **Revisar ramas de otros agentes:** comparar sin `className` ni sangría para ver solo la lógica (script de C-86); ESLint por archivo contra `main`.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …`.
