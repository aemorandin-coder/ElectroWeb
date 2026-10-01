# Revisión final con Andrés (C-40)

Cómo: en el teléfono real y en DevTools a **360 · 768 · 1024 · 1440 px**, con el deploy del 26/09 ya hecho. Marca cada punto; lo que falle se anota abajo con el ancho y una captura.

## Tienda
- [ ] **Inicio (360):** el primer pantallazo muestra al menos un producto con precio y "Agregar".
- [ ] **Inicio (todos):** la sección Ofertas aparece si hay una oferta activa.
- [ ] **Header:** "Ofertas" en la barra (1024+) y en "Más" del teléfono. Abre el catálogo con "Solo ofertas".
- [ ] **Tarjeta en oferta:** precio rebajado, precio anterior tachado, "-X %", "Ahorra $X", nombre de la oferta y "Termina…" solo si faltan menos de 7 días.
- [ ] **Ficha:**
  - Precio, oferta y cupón público con "Aplicar cupón".
  - Al tocarlo dice "Aplicado".
  - En el teléfono, la barra fija de compra no tapa el cupón al subir.
- [ ] **Carrito:**
  - Precio tachado por producto y "Ahorras $X con las ofertas de hoy".
  - "¿Tienes un cupón?" cerrado; al aplicarlo muestra si sirvió y cuánto.
- [ ] **Checkout:** "Descuento (cupón X)" en el resumen. El total cobrado es igual al que se ve.
- [ ] **Compra con cupón:** el mismo cupón no sirve dos veces para el mismo cliente. Si se cancela la orden, vuelve a servir.
- [ ] **Favoritos:** "Bajó X % desde que lo guardaste", orden "Mayor rebaja" y ningún botón de "pedir descuento".
- [ ] **Reseñas:** sin una orden entregada del producto, el formulario lo explica y el servidor lo rechaza.

## Cliente
- [ ] **Recargar Puntos ES sin haber firmado:** abre la firma y el servidor no deja recargar.
- [ ] **Firma con el dedo:**
  - El trazo sale donde toca el dedo y la página no se mueve.
  - Un punto no sirve como firma.
  - Al terminar, "Descargar PDF".
- [ ] **Mis documentos:** lo firmado con su PDF y lo pendiente con "Leer y firmar".
- [ ] **PDF:** texto completo con acentos, tus datos, la firma y la huella.
- [ ] **Puntos ES (C-139):**
  - Historial con "Cargar más" y filtros. "Ver el pedido" abre ese pedido.
  - Una recarga por confirmar sale con su aviso y sin sumar. Una rechazada muestra el motivo.
  - "Eliminar" la cuenta con Puntos ES: dice cuántos tiene, que se pierden, y pide marcar la casilla.
- [ ] **Mi perfil → Seguridad (C-140):** cada sesión con su dispositivo y "Cerrar".
- [ ] **Menú del panel (360):**
  - Cerrado, Tab no entra al menú.
  - Abierto, Tab queda dentro.
  - Escape lo cierra.

## Panel
- [ ] **Reportes:**
  - Cada número dice de dónde sale.
  - Seguridad muestra tus inicios de sesión y los fallidos con IP. Filtros: alertas, accesos, precios, aprobaciones y configuración.
- [ ] **Descuentos:**
  - Crear una oferta del 10 % en una categoría: la tienda la muestra en menos de 1 minuto.
  - Crear un cupón de $5 desde $30, público y de 1 uso por cliente.
  - Pausar la oferta: el precio vuelve.
- [ ] **Legal:**
  - Firmas con "Ver" (imagen y huellas), PDF y "Pedir firma de nuevo" con motivo (la firma no se borra).
  - "Nueva versión" con vista previa.
- [ ] **Productos:**
  - Casillas, barra de selección (Activar, Desactivar, Precio, Categoría, Más cambios, Eliminar).
  - Precios en USD y Bs. "Destacado" solo en activos.
  - Edición rápida con campos. "Duplicar" abre la copia en borrador.
  - El estado Activo/Borrador se guarda (recarga y sigue igual).
- [ ] **Métodos de pago:** activar uno sin datos dice qué falta.
- [ ] **Categorías:** borrar una con productos lo explica. No deja poner una categoría como madre de su hija.
- [ ] **Reseñas en el menú,** con su número de pendientes.
- [ ] **Consultas:** mensajes y solicitudes. Marcar una solicitud "Cumplida" le llega al cliente como aviso.

## Seguridad (antes de dar por cerrado)
- [x] `SADES_WEBHOOK_SECRET` y la cuenta `masteradmin@electroshopve.com`: revisado en producción el 26/09, no había nada que cambiar (`SIGUIENTE.md` §4).
- [ ] **Dos pasos (C-141):** entrar al panel pide el código de la app. Un código de respaldo sirve una sola vez.
- [ ] **Equipo (C-141):** todas las cuentas con "Dos pasos activos" o sin acceso. Un Administrador no ve Configuración, Métodos de Pago ni Equipo.
- [ ] **Una sola sesión de admin (C-140):** entrar en el teléfono cierra la de la computadora.

## Anotaciones
| Punto | Ancho | Qué pasa |
|---|---|---|
| | | |
