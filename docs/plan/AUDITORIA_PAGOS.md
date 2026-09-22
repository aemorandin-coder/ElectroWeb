# Auditoría de métodos de pago (C-101, 22/09)

Pedido de Andrés (22/09, con captura del panel): "Métodos de pago no está construido correctamente: no puedo crear mi Binance Pay con correo ni pasarelas de pago directas".
Solo lectura: no se cambió código. Es el plan para decidir.

## 1. Cómo funciona hoy
- **Métodos de pago** (`app/admin/(dashboard)/payments/page.tsx`, 1.083 líneas; API `app/api/admin/payments/route.ts`) guarda cuentas de la empresa en `CompanyPaymentMethod`.
- **El cliente no paga pedidos con esos métodos.** El checkout cobra **siempre con saldo** (`finalPaymentMethod = 'WALLET'`). Los métodos solo sirven para **recargar saldo** (`components/modals/RechargeModalV2.tsx`): el cliente paga fuera de la web y el equipo aprueba la recarga en Transacciones. Pago Móvil del BDV se aprueba solo (`/api/pago-movil/verificar`).
- El servidor de órdenes **ya acepta** Pago Móvil verificado por el BDV (`contexto: 'ORDER'`) y `CheckoutPagoMovilForm` existe, pero el checkout no lo muestra (el import quedó sin uso).

## 2. Hallazgos
| # | Gravedad | Qué pasa | Dónde |
|---|---|---|---|
| P1 | **Bloquea** | **No existe el tipo Binance.** El enum tiene `BANK_TRANSFER, MOBILE_PAYMENT, ZELLE, ZINLI, PAYPAL, CRYPTO, CASH, MERCANTIL_PANAMA, OTHER`. "Criptomonedas" pide wallet y red, no correo ni Pay ID. Por eso tu Binance quedó guardado como **PayPal**. | `prisma/schema.prisma` `PaymentMethodType` |
| P2 | **Bloquea** | **Al cambiar de tipo, los campos del tipo anterior se quedan.** Tu "Binance" guarda "Banco Mercantil Panamá" de antes y la tarjeta lo muestra. | `payments/page.tsx` (formulario) |
| P3 | **Bloquea** | **El guardado no valida nada** y responde "Error al guardar" sin decir qué. Un tipo desconocido o un monto vacío (`""` en un Decimal) revienta en la base con 500. El PATCH copia el body entero a la fila. | `app/api/admin/payments/route.ts` |
| P4 | **Seguridad** | `GET /api/admin/payments` tiene la verificación de permiso **comentada**: cualquier cuenta con sesión ve todos los métodos, también los inactivos. | `app/api/admin/payments/route.ts:11-13` |
| P5 | **Seguridad** | La API que lee el cliente devuelve la fila completa, incluidas las **"Instrucciones (internas)"**. | `app/api/customer/company-payment-methods/route.ts` |
| P6 | Datos | El modal de recarga elige el método **por tipo**, no por id: dos métodos del mismo tipo (dos Pago Móvil, o Binance y PayPal guardados como PayPal) chocan y siempre gana el primero. | `RechargeModalV2.tsx` ~l.478, 537 |
| P7 | Datos | La recarga acepta cualquier texto como método (no comprueba que exista ni que esté activo). Mínimo y máximo por método no se piden en el panel ni se aplican. | `app/api/customer/balance/recharge/route.ts`, modelo `minAmount/maxAmount` |
| P8 | Datos | "Titular" (`holderName`) no se puede escribir en el panel; Zelle y PayPal lo necesitan. Mercantil Panamá no tiene campos propios. | `payments/page.tsx` |
| P9 | Diseño | Pantalla sin la anatomía del panel (era GPT-12, sin hacer): los 3 contadores ocupan la primera pantalla, colores de marca con hex, sin "así lo ve el cliente" ni botón de copiar. | `payments/page.tsx` |

## 3. Pasarelas directas: qué se puede automatizar
| Método | ¿Verificación automática? | Qué hace falta |
|---|---|---|
| **Pago Móvil BDV** | **Sí, ya construida** (API de Conciliación BDV: `BDV_API_KEY`, `BDV_TELEFONO_COMERCIO`) | Mostrarla en el checkout como "Pagar directo": la orden nace pagada al verificar. |
| **Binance Pay (comercio)** | Sí: [API de comercios](https://developers.binance.com/docs/binance-pay/introduction). Se crea la orden de pago, el cliente paga con QR o en la app, y un [webhook firmado](https://merchant.binance.com/en/docs/functionalities/webhooks) avisa. | **Cuenta de comercio de Binance con KYB** (Binance ya no da cuentas de comercio a personas; Electro Shop Morandin C.A. califica). API key y secret. |
| **Binance Pay (personal: correo o Pay ID)** | No: Binance no da API para verificar pagos recibidos en una cuenta personal. | Pago con comprobante (referencia y captura) y aprobación del equipo. |
| Zelle, Zinli, Mercantil Panamá, Transferencia | No hay API pública de verificación | Pago con comprobante. |
| PayPal | Sí con PayPal Checkout (cuenta Business y webhook) | Depende de que la cuenta pueda recibir pagos desde Venezuela. |

## 4. Propuesta: C-101 · Métodos de pago bien hechos y pago directo
**Fase 0: arreglar lo roto (primero, sin tocar el checkout).**
1. P4 y P5: permiso en el GET del panel; el cliente recibe una lista blanca (sin instrucciones internas ni inactivos), ordenada por `sortOrder`.
2. P1 (migración, con tu OK): tipo nuevo **`BINANCE_PAY`** con correo, **Pay ID** (columna nueva `payId`) y QR.
3. P2 y P3: validación con zod **por tipo** en el servidor, con los campos que exige cada uno:
   - Pago Móvil: banco, teléfono y cédula/RIF.
   - Transferencia: banco, cuenta de 20 dígitos, titular y cédula/RIF.
   - Zelle, PayPal y Zinli: correo y titular.
   - Binance Pay: correo o Pay ID.
   - Cripto: wallet y red.
   - Lo que no es del tipo se borra al guardar, y el error dice qué campo falta.
4. P6 y P7: la recarga elige y envía el **id** del método; el servidor comprueba que esté activo y dentro de su mínimo y máximo.
5. Corregir tu "Binance" guardado como PayPal (un `UPDATE` con tu OK, después de la migración).

**Fase 1: pago directo en el checkout** (hoy todo pasa por el saldo).
- Pago Móvil BDV: la orden queda pagada al verificar (el servidor ya lo soporta).
- Métodos manuales (Binance personal, Zelle, Zinli, Transferencia, Mercantil Panamá):
  - La orden queda "Pendiente de pago" con la referencia y la captura.
  - El equipo la confirma en Órdenes con "Marcar pagado", que ya descuenta stock y avisa.
  - **La reserva de stock dura hoy 5 minutos**: para un pago manual hay que alargarla (decisión D-P2).

**Fase 2: pasarelas automáticas.**
- Binance Pay para comercios: crear orden, QR o enlace, webhook firmado y orden pagada sola.
- PayPal Checkout, si la cuenta lo permite.
- Credenciales en variables de entorno, nunca en la base.

**Fase 3: rediseño de la pantalla** (ex GPT-12, fila 17 de `PLAN_CLAUDE.md`):
- Lo activo arriba.
- Formulario por tipo con solo sus campos.
- Vista "así lo ve el cliente" con botón de copiar.
- Logos oficiales en `public/images/payments/` en vez de hex.

## 5. Decisiones de Andrés
| # | Decisión | Opciones |
|---|---|---|
| D-P1 | ¿Pago directo en el checkout? | Sí (recomendado): el cliente elige "Pagar con saldo" o "Pagar directo". O seguir solo con saldo. |
| D-P2 | Pagos manuales: ¿cuánto se aparta el stock? | 2 h, 24 h, o sin apartar (se descuenta al confirmar y puede agotarse). |
| D-P3 | Binance | Cuenta personal (correo o Pay ID, verificación manual) o de comercio (KYB, automática). |
| D-P4 | Migración | Tipo `BINANCE_PAY`, columna `payId` y el id del método en cada recarga. Solo agrega. |
