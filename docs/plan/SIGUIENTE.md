# Punto de partida (actualizado 2026-09-26: C-104, C-102, C-103, C-51, C-110, C-111 y C-40 listos para mergear)

Léelo antes de empezar.

## 0. URGENTE: dos credenciales quedaron públicas (el repositorio de GitHub es público)
Encontrado en C-40. Ya se quitaron del código, pero **siguen en el historial de git**: hay que cambiarlas.
1. **`SADES_WEBHOOK_SECRET`.** `scripts/test-webhook.js` tenía escrito un secreto `whsec_…`, con el comentario "CONFIGURACIÓN CON TU CLAVE REAL".
   - Con él, cualquiera puede cambiar el precio y el stock de cualquier producto por SKU.
   - **Si el `.env` del servidor tiene ese mismo valor:** genera otro (`openssl rand -hex 24`), ponlo en el `.env` del servidor y en SADES, y reinicia.
   - Desde C-40 esos cambios quedan en Reportes → Seguridad ("SADES (webhook)").
2. **Cuenta `masteradmin@electroshopve.com`.** `scripts/create-master-admin.ts` tenía su contraseña escrita.
   - **Si existe en producción**, cámbiale la contraseña o bórrala. Revisa también en Reportes → Seguridad si alguien entró con ella.
   - Lo mismo para `cliente@electroshop.com` (`create-customer.ts`), si se creó en producción.
3. Recomendado: **poner el repositorio en privado** (GitHub → Settings → Change visibility).

## 1. Ramas
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

## 2. Deploy (servidor `/var/www/electroshopve`, PM2 `electroshop`)
**Este merge agrega cosas a la base: no borra ni cambia columnas.**

```bash
cd /var/www/electroshopve
git pull

# 1. Ver qué falta en la base (solo lee)
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
#    Lo esperado:
#      CREATE TYPE "PromotionKind", "PromotionScope"
#      CREATE TABLE "promotions", "promotion_redemptions", "legal_documents", "document_signatures"
#      ALTER TABLE "wishlist_items" ADD COLUMN "priceAtSaveUSD"
#    Si aparece un DROP o un ALTER ... TYPE: PARA y avisa a Claude.

# 2. Aplicar
npx prisma db push          # si pide aceptar pérdida de datos, PARA
npx prisma generate
npm run build
pm2 restart electroshop --update-env

# 3. Pasar las firmas de los términos del saldo a la tabla nueva, con su PDF (no borra nada)
npx tsx scripts/migrar-firmas-saldo.ts           # en seco: dice cuántas
npx tsx scripts/migrar-firmas-saldo.ts --apply
```

- **Respaldo:** agrega `private-uploads/signatures/` a las copias del servidor. Ahí quedan las constancias firmadas.
- **Si algo sale mal:** `git reset --hard 41d5594 && npx prisma generate && npm run build && pm2 restart electroshop`.
  - Ese es el `main` anterior. Las tablas nuevas pueden quedarse: el código viejo no las usa.

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
1. **Revisión final con Andrés** (`REVISION_FINAL.md`) y lo que salga de ella.
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
