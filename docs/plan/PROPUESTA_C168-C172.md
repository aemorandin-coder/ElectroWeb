# Propuesta C-168 a C-172: versiones, trabajo en equipo, Dashboard a tu gusto y Destacados

> **Estado: APROBADA POR ANDRÉS el 02/10 ("Ejecuta el plan").** Andrés no respondió las preguntas una por una: se toman como decididas las propuestas de la sección 1 (P1 a P7). En el mismo mensaje pidió sumar **C-173 · Reportes en vivo** (sección 6b). Avance: ver `PLAN_CLAUDE.md` y cada `estado/C-XX.md`.
> Escrita por Claude (Opus 5.5) el 02/10/2026 a partir del pedido de Andrés del mismo día. La ejecuta **Claude Sonnet 5.5**, con las reglas de siempre (`CLAUDE.md`): una rama `claude/C-XX` por tarea, commits `[C-XX]`, estado en `docs/plan/estado/C-XX.md`, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día, y el merge y el push al terminar y verificar.
> Cuando Andrés apruebe: las tareas pasan a `PLAN.md` §5.2 y sus decisiones a §7.2. Este archivo queda como la especificación que citan los estados.

## 0. El pedido de Andrés y qué responde cada tarea

| # | Pedido (02/10) | Tarea | Lote |
|---|---|---|---|
| 1 | Versionar el panel y cada módulo por separado (ElectroStudio, Cursos, Configuración…) para saber qué está corriendo | **C-168** Versiones por módulo y aviso de versión nueva | A |
| 2 | Dos admins: Andrés editaba un producto 20 minutos, Luis lo borró y el trabajo se perdió sin aviso. Pasa en promotores, configuración y todo el panel | **C-169** Productos sin pérdidas (borrador, papelera, conflicto, presencia) y **C-170** lo mismo en el resto del panel | A y B |
| 3 | Un Dashboard más vivo, con widgets que se agregan y se quitan como el panel rápido de Samsung One UI; los necesarios siempre están | **C-171** Dashboard a tu gusto | C |
| 4 | En Destacados del inicio, que el grande rote con el pequeño que le sigue | **C-172** Destacados que rotan | C |

**Orden:** C-168 → C-169 → C-170 → C-172 → C-171. C-168 va primero porque es corta y desde ella cada tarea sube la versión del módulo que toca; C-169 ataca el dolor real (trabajo perdido).
**Lotes de deploy:** un lote = un bloque en `SIGUIENTE.md` y una versión (`1.0.0-rc.4`, `rc.5`, `rc.6`). Si Andrés todavía no subió el anterior, el bloque nuevo lo incluye (regla del bloque único).

### Lo que ya está bien (no se rehace)
- **Las aprobaciones de dinero ya son a prueba de doble clic entre dos admins**: `app/api/admin/transactions/route.ts` toma la transacción con `updateMany` condicional (`claimed`), y las solicitudes de promotor también (`app/api/influencers/solicitudes/[id]/route.ts`). C-170 lo comprueba en las demás, pero no se espera un hueco de dinero.
- **Configuración ya guarda solo los campos cambiados** (`buildPatch(form, initial)` en `app/admin/(dashboard)/settings/page.tsx`): dos admins en secciones distintas no se pisan. Lo que falta es avisar cuando tocan el mismo campo (C-170).
- **El canal en vivo ya existe** (C-127): SSE en `app/api/realtime/route.ts` con un bus en memoria (`lib/realtime/bus.ts`), suficiente porque la tienda corre en **un solo proceso** de PM2. La presencia y los avisos entre admins se montan encima, sin Redis ni WebSockets.

### Lo que se encontró al revisar (causa del pedido 2)
- `PATCH /api/products/[id]` sobrescribe el producto entero con lo que manda el asistente: **gana el último que guarda**, sin comprobar si alguien lo cambió en medio.
- `DELETE /api/products/[id]` **borra de verdad** (y con él reseñas, favoritos y códigos digitales sin vender) si el producto no tiene órdenes. No hay papelera ni deshacer.
- Si el producto se borró mientras se editaba, al guardar sale "Producto no encontrado" y el formulario solo vive en la memoria de la pestaña: **al recargar, se pierde todo**.
- La edición de un producto **no queda en la bitácora** (solo el cambio de precio, `PRODUCT_PRICE_CHANGED`): hoy no se puede saber quién cambió qué.

---

## 1. Decisiones (tomadas el 02/10 con la propuesta de Claude; Andrés las cambia cuando quiera)

| # | Pregunta | Propuesta de Claude |
|---|---|---|
| P1 | ¿Cuántos días queda algo en la **papelera** antes de borrarse para siempre? | **30 días.** |
| P2 | ¿Quién **vacía** la papelera (borrar para siempre)? | **Solo el dueño (Super admin).** El Administrador mueve a la papelera y restaura. |
| P3 | Si Luis quiere borrar algo que Andrés **está editando en ese momento**: ¿se bloquea o se avisa? | **Se avisa y se pide confirmar** ("Andrés lo está editando ahora mismo. ¿Moverlo a la papelera igual?"). Con la papelera ya no hay pérdida. |
| P4 | Destacados: ¿qué variante? (detalle en C-172) | **A + B juntas:** la estrella cambia cada día sola, y en computadora rota en pantalla una vuelta completa y se detiene. |
| P5 | Dashboard: ¿se pueden agregar dos librerías solo para el panel (`motion` para las animaciones y `@dnd-kit` para arrastrar)? No pesan en la tienda. | **Sí.** Sin ellas, arrastrar con el dedo en el teléfono queda frágil. |
| P6 | Widget "Meta del mes": el monto lo escribe Andrés en el panel y se guarda en la base (nunca en el repositorio, que es público). ¿Lo ve también el Administrador? | **Solo el dueño**, como Configuración. |
| P7 | La versión de cada módulo, ¿la ve todo el equipo o solo el dueño? | **Todo el equipo** (sirve para que Luis diga "estoy en Productos 1.2.0" al reportar un fallo). |

---

## 2. C-168 · Versiones por módulo y aviso de versión nueva (Lote A, MENOR)

**Para qué:** que en cualquier pantalla del panel se sepa qué versión está corriendo, de todo el panel y de ese módulo, y que nadie trabaje sin saberlo en un panel viejo después de un deploy.

**Criterio (importante):** el panel es **un solo programa** (un `next build`): todos los módulos se suben juntos. La versión de un módulo no dice "qué se subió" sino **"en qué versión del sistema cambió ese módulo por última vez"**. La verdad de lo que corre sigue siendo la etiqueta de git (`v1.0.0-rc.N`) y el commit; la versión del módulo dice si ese módulo cambió en el último deploy.

### Qué se construye
1. **Registro de módulos** `lib/modulos.ts`: una lista con `id`, `nombre`, `version` (semver), `desde` (la versión del sistema en que cambió por última vez), `tarea` (la última `C-XX` que lo tocó) y `rutas` (patrones de archivos que le pertenecen). Módulos iniciales, todos en `1.0.0` con `desde: '1.0.0-rc.4'`:
   - Marco del panel (layout, menú, sesión, campana), Dashboard, Órdenes y pagos, Productos (productos, categorías, importar), Ofertas y cupones, Marketing (campañas, plantillas, popup), Promotores, ElectroStudio, Cursos (cursos y creadores), Servicios, Cotizaciones, Clientes (clientes, verificaciones, gift cards), Reportes y seguridad, Configuración (settings, respaldos, métodos de pago, equipo, legal), Tienda (lo público) y Checkout y Puntos ES.
   - Sonnet arma las `rutas` exactas recorriendo `app/admin/(dashboard)/**`, `app/api/**`, `components/**` y `lib/**`. Un archivo compartido (`lib/auth-helpers.ts`, `lib/admin-ui.ts`) cuenta para "Marco del panel".
2. **Datos del build**: `scripts/info-build.mjs` corre en `prebuild` y escribe `lib/generated/build-info.json` (en `.gitignore`) con la versión de `package.json`, `git describe --tags --always --dirty`, el commit corto y la fecha del build. Si el servidor no tiene git a mano, cae a la versión de `package.json` sin romper el build. Comprobar que `scripts/deploy.sh` corre `npm run build` (y por lo tanto `prebuild`).
3. **Dónde se ve:**
   - Pie del menú lateral: `v1.0.0-rc.4 · a1b2c3d · 02/10 18:40` (texto `text-xs text-muted`).
   - En el encabezado de cada pantalla, una etiqueta discreta con el módulo: "Productos 1.1.0". Un toque abre "Qué cambió en Productos" (las entradas de ese módulo en el historial).
   - Página nueva **Panel → Versiones** (`/admin/versiones`): tabla de módulos con versión, desde qué versión del sistema, última tarea, y el resumen de lo que cambió. Arriba, la versión del sistema, el commit y la fecha del build.
4. **"Hay una versión nueva del panel"**: `GET /api/admin/version` (solo equipo, `force-dynamic`) devuelve el identificador del build. El cliente lo compara con el suyo al reconectar el SSE (un deploy reinicia el proceso y el SSE reconecta solo), al volver a la pestaña y cada 10 minutos. Si cambió, una franja arriba: "El panel se actualizó a v1.0.0-rc.5. Recarga para usar la versión nueva. Lo que estás editando se guarda en este navegador (C-169)". **No recarga sola.**
5. **"Qué hay de nuevo"** (idea extra): la primera vez que cada admin entra después de un deploy, un aviso cerrable con los módulos que cambiaron y una línea de cada uno. Se marca como visto por admin (columna o tabla pequeña; si es tabla nueva, aditiva).
6. **Regla para los próximos commits** (actualizar `CLAUDE.md` regla 2 y `CHANGELOG.md` "Cómo se numera"):
   - Cada tarea que toca archivos de un módulo sube su versión en `lib/modulos.ts` con la misma regla MAYOR.MENOR.PARCHE.
   - `CHANGELOG.md` agrupa cada versión por módulo: `### Productos 1.1.0 (C-169)`.
   - `npm run check:modulos` (`scripts/revisar-modulos.ts`): compara `git diff main...HEAD --name-only` con las `rutas` y **falla si un módulo cambió y su versión no**. Va en la lista de verificación de `CLAUDE.md` junto a lint, tsc y build.

**Aceptación:** la versión se ve en el pie del menú y en `/admin/versiones`; con dos builds seguidos (cambiar algo y volver a compilar en local) la pestaña abierta muestra la franja de versión nueva sin recargar; `check:modulos` falla si se toca `app/admin/(dashboard)/cursos/page.tsx` sin subir "Cursos" y pasa al subirla. **Caso manipulado:** `GET /api/admin/version` sin sesión → 401 (la versión exacta no se publica a cualquiera).

---

## 3. C-169 · Productos sin pérdidas: borrador, papelera, conflicto y presencia (Lote A, MENOR)

**Para qué:** que el caso de Andrés no pueda volver a pasar. Cinco capas, cada una cubre un hueco distinto; con cualquiera de las tres primeras ya no se pierde el trabajo.

```
Andrés edita el producto ──────────────────────────────────────────────── guarda
     │  (1) borrador en el navegador cada 2 s: sobrevive a recargas y cierres
     │  (4) "Luis también está en este producto" (presencia)
     │                 Luis lo borra ──► (3) va a la papelera, no se borra
     │                                   (4) Andrés ve al instante: "Luis lo movió a la papelera"
     │                                        [Restaurar y seguir]  [Guardar como producto nuevo]
     └── si Luis lo había cambiado ──► (2) conflicto: se combinan los campos que no chocan y se
                                           pregunta solo por los que ambos cambiaron
```

Todo se arma **genérico** para que C-170 lo reutilice en el resto del panel:
- Servidor: `lib/edicion/version.ts` (comprobar la versión y responder el conflicto), `lib/edicion/papelera.ts`, `lib/realtime/presencia.ts`.
- Cliente: `lib/edicion/useEdicionSegura.ts` (un hook: borrador + presencia + avisos en vivo + conflicto) y `components/admin/edicion/` (`AvisoPresencia`, `DialogoConflicto`, `BorradorRecuperado`, `AvisoBorrado`).

### (1) Borrador automático en el navegador
- `localStorage`, clave `es:borrador:product:<id|nuevo>:<userId>`, guardado con espera de 2 s tras cada cambio. Guarda el formulario, el `updatedAt` con que se abrió y la hora. Lecturas y escrituras dentro de `try/catch` (modo privado, almacenamiento lleno).
- Al abrir un producto con borrador más nuevo que lo guardado: "Tienes cambios sin guardar de hoy a las 10:42. [Recuperar] [Descartar]".
- Se borra al guardar con éxito. Caducan a los 7 días. También para "Nuevo producto" (hoy, si se cierra la pestaña a mitad del asistente, se pierde).
- Aviso del navegador al cerrar la pestaña con cambios sin guardar (`beforeunload`).

### (2) Guardar sabiendo con qué versión se abrió (conflicto)
- `GET /api/products/[id]` devuelve `updatedAt`. El asistente lo guarda como **base** junto con una copia de los valores tal como se abrieron.
- `PATCH /api/products/[id]` exige `baseUpdatedAt`. Dentro de la transacción, **lo primero** es `updateMany({ where: { id, updatedAt: base, deletedAt: null }, data: { updatedAt: new Date() } })`: si cuenta 0, nadie más escribe y se responde:
  - **409** `{ conflicto: 'cambiado', por: { nombre }, en, actual }` si el producto existe con otra versión.
  - **410** `{ conflicto: 'en_papelera', por, en }` si está en la papelera.
  - **404** solo si de verdad no existe (vaciado de la papelera).
  - Sin `baseUpdatedAt` → **428**. Hay que actualizar todos los que llaman al `PATCH` (el asistente y los cambios rápidos de estado en `products/page.tsx`, que mandan la base de su fila). `products/bulk/update` sigue sin base (es masivo y explícito), pero publica el aviso en vivo y queda en la bitácora.
- **Diálogo de conflicto** (combinar a nivel de campo, con base = como se abrió, mío = el formulario, suyo = `actual`):
  - Campos que **solo yo** cambié → se aplican. Campos que **solo el otro** cambió → se conservan. Así, en la mayoría de los casos se combina sin preguntar nada.
  - Campos que **los dos** cambiaron → una lista: "Precio: tú $120,00 · Luis $115,00", con elegir uno u otro por campo.
  - Botones: "Guardar combinado", "Ver el producto como quedó" (sin perder el borrador). Nunca un "sobrescribir todo" escondido como opción principal.
  - Las listas (fotos, variantes digitales, especificaciones) se comparan como un solo campo cada una en esta tarea; combinar dentro de una lista queda fuera.

### (3) Papelera en vez de borrar
- Columnas nuevas en `products` (aditivas): `deletedAt DateTime?`, `deletedById String?`, `statusAntesDePapelera ProductStatus?`.
- "Eliminar" pasa a **"Mover a la papelera"**: guarda el estado anterior, pone `status: 'ARCHIVED'` (la tienda ya muestra solo `PUBLISHED`, así que desaparece de inmediato del catálogo, el buscador, el sitemap y el feed sin tocar sus consultas) y llena `deletedAt` y `deletedById`. **No borra** reseñas, favoritos ni códigos.
- Comprobar igual con `grep` que ningún lugar público lea productos `ARCHIVED` (carrito guardado, favoritos, enlaces cortos `/p/`, ficha por slug): un producto en la papelera se comporta como uno archivado.
- Toast con **"Deshacer"** durante 10 s. Productos → pestaña **"Papelera"** con quién lo movió y cuándo, "Restaurar" (vuelve a su estado anterior; si su slug lo tomó otro producto mientras tanto, se restaura con `-2` y se avisa) y "Borrar para siempre" (solo el dueño, P2; ahí corre el borrado de hoy con su transacción).
- El listado normal de Productos, los contadores del Dashboard y el menú filtran `deletedAt: null`.
- Vaciado automático a los 30 días (P1): se suma al cron diario que ya existe más cercano (o una ruta `/api/cron/papelera` nueva: **si es ruta nueva, agregarla a `proxy.ts`** y dar su línea de `crontab` en el bloque de deploy). Borrar datos al vaciar es justo lo que Andrés aprueba con P1.
- El borrado masivo de la lista (`Promise.all` de `DELETE`) pasa a "Mover a la papelera" con un solo deshacer para todos.

### (4) Presencia y avisos en vivo
- `lib/realtime/presencia.ts`: un mapa en memoria `recurso → { userId, nombre, desde, últimoLatido }` (un solo proceso; si algún día hay varios, cambia junto con `bus.ts`). `POST /api/admin/presencia` `{ recurso: 'product:<id>', accion: 'entrar' | 'latido' | 'salir' }`, latido cada 20 s, caduca a los 60 s sin latido; al cerrar, `navigator.sendBeacon`.
- Tipos de evento nuevos en `lib/realtime/eventos.ts`: `admin:presencia` y `admin:recurso_cambiado` `{ recurso, accion: 'actualizado' | 'papelera' | 'restaurado', por: { id, nombre }, en, campos? }`. En `app/api/realtime/route.ts` **solo los recibe el equipo** (con el permiso del recurso: `MANAGE_PRODUCTS` para productos). Nunca a clientes.
- En el editor: "Luis también está editando este producto" (con su inicial) y, cuando el otro guarda: "Luis guardó cambios hace un momento: precio y stock. [Ver]". Si lo mueve a la papelera: franja roja fija "Luis movió este producto a la papelera a las 10:40. Tu trabajo está guardado en este navegador. [Restaurar y seguir editando] [Guardar como producto nuevo]".
- En la lista de Productos: la fila muestra "Luis está editando".
- Al mover a la papelera algo que otro está editando: el servidor responde **409 `en_edicion`** con el nombre, y el cliente pregunta (P3) y reintenta con `forzar: true`.

### (5) Quién cambió qué
- `PATCH` registra `PRODUCT_UPDATED` con la lista de campos cambiados (nombres, no valores largos; el precio ya tiene su propio registro). `PRODUCT_TRASHED`, `PRODUCT_RESTORED` y `PRODUCT_PURGED` nuevos en `lib/audit-log.ts` y sus etiquetas en `lib/audit-labels.ts`.
- En el encabezado del editor: "Última edición: Luis, hace 5 min". Una sección "Historial" con las últimas 20 acciones sobre el producto, desde `AuditLog`.

### Aceptación (dos navegadores, dos cuentas de admin: ver `OPERACION.md` §3 para crear la segunda en local)
1. **El caso de Andrés:** A edita varios campos sin guardar; B mueve el producto a la papelera → en menos de 3 s A ve la franja roja; A recarga la página y su borrador sigue ahí; "Restaurar y seguir editando" lo devuelve y guarda lo de A.
2. "Guardar como producto nuevo" desde la franja crea un producto en borrador con los datos de A.
3. A y B editan campos distintos y guardan uno tras otro → el segundo combina sin preguntar y ambos cambios quedan.
4. A y B cambian el precio → el segundo ve el diálogo con los dos precios.
5. Deshacer a los 5 s de mover a la papelera; restaurar desde la pestaña Papelera; el producto en la papelera no aparece en la tienda, el buscador, `sitemap.xml` ni `/feed/productos.xml`.
6. **Casos manipulados:** `PATCH` con un `baseUpdatedAt` viejo (con `curl` y la cookie) → 409; sin base → 428; "Borrar para siempre" como Administrador → 403; `admin:presencia` no llega a una sesión de cliente conectada al SSE; `POST /api/admin/presencia` sin sesión → 401.

---

## 4. C-170 · Lo mismo en el resto del panel (Lote B, MENOR)

**Para qué:** lo que pidió Andrés ("pasa con promotores, configuraciones y todo el panel"), reutilizando las piezas de C-169.

**Paso 1, inventario** (va al estado de la tarea antes de escribir código): una tabla con cada ruta del panel que **cambia o borra** algo (`PATCH`, `PUT`, `DELETE`, `POST` de acción) en `app/api/**` usada desde `app/admin/**`, clasificada así:
- **(a) Cambio de estado** (aprobar, rechazar, confirmar pago, cambiar estado de orden, acreditar): debe ser condicional, `updateMany({ where: { id, status: <el esperado> } })`, y si cuenta 0 responder **409 "Luis ya lo aprobó a las 10:42"**. Las de dinero ya lo cumplen (ver §0); comprobar las demás.
- **(b) Edición de formulario**: versión con `baseUpdatedAt` y combinación de campos como en C-169.
- **(c) Borrado**: papelera si se puede recuperar algo valioso, o al menos aviso de presencia y confirmación.

**Paso 2, aplicar por prioridad** (cada uno con su commit `[C-170]`):
1. **Promotores** (`Promotores.tsx`, `app/api/influencers/**`): editar comisión y descuento con versión; desactivar o borrar un promotor con presencia; aprobar comisiones con estado condicional.
2. **Configuración**: ya manda solo los campos cambiados; agregar la base **por campo** (el valor con que se abrió) y responder 409 solo si alguno de los campos enviados cambió en la base mientras tanto. Presencia por sección ("Luis está en Envíos y retiro").
3. **Categorías y Ofertas y cupones** (versión + papelera de categorías si no tienen productos).
4. **Cotizaciones, ElectroStudio, Cursos, Métodos de pago, Documentos legales, Servicios.**
5. **Órdenes**: el detalle de la orden con presencia ("Luis está atendiendo esta orden") y los cambios de estado condicionales.

Cada módulo tocado sube su versión (C-168).
**Aceptación:** la tabla del inventario completa en el estado; los escenarios 1, 3, 4 y 6 de C-169 repetidos en Promotores y en Configuración; dos admins aprobando la misma comisión al mismo tiempo → una sola acreditación de Puntos ES y el segundo ve "ya la aprobó Luis".

---

## 5. C-171 · Dashboard a tu gusto (Lote C, MENOR)

**Para qué:** un Dashboard que cada admin arma a su gusto, como el panel rápido de Samsung One UI (tocar "Editar", quitar con "−", agregar con "+", arrastrar para ordenar, "Listo"), con movimiento que informa y no distrae.

### Widgets
Un registro `lib/dashboard/widgets.ts`: `id`, `titulo`, `descripcion`, `icono`, `permiso`, `obligatorio`, `tamanos` (`chico` 1 columna, `mediano` 2, `ancho` toda la fila) y `cargar()` (función del servidor que lee la base; **solo se llama para los widgets que el admin tiene puestos**).

**Siempre presentes (no se quitan, sí se mueven; llevan un candado en modo edición):**
- **Por atender** (lo de hoy).
- **Ventas cobradas** (hoy, mes y la semana).
- **Accesos rápidos**: el bloque siempre está, pero **cada admin elige qué botones lleva** y en qué orden, igual que los botones del panel rápido de Samsung (de la lista de hoy, `ACCIONES` en `page.tsx`, filtrados por permiso).

**Opcionales que ya existen:** Órdenes recientes · Poco inventario · Tu tienda: por completar · En total.

**Opcionales nuevos:**
| Widget | De dónde sale |
|---|---|
| Visitantes ahora | `app/api/admin/live-users` (últimos 5 min) |
| Embudo de hoy: visitas → carrito → compras | `AnalyticsEvent` (C-145) |
| Tasa BCV y desde cuándo | Configuración |
| Meta del mes (barra de progreso) | Monto escrito por el dueño en el propio widget y guardado en la base (P6); ventas del mes ya calculadas |
| Más vendidos de la semana | órdenes pagadas |
| Actividad del equipo ("Luis movió *Teclado K552* a la papelera · 10:40") | `AuditLog` (sale gratis de C-169) |
| Promotores: comisiones por acreditar | `ReferralConversion` (C-167) |
| Respaldo: el último y su estado | `BackupRun` (C-165) |
| Reseñas recientes | `Review` |
| Cotizaciones abiertas | `Quote` |

### Cómo se edita (anatomía)
```
┌ Dashboard ─────────────────────────────── [Editar] ┐      ┌ Dashboard ─────────── [Restablecer] [Listo] ┐
│ [Nuevo producto][Ver órdenes][Cotización][...]     │      │ (candado) Accesos rápidos   [Elegir botones] │
│ ┌ Por atender ──────────┐ ┌ Ventas cobradas ┐       │  ─►  │ ┌ (candado) Por atender ┐ ┌ (candado) Ventas ┐│
│ │ 3 pagos por confirmar │ │ Hoy $240        │       │      │ └───────────────────────┘ └──────────────────┘│
│ └───────────────────────┘ └─────────────────┘       │      │ ┌ (−) Visitantes ahora ┐ ┌ (−) Meta del mes ┐  │
│ ┌ Visitantes ahora ┐ ┌ Meta del mes ┐               │      │ └─ arrastrar ──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────┘      │ ── Agregar ───────────────────────────────── │
                                                             │ (+) Embudo de hoy  (+) Más vendidos  (+) ... │
                                                             └──────────────────────────────────────────────┘
```
- **"Editar"** pone las tarjetas en modo edición: contorno discontinuo `border-brand-200`, una escala leve (0,98), el "−" arriba a la izquierda en las opcionales y el candado en las obligatorias. **Sin temblor infinito** (eso es de iOS y rompe la regla de animaciones infinitas).
- **Ordenar:** arrastrar con el dedo o el ratón (`@dnd-kit/sortable` con sensores de toque, puntero y teclado). Para accesibilidad, cada tarjeta tiene además un menú "Mover arriba / abajo / Cambiar tamaño".
- **Agregar:** abajo, en computadora, la lista de lo disponible con su descripción y un "+"; en el teléfono, una hoja que sube desde abajo (`useBodyScrollLock`, capa `--z-drawer`, botones por encima de la barra inferior). La vista previa del widget es una ilustración o su esqueleto, no datos en vivo.
- **"Listo"** guarda; **"Restablecer"** vuelve al diseño de fábrica (el de hoy) con confirmación.

### Movimiento
- Entrada: las tarjetas aparecen con un desvanecido y 8 px de subida, escalonadas 40 ms, 200 ms `ease-out`.
- Los números grandes cuentan desde 0 la primera vez (600 ms) y, cuando cambian en vivo, cuentan desde el valor anterior con un resaltado de una sola vez.
- Al agregar, quitar u ordenar, las demás tarjetas se reacomodan con animación de posición (`motion`, propiedad `layout`), nunca saltan.
- **En vivo:** los eventos SSE que ya existen (`order:status_updated`, `payment:verified`) refrescan el Dashboard (`router.refresh()`, como mucho una vez cada 5 s) y el número que cambió se resalta una vez.
- `prefers-reduced-motion: reduce` → sin ninguna animación. Nada infinito.

### Arquitectura y datos
- Tabla nueva (aditiva) `admin_dashboard_layouts`: `userId` único (con llave a `users`), `widgets Json` (`[{ id, tamano }]`), `accesos Json` (ids de los accesos rápidos), `config Json` (la meta del mes y lo que un widget necesite), `updatedAt`. **Por admin y en la base** (no en `localStorage`): Andrés ve su Dashboard en la computadora y en el teléfono.
- `PUT /api/admin/dashboard/layout`: valida con `zod`, descarta ids desconocidos o sin permiso, **reinserta los obligatorios si faltan** (el servidor manda, no el cliente), tope de 20 widgets. La meta del mes solo la escribe quien tenga `MANAGE_SETTINGS`.
- `page.tsx` sigue siendo Server Component: lee el diseño del admin, corre en `Promise.all` el `cargar()` de los widgets puestos y le pasa a un componente cliente `TableroEditable` cada widget **ya renderizado** como hijo. Las librerías (`motion`, `@dnd-kit`) se cargan solo en ese componente (`next/dynamic` para el modo edición): no llegan a la tienda.
- Sin diseño guardado = el Dashboard de hoy. Comprobar que el primer pantallazo del teléfono sigue mostrando "Por atender".

**Aceptación:** quitar, agregar, ordenar y cambiar tamaño con ratón, dedo (360 px) y teclado; el diseño se mantiene al entrar desde otro navegador; un Administrador no ve ni puede poner "Meta del mes" (P6); con `reduced-motion` no se mueve nada; revisar a 360, 768, 1024 y 1440 px. **Casos manipulados:** `PUT` sin los obligatorios → se guardan igual con ellos; con un widget sin permiso → descartado; con 500 widgets → 400; la meta escrita por un Administrador → 403.

---

## 6. C-172 · Destacados que rotan (Lote C, PARCHE o MENOR)

### Opinión de Claude sobre la idea de Andrés
La idea es buena **con condiciones**. Un carrusel que gira solo y sin fin baja los clics: la gente no alcanza a leer, el que pasaba se va y el que no ve el producto que buscaba siente que la página se mueve sola; además rompe la regla de la tienda "sin animaciones infinitas" y la norma de accesibilidad pide poder pausar lo que se mueve más de 5 s. Lo que sí funciona es **que la estrella cambie** (más productos tienen su momento grande) **sin que la página distraiga**. Por eso la propuesta junta dos cosas:

**A · Rotación en pantalla, una vuelta y se detiene (solo computadora, `xl`):**
- Cada 7 s, el primer producto de la columna derecha pasa a la estrella con un fundido de 300 ms y la estrella anterior se va al final de la columna (la idea exacta de Andrés).
- **Una sola vuelta** por visita y se queda en el primero. Se pausa al pasar el ratón, al enfocar con el teclado, al tocar cualquier control y cuando la pestaña no está a la vista.
- Controles a la vista: puntos "1 de 6", flechas y un botón de pausa (`FiPause` / `FiPlay`).
- `prefers-reduced-motion` → no gira; quedan los controles.
- En el teléfono **no gira**: la fila deslizable ya es del pulgar y moverla sola pelearía con él.

**B · La estrella del día (sin movimiento, en el servidor):**
- La estrella ya no es siempre el primer destacado: cambia cada día siguiendo el orden de los destacados (día del año módulo cantidad, en hora de Caracas). Cada visita del día ve la misma, la del día siguiente otra. Funciona igual en el teléfono (es el primero de la fila).
- Con `revalidate = 60` del inicio ya no hace falta nada más.

**Recomendada: A + B** (P4).

### Detalles para no romper lo que ya está
- La primera estrella se pinta en el servidor con `priority` (la imagen grande sigue siendo el LCP). Las demás fotos grandes se piden después, con `loading="lazy"` y `fetchPriority="low"`, solo cuando la rotación va a llegar a ellas.
- La estrella y la columna mantienen sus tamaños de C-162: sin saltos de diseño (CLS).
- La rotación es un componente cliente chico que envuelve lo que ya renderiza `FeaturedShowcase` (`components/home/FeaturedShowcase.tsx` y `FeaturedHeroCard.tsx`): no se reescribe la vitrina.
- **Medir antes de opinar:** evento `home_destacado_click` (C-145) con la posición (estrella o lateral) y si había rotado. Dos semanas antes y dos después, comparar clics por visita en Reportes.

### Más ideas (opcionales, para que Andrés elija)
- **Orden y fechas de los destacados desde el panel:** en Configuración → Tienda, arrastrar el orden de los destacados y ponerles "desde / hasta" (una oferta de fin de semana se destaca sola y se quita sola).
- **Estrella fija:** un interruptor "Fijar como estrella" para un lanzamiento; mientras está, no rota.
- **Cuenta regresiva en la estrella** si tiene una oferta con fecha de fin: "Termina en 5 h" (texto que se actualiza cada minuto, no una animación).

**Aceptación:** a 1440 px gira una vuelta y se detiene; se pausa con el ratón, el teclado y al cambiar de pestaña; los controles funcionan con teclado; a 360 px no gira; con `reduced-motion` no gira; Lighthouse del inicio con LCP y CLS iguales o mejores que antes (anotar los dos números en el estado).

---

## 7. Fuera de esta propuesta (anotado para después)
- Combinar dentro de listas (dos admins agregando fotos distintas a la vez): hoy la lista entera es un campo.
- Notas compartidas del equipo como widget (pide una tabla y moderación).
- Barra de comandos (Ctrl+K) para saltar a cualquier producto, orden o pantalla del panel.
- Papelera para clientes: ya hay una regla tomada (§7.2, "se desactivan"), y C-92 espera el diagnóstico.

## 8. Recordatorios para Sonnet 5.5
- Leer antes `CLAUDE.md`, `docs/plan/SIGUIENTE.md`, `docs/plan/PLAN.md` §1, §4, §5 y §7, `docs/plan/OPERACION.md` y `node_modules/next/dist/docs/` antes de usar una API de Next 16 (caché, `dynamic`, `params`, `proxy`).
- `git status` y `git log -5 --format='%h %an %s'` antes de empezar: Gemini trabaja en esta misma carpeta.
- Tokens de color de `PLAN.md` §1, capas `--z-*`, breakpoint `lg`, sin `font-black`, sin emojis (íconos `Fi*`), "Puntos ES" y nunca "saldo".
- Nada de objetos Prisma crudos al cliente: los avisos de presencia y de conflicto llevan solo nombre, hora y campos (DTO), nunca el usuario completo ni `costPerItem`.
- Migraciones solo aditivas y con respaldo; vaciar la papelera borra datos y está cubierto solo por P1 y P2 aprobadas.
- Verificar: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run check:modulos` (desde C-168) y la prueba de humo (`scripts/e2e/humo.ts`). Si Node no está en el PATH, ver la memoria del entorno local.
- Cada tarea cierra con su estado, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5, `SIGUIENTE.md` (un solo bloque de deploy con el SQL total, el cron si lo hay, las pruebas y la vuelta atrás), la versión en `package.json`, `CHANGELOG.md` (por módulo desde C-168) y la etiqueta de git.
