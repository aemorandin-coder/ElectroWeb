# Punto de partida (actualizado 2026-09-17, 13:30: segundo merge a producción)

Léelo antes de empezar.

## 1. Estado de las ramas
- **`main` = `origin/main`** (C-93). Contiene todo lo revisado:
  - C-55, C-75, C-78, C-82…C-90.
  - **Gemini R10-R15** (R13-R15: limpieza de ESLint, tipos en todas las APIs, emojis y el script peligroso borrado).
  - **ChatGPT GPT-01…GPT-04** (dashboard, órdenes, raspado, transacciones, clientes, gift cards, reportes).
- `../ElectroShopVe-gemini`: terminó R15. Siguiente: **G-54** (correos) en `gemini/R16` desde `main`.
- `../ElectroShopVe-chatgpt` en `chatgpt/R1`: GPT-05 a medias sin commit. Sigue con los pendientes de R1, luego R2 (productos) y R3 (resto del admin), encadenados.

## 2. Deploy a producción (Andrés)
En el servidor (`/var/www/electroshopve`, PM2 `electroshop-web`):
```bash
git pull
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script   # mira qué SQL correría
npx prisma db push                                   # solo crea tablas nuevas (ver 2.1)
npx tsx scripts/move-business-documents.ts           # cuenta, no mueve
npx tsx scripts/move-business-documents.ts --apply   # mueve
npm run build
pm2 restart electroshop-web --update-env
```
`npm ci` no hace falta: `package-lock.json` no cambió. **No hay variables de entorno nuevas obligatorias.** Google es opcional (2.5).

### 2.1 Qué crea `prisma db push`
Solo tablas nuevas; **no borra ni cambia nada existente**.
- `email_campaigns` y `email_campaign_recipients` (C-75).
- Si el deploy del 15/09 no se aplicó: `admin_notification_settings` y `telegram_chats` (C-73).

En `migrate diff` solo deben aparecer `CREATE TABLE`, `CREATE INDEX` y `ADD CONSTRAINT … FOREIGN KEY` de esas tablas. **Si aparece un `DROP`, no se corre.**

### 2.2 Documentos de empresa
`move-business-documents.ts` pasa las cédulas, RIF y actas de `public/uploads/documents/` a `private-uploads/`. Sin `--apply` solo cuenta.

### 2.3 Después del deploy (panel)
1. **Configuración → Correo:** activar "Correos de marketing" y revisar el límite diario.
2. **Marketing → Campañas:** mandar una campaña de prueba a tu correo, con imagen.
3. **Notificaciones → Telegram:** conectar el bot, si no se hizo.

### 2.4 Cómo comprobar que quedó bien
- Correo en MAYÚSCULAS en el login → entra.
- Registro: 4 campos sin cédula y errores bajo cada campo.
- Checkout con una cuenta sin cédula: pide "Completa tus datos para comprar" antes de pagar.
- Mi Perfil: la cédula se escribe completa y queda bloqueada al guardar.
- Gift Cards sin saldo: "Te faltan $X" y "Recargar saldo" (no "Agregar al carrito").
- Cliente nuevo: recorrido "Hola, …" con confeti; en su panel, misiones con anillo de progreso.
- **Admin → Resumen:** "Por atender" arriba. **Órdenes:** filtros con contador y la acción siguiente visible en el teléfono.
- **Cliente → pedido digital:** la tarjeta de la plataforma se voltea y se raspa.
- Recuperar contraseña con clave de 6 caracteres → la rechaza.
- `/api/uploads/documents/<archivo>` sin sesión → 404.

### 2.5 Activar Google (cuando quieras)
Pasos en `AUDITORIA_REGISTRO.md` §3:
1. Crea el cliente OAuth con la URI `https://www.electroshopve.com/api/auth/callback/google`.
2. Pon `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el `.env`.
3. `pm2 restart electroshop-web --update-env`.

## 3. Incidente: clientes borrados con pedidos en curso
Detalle en **`docs/plan/AUDITORIA_CLIENTES_BORRADOS.md`**.
- **Causa:** al borrar un cliente directo en la base, sus órdenes quedan vivas con `userId` vacío (salen como "Invitado"). También se borran en cascada su saldo y todas sus transacciones.
- **Hoy, desde el servidor y el panel:**
  1. Corre las 4 consultas de diagnóstico (solo leen) y guarda la salida para Claude.
  2. Cancela esas órdenes desde **Admin → Órdenes** con el motivo "Prueba: cliente eliminado".
  3. **No borres clientes en la base ni corras `scripts/reset-customers.ts`** (borra todos los usuarios, también los administradores).
- **Tareas:**
  - GPT-02b (ChatGPT): "Cliente eliminado" en el panel.
  - G-52 (Gemini): ✅ script borrado.
  - C-92 (Claude): "Eliminar" borra de verdad solo clientes sin órdenes, saldo, transacciones ni gift cards; los demás se desactivan. Más la migración de `onDelete`, con tu OK.
- **Decisión tomada (17/09):** sí se borra un cliente de spam sin órdenes, saldo ni gift cards.

## 4. Decisiones ya tomadas (no volver a preguntar)
- **Google:** vincular por correo; teléfono y cédula en la primera compra; **admins nunca con Google**.
- **Cédula:** fuera del registro.
- **Gift card:** solo con saldo, primero se recarga.
- **Onboarding:** con física.
- **ChatGPT:** puede rediseñar el raspado del cliente.
- **Clientes:** se borran de verdad solo si no tienen órdenes, saldo, transacciones ni gift cards; si no, se desactivan.
- **Dinero:** nunca sale de la empresa (C-74). Comisiones solo por compras pagadas, como saldo (C-75).

## 5. Mensajes para empezar

### Gemini (ahora: G-54)
> Terminaste R13-R15 y quedaron aprobadas y en producción (lee "Resultado de R13, R14 y R15" en `docs/plan/PLAN_GEMINI.md`). Haz **G-54** en la rama `gemini/R16` creada desde `main` (`git switch -c gemini/R16 main`): quitar los símbolos ⏳ y ⏸ que quedaron, borrar los círculos de color vacíos de los correos y arreglar el asunto que empieza con espacio en `sendCreatorStatusEmail`. **No cambies nada más de las plantillas.** Pega en `docs/plan/estado/G-54.md` el grep con el rango completo (0 resultados), el grep de `border-radius:50%`, `npx tsc --noEmit` y `npm run build`. Un commit. No hagas merge ni push: avisa a Andrés.

### Gemini (plan de 3 días del 17/09, ya hecho)
> Tienes 3 días de trabajo pesado sin revisión intermedia. Lee completo `GEMINI.md` y, en `docs/plan/PLAN_GEMINI.md`, "Resultado de R12", "Plan de 3 días", "Ronda R13", "Ronda R14" y "Ronda R15". Haz en este orden: **G-47, G-48** en `gemini/R13` (desde `main`); **G-49, G-50, G-51** en `gemini/R14` (desde `gemini/R13`); **G-52, G-53** en `gemini/R15` (desde `gemini/R14`).
> La regla de oro de R14: **solo tipos**. El servidor tiene que hacer exactamente lo mismo; si tipar algo exige cambiar lógica, lo dejas y lo anotas.
> En cada tarjeta, antes del commit, pega en su `docs/plan/estado/G-XX.md`:
> - el conteo de ESLint por archivo antes y después,
> - `npx tsc --noEmit` (salida real),
> - `npm run build` (últimas líneas),
> - `git diff --stat` contra `git diff -w --stat`,
> - y en las rutas de dinero, el `git diff -w` completo.
>
> Un commit por tarjeta. Si algo se bloquea, `BLOQUEADO — motivo` y sigues con la siguiente. No hagas merge, rebase ni push; al terminar las tres rondas avisa a Andrés.

### ChatGPT (sigue: R1 → R2 → R3)
> Tienes 3 días de trabajo pesado de diseño y jerarquía sin revisión intermedia. Lee completo `CHATGPT.md` y `docs/plan/PLAN_CHATGPT.md`, en especial "Resultado de GPT-01 y GPT-02", "Cómo trabajar las rondas largas", "Ronda R2" y "Ronda R3".
> 1. **R1** en `chatgpt/R1` (GPT-01…GPT-04 ya están en producción):
>    - Termina GPT-05 (ya lo empezaste).
>    - Haz los pendientes de GPT-02 (tarjeta de orden que abre el detalle, "Actualizar" como ícono, métricas compactas; borra `GPT-02-preview.html`).
>    - Haz **GPT-02b** ("Cliente eliminado") y GPT-06.
> 2. **R2, productos del admin, la zona más compleja**, en `chatgpt/R2` (desde `chatgpt/R1`):
>    - GPT-07 es el mapa completo, **sin código**. Luego GPT-08 lista, GPT-09 carga masiva, exportar, edición rápida y SADES, GPT-10 wizard, GPT-11 limpieza.
>    - Los `alert` y `confirm` nativos pasan a `toast` y `useConfirm`.
>    - El cuerpo del `POST` de un producto nuevo debe ser idéntico antes y después: pégalo en el estado.
> 3. **R3** en `chatgpt/R3` (desde `chatgpt/R2`): GPT-12 a GPT-16, el resto del panel con la misma anatomía.
>
> En cada tarjeta:
> - Primero el estado con mapa, inventario de acciones, problemas medidos y bocetos ASCII a 390 y 1440 px.
> - Después el código por partes.
> - Autorrevisión: `fetch`, `method`, `body`, `href` y `router` idénticos, con la salida del grep antes y después; capturas a 360, 768, 1024 y 1440; `tsc` y ESLint sin problemas nuevos.
>
> Commits firmados como ChatGPT (`git -c user.name="ChatGPT" -c user.email="chatgpt@electroshop.local" commit …`). No cambies APIs, no instales dependencias, no hagas merge, rebase ni push. Lo que necesite otro carril va como `PEDIDO:`. Al terminar avisa a Andrés.

### Claude (al volver, 20/09)
> Continúa el proyecto ElectroShopVe. Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` y `docs/plan/PLAN_CLAUDE.md` §4b. Revisa `gemini/R15` (trae R13 y R14) y `chatgpt/R3` (trae R1, R2 y R3) con el método de C-86, C-90 y C-91 antes de mergear. Después C-92 con la salida del diagnóstico de clientes borrados. Busca bugs, seguridad y diseño inconsistente en todo lo que toques; nada de `git push` sin que yo lo pida.

## 6. Datos útiles para Claude
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Tienda de ejemplo:** esquema `rev10_demo` (en `DATABASE_URL`, `schema=public` → `schema=rev10_demo`), con productos, órdenes, cliente, admin y creadora. `npm run build` con esa URL y `next start -p 3100` con `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY= HCAPTCHA_SECRET=test NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"`. Tiene las tablas de C-75. **Borrarlo al cerrar el ciclo** (`DROP SCHEMA "rev10_demo" CASCADE` con `prisma db execute --url`).
- **Navegador:** Firefox headless con `--remote-debugging-port 9333` + WebDriver BiDi (`ws://127.0.0.1:9333/session`). Reiniciar Firefox antes de cada script ("Maximum number of active sessions"). Borrar cookies al empezar: el perfil guarda la sesión de la corrida anterior.
- **Sesión sin login:** JWT firmado con `encode` de `next-auth/jwt` en la cookie `next-auth.session-token`.
- **Carrito en pruebas con sesión:** escribir `localStorage.cart` estando en `/carrito`, con `cart-owner = 'guest'`, y recargar.
- **Revisar ramas de otros agentes:** comparar sin `className` ni sangría para ver solo la lógica (script de C-86); ESLint por archivo contra `main`.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …`.
