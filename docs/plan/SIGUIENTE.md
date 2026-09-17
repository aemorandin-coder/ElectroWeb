# Punto de partida para la próxima conversación (actualizado 2026-09-17)

Léelo antes de empezar. Resume dónde quedó todo, qué falta subir, qué decide Andrés y qué hace cada agente.

## 1. Estado de las ramas

- **`origin/main` = `dbd2027`** (último push, 15/09).
- **`main` local va 44 commits adelante y NO está subido** (Andrés: "No subas nada todavía"). Contiene, todo revisado y probado:
  - **C-55** marco del panel del cliente · **C-78** retoques de la tienda · **C-82** hotfix aprobar cursos y creadores · **C-83** hotfix "Credenciales invalidas".
  - **C-75** Marketing: campañas de correo con imágenes, promotores, plantillas reales.
  - **C-84** registro más fácil y perfil blindado · **C-88** contraseñas con una sola regla.
  - **C-85** registro e inicio con Google (listo para activar), cédula fuera del registro, teléfono y cédula en la primera compra.
  - **C-87** gift card solo con saldo · **C-89** onboarding con física.
  - **Gemini R10, R11 (C-86) y R12 (C-90)**, revisadas y con arreglos.
- `../ElectroShopVe-gemini`: R12 mergeada. R13 se empieza desde `main`.
- `../ElectroShopVe-chatgpt` en `chatgpt/R1`: GPT-01 y GPT-02 con commit, GPT-03 en curso. Sus commits salen firmados "Gemini" (identidad del repo): desde ahora firma como ChatGPT (`CHATGPT.md` §3).

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
`npm ci` no hace falta: `package-lock.json` no cambió. **No hay variables de entorno nuevas obligatorias.** Google es opcional (§2.5).

### 2.1 Qué crea `prisma db push`
Solo tablas nuevas. **No borra ni cambia ninguna tabla ni columna existente.** Google no necesita migración: la tabla `accounts` ya existe.
- Si el deploy del 15/09 no se aplicó: `admin_notification_settings` y `telegram_chats` (C-73).
- Siempre: `email_campaigns` y `email_campaign_recipients` (C-75).

En la salida de `migrate diff` solo deben aparecer `CREATE TABLE`, `CREATE INDEX` y `ADD CONSTRAINT … FOREIGN KEY` de esas tablas. Si aparece un `DROP`, no se corre y se avisa a Claude.

### 2.2 Documentos de empresa (`move-business-documents.ts`)
Mueve las cédulas, RIF y actas de `public/uploads/documents/` (se podían abrir sin sesión) a `private-uploads/` y actualiza la ruta en la base. Sin `--apply` solo cuenta.

### 2.3 Después del deploy (Andrés, en el panel)
1. **Configuración → Correo:** activar "Correos de marketing" y revisar el límite diario.
2. **Marketing → Campañas:** mandar una campaña de prueba a tu correo (con imagen).
3. **Notificaciones → Telegram:** token de @BotFather y "Conectar un chat" (si no se hizo).

### 2.4 Cómo comprobar que quedó bien
- Entrar escribiendo el correo en MAYÚSCULAS → entra (C-83).
- Registro: 4 campos sin cédula; errores bajo cada campo; la barra inferior no tapa la contraseña (C-84, C-85).
- Checkout con una cuenta sin cédula: aparece "Completa tus datos para comprar" y no deja pagar hasta guardarlos (C-85).
- Mi Perfil: se puede escribir la cédula completa y queda bloqueada al guardar (C-85).
- Gift Cards sin saldo: "Te faltan $X" y "Recargar saldo", nunca "Agregar al carrito" (C-87).
- Cliente nuevo en la tienda: recorrido "Hola, …" con foco que viaja y confeti al final; en su panel, misiones con anillo de progreso (C-89).
- Recuperar la contraseña con una clave de 6 caracteres → la rechaza con el motivo (C-88).
- `/api/uploads/documents/<archivo>` sin sesión → 404.

### 2.5 Activar Google (Andrés, cuando quiera)
Pasos en `docs/plan/AUDITORIA_REGISTRO.md` §3:
1. Crea el cliente OAuth en Google Cloud con la URI `https://www.electroshopve.com/api/auth/callback/google`.
2. Pon `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el `.env` del servidor.
3. Reinicia: `pm2 restart electroshop-web --update-env`. No hace falta recompilar.

## 3. Decisiones de Andrés

**Tomadas el 16-17/09 (no volver a preguntar):**
- Google: la cuenta con el mismo correo se vincula sola; teléfono y cédula se piden en la primera compra; **los administradores nunca entran con Google**.
- Cédula fuera del registro: aprobado, porque el cliente la agrega en Mi Perfil o en el checkout.
- Gift card sin saldo: primero recarga.
- Onboarding con física, épico, con el estilo de la tienda (hecho en C-89).
- ChatGPT puede rediseñar el raspado de códigos del cliente (`app/customer/(dashboard)/orders/[id]/digital`).
- Antes: el dinero nunca sale de la empresa: cancelar una orden pagada con saldo devuelve crédito de la tienda, sin retiros (C-74). Comisiones solo por compras pagadas, como saldo (C-75). Campañas completas; IA fuera del generador de redes; SMTP en Configuración.

**Pendientes:**

| Tema | Pregunta | Recomendación |
|---|---|---|
| Push y deploy | ¿Cuándo subir `main` (44 commits)? | Cuando revises lo del §2.4 en local o en un servidor de pruebas |
| Google | Crear el cliente OAuth (§2.5) | 20-30 min, gratis |
| Facebook / Apple | ¿Cuándo? | Facebook después de Google; Apple (99 USD/año) cuando haya volumen de iPhone |
| Teléfono en el registro | ¿Opcional también? | Dejarlo: se usa para coordinar entregas |

## 4. Qué hace cada agente

### Claude (`PLAN_CLAUDE.md` §4b)
1. **Revisar `chatgpt/R1` y `gemini/R13`** cuando avisen.
2. **C-80** límite de intentos de login en el servidor, cuentas desactivadas, DTO del perfil.
3. Facebook cuando Andrés cree la app; C-51, C-60b, C-76, C-40.

### Gemini (`PLAN_GEMINI.md`, Ronda R13)
- **G-47** variables e imports sin uso y comillas en el texto (53 en 20 archivos). **G-48** `any` → tipos (29).
- R12 salió bien (258 clases viejas → 0, sin lógica ni sangría fuera de lo pedido).

### ChatGPT (`PLAN_CHATGPT.md`, Ronda R1)
- GPT-01 (dashboard) y GPT-02 (órdenes y raspado del cliente) con commit; sigue GPT-03 a GPT-06.

## 5. Mensajes para empezar

### Conversación nueva de Claude
> Continúa el proyecto ElectroShopVe. Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` y `docs/plan/PLAN_CLAUDE.md` §4b. Las decisiones del §3 ya están tomadas. Cuando Gemini o ChatGPT avisen, revisa `gemini/R13` o `chatgpt/R1` antes de mergear; si no, sigue con C-80. Busca bugs, seguridad y diseño inconsistente en todo lo que toques; nada de `git push` sin que yo lo pida.

### Conversación nueva de Gemini (Ronda R13)
> Haz la **Ronda R13** de `docs/plan/PLAN_GEMINI.md` (G-47 y G-48) en la rama `gemini/R13` creada desde `main` (`git switch -c gemini/R13 main`). Lee primero "Resultado de R12" y las reglas de R13: solo limpias ESLint en tu carril (imports y variables sin uso, comillas en el texto, `any` → tipos), **sin cambiar lo que hace el código** y sin tocar las reglas de hooks ni `app/customer/(dashboard)/orders/[id]/digital/**`. En cada tarjeta, antes del commit: ESLint de cada archivo con el conteo por regla (pega el antes y el después), `npx tsc --noEmit` (pega la salida real) y `git diff --stat` contra `git diff -w --stat`. Un commit por tarjeta con su `docs/plan/estado/G-XX.md`. Si algo no cuadra, anótalo o `BLOQUEADO`, y sigues. No hagas merge ni push: al terminar avisa a Andrés.

### Conversación nueva de ChatGPT (Ronda R1, trabajo pesado)
> Eres parte del equipo de ElectroShopVe (tienda online en Next.js 16, React 19 y Tailwind 4) junto con Claude y Gemini. Tu papel: **diseño y jerarquía de pantallas completas**. Trabajas en la carpeta `../ElectroShopVe-chatgpt`.
> 1. Lee **completo** `CHATGPT.md` (reglas, carril y guía de diseño), `docs/plan/PLAN_CHATGPT.md` (tu ronda), `docs/plan/PLAN.md` §1 (tokens) y `lib/admin-ui.ts` (recetas). Mira como referencia `app/admin/(dashboard)/marketing/`, `app/customer/(dashboard)/layout.tsx` y `app/registro/page.tsx`.
> 2. Si ya tienes `chatgpt/R1`, sigue desde la tarjeta que te falta; si no, créala desde `main`. **GPT-01 a GPT-06 en orden**, un commit por tarjeta (`[GPT-XX] …`) con su `docs/plan/estado/GPT-XX.md`, **firmado como ChatGPT** (`git -c user.name="ChatGPT" -c user.email="chatgpt@electroshop.local" commit …`).
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
