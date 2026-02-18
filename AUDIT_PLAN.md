# Auditoría de Mejores Prácticas y Rendimiento Next.js

Esta auditoría combina reglas de arquitectura moderna y optimización de rendimiento crítica para Next.js 14/15.

## 🚨 Escala Crítica (Prioridad Alta)

Estos problemas bloquean el rendimiento percibido (LCP, INP) o la seguridad inmediata.

### 1. Cascada de Datos en Cliente (Client-Side Waterfalls)
**Ubicación:** `app/admin/(dashboard)/products/page.tsx`
*   **Problema:** Componente de cliente (`'use client'`) haciendo `fetch()` secuencial o paralelo al montar (`useEffect`).
*   **Impacto:** El navegador debe descargar JS -> Hidratar -> Ejecutar Efecto -> Llamar API -> Esperar Respuesta. Esto añade 300ms-1s de latencia innecesaria.
*   **Corrección:** Convertir la obtención de datos inicial (`products`, `categories`) a **Server Component** (`layout.tsx` o wrapper) y pasar datos como props.

### 2. Archivos Monolíticos (> 1000 líneas)
**Ubicación:** `app/admin/(dashboard)/products/page.tsx`
*   **Problema:** Mezcla UI, Estado, Lógica de Negocio (Excel, Sades), y Efectos.
*   **Impacto:** Fallos de hidratación potenciales, dificultad de mantenimiento, bundle size excesivo para la ruta.
*   **Corrección:** Refactorizar en componentes atómicos:
    - `ProductStats.tsx` (Server Component)
    - `ProductTable.tsx` (Client component)
    - `SadesSyncPanel.tsx` (Client component)

### 3. Autenticación en Server Actions
**Estado:** El proyecto usa principalmente Route Handlers (`/api/...`), no Server Actions.
*   **Riesgo:** Si se migra a Server Actions en el futuro, es vital validar la sesión (`useSession` o `auth()`) *dentro* de la acción, no solo en el middleware.

## ⚠️ Escala Media (Optimizaciones)

### 4. Importación de Iconos
**Ubicación:** Múltiples componentes (`react-icons`).
*   **Problema:** `import { FaUser } from 'react-icons/fa'` puede inflar el bundle si el tree-shaking falla.
*   **Corrección:** Verificar configuración de SWC o usar imports directos si se nota lentitud: `import { FaUser } from '@react-icons/all-files/fa/FaUser'`. (Menor prioridad si usas Next.js 14+ con SWC).

### 5. Estilos Globales Inyectados
**Ubicación:** `components/UserAccountButton.tsx`
*   **Problema:** `<style jsx global>` afecta a toda la app al montar el componente.
*   **Corrección:** Mover keyframes a `tailwind.config.ts`.

### 6. Componentes Pesados en Cliente
**Ubicación:** `components/ShaderWave.tsx`
*   **Estado:** Usa WebGL nativo (Excelente, sin Three.js).
*   **Recomendación:** Si no es visible inmediatamente (ej: footer), cargarlo con `next/dynamic` para reducir el JS inicial.

---

## 📅 Plan de Acción Inmediato

**Paso 1: Rendimiento Admin (Día 1)**
1.  [ ] **Extraer Lógica de Datos:** Crear `lib/data/products.ts` con funciones directas a Prisma.
2.  [ ] **Server Component Wrapper:** Crear `app/admin/(dashboard)/products/ProductsWrapper.tsx` (Server Component) que llame a `getProducts()` y renderice el cliente.
3.  [ ] **Refactor de Página:** Modificar `page.tsx` para aceptar `initialData` y eliminar el `useEffect` de carga inicial.

**Paso 2: Limpieza de Código (Día 2)**
4.  [ ] **Atomizar Dashboard:** Dividir el monolito de productos en `src/components/admin/products/...`.
5.  [ ] **Extraer WebGL:** Asegurar que `ShaderWave` se cargue dinámicamente si no es LCP.

**Paso 3: Seguridad Sades (Día 3)**
6.  [ ] **Validar Webhook:** Verificar que el endpoint de Sades (`app/api/webhooks/sades/route.ts`) valide firma criptográfica y maneje errores silenciosamente para evitar fugas de información.

---

## ✅ Checklist de Desarrollo Diario

- [ ] **No Fetch en Cliente:** ¿Puedo obtener estos datos en el servidor antes de renderizar?
- [ ] **Dynamic Imports:** ¿Este componente pesado (mapa, gráfico, editor) es visible al cargar? Si no -> `dynamic(() => import(...))`
- [ ] **React-Icons:** ¿Estoy importando toda la librería o solo lo que necesito?
- [ ] **Server Actions:** Si creo una acción nueva -> ¿Tiene `const session = await auth(); if (!session) throw new Error(...)`?
