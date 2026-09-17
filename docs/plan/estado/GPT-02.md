# GPT-02 · Órdenes y entrega digital
Estado: HECHO — órdenes, entrega y acceso del cliente verificados
Rama: chatgpt/R1

## Inventario previo de acciones
Órdenes: 25 tipos de acción (sin contar duplicados de fila/modal ni instancias por pedido).
1. Buscar por orden, nombre o correo.
2. Filtrar estado (Todas, Pendientes, Confirmadas, Pagadas, En preparación, Enviadas, Entregadas).
3. Actualizar.
4. Abrir detalle.
5. Confirmar pedido.
6. Marcar pagado.
7. Comenzar preparación.
8. Abrir envío.
9. Completar digital.
10. Marcar entregado.
11. Abrir códigos digitales, con el mismo permiso de pago.
12. Abrir cancelación.
13. Imprimir (toast Próximamente existente).
14. Cerrar detalle / capa.
15. Abrir seguimiento externo.
16. Escribir notas administrativas.
17. Guardar notas.
18. Elegir transportista.
19. Escribir guía.
20. Escribir URL de seguimiento.
21. Escribir notas de envío.
22. Elegir fecha estimada.
23. Cancelar/cerrar envío y confirmar envío.
24. Escribir motivo de cancelación.
25. Volver/cerrar cancelación y confirmar cancelación (mínimo 10 caracteres).
Digital: 4 tipos: volver a órdenes; escribir código; escribir nota interna; enviar código al cliente. Estados disabled, permisos y destinos se conservan.

## Ampliación autorizada por Andrés durante la ronda
Rediseñar el raspado de códigos del cliente como una gift card con física e imagen de cada plataforma. Excepción al carril solicitada explícitamente por el usuario: `app/customer/(dashboard)/orders/[id]/digital/page.tsx` y sus `_components/` locales. No se edita el motor compartido ni la gift card existente.
Inventario previo del cliente (5 acciones): volver a pedidos; expandir/contraer producto; raspar (umbral de 40%); copiar código revelado (código y botón lateral); soporte `/contacto`. Se conserva la persistencia `revealed_order_${orderId}`, los fetch, las respuestas, los permisos, los toasts y el copiado existente.

## Jerarquía y diseño
La lista de órdenes enseña búsqueda, actualización y filtros antes de una fila de métricas compacta. Cada pedido muestra estado, cliente, fecha, monto completo y la siguiente acción visible a 360 px. El detalle ordena cliente/pago, notas, acciones, productos, envío y progreso; los modales ocupan el ancho móvil. En entrega digital del admin se compactó el encabezado y se mantuvo el formulario de código y nota.

En el acceso digital del cliente, cada código es una tarjeta con portada, reverso y lámina raspable. Usa la física de `createCardEngine` de la gift card existente sin modificar el motor. El logo ocupa el centro incluso cuando existe imagen de producto, que aparece como miniatura complementaria. Los colores oficiales pedidos por Andrés se aplican solo a estas tarjetas: Nintendo rojo, Steam azul oscuro, Roblox carbón, PlayStation azul, Xbox verde; también Netflix, Spotify y Apple. Son una excepción explícita a los tokens generales por identidad de marca. Hay brillo y profundidad, soporte para movimiento reducido, raspado por puntero y control accesible «Revelar sin raspar». La revelación original al 40 %, `localStorage`, copia, fetch, permisos y respuestas permanecen.

## Acciones después
Órdenes: las 25 acciones inventariadas siguen presentes. Los `fetch` (3), destinos `href` (3) y handlers (5) del archivo son los mismos que en `main`; la acción rápida confirma/avanza y la acción de detalle abre el mismo modal. Entrega admin: sus 4 acciones y fetch/cuerpos originales. Cliente: las 5 acciones originales, más «Voltear tarjeta» y «Revelar sin raspar» como accesos al mismo código; no hay ruta ni efecto de negocio nuevo.

## Verificación real
- `npx tsc --noEmit`: código 0, sin salida, tras el último ajuste móvil.
- ESLint de los cuatro TSX contra `main`: ningún problema nuevo. Órdenes: mismos 11 problemas preexistentes; entrega admin: mismos 10; acceso cliente: 12 → 10; componente nuevo: 0. El CSS y el HTML de vista previa no producen avisos de TypeScript/ESLint.
- Auditoría de contratos: sin fetch, href ni handlers originales retirados o cambiados (`/tmp/GPT-02-contracts.txt`). `git diff --check`: sin errores.
- `npm run build -- --webpack` con esquema de QA `rev10_demo`: compilación, TypeScript, prerender de 159 páginas y trazas completos, `EXIT:0`; salida `/tmp/GPT-02-build-final.txt`. El build normal con Turbopack tropieza en este worktree con el enlace de `node_modules` fuera de la raíz, registrado en GPT-01.
- Capturas reales en Firefox a 360, 768, 1024 y 1440 px: `/tmp/gpt-qa/GPT-02_admin_orders-{ancho}.png`, `GPT-02_admin_orders_<id>_digital-{ancho}.png`, `GPT-02_cliente-{ancho}.png`. En el acceso del cliente el `scrollWidth` coincidió con el ancho útil en los cuatro tamaños. El primer pase detectó una tarjeta recortada a 360 px; se corrigió el tamaño mínimo y se repitió build/capturas. En el reverso final la lámina y la instrucción se ven enteras.
- Interacciones reales: `/tmp/gpt-qa/GPT-02-admin-orders-before-action-360.png`, `GPT-02-admin-detail-1024.png`, `GPT-02-desktop-confirmed-1024.png`, `GPT-02-admin-cancel-390.png`, `GPT-02-cliente-reverso-360.png` y `GPT-02-cliente-revelado-360.png`. En el esquema demo, confirmar desde la tarjeta móvil y desde el modal de escritorio dejó ambas órdenes en `CONFIRMED`; cancelar con motivo dejó otra en `CANCELLED`; el raspado con puntero reveló el código y guardó su ID en `revealed_order_<orderId>`.
- Vista previa autónoma solicitada: `docs/plan/estado/GPT-02-preview.html`; cinco plataformas con códigos ficticios, volteo, raspado y botones de acceso. Capturas `/tmp/gpt-qa/GPT-02-preview-{360,768,1024,1440}.png` y `GPT-02-preview-back-360.png`; cinco tarjetas y cero desbordamiento horizontal.

## Notas
- Las órdenes/productos/códigos creados para QA en `rev10_demo` son temporales y se retiran después de registrar la verificación. No se tocaron datos de producción.
- PEDIDO: Claude, revisar el bloqueo del build Turbopack causado por el symlink de `node_modules` del worktree al integrar la rama.
