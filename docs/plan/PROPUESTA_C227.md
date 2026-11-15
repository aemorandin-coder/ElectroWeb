# C-227 · Los correos a los proveedores (el plan) · 2026-11-14

> Plan aparte que pidió el equipo el 14/11, con sus 8 preguntas. Las respuestas están en `PLAN.md` §7.2 ("Los correos a los proveedores") y aquí, con el flujo completo. Se programa después de C-219 (el marco de los correos, ya en main) y de C-234 (los días hábiles).

## El pedido
"Quiero que prepares una sección de correo para Proveedores":
- primero, el agradecimiento por habernos elegido para vender sus productos y "confiar en nuestros flujos". El nombre de esa relación es **aliado comercial** (el equipo, 14/11: el primero que se usó era jerga y no va en ningún lado);
- después, avisarle al proveedor "que se vendió uno de sus productos", que prepare el embalaje y "por cuál empresa de encomienda debe irse".

## Cómo es hoy
- **El proveedor** (`suppliers`) no tiene correo, teléfono ni contacto guardados.
- **Lo que despacha él mismo** (la ferretería, desde La Victoria) llega en su propia orden (C-199). El panel avisa: "Este paquete sale desde La Victoria, estado Aragua: lo despacha el proveedor".
- **El equipo pasa el pedido a mano:** copia "Datos para la guía" (destinatario, cédula, teléfono, oficina de ZOOM o MRW, contenido, piezas, peso y empaque), se los manda por WhatsApp y anota la guía cuando se la devuelven.
- **El flete de esos paquetes** es siempre cobro a destino.

## Las 8 decisiones (14/11, el equipo eligió lo recomendado en todas)
1. **Cuándo:** el aviso de venta sale al confirmarse el pago, nunca antes. Con Pago Móvil del BDV es al instante; si se revisa a mano, cuando el equipo lo confirma.
2. **La guía la hace el proveedor,** con lo que pide la guía:
   - nombre, cédula y teléfono del cliente;
   - la oficina de destino con su código;
   - nunca el correo del cliente, su casa ni lo que pagó.
3. **Montos:** solo su costo, por producto y el total. Nunca el precio de venta de la tienda.
4. **Confirma con un botón:** un enlace firmado, sin cuenta (como el del presupuesto), a una página donde:
   - marca "Lo estoy preparando";
   - después escribe la guía.
   - Con la guía, la orden se actualiza y al cliente le llega "Tu pedido va en camino" solo.
5. **Plazo:** 1 día hábil. Si no anotó la guía, le llega un recordatorio y al equipo un aviso.
6. **A quién:** al correo de despacho del proveedor, con copia a los correos de avisos del equipo.
7. **La bienvenida** sale con un botón del panel, cuando el catálogo del proveedor ya está publicado.
8. **Lo que promete la bienvenida:** el agradecimiento, su credencial de "aliado comercial" y el flujo en pasos, **sin hablar de pagos** (eso queda en el acuerdo).

**Además, sin pregunta:**
- se le habla de usted;
- siempre sale "Se canceló: no lo despaches" si la orden se cancela.

## El flujo
1. **El cliente paga** una orden que despacha el proveedor. Desde C-199, una compra mixta se parte en una orden por paquete.
2. **"¡Se vendió su producto!"** sale al proveedor, con copia al equipo.
3. **El proveedor abre el enlace** y toca "Lo estoy preparando": el panel lo muestra en la orden.
4. **Embala y entrega en su agencia,** hace la guía y la escribe en la página.
5. **La orden pasa a "Enviada"** con esa guía y esa empresa. Al cliente le llega "¡Tu caja ya va rumbo a ti!" (C-219) y el rastreo de ZOOM sigue solo (C-100).
6. **Si al día hábil siguiente no hay guía** (C-234 cuenta los días hábiles): un recordatorio al proveedor y un aviso al equipo, una sola vez.
7. **Si la orden se cancela antes de la guía:** "Se canceló: no lo despaches", y el enlace deja de servir.

## Los correos (con el marco de C-219, el pie del proveedor y de usted)
| Correo | Cuándo | Qué lleva |
|---|---|---|
| **Bienvenida "aliado comercial"** | Botón del panel | El agradecimiento; su credencial en la placa azul noche ("<proveedor> · aliado comercial de Electro Shop · desde <fecha>"); cuántos de sus productos están publicados, con un enlace a verlos; "cómo trabajamos juntos" en 5 pasos; a quién escribir |
| **"¡Se vendió su producto!"** | Pago confirmado | La orden; sus productos con su código y su nombre de lista (`supplierSku`, `supplierName`), cantidad y costo; el empaque que toca (del plan de embalaje de la orden, C-153); **la empresa en grande (ZOOM o MRW, con su logo)** y la oficina; los datos de la guía; el plazo ("antes del martes 17"); el botón "Anotar la guía" |
| **Recordatorio** | 1 día hábil sin guía | Lo mismo, más corto, con el botón |
| **"Se canceló: no lo despache"** | Orden cancelada sin guía | La orden y sus productos, en azul claro (C-226) |

## Lo que hace falta
- **Base (aditiva):**
  - `suppliers`: `contactName`, `contactEmail`, `contactWhatsapp` y `bienvenidaAt`;
  - `orders`: `proveedorAvisoAt`, `proveedorTokenHash`, `proveedorPreparandoAt` y `proveedorRecordatorioAt`.
- **Panel, Productos → Proveedores:** el contacto del proveedor y "Enviar la bienvenida", con la vista previa antes de enviarla (`PLAN.md` §1.9).
- **Una página pública sin cuenta,** `/proveedor/despacho/[token]`:
  - el token se guarda solo con su hash y sirve hasta que la orden se entrega o se cancela;
  - lleva límite de intentos;
  - muestra lo mismo del correo y pide la guía, con la empresa ya elegida.
- **Los disparos:**
  - el aviso, junto a `avisarPedidoDigitalPorEntregar` al confirmar el pago, en `app/api/orders`, solo en las órdenes con `dispatchCityCode`;
  - el recordatorio, en un cron diario con los días hábiles de C-234;
  - la cancelación, en el `CANCELLED` de la misma ruta.

## Cómo se va a verificar
- **Una compra mixta en la base de prueba:** sale un aviso por la orden del proveedor y ninguno por la de Guanare.
- **La página del token:**
  - con un token inventado, 404;
  - con la orden cancelada, "ya no está disponible";
  - con la guía anotada, la orden queda "Enviada" y el cliente recibe su correo.
- **El recordatorio** a 1 día hábil: un viernes pagado lo recuerda el lunes, por C-234.
- **Los cuatro correos** en la vista previa del panel, a 640 y 390 px.
