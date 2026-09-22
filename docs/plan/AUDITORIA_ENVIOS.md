# Auditoría de envíos y compras (C-99, 21/09)

Pedido de Andrés (21/09): revisar si el flujo de envío es lógico, también desde el panel, y averiguar cómo trabajar con **ZOOM** y **MRW** para que el cliente gestione y rastree su envío.
Solo lectura: no se cambió código. Las APIs de ZOOM se probaron de verdad contra su servidor de pruebas.

## 1. Cómo funciona hoy

```
Cliente (checkout)                         Servidor (POST /api/orders)            Admin (Órdenes)                      Cliente (Mis pedidos)
─────────────────                          ───────────────────────────            ───────────────                      ────────────────────
Elige entrega:                             Calcula envío con una fórmula fija:    "Marcar enviado": elige empresa      Línea de tiempo por estado
 · Dirección personal (texto libre)          kg × $/kg (mínimo) + embalaje        (ZOOM, MRW, TEALCA, DOMESA, Otro),   + "Guía: 123" + enlace externo
 · Oficina courier: ZOOM o MRW +           Igual para oficina y domicilio,        escribe la guía a mano.              (el de MRW está roto).
   "ID de oficina" escrito a mano          igual para cualquier ciudad.           Se avisa al cliente (panel+correo).  Nada se actualiza solo.
 · Retiro en tienda                        Guarda todo en shippingAddress         Pasa a Entregada a mano.
Paga con saldo (siempre WALLET).           como texto: "Oficina ZOOM: 123".
```

La compra digital va aparte: orden digital pagada → aviso "Pedido digital por entregar" (C-60b) → el equipo compra el código y lo carga en `orders/[id]/digital` → el cliente lo raspa en su panel.

## 2. Hallazgos

| # | Gravedad | Qué pasa | Dónde |
|---|---|---|---|
| E1 | **Dinero** | El **envío gratis cuenta los digitales**: con el umbral en $50, una gift card de $50 + un cable de $5 da envío gratis al cable. El umbral usa el subtotal de todo el carrito. | `lib/pricing.ts:258` y `:161` |
| E2 | **Dinero** | **El flete es una fórmula fija**, no la tarifa real: mismo precio a Guanare que a Maracaibo, a oficina que a domicilio. En el servidor de pruebas de ZOOM, 2 kg de Guanare a Caracas cuestan Bs. 8.613 a oficina y Bs. 11.117 a domicilio (+29 %). La tienda pierde en los envíos lejanos o cobra de más en los cercanos. | `lib/pricing.ts` `calculateShipping` |
| E3 | **Dinero / texto** | **Dos modelos a la vez:** el wizard de productos dice "Solo cobramos $2.50 de embalaje" (el cliente paga el flete en la oficina), pero el checkout cobra kg × $/kg + embalaje. Hay que elegir uno (decisión D-E1). | `products/_components/wizard/physical/Step2Prices.tsx:133` |
| E4 | **Dinero** | **El servidor deja enviar una orden sin pagar:** Pendiente → Confirmada → Enviada es una transición válida y no pide `paymentStatus = PAID`. El stock solo se descuenta al pagar, así que además se vende sin descontar. Hoy el checkout cobra siempre con saldo (nace pagada), pero la puerta existe. | `lib/order-admin.ts:38` |
| E5 | Datos | **La empresa y la oficina que eligió el cliente se pierden:** van como texto dentro de `shippingAddress`; `shippingCarrier` queda vacío y el admin vuelve a elegir la empresa a mano, sin aviso si elige otra. | `app/checkout/page.tsx:50`, `app/api/orders/route.ts:306` |
| E6 | Datos | **"ID de oficina ZOOM o casillero" escrito a mano:** el cliente no conoce los códigos. Un error manda el paquete a otra oficina. ZOOM y MRW publican la lista real de oficinas (ver §3 y §4). | `app/checkout/page.tsx` ~l.1160 |
| E7 | Datos | **La orden no guarda quién retira:** nombre, cédula y teléfono del destinatario. ZOOM los exige para crear la guía y la oficina pide la cédula. Hoy salen del perfil, que el cliente puede cambiar después. | `prisma/schema.prisma` `Order` |
| E8 | Datos | Dirección con ciudad y estado en texto libre, sin municipio ni parroquia (ZOOM los pide para domicilio). El servidor tampoco exige dirección en una orden física con envío. | `app/checkout/page.tsx` ~l.1080, `app/api/orders/route.ts:306` |
| E9 | **Cliente** | **El enlace de rastreo de MRW está muerto:** apunta a `www.mrw.com.ve`, que ya no existe (el dominio no resuelve). MRW está en `mrwve.com` y su rastreo es un formulario en `/mi-envio`, sin enlace directo. El de ZOOM redirige a `zoom.red/tracking-de-envios-empresas/?guia=`. | `app/admin/(dashboard)/orders/page.tsx:96` |
| E10 | **Cliente** | **Promesa falsa en el checkout:** "Recibirás una notificación cuando tu paquete llegue a la oficina". Nada consulta a la empresa ni avisa esa llegada. | `app/checkout/page.tsx:1188` |
| E11 | Panel | La máquina de estados ignora el tipo de entrega: una orden de retiro se puede marcar "Enviada" y una de courier "Lista para recoger". "Enviada" sin guía solo lo frena el navegador, no el servidor. | `lib/order-admin.ts:36-46`, `orders/page.tsx:244` |
| E12 | Panel | `trackingUrl` es texto libre (sin exigir `https://`) y se muestra al cliente como enlace. Debería armarlo el servidor según la empresa. | `lib/order-admin.ts:21`, `components/orders/OrderTracking.tsx:193` |
| E13 | Digital | Al entregar el último código, la orden digital sigue en "En preparación": nadie la pasa a Entregada ni llena `deliveredAt`. El cliente ya tiene su código y su pedido dice que se está preparando. | `app/api/orders/[id]/digital/route.ts` |
| E14 | Correo | La confirmación de compra dice siempre "Delivery", también en retiro en tienda y en digitales. | `app/api/orders/route.ts:229` |

## 3. ZOOM: API pública (probada el 21/09)

ZOOM tiene APIs en JSON. **Las públicas no piden credenciales**: ciudades, oficinas, tarifas y rastreo. Las privadas (crear e imprimir guías) piden usuario, clave y una "frase privada" que ZOOM entrega a clientes corporativos después de certificar la integración en su servidor de pruebas.
Documentación: [zoom.red/api-documentacion-zoom-envios](https://zoom.red/api-documentacion-zoom-envios/) y [colección de Postman](https://documenter.getpostman.com/view/6789630/S1Zz6V2v). Referencia de parámetros: SDK de Node [Avila-Tek/red-zoom](https://github.com/Avila-Tek/red-zoom) (sin mantenimiento; se usa como guía, no como dependencia).

Base de pruebas: `https://sandbox.zoom.red/baaszoom/public/canguroazul`. La de producción la da ZOOM con la certificación.

| Método | Para qué | Probado |
|---|---|---|
| `getEstados` | Estados | 200 |
| `getCiudades?filtro=nacional` | 270 ciudades con su oficina principal | Guanare = `codciudad 43`, oficina `875 ZOOM GUANARE`; Caracas = 19 |
| `getOficinasGE?codigo_ciudad_destino=19&tipo_tarifa=2&modalidad_tarifa=1` | Oficinas donde se puede retirar, con dirección | 62 oficinas en Caracas |
| `CalcularTarifa?tipo_tarifa=2&modalidad_tarifa=1&ciudad_remitente=43&ciudad_destinatario=19&oficina_retirar=46&cantidad_piezas=1&peso=2&valor_declarado=10000&codpais=0&tipo_envio=0` | Tarifa real en Bs. con IVA, seguro y franqueo | Bs. 8.613,15 (oficina), Bs. 11.117,36 (domicilio, `modalidad_tarifa=2`), Bs. 10.261,08 (cobro a destino, `tipo_tarifa=1`) |
| `getInfoTracking?tipo_busqueda=1&codigo=<guía>&codigo_cliente=<n>` | Historial de la guía: estatus, fecha, hora, quién recibió | Responde; con una guía falsa: "No se ha encontrado el tracking asociado" |
| `generarToken`, `zoomCert`, `createShipment`, `generarPdfGuiaEWs` (privadas, base `.../guiaelectronica`) | Crear la guía desde el panel e imprimir el PDF | Necesitan cuenta corporativa |

Notas: los montos vienen en bolívares y con formato "8.613,15". `valor_declarado` tiene mínimo (Bs. 8.486 hoy) y máximo. Los valores del servidor de pruebas pueden no ser los de producción.

## 4. MRW: sin API pública

- `mrwve.com` no publica documentación. Para integrar hay que ser cliente corporativo ([mrwve.com/corporativos](https://mrwve.com/corporativos), "Quiero ser cliente") y pedir su web service.
- Su página usa dos llamadas internas sin documentar:
  - `GET https://mrwve.com/api/agencias`: 250 agencias con código, dirección, estado y coordenadas (Guanare: código `1800000`). Sirve para que el cliente elija agencia en el checkout, **guardando una copia** por si cambia o se cae.
  - `POST https://mrwve.com/api/tracking {nro_tracking}`: el 21/09 respondía "Estamos actualizando nuestro sistema de rastreo…" con WhatsApp de soporte. No es confiable para automatizar.
- Plan realista con MRW: agencias de su lista, guía escrita por el admin, estado actualizado a mano, "Copiar guía" + botón a `mrwve.com/mi-envio`. Automatizar cuando den el web service.

## 5. Propuesta: C-100 · Envíos con ZOOM y MRW

**Fase 1: sin credenciales (se puede hacer ya).**
1. `lib/envios/zoom.ts` y `lib/envios/mrw.ts`, solo servidor: ciudades, oficinas y agencias con caché de 24 h; tarifa ZOOM; rastreo ZOOM con caché de 30 min. Timeouts cortos y sin tumbar el checkout si la empresa no responde.
2. **Checkout:** empresa → estado → ciudad → oficina, de la lista real con su dirección. Destinatario (nombre, cédula y teléfono) prellenado del perfil y editable. Domicilio con municipio.
3. **Orden** (migración, con OK de Andrés): `shippingCarrier` desde el checkout, código y nombre de la oficina, ciudad, datos del destinatario, y una tabla `ShipmentEvent` con el historial.
4. **Servidor:** no se envía sin pago; retiro y courier con sus propios estados; "Enviada" exige guía; el enlace de rastreo lo arma el servidor (E4, E9, E11, E12). E1, E13 y E14 también.
5. **Panel:** "Marcar enviado" viene con la empresa y la oficina que eligió el cliente y con los datos para la guía listos para copiar.
6. **Cliente:** en su pedido, historial real de ZOOM, "Copiar guía" y "Rastrear en ZOOM/MRW". Un proceso cada 2 h (`/api/cron/envios` con `CRON_SECRET`, llamado por el cron del servidor) consulta las guías ZOOM en camino, guarda los eventos nuevos, **avisa al cliente** (panel, correo) cuando llega a la oficina y marca Entregada cuando ZOOM lo dice. Así se cumple E10.

**Fase 2: con cuenta corporativa ZOOM.** Botón "Crear guía" en el panel (`createShipment`) e impresión del PDF: la guía queda guardada sola y se rastrea por la referencia (el número de orden). MRW igual cuando den su web service.

Gemini después de C-100: la parte visual de `components/orders/OrderTracking.tsx` y del panel del cliente, con tarjetas cerradas.

## 6. Decisiones de Andrés

| # | Decisión | Opciones |
|---|---|---|
| D-E1 | ¿Quién paga el flete? | **a)** Cobro a destino: la tienda cobra solo el embalaje y el cliente paga en la oficina (lo que dice el wizard). El checkout muestra la tarifa de ZOOM como referencia. **b)** Prepagado: la tienda cobra la tarifa real de ZOOM (Bs. → USD con la tasa) y paga la guía. MRW, sin API, quedaría con la fórmula actual o cobro a destino. |
| D-E2 | "Dirección personal", ¿qué es? | Puerta a puerta nacional por ZOOM/MRW, delivery local en Guanare, o las dos. |
| D-E3 | Cuentas corporativas | ZOOM (para crear guías desde el panel) y MRW (para su web service). |
| D-E4 | Migración de la tabla `orders` | Campos nuevos, sin borrar nada. Necesita tu OK. |

## 7. Qué está probado y qué no
- **Probado por partes** (ver estados): el cálculo y los casos manipulados de la compra (C-01, 44/44), los estados del panel (C-74, 21/21), la entrega de códigos digitales (C-60b, 18/18 y navegador) y los montos exactos (C-96).
- **Nunca probado de punta a punta en el navegador:** carrito → checkout → panel "Enviado" → rastreo del cliente, ni gift card → código → raspado. Va en C-100 como prueba final, en la tienda de ejemplo.
