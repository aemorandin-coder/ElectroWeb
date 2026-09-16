# Auditoría de Marketing y Contenido (C-75) · 2026-09-16

`/admin/marketing`: una página de 1.118 líneas con 6 pestañas, más `SocialMediaGenerator` (869), `EmailSettingsPanel` (525) y 7 APIs.

## Mapa: qué hace cada pestaña y qué pasa en la tienda

| Pestaña | Qué hace hoy | Efecto real | Estado |
|---|---|---|---|
| **Influencers** | Crear promotores con código, ver sus conversiones y aprobar comisiones | El enlace `/registro?ref=CÓDIGO` deja una cookie de 30 días; al registrarse el cliente queda asociado; compras y recargas generan comisión pendiente; aprobar acredita saldo al promotor | Funciona, **con errores de dinero** (abajo) |
| **Publicidad** | Imagen del popup del home, enlace, sombra y fondo | Popup del home (C-23/C-23b) | Funciona |
| **Email** | Muestra "estado del servicio" y envía un correo de prueba | Nada más: **no hay forma de enviar una campaña** | El estado que muestra es **falso**: lee variables de entorno, pero el correo se envía con la configuración de la base de datos |
| **Plantillas** | Vista previa de 12 plantillas | Ninguno | **Es una copia de las plantillas** (471 líneas), no las que se envían de verdad: la vista previa puede no parecerse al correo real. Año fijo en 2024 |
| **Redes Sociales** | Genera imágenes para historias de Instagram a partir de un producto, con textos por IA | Descarga un PNG | **La clave de Gemini se guarda en el navegador** (`localStorage`) y se llama a Google desde el cliente; el modelo `gemini-1.5-flash` ya no existe, así que la IA falla. La API `/api/admin/social/generate` no la usa nadie |
| **Configuración** | Datos del servidor de correo (SMTP): proveedor, usuario, contraseña, remitente, límites | Es la configuración con la que salen **todos** los correos de la tienda | No es de Marketing. `marketingEnabled`, `notificationsEnabled`, `dailyLimit` y `sentToday` **no hacen nada**: el envío mira otras variables |

## Errores encontrados

### Dinero (comisiones de promotores)
1. **Doble comisión.** Un cliente referido que recarga $50 y luego compra con ese saldo genera comisión por la recarga **y** por la compra: el promotor cobra dos veces sobre el mismo dinero.
2. **Comisión de órdenes sin pagar.** La comisión de compra se crea al **crear** la orden, aunque sea un pago móvil sin confirmar que después se cancela. Cancelar no la rechaza.
3. **Al aprobar no se ve de dónde viene.** El panel no muestra la orden ni si se pagó o se canceló, así que se aprueban a ciegas.
4. **Doble aprobación.** `approveConversion` lee el estado fuera de la transacción: dos clics rápidos acreditan la comisión dos veces.
5. **Aprobar no comprueba el promotor:** con el id de una conversión se aprueba aunque sea de otro promotor.
6. Editar un promotor acepta cualquier % de comisión y cualquier estado. Borrarlo **borra su historial de comisiones** (también las ya pagadas).

### Correos
7. **Privacidad: todos los clientes en "Para".** La API de campañas (`POST /api/admin/email`, tipo `marketing`) manda **un solo correo con todos los destinatarios en el campo Para**: cada cliente vería el correo de todos los demás. Hoy ningún botón la llama, pero la API está abierta a cualquier admin.
8. **Sin consentimiento ni baja.** Esa API envía a **todos** los usuarios, aunque existe la preferencia `emailPromotions` (desactivada por defecto) y no hay enlace para darse de baja.
9. **Imágenes que no cargan.** La plantilla usa el logo de Configuración tal cual (`/uploads/…`, ruta relativa): en Gmail u Outlook no carga. Tampoco hay forma de subir imágenes para una campaña. Por eso "no se pueden enviar imágenes".
10. **Encabezado que puede quedar en blanco.** Usa `linear-gradient`, que Outlook no pinta: el texto blanco de la cabecera queda sobre blanco.
11. `tls.rejectUnauthorized: false` en el SMTP: la conexión con el servidor de correo no verifica el certificado.
12. La contraseña SMTP se guarda en texto plano.
13. Emojis en el pie de todos los correos (📞 ✉️), contra la regla del proyecto (C-76).

### Código y diseño
14. Página sin título; 6 pestañas en un solo archivo; colores sueltos, `animate-pulse` infinito en "ACTIVO", `window.location.origin` evaluado fuera del componente.
15. Permisos mezclados: unas APIs piden rol `ADMIN`/`SUPER_ADMIN`, otras `MANAGE_USERS`, `MANAGE_CONTENT` o `VIEW_DASHBOARD`.
16. El contador del menú de solicitudes de creador colgaba de Marketing (ya movido a "Creadores" en C-82).

## Propuesta de rediseño
Secciones por tarea, un archivo por sección, recetas de `lib/admin-ui` y zod en las APIs:
1. **Promotores**: lista, detalle con conversiones y su orden, aprobar o rechazar con transacción segura.
2. **Popup del home**: lo mismo de hoy, más compacto, con vista previa.
3. **Campañas de correo** *(nuevo)*: redactar con imágenes subidas, vista previa real, prueba a un correo, envío solo a quienes aceptaron promociones, uno por uno con enlace de baja y en lotes.
4. **Plantillas**: la vista previa de las plantillas **reales**.
5. **Redes sociales**: generador de imágenes; IA desde el servidor o sin IA.
6. **Servidor de correo** (SMTP): pasa a Configuración.
