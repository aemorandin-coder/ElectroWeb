# Contabilidad: el plan del módulo (C-228)

> **Pedido del 14/11** (desde la PC de Andrés): un módulo "Contabilidad" en el panel con todo lo que mueve la web, organizado y detallado (movimientos y declaraciones de IVA). Investigar cómo trabaja el contador venezolano, las reglas nuevas del SENIAT y cómo ajustarse a 2027. Y una forma de llenar bien la **factura manual del talonario**, con el talonario de la empresa como modelo (la Factura Serie A n.º 0067).
> **Esto no es asesoría contable ni legal.** Es una lectura de las normas hecha el 14/11/2026. Cada punto dice qué tan firme es; lo marcado "confirmar" lo decide el contador.
> Lo de antes sigue valiendo: `estado/C-120.md` (facturación, IVA, IGTF y retenciones, 30/09), `C-146` (IVA a la vista), `C-147` y `C-147b` (datos para la factura, relación de ventas y embalaje), `C-151` (digitales sin IVA) y `C-159` (retención en las cotizaciones).
> **Repositorio público:** aquí no van montos de la empresa, datos de clientes ni los rangos de control del talonario. Esos datos se cargan en el panel.
> **Ampliado el 14/11 en la noche (C-228b):** la contadora entra al equipo con su firma; se suman gastos y compras, el alquiler del local, la nómina con pensiones, la Alcaldía de Guanare y el calendario de pagos con avisos (§13).
> **16/11 (C-230):** la contadora respondió por notas de voz. Sus criterios están en §9; lo que dijo de cada obligación, en §13.2. Lo privado de sus respuestas queda en la PC del equipo, fuera del repositorio.

## 1. Lo más importante
1. **El 19/04/2027 cambia la facturación** (Providencia SNAT/2026/00093, Gaceta 43.484 del 21/10/2026).
   - Desde ese día el talonario queda **solo para contingencias**.
   - Se factura con el **portal o la app del SENIAT**: gratis, y es lo que se eligió el 14/11.
   - Los talonarios que sobren ese día se anulan.
2. **Hoy la empresa factura solo con el talonario.** Es contribuyente ordinaria, y SADES imprime un recibo que no es una factura fiscal (respuestas del 14/11).
   - **La ley pide factura en cada venta, aunque el cliente no la pida** (Ley del IVA, art. 54).
   - Las ventas sin factura eran el mayor riesgo: el Código Orgánico Tributario castiga no emitirla con multa y cierre del local (art. 101; los montos, con el contador).
   - **Desde el 16/11 se factura cada venta** (la contadora; cerró A16).
3. **Contabilidad lleva el libro de ventas de toda la empresa,** porque la única factura fiscal que hoy existe es la del talonario.
   - Cada factura del talonario queda registrada: de la web, de la tienda o de una cotización.
   - También lleva el IVA de cada mes y lo que mueve la web: cobros, Puntos ES, gift cards y devoluciones.
   - Guía el llenado de cada factura con su número, su número de control y sus montos en bolívares.
4. **Lo primero que sirve:** la factura de talonario guiada desde una orden (C-229, hecha), y el libro de ventas con el IVA del mes (C-230, hecho el 16/11), antes de declarar noviembre (hasta el 15/12).
5. **El contador decide lo que la norma no cierra:** las preguntas de la sección 9. La contadora respondió el 16/11; quedaron abiertas cinco.
   - Sigue abierta la de los digitales: la Factura 67 le cobró IVA a un juego digital, y la web no se lo cobra desde el 01/10 (C-151).
6. **La contadora trabaja dentro del panel** (14/11 en la noche, §13).
   - Entra invitada al equipo y descarga en Excel.
   - Calcula, declara y firma cada cierre con su sello.
   - Ve en "Mi mesa" lo que vence: IVA, pensiones, retenciones, IVSS, FAOV, INCES, alquiler y alcaldía.
   - El dueño paga y la puede cambiar cuando quiera.

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
- **La contadora revisa, declara y firma** (14/11 en la noche, §13.1).
  - Entra invitada al equipo, con el rol nuevo "Contadora".
  - Ve todo Contabilidad y lo descarga en Excel.
  - Carga gastos y compras, marca lo declarado con su planilla y firma el cierre del mes.
  - No factura, ni toca órdenes, la tienda o la configuración.
- **El dueño (super admin) ve todo:** el resumen, los libros, el IVA, los movimientos y los márgenes. Aprueba y paga, e invita, quita o cambia a la contadora.
- **Tres permisos nuevos:**
  - `FACTURAR`: los administradores y el dueño.
  - `VER_CONTABILIDAD` y `DECLARAR`: la contadora y el dueño.
  - Los márgenes y el costo, solo el dueño, como hasta hoy.

### Las pantallas (una sección nueva del menú, "Contabilidad")
| Pantalla | Quién | Qué tiene |
|---|---|---|
| **Resumen del mes** | Dueño | Lo cobrado por la web; lo facturado y lo que falta facturar; el IVA del mes y su fecha; el talonario (cuántas quedan); la cuenta regresiva al 19/04/2027 con su lista de pasos |
| **Facturas** | Administradores | La lista de facturas emitidas y anuladas; "Nueva factura de talonario" (sección 6); los talonarios con su rango y lo que queda |
| **Libro de ventas** | Dueño | El mes en bolívares, con las columnas del contador; descarga para Excel y versión para imprimir |
| **IVA del mes** | Dueño | La hoja del cálculo, la fecha límite, "Declarada" (n.º de planilla) y "Pagada"; el paquete del mes para el contador |
| **Movimientos** | Dueño | Lo que cobró la web por cada forma de pago; los Puntos ES (recargas, consumos y lo que se debe a los clientes); gift cards; devoluciones; comisiones; costo y margen |
| **Mi mesa** (§13.1) | Contadora | Su inicio: el cierre del mes por pasos, lo que vence en 30 días, su firma y sello, las descargas en Excel y las notas con el dueño |
| **Calendario y pagos** (§13.2) | Contadora y dueño | Cada obligación con su vencimiento, su monto, su planilla y su comprobante; "Te toca" a quien le toca |
| **Compras y gastos** (§13.3) | Contadora y dueño | Cada factura de compra con su foto y sus datos: el libro de compras y el crédito fiscal |
| **Nómina y aportes** (§13.5) | Contadora y dueño | Los totales del mes y lo que sale de ellos: pensiones, IVSS, FAOV e INCES |
| **Alquiler del local** (§13.4) | Contadora y dueño | El contrato, el canon de cada mes y su retención de ISLR |
| **Alcaldía** (§13.6) | Contadora y dueño | Actividades económicas, la licencia, la publicidad y el aseo |

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
- **La tasa:** la del BCV del día en que se escribe la factura (la contadora, 16/11; C-230). Hasta C-230 era la de la orden.
  - Si la fecha es hoy, viene la de Configuración (la automática del BCV); si es otro día, se escribe la de ese día.
  - Una tasa a más del triple o a menos de un tercio de la de hoy es una coma corrida: el servidor la rechaza.
  - La de la orden queda a la vista. Si la factura se escribe el mismo día del cobro, las dos coinciden.
  - Si se cambia de mes, la pantalla avisa: la factura va en el libro del mes de su fecha. Si no es así, lo dice la contadora.
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

**Desde el 14/11 en la noche (C-228b), el orden es:**
1. C-229, las facturas de talonario (la maqueta B). Hecha, rc.50.
2. C-235, la contadora en el equipo (§13.1). Hecha, rc.54.
3. C-230, el libro de ventas, con las respuestas de la contadora. Hecho, rc.90 (16/11). El resumen del mes quedó en la mesa y en el libro.
4. C-236, el calendario y los avisos (§13.2), con sus fechas: la alcaldía el 10 y el IVA el 15.
5. C-237, gastos y compras (§13.3), con las mismas columnas que el libro de ventas.
6. C-232, el IVA del mes y el cierre firmado (§13.7).
7. C-240, la alcaldía (§13.6): sube, porque vence el 10, antes que el IVA. Con la alícuota y el mínimo del último recibo.
8. C-239, nómina y aportes (§13.5), cuando ella confirme la base mínima de las pensiones.
9. C-238, el alquiler (§13.4), con los datos del contrato.
10. C-231, los movimientos de la web.
11. C-233, el 19/04/2027.

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
- ~~**A16.**~~ Cerrada el 16/11: se factura cada venta desde ya (la contadora, y el equipo lo aprobó con el plan de C-230).
- ~~**A17.**~~ Cerrada el 14/11 en la noche: la contadora recibe el mes en Excel y trabaja en el panel, invitada al equipo (§13.1).
- ~~**A18.**~~ Cerrada el 14/11 en la noche: la variante B, alineada (§10).

### Para la contadora (las 17 preguntas del WhatsApp)
Escritas el 14/11 para mandárselas por WhatsApp, en tres mensajes. El texto está en la PC de Andrés: `~/Escritorio/Electro Shop/Contabilidad/preguntas-contadora-14-11.txt`. Para la invitación también se le piden el correo, el nombre como quiere que salga en la firma y el número de C.P.C.
1. **(Urgente) Factura en cada venta:** ¿se factura cada venta de la web desde ya (A16)? ¿Y lo vendido sin factura en los meses anteriores?
2. **(Urgente) Los digitales:** la Factura 67 cobró IVA a un juego digital, y la web no (art. 16, numeral 2). ¿Cuál vale? ¿Y las recargas directas?
3. **Dólares en el talonario:** ¿el monto en dólares y la tasa, en un renglón?
4. **Tasa y fecha:** ¿la del pago o la de la factura? ¿Y si se factura en otro mes?
5. **Libro de ventas:** columnas, orden y una línea por factura.
6. **Libro de compras:** la foto y los datos de cada factura, ¿alcanzan?
7. **Declaración del IVA:** el día exacto. Ella la calcula y presenta; el dueño paga.
8. **Puntos ES y gift cards de la tienda:** ¿el IVA va al recargar o al comprar?
9. **La máquina fiscal:** ¿la empresa estaba obligada a tenerla?
10. **Abril de 2027:** ¿lo que quede del talonario sirve de formato de contingencia, o hay que anularlo y pedir formatos nuevos?
11. **Pensiones:** la base, el mínimo por trabajador y el día que toca según el RIF.
12. **IVSS, FAOV e INCES:** porcentajes y fechas.
13. **El alquiler del local:** quién es el arrendador, si factura con IVA, y la retención de ISLR (3 % o 5 %) y su fecha.
14. **Otras retenciones de ISLR:** fletes, publicidad y honorarios, también los de ella.
15. **Alcaldía de Guanare:** si la declaración es mensual, la alícuota, la licencia, la publicidad y el aseo, y si se paga en línea.
16. **Cuánto se guarda** lo emitido, los libros y lo anulado.
17. **El Excel:** un archivo por libro, o uno solo con pestañas.

### Lo que respondió (16/11, por notas de voz)
El equipo transcribió sus cuatro notas. Esto es lo que vale para el módulo; lo privado queda en la PC del equipo.
- **1. Factura en cada venta:** sí, "la ley pide facturar cada venta". Cerró A16. Lo vendido antes sin factura: no lo dijo.
- **4. Tasa y fecha:** la del BCV del día en que se hace la factura. Desde C-230, la factura va a esa tasa (antes, a la de la orden).
  - Si se factura el mismo día del cobro, las dos coinciden.
  - Si se escribe otro día, la Ley del IVA (art. 13 y 25) parece apuntar a la del día del cobro: queda preguntado.
- **5 y 6. Los libros:** el de ventas lleva la fecha, el número de factura y el de control, el RIF, el nombre, la base imponible, el total, el IVA y el comprobante de retención. El de compras, igual, con el proveedor.
  - C-230 los pone en el orden de siempre del libro: total, exento, base, alícuota, IVA y lo retenido.
- **7. Declaración del IVA:** en los primeros 15 días del mes (ordinario).
- **Retenciones que le hacen a la empresa:** pocas, y del 75 % del IVA (como C-159).
- **9. Máquina fiscal:** "ahorita no es obligado".
- **10. Abril de 2027:** hay que tener un talonario de contingencia para eventualidades. Las apps del SENIAT todavía no las conoce.
- **11. Pensiones:** el 9 % del salario integral. Nombró los $240 del ingreso integral del Gobierno: falta confirmar si son el mínimo por trabajador, y el día.
- **15. Alcaldía:** se declara en los primeros 10 días del mes.
  - La alícuota es el 1 o el 1,5 % de los ingresos (no lo recordaba: se confirma con el último recibo).
  - Se suele pagar el mínimo.
- **8. Puntos ES:** "imagino que" la factura va al recargar. Lo dijo con duda y cambiaría todo el flujo, así que sigue la regla de §5 (la factura va al comprar y Puntos ES es la forma de pago) hasta que lo confirme con un ejemplo.
- **Quedaron abiertas,** y se le preguntan en el WhatsApp del 16/11:
  - 2: los digitales (siguen sin IVA, C-151);
  - 8: Puntos ES, con un ejemplo;
  - 1: lo vendido antes sin factura;
  - 11: la base mínima y el día de las pensiones;
  - 13 y 14: las retenciones de ISLR, del alquiler y de otros pagos.
  - Quedan para después la 3 (la factura lleva los dólares en un renglón, como pide la 00093), la 12, la licencia, la publicidad y el aseo de la 15, la 16 (el panel no borra nada) y la 17 (se hacen los dos Excel).

## 10. Las maquetas (antes de programar)
Hechas el 14/11, con clientes inventados y una tasa de ejemplo (Bs 905,00).
- **Dónde están:** en la PC de Andrés, en `~/Escritorio/Electro Shop/Contabilidad/Maquetas C-228/`, con sus capturas a 1440 y a 360 px.
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

**Elegida la B** (14/11 en la noche: "muy brutal; ojo, algunos ítems se deben alinear mejor"). Se rehízo la réplica con una regla pareja:
- cada número, centrado sobre el borde izquierdo de su casilla;
- los valores, en la letra del panel, centrados en su fila;
- las cifras, a la derecha y con el mismo ancho de dígitos;
- todas las filas, de la misma altura.
- C-229 usa esa regla.

- **`4-mesa.html` (C-235):** "Mi mesa", el inicio de la contadora.
  - El saludo y el cierre del mes en la única pieza azul noche.
  - El cierre en 6 pasos y lo que vence en 30 días, con "Te toca" o "Paga Andrés".
  - Su firma y sello, las descargas en Excel, el calendario del mes y las notas con el dueño.
  - En el teléfono se apila; los pasos quedan en círculos, con "Paso 4 de 6" debajo.

## 11. Lo que no verifiqué
- **El texto de la 00093 contra la Gaceta 43.484:** lo leí en la copia de IVECOFI (completa, con sus disposiciones). Los resúmenes de la prensa no siempre coinciden con ella.
- **El día de la declaración** de un ordinario lo confirmó la contadora el 16/11: el 15. Quedan los artículos del Reglamento del IVA sobre los libros.
- **Los montos de las sanciones** del Código Orgánico Tributario.
- **Si el portal y la app del SENIAT ya facturan,** y si tendrán una API para conectar un sistema propio.
- **Si la empresa debía tener máquina fiscal** (pregunta 3).
- **La tasa BCV de hoy** (las maquetas usan una de ejemplo).
- **Pensiones:**
  - Las fechas de 2026 para un RIF terminado en 3. Las fuentes dicen que dependen del último dígito, pero no las listan.
  - El número de la providencia del calendario: SNAT/2025/000093 según unas fuentes, 000092 según otra.
  - Si hay un mínimo por trabajador: solo una fuente secundaria lo menciona.
- **Los porcentajes y las fechas del IVSS, el FAOV y el INCES,** y el plazo para enterar las retenciones de ISLR: no los verifiqué en una fuente oficial.
- **La Alcaldía de Guanare:** no encontré en internet la ordenanza vigente, la alícuota, las fechas ni un portal de pago. Solo hay noticias de años anteriores.

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

**Pensiones, retenciones de ISLR y alcaldía (14/11 en la noche)**
- Legis, calendario 2026 de la contribución para las pensiones: https://www.legis.com.ve/BancoConocimiento/N/nota_21-01-2026-n4/nota_21-01-2026-n4.asp?Miga=1&CodSeccion=25
- LEĜA, calendario de especiales y de pensiones 2026: https://lega.law/lega-informa/calendario-spe-y-pensiones-2026/
- IVECOFI, manual de la contribución: https://tributos.ivecofi.net/informacion/manual/contribucion-especial-proteccion-pensiones
- Cámara Ferretera, cumplimiento de la ley de pensiones: https://camaraferretera.org.ve/2026/04/cumplimiento-y-gestion-de-la-ley-de-proteccion-de-pensiones/
- Gerencia y Tributos, retención de ISLR en arrendamientos: https://gerenciaytributos.blogspot.com/2024/04/retencion-islr-arrendamiento-inmuebles.html
- Moore, tabla de retenciones de ISLR (U.T. Bs 43): https://www.moore-venezuela.com/wp-content/uploads/sites/15/2025/12/tabla-de-retenciones.pdf
- Acceso a la Justicia, la LOCAPTEM: https://accesoalajusticia.org/ley-organica-de-coordinacion-y-armonizacion-de-las-potestades-tributarias-de-los-estados-y-municipios-locaptem/
- PwC, los 20 aspectos de la LOCAPTEM: https://www.pwc.com/ve/es/assets/documentos/stl/STL%20Ley%20Org%C3%A1nica%20de%20Coordinaci%C3%B3n%20y%20Armonizaci%C3%B3n%20de%20las%20Potestades.pdf
- Diario Última Hora, comerciantes de Guanare y la tasa municipal (2023): https://www.diarioultimahoradigital.com.ve/2023/09/30/comerciantes-de-guanare-exigen-revisar-tasa-impositiva-en-el-municipio-y-ajustarla-a-la-realidad-economica/

**IVA, IGTF y declaración**
- Guía de terceros sobre la declaración de IVA (el día 15 para ordinarios): https://ivacalculator.com/venezuela/declaracion-iva-seniat/
- IGTF en 2026 (3 %, solo especiales): https://www.nompli.com/blog/igtf-venezuela-como-calcular-3-porciento-2026
- Las de `estado/C-120.md` §9 (Ley del IVA, Providencias 0071, 102 y 054, IGTF y RIF), `estado/C-147b.md` y `estado/C-151.md`.

## 13. Contabilidad completa (14/11 en la noche, C-228b)
El pedido: "Pago de pensiones, alquileres, gastos de empresa, recordatorio de pago, alcaldía y municipalidad… un módulo súper completo, muy bien diseñado, para que ella se sienta atraída de trabajar allí".
- La contadora entra al equipo, trabaja con Excel y en el panel, y firma.
- El dueño la puede quitar y poner otra.
- Lo decidido está en `PLAN.md` §7.2.

### 13.1 La contadora en el equipo (C-235)
- **El rol nuevo `ACCOUNTANT`,** "Contadora" en pantalla. Es un valor más del enum `Role`: un cambio aditivo (`ALTER TYPE "Role" ADD VALUE`).
- **Entra por invitación a su correo,** como los administradores (C-141): con clave propia y los dos pasos obligatorios.
  - El correo de invitación toma el nombre del rol de `nombreRol()` (`lib/equipo.ts`), que usa la sesión de los correos (C-219).
- **Puede:**
  - ver todo Contabilidad y descargarlo en Excel;
  - cargar y revisar gastos y compras;
  - calcular y marcar lo declarado, con la planilla en PDF;
  - firmar el cierre del mes;
  - escribir notas.
- **No puede:** facturar ni anular en el talonario, ni tocar órdenes, productos, clientes, la tienda o la configuración. El resto del menú no lo ve.
- **El dueño la invita, la quita y pone otra** desde Equipo.
  - Al quitarla, su acceso se cierra al instante.
  - Lo que firmó queda firmado con su nombre: el historial no se borra.
- **Su firma:** la dibuja una vez en el panel, con la pieza de firma dibujada de C-103.
  - Con su nombre y su número de C.P.C. forma el sello.
  - El sello va en cada cierre y en la portada de cada Excel o PDF.
- **"Mi mesa", su inicio** (la maqueta `4-mesa.html`):
  - el saludo y el cierre del mes, en la única pieza azul noche;
  - el cierre en 6 pasos: ventas, compras y gastos, nómina y aportes, alquiler y alcaldía, declarar y firmar;
  - lo que vence en 30 días, con "Te toca" o "Paga Andrés";
  - su firma y sello, y "Descargar el mes";
  - el calendario del mes y las notas con el dueño.

### 13.2 El calendario de obligaciones y los avisos (C-236)
Es la columna del módulo: cada obligación tiene su regla de vencimiento, y cada mes, su vencimiento con su estado.
- **Los estados:** por calcular → lista para pagar (con el monto y la planilla) → pagada (con el comprobante). El sello "Te toca" va a quien le toca (§1.8).
- **Quién hace qué (14/11):**
  - La contadora calcula y declara.
  - El dueño aprueba y paga.
  - Quien paga sube el comprobante.
  - El panel no guarda claves del SENIAT ni del banco.
- **Los avisos (14/11):**
  - Por la campana del panel y por el Telegram del equipo.
  - Tres días antes, el día del vencimiento y si se pasa.
  - Lo que vence en feriado o fin de semana pasa al día hábil siguiente (Código Orgánico Tributario, art. 10), con el calendario de feriados de C-234 (`lib/horarios/*`).
- **Las obligaciones de una C.A. ordinaria en Guanare.** Lo marcado "confirmar" lo dice la contadora, en las preguntas del WhatsApp.

| Obligación | Cada cuánto | Vence | De dónde sale el monto |
|---|---|---|---|
| IVA (forma 99030) | Mensual | Hasta el día 15 del mes siguiente (la contadora, 16/11) | Débito − crédito − excedente − lo retenido (C-232) |
| Pensiones (9 %) | Mensual | Según el último dígito del RIF (3), en el calendario anual del SENIAT (confirmar las fechas) | El 9 % del salario integral (la contadora); el mínimo por trabajador, por confirmar (C-239) |
| Retenciones de ISLR (alquiler y otras) | Mensual | En los primeros días del mes siguiente (confirmar) | El 3 % o el 5 % del alquiler; los demás pagos, según el Decreto 1.808 |
| IVSS | Mensual | Se activa cuando lo diga la contadora | Salarios del mes |
| FAOV (BANAVIH) | Mensual | Se activa cuando lo diga la contadora | Salario integral |
| INCES | Trimestral | Se activa cuando lo diga la contadora | Salarios del trimestre |
| Alcaldía: actividades económicas | Mensual, y la definitiva del año (confirmar) | En los primeros 10 días del mes (la contadora, 16/11) | Lo mayor entre los ingresos brutos × la alícuota (1 o 1,5 %, a confirmar con el último recibo; tope del 3 %, LOCAPTEM) y el mínimo |
| Licencia de actividades económicas | Anual | Confirmar | Tasa de la alcaldía |
| Publicidad y aseo | Según la alcaldía | Confirmar | Tasas |
| Alquiler del local | Mensual | El día del contrato | El canon, con su retención (C-238) |
| ISLR del año | Anual | 31/03, si el ejercicio cierra el 31/12 | Lo calcula la contadora |

- **Las fechas que dependen del RIF** (pensiones) las carga la contadora una vez al año, o Claude con la providencia del calendario. La de 2027 todavía no salió.

### 13.3 Gastos y compras (C-237)
- **Cada factura de compra o de gasto lleva:**
  - la foto o el PDF, como archivo privado, nunca público;
  - el proveedor y su RIF;
  - los números de factura y de control, y la fecha;
  - la categoría;
  - la base, el IVA, lo exento y el total;
  - la retención, si la hay.
- **De ahí salen el libro de compras del mes y el crédito fiscal del IVA** (C-232). Las facturas de la ferretería, que traen el IVA (C-196b), entran aquí.
- **Las categorías:** mercancía, fletes (ZOOM y MRW del envío gratis), servicios (luz, agua, internet y teléfono), alquiler, honorarios, publicidad, papelería, mantenimiento, comisiones bancarias (el Pago Móvil), impuestos y tasas, y otros.
- **Propuesta:** carga el dueño o la contadora. Un administrador puede subir la foto para que ella la complete.
- **La contadora revisa cada una:** "Revisada" la pasa al libro; "Falta algo" la devuelve con una nota.

### 13.4 El alquiler del local (C-238)
- **El contrato:**
  - el arrendador, persona o empresa, con su RIF;
  - el canon, en $ o en Bs, y el día de pago;
  - cuándo vence el contrato;
  - si el arrendador factura con IVA.
- **Cada mes:**
  - el canon a la tasa del día;
  - la retención de ISLR: 3 % si el arrendador es una persona residente y 5 % si es una empresa domiciliada (Decreto 1.808, art. 9);
  - su comprobante de retención, con el número de 14 caracteres AAAAMMSSSSSSSS (00093, art. 18);
  - el recibo o la factura del arrendador.
- **El IVA del alquiler,** si el arrendador lo factura, es crédito fiscal: va al libro de compras.
- **Aviso 60 días antes** de que venza el contrato.

### 13.5 Nómina y aportes (C-239)
- **Cada mes se cargan los totales:** cuántos trabajadores, los salarios y los bonos no salariales. En su mes, también las utilidades y las vacaciones.
- **El panel calcula y deja en el calendario:**
  - pensiones: el 9 % de los salarios y los bonos, con el mínimo por trabajador si existe;
  - IVSS, FAOV e INCES, con los porcentajes que confirme la contadora.
- **Se guardan** cada planilla y cada comprobante.
- **Sin datos de cada trabajador** (14/11: totales del mes): ni nombres ni sueldos sueltos.

### 13.6 La Alcaldía de Guanare (C-240)
- **Actividades económicas:**
  - la declaración del mes (o el anticipo), con los ingresos brutos;
  - la definitiva del año.
  - Los ingresos brutos salen del libro de ventas (C-230), pero los fija la contadora.
- **La licencia anual, la publicidad del aviso y el aseo urbano:** vencimientos con su monto.
- **La ley de armonización** (LOCAPTEM, Gaceta 6.755 Extraordinario del 10/08/2023):
  - la alícuota general de actividades económicas no pasa del 3 % de los ingresos brutos;
  - el mínimo tributable del año no pasa de 240 veces la tasa BCV de la moneda de mayor valor.
- **No encontré en internet la ordenanza vigente de Guanare.** La alícuota, las fechas y si se paga en línea los da la contadora (pregunta 15).

### 13.7 El cierre del mes, firmado (C-232)
- **Seis pasos:** ventas, compras y gastos, nómina y aportes, alquiler y alcaldía, declarar y firmar.
- **Al firmar, el mes queda cerrado.** Lo que cambie después va con una nota de crédito o de débito, o con una corrección que la contadora vuelve a firmar (antes → después, §1.9).
- **La descarga del mes:** un Excel con una pestaña por libro. Las pestañas son ventas, compras, IVA, nómina y aportes, alquiler y alcaldía, y los vencimientos pagados. La portada lleva su firma y sello.

### 13.8 Lo que hace que ella quiera trabajar ahí
- **Todo en una mesa:** lo que vence, lo que falta y lo que ya está, sin buscar.
- **Nada se copia a mano:** los libros de ventas y de compras salen de lo que carga el equipo.
- **Su firma vale:** cada cierre queda con su nombre y su C.P.C.
- **Ella pone los criterios:** las columnas, las alícuotas y las fechas salen de sus respuestas.
- **Los avisos llegan a tiempo,** para que no haya multas.
- **El diseño** (`PLAN.md` §1 y §1.9):
  - una sola pieza azul noche, el saludo con el cierre, y lo demás claro;
  - "Te toca" en el sello azul noche, y nada ámbar (C-226);
  - el Excel, con su firma.
