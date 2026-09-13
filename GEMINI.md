# GEMINI.md — Reglas para Gemini en ElectroShopVe WEB

Lee este archivo COMPLETO antes de cada tarea. Si una instrucción de aquí choca con tu criterio, **gana este archivo**.

Proyecto: tienda online (Next.js 16 App Router, React 19, Tailwind CSS 4, Prisma, NextAuth). Idioma de la interfaz: español de Venezuela.
**Tu orden de trabajo (rondas, prompts y tarjetas G-09 a G-14): `docs/plan/PLAN_GEMINI.md`.**
Contexto: `docs/plan/PLAN.md` (diseño) y `docs/plan/AUDITORIA.md` (problemas). Lo que hace Claude en paralelo: `docs/plan/PLAN_CLAUDE.md`.

---

## 1. Las 12 reglas (no negociables)

1. **Haz SOLO las tareas de la ronda que te asignaron** (ej. Ronda R2: `G-05a`…), en el orden de `PLAN_GEMINI.md`. Nada de "de paso arreglé…".
2. **Solo edita archivos de TU carril** (sección 2). Si el archivo no está en tu carril, NO lo toques, aunque veas un error.
3. **No borres, renombres ni muevas archivos**, salvo la lista exacta de la tarea G-02.
4. **No toques:** `app/api/**`, `prisma/**`, `lib/**`, `contexts/**`, `proxy.ts`, `next.config.js`, `package.json`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/ui/**`, `components/public/**`, `CLAUDE.md`, `GEMINI.md`, `docs/plan/PLAN.md`, `docs/plan/PLAN_CLAUDE.md`, `docs/plan/PLAN_GEMINI.md`, `docs/plan/AUDITORIA.md`, `docs/plan/estado/C-*.md`.
5. **No instales dependencias.** No ejecutes `npm install`, `prisma migrate`, `prisma db push`, `git push --force`, `git reset --hard`, `git rebase`, `rm -rf` ni `git merge` a `main`.
6. **Cambios mínimos.** No reformatees archivos, no cambies comillas, indentación ni orden de imports, y no reescribas componentes enteros. Si el diff tiene líneas que la tarea no pide, deshazlas.
7. **No cambies textos visibles** (copys, mensajes) salvo que la tarea lo diga.
8. **Colores:** solo los tokens de la sección 4. Nunca escribas un hex nuevo en un className.
9. **Tipografía:** nunca `text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[9.5px]`, `text-[10px]`, `font-black` ni `font-extrabold`.
10. **Nada de** `any` nuevo, `console.log`, `alert()`, `<style jsx>` ni `style={{ color/background }}` nuevos.
11. **Verifica antes de decir "listo"**: corre los comandos de "Verificación" de la tarea y pega la salida en `docs/plan/estado/G-XX.md` (un archivo por tarea, con el ID de la tarea).
12. **Si algo no cuadra** (la línea no existe, el grep da un resultado distinto al esperado, un error que no entiendes): PARA, escribe `BLOQUEADO: <motivo>` en `docs/plan/estado/G-XX.md` y pasa a la siguiente tarea. **No improvises.**

---

## 2. Tu carril (lo único que puedes editar)

```
app/customer/**          components/customer/**
app/creator/**           app/cursos/**            components/cursos/**
app/servicios/**         components/servicios/**
app/contacto/**          components/contact/**
app/gift-cards/**        app/canjear-gift-card/**
app/login/**   app/registro/**   app/recuperar-contrasena/**   app/verificar-email/**
app/solicitar-producto/**   app/privacidad/**   app/terminos/**
components/modals/**   components/reviews/**   components/orders/**   components/social/**
components/pago-movil/**   components/onboarding/**
docs/plan/estado/G-*.md      (solo archivos que empiecen con G-)
```
Excepciones puntuales (solo cuando la tarea lo dice):
- `app/admin/**` y `components/admin/**` → solo G-01 (una línea), G-05f y G-06f.
- `app/carrito/**`, `app/checkout/**` y `components/checkout/**` → solo G-04b, G-05g y G-06g, **y solo cuando en `main` existan `docs/plan/estado/C-01.md` y `docs/plan/estado/C-05.md` con `Estado: HECHO`**.
- Borrado de la lista cerrada de G-02.

---

## 3. Flujo de trabajo (una rama por ronda, un commit por tarea)

Trabajas en tu propia carpeta (worktree), **nunca** en la carpeta principal del proyecto.

⚠️ **Todos los comandos de este archivo son para `bash`.** El sistema de Andrés usa fish/zsh, donde `$RUTAS` no funciona igual. Ejecuta cada bloque así: `bash -c '<comandos>'`, o abre `bash` primero.

```bash
# Solo la primera vez (lo hace Andrés desde la carpeta principal "ElectroShopVe WEB"):
git worktree add "../ElectroShopVe-gemini" -b gemini/base
ln -s "$PWD/node_modules" "../ElectroShopVe-gemini/node_modules"   # reutiliza dependencias, sin npm install
cp .env "../ElectroShopVe-gemini/.env"                              # solo si Gemini va a levantar el servidor
# Si Gemini levanta el servidor, que use otro puerto: npm run dev -- -p 3001
# Si no puede levantarlo, anota "QA visual pendiente" y Andrés lo revisa tras el merge.

# Inicio de ronda (dentro de ../ElectroShopVe-gemini), solo cuando Andrés mergeó la ronda anterior:
git status                                   # debe estar limpio
git switch -c gemini/R1 main                 # R1, R2, R3… según la ronda

# Cada tarea dentro de la ronda:
npx tsc --noEmit > /tmp/tsc-antes.txt 2>&1   # guardar errores previos
# ... hacer la tarea ...
npx tsc --noEmit > /tmp/tsc-despues.txt 2>&1
diff /tmp/tsc-antes.txt /tmp/tsc-despues.txt # NO debe haber errores nuevos
git diff --stat                              # revisa que solo cambiaron archivos de tu carril
# crea docs/plan/estado/G-XX.md (plantilla abajo)
git add <archivos concretos> docs/plan/estado/G-XX.md   # nunca "git add -A" a ciegas
git commit -m "[G-XX] descripción corta"
```
Plantilla de `docs/plan/estado/G-XX.md`:
```
# G-XX
Estado: HECHO            (o: Estado: BLOQUEADO — motivo)
Rama: gemini/RN
- Archivos: N
- Verificación: <salida de los greps>
- tsc: sin errores nuevos
- Notas / cosas raras vistas (sin arreglarlas):
```

Antes de empezar una tarea con dependencia (columna "Depende"), abre `docs/plan/estado/C-XX.md` de esa dependencia y confirma que dice `Estado: HECHO` (si el archivo no existe, no está hecha). Si no, elige otra tarea.

---

## 4. Tabla de colores (hex → token)

Aplica **solo** a clases con la forma `utilidad-[#hex]` (ej. `bg-[#2a63cd]`, `hover:text-[#6a6c6b]`, `from-[#1e4ba3]`, `border-[#e9ecef]/50`). Mayúsculas o minúsculas da igual.

| Hex | Token |
|-----|-------|
| `#2a63cd` | `brand-500` |
| `#1e4ba3` | `brand-600` |
| `#1a3b7e` | `brand-700` |
| `#1e3a8a` | `brand-700` |
| `#212529` | `ink` |
| `#1a1a1a` | `ink` |
| `#495057` | `ink-soft` |
| `#6a6c6b` | `muted` |
| `#6c757d` | `muted` |
| `#adb5bd` | `subtle` |
| `#dee2e6` | `line-strong` |
| `#e9ecef` | `line` |
| `#f8f9fa` | `surface` |
| `#ffffff` | `white` |
| `#10b981` | `success` |
| `#059669` | `success-strong` |
| `#f59e0b` | `warning` |
| `#d97706` | `warning-strong` |
| `#ef4444` | `danger` |
| `#dc2626` | `deal` |
| `#3b82f6` | `info` |
| `#0f172a` | `brand-950` |

Además: `slate-` → `gray-` (ej. `bg-slate-100` → `bg-gray-100`).
**No toques** hex dentro de `style={{ }}`, dentro de strings de JavaScript ni dentro de sombras arbitrarias (`shadow-[0_4px_20px_rgba(...)]`). Solo cuéntalos y anótalos en tu estado.

---

## 5. Tarjetas de tareas

### G-01 · Links a rutas inexistentes · Depende: —
Edita exactamente estas líneas (números según `main@0f86604`; si no coinciden, busca el texto):

| Archivo | Buscar | Reemplazar |
|---------|--------|------------|
| `app/canjear-gift-card/page.tsx` (~l.122) | `href="/customer/wallet"` | `href="/customer/balance"` |
| `components/cursos/CourseDetailClient.tsx` (~l.524) | `href="/customer/wallet"` | `href="/customer/balance"` |
| `app/customer/(dashboard)/orders/[id]/digital/page.tsx` (~l.225) | `router.push('/auth/login');` | `router.push('/login');` |
| `app/admin/(dashboard)/orders/[id]/digital/page.tsx` (~l.73) | `router.push('/auth/login');` | `router.push('/login?redirect=admin');` |
| `app/customer/(dashboard)/layout.tsx` (~l.61 y ~l.156) | `router.push('/auth/signin');` | `router.push('/login');` |
| `app/customer/(dashboard)/layout.tsx` (~l.150) | `callbackUrl: '/auth/signin',` | `callbackUrl: '/login',` |

Verificación:
```bash
grep -rnE "/customer/wallet|/auth/login|/auth/signin" app components
# Esperado: 0 resultados
```

---

### G-02 · Borrar componentes muertos · Depende: —
Lista cerrada (no borres nada más). Para **cada** fila, corre el grep de la columna "Verificar". Debe dar **0 resultados** fuera del propio archivo; si da otro resultado → NO lo borres y anótalo como `BLOQUEADO`.

| Archivo a borrar | Verificar (debe dar 0 fuera del propio archivo) |
|------------------|-----------------------------------------------|
| `components/AdminButton.tsx` | `grep -rn "components/AdminButton" app components contexts lib` |
| `components/FloatingTechIcons.tsx` | `grep -rn "FloatingTechIcons" app components contexts lib` |
| `components/ShaderWave.tsx` | `grep -rn "ShaderWave" app components contexts lib` |
| `components/SubtleParticles.tsx` | `grep -rn "SubtleParticles" app components contexts lib` |
| `components/YouTubeEmbed.tsx` | `grep -rn "YouTubeEmbed" app components contexts lib` |
| `components/admin/NotificationBell.tsx` | `grep -rn "admin/NotificationBell" app components contexts lib` |
| `components/admin/ReviewsWidget.tsx` | `grep -rn "admin/ReviewsWidget" app components contexts lib` |
| `components/admin/VerificationsTab.tsx` | `grep -rn "VerificationsTab" app components contexts lib` |
| `components/home/CategoryCarousel.tsx` | `grep -rn "CategoryCarousel" app components contexts lib` |
| `components/modals/RechargeModal.tsx` | `grep -rnw "RechargeModal" app components contexts lib` |

⚠️ `components/notifications/NotificationBell.tsx` y `components/modals/RechargeModalV2.tsx` **NO se borran** (sí se usan). El comentario `// Removed ReviewsWidget import` en `app/admin/(dashboard)/page.tsx` no cuenta como uso.
Borra con `git rm <archivo>`. Al final corre `npx tsc --noEmit` y compara con el archivo "antes".

---

### G-03 · Header y Footer en páginas legales y canje · Depende: —
**`app/privacidad/page.tsx` y `app/terminos/page.tsx`:**
1. Agrega los imports debajo de los existentes:
   ```tsx
   import PublicHeader from '@/components/public/PublicHeader';
   import Footer from '@/components/Footer';
   ```
2. Envuelve lo que devuelve el `return (` en un fragmento, así:
   ```tsx
   return (
     <>
       <PublicHeader />
       {/* ...el <div className="min-h-screen ..."> original, SIN cambios... */}
       <Footer />
     </>
   );
   ```
3. No cambies nada más del contenido.

**`app/canjear-gift-card/page.tsx`:** ya tiene `<PublicHeader />` en dos `return`. Agrega `import Footer from '@/components/Footer';` y, en **ambos** `return`, pon `<Footer />` como **último hijo** del `<div>` raíz (justo antes de su `</div>` de cierre).

Verificación:
```bash
grep -c "<Footer" app/privacidad/page.tsx app/terminos/page.tsx app/canjear-gift-card/page.tsx
# Esperado: 1, 1, 2
```

---

### G-04a · `alert()` → toast (verificar email) · Depende: —
`app/verificar-email/[token]/page.tsx`:
1. Agrega `import toast from 'react-hot-toast';` si no existe.
2. Reemplaza `alert(data.message || data.error);` por:
   ```tsx
   if (res.ok) { toast.success(data.message || 'Email reenviado'); } else { toast.error(data.error || 'No se pudo reenviar el email'); }
   ```
Verificación: `grep -n "alert(" "app/verificar-email/[token]/page.tsx"` → 0.

### G-04b · `alert()` → toast (checkout) · Depende: **C-01 y C-05 HECHO**
`components/checkout/CheckoutPagoMovilForm.tsx` (4 alerts) y `app/checkout/page.tsx` (1 alert): cada `alert('texto')` → `toast.error('texto')`. Agrega el import de `toast` si falta.
Verificación: `grep -rn "alert(" components/checkout app/checkout` → 0.

---

### G-05 · Tipografía legible (por lotes) · Depende: ver lote
Cada lote es una tarea, una rama y un commit.

| Lote | Rutas | Depende |
|------|-------|---------|
| G-05a | `app/customer components/customer` | — |
| G-05b | `components/modals components/social components/orders components/pago-movil components/reviews components/onboarding` | — |
| G-05c | `app/servicios components/servicios app/contacto components/contact app/solicitar-producto` | — |
| G-05d | `app/gift-cards app/canjear-gift-card app/cursos components/cursos app/creator` | — |
| G-05e | `app/login app/registro app/recuperar-contrasena app/verificar-email app/privacidad app/terminos` | — |
| G-05f | `app/admin components/admin` | hacer al final |
| G-05g | `app/carrito app/checkout components/checkout` | **C-01 y C-05 HECHO** |

**Paso 1 — reemplazo automático** (cambia `RUTAS` por las del lote):
```bash
RUTAS="app/customer components/customer"
find $RUTAS -type f -name '*.tsx' -print0 | xargs -0 sed -i -E \
  -e 's/text-\[(7|8|9|9\.5)px\]/text-[11px]/g' \
  -e 's/text-\[10px\]/text-xs/g' \
  -e 's/\bfont-(black|extrabold)\b/font-bold/g'
```
**Paso 2 — revisión manual de contadores circulares.** Lista los candidatos:
```bash
grep -rnE "text-\[11px\]" $RUTAS | grep "rounded-full" | grep -E "\b[wh]-(3|3\.5|4|4\.5)\b"
```
En cada resultado, dentro de ese mismo className, reemplaza el par `w-N h-N` (N = 3, 3.5, 4 o 4.5) por `min-w-5 h-5 px-1`. Nada más.

**Paso 3 — duplicados redundantes:** si en un mismo className queda `text-xs sm:text-xs` o `text-xs lg:text-xs`, borra la versión con prefijo.

Verificación:
```bash
grep -rnE "text-\[(7|8|9|9\.5|10)px\]|font-black|font-extrabold" $RUTAS
# Esperado: 0 resultados
git diff --stat   # solo archivos dentro de $RUTAS
```

---

### G-06 · Colores a tokens (por lotes) · Depende: **C-10 HECHO** (todos los lotes)
Mismos lotes y rutas que G-05 (`G-06a` … `G-06g`, con las mismas dependencias extra para `f` y `g`).
Antes de empezar, comprueba que los tokens existen: `grep -n "color-brand-500" app/globals.css` → debe aparecer. Si no aparece → `BLOQUEADO`.

**Paso 1 — reemplazo automático:**
```bash
RUTAS="app/customer components/customer"
find $RUTAS -type f -name '*.tsx' -print0 | xargs -0 sed -i -E \
  -e 's/-\[#2a63cd\]/-brand-500/gI' \
  -e 's/-\[#1e4ba3\]/-brand-600/gI' \
  -e 's/-\[#1a3b7e\]/-brand-700/gI' \
  -e 's/-\[#1e3a8a\]/-brand-700/gI' \
  -e 's/-\[#0f172a\]/-brand-950/gI' \
  -e 's/-\[#212529\]/-ink/gI' \
  -e 's/-\[#1a1a1a\]/-ink/gI' \
  -e 's/-\[#495057\]/-ink-soft/gI' \
  -e 's/-\[#6a6c6b\]/-muted/gI' \
  -e 's/-\[#6c757d\]/-muted/gI' \
  -e 's/-\[#adb5bd\]/-subtle/gI' \
  -e 's/-\[#dee2e6\]/-line-strong/gI' \
  -e 's/-\[#e9ecef\]/-line/gI' \
  -e 's/-\[#f8f9fa\]/-surface/gI' \
  -e 's/-\[#ffffff\]/-white/gI' \
  -e 's/-\[#10b981\]/-success/gI' \
  -e 's/-\[#059669\]/-success-strong/gI' \
  -e 's/-\[#f59e0b\]/-warning/gI' \
  -e 's/-\[#d97706\]/-warning-strong/gI' \
  -e 's/-\[#ef4444\]/-danger/gI' \
  -e 's/-\[#dc2626\]/-deal/gI' \
  -e 's/-\[#3b82f6\]/-info/gI' \
  -e 's/\bslate-([0-9]{2,3})\b/gray-\1/g'
```
**Paso 2 — reporte (no arreglar):** cuenta los hex que quedaron y anótalos en tu estado:
```bash
grep -rhoiE "\-\[#[0-9a-f]{6}\]" $RUTAS | sort | uniq -c | sort -rn
grep -rnoiE "['\"]#[0-9a-f]{6}['\"]" $RUTAS | wc -l   # hex dentro de style/JS
```

Verificación:
```bash
grep -rniE "\-\[#(2a63cd|1e4ba3|1a3b7e|212529|6a6c6b|e9ecef|f8f9fa|dee2e6)\]" $RUTAS
# Esperado: 0 resultados
grep -rn "slate-" $RUTAS
# Esperado: 0 resultados
```
Después, abre en el navegador 2 páginas del lote a 360px y a 1280px y confirma que los colores se ven igual que antes. Si algo quedó transparente o sin color → `BLOQUEADO` con el nombre de la clase.

---

### G-07 · Alturas de pantalla móviles · Depende: —
```bash
RUTAS="app/customer app/creator app/cursos components/cursos app/servicios app/contacto app/gift-cards app/canjear-gift-card app/login app/registro app/recuperar-contrasena app/verificar-email app/solicitar-producto app/privacidad app/terminos"
find $RUTAS -type f -name '*.tsx' -print0 | xargs -0 sed -i -E \
  -e 's/\bmin-h-screen\b/min-h-dvh/g' \
  -e 's/\bh-screen\b/h-dvh/g'
```
Verificación: `grep -rnE "\bh-screen\b|\bmin-h-screen\b" $RUTAS` → 0.

---

### G-08 · Controles visibles en táctil · Depende: —
En **estas 4 líneas exactas**, cambia `opacity-0 group-hover:opacity-100` por `lg:opacity-0 lg:group-hover:opacity-100`:

| Archivo | Cómo reconocer la línea |
|---------|------------------------|
| `app/customer/(dashboard)/wishlist/page.tsx` (~l.420) | botón con `<FiTrash2` (eliminar de favoritos) |
| `app/cursos/page.tsx` (~l.128) | overlay con el ícono de play `M8 5v14l11-7z` |
| `components/servicios/ServiciosPortfolio.tsx` (~l.211) | comentario `{/* Play overlay */}` |
| `components/reviews/ReviewForm.tsx` (~l.137) | texto `Ver requisitos` |

**NO** cambies `components/modals/RechargeModalV2.tsx` (ese es un brillo decorativo).
Verificación: `grep -rn "lg:group-hover:opacity-100" app/customer app/cursos components/servicios components/reviews | wc -l` → 4.

---

## 6. Qué hacer si…

| Situación | Acción |
|-----------|--------|
| `tsc` muestra errores nuevos | Revierte el archivo que los causó (`git checkout -- <archivo>`), anótalo como `BLOQUEADO` y sigue. |
| Ves un bug fuera de tu tarea | NO lo arregles. Anótalo en "Notas" de tu estado. |
| Necesitas un componente, token o endpoint | Escribe `PEDIDO: …` en tu estado. Claude lo resuelve. |
| Un archivo de tu carril tiene cambios de Claude sin mergear | No lo toques; espera a que esté en `main`. |
| El sed cambió algo que no debía | `git checkout -- <archivo>` y repite con cuidado, o marca `BLOQUEADO`. |
