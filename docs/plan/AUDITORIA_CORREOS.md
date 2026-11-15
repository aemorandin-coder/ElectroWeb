# Auditoría de los correos (C-219) · 2026-11-14

El equipo, el 14/11: "Siento que los diseños actuales de correos son muy pobres y no tienen nuestra esencia". Pidió primero un análisis exhaustivo (dónde hace falta un correo, qué mensajes faltan) y después el rediseño de todas las plantillas: "más épico, más Electro Shop", sin que dejen de verse.

## Cierre (2026-11-14, C-219)
**Resuelto en C-219 y C-226.** Decisiones del 14/11 en `PLAN.md` §7.2: la maqueta C (clara, con la cinta), con ELECTRO SHOP grande arriba y Chispa abajo, textos "más dinámicos y mucho más épicos" y los 19 correos nuevos.

| Hallazgos | Cerrado en | Cómo quedó |
|---|---|---|
| 1 (la bienvenida) | C-219 | Sale al activar la cuenta y al entrar con Google. |
| 2 (dos correos al comprar) | C-219 | Uno solo, que dice si el pago entró o se está revisando. |
| 3 (el recibo) | C-219 | `formatUSD`, la foto de cada producto y el total en Bs. con la tasa de la orden. |
| 4 (los asuntos) | C-219 | Sin mayúsculas en cada palabra y siempre "Electro Shop". |
| 5 (las fotos en WebP) | C-219 | En JPEG desde `/api/public/foto-correo`. |
| 6 (la versión de texto) | C-219 | `htmlATexto`: un renglón por párrafo y los enlaces con su dirección. |
| 7 (los correos sueltos en las rutas) | C-219 | En `lib/email-templates`; la vista previa muestra los 54. |
| 8 (el pie) | C-219 | La razón social, el RIF, la dirección y por qué le escribimos. |
| 9 (el delivery en Guanare) | C-219 | Su propio correo: "Sale a tu puerta". |
| 10 (cajas ámbar) | C-226 | La caja de aviso va en el azul claro de la tienda. |
| Los 19 que faltaban | C-219 | Todos, con su disparo (`estado/C-219.md`). |

**Lo que sigue abierto (`PLAN.md` §5.2):**
- "Sale el lunes 16" con C-234;
- responder sin el borrador de Claude con la plantilla;
- el carrito abandonado, "Tu factura" y el resumen de Puntos ES.

---

## 1. Los correos que salen hoy (26)
Todos usan el mismo marco, `getBaseTemplate` (`lib/email-service.ts`): el logo largo sobre blanco, el contenido y un pie gris con redes y contacto.

| Grupo | Correo | Dónde se dispara |
|---|---|---|
| Cuenta | Verificar el correo | `app/api/auth/register`, `resend-verification` |
| | Recuperar la contraseña | `app/api/auth/forgot-password` |
| | Inicio de sesión desde un dispositivo nuevo | `lib/sesiones.ts` |
| Compra | Pedido recibido (recibo) | `app/api/orders` (`generateOrderConfirmationEmail`) |
| | Pago en revisión | `app/api/orders`, en el mismo momento que el anterior |
| | Pedido enviado | `app/api/orders` (estado `SHIPPED`) |
| | Llegó a la oficina | `lib/envios/seguimiento.ts` |
| | Pedido entregado | `app/api/orders` y el rastreo |
| | Orden cancelada | `app/api/orders`, escrito dentro de la ruta |
| | Código digital | `app/api/orders/[id]/digital` |
| | Gift card, a quien la recibe | `app/api/gift-cards` |
| Puntos ES | Recarga aprobada sola por el BDV | `app/api/pago-movil/verificar`, escrito dentro de la ruta |
| Después de comprar | Pedir la reseña | `lib/resenas-avisos.ts` (cron) |
| | Reseña publicada | `app/api/reviews` |
| | Novedades de la garantía | `lib/warranty-server.ts` |
| | Favoritos: bajó de precio o volvió | `lib/favoritos-avisos.ts` (cron) |
| Empresas y programas | Presupuesto | `lib/cotizaciones/correo.ts` |
| | Empresa verificada o no | `app/api/admin/verifications`, escrito dentro de la ruta |
| | Ya eres promotor | `app/api/influencers/solicitudes/[id]` |
| | Inscripción a un curso, certificado, creador | `lib/email-templates/CourseCertificate.ts` |
| Equipo y marketing | Campañas | `lib/email-campaigns.ts` |
| | Avisos al equipo (unos 40 tipos, una plantilla) | `lib/admin-alerts.ts` |
| | Invitación al panel | `lib/equipo.ts` |
| | Correo de prueba | Configuración → Correo |

**Existen y nunca salen:** la bienvenida (`sendWelcomeEmail`: nadie la llama) y el documento legal (`sendLegalDocumentEmail`).

## 2. Lo que está mal en los que salen
1. **La bienvenida no sale nunca.** Después de verificar el correo, el cliente no recibe nada.
2. **Dos correos a la vez al comprar** con el pago por verificar: "Confirmación de Pedido" y "Pedido Pendiente de Pago". El asunto del segundo suena a que falta pagar, y el texto dice que no tiene que hacer nada.
3. **El recibo:**
   - dice "92.90 USD" en vez de "$92,90": usa `toFixed`, contra `PLAN.md` §1.4;
   - no tiene fotos;
   - no dice el total en bolívares, aunque la orden guarda `totalVES` y la tasa.
4. **Asuntos disparejos:** "¡Tu Pedido Ha Sido Enviado!", "Test de Email", "ElectroShop" y "Electro Shop", "Recarga de $10.00".
5. **Las fotos de producto van en WebP** (favoritos y reseñas): Outlook de Windows no las muestra.
6. **La versión de solo texto es el HTML sin etiquetas:** queda desordenada y los filtros de spam la castigan.
7. **Seis correos están escritos dentro de las rutas:** cancelada, recarga, empresa, promotor, sesión e invitación. La vista previa del panel (Marketing → Correos) muestra 15 de los 26.
8. **El pie no lleva el RIF, la dirección ni por qué le escribimos** (la meta de empresa formal, `PLAN.md` §0).
9. **El delivery en Guanare** recibe el mismo "fue enviado" que ZOOM y MRW.
10. **Tres cajas ámbar:** el código digital, el cobro a destino y el creador suspendido. Cerrado en C-226.

## 3. Lo que falta (19 correos)
Hoy esos momentos tienen solo el aviso dentro de la web, o nada.

**Prioridad 1 · Dinero (7)**
- Pago confirmado. Hoy solo el aviso de la web, y el cliente recibió "te avisaremos".
- Recarga de Puntos ES aprobada o rechazada a mano (`app/api/admin/transactions`). La automática sí tiene correo.
- "Tu pago pasó a tus Puntos ES" (`lib/pago-movil-sin-orden.ts`).
- Comisión de promotor acreditada (`lib/influencer-commission.ts`).
- "Sale a entregar en Guanare": el delivery local, con su texto propio.
- Un solo correo al comprar, en lugar de los dos del punto 2.
- La bienvenida, al verificar el correo.

**Prioridad 2 · Confianza (8)**
- Garantía recibida, con su código y lo que sigue (`app/api/customer/warranty`). Hoy solo hay correo de las novedades.
- Mensaje de contacto: el aviso de "recibimos tu mensaje" y la respuesta con la plantilla de la tienda. Hoy "Responder por correo" abre el correo del equipo (C-214).
- Presupuesto pedido y presupuesto aprobado (`app/api/cotizaciones`). Hoy solo avisan al equipo.
- Contraseña cambiada.
- Pedido de eliminar la cuenta recibido (`app/api/customer/settings`).
- Gift card, a quien la compró: "llegó a María" y "María la canjeó".
- Solicitud de producto: "la recibimos" y "¡ya llegó lo que pediste!".
- Listo para retirar. Hoy el retiro está apagado en Configuración.

**Prioridad 3 · Ventas (4)**
- Sorteo de la PlayStation 4: el boleto ganado, el recordatorio antes del 20/12, el resultado y el correo al ganador. Hoy al ganador se le escribe a mano.
- Descuento aprobado de la lista de deseos (`app/api/admin/discount-requests`).
- Promotor no aprobado, y "tu invitado compró".
- Curso aprobado, al creador.

**Para después (necesitan más que un correo):**
- **El carrito abandonado:** el carrito vive solo en el navegador.
- **"Tu factura":** desde el 19/04/2027, cuando Contabilidad tenga el medio (C-228 en adelante).
- **El resumen de Puntos ES.**

## 4. La entrega
- **SPF y DMARC en orden:** los correos salen por GoDaddy, con `p=reject`.
- **El peso:** cada correo de las maquetas pesa unos 17 KB. Gmail corta los de más de 102 KB.
- **Con las imágenes bloqueadas** (Outlook y los correos de empresa lo hacen por defecto) se lee entero: el título, los productos, los montos y los botones son texto.

## 5. El diseño elegido
Ver `PLAN.md` §7.2 (14/11) y `estado/C-219.md`. Las maquetas, hechas con dos productos publicados y los datos públicos de la tienda, se revisaron a 640 y 390 px, con y sin imágenes. Están fuera del repositorio.
