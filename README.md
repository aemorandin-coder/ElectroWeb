# ElectroShopVe · Electro Shop Morandin C.A.

Tienda en línea de tecnología de Electro Shop Morandin C.A. (Guanare, Venezuela): productos físicos con envío por ZOOM y MRW, delivery en Guanare y retiro en tienda; productos digitales (recargas y gift cards); saldo propio, Pago Móvil BDV verificado, cupones y ofertas, cursos, creadores y promotores.

## Stack

| Pieza | Versión | Notas |
|---|---|---|
| Next.js | 16 (App Router) | `proxy.ts` hace de middleware. Next 16 cambia APIs: ver `AGENTS.md` y `node_modules/next/dist/docs/` |
| React | 19 | React Compiler lint (`react-hooks/*`) activo |
| Tailwind CSS | 4 | Tokens en `@theme` de `app/globals.css` (colores, `--z-*`, fuentes). Sin hex en `className` |
| Prisma | 6 + PostgreSQL | `prisma/schema.prisma`. Cambios de esquema con `npx prisma db push` (no hay carpeta de migraciones) |
| NextAuth | 4 | Correo y contraseña (con límite de intentos y captcha) y Google opcional. Sesión JWT |
| Correo | SMTP o Resend | `lib/email-service.ts` |
| Notificaciones | Telegram | Bot del equipo (`lib/telegram`) y avisos del panel (`lib/admin-events`) |

## Puesta en marcha (desarrollo)

```bash
npm install                 # también corre `prisma generate`
cp .env.example .env        # y completa los valores (ver la sección de variables)
npx prisma db push          # crea las tablas en la base vacía
npm run dev                 # http://localhost:3000
```

Crear el primer administrador: `npx tsx scripts/create-master-admin.ts`.

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y servir en producción |
| `npm run lint` | ESLint (0 errores al 26/09/2026) |
| `npx tsc --noEmit` | Tipos |
| `npx prisma studio` | Ver la base |

Guiones de mantenimiento (`scripts/`, se corren con `npx tsx`; los que escriben piden `--apply`):

| Guion | Qué hace |
|---|---|
| `create-master-admin.ts` | Primer super admin |
| `migrate-digital-variants.ts` | Montos digitales viejos (specs) a la tabla `digital_variants` (C-60) |
| `migrar-firmas-saldo.ts` | Firmas de los términos del saldo de antes de C-103 a `document_signatures`, con su PDF |
| `backfill-short-codes.ts` | Códigos cortos de productos para `/p/<código>` |
| `move-business-documents.ts` | Documentos de empresas a `private-uploads/` |

## Estructura

```
app/                  Rutas (tienda, /customer, /admin, /creator) y APIs en app/api
components/           UI compartida (components/ui: ProductCard, Price, OfferNote…)
contexts/             Carrito, ajustes públicos, diálogo de confirmación
lib/                  Lógica del servidor y reglas puras
  pricing.ts          Cálculo único de la orden (servidor = verdad; el checkout solo muestra)
  order-quote.ts      Cotización con precios, stock, ofertas y cupones desde la base
  promotions*.ts      Ofertas y cupones (C-102)
  legal-docs*.ts      Documentos legales, firmas y constancias en PDF (C-103)
  audit-log.ts        Bitácora de seguridad (C-104)
  ip.ts               IP real del cliente detrás de nginx (C-105)
  dto/                Lo único que sale hacia la tienda (lista blanca)
  hooks/              useBodyScrollLock, useMontado, useCargarAlMontar, useCajonAccesible
prisma/schema.prisma  Modelos
private-uploads/      Archivos que no se sirven públicamente (fuera de git; respaldarlo)
docs/plan/            Plan, auditorías y estado de cada tarea
```

## Reglas del proyecto

Las reglas completas están en `CLAUDE.md` y `docs/plan/PLAN.md`. Las que más importan:

- **El dinero lo calcula el servidor:** precios, descuentos, envío, total y dueño de la orden. Nunca se confía en lo que manda el navegador.
- **Nada de objetos Prisma crudos hacia el cliente:** siempre un DTO (`lib/dto/*`). `costPerItem` nunca sale del servidor.
- **Colores, capas y tipografía solo con los tokens.** Móvil y escritorio se separan en `lg`. Sin emojis en la web ni en el código.
- **Toda acción sensible del panel queda en la bitácora** (Reportes → Seguridad).

## Variables de entorno

Ver `.env.example`. Las imprescindibles: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GIFT_CARD_PIN_SECRET` y el correo (SMTP o Resend). El resto activa funciones opcionales: Google, hCaptcha, BDV, ZOOM, SADES, Telegram y analítica.

## Producción

Servidor con nginx y PM2 (proceso `electroshop`) en `/var/www/electroshopve`. Pasos de cada deploy, qué cambia en la base y qué revisar después: `docs/plan/SIGUIENTE.md`.

```bash
bash scripts/deploy.sh
```

El guion hace `git pull`, compila en la carpeta que no se está sirviendo (`.next-a` o `.next-b`) y solo entonces reinicia PM2 con esa carpeta. Si la tienda no responde, vuelve a la anterior.
- **Si el deploy cambia la base, el guion para** y muestra el SQL. Se revisa, se aplica con `npx prisma db push` y se corre de nuevo.
- **No uses `npm run build` a mano con la tienda corriendo:** borra la carpeta que se está sirviendo y PM2 entra en un ciclo de reinicios. Hasta el 26/09/2026 pasó 55.910 veces.

`ecosystem.config.js` está desactualizado (nombre `electroshop-web` y otra carpeta): no lo uses con `pm2 start`, porque levantaría un segundo proceso en el puerto 3000.

nginx debe pasar la IP real (`X-Real-IP` y `X-Forwarded-For`): los límites de intentos y la bitácora dependen de ella.
