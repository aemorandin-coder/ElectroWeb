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
3. **`RechargeModalV2`:** solo clases y `useBodyScrollLock` si falta. No toques montos, métodos, verificación de Pago Móvil ni `fetch`.

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

QA: las 9 páginas a 390 px; en `/customer/profile` los modales cubren la pantalla.

**Prompt de arranque para Gemini (Andrés):** "Haz la Ronda R10 de `docs/plan/PLAN_GEMINI.md` en orden (G-35 a G-39) en la rama `gemini/R10` desde `main`. Lee primero 'Lo que aprendimos en R9'. G-38 y G-39 esperan a que exista `docs/plan/estado/C-55.md` en `main`; si no está cuando llegues, haz commit de G-35 a G-37 y avisa. Un commit por tarjeta con su estado y la salida de la verificación. No hagas merge ni push."
