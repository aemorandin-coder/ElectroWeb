---
name: manos-de-caricatura
description: Cómo dibujar y animar manos de caricatura como los estudios clásicos (Disney, Hanna-Barbera, la animación japonesa). Úsala antes de dibujar, cambiar o revisar cualquier mano de Chispa (chispa/mascota/chispa.js) o de otro personaje, antes de animar un gesto con las manos y cuando el equipo diga que una mano "se ve rara", "parece una dona", "está amontonada" o "le sobra algo". Trae la construcción, el pulgar y el índice (pinza, OK, sostener), cómo se anima un cambio de forma y la revisión antes de mostrarla.
---

# Manos de caricatura

## Por qué existe
El 18/11 el equipo pidió, al revisar las manos de Chispa 3.1: "investiga cómo hicieron estos dedos los mejores animadores (tipo Hanna-Barbera o Toei) y cómo resolvieron las manos animadas". Lo que lo provocó fue el OK. El pulgar y el índice eran una dona redonda pegada a la palma, con un bulto abajo donde el aro se juntaba con la palma ("el pómulo del pulgar abajo es muy exagerado").

Esta skill junta lo que enseñan los que hicieron escuela. Las fuentes están al final; lo que no se pudo comprobar está marcado.

## Las 12 reglas de la construcción
1. **Nunca se empieza por los dedos.** Primero las dos masas: la palma y el bloque de los dedos, en el gesto que se quiere; después se dibujan los dedos dentro de ese bloque (John Kricfalusi, de Hanna-Barbera y *Ren & Stimpy*, siguiendo a Preston Blair).
2. **Primero un mitón.** La palma es una caja que se dobla desde la muñeca; el antebrazo la gira; la base del pulgar se pega al costado (Preston Blair, Disney).
3. **Cuatro partes, no una.** La palma, la base del pulgar, el pulgar y los otros cuatro dedos se miran y se dibujan por separado (お絵かき図鑑, por un animador).
4. **Los dedos son tubos por falange**, de grosor parejo, que se afinan apenas hacia la punta (CLIP STUDIO; 円柱で関節ごとに). En Chispa, cada falange recta es una `capsula`; un dedo doblado del todo es un `arcoDedo` (más abajo).
5. **Los dedos se doblan en el nudillo de arriba de la palma, no en el pliegue de abajo de los dedos.** Es el error más común (お絵かき図鑑: 指の付け根ではなく、手のひら上部の中手骨と指骨の関節で).
6. **Las puntas y los nudillos hacen un arco.** El medio es el más largo, el índice y el anular parecidos, el meñique más corto, más fino y más bajo. Al agarrar algo, el anular suele quedar más largo que el medio.
7. **Nada de dedos parejos.** Uno se separa del grupo; el meñique se pone distinto para que no sea monótono (Blair; Richard Williams).
8. **El pulgar no va paralelo a los dedos.** Mira hacia el otro lado y sale de una inserción triangular al costado de la palma. Si va paralelo, la mano se aplana (Proko).
9. **El pulgar tiene dos tramos y un quiebre marcado.** Lo que hace que se lea como pulgar es el ángulo entre sus dos tramos (Blair, citado por animadores en Gurney Journey). En Chispa es corto y grueso; la uña solo se le ve cuando se le ve la punta.
10. **La base del pulgar (la eminencia tenar) se mueve con el pulgar y cambia la línea de la palma.** Blair dice que se exagere, pero en Chispa el equipo la quiere discreta: **la base del pulgar nunca sale de la línea de la palma como un bulto**.
11. **El espacio entre el pulgar y el índice es lo que hace humana la mano** (お絵かき図鑑: この空間こそが、人間らしい手を描くポイントです). Se ve como el hueco del OK o como la membrana cuando se abren. No se rellena.
12. **Un poco de detalle en lo huesudo** (los nudillos, el quiebre del pulgar) vende la mano sin volverla una manguera de goma (Eric Goldberg, Disney). Con poco basta: una raya, un ángulo.

## El pulgar y el índice: el OK, la pinza y sostener
Es lo más difícil, porque son los dos dedos que se tocan.
- **El aro son dos dedos, no una dona.** El índice sale de la palma y se curva hacia abajo; el pulgar sube desde su base. Las puntas se tocan. El hueco queda redondo y chico, del ancho de un dedo como mucho.
- **Cada dedo tiene que reconocerse** por cuatro cosas:
  - la raya donde se tocan las puntas;
  - la uña del pulgar, que dice cuál es;
  - la línea entre el índice y el medio;
  - la línea suave de la base del pulgar dentro de la palma.
- **El pulgar es apenas más grueso que el índice en el aro.** Si es mucho más grueso, la parte de abajo del aro se vuelve una bola. Eso fue el "pómulo" del 18/11.
- **Debajo del aro, el costado de la mano baja derecho hasta la palma.** Sin escalón ni bulto donde el aro se junta con ella.
- **El hueco se ve a través de la mano:** se recorta con una máscara con un id propio por cada Chispa, nunca se pinta con un color de fondo inventado. Su borde es una línea fina (3,4).
- **La pinza y sostener algo chico** se dibujan igual: primero el objeto, después las puntas que lo tocan. Con un objeto, el arco de los dedos no queda recto (CLIP STUDIO). Al agarrar un envase, el meñique hace la fuerza y el índice solo acompaña (お絵かき図鑑).
- **En una silueta en negro el OK tiene que leerse:** el hueco a 64 px y, aunque sea un punto, a 32 px.

## Animar las manos
Lo que resolvieron los animadores, según *The Animator's Survival Kit* de Richard Williams:
1. **Un cambio de forma tiene su propio tiempo.** El ejemplo de Eric Larson va del puño al índice que señala. O se sale suave del puño, o se sale rápido del puño y se llega suave al índice. Para algo tranquilo, más dibujos en el medio. En Chispa, la mano cambia de forma en el primer tercio del gesto (`linea`) y llega con el rebote.
2. **"Ve a otro lado en el medio"** (Emery Hawkins). Entre dos formas, la mano pasa por una intermedia (medio abierta, medio cerrada), no se desliza de una a otra. Para eso hace falta dibujar esa mano intermedia: es lo siguiente de las manos animadas de Chispa.
3. **La mano llega tarde, como arrastrada.** El brazo llega primero y la mano lo sigue, con un poco de rebote en cada punta del movimiento. Las articulaciones se doblan en orden, del hombro a los dedos. En Chispa, la muñeca gira un instante después que el brazo (`kg` en `linea`).
4. **Una mano quieta pierde la vida.** Mientras espera, se mueve apenas. En Chispa lo hace `vida()`: la muñeca se mece un grado.
5. **Primero el contacto, después el agarre.** Al tomar algo, los dedos tocan antes de cerrarse.
6. **El volumen no cambia en el camino.** La mano no crece ni se achica entre una forma y otra. Un dibujo intermedio malo arruina la mejor animación (Grim Natwick).
7. **Nada de manos gemelas.** Las dos manos no hacen lo mismo al mismo tiempo. Con las dos a la vista, la izquierda va en espejo (`espejo: true`) y con otro tiempo.

## Cómo se aplica en chispa.js
- **Una mano, una silueta.** `silueta(palma, ...piezas)` dibuja todo junto: primero en tinta (contorno de 12), después en piel encima. No quedan cortes en las uniones.
- **Las piezas:**
  - `capsula([x1, y1, x2, y2, radio de la base, radio de la punta])`: una falange recta.
  - `arcoDedo(cx, cy, R, a0, a1, r0, r1)`: un dedo doblado del todo, que sigue una circunferencia (el aro del OK). Las cápsulas rectas dejan el aro cuadrado.
- **Adentro, pocas líneas:**
  - `entre(a, b)`, la raya entre dos dedos;
  - `trazo(...)`, una línea fina;
  - `borde(q)` y `pulgarDelante(q)`, un pulgar que cruza por delante;
  - `uña(q)`.
- **Las medidas:**
  - `DEDO` 7,4 → 6,2;
  - `MEÑIQUE` 6,6 → 5,6;
  - `PULGAR` 9,5 → 8,2;
  - en el aro del OK, el índice va de 6,8 a 6,1 y el pulgar de 7 a 6,6.
- **La mano se revisa sola y grande:** `chispa.mano('ok')`.

## La revisión antes de mostrarla
1. La mano sola, grande. Después en negro a 64 y a 32 px: el gesto se entiende y el hueco se ve.
2. En las poses que la usan, a tamaño real y de cerca, al lado de cómo estaba.
3. El pulgar se distingue del índice. Ningún dedo va paralelo ni parejo a otro, y las dos manos no son gemelas.
4. Ningún bulto sale de la línea de la palma.
5. En movimiento (`linea`), la forma cambia en el primer tercio y el volumen no salta.
6. Se muestra con variantes. El equipo elige viéndolas.

## Lo que ya se corrigió en Chispa (no repetir)
Están en `chispa/conocimiento/02-chispa-el-personaje.md` («Lo que Andrés corrigió» y «Las manos»):
- sin franja en la muñeca;
- los puños con pulgar;
- «celebra» a la altura del pecho;
- la mano izquierda en espejo;
- pulgares cortos;
- sin cortes en las uniones;
- el aro del OK chico y con el hueco sobre el fondo.

Desde el 18/11, también: el aro son dos dedos, no una dona, y la base del pulgar no abulta.

## Fuentes
- John Kricfalusi, [Animation School Lesson 5a: Hands](http://johnkstuff.blogspot.com/2006/06/animation-school-lesson-hands.html) (sobre la hoja de manos de Preston Blair).
- James Gurney, [Drawing Cartoon Hands](http://gurneyjourney.blogspot.com/2012/03/drawing-cartoon-hands.html), con los comentarios de animadores sobre Blair y Eric Goldberg. Se leyó a través de un resumen: las citas de los comentarios no están comprobadas palabra por palabra.
- [Give me a hand](http://artistavision.blogspot.com/2010/12/give-me-hand.html): el método de Blair, del círculo al mitón y al pulgar.
- Preston Blair, *Cartoon Animation*: la caja que se dobla desde la muñeca y la base del pulgar. El PDF no se pudo leer (pesa más de 10 MB); lo de Blair sale de las citas de las otras fuentes.
- Richard Williams, [*The Animator's Survival Kit*](https://archive.org/stream/TheAnimatorsSurvivalKitRichardWilliams/The%20Animator's%20Survival%20Kit%20-%20Richard%20Williams_djvu.txt): Eric Larson y el cambio de forma (p. 51), Emery Hawkins (p. 218), arrastrar la mano (p. 151), las articulaciones en orden (pp. 230-234) y la mano quieta sin vida (p. 242). El texto es un OCR con errores.
- Proko, [la anatomía de la mano](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand): la eminencia tenar y el pulgar que no va paralelo.
- お絵かき図鑑, [手のイラスト描き方講座, explicado por un animador](https://oekaki-zukan.com/articles/7680), y CLIP STUDIO TIPS, [手の描き方](https://tips.clip-studio.com/ja-jp/articles/8235).
- Sakuga Blog, [la mesa redonda de los directores de animación de *Koe no Katachi*](https://blog.sakugabooru.com/2017/05/24/koe-no-katachi-key-animation-directors-roundtable/): las manos como problema de siempre, resuelto con una hoja de expresiones de manos.
- Toei y Hanna-Barbera: no se encontró nada publicado de sus estudios sobre manos, solo hojas de modelo a la venta. Lo de Hanna-Barbera llega por John Kricfalusi, que trabajó ahí; lo japonés, por los artículos de animadores de arriba.
