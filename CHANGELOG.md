# Cambios de ElectroShopVe

Cada versión que se sube a producción tiene su número, su etiqueta de git (`v1.0.0-rc.1`) y su entrada aquí. El detalle de cada tarea está en `docs/plan/estado/C-XX.md` y lo subido, con su SQL y sus pruebas, en `docs/plan/HISTORIAL.md`.

## Cómo se numera (MAYOR.MENOR.PARCHE)
- **MAYOR** (2.0.0): algo que ya funcionaba deja de funcionar igual para los clientes o para quien se conecta a la tienda: cambian direcciones públicas (`/productos/...`), el feed de productos o la API pública, una regla de negocio de `docs/plan/PLAN.md` §7, o un cambio de base borra o renombra datos.
- **MENOR** (1.1.0): algo nuevo que no rompe nada. Las tablas y columnas nuevas entran aquí.
- **PARCHE** (1.0.1): arreglos, textos y ajustes internos, sin funciones nuevas.
- **`-rc.N`** (candidata): la tienda ya vende pero falta cerrar la revisión final (`docs/plan/REVISION_FINAL.md`, en especial el dinero). `1.0.0` es la primera versión sin ese pendiente.
- Un bloque de deploy = una versión. `package.json`, esta lista y la etiqueta se actualizan en el mismo commit que arma el bloque. En el servidor, `git describe --tags` dice cuál está corriendo.

## [1.0.0-rc.1] - 2026-10-02
Primera versión numerada. Resume todo lo hecho desde el 03/12/2025 (más de 130 tareas).

### Tienda
- Inicio vitrina, catálogo con filtros y buscador por relevancia (sin acentos, por SKU y código de barras), ficha con confianza junto al botón de compra, ofertas, cupones, cinta ES, productos usados y reacondicionados, reseñas solo de quien compró, favoritos con aviso de rebajas, catálogo legible para Google, Meta y las IA (`sitemap`, `llms.txt`, `feed/productos.xml`).
- Carrito y checkout con todos los métodos de pago: Puntos ES, Pago Móvil que verifica solo, métodos manuales con reserva, pago mixto, gift cards y cupones. Precios, totales, envío, impuestos y dueño de la orden se calculan siempre en el servidor.
- Envíos con ZOOM y MRW (oficinas, cobro a destino, rastreo), retiro en tienda y embalaje según el paquete.
- Cotizaciones para empresas e instituciones con retención del IVA, envío por correo y "Mis cotizaciones".
- Páginas legales (términos y privacidad) editables desde el panel, con firma de documentos y PDF con huella.

### Panel del cliente
- Resumen, mis pedidos, Puntos ES con historial y recargas, direcciones, perfil con sesiones por dispositivo, documentos firmados, garantías y avisos por correo (incluido el que pide la reseña).

### Panel del administrador
- Dashboard de trabajo, pedidos y pedidos digitales, productos con asistente de búsqueda en la web, carga masiva, ofertas, marketing y campañas, reportes, notificaciones por panel, correo y Telegram.
- Roles (dueño y administrador), equipo por invitación, **verificación en dos pasos obligatoria**, bitácora de seguridad y límites de intentos.

### Seguridad y operación
- Datos públicos con listas blancas (nunca objetos crudos de la base), IP real, modo mantenimiento, captcha, cabeceras de seguridad (sin `X-Powered-By`), `deploy.sh` sin cortes y crons del servidor (favoritos, envíos, reseñas, respaldos).
- **Respaldos automáticos cifrados a Google Drive** (C-165): base cada día, fotos y constancias los domingos, comprobación de integridad, retención, aviso si fallan y restauración con clave privada fuera del servidor.

### Antes de llegar a 1.0.0
- Revisión final de dinero en el teléfono real (compra con Pago Móvil y con Puntos ES, recarga, cupón y cancelación).
- Subir y probar el respaldo en producción, con una restauración de prueba.
- Abogado (términos y privacidad) y contador (IVA de digitales y retención): ver `docs/plan/SIGUIENTE.md` §3.
