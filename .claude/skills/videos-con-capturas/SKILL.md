---
name: videos-con-capturas
description: Cómo hacer reels y videos de Electro Shop con capturas reales de la tienda que se vean profesionales, no como pantallazos pegados. Úsala antes de capturar pantallas para un video, de armar un reel con el teléfono y la web, o cuando el equipo diga que las capturas "se ven cortadas", "mala resolución", "simple" o pida zoom, spotlight o efectos. Trae cómo capturar (página entera, capas fijas y tarjetas a 4x), la cámara (acercamientos y salidas), el spotlight, los toques, el ritmo para 9:16 y la revisión.
---

# Videos con capturas reales

## Por qué existe
El 18/11 el equipo vio la primera versión del reel C-300 y la rechazó: "las capturas están mal diseñadas, se nota que están mal cortadas por una mala resolución; Chispa no debe verse cortado abajo; donde señalas usa efectos spotlight; busca las mejores 5 skills de GitHub de capturas dinámicas y zoom con salidas; debemos hacer atractivo el video, no un video simple".

Esta skill junta lo que hacen esas cinco, en nuestras palabras y con nuestro motor (`chispa/`: HTML con `seek(t)`, grabado cuadro a cuadro). Sus programas no se instalaron: piden Chrome o licencias aparte. Las fuentes están al final.

## 1. Capturar (`chispa/herramientas/tienda/`)
- **Datos de prueba, nunca clientes.** Hay que sembrar datos realistas antes de capturar: una pantalla vacía o con "lorem ipsum" no sirve, y una con clientes reales no se puede publicar. `sembrar-sorteo.mjs` llena un esquema aparte con productos reales de la API pública y cuentas inventadas.
- **La tienda, compilada desde `main`:** el mismo código que va a producción, a 390 px de ancho, sin barra de desplazamiento.
- **La página entera a 3x, sin lo fijo.** El encabezado, la barra de abajo y el botón de WhatsApp se capturan aparte y van encima. Así la página se desplaza dentro del teléfono como en una grabación real, y lo fijo se queda quieto. Nada de pantallazos sueltos cortados a mitad de una sección.
- **Cada tarjeta importante, recortada a 4x.** Es la que se levanta con el spotlight: tiene que leerse nítida aunque la cámara se acerque 2,2x. Si trae algo que distrae (el Chispa del pie de un correo), se recorta.
- **`layout.json`:** el alto de cada página, sus capas fijas y la caja de cada tarjeta y de cada punto (en px de la página). La cámara y los aros se calculan con eso, no a ojo.
- `capturar-tienda.mjs` hace las tres cosas con Firefox sin ventana (WebDriver BiDi).

## 2. La cámara
- **1x o un acercamiento claro (1,6 a 2,2x), nunca a medias.** Un zoom de 1,1 a 1,5x solo recorta y parece una captura mal cortada; fue el error de la primera versión.
- **El acercamiento se calcula para que la tarjeta llene** sin salirse: unos 420 px de ancho y 520 de alto en el lienzo de 540 × 960. Si no llega a 1,6x, se muestra a 1x levantada.
- **Moverse lleva de 0,6 a 1,6 s; quedarse, 0,8 s o más.** Siempre se vuelve a 1x antes de cambiar de idea: es la "salida".
- **Las curvas:**
  - la cámara, `cubic-bezier(.45, 0, .15, 1)`, calma en los dos extremos;
  - lo que llega frenando (el desplazamiento de la página), `cubic-bezier(.23, 1, .32, 1)`;
  - **la cámara nunca con resorte**, porque se lee como temblor.
- **Una tarjeta alta se recorre por zonas:** primero una, después se desliza a la otra, sin volver a 1x. Así se hizo en "¡ya cuenta!": los amigos y después el boleto ganado.
- **La página frena sobre lo importante:** desacelera hasta dejar la tarjeta en el medio, debajo del encabezado. Nada se mueve en línea recta y pareja.

## 3. El spotlight y la tarjeta que se levanta
- **El spotlight oscurece y desatura lo de alrededor, sin hacer brillar el objetivo.** En el reel: un velo de 38 % con `brightness(.7) saturate(.3) blur(1.6px)` sobre la pantalla.
- **El objetivo es la tarjeta recortada a 4x**, encima del velo:
  - sube 5 px y crece un 4,5 % con un rebote chico;
  - su sombra de contacto crece al levantarse;
  - tiene un borde blanco fino.
- **Se apaga al terminar la idea:** el spotlight no dura más que la frase.
- **Lo exacto que se dice, con un aro** (azul de marca con halo blanco) o una ficha (+2, +5, +10). Uno por frase.
- **Un brillo que cruza la tarjeta, una sola vez por pieza principal.** No en todo.

## 4. Toques, etiquetas y texto
- **Un toque se ve:** el dedo llega primero (0,4 s, frenando), aprieta (se achica) y suelta una onda de 0,5 s. Lo que cambia, cambia después del toque.
- **Lo que no es la pantalla no se acerca con la cámara:** etiquetas, subtítulos y Chispa van fuera de ella y no tapan lo que se muestra.
- **La zona segura de 9:16** (en el lienzo de 540 × 960): x de 32 a 480, y de 135 a 750. Arriba y abajo están los botones de Instagram.
  - Los subtítulos y las etiquetas van adentro.
  - Los subtítulos, de 22 px o más (Poppins 700), con la palabra que suena resaltada.
- **El tiempo de lectura:** máx(0,8 s, 0,3 s por palabra).
- **Chispa siempre apoyado en el borde de abajo** del cuadro: nunca cortado a la altura de la cintura dentro del cuadro. Grande cuando habla solo; chico en la esquina cuando se ve el teléfono.

## 5. El ritmo
- **El cuadro 0 ya es el gancho**, sin aparecer desde la nada, porque es la miniatura.
- **Nada se queda quieto más de 0,8 s**, salvo el cierre.
- **Los golpes grandes (confeti, flash), tres como mucho**, en los momentos fuertes.
- **El cierre es lo de más energía:** todo junto (el premio, la fecha, la dirección y Chispa), y se queda un segundo o más.
- **Cada movimiento se ata a una palabra de la voz** (`D('palabra', desde)`), nunca a segundos a ojo.

## 6. La revisión antes de entregarlo
1. Cuadros sueltos en cada palabra clave (`render-firefox.mjs preview`): lo que dice contra lo que se ve, el aro sobre lo correcto, nada tapado.
2. Los valores de la línea de tiempo dentro de la página (`chispa/herramientas/evaluar.mjs`). Así se encontró un zoom calculado dos veces.
3. La tira de cuadros del video entero, y un cuadro achicado a 480 px de ancho: todo se lee como en un teléfono.
4. Con la voz real, rearmar y revisar otra vez: los tiempos cambian.

## Fuentes (leídas el 18/11)
- [autozoom-demo-skill](https://github.com/6space7/autozoom-demo-skill) (MIT): 1x o 1,6-2,2x, las curvas de cámara, los tiempos de mover y quedarse, la cámara que no muestra bordes, el toque que llega antes.
- [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) (Apache-2.0): la página entera a 2x y las tarjetas recortadas, `layout.json`, los datos de prueba realistas, el freno sobre el objetivo, la tarjeta que se levanta con sombra de contacto y "no repetir la misma técnica".
- [app-promo-reel](https://github.com/hamen/app-promo-reel) (MIT): la zona segura de 9:16, el cuadro 0 como gancho, nada quieto más de 0,8 s, la cámara sin resorte, los rebotes chicos en lo grande y el cierre que se queda.
- [motion-graphics-skills](https://github.com/imMamdouhaboammar/motion-graphics-skills), "video-spotlight". Su licencia es propietaria: solo se tomó la idea general (oscurecer y desaturar alrededor, empezar sutil, apagarlo a tiempo), sin copiar su texto ni su código.
- [Skill de Remotion de sickn33](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/remotion/SKILL.md) (sin licencia publicada) y [Vorec](https://github.com/MustaphaSteph/vorec-plugins) (MIT): acercamientos a zonas y paneo entre zonas.
