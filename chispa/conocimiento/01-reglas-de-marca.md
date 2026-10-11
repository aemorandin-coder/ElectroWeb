# 1. Reglas de marca (léelas antes de todo)

Electro Shop Morandin C.A. es una tienda de tecnología de Guanare, Portuguesa (Venezuela), con 14 años en el negocio. Andrés es el dueño y aprueba cada pieza. Se le habla en español, de forma directa y sin rodeos.

## Lo que nunca se hace
- **"Puntos ES", nunca "saldo".** Tampoco "billetera", "wallet" ni "monedero", y no se dice que el saldo se retira o se transfiere (ley venezolana, regla del 30/09). Los montos van como "$13,31 Puntos ES".
- **Sin emojis.** Ni en textos del video, ni en subtítulos, ni en código. Se usan íconos de línea (`herramientas/icons.js`, estilo Feather). Ojo: los cuatro primeros reels (`referidos`, `sin-miedo`, `taller`, `l2control`) traen emojis en los chats simulados y en los títulos POV, y así se publicaron. No se copian: en un video nuevo van íconos.
- **Nada de cuentas, teléfonos ni datos reales de terceros.** Si hace falta un estafador o un cliente de ejemplo, se inventa.
- **Nada de credenciales en el repositorio** (es público). La clave de ElevenLabs no se pega en el chat ni en archivos: va como secreto del entorno.
- **No se usa Motion.so** ni servicios de video de pago. Todo se hace con las herramientas de esta carpeta (pedido de Andrés: no tiene créditos ahí).

## Datos de la empresa (los únicos que se usan)
- Web: **electroshopve.com**
- WhatsApp: **+58 257 251 1282**
- Guanare, Portuguesa. Envíos a toda Venezuela por **ZOOM y MRW**. Pago con **Pago Móvil**.
- Letra pequeña del cierre: "Electro Shop Morandin C.A. · RIF J-40590333-3" y el aviso de que las marcas son de sus dueños.
- Lo que hace la empresa, en tres partes:
  1. **Vende** tecnología, gaming, gift cards y recargas, y **energía (UPS e inversores), y los instala**.
  2. **Repara**: taller con ingeniero (consolas, PC gamer, cámaras, redes, puntos de venta).
  3. **Desarrolla software**: L2 Control (sistema para restaurantes; lo usa Abby Kingdom en Guanare).
  - En software también vende **licencias de Windows original, Microsoft 365 y planes de IA**. Andrés lo quiere dicho así de directo: "¡Todo lo encuentras con nosotros!".
- **Pista Rides** (app para pedir viajes) está por lanzarse: solo su logo oficial (`assets/simbolo-negro.svg`, `assets/logo-claro.svg`), su amarillo, "una app para pedir viajes" y pistarides.com. Nada más hasta el lanzamiento.
- **Cursos**: sección de la web que viene "muy pronto". Se invita a especialistas en tecnología o energía a postularse como creadores.

## Colores y letras
Los mismos tokens de la tienda (están en `herramientas/base.css`):
- Azul de marca `--brand-500: #2a63cd` (el círculo de Chispa), `--brand-600: #1e4ba3`, `--brand-700: #1a3b7e`.
- Tinta `--ink: #212529`, acento cian `--accent: #22d3ee`, verde `--success: #10b981`.
- **Poppins** (500 a 800) para títulos y subtítulos grandes; **Inter** para lo que va dentro del teléfono (la web). Nunca pesos 900 ("black").

## El estilo de la serie
Sale del reel de Vale y lo eligió Andrés:
- Fondo oscuro con cuadrícula para el problema; paso al azul con franjas diagonales para la solución.
- Píldora blanca arriba con el título (`.cap`), iPhone al centro con la web, etiquetas inclinadas (`.stk`).
- **Subtítulos siempre**, palabra por palabra, en la píldora de abajo. No deben tapar nada importante (si un sello o tarjeta choca con los subtítulos, se mueve el sello).
- **Coherencia entre lo que se dice y lo que se ve.** Si Chispa habla de cursos, el teléfono muestra la sección de cursos, no productos. Andrés revisa segundo a segundo.
- **El cierre de la serie** (`assets/cierre.mp4`, aprobado el 02/10) va al final de cada reel: logo en píldora, "Compra tecnología **sin miedo**", píldoras con web, WhatsApp, Guanare y envíos, la tarjeta "Envíos por" ZOOM y MRW y la letra pequeña. Su fuente está en `videos/sin-miedo.src.html` (`<div id="end">`, sección `// ===== 8. Cierre`).

## Reglas de entrega de Andrés
- **Cada reel se entrega con su portada** de una vez (ver `06-piezas-y-medidas.md`). Pedido del 11/10.
- **Voces sin límite:** si una escena queda mejor con una frase nueva de Chispa, se le pide la voz a Andrés. Nunca se recorta el guion por ahorrar voces. Dicho el 11/10.
- Los tiempos de cada palabra salen de la **transcripción de ElevenLabs**, nunca calculados.
- Se entrega el MP4, la portada y, si se pide, la descripción de Instagram con hashtags. La música se pone en Instagram al publicar; el video lleva voz y efectos suaves.
- Antes de entregar: revisar cuadros sueltos en los momentos clave (lo que dice contra lo que se ve, los subtítulos y los cortes).
