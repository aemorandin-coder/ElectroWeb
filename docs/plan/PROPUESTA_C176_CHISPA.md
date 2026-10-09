# C-176 · Chispa en la tienda (propuesta aprobada, sin código todavía)

> Aprobada por Andrés el 09/10 ("Dale si") después de ver las dos maquetas, en la computadora y en el teléfono. **Pidió dejarla como plan para la próxima sesión, sin mover código.**
> Maquetas: videos `Chispa_web_saludo.mp4` (1920 px) y `Chispa_web_telefono.mp4` (teléfono), hechos sobre capturas reales de la tienda. La mascota vive hoy en `marketing/reels/assets/mascota/chispa.js` (Chispa 2.0, rama `claude/intelligent-faraday-ffk6um`).

## 1. Qué es
Chispa, la mascota de Electro Shop, se asoma en la esquina de la tienda, saluda y ofrece ayuda. Es un atajo a dos cosas que ya existen: el buscador del encabezado y el WhatsApp. No es un chat ni un asistente con IA.

## 2. Cómo se comporta (lo que Andrés aprobó en las maquetas)
1. **Espera unos segundos** (unos 4) después de cargar la página y solo si la persona no está escribiendo.
2. **Se asoma** desde abajo en la **esquina izquierda** (la derecha es del botón de WhatsApp):
   - **Computadora:** desde el borde de la ventana, unos 220 px de alto.
   - **Teléfono:** desde detrás de la barra de abajo (Inicio, Productos, Categorías…), unos 75 px de alto.
3. Primero muestra la cabeza y mira a los lados; luego sale con un rebote y **saluda con la mano**.
4. **Globito** a su lado: "¡Hola! Soy Chispa. ¿Te ayudo a encontrar algo?", con dos botones:
   - **Buscar:** Chispa señala arriba, el buscador del encabezado se ilumina y recibe el foco. En el teléfono es el buscador compacto, "¿Qué estás buscando?". El globito cambia a "¡Dale! Escribe aquí arriba lo que buscas".
   - **WhatsApp:** abre el mismo enlace que el botón verde, con el número de Configuración.
5. **Se despide y se esconde**, dejando el **copete asomado**. Al tocarlo vuelve a salir con el globito.
6. **X para cerrar:** si la persona la cierra, no vuelve a salir en esa visita.

## 3. Dónde sale y dónde no
- **Sale:** inicio, `/productos`, categorías y la ficha de producto.
- **No sale:** carrito, checkout, `/admin`, `/creator`, panel del cliente, login, registro y recuperar contraseña (las mismas rutas de acceso que ya usa `esRutaDeAcceso` en `components/WhatsAppButton.tsx`).
- **Frecuencia:** **una vez por visita** (`sessionStorage`). Los accesores van en try/catch: si fallan, no sale, en lugar de salir en cada página.

## 4. Diseño técnico propuesto
- **Componente cliente** `components/public/ChispaSaludo.tsx`:
  - se carga con `next/dynamic` y `ssr: false` después de que la página está lista (`requestIdleCallback`);
  - no entra en el LCP ni mueve nada: posición fija, CLS 0.
- **El dibujo:** se porta `chispa.js` a un módulo TypeScript (`lib/chispa/rig.ts`) que devuelve el SVG como texto (lo mismo que en los reels: tinta, colores planos, sin imágenes).
  - Pesa pocos KB y no trae fuentes nuevas. La placa "ES" usa la fuente de la marca que ya carga la tienda.
- **La animación:** un `requestAnimationFrame` que solo corre mientras Chispa está a la vista. Se reusan `linea()` (transiciones entre poses), `vida()` (parpadeo y respiración) y la boca mientras se escribe el globito.
  - Se detiene al cerrarla o esconderla.
  - **Nada infinito** (regla de `CLAUDE.md`): la secuencia termina y queda el copete quieto.
- **`prefers-reduced-motion`:** aparece quieta, sin rebote ni saludo, con el globito.
- **Capas:** `z-[var(--z-bottomnav)]`, debajo de drawers, modales, toasts y el popup promocional.
  - En el teléfono se sube con `bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))]` y queda recortada por arriba de la barra.
  - Si el popup promocional está abierto, Chispa espera a que se cierre.
- **Colores y tipografía:** solo tokens de `PLAN.md` §1: `brand-500` en el botón Buscar, `ink`, `line` e Inter. Sin hex en `className` y sin `font-black`.
- **Accesibilidad:**
  - el globito con `role="dialog"`, `aria-label="Chispa, ayuda de Electro Shop"` y `aria-live="polite"`;
  - la X con `aria-label="Cerrar"`, Escape cierra, y todo se puede usar con teclado;
  - nada depende de pasar el ratón por encima.
- **El buscador:** `HeaderSearch` ya recibe `id`. Se le da foco por ese `id` (sin tocar su lógica). En el teléfono, si el buscador está fuera de vista, la página sube primero.
- **Textos:** sin emojis (regla de `CLAUDE.md`), con íconos `react-icons` (`FiSearch`, `FaWhatsapp`, `FiX`).
- **Interruptor en el panel** (pregunta abierta, §6): encender o apagar a Chispa desde Configuración sin deploy.

## 5. Verificación (al hacerla)
- `npm run lint`, `npx tsc --noEmit` y `npm run build`.
- Prueba de humo (`scripts/e2e/humo.ts`) sin cambios en el resultado.
- Capturas a **360, 390, 768, 1024 y 1440 px**:
  - Chispa no tapa el botón de comprar, la barra de abajo ni el WhatsApp;
  - el globito cabe a 360 px.
- `prefers-reduced-motion` encendido: aparece quieta.
- Cerrar con la X y navegar: no vuelve a salir en esa visita.
- Lighthouse del inicio antes y después: LCP y CLS sin empeorar.
- Que no salga en carrito, checkout, admin ni login.

## 6. Preguntas para Andrés antes de programar
1. **El texto del saludo:** ¿"¡Hola! Soy Chispa. ¿Te ayudo a encontrar algo?" o algo más venezolano?
2. **¿Interruptor en Configuración** para apagarla sin deploy? Recomendado; sería un campo más en los ajustes públicos.
3. **Frecuencia:** ¿una vez por visita (propuesto) o una vez al día?
4. **¿También en la ficha de producto?** Ahí compite con el botón de comprar. Propuesta: sí en la computadora; en el teléfono solo el copete, sin salir sola.

## 7. Fuera de alcance
Chat, respuestas con IA y mensajes según el producto. Eso sería otra tarea, si los números de uso de esta lo justifican.
