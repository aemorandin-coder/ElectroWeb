# Punto de partida (actualizado 2026-09-25: C-105 y C-109 en `main`; nginx con la IP real)

Léelo antes de empezar.

## 1. Estado de las ramas
- **25/09:** `main` suma C-109 (destinatarios de campañas con límite) y C-105 (IP real del cliente, `lib/ip.ts`).
  - **nginx ya pasa la IP real** (Andrés, 25/09): `X-Real-IP`, `X-Forwarded-For` y `X-Forwarded-Proto` en `/etc/nginx/sites-available/electroshopve`. Respaldo en `~/electroshopve.nginx.bak`.
  - Sin Cloudflare: el dominio apunta directo al servidor (86.48.25.174).
  - **Deploy del 25/09:** no cambia la base. `git pull && npm run build && pm2 restart electroshop-web --update-env`.
  - **Comprobar:** el aviso "Acceso de administrador" muestra la misma IP que https://ifconfig.me en ese dispositivo.
  - **Pendiente en el servidor:** "System restart required" (`pm2 save`, `sudo reboot`, `pm2 status`).
- **`main` = `origin/main`** (24/09): todo lo revisado está mergeado.
  - C-106: cobro de envío transparente y logos de ZOOM y MRW.
  - C-108: revisión de Gemini.
  - Gemini R20 (G-62…G-66), R21 (G-67) y R22 (G-68).
  - Sigue ahí también lo del 22/09: C-100 (envíos) y C-101 (métodos de pago).
- **Sin mergear a propósito:** `chatgpt/product-fixes-main` (ChatGPT salió; C-95 lo reemplazó).
- **Gemini:** sin ronda abierta. Su carril quedó limpio. **G-67 se rechazó** (citó 21 textos que no existen): no se usa como fuente.
- **Aviso de proceso:** Gemini a veces trabaja en la carpeta principal. Antes de empezar, `git status` y `git log -3`.
- ChatGPT (limpieza opcional, cuando Andrés quiera):
  ```bash
  git worktree remove ../ElectroShopVe-chatgpt
  git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main
  git stash drop stash@{0}
  ```

## 2. Deploy del 24/09 (incluye el del 22/09 si no se hizo)

**Este merge no cambia el esquema.** Pero si el deploy del 22/09 (envíos y métodos de pago) no se corrió en el servidor, el paso 2 lo aplica. En el servidor (`/var/www/electroshopve`, PM2 `electroshop-web`):

```bash
cd /var/www/electroshopve
git pull

# 1. ¿Falta algo en la base? (solo lee)
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
#    - Sale vacío (o solo comentarios): el 22/09 ya se aplicó → salta al paso 3.
#    - Sale ADD COLUMN, CREATE TABLE "shipment_events" y ADD VALUE 'BINANCE_PAY' → sigue con el paso 2.
#    - Si aparece un DROP: PARA y avisa a Claude.

# 2. Solo si el paso 1 mostró cambios
npx prisma db push          # si pide aceptar pérdida de datos, PARA

# 3. Siempre
npx prisma generate

# 4. Variable del rastreo automático (solo si no existe)
grep -c '^CRON_SECRET' .env   # 0 → agrega CRON_SECRET="<valor de: openssl rand -hex 16>" al .env

npm run build
pm2 restart electroshop-web --update-env
```

**Cron del rastreo de ZOOM** (si no lo pusiste el 22/09; `crontab -e`):
```
0 */2 * * * curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<tu-dominio>/api/cron/envios >/dev/null
```

**Redondeo de saldos (C-96, autorizado por Andrés el 24/09):** pasos en `estado/C-96.md` y en el resumen del 24/09 (conteo → respaldo con `pg_dump -t user_balances` → `UPDATE`).

**En el panel, si no se hizo el 22/09:**
- Configuración → Envíos: embalaje, "Envío gratis desde" y la tarifa del delivery en Guanare (viene apagado).
- Métodos de pago: el de Binance pasa a tipo **Binance Pay**; completa titular y correo.
- Productos: el Cable HDMI y la Mini consola quedaron **Inactivos** al intentar borrarlos. Si se venden, ponlos en Activo.
- Órdenes: cancela las de "Cliente eliminado" con el motivo "Prueba: cliente eliminado".

**Qué comprobar:**
1. La tienda abre y un producto se agrega al carrito. Debajo del total, el carrito explica la entrega.
2. Checkout con un producto físico:
   - La tarjeta "Envío nacional" dice "embalaje $X + flete al retirar".
   - Los botones de empresa muestran los logos de ZOOM y MRW.
   - El resumen dice "Embalaje y empaquetado" y "Flete (ZOOM): Al retirar", y el total, "Total a pagar hoy".
3. ZOOM: estado → ciudad → oficina real. MRW: agencia. "A domicilio" pide dirección.
4. Retiro en tienda (si está activo): el resumen dice "Retiro en tienda: Gratis" (antes decía "Productos digitales").
5. Recargar saldo: el modal muestra los métodos de pago.
6. Órdenes: la nueva dice "Cobro a destino". Márcala enviada con guía y revisa Mis pedidos del cliente.
7. Gift cards del admin: cerrar la hoja sin imprimir abre el diálogo de confirmación (G-64).

**Si algo sale mal:** `git reset --hard 23dbfa9 && npx prisma generate && npm run build && pm2 restart electroshop-web`. Ese es el `main` anterior a este merge (ya incluye el 22/09).

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

### Gemini
Sin ronda abierta desde el 24/09: terminó R20-R22 y su carril quedó limpio. No se le manda nada hasta que Claude escriba una ronda nueva en `PLAN_GEMINI.md`.

### Claude (siguiente sesión)
> Continúa ElectroShopVe (en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` y `docs/plan/PLAN_CLAUDE.md` §4b.
> - **Antes de tocar nada:** `git status`, `git log -3` y `git branch --show-current`. Gemini a veces trabaja en la carpeta principal.
> - **Primero:** pregúntale a Andrés cómo le fue con el deploy del 24/09 (§2). Si algo falla en producción, eso manda.
> - **Después, en este orden:**
>   1. Fila 18: destinatarios de campañas sin límite (seguridad).
>   2. C-105 (IP real, con el nginx del servidor).
>   3. C-104 (reportes reales).
>   4. C-102 (descuentos).
>   5. C-103 (firma de documentos).
>   6. C-51 (productos, con "Duplicar" en el servidor).
>   7. C-107 (seguro a elección del cliente; espera los costos de ZOOM y MRW y el OK de la migración).
> - **No uses `G-67` como fuente:** tiene citas inventadas. Lee esas pantallas de primera mano.
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
