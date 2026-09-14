# Plan de Gemini — orden de trabajo por rondas

> Reglas obligatorias: [`/GEMINI.md`](../../GEMINI.md). Tarjetas G-01 a G-08: `GEMINI.md` §5. Tarjetas G-09 a G-14: **este archivo**, §4.
> Lo que hace Claude al mismo tiempo: [`PLAN_CLAUDE.md`](./PLAN_CLAUDE.md).
> Última revisión de Claude: [`revisiones/R1-R3.md`](./revisiones/R1-R3.md) — R1, R2 y R3 **aprobadas**.

## 1. Qué detectó la auditoría en tu carril

Todo esto está en carpetas donde solo trabaja Gemini. Son arreglos repetitivos: no requieren decidir diseño ni tocar seguridad.

| Problema | Cantidad | Tarea |
|----------|----------|-------|
| Links a rutas que no existen (`/customer/wallet`, `/auth/login`, `/auth/signin`) | 7 líneas | G-01 ✅ |
| Componentes que nadie importa | 10 archivos | G-02 ✅ |
| Páginas sin Header/Footer (privacidad, términos, canjear gift card) | 3 páginas | G-03 ✅ |
| `alert()` en lugar de toast | 6 | G-04a ✅ / G-04b ⏸️ |
| Textos ilegibles de 7 a 10px + `font-black` | ~200 | G-05a…f ✅ / G-05g ⏸️ |
| Colores hex escritos a mano | ~1.900 clases | G-06a…g |
| `h-screen`/`min-h-screen` (cortan contenido en celulares) | 33 | G-07 ✅ |
| Botones que solo aparecen con hover (en celular no se ven) | 4 | G-08 ✅ |
| Páginas que vuelven a pedir `/api/settings/public` aunque ya lo tiene el contexto | 5 | G-09 ✅ |
| z-index gigantes (`z-[100001]`, `z-[9998]`) | 9 | **G-10** |
| `document.body.style.overflow` manual en modales (se traba el scroll) | 4 archivos | **G-11** |
| Manchas de blur animadas con `animate-pulse` (lentas en Android barato) | 37 líneas | G-12 ✅ |
| Texto blanco casi transparente (`text-white/40…60`) difícil de leer | 69 | G-13 ✅ |
| Restos de la revisión R1-R3 (2 avisos de lint, 1 clase duplicada) | 3 | **G-15** |
| Componente `FloatingTechIcons` copiado en 6 páginas, con íconos flotando en animación infinita | 6 archivos | **G-16** |
| Inventario final de lo que quede pendiente | — | **G-14** |

## 2. Cómo se trabaja: una rama por ronda

Para que Andrés mergee una vez por ronda y no una vez por tarea:

- **Una ronda = una rama** `gemini/R1`, `gemini/R2`… creada desde `main` **después** de que Andrés mergeó la ronda anterior.
- **Una tarea = un commit** dentro de esa rama, con prefijo `[G-XX]` y su `docs/plan/estado/G-XX.md`.
- Si una tarea queda `BLOQUEADO`, se commitea solo su archivo de estado y se sigue con la siguiente.
- Entre tarea y tarea usa `/clear` para no arrastrar contexto viejo.

```bash
# Inicio de ronda (en ../ElectroShopVe-gemini, en bash):
git status                       # limpio
git switch -c gemini/R1 main
```

## 3. Rondas

Las rondas avanzan **en paralelo** con las de Claude, con el mismo número. Una ronda de Gemini solo empieza si se cumple su "Requisito".

| Ronda | Tareas de Gemini (en este orden) | Requisito para empezar | Mientras tanto Claude hace |
|-------|----------------------------------|------------------------|---------------------------|
| **R1** | G-02 → G-03 → G-07 → G-08 → G-04a → G-12 | G-01 mergeada | C-01 órdenes · C-05 carrito |
| **R2** | G-05a → G-05b → G-05c → G-05d → G-05e → G-13 | R1 mergeada | C-02 DTO · C-03 settings · C-04 · C-06 · C-07 |
| **R3** ✅ | G-09 → G-05f → G-04b* → G-05g* | R2 mergeada. (*) solo si `C-01` y `C-05` están `HECHO` en `main`; si no, sáltalas | C-10 tokens · C-11 fuentes |
| **R3b** | G-15 → G-16 → (G-04b y G-05g si ya se cumplió su dependencia) | R3 y `claude/docs-R3` mergeadas en `main` | C-01/C-05 (en curso) · C-10 · C-11 |
| **R4** | G-06a → G-06b → G-06c → G-06d → G-06e → G-17* | R3 mergeada **y** `C-10` `HECHO` en `main`. (*) G-17 solo si `C-03` está `HECHO` en `main`; si no, sáltala | C-12 componentes base · C-13 queries |
| **R5** | G-06f → G-06g* → G-11 | R4 mergeada **y** `C-12` `HECHO`. (*) requiere `C-01` y `C-05` | C-20 header · C-21 barra móvil |
| **R6** | G-10 → (pendientes de R3/R5 que se hayan saltado) | R5 mergeada **y** `C-21` `HECHO` | C-22 home · C-23 popup |
| **R6b** | G-20 (solo reporte, no edita código) | `docs/plan/scripts/` en `main` (llega con C-22) | C-21 · C-23 · C-24 |
| **R7** | G-14 (solo reporte, no edita código) | R6 mergeada | C-30…C-33 catálogo |

Si Claude va atrasado y no se cumple el requisito de la ronda siguiente, Gemini **no adelanta tareas bloqueadas**: termina las pendientes saltadas o espera.

### Prompt para pegarle a Gemini (inicio de cada ronda)
```
Lee GEMINI.md completo y docs/plan/PLAN_GEMINI.md.
Estás en la Ronda R1. Verifica el requisito de la ronda en la tabla §3.
Crea la rama gemini/R1 desde main. Haz SOLO estas tareas, en orden, un commit por tarea:
G-02, G-03, G-07, G-08, G-04a, G-12.
(Para otra ronda cambia el número de ronda y la lista de tareas según la tabla §3.)
Para cada una: sigue su tarjeta al pie de la letra, corre su Verificación,
compara tsc antes/después y crea docs/plan/estado/G-XX.md dentro del mismo commit.
Si una tarea no cuadra, márcala BLOQUEADO y sigue con la siguiente.
Empieza por G-02 y detente al terminarla para que yo revise.
```
### Prompt para continuar (después de `/clear`)
```
Lee GEMINI.md y docs/plan/PLAN_GEMINI.md. Sigues en la rama gemini/R1.
Revisa git log --oneline main..HEAD para ver qué ya está hecho.
Haz la siguiente tarea de la ronda: G-03. Un commit, con su estado. Detente al terminar.
```
### Prompt de cierre de ronda
```
Muestra: git log --oneline main..HEAD  y  git diff --stat main
Confirma que ningún archivo está fuera de tu carril (GEMINI.md §2). No hagas merge.
```

---

## 4. Tarjetas nuevas (G-09 a G-14)

### G-09 · Settings desde el contexto (5 archivos) · Depende: —
El contexto `SettingsProvider` ya carga los settings una vez para toda la app. Estas páginas los vuelven a pedir. En los 5 archivos:
- Import a agregar: `import { useSettings } from '@/contexts/SettingsContext';`
- Usa **siempre** el alias `publicSettings` (algunas páginas ya tienen variables llamadas `settings` o `isLoading`).

**`app/registro/page.tsx`**
1. Reemplaza el bloque completo `const [companySettings, setCompanySettings] = useState<{ ... } | null>(null);` por:
   ```tsx
   const { settings: publicSettings } = useSettings();
   const companySettings = publicSettings
     ? { companyName: publicSettings.companyName || 'Electro Shop Morandin', logo: publicSettings.logo ?? null, tagline: publicSettings.tagline ?? null }
     : null;
   ```
2. Borra el `useEffect` completo que está debajo del comentario `// Load company settings` (desde `useEffect(() => {` hasta su `}, []);`).

**`app/recuperar-contrasena/page.tsx`**
Igual que registro, pero sin `tagline`:
```tsx
const { settings: publicSettings } = useSettings();
const companySettings = publicSettings
  ? { companyName: publicSettings.companyName || 'Electro Shop Morandin', logo: publicSettings.logo ?? null }
  : null;
```
Borra el `useEffect` que contiene `fetch('/api/settings/public')`.

**`app/login/page.tsx`**
1. Reemplaza el `useState` de `companySettings` por el mismo bloque de registro (con `tagline`), pero la primera línea es:
   ```tsx
   const { settings: publicSettings, isLoading: publicSettingsLoading } = useSettings();
   ```
2. Reemplaza `const [settingsLoaded, setSettingsLoaded] = useState(false);` por `const settingsLoaded = !publicSettingsLoading;`
3. Borra el `useEffect` debajo de `// Load company settings`.

**`app/gift-cards/page.tsx`**
1. Reemplaza `const [companyLogo, setCompanyLogo] = useState<string | null>(null);` por:
   ```tsx
   const { settings: publicSettings } = useSettings();
   const companyLogo = publicSettings?.logo ?? null;
   ```
2. Borra **solo** estas líneas (debajo de `// Fetch company settings for logo`). **No toques** el fetch de `/api/exchange-rates` que está justo arriba:
   ```tsx
   // Fetch company settings for logo
   fetch('/api/settings/public')
       .then(res => res.json())
       .then(data => {
           if (data.logo) setCompanyLogo(data.logo);
       })
       .catch(console.error);
   ```

**`app/customer/(dashboard)/layout.tsx`**
1. Reemplaza `const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);` por `const { settings: companySettings } = useSettings();`
2. Borra el `useEffect` que define `fetchSettings` y llama a `fetch('/api/settings/public')`.
3. No borres la `interface CompanySettings` aunque quede sin uso.

Verificación:
```bash
F="app/registro app/recuperar-contrasena app/login app/gift-cards app/customer"
grep -rn "api/settings/public" $F                                   # Esperado: 0
grep -rnE "setCompanySettings|setCompanyLogo|setSettingsLoaded" $F  # Esperado: 0
```
Además, `tsc` sin errores nuevos. Si `tsc` marca un tipo en el layout de customer → revierte ese archivo y márcalo `BLOQUEADO`.

---

### G-10 · z-index a capas · Depende: **C-10 y C-21 HECHO**
(Antes de C-21 la barra móvil usa `z-[999]`; si bajas los modales antes, quedarían debajo de la barra.)
```bash
bash -c '
sed -i -E "s/z-\[10000[01]\]/z-[var(--z-modal)]/g" \
  "app/customer/(dashboard)/addresses/page.tsx" \
  "app/customer/(dashboard)/warranty/page.tsx" \
  "app/customer/(dashboard)/wishlist/page.tsx" \
  components/modals/BalanceTermsModal.tsx \
  components/modals/ConfirmDialog.tsx \
  components/modals/RechargeModalV2.tsx
sed -i -E "s/z-\[999\]/z-[var(--z-modal)]/g" components/social/ShareEarnModal.tsx
sed -i -E "s/z-\[9998\]/z-[var(--z-popup)]/g" components/onboarding/GuidedTour.tsx
'
```
Verificación:
```bash
grep -rnoE "z-\[[0-9]{3,}\]" app/customer components/modals components/social components/onboarding   # Esperado: 0
grep -n "\-\-z-modal" app/globals.css                                                                  # Debe existir
```
QA: a 360px, abre un diálogo de confirmación en `/customer/addresses` y verifica que tapa la barra inferior.

---

### G-11 · Bloqueo de scroll con el hook · Depende: **C-12 HECHO**
Antes, confirma que existe `lib/hooks/useBodyScrollLock.ts` (lo crea Claude). Si no existe → `BLOQUEADO`.
Import: `import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';`

| Archivo | Borrar | Agregar en su lugar |
|---------|--------|---------------------|
| `app/customer/(dashboard)/orders/page.tsx` | el `useEffect` con `document.body.style.overflow = showOrderDetails ? 'hidden' : 'unset';` (4 líneas) | `useBodyScrollLock(showOrderDetails);` |
| `components/modals/BalanceTermsModal.tsx` | el `useEffect` completo con `if (isOpen) { document.body.style.overflow = 'hidden'; } else {...}` | `useBodyScrollLock(isOpen);` |
| `components/modals/RechargeModalV2.tsx` | el mismo patrón que BalanceTermsModal | `useBodyScrollLock(isOpen);` |
| `components/modals/ConfirmDialog.tsx` | **solo** las 2 líneas `document.body.style.overflow = 'hidden';` y `document.body.style.overflow = 'unset';` y el comentario `// Prevent body scroll`. El `useEffect` se queda (maneja la tecla Escape). | `useBodyScrollLock(isOpen);` justo **antes** de ese `useEffect` |

Verificación:
```bash
grep -rn "body.style.overflow" app/customer components/modals   # Esperado: 0
```

---

### G-12 · Quitar animación a las manchas de blur · Depende: —
Solo se quita `animate-pulse` en líneas que tienen un blur grande (`blur-2xl`, `blur-3xl` o `blur-[Npx]`). No se borra ningún elemento.
```bash
bash -c '
RUTAS="app/customer app/creator app/cursos app/servicios app/contacto app/gift-cards app/login app/registro app/recuperar-contrasena app/solicitar-producto app/privacidad app/terminos"
find $RUTAS -type f -name "*.tsx" -print0 | xargs -0 sed -i -E \
  -e "/blur-(2xl|3xl|\[[0-9]+px\])/ s/ animate-pulse\b//g" \
  -e "/blur-(2xl|3xl|\[[0-9]+px\])/ s/\banimate-pulse //g"
'
```
Verificación:
```bash
bash -c 'RUTAS="app/customer app/creator app/cursos app/servicios app/contacto app/gift-cards app/login app/registro app/recuperar-contrasena app/solicitar-producto app/privacidad app/terminos"; grep -rnE "blur-(2xl|3xl|\[[0-9]+px\]).*animate-pulse|animate-pulse.*blur-(2xl|3xl|\[[0-9]+px\])" $RUTAS'
# Esperado: 0
git diff -U0 | grep -c "^-[^-]"                          # líneas quitadas
git diff -U0 | grep "^-[^-]" | grep -c "animate-pulse"   # deben ser el MISMO número
```

---

### G-13 · Contraste de texto blanco · Depende: —
Sube `text-white/30`, `/40`, `/50` y `/60` a `text-white/80`, **pero deja igual** los placeholders (`placeholder:text-white/40`).
```bash
bash -c '
RUTAS="app/customer components/customer app/creator app/cursos components/cursos app/servicios components/servicios app/contacto components/contact app/gift-cards app/canjear-gift-card app/login app/registro app/recuperar-contrasena app/verificar-email app/solicitar-producto app/privacidad app/terminos components/modals components/reviews components/orders components/social components/pago-movil components/onboarding"
find $RUTAS -type f -name "*.tsx" -print0 | xargs -0 sed -i -E \
  -e "s/placeholder:text-white\/(30|40|50|60)/__PH__\1/g" \
  -e "s/\btext-white\/(30|40|50|60)\b/text-white\/80/g" \
  -e "s/__PH__/placeholder:text-white\//g"
'
```
Verificación:
```bash
bash -c 'RUTAS="app/customer components/customer app/creator app/cursos components/cursos app/servicios components/servicios app/contacto components/contact app/gift-cards app/canjear-gift-card app/login app/registro app/recuperar-contrasena app/verificar-email app/solicitar-producto app/privacidad app/terminos components/modals components/reviews components/orders components/social components/pago-movil components/onboarding"; grep -rnoE "(^|[^:])text-white/(30|40|50|60)\b" $RUTAS; grep -rn "__PH__" $RUTAS'
# Esperado: 0 y 0
```
QA visual: login y gift-cards a 360px. Si algún ícono decorativo quedó demasiado brillante, anótalo en Notas; **no lo cambies**.

---

### G-15 · Retoques de la revisión R1-R3 · Depende: —
Tres cambios exactos, nada más:

| Archivo | Cambio |
|---------|--------|
| `app/customer/(dashboard)/layout.tsx` (~l.26) | Borra el bloque completo `interface CompanySettings { companyName: string; logo: string \| null; }` (4 líneas) y la línea en blanco que queda debajo. Antes, confirma que `grep -n "CompanySettings" "app/customer/(dashboard)/layout.tsx"` **solo** muestra la línea de la interface. |
| `app/recuperar-contrasena/page.tsx` (l.3) | `import { useState, useRef, useEffect } from 'react';` → `import { useState, useRef } from 'react';`. Antes, confirma que `grep -n "useEffect" app/recuperar-contrasena/page.tsx` solo muestra la línea 3. |
| `app/customer/(dashboard)/orders/page.tsx` (~l.528) | `text-[11px] lg:text-[11px]` → `text-[11px]` |

No toques el aviso de `err` sin uso en `recuperar-contrasena` (l.57): es anterior a Gemini.

Verificación:
```bash
npx eslint "app/customer/(dashboard)/layout.tsx" app/recuperar-contrasena/page.tsx 2>&1 | grep -E "CompanySettings|'useEffect'"
# Esperado: vacío
grep -rnE "text-\[11px\] (sm|md|lg):text-\[11px\]|text-xs (sm|md|lg):text-xs" app components
# Esperado: 0
```

---

### G-16 · Quitar los `FloatingTechIcons` duplicados · Depende: —
Seis páginas tienen **copiada** la misma función local `FloatingTechIcons` (íconos flotando con animación infinita, prohibida por `PLAN.md` §1.1). No es un import: está definida dentro de cada archivo.

| Archivo | Definición (según `gemini/R3`) | Usos a borrar |
|---------|-------------------------------|---------------|
| `app/servicios/page.tsx` | l.18–41 | l.115 (+ comentario l.114) |
| `app/solicitar-producto/SolicitarProductoClient.tsx` | l.31–54 | l.244 (+ comentario l.243) |
| `app/gift-cards/page.tsx` | l.109–132 | l.601 y l.1216 (+ comentario l.1215) |
| `app/cursos/page.tsx` | l.183–206 | l.244 (+ comentario l.243) |
| `app/creator/page.tsx` | l.35–58 | l.108 (+ comentario l.107) |
| `app/contacto/page.tsx` | l.11–34 | l.46 (+ comentario l.45) |

En **cada** archivo, en este orden (de abajo hacia arriba, para que no se muevan los números):
1. Borra cada línea `<FloatingTechIcons />` y, si la línea anterior es un comentario `{/* Floating Icons Effect */}` o `{/* Floating Tech Icons */}`, bórralo también.
2. Borra el bloque completo desde `const FloatingTechIcons = () => {` hasta su `};` de cierre, y una línea en blanco sobrante.
3. Corre `npx eslint <archivo>`. Si reporta íconos como `'FiMonitor' is defined but never used` (o `FiCpu`, `FiHardDrive`, `FiSmartphone`, `FiHeadphones`, `FiWifi`, etc.), quítalos **solo a ellos** del import de `react-icons`. Si el import queda vacío, borra la línea entera.
4. **No** borres ningún ícono que eslint no marque como sin uso.

Verificación:
```bash
grep -rn "FloatingTechIcons" app components     # Esperado: 0
npx tsc --noEmit                                 # sin errores nuevos
npx eslint app/servicios/page.tsx app/solicitar-producto/SolicitarProductoClient.tsx app/gift-cards/page.tsx app/cursos/page.tsx app/creator/page.tsx app/contacto/page.tsx 2>&1 | grep -c "is defined but never used"
# Anota el número. No debe ser mayor que antes de empezar (córrelo también al inicio).
```

---

### G-17 · Settings públicos en 5 páginas (sin `CompanySettings` completo) · Depende: **C-03 HECHO en `main`**
Estas páginas leen **toda** la fila `CompanySettings` y se la pasan a `<PublicHeader>`, así que el HTML incluye `adminAlertEmails`, `maintenanceAllowedIPs` y límites internos. Desde C-03, `PublicHeader` ignora esa prop (lee `useSettings()`), pero **pasarla igual la mete en el HTML**. Antes de empezar, comprueba: `grep -n "export const getPublicSettings" lib/site-settings.ts` → debe aparecer. Si no → `BLOQUEADO`.

En los 5 archivos: `<PublicHeader settings={settings ? JSON.parse(JSON.stringify(settings)) : null} />` → `<PublicHeader />`. Además:

| Archivo | Cambio |
|---------|--------|
| `app/solicitar-producto/page.tsx` | Borra `const settings = await prisma.companySettings.findFirst();`. Si `prisma` queda sin uso, borra su import. |
| `app/cursos/page.tsx` (página, **no** `generateMetadata`) | `const [settings, courses] = await Promise.all([prisma.companySettings.findFirst(), prisma.course.findMany({…})])` → `const [courses] = await Promise.all([prisma.course.findMany({…})])` (borra solo el primer elemento y `settings,`). |
| `app/cursos/[slug]/page.tsx` (página, **no** `generateMetadata`) | `const [session, settings, course] = await Promise.all([getServerSession(authOptions), prisma.companySettings.findFirst(), prisma.course.findUnique({…})])` → borra `settings, ` y la línea `prisma.companySettings.findFirst(),`. |
| `app/servicios/page.tsx` (usa `settings?.whatsapp`) | En la página, `prisma.companySettings.findFirst(),` → `getPublicSettings(),` y agrega `import { getPublicSettings } from '@/lib/site-settings';`. **No** toques el `findFirst({ select… })` de `generateMetadata`. |
| `app/contacto/page.tsx` (usa whatsapp, email, phone, address, city, state, businessHours) | `const settings = await prisma.companySettings.findFirst();` → `const settings = await getPublicSettings();` + import. **Y** `<BusinessHours businessHours={settings?.businessHours} />` → `<BusinessHours businessHours={settings.businessHours ? JSON.stringify(settings.businessHours) : null} />` (el componente espera texto JSON). Si `prisma` queda sin uso, borra su import. |

Verificación:
```bash
grep -rn "PublicHeader settings=" app components          # Esperado: 0
grep -rn "companySettings.findFirst()" app/contacto app/cursos app/servicios app/solicitar-producto   # Esperado: 0 (los de generateMetadata usan select y no cuentan)
npx tsc --noEmit                                           # sin errores nuevos
```
En tu estado: abre `/contacto` y `/servicios` en el navegador y confirma que se ven el WhatsApp, el correo y el horario.

---

### G-14 · Inventario final (solo lectura) · Depende: R6 mergeada
No edites código. Crea `docs/plan/estado/G-14.md` con la salida de estos comandos para todo tu carril:
```bash
bash -c '
RUTAS="app/customer components/customer app/creator app/cursos components/cursos app/servicios components/servicios app/contacto components/contact app/gift-cards app/canjear-gift-card app/login app/registro app/recuperar-contrasena app/verificar-email app/solicitar-producto app/privacidad app/terminos components/modals components/reviews components/orders components/social components/pago-movil components/onboarding"
echo "hex en className:";  grep -rhoiE "\-\[#[0-9a-f]{6}\]" $RUTAS | sort | uniq -c | sort -rn
echo "hex en style/JS:";   grep -rnoiE "[\x27\"]#[0-9a-f]{6}[\x27\"]" $RUTAS | wc -l
echo "style jsx:";         grep -rl "<style jsx" $RUTAS
echo "img sin next/image:";grep -rn "<img" $RUTAS | wc -l
echo "any:";               grep -rnoE ": any\b|as any\b" $RUTAS | wc -l
echo "toFixed:";           grep -rn "toFixed(" $RUTAS | wc -l
echo "innerWidth:";        grep -rn "innerWidth" $RUTAS
'
```
Claude usará ese reporte para preparar las siguientes tarjetas.

---

### G-18 · "Solicitar producto" solo con cuenta (aviso en el formulario) · Depende: **C-08 HECHO en `main`**
Desde C-08, `POST /api/product-requests` exige sesión y responde `401 { error: 'Inicia sesión para solicitar un producto.' }`. El formulario ya muestra ese error, pero el invitado se entera recién al enviar. Antes de empezar: `git show main:docs/plan/estado/C-08.md` debe decir `Estado: HECHO`; si no → `BLOQUEADO`.

Archivo: `app/solicitar-producto/SolicitarProductoClient.tsx` (ya tiene `const { data: session } = useSession();`).
1. Si `!session`, muestra **encima del formulario** un aviso con este texto y enlace (usa solo tokens de color de GEMINI.md §4):
   `Para solicitar un producto necesitas una cuenta.` + enlace `Iniciar sesión` → `/login?callbackUrl=%2Fsolicitar-producto` + enlace `Crear cuenta` → `/registro`.
2. Si `!session`, el botón de envío queda `disabled` (agrega `|| !session` a su condición `disabled` actual). No borres el captcha ni la validación existente.
3. Si hay sesión y `customerName`/`customerEmail` están vacíos, precárgalos una sola vez con `session.user.name` y `session.user.email` (un `useEffect` que dependa de `session`).
4. No cambies otros textos ni estilos.

Verificación:
```bash
grep -n "callbackUrl=%2Fsolicitar-producto" app/solicitar-producto/SolicitarProductoClient.tsx   # 1 resultado
grep -n "!session" app/solicitar-producto/SolicitarProductoClient.tsx                             # al menos 2
npx tsc --noEmit                                                                                  # sin errores nuevos
```

---

### G-19 · Header real en los esqueletos de carga · Depende: **C-20 HECHO en `main`**
Desde C-20 el header mide 96px (desktop) y 104px (móvil). Los `loading.tsx` de estas páginas dibujan un header falso de 80px (`h-20`): al terminar de cargar, la página "salta". Antes de empezar: `git show main:docs/plan/estado/C-20.md` debe decir `Estado: HECHO`; si no → `BLOQUEADO`.

Archivos: `app/cursos/loading.tsx`, `app/servicios/loading.tsx`, `app/contacto/loading.tsx`, `app/gift-cards/loading.tsx`.
En cada uno:
1. Borra el bloque completo desde `<header className="sticky top-0 z-50 bg-white border-b border-line shadow-sm h-20">` hasta su `</header>`, y el comentario `{/* Header Skeleton */}` de la línea anterior si existe.
2. En su lugar escribe `<PublicHeader />` con la misma indentación.
3. Agrega arriba del archivo: `import PublicHeader from '@/components/public/PublicHeader';`
4. No toques el resto del esqueleto.

Verificación:
```bash
grep -n "h-20" app/cursos/loading.tsx app/servicios/loading.tsx app/contacto/loading.tsx app/gift-cards/loading.tsx   # sin <header ... h-20>
grep -c "<PublicHeader />" app/cursos/loading.tsx app/servicios/loading.tsx app/contacto/loading.tsx app/gift-cards/loading.tsx   # 1 en cada uno
npx tsc --noEmit
```

---

### G-20 · Recorrido de los paneles admin y cliente (solo lectura) · Depende: **scripts en `main`**
**No edites código.** El resultado es un reporte que Claude convierte en tarjetas.

**Antes de empezar:** `git show main:docs/plan/scripts/inventario-paneles.sh` tiene que existir. Si no existe → `BLOQUEADO`.

**Parte A: inventario automático.** Pega la salida completa en tu estado:
```bash
bash docs/plan/scripts/inventario-paneles.sh > /tmp/g20.md 2>&1; cat /tmp/g20.md
```

**Parte B: lectura página por página.** Abre cada archivo `page.tsx` de `app/admin/(dashboard)/**` y de `app/customer/(dashboard)/**`, más los componentes que importen de `components/admin` o `components/customer`. Responde **solo estas 6 preguntas** y anota la línea exacta de cada hallazgo:
1. **Textos en inglés** visibles para el usuario (títulos, botones, mensajes de error, placeholders).
2. **Acciones que no hacen nada:** botones con `onClick` vacío o solo `console`, `href="#"` o avisos de "próximamente".
3. **Errores silenciosos:** `catch` vacío o que solo hace `console.error`, sin `toast` ni mensaje en pantalla.
4. **Datos inventados** que se muestran como reales: números fijos, listas fijas, porcentajes o gráficos con datos de ejemplo.
5. **Formularios sin validación visible:** campos obligatorios sin `required` ni mensaje, o se puede enviar vacío.
6. **Estados que faltan:** listas sin mensaje de "vacío" o cargas sin indicador.

Formato de `docs/plan/estado/G-20.md`:
```md
# G-20 — Recorrido de paneles
Estado: HECHO
## A. Inventario automático
(salida del script)
## B. Hallazgos por página
### admin/(dashboard)/products/page.tsx
| # | Pregunta | Línea | Qué se ve / qué pasa |
|---|---|---|---|
| 1 | Texto en inglés | 212 | Botón "Save changes" |
```

**Reglas:**
- No propongas soluciones ni rediseños: solo hallazgos verificables con su línea.
- Si una página no tiene hallazgos, escribe "Sin hallazgos".
- Commit: `[G-20] Recorrido de paneles (solo reporte)`. Solo agrega `docs/plan/estado/G-20.md`.

Verificación:
```bash
git diff --stat main    # solo docs/plan/estado/G-20.md
```
