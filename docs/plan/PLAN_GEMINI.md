# Plan de Gemini — orden de trabajo por rondas

> Reglas obligatorias: [`/GEMINI.md`](../../GEMINI.md). Tarjetas G-01 a G-08: `GEMINI.md` §5. Tarjetas G-09 a G-14: **este archivo**, §4.
> Lo que hace Claude al mismo tiempo: [`PLAN_CLAUDE.md`](./PLAN_CLAUDE.md).

## 1. Qué detectó la auditoría en tu carril

Todo esto está en carpetas donde solo trabaja Gemini. Son arreglos repetitivos: no requieren decidir diseño ni tocar seguridad.

| Problema | Cantidad | Tarea |
|----------|----------|-------|
| Links a rutas que no existen (`/customer/wallet`, `/auth/login`, `/auth/signin`) | 7 líneas | G-01 ✅ |
| Componentes que nadie importa | 10 archivos | G-02 |
| Páginas sin Header/Footer (privacidad, términos, canjear gift card) | 3 páginas | G-03 |
| `alert()` en lugar de toast | 6 | G-04a / G-04b |
| Textos ilegibles de 7 a 10px + `font-black` | ~200 | G-05a…g |
| Colores hex escritos a mano | ~1.900 clases | G-06a…g |
| `h-screen`/`min-h-screen` (cortan contenido en celulares) | 33 | G-07 |
| Botones que solo aparecen con hover (en celular no se ven) | 4 | G-08 |
| Páginas que vuelven a pedir `/api/settings/public` aunque ya lo tiene el contexto | 5 | **G-09** |
| z-index gigantes (`z-[100001]`, `z-[9998]`) | 9 | **G-10** |
| `document.body.style.overflow` manual en modales (se traba el scroll) | 4 archivos | **G-11** |
| Manchas de blur animadas con `animate-pulse` (lentas en Android barato) | 37 líneas | **G-12** |
| Texto blanco casi transparente (`text-white/40…60`) difícil de leer | 69 | **G-13** |
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
| **R3** | G-09 → G-05f → G-04b* → G-05g* | R2 mergeada. (*) solo si `C-01` y `C-05` están `HECHO` en `main`; si no, sáltalas | C-10 tokens · C-11 fuentes |
| **R4** | G-06a → G-06b → G-06c → G-06d → G-06e | R3 mergeada **y** `C-10` `HECHO` en `main` | C-12 componentes base · C-13 queries |
| **R5** | G-06f → G-06g* → G-11 | R4 mergeada **y** `C-12` `HECHO`. (*) requiere `C-01` y `C-05` | C-20 header · C-21 barra móvil |
| **R6** | G-10 → (pendientes de R3/R5 que se hayan saltado) | R5 mergeada **y** `C-21` `HECHO` | C-22 home · C-23 popup |
| **R7** | G-14 (solo reporte, no edita código) | R6 mergeada | C-30…C-33 catálogo |

Si Claude va atrasado y no se cumple el requisito de la ronda siguiente, Gemini **no adelanta tareas bloqueadas**: termina las pendientes saltadas o espera.

### Prompt para pegarle a Gemini (inicio de cada ronda)
```
Lee GEMINI.md completo y docs/plan/PLAN_GEMINI.md.
Estás en la Ronda R1. Verifica el requisito de la ronda en la tabla §3.
Crea la rama gemini/R1 desde main. Haz SOLO estas tareas, en orden, un commit por tarea:
G-02, G-03, G-07, G-08, G-04a, G-12.
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
