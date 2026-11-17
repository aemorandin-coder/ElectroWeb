# Lo de ahora (actualizado 2026-11-17 · producción en 1.0.0-rc.98; por subir: rc.99, los videos de ElectroStudio, §2)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **C-286 · Los videos de ElectroStudio, enteros y también por Telegram (rc.99, por subir: §2; `estado/C-286.md`):** el equipo: los videos de 15 s quedaban cortados en 3 s en el teléfono, y a veces en la PC. Chrome los grababa en trozos de 3 s y la cabecera decía 0 s. Ahora se arman cuadro por cuadro, en Full HD a 60 cuadros, y al descargarlos llegan también a Telegram.
- **C-279 · El Dashboard nuevo, la recepción (rc.98, en producción desde el 17/11; pruebas por confirmar: §2; `estado/C-279.md`):** el pedido del equipo del 17/11 con las capturas del Dashboard ("Dashboard" en grande sobraba, tamaños pésimos, sin animaciones, "una recepción épica" donde también se pueda actuar). El equipo eligió viendo la maqueta (`~/.cache/electroshop-trabajo/c279/index.html`): la recepción A más baja, la grilla a la medida con plantillas, Claude fuera del buscador por ahora y Chispa fuera del panel.
  - **La recepción** en lugar del título: el saludo, lo que toca hoy, Ctrl K, los pasos del día y el pulso (tasa, corte y quién está en la tienda).
  - **Las tarjetas del tamaño que quieras** (menú o esquina), cuatro plantillas y tres tarjetas nuevas (sorteo, ElectroStudio de la semana y lo que viene). La existencia se sube ahí mismo.
  - **Sigue C-279b:** las novedades de versión con antes y después o un mini video en la esquina, y el estreno para las versiones grandes.
- **C-283 · Dinero: lo más urgente de la auditoría (rc.97, en producción desde el 17/11; pruebas por confirmar: §2; `estado/C-283.md`):** la Fase 1 de la auditoría del 17/11, que el equipo aprobó ese día, con el método de C-280 (un agente en el modelo liviano y la revisión de Claude).
  - **El Pago Móvil:** un pago se reconoce escrito de cualquier forma (con espacios o con menos dígitos de su referencia) y no se registra dos veces, ni en una recarga ni en una compra.
  - **Las órdenes:** cambiar el estado va de uno en uno, y una orden cancelada o reembolsada ya no cambia de estado ni de pago.
  - **Fuera** dos rutas que nadie usaba.
  - **Verificado:** 23 de 23 por HTTP con el caso normal y el manipulado, las 50 de C-280 otra vez y la prueba de humo, 60 de 60.
- **C-282 · La guía web y los arreglos sueltos de la auditoría (rc.96, en producción desde el 17/11, subida con rc.97; pruebas por confirmar: §2; `estado/C-282.md`):** la Fase 7 de la auditoría del 17/11 y los cuatro sueltos, lo que recomendó la otra sesión cuando el equipo preguntó qué más se podía tomar.
  - **En la tienda:** se puede instalar en el teléfono con su ícono; "Saltar al contenido" con el teclado; la ventana de recarga y las direcciones de Mi panel son formularios accesibles (Enter, etiquetas, autocompletar, Escape); "Va en camino" solo para lo que viaja.
  - **En el panel:** el CSV de Transacciones (y los de Reportes y Legal) ya no ejecuta fórmulas al abrirlo en Excel, y el lote de gift cards impresas ya no se pierde al salir sin cerrarlo.
  - **Para decidir:** la política de navegadores (`PLAN.md` §7.1, A17).
- **C-280 · Dinero y seguridad: los arreglos medios de la auditoría (rc.95, en producción desde el 17/11; pruebas por confirmar: §2; `estado/C-280.md`):** lo que pidió el equipo el 17/11 después de leer el informe, con un agente en el modelo liviano que implementó y Claude que revisó.
  - **Puntos ES:** la recarga por Pago Móvil que se aprueba sola se compara con la tasa que vio el cliente y solo perdona el redondeo; lo pagado de más también se acredita. Pedir recargas tiene tope (10 por hora y 3 por confirmar), y una que quedó a medias la reemplaza la siguiente.
  - **Compras:** un cupón de un uso por cliente ya no hace fallar la compra de dos paquetes, y el checkout con la sesión vencida lo dice sin vaciar el carrito.
  - **El panel:** la tasa escrita a mano pide confirmación si cambia más de 50 %, y aprobar o rechazar comisiones queda en la bitácora.
  - **La cuenta:** cambiar la contraseña cierra siempre las otras sesiones, una gift card vencida no se canjea y el progreso de un curso solo cuenta sus lecciones.
  - **La plataforma:** las API sin sesión responden 401 en JSON, las reseñas de un trabajo se ven sin cuenta y un archivo que no existe ya no queda guardado un año como roto.
  - **Verificado:** 50 de 50 por HTTP con el caso normal y el manipulado, la prueba de humo 60 de 60 y las dos pantallas que cambiaron, a cuatro anchos.
- **C-281 · Los flujos que venden y el día del panel (rc.94, en producción desde el 17/11, subida con rc.95; pruebas por confirmar: §2; `estado/C-281.md`):** la Fase 4 de la auditoría del 17/11, que el equipo repartió entre las sesiones (la de dinero y seguridad es C-280).
  - **En la tienda:**
    - el Pago Móvil ya verificado se recupera si el cliente recargó el pago ("Usar en esta compra": no paga dos veces);
    - quien recibe una gift card crea su cuenta ahí mismo y su código lo espera;
    - el carrito sin cuenta muestra el precio y el stock de hoy;
    - "Comprar ahora" sin cuenta sigue al pago después de entrar;
    - con la cuenta sin activar, el botón de pagar se apaga, dice por qué y reenvía el correo;
    - canjear y cada curso tienen su imagen para compartir;
    - la confirmación abre el pedido.
  - **En el panel:** Órdenes y Transacciones buscan entre todo (número, cliente, teléfono, cédula, referencia o guía), Órdenes tiene las píldoras Listas para recoger, Canceladas y Reembolsadas, y Consultas y Verificaciones dicen cuando algo falla.
- **C-278 · La lista de Clientes, sin las cifras repetidas (rc.93, en producción desde el 17/11; `estado/C-278.md`):** el equipo, viendo rc.92: "esto ya está sobrando". Se quitaron las cuatro cifras de arriba de la lista, que repetían los filtros. Las órdenes en curso siguen en cada fila.
- **C-276 · Clientes, de una lista pobre a saber quién es cada cliente (rc.92, en producción desde el 16/11; pruebas por confirmar: §2; `estado/C-276.md`):** el pedido del equipo del 16/11 con las capturas ("muy pobre, no se puede enviar notificaciones, no se sabe si está verificado, no se muestra el historial de sus documentos"). Eligió lo recomendado viendo las maquetas (`~/.cache/electroshop-trabajo/c276/maquetas/index.html`): la ficha A, escribirle por campana, correo y WhatsApp, y las notas del equipo con quién y cuándo.
  - **La ficha de cada cliente en su página:** sus sellos de confianza, lo gastado, sus Puntos ES, sus boletos, sus documentos y firmas con el PDF, los avisos que recibió, todo lo que pasó en su cuenta, lo que le interesa y las notas del equipo.
  - **Escribirle** por pasos, con cinco mensajes listos o uno propio. **La lista** busca por teléfono, cédula y RIF, con filtros y páginas. **Suspender o reactivar** y reenviar la activación. **Editar** por pasos, con antes → después.
  - **Arreglado de paso:**
    - los enlaces a una orden (desde la ficha, Garantías y los resúmenes de Claude) abrían una página que no existe;
    - la ficha entregaba la fila entera de la base;
    - cambiar el correo lo dejaba verificado;
    - "Eliminar" borraba a quien tenía Puntos ES.
- **C-277 · El permiso de la lista de Verificaciones (rc.91, en producción; `estado/C-277.md`):** cualquier cuenta con sesión podía bajar los perfiles completos de las empresas; cerrado y comprobado.
- **C-230 · El libro de ventas, con las respuestas de la contadora (rc.90, en producción desde el 16/11 con rc.91; pruebas por confirmar: §2; `estado/C-230.md`):** la contadora respondió el 16/11 por notas de voz (sus criterios, en `CONTABILIDAD.md` §9). El equipo eligió lo recomendado viendo las maquetas (`~/.cache/electroshop-trabajo/c230/index.html`).
  - **Contabilidad → Libro de ventas:** una línea por factura con sus columnas, el IVA del mes con su fecha, lo de la declaración, el Excel y la hoja impresa apaisada.
  - **La factura va a la tasa BCV del día en que se escribe** (antes, la de la orden). Desde el 16/11 se factura cada venta.
  - **Facturas** dice hasta cuándo alcanza el talonario y cuántas pedir. **La mesa** trae el Excel y, la primera vez de la contadora, "Así funciona".
  - **Sigue** C-236, el calendario y los avisos, con sus fechas: la alcaldía el 10 y el IVA el 15.
- **C-273 · ElectroStudio: entradas, énfasis y salidas (rc.89, en producción desde el 16/11; pruebas por confirmar: §2; `estado/C-273.md`):** cada título, subtítulo y sticker elige cómo entra (12 entradas), qué hace mientras está (latido, flotar, brillo o temblor) y cómo sale (9 salidas), con su segundo y lo que tarda. El paso Animación trae la línea de tiempo (barras que se arrastran y la regla para mirar cualquier segundo), la duración del video (5, 7, 10 o 15 s), cómo termina (fundido, barrido o cortina) y el cierre con el logo para los Reels. **Siguen** C-274 (plantillas) y C-275 (la IA).
  - **Arreglado de paso (de C-270):** los números del editor no se podían escribir tecla por tecla. Escribir "80" en el tamaño dejaba 400, y el "-" de un giro negativo saltaba a 0. Con rc.89 en producción, ya se escriben.
- **C-272 · ElectroStudio: los stickers (rc.88, en producción desde el 16/11 con C-273; pruebas por confirmar: §2; `estado/C-272.md`):** "+ Sticker" con 6 grupos (ofertas con texto, flechas y trazos, llamados, los 166 íconos del pack con buscador, Chispa en 5 poses con o sin gorro, y Navidad). Se mueven, se agrandan y se giran como los textos. **Siguen** C-273 (entradas y salidas), C-274 (plantillas) y C-275 (la IA).
- **C-271 · ElectroStudio: las 8 fuentes y los estilos listos (rc.87, en producción desde el 16/11; pruebas por confirmar: §2; `estado/C-271.md`):** Montserrat, Anton, Bebas Neue, Unbounded, Space Grotesk, Rubik, Caveat y Playfair Display, guardadas en la tienda; nueve estilos listos; resaltar con \*asteriscos\*; y el texto que baja de línea solo. Sigue C-272, los stickers.
- **C-270 · ElectroStudio 2.0: las capas, el editor A y los seis pasos (rc.86, en producción; `estado/C-270.md`):** la Fase 2 del plan, con lo que eligió el equipo.
  - **Títulos, subtítulos y textos sueltos** encima de la plantilla: se arrastran sobre la vista previa, se agrandan con las esquinas, con dos dedos o escribiendo los px, y se giran. Con color automático, contorno, sombra, cinta, píldora o caja.
  - **La ruta de pasos** del panel con seis pasos, y la vista previa grande y fija al lado (en el teléfono, arriba).
  - **Sigue C-271:** las 8 fuentes, los estilos listos y "soltar" un texto de la plantilla.
- **C-269 · ElectroStudio 2.0: el plan (16/11; `ELECTROSTUDIO.md` y `estado/C-269.md`):** el pedido de mejorar mucho la herramienta, con "un plan para que no nos perdamos".
  - **Las fases:** C-270 las capas, el editor A y la ruta de seis pasos; C-271 títulos, subtítulos y fuentes; C-272 stickers; C-273 entradas y salidas; C-274 plantillas; C-275 la IA.
  - **Las decisiones:** el equipo eligió lo recomendado en las seis, viendo las maquetas y la demo que se toca (`~/.cache/electroshop-trabajo/c269/index.html`).
- **C-268 · El video de ElectroStudio (rc.85, en producción; `estado/C-268.md`):** la captura del equipo del 16/11, "(0 , p.recordCanvas) is not a function" al descargar el video.
  - **El código de rc.84 graba bien** en una pestaña nueva (Chrome y Firefox, directo y desde la lista). El error es de una pestaña que juntó código de dos versiones (como el 11/11) y no se pudo reproducir. **Mientras tanto: recargar la página (Ctrl+R) y volver a descargar.**
  - **Arreglado:** el editor ya no busca la grabación a través de otro archivo; si una descarga falla así, dice "El panel se actualizó…" con "Guardar y recargar"; si sales de la pestaña mientras graba, se detiene y lo dice (antes quedaba grabando para siempre, con los botones apagados).
  - **rc.84 ya estaba en producción** (subido el 16/11 a las 7:15 a. m.): su bloque pasó a `HISTORIAL.md`.
- **C-267 · Lo que encontró la revisión de rc.83 (rc.84, en producción; `estado/C-267.md`):** el equipo pidió el 16/11 las pruebas de rc.83 "sin dejar nada al azar". Antes del teléfono, Claude revisó producción sin cuenta y la tienda de prueba con cuenta.
  - **Mis pedidos y Puntos ES se salían del teléfono** desde rc.83: con filtros, la página medía el doble y el teléfono la achicaba. Arreglado en los filtros chicos.
  - **El flyer:** si el teléfono no abre la hoja de compartir, se descarga y lo dice; si no se pudo copiar el enlace, el aviso dice que toques «Copiar».
  - **El aviso de cookies no sale en producción:** la tienda no tiene Google Analytics ni el píxel de Meta. Se probó sobre Mi panel en la tienda de prueba.
- **C-265 · Mi panel rediseñado (rc.83, en producción; `estado/C-265.md`):** el equipo pidió el 15/11 rediseñar Mi panel ("todo está estirado, muy exagerado") y eligió lo recomendado en las 6 preguntas viendo las maquetas (`~/.cache/electroshop-trabajo/c265/index.html`).
  - **El sistema (la A):**
    - sin el marco blanco: las tarjetas van sobre el gris, junto al menú;
    - lo que se repite, en dos columnas en la computadora;
    - el menú, de arriba abajo;
    - WhatsApp, en la cabecera;
    - cada pestaña, con su título.
  - **El inicio:** una sola pieza fuerte (los boletos con sorteo; Puntos ES, en el azul oscuro, sin él), "Pedidos anteriores" sin repetir y las misiones cumplidas en una línea.
  - **Mis pedidos:** en dos columnas y agrupados, con el producto en cada tarjeta. El detalle lleva el seguimiento y el recibo lado a lado.
  - **Garantía:** solo de lo físico, también en el servidor; los códigos y las recargas van por WhatsApp. En Mis códigos, "Solo tú los ves" y "Si no funciona, te ayudamos".
  - **Las ventanas:** el foco vuelve al cerrarlas, y cerrar la firma ya no cierra la recarga. El aviso de cookies tiene su capa.
- **C-263 · El boleto épico y el flyer para compartir (rc.82, en producción; `estado/C-263.md`):** el equipo eligió el boleto A ("el talón") y el flyer F1 ("Mis boletos") viendo las maquetas (`~/.cache/electroshop-trabajo/c263/index.html`).
  - **El boleto:** uno por cada boleto, troquelado, con el premio, el correo tapado, de dónde salió y su código ("F3E-XEP"), que no cambia y es el mismo en el panel. Se anima una vez. Va en `/sorteo`, Mi panel y el correo "¡Ganaste un boleto!", y se descarga.
  - **El flyer de estado:** "¡Ya tengo 3 boletos para la PS4!", con sus boletos, el QR y el enlace corto `electroshopve.com/s/<código>`, para compartir desde el teléfono o descargar (también en video), desde Mi panel y `/sorteo`.
  - **Al sortear:** "Ganó el boleto F3E-XEP de an***@gmail.com" en `/sorteo`, en los correos y en el panel. Chispa del correo del boleto habla de los dos caminos.
- **C-264 · Un amigo, dos cuentas: cuenta para quien lo invitó primero (rc.81, en producción; `estado/C-264.md`):** el equipo eligió la A viendo el caso dibujado.
  - **El reparto:** uno solo para la pantalla de cada cliente, la lista que se sortea y los avisos. Lo que se ve es lo que cuenta.
  - **En la pantalla:** el amigo repetido dice "Ya cuenta con otra cuenta", y quien lo pierde recibe el aviso.
- **C-262 · Los amigos invitados y los boletos, más claros (rc.80, en producción; `estado/C-262.md`):** las preguntas del equipo del 15/11 sobre cómo sabe el cliente sus boletos y sus amigos.
  - **En `/sorteo`:** "Invitando amigos", con "Te falta 1 amigo para tu próximo boleto", cada amigo con su sello y "Recordarles por WhatsApp".
  - **En Mi panel:** la línea de los amigos en la tarjeta del sorteo. En la campana: los avisos del sorteo.
  - **Siguió C-263** (rc.82, arriba): el boleto épico y el flyer para compartir.
- **C-254 · La semana del ganador (rc.79, en producción; `estado/C-254.md`):** el pedido del equipo del 15/11. Eligió lo recomendado en las 7 preguntas, viendo las maquetas (`~/.cache/electroshop-trabajo/c254/index.html`).
  - **La bandera del inicio, por etapas:**
    - cerrado: "Resultado el 20 de diciembre", y ese día, "Hoy sale el ganador";
    - sorteado: "¡Ya hay ganador!" con la foto del premio;
    - con la entrega publicada: la foto de la persona y "¡Ganó una PS4!", 7 días desde que se publica. La píldora dice "¡María G. ganó una PS4!".
    - Sin entrega, se va a los 7 días del sorteo; si la entrega llega después, vuelve 7 días.
  - **`/sorteo`, ya sorteado:** el banner cuenta quién ganó, con su nombre, de dónde es y su foto, que es la portada del video. El video se abre ahí mismo, sin cookies. Sin permiso, el correo tapado, como antes.
  - **En el panel, "Publicar la entrega"** (Marketing → Sorteo, debajo del ganador), en 3 pasos:
    - la foto, que se sube o se toma con el teléfono, y el enlace de YouTube;
    - su nombre;
    - "Revisar y publicar", con la casilla "La persona aceptó salir en la tienda".
    - "Quitar de la tienda" si cambia de idea.
  - **Lo que se cuida:**
    - el servidor exige el permiso, una foto subida y un enlace de YouTube válido;
    - la foto se publica sin el GPS que traen las del teléfono;
    - al compartir `/sorteo` sale "¡Ya hay ganador!", sin la cara ni el nombre.
- **C-260 · El kit de onboarding en más lugares, y las misiones de Mi panel (rc.78, en producción; `estado/C-260.md`):** lo que midió C-258.
  - **"Agregar":** "¡Listo! Ya está en tu carrito" con "Ver carrito", y el carrito que salta.
  - **Al firmar los términos:** "Baja hasta el final para firmar", y la firma de muestra.
  - **Mis códigos:** "Voltear tarjeta" como el botón principal.
  - **Las misiones de Mi panel:** los íconos que se dibujan, y "¿Cómo funciona la tienda?" como la hoja del kit.
- **C-261 · Las tres decisiones de C-258 (rc.77, en producción; `estado/C-261.md`):** el equipo eligió lo recomendado en los tres callejones que midió C-258.
  - **"Solicitar producto" sin cuenta** pide entrar antes del formulario, y crear la cuenta vuelve a la página.
  - **La garantía** abre en "Nueva" o en Mis solicitudes, con "Pedir garantía" arriba.
  - **La recarga con un método manual** ya no pregunta "¿Estás seguro?": el botón dice el monto y el método.
  - **Siguieron en paralelo:** C-260 (el kit de onboarding en más lugares y las misiones de Mi panel) y C-254 (la semana del ganador, rc.79, arriba).
- **C-257 · El kit de onboarding: Chispa te guía (rc.76, en producción; `estado/C-257.md`):** el equipo pidió el 15/11 un kit para toda la tienda ("los onboarding parecen publicidad"). Eligió la A de las maquetas y aprobó el video del kit andando.
  - **El recorrido de bienvenida, rehecho:**
    - se oscurece en el azul del logo y un anillo blanco se dibuja alrededor de lo que se explica;
    - el ícono se dibuja y hace su gesto, con dos palabras y una frase;
    - Chispa se asoma por detrás de la tarjeta, cambia de pose en cada paso y nunca tapa lo que se explica;
    - a la cuenta sin activar le dice primero que la active desde el correo.
  - **La hoja "Así funciona",** la primera vez, en `/sorteo` ("Así participas", los dos caminos con la compra primero), `/checkout` ("Así compras") y Puntos ES.
  - **Las reglas del kit,** en `PLAN.md` §1.11. Los videos están en la PC del equipo: `~/.cache/electroshop-trabajo/c257/prueba/ver.html`.
- **C-258 · El estrés de cada camino del cliente (rc.75, en producción; `estado/C-258.md`):** el pedido del equipo del 15/11, la parte de medir y arreglar. El kit de onboarding es C-257.
  - **La medida:** `scripts/e2e/estres-caminos.ts` recorre 13 caminos en el teléfono y la computadora: comprar, registrarse, recargar Puntos ES, la gift card, la garantía, el sorteo y más.
    - Cuenta pasos, toques, palabras, cuánto hay que bajar, opciones, el tiempo hasta usable, los errores, los pedidos en cascada y los enlaces muertos.
    - Con eso saca un puntaje de estrés por camino. Todos llegan a la meta, y no hay ningún enlace muerto (127 revisados).
  - **Arreglado:**
    - el checkout que se trababa con el teléfono de las cuentas viejas ("0414…");
    - el latido de "quién está conectado", que daba error con varias personas en la misma IP;
    - el carrito que se volvía a guardar igual en cada página (y pisaba otro dispositivo);
    - la lista de ciudades de ZOOM, pedida en cada ficha;
    - el login, que esperaba "Verificando sesión…";
    - cuatro títulos de pestaña y el ícono del carrito sin nombre.
    - **El resultado:** estrés 1945 → 1697 y errores 30 → 0.
  - **Las cinco fricciones más grandes** y la lista de dónde ayudaría el kit, para C-257, están en el estado. Lo que pide decisión (solicitar producto sin cuenta, la garantía que abre en "Info", el "¿Estás seguro?" de la recarga), en `PLAN.md` §5.2.
- **C-256 · La bienvenida fuera de /sorteo y "activar la cuenta" (rc.74, en producción; `estado/C-256.md`):** las dos decisiones del equipo sobre C-255. Sigue **C-257**, el kit de onboarding de toda la tienda (`PLAN.md` §5.2).
- **C-255 · "Cómo participar" en /sorteo, con íconos (rc.73, en producción; `estado/C-255.md`):** la gente le preguntaba al equipo "¿cómo participo?, ¿a juro tengo que comprar?, ¿cómo creo mi cuenta?". El equipo eligió la B de las maquetas, con los dos caminos y la compra primero.
  - **Los tres pasos, unidos por un camino:** "Crea tu cuenta gratis"; "Gana boletos por dos caminos" (Camino 1, comprar $5 o más, sin límite; Camino 2, invitar amigos, hasta 3); "Espera el 20 de diciembre". Al lado, tus boletos.
  - **Pocos textos y los íconos animados:** entran una sola vez al llegar a la vista. Y "Lo que más nos preguntan", siete preguntas.
  - **El banner:** el logo corto de PS4 donde dice "Sony" y el de ZOOM en su píldora blanca.
  - **El camino de registro:** el correo de activación vuelve a `/sorteo` (antes se perdía en el login y el inicio), y la sesión se entera de la activación (el checkout la frenaba hasta volver a entrar). El invitado sabe que tiene que activar su correo.
  - **Las maquetas,** en la PC de Andrés: `~/.cache/electroshop-trabajo/c255/comparar.html`.
- **C-253 · El sorteo, más atractivo (rc.72, en producción; `estado/C-253.md`):** el equipo eligió cada pieza viendo las maquetas.
  - **El banner de `/sorteo`:** el nombre en grande con el sello y la etiqueta, los días con el envío gratis, "Quiero mi boleto", la foto limpia y "Lo que trae" en una franja abajo.
  - **La bandera del inicio:** la pestaña al borde izquierdo con el logo de PS4 o, más angosto, la píldora frente a WhatsApp. Entra una sola vez y se queda quieta.
  - **El panel:** el paso "Lo que trae". **En `/sorteo`:** el aviso de marcas de Sony.
  - **El equipo ya cargó en el panel** el premio, lo que trae y "PS4" (captura del 15/11). Faltan las pruebas (§2, "Por confirmar de rc.72").
  - **Siguió C-254:** la semana del ganador (rc.79, arriba).
- **C-251b · Mi panel con el kit (rc.71, en producción; `estado/C-251b.md`):** lo que quedó de C-251. Los estados en su sello lleno (Puntos ES, Mis códigos, Direcciones), sin ámbar (Direcciones, Garantía, Reseñas, Seguridad y la ventana de firmar), el aviso de lo que hay que hacer con su placa (también el "IMPORTANTE" de `/terminos` y `/privacidad`, que iba en rojo), los filtros en píldoras (Mis pedidos, Puntos ES, Reseñas y Notificaciones), Direcciones con la tarjeta de opción y Mi perfil del ancho de un formulario. Siguen las tres decisiones de C-251.
- **C-252 · El curso nuevo y las fotos de Servicios, validados (rc.70, en producción):** el servidor ya no acepta un precio negativo al crear un curso, ni fotos de Servicios que no sean de la tienda o http(s) (`estado/C-252.md`).
- **C-251 · Mi panel (el panel del cliente), revisado a fondo: las fallas y lo nuevo (rc.69, en producción; `estado/C-251.md`):** el equipo lo pidió el 15/11 ("revisa con calma: no solo el rediseño, sino también las fallas, y que se conecten las actualizaciones"). Lo hizo un agente aparte.
  - **Fallas arregladas:** Mis pedidos traía solo los 25 más nuevos; el inicio llamaba distinto a cada pedido, contaba mal los favoritos y decía "en revisión" a la garantía que espera tu respuesta; un pedido sin pago decía "validando tu pago"; a 360 px los pasos se pegaban, la tabla del promotor se cortaba y la tarjeta del curso se salía. Y lo de seguridad del estado.
  - **Conectado con lo nuevo:** "Sale el… desde Aragua" en el inicio, la tarjeta y el detalle (C-234 y C-222); "Dejar mi reseña" en lo entregado y Mis reseñas en el menú (C-157); cómo canjear cada código y el plazo del checkout (C-234); el certificado del curso; "Desde Aragua" en Favoritos.
  - **Para decidir, con maquetas** (en la PC de Andrés: `~/.cache/electroshop-trabajo/c251/decisiones.html`): Mis pedidos en la computadora, la garantía de los códigos y los sellos de Mis códigos.
  - **C-251b** (arriba) hizo los arreglos del kit que no eran fallas.
- **C-249e · Crear por pasos: el curso y el trabajo de Servicios (rc.68, en producción; `estado/C-249e.md`):** los 8 formularios ya van por pasos.
  - **El curso,** en su propia página: qué es, para quién, el precio y la portada, el temario y "Revisar y publicar", con la tarjeta de `/cursos` al lado. La miniatura se sube.
  - **El trabajo de Servicios:** qué se hizo, el video, antes y después, el testimonio y "Revisar y publicar", con la tarjeta de `/servicios` al lado. Las fotos se suben, ya no se pega su dirección.
  - **Para decidir, cuando se pueda:** el alta de un curso por la API no valida el precio (uno negativo entra); el panel ya no lo deja escribir (`PLAN.md` §5.2).
- **C-249d · Crear por pasos: la campaña de correo y el promotor (rc.67, en producción; `estado/C-249d.md`):** 6 de los 8 formularios, con el marco de C-249b.
  - **La campaña,** en su propia página: lo que dice, el contenido, la prueba a tu correo y "Revisar y enviar", con la bandeja y el correo al lado. "Armar con Claude" sigue al principio. Al revisar, a cuántos clientes llega; se guarda como borrador o se envía a todos.
  - **El promotor:** quién es, su código, la comisión y el descuento, y "Revisar y publicar", con su código en el carrito y lo que gana al lado. Antes de guardar, el servidor dice si el código está libre; al cambiarlo, cuántas comisiones por acreditar siguen con el % de antes. Se puede crear en pausa.
  - **Sigue** C-249e (el curso y el trabajo de Servicios).
- **C-250 · Las categorías y la gift card impresa, con el kit (rc.66, en producción):** el color de cada categoría, solo con los azules del kit, y el aviso de la gift card impresa en el azul oscuro del logo (`estado/C-250.md`).
- **C-249c · Crear por pasos: el método de pago y la categoría (rc.65, en producción; `estado/C-249c.md`):** 4 de los 8 formularios, con el marco de C-249b.
  - **El método de pago,** en su propia página: el método, la cuenta, lo que ve el cliente, el logo y el QR, y "Revisar y publicar", con el panel del checkout al lado. Antes de guardar, el servidor dice si los datos pasan; al cambiar uno, cuántas recargas y órdenes esperan un pago con los datos de antes.
  - **De paso:** Zinli ya se puede guardar (pedía el teléfono y no el titular que exige el servidor).
  - **La categoría:** qué es, cómo se ve y revisar, con la casilla y el chip de la tienda. Al cambiarla, cuántos productos y subcategorías van con ella.
  - **Para decidir, cuando se pueda:** el color de una categoría solo se ve en el panel y sus colores están fuera del kit.
  - **Siguen:** C-249d (campaña y promotor) y C-249e (curso y trabajo de Servicios).
- **C-249b · Crear por pasos: la oferta o el cupón y las gift cards impresas (rc.64, en producción; `estado/C-249b.md`):** la parte b de lo que eligió el equipo (la A), 2 de los 8 formularios.
  - **La oferta o el cupón,** en su propia página: qué es, el descuento, el código, las fechas y "Revisar y publicar", con la tarjeta del producto o el cupón como los ve el cliente al lado. Se puede guardar en pausa. Al cambiar una, antes → después y a cuántos productos y compras toca.
  - **Las gift cards impresas:** el monto, cuántas y "Revisar y generar", con la tarjeta impresa al lado. El lote con los PIN y la hoja, como siempre.
  - **El marco** (`components/admin/Asistente`) sirve para los otros seis. C-249c ya hizo el método de pago y la categoría (arriba); **siguen** C-249d (campaña y promotor) y C-249e (curso y trabajo de Servicios).
- **C-249 · Lo que eligió el equipo de C-245 (rc.63, en producción; `estado/C-249.md`):** la A y la A (`PLAN.md` §7.2).
  - **Hecho:** los filtros de Órdenes, Transacciones y Mensajes en las píldoras de estado, en todos los tamaños. Se fueron el selector y las pestañas.
  - **También:** Cursos, Trabajos realizados, Creadores y ElectroStudio, con las píldoras de `Filtros`.
  - **La parte b, crear por pasos,** va en C-249b (arriba).
- **C-248 · Dos botones de Contabilidad (rc.62, en producción):** en una venta de la tienda, el tacho de "Quitar el renglón" se ve entero (quedaba en 4 px); "Copiar datos para facturar" se pone en verde al copiar (`estado/C-248.md`).
- **C-245 · El panel entero con el kit de marca (rc.61, en producción):** lo pidió el equipo el 15/11 y lo hizo un agente aparte (`estado/C-245.md`).
  - **El inventario:** las 43 pantallas del panel, en el código y en capturas, con cada problema como mecánico o como rediseño.
  - **Lo mecánico, ya hecho en 14 módulos:**
    - los estados llenos en lugar de las píldoras claras;
    - el tipo y la plataforma como datos en gris;
    - sin ámbar en números, títulos ni frases;
    - el sello de te toca en Garantías y Clientes;
    - una sola acción principal en el detalle de la orden;
    - los filtros en píldoras con ícono en Productos, Reseñas, Garantías, Descuentos, Cotizaciones, Legal y Verificaciones;
    - las páginas que se centraban, junto al menú (Marketing, Notificaciones, Seguridad, Configuración, Equipo y Cotizaciones).
  - **Arreglos de paso:**
    - los formularios de Cursos, Servicios y Verificaciones ya no se cierran al tocar adentro;
    - "Aprobar verificación" ya no lleva letra blanca sobre el verde claro;
    - "Importar" de SADES se ve en el teléfono;
    - los botones cuadrados ya no aprietan el ícono.
  - **Para decidir, con maquetas** (en la PC de Andrés: `~/.cache/electroshop-trabajo/c245/decisiones.html`):
    1. crear por pasos los ocho formularios de una sola vez (cupón, método de pago, campaña…);
    2. los filtros de Órdenes.
- **C-246 · El destino claro para la guía y los datos de Ferrecla (rc.60, en producción):** pedido del equipo el 15/11 (`estado/C-246.md`).
  - **El correo y la página del proveedor dicen claramente a dónde va el paquete:** "Envíelo a" con la ciudad en grande (y su código de ZOOM), la oficina con su código o la casa del cliente si es puerta a puerta, y a nombre de quién. Los datos de la guía van en el orden de ZOOM.
  - **El proveedor tiene datos fiscales** (razón social, RIF y domicilio, como en su RIF) y **hasta 3 correos de despacho**: a todos les llega cada venta. La credencial de la bienvenida lleva la razón social y el RIF.
  - **Ferrecla:** sus datos se cargan en el panel después del deploy (§2, prueba 8).
- **C-247 · La foto del premio del sorteo (rc.59, en producción):** la PS4 Slim con el control azul del premio, sobre el azul de la franja (`estado/C-247.md`). La foto se sube desde el panel; la página la muestra más grande y sin fondo blanco.
- **C-244 · La vista previa de los correos (rc.58, en producción):** en Marketing → Correos de la tienda, la vista previa queda fija con el alto de la pantalla mientras se recorre la lista, y el correo se lee con un solo scroll (`estado/C-244.md`). Antes salía baja, con su propio scroll, y debajo quedaba un espacio en blanco.
- **C-243 · El kit de marca (rc.57, en producción):** el equipo eligió la paleta A viendo las maquetas: solo los dos azules del logo (`estado/C-243.md`).
  - La fuente única es `lib/marca.ts`, con su página en Marketing → Kit de marca, y `npm run check:marca` rechaza lo de fuera. Salen el azul noche y el cian, también de los correos y de las imágenes para compartir.
  - **C-245** (rc.61) repasó todo el panel con el kit (arriba).
- **C-242 · Facturas, ordenada (rc.56, en producción):** el equipo la vio en producción el 14/11 ("los grids se ven perdidos, íconos amontonados") y eligió la A viendo las maquetas (`estado/C-242.md`).
  - Tres datos del mismo alto: la próxima, el talonario y lo cobrado sin factura ("Al día" o "Te toca"). Lo raro, en gris bajo el talonario; las notas de la ley, detrás de su (i).
  - La tarjeta para elegir una opción trae todo adentro (`components/admin/Opcion`, `PLAN.md` §1.10): el asistente de factura ya no tiene el ícono encima ni el texto pegado al borde.
- **C-227 · Los correos al aliado comercial (rc.55, en producción):** el proveedor que despacha él mismo (la ferretería, desde La Victoria) recibe cada venta con todo para despacharla (`estado/C-227.md`).
  - **El nombre:** el proveedor es **aliado comercial** de Electro Shop (el equipo, 14/11: nada de jerga).
  - **Cada venta,** al confirmarse el pago: "¡Se vendió su producto!", con la empresa (ZOOM o MRW) en grande, la oficina, el plazo de un día hábil, los datos de la guía, su costo y el empaque. Copia al equipo.
  - **Su enlace, sin cuenta:** "Lo estoy preparando" y la guía. La guía deja la orden Enviada y al cliente le llega "va en camino".
  - **El día del plazo sin guía,** un recordatorio y un aviso al equipo. **Si se cancela,** "no la despache".
  - **En el panel,** Productos → Lista del proveedor: su contacto de despacho y la bienvenida con su credencial, que se envía con un botón.
  - **Arreglo:** el cron del sorteo (C-219) rebotaba al login; ahora responde.
- **C-235 · La contadora en el equipo (rc.54, en producción):** se invita como "Contadora" y entra a su propia mesa, con su firma y su sello (`estado/C-235.md`).
  - **Solo Contabilidad:** ve las facturas, lo cobrado sin factura y el mes, sin facturar ni anular. Lo demás del panel (órdenes, clientes, productos, Configuración) no lo ve, ni con la dirección escrita.
  - **Su mesa** (Contabilidad → Mesa de la contadora): el saludo con su nombre, el mes en números (base, IVA y exento), las últimas facturas, lo que viene, su firma y las notas del mes con el dueño.
  - **Su firma:** la dibuja una vez con el dedo o el mouse, con su nombre, su título y su C.P.C. Va en los cierres y en el Excel (C-230 y C-232).
  - **Quitarla y poner otra:** Equipo → ella → "Administrar" → "Quitar el acceso", e invitar a la nueva. Su firma queda guardada.
  - **Al subir:** un rol y dos tablas nuevas (§2). **Después, el dueño la invita** (§3, paso 23).
- **C-234 · Cuándo sale cada pedido (rc.52, en producción):** el cliente sabe antes de comprar qué día sale su pedido (`estado/C-234.md`).
  - **Las reglas:** lo pagado de lunes a viernes antes de las 2:00 p. m. sale ese día; lo del sábado y el domingo, el lunes; los feriados de Venezuela no cuentan, y lo de la ferretería sale un día hábil después.
  - **En la tienda:** "Compra en las próximas 2 h 15 min y sale hoy" o "Compra hoy y sale el lunes 16" en la ficha, el carrito y el checkout; "Sale el lunes 16 de noviembre" en Mi pedido y en el correo de la compra. Lo digital dice cuándo llega.
  - **En el panel:** Configuración → Envíos y retiro → "Cuándo sale cada pedido", con la hora de corte, los feriados (se puede abrir uno) y los días cerrados de más.
- **C-229 · Contabilidad: las facturas de talonario (rc.50, en producción):** la primera parte del módulo, con la maqueta B alineada (`estado/C-229.md`).
  - **Contabilidad → Facturas:** el talonario en uso (la próxima y cuántas quedan), lo cobrado este mes sin factura con "Facturar", y las facturas del mes.
  - **"Nueva factura de talonario" en 4 pasos:**
    - de dónde sale, a nombre de quién y qué se vendió;
    - al final, la factura tal como se escribe, con cada casilla numerada (en el teléfono, casilla por casilla);
    - "Ya la escribí: registrar la 00xx". Los montos los calcula el servidor desde la orden.
  - **Anular:** una factura mal escrita o un papel dañado, con su motivo. Nada se borra.
  - **Desde la orden:** "Facturar en el talonario", o "Ver la factura" si ya la tiene.
  - **Al subir:** dos tablas y una columna nuevas (§2). **Después, el dueño carga el talonario** (§3, paso 22).
- **C-219 · Los correos de la tienda (rc.47, en producción):** el equipo, el 14/11: "muy pobres, no tienen nuestra esencia". Eligió la maqueta C, clara con la cinta, con ELECTRO SHOP grande arriba y Chispa abajo, y textos "mucho más épicos" (`estado/C-219.md`, `AUDITORIA_CORREOS.md`).
  - **Los 26 que ya salían, con el diseño nuevo,** y **19 nuevos:** el pago confirmado, listo para retirar, la bienvenida, las recargas, la garantía, el contacto, los presupuestos, los avisos de la gift card, el sorteo y más.
  - **En Mensajes:** "Enviar con el diseño de la tienda" responde desde la tienda.
  - **Al subir:** una columna nueva y un cron (`cron-sorteo.sh`), en el bloque de §2.
- **C-228 y C-228b · Contabilidad: el plan completo (14/11; solo documentos y maquetas, sin deploy):** un módulo nuevo del panel (`CONTABILIDAD.md`, `estado/C-228.md` y `estado/C-228b.md`).
  - **Qué lleva:**
    - la factura de talonario guiada, con la maqueta B elegida y alineada;
    - el libro de ventas y el IVA del mes;
    - la contadora dentro del equipo, con su firma y su "Mi mesa";
    - gastos y compras, el alquiler del local, la nómina con pensiones y la Alcaldía de Guanare;
    - un calendario de pagos con avisos por la campana y por Telegram.
  - **Lo más importante:** el **19/04/2027** cambia la facturación (Providencia SNAT/2026/00093).
    - El talonario queda solo para contingencias.
    - Se factura con el portal o la app del SENIAT (elegido el 14/11).
    - Lo que sobre del talonario ese día se anula.
  - **Hoy:** la empresa es ordinaria y factura solo con el talonario (SADES no imprime factura fiscal). La ley pide factura en cada venta: decidirlo con la contadora (A16).
  - **Las 17 preguntas para la contadora,** listas para WhatsApp en tres mensajes: `~/Escritorio/Electro Shop/Contabilidad/preguntas-contadora-14-11.txt`. Las urgentes son la 1 (factura en cada venta) y la 2 (el IVA de los digitales: la Factura 67 lo cobró y la web no).
  - **Las maquetas,** en la PC de Andrés: `~/Escritorio/Electro Shop/Contabilidad/Maquetas C-228/` (Resumen, factura A y B, libro de ventas y "Mi mesa").
  - **Hechas:** C-229 (las facturas, rc.50) y C-235 (la contadora, rc.54). **Sigue:** C-230 (antes del 15/12), C-236, C-237, C-232, C-238, C-239, C-240, C-231 y C-233 (`PLAN.md` §5.2).
- **C-226 · Ningún contenedor ámbar (rc.44, en producción):** el equipo, el 14/11: "ese color de contenedor ámbar lo detesto, está en todos lados". Viendo tres opciones eligió el azul claro de la tienda con el ícono cian en su placa azul noche (`estado/C-226.md`).
  - **La regla, para todas las IA:** `CLAUDE.md`, `GEMINI.md` y `PLAN.md` §1.1, §1.7 y §1.8. Ni cajas, ni avisos, ni fondos, ni bordes, ni píldoras ámbar.
  - **Lo que cambió:** el aviso compartido del panel (42 lugares), 24 pantallas de la tienda y del panel y la caja de aviso de los correos. Sin cambio de base.
- **Tres sesiones de Claude a la vez el 14/11**, cada una en su worktree: la de los correos (C-219, C-226, C-227 y C-234), la del plan de crecimiento (C-220 a C-225 y C-241) y la de Contabilidad (C-228 a C-240).
- **C-241 · El checkout por pasos (rc.53, en producción):** lo que eligió el equipo viendo las maquetas: un paso a la vez y pagar al final (`estado/C-241.md`).
  - Carrito, Entrega, Revisar y Pagar arriba, con su ícono. Cada paso dice qué le falta para seguir. Revisar muestra la entrega elegida con "Cambiar".
  - Nada se pierde al ir y volver. Con un Pago Móvil ya verificado no se vuelve atrás. El dinero no cambia: el servidor calcula y valida como antes.
  - Sin letras ámbar: la frase de los términos va en negrita. Los sellos ("Verificado", "Conciliación BDV", "Puntos ES suficientes") van llenos, en verde fuerte con letra blanca.
- **C-224 · Lo que nos hace únicos (rc.51, en producción):** "Por qué comprar en Electro Shop" en el inicio, en lugar de "Compra con confianza" (`estado/C-224.md`).
  - Sabes cuánto pagas antes de pagar; tu Pago Móvil lo confirma el banco (si la verificación del BDV está activa; si no, la atención por WhatsApp); una tienda de verdad, con taller propio.
  - Los 14 años en Portuguesa, también en el pie y en Servicios (se cuentan solos desde 2012). La garantía de la ficha dice que la atiende el servicio técnico.
- **C-223 · El aviso de cookies (rc.49, en producción):** listo para cuando se pongan las claves de Google y del píxel (`estado/C-223.md`).
  - Chico y abajo, con "Solo las necesarias" y "Aceptar" del mismo tamaño y "Elegir". "Cookies", al pie, lo vuelve a abrir.
  - Hasta el sí, Google va sin cookies (Consent Mode) y el píxel no carga. Sin claves no sale nada.
  - La medición propia guarda la IP sin su último tramo. El texto nuevo de la política espera al abogado (sección 3, paso 18).
- **C-225 · Los textos para buscadores (rc.48, en producción):** ya no dicen "tienda de tecnología" (`estado/C-225.md`).
  - Sin texto propio en Configuración → SEO, se arman con lo que vende la tienda hoy ("tecnología, ferretería y gift cards"): crecen solos con cada departamento.
  - La ficha para Google es de una tienda (Store), `llms.txt` dice "Tienda en Guanare" y la imagen de la portada lleva de título lo que vende, con el lema debajo.
  - El título, la descripción, las palabras clave y el lema de producción los cambia el SQL de datos del bloque (C-220).
- **C-222 · "Desde Aragua" y el filtro de ubicación (rc.46, en producción):** lo que eligió el equipo el 14/11 (`estado/C-222.md`).
  - La tarjeta de todo lo físico dice "Desde Aragua" o "Desde Portuguesa", con el ícono de ubicación. La ficha empieza la entrega con "Sale de La Victoria, estado Aragua".
  - El catálogo filtra por "Desde dónde sale", con la cuenta de cada lugar.
  - El carrito, el pago, "Calcula tu envío" y el detalle del pedido dicen "desde Aragua (La Victoria)".
  - Dos columnas nuevas (aditivas) y su relleno, en el bloque de la sección 2.
- **C-221 · El sorteo por pasos (rc.45, en producción):** el primero hecho con las reglas de `PLAN.md` §1.9 (`estado/C-221.md`).
  - Crearlo: 4 pasos (el premio, cómo se gana, las fechas y "Revisar y publicar") con la vista previa de /sorteo y de Mi panel al lado. La foto se sube o se elige de la tienda.
  - Ya creado: su tablero, con el estado, la línea de tiempo, los números, Copiar enlace, Ver en la tienda, Cambiar y Publicar o Apagar.
  - Al cambiar algo: antes → después y a cuántos clientes les cambian los boletos, antes de guardar. Al cerrar, sortear en 3 pasos.
  - **Los textos para Google, el lema y el sorteo de Navidad ya publicado van en el SQL de datos del bloque** (el equipo pidió el 14/11 no hacerlos a mano).
- **C-220 · El plan de crecimiento del 14/11 (solo documentos, sin deploy):** cinco pedidos del equipo, con maquetas hechas con datos reales. El equipo eligió lo recomendado en las ocho preguntas (`estado/C-220.md`, `PLAN.md` §7.2).
  - **Reglas nuevas para todas las IA** (`PLAN.md` §1.9, `CLAUDE.md`, `GEMINI.md` y `AGENTS.md`): crear algo en el panel va por pasos con su ícono, con poco texto y una vista previa antes de publicar; al cambiar algo publicado, antes → después.
  - **El orden:**
    1. el sorteo por pasos (C-221);
    2. "Desde Aragua" y el filtro de ubicación (C-222);
    3. los textos para buscadores (C-225);
    4. el aviso de cookies (C-223);
    5. los tres que nos hacen únicos (C-224).
  - **Cookies, cómo estamos:** hoy no hay cookies de Google ni de Meta, porque faltan sus claves. El aviso va antes de ponerlas (C-223).
  - **Las maquetas,** en la PC de Andrés: `~/.cache/electroshop-trabajo/c220/maquetas.html`.
  - **Otras sesiones de Claude, el mismo día:**
    - C-219 (los correos), C-226 (el ámbar en contenedores), C-227 (los correos a proveedores) y C-234 (horarios y fecha de salida);
    - C-228 a C-233, Contabilidad.
    - Cada una trabaja en su worktree y mergea con `git status` limpio en la carpeta principal.
  - **¿rc.43 ya en producción?** El pie del panel en una captura del 14/11 dice "Versión 1.0.0-rc.43 · fcdc4c0". Falta comprobarlo (`OPERACION.md` §3) y pasar el bloque a `HISTORIAL.md`.
- **C-218 · El catálogo de la ferretería con Claude (rc.43, en producción):** la idea F y lo que faltaba de B. La lista completa de cada proveedor queda guardada al subirla; "Proponer con Claude" propone la categoría y el nombre de todo lo nuevo (los 3.114, en unos 7 minutos) y las solicitudes dicen si la ferretería lo tiene (`estado/C-218.md`). Con esto quedan hechas las cinco ideas de Haiku que eligió Andrés.
- **C-217 · Campañas de correo con Claude (rc.42, en producción):** la idea C. En el editor de campañas, "Armar con Claude" va del objetivo al asunto y el texto con hasta 4 productos reales; la foto, el precio y el enlace los pone la tienda (`estado/C-217.md`).
- **C-216 · Sin píldoras ámbar (rc.41, en producción):** Andrés las detesta ("se ven demasiado genéricas") y eligió la opción A: lo que alguien tiene que hacer va en un sello azul noche con el ícono en cian, en todo el panel y en Mi panel. La regla quedó en `PLAN.md` §1.1 y §1.8 y en `CLAUDE.md` (`estado/C-216.md`).
- **C-215 · Mensajes y solicitudes por urgencia (rc.40, en producción):** la idea B, la parte de la tienda. Claude marca la urgencia, de qué trata y por qué, y en las solicitudes si ya está en la tienda; lo nuevo se revisa solo al llegar (`estado/C-215.md`). La lista de la ferretería entra con F.
- **C-214 · Respuestas a clientes con Claude (rc.39, en producción):** la idea D. En cada mensaje de contacto, "Redactar con Claude" escribe la respuesta con su orden, los productos que nombra y lo que cobra ZOOM a su ciudad; se revisa y se manda por correo o WhatsApp (`estado/C-214.md`).
- **C-213 · El resumen del cliente en su ficha (rc.38, en producción):** la primera de las ideas de Haiku que eligió Andrés (A). La pestaña Resumen dice lo que hay que atender y cómo compra, y a pedido Claude escribe quién es como cliente y qué ofrecerle (`estado/C-213.md`).
  - **De paso:** "Total gastado" ya no suma lo pendiente ni lo cancelado, y las órdenes de la ficha tienen su monto.
  - **La clave de Claude del 13/11 ya no sirve** (Anthropic da 401): hace falta una nueva para el paso 1 del bloque. Se probó con un Claude simulado.
  - **F y la parte de B que faltaba:** hechas en C-218.
- **C-212 · El sorteo de la PlayStation 4 (rc.37, en producción):** Andrés lo pidió el 13/11 y eligió los números para que la empresa no pierda (`estado/C-212.md`).
  - **Cómo se participa:** 1 boleto por cada compra pagada de USD 10 o más, o invitando a 2 amigos con su enlace, sin comprar (1 boleto por cada 2, hasta 3). El resultado, el 20/12.
  - **Dónde:** la página `/sorteo`, Mi panel y Marketing → Sorteo (lo que dejó, quiénes participan y "Sortear ahora").
  - **Sin permiso de Conalot, por decisión de Andrés** (`PLAN.md` §7.2): no se vende ningún boleto y hay una forma de participar sin comprar.
  - **Después del deploy:** crear el sorteo en el panel con la foto de la consola y encenderlo (paso 6 de las pruebas).
- **C-211 · Claude Haiku 5.5 en "Buscar en la web" (rc.36, en producción):** Andrés pidió cambiar Groq por Claude y dio su clave (`estado/C-211.md`).
  - Claude lee las páginas, redacta la ficha y busca por su cuenta. Groq queda de respaldo.
  - La ficha dice qué IA la redactó.
  - **Va en esfuerzo alto y no máximo:** el máximo tardó 98 y 158 s y nginx corta a los 60 s; el alto, 17 y 13 s, con casi la misma ficha. Se cambia en el `.env`.
  - **La clave va en el `.env` del servidor** (paso 1 del bloque).
- **C-210 · Correcciones del 13/11 (rc.35, en producción):** Andrés miró producción con rc.34 y pidió tres cosas. Eligió lo recomendado en las cuatro preguntas (`estado/C-210.md`).
  - **"Destacados" muestra solo lo que tiene estrella,** de toda la tienda. Antes se completaba con relleno y por eso no se iban los que desactivaba.
  - **"Recién llegados" va por la fecha de publicación** (columna nueva `products.publishedAt`, con su relleno), con hasta 4 por departamento.
  - **Las píldoras del panel van llenas,** como los sellos de la tienda, y los botones se animan al pasar y al tocar (`PLAN.md` §1.8).
  - **Andrés no trabaja con Gemini por ahora:** no se dejan planes para él.
- **C-207 · El inicio que vende (13/11, rc.34, en producción):** Andrés vio el plan de los 5 cambios del inicio y eligió. Se hicieron el 1, el 3 y el 4 (`estado/C-207.md`).
  - **El saludo navideño ya no tapa la tienda:** es una franja dentro del inicio, después de los destacados. Andrés va a mejorar su diseño. Los textos siguen en Marketing → Navidad.
  - **Cada producto sale una sola vez.** "Recién llegados" trae lo último de toda la tienda, ferretería incluida, con pocos de cada rincón, y las gift cards van en una sola sección, con cada plataforma y su monto.
  - **"Compra por categoría"** lleva la foto de un producto real y la cuenta solo desde 10. Las categorías chicas van juntas en "Más categorías".
  - **Sigue C-209:** la portada (2) y las pruebas de confianza (5), con maquetas antes. Los videos de creadores son C-208, con su plan maestro aparte.
- **C-205 · La Lista del proveedor por pasos (13/11, rc.33, en producción):** Andrés miró la carga masiva y marcó tres cosas: contenedores anchísimos para una palabra, que no se sabía qué hacer ni adónde ir, y píldoras sin ícono ni explicación (`estado/C-205.md`).
  - Eligió la maqueta A: un paso a la vez, con los pasos arriba y "Atrás / Siguiente: …" abajo.
  - Los campos, del tamaño de su dato. Los filtros, con ícono, cuenta y subtítulo.
  - Las reglas para todo el panel y la web quedaron en `PLAN.md` §1.5 a §1.7. Pasar las demás pantallas a la regla es C-206.
- **La carpeta de la ferretería, numerada en el orden en que se usa (13/11, fuera del repositorio):** `LEEME.txt` explica cada cosa.
  - "1 - Cargar en la tienda": el archivo de los 70, la existencia y "Fotos para subir"; en el paso 2 se selecciona todo y se suelta.
  - "2 - Para la ferreteria", "3 - Sus listas originales", "4 - Trabajo de fotos (no se sube)" y "5 - Anteriores".
  - **74 de los 85 códigos tienen foto (105 archivos):** 24 productos con lo que bajó Hydrogen de MercadoLibre y 5 de otras tiendas, revisados uno por uno.
  - **Se apartaron:** los protectores PARTEP (la ferretería vende el PARTE), una foto reconstruida con IA y dos membranas juntas.
  - Las preguntas para la ferretería, más cortas: `Preguntas para la ferreteria 13-11.txt`.
- **C-199 · El envío desde el proveedor y "Calcula tu envío" (12/11, rc.32, en producción):** Andrés pidió un cálculo del envío "tipo con la API de Zoom" y eligió lo recomendado en las cinco preguntas, junto con C-199 (`estado/C-199.md`).
  - **"Calcula tu envío" en la ficha y en el carrito:** estado y ciudad de ZOOM, recordados; lo que cobra ZOOM retirando en su oficina, en $ y Bs; un estimado propio si ZOOM no responde.
  - **La ferretería despacha desde La Victoria:**
    - "Sale desde La Victoria" en la ficha y la tarjeta;
    - solo envío;
    - si el carrito mezcla, dos paquetes, cada uno con su embalaje, su guía y su orden.
  - **El envío gratis vale solo para el paquete de Guanare.**
  - **A15, decidida por Andrés el 13/11:** cada paquete calcula lo suyo. El monto del envío gratis cuenta solo lo que sale de Guanare, como ya funcionaba (`PLAN.md` §7.2).
- **En producción desde el 13/11 (rc.33):** rc.30 la subió el equipo sin anotarlo (usuario `luami`), y el 13/11 subió de rc.30 a rc.33. El bloque y lo comprobado están en `HISTORIAL.md`.
- **C-204b (12/11, rc.31, en producción):** Andrés mandó una captura: la "Motobomba a gasolina" salía como "No se envía". Arreglado (`estado/C-204b.md`):
  - después de "a", "para" o "P/", la palabra de la lista no cuenta;
  - el botón "Sí se envía" deja pasar lo que la regla marque mal;
  - de una carpeta solo se toman las fotos. Los `.csv` de trabajo de "Fotos del fabricante" se leían como su lista, y de ahí salía el "modelo" largo de la captura.
- **Las fotos de MercadoLibre (12/11):** Andrés vio que allí están casi todas las que faltan. El agente no puede navegar MercadoLibre: el permiso de la sesión lo bloqueó, y Claude no usa la cuenta de nadie. Quedó una página con la búsqueda de cada producto para bajarlas a mano (sección 3, 0c).
- **C-204 · La carga masiva, completa (12/11, rc.30, en producción):** Andrés pidió cinco preguntas antes de tocar código y eligió lo recomendado en las cinco (`PLAN.md` §7.2). En Productos → Más → Lista del proveedor (`estado/C-204.md`):
  - el Excel y las fotos van juntos: se sueltan encima o se elige la carpeta, y cada producto se crea con las suyas;
  - lo que ZOOM y MRW no llevan (pinturas, solventes, aerosoles, pegas con solvente, gas) se marca y no se crea;
  - "Sugeridos" pone primero lo afín a la tienda que aguanta solo su envío;
  - la columna "Modelo" entra a la ficha;
  - **el paso 5:** dice qué le falta a cada borrador, los completa con la web (la IA propone, el equipo revisa) y publica los listos.
- **La ferretería respondió las preguntas (12/11, el .docx de Andrés):**
  - **Confirmados:** DAQB60, DAQB90, DAEPC-11A, DAJS710, la careta 45086, la desmalezadora DBC520, el bombillo de emergencia y el reflector de Run, y el atornillador de 12 V, que viene suelto y con batería y cargador.
  - **Distintos de lo que se eligió el 10/11 por las fotos** (manda lo que dijo la ferretería):
    - el esmeril HE00040 es de 850 W (ULAG15854);
    - el panel R016087 es de empotrar;
    - la pistola HE00038 es la DAPG500HM;
    - la soldadora E000004 es la FW131M;
    - HE00051, el rotomartillo, es "ELRH21228";
    - HE00044, el kit de alicates, es "EMP50603";
    - HE00028, la lijadora, es la "DAPAS230G";
    - EX10081, la motosierra, es la "DACS5820".
  - **Marcas nuevas:** los protectores son Protektor; el flotante, Aquafina; el tablero, Brickell; las griferías, BG. Además, el cable es Protonic de 100 m.
  - **Siguen sin respuesta:** el presostato, el juego de 166 piezas, la pinza MT87, la membrana de 50 L y las fotos de las cerraduras Brufer.
- **Las pinturas, fuera por ahora (Andrés, 12/11):** ZOOM y MRW no las llevan. Los 60 pasan a **los 70**:
  - salen los 15 códigos de pinturas;
  - entran 14 productos con la regla de "Sugeridos" (`PLAN.md` §5.2).
  - El archivo nuevo es `Electro Shop - los 70 para cargar.xlsx`, en la carpeta de proveedores de Andrés.
- **Las fotos de los 70 (12/11, un agente aparte en Sonnet, pedido de Andrés; con las reglas del 10/11):**
  - **50 de los 85 códigos tienen foto:** 73 archivos en "1 - Para subir", y todos pasan por la preparación de la tienda.
  - **8 fotos que eran de otro modelo pasaron a "3 - No usar",** con el motivo en el nombre. Las pinturas pasaron a "4 - Pinturas (por ahora no se venden)".
  - **Cinco modelos que dijo la ferretería no existen en la web de la marca:** ULAG15854, ELRH21228, EMP50603, DAPAS230G y DACS5820. De los Protektor, la marca publica PARTEP y PARP.
  - **"BG" es Belt-G** (las griferías son la GRI-0764 y la GRI-0763), y "Pico" no es una marca: son los picos de voltaje.
  - **15 fotos son de un modelo que dedujo el agente** (los nuevos de Daewoo, Emtop, Ingco y Bellota, entre otros). Se confirman con la ferretería.
  - **El mensaje con lo que falta:** `Preguntas para la ferreteria 12-11.txt`, en la carpeta de proveedores. Pide fotos de la caja de 35 códigos, aclara los Protektor y confirma 15 modelos con un sí.
  - El archivo de los 70 trae la columna "Fotos listas".
- **C-203 · Las pestañas abiertas durante un deploy (11/11, rc.29, en producción; Claude lo comprobó desde fuera el 12/11):** los dos errores de la consola del 11/11 (404 en `/categorias` y `getCategoryIconOption is not a function` en Categorías del panel) eran de una pestaña abierta desde antes del 06/11. Producción estaba bien. Ahora una pestaña de otra versión se recarga entera al navegar, en vez de mezclar las dos, y el deploy sigue sirviendo 7 días los archivos de las versiones anteriores. Sin bajar nada de nuevo después de cada deploy. De paso, las miniaturas de YouTube de `/servicios` (`estado/C-203.md`).
- **Producción: `v1.0.0-rc.29`** (C-203), comprobada por Claude desde fuera el 12/11. El bloque pasó a `HISTORIAL.md`. Antes: **`v1.0.0-rc.25`** (C-196, C-196b y C-197), subida el 10/11 por Andrés y comprobada desde fuera: la ficha nueva y la base aplicada. Lo que necesita una cuenta está en la sección 2, "Por confirmar de rc.25". **Desde el 10/11 en la noche, producción está en `v1.0.0-rc.28`** (C-201, C-202 y C-200). La subió Andrés, con el guion de Ferretería, y Claude la comprobó desde fuera. Lo que necesita una cuenta está en la sección 2, "Por confirmar de rc.28". Siguen pendientes las fechas de corte en el panel, los borradores de campaña (si no se corrió el guion) y, de rc.19, la limpieza de los zombis desde el panel.
- **Pedido del 10/11 (Andrés): vender de todo, con la ferretería aliada.** Las maquetas y el plan están en una página privada de Andrés (el enlace, en el chat de esa sesión). Los productos de la ferretería están en La Victoria (Aragua) y se venden solo con envío.
  - **C-196 · Admin → Productos para miles de productos (hecha, en rc.24):** la lista por páginas (de 4.626 KB a 29 KB con 3.100 productos), el proveedor y el costo en cada producto, y Productos → Más → Lista del proveedor: su Excel en lote y las fotos por código (`estado/C-196.md`).
  - **C-196b (hecha, en rc.25):** la casilla "Su lista trae el IVA incluido". Su "Precio Máximo" trae el IVA y es lo que la tienda le paga: costo sin el IVA, y la bomba de $54,90 queda en $71,37 y no en $82,78.
  - **C-197 (hecha, en rc.25):** la ficha en una sola tarjeta, la maqueta A que eligió Andrés.
  - **Decidido el 10/11** (`PLAN.md` §7.2):
    - las fotos, del fabricante;
    - las variantes, como familias (C-198);
    - el envío desde La Victoria, en dos paquetes (C-199);
    - el departamento Ferretería (C-200).
  - **El flete real desde La Victoria** (ZOOM, consultado el 10/11): 5 kg, unos $22 a Caracas; 20 kg, unos $61; el mínimo ronda los $6,40. Lo barato (bombillos, pintura, machetes) solo se vende como complemento en la misma caja.
- **C-201 · Mi panel (10/11; Andrés eligió arreglar los dos errores y pulir el inicio; en `main`, rc.26):**
  - En el teléfono, el inicio ya no se sale de la pantalla.
  - Los movimientos viejos ya no dicen "Saldo devuelto".
  - Además: sin "En vivo", "Actividad reciente", las misiones en una tarjeta corta para quien ya compró, el menú parejo y Garantía entera a 360 (`estado/C-201.md`).
- **Los nombres de los productos (10/11):**
  - **El sistema de la ferretería corta los nombres en el carácter 30:** 243 de sus 3.113 terminan justo ahí, contra unos 165 en los largos vecinos, como "MAQ P/SOLDAR 225AMP 220V LINCO".
  - **Los 8 productos físicos publicados están en mayúsculas.**
  - **Se corrigieron los 80 nombres del archivo de los 60.**
    - Les faltaban datos: modelos como G-0764 o 209636, y el beige de las botas.
    - Tres estaban cambiados: "100V" puesto como 120 V, y "aires" y "doble" agregados.
    - Ahora llevan todo lo de su lista y nada más. La columna "Revisar antes de publicar" trae 28 preguntas para la ferretería, y otra columna, el modelo que encontró el agente de fotos, para que solo lo confirme.
  - **C-202 (en `main`, rc.27; Andrés eligió las opciones recomendadas):**
    - Los nombres van escritos normal en toda la tienda (`PLAN.md` §7.2).
    - La Lista del proveedor propone el "Nombre en la tienda" de cada producto nuevo, editable y con lo dudoso marcado; su nombre original se guarda aparte.
    - El asistente avisa si un nombre está en mayúsculas.
    - **Cambiar el nombre ya no rompe el enlace:** la dirección vieja lleva a la nueva (`estado/C-202.md`).
    - **Los 14 nombres nuevos de los productos publicados** están en `estado/C-202.md` y esperan el OK de Andrés. **No renombrar nada publicado antes de subir rc.27.**
- **C-200 · El departamento Ferretería (10/11, en `main`, rc.28; Andrés eligió las maquetas recomendadas):**
  - Acceso en la franja al lado de Ofertas, y en el teléfono primer chip y entrada en "Más".
  - Su vitrina después de "Recién llegados" y su página con el aviso del envío y sus 9 categorías.
  - El resto del inicio sigue siendo de tecnología.
  - No se ve hasta que tenga productos publicados (`estado/C-200.md`).
  - Íconos nuevos: los 10 que generó Andrés, en el pack v1.2. La página para Luis: `ElectroShop Brand/Pack de íconos/iconos-electro-shop-v1.2.html`.
- **Maquetas y planes del 10/11 (páginas privadas de Andrés):**
  - "Para ti en Mi panel": eligió la V1, tarjetas por motivo.
  - "Electro Shop lo tiene todo: plan con ElectroStudio", con su calendario hasta el 31/12.
  - "Flyers: lo tiene todo": cuatro plantillas con su animación, que esperan que las elija.
- **Las fotos de los 80, terminadas (10/11):** las hizo otra sesión de Claude, con el dueño de la cuenta (`PLAN.md` §7.2). Están en `Fotos del fabricante`, fuera del repositorio.
  - **"1 - Para subir": 51 códigos en 63 archivos.**
    - Todas pasan por la preparación de fotos de la tienda: fondo blanco y la cinta.
    - Las de Tolsen van sin su logo suelto, y las de Emtop sin textos en inglés ni recuadros.
    - Las originales quedaron en "Originales sin limpiar".
  - **Modelos confirmados (13), y nuevos:**
    - HE00060 es Tolsen 79037, HE00024 es Daewoo DAJS710 y E000005 es la FIX 120M.
    - HE00028 es la Daewoo DAOS230: roto orbital, no de banda. Su nombre pasó a "Lijadora roto orbital 240 W Daewoo DAOS230".
    - Las fotos de HE00024 y HE00028 son de la tienda oficial de Daewoo en otro país, con la regla de distribuidor.
  - **Nombres corregidos:** HE00040 es de 750 W, HE00062 de 89 piezas y R016087 de sobreponer.
  - **Sin foto:** EX10081 (la motosierra de 20") y EX10020 (la membrana: no se pudo recortar limpia). Hay 29 más en "Sin foto todavia.csv".
  - **Las preguntas para la ferretería bajaron de 48 a 31,** en 2 mensajes: el .txt y la hoja "Para la ferreteria".
  - **En el archivo de los 60,** 20 nombres llevan el modelo al final. Los encabezados, las categorías y el orden de las hojas no cambiaron.
- **Pedido del 06/11 (tres correcciones, desde la cuenta de Andrés), decidido con una página de maquetas:**
  - **C-191 · Marketing decía "1 cliente":** las campañas van solo a quien aceptó promociones, y nada se lo preguntaba. Ahora se pregunta al registrarse y una vez en Mi panel, y el panel dice "N de M clientes" con el desglose (`estado/C-191.md`).
  - **C-192 · El ámbar, solo para avisos:** la regla de `PLAN.md` §1.1 (variante B, placa azul noche) en los correos, la tienda y el panel (`estado/C-192.md`).
  - **C-193 · ElectroStudio:**
    - Chispa en las historias.
    - El toque navideño: gorro, franja del 24 y tres fondos.
    - Los íconos del pack y el texto para publicar con las reglas de Chispa.
    - Dos plantillas: Regalos por presupuesto (Vitrina) y Felicitación (Tarjeta). Detalle en `estado/C-193.md`.
  - **C-194 · El popup navideño del inicio** con el diseño de la felicitación ("este me encanta para que sea el popup del inicio") (`estado/C-194.md`).
  - **C-195 · Chispa 3.0** (aprobada el 06/11, en rc.23): manos y dedos, movimiento natural, cara y expresiones (`estado/C-195.md`).
    - Las manos se corrigieron tres veces: cortes en las uniones, pulgares que parecían índice y el aro del OK grande.
    - Se buscó una skill para dibujar manos y no hay: las reglas quedaron en `chispa/conocimiento/02`.
- **C-187 · Admin → Productos (06/11, pedido de Andrés, en producción):** ya se pueden eliminar los zombis (`estado/C-187.md`).
  - **El motivo:** "Borrar para siempre" de un producto con ventas lo dejaba archivado y de vuelta en la lista, todavía destacado. El cron de la papelera hacía lo mismo a los 30 días.
  - **El arreglo:** ahora queda **eliminado**, fuera de la lista, de la papelera y de la tienda, sin tocar sus órdenes, garantías, reseñas, códigos ni Puntos ES. Solo el dueño lo puede recuperar, y vuelve como borrador. Lo archivado va en su propio filtro.
  - **Las 5 mejoras:** el filtro "Por revisar" (sin foto, sin marca y sin medidas); la vista que se recuerda; "Deshacer" al cambiar el estado; la estrella de destacado en la lista; y el panel bien a 360, 768 y 1024.
  - **Verificado:** 102 de 102 pruebas, humo 59 de 59, tsc, lint y build.
- **C-186 · Tema navideño (06/11, en producción, encendido):** Andrés dio el GO. Marketing → Navidad lo prende con fechas y sin deploy. Trae el gorro de Santa en el logo, en dos versiones a elegir, y la tarjeta navideña del popup, todo con el estilo del pack de íconos (`estado/C-186.md`). De las 5 recomendaciones, Andrés eligió la 1, la 3 y la 4, y las hizo C-190.
- **C-188 · Los íconos propios en la web (06/11, en producción):** 156 íconos del pack reemplazan a los de librería en la tienda y el panel; el sello "Digital" ya no tiene el rayito. Capturas de antes y después: `~/.cache/electroshop-capturas/C-188/comparar.png`. La página de descarga para Luis está en la v1.1, en `~/Escritorio/ElectroShop Brand/Pack de íconos/`.
- **C-189 · El selector de íconos de categorías, cerrado al pack (06/11, en producción):** el checkout baja de 6,3 a 1,3 MB de JS (`estado/C-189.md`).
- **C-190 · Navidad que vende (06/11, en producción):** Ideas para regalar, la fecha límite antes del 24 y los dos borradores de campaña (`estado/C-190.md`).
- **C-185 · Limpieza (06/11, con el OK de Andrés):** la carpeta de Andrés estaba 41 commits atrás (lo de Luis del 11 al 28/10) y se puso al día. Se borraron las 178 ramas locales viejas, el stash y los worktrees de ChatGPT y de Gemini, 8 archivos sin uso y los 40 uploads de 2025 que estaban versionados. En GitHub quedan `main` y las etiquetas. Detalle en `estado/C-185.md`.
- **Pedido del 16 y 17/10 (Luis): cotizaciones desde Numen.** Numen es la app de precios y proveedores del equipo, en un repositorio privado aparte. Las cotizaciones las arma Numen y las emite la web.
  - **C-181:** la entrada de servidor a servidor, y cuándo el cliente abre su enlace. Hecha (`estado/C-181.md`).
  - **C-182:** el documento con el estilo del presupuesto técnico (Luis eligió la maqueta A, con impresión en blanco y negro) y su PDF. Hecha y en producción el 18/10 (`estado/C-182.md`).
  - **C-183:** las condiciones y las formas de pago a lo ancho, debajo de los totales (Luis eligió la variante A el 18/10). Hecha y en producción el 18/10 (`estado/C-183.md`).
  - **C-184:** el descuento del convenio CCIET y la mano de obra a la vista, en tablas separadas y con el precio de lista tachado (Luis eligió la variante C sin la franja el 28/10). Hecha y en producción el 28/10 (`estado/C-184.md`).
- **Pedido del 16/10 (Luis, del equipo, trabajando con Claude desde su laptop):** la salud del servidor y las imágenes que se ven al compartir un enlace de la tienda. Primero el plan y después el código. Tareas:
  - **C-176 · Mantenimiento del servidor:** hecha el 16/10 (`estado/C-176.md`, `HISTORIAL.md`). El sistema quedó al día, con Node 24, kernel nuevo, fail2ban, HTTP/2 y registros con tope. La tienda estuvo caída unos 10 segundos.
  - **C-177 · Dependencias seguras:** hecha y en producción el 16/10. Next, sharp y nodemailer quedaron en versiones sin las fallas conocidas, y la tienda escucha solo en `127.0.0.1`.
  - **C-178 · Imágenes para compartir:** hecha y en producción el 16/10. Decisiones de Luis con maquetas reales (Andrés puede cambiarlas):
    - Precio solo en dólares.
    - Estilo mixto: los productos en claro; la portada, las categorías y las páginas en oscuro.
    - Nombres tal cual, sin "(SALDO)" en la imagen.
    - Lo subido a mano en SEO manda.
    - La portada dice "Todo lo encuentras con nosotros." (ajuste rc.14, después de verla en WhatsApp).
  - **Aparte:** la portada del perfil de WhatsApp Business, con Chispa, en el estudio de Chispa (`C:\Users\W11\chispa\salida\portada-whatsapp.png`).
- **El ciclo C-168 a C-175 está completo.**
- **Activar "Continuar con Google"** (C-85) es aparte y solo de Andrés: un cliente OAuth nuevo y dos líneas en el `.env` (pasos más abajo). No cambia código.
- **Sin confirmar con Andrés:** la restauración de prueba del respaldo, el redondeo de C-96 y las pruebas visuales de C-162.
- **Gemini:** sin ronda abierta. Su carpeta (`../ElectroShopVe-gemini`) volvió el 15/11 con la rama `gemini/maqueta-5-redisenos`: una maqueta de cinco rediseños (`maquetas/propuesta-5-redisenos`). **El equipo la descartó el 16/11** ("lo de Gemini no va"): no se revisa ni se fusiona.

## 2. Deploy pendiente
### Lo que falta subir: `v1.0.0-rc.99` (C-286, los videos de ElectroStudio)
Producción está en `v1.0.0-rc.98` (`342c56f`); su bloque está en `HISTORIAL.md`. Este es el único bloque pendiente.
- Sin cambio de base, sin SQL, sin variables nuevas y sin cron. Trae una dependencia nueva (`mp4-muxer`), que instala `deploy.sh`.
- **Subir** (en la terminal del servidor): `cd /var/www/electroshopve && git pull --ff-only && bash scripts/deploy.sh --sin-pull`.
  - Al terminar, `git describe --tags` debe decir `v1.0.0-rc.99`, o una mayor si entró otra tarea antes del `git pull`.
- **Pruebas** (unos 10 minutos). Antes, recarga el panel (Ctrl+R):
  1. **En el teléfono de marketing, con Chrome:** ElectroStudio → una historia → Animación: 15 s → Publicar → "Descargar video". Sale "Armando el video: N %" y se descarga. Ábrelo en la galería: dura los 15 s enteros.
  2. **Telegram:** el mismo video llega al chat del bot con el texto de la historia, en Full HD, y el panel dice "Listo en Telegram". Ábrelo ahí: también dura 15 s.
  3. **En la computadora:** lo mismo con otra historia; el video se ve entero en el reproductor de la PC.
  4. **Apagarlo** (solo si no lo quieren en Telegram): Notificaciones → Qué avisar → Marketing → "Video de ElectroStudio", la casilla de Telegram.
  5. **El flyer del sorteo** (un cliente con boletos, en el teléfono): "Video" → se descarga y dura entero.
- **Si algo falla, la vuelta atrás** (en la terminal del servidor): `cd /var/www/electroshopve && git reset --hard v1.0.0-rc.98 && npm install && bash scripts/deploy.sh --sin-pull`.

### Por confirmar de rc.98 (C-279, el Dashboard nuevo; unos 10 minutos)
Ya en producción desde el 17/11, cerca de la 1:05 p. m. (la subió Claude por SSH con la aprobación del equipo; el detalle, en `HISTORIAL.md`). Claude comprobó en el servidor y desde fuera la versión, las páginas, que el buscador nuevo no entrega nada sin sesión y que el registro de errores no sumó líneas. Falta esto (en la computadora con Chrome; la 6, también en el teléfono). Antes, recarga el panel (Ctrl+R):
  1. **La recepción:** el Dashboard abre con el saludo y tu nombre, la frase de lo que toca hoy, los pasos del día al costado y, a la derecha, la tasa, el corte de las 2:00 p. m. y quién está en la tienda. Ya no dice "Dashboard" en grande.
  2. **Un paso del día:** toca el primero (por ejemplo "Confirmar los pagos"): baja hasta "Por atender" y la marca; "Revisar el pago" abre esa orden en Órdenes.
  3. **Ctrl K:** escribe el nombre de un producto, y después el número de una orden: aparecen y Enter los abre. Escape lo cierra.
  4. **Personalizar** (al lado de la fecha): arrastra la esquina de abajo a la derecha de una tarjeta para agrandarla; elige otro tamaño en su menú (el ícono de las flechas); toca la plantilla "Lo justo" y después "Cancelar": vuelve a como estaba. Repite y toca "Listo": recarga la página y queda guardado. "De fábrica" vuelve a la plantilla Dueño.
  5. **La existencia** (solo si hay un producto que se está acabando): en "Se están acabando", el + de uno y "Guardar 1 → 2": el producto queda con 2 (míralo en Productos y déjalo como estaba).
  6. **En el teléfono:** el Dashboard se ve entero, sin salirse a los costados; los pasos del día se deslizan de lado.
  7. **La mesa de la contadora:** con su cuenta (o pídele que entre), la hoja "Así funciona" ya no muestra a Chispa (solo sale la primera vez: si ya la vio, no hace falta).
- **Si algo falla, la vuelta atrás** (en la terminal del servidor): `cd /var/www/electroshopve && git reset --hard v1.0.0-rc.97 && npm install && bash scripts/deploy.sh --sin-pull`. Los tableros guardados con rc.98 (ancho × alto) los lee rc.97 como el tamaño de cada tarjeta por defecto: no se rompe nada.

### Por confirmar de rc.97 (C-282 y C-283; unos 15 minutos)
Ya en producción desde el 17/11, cerca de las 10:27 a. m. (la subió Claude por SSH con la aprobación del equipo; el detalle, en `HISTORIAL.md`). Claude comprobó en el servidor y desde fuera la versión, las páginas, que las dos rutas quitadas ya no están en el build, el `manifest` y el enlace de salto. Falta esto (antes, recarga la tienda y el panel con Ctrl+R). De la 1 a la 5 son de C-282; la 6 y la 7, de C-283:
  1. **Transacciones** (en la computadora): "Exportar CSV" y ábrelo en Excel: se ve igual que antes, con los montos como números.
  2. **El lote de impresas:** Gift Cards → "Generar impresas" → una de $5 → genera. Sin cerrar la ventana, toca "Gift Cards" en el menú: arriba dice "Tienes un lote de 1 tarjeta sin cerrar"; "Ver el lote" la vuelve a abrir con su PIN. Imprime la hoja y ciérralo: el aviso se va. La tarjeta queda "Por activar": no vale nada hasta venderla en caja.
  3. **Instalar la tienda** (en el teléfono, con Chrome): abre electroshopve.com → menú ⋮ → "Instalar aplicación" o "Agregar a la pantalla de inicio": queda el ícono azul de Electro Shop y abre a pantalla completa. Si no te sirve, la quitas como cualquier ícono.
  4. **Saltar al contenido** (en la computadora): en cualquier página, la primera vez que tocas Tab aparece "Saltar al contenido" arriba a la izquierda; Enter lleva al título de la página.
  5. **La recarga** (en el teléfono, con tu cuenta de cliente): Mi panel → Puntos ES → Recargar: al tocar el monto sale el teclado de números; Escape (o "Cerrar") la cierra.
  6. **Órdenes** (en la computadora): cambia el estado de una orden como siempre (por ejemplo, de Pagada a En preparación): funciona igual. Abre una orden cancelada: se le puede escribir una nota, pero su estado ya no cambia.
  7. **Un Pago Móvil** (solo si hay una compra o una recarga de verdad, no hace falta forzarla): se verifica como siempre. Si alguien vuelve a escribir la misma referencia, con espacios o con menos dígitos, dice que ya fue utilizada.
- **Si algo falla, la vuelta atrás** (en la terminal del servidor): `cd /var/www/electroshopve && git reset --hard v1.0.0-rc.95 && npm install && bash scripts/deploy.sh --sin-pull`.

### Por confirmar de rc.95 (C-281 y C-280; unos 20 minutos)
Ya en producción desde el 17/11, cerca de las 9:05 a. m. (la subió Claude por SSH con la aprobación del equipo; el detalle, en `HISTORIAL.md`). Claude comprobó en el servidor y desde fuera la versión, las páginas, que las API privadas responden 401 sin sesión, las reseñas de servicios sin cuenta y la caché de los archivos subidos. Falta esto (antes, recarga la tienda y el panel con Ctrl+R). De la 1 a la 6 son de C-281; de la 7 a la 10, de C-280:
  1. **Órdenes** (en la computadora): busca una orden vieja por su número, después por el teléfono del cliente (como sea: con guiones o con +58) y por la guía de ZOOM: aparece aunque no esté entre las 50 de la lista, con "1 orden" al lado. Toca "Listas para recoger", "Canceladas" y "Reembolsadas": la cuenta de "Todas" es la suma de todas las píldoras.
  2. **Transacciones:** busca una recarga vieja por su referencia o por el teléfono del cliente.
  3. **"Comprar ahora" sin cuenta** (en el teléfono, en una ventana de incógnito): en un producto, "Comprar ahora" → lleva a entrar; entra con tu cuenta de cliente y llegas al pago con el producto. Vacía ese carrito al terminar.
  4. **Canjear sin cuenta** (en incógnito): en `/canjear-gift-card`, escribe el código de una gift card de prueba y "Verificar": salen "Crear mi cuenta gratis" y "Ya tengo cuenta". Toca "Ya tengo cuenta", entra, y al volver el código ya está escrito y verificado, con su valor (no la canjees si no quieres).
  5. **Lo que se comparte** (desde el teléfono): manda por WhatsApp el enlace de un curso y el de `/canjear-gift-card`: cada uno con su imagen (el curso, con su portada, su precio y su nivel).
  6. **El Pago Móvil que se recupera** (solo si hay una compra real con Pago Móvil en curso, no hace falta forzarla): si un cliente verificó su pago y recargó la página, el pago le muestra "Ya tienes un Pago Móvil verificado" arriba.
  7. **La tasa** (con la cuenta del dueño, en la computadora): Configuración → Precios y pagos. En "Manual", agrégale un cero a la tasa y toca Guardar: sale "La tasa cambia más de 50 %", con el antes y el después. Toca **"Revisar"** (no se guarda nada) y después "Descartar".
  8. **La contraseña** (con una cuenta de cliente de prueba): Mi panel → Mi perfil → Seguridad. Ya no hay casilla: dice "Al cambiarla se cierran tus otras sesiones". Si la cambias, esa cuenta queda fuera en los demás dispositivos.
  9. **Las reseñas de un trabajo** (en una ventana de incógnito): en `/servicios`, abre un trabajo. Las reseñas cargan, o dice que no hay: ya no se queda cargando.
  10. **Una recarga por Pago Móvil** (solo si vas a hacer una de verdad, no hace falta forzarla): el monto en bolívares del paso de verificar es el que hay que pagar, y se aprueba sola.
- **Si algo falla, la vuelta atrás** (en la terminal del servidor): `cd /var/www/electroshopve && git reset --hard v1.0.0-rc.93 && npm install && bash scripts/deploy.sh --sin-pull`.

### Por confirmar de rc.93 (C-278; un minuto)
Ya en producción desde el 17/11 (la subió Claude por SSH con la aprobación del equipo; `HISTORIAL.md`). En la computadora, recarga el panel (Ctrl+R): Clientes empieza en la búsqueda, sin las cuatro cifras; las píldoras siguen con su cuenta y cada fila con sus pedidos "en curso".

### Por confirmar de rc.92 (C-276, Clientes; unos 15 minutos)
Ya en producción desde el 16/11, cerca de las 11:50 p. m. (la subió Claude por SSH con la aprobación del equipo; el detalle, en `HISTORIAL.md`). Claude comprobó en el servidor y desde fuera la versión, la tabla nueva, las páginas y que las rutas nuevas no entregan nada sin sesión. Falta esto (en la computadora con Chrome; la 7, también en el teléfono). Antes, recarga el panel (Ctrl+R):
  1. **La lista:** Clientes. Arriba, cuántos hay, los nuevos del mes, los sin activar y los que tienen órdenes activas. Busca un cliente por su teléfono (solo los últimos números) y después por su cédula. Toca "Sin activar" y "Con pedidos": la cuenta de cada píldora coincide con la lista. Ninguna cuenta del equipo sale en la lista.
  2. **La ficha:** abre un cliente que tenga pedidos. Arriba, sus sellos (correo, teléfono, cédula, términos, empresa) y lo gastado; en Documentos y firmas, "PDF" abre lo que firmó. "Ver los N" de Actividad muestra todo lo que pasó en su cuenta. Mira si algo de los datos reales se ve raro (un teléfono, una fecha) y avísale a Claude.
  3. **Una orden:** en Pedidos, toca una: se abre esa orden en Órdenes (antes, una página que no existía). Ciérrala: la dirección vuelve a la de la lista. Lo mismo desde una garantía, en "Pedido".
  4. **Una nota:** en Notas del equipo, escribe "Prueba de notas" y guárdala: sale con tu nombre y la fecha. Bórrala.
  5. **Escribirle** (con tu propia cuenta de cliente, o una de prueba: le llega de verdad): "Escribirle" → "Un mensaje tuyo", título "Prueba", un mensaje corto → Siguiente → marca la campana y el correo → "Revisar y enviar": ves lo que llega en cada uno → Enviar. En la tienda, con esa cuenta, la campana tiene el mensaje con el ícono del chat, y llega el correo con el marco de la tienda. En la ficha, "Avisos que recibió" dice que se lo mandaste tú.
  6. **WhatsApp:** repite la 5 marcando también "Su WhatsApp": al enviar, "Abrir WhatsApp con el mensaje" abre el chat de ese número con el texto escrito (no lo envíes si no quieres).
  7. **Editar:** "Editar" → cambia solo el teléfono de esa cuenta de prueba → "Revisar y guardar" muestra antes → después → Guardar. Vuelve a la ficha con el teléfono nuevo, y en Actividad, "cambió sus datos · Cambió: Teléfono". En el teléfono, los pasos se ven enteros.
  8. **Suspender** (solo con la cuenta de prueba): "Más" → Suspender, con un motivo. Esa cuenta ya no entra a la tienda; "Más" → Reactivar la devuelve. Los dos quedan en Actividad, con el motivo.
- **Si algo falla, la vuelta atrás** (en la terminal del servidor): `cd /var/www/electroshopve && git reset --hard v1.0.0-rc.91 && npm install && bash scripts/deploy.sh --sin-pull`. La tabla `notas_cliente` no molesta a rc.91: no se quita (las notas quedan guardadas para cuando vuelva rc.92). Los avisos que ya se mandaron se ven en la campana del cliente con rc.91 también.

### Por confirmar de rc.91 (C-230 y C-277; unos 15 minutos)
Ya en producción desde el 16/11 (la subió Claude por SSH con la aprobación del equipo; el detalle, en `HISTORIAL.md`). Claude comprobó en el servidor y desde fuera la versión, las páginas y que la lista de Verificaciones ya no entrega nada sin permiso. Falta esto:
- **De C-230** (unos 15 minutos, en la computadora con Chrome; la 4, también en el teléfono). Antes, recarga el panel (Ctrl+R):
  1. **La tasa del día:** Contabilidad → Facturas → "Nueva factura". En el primer paso, junto a la fecha, "Tasa BCV del día de la factura" viene con la de hoy. Cambia la fecha a ayer: la tasa se vacía y pide la de ese día. Vuelve a hoy y sal sin registrar.
  2. **El libro:** Contabilidad → Libro de ventas. Arriba, el IVA del mes con "Se declara hasta el 15/12"; debajo, las facturas de noviembre (la anulada, en cero) y lo de la declaración.
     - "Descargar en Excel" y ábrelo: una fila por factura, los totales y lo de la declaración.
     - "Imprimir": sale solo el libro, apaisado.
  3. **El talonario:** en Facturas, la tarjeta del talonario dice hasta cuándo alcanza. Si no llega a abril, debajo dice cuántas pedir a la imprenta.
  4. **La mesa:** con la cuenta de la contadora (o pídele que entre), la primera vez sale "Así funciona tu mesa" con "Empezar: dibujar mi firma". En la mesa, "Libro de ventas en Excel". En el teléfono, el libro va en tarjetas.
- **De C-277:** Clientes → Verificaciones (con tu cuenta de administrador): la lista sigue mostrando las empresas con su RIF, sus documentos y "Aprobar".

### Por confirmar de rc.89 (C-272 y C-273; unos 15 minutos)
Ya en producción desde el 16/11 a las 8:51 p. m. (subida desde la laptop; el detalle, en `HISTORIAL.md`). Claude comprobó en el servidor y desde fuera la versión: la portada dice `1.0.0-rc.89|a724c8a`. Falta esto (en la computadora con Chrome; la 5, también en el teléfono). Antes, recarga el panel (Ctrl+R):
  1. **Los stickers (C-272):** "+ Sticker" → Ofertas → Estrella; cambia su texto a "-15 %" y su color. Después → Íconos → busca "taladro"; → Chispa → "Con el gorro" → Señala. Muévelos y agrándalos en la vista previa, y descarga la imagen y el video.
  2. **Los números (C-273):** en Textos y stickers, con un título elegido, borra el tamaño y escribe 80: queda en 80 px (antes saltaba a 400). En "Posición y giro, con números", escribe -15 en el giro.
  3. **Las entradas y salidas (C-273):** paso Animación → toca el título en la línea de tiempo → "Cómo entra": Sello; "Mientras está": Latido; "Cómo sale": Desvanecer. Cada cambio se reproduce solo en la vista previa.
  4. **La línea de tiempo:** arrastra la barra del título hacia la derecha (entra más tarde) y Ctrl+Z la devuelve. Toca la regla en el segundo 3: la vista previa se queda en ese segundo; "Ver la imagen" vuelve.
  5. **El video:** elige 10 s, "Fundido al azul" y "Cierre con el logo". Publicar → "Descargar video": baja a los 10 segundos y termina en el azul con el logo, @electroshopgre y la web. En el teléfono, ábrelo en la galería.
- **Si algo falla, la vuelta atrás** (en la terminal del servidor): `cd /var/www/electroshopve && git reset --hard v1.0.0-rc.87 && npm install && bash scripts/deploy.sh --sin-pull`. **Ojo:** rc.87 no conoce los stickers ni las animaciones de las piezas. Mientras esté rc.87, no abras para editar una historia que los tenga: al guardarse sola, pierde los stickers, las animaciones de las piezas, la duración del video y el cierre con el logo (los títulos quedan, con su estilo). Las que no se toquen los recuperan al volver a subir rc.89.

### Por confirmar de rc.87 (C-268, C-270 y C-271; unos 15 minutos)
Ya en producción desde el 16/11 (`HISTORIAL.md`). Claude comprobó desde fuera la versión, las páginas y las 8 fuentes nuevas. Lo que se ve dentro del panel necesita una sesión: falta esto (en la computadora con Chrome y en el teléfono). Antes, recarga el panel (Ctrl+R):
  1. **El video (C-268):** ElectroStudio → una historia → Publicar → "Descargar video". Quédate en la pestaña: a los 7 segundos baja el MP4 y el aviso "Grabando el video…" se va.
  2. **Salir mientras graba:** vuelve a tocar "Descargar video" y cambia de pestaña enseguida. Al volver: "Se detuvo el video porque saliste de la pestaña…", y los botones se pueden tocar de nuevo.
  3. **Los seis pasos (C-270):** arriba, la ruta Contenido · Fotos · Diseño · Textos y stickers · Animación · Publicar, cada uno con su ícono; los hechos con el check. En el teléfono, "Paso N de 6" y "Ver pasos".
  4. **Un título que se mueve:** debajo de la vista previa, "+ Título". Escribe el título; arrástralo en la vista previa (cerca del centro se pega), agrándalo por una esquina y gíralo con el asa de arriba. En el panel, el tamaño en px cambia con él.
  5. **Un subtítulo:** "+ Subtítulo", escríbelo y prueba "Contorno", "Sombra" y el fondo (Cinta, Píldora, Caja). Ctrl+Z deshace cada arrastre de una vez.
  6. **En el teléfono:** al bajar por el paso, la vista previa queda arriba. Con dos dedos sobre la pieza elegida, se agranda y se gira.
  7. **Descargar:** la imagen y el video salen con el título y el subtítulo. Si una pieza queda donde Instagram tapa, Publicar lo avisa.
  8. **Las fuentes (C-271):** con el título elegido, toca "Título de oferta" (queda en Anton, con contorno) y después prueba dos o tres fuentes del selector: cada nombre se ve en su letra. Escribe "¡Feliz \*Navidad\*!": la palabra sale resaltada. Descarga la imagen: sale con esa fuente.
  9. **Un texto largo:** "+ Texto", escribe una frase larga y marca "Que baje de línea solo": se corta en varias líneas.
- **Si algo falla, la vuelta atrás** está en el bloque de `HISTORIAL.md` (a rc.84, con su cuidado con las historias que ya tienen títulos sueltos).

### Por confirmar de rc.84 (C-267; unos 5 minutos)
Ya en producción desde el 16/11 (`HISTORIAL.md`). Claude comprobó desde fuera la versión. Falta esto (en el teléfono, con tu cuenta):
  1. **Mis pedidos:** la página entra en la pantalla con la letra de siempre. Las píldoras de los filtros se deslizan de lado dentro de su fila, sin mover la página.
  2. **Puntos ES → Movimientos:** lo mismo con sus filtros.

### Por confirmar de rc.83 (C-262, C-264, C-263 y C-265; unos 35 minutos)
Ya en producción desde el 16/11 (`HISTORIAL.md`). Claude comprobó desde fuera:
- la versión, y que `/sorteo` responde leyendo la base con la columna nueva;
- el enlace corto `/s/<código>` (lleva a `/sorteo` y no se indexa) y los archivos nuevos: las fuentes, el sello y los logos de los correos;
- la base 4 de `/sorteo`, con la línea de C-264;
- Mi panel sin sesión, que lleva al login;
- la imagen para compartir `/sorteo` y la de la portada.

Falta esto (en el teléfono y en la computadora, con una cuenta que tenga pedidos y boletos):
- **Pruebas de C-265** (unos 15 minutos, en la computadora y en el teléfono, con una cuenta que tenga pedidos):
  1. **El menú:** en la computadora, la columna blanca llega abajo con mucho y con poco contenido, y "Cerrar sesión" queda al pie al bajar. Una captura de página entera ya no lo corta.
  2. **El inicio:** con boletos del sorteo, Puntos ES va en blanco (los boletos son lo fuerte); en una cuenta sin boletos, en el azul oscuro. "Pedidos anteriores" no repite los de "Pedidos en curso".
  3. **WhatsApp:** en Mi panel está en la cabecera, junto a la campana, y no flota; en la tienda sigue flotando. Tocarlo abre el chat.
  4. **Mis pedidos:** en dos columnas en la computadora; "Detalle y recibo" abre el seguimiento y el recibo lado a lado, con "Factura n.º" si la tiene. En el teléfono, una columna sin nada tapado.
  5. **La pestaña del navegador** dice "Mis pedidos | Electro Shop" (y así en cada página).
  6. **Garantía → Nueva:** un pedido de solo códigos no sale; debajo, "Códigos y recargas…" con WhatsApp. Si tu cuenta no tiene un pedido de solo códigos, sáltala: Claude la probó (C-265 y C-267).
  7. **Puntos ES → Recargar,** con una cuenta que no firmó los términos: sale la firma; Esc o la X la cierran y la recarga queda con "Leer y firmar". Si tu cuenta ya los firmó, sáltala: la probó el agente de C-265.
  8. ~~**El aviso de cookies**~~ **no sale en producción:** la tienda no tiene Google Analytics ni el píxel de Meta, y sin ellos no hay nada que pedir. Claude lo probó sobre Mi panel en la tienda de prueba, con claves falsas (C-267). Si se encienden, vuelve esta prueba.
- **Pruebas de C-263** (unos 10 minutos, en el teléfono, con una cuenta que tenga boletos):
  1. **Mi panel:** sale "¡Tienes N boletos para la PS4!" con los boletos, que se animan una vez (la segunda visita, quietos), y "Te falta 1 amigo…" si aplica. En el teléfono se deslizan, con "Tu próximo boleto" al final.
  2. **"Compartir mi flyer" → "Compartir"** (en el teléfono). Antes de tocarlo, copia una palabra cualquiera: así se sabe si el enlace se copió de verdad. Se abre la hoja del teléfono con la imagen. Probar las tres, sin publicar si no quieres:
      - **WhatsApp:** "Mi estado" (o un chat contigo mismo, para no publicar). Va la imagen con "¡Ya tengo N boletos…" y el enlace, que se toca;
      - **Instagram → Historia:** el sticker «Enlace» → pegar. Tiene que salir `electroshopve.com/s/<tu código>`, no la palabra que copiaste. Se puede salir sin publicar;
      - **TikTok:** la imagen sola (se guarda como borrador). El QR se lee con la cámara de otro teléfono, o desde la pantalla de la computadora con el flyer abierto;
      - **al volver a la tienda** sale "Tu enlace quedó copiado…". Si sale "Para Instagram, toca «Copiar»…", ese teléfono no deja copiar en el mismo toque: avísale a Claude con la marca y el modelo.
  2b. **"Descargar video"** (en el teléfono): baja un video de 7 s. En iPhone queda en Archivos (desde ahí, "Guardar video" lo pasa a Fotos); en Android, en Descargas o en la galería.
  3. **`/sorteo` → "Tus boletos":** los boletos con el monto chico debajo, "Descargar" (baja la imagen con todos) y "Mi flyer".
  4. **El enlace corto:** abrir `electroshopve.com/s/<tu código>` en una ventana privada: lleva a `/sorteo` con "Te invitó un amigo". Compartirlo por WhatsApp muestra la vista previa del sorteo.
  5. **El 20/12, al sortear:** el panel y `/sorteo` dicen "Ganó el boleto … de …", y el código es uno de los boletos del ganador.
- **Pruebas de C-262 y C-264** (unos 10 minutos, en el teléfono):
  1. **`/sorteo` con una cuenta que invitó amigos** (por ejemplo, la de prueba de rc.74, con un amigo registrado con su enlace):
      - en "Tus boletos" sale "Invitando amigos", con "0 de 3 boletos" y la frase de lo que falta;
      - cada amigo con su nombre corto ("Luisa P.") y su sello;
      - si alguno no activó su cuenta, "Recordarles por WhatsApp" abre WhatsApp con el mensaje listo.
  2. **Mi panel** con esa cuenta: la tarjeta del sorteo dice lo de los amigos ("1 amigo tuyo todavía no cuenta" o "Te falta 1 amigo…").
  3. **La campana:** registra un amigo nuevo con tu enlace, en una ventana privada. En tu campana sale "… se unió con tu enlace". Al activar su cuenta desde su correo, sale "… ya cuenta para tu boleto" o "¡Ganaste un boleto!".
  4. **Las bases del sorteo** (abajo, en `/sorteo`, "Las bases del sorteo"): la 4 termina con "…si se registra con el enlace de dos participantes, cuenta para quien la invitó primero".

### Por confirmar de rc.79 (C-261, C-260 y C-254; unos 20 minutos)
Ya en producción desde el 15/11 (`HISTORIAL.md`). Claude comprobó desde fuera:
- la versión;
- `/solicitar-producto` sin cuenta ("Entra para pedirlo");
- `/sorteo` y la bandera del inicio, como antes mientras el sorteo está abierto, ya leyendo la base con las columnas nuevas;
- la imagen para compartir `/sorteo`.

Falta esto (en el teléfono y en la computadora):
  1. **`/solicitar-producto` en una ventana privada, sin entrar:**
      - sale "Entra para pedirlo", con "Crear mi cuenta gratis" y "Ya tengo cuenta: entrar", y no el formulario;
      - "Ya tengo cuenta: entrar" lleva al login y, al entrar, vuelve a la página con el formulario.
  2. **Mi panel → Garantía:**
      - con una cuenta sin garantías pedidas, abre en "Nueva";
      - con una que tiene una en curso, abre en "Mis solicitudes", con "Pedir garantía" arriba.
  3. **Mi panel → Puntos ES → Recargar,** con un método que no sea Pago Móvil (por ejemplo Binance Pay):
      1. escribe el monto: el botón dice "Recargar $… con …";
      2. sal con "Cancelar" sin recargar. Si haces una recarga de verdad, ya no sale "¿Estás seguro?".
  4. **"Agregar" en una tarjeta del inicio** (en el teléfono y en la computadora): sale "¡Listo! Ya está en tu carrito" con "Ver carrito", y el carrito salta una vez. "Ver carrito" lleva al carrito.
  5. **Los términos de Puntos ES**, con una cuenta que todavía no los firmó (o en la ventana de firmar de otro documento):
      - mientras falta leer, abajo sale "Baja hasta el final para firmar", y tocarla baja el texto;
      - en el paso de la firma, el recuadro vacío muestra una firma que se dibuja y "Firma aquí", que se va al tocar.
  6. **Mis códigos** (un pedido con un código digital, si hay uno a mano): "Voltear tarjeta" es el botón azul lleno.
  7. **Mi panel**, con una cuenta que todavía tiene misiones: "¿Cómo funciona la tienda?" abre la hoja con los tres pasos. "Entendido" la cierra.
  8. **C-254, hoy (el sorteo sigue abierto):**
      - el inicio sigue igual: "¡Gánate una PS4!";
      - `/sorteo` sigue con "Gana una" y "Quiero mi boleto";
      - en el panel, Marketing → Sorteo se ve como antes ("Publicar la entrega" sale recién después de sortear).
  9. **C-254, el 19 de diciembre** (ya cerró la última compra, en la computadora ancha y en el teléfono): la bandera dice "Resultado 20 de dic." y la píldora, "Resultado el 20 de diciembre". El 20, antes de sortear, "Hoy sale el ganador".
  10. **C-254, después de sortear** (en el teléfono, sin entrar):
      - la bandera dice "¡Ya hay ganador!" con la foto del premio;
      - `/sorteo` arriba dice "¡Ya hay ganador!" con el correo tapado;
      - compartir `/sorteo` por WhatsApp muestra "¡Ya hay ganador!".
  11. **C-254, la entrega,** cuando la persona acepte y esté su video en YouTube (como Oculto o Short). En la computadora, Marketing → Sorteo → "Publicar la entrega":
      1. **La foto y el video:** "Subir foto" (o "Tomar foto" en el teléfono) y pegar el enlace de YouTube. Debe decir "Short de YouTube: sale vertical" o "Video de YouTube: sale horizontal".
      2. **Su nombre:** el nombre y la inicial del apellido ("María G.") y de dónde es.
      3. **Revisar y publicar:** marcar "La persona aceptó salir en la tienda" → "Publicar la entrega".
      - **Después, en el teléfono:**
        - el inicio muestra su foto y "¡María G. ganó una PS4!";
        - `/sorteo` muestra su nombre y su foto;
        - el play abre el video ahí mismo.
      - **Si la persona cambia de idea:** "Quitar de la tienda", y vuelve el correo tapado.

### Por confirmar de rc.76 (C-258 y C-257; unos 25 minutos)
Ya en producción desde el 15/11 (`HISTORIAL.md`). Claude comprobó desde fuera:
- la versión;
- la hoja "Así participas" en `/sorteo`;
- los títulos de las pestañas;
- el login sin "Verificando sesión…";
- el latido de presencia;
- las imágenes de Chispa.

Falta esto:
- **Pruebas de C-258** (unos 10 minutos, en la computadora y en el teléfono):
  1. **El login, en una ventana privada:** `/login` muestra de una vez "Iniciar sesión" con el correo y la contraseña, sin "Verificando sesión…".
  2. **Las pestañas:** el carrito dice "Carrito de compras | Electro Shop" (una vez la marca), y `/recuperar-contrasena` dice "Recuperar contraseña | Electro Shop".
  3. **El carrito, con tu cuenta, en la computadora:** agrega un producto. El ícono del carrito, arriba, abre la lista con "Ver Carrito Completo". Recarga la página: el producto sigue ahí.
  4. **El carrito en dos dispositivos, con la misma cuenta:**
      1. en el teléfono, sube la cantidad a 2;
      2. en la computadora, recarga la página sin tocar nada;
      3. vuelve a abrir el carrito en el teléfono: sigue en 2. Antes, la recarga de la computadora lo devolvía a 1.
  5. **"Calcula tu envío"** en una ficha: elige estado y ciudad. Sale lo que cobra ZOOM, como siempre.
  6. **Reportes → En vivo** (si se usa): con dos o tres teléfonos en el Wi-Fi de la tienda navegando a la vez, todos aparecen conectados.
  7. **El checkout con el teléfono viejo** (solo si alguna cuenta de producción lo tiene así; si no, se salta): con esa cuenta, "Siguiente: revisar" se puede tocar.
- **Pruebas de C-257, el onboarding** (unos 15 minutos). Cada guía sale una sola vez por navegador, así que se prueban en una ventana privada:
  1. **El recorrido, en el teléfono:**
      1. En una ventana privada, entra con tu cuenta y ve al inicio. A los 1 o 2 segundos todo se oscurece en azul y sale la tarjeta "¡Hola, …!", con Chispa asomado por detrás, saludando.
      2. Toca "Empezar". El foco viaja al buscador y un anillo blanco se dibuja alrededor. Chispa se agacha y vuelve señalando; la lupa se dibuja y "busca".
      3. Sigue con "Siguiente": Explora, Tu carrito y Tu cuenta. Termina con "¡Listo!" y confeti azul.
      4. En ningún paso Chispa tapa lo que se explica, ni se le ve el corte de la cintura.
  2. **El recorrido, en la computadora:** lo mismo, con el buscador, Productos, el carrito y la cuenta del header. Con el teclado, → y ← cambian de paso y Esc cierra.
  3. **Una cuenta sin activar** (la de prueba de rc.74, si no la activaste, o una nueva): en el inicio, la bienvenida dice "Activa tu cuenta con el enlace de tu correo y ya puedes comprar", con el sobre.
  4. **`/sorteo`, en una ventana privada:**
      1. A 1 o 2 segundos sube "Así participas": "Dos caminos: comprar o invitar amigos" y tres íconos que se dibujan uno tras otro.
      2. "Quiero participar" baja a "Cómo participar".
      3. Recarga la página: la hoja ya no sale.
  5. **El checkout:** con un producto físico en el carrito, la primera vez sale "Así compras" ("Pagas solo en el último paso"). "Empezar" la cierra.
  6. **Mi panel → Puntos ES:** sale "Así funcionan tus Puntos ES". "Recargar Puntos ES" abre la recarga: ciérrala sin recargar.

### Por confirmar de rc.74 (C-255 y C-256; unos 15 minutos)
Ya en producción desde el 15/11 (`HISTORIAL.md`). Claude comprobó desde fuera la versión y `/sorteo`: "Cómo participar" con los dos caminos, las preguntas, el logo de ZOOM y las bases con "activen su cuenta desde el correo". En ningún lado dice "No tienes que comprar".
Falta esto (unos 15 minutos, en la computadora y en el teléfono):
  1. **`/sorteo` en la computadora, en una ventana privada (sin entrar):**
      - arriba, "Gana una" y "PlayStation 4" con el logo de PS4 donde decía "Sony", del alto de las letras;
      - en "Envío gratis", el logo de ZOOM en una píldora blanca.
  2. **"Quiero mi boleto"** baja a "Cómo participar":
      - tres pasos con su número, unidos por una línea que se dibuja, y los íconos que entran una vez y se quedan quietos;
      - el paso 2, "Gana boletos por dos caminos": primero "Camino 1 · Compra $5 o más" (con "Ver productos"), después "Camino 2 · Invita a tus amigos";
      - al lado, "Cada boleto es una oportunidad";
      - en ningún lado dice "No tienes que comprar".
  3. **"Lo que más nos preguntan":** siete preguntas, la primera abierta ("¿Hay más de una forma de ganar boletos? Sí, dos…"). "¿Cuánto me cuesta si gano?" lleva el logo de ZOOM.
  4. **En el teléfono:** lo mismo, uno debajo del otro, sin moverse de lado.
  5. **El camino entero, en el teléfono** (con un correo de prueba, por ejemplo `tucorreo+sorteo@gmail.com`, que llega a tu bandeja):
      1. En una ventana privada, `/sorteo` → "Crear mi cuenta gratis". Llena el registro.
      2. Vuelve solo a `/sorteo`: el paso 1 dice "Ya tienes tu cuenta" y pide activarla; en el paso 2 sale su enlace para invitar.
      3. Copia ese enlace. Ábrelo en otra ventana privada: arriba del paso 1 dice "Te invitó un amigo". No hace falta registrarse.
      4. En tu correo, "Activa tu cuenta de Electro Shop" → "Activar mi cuenta". Si se abre en el mismo navegador, dice "Volver al sorteo" y vuelve solo; si se abre en otro, va al login y después al sorteo.
      5. En `/sorteo` ya no pide activar la cuenta.
      6. Con esa cuenta nueva, en `/sorteo` no sale el recorrido de bienvenida ("Te mostramos la tienda en 4 pasos"); en el inicio, sí.
  6. **Las bases del sorteo** dicen "…y activen su cuenta desde el correo te dan 1 boleto…".
      - La cuenta de prueba queda como una cuenta normal. No da boletos: hacen falta 2 amigos.

### Por confirmar de rc.72 (C-253; unos 15 minutos)
Ya en producción desde el 15/11 (`HISTORIAL.md`). Claude comprobó desde fuera:
- el banner nuevo de `/sorteo`, con el botón que baja a Cómo participar, la foto fundida y el aviso de marcas;
- la bandera del inicio, que dice "Sorteo" hasta que se cargue el nombre corto.

Falta esto:
- **En el panel: hecho el 15/11** (la captura del equipo ya muestra el premio, "PS4" y "Lo que trae"). Lo que se cargó, en Marketing → Sorteo → "Cambiar":
  1. **"El premio":** en Premio, `PlayStation 4 Sony (Remanufacturada)`. Lo que va entre paréntesis sale aparte, como etiqueta.
  2. **"Lo que trae":**
      - "Agregar lo que trae": `1000 GB de almacenamiento`, y en el detalle, `para muchos juegos`;
      - "Agregar otra": `1 control azul eléctrico`;
      - "Agregar otra": `1 cable HDMI y 1 cable de poder`;
      - Sello: `¡Lista para jugar!`;
      - Nombre en el inicio: `PS4`. Al lado, la bandera con el logo.
  3. **"Revisar y publicar":** "Lo que cambia" dice el premio, lo que trae, el sello y el nombre → "Guardar el cambio".
- **Pruebas** (unos 10 minutos, en la computadora y en el teléfono):
  1. **`/sorteo`, en la computadora:**
      - arriba, "Gana una" y "PlayStation 4 Sony" en grande, con "¡Lista para jugar!" y "Remanufacturada";
      - los días que faltan junto a "Envío gratis", y "Quiero mi boleto";
      - la foto a la derecha, sin cuadro alrededor;
      - abajo, la franja "Lo que trae" con las tres cosas y sus íconos.
  2. **"Quiero mi boleto"** baja a "Cómo participar", y el título no queda tapado por el encabezado.
  3. **Al final de la página,** debajo de las bases, el aviso: "Sony, PlayStation, PS4… son marcas registradas de Sony Interactive Entertainment Inc. … no está patrocinado, avalado ni administrado por Sony".
  4. **El inicio en una pantalla ancha** (1440 px o más, como la de la oficina):
      - al borde izquierdo, a media altura, entra la pestaña con la foto, "¡Gánate una", el logo de PS4 y el regalo;
      - da dos destellos y se queda quieta;
      - tocarla lleva a `/sorteo`.
  5. **El inicio en el teléfono:** abajo a la izquierda, frente a WhatsApp, "¡Gánate una PS4!" con "Sorteo de Navidad" debajo. Lleva a `/sorteo`.
  6. **`/sorteo` en el teléfono:** el nombre, la foto, los días con el envío, el botón y "Lo que trae" uno debajo del otro, sin moverse de lado.

### Por confirmar de rc.71 (C-243 a C-251b; unos 60 minutos, en la computadora y en el teléfono)
Ya en producción desde el 15/11 (`HISTORIAL.md`). Claude comprobó desde fuera la versión, la recarga de las pestañas viejas, los íconos de los correos, las imágenes para compartir y la foto del sorteo. La sesión de los correos comprobó el enlace del aliado comercial y los crons. Falta esto:
  0. **La revisión de la base de la falla que cerró rc.69:** hecha el 15/11. Nadie la usó (`HISTORIAL.md`).
  1. **`/sorteo`:** la franja de arriba va en el azul oscuro del logo, sin azul casi negro ni letras cian.
  2. **En el teléfono, la barra de abajo** va en el mismo azul oscuro.
  3. **En el panel, Marketing → Kit de marca:** el logo, la paleta, las reglas, las piezas y un correo de muestra.
  4. **Un correo** (Marketing → Correos → Plantillas → "Ganaste un boleto" y "Gift card"):
      - la pieza fuerte va en el azul oscuro del logo, con los rótulos en azul claro;
      - el ícono de los avisos, en blanco sobre el azul de la marca.
  5. **Desde el teléfono, comparte `electroshopve.com` por WhatsApp:** la imagen va en el azul oscuro del logo, con el lema en azul claro.
  6. **La vista previa de los correos** (C-244), en la computadora: Marketing → Correos de la tienda → "Pago confirmado". Baja por la lista hasta "Gift cards": la vista previa se queda fija a la derecha, con el alto de la pantalla, y el correo se lee completo con la rueda del ratón sobre él. Abajo no queda ningún espacio en blanco.
  7. **La foto del sorteo** (C-247): **hecha**. El equipo la subió desde el panel el 15/11 y `/sorteo` la muestra.
  8. **Los datos de Ferrecla** (C-246), en el panel: Productos → Lista del proveedor → la ferretería:
      - "Datos fiscales": la razón social, el RIF y el domicilio fiscal, como en `Escritorio/Electro Shop/Proveedores/Ferrecla/rif-ferrecla-2027.pdf`. Un RIF mal escrito avisa y no deja guardar;
      - "Quién lo recibe": su representante; y en "Correos de despacho", los tres de la ferretería separados por coma (o, para la prueba 9, primero el tuyo) → "Guardar los datos";
      - "Ver la bienvenida": la credencial dice la razón social y el RIF. **No la envíes todavía**, salvo que el equipo lo decida.
  9. **El destino claro** (C-246): Marketing → Correos → Plantillas → Proveedores → "¡Se vendió su producto!": bajo el logo de ZOOM, "Envíelo a" con la ciudad en grande, la oficina con su código y a nombre de quién. En la venta de prueba de "Por confirmar de rc.55", la página del enlace dice lo mismo.
  10. **El panel con el kit** (C-245; en la computadora y en el teléfono):
      - **Productos:** los filtros llevan ícono y una línea ("Se ven en la tienda", "Publicados sin foto"); tocar "Borradores" filtra.
      - **Transacciones:** el estado va lleno, con su ícono; el tipo ("Recarga", "Abono"), en gris.
      - **Garantías:** "Por atender" va en el sello azul oscuro, no en rojo.
      - **Una orden con códigos digitales:** en el detalle, un solo botón azul lleno (avanzar); "Cancelar orden" va en rojo sobre blanco.
      - **Clientes → Verificaciones:** toca "Ver detalles" y escribe en "Notas de revisión": la ventana no se cierra.
      - **Marketing:** empieza junto al menú, sin hueco a la izquierda.
  11. **Contabilidad** (C-248), en la computadora: Contabilidad → Facturas → "Nueva factura" → "Una venta en la tienda" → Siguiente con un nombre y una cédula. En "Qué se vendió", el tacho de la derecha de cada renglón se ve entero. Sal con "Atrás" sin registrar nada.
  12. **Los filtros en píldoras** (C-249), en la computadora y en el teléfono:
      - **Órdenes:** arriba de la lista, 7 píldoras con su ícono y su cuenta. Toca "Enviadas": quedan solo las enviadas. Ya no está el selector "Todas".
      - **Transacciones:** toca "Pendientes": quedan las que esperan.
      - **Mensajes:** toca "Pendientes": quedan los sin leer.
  13. **Un cupón por pasos** (C-249b), en la computadora: Catálogo → Descuentos → "Nuevo cupón".
      - Son 5 pasos con su ícono. Nombre "Prueba pasos" → Siguiente → 10 % → Siguiente → código `PRUEBAPASOS` y "Solo con el código" → Siguiente → Siguiente.
      - A la derecha, en cada paso, el cupón al pagar con "PRUEBAPASOS aplicado: ahorras …".
      - En "Revisar y publicar", elige **"Guardarlo en pausa"** → "Guardar en pausa". En la lista sale "Pausada" y en la tienda no aplica.
      - "Editar" → "El descuento" → 15 % → "Revisar y publicar": "Lo que cambia" dice 10 % → 15 % y a cuántos productos aplica. "Guardar el cambio", y después "Eliminar" en la lista (nunca se usó: se borra).
      - **En el teléfono:** "Nueva oferta" → un nombre → Siguiente → 20 % → "Ver cómo queda" abre la tarjeta de un producto con el precio rebajado y el anterior tachado. Sal con "Ofertas y cupones", arriba, sin guardar.
  14. **Gift cards impresas por pasos** (C-249b): Ventas → Gift Cards → "Generar impresas": el monto, cuántas y "Revisar y generar", con la tarjeta al lado. **No generes** si no vas a imprimir: sal con "Gift cards", arriba.
  15. **Un método de pago por pasos** (C-249c), en la computadora: Administración → Métodos de Pago → "Editar" en uno activo (por ejemplo, Binance Pay).
      - Son 5 pasos. A la derecha, el panel del checkout con sus datos, como lo ve el cliente.
      - En "Para el cliente", cambia la nota → "Revisar y publicar": "Lo que cambia" dice la nota de antes y la de ahora, y si hay recargas u órdenes esperando un pago.
      - **Sal con "Métodos de pago", arriba, sin guardar.** Así no cambia nada de lo que ven los clientes.
  16. **Una categoría por pasos** (C-249c): Catálogo → Categorías → elige una → "Crear subcategoría". El título dice de cuál es y "Dentro de" ya la trae. Escribe un nombre → "Cómo se ve": elige un ícono → la casilla y el chip de la tienda, al lado. Sal con "Categorías", arriba, sin crearla.
  17. **Los colores de categoría** (C-250): Catálogo → Categorías. En el árbol, todas en azules (ninguna morada, rosa ni naranja). Al cambiar una, en "Cómo se ve" hay cuatro azules para elegir.
  18. **Una campaña por pasos** (C-249d), en la computadora: Marketing → Campañas de correo → "Nueva campaña".
      - Son 4 pasos con su ícono. "Armar con Claude" está arriba del primero: escribe un objetivo → "Armar el borrador". Se llenan el asunto y la vista previa, y sigues en "Lo que dice". A la derecha, la bandeja y el correo.
      - Siguiente → los bloques que armó → Siguiente → "Enviar prueba" (llega a tu correo, marcado como prueba).
      - En "Revisar y enviar": a cuántos clientes llega y "Ver destinatarios". Deja **"Guardarla como borrador"** → "Guardar el borrador". En la lista sale "Borrador".
      - **No elijas "Enviarla ya"** salvo que el equipo quiera mandarla. Para borrarla, el tacho de la lista.
  19. **Un promotor por pasos** (C-249d): Marketing → Promotores → el lápiz de uno.
      - Son 3 pasos (el código no se cambia). En "Comisión y descuento", a la derecha, su código en el carrito con una compra de la tienda y lo que gana en Puntos ES.
      - Cambia la comisión → "Revisar y publicar": "Lo que cambia" dice el % de antes y el de ahora, y cuántas comisiones por acreditar siguen con el de antes.
      - **Sal con "Promotores", arriba, sin guardar.** Así no cambia nada.
  20. **Un curso por pasos** (C-249e): Cursos → "Nuevo Curso". Son 5 pasos; a la derecha, la tarjeta de `/cursos`.
      - En "Precio y portada", "Subir foto" sube la miniatura y la tarjeta la muestra. Ya no hay campo para pegar una dirección.
      - En "El temario", "Agregar un módulo" y "Lección".
      - Sal con "Cursos", arriba, sin guardar. O, si quieres probarlo entero, "Guardarlo sin publicar" y bórralo desde la lista.
  21. **Un trabajo de Servicios por pasos** (C-249e): Trabajos Realizados → "Editar" en uno.
      - Son 5 pasos; a la derecha, la tarjeta de `/servicios`.
      - En "Antes y después", las fotos se suben ("Subir foto"); no hay campo para pegar una dirección.
      - Sal con "Trabajos realizados", arriba, sin guardar.
  22. **Mi panel** (C-251), con tu cuenta de cliente, en el teléfono y en la computadora:
      - **Mis pedidos:** arriba, "Todos" dice cuántos pedidos tienes en total (antes, como mucho 25). Un pedido pagado y sin salir dice "Sale el…" en su tarjeta; uno de la ferretería, "… desde Aragua (La Victoria)".
      - **El inicio:** "Últimos pedidos" llama a cada pedido igual que Mis pedidos, y abajo "N en tus favoritos" cuenta los productos que guardaste.
      - **Un pedido entregado** → "Detalle y recibo": cada producto tiene "Dejar mi reseña", que lleva a la reseña de su ficha.
      - **Mis códigos** de un pedido de gift cards: debajo de los códigos, "Cómo canjearlo" (si el producto tiene instrucciones).
      - **`/api/customer/payment-methods`** en el navegador, con la sesión abierta: "404".
  23. **Mi panel con el kit** (C-251b), en el teléfono:
      - **Puntos ES:** la franja de arriba en el azul oscuro del logo; una recarga por confirmar, con el sello azul lleno; los filtros con su ícono.
      - **Direcciones** → "Agregar": "Retiro en agencia" y "A domicilio" son tarjetas con su ícono y el círculo de elegida; ZOOM y MRW, con su logo.
      - **Mis documentos** (si te falta firmar algo): el aviso con el ícono blanco en su placa azul. En la ventana de firmar, "IMPORTANTE" va en ese azul claro, no en rojo.

### Por confirmar de rc.55 y rc.56 (C-235, C-227 y C-242; unos 20 minutos)
Ya en producción desde el 15/11 (`HISTORIAL.md`). Las sesiones comprobaron desde fuera la versión, la base del aliado comercial y que los crons responden. Falta esto:
  1. **La contadora** (C-235):
      - Contabilidad → "Mesa de la contadora": el saludo con tu nombre, el mes en números y, a la derecha, "La firma de la contadora" (vacía hasta que ella la dibuje).
      - Equipo → Invitar: está la opción "Contadora", con lo que puede y no puede hacer. **Invítala de verdad en el paso 23 de §3**, no con una cuenta de prueba.
      - Cuando ella entre (después del paso 23): en su menú solo están Contabilidad, Mi seguridad y Versiones. Si escribe `/admin/orders`, vuelve a su mesa.
  2. ~~**Los crons** (en la terminal del servidor): `~/cron-despachos.sh` y `~/cron-sorteo.sh`.~~ **Listos:** el equipo lo confirmó el 15/11 (el de despachos, a las 10:05 de cada día).
  3. **El aliado comercial** (C-227), en Productos → Lista del proveedor → la ferretería:
      - en "Su contacto de despacho", **por ahora tu propio correo** como correo de despacho, con el nombre y el WhatsApp de la ferretería → "Guardar contacto";
      - "Ver la bienvenida": "¡Gracias por elegirnos!", la credencial "Aliado comercial de Electro Shop" y cuántos productos suyos están publicados. "Enviarla": te llega a ti; ábrela en el teléfono;
      - Marketing → Correos → Plantillas → Proveedores: los cuatro, en Escritorio y en Móvil.
  4. **Una venta de prueba de la ferretería** (con tu cuenta de cliente y un producto barato). Págala con Puntos ES, que al cancelarla vuelven solos; o con un pago manual sin dinero de verdad y, en el panel, "Marcar pagado":
      - te llega "¡Se vendió su producto!" (con tu correo como el del proveedor) y su copia a los correos de avisos;
      - "Anotar la guía", en el teléfono: ZOOM en grande, la oficina, el plazo, los datos de la guía y el costo;
      - "Lo estoy preparando": en el panel, la orden queda En preparación y su detalle lo dice;
      - **no anotes una guía de mentira:** cancela la orden en el panel, con su motivo. Te llega "Se canceló la orden: no la despache" y la página lo dice.
      - Al terminar, pon el correo de despacho real de la ferretería. La bienvenida de verdad se la envían cuando el equipo lo decida.
  5. **Facturas** (C-242), en Contabilidad → Facturas, con la cuenta del dueño:
      - arriba, tres tarjetas del mismo alto: "La próxima factura" (0072), "Talonario Serie A" (29 por usar, con su barra) y "Cobradas sin factura" ("Al día" en verde, o el número con "Te toca");
      - bajo el talonario, en gris, "Anular un papel dañado" y "Cargar otro talonario". **No anules ninguno de prueba:** el número se gasta;
      - las (i) de "Talonario Serie A" y de "Cobradas sin factura" abren su nota;
      - "Nueva factura": en "De dónde sale" el ícono va al lado del título y "Contado / Crédito" quedan centrados. Vuelve con "Atrás" sin emitir;
      - en el teléfono, las tres tarjetas una debajo de otra.

### Por confirmar de rc.53 (C-226 a C-241; unos 30 minutos, en la computadora y en el teléfono)
Ya en producción desde el 14/11 (`HISTORIAL.md`). **Claude ya comprobó desde fuera** la 4, la 13 (menos la vista previa en WhatsApp del teléfono), la 14, y la primera parte de la 5, la 7 y la 8. **El cron del sorteo:** `~/cron-sorteo.sh` rebota al inicio de sesión hasta C-227 (rc.55); la línea del `crontab` ya está.
  1. **En el panel:** Configuración → Respaldos con los respaldos apagados, y Productos → Nuevo → Publicar con un dato faltante. El aviso va en azul claro, con el ícono cian en su placa azul noche. No queda ninguna caja ámbar.
  2. **En la tienda,** con una cuenta sin verificar: el checkout muestra "Verificación requerida" con el círculo azul noche. Mi panel → Documentos con uno por firmar: la nota va en azul claro.
  3. **Un presupuesto** (Cotizaciones → uno con nota): "Lo que no incluye" va en azul claro, también al imprimirlo.
  4. **Los textos:** `https://electroshopve.com` dice en la pestaña "Electro Shop: tecnología y ferretería, envíos a toda Venezuela", y el pie, "Todo lo encuentras con nosotros." (un minuto después del SQL).
  5. **El sorteo** (Marketing → Sorteo): sale su tablero, "En la tienda", con la línea de tiempo y los cuatro números. `/sorteo` muestra "Gana una PlayStation 4…". Cambiar → Cómo se gana → poner $15 → Revisar: dice qué cambia y cuántos boletos quedan; volver sin guardar.
  6. **La Lista del proveedor** (Productos → Más): los pasos se ven igual que antes, con su número, y la línea entre ellos.
  7. **"Desde Aragua"** (en el teléfono): `/productos` muestra "Desde Aragua" en la ferretería y "Desde Portuguesa" en lo de la tienda, con el ícono de ubicación. En Filtros, "Desde dónde sale": al tocar Aragua quedan solo los de la ferretería y arriba sale "Desde Aragua" para quitarlo.
  8. **La ficha** de un producto de la ferretería empieza la entrega con "Sale de La Victoria, estado Aragua". El carrito con uno de cada lugar dice "uno desde Portuguesa (Guanare) y uno desde Aragua (La Victoria)".
  9. **Un correo de verdad** (C-219): Configuración → Correo → "Probar conexión" a tu Gmail.
     - Ábrelo en la computadora y en el teléfono, también en modo oscuro: arriba ELECTRO SHOP con la cinta, abajo Chispa con gorro y el cierre "sin miedo" con el RIF.
     - Si puedes, reenvíalo a un Outlook o Hotmail. Si algo se ve mal, manda la captura.
  10. **Los 54** (Marketing → Correos → Plantillas): salen por grupo. Abre "Pago confirmado" en Escritorio y en Móvil: las fotos de los productos se ven.
  11. **Una compra pequeña con Pago Móvil, con tu cuenta de cliente:** llega un solo correo, "¡Pago confirmado!", con la foto, el total en $ y en Bs., y el aviso del flete en azul claro.
  12. **Contacto:** manda un mensaje desde `/contacto` con tu correo: llega "¡Te leímos!". En el panel, Mensajes → ese mensaje → "Redactar con Claude" → "Enviar con el diseño de la tienda": llega la respuesta y el mensaje queda "Respondido".
  13. **Los buscadores** (C-225): `https://electroshopve.com/llms.txt` empieza "Tienda en Guanare, Portuguesa, Venezuela". Al compartir `https://electroshopve.com` por WhatsApp, la imagen dice "Tecnología, ferretería y gift cards" con "Todo lo encuentras con nosotros." debajo (desde el teléfono: el de escritorio guarda la vista previa vieja).
  14. **Las cookies** (C-223): sin las claves de Google y del píxel en el `.env` (como hoy), no sale ningún aviso ni "Cookies" en el pie. El aviso sale cuando se pongan (sección 3, paso 10).
  15. **Contabilidad** (C-229), con la cuenta del dueño:
      - En el menú está Contabilidad → Facturas. Carga el talonario (§3, paso 22).
      - "Nueva factura": elige una compra de este mes y sigue los 4 pasos.
      - En "Revisar y emitir" la factura se ve con sus casillas numeradas, y en el teléfono, casilla por casilla.
      - **Si la escribes de verdad,** toca "Ya la escribí". Si es solo una prueba, no la registres: el número se gasta. En ese caso vuelve con "Atrás" o cierra la pestaña.
  16. **Con una cuenta de administrador:** Contabilidad → Facturas abre, pero "Cargar el talonario" no aparece, y `/admin/contabilidad/talonarios/nuevo` lleva al inicio del panel.
  17. **Lo que nos hace únicos** (C-224): el inicio dice "Por qué comprar en Electro Shop", con "Tu Pago Móvil lo confirma el banco" y "Una tienda de verdad, con taller propio" (14 años en Portuguesa). El pie también dice los 14 años.
  18. **Cuándo sale cada pedido** (C-234):
      - **En el panel,** Configuración → Envíos y retiro → "Cuándo sale cada pedido": la hora de corte dice 2:00 p. m. y la lista trae los feriados que vienen, desde el 24 de diciembre (Nochebuena). El ejemplo de abajo dice que lo pagado el sábado a las 12:00 sale el lunes, y lo de un proveedor, el martes. No cambies nada si no hace falta.
      - **En el teléfono,** la ficha de un producto de la tienda: junto a "Agregar", "Compra en las próximas … y sale hoy" (de lunes a viernes antes de las 2:00 p. m.) o "Compra hoy y sale el …". Uno de la ferretería sale un día hábil después, "desde Aragua". Una gift card dice cuándo llega.
      - **El carrito y el checkout** dicen la misma fecha por paquete. En la compra de la prueba 11, el correo dice "Sale el …" en "Así te llega", y Mi pedido también.
  19. **El checkout por pasos** (C-241), en el teléfono, con una compra pequeña: arriba Carrito, Entrega, Revisar y Pagar.
      - En Entrega, sin elegir ZOOM o MRW, "Siguiente: revisar" está apagado y dice por qué.
      - En Revisar, sin los términos, "Siguiente: pagar" está apagado.
      - En Pagar están el método y "Completar Pedido". Tocar "Entrega" arriba vuelve, y lo elegido sigue ahí.
      - Ninguna letra ámbar; "Verificado" (a la derecha, en tu información de contacto) va en verde fuerte con letra blanca.

### Por confirmar de rc.43 (C-210 a C-218; unos 15 minutos)
Ya en producción desde el 14/11 (`HISTORIAL.md`). Su SQL está confirmado. **Falta saber si se corrió el relleno de la fecha de publicación**, que ordena "Recién llegados". Correrlo otra vez no hace daño: solo llena lo que sigue vacío. En la terminal del servidor: `cd /var/www/electroshopve && DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/c210-fecha-de-publicacion.sql`. Al final, `publicados_sin_fecha` debe decir 0.
1. **En la computadora, en una ventana de incógnito,** abre el inicio.
   - "Destacados de la semana" muestra los que tienen la estrella: hoy, la hidrolavadora, el taladro, los audífonos y el SSD.
   - "Recién llegados" abre con la lijadora, el esmeril y la aspiradora.
2. **En el panel, Productos:** quítale la estrella a uno y recarga el inicio: ya no sale en Destacados. Vuelve a ponérsela.
3. **Publica un borrador** (uno de la ferretería, en Productos → Borradores): recarga el inicio y sale primero en "Recién llegados".
4. **En el panel, Productos → Nuevo producto → Producto físico:** escribe "Taladro de impacto 1/2 650 W Emtop" y toca "Buscar". En unos 20 segundos, la descripción dice "Redactada por Claude Haiku 5.5 (esfuerzo alto)…". Si dice Groq, la clave no quedó bien en el `.env`.
5. **En el panel, Órdenes:**
   - las píldoras van llenas: "Entregada" en verde con su ícono y "Digital" en azul, como en la tienda; "Pendiente", en azul noche con el reloj en cian (ninguna píldora ámbar en el panel);
   - la guía de ZOOM va en gris con el camión;
   - al pasar el ratón por "Códigos" o por el ojo, el botón se levanta.
6. **El resumen del cliente:** en el panel, Clientes → "Ver detalles" de un cliente con compras → pestaña **Resumen**.
   - "Lo que hay que atender" lista sus órdenes abiertas, garantías y cotizaciones; "Total gastado" no cuenta lo cancelado.
   - Toca **"Resumir con Claude"**: en unos 15 segundos dice quién es como cliente y hasta 3 productos para ofrecerle, y abajo "Redactado por Claude Haiku 5.5 (esfuerzo alto)". Si dice que falta la clave o que Claude no respondió, la clave del `.env` no quedó bien.
7. **La respuesta a un mensaje:** en el panel, Clientes → Mensajes y solicitudes → abre un mensaje → **"Redactar con Claude"**.
   - Arriba salen los datos que usó (su orden, un producto, la ciudad y el flete de ZOOM), y el texto se puede editar.
   - "Responder por correo" abre tu correo con el asunto y el texto. Si el mensaje es de alguien con cuenta y otro teléfono, no sale "Enviar por WhatsApp", a propósito.
8. **Los mensajes por urgencia:** en Mensajes y solicitudes, toca **"Ordenar por urgencia"** una vez (lo que llegó antes del deploy no está revisado).
   - En unos segundos, la lista queda con "Urgente", "Puede esperar" y de qué trata cada uno, y "Más urgentes primero" los ordena.
   - En **Solicitudes de productos**, si alguien pidió algo que ya vendes, sale "Ya está en la tienda" con el enlace.
9. **Una campaña con Claude:** en el panel, Marketing → Campañas de correo → **Nueva campaña**. En "¿De qué es la campaña?" escribe "Gift cards para Navidad" y toca **"Armar el borrador"**.
   - En unos 20 segundos se llenan el asunto y los bloques, con las gift cards de la tienda, sus fotos y sus precios, y la vista previa los muestra.
   - Revísala, envíate una prueba y bórrala o guárdala: nada se envía solo.
10. **El catálogo de la ferretería:** en el panel, Productos → Más → Lista del proveedor. Elige la ferretería y sube su lista como siempre (así queda guardada).
   - En el paso 3 sale **"Proponer con Claude"** con la cuenta de lo nuevo. La primera vez, para ver cómo propone, tócalo, deja que corra unos 30 segundos y toca **"Parar"**.
   - Revisa unas filas: el nombre propuesto, "Claude: categoría …" y, si tiene, su duda (salen en "Nombres para revisar"). Si te gusta, toca otra vez "Proponer con Claude" para los demás: lo hecho no se repite.
11. **El sorteo: armarlo y encenderlo** (en la computadora, con tu cuenta).
   1. **La foto de la consola:** súbela como foto de un producto (o en Configuración), ábrela y copia su dirección, la que empieza con `/api/uploads/`.
   2. **En el panel, Marketing → Sorteo:** revisa lo propuesto (premio, del día de hoy al 18/12, resultado el 20/12, USD 10 y 3 por invitar) y pon lo que te costó la consola.
   3. Pega la dirección de la foto, marca "En la tienda" y guarda.
   4. **En una ventana de incógnito,** abre `electroshopve.com/sorteo`: el premio con su foto, "Cómo participar" y las bases.
   5. **Con una cuenta de cliente,** en el teléfono: "Tus boletos" y "Compartir por WhatsApp". En Mi panel sale la tarjeta "Tienes N boletos".
   6. **El 20/12,** en Marketing → Sorteo, "Sortear ahora". Solo se puede después del cierre y una sola vez. Escríbele al ganador al correo que sale ahí.


**Por confirmar de rc.33 (con una cuenta, unos 15 minutos):**
1. **La Lista del proveedor por pasos:** arriba se ven los 5 pasos. En el paso 2, abre "1 - Cargar en la tienda" de la carpeta de la ferretería, selecciona todo (Ctrl + A) y suéltalo: dice "105 fotos · 74 códigos de su lista con foto".
2. **Una compra que mezcla la tienda y la ferretería:** el carrito dice "Tu pedido llega en 2 paquetes"; el checkout no ofrece retiro ni delivery; quedan dos órdenes, y la de La Victoria avisa en el panel "pásale el pedido".

### Por confirmar de rc.28 (necesita una cuenta, unos 15 minutos)
1. **Mi panel (C-201), en el teléfono, con una cuenta de cliente que tenga alguna compra:**
   - nada se sale de la pantalla;
   - dice "Actividad reciente" y nunca "Saldo";
   - no sale "En vivo";
   - en Garantía se ven enteras las tres pestañas.
2. **Lista del proveedor (C-202):** sube el archivo de los 60 con su existencia. Sale la columna "Nombre en la tienda", y "Nombres para revisar" filtra lo que va en ámbar.
3. **Categorías (C-200):** Ferretería tiene marcada "Departamento aparte" y adentro sus 9 categorías, con los íconos nuevos.
4. **Los 14 nombres (C-202):** ya se cambiaron, pero 10 quedaron con nombres propios en minúscula o en inglés.
   - Los juegos: "Assassins creed mirage…", "Grand theft auto v…", "Sonic frontier…".
   - Las tarjetas: "Steam card", "Xbox live points", "PlayStation fondos".
   - Los nombres correctos están en `estado/C-202.md`.
   - El botón "Usar este nombre" no conoce títulos ni marcas de juegos: hay que escribirlos a mano.

### Por confirmar de rc.25 (C-196, C-196b y C-197)
1. **Productos:** arriba dice "N en el catálogo · N activos · N destacados" y abajo "Mostrando 1 a N de N". Los filtros (Todos, Activos, Borradores, Sin stock, Archivados y Por revisar) tienen sus números.
2. **El buscador:** escribe `teclado aoas` (en otro orden y en minúsculas) y aparece el teclado. Ordena por "Precio: menor a mayor".
3. **Un proveedor:** edita un producto físico → paso **Precios** → "Proveedor" → **+ Agregar proveedor…**, escribe el nombre de la ferretería, **Agregar**, pon su código en "Código en el proveedor" y guarda. En la lista, el producto dice el proveedor y el código bajo el SKU, y la columna Costo trae el margen. El filtro "Todos los proveedores" lo encuentra.
4. **Productos → Más → Lista del proveedor:** elige el proveedor (el de la ferretería), marca **"Su lista trae el IVA incluido"**, deja el descuento en 0 y sube su listado de existencia y su lista de precios (los dos `.xls`). Dice cuántos hay en su lista y cuántos con existencia, y en la vista previa la bomba Daewoo de 1/2 HP (R023127) dice costo $47,33 y precio sugerido $71,37. Se pueden crear en borrador cuando quieras (un borrador no se ve en la tienda); **publicarlos, solo después de C-199 y C-200** (sección 4).
5. **La ficha, en la computadora y en el teléfono:** abre el teclado AOAS. La descripción y las especificaciones van en una sola tarjeta, sin hueco; al lado de la descripción, Aoas, M-880, 30 días y Nuevo; las especificaciones en dos columnas, con "Tamaño" y "Tipo de LED" (no en mayúsculas) y sin "Switches: No especificado". En el teléfono, todo en una columna.
6. **Teléfono:** Productos se ve en tarjetas, sin scroll de lado, y abajo están las páginas.
7. **Exportar:** Más → Exportar todo (CSV) abre en Excel con los acentos bien y las columnas de costo y proveedor.

**Vuelta atrás:** `git reset --hard v1.0.0-rc.23 && npm install && bash scripts/deploy.sh --sin-pull` (detalle en `HISTORIAL.md`, 10/11).

### Por confirmar de rc.23 (C-195, unos 5 minutos)
Subida entre el 07 y el 10/11. Claude la comprobó desde fuera el 10/11. El bloque está en `HISTORIAL.md`.
1. **Teléfono, en incógnito, con el tema navideño encendido:** el popup muestra a Chispa saludando con la mano nueva: los dedos abiertos y el pulgar corto.
2. **ElectroStudio → Nueva historia → Felicitación → Contenido:** en el selector de Chispa, "Pulgar arriba" tiene el pulgar corto y grueso, y "Señala", el pulgar cruzado. La historia muestra la misma pose.
3. **Una historia vieja con Chispa** se abre y lo muestra con las manos nuevas.

### Por confirmar de rc.22 (C-191 a C-194, unos 15 minutos)
Subida el 06/11 por Andrés. Claude comprobó el 07/11, como un visitante:
- la casilla de las ofertas en `/registro`;
- el popup navideño nuevo, con Chispa;
- "Antes" y "Después" en `/servicios`;
- `/ideas-para-regalar`.

Falta lo que necesita una cuenta (detalle en `HISTORIAL.md`, 06/11). La prueba 3 confirma también que se aplicó la columna nueva de la base.
1. **Marketing → Campañas de correo:** dice "N de M clientes" (todos los clientes) y debajo cuántos no han decidido, cuántos dijeron que no y cuántos no verificaron el correo.
2. **Teléfono, en incógnito, `/registro`:** debajo de los términos, la casilla de las ofertas, sin marcar.
3. **Con una cuenta de cliente que nunca decidió:** Mi panel muestra "¿Te avisamos de las ofertas?". "Sí, por correo" la quita y en Marketing sube "aceptan".
4. **Marketing → Correos de la tienda:** "Certificado de curso", "Gift card" y "Código digital" llevan la placa azul noche; "Pago en revisión" ya no tiene la caja ámbar.
5. **Productos:** "Destacado" en azul. **Teléfono, `/servicios`:** "Antes" y "Después" se leen.
6. **ElectroStudio → Nueva historia → Regalos por presupuesto:** elige "De $20 a $50": salen solo productos de ese tramo. Con tres, la historia muestra las tarjetas y el QR.
7. **Nueva historia → Felicitación:** "¡Feliz Navidad!" con Chispa saludando con el gorro. En Diseño, el "Toque navideño" pone el gorro en el logo; en una historia de un producto físico, con las fechas cargadas, sale la franja del 24.
8. **Publicar → Escribir el texto:** trae el WhatsApp y unos 10 hashtags.
9. **Teléfono, en incógnito, con el tema navideño encendido:** al entrar sale el popup nuevo con Chispa. "Ver ideas para regalar" lleva a la página de regalos.

### Por confirmar de rc.21 (C-189 y C-190)
1. Si no se corrió en el deploy, crear los borradores de campaña: `npx tsx scripts/campanas-navidad.ts --aplicar`, en `/var/www/electroshopve`.
2. Cargar las fechas de corte en Marketing → Navidad → "Para que llegue antes del 24", confirmadas con ZOOM, MRW y el delivery.
3. Las pruebas de `HISTORIAL.md` (06/11, rc.21): Ideas para regalar, la franja, el botón de la tarjeta, los borradores, el selector de categorías y el checkout.

### Por confirmar de rc.20 (C-186 y C-188)
Los íconos en la tienda, el panel y el teléfono; el gorro y la tarjeta navideña. Las pruebas están en `HISTORIAL.md`, 06/11.

### Por confirmar de rc.19 (C-187, unos 15 minutos)
El diagnóstico confirmó los 5 zombis: los 3 de la captura y 2 productos de prueba. Todos tienen al menos una orden (`HISTORIAL.md`, 06/11).
1. **Limpieza desde el panel:** Productos → **Archivados** → la casilla de arriba → **A la papelera**. Después, **Papelera → Vaciar la papelera**.
   - Como los 5 tienen órdenes, quedan **eliminados**: salen para siempre y su historia se conserva.
   - Comprobar: "Archivados" dice 0, y la papelera dice "Eliminados que se conservan por sus ventas (5)".
2. **Teléfono:** Productos muestra enteras las pestañas Catálogo, SADES y Papelera.
3. **Mañana, después del cron de las 9:45:** los 5 no volvieron.
4. **"Por revisar":** dice "Sin marca 4" y "Sin peso o medidas 1". Ponle la marca a uno y baja. El aviso del Dashboard lleva al filtro.
5. **La vista se recuerda:** filtra "Activos", busca, edita un producto y guarda: vuelves a la misma vista.
6. **Deshacer y la estrella:** cambia el estado de un producto y toca "Deshacer". Pon la estrella de Destacado en uno y quítala.

**Decidido (06/11):** las órdenes entregadas de "Producto Test" y "Test Digital" fueron compras de prueba. Andrés dijo que se quedan como están, aunque cuenten en los reportes: no se tocan.

**Lo decide Andrés:** `/categorias` muestra 8 de 15 categorías con "0 productos". C-187 propone esconderlas y no lo aplicó.

### Por confirmar de rc.18 (C-184, 2 minutos)
1. **Teléfono:** abre el enlace de la próxima cotización del convenio que mande Numen. Equipos y mano de obra van por separado, con el precio de lista tachado y el descuento en verde. "Descargar PDF" sale igual.
2. **Panel:** abre esa cotización en Admin → Cotizaciones y guárdala sin cambiar nada. La vista previa sigue con el precio de lista y la mano de obra aparte.

Los bloques de C-183 (rc.17), C-182 (rc.16) y C-181 (rc.15), con lo comprobado y su vuelta atrás, pasaron a `HISTORIAL.md`.

### Por confirmar de rc.17 (C-183, 2 minutos)
1. **Navegador:** abre el enlace de una cotización y toca "Imprimir o guardar en PDF". Los totales están al lado de las partidas, y las condiciones y las formas de pago van debajo, a lo ancho.

Los bloques de C-182 (rc.16) y C-181 (rc.15), con el SQL, lo comprobado y su vuelta atrás, pasaron a `HISTORIAL.md`.

### Por confirmar de rc.16 (C-182, unos 10 minutos)
1. **Panel:** Admin → Cotizaciones → una cotización → abajo, "Lo que no incluye" y "Anexo técnico" (con una tabla: `Equipo | Consumo` y una fila). Guardar y ver la vista previa: el recuadro ámbar y la segunda hoja.
2. **Impresora sin color:** en el enlace, "En blanco y negro". La hoja sale sin fondos de color y se lee completa.
3. **Teléfono:** en el enlace, "Descargar PDF". Abre el presupuesto en hoja carta; si está pendiente, tocar el QR abre el enlace.

### Por confirmar de rc.15 (C-181, unos 5 minutos)
1. **Panel:** Admin → Cotizaciones → una enviada. Debajo de "Enlace para el cliente" dice "El cliente todavía no la abrió" (las de antes no tienen el dato).
2. **WhatsApp:** pega ese enlace en un chat contigo mismo y deja que arme la vista previa, sin abrirlo. Recarga el panel: sigue diciendo que no la abrió.
3. **Teléfono:** abre el enlace en una ventana de incógnito, sin la sesión del panel. Recarga el panel: dice "El cliente la abrió el …".
4. **Lo de siempre:** en una cotización de prueba, "Enviar", "Aprobar" (registrada por ti) y "No se concretó". Si tenía un producto del catálogo, el inventario baja y vuelve como antes.

### La clave de Numen (más adelante, con la confirmación de Andrés)
Cuando Numen esté instalado y conectado. Es una variable nueva de producción.
1. **Terminal del servidor de la tienda:** `openssl rand -hex 32`.
2. Pegar el resultado en `.env` con `nano .env`, en una línea `NUMEN_API_KEY="…"`.
3. Correr `bash scripts/deploy.sh --sin-pull`.
4. Guardar la misma clave en el gestor de contraseñas. Claude la pone en el `numen.env` del servidor de Numen como `NUMEN_WEB_CLAVE`.
5. Comprobar: `curl -s -o /dev/null -w "%{http_code}\n" -X POST https://electroshopve.com/api/numen/cotizaciones` ahora da `401`.

Los bloques de C-178 (rc.13 y su ajuste, rc.14), con lo que se comprobó y su vuelta atrás, pasaron a `HISTORIAL.md`.

### Por confirmar de rc.13 y rc.14 (C-178, unos 10 minutos)
Claude ya comprobó en producción, pidiendo como los lectores de Facebook y WhatsApp, que cada página tiene su imagen. Falta verlo en las apps de verdad:
1. **Facebook:** en [el depurador de Facebook](https://developers.facebook.com/tools/debug/), pega `https://electroshopve.com` y un producto, y toca **"Volver a extraer"**. Debe salir la imagen nueva, ancha, sin advertencias de tamaño.
2. **WhatsApp:** pega un enlace de un producto en un chat contigo mismo. WhatsApp guarda un rato la vista previa de cada enlace: para ver la portada nueva enseguida, prueba con `https://electroshopve.com/?w=2`. **Desde el teléfono**: WhatsApp de escritorio siempre la arma chica (comprobado el 16/10, `estado/C-178.md`); para compartir grande desde la computadora, se reenvía un mensaje que salió grande. Sale la tarjeta con la foto, el nombre y el precio. Los enlaces que ya se habían compartido conservan su vista previa vieja: eso no se puede cambiar.
3. **Configuración → SEO:** en Inicio, Productos, Servicios y Cursos, "Así se ve en WhatsApp" muestra la imagen generada.
4. **Un precio:** cambia el precio de un producto, guarda y vuelve a pasarlo por el depurador de Facebook. La imagen dice el precio nuevo.

### Por confirmar de rc.12 (C-177, unos 5 minutos)
Claude ya comprobó la tienda, el panel sin sesión, el tiempo real y las fotos. Falta lo que solo se ve con tu cuenta:
1. **Correo del panel (nodemailer nuevo):** Configuración → Correo → "Probar conexión" a tu correo: llega.
2. **Correo a un cliente:** en una ventana de incógnito, "Olvidé mi contraseña" con tu correo de cliente: llega y el botón funciona.
3. **Foto de producto (sharp nuevo):** edita un producto y sube una foto con fondo transparente o blanco liso. Sale con fondo blanco, el producto centrado y la cinta ES.

### Por confirmar de rc.7 a rc.11 (ya en producción, unos 15 minutos)
El bloque de rc.7 a rc.11 (C-171, C-170, C-175 y C-172), con su verificación y su vuelta atrás, pasó a `HISTORIAL.md`. Falta que Andrés dé por buenas sus pruebas:
1. **Dashboard:** se ve como siempre. Arriba a la derecha, **Editar**.
2. **Editar:** quita "Órdenes recientes" con el botón rojo; en "Agregar" toca "Visitantes ahora" y "Meta del mes"; cambia el tamaño de una tarjeta; arrastra una con el ícono de la cruz (o usa las flechas); en "Tus accesos rápidos" agrega "Clientes". **Listo**. Recarga: sigue igual. Ábrelo en el teléfono: es el mismo.
3. **Meta del mes:** escribe tu meta en la tarjeta y guarda: muestra el porcentaje y cuánto falta.
4. **Luis:** su Dashboard sigue siendo el de siempre (no cambió con el tuyo) y en "Agregar" **no** le salen "Meta del mes" ni "Respaldo".
5. **Restablecer** (dentro de Editar) vuelve al diseño original.
6. **Sin pisarse (C-170)**, con dos cuentas de administrador: abran la misma **cotización**; uno cambia "Para qué es" y el otro el lugar, y guardan los dos: quedan los dos cambios sin preguntar. Si los dos cambian lo mismo, sale el cuadro para elegir. Lo mismo vale en Promotores (lápiz), Categorías, Ofertas y Campañas. En **ElectroStudio**, escribe en una historia: debe seguir diciendo "Guardado".
7. **Correos (C-175):** Admin → Marketing → Correos → **Plantillas**: abre "Pedido recibido", "Gift card" y "Reseña publicada": arriba el logo largo, un botón azul y el pie con las redes.
8. **Un correo de verdad:** Configuración → Correo → **"Probar conexión"** a tu Gmail. Ábrelo en la computadora y en el teléfono (también en modo oscuro): el logo largo se ve completo y nítido, y nada queda cortado. Si puedes, reenvíalo a un Outlook u Hotmail. Si algo se ve mal, manda la captura.
9. **Destacados (C-172), en la computadora:** abre el inicio y espera 7 segundos: el producto grande cambia por el primero de la columna y arriba a la derecha dice "2 de N". Pon el ratón encima: se detiene. Toca las flechas y la pausa. Déjalo solo: da una vuelta y se queda en el primero. En el teléfono no gira.
10. **Otro correo, de los de siempre:** en una ventana de incógnito, "Olvidé mi contraseña" con tu correo de cliente: llega con el mismo diseño y el botón funciona.

### Por confirmar de lo ya subido (rc.6 y rc.7; detalle en `HISTORIAL.md`)
El Dashboard a tu gusto (pruebas 1 a 5 de arriba). Versiones (Administración → Versiones), el caso de dos administradores sobre un producto (papelera, combinar, aviso al instante), la marquesina del equipo y Reportes en vivo. La línea del cron de la papelera ya está en `crontab -l` (comprobado el 16/10).

### Activar "Continuar con Google" (C-85, cuando quieras; no necesita deploy de código)
1. Google Cloud → proyecto ElectroWeb → Google Auth Platform → **Clientes** → Crear cliente → **Aplicación web**, nombre `ElectroShop inicio de sesión`, y en "URIs de redireccionamiento autorizados": `https://electroshopve.com/api/auth/callback/google`. Es un cliente distinto del de los respaldos.
2. En el servidor, `nano .env` y agregar `GOOGLE_CLIENT_ID="…"` y `GOOGLE_CLIENT_SECRET="…"`; luego `bash scripts/deploy.sh --sin-pull`.
3. En una ventana de incógnito, `/login` y `/registro` muestran "Continuar con Google". Probar con un Gmail que **no** sea el de administrador (los administradores no entran con Google, a propósito). Nunca se probó con Google real (`estado/C-85.md`): si falla, mandar la captura.

### Por confirmar de lo que ya está en producción (C-165 y anteriores)
No hay más deploy pendiente que el de arriba. Estas son las pruebas que Andrés debe dar por buenas (o avisar a Claude con lo que falle). Detalle en `estado/C-165.md`, `estado/C-164.md`, `estado/C-159.md` y `estado/C-160.md`; lo subido, con su SQL, en `HISTORIAL.md`.

### Respaldos (C-165), lo más importante
1. **La clave privada guardada fuera del servidor** (gestor de contraseñas) y una copia del `.env`.
2. **Google conectado:** Configuración → Respaldos → Google Drive muestra "Conectado" y su correo. Requiere la app **publicada** ("En producción" en Google Auth Platform → Público), si no el permiso vence a los 7 días.
3. **"Respaldar ahora":** dos filas "Hecho" (base y fotos/constancias) y dos archivos `.enc` en la carpeta "Respaldos ElectroShop" de su Drive. Si sale "Falló", pasar el texto del historial a Claude.
4. **"Verificar el último":** dice que coincide con Drive.
5. **Respaldo encendido y el cron puesto:** `crontab -l` muestra `5 * * * * /home/luami/cron-respaldos.sh …`; al día siguiente aparece un respaldo "automático" en el historial.
6. **Una restauración de prueba** (`OPERACION.md`, "Restaurar un respaldo", pasos 1 a 3): un respaldo que nunca se abrió no es un respaldo. Repetirla cada trimestre.

### Otras pruebas pendientes (unas 20 minutos)
1. **Últimos menores (C-164):** una valoración con decimales sale con coma ("4,5") en Admin → Cursos o en el panel del creador; Puntos ES → "Recargar": al escribir un monto aparece el equivalente en bolívares.
2. **Dashboard:** con el respaldo encendido y hecho, no sale el recordatorio de respaldos; apagado, sí.
3. **Retención (C-159, si faltaba):** Admin → Cotizaciones → Nueva → una línea de $116 → "Retención del IVA" 75 %: "Retención del IVA (75 %): −$12,00 · Neto a pagar: $104,00". "Enviar por correo" a tu correo: llega con un botón. "Mis cotizaciones" en una cuenta de cliente.
4. **Páginas legales (C-160, si faltaba):** `/terminos` y `/privacidad`: **leer el correo, el WhatsApp y el horario del final** (salen de Configuración → Negocio). Configuración → Correo → "Probar conexión". Buscar `teclado` y ordenar "Menor a mayor". La reseña solo aparece a quien compró.

### Pruebas de lo anterior, si faltan (ya está en producción)
- **Reseña por correo (C-157):** Admin → Marketing → Correos → "Pedir la reseña" (correo de ejemplo con dos botones); Mi perfil → Notificaciones → "Tus reseñas". **Prueba real:** adelantar una orden tuya entregada y correr el cron:
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -c "UPDATE orders SET \"deliveredAt\" = now() - interval '6 days', \"reviewRequestedAt\" = NULL WHERE \"orderNumber\" = 'ORD-2026-00XX'"` (con su número) y `~/cron-resenas.sh`: debe responder `"correos":1` y llegarte el correo.
- **Buscador (C-158):** en la tienda, `audifonos` sin acento y `tecaldo` mal escrito; en Admin → Productos, buscar con y sin acento.
- **Inicio y categorías (C-162, C-163):** en la computadora, "Destacados de la semana" con la foto llenando la tarjeta y "NUEVO" en la esquina; "Compra por categoría" con seis categorías y cada producto en la suya.
- **Volver a subir tres fotos** (las ya armadas no cambian solas): editar el producto, quitar la foto y subirla otra vez. **Tablet W&O** y **audífonos Piston** (para que la cinta salga sin el corte) y **Grand Theft Auto V PS5** (centrada y con aire; quitar las dos primeras, que son la misma). Si no tienes el original, la tienda lo guarda: la dirección de la foto, terminada en `.orig.png` en vez de `.webp`.
- **Buscar en la web (C-155):** Productos → Nuevo → Producto físico, "Teclado mecánico Redragon Kumara K552", "Buscar". Si arriba dice "Los datos vienen de la búsqueda con IA y no se pudieron contrastar", los buscadores no le responden al servidor: avisar a Claude. La clave va en el `.env` del servidor como `GROQ_API_KEY`.
- **Marca (C-155):** ponerla en los audífonos Piston, el SSD y el teclado AOAS.
- **Embalaje según el paquete (C-153):** Configuración → Envíos y retiro → encender, corregir las medidas y los precios de tus sobres y cajas, y poner el monto del embalaje gratis. Una compra barata con envío: en la orden, "Cómo empacar".

### Si algo sale mal
- **El respaldo falla o Google no conecta:** no afecta a la tienda. Ver el motivo en el historial de Configuración → Respaldos y pasárselo a Claude. Mientras tanto sirve `~/respaldo-antes-c165.dump` (hecho antes de subir).
- **Volver atrás el código:** `git reset --hard <commit> && npm install && bash scripts/deploy.sh --sin-pull`, con `<commit>` = `d453809` (deshacer solo C-165) o `2ccba36` (también C-164). Las tablas nuevas no molestan al código anterior (no se quitan). Antes, quitar la línea de `cron-respaldos.sh` de `crontab -e`: la ruta ya no existiría y el cron daría error cada hora.
- **Si el correo del panel deja de salir** (certificado): `SMTP_ALLOW_SELF_SIGNED="true"` en el `.env` y el deploy, o volver atrás.
- **Si el cron de reseñas manda correos de más:** quitar su línea de `crontab -e` y avisar a Claude con lo que respondió `~/cron-resenas.sh`.
- **Redondeo de C-96** (pendiente desde el 24/09, si falta), con su respaldo:
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump`
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
  Muestra tres números: el último debe ser 0; si el del medio ("diferencia real") no es 0, pasarle la salida a Claude.

## 3. Tareas del equipo (Andrés y Luis, sin código)
En el orden en que más destraban:

**Del plan del 14/11 (C-220):** los textos para Google, el lema y el sorteo de Navidad ya no los hace el equipo en el panel: van en el SQL de datos del bloque de rc.45 (sección 2). Después del deploy queda subir la foto de la consola (Marketing → Sorteo → Cambiar).

**La ferretería aliada (pedido del 10/11)**
0. **Despacho (acordado el 10/11):** la ferretería despacha y envía los pedidos de la web.
0a. **Los 70 en borrador, después de subir rc.30** (no se ven en la tienda: se publican después de C-199):
   1. En el panel: Productos → Más → Lista del proveedor. Elige el proveedor de la ferretería, marca "Su lista trae el IVA incluido" y deja el descuento en 0. En la captura del 12/11 el costo era igual al precio de lista: la casilla estaba sin marcar, y así el precio sale un 16 % más alto (la motobomba, $370,21 en vez de $319,15).
   2. En el paso 2 de la misma pantalla, abre "1 - Cargar en la tienda" de la carpeta de la ferretería, selecciona todo (Ctrl + A) y suéltalo: van juntos el archivo de los 70, su existencia y "Fotos para subir". Así lo explica `LEEME.txt`.
   3. Revisa la columna "Nombre en la tienda": lo que sale en ámbar se mira antes de crear.
   4. En "Nuevos con existencia", marca los 85 códigos y toca "Crear en borrador" con "Con sus fotos" marcado. Tarda unos minutos por las fotos.
   5. En el paso 5, toca "Completar con la web": tarda unos 15 minutos y se puede detener. Después, en "Por revisar", abre cada uno, corrige la descripción si hace falta y toca "Está bien".
   6. **"Publicar los listos" ya se puede** después de subir rc.32 y elegir "Él mismo, desde La Victoria" (arriba). Revisa antes que cada uno tenga foto y descripción.
0c. ~~**Las fotos que faltan, desde MercadoLibre:**~~ **Hecho el 13/11** (Hydrogen y otras tiendas; Claude las revisó y quedan 11 sin foto). Si quieres, una segunda vuelta con Antigravity para 3 (los protectores PARTE-110 y PARTE-220 y el taladro Zasc): `4 - Trabajo de fotos (no se sube)/Prompt para Antigravity - segunda vuelta.txt`. Antes decía: abre `Fotos que faltan - MercadoLibre.html` (en la carpeta de proveedores). Trae la búsqueda de cada uno de los 35 productos sin foto. Guarda la foto principal de una publicación con la marca y el modelo, sin marca de agua ni logo de la tienda, con el nombre del código (`HE00014.jpg`), en `Fotos del fabricante/2 - De MercadoLibre`. Después, avísale a Claude: las revisa, les quita el fondo y las pasa a "1 - Para subir".
0b. **Mandarle a la ferretería `Preguntas para la ferreteria 13-11.txt`** (2 mensajes, en la carpeta de proveedores; si ya mandaste la del 12/11, no hace falta otra): fotos de la caja de 13 códigos y 24 modelos para confirmar con un sí. Con sus respuestas, Claude completa los nombres, los modelos y las fotos.

**En producción**
1. **Las pruebas de la sección 2:**
   - rc.25: la lista por páginas, el proveedor, la Lista del proveedor (con el IVA incluido) y la ficha en una tarjeta.
   - rc.23 y rc.22: Chispa en el popup y en ElectroStudio; Marketing, Mi panel, los correos y las plantillas nuevas.
   - rc.17: la hoja impresa con las condiciones y las formas de pago a lo ancho.
   - rc.16: el anexo en el panel, la hoja en blanco y negro y el PDF en el teléfono.
   - rc.15: la vista del cliente en el panel.
   - rc.12: el correo y la foto de producto.
   - rc.13 y rc.14: el depurador de Facebook, desde el teléfono.
   - rc.7 a rc.11: el Dashboard.
   - De antes siguen pendientes **una restauración de prueba del respaldo** (`OPERACION.md`), el redondeo de C-96, las pruebas de C-157 y las visuales de C-162.
1b. **El catálogo de WhatsApp (C-180, `PLAN.md` §5.2):**
   - **Hecho el 16/10:** la portada del perfil de WhatsApp Business (con Chispa), y el catálogo creado en Commerce Manager con el feed.
   - **Falta mandarle a Claude la captura de Commerce Manager:** cuántos productos entraron y la pestaña de problemas.
   - **Falta volver a subir desde el panel la foto original, sin cinta, del SSD Hiksemi y del teclado AOAS:** quitar la foto principal y subir el original. La tienda le pone sola la cinta para la web.
   - **Todavía no se conecta el catálogo a la app:** se hace cuando Claude suba C-180.
2. **Guardar aparte, fuera del servidor, la clave privada del respaldo y una copia del `.env`** (gestor de contraseñas). La clave la muestra el panel una sola vez; el `.env` no va dentro del respaldo y trae `NEXTAUTH_SECRET`, `DATABASE_URL` y las claves de pago.
3. **Un monitor de que la tienda está arriba** (gratis, sin código): UptimeRobot o similar apuntando a `https://electroshopve.com/robots.txt` cada 5 minutos, con aviso a tu correo y a Telegram. Todo lo demás (avisos, respaldos) vive en el mismo servidor y no puede avisar si se cae.
4. **Tus llaves para entrar al servidor (C-176):** en tu laptop y en tu PC, en PowerShell, `ssh-keygen -t ed25519` (Enter a todo) y mandarle a Claude el contenido de `C:\Users\<tu usuario>\.ssh\id_ed25519.pub`. Es la llave **pública** y se puede compartir; la privada (`id_ed25519`, sin `.pub`) no sale de tu computadora. Cuando las dos estén puestas, el servidor deja de aceptar contraseña. El certificado HTTPS ya se renueva solo: se renovó el 13/10 y vence el 11/01/2027.
5. **La revisión final** ([`REVISION_FINAL.md`](./REVISION_FINAL.md)): en el teléfono real, marcando cada punto. Pendiente desde el 26/09. **Antes de `v1.0.0`, al menos el dinero:** una compra con Pago Móvil, una con Puntos ES, recargar Puntos ES, un cupón y cancelar una orden (que vuelvan el stock y el cupón).
6. Pasar a borrador el **"Producto Test"** (Consolas) y renombrar los productos digitales que dicen **"(SALDO)"** (`estado/C-136.md`). **Renombrar, después de subir rc.27 y con los nombres aprobados de `estado/C-202.md`:** así el enlace viejo lleva al nuevo.
7. **Marca** en cada producto físico (campo nuevo, junto a la categoría). La **imagen para compartir** ya la arma la tienda (C-178); subir una propia en Configuración → SEO es opcional.
8. **Cargar catálogo:** con la búsqueda en la web (C-155) o con la carga masiva (Productos → Más → "Importar (.json)").

**Medición (antes de pagar un anuncio)**
9. **Google Search Console:** agregar `electroshopve.com`, enviar `https://electroshopve.com/sitemap.xml` y revisar "Páginas" una semana después.
10. **Google Analytics y píxel de Meta:** poner `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` en el `.env` del servidor y correr el deploy (`estado/C-145.md`). Hace falta el deploy: esas claves entran al compilar. **Desde rc.49 (C-223) sale solo el aviso de cookies:** Google va sin cookies y el píxel no carga hasta el sí del cliente. Para probarlo, en el teléfono: el aviso, "Solo las necesarias" y "Cookies" al pie.
11. Cuando vaya a pagar anuncios en Meta: el catálogo con `https://electroshopve.com/feed/productos.xml` (pasos en `HISTORIAL.md`, C-149).

**Datos y decisiones que tienen tareas paradas** (`PLAN.md` §7.1)
12. Entrega de un código y de una recarga: **respondió el 01/10** que tarda unas 2 horas y que la meta es 30 minutos. **Falta el horario** en que se atiende (para el plazo en la ficha, C-154b).
13. Medidas y precios reales de los sobres y cajas, el precio del "bulto aparte" y el monto del embalaje gratis.
14. Cuánto cobran ZOOM y MRW en Guanare por el seguro, y si aplica con cobro a destino (C-107).
15. El diagnóstico de clientes borrados (C-92). En el servidor, solo lee:
    `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/diagnostico-c92.sql > ~/diagnostico-c92.txt 2>&1`
    y pasarle a Claude el contenido de `~/diagnostico-c92.txt`.
16. ¿La cinta ES también en los productos que no son nuevos (al menos en "Caja abierta")? Hoy llevan su etiqueta y no la cinta (`estado/C-161.md`).
17. Avisar cuando SADES vuelva (taller).

**Con el abogado y el contador**
18. Abogado: términos y privacidad (ahora se editan en Legal → Documentos; `estado/C-120.md` §7). **La sección 6 de privacidad, "Cookies", tiene un texto nuevo listo** (`estado/C-223.md`): nombra todas las cookies, la medición propia y que Google y Meta van solo con permiso. Se publica con "Nueva versión" cuando el abogado lo apruebe y las 3 afirmaciones de `estado/C-144.md` (el motivo "comprobante vencido o ilegible", los plazos y los datos de contacto).
19. Contador: las preguntas de `estado/C-151.md` (IVA de los digitales), `estado/C-147b.md` (embalaje), `estado/C-120.md` §6 y **`estado/C-159.md` (retención del IVA: quiénes retienen, el comprobante y si hay retención de ISLR en los servicios)**.
20. ~~Mandarle a la contadora las preguntas.~~ Hecho: respondió el 16/11 por notas de voz, y con eso salió C-230.
21. **Mandarle la respuesta, por WhatsApp desde tu teléfono:** los dos mensajes del 16/11 en `~/Escritorio/Electro Shop/Contabilidad/` de tu PC (el que empieza con "whatsapp", al lado de sus audios).
    - El primero le cuenta lo que va a hacer, que es lo que preguntó; el segundo trae 5 preguntas que quedaron abiertas.
    - Mándale también `libro-de-ventas-ejemplo.xlsx`, de la misma carpeta (con facturas de ejemplo), para que diga si las columnas le sirven.
21b. **Pedir a la imprenta más facturas:** desde el 16/11 se factura cada venta. Contabilidad → Facturas dice hasta cuándo alcanza el talonario y cuántas pedir hasta el 19/04/2027 (la cuenta que se hizo con el equipo el 16/11 está en el chat). Solo lo necesario: lo que sobre ese día se anula.
21c. **Pasarle a Claude** el último recibo de la alcaldía (la alícuota y el mínimo, para C-240) y los datos del contrato del alquiler (quién es el arrendador, si factura con IVA, el canon y el día de pago, para C-238).
22. **Cargar el talonario, después del deploy** (en el panel, con la cuenta del dueño):
    1. Contabilidad → Facturas → "Cargar el talonario".
    2. Copia lo que trae impreso: la serie, la primera y la última factura, y **la próxima por usar, que es la primera en blanco** (confírmala en el papel ese día). Después el control (el número rojo de abajo), los datos de la empresa y el pie de la imprenta.
    3. En "Revisar y guardar", compara la réplica con el papel y toca "Guardar el talonario".
23. **Invitar a la contadora:** hecho, le llegó la invitación (lo dijo el 16/11). Falta que cree su clave y active los dos pasos; al entrar, la mesa le cuenta lo que hace y le pide su firma (C-230). Los pasos, por si hay que repetirlos (en el panel, con la cuenta del dueño):
    1. Administración → Equipo → "Invitar".
    2. Su nombre, su correo (el que te pasó el 14/11) y el rol **Contadora**. "Enviar invitación". Si dice que ese correo es de una clienta de la tienda, pídele otro.
    3. Avísale por WhatsApp que le llegó un correo de Electro Shop con un enlace de 24 horas. Ahí crea su contraseña; al entrar, el panel le pide los dos pasos (una app como Google Authenticator en su teléfono).
    4. Ya adentro, en su mesa, toca "Dibujar mi firma": su firma, su nombre como quiere que salga y su número de C.P.C.
    5. **Para cambiarla por otra persona más adelante:** Equipo → ella → "Administrar" → "Quitar el acceso", e invitar a la nueva.

**Limpieza de tu máquina:** hecha el 06/11 (C-185). Las ramas que se borraron, con su commit, quedaron en `.git/ramas-borradas-2026-11-06.txt` (solo en tu carpeta).

## 4. Fila de Claude
**Hecho el 15/11:** C-245 (el panel entero con el kit, rc.61), C-249 (los filtros en píldoras, rc.63), C-249b (la oferta o el cupón y las gift cards impresas por pasos, rc.64) C-249c (el método de pago y la categoría, rc.65) C-249d (la campaña y el promotor, rc.67), C-249e (el curso y Servicios, rc.68: los 8 formularios van por pasos) y C-251 (Mi panel: las fallas y lo nuevo, rc.69) y C-251b (Mi panel con el kit, rc.71); quedan sus tres decisiones (`estado/C-251.md`). También C-253 (el sorteo más atractivo, rc.72) y C-255 ("Cómo participar" con íconos y el camino de registro, rc.73) y C-258 (el estrés de los caminos del cliente y sus arreglos, rc.75), y C-254 (la semana del ganador del sorteo, rc.79). **Sigue de ahí:** lo que el equipo elija en sus dos decisiones (crear por pasos y los filtros de Órdenes), y los arreglos que quedaron en `PLAN.md` §5.2.

**Hecho el 14/11:** C-220 (el plan), C-221 (el sorteo por pasos, rc.45), C-222 ("Desde Aragua" y el filtro, rc.46) C-225 (los textos para buscadores, rc.48) C-223 (el aviso de cookies, rc.49) C-224 (los tres únicos, rc.51) y C-241 (el checkout por pasos, rc.53), C-242 (Facturas, ordenada, rc.56). También C-226 (sin ámbar, rc.44), C-219 (los correos, rc.47) y C-234 (cuándo sale cada pedido, rc.52), y C-227 (los correos al aliado comercial, rc.55).

**Sigue:** El plan del 14/11 está en producción desde ese día (rc.53). rc.56 está en producción desde el 15/11; falta confirmar sus pruebas (§2) y lo que queda de ámbar y de píldoras claras en el resto de la tienda (`PLAN.md` §5.2). Lo de abajo queda después.

**Hecho el 17/11:** C-278 (la lista de Clientes sin las cifras repetidas, rc.93, en producción) C-281 (los flujos que venden y el día del panel, rc.94) y C-280 (los arreglos medios de dinero y seguridad de la auditoría, rc.95). Las dos, en producción desde el 17/11. Y C-282 (la guía web y los arreglos sueltos, rc.96) y C-283 (lo más urgente de dinero de la auditoría, rc.97), en producción desde el 17/11.

**Hecho el 16/11:** C-276 (Clientes, rc.92) y, de su inventario, C-277 (rc.91), las dos en producción.

**Contabilidad (C-228 y C-228b, `CONTABILIDAD.md`):** hechas C-229 (rc.50, las facturas de talonario), C-235 (rc.54, la contadora en el equipo) y C-230 (rc.90, el libro de ventas con sus respuestas del 16/11). Sigue C-236, el calendario y los avisos (la alcaldía el 10, el IVA el 15). El resto en el orden de `PLAN.md` §5.2, todo antes del 19/04/2027.

**Hecho el 13/11:**
- C-205 (la Lista del proveedor por pasos y las reglas de ancho, rc.33);
- las fotos de Hydrogen y de otras tiendas, revisadas: 74 de 85 con foto;
- la carpeta de la ferretería reordenada, con `LEEME.txt`.

**Hecho el 12/11:**
- C-204 (la carga masiva completa, rc.30) y C-204b (sin falsos positivos y las hojas de una carpeta, rc.31);
- C-199 (el envío desde el proveedor y "Calcula tu envío", rc.32);
- los 70 de la ferretería sin pinturas, con lo que respondió la ferretería;
- las fotos que faltan, con un agente aparte;
- rc.29 comprobada en producción, y su bloque en `HISTORIAL.md`.

**Hecho el 10/11, mientras se espera:**
- C-201 (Mi panel, rc.26);
- C-202 (los nombres y las direcciones, rc.27);
- los nombres corregidos del archivo de los 60;
- las fotos del fabricante, ordenadas.

También del 10/11:
- C-200, el departamento Ferretería (rc.28);
- el pack de íconos v1.2;
- las maquetas que eligió Andrés ("Para ti" en la V1);
- el plan de ElectroStudio con sus maquetas de flyers;
- el mensaje para la ferretería, con 48 preguntas.

**Sigue:**
- **C-206:** la regla de anchos en las demás pantallas del panel y en la web (`PLAN.md` §1.5).
- Lo que responda la ferretería (`Preguntas para la ferreteria 13-11.txt`): los nombres, los modelos y las fotos del archivo de los 70. Para el HE00017, el R016087 y el R010077 ya hay foto si confirman el modelo (`4 - Trabajo de fotos/Registro/Sin foto todavia.csv`).
- Si el equipo hace la segunda vuelta de MercadoLibre: revisar lo que deje en "4 - Trabajo de fotos (no se sube)/Para revisar".
- `lib/nombres/marcas.ts`: Belt-G (su lista dice "BG"), Protektor y V-Teg.
- Después: "Para ti" (V1), las plantillas de ElectroStudio que elija Andrés y C-198.

**Lo del 10/11** (todo decidido, `PLAN.md` §7.2):
1. ~~C-199 · El envío desde La Victoria~~: hecha el 12/11 (rc.32), con "Calcula tu envío".
2. ~~C-200 · El departamento Ferretería~~: hecha (rc.28).
3. ~~Las fotos del fabricante~~: 50 de los 85 códigos de los 70; lo demás, con MercadoLibre y la ferretería.
4. **C-198 · Las variantes como familias.**
La lista completa, con lo que espera datos, está en `PLAN.md` §5.2. **El pedido del 16/10 está hecho** (C-176, C-177 y C-178). **Cotizaciones desde Numen:** C-181 hecha y en producción (rc.15). Sigue **C-182**: el documento y el PDF con el estilo del presupuesto. Luis eligió la maqueta A (la fiel), con la opción de imprimir en blanco y negro. **Sigue C-180** (fotos del feed para el catálogo de WhatsApp) cuando llegue la captura de Commerce Manager (§3, 1b). Quedan de ahí: SSH solo con llave (tus llaves, §3), Prisma 7, Next 16.4 y el aviso de npm 12 (`PLAN.md` §5.2). Lo que espera un dato tuyo:
- Esperan datos: C-154b (plazo de los digitales: ya se sabe que son unas 2 horas, falta el horario), C-107 (seguro), C-92 (clientes) y C-153b (decidir si los "frágiles" llevan más relleno).
- **Decisiones abiertas de promotores** (`PLAN.md` §7.1, A13 y A14): si los digitales pagan comisión, los % por defecto y los términos del programa para el abogado.
- **C-166b (después de una semana con C-166 limpia):** pasar la Content-Security-Policy a "bloquea" (`CSP_ENFORCE="true"` y un deploy) y, con una restauración probada, evaluar subir el volcado directo a Drive sin pasar por disco si la base crece.
- Lo que salga de la revisión final y de las pruebas del deploy se arregla antes que lo demás.
- Mientras tanto Claude puede revisar `REVISION_FINAL.md` contigo (en el teléfono, punto por punto) o escribir la próxima ronda de Gemini cuando haya una tarea mecánica.
- El plazo de la reseña (C-157) queda en 5 días (2 si es digital), en `lib/resenas-avisos.ts` (`DIAS_FISICO`, `DIAS_DIGITAL`), hasta que Andrés diga otra cosa.

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git fetch --all --tags` y `git status -sb` (Luis también sube desde su laptop: si `main` está detrás, `git merge --ff-only origin/main` y `npm ci` si cambió `package-lock.json`), `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Fíjate quién escribe (Andrés o Luis: `CLAUDE.md`). Pregunta:
>    - Si ya llegó **la captura de Commerce Manager** para C-180 y si se volvieron a subir las fotos del SSD y del teclado.
>    - Cómo salieron las pruebas de la sección 2 (rc.12 a rc.15), si se subió algo sin Claude y el redondeo de C-96.
>    - Si hay alguno de los datos de la sección 3 (también las llaves de SSH de Andrés).
>    - Producción se comprueba con `git describe --tags` por SSH (`OPERACION.md` §3).
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4): primero las fotos de MercadoLibre y las respuestas de la ferretería, si llegaron; después "Para ti" (V1), ElectroStudio o C-198, lo que elija Andrés. Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
