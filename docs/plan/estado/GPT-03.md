# GPT-03 · Transacciones, clientes y gift cards
Estado: HECHO — pantallas y acciones verificadas
Rama: chatgpt/R1

## Inventario previo de acciones
Transacciones (13): actualizar; exportar CSV; buscar; limpiar búsqueda; filtrar tipo; filtrar estado; abrir aprobación; cancelar/cerrar aprobación; confirmar aprobación; abrir rechazo; elegir motivo (incluido personalizado); escribir motivo personalizado; cancelar/cerrar o confirmar rechazo.
Clientes (22): abrir verificaciones; actualizar; buscar; abrir detalle; cerrar detalle/capa; pestañas Personal/Empresa/Estadísticas; abrir edición; abrir confirmación de eliminación; cancelar eliminación; confirmar eliminación; cancelar edición; guardar edición; cambiar a empresa; descargar acta; descargar RIF; editar nombre; correo; teléfono; WhatsApp; tipo de cliente; nombre de empresa/RIF; estado y notas de verificación. Las dos últimas entradas agrupan los campos del mismo bloque, sin retirarlos.
Gift cards (20): actualizar; abrir generación; abrir venta; buscar; filtrar estado; copiar código; abrir detalle; activar desde fila; cerrar creación; elegir monto predefinido; escribir otro monto; cantidad; generar lote; cerrar lote con aviso; imprimir hoja; cerrar venta; escribir código de venta; elegir método de pago; referencia; confirmar cobro/activación. En detalle se conservan cerrar, copiar y vender (mismas acciones con otro acceso).

## Jerarquía: antes → después
Transacciones: antes la tarjeta y tabla aparecían juntas en móvil y la tabla se salía; ahora hay un aviso de pendientes, búsqueda/filtros, tarjetas con aprobar/rechazar y luego métricas en móvil. A 1280 px pasa a tabla. El monto usa `formatUSD` y no queda pegado ni cortado por el signo; filtros y exportación conservan sus handlers. El primer «Aprobar» está visible antes de 850 px en la captura de 360 px.

Clientes: búsqueda antes de métricas, tarjetas hasta 1024 px y tabla desde 1280 px. El modal separa título, correo y pestañas para que a 390 px no se compriman. «Con órdenes activas» aclara el dato existente; no cambia el cálculo.

Gift cards: «Generar impresas» es la acción principal arriba, «Vender en caja» secundaria y actualizar tiene nombre accesible. Métricas deslizan en móvil; la tarjeta de lista muestra monto/saldo completos y acciones de copiar, activar y detalle. Tabla desde 1280 px. El lote recién generado presenta el anverso legible de la gift card; la tabla de código/PIN y el botón de impresión siguen igual, y la tarjeta aún se puede voltear.

## Inventario después
Transacciones 13/13, clientes 22/22 y gift cards 20/20 acciones y estados del inventario previo. No se modificaron URLs, cuerpos `fetch`, permisos, cálculos de saldo ni destinos. Comparación de contratos con `main`: transacciones fetch 4→4, handlers 5→5; clientes fetch 5→5, href 3→3, handlers 5→5; gift cards fetch 3→3, handlers 6→6. Sin ausencias.

## Verificación real
```text
npx tsc --noEmit: exit 0 (sin salida)
ESLint contra main:
  transactions: 4 problemas existentes → 2; nuevos 0
  customers: 7 → 7; nuevos 0
  gift-cards: 1 → 1; nuevos 0
npm run build -- --webpack (rev10_demo): EXIT:0
```
El build normal con Turbopack sigue bloqueado por el symlink de `node_modules` fuera de la raíz del worktree, ya documentado en GPT-01. Build definitivo: `/tmp/GPT-03-build-final.txt`. `git diff --check` sin errores.

Firefox real, datos del esquema `rev10_demo`: capturas `/tmp/gpt-qa/GPT-03_{transactions,customers,gift-cards}-{360,768,1024,1440}.png`. Las tres rutas terminaron sin desborde horizontal a las cuatro anchuras. Comprobación final del cambio de modo:
```text
transactions 1024: sw=1012 cw=1012 visibleTables=0 visibleMobileCards=1
customers    1024: sw=1024 cw=1024 visibleTables=0 visibleMobileCards=1
gift-cards   1024: sw=1024 cw=1024 visibleTables=0 visibleMobileCards=1
transactions 1440: sw=1428 cw=1428 visibleTables=1 visibleMobileCards=0
customers    1440: sw=1440 cw=1440 visibleTables=1 visibleMobileCards=0
gift-cards   1440: sw=1440 cw=1440 visibleTables=1 visibleMobileCards=0
```

Interacciones de QA: aprobar una recarga desde 360 px dejó su transacción en `COMPLETED` y acreditó $25,00 al saldo; rechazar otra desde escritorio con «Pago no encontrado» la dejó en `CANCELLED` con el motivo. CSV generó el aviso «CSV descargado». El detalle del cliente abrió a 390 px con las tres pestañas; tras el ajuste, el borde superior de pestañas quedó por debajo del título. Generar una impresa desde el modal móvil produjo una `INACTIVE` de $10,00 y otra de $25,00 en el pase final, ambas con código/PIN mostrados en el lote. Capturas adicionales: `/tmp/gpt-qa/GPT-03-approve-modal-360.png`, `GPT-03-reject-modal-1024.png`, `GPT-03-customer-detail-final-390.png`, `GPT-03-gift-create-390.png`, `GPT-03-gift-batch-final-390.png`.

## Notas y PEDIDOS
- Las transacciones, tarjetas y notificaciones temporales de QA se eliminan del esquema demo y el saldo del cliente de prueba se restaura al valor previo (`0`), tras capturar el último pase.
- PEDIDO: Claude, resolver el symlink de dependencias del worktree para habilitar Turbopack al integrar la rama. No se instala nada desde este carril.
