# GPT-04 · Reportes
Estado: HECHO — reportes y controles verificados
Rama: chatgpt/R1

## Inventario previo de acciones
8 controles: elegir pestaña Resumen, Productos, Interacciones, Seguridad y Referidos (5); cambiar período 24h/7d/30d/90d/1y; actualizar el reporte visible; exportar el CSV de la pestaña/período visibles. Interacción adicional: tooltips de los gráficos. Son dos fetch originales: reporte por `period` y `activeTab`, usuarios en vivo cada 30 segundos.

## Jerarquía: antes → después
El bloque «En vivo ahora» y las rutas completas dominaban la primera pantalla: ahora abre con título, pestañas desplazables con indicación, período/actualizar/exportar y el total de ingresos. La actividad en vivo queda como tarjeta compacta al final y las rutas siguen disponibles en «Ver rutas activas». Los cuatro indicadores principales conservan sus valores; ingresos ocupa una fila completa en móvil, sin pisarse con el icono. Fechas de los gráficos en `d MMM`, etiquetas de 11 px con token de contraste y altura menor en móvil. Interacciones y Seguridad dejan de anidar tarjetas grises dentro de tarjetas blancas. Referidos usa una columna por monto a 390 px para mostrarlos enteros.

## Inventario después
Los 8 controles previos conservan sus handlers, datos y destinos. Se suma solo el desplegable «Ver rutas activas» para el contenido en vivo. Comparación de contratos con `main`: fetch 2→2, handlers 3→3, href 0→0, ausencias 0. Los `fetch` de reportes/usuarios en vivo, la exportación de cada pestaña y los cálculos permanecen iguales.

## Verificación real
```text
npx tsc --noEmit: exit 0 (sin salida)
ESLint reports/page.tsx contra main: 5 problemas existentes → 5; nuevos 0
npm run build -- --webpack (rev10_demo): exit 0
```
La compilación final quedó en `/tmp/GPT-04-build-final.txt`; Turbopack sigue bloqueado por el symlink de dependencias del worktree, como en GPT-01. `git diff --check` sin errores.

Firefox real con datos del esquema demo: `/tmp/gpt-qa/GPT-04-reports-{360,768,1024,1440}.png`, `/tmp/gpt-qa/GPT-04-products-390.png`, `/tmp/gpt-qa/GPT-04-interactions-1440.png`, `/tmp/gpt-qa/GPT-04-referrals-390.png` y `/tmp/gpt-qa/GPT-04-referrals-routes-390.png`. A 360/768/1024/1440 px, `scrollWidth === clientWidth` (348/756/1012/1428 px). Referidos a 390 px: 378=378; ningún monto cortado. La lista de pestañas incluye Resumen, Productos, Interacciones, Seguridad y Referidos. Cambiar período a 30 días disparó `/api/admin/reports?period=30d&type=overview` y al pasar a Productos `/api/admin/reports?period=30d&type=products`. Exportar desde Productos creó la descarga `reporte-products-7d.csv` (interceptado en Firefox); el contenido de la pestaña se mantuvo visible. «Ver rutas activas» abre y muestra las cuatro rutas originales. Captura visual de primera pantalla: ingreso y gráficos sin superposición.

## PEDIDO
- Claude: revisar el aviso CSS del build `z-[var(--z-*)]` generado al optimizar estilos. No impidió compilar y aparece fuera de `reports/page.tsx`.
