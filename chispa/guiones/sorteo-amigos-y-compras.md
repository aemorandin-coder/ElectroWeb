# Guion: "Más boletos para la PS4" (v1, 18/11, C-300)

> **Versión 2 (18/11):** capturas y cámara como los videos profesionales (skill `.claude/skills/videos-con-capturas`). Las capturas se hacen con `herramientas/tienda/capturar-tienda.mjs`, sobre los datos de `herramientas/tienda/sembrar-sorteo.mjs`.
>
> **Estado (18/11):**
> - Hechos: el guion, las capturas v2 (`assets/sorteo/`), la voz Diego (`assets/voz/chispa-sorteo-amigos-compras.mp3` y `.scribe.json` + `.json`), los efectos (`herramientas/sonido-sorteo-amigos-compras.py`), la página del video (`videos/sorteo-amigos-compras.src.html`), la portada (`salida/portada-sorteo-amigos.png`) y el reel final con voz y cierre (`salida/reel-sorteo-amigos-compras.mp4`, `61.2 s`, y copia `720p` en `salida/reel-sorteo-amigos-compras-720.mp4`).

Reel de unos 55 s, más el cierre de la serie. Habla Chispa con la voz "Diego" de ElevenLabs. Lo pidió el equipo el 18/11: "que es importante que los amigos que refieras activen su cuenta", con capturas reales del teléfono, y "por las compras tenemos muchas más oportunidades".

**Se publica cuando `v1.0.0-rc.111` esté en producción.** La regla de las compras ($5 → 2, $50 → 5, el producto estrella y las reseñas) llegó en C-297 y hoy producción todavía dice "1 boleto por compra". Si el reel sale antes, promete algo que la tienda no muestra.

## Lo que dice, con su fuente
Todo sale de la tienda (`lib/sorteo/reglas.ts`, `lib/sorteo/escala.ts` y las bases de `/sorteo`). Si algo cambia en el panel antes de grabar, se cambia aquí.
- **El premio:** una PlayStation 4 Sony **remanufacturada**, "¡Lista para jugar!", 1000 GB y envío gratis a cualquier estado si ganas. El resultado es **el 20 de diciembre**. En pantalla siempre se ve "Remanufacturada": no se dice "nueva".
- **Los amigos** (no cambió): cuentan cuando **se registran con tu enlace, con su teléfono, y activan su cuenta desde el correo**.
  - Cada 2 amigos activos dan 1 boleto, **hasta 3**.
  - Cada persona cuenta una sola vez, para quien la invitó primero.
  - En `/sorteo`, cada amigo sale con su sello: "Cuenta", "Falta activar", "Falta su teléfono" o "No suma".
  - El botón "Recordarles por WhatsApp" le avisa al que falta.
  - Es la forma de participar sin comprar.
- **Las compras** (C-297):
  - desde $5 en productos (el envío no suma), **2 boletos**;
  - desde $50, **5 por cada $50**: $50 → 5 y $100 → 10;
  - vale la que dé más;
  - una compra cancelada o devuelta no cuenta.
- **El producto estrella:** uno por semana, de lunes a domingo, el que elija el equipo. Da **+10 boletos por cada uno**, sumados a los del monto.
- **Las reseñas:** **1 boleto por cada reseña aprobada** de algo que compraste y te llegó, sin tope y con cualquier calificación.

## La línea de tiempo
Los segundos son para planear; los de verdad salen de la transcripción de la voz. Las caras y poses son de Chispa 3.1 (`chispa.js`, C-296).

| Bloque | Lo que dice Chispa | Lo que se ve (capturas reales del teléfono) | Chispa |
|---|---|---|---|
| 0. Gancho (0-4 s) | ¡Ojo! Si invitaste amigos al sorteo de la PS4 y no te salen los boletos... esto es para ti. | **C1**, el premio arriba de `/sorteo`: "Gana una PlayStation 4 Sony", "Remanufacturada", "Resultado el 20 de diciembre". El sello "¡Ojo!" entra con un pop. | `señala` + `serio` |
| 1. El error (4-12 s) | Tu amigo no cuenta solo por registrarse. Tiene que activar su cuenta, con el enlace que le llega al correo. | **C2**, "Invitando amigos": un amigo con "Cuenta" y otro con "Falta activar". Zoom lento al sello "Falta activar". | `explica` + `pensativo`, mirando al teléfono |
| 2. Cómo se arregla (12-20 s) | Mándale el recordatorio por WhatsApp desde la página del sorteo. Abre el correo, toca "Activar mi cuenta"... ¡y listo, ya cuenta! | **C3**, el correo en el teléfono ("Activa tu cuenta de Electro Shop", con el botón "Activar mi cuenta"). Después **C4**: el mismo amigo, ahora con "Cuenta". | `telefono` y, en "¡y listo!", `ok` + `alegre` |
| 3. La regla de amigos (20-25 s) | Cada dos amigos activos te dan un boleto. Hasta tres boletos. | **C4**, con la tarjeta "2 amigos = 1 boleto · hasta 3". | `pulgar` + `alegre` |
| 4. El giro (25-29 s) | Pero... ¿sabes qué te da muchas más oportunidades? ¡Comprar! | Corte al fondo azul. El signo de pregunta se vuelve un carrito. | `hombros` + `sorpresa` (los ojos de asombro), después `celebra` + `risa` |
| 5. La escalera (29-38 s) | Desde cinco dólares te llevas dos boletos. Con cincuenta, cinco. Con cien, ¡diez! | **C5**, el camino de las compras en `/sorteo`: la escalera $5 → 2, $50 → 5, $100 → 10. Cada escalón se ilumina con su palabra. | `explica` + `alegre` |
| 6. El producto estrella (38-45 s) | Y cada semana hay un producto estrella: cada uno que compres te da diez boletos más. | **C6**, "Descubre el producto estrella", con su foto, "+10 por cada uno" y hasta cuándo. Después **C7**, en una ficha: "Con esta compra ganas…". | `presenta` + `orgulloso` |
| 7. Las reseñas y el carrito (45-51 s) | ¿Ya te llegó? Deja tu reseña: cuando la aprobamos, ganas uno más. Y el carrito te dice cuántos boletos te da tu compra. | **C8**, el camino de las reseñas ("Dejar una reseña"). Después **C9**, el carrito: "Esta compra te da N boletos" y su barra al próximo salto. | `ok` y `señala` + `alegre` |
| 8. Cierre (51-56 s) | Todo está en las bases, en electroshopve.com/sorteo. El 20 de diciembre sorteamos la PlayStation. ¡Puede ser tuya! | **C1** otra vez, con "electroshopve.com/sorteo" en la píldora. | `brazos` (los cruzados 10B) + `orgulloso`, y `saluda` + `alegre` al final |
| Cierre de la serie | — | `assets/cierre.mp4` con `-ss 0.2` | — |

**Lo que se dice, se ve** (regla de la serie). Cada número que dice Chispa está en la captura de ese momento: si en la captura de la escalera no se lee "$100 → 10", se agranda esa parte, no se inventa.

## Texto para la voz (para pegar en ElevenLabs)
La voz es **Diego**, con los ajustes de siempre (`04-voz-con-elevenlabs.md`: velocidad 1,0, estabilidad 50 %, similitud 75 %). "Electro Shop" va separado. Cada línea es un bloque; si uno sale mal, se pide otra toma de ese bloque.

```
¡Ojo! Si invitaste amigos al sorteo de la PS4 y no te salen los boletos... esto es para ti.
Tu amigo no cuenta solo por registrarse. Tiene que activar su cuenta, con el enlace que le llega al correo.
Mándale el recordatorio por WhatsApp desde la página del sorteo. Abre el correo, toca "Activar mi cuenta"... ¡y listo, ya cuenta!
Cada dos amigos activos te dan un boleto. Hasta tres boletos.
Pero... ¿sabes qué te da muchas más oportunidades? ¡Comprar!
Desde cinco dólares te llevas dos boletos. Con cincuenta, cinco. Con cien, ¡diez!
Y cada semana hay un producto estrella: cada uno que compres te da diez boletos más.
¿Ya te llegó? Deja tu reseña: cuando la aprobamos, ganas uno más. Y el carrito te dice cuántos boletos te da tu compra.
Todo está en las bases, en electroshopve punto com, barra sorteo. El veinte de diciembre sorteamos la PlayStation. ¡Puede ser tuya!
```
Si "PS4" no suena bien, se cambia por "la PlayStation 4". Después: Speech to Text en JSON y `puente-voz.py` con `NOMBRE=chispa-sorteo-amigos-compras`.

## Las capturas reales (hechas el 18/11)
**Ya están, en `assets/sorteo/`.** Son pantallas de la tienda, compilada desde `main` con el mismo código que va a tener producción, en tamaño de teléfono (390 × 844, escala 3). Los datos son de prueba:
- productos reales tomados de la API pública: el Mini DC UPS como producto estrella, los Galaxy Buds y el bombillo LED;
- el sorteo con la configuración de producción;
- la cuenta "Chispa Prueba" con sus dos amigos;
- el correo de activación, armado con la misma función de la tienda, sin enviarlo.

`assets/sorteo/marcas.json` guarda dónde queda cada texto importante, para el aro que lo resalta en el video. Las saca `capturar.mjs` (en la carpeta temporal de la sesión; el método está en `estado/C-300.md`).

**Antes de publicar:** que la tienda tenga elegido un producto estrella esa semana. La captura muestra el Mini DC UPS; la voz no lo nombra.

Lo de abajo era el plan para sacarlas en producción; quedó como referencia.

- **El tamaño:** el teléfono a 390 × 844 (el ancho de un iPhone), a escala 3. Salen de producción **después de subir rc.111**, con la tienda como la ve un cliente.
- **Los datos:**
  - nada de clientes de verdad (`01-reglas-de-marca.md`);
  - las de "Invitando amigos" son de **una cuenta de prueba del equipo** que invitó a **otras dos cuentas de prueba** (nombres cortos inventados, como "Luisa P." y "Carlos M.");
  - las cuentas de prueba se quitan desde Equipo y Clientes al terminar.
- **El producto estrella de la semana** se elige antes en Marketing → Sorteo.

| # | Dónde | Cómo tiene que estar | Quién |
|---|---|---|---|
| C1 | `/sorteo`, arriba | Sin cuenta. Se lee "Remanufacturada" y "Resultado el 20 de diciembre". | Claude, desde fuera |
| C2 | `/sorteo` → "Invitando amigos" | Con la cuenta de prueba: un amigo con "Cuenta" y otro con "Falta activar", y se ve "Recordarles por WhatsApp". | El equipo crea las cuentas; Claude o el equipo capturan |
| C3 | El correo "Activa tu cuenta de Electro Shop" | En el teléfono, en Gmail, el de la segunda cuenta de prueba, con el botón "Activar mi cuenta" a la vista. | El equipo, desde el teléfono |
| C4 | `/sorteo` → "Invitando amigos" | El mismo, después de activar: los dos con "Cuenta" y el boleto sumado. | Igual que C2 |
| C5 | `/sorteo` → el camino de las compras | La escalera $5 → 2, $50 → 5, $100 → 10. | Claude, desde fuera |
| C6 | `/sorteo` → "Descubre el producto estrella" | Con el producto de la semana, "+10 por cada uno" y hasta cuándo. | Claude, desde fuera |
| C7 | La ficha del producto estrella | "Con esta compra ganas…" a la vista, junto al botón de comprar. | Claude, desde fuera |
| C8 | `/sorteo` → el camino de las reseñas | "Dejar una reseña". | Claude, desde fuera |
| C9 | El carrito | Con productos por unos $40: "Esta compra te da N boletos" y la barra que dice cuánto falta para 5. | Claude, desde fuera (el carrito no pide cuenta) |

## La portada
1080 × 1920 (`piezas/portada-sorteo-amigos.html`), con todo lo importante en el centro `1080 × 1440` (`salida/portada-sorteo-amigos.png`). Lleva:
- cabecera con el logo oficial de ElectroShop y el sello "SORTEO DE NAVIDAD";
- el título **"¿Tu amigo ya activó su cuenta?"** (destacado en amarillo neo-brutalista) y el subtítulo "Y cómo ganar muchos más boletos comprando";
- Chispa 3.1 (`señala` + `serio`) apoyado detrás de la tarjeta inferior (sin corte al aire);
- la tarjeta de la **PS4 remanufacturada · 1000 GB** con el paso "Falta activar → Cuenta" y las fichas `+2 desde $5`, `+5 desde $50`, `+10 $100 o estrella`;
- pie seguro con "Sorteo: 20 de diciembre" y `electroshopve.com/sorteo`.

## Las descripciones para Instagram y TikTok

### Instagram Reels
```
¿Invitaste amigos al sorteo de la PS4 y no te salen los boletos?

Tu amigo no cuenta solo por registrarse: tiene que ingresar su teléfono y activar su cuenta desde el correo que le llega. Si en la página del sorteo aparece "Falta activar", tócale "Recordarles por WhatsApp" para que la active al instante. Cada 2 amigos activos suman 1 boleto (hasta 3 boletos).

Y si compras en Electro Shop multiplicas tus oportunidades:
- Desde $5 en productos: 2 boletos
- Desde $50: 5 boletos
- Desde $100: 10 boletos
- Producto estrella de la semana: +10 boletos extra por cada unidad
- Reseñas aprobadas de tus compras entregadas: +1 boleto por cada una, sin límite

Sorteamos una PlayStation 4 Sony remanufacturada de 1000 GB, lista para jugar, con envío gratis a cualquier estado el 20 de diciembre.

Consulta las bases en electroshopve.com/sorteo o escríbenos por WhatsApp al +58 257 251 1282.
Guanare, Portuguesa · Envíos a toda Venezuela por ZOOM y MRW.

#ElectroShop #SorteoVenezuela #PS4 #PlayStation4 #TecnologiaVenezuela #Guanare #Portuguesa #GamingVenezuela #EnviosATodaVenezuela #ComprasOnlineVenezuela #NavidadVenezuela #SorteoNavidad
```

### TikTok
```
Título corto para portada en TikTok:
¿Tu amigo ya activó su cuenta? Más boletos para la PS4

Descripción:
¿Invitaste amigos al sorteo de la PS4 y no te suman los boletos? Tienen que activar su cuenta desde el correo.

Mándales el recordatorio por WhatsApp desde electroshopve.com/sorteo y apenas toquen "Activar mi cuenta" ya suman (2 amigos activos = 1 boleto, hasta 3).

Y comprando ganas mucho más:
- Desde $5: 2 boletos
- Con $50: 5 boletos
- Con $100: 10 boletos
- Producto estrella semanal: +10 boletos por unidad
- Cada reseña aprobada: +1 boleto

Premio: PlayStation 4 Sony remanufacturada (1000 GB, lista para jugar). Resultado el 20 de diciembre. Envíos a toda Venezuela por ZOOM y MRW desde Guanare. WhatsApp +58 257 251 1282.

#ElectroShop #SorteoVenezuela #PS4 #PlayStation4 #Venezuela #Guanare #Portuguesa #TecnologiaVenezuela #GamingVenezuela #EnviosATodaVenezuela
```

## Para revisar antes de entregarlo
- Cada número dicho contra la captura de ese segundo: 2, 5, 10, +10, 1 y hasta 3.
- "Remanufacturada" a la vista cada vez que sale la consola.
- Los subtítulos no tapan los sellos de los amigos ni la escalera, y quedan fuera del último 15 % (los botones de Instagram).
- Ningún dato de un cliente real en las capturas.
