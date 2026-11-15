# C-234 · Cuándo sale cada pedido (el plan) · 2026-11-14

> El flujo de 6 preguntas que pidió el equipo el 14/11. Las respuestas están en `PLAN.md` §7.2 ("Cuándo sale cada pedido") y aquí, con las reglas y dónde se dice. C-219 (los correos) y C-227 (el plazo del proveedor) usan esta misma cuenta.

## El pedido
"¿Quién se encarga de los horarios? Es muy importante: hay compradores que nos pueden hacer compras un sábado al mediodía, su producto sí o sí sale el lunes. Arma un flujo de 6 preguntas con respecto al horario para ser lo más transparente con el cliente."

## Cómo es hoy: nadie
- **El horario de atención** (Configuración → Negocio: lunes a sábado de 9:00 a 19:00, domingo cerrado) solo se muestra en Contacto, en las páginas legales y en lo que lee Google.
- **Ningún cálculo** sabe cuándo sale un pedido: no hay hora de corte, feriados ni días hábiles.
- **El único corte que existe es el de Navidad** ("Para que llegue antes del 24", Marketing → Navidad).
- **El cliente que paga un sábado al mediodía** no sabe que su pedido sale el lunes.

## Las 6 decisiones (14/11, el equipo eligió lo recomendado en todas)
1. **Corte de lunes a viernes, a las 2:00 p. m.** Lo pagado antes sale ese día hacia ZOOM, MRW o el delivery; después, al día hábil siguiente. La hora se cambia en Configuración.
2. **El sábado no se despacha:** lo pagado el sábado o el domingo sale el lunes, y se dice antes de comprar.
3. **Feriados:**
   - vienen cargados los nacionales de Venezuela: 1 de enero, lunes y martes de Carnaval, jueves y viernes santos, 19 de abril, 1 de mayo, 24 de junio, 5 y 24 de julio, 12 de octubre y 25 de diciembre;
   - también los días que la tienda cierra por costumbre: 24 y 31 de diciembre;
   - el equipo agrega o quita días en Configuración;
   - un feriado corre la salida al día hábil siguiente.
4. **Lo digital llega en horario de atención:** "Lo recibes en minutos de lunes a sábado de 9:00 a 19:00. Si compras fuera de ese horario, te llega al abrir: el lunes a las 9:00". Los códigos y recargas los compra el equipo a mano.
5. **Lo de La Victoria sale un día hábil después** que lo de Guanare, con el mismo calendario. Pagado el lunes antes del corte: Guanare el lunes y La Victoria el martes. Cada paquete dice su fecha.
6. **Dónde y cómo se dice:**
   - **En la ficha y el carrito,** la fecha exacta con cuenta regresiva: "Compra en las próximas 2 h 15 min y sale hoy", o "Compra hoy y sale el lunes 16".
   - **En el checkout, el correo de confirmación y Mi pedido,** la fecha: "Sale el lunes 16 de noviembre".
   - **Con el origen de C-222,** en una sola línea: "Sale el lunes 16 desde Aragua".

## Las reglas, en un solo lugar (`lib/horarios/`, puro y probado)
- **`esDiaHabil(fecha)`:** de lunes a viernes, que no sea feriado ni un día cerrado del panel. En hora de Venezuela, sin cambio de hora.
- **`fechaDeSalida({ pagadoEl, despachaProveedor })`:**
  - pagado un día hábil antes del corte, sale ese día;
  - si no, el siguiente día hábil;
  - si lo despacha un proveedor, un día hábil más (preparado para que cada proveedor tenga su propio número de días sin rehacer nada).
- **`textoSalida(fecha, ahora)`:** "Sale hoy", "Sale mañana", "Sale el lunes 16" o "Sale el lunes 16 de noviembre".
- **`cuentaRegresiva(ahora)`:** el tiempo que falta para el corte de hoy, si hoy se despacha. La ficha y el carrito lo cuentan en el navegador, cada minuto, sin animación.
- **`entregaDigital(ahora)`:** "en minutos", o "al abrir: el lunes a las 9:00", según el horario de atención.

**Casos que deben dar bien:**

| Se paga | Sale (Guanare) | Sale (La Victoria) |
|---|---|---|
| Sábado 14/11 a las 12:00 | lunes 16 | martes 17 |
| Viernes a las 13:59 | ese viernes | lunes |
| Viernes a las 14:01 | lunes | martes |
| Miércoles 23/12 a las 15:00 | lunes 28 (el 24 y el 25 cierran y el sábado no se despacha) | martes 29 |
| Domingo 7/2/2027, de Carnaval | miércoles 10 (lunes y martes de Carnaval) | jueves 11 |

## Lo que hace falta
- **Base (aditiva):** en `company_settings`, `horaCorte` (texto, "14:00") y `diasCerrados` (las fechas que agrega o quita el equipo).
- **Configuración → Negocio → "Despachos"** (`PLAN.md` §1.9, con su vista previa):
  - la hora de corte, en un `CampoUnidad`;
  - el calendario de feriados y días cerrados del año;
  - una línea de ejemplo: "Si alguien paga el sábado a las 12:00, sale el lunes 16".
- **La tienda:** la línea en la ficha, el carrito, el checkout y Mi pedido, junto a la de C-222 ("desde Aragua").
- **Los correos (C-219):** el de la compra dice "Sale el lunes 16" en "Así te llega"; el de código digital, cuándo llega.
- **C-227:** el plazo del proveedor y su recordatorio cuentan con `esDiaHabil`.

## Cómo se va a verificar
- **Las reglas, con los casos de la tabla** y los bordes: el corte exacto, el último día del año y un año bisiesto.
- **La tienda a 360, 768, 1024 y 1440 px** con el reloj de la prueba puesto en un sábado al mediodía, un viernes a las 13:55 y un feriado.
- **El correo de compra en la vista previa del panel.**
