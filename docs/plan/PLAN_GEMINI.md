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

### G-10 · z-index a capas · Depende: **C-10 y C-21 HECHO en `main`**
Desde C-21 la barra inferior de la tienda usa `z-[var(--z-bottomnav)]` (60) y los toasts `--z-toast` (90). Antes de empezar: `git show main:docs/plan/estado/C-21.md` debe decir `Estado: HECHO`; si no → `BLOQUEADO`.
**Importante:** la barra del panel de cliente (`CustomerMobileNavBar`) tiene `zIndex: 99999` en línea. Hay que bajarla **en la misma tarea**: si solo bajas los modales, quedan debajo de esa barra.
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
sed -i "s/zIndex: 99999,/zIndex: '"'"'var(--z-bottomnav)'"'"',/" components/customer/CustomerMobileNavBar.tsx
sed -i -E "s/style=\{\{ zIndex: (99999|999999|1000000|100001) \}\}/style={{ zIndex: '"'"'var(--z-modal)'"'"' }}/" \
  "app/customer/(dashboard)/profile/page.tsx" \
  "app/customer/(dashboard)/orders/page.tsx" \
  components/modals/RechargeModalV2.tsx
'
```
(Claude probó estos comandos sobre una copia de `main` el 2026-09-14.)

Verificación:
```bash
grep -rnoE "z-\[[0-9]{3,}\]|zIndex: ?[0-9]{3,}" app/customer components/customer components/modals components/social components/onboarding
# Esperado: solo 3 líneas de components/onboarding/GuidedTour.tsx (9998, 9999, 10000). Son internas
# de su propia capa y NO se tocan.
grep -rn "var(--z-" app/customer components/customer components/modals components/social components/onboarding | wc -l   # 13
npx tsc --noEmit
```
QA: a 360px, en `/customer/addresses` abre "Agregar dirección" y verifica que el modal tapa la barra inferior del panel.

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

---

### G-21 · "Mis direcciones": mostrar los errores del servidor · Depende: **C-24 HECHO en `main`**
Desde C-24, `/api/customer/addresses` responde `{ error: '...' }` con mensajes en español (400, 404, 500). La página los ignora: si el guardado falla, no pasa nada en pantalla. Antes de empezar: `git show main:docs/plan/estado/C-24.md` debe decir `Estado: HECHO`; si no → `BLOQUEADO`.

Archivo: `app/customer/(dashboard)/addresses/page.tsx`.
1. Agrega `import { toast } from 'react-hot-toast';`.
2. En `handleSubmit`:
   - Si `response.ok` → `toast.success(editingAddress ? 'Dirección actualizada' : 'Dirección guardada')` antes de cerrar el modal.
   - Si no → `const data = await response.json().catch(() => ({})); toast.error(data.error || 'No se pudo guardar la dirección');`. El modal queda abierto.
   - En el `catch` agrega `toast.error('No se pudo guardar la dirección');` (deja el `console.error`).
3. En `handleDelete`: si `response.ok` → `toast.success('Dirección eliminada')`; si no → mismo patrón con `'No se pudo eliminar la dirección'`.
4. En `fetchAddresses`: si `!response.ok` → `toast.error('No se pudieron cargar tus direcciones')`.
5. No cambies URLs, métodos, cuerpos de las peticiones ni estilos.

Verificación:
```bash
grep -c "toast\." "app/customer/(dashboard)/addresses/page.tsx"     # al menos 6
grep -n "/api/customer/addresses" "app/customer/(dashboard)/addresses/page.tsx"   # las mismas 4 líneas que antes
npx tsc --noEmit
```

---

## Ronda R7 (pesada) · G-23 → G-24 → G-25 → G-26
Rama: `gemini/R7`, creada **desde `claude/docs-R7`** (trae estas tarjetas). Un commit por tarea con su `docs/plan/estado/G-XX.md`.
**Nunca** toques `app/admin/(dashboard)/settings/**` ni `app/admin/(dashboard)/products/**`, ni archivos del carril Claude. Si algo no encaja → `BLOQUEADO` con `PEDIDO:` y sigues con la siguiente.

### G-23 · Errores silenciosos → aviso visible · Depende: G-20 en `main` ✅
Fuente: la sección B de `docs/plan/estado/G-20.md`, filas "Error silencioso", **solo en tu carril** (panel cliente, admin fuera de settings/products, `components/customer`). Las líneas pueden haberse movido: ubica cada `catch` por el nombre de la función que menciona el reporte.

**Reglas (sin excepciones):**
1. **Catch de una acción del usuario** (guardar, crear, actualizar, eliminar, aprobar, alternar, subir, descargar, exportar): agrega `toast.error('No se pudo <verbo en infinitivo> <cosa>');` justo después del `console.error` existente. Ejemplo: `toast.error('No se pudo eliminar el mensaje');`
2. **Catch de una carga inicial** (`fetchX`, `loadX`, cargar datos al abrir la página): agrega `toast.error('No se pudieron cargar <cosa en plural>');`
3. **Catch vacío al parsear** JSON, parámetros o imágenes, y `SocialMediaGenerator.tsx:173` (fallback de imagen): **no los toques**; son internos.
4. **`CustomerMobileNavBar.tsx` (cierre de sesión):** `toast.error('No se pudo cerrar la sesión');`
5. **Import:** si el archivo no importa toast, agrega `import { toast } from 'react-hot-toast';` (si ya importa `toast` de otra forma, usa esa).
6. **Qué no cambiar:** `console.error`, URLs, cuerpos de las peticiones y el flujo (ningún `return` ni `throw` nuevo).
7. **Si un `catch` ya muestra** `toast` o un mensaje en pantalla, déjalo como está.

**En tu estado:** una tabla archivo | función | mensaje agregado.

Verificación:
```bash
git diff --stat main                                   # solo archivos de tu carril
git diff main | grep -c "^+.*toast.error("             # ≈ cantidad de filas de la tabla
git diff main | grep -E "^-" | grep -v "^---" | grep -vE "import" | wc -l   # 0: no se borra nada (salvo reordenar un import)
npx tsc --noEmit
```

### G-24 · `confirm()` nativo → diálogo de la tienda · Depende: —
Reemplaza el `confirm()` del navegador por `useConfirm()` (`contexts/ConfirmDialogContext.tsx`, que ya se usa en `admin/(dashboard)/reviews/page.tsx`). Estos 10 usos exactos:

| Archivo | Línea aprox. | Título | Botón |
|---|---|---|---|
| `app/customer/(dashboard)/addresses/page.tsx` | 129 | Eliminar dirección | Eliminar |
| `app/creator/dashboard/cursos/page.tsx` | 35 | Eliminar curso | Eliminar |
| `app/admin/(dashboard)/cursos/page.tsx` | 200 | Eliminar curso | Eliminar |
| `app/admin/(dashboard)/messages/page.tsx` | 67 | Eliminar mensaje | Eliminar |
| `app/admin/(dashboard)/marketing/page.tsx` | 185 | Eliminar influencer | Eliminar |
| `app/admin/(dashboard)/inquiries/page.tsx` | 129 | Eliminar mensaje | Eliminar |
| `app/admin/(dashboard)/inquiries/page.tsx` | 226 | Eliminar solicitud | Eliminar |
| `app/admin/(dashboard)/legal/page.tsx` | 454 | Solicitar nueva aceptación | Solicitar |
| `app/admin/(dashboard)/product-requests/page.tsx` | 78 | Eliminar solicitud | Eliminar |
| `app/admin/(dashboard)/servicios/page.tsx` | 150 | Eliminar trabajo | Eliminar |

**Patrón:**
```tsx
import { useConfirm } from '@/contexts/ConfirmDialogContext';
// dentro del componente, junto a los otros hooks:
const { confirm } = useConfirm();
// en lugar de: if (!confirm('texto')) return;
const confirmed = await confirm({ title: 'Eliminar dirección', message: 'texto original sin cambios', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
if (!confirmed) return;
```
- **Mensaje:** usa el **texto original** del `confirm()` tal cual; con plantillas `${...}`, conserva la plantilla.
- **Función:** la que lo contiene debe ser `async`. Si es un `onClick` en línea (legal:454), conviértelo en `async () => { ... }`. Solicitar aceptación usa `type: 'warning'`.
- **Conflicto de nombres:** si el componente ya tiene una variable `confirm` (profile, payments, reviews, RechargeModalV2 ya usan `useConfirm`), **no toques ese archivo**.

Verificación:
```bash
grep -rnE "(^|[^.a-zA-Z])(window\.)?confirm\('|confirm\(\`" app/customer app/creator app/admin components/admin | grep -v "settings/\|products/"   # 0
npx tsc --noEmit
```
QA: en `/customer/addresses`, eliminar una dirección muestra el diálogo de la tienda; Cancelar no borra.

### G-25 · Quitar `<style jsx>` y animaciones infinitas · Depende: —
Borra el bloque completo `<style jsx>{`...`}</style>` (o `<style jsx global>`) en cada archivo y ajusta los usos así:

| Archivo | Qué hacer con las animaciones |
|---|---|
| `components/modals/ConfirmDialog.tsx` | Nada más: `animate-fadeIn` y `animate-scaleIn` ya existen en `globals.css` |
| `components/modals/BalanceTermsModal.tsx` | Nada más: `animate-scaleIn` ya existe |
| `app/customer/(dashboard)/wishlist/page.tsx` | Nada más: `animate-slideInUp` ya existe |
| `app/admin/(dashboard)/reports/page.tsx` | Nada más: `animate-fadeIn` y `animate-slideInRight` ya existen |
| `app/customer/(dashboard)/layout.tsx` | Nada más (`verifiedPulse` y `verifiedCheck` no se usan) |
| `app/customer/(dashboard)/profile/page.tsx` | En el `style` con `animation: 'modalScaleIn 0.3s ease-out'`, quita esa propiedad y agrega la clase `animate-scaleIn` a ese elemento |
| `app/gift-cards/page.tsx` | Quita la propiedad `animation: 'shimmer 3s ease-in-out infinite'` (línea ~117) y cualquier otro `animation: '... infinite'` en `style` |
| `app/customer/(dashboard)/orders/page.tsx` | Quita las clases `animate-spin-slow` y `animate-bounce-subtle` de todos los `className` |
| `components/orders/OrderTracking.tsx` | Quita las clases `animate-epicShimmer`, `animate-epicPulse`, `animate-epicRing`, `animate-iconBounce`, `animate-checkDraw` y `animate-truck`. Si un elemento **solo existe para la animación** (un `<span className="absolute inset-0 ... animate-epicRing">` o un `<div className="absolute inset-0 animate-epicShimmer">` sin contenido), elimina ese elemento completo |

- **Clases de Tailwind:** no agregues keyframes nuevos ni toques `globals.css`. Deja `animate-spin` y `animate-pulse` de Tailwind en los indicadores de carga.

Verificación:
```bash
grep -rln "<style jsx" app/customer app/gift-cards components/modals components/orders app/admin/\(dashboard\)/reports   # 0
grep -rnE "animate-(epic|iconBounce|checkDraw|truck|spin-slow|bounce-subtle)|modalScaleIn|infinite'" app/customer app/gift-cards components/orders   # 0
npx tsc --noEmit
```
QA: en `/customer/orders` abre un pedido y confirma que el seguimiento se ve sin elementos rotos.

### G-26 · Montos con `formatUSD` / `formatVES` · Depende: —
`lib/currency.ts` exporta `formatUSD(n)` → `"$1.099,00"` y `formatVES(n)` → `"Bs. 40.113,50"`. Hoy hay unos 70 `toFixed(` en tu carril.

**Reglas (sin excepciones):**
1. **Qué reemplazar:** solo los `toFixed(2)` que se **muestran** como dinero en JSX o en textos de toast.
   - `` `$${x.toFixed(2)}` `` o `${x.toFixed(2)}` pegado a `$` o `USD` → `formatUSD(x)`.
   - `Bs. ${x.toFixed(2)}` o junto a `Bs`, `VES` o `bolívares` → `formatVES(x)`.
   - Borra el `$`, el `USD` o el `Bs.` que quedaría duplicado.
2. **No toques** `toFixed` en:
   - Valores enviados a APIs (`body`, `JSON.stringify`, `fetch`).
   - `value` de inputs y cálculos intermedios.
   - Porcentajes (`%`), cantidades que no son dinero y `toFixed(0)` / `toFixed(1)`.
   - Textos que se copian al portapapeles para pago móvil (`navigator.clipboard`).
3. **Import:** `import { formatUSD, formatVES } from '@/lib/currency';` (solo lo que uses).
4. **Duda:** si no sabes si un monto es USD o Bs, **no lo cambies** y anótalo en el estado.

**En tu estado:** tabla archivo | línea | antes | después, y lista de los que dejaste por duda.

Verificación:
```bash
git diff main | grep -E "^\+" | grep -cE "formatUSD\(|formatVES\("   # igual a las filas de la tabla
git diff main | grep -E "^\+" | grep -E "body|JSON.stringify|clipboard" | grep -E "formatUSD|formatVES"   # 0
npx tsc --noEmit
```
QA: `/customer/balance` y `/customer/orders` muestran montos como "$28,00" y "Bs. 22.050,55".

---

## Ronda R8 · G-29 → G-30
Rama: `gemini/R8`, creada **desde `main` con C-60 mergeado** (debe existir `app/admin/(dashboard)/products/_components/wizard/ui.ts`). Un commit por tarea con su `docs/plan/estado/G-XX.md`.

### G-29 · Pasos del producto físico con la paleta de la tienda · Depende: C-60 en `main`
**Excepción explícita** a "fuera de límites": en `app/admin/(dashboard)/products/**` solo puedes tocar **estos 6 archivos**, y **solo `className`**:
- `_components/wizard/physical/Step1BasicInfo.tsx`
- `_components/wizard/physical/Step2Prices.tsx`
- `_components/wizard/physical/Step3Specs.tsx`
- `_components/wizard/StepSEO.tsx`
- `_components/wizard/ImagePanel.tsx`
- `_components/wizard/SadesSearchModal.tsx`

Modelo a imitar: los pasos digitales ya rediseñados (`wizard/digital/Step1Platform.tsx`, `Step3Delivery.tsx`).

**Reglas (sin excepciones):**
1. **Inputs, selects y textareas:** reemplaza todo su `className` por `{wizardInput(Boolean(errors.<campo>))}` si ya tenían estilo de error, o `{wizardInput()}` si no. Textarea: `` {`${wizardInput()} h-auto resize-none py-2.5`} ``. Si el input tenía clases de posición o tamaño propias (`pl-8`, `pr-10`, `font-mono`, `w-24`), agrégalas al final igual que el textarea.
2. **Etiquetas `<label>`** con estilo de etiqueta → `className={wizardLabel}`. **Ayudas** bajo un campo → `wizardHint`. **Mensajes de error** → `wizardError`. **Título del paso** (`<h2>`) → `wizardSectionTitle` y su párrafo → `wizardSectionHelp`.
3. **Botones:** principal → `wizardPrimaryButton`; secundario (borde) → `wizardSecondaryButton`. Conserva `disabled`, `onClick` y el contenido.
4. **Import:** `import { wizardInput, wizardLabel, ... } from '../ui';` (desde `physical/`) o `'./ui'` (desde `wizard/`), solo lo que uses.
5. **El resto de clases de color** con esta tabla:

| Antes | Después |
|---|---|
| `text-gray-900`, `text-gray-800` | `text-ink` |
| `text-gray-700`, `text-gray-600` | `text-ink-soft` |
| `text-gray-500`, `text-gray-400`, `text-gray-300` | `text-muted` |
| `border-gray-300`, `border-gray-200`, `border-gray-100` | `border-line` |
| `bg-gray-50`, `bg-gray-100`, `hover:bg-gray-50` | `bg-surface`, `hover:bg-surface` |
| `bg-blue-600`, `bg-black` · `hover:bg-blue-700`, `hover:bg-black` | `bg-brand-500` · `hover:bg-brand-600` |
| `text-blue-500`, `text-blue-600` · `text-blue-700` · `hover:text-blue-600` | `text-brand-600` · `text-brand-700` · `hover:text-brand-600` |
| `bg-blue-50`, `hover:bg-blue-50`, `hover:bg-blue-50/50` | `bg-brand-50`, `hover:bg-brand-50` |
| `border-blue-600`, `hover:border-blue-500`, `focus:border-blue-500` | `border-brand-500`, `hover:border-brand-500`, `focus:border-brand-500` |
| `focus:ring-blue-500/20` | `focus:ring-brand-500/20` |
| `text-red-500`, `text-red-600`, `text-red-700`, `hover:text-red-600` | `text-deal`, `hover:text-deal` |
| `border-red-300` · `border-red-200` | `border-deal` · `border-deal/30` |
| `bg-red-50`, `bg-red-50/30` | `bg-deal-bg` |
| `text-green-600`, `text-green-700` · `bg-green-50` · `border-green-500` | `text-success-strong` · `bg-success-strong/10` · `border-success-strong` |
| `text-amber-600`, `text-amber-700` · `bg-amber-50` · `border-amber-500` | `text-warning-strong` · `bg-warning/10` · `border-warning-strong` |
| `text-yellow-400` | `text-warning` |
| `rounded-xl` en inputs | (lo pone `wizardInput`) |
| `z-50` o `z-[...]` en el modal de SADES | `z-[var(--z-modal)]` |
| `font-black` | `font-bold` |

6. **No toques** `text-[#1a0dab]` ni `text-[#4d5156]` de `StepSEO.tsx`: imitan el resultado de Google a propósito.
7. **Prohibido:** cambiar textos, props, estados, `fetch`, validaciones, cálculos (márgenes, precios), el orden de los campos o agregar/quitar elementos. Si una clase no está en la tabla, déjala y anótala en el estado.

**En tu estado:** por archivo, cuántas clases cambiaste y la lista de clases que dejaste por no estar en la tabla.

Verificación:
```bash
git diff --stat main    # solo los 6 archivos + docs/plan/estado/G-29.md
W="app/admin/(dashboard)/products/_components/wizard"
grep -nE "(gray|blue|red|green|amber|yellow)-[0-9]|bg-black|font-black|z-50" $W/physical/*.tsx $W/StepSEO.tsx $W/ImagePanel.tsx $W/SadesSearchModal.tsx   # 0
grep -n "\[#" $W/physical/*.tsx $W/StepSEO.tsx $W/ImagePanel.tsx $W/SadesSearchModal.tsx   # solo las 2 de StepSEO
git diff main -- "$W" | grep -E "^[-+]" | grep -vE "className|^\+\+\+|^---|import .* from '\.\.?/ui'" | wc -l   # 0: solo cambian className e imports
npx tsc --noEmit
```
QA: `/admin/products/new` → Producto físico. Recorre los 5 pasos: los campos se ven como los del producto digital (borde gris claro, foco azul de la marca), sin textos cortados a 390 px.

### G-30 · Emojis → íconos · Depende: R7 en `main` ✅
Regla del proyecto (reafirmada por Andrés): **no hay emojis en la web**. Estos 46 usos de tu carril se cambian por íconos de `react-icons/fi` (o `react-icons/fa` donde se indica). Las líneas son aproximadas (R7 movió algunas): ubícalas por el texto.

**Patrón del ícono en línea con texto:** `<FiCheck className="inline h-4 w-4 shrink-0" aria-hidden="true" />` y el texto sin el emoji. Si el padre no es `flex`, agrega `inline-flex items-center gap-1` al `className` del padre.
**Patrón del ícono grande de estado vacío** (`text-5xl` / `text-6xl`): reemplaza el `<div>` entero por `<FiBookOpen className="mx-auto mb-3 h-12 w-12 text-muted" aria-hidden="true" />` (o el ícono de la tabla), conservando el `mb-*` que tenía.
**Import:** agrega al import de `react-icons/fi` que ya exista (o crea `import { ... } from 'react-icons/fi';`). No reordenes los demás.

| Archivo | Texto actual | Cambio |
|---|---|---|
| `app/customer/(dashboard)/balance/page.tsx` | comentarios `🚀 MOBILE VIEW…` y `💻 DESKTOP VIEW…` | borra solo el emoji y el espacio que sigue |
| `app/customer/(dashboard)/orders/page.tsx` | los mismos 2 comentarios | igual |
| `app/customer/(dashboard)/mis-cursos/page.tsx` | `<div className="text-5xl mb-4">📚</div>` | `FiBookOpen` grande |
| `app/customer/(dashboard)/mis-cursos/page.tsx` | `🏆 Certificado disponible` | `FiAward` en línea |
| `app/customer/(dashboard)/referrals/page.tsx` | `icon: '🥉'`, `'🥈'`, `'🥇'` (niveles) | `icon: <FaMedal className="h-5 w-5 text-warning-strong" aria-hidden="true" />` (bronce), `text-muted` (plata), `text-warning` (oro), de `react-icons/fa`. Si el tipo del campo es `string`, cámbialo a `React.ReactNode` en esa misma interfaz |
| `app/customer/(dashboard)/referrals/page.tsx` | `['🥇', '🥈', '🥉'][entry.rank - 1]` | `<FaMedal className={`h-5 w-5 ${['text-warning', 'text-muted', 'text-warning-strong'][entry.rank - 1]}`} aria-hidden="true" />` |
| `app/creator/dashboard/cursos/[id]/page.tsx` | `flash('✓ Información guardada')`, `flash('✓ Currículum guardado')` | quita `✓ ` del texto |
| `app/creator/dashboard/cursos/[id]/page.tsx` | botón con `✕` | `<FiX className="h-4 w-4" aria-hidden="true" />` y agrega `aria-label="Quitar"` al botón si no tiene |
| `app/creator/dashboard/perfil/page.tsx` | `setMsg('✓ Perfil actualizado')` | quita `✓ ` |
| `app/cursos/page.tsx` | `<span …>⭐</span>` | `<FiStar className="h-3 w-3 fill-current" aria-hidden="true" />` dentro del mismo span, con `aria-label="Destacado"` en el span |
| `app/cursos/page.tsx` | `⭐ Cursos Destacados` | `FiStar` en línea (`fill-current text-warning`) |
| `components/cursos/CoursePlayer.tsx` | `👁 Vista previa de creador…` | `FiEye` en línea |
| `components/cursos/CoursePlayer.tsx` | `🏆 Certificado` | `FiAward` en línea |
| `components/cursos/CoursePlayer.tsx` | `<div className="text-6xl mb-4">🏆</div>` | `FiAward` grande (`h-16 w-16 text-warning`) |
| `components/cursos/CourseDetailClient.tsx` | `✓ Verificado` | `FiCheck` en línea |
| `app/gift-cards/page.tsx` | `⭐ Popular` | `FiStar` en línea (`fill-current`) |
| `app/gift-cards/page.tsx` | `¡Hola {recipientName}! 🎉` | quita ` 🎉` |
| `components/modals/RechargeModalV2.tsx` | `icon: '🎉'` (toast) | `icon: <FiCheckCircle className="h-5 w-5 text-success-strong" />` |
| `components/reviews/ReviewForm.tsx` | `icon: '🔒'` (toast) | `icon: <FiLock className="h-5 w-5 text-brand-600" />` |
| `components/reviews/ReviewStats.tsx` | `{star} ★` | `{star} <FaStar className="inline h-3 w-3 text-warning" aria-hidden="true" />` (`react-icons/fa`) |
| `components/orders/OrderTracking.tsx` | `📍 {shippingNotes}` | `FiMapPin` en línea |
| `components/orders/OrderTracking.tsx` | `📅 Entrega estimada:` | `FiCalendar` en línea |
| `components/social/ShareEarnModal.tsx` | 4 textos para compartir que empiezan con `🔥 ` o `🎓 ` | quita el emoji y el espacio (el resto del texto igual) |
| `app/admin/(dashboard)/cursos/page.tsx` | `<div className="text-5xl mb-3">📚</div>` | `FiBookOpen` grande |
| `app/admin/(dashboard)/cursos/page.tsx` | `⭐ Destacado` | `FiStar` en línea (`fill-current`) |
| `app/admin/(dashboard)/cursos/page.tsx` | `★ {Number(course.rating).toFixed(1)}` | `FaStar` en línea (`text-warning`) + el número |
| `app/admin/(dashboard)/marketing/page.tsx` | `'✓ Activo'` / `'✗ Inactivo'` (2 filas) | `'Activo'` / `'Inactivo'` |
| `app/admin/(dashboard)/orders/page.tsx` | `✓ Marcar Entregado` | `FiCheck` en línea |
| `app/admin/(dashboard)/orders/[id]/digital/page.tsx` | `'✓ Pagado'` / `'⏳ Pendiente de pago'` | `{isPaid ? <><FiCheck … />Pagado</> : <><FiClock … />Pendiente de pago</>}` |
| `app/admin/(dashboard)/orders/[id]/digital/page.tsx` | `✓ Entregado` | `FiCheck` en línea |
| `app/admin/(dashboard)/payments/page.tsx` | `` toast.success(`✨ ${data.count} …`) `` | quita `✨ ` |
| `app/admin/(dashboard)/payments/page.tsx` | `{ icon: 'ℹ️' }` | `{ icon: <FiInfo className="h-5 w-5 text-brand-600" /> }` |
| `app/admin/(dashboard)/reports/page.tsx` | `⚠️ Alertas Críticas de Seguridad` | `FiAlertTriangle` en línea |
| `app/admin/(dashboard)/reviews/page.tsx` | `✓ Compra verificada` | `FiCheck` en línea |
| `components/admin/SocialMediaGenerator.tsx` | 3 × `<span style={{ color: … }}>✓</span>` | `<FiCheck style={{ color: selectedTemplate.accent || '#ffffff' }} className="inline h-4 w-4" aria-hidden="true" />` (es la plantilla de la imagen: aquí sí se conserva ese `style`) |

- **Si un archivo usa `toast` con `icon:` JSX**, debe ser `.tsx` (todos lo son).
- **No toques** el carril Claude: correos (`lib/email-service.ts`, `lib/email-templates/**`), `app/api/**` y `lib/**` tienen emojis que resuelve Claude aparte.

**En tu estado:** la tabla con una columna más, "hecho / BLOQUEADO + motivo".

Verificación:
```bash
F='app/customer app/creator app/cursos components/cursos app/gift-cards components/modals components/reviews components/orders components/social components/admin app/admin/(dashboard)/cursos app/admin/(dashboard)/marketing app/admin/(dashboard)/orders app/admin/(dashboard)/payments app/admin/(dashboard)/reports app/admin/(dashboard)/reviews'
LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{2300}-\x{23FF}\x{FE0F}]" $F   # 0
git diff --stat main    # solo los archivos de la tabla + docs/plan/estado/G-30.md
npx tsc --noEmit
```
QA: `/customer/referrals` muestra las medallas como íconos; `/cursos` y `/admin/cursos` muestran la estrella de destacado; un pedido digital en admin dice "Pagado" con ícono.

---

## Ronda R9 (pesada) · Panel admin con la paleta de la tienda · G-31 → G-32 → G-33 → G-34
Rama: `gemini/R9`, creada **desde `main` con R8 y C-52 mergeados**. Antes de empezar comprueba que existen `lib/admin-ui.ts` y `docs/plan/estado/C-52.md`.
Un commit por tarea con su `docs/plan/estado/G-XX.md`. Informe de origen: `docs/plan/AUDITORIA_ADMIN.md`.

**Qué ya hizo Claude (no lo toques):**
- **C-52:** nuevo marco del admin (`app/admin/(dashboard)/layout.tsx`). Sin fondo animado, menú como cajón en móvil y contenedor sin `transform` ni `backdrop-blur`. Los modales `fixed` ya cubren toda la pantalla y no necesitan portal.
- **`lib/admin-ui.ts`:** recetas de clases para todo el admin.
- **`lib/format-helpers.ts`:** `isCreditTransaction` y la etiqueta `DEPOSIT: 'Abono'`.

**Fuera de límites en R9:**
- `app/admin/(dashboard)/layout.tsx`, `app/admin/(dashboard)/settings/**` y `app/admin/(dashboard)/products/**`.
- `lib/**`, `app/api/**` y cualquier archivo que la tarjeta no nombre.

### Reglas comunes de R9 (valen para G-31, G-32, G-33 y G-34)
**R1 · Recetas.** Importa de `@/lib/admin-ui` solo lo que uses y reemplaza el `className` completo del elemento:

| Elemento | Receta |
|---|---|
| Fila de título de la página (h1 + subtítulo + botones) | contenedor `adminPageHeader`, h1 `adminPageTitle`, párrafo `adminPageSubtitle` |
| Título de bloque (h2/h3 dentro de la página) | `adminSectionTitle` |
| Tarjeta o bloque blanco con borde | `adminCard` (con padding) o `adminCardFlush` (sin padding: listas y tablas) |
| Tarjeta de estadística (número grande + etiqueta + ícono) | contenedor `adminStatCard`, ícono en `<span className={adminIconChip('brand')}>`, etiqueta `adminStatLabel`, número `adminStatValue` |
| Input, select y textarea | `adminInput()` o `adminInput(Boolean(error))` si el campo ya mostraba error. Textarea: `` `${adminInput()} h-auto py-2.5` `` |
| Label de campo | `adminLabel` · ayuda `adminHint` · error `adminError` |
| Botón principal (azul, crear, guardar) | `adminPrimaryButton` |
| Botón con borde o gris (cancelar, actualizar, exportar) | `adminSecondaryButton` |
| Botón de borrar, rechazar o desactivar definitivo | `adminDangerButton` |
| Botón de aprobar o marcar pagado/entregado | `adminSuccessButton` |
| Botón de solo ícono (ver, editar, borrar, cerrar) | `adminIconButton` + `aria-label` en español si no lo tiene |
| Badge de estado | `adminBadge(tono)` (tabla R3) |
| Aviso o caja informativa | `adminNotice(tono)` |
| Pestañas o filtros tipo botón | cada botón `adminTab(activo)`; el contenedor de la fila `flex gap-2 overflow-x-auto pb-1` |
| Estado vacío | contenedor `adminEmpty` |
| Spinner de carga | `adminSpinner` |

**R2 · Botones sm.** Si un botón tenía `px-2 py-1`, `text-xs` o `h-8` (acciones dentro de filas), usa la receta y agrega `h-9 px-3 text-xs` al final.

**R3 · Colores sueltos.** Lo que no cubren las recetas se traduce por familia. Primero decide el **tono** por el significado: éxito o aprobado → `success`; pendiente o advertencia → `warning`; error, rechazo o borrar → `danger`; información, marca o acento → `brand`; neutro → `neutral`.

| Antes | Después |
|---|---|
| `text-gray-900`, `text-gray-800` | `text-ink` |
| `text-gray-700`, `text-gray-600` | `text-ink-soft` |
| `text-gray-500`, `text-gray-400` | `text-muted` |
| `text-gray-300` (íconos, placeholder) | `text-subtle` |
| `bg-gray-50`, `bg-gray-100`, `bg-gray-50/30`, `hover:bg-gray-50`, `hover:bg-gray-100` | `bg-surface`, `hover:bg-surface` |
| `bg-gray-200`, `bg-gray-300` | `bg-line` |
| `border-gray-100`, `border-gray-200`, `divide-gray-100`, `divide-gray-200` | `border-line`, `divide-line` |
| `border-gray-300` | `border-line-strong` |
| `bg-black/50`, `bg-black/60`, `bg-black/40` (capa de modal) | `bg-ink/50` |
| **Azules y morados** (`blue`, `indigo`, `sky`, `cyan`, `violet`, `purple`, `fuchsia`, `pink`): `text-*-500/600` | `text-brand-600` |
| …`text-*-700/800/900` | `text-brand-700` |
| …`bg-*-50` · `bg-*-100` | `bg-brand-50` · `bg-brand-100` |
| …`bg-*-500/600` · `bg-*-700` · `hover:bg-*-700` | `bg-brand-500` · `bg-brand-600` · `hover:bg-brand-600` |
| …`border-*-100/200` · `border-*-300/500/600` | `border-brand-200` · `border-brand-500` |
| …`ring-*-500/NN` · `focus:border-*-500` | `ring-brand-500/NN` · `focus:border-brand-500` |
| …`text-*-100/200` (sobre fondo azul) | `text-white/80` |
| **Verdes** (`green`, `emerald`, `teal`, `lime`): `text-*-400…800` | `text-success-strong` |
| …`bg-*-50/100` | `bg-success-strong/10` |
| …`bg-*-400…700` · `hover:bg-*-600/700` | `bg-success-strong` · `hover:bg-success-strong/90` |
| …`border-*-100…300` · `border-*-500` | `border-success-strong/20` · `border-success-strong` |
| **Ámbar** (`amber`, `yellow`, `orange`): `text-*-400…800` | `text-warning-strong` |
| …`bg-*-50/100` | `bg-warning/15` |
| …`bg-*-400…600` (fondo con texto blanco) | `bg-warning-strong` |
| …`border-*-100…300` · `border-*-500` · `ring-*-500` | `border-warning/30` · `border-warning-strong` · `ring-warning` |
| **Rojos** (`red`, `rose`): `text-*-400…800`, `hover:text-*-600` | `text-deal`, `hover:text-deal` |
| …`bg-*-50/100` | `bg-deal-bg` |
| …`bg-*-500…700` · `hover:bg-*-600/700` | `bg-deal` · `hover:bg-deal/90` |
| …`border-*-100…300` | `border-deal/30` |
| `text-white`, `bg-white`, `border-white`, `bg-white/10`, `text-white/80` | se quedan |

**R4 · Degradados y efectos.**
- Borra `bg-gradient-to-*` con sus `from-*`, `via-*` y `to-*`, y pon **un** fondo sólido:
  - Degradado oscuro de color (`from-*-500/600` hacia otro color) → el fondo sólido de su familia en R3. Una tarjeta de estadística de color pasa a `adminStatCard` blanca con `adminIconChip(tono)`.
  - Degradado claro (`from-*-50 to-white`) → `bg-surface`, o `bg-brand-50` si era azul.
- Borra `backdrop-blur-*`, `blur-*`, `hover:scale-*`, `scale-[...]`, `animate-pulse` (salvo en esqueletos de carga), `animate-bounce` y `animate-ping`.
- `shadow-xl` y `shadow-2xl` → `shadow-lg` solo en paneles de modal; en tarjetas bórralos (el borde basta).
- Borra los elementos que solo existen para un efecto decorativo (un `<div>` vacío con `blur` o degradado `absolute inset-0`).

**R5 · Capas y modales.**
- **Capa del modal** (`fixed inset-0` que oscurece el fondo): `className={adminModalOverlay}`.
- **Panel blanco:** `` className={`${adminModalPanel} sm:max-w-lg`} `` (usa `sm:max-w-md`, `lg`, `2xl` o `4xl` según el ancho que tenía). Encabezado, cuerpo y pie con `adminModalHeader`, `adminModalTitle`, `adminModalBody` y `adminModalFooter` si el modal ya tenía esas zonas.
- **Scroll de fondo:** por cada modal, agrega `useBodyScrollLock(<estado que lo abre>)` junto a los demás hooks del componente. Import: `import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';`. Si el estado es un objeto o null, `useBodyScrollLock(Boolean(estado))`.
- **Capas sueltas:** `z-40`, `z-50`, `z-[100]`, `z-[9999]` y `z-[10000]` → `z-[var(--z-modal)]` en modales, `z-[var(--z-dropdown)]` en menús desplegables y `z-[var(--z-sticky)]` en barras fijas.
- **Portales:** si el modal ya usa `createPortal`, déjalo.

**R6 · Tablas y responsive.**
- **Tablas:** toda `<table>` va dentro de `<div className={adminTableWrap}>` (si ya está dentro de un `overflow-x-auto`, reemplaza esa clase). `<th>` → `adminTh`, `<td>` → `adminTd`, `<tr>` del cuerpo → `adminRowHover`.
- **Rejillas:** `grid-cols-4` o `grid-cols-5` sin prefijo → `grid-cols-2 lg:grid-cols-4` (o `lg:grid-cols-5`); `grid-cols-3` sin prefijo → `grid-cols-1 sm:grid-cols-3`.
- **Filas de cabecera** (título a la izquierda, botones a la derecha) → `adminPageHeader`.

**R7 · Montos y tipografía.**
- Los `toFixed(2)` que se **muestran** como dinero → `formatUSD` / `formatVES`, con las mismas reglas de G-26 (nada en `body`, `value` de inputs ni portapapeles).
- `text-[10px]` → `text-xs`. `font-black` y `font-extrabold` → `font-bold`. `text-base` en badges → `text-xs`.

**R8 · Prohibido** (si parece necesario → `BLOQUEADO` con `PEDIDO:`):
- Cambiar `fetch`, URLs, cuerpos de peticiones, validaciones, permisos, textos visibles, orden de campos o agregar/quitar elementos.
- Única excepción: lo que la tarjeta liste en **"Arreglos permitidos"**.

**En cada estado:**
1. Tabla archivo | colores sueltos antes → después | modales con `useBodyScrollLock` | tablas envueltas | `toFixed` cambiados.
2. Lista de clases que dejaste por no estar en R3.
3. Salida de la verificación.

**Verificación común** (pon en `F` los archivos de la tarjeta):
```bash
F="<archivos de la tarjeta, entre comillas>"
grep -noE "\b(bg|text|border|from|via|to|ring|divide|placeholder)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black)(-[0-9]{2,3})?(/[0-9]+)?\b" $F | wc -l   # 0 (o solo las anotadas en tu estado)
grep -nE "\bz-(40|50)\b|z-\[[0-9]{3,}\]|bg-gradient-to|backdrop-blur|animate-(bounce|ping)|font-(black|extrabold)|text-\[10px\]|\[#[0-9a-fA-F]{3,6}\]" $F   # 0
grep -c "fixed inset-0" $F; grep -c "useBodyScrollLock(" $F   # por archivo, el segundo número ≥ modales del archivo
grep -n "<table" -B2 $F | grep -c "adminTableWrap"   # igual a la cantidad de tablas
git diff main --stat   # solo los archivos de la tarjeta + su estado
npx tsc --noEmit
npx eslint $F   # no más errores que en main: git stash; npx eslint $F; git stash pop
```
**QA común:** `npm run dev`, entra como admin y abre cada página de la tarjeta a 1440 y 390 px.
- No hay texto encimado ni cortado.
- Los modales cubren toda la pantalla y el fondo no hace scroll.
- Las tablas se deslizan de lado en 390.

### G-31 · Órdenes, transacciones, clientes y gift cards · Depende: C-52 y R8 en `main`
Archivos:
- `app/admin/(dashboard)/orders/page.tsx`
- `app/admin/(dashboard)/orders/[id]/digital/page.tsx`
- `app/admin/(dashboard)/transactions/page.tsx`
- `app/admin/(dashboard)/customers/page.tsx`

`app/admin/(dashboard)/gift-cards/page.tsx` **salió de esta tarjeta**: Claude la rehízo en C-71. No la toques.

Carga aproximada: 315 colores sueltos, 19 degradados, 6 modales, 10 `toFixed`.

**Arreglos permitidos:**
1. **`orders/page.tsx`: título.** Antes de las tarjetas de estadística agrega `<div className={adminPageHeader}><div><h1 className={adminPageTitle}>Órdenes</h1><p className={adminPageSubtitle}>Pedidos de la tienda</p></div></div>`. Hoy la página no tiene título.
2. **`orders/page.tsx`: filas en móvil.** A 390 px el precio queda encima del nombre y del estado. En el elemento de cada fila de orden (el que contiene `#{order.orderNumber}` y el total), usa `flex flex-col gap-3 sm:flex-row sm:items-center`. Al bloque de total + botón de acción + botón ver, `flex items-center justify-between gap-3 sm:justify-end`. Al bloque de número/cliente, `min-w-0 flex-1`.
3. **`transactions/page.tsx`: abonos.** Borra la constante local `IS_CREDIT` y usa `isCreditTransaction` de `@/lib/format-helpers` en sus 2 usos. En `TYPE_CONFIG` agrega `DEPOSIT: { label: 'Abono', cls: adminBadge('success'), icon: <FiArrowUpCircle className="w-3 h-3" /> },`. Hoy el canje de una gift card sale como "Recarga" en rojo y con signo menos.
4. **`transactions/page.tsx`: tonos.** En `TYPE_CONFIG` y `STATUS_CONFIG`, cada `cls` pasa a `adminBadge(tono)`: RECHARGE/DEPOSIT/BONUS `success`, PURCHASE `brand`, REFUND `warning`, WITHDRAWAL `neutral`; PENDING `warning`, COMPLETED `success`, FAILED/CANCELLED `danger`. Cada `dot`, al `bg-*` sólido de su tono (R3).

QA extra: `/admin/transactions` con una gift card canjeada muestra "Abono" en verde con "+". `/admin/orders` a 390 px no encima textos.

### G-32 · Métodos de pago, marketing y reportes · Depende: G-31
Archivos:
- `app/admin/(dashboard)/payments/page.tsx`
- `app/admin/(dashboard)/marketing/page.tsx`
- `app/admin/(dashboard)/reports/page.tsx`
- `components/admin/EmailSettingsPanel.tsx`
- `components/admin/SocialMediaGenerator.tsx`

Carga aproximada: 541 colores sueltos, 21 degradados, 4 modales, 10 `toFixed`, 8 hex.

**Arreglos permitidos:**
1. **`SocialMediaGenerator.tsx`: no toques** los elementos con `style={{...}}` ni lo que esté dentro del contenedor de la vista previa de la plantilla. Es la imagen que se exporta y sus colores son del diseño del post. Solo cambia los controles alrededor (botones, inputs, tarjetas del panel).
2. **Pestañas** de `marketing/page.tsx` y `reports/page.tsx`: usa `adminTab(activo)` y un contenedor `flex gap-2 overflow-x-auto pb-1`. Hoy se cortan a 390 px.
3. **Colores de los gráficos** de `reports/page.tsx` (props `stroke`, `fill`, `color` de recharts, hex): `#2a63cd` para la serie principal, `#047857` para la segunda y `#b45309` para la tercera. Solo en props de gráficos; no son className.

QA extra: `/admin/reports` a 390 px muestra todas las pestañas deslizando; los gráficos usan azul, verde y ámbar.

### G-33 · Mensajes, categorías y solicitudes · Depende: G-32
Archivos:
- `app/admin/(dashboard)/inquiries/page.tsx`
- `app/admin/(dashboard)/messages/page.tsx`
- `app/admin/(dashboard)/categories/page.tsx`
- `app/admin/(dashboard)/discount-requests/page.tsx`
- `app/admin/(dashboard)/product-requests/page.tsx`
- `app/admin/(dashboard)/verifications/page.tsx`
- `app/admin/(dashboard)/reviews/page.tsx`
- `app/admin/(dashboard)/creators/page.tsx`

Carga aproximada: 513 colores sueltos, 10 degradados, 7 modales.

**Arreglos permitidos:**
1. **`categories/page.tsx`: responsive.** A 390 px el panel derecho queda cortado.
   - Contenedor raíz: `flex flex-row h-[calc(100%+3rem)] -m-6 w-[calc(100%+3rem)]` → `-m-4 flex flex-col md:-m-6 lg:min-h-[calc(100dvh-10rem)] lg:flex-row`.
   - Panel izquierdo: `w-[300px] flex-shrink-0 border-r ... h-full` → `flex w-full shrink-0 flex-col border-b border-line bg-surface lg:w-[300px] lg:border-b-0 lg:border-r` (sin `h-full`).
   - Panel derecho: quita `h-full`. Su hijo con scroll pasa de `p-8` a `p-4 lg:p-8`.
2. **Cabeceras de `reviews`, `verifications` y `discount-requests`:** título + pestañas en una fila que se corta en móvil → contenedor `adminPageHeader` y pestañas con `adminTab` en `flex gap-2 overflow-x-auto pb-1`.
3. **`inquiries/page.tsx`:** las pestañas "Mensajes / Solicitudes de Productos / Alertas del Sistema" usan `adminTab` en un contenedor deslizable. Hoy "Alertas del Sistema" no se ve a 390 px.

QA extra: `/admin/categories` a 390 px muestra la lista arriba y el detalle abajo. `/admin/reviews` a 390 px muestra las 3 pestañas.

### G-34 · Dashboard, legales, servicios, cursos y dos arreglos de flujo · Depende: G-33
Archivos:
- `app/admin/(dashboard)/page.tsx`
- `app/admin/(dashboard)/legal/page.tsx`
- `app/admin/(dashboard)/servicios/page.tsx`
- `app/admin/(dashboard)/cursos/page.tsx`
- `app/admin/(dashboard)/not-found.tsx`
- `app/customer/(dashboard)/balance/page.tsx`
- `components/onboarding/GuidedTourWrapper.tsx`

**Arreglos permitidos:**
1. **`admin/(dashboard)/page.tsx`:** borra el `<div className="flex flex-wrap items-center gap-2">` completo con los 3 indicadores "BD: Conectado", "Auth: Activo" y "Modo: Desarrollo". Están escritos a mano, no miden nada, y en producción dicen "Desarrollo". El bloque de bienvenida pasa de degradado a `bg-brand-600` (R4). Los 3 montos con `toFixed` pasan a `formatUSD` (también el `formatter` del gráfico).
2. **`customer/(dashboard)/balance/page.tsx`:** en `getTransactionIcon`, `getTransactionColor` y el ícono de cada fila (líneas ~118-122 y ~263-270), cambia `type === 'RECHARGE'` / `transaction.type === 'RECHARGE'` por `isCreditTransaction(type)` / `isCreditTransaction(transaction.type)`, importado de `@/lib/format-helpers`. Hoy el cliente ve su gift card canjeada como gasto en rojo. En este archivo **no** apliques R1-R7, solo este arreglo.
3. **`components/onboarding/GuidedTourWrapper.tsx`:** el tour de la tienda aparece encima del panel admin. Agrega `import { usePathname } from 'next/navigation';` y, dentro de `GuidedTourWrapper`, `const pathname = usePathname(); if (pathname?.startsWith('/admin')) return null;` antes del `return <GuidedTour />`.

QA extra:
- En `/admin` ya no hay indicadores de "Modo".
- En `/customer/balance`, un canje de gift card sale en verde.
- Con sesión nueva, el tour no aparece en `/admin` y sí en `/`.

---

## Ronda R10 (pesada) · Acceso, páginas públicas, creadores y panel del cliente · G-35 → G-36 → G-37 → G-38 → G-39
Rama: `gemini/R10`, creada **desde `main` local actualizado**. Comprueba que existan `docs/plan/estado/C-33.md` y `docs/plan/estado/C-54.md`.
Un commit por tarjeta con su `docs/plan/estado/G-XX.md`. Carga total: ~1.575 colores sueltos, 189 degradados, 17 modales y ~17.000 líneas en 43 archivos.

### Lo que aprendimos en R9 (obligatorio)
- **No hagas merge ni `git push`** a ninguna rama. Terminar = commits en `gemini/R10` + avisar a Andrés. Claude revisa, mergea y sube.
- **Sangría:** antes de cada commit corre `git diff --stat main` y `git diff -w --stat main`. Si el primero es mucho mayor que el segundo, cambiaste la sangría: deshazlo. En G-33 quedaron 8 archivos con 1 espacio de sangría.
- **`'use client'`** es siempre la primera línea del archivo; los imports nuevos van debajo.
- **Arreglo marcado como hecho = verificado a 390 px** con `npm run dev`. En G-33 se marcaron hechos 3 arreglos móviles que no funcionaban.
- **Si quitas un fondo de color**, revisa que el texto que estaba encima (`text-white`, `text-white/80`) pase a `text-ink` / `text-muted`. En G-33 quedó texto blanco sobre `bg-surface`.

### Reglas de R10
- **Reglas comunes de R9 (R1-R8)** para todos los archivos, con las recetas de `@/lib/admin-ui`. Sirven para cualquier panel, tarjeta o formulario, también en la tienda.
- **Imágenes:** toda `<Image ... fill>` lleva `sizes`. Avatares: `sizes="48px"`. Miniaturas de producto: `sizes="96px"`. Imagen principal de una tarjeta: `sizes="(min-width: 1024px) 25vw, 50vw"`.
- **Encabezados:** las páginas públicas ya tienen `PageHeader` (C-32/C-54). No agregues otro hero; lo que va debajo es contenido normal sobre `bg-surface` o `bg-white`.
- **Fuera de límites:**
  - `app/customer/(dashboard)/layout.tsx` (lo rehace Claude en C-55).
  - `app/checkout/**`, `app/carrito/**`, `components/ui/**`, `components/gift-card/**`, `app/canjear-gift-card/**`, `lib/**`, `app/api/**`.
- **Verificación común:** la de R9 con `F="<archivos de la tarjeta>"`, más `grep -n "fill" $F | grep -v "sizes="` → 0 líneas con `<Image` sin `sizes`.

### G-35 · Páginas de acceso · Depende: —
Archivos:
- `app/login/page.tsx`
- `app/registro/page.tsx`
- `app/recuperar-contrasena/page.tsx`
- `app/recuperar-contrasena/[token]/page.tsx`
- `app/verificar-email/[token]/page.tsx`

Carga: ~101 colores, 8 degradados.

**Arreglos permitidos:**
1. **Fondo:** si la página tiene fondo de degradado azul o manchas `blur`, el contenedor raíz pasa a `min-h-dvh bg-surface` y el formulario a `adminCard` (`max-w-md` centrado). Los textos que eran blancos sobre el azul pasan a `text-ink` / `text-muted`.
2. **Botones de enviar:** `adminPrimaryButton` a todo el ancho (`w-full`).
3. **No toques** `signIn`, `fetch`, hCaptcha, validaciones ni redirecciones.

QA: `/login` y `/registro` a 390 y 1440 px: formulario legible, sin texto blanco sobre fondo claro, captcha visible.

### G-36 · Contenido de las páginas públicas · Depende: G-35
Archivos:
- `app/servicios/page.tsx`, `components/servicios/ServiciosPortfolio.tsx`
- `app/cursos/page.tsx`, `components/cursos/CourseDetailClient.tsx`, `components/cursos/CoursePlayer.tsx`
- `app/contacto/page.tsx`, `components/contact/ContactForm.tsx`, `components/contact/BusinessHours.tsx`
- `app/creator/page.tsx`
- `app/solicitar-producto/SolicitarProductoClient.tsx`
- `app/gift-cards/page.tsx` (**solo** desde el formulario "Selecciona el monto" hacia abajo y la sección "¿Por qué elegir nuestras Gift Cards?"; no toques `GiftCard3D`, el selector de diseños ni `handlePurchase`)

Carga: ~511 colores, 78 degradados, 7 modales.

**Arreglos permitidos:**
1. **Formularios de color:** los formularios dentro de una tarjeta azul (Contacto "Envíanos un Mensaje", "Completa tu Solicitud") pasan a `adminCard` blanca con `adminInput`, `adminLabel` y `adminPrimaryButton`. Los textos blancos pasan a `text-ink` / `text-muted`.
2. **Bloques de CTA azules** (en `app/cursos/page.tsx`, "¿Eres un experto en tecnología?"): se permite **un** bloque sólido `bg-brand-600 text-white` por página, sin degradado, sin manchas `blur-3xl` y sin texto con `bg-clip-text` (igual al "¿No encuentras lo que buscas?" de `/productos`). Los `text-cyan-200` / `text-purple-200` pasan a `text-white` o `text-brand-100`.
3. **Números decorativos** (`01 / 02 / 03`), badges con sombra y `hover:scale`: R4.
4. **Gift Cards:** la rejilla de montos (`grid grid-cols-5`, 4 montos + campo "Otro") queda apretada a 390 px. Usa `grid grid-cols-3 gap-2 sm:grid-cols-5`; el campo "Otro" puede ocupar `col-span-2 sm:col-span-1`. Verifica que el monto elegido siga llegando a la compra.

QA: las 6 páginas a 390 y 1440 px, sin texto blanco sobre fondo claro; formularios de Contacto y Solicitar producto legibles; en Gift Cards los montos caben y "Otro" acepta un valor.

### G-37 · Panel de creadores · Depende: G-36
Archivos: `app/creator/dashboard/layout.tsx`, `app/creator/dashboard/page.tsx`, `app/creator/dashboard/cursos/page.tsx`, `app/creator/dashboard/cursos/nuevo/page.tsx`, `app/creator/dashboard/cursos/[id]/page.tsx`, `app/creator/dashboard/perfil/page.tsx`.

Carga: ~52 colores, 13 degradados.

**Arreglos permitidos:**
1. **Encabezados de color:** los encabezados blancos sobre degradado (`<h1 className="text-2xl font-bold text-white">`) pasan a `adminPageHeader` con `adminPageTitle` (texto oscuro sobre fondo claro).
2. **Layout:** en `layout.tsx`, si hay `transform`, `backdrop-blur` o `blur-3xl` en contenedores que envuelven `{children}`, bórralos (encierran a los modales). No cambies la navegación ni la protección de sesión.

QA: `/creator/dashboard` y "Nuevo curso" a 390 px.

### Lo que salió mal en G-35…G-37 (revisado por Claude en C-77, obligatorio antes de G-38)
- **`tsc` no se corrió**: dos archivos usaban `adminPrimaryButton`, `useBodyScrollLock` y `adminModalOverlay` **sin importarlos** y el build estaba roto, con los estados diciendo "0 errores". Cada receta o hook que uses va en el import de ese archivo, y la salida real de `npx tsc --noEmit` va pegada en el estado.
- **Texto blanco sobre fondo claro otra vez** (era la lección de R9): al quitar un fondo oscuro, revisa **todo** el archivo, incluidos los estados de carga y error (`Curso no encontrado`) y los botones pequeños (`bg-white/5 text-white/80`).
- **Rojos:** `text-deal` / `bg-deal-bg`, no `danger` (ver `GEMINI.md` §4).
- **Errores copiados y pegados:** en `registro` el campo Correo mostraba el error del campo Nombre. Cuando dupliques un bloque de input, cambia también el nombre del campo en la condición.
- **Al mezclar una receta con clases sueltas** (`adminPrimaryButton` + `py-4 rounded-xl`) sale un botón con dos alturas y dos radios. Si necesitas otro alto, usa `h-12` y nada más.
- **Bueno saberlo:** Claude arregló en `main` un bug de `app/globals.css` por el que **cualquier modal `fixed` de la tienda** aparecía al final de la página en vez de sobre la pantalla. Si un modal te sale descolocado, ya no es eso: revisa tus clases.

### G-38 · Panel del cliente A · Depende: C-55 en `main` y G-37
Archivos:
- `app/customer/(dashboard)/page.tsx`
- `app/customer/(dashboard)/orders/page.tsx`
- `app/customer/(dashboard)/orders/[id]/digital/page.tsx`
- `app/customer/(dashboard)/balance/page.tsx`
- `components/modals/RechargeModalV2.tsx`
- `components/orders/OrderTracking.tsx`

Carga: ~340 colores, 47 degradados, 6 modales.

**Arreglos permitidos:**
1. **Vista duplicada en `balance` y `orders`:** tienen dos bloques completos, "MOBILE VIEW" (`lg:hidden`) y "DESKTOP VIEW" (`hidden lg:block`). **No los fusiones**; aplica las reglas a los dos.
2. **Tarjeta de saldo:** la tarjeta principal de saldo puede quedar `bg-brand-600 text-white` (bloque sólido); el resto, tarjetas blancas.
3. **`RechargeModalV2`:** solo clases y `useBodyScrollLock` si falta. No toques montos, métodos, verificación de Pago Móvil ni `fetch`. **Desde C-72 la tasa se lee de `/api/settings/public` (`exchangeRateVES`): no la cambies a `/api/exchange-rates`**, el servidor aprueba la recarga con la tasa de la tienda.

QA: `/customer`, `/customer/orders`, `/customer/balance` a 390 y 1440 px; abrir "Recargar saldo": el modal cubre la pantalla y el fondo no hace scroll.

### G-39 · Panel del cliente B · Depende: G-38
Archivos:
- `app/customer/(dashboard)/addresses/page.tsx`, `mis-cursos/page.tsx`, `notifications/page.tsx`, `profile/page.tsx`, `referrals/page.tsx`, `reviews/page.tsx`, `settings/page.tsx`, `warranty/page.tsx`, `wishlist/page.tsx`
- `components/customer/*.tsx`

Carga: ~571 colores, 43 degradados, 4 modales.

**Arreglos permitidos:**
1. **`profile`:** quita los 4 `style={{ animation: 'fadeInUp …' }}` (R4) y aplica R5 a su modal (`fixed inset-0`): capa + panel + `useBodyScrollLock`.
2. **`referrals`:** las medallas `FaMedal` de G-30 se quedan.
3. **Pestañas y filtros** de `wishlist`, `reviews` y `notifications`: `adminTab` en contenedor deslizable.
4. **`notifications` (cambió en C-73):** borra su `getNotificationIcon` y usa `notificationMeta(type)` (ícono + tono para `adminIconChip`) y `timeAgo(fecha)` de `@/components/notifications/notification-meta`. `useNotifications()` sigue dando `notifications`, `unreadCount`, `isLoading`, `markAsRead`, `markAllAsRead` y `deleteNotification`; `link` puede ser `null`. No toques `components/notifications/**` (carril Claude).

QA: las 9 páginas a 390 px; en `/customer/profile` los modales cubren la pantalla.

**Prompt de arranque para Gemini (Andrés):** "Haz la Ronda R10 de `docs/plan/PLAN_GEMINI.md` en orden (G-35 a G-39) en la rama `gemini/R10` desde `main`. Lee primero 'Lo que aprendimos en R9'. G-38 y G-39 esperan a que exista `docs/plan/estado/C-55.md` en `main`; si no está cuando llegues, haz commit de G-35 a G-37 y avisa. Un commit por tarjeta con su estado y la salida de la verificación. No hagas merge ni push."

---

## Ronda R11 (muy pesada) · Carrito, checkout, modales compartidos y páginas de error · G-40 → G-41 → G-42 → G-43
**Se hace en la misma sesión que G-38 y G-39**, sin esperar a Claude.
- Rama: `gemini/R11`, creada **desde `gemini/R10` después del commit de G-39** (`git switch -c gemini/R11`).
- Un commit por tarjeta con su `docs/plan/estado/G-XX.md`. Claude revisa R10 y R11 juntas.
- Carga total: ~1.100 colores sueltos y efectos, 7 modales y ~7.700 líneas en 21 archivos.

### Reglas de R11
- **Las mismas de R9 (R1-R8) y R10** (imágenes con `sizes`, sin otro hero, texto blanco revisado), con las recetas de `@/lib/admin-ui`.
- **"Lo que salió mal en G-35…G-37"** (arriba) es obligatorio: **`npx tsc --noEmit` de verdad** con su salida pegada, cada receta importada, rojos con `deal`.
- **Carril ampliado solo para R11 y solo para cambiar clases**: `app/carrito/page.tsx`, `app/checkout/**`, `components/checkout/**`, `components/pago-movil/VerificarPagoMovilForm.tsx`, `components/ProcessingOverlay.tsx`, `components/EpicTooltip.tsx`, `app/not-found.tsx`, `app/error.tsx`.
- **Dinero:** el carrito y el checkout mueven dinero. **No se toca nada que no sea `className`** salvo lo que diga "Arreglos permitidos". En particular: `finalTotal`, `shippingBreakdown`, `orderData`, `userBalance`, `useCart`, cantidades, pasos del checkout, `fetch`, `router`, validaciones, payloads y mensajes de WhatsApp.
- **Fuera de límites:** `app/global-error.tsx` (se pinta fuera del layout y sin los estilos de la tienda), `components/ui/**`, `components/Footer.tsx`, `components/CartIcon.tsx`, `components/UserAccountButton.tsx`, `lib/**`, `app/api/**`.
- **Modales:** R5 como siempre. Si el modal ya usa `createPortal`, se queda.
- **Contenedores que envuelven un modal:** si tienen `relative z-10` (o cualquier `z-*`), `transform`, `filter` o `backdrop-blur`, el modal queda encerrado y debajo de la barra inferior. Quita esa clase del contenedor (ver `estado/C-55.md`).
- **Sin productos en tu BD local:** si no puedes llenar el carrito para ver el checkout, escribe en el estado `QA visual pendiente: sin productos` y sigue. Claude lo prueba con una tienda de ejemplo.

### G-40 · Carrito y confirmación de compra · Depende: G-39
Archivos:
- `app/carrito/page.tsx` (578 líneas, ~84)
- `app/checkout/success/page.tsx` (319 líneas, ~57)
- `components/ProcessingOverlay.tsx` (282 líneas, ~38)

**Arreglos permitidos:**
1. **`carrito`:** el `toFixed` que se muestra como precio → `formatUSD`.
2. **`checkout/success`:** el confeti usa `z-[9999]` → `z-[var(--z-modal)]`. No borres el confeti ni cambies su `style`.
3. **`ProcessingOverlay`:** capa con `adminModalOverlay` solo si hoy es un `fixed inset-0` con fondo oscuro; conserva su `useBodyScrollLock`.

QA: `/carrito` con un producto y vacío, a 390 y 1440 px. Los botones de cantidad y "Proceder al pago" siguen funcionando.

### G-41 · Checkout · Depende: G-40
Archivos:
- `app/checkout/page.tsx` (**2.356 líneas**, ~335: 263 colores y 72 degradados, blur o hex)
- `components/checkout/CheckoutPagoMovilForm.tsx` (762 líneas, ~88, 1 modal con portal)
- `components/pago-movil/VerificarPagoMovilForm.tsx` (584 líneas, ~57)

Trabaja `checkout/page.tsx` **por bloques** (datos, envío, pago, resumen) y corre `git diff -w --stat` entre bloques: si el número se dispara, cambiaste la sangría.

**Arreglos permitidos:**
1. **Montos que se muestran** con `toFixed` → `formatUSD` / `formatVES` (el `$` y "USD" que estén al lado del número se quitan, porque `formatUSD` ya los pone):
   - `giftCardInfo.balanceUSD.toFixed(2)` (2 veces, líneas ~1402 y ~1443)
   - `USD {finalTotal.toFixed(2)}$` (~1502) y `USD {(userBalance - finalTotal).toFixed(2)}$` (~1508)
   - `shippingBreakdown.packagingFee` (~1988 y ~2116), `consolidatedCost` (~2081), `item.cost` (~2098), `bulkyCost` (~2103)
   - Tasa `Number(companySettings.exchangeRateVES).toFixed(2)` (~2154) → `formatVES(Number(companySettings.exchangeRateVES))`.
   - **No toques:** los `kg` (`totalWeight`, `usedWeight`: no son dinero) ni el `toFixed` de la línea ~477 (va dentro de un texto que se envía).
2. **Modal de términos** (~2220, `fixed inset-0 … bg-black/60 backdrop-blur-sm`): R5 con `adminModalOverlay`, `adminModalPanel` y `useBodyScrollLock(showTermsModal)`.
3. **Texto blanco** del bloque de envío (`<strong className="text-white">` ~1988 y ~1992): si su fondo deja de ser azul, pasa a `text-ink`.
4. **Pantallas de carga y de acceso a pantalla completa** (~668 `status === 'loading'` y ~725): hoy son un degradado azul de toda la pantalla, el mismo "rectángulo azul" que Andrés vio en los esqueletos. Pasan a `min-h-dvh bg-surface`, el spinner a `adminSpinner` y los textos blancos a `text-ink` / `text-muted` (el resto del bloque de ~725 en `adminCard`).

QA: `/checkout` con un producto a 390 y 1440 px: los pasos se ven, el resumen no se corta, el modal de términos cubre la pantalla y el de QR de Pago Móvil abre.

### G-42 · Modales y piezas compartidas · Depende: G-41
Archivos:
- `components/social/ShareEarnModal.tsx` (362 líneas, ~53, 1 modal) y `components/social/ShareEarnButton.tsx`
- `components/modals/ConfirmDialog.tsx` (159 líneas, ~24, 1 modal) · **lo usan el admin y la tienda**
- `components/modals/BalanceTermsModal.tsx` (459 líneas, ~21, 1 modal)
- `components/reviews/ReviewForm.tsx`, `ReviewList.tsx`, `ReviewStats.tsx`, `StarRating.tsx`
- `components/onboarding/GuidedTour.tsx` (256 líneas, 1 capa `z-[var(--z-popup)]`: esa capa se queda)
- `components/EpicTooltip.tsx`

**Arreglos permitidos:**
1. **`ConfirmDialog`:** el botón de confirmar según `type`: `'danger'` → `adminDangerButton`, `'warning'` → `adminPrimaryButton`, `'info'` → `adminPrimaryButton`. Cancelar → `adminSecondaryButton`. El ícono en `adminIconChip('danger' | 'warning' | 'brand')`. No cambies props ni la promesa que devuelve.
2. **`ShareEarnModal`:** R5 (hoy `bg-black/60 backdrop-blur-sm`) y `useBodyScrollLock` con el estado que lo abre. El monto con `toFixed` → `formatUSD`.
3. **Estrellas** (`StarRating`, `ReviewStats`, `ReviewForm`): llenas `text-warning fill-warning`, vacías `text-line fill-line`. El promedio con `toFixed(1)` se queda (no es dinero).

QA: borrar algo en `/customer/addresses` abre `ConfirmDialog` rojo; "Compartir y ganar" en una tarjeta de curso abre el modal y cubre la pantalla a 390 px.

### G-43 · Páginas de error y certificado · Depende: G-42
Archivos:
- `app/not-found.tsx` (87 líneas, 46 efectos: degradados y manchas)
- `app/error.tsx` (58 líneas)
- `app/customer/(dashboard)/not-found.tsx` (54 líneas)
- `app/certificado/[token]/CertificatePage.tsx` (210 líneas)

**Arreglos permitidos:**
1. **`not-found` y `error`:** fondo `min-h-dvh bg-surface`, el bloque central en `adminCard` (`max-w-md` centrado), botones `adminPrimaryButton` (volver al inicio) y `adminSecondaryButton` (reintentar o atrás). Borra las manchas y degradados (R4). Los textos blancos pasan a `text-ink` / `text-muted`.
2. **`customer/(dashboard)/not-found.tsx`:** ya va dentro de la tarjeta blanca del panel (C-55): sin fondo propio, solo `adminEmpty` con su ícono, texto y botón.
3. **`CertificatePage`:** **no toques** nada con `style={{…}}` ni lo que esté dentro del certificado (es el diseño que se imprime). Solo los controles de alrededor: botones de imprimir o descargar y la franja de fondo de la página.

QA: `/esta-ruta-no-existe` y `/customer/nada` a 390 y 1440 px; un certificado se sigue viendo igual al imprimir.

**Prompt de arranque para Gemini (Andrés):** ver `docs/plan/SIGUIENTE.md` §5.

---

## Lo que salió mal en R10 y R11 (revisión C-86, 2026-09-16)
R10 y R11 se mergearon a `main` con 6 arreglos de Claude. **Lee esto antes de R12.**
1. **Cambiaste lógica "de paso".** En el carrito, la miniatura de la gift card pasó a leer `(item as any).design`, un campo que no existe: todas las gift cards salían con el mismo diseño. Además metiste un `any`. Si algo que no es `className` te parece mal, **anótalo en el estado; no lo reescribas**.
2. **Quitaste un `disabled`.** En Configuración del cliente, "Empresa" quedó elegible sin verificación. Un `disabled`, un `required` o un `if` que bloquea algo **son lógica**.
3. **Borraste un bloque entero** ("¿Necesitas ayuda?" en garantía) porque tenía datos inventados. Lo correcto era dejarlo y escribir `PEDIDO:` para que Claude pusiera los datos reales.
4. **G-41 quedó a medias** y el estado decía HECHO: el resumen del checkout sigue con 55 clases de la paleta vieja y montos como "USD 50,00$". Antes de marcar HECHO corre el grep de colores del archivo completo y pega el número.
5. **Sangría otra vez:** referidos 1.363 líneas de diff para 231 cambios reales; garantía 780/210; reseñas 329/77. Compara `git diff --stat` con `git diff -w --stat` **antes** de cada commit.
6. Imports sin uso (`adminLabel`, `adminSuccessButton`, `goToBusinessAndDismiss`): ESLint del archivo antes del commit.

---

## Ronda R12 · Terminar el checkout y piezas compartidas con tokens · G-44 → G-45 → G-46
- Rama `gemini/R12` desde `main` actualizado (**`main` ya tiene R10 y R11 mergeadas con los arreglos de C-86**; tu rama `gemini/R11` queda vieja: no la sigas).
- Un commit por tarjeta con su `docs/plan/estado/G-XX.md`.
- **Carril cambiado desde el 16/09:** `app/login`, `app/registro` → Claude. `app/creator`, `app/recuperar-contrasena`, `app/verificar-email` y el panel admin → ChatGPT. No los toques aunque veas algo.

### Reglas de R12
- **Solo `className`** y los "Arreglos permitidos" de cada tarjeta. Todo lo de "Lo que salió mal en R10 y R11" es obligatorio.
- **Piezas compartidas (G-45, G-46):** las usa toda la tienda y el panel. No cambies props, variantes, nombres exportados ni textos. Si un color no tiene token claro, deja el que está y anótalo.
- Hex → token: tabla de la sección 4 de `GEMINI.md`. Rojos de error → `deal`.
- Verificación de cada tarjeta, pegada en el estado:
  ```bash
  bash -c 'grep -rnoE "(text|bg|border|from|to|ring|divide|placeholder)-(gray|slate|blue|green|red|amber|yellow|orange|purple|indigo|emerald|rose|pink|cyan|teal|violet)-[0-9]+|\[#[0-9a-fA-F]{3,6}\]|z-\[[0-9]+\]|font-black|font-extrabold|text-\[(7|8|9|10)px\]" <archivos de la tarjeta> | wc -l'
  npx tsc --noEmit
  npx eslint <archivos de la tarjeta>          # ningún problema nuevo contra main
  git diff --stat && git diff -w --stat        # cifras parecidas
  ```

### G-44 · Terminar el checkout · Depende: —
Archivos: `app/checkout/page.tsx` (55 colores viejos, casi todos en "Resumen del Pedido" e "Información de Contacto", ~l.1800-2160), `components/checkout/CheckoutPagoMovilForm.tsx` (6), `components/pago-movil/VerificarPagoMovilForm.tsx` (5).
**Arreglos permitidos:**
1. Montos del resumen con `formatNumber(x)` + `USD` + `$` → `formatUSD(x)`, quitando el `<span>USD</span>` y el `$` de al lado: subtotal (~1870), envío (~1927) y total (~2061).
2. Bolívares con `new Intl.NumberFormat('es-VE', …).format(x * Number(companySettings.exchangeRateVES))` → `formatVES(x * Number(companySettings.exchangeRateVES))`, quitando el `Bs.` escrito a mano: ~1874, ~1893 (descuento: conserva el `-` delante), ~1931, ~2066.
3. `CheckoutPagoMovilForm.tsx` ~386: `${montoEsperado.toFixed(2)}` → `{formatUSD(montoEsperado)}` (importa `formatUSD` de `@/lib/currency`).
4. **No toques:** `formatNumber` si se sigue usando en otro lado, los `toFixed` de kg (~1915, ~1994, ~1997, ~2003), el de ~481 (va en un mensaje) y los de `VerificarPagoMovilForm.tsx` 133-134 (van en el texto de WhatsApp).
**Criterio:** grep de colores de los 3 archivos = 0. QA: `/checkout` con un producto a 390 y 1440 px, resumen sin "USD … $".

### G-45 · `components/ui` con tokens · Depende: G-44
Archivos: `components/ui/LoadingSpinner.tsx` (14 hex), `StatusBadge.tsx` (15 colores), `Button.tsx` (8 hex, 5 colores), `ImageUploadField.tsx` (7 + 1 hex), `Badge.tsx` (6), `ErrorState.tsx` (5 + 2 hex), `EmptyState.tsx` (4 hex), `Modal.tsx` (3 colores, 4 hex y `z-[100000]`).
**Arreglos permitidos:**
1. `Modal.tsx`: `z-[100000]` → `z-[var(--z-modal)]`.
2. `StatusBadge.tsx` y `Badge.tsx`: cada variante con los tonos de `adminBadge` (`@/lib/admin-ui`): pendiente/advertencia → `warning`, pagado/en proceso/info → `brand`, completado/éxito → `success`, cancelado/error → `deal` (`bg-deal-bg text-deal`), neutro → `bg-surface text-ink-soft`. **Mismos nombres de variantes.**
**Criterio:** grep = 0 en los 8 archivos (o anota cuáles quedan y por qué). QA: `/admin/orders` (badges), un botón primario de la tienda y el esqueleto de `/productos`.

### G-46 · Footer, botón de cuenta y carrito del header · Depende: G-45
Archivos: `components/Footer.tsx` (12 hex `#2a63cd`), `components/UserAccountButton.tsx` (27 colores, 2 `font-black`, 2 `text-[10px]`), `components/CartIcon.tsx` (5 colores, `font-black`, `text-[8px]`).
**Arreglos permitidos:**
1. `font-black` → `font-bold`; `text-[10px]` y `text-[8px]` → `text-xs` (si en `CartIcon` ~233 no cabe, `text-[11px]` y lo anotas).
2. `UserAccountButton` ~120: el degradado `bg-gradient-to-br from-brand-500 to-brand-600` del avatar → `bg-brand-500`.
**Criterio:** grep = 0. QA: header a 390 y 1440 px con y sin sesión, menú de cuenta abierto, contador del carrito con 1 y con 12 productos, footer.

**Prompt de arranque:** ver `docs/plan/SIGUIENTE.md` §5.

---

## Resultado de R12 (revisión C-90, 2026-09-17)
**R12 salió bien: se mergeó sin tocar nada tuyo.**
- 258 clases viejas → 0, sin sangría cambiada.
- Solo los cambios de lógica permitidos, y cada estado con su verificación.

Claude arregló aparte tres cosas que la tarjeta no pedía:
- `formatPrice` del checkout, que seguía en "USD 300,00$".
- El contador del carrito del header, con estilos en línea que el grep de clases no ve.
- Escape en el menú de cuenta.

**Aprendizaje para R13:** un `style={{ … }}` con hex o con letra chica es igual de malo que un `className`. Búscalos también.

---

## Ronda R13 · Limpieza de ESLint en tu carril (sin lógica) · G-47 → G-48
- Rama `gemini/R13` desde `main` (ya trae R12 mergeada).
- Un commit por tarjeta con su `docs/plan/estado/G-XX.md`.
- **Fuera de límites:** `app/customer/(dashboard)/orders/[id]/digital/**` (lo rediseñó ChatGPT en GPT-02 con permiso de Andrés).
- **No toques** las reglas de hooks (`react-hooks/set-state-in-effect`, `immutability`, `purity`, `exhaustive-deps`): arreglarlas cambia cuándo corre el código. Si ves una, no la cuentes como pendiente tuya.
- Para contar problemas por archivo y regla:
  ```bash
  npx eslint <archivo> -f json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c={};for(const m of JSON.parse(s)[0].messages)c[m.ruleId]=(c[m.ruleId]||0)+1;console.log(c)})'
  ```

### G-47 · Variables e imports sin uso y comillas en el texto · Depende: —
Reglas `@typescript-eslint/no-unused-vars` (39) y `react/no-unescaped-entities` (14) en estos archivos:

| Archivo | sin uso | comillas |
|---|---|---|
| `app/customer/(dashboard)/settings/page.tsx` | 8 | |
| `components/customer/CustomerMobileNavBar.tsx` | 6 | |
| `components/modals/RechargeModalV2.tsx` | 4 | |
| `components/orders/OrderTracking.tsx` | 4 | |
| `components/social/ShareEarnModal.tsx` | 3 | |
| `app/customer/(dashboard)/profile/page.tsx` | 2 | 4 |
| `components/cursos/CoursePlayer.tsx` | 2 | |
| `components/modals/BalanceTermsModal.tsx` | 2 | |
| `components/pago-movil/VerificarPagoMovilForm.tsx` | 2 | |
| `app/customer/(dashboard)/page.tsx`, `app/servicios/page.tsx`, `components/cursos/CourseDetailClient.tsx`, `components/contact/BusinessHours.tsx`, `components/contact/ContactForm.tsx`, `app/customer/(dashboard)/mis-cursos/page.tsx` | 1 c/u | |
| `components/servicios/ServiciosPortfolio.tsx` | | 4 |
| `app/customer/(dashboard)/wishlist/page.tsx`, `app/gift-cards/page.tsx`, `app/terminos/page.tsx` | | 2 c/u |

**Cómo:**
1. Import sin uso → se borra de la lista del import (si queda vacío, la línea entera).
2. Variable sin uso:
   - `const x = …` sin efectos → se borra.
   - Si la parte derecha llama a algo (`fetch`, un hook, un `set…`) → **no se borra**: anótala en Notas.
   - `const [valor, setValor] = useState(…)` con `valor` sin uso → `const [, setValor] = useState(…)`.
   - Parámetro de `catch` sin uso → `catch {`.
3. Comillas dentro del texto JSX: `"hola"` → `&ldquo;hola&rdquo;`; un apóstrofo `'` → `&apos;`. **El texto que se ve no cambia.**

**Criterio:** esas dos reglas en 0 en los 20 archivos. `npx tsc --noEmit` sin errores nuevos. `git diff -w --stat` parecido a `git diff --stat`.

### G-48 · `any` → tipos · Depende: G-47
Regla `@typescript-eslint/no-explicit-any` (29):
- 4 en `customer/(dashboard)/orders/page.tsx`.
- 3 en `customer/(dashboard)/page.tsx`.
- 2 cada uno en `RechargeModalV2.tsx`, `ServiciosPortfolio.tsx`, `customer/(dashboard)/wishlist/page.tsx`, `app/servicios/page.tsx`, `CourseDetailClient.tsx`, `app/cursos/page.tsx` y `SolicitarProductoClient.tsx`.
- 1 cada uno en `customer/(dashboard)/settings`, `gift-cards/page.tsx`, `BusinessHours.tsx`, `ContactForm.tsx`, `cursos/[slug]/aprender`, `cursos/[slug]/page.tsx`, `customer/(dashboard)/balance` y `customer/(dashboard)/warranty`.

**Cómo (en este orden de preferencia):**
1. `catch (error: any)` → `catch (error)` y donde se lea `error.message` → `error instanceof Error ? error.message : '<el texto de respaldo que ya estaba>'`.
2. Un arreglo o un objeto que llega de una API (`any[]`) → `interface` local con **solo los campos que el archivo usa** (búscalos con el nombre de la variable). Si un campo llega como número o texto según el caso, usa `number | string`.
3. Si el tipo no es claro → `unknown` y una comprobación (`typeof x === 'string'`) donde se usa.
4. Si nada de eso compila sin cambiar lo que pasa → deja ese `any` y anótalo en el estado con archivo y línea.

**Prohibido:** cambiar lo que hace el código, agregar `?.` o `??` que no estaban (salvo en el `catch` de la regla 1) y usar `// eslint-disable`.
**Criterio:** `no-explicit-any` en 0 (o la lista anotada) y `npx tsc --noEmit` sin errores nuevos: pega la salida.

**Prompt de arranque:** ver `docs/plan/SIGUIENTE.md` §5.

---

## Plan de 3 días (17/09 → 20/09): R13 → R14 → R15 seguidas
Claude descansa 3 días: nadie revisa ni mergea. Trabaja las tres rondas en cadena, sin esperar:
- `gemini/R13` desde `main`.
- `gemini/R14` desde `gemini/R13` después de su último commit (`git switch -c gemini/R14 gemini/R13`).
- `gemini/R15` desde `gemini/R14`.
- No hagas `git merge main` ni `rebase`: Claude mezcla todo al volver.
- **Cada commit firmado como Gemini** (la configuración del repo ya lo hace) y con su `docs/plan/estado/G-XX.md`.
- Si una tarjeta se bloquea, `BLOQUEADO — motivo` y sigues con la siguiente: **no te quedes esperando**.

**Carril extra de estas rondas:**
- `app/api/**` y `lib/**` (R14): **solo tipos**.
- `scripts/**` (R15).
- **Fuera siempre:** `lib/auth.ts` y `app/api/customers/[id]/route.ts` (Claude los cambia en C-80 y C-92), `prisma/**` y todo lo del carril ChatGPT (`app/admin/**`, `app/creator/**`, `app/recuperar-contrasena/**`, `app/verificar-email/**`, `app/customer/(dashboard)/orders/[id]/digital/**`).

---

## Ronda R14 (muy pesada) · Tipos en las APIs y `lib` sin cambiar lo que hacen · G-49 → G-50 → G-51
203 problemas de ESLint: `no-explicit-any`, `no-unused-vars`, `prefer-const` y `ban-ts-comment`.
Los tipos de TypeScript desaparecen al compilar: **si solo cambias tipos, el servidor hace exactamente lo mismo.** Esa es la regla de oro de R14.

### Reglas de R14
1. **Permitido:**
   - Anotar tipos: `Prisma.OrderWhereInput`, `Prisma.ProductUpdateInput` e interfaces locales con solo los campos que el archivo usa.
   - `catch (error: any)` → `catch (error)`, leyendo el mensaje con `error instanceof Error ? error.message : '<el texto de respaldo que ya había>'`.
   - `error.code === 'P2002'` → `error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'`.
   - `let` que nunca cambia → `const`.
   - Borrar imports y variables sin uso **que no llaman a nada**.
   - `// @ts-ignore` → `// @ts-expect-error <motivo>` solo si el error sigue existiendo.
2. **Prohibido:**
   - Cambiar condiciones, orden de operaciones, `select`, `where`, `include`, `data`, respuestas (`NextResponse.json`), códigos de estado, mensajes, permisos (`isAuthorized`) o rate limits.
   - Agregar `?.`, `??`, `!` o validaciones nuevas.
   - `// eslint-disable`.
   - Mover código de lugar.
3. **Si tipar algo exige cambiar lógica** (por ejemplo, un `body: any` que se usa en veinte lugares), déjalo como está y anótalo en el estado con archivo y línea. Eso **no es fallar la tarjeta**.
4. **Rutas de dinero** (`customer/balance/**`, `orders/**`, `gift-cards/**`, `pago-movil/**`, `products/bulk/**`): además de lo anterior, pega en el estado **el `git diff -w` completo** de esos archivos.
5. **Verificación de cada tarjeta, pegada en el estado:**
   - Conteo de ESLint por archivo antes y después (comando de R13).
   - `npx tsc --noEmit` (salida real).
   - `npm run build` (las últimas 5 líneas).
   - `git diff --stat` contra `git diff -w --stat`.

### G-49 · `app/api/admin/**` (58) · Depende: G-48
`admin/reports` (24), `admin/discount-requests` (5), `admin/social/generate` (5), `admin/sades/search` (4), `admin/sades/sync` (4), `admin/email/settings` (3), y 1-2 en `courses`, `legal/resend-terms`, `legal/terms-acceptances`, `payments/seed`, `promote-super-admin`, `sades/health`, `sidebar-counts`, `transactions` y `verifications`.

### G-50 · `app/api/customer/**` (39) · Depende: G-49
- `dashboard` (4), `discount-requests` (5), `payment-methods` (4), `balance/terms` (3), `profile` (3), `settings` (3), `wishlist` (3).
- 1-2 en `balance/add`, `balance/deduct`, `balance/recharge`, `balance/recharge/[id]/cancel`, `balance`, `chat`, `company-payment-methods`, `orders`, `referrals` y `transactions`.
- **Seis son rutas de dinero:** regla 4.

### G-51 · El resto de `app/api/**` y `lib/**` (106) · Depende: G-50
- **APIs:**
  - `products/[id]` (7), `products/bulk/update` (5), `products/route` (5), `products/bulk/upload` (2), `products/public` (1).
  - `orders/[id]/digital` (5), `orders/route` (2).
  - `reviews` (5), `gift-cards/redeem` (4), `gift-cards` (1), `pago-movil/verificar` (4).
  - `courses/**` (9), `creator/**` (9), `upload/**` (4), `user/**` (4), `categories` (3), `contact` (2), `debug/og-metadata` (2).
  - Una en `analytics`, `cart/reserve`, `customers/route`, `digital-codes`, `influencers`, `product-requests`, `service-reviews`, `stats`, `tech-service-videos` y `webhooks/sades`.
- **`lib`:** `email-service` (6), `audit-log` (3), `notifications` (3), y 1-2 en `auth-helpers`, `email-templates/ReviewApproved`, `pago-movil/verificar-pago`, `product-utils`, `sades` y `stock`.

**Criterio de R14:** las cuatro reglas en 0 en los archivos de cada tarjeta (o la lista anotada), `tsc` sin errores nuevos y `npm run build` OK.

---

## Ronda R15 · Emojis, textos y un script peligroso · G-52 → G-53
### G-52 · Scripts · Depende: G-51
1. **Borra `scripts/reset-customers.ts`.** Autorizado por Claude en la auditoría del 17/09 (`docs/plan/AUDITORIA_CLIENTES_BORRADOS.md`): borra todas las órdenes, saldos y usuarios, incluidos los administradores, y crea una cuenta con clave `password123`. Antes de borrarlo, `git grep -n "reset-customers"` y pega la salida (no debe usarse en ningún lado).
2. **Emojis en los mensajes de consola de los scripts:**
   - `scripts/fix-data-uri-images.ts` (12), `scripts/create-master-admin.ts` (6), `scripts/migrate-giftcard-security.ts` (5), `scripts/seed-notifications.ts` (4).
   - Se reemplazan por texto (`[OK]`, `[ERROR]`, `[AVISO]`) sin cambiar nada más de la línea.

### G-53 · Emojis en correos y APIs, y textos sin tilde · Depende: G-52
1. **Emojis:**
   - Archivos: `lib/email-service.ts` (12), `lib/email-templates/CourseCertificate.ts` (6), `lib/email-templates/ReviewApproved.ts` (3), `app/api/admin/email/settings/route.ts` (2), `app/api/debug/og-metadata/route.ts` (2), `app/api/pago-movil/verificar/route.ts` (2), `lib/sades.ts` (1).
   - En asuntos y cuerpos de correo **se quita el emoji y el espacio que sobra**; el texto queda igual.
   - No agregues íconos ni imágenes nuevas en los correos.
   - Búscalos con `grep -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" <archivo>`.
2. **Textos visibles sin tilde** ("electronico", "sesion", "verificacion"…) en `components/modals/RechargeModalV2.tsx` (3), `app/api/auth/verify-email/[token]/route.ts` (2), `app/checkout/page.tsx` (2) y `lib/pago-movil/verificar-pago.ts` (1): solo la tilde, **nunca en claves, nombres de variables, URLs ni valores que se comparan**.

**Criterio de R15:** los 7 archivos de correo y API sin emojis, `scripts/reset-customers.ts` no existe, y `tsc` y `build` OK.

---

## Resultado de R13, R14 y R15 (revisión C-93, 17/09)
**Aprobadas y en producción.** Revisión con la comparación más estricta hasta ahora: cada archivo compilado a JavaScript sin tipos, antes y después. **No hubo cambios de lógica** en las APIs (tampoco en las de dinero), y ESLint del proyecto bajó de 403 a 197 errores. Las 91 pruebas de las tareas anteriores pasan.

Dos cosas quedaron a medias → **G-54**:
1. Al quitar los emojis de las cabeceras de los correos **quedaron círculos de color vacíos**.
2. El grep de G-53 no cubría todos los símbolos: quedaron **⏳** y **⏸**.

### G-54 · Correos sin círculos vacíos ni símbolos · Depende: —
Rama `gemini/R16` desde `main`.
1. **Símbolos que quedan:**
   - `lib/email-service.ts` ~l.548: `<span …>⏳</span>` → se borra el `<span>`.
   - `lib/email-templates/CourseCertificate.ts` ~l.119: `emoji: '⏸'` → `emoji: ''`.
   - Búscalos con el rango completo: `grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2300}-\x{23FF}\x{2B00}-\x{2BFF}\x{FE0F}]" lib app/api`.
2. **Círculos vacíos:** son los `<div style="width:…;height:…;…border-radius:50%;…">` cuyo contenido quedó vacío.
   - En `lib/email-service.ts`, cerca de las líneas ~590, ~688 y ~747.
   - En `CourseCertificate.ts`, cerca de ~10 y ~53.
   - **Se borra el `<div>` completo** (apertura, espacio y cierre).
   - Los círculos que todavía tienen texto (`OK`, `&#10003;`) **se quedan**.
3. **`sendCreatorStatusEmail`** (`CourseCertificate.ts`):
   - El `<div style="font-size:50px…">${cfg.emoji}</div>` (~l.134) se borra.
   - El asunto `` `${cfg.emoji} ${cfg.title} - ElectroShop` `` (~l.155) pasa a `` `${cfg.title} - ElectroShop` ``, porque hoy empieza con un espacio.
   - Deja la propiedad `emoji` en los objetos (vacía): quitarla es cambiar el tipo.

**Verificación:**
- El grep del punto 1 da 0 en `lib/` y `app/api/`.
- `grep -n "border-radius:50%" lib/email-service.ts lib/email-templates/*.ts`: pega la salida y confirma que ninguno quedó vacío.
- `npx tsc --noEmit` y `npm run build`.
- Si puedes, abre **Admin → Marketing → Correos de la tienda** y mira las plantillas de envío, código digital, gift card y certificado.

---

## Resultado de R16 (revisión C-94, 21/09)
**G-54 aprobada.** Emojis: 0 en todo el código (`app`, `components`, `lib` y `contexts`, con el rango completo).
- También borraste el círculo ámbar de "Pedido en revisión" (quedaba vacío sin el ⏳) y el 🎮 del aviso de código digital: correcto, mismo criterio.
- Quedaron sin uso `platformColors` y `platformBg` en `sendDigitalCodeEmail` (solo los usaba el círculo). Los borró Claude en C-94.
- **Lección:** cuando borres un bloque, corre ESLint del archivo y borra lo que quedó sin uso.

---

## Plan final de Gemini (desde 21/09): R17 → R18 → R19 seguidas
Con estas tres rondas **terminas tu trabajo**. Después de R19 no hay más tarjetas hasta nueva orden de Andrés.

**ChatGPT está en pausa desde el 21/09.** Tomas la limpieza mecánica de las pantallas del admin que quedaron sin dueño y una tarjeta chica de ChatGPT (GPT-02b → G-57). Nada de rediseño: solo lo que dice cada tarjeta.

**Cómo se trabaja:**
- Ramas encadenadas:
  - `gemini/R17` desde `claude/C-94`: `git switch -c gemini/R17 claude/C-94`. Esa rama ya trae `main`, tu R16 y la R1 de ChatGPT revisadas.
  - `gemini/R18` desde `gemini/R17` después de su último commit.
  - `gemini/R19` desde `gemini/R18`.
  - Sin `git merge` ni `rebase`: Claude mezcla todo al revisar.
- Un commit por tarjeta, firmado como Gemini (la configuración del repo ya lo hace), con su `docs/plan/estado/G-XX.md`.
- Si una tarjeta o una línea se bloquea: `BLOQUEADO — motivo` en el estado y sigues. **No te quedes esperando.**
- **Verificación de cada tarjeta, pegada en su estado:**
  1. ESLint por archivo antes y después (el comando de R13).
  2. `npx tsc --noEmit` (salida real).
  3. `npm run build`, últimas 5 líneas. Si lo único que falla es el prerender de `/` por una columna que tu base local no tiene, pega el error y sigue: no es tuyo.
  4. `git diff --stat` contra `git diff -w --stat`: deben dar números parecidos.

---

## Ronda R17 · Cierre de tu carril · G-55 → G-56

### G-55 · Montos, una flecha y el tour en `/creator` · Depende: —
1. `app/customer/(dashboard)/profile/page.tsx` ~l.1073:
   - Cambio: `${stats.totalSpent.toFixed(0)}` → `{formatUSD(stats.totalSpent)}`.
   - El `$` de texto que va delante se borra: `formatUSD` ya lo pone.
   - Agrega `import { formatUSD } from '@/lib/currency';`.
2. `app/customer/(dashboard)/wishlist/page.tsx` ~l.323: `${totalValue.toFixed(0)}` → `{formatUSD(totalValue)}` (ya está importado).
3. `components/modals/RechargeModalV2.tsx` ~l.597: `exchangeRate.toFixed(2)` → `formatVES(exchangeRate)` (ya está importado). Queda "x Bs. 36,50".
4. `components/pago-movil/VerificarPagoMovilForm.tsx` ~l.133-134, mensaje de soporte (dentro de un texto con comillas invertidas):
   - `$${montoEsperado.toFixed(2)}` → `${formatUSD(montoEsperado)}`. Se va el `$` de más.
   - `${montoEnBs.toFixed(2)}` → `${formatVES(montoEnBs)}`.
5. `components/cursos/CoursePlayer.tsx`:
   - ~l.416: `Ver Certificado →` → `Ver Certificado <FiArrowRight className="h-4 w-4" aria-hidden="true" />`.
     - Al `className` de ese `<Link>` súmale `flex items-center justify-center gap-1.5`.
     - Agrega `FiArrowRight` al import de `react-icons/fi`.
   - ~l.86: `next.has(id) ? next.delete(id) : next.add(id);` → `if (next.has(id)) next.delete(id); else next.add(id);`. Hace lo mismo y ESLint deja de marcarlo.
6. `components/onboarding/GuidedTourWrapper.tsx` ~l.22: `pathname?.startsWith('/creator/dashboard')` → `pathname?.startsWith('/creator')`.
   - Es un pedido de ChatGPT (GPT-05) autorizado por Claude: el recorrido de la tienda tapaba el formulario de solicitud en `/creator`.
   - Es el único cambio de lógica permitido en R17.

**Verificación:**
- `grep -n "toFixed" <los 4 archivos de montos>`: solo quedan los que no son dinero (`rating.toFixed(1)`, el tamaño en KB de `DocumentUpload`). Pega la salida.
- `grep -n "→" components/cursos/CoursePlayer.tsx` → 0.

### G-56 · "Cannot access variable before it is declared" en tu carril (13) · Depende: G-55
Es la regla `react-hooks/immutability`. Pasa porque un `useEffect` llama a una función que se declara **más abajo** con `const`:
```tsx
// Antes
useEffect(() => { fetchAddresses(); }, []);

const fetchAddresses = async () => {
  …
};

// Después: mismo lugar, mismo contenido
useEffect(() => { fetchAddresses(); }, []);

async function fetchAddresses() {
  …
}
```
Una `function` se puede usar antes de su línea ("hoisting"). **El código hace exactamente lo mismo y en el mismo momento.**

| Archivo | Líneas que marca ESLint |
|---|---|
| `app/customer/(dashboard)/addresses/page.tsx` | 68 |
| `app/customer/(dashboard)/balance/page.tsx` | 91 |
| `app/customer/(dashboard)/orders/page.tsx` | 129 |
| `app/customer/(dashboard)/page.tsx` | 55 |
| `app/customer/(dashboard)/profile/page.tsx` | 159, 160 |
| `app/customer/(dashboard)/reviews/page.tsx` | 34 |
| `app/customer/(dashboard)/settings/page.tsx` | 81 |
| `app/customer/(dashboard)/warranty/page.tsx` | 74 |
| `app/customer/(dashboard)/wishlist/page.tsx` | 105, 106 |
| `components/reviews/ReviewForm.tsx` | 27 |
| `components/social/ShareEarnModal.tsx` | 53 |

**Reglas:**
1. Solo cambian dos líneas por función:
   - La primera: `const nombre = async (params) => {` → `async function nombre(params) {`, o `const nombre = (params) => {` → `function nombre(params) {`. Los parámetros y sus tipos quedan igual.
   - El cierre: `};` → `}`.
2. **No muevas nada** y no toques el cuerpo de la función.
3. Solo si la función está **directamente en el cuerpo del componente** (no dentro de un `if`, de un `useEffect` ni de otra función) y su cuerpo empieza con `{`.
4. Si lo que marca ESLint no es una función así (un `const` con un valor, un `useCallback`): `BLOQUEADO` para esa línea y sigues.
5. Las otras reglas de hooks (`set-state-in-effect`, `purity`, `exhaustive-deps`) **no son tuyas**: cambian cuándo corre el código. No las toques ni las cuentes como pendientes.

**Verificación:**
- `react-hooks/immutability` en 0 en los 11 archivos.
- Pega el `git diff -w` completo: son unas 26 líneas, pares de apertura y cierre.

---

## Ronda R18 · Pantallas del admin sin dueño (ChatGPT en pausa) · G-57 → G-58 → G-59 → G-60
**Carril extra de R18, solo para lo que dice cada tarjeta:**
- `app/admin/(dashboard)/orders/**`, `customers/**`, `transactions/**`, `reports/**`.
- `app/admin/(dashboard)/payments/**`, `inquiries/**`, `messages/**`, `product-requests/**`, `discount-requests/**`, `reviews/**`, `verifications/**`, `categories/**`, `servicios/**`, `legal/**`.
- `app/admin/(dashboard)/products/page.tsx` (**solo G-58**).
- `app/creator/dashboard/cursos/**` y `app/customer/(dashboard)/orders/[id]/digital/**` (solo G-59 y G-60).

**Fuera siempre:**
- `app/admin/(dashboard)/products/_components/**`: el wizard tiene un arreglo pendiente que retoma Claude (C-95), y `ProductForm.tsx` se borra en GPT-11.
- `settings/**`, `marketing/**`, `notifications/**`, `cursos/**`, `creators/**` y `layout.tsx` del admin, `components/admin/**`, `app/api/**`, `lib/**` y `prisma/**`.

Reglas del admin (`GEMINI.md` §2): nada de cambiar `fetch`, URLs, cuerpos, permisos, cálculos ni campos.

### G-57 · "Cliente eliminado" en órdenes (antes GPT-02b) · Depende: G-56
Incidente del 17/09 (`docs/plan/AUDITORIA_CLIENTES_BORRADOS.md`): al borrar clientes en la base, sus órdenes quedan sin cliente y el panel las muestra como "Invitado".
Archivo: `app/admin/(dashboard)/orders/page.tsx`.
1. **Tipos:** en `interface Order`:
   - `user: { … }` pasa a `user: { … } | null`.
   - Agrega `guestName?: string | null;` y `guestEmail?: string | null;`.
   - La API ya los manda: `GET /api/orders` devuelve todos los campos de la orden. **No la cambies.**
2. **Tarjeta (~l.480) y detalle (~l.592-593)**, donde hoy dice `user?.name || 'Invitado'`:
   - Con `user`: igual que hoy.
   - Sin `user` y con `guestEmail`: "Invitado". En el detalle, el `guestEmail` va debajo, donde hoy va el correo del cliente.
   - Sin `user` y sin `guestEmail`: `<span className={adminBadge('neutral')}><FiUserX className="h-3.5 w-3.5" aria-hidden="true" /> Cliente eliminado</span>`.
     - `adminBadge` ya está importado.
     - `FiUserX` se agrega al import de `react-icons/fi`.
3. Busca `\.user` en el archivo: si la tabla de escritorio o el modal muestran el cliente en otro lugar, aplica la misma regla.
4. El filtro de búsqueda (~l.306) no cambia.

**Criterio:**
- Una orden sin cliente dice "Cliente eliminado" en la tarjeta, la tabla y el detalle.
- Cancelarla sigue funcionando: el `PATCH` y su cuerpo son idénticos. Pega `grep -n "fetch(\|method:\|body:" <archivo>` antes y después.
- Si no tienes datos para verlo en el navegador, escribe `QA con datos pendiente`: Claude la repite con la tienda de ejemplo.

### G-58 · Productos: `alert()` y `confirm()` nativos (8) · Depende: G-57
Archivo: `app/admin/(dashboard)/products/page.tsx` (**solo esto** de `products/**`).
1. **`alert(texto)`:**
   - Si es un error → `toast.error(texto)`.
   - El aviso de "archivado porque tiene órdenes" (~l.253) → `toast.success(texto)`.
   - El resumen del borrado masivo (~l.540, `parts.join(', ')`) → `toast(parts.join(', '))`.
   - **El texto no cambia.** Import: `import { toast } from 'react-hot-toast';`.
2. **`if (!confirm(`…`)) return;`** (~l.512):
   - En el componente: `const { confirm } = useConfirm();` con `import { useConfirm } from '@/contexts/ConfirmDialogContext';` (como en `reviews/page.tsx`).
   - La línea pasa a: `const ok = await confirm({ title: 'Eliminar productos', message: <el mismo texto>, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' }); if (!ok) return;`.
3. Nada más del archivo cambia.

**Criterio:** `grep -nE "(^|[^.a-zA-Z_])(alert|confirm)\(" "app/admin/(dashboard)/products/page.tsx"` → solo el `await confirm({` nuevo. Pega la salida.

### G-59 · Tipos y variables sin uso en el admin sin dueño (102) · Depende: G-58
Reglas `no-explicit-any`, `no-unused-vars`, `react/no-unescaped-entities` y `prefer-const`, con el método de G-47 y G-48: mismas reglas, mismos prohibidos y **sin `// eslint-disable`**.

| Archivo | sin uso | `any` | comillas | `prefer-const` |
|---|---|---|---|---|
| `payments/page.tsx` | 14 | 12 | | |
| `discount-requests/page.tsx` | 8 | 1 | 2 | |
| `orders/[id]/digital/page.tsx` (admin) | 7 | 1 | | |
| `orders/page.tsx` | 3 | 4 | | |
| `verifications/page.tsx` | 7 | | | |
| `app/customer/(dashboard)/orders/[id]/digital/page.tsx` | 7 | | | |
| `inquiries/page.tsx` | 2 | 4 | | |
| `servicios/page.tsx` | 4 | | 2 | |
| `customers/page.tsx` | | 5 | | |
| `messages/page.tsx` | 1 | 3 | | |
| `reviews/page.tsx` | 4 | | | |
| `legal/page.tsx` | 3 | | | |
| `app/creator/dashboard/cursos/[id]/page.tsx` | | 3 | | |
| `categories/page.tsx`, `product-requests/page.tsx` | | 1 c/u | | |
| `reports/page.tsx` | | | | 1 |
| `transactions/page.tsx`, `app/creator/dashboard/cursos/page.tsx` | 1 c/u | | | |

Sin prefijo, las rutas son de `app/admin/(dashboard)/`.
- Una variable sin uso cuya parte derecha **llama a algo** (`fetch`, un hook, un `set…`) no se borra: va a Notas.
- `payments/page.tsx` tiene 1.084 líneas: si se hace larga, `[G-59] parte 1/2` y `parte 2/2`, y cada commit compila solo.

**Criterio:** esas cuatro reglas en 0 en los 18 archivos, o la lista de lo que quedó con archivo, línea y motivo.

### G-60 · "Cannot access variable before it is declared" en el admin sin dueño (13) · Depende: G-59
Misma receta y mismas reglas que G-56.

| Archivo | Líneas |
|---|---|
| `customers/page.tsx` | 110 |
| `discount-requests/page.tsx` | 60 |
| `inquiries/page.tsx` | 80, 81 |
| `messages/page.tsx` | 31 |
| `orders/[id]/digital/page.tsx` (admin) | 100 |
| `payments/page.tsx` | 222 |
| `product-requests/page.tsx` | 40 |
| `reports/page.tsx` | 71, 76 |
| `reviews/page.tsx` | 43 |
| `verifications/page.tsx` | 39 |
| `app/customer/(dashboard)/orders/[id]/digital/page.tsx` | 96 |

Las líneas son de antes de G-59: después de esa tarjeta cambian. Búscalas otra vez con ESLint.

**Criterio:** `react-hooks/immutability` en 0 en esos 12 archivos y el `git diff -w` completo pegado en el estado.

---

## Ronda R19 · Inventario final (solo lectura) · G-61
### G-61 · Qué queda en todo el proyecto · Depende: G-60
**No edites código.** Solo `docs/plan/estado/G-61.md`, con cuatro secciones:
1. **ESLint por carril:** errores y avisos por regla en tu carril, el admin, las APIs y `lib`, y las pantallas de Claude, según `docs/plan/PLAN.md` §4. Usa el comando de conteo de R13 sobre `app components lib contexts`.
2. **Patrones prohibidos:** `bash docs/plan/scripts/inventario-paneles.sh` completo, más estos greps sobre `app components lib contexts`:
   - `toFixed(` en montos.
   - `alert(` / `confirm(` / `prompt(` nativos.
   - `-[#` en `className`, y `slate-`, `indigo-`, `purple-`, `pink-`.
   - `<img`.
   - `text-[10px]` o menos, y `font-black` / `font-extrabold`.

   Para cada uno: total, y los 10 archivos con más casos con su carril.
3. **Recorrido visual** de tu carril a 360, 768, 1024 y 1440 px, si puedes levantar el servidor (`npm run dev -- -p 3001`):
   - Tienda: gift cards, canjear, cursos, servicios, contacto, solicitar producto, términos y privacidad.
   - Panel del cliente, con sesión si tienes datos.
   - Por página: desborde horizontal (sí o no), textos cortados y botones tapados por la barra inferior.
   - Si no puedes levantarlo, escribe `QA visual pendiente`.
4. **Lo que no es tuyo:** las reglas de hooks que dejaste y los `BLOQUEADO` de R17 y R18, con archivo y línea, para que Claude los convierta en tareas.

**Criterio:** el estado existe y ningún archivo de código cambió (`git diff --stat gemini/R18` solo muestra `G-61.md`).

**Prompt de arranque:** ver `docs/plan/SIGUIENTE.md` §5.

---

## Resultado de R17, R18 y R19 (revisión C-98, 21/09)
**Aprobadas las 7 tarjetas (G-55…G-61).** Es tu mejor ronda:
- Llamadas y cuerpos idénticos en los 34 archivos, sin reindentar nada, todo dentro del carril.
- Estados honestos: anotaste lo que no quedó en 0 en vez de taparlo.
- Encontraste el `window.confirm` de SADES y el badge "Rechazada" sin color.

**Una falta de proceso:** el `git merge gemini/R18` dentro de R19. Para llevar un arreglo a la ronda siguiente se hace el commit en la rama de la ronda actual.

**Con esto terminó tu plan.** No hay ronda abierta hasta nueva orden de Andrés. Lo que quedó anotado para una próxima orden está en `docs/plan/estado/C-98.md`.

---

## Ronda R20 · Limpieza antes de rediseñar productos · G-62 → G-66
**Desde el 21/09 el equipo es Claude + Gemini: ChatGPT salió.** Sus pantallas son de Claude; entras solo a lo que nombra cada tarjeta.
Claude va a rehacer **productos** (C-51) y los **envíos** (C-100). Esta ronda deja esos archivos limpios antes, sin cambiar lo que hacen.

**Cómo se trabaja** (igual que R17-R19):
- Rama `gemini/R20` desde `claude/C-99`: `git switch -c gemini/R20 claude/C-99`. Un commit por tarjeta, con su `docs/plan/estado/G-XX.md`. Sin `merge` ni `rebase`.
- Si algo no cuadra: `BLOQUEADO — motivo` y sigues con la siguiente.
- En cada estado: ESLint por archivo antes y después, `npx tsc --noEmit` (salida real), `npm run build` (últimas 5 líneas) y `git diff --stat` contra `git diff -w --stat`.

**Fuera en R20:** `app/admin/(dashboard)/orders/**`, `components/orders/**`, `app/checkout/**`, `app/api/**`, `lib/**` y `prisma/**`.

### G-62 · Dos arreglos pendientes de C-98 · Depende: —
1. `components/modals/ConfirmDialog.tsx` ~l.114, en el `<p>` del mensaje: `whitespace-normal` → `whitespace-pre-line`. Así los mensajes con saltos de línea (el de SADES) se leen en varias líneas.
2. `app/customer/(dashboard)/profile/page.tsx` ~l.196, en `const profileData = {`, debajo de `businessVerificationStatus: data.profile?.businessVerificationStatus || 'NONE',` agrega:
   `businessVerificationNotes: data.profile?.businessVerificationNotes || '',`
   La API ya lo manda (`app/api/user/profile/route.ts:64`). Sin esto, "Motivo del rechazo" (~l.942) nunca aparece.

**Verificación:** `grep -n "whitespace-pre-line" components/modals/ConfirmDialog.tsx` → 1. `grep -n "businessVerificationNotes: data" "app/customer/(dashboard)/profile/page.tsx"` → 1.

### G-63 · Borrar `ProductForm.tsx` (sin uso) · Depende: G-62
Era la tarjeta GPT-11. El formulario viejo de productos no lo importa nadie: el alta y la edición usan el wizard.
1. `git grep -n "ProductForm" -- app components lib`: solo deben salir líneas del propio archivo `_components/ProductForm.tsx`. Pega la salida. Si sale otro archivo → `BLOQUEADO`.
2. `git rm "app/admin/(dashboard)/products/_components/ProductForm.tsx"`. Es la **única** eliminación permitida en R20.

**Criterio:** `tsc` y `build` iguales que antes.

### G-64 · El último `window.confirm` del panel · Depende: G-63
`app/admin/(dashboard)/gift-cards/page.tsx` ~l.203, `closeBatch`:
1. Import: `import { useConfirm } from '@/contexts/ConfirmDialogContext';`. Dentro de `GiftCardsAdminPage`, junto a los otros hooks del principio: `const { confirm } = useConfirm();`.
2. La función queda así (mismo texto en el mensaje):
   ```tsx
   const closeBatch = async () => {
     if (!batchPrinted) {
       const ok = await confirm({
         title: 'Cerrar sin imprimir',
         message: 'No imprimiste la hoja. Los PIN no se vuelven a mostrar y esas tarjetas no se podrán canjear. ¿Cerrar de todos modos?',
         confirmText: 'Cerrar de todos modos',
         cancelText: 'Volver',
         type: 'danger',
       });
       if (!ok) return;
     }
     setBatch(null);
   };
   ```
3. Nada más del archivo cambia. Los dos botones que llaman a `closeBatch` (~l.445 y ~l.470) quedan igual.

**Criterio:** `grep -rnE "window\.(alert|confirm|prompt)\(" app components` → 0.

### G-65 · Tipos y variables sin uso en productos y dos paneles · Depende: G-64
Método de G-47, G-48 y G-59: mismas reglas y **sin `// eslint-disable`**. Solo `no-explicit-any`, `no-unused-vars`, `prefer-const` y `react/no-unescaped-entities`.

| Archivo | Qué marca ESLint (líneas del 21/09) |
|---|---|
| `app/admin/(dashboard)/products/page.tsx` | `any` 14 (31, 75, 77, 92, 138, 175, 383, 413, 470, 633, 1259, 1422, 1452, 1513) · `prefer-const` 470 · comillas 1233 |
| `products/_components/ProductWizard.tsx` | `any` 216, 223, 231, 238, 427, 449 |
| `products/_components/wizard/SadesSearchModal.tsx` | `any` 50 |
| `products/_components/wizard/physical/Step2Prices.tsx` | `any` 171 |
| `app/admin/(dashboard)/cursos/page.tsx` | `adminModalPanel` sin uso en el import (l.3) · `any` 155, 159, 248, 264 |
| `components/admin/EmailSettingsPanel.tsx` | `any` 129 · `catch (error)` sin uso 155 y 178 → `catch {` |
| `components/admin/SocialMediaGenerator.tsx` | `catch (error)` sin uso 191 → `catch {` |

**No se borran** (van a Notas del estado): `handleExcelChange`, `handleSelectAll` y `handleSelectProduct` de `products/page.tsx`, y `slug` de `SadesSearchModal.tsx`. Son funciones que se quedaron sin su botón o su campo; Claude las vuelve a conectar en C-51.
- Comillas de ~l.1233: `"{selectedProduct.name}"` → `&quot;{selectedProduct.name}&quot;`. El texto visible no cambia.
- Tipos: usa los que ya existen (`Product`, `Category`, los de `wizard/types.ts`). Si un `any` necesita un tipo que no existe y no es obvio, `unknown` con la comprobación mínima, o déjalo y anótalo.

**Criterio:** esas cuatro reglas en 0 en los 7 archivos, salvo las 4 variables de arriba, o la lista de lo que quedó con archivo, línea y motivo. Pega `grep -c "fetch(\|method:\|body:" <archivo>` antes y después de cada archivo: debe dar lo mismo.

### G-66 · Montos con `formatUSD` en productos · Depende: G-65
Import: agrega `formatUSD` a `@/lib/currency` en cada archivo (en `products/page.tsx` ya se importa `formatPrice` de ahí: súmalo a esa línea).
1. `products/page.tsx` ~l.1071: `` `$${parseFloat(String(product.priceUSD)).toFixed(2)}` `` → `formatUSD(parseFloat(String(product.priceUSD)))`.
2. `products/page.tsx` ~l.1407: el texto `${Number(quickViewProduct.priceUSD).toFixed(2)} USD` dentro del `<p>` → `{formatUSD(Number(quickViewProduct.priceUSD))}`. Se van el `$` y el "USD" sueltos.
3. `wizard/SadesSearchModal.tsx` ~l.168: `${product.precioUSD?.toFixed(2)}` → `{product.precioUSD != null ? formatUSD(product.precioUSD) : '—'}`.
4. `wizard/physical/Step2Prices.tsx` ~l.98: `` {profit ? `$${profit}` : '—'} `` → `{profit ? formatUSD(parseFloat(profit)) : '—'}`. La variable `profit` (~l.15) no cambia.

**No toques** `wizard/digital/Step2Variants.tsx` ~l.44: ese `toFixed(2)` llena un campo del formulario, no es un texto.
**Criterio:** `grep -n 'toFixed(2)' "app/admin/(dashboard)/products/page.tsx" "app/admin/(dashboard)/products/_components/wizard/SadesSearchModal.tsx"` → 0, y en `Step2Prices.tsx` solo queda el de `profit` (~l.17).

**Al terminar G-66:** avisa a Andrés y pega `git log --oneline claude/C-99..gemini/R20`.

---

## Ronda R21 · Informe de las pantallas que Claude va a rehacer · G-67
**R20 sigue pendiente: primero esas cinco tarjetas.** R21 es una sola, de solo lectura.

Andrés pidió cuatro trabajos grandes (descuentos, firma de documentos, reportes reales y captura real de IP). Los hace Claude porque tocan dinero, datos, diseño y el servidor. Lo que sí ayuda, y mucho, es un informe medido de cómo están hoy esas pantallas.

### G-67 · Cómo están hoy descuentos, documentos legales, reportes y la firma · Depende: G-66
**No edites código.** Solo `docs/plan/estado/G-67.md`. Levanta el servidor con datos (`npm run dev -- -p 3001`); si no puedes, escribe `QA con datos pendiente` y haz lo que sí se pueda leyendo el código.

Pantallas:
1. `app/admin/(dashboard)/discount-requests/page.tsx` (Descuentos)
2. `app/admin/(dashboard)/legal/page.tsx` (Documentos legales, con la firma del cliente)
3. `app/admin/(dashboard)/reports/page.tsx` y lo que devuelve `GET /api/admin/reports?type=…` (Resumen, Productos, Interacciones, Seguridad)
4. `components/modals/BalanceTermsModal.tsx` (el cliente firma los términos del saldo)

De **cada** una anota:
- **Primera pantalla a 390 px:** qué se ve sin bajar, cuántos toques hasta la acción principal, y si algo se sale o se corta (mide en px).
- **A 1440 px:** lo mismo.
- **Datos vacíos:** qué tarjetas, tablas o gráficos salen en 0, vacíos o con "no configurado", y de qué llamada vienen. Pega la URL y el JSON recortado.
- **Acciones:** lista de cada botón, filtro y modal, y si funciona (pruébalos).
- **Textos:** los que no se entienden o están en inglés.
- **Prohibidos que veas:** `<img>`, hex en `className`, `text-[10px]` o menos, `alert/confirm` nativos, `any`, animaciones infinitas. Con archivo y línea.
- **En reportes, además:** de cada pestaña, si el número sale de la base o de un valor fijo, siguiendo la llamada hasta `app/api/admin/reports/route.ts`.
- **En la firma, además:** qué pasa si firmas y borras, si funciona con el dedo en el teléfono, y si el trazo se ve completo al guardarlo.

**No propongas rediseños ni los hagas**: solo lo que hay, medido. Un commit `[G-67]` con el estado y nada más.
