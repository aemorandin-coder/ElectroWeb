# 2. Chispa, el personaje

Chispa es la mascota de Electro Shop: un muchacho en dibujo 2D de tinta, con colores planos y el pelo negro en puntas. Tiene piel crema, ojos grandes negros con brillo y cachetes rosados. Lleva camisa azul marino con cuello en V azul y una placa blanca con "ES" en letras azules. Va siempre de la cintura para arriba, delante de un círculo azul de marca.

Todo está en `mascota/chispa.js` (versión 3.0, del 06/11, C-195): un SVG armado como muñeco articulado. La hoja de poses está en `mascota/hoja.html` (foto: `mascota/chispa-poses.png`).

## Lo que Andrés corrigió (no repetir)
- **Sin franja azul en la muñeca.** "Rompe las manos". Las manos salen directo de la manga.
- **Los puños tienen pulgar.** Un puño sin pulgar se ve como un muñón.
- **"Celebra" son los dos pulgares arriba a la altura del pecho**, no por encima de la cabeza ("no se los hagas tan altos").
- **Sin piernas.** Siempre de la cintura para arriba, o detrás de algo (un monitor, la barra de la web).
- **El círculo azul no gira.** Va en su propia capa fija (`#disc`) y Chispa se dibuja con `fondo: false`. Así un giro o un rebote de Chispa no mueve el círculo.
- **Las manos se agarran del borde** cuando se asoma (no flotan).
- **De espalda, la mano es un puño visto por detrás** (nudillos) o el índice con la uña. Nunca una palma de frente vista de espalda.
- Se mantiene el estilo: tinta gruesa, colores planos, nada de 3D, nada de degradados en el personaje.
- **La mano izquierda no es la derecha copiada** (06/11, en «celebra»). Con las dos manos a la vista, la izquierda va en espejo (`espejo: true`), con el pulgar hacia el centro.
- **Los pulgares son cortos y gruesos** (06/11: «los pulgares son muy largos y se perciben como índice»).
- **Sin cortes donde un dedo se junta con la palma** (06/11: «revisa bien las manos»). Cada mano es una sola silueta (abajo).
- **El aro del OK, chico y con el hueco sobre el fondo** (06/11: «el círculo debe ser más pequeño, dale más enfoque»). Sobre la camisa oscura el hueco no se leía.

## Las manos: cómo se dibujan (C-195)
No hay una skill que enseñe a dibujar manos (se buscó el 06/11). Estas reglas salen de cómo las trabajan la animación y los juegos: Preston Blair (la mano como un mitón primero), Proko (palma en bloque, dedos como cilindros, base triangular del pulgar), Streamline (empezar por la mano abierta y el puño, y que se lean en chico) y la prueba de silueta de los estudios. Más lo que corrigió Andrés.
1. **Una mano, una silueta.** La palma, los dedos y el pulgar se dibujan juntos con un solo contorno: primero todo en tinta con un trazo de 12 por fuera, después todo en piel encima (`silueta()`). Así no quedan cortes ni manchas en las uniones.
   - Un pulgar que cruza por delante de los dedos doblados también entra en la silueta. Encima va su borde, abierto en la base para que se funda con la palma (`pulgarDelante()`): el lado de arriba llega más cerca de la base que el de abajo.
2. **Primero la silueta.** Cada gesto se tiene que entender en negro sólido y a 32 px. Si no se entiende, se cambia la forma; no se agregan líneas. El pulgar arriba tiene que verse distinto del índice, y el hueco del OK tiene que verse.
3. **El pulgar.**
   - Es corto y grueso: 9,5 de radio en la base contra 7,4 del índice, y bastante más corto.
   - Sale bajo, de la mitad de la palma hacia la muñeca, nunca de la fila de los nudillos. Su punta llega a la base del índice.
   - Lleva la uña (un brillo claro, sin contorno) solo cuando se le ve la punta.
   - El pulgar arriba se echa un poco hacia atrás y termina más grueso que el tronco.
4. **Los dedos no van parejos.**
   - El medio es el más largo; el índice y el anular, parecidos; el meñique, el más corto y más fino. Las puntas hacen un arco.
   - Uno se separa del grupo: en la mano abierta, el índice y el meñique; en la de dedos juntos, el meñique.
   - Nada de dedos paralelos e igual de separados, ni de dos manos iguales.
5. **Pocas líneas adentro:** las rayas que separan los dedos (`entre()`) y la línea que rodea la base del pulgar.
   - Los pliegues de los dedos se quitaron: se veían como una línea punteada.
   - La línea de la palma al medio parecía una sonrisa.
6. **Grosores.** El contorno, 6. Las líneas de adentro, de 3,2 a 4,5. El borde del hueco del OK, 3,4.
7. **Lo que se ve a través** (el hueco del OK) se recorta con una máscara, con un id propio por cada Chispa (`chispaOk${id}`); con un id fijo, una Chispa le pisaba la mano a otra. No se pinta con un color de fondo inventado.
8. **Se revisa así antes de mostrarla:**
   - cada mano sola y grande (`chispa.mano('ok')`);
   - la misma mano en negro, a 64 y a 32 px;
   - en las poses, a tamaño real y de cerca.

## Cómo se usa
```js
// en la página: <script src="../mascota/chispa.js"></script>
el.innerHTML = chispa({ pose: 'saluda', boca: 'sonrisa', ojos: 'feliz', cejas: 'normal', fondo: false });
```
- **Poses (de frente):** `habla`, `señala` (índice arriba a su izquierda), `explica` (dos palmas abiertas), `pulgar`, `brazos` (cruzados), `hombros` ("¿y entonces?"), `saluda`, `celebra` (dos pulgares al pecho), `piensa` (puño bajo la barbilla), `ok` (junto a la cara), `victoria` (la V), `telefono` (muestra el teléfono con la tienda) y `presenta` (la mano abierta hacia un lado, para presentar algo).
- **Poses de espalda:** `espalda`, `espalda-señala`, `espalda-señala-alto`, `espalda-dos` y `espalda-libre` (brazos a mano con `window.CHISPA_L` y `window.CHISPA_R`).
- **Ojos:** `abiertos`, `cerrados`, `sorpresa`, `guino`, `feliz`, `sonrie`, `entrecerrados`.
- **Cejas:** `normal`, `arriba`, `duda`, `enojo`, `triste`.
- **Bocas:** `sonrisa`, `seria`, las vocales `a`, `e`, `i`, `o`, `u`, y `feliz`, `risa`, `sorpresa`, `triste`, `ups`, `picara`, `duda`.
- **Expresiones** (ponen ojos, cejas, boca, mirada y rubor juntos; lo que se pase aparte manda): `alegre`, `risa`, `sorpresa`, `pensativo`, `picaro`, `apenado`, `orgulloso`, `triste`. Ejemplo: `chispa({ pose: 'telefono', expresion: 'alegre' })`.
- **Miradas por nombre** (en `chispa.linea`, `mirar: 'telefono'`): `camara`, `derecha`, `izquierda`, `arriba`, `abajo`, `telefono`, `producto`.
- **Una mano sola:** `chispa.mano('pulgar', x, y, giro)` da el SVG de la mano, para revisarla de cerca o usarla en una pieza.
- Cada pose inclina un poco la cabeza (`INC_POSE`) para que no se vea rígido.

## Animarlo (lo que usan los videos)
Todo es numérico, así que se interpola suave. El patrón de `videos/chispa-entrada.src.html`:
```js
const W = (w, n = 0) => VOZ.palabras.filter(p => norm(p.w) === norm(w))[n].t0;  // cuándo dice la palabra (n: qué aparición)
const linea = chispa.linea([
  { t: 0, pose: 'saluda', ojos: 'feliz', feliz: true },
  { t: W('vendemos') - .1, pose: 'explica', mirar: [.4, -1] },
  { t: W('todo') - .1, pose: 'celebra', ojos: 'feliz', feliz: true },
  { t: W('jefe') - .25, pose: 'pulgar', ojos: 'guino', feliz: true },
]);
const labios = chispa.labios(VOZ);
window.seek = t => {
  const e = linea(t);                                         // pose, ojos, cejas, mirada en el segundo t
  const p = VOZ.palabras.find(q => t >= q.t0 - .03 && t < q.t1 + .05);
  if (p) Object.assign(e.boca, labios(t));                    // boca según la vocal y el volumen
  chispa.vida(e, t, { rms: p ? VOZ.rms[Math.floor(t * 30)] : null });  // parpadeo, respiración, cabeza, pelo
  e.fondo = false;
  $('#chispa').innerHTML = chispa.rig(e);
};
```
- `chispa.linea(claves)`: cada clave cambia solo lo que trae (`pose`, `vista`, `ojos`, `cejas`, `boca`, `mirar: [mx, my]`, `inc`, `feliz`). La transición es suave y con un pequeño rebote. **Las claves se ponen en la palabra** (`W('palabra') - .1`), nunca en segundos a ojo.
- `chispa.labios(voz)`: boca por vocal de la palabra que suena, abierta según el volumen de ese cuadro (`rms`).
- `chispa.vida(e, t, {rms})`: parpadeo, respiración, la cabeza acompaña al habla y el pelo se queda un poco atrás.
- Para saludar con la mano, se mueve `e.R.giro` y `e.R.muñeca` con un seno (ver la entrada).
- **Agarrar cosas** (lo usan los stickers, `piezas/sticker.html`):
  - `e.R.objeto = '<svg...>'`: lo que agarra la mano (una llave, una lupa). Va en coordenadas de la mano (muñeca en 0,0 y dedos hacia -y) y se dibuja debajo de los dedos, así se ve agarrado. `chispa.anguloMano(e.R)` da el ángulo de la mano, para apuntar el objeto a un punto de la cara o de un aparato.
  - `e.L.espejo = true`: la mano al revés, con el pulgar del otro lado. Para la mano izquierda de frente (un pulgar arriba con la izquierda).
  - `e.entre = '<svg...>'`: un aparato entre los dos brazos. Con `e.orden = 'LR'` el brazo izquierdo queda detrás del aparato y el derecho por delante; con `'RL'`, al revés.
- Se puede ver en movimiento con `videos/chispa-demo.src.html` y el giro de frente a espalda con `videos/chispa-giro.html`.

## Chispa en Google Flow
Para los videos reales, Flow necesita ver a Chispa. Las imágenes con fondo transparente están en `mascota/referencias-flow/`: frente, saluda, señala, pulgar, espalda y la hoja de referencia. Se sacan de nuevo con:
```bash
node herramientas/captura.mjs mascota/hoja.html salida/hoja.png 1600 900 2
```
Cómo se escriben los prompts para que no lo redibuje distinto: ver `05-videos-reales-con-flow.md`.

## Chispa en la tienda web
Andrés aprobó (09/10) que Chispa se asome en la esquina de la tienda, salude y ofrezca "Buscar" o "WhatsApp" (tarea C-179; antes figuraba como C-176, número que el 16/10 se usó para el mantenimiento del servidor), pero pidió dejarlo como plan, sin código. Es trabajo de la web (`components/`, `lib/`), no de esta carpeta, y lo hace Claude con las reglas de `CLAUDE.md`.
