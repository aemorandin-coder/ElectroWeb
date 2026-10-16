# 7. Historial: cada video, qué pidió Andrés y qué se corrigió

Las fechas son de 2026. Los MP4 los tiene Andrés; aquí quedan las fuentes.

## "El pana que sabe de tecnología" (referidos y Puntos ES)
- `videos/referidos.html`, reel de 27 s. Publicado en Instagram el 02/10.
- El primero de la serie. Explica el programa de referidos con "Puntos ES" (nunca "saldo").

## "¿Y si es estafa?" (confianza)
- `videos/sin-miedo.src.html`, reel de 30,6 s, v3 (02/10).
- Muestra una empresa real, el pago con Pago Móvil, el seguimiento del pedido, la garantía y el WhatsApp. El vendedor estafador es inventado.
- **Su final es el cierre de la serie** (`assets/cierre.mp4` y `assets/cierre.png`). Andrés lo eligió para todos los reels.

## Taller (14 años, con ingeniero)
- `videos/taller.src.html`, reel v2. Usa clips reales del taller: hay que poner los clips y correr `herramientas/cuadros.sh` antes de grabar.

## L2 Control (Abby Kingdom)
- `videos/l2control.src.html`, reel de 45 s, v1. Muestra las pantallas reales del sistema, la comanda y el recibo (`assets/ticket-*.html`). También usa clips.

## "La ficha de Electro Shop" (Chispa con voz)
- `videos/ficha.src.html`, reel de 89 s, v2 (09/10). Voz: `chispa-ficha`.
- Qué dice: no somos solo una tienda. **Vendemos** (con energía: UPS e inversores, y los instalamos), **reparamos** (taller con ingeniero) y **desarrollamos** (L2 Control, que usa Abby Kingdom). Cierra con Pista Rides "muy pronto".
- Correcciones:
  - En v1, del segundo 16 al 22, lo que decía Chispa no coincidía con lo que se veía: los tiempos se habían calculado. Se rehízo con la transcripción de ElevenLabs.
  - Faltaba "Energía, UPS e Inversores" en lo que vendemos ("necesidad importante en el país, también lo instalamos"). Se grabó el bloque "Vendemos" aparte.
  - Íconos en lugar de fotos sueltas ("Usa íconos").
  - "Cuida los subtítulos y la coherencia."

## "La ficha" para YouTube
- `videos/ficha-yt.src.html`, 16:9, 1:38. Entregada el 10/10.
- Miniatura `piezas/miniatura-ficha.html`. Banner del canal en 3 medidas, `piezas/banner-youtube.html`.
- Lleva 12 s más al final para la pantalla final de YouTube. Capítulos de 10 s o más.

## Chispa 2.0 (10/10)
- `mascota/chispa.js`. Andrés pidió "pulir a Chispa, mejorar sus gráficas y movimientos, pero manteniendo ese estilo".
- Qué cambió: muñeco articulado con transiciones suaves, boca por vocales, parpadeo, respiración, pelo con inercia, giro de frente a espalda y poses de espalda.
- Correcciones de Andrés:
  - sin la franja azul de la muñeca ("rompe las manos");
  - pulgares en los puños;
  - "celebra" con los pulgares a la altura del pecho, no tan altos.
- Demos: `videos/chispa-demo.src.html` y `videos/chispa-giro.html`.

## "El nuevo del equipo" (Andrés real en Google Flow + Chispa)
- Reel de 55 s, v4 publicada (11/10). Guion: `guiones/guion-andres-chispa.md`. Receta: `herramientas/montaje-andres-chispa.sh`. Portada: `piezas/portada-andres-chispa.html`.
- Cómo llegó a v4:
  1. **v1 (24 s):** los dos clips de Flow con la voz de Chispa reemplazada por Diego y la capa de textos. Andrés: "hace falta contexto, es muy agresivo los dos videos de una".
  2. **v2:** Chispa entra solo y se presenta antes del clip real (`chispa-entrada`). Andrés pidió ser "mucho más directo" en software: "Licencias de Windows original, Microsoft 365, planes para IA, ¡todo lo encuentras con nosotros!".
  3. **v3:** una escena animada entre los dos clips para que el corte no se note forzado: los Cursos que vienen pronto en la web (`chispa-medio`).
  4. **v4:**
     - en el segundo 50 se colaba una pantalla del teléfono: se arregló con `-ss 0.2` en el cierre;
     - en el 28, Chispa hablaba de cursos mientras el teléfono mostraba productos: ahora muestra la sección de Cursos;
     - los pulgares de "celebra" quedaron más bajos.
- Regla nueva que salió de aquí: **cada reel se entrega con su portada**.

## Portadas de historias destacadas (11/10)
- `piezas/destacada.html`: diez portadas con Chispa y un ícono, "sin sobrecargar" (lista en `06-piezas-y-medidas.md`).

## Ideas pendientes (Andrés no las ha pedido todavía)
- Plantilla de historias "Domingo de web".
- Calendario de contenido de dos semanas.
- Chispa en la tienda web (C-179, antes C-176): aprobado como plan, sin código.
