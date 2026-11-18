---
name: herramientas-claras
description: Cómo se hace una herramienta de Electro Shop que se entiende sola (panel o tienda). Úsala antes de crear o rediseñar cualquier pantalla, asistente, ajuste, formulario, guía, mensaje de error o paso que alguien tenga que seguir, aunque sea chico, y al revisar una. Sobre todo si pide algo de afuera (una app, un código, un archivo, una cuenta) o si lo va a usar alguien que no es técnico, como la contadora, un cliente o alguien nuevo del equipo.
---

# Herramientas que se entienden solas

## Por qué existe
El 18/11 la contadora se trabó en los dos pasos. No sabía qué era "una app de códigos" ni qué tenía que hacer después. La pantalla decía "Google Authenticator o Authy. Son gratis y están en Play Store y App Store": dos nombres sin dibujo, sin enlace y sin el paso siguiente.

El equipo lo hizo regla para todo lo que se construya: **mensajes claros, íconos, poco texto, muy gráfico, con ejemplos de las herramientas de afuera y dónde se bajan.**

**La prueba de la contadora:** ¿alguien que nunca lo vio lo hace sola, en el teléfono, sin escribirle a nadie? Si no, no está terminado.

## Las 10 reglas

1. **Primero qué es y para qué, en una frase.** Va antes de pedir algo.
   - Bien: "Una app gratis del teléfono que te da un número nuevo cada 30 segundos. Sin ese número nadie entra con tu contraseña."
   - Mal: "Configura la verificación en dos pasos con una app de códigos".
2. **Lo de afuera, con su nombre, su logo y dónde se baja.**
   - Siempre dos o tres ejemplos reales, el recomendado primero: Google Authenticator, Microsoft Authenticator, Authy.
   - Al lado, "Android: Play Store" y "iPhone: App Store", con el botón que abre la tienda.
   - En la computadora, el QR para abrir la tienda desde el teléfono.
   - Si es una página o un archivo de afuera (claude.ai, Drive, el Excel del banco), también: cuál y dónde se encuentra.
3. **Cada paso dice qué viene después.** Al terminar, una línea del siguiente ("Después: cada vez que entres te pedimos ese número"). Al final, cómo será de ahora en adelante, dibujado.
4. **Un paso, una acción.**
   - Más de dos pasos va con `components/admin/Pasos`, cada paso con su ícono (`PLAN.md` §1.6), de 2 a 4 campos por paso.
   - El botón dice adónde lleva ("Siguiente: escanear el código"), no "Continuar".
5. **Dibuja en vez de explicar.**
   - Si hay que tocar algo en otra pantalla (la app del teléfono, el banco, claude.ai), se dibuja esa pantalla simplificada con el botón que hay que tocar marcado ("+", "Escanear código QR").
   - Un antes → después en lugar de un párrafo; un ejemplo en lugar de una regla.
6. **Poco texto, medido.**
   - El título, de 2 a 5 palabras, y una frase de hasta 65 caracteres.
   - Como mucho una línea de ayuda por campo. Lo demás, detrás de (i) (`components/admin/Ayuda`), que se abre al tocar.
   - Si un texto pasa de dos líneas en el teléfono, sobra algo.
7. **Las palabras de quien lo usa, no las del código.**
   - "El número de 6 cifras de tu app", no "código TOTP".
   - "Llaves de repuesto", no "códigos de respaldo de un solo uso".
   - "Esta computadora", no "este dispositivo", cuando se sabe cuál es.
   - "Puntos ES", nunca saldo (`CLAUDE.md`).
8. **Un error dice qué hacer.**
   - Bien: "Ese número ya cambió. Escribe el que ves ahora en la app."
   - Mal: "Código inválido".
   - Nunca "Contacta al administrador" sin decir quién es y cómo: el botón de WhatsApp o el nombre de la persona.
9. **Siempre hay una salida.** "¿Te trabaste?" con quién ayuda y cómo, y "¿No tienes el teléfono?" con el camino de repuesto. Nadie queda encerrado en una pantalla.
10. **Se mueve una vez y se ve en el teléfono.**
    - El ícono se dibuja y hace su gesto una vez (`IconoDibujado`). Con "reducir movimiento", todo quieto y completo.
    - Primero el teléfono (360 px) y después la computadora. Nada que dependa de pasar el ratón.

## Las piezas que ya existen (no inventes otras)
- **Guiar:**
  - la hoja "Así funciona" (`components/onboarding/AsiFunciona`): tres íconos y un botón;
  - el recorrido (`GuidedTour`) y Chispa (`ChispaGuia`), con las reglas de `PLAN.md` §1.11.
- **Pasos y asistentes:** `components/admin/Pasos`, y para crear o cambiar algo, `components/admin/Asistente` con "Revisar y publicar" (§1.9).
- **Elegir:** `components/admin/Opcion` (§1.10), por ejemplo para elegir la app.
- **Campos:** del tamaño de su dato (§1.5), con `CampoUnidad` para un número con su unidad.
- **Avisos:** `adminNotice` y `avisoAccion` de `lib/admin-ui.ts`. Lo que alguien tiene que hacer va en azul, nunca en ámbar.
- **Íconos:**
  - los del pack (`@/components/iconos`);
  - los logos de las apps y tiendas de afuera, de `react-icons` (solo logos de marca: `SiGoogleauthenticator`, `FaMicrosoft`, `SiGoogleplay`, `SiAppstore`);
  - si una no tiene logo (Authy), su nombre en una placa, sin inventar un dibujo de otra marca.

## Antes de dar por hecha una herramienta
- [ ] La prueba de la contadora: alguien sin contexto la hizo de punta a punta en el teléfono (o se simuló así, paso por paso, con capturas a 360 px).
- [ ] La primera frase dice qué es y para qué.
- [ ] Lo de afuera tiene su nombre, su logo y dónde se baja.
- [ ] Cada paso dice qué viene después, y el final dice cómo será de ahora en adelante.
- [ ] Ningún texto pasa de dos líneas en el teléfono; lo demás va detrás de (i).
- [ ] Cada error dice qué hacer, y hay una salida con quién ayuda.
- [ ] Íconos del pack y colores del kit (`npm run check:marca`); nada ámbar.
- [ ] Revisada a 360, 768, 1024 y 1440 px, y con "reducir movimiento".

## Cuándo no hace falta tanto
Un ajuste de un solo campo que el equipo ya conoce (un número, un interruptor) no lleva hoja ni pasos: le bastan un título claro, una línea y su (i). La regla de fondo es la misma: que se entienda sin preguntar.
