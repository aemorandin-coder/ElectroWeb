# Contabilidad: el plan del módulo (C-228)

> **Pedido del 14/11** (desde la PC de Andrés): un módulo "Contabilidad" en el panel con todo lo que mueve la web, organizado y detallado (movimientos y declaraciones de IVA). Investigar cómo trabaja el contador venezolano, las reglas nuevas del SENIAT y cómo ajustarse a 2027. Y una forma de llenar bien la **factura manual del talonario**, con el talonario de la empresa como modelo (la Factura Serie A n.º 0067).
> **Esto no es asesoría contable ni legal.** Es una lectura de las normas hecha el 14/11/2026. Cada punto dice qué tan firme es; lo marcado "confirmar" lo decide el contador.
> Lo de antes sigue valiendo: `estado/C-120.md` (facturación, IVA, IGTF y retenciones, 30/09), `C-146` (IVA a la vista), `C-147` y `C-147b` (datos para la factura, relación de ventas y embalaje), `C-151` (digitales sin IVA) y `C-159` (retención en las cotizaciones).
> **Repositorio público:** aquí no van montos de la empresa, datos de clientes ni los rangos de control del talonario. Esos datos se cargan en el panel.

## 1. Lo más importante
1. **El 19/04/2027 cambia la facturación** (Providencia SNAT/2026/00093, Gaceta 43.484 del 21/10/2026).
   - Desde ese día el talonario queda **solo para contingencias**.
   - Se factura con el **portal o la app del SENIAT**: gratis, y es lo que se eligió el 14/11.
   - Los talonarios que sobren ese día se anulan.
2. **Hoy la empresa factura solo con el talonario.** Es contribuyente ordinaria, y SADES imprime un recibo que no es una factura fiscal (respuestas del 14/11).
   - **La ley pide factura en cada venta, aunque el cliente no la pida** (Ley del IVA, art. 54).
   - Las ventas de la web sin factura son hoy el mayor riesgo: el Código Orgánico Tributario castiga no emitirla con multa y cierre del local (art. 101; los montos, con el contador).
3. **Contabilidad lleva el libro de ventas de toda la empresa,** porque la única factura fiscal que hoy existe es la del talonario.
   - Cada factura del talonario queda registrada: de la web, de la tienda o de una cotización.
   - También lleva el IVA de cada mes y lo que mueve la web: cobros, Puntos ES, gift cards y devoluciones.
   - Guía el llenado de cada factura con su número, su número de control y sus montos en bolívares.
4. **Lo primero que sirve:** la factura de talonario guiada desde una orden (C-229), y el libro de ventas con el IVA del mes (C-230), antes de declarar noviembre (hasta el 15/12).
5. **El contador decide lo que la norma no cierra:** las preguntas de la sección 9.
   - Una es urgente: la Factura 67 le cobró IVA a un juego digital, y la web no se lo cobra desde el 01/10 (C-151).

## 2. Cómo trabaja un contador en Venezuela (empresa ordinaria)
Lo que pide cada mes y cada año, y qué parte puede dar la web.

### Cada mes
1. **Junta los documentos del mes.** Las facturas emitidas (las del talonario, con sus anuladas), las notas de crédito y de débito, y las facturas de compra a nombre de la empresa (con su RIF) que dan crédito fiscal.
   - La web: el libro de ventas (C-230) y la lista de lo anulado.
2. **Arma el Libro de Ventas y el Libro de Compras** (Reglamento de la Ley del IVA, art. 70 y siguientes; confirmar).
   - Un renglón por documento, en orden cronológico. Los anulados también se listan.
   - Las notas citan la factura que afectan.
   - Las retenciones que le hicieron a la empresa van con su número de comprobante.
   - La web arma el de ventas. El de compras empieza como totales del mes (C-232).
3. **Calcula el IVA del mes:**
   `débito fiscal (IVA de las ventas) − crédito fiscal (IVA de las compras) − excedente del mes anterior − retenciones que le hicieron = IVA a pagar`
   - Si da negativo, el excedente pasa al mes siguiente.
   - La web: la hoja del IVA del mes (C-232), que no reemplaza la declaración.
4. **Declara y paga en el portal del SENIAT** (forma 99030). Un contribuyente ordinario lo hace cada mes, **hasta el día 15 del mes siguiente** (fuente secundaria: confirmar el día exacto).
   - Si ese día no es hábil, el plazo pasa al siguiente hábil (Código Orgánico Tributario, art. 10).
   - La web: recordar la fecha y anotar el número de planilla y el pago.
5. **Retenciones de ISLR:** cuando la empresa paga ciertos servicios (honorarios, fletes, alquileres, publicidad), retiene y declara (Decreto 1.808). Fuera del alcance de la web.
6. **Municipio:** el impuesto a las actividades económicas de Guanare, según su ordenanza. Fuera del alcance.
7. **Nómina y parafiscales:** IVSS, FAOV, INCES y la contribución de pensiones (9 %, Ley de Protección de las Pensiones de 2024). Fuera del alcance.

### Cada año
- Declaración de ISLR (hasta el 31/03 si el ejercicio cierra el 31/12) y sus anticipos, si corresponden.
- Estados financieros (VEN-NIF), con el inventario al cierre, y los libros Diario, Mayor e Inventarios (Código de Comercio). La asamblea los aprueba.
- La web: el total de ventas del año, por mes, sale del libro de ventas.

### Lo que ya no le toca a la empresa (es ordinaria)
- **IGTF (3 %):** solo lo cobran los contribuyentes especiales (Providencia SNAT/2022/000013). La empresa no lo cobra. Si le paga en divisas a un especial, ese sí se lo cobra a ella: es un gasto.
- **Retener IVA a sus proveedores:** solo los especiales (Providencia SNAT/2025/000054).
- **Calendario del SENIAT:** es para los especiales. El de 2027 todavía no salió (suele salir en diciembre).
- **Lo que sí le pasa:** cuando le vende a un especial, este le retiene el 75 % del IVA y le da un comprobante. Ese IVA retenido se descuenta en su declaración (C-159 ya lo muestra en las cotizaciones).

## 3. Las normas que mandan
| Norma | Qué dice | Hasta / desde | Firmeza |
|---|---|---|---|
| Ley del IVA | Alícuota general 16 %. Factura en cada venta (art. 54). La deuda nace con la factura, el pago o la entrega, lo primero que ocurra (art. 13). Lo pactado en divisas se pasa a bolívares al cambio del día del hecho imponible, o del día hábil anterior (art. 25). El embalaje es parte de la base (art. 23, C-147b) | Vigente | Alta |
| Providencia SNAT/2011/00071 | Las normas de facturación de hoy: talonarios (formatos), formas libres y máquinas fiscales. Pide la máquina fiscal a quien cumple sus tres condiciones (art. 8) | **Hasta el 18/04/2027** (la deroga la 00093) | Alta |
| Providencia SNAT/2024/000102 | La factura digital con imprentas digitales. Quien vende por la web y está obligado a máquina fiscal debe usarla en la web (art. 5) | **Hasta el 18/04/2027** (la deroga la 00093) | Alta |
| **Providencia SNAT/2026/00093** | Las normas nuevas de facturación (abajo) | **Desde el 19/04/2027** | Alta (texto leído en una copia de IVECOFI: confirmar contra la Gaceta) |
| Providencia SNAT/2026/00099 | Contribuyentes especiales: ingresos de 600.000 veces la tasa BCV de la moneda de mayor valor al año, o 50.000 al mes. Quien ya era especial lo sigue siendo hasta que el SENIAT se lo revoque (art. 16). La empresa es ordinaria | Desde el 01/11/2026 | Alta |
| Providencia SNAT/2026/00084 | Deroga la SNAT/2024/000121 (los proveedores de sistemas de facturación). Un programa como esta web no necesita un permiso del SENIAT para preparar datos | Desde el 12/08/2026 | Alta |
| Providencia SNAT/2025/000054 | Los especiales retienen el 75 % del IVA (o el 100 %) al pagarle a un ordinario y le dan un comprobante | Vigente | Alta |
| Providencia SNAT/2026/00080 | El RIF en los anuncios de medios masivos y digitales (`estado/C-120.md` §2.12) | Desde el 12/08/2026 | Alta |

### La Providencia 00093, por partes
- **Medios de emisión (art. 4 y 5):**
  - el portal web y la app del SENIAT, gratis y para todos;
  - una imprenta digital o un proveedor tecnológico autorizado;
  - la máquina fiscal.
  - **El contribuyente elige.** No hay una regla especial para las ventas por internet: desde el 19/04/2027 deja de valer el art. 5 de la 102.
- **El talonario, solo para contingencias (art. 6):**
  - Las causales: un corte de luz largo, sin internet, el medio dañado, un mantenimiento no programado del sistema del SENIAT, una máquina fiscal que no emite notas o guías, operaciones por cuenta de terceros, exportaciones, o más de una copia exigida por un órgano público.
  - **Todos tienen que guardar formatos de contingencia en el local** (parágrafo único).
- **Después de una contingencia (art. 7):** al día siguiente se registran en el medio principal las facturas hechas en papel, y se envían en PDF a la imprenta o "a la API del SENIAT". El procedimiento para el portal no está publicado: el SENIAT dará lineamientos (disposición final sexta).
- **Qué lleva cada factura (art. 8):**
  1. La palabra "Factura".
  2. Número consecutivo y único.
  3. Número de control (en los medios digitales).
  4. Nombre, domicilio fiscal y RIF del emisor.
  5. **Fecha DDMMAAAA y hora HH.MM.SS, con a. m. o p. m.** El talonario de hoy no tiene casilla para la hora.
  6. Nombre y RIF del comprador. Una persona que no necesita la factura para sus impuestos puede dar solo su cédula o pasaporte.
  7. Descripción, cantidad y monto. Lo exento, exonerado o no gravado lleva "(E)".
  8. Cargos, descuentos y ajustes.
  9. Base imponible por alícuota, con su porcentaje, y el total exento.
  10. IVA por alícuota.
  11. Total.
  12. **Si se pactó en divisas: las dos cantidades y el tipo de cambio.**
  - Además, la leyenda de que se emite conforme a la providencia (art. 19), y sin tachaduras ni enmiendas (art. 25).
- **Notas de crédito y de débito (art. 12 y 13):** por el mismo medio que la factura. Citan la fecha, el número, el número de control y el monto de la factura original.
- **Lo que sobra del talonario (disposición transitoria primera):** se usa hasta agotarlo o hasta el 18/04/2027. Lo que quede se anula y se desincorpora; solo se guardan los formatos de contingencia (art. 11).
  - **Destruir lo que sobra pide permiso** de la Gerencia Regional de Tributos Internos, dentro de los **15 días continuos** después del cambio de medio (art. 24).
- **Avisar el cambio de medio** a la Gerencia Regional o al Sector de Tributos Internos del domicilio fiscal (transitoria segunda, sin plazo escrito).
- **Libros de compras y de ventas:** la 00093 no los cambia. Siguen como dice el Reglamento de la Ley del IVA.
- **El IGTF no aparece** en la 00093.

## 4. Dónde está la empresa hoy
- **Contribuyente ordinaria** (14/11): IVA mensual, sin IGTF ni retenciones propias.
- **SADES no imprime factura fiscal** (14/11): el comprobante que va en el paquete es un recibo. La factura sale del talonario, casi siempre cuando la pide una empresa (respuesta de Andrés del 30/09).
- **No usa máquina fiscal.** Si la empresa cumple las tres condiciones del art. 8 de la 0071 (ingresos de más de 1.500 U. T., más ventas a consumidores, actividad de la lista), hoy debería tenerla. Desde el 19/04/2027 eso deja de importar: la máquina pasa a ser una opción. **Confirmar con el contador.**
- **El talonario de hoy (Factura Serie A, de una imprenta de Guanare):**
  - 100 facturas, cada una con su número de control preimpreso. El de la n.º 0067 se usó el 12/03/2026.
  - Los datos de la imprenta, la autorización y los rangos se cargan en el panel (C-229), no en el repositorio.
  - Trae casillas para la fecha (día, mes y año), el número, el cliente (nombre o razón social, domicilio fiscal, RIF, cédula o pasaporte, teléfono), la condición (crédito o contado) y los renglones (cantidad, descripción, "(E)", precio unitario y monto).
  - Abajo lleva las adiciones, los descuentos, la base imponible, lo exento, el IVA con su porcentaje y el monto total.
  - **No tiene casilla para la hora ni para un monto en divisas.**
- **Lo que se ve en la Factura 67:**
  - Los precios unitarios se escribieron sin IVA; la base, el IVA del 16 % y el total cuadran.
  - Los renglones vacíos se tacharon con una raya, como se debe.
  - **Un juego digital lleva IVA,** y la web los vende sin IVA desde el 01/10 (C-151). Uno de los dos criterios está mal: lo decide el contador (pregunta 1).
- **Lo que la web ya tiene:**
  - El IVA dentro de cada orden (C-146).
  - A nombre de quién va la factura y "Copiar datos para facturar" (C-147).
  - El número de factura anotado a mano en la orden y la relación de ventas del mes, en dólares (C-147).
  - El embalaje como renglón con IVA (C-147b), los digitales sin IVA (C-151) y la retención del 75 % en las cotizaciones (C-159).
- **Lo que falta:**
  - Montos en bolívares por documento.
  - El número de control.
  - Las facturas anuladas.
  - El libro de ventas.
  - El IVA del mes.
  - Las facturas que no son de la web.

## 5. El módulo
**Qué es:** el lugar donde queda cada factura de la empresa y el dinero que mueve la web, mes por mes, como lo pide el contador.
**Qué no es:**
- No emite documentos fiscales: el documento es el papel del talonario y, desde 2027, el del portal del SENIAT.
- No declara: la declaración se presenta en el portal.
- No reemplaza al contador.
- Se mantiene la decisión del 30/09 (§7.2): la web prepara y registra, y no se integra una imprenta digital.

### Quién entra (decidido el 14/11)
- **Los administradores facturan:** llenan, emiten y anulan facturas de talonario, con su motivo en la bitácora.
- **El dueño (super admin) ve todo:** el resumen, el libro de ventas, el IVA del mes, los movimientos y los márgenes.
- Dos permisos nuevos: `FACTURAR` (administradores y dueño) y `VER_CONTABILIDAD` (solo el dueño, como `MANAGE_SETTINGS`).

### Las pantallas (una sección nueva del menú, "Contabilidad")
| Pantalla | Quién | Qué tiene |
|---|---|---|
| **Resumen del mes** | Dueño | Lo cobrado por la web; lo facturado y lo que falta facturar; el IVA del mes y su fecha; el talonario (cuántas quedan); la cuenta regresiva al 19/04/2027 con su lista de pasos |
| **Facturas** | Administradores | La lista de facturas emitidas y anuladas; "Nueva factura de talonario" (sección 6); los talonarios con su rango y lo que queda |
| **Libro de ventas** | Dueño | El mes en bolívares, con las columnas del contador; descarga para Excel y versión para imprimir |
| **IVA del mes** | Dueño | La hoja del cálculo, la fecha límite, "Declarada" (n.º de planilla) y "Pagada"; el paquete del mes para el contador |
| **Movimientos** | Dueño | Lo que cobró la web por cada forma de pago; los Puntos ES (recargas, consumos y lo que se debe a los clientes); gift cards; devoluciones; comisiones; costo y margen |

### Los datos (tablas nuevas, aditivas)
- **`talonarios`:**
  - Tipo de documento, serie y rango de números.
  - Serie y rango del control.
  - La imprenta (nombre, RIF, autorización y fecha de elaboración).
  - Uso (normal o contingencia) y estado (en uso, agotado o anulado).
- **`documentos_fiscales`:** una fila por factura o nota.
  - Tipo, medio (talonario; desde 2027, portal), serie, número, número de control y fecha con hora.
  - Estado y motivo, si se anuló.
  - El comprador, copiado: tipo, nombre, RIF o cédula, domicilio y teléfono. También la condición de pago.
  - Los renglones (cantidad, descripción, si es exento, precio unitario y monto en Bs).
  - En bolívares: adiciones, descuentos, base y alícuota, IVA, exento y total.
  - El total en divisas y la tasa, si se pactó en divisas.
  - La retención que hizo un especial (monto, comprobante y fecha).
  - La factura que afecta (en las notas).
  - Si se hizo en contingencia, con su causal y cuándo se registró en el portal.
  - Quién la hizo.
- **`orders.documentoFiscalId`:** la orden queda unida a su factura. Una factura puede cubrir las dos órdenes de una compra (la física y la digital).
  - `invoiceNumber` e `invoicedAt` siguen (C-147): se llenan solos al emitir. Los números anotados a mano antes se respetan.
- **`periodos_iva` (C-232):** un mes, con el crédito fiscal de las compras, el excedente anterior, lo retenido, lo que da, la planilla y el pago.
- Todo aditivo (autorizado el 29/09). Nada se borra: una factura se **anula** con motivo, y su papel original se guarda (art. 21 de la 00093).

### Las reglas de los montos
- **Todo en bolívares,** que es la moneda de los libros y de la declaración. Los dólares, como dato.
- **La tasa:** la de la orden, que es la que pagó el cliente.
  - Si la factura se hace otro día, la pantalla avisa y deja poner la tasa BCV de ese día.
  - Si se cambia de mes, la pantalla avisa más fuerte: el IVA de una venta va en el mes en que se cobró (art. 13).
- **El precio publicado lleva el IVA adentro** (§7.2).
  - La base de cada renglón es su monto en Bs ÷ 1,16, redondeada a céntimos.
  - El IVA es el 16 % de la suma de las bases; el total, base + IVA.
  - Si queda un céntimo de diferencia con lo que pagó el cliente, la pantalla lo dice.
- **Exentos:** un digital sin IVA (con el interruptor de C-151 apagado) va con "(E)" y suma en "Total exento o exonerado".
- **Embalaje o delivery:** un renglón más, con IVA (C-147b). **Descuentos:** en su casilla, sin IVA.
- **Pagado con Puntos ES:** no cambia la factura. Es la forma de pago.
- **Anuladas:** salen en el libro y no suman. **Notas de crédito:** restan en el mes en que se emiten.

## 6. La factura de talonario, paso a paso (C-229)
"Nueva factura de talonario" usa los pasos del panel (`components/admin/Pasos`, con las reglas de flujos de C-220):
1. **De dónde sale:**
   - una orden de la web (la busca por número o por cliente);
   - una cotización aprobada;
   - o una venta sin orden (en la tienda).
2. **El cliente:**
   - de la orden (los datos de C-147) o de la cuenta;
   - o se escribe: nombre o razón social, RIF o cédula, domicilio fiscal y teléfono;
   - y la condición de pago (contado o crédito).
3. **Los renglones:**
   - los de la orden, con el embalaje;
   - se pueden editar cantidad, descripción, "(E)" y precio;
   - un serial se agrega a la descripción, como en la Factura 67.
4. **Revisar:** la **réplica del talonario lleno**, casilla por casilla. Lleva:
   - el número que toca y su número de control;
   - la fecha en DÍA, MES y AÑO;
   - el precio sin IVA de cada renglón;
   - la base, el IVA y el total.
   - **Debajo, cómo llenarla:**
     - Escribir igual, sin tachaduras ni enmiendas.
     - Tachar con una raya los renglones vacíos.
     - El original es para el cliente y la copia se queda.
     - Si sale mal, no se corrige: se anula y se usa la siguiente.
   - **Si se pactó en divisas,** un renglón de texto con el monto en dólares y la tasa: el talonario no tiene casilla (pregunta 4 al contador).
5. **Emitir:** queda registrada con su número y su control.
   - Ese número no se vuelve a ofrecer.
   - La orden se marca facturada y el cliente ve el número en su pedido (C-147).
   - **"Anular"** pide el motivo y que se guarde el papel. La factura sigue en el libro como anulada.

Además:
- **Cargar el talonario** (el dueño): la serie, los rangos, la imprenta y "la próxima por usar es la 00xx". Las anteriores quedan como "emitidas antes del sistema".
- **"Imprimir borrador"**, en una hoja aparte, para copiar a mano. No se imprime sobre el talonario: se llena a mano.
- **El Resumen avisa** las órdenes cobradas sin factura y cuántas quedan en el talonario, y en abril de 2027, que hay que anular las que sobren.

## 7. Cómo ajustarse a 2027 (el calendario)
| Cuándo | Qué | Quién |
|---|---|---|
| Ya | Decidir con el contador si toda venta de la web se factura en el talonario desde ya (sección 4). Si sí, pedir otro talonario a la imprenta, **solo lo necesario hasta abril** | Andrés y el contador |
| Noviembre | C-229 y C-230: facturas de talonario guiadas y el libro de ventas | Claude |
| Hasta el 15/12 | Declarar noviembre con el libro y el IVA del módulo, comparados con lo del contador | El contador |
| Diciembre | C-231 y C-232: movimientos, IVA del mes y paquete para el contador. Mirar el calendario de 2027 del SENIAT (para especiales: confirmar que sigue sin aplicar) | Claude y el contador |
| Enero a marzo de 2027 | Entrar al portal o a la app del SENIAT y probar la facturación cuando esté operativa (al 27/10 no estaba confirmada). Leer los lineamientos que publique el SENIAT (disposición final sexta) | Andrés y el contador |
| Antes del 19/04/2027 | Pedir a la imprenta los **formatos de contingencia** (art. 6, 11 y 27), con la casilla de la hora y la leyenda de la 00093 (pregunta 6). C-233: el modo contingencia y el registro en el portal | Andrés y Claude |
| 19/04/2027 | Empezar con el portal. **Anular las facturas que sobren del talonario** (transitoria primera). **Avisar el cambio de medio** a la Gerencia Regional (transitoria segunda) | Andrés y el contador |
| Hasta el 04/05/2027 | Pedir la autorización para destruir lo que sobró (art. 24: 15 días continuos) | Andrés y el contador |
| Después | Cada factura con fecha y hora; la web prepara los datos para el portal y registra el número que da el portal. Si el SENIAT abre una API, conectarla es otra decisión de Andrés | Todos |

## 8. Las tareas
En orden. Cada una sirve sola, sale de `main` actualizado y lleva su estado, su versión y su entrada de módulo nuevo en `lib/modulos.ts` ("Contabilidad").
- **C-229 · Las facturas de talonario.**
  - La sección Contabilidad en el menú, con los dos permisos.
  - Las tablas `talonarios` y `documentos_fiscales`, y la columna `orders.documentoFiscalId`.
  - Cargar el talonario y la nueva factura con la réplica (sección 6).
  - Anular, la lista de facturas y la orden facturada sola.
  - **Primero, las maquetas** (sección 10) y que el equipo elija.
- **C-230 · El libro de ventas y el resumen del mes.**
  - El libro en bolívares, con anuladas y notas.
  - La descarga para Excel con las columnas que pida el contador, y la versión para imprimir.
  - El Resumen: cobrado, facturado, sin factura (con "Facturar") y el IVA del mes con su fecha.
  - La relación de ventas de C-147 sigue en Reportes y enlaza al libro.
- **C-231 · Los movimientos de la web.**
  - Los cobros por forma de pago, en $ y Bs.
  - Los Puntos ES: recargas, consumos, devoluciones, comisiones de promotores y el total que se les debe a los clientes al cierre.
  - Las gift cards, las devoluciones y la comisión del Pago Móvil.
  - Costo y margen, solo para el dueño (el costo nunca sale del servidor).
- **C-232 · El IVA del mes y el paquete para el contador.**
  - La hoja del IVA: débito automático; crédito, excedente y retenciones.
  - La fecha límite, con aviso en el panel y por Telegram 3 días antes.
  - "Declarada" y "Pagada", y el mes cerrado: después solo se corrige con notas.
  - Una descarga con el libro, los movimientos, el IVA y las anuladas.
  - Las compras, primero como totales; un libro de compras completo, si el contador lo pide.
- **C-233 · Listos para el 19/04/2027.**
  - El talonario pasa a contingencia, con su causal y el aviso de registrarlo en el portal al día siguiente.
  - Fecha y hora en cada documento.
  - "Preparar para el portal", en el orden de sus casillas, y anotar el número que da el portal.
  - La lista del calendario de la sección 7, con quién la marcó y cuándo.
  - Los avisos de anular lo que sobre y de los 15 días.
- **Fuera del plan, a pedido:** las notas de crédito por garantía o cancelación, con su réplica (cuando haga falta la primera), y la retención de ISLR de lo que paga la empresa.

**Cómo se prueba:** como el dinero (`CLAUDE.md`).
- El caso normal y el manipulado: un administrador que intenta ver el libro, montos o números enviados desde el navegador, una factura emitida dos veces a la vez, un número fuera del rango del talonario, y anular sin motivo.
- Los montos se cuadran contra la Factura 67, rehecha en la pantalla con sus mismos renglones (sin guardarla).

## 9. Decisiones y preguntas
### Tomadas el 14/11 (en el chat, desde la PC de Andrés)
1. La empresa es **contribuyente ordinaria**.
2. **SADES no imprime factura fiscal:** las facturas salen del talonario.
3. **Quién entra:** los administradores facturan; los libros, el IVA y los márgenes son del dueño.
4. **Desde el 19/04/2027 se factura con el portal o la app del SENIAT.**

### Abiertas (para Andrés)
- **A16.** ¿Se factura en el talonario **cada venta de la web** desde ya, o solo la que pide factura, hasta el portal? La ley pide factura siempre. Recomendado: decidirlo con el contador esta semana.
- **A17.** ¿Quién es el contador y cómo recibe el mes? Puede ser un archivo para Excel, uno para imprimir, o un acceso propio de solo lectura al panel (sería un rol nuevo, §7.2).
- **A18.** Elegir la maqueta de la factura de talonario (sección 10).

### Para el contador
1. **Los digitales:** la Factura 67 le cobró IVA a un juego digital, y la web no se lo cobra desde el 01/10 (lectura del art. 16, numeral 2, en `estado/C-151.md`). ¿Cuál vale? ¿Y las recargas directas?
2. **Cada venta con factura:** con el talonario como único medio hasta abril, ¿se factura cada venta de la web? ¿Qué hacer con lo vendido sin factura en los meses anteriores?
3. **La máquina fiscal:** ¿la empresa cumplía el art. 8 de la 0071 y debía tenerla? Desde el 19/04/2027 es opcional.
4. **Divisas en el talonario:** los precios de la web están en dólares. ¿La factura debe llevar el monto en dólares y la tasa (0071, art. 13, num. 14; 00093, art. 8, num. 12)? ¿Va en un renglón de texto?
5. **La tasa y la fecha:** ¿la de la orden (el día del pago) o la del día en que se escribe la factura? ¿Qué pasa si se factura en otro mes?
6. **Contingencia:** ¿lo que quede de la Serie A puede quedarse como formato de contingencia, o hay que anularlo y pedir formatos nuevos (con la hora y la leyenda de la 00093)?
7. **El libro de ventas:** ¿qué columnas quiere y en qué formato? ¿Se resumen por día las ventas a consumidores, o una por factura?
8. **Puntos ES y gift cards de la tienda:** ¿el IVA nace al recargar o al comprar con ellos? (`estado/C-120.md` §2.8; sigue abierta).
9. **El libro de compras:** ¿lo lleva el contador aparte, o conviene registrar las compras en la web (la ferretería factura con IVA, `estado/C-196b.md`)?
10. **Cuánto se guardan** los libros y las facturas, y lo anulado (art. 21 de la 00093: mientras no prescriba).

## 10. Las maquetas (antes de programar)
Hechas el 14/11, con clientes inventados y una tasa de ejemplo (Bs 905,00).
- **Dónde están:** en la PC de Andrés, en `~/Escritorio/Electro Shop/Contabilidad - maquetas (C-228)/`, con sus capturas a 1440 y a 360 px.
  - No van al repositorio: la réplica lleva los datos de la imprenta y los números de control.
- **`1-resumen.html`:** el Resumen del mes.
  - Arriba, cuatro cifras: lo cobrado, lo facturado, el IVA y la fecha para declarar.
  - Debajo: las órdenes cobradas sin factura, con "Facturar"; lo cobrado por forma de pago; el talonario (cuántas quedan); y la lista hacia el 19/04/2027.
- **`2a-factura.html` (variante A):** la factura se va llenando al lado de los pasos mientras se avanza.
- **`2b-factura.html` (variante B, la recomendada):** tres pasos cortos, sin vista previa, y al final "Revisar y emitir".
  - En la computadora: el resumen de cada paso con "Cambiar" y la réplica grande, con cada casilla numerada y "Cómo llenarla" con los mismos números.
  - En el teléfono, la réplica no se lee a 360 px: va **casilla por casilla** (qué escribir en cada una) y "Ver la factura completa".
  - Es la que sigue la regla de `PLAN.md` §1.9 ("Revisar y publicar" con la vista previa al final).
  - El botón principal es **"Ya la escribí: registrar la 0077"**: la web registra lo que se escribió en el papel.
- **`3-libro.html`:** el libro de ventas del mes, con una anulada, una exenta y una con retención, y sus totales.

Falta que el equipo elija A o B (A18) antes de programar C-229.

## 11. Lo que no verifiqué
- **El texto de la 00093 contra la Gaceta 43.484:** lo leí en la copia de IVECOFI (completa, con sus disposiciones). Los resúmenes de la prensa no siempre coinciden con ella.
- **El día exacto de la declaración** de un ordinario (fuentes secundarias dicen el 15) y los artículos del Reglamento del IVA sobre los libros.
- **Los montos de las sanciones** del Código Orgánico Tributario.
- **Si el portal y la app del SENIAT ya facturan,** y si tendrán una API para conectar un sistema propio.
- **Si la empresa debía tener máquina fiscal** (pregunta 3).
- **La tasa BCV de hoy** (las maquetas usan una de ejemplo).

## 12. Fuentes
**Providencia SNAT/2026/00093 (facturación desde el 19/04/2027)**
- Texto (copia de IVECOFI): https://tributos.ivecofi.net/informacion/legislacion/providencias/pa-2026-93
- Gerencia y Tributos, análisis: https://gerenciaytributos.blogspot.com/2026/10/nueva-norma-de-facturacion-seniat-00093-2026.html
- Gálac, resumen por artículos: https://galac.com/galac-blog/facturacion-en-venezuela-2026-la-maquina-fiscal-deja-de-ser-obligatoria-nueva-providencia-snat-2026-00093-ve
- The Factory HKA (imprenta digital, con interés comercial): https://imprenta.thefactoryhka.com.ve/facturacion-digital/providencia-snat-2026-00093-cambios-en-la-facturacion-en-venezuela/
- 2001 Online: https://2001online.com/nacionales/seniat-fija-nuevas-normas-de-facturacion-digital-para-comercios-plazos-y-como-funcionan-202610251500
- Fedecámaras Radio, el plazo de 180 días: https://fedecamarasradio.com/economia/economia-y-negocios/contribuyentes-tendran-plazo-de-180-dias-para-adaptarse-a-la-facturacion-digital/

**Contribuyentes especiales (00099) y sistemas de facturación (00084)**
- Texto de la 00099 (Cachicamo): https://docs.cachicamo.app/fiscal/providencia00099-sujetos-pasivos-especiales-2026
- Texto de la 00099 (IVECOFI): https://tributos.ivecofi.net/informacion/legislacion/providencias/pa-2026-99
- Descifrado (sus cifras no coinciden con el texto): https://www.descifrado.com/2026/10/23/seniat-establece-en-gaceta-oficial-nuevos-criterios-para-sujetos-pasivos-especiales/
- Texto de la 00084 (Cachicamo): https://docs.cachicamo.app/fiscal/providencia00084
- Finanzas Digital, la derogación: https://finanzasdigital.com/seniat-deroga-norma-sobre-proveedores-de-sistemas-fiscales/

**IVA, IGTF y declaración**
- Guía de terceros sobre la declaración de IVA (el día 15 para ordinarios): https://ivacalculator.com/venezuela/declaracion-iva-seniat/
- IGTF en 2026 (3 %, solo especiales): https://www.nompli.com/blog/igtf-venezuela-como-calcular-3-porciento-2026
- Las de `estado/C-120.md` §9 (Ley del IVA, Providencias 0071, 102 y 054, IGTF y RIF), `estado/C-147b.md` y `estado/C-151.md`.
