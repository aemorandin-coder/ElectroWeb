# Punto de partida (actualizado 2026-09-28: ElectroStudio C-112 + C-113 en `main` y en GitHub; falta el deploy)

Léelo antes de empezar.

## 0. Credenciales del historial (resuelto el 26/09)
Encontradas en C-40: el secreto del webhook de SADES (`scripts/test-webhook.js`) y la contraseña de `masteradmin@electroshopve.com` (`scripts/create-master-admin.ts`). Ya no están en el código, pero siguen en el historial del repositorio público.
- Revisado en producción el 26/09: `SADES_WEBHOOK_SECRET` no está en el `.env` del servidor y la cuenta `masteradmin` no existe. **No había nada que cambiar.**
- Si algún día se configura el webhook de SADES: secreto nuevo (`openssl rand -hex 24`), nunca el del historial.
- Sigue recomendado **poner el repositorio en privado** (GitHub → Settings → Change visibility).

## 1. Ramas
- **ElectroStudio, fases 1 y 2 (`claude/C-112` y `claude/C-113`): en `main` desde el 28/09** (super merge y push de Claude, pedido por Andrés). Falta el deploy (§2).
  - Reemplaza "Imágenes para redes" por `/admin/studio`: historias, posts y videos con los productos, precios, ofertas, cupones, reseñas y la tasa reales de la tienda.
  - **Base:** crea 2 tablas (`studio_flyers` con su columna `code`, y `studio_brand`), con el OK de Andrés del 26/09. `deploy.sh` para y muestra el SQL: solo `CREATE`, sin DROP. Correr `npx prisma db push` y otra vez el guion.
  - **Medición:** sin tablas nuevas. Usa `analytics_events`, una cookie en `proxy.ts` y una línea en la API de órdenes que no frena la compra.
  - Detalle en `estado/C-112.md` y `estado/C-113.md`.
- **Anterior (ya en `main`):**
- **Encadenadas:** `main` → C-104 → C-102 → C-103 → C-51 → C-110 → C-111 → C-40. **Mergear `claude/C-40` trae todo.** Cada una tiene su `docs/plan/estado/C-XX.md`.
- **Resumen:**
  - **C-104:** reportes reales y bitácora conectada (logins, precios y aprobaciones).
  - **C-102:** ofertas con precio tachado y cupones. Favoritos al estilo Amazon: se quitó "pedir descuento" (decisión de Andrés).
  - **C-103:** firma de documentos con versión, PDF guardado y firma exigida al recargar.
  - **C-51:** productos del admin (casillas, precios, "Destacado", edición rápida y "Duplicar").
  - **C-110:** resto del panel (reseñas verificadas, categorías sin ciclos, pagos sin plantillas vacías, solicitudes con aviso al cliente).
  - **C-111:** ESLint de 88 errores a 0 y cajones accesibles.
  - **C-40:** README, `.env.example`, guiones sin credenciales y webhook de SADES validado.
- **Gemini:** sin ronda abierta. Lo que cambió y le afecta está en `GEMINI.md` §7.
- **ChatGPT:** fuera del equipo desde el 21/09. Limpieza opcional: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.

## 2. Deploy
Servidor `/var/www/electroshopve`, proceso de PM2 `electroshop` (no `electroshop-web`: `ecosystem.config.js` está desactualizado y no se usa).

**Hecho el 26/09/2026** (`main` en 8d4c14f, desde 41d5594):
- `db push` solo agregó: 2 tipos, 4 tablas y `wishlist_items."priceAtSaveUSD"`.
- Respaldo de la base: `~/respaldo-antes-deploy-26-09.dump`.
- Firmas del saldo pasadas: 11 de 11, con su PDF. Respaldo: `~/firmas-2026-09-26.tgz`.
- **Se encontró un problema:** 55.910 "Could not find a production build" en el log de PM2. `npm run build` borraba `.next` con la tienda corriendo, y PM2 la reiniciaba sin parar mientras duraba el build. El contador de reinicios se puso en 0 el 26/09.

**Pendiente: deploy de ElectroStudio (C-112 + C-113).**
- Crea 2 tablas: solo `CREATE`, sin DROP ni `ALTER ... TYPE`.
- Cambia dependencias: entra `qrcode-generator` y salen `html2canvas` y `@google/generative-ai`.
- **Pasos:**
  1. Respaldo:
     `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-deploy-28-09.dump`
     (`pg_dump` no acepta el `?schema=` de la URL de Prisma).
  2. `bash scripts/deploy.sh`: hace el pull y **para** mostrando el SQL.
  3. `npx prisma db push`.
  4. `bash scripts/deploy.sh` otra vez: instala las dependencias, compila y cambia de carpeta.
- **Al pasar (C-113):** el guion viejo solo instalaba dependencias si el pull era de esa misma corrida. Si paraba por la base, la segunda corrida no instalaba y el build fallaba. Ahora instala cuando `package-lock.json` no es el de la última instalación.

**Desde ahora, cada deploy:**
```bash
cd /var/www/electroshopve
bash scripts/deploy.sh
```
- Compila en `.next-a` o `.next-b` (la que no se sirve) y solo entonces reinicia. La tienda no se cae durante el build.
- Si el build falla, o la tienda no responde con la carpeta nueva, sigue la anterior.
- **Si el deploy cambia la base, el guion para y muestra el SQL.** Si hay un DROP o un `ALTER ... TYPE`, avisa a Claude; si no, `npx prisma db push` y se corre de nuevo.
- La primera vez pasa de `.next` a `.next-a` y borra `.next`.

- **Respaldo:** agrega `private-uploads/signatures/` a las copias del servidor. Ahí quedan las constancias firmadas.
- **Volver a una versión anterior:** `git reset --hard <commit> && bash scripts/deploy.sh --sin-pull`. Si esa versión tenía otras dependencias, antes `npm install`. Solo sirve para versiones que ya traen este guion. El próximo deploy normal vuelve a traer lo último.

**Después del deploy, en el panel:**
- **Descuentos → Ofertas y cupones:** crea tu primera oferta o cupón. Las solicitudes viejas quedan en su pestaña.
- **Legal → Documentos:** revisa el texto de los términos del saldo (versión 1, igual al del modal viejo). Para cambiarlo, "Nueva versión": todos vuelven a firmar.

**Qué comprobar:** la lista completa por ancho de pantalla está en `docs/plan/REVISION_FINAL.md`. Lo mínimo:
1. Una compra con cupón.
2. Firmar los términos desde "Recargar saldo".
3. Reportes → Seguridad muestra tu inicio de sesión con tu IP real.

## 3. Incidente: clientes borrados con pedidos en curso (sigue abierto)
Detalle en `docs/plan/AUDITORIA_CLIENTES_BORRADOS.md`.
- **Falta de Andrés:** correr las 4 consultas de diagnóstico y cancelar esas órdenes con el motivo "Prueba: cliente eliminado".
- **Tareas:** G-57 ("Cliente eliminado" en el panel) y C-92 (desactivar en vez de borrar, migración de `onDelete` con OK).

## 4. Decisiones tomadas (no volver a preguntar)
- **Google:** vincular por correo; teléfono y cédula en la primera compra; admins nunca con Google.
- **Cédula:** fuera del registro.
- **Gift card:** solo con saldo.
- **Onboarding:** con física.
- **ChatGPT:** fuera del equipo.
- **Envíos:** ZOOM y MRW con cobro a destino.
- **ElectroStudio (26/09):** ese nombre; historias guardadas en la base (2 tablas); por fases; el artefacto sigue hasta la fase 2.
- **ElectroStudio fase 2 (28/09):** de las 6 recomendaciones, Andrés eligió la 2 (tasa BCV), la 3 (aviso de historia vencida), la 4 (qué historia vende), la 5 (deshacer y estilos) y la 6 (fondo con foto propia). La 1 (plan semanal automático) quedó fuera.
- **Clientes:** se borran solo si no tienen nada; si tienen, se desactivan.
- **Dinero:** nunca sale de la empresa. Comisiones solo por compras pagadas.
- **Descuentos (25/09):**
  - Si hay varios, gana el mayor.
  - Los digitales, fuera.
  - Precio tachado.
  - "Pedir descuento" reemplazado por ofertas y cupones.
  - El cupón de monto fijo va primero a los productos sin oferta.
- **Duplicar producto:** opción A (el servidor copia todo). La copia nace en borrador y sin stock.
- **Reseñas:** solo con una orden entregada del producto.

## 5. Pendientes para la próxima sesión (Claude)
1. **Revisión final con Andrés** (`REVISION_FINAL.md`) y lo que salga de ella. Sumar ElectroStudio:
   - Una historia de un producto real.
   - "Tu foto" con una foto del local.
   - El video en Chrome y "Compartir" desde el teléfono.
   - Después de unos días, mirar "Resultados".
1b. **ElectroStudio:** fases 1 y 2 listas (C-112 y C-113). El artefacto "Flyers ElectroShop" ya se puede retirar (decisión del 26/09). Si Andrés quiere pasar sus historias, se hace un importador.
2. **C-107:** seguro del envío a elección del cliente. Espera los costos de ZOOM y MRW y el OK de la migración.
3. **C-92:** desactivar clientes en vez de borrarlos (con el diagnóstico del §3).
4. **Wizard de producto** (crear y editar): rediseño paso a paso (lo que quedó de C-51).
5. **Menores:**
   - Aviso cuando un favorito entra en oferta.
   - Ordenar el catálogo por el precio de oferta.
   - Ocultar el formulario de reseña a quien no puede reseñar.
   - `/terminos` y `/privacidad` como documentos editables.
   - Conservar el slug al renombrar una categoría.
6. **Al cerrar el ciclo:** borrar el esquema `rev10_demo` y los archivos de prueba de `private-uploads/signatures/` de la máquina local.

## 6. Datos útiles para Claude
- **Node:** `export PATH="$HOME/.local/lib/nodejs/node-v20.18.0-linux-x64/bin:$PATH"`.
- **Tienda de ejemplo:** esquema `rev10_demo`, con el esquema del 26/09 aplicado. Tiene productos de prueba de C-102 y C-51 (audífonos, teclado, gift card y Robux con montos) y ofertas y cupones de ejemplo.
- **Servidor de prueba:** build con `DATABASE_URL` de `rev10_demo` y `next start -p 3100` con `SMTP_HOST= EMAIL_PROVIDER= RESEND_API_KEY= HCAPTCHA_SECRET=test NODE_OPTIONS="--require ./scripts/e2e/fetch-mock.cjs"`. Para el webhook de SADES, además `SADES_WEBHOOK_SECRET=…`.
- **Pruebas:** HTTP con Node y el JWT firmado con `encode` de `next-auth/jwt`. Navegador con Firefox headless y WebDriver BiDi:
  - Toques de dedo: `input.performActions` con `pointerType: 'touch'`.
  - Teclado: acciones `key`.
  - Los objetos que devuelve `script.evaluate` vienen serializados: devolver `JSON.stringify`.
- **ESLint:** 0 errores. Comparar cada archivo contra la rama base antes de commitear.
- **Commits de Claude:** `git -c user.name="Claude" -c user.email="claude@electroshop.local" commit …`.

## 7. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (en producción). Lee `CLAUDE.md` y `docs/plan/SIGUIENTE.md`.
> - Antes de tocar nada: `git status`, `git log -3` y `git branch --show-current` (Gemini a veces trabaja en la carpeta principal).
> - Primero pregúntale a Andrés si rotó el secreto de SADES y revisó la cuenta `masteradmin` (§0), y cómo le fue con el deploy del 26/09.
> - Después: la revisión final (`REVISION_FINAL.md`), y en orden C-107, C-92 y el wizard de productos.
