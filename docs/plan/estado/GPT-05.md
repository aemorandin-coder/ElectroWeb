# GPT-05 · Panel de creadores en móvil
Estado: HECHO — jerarquía y navegación verificadas
Rama: chatgpt/R1

## Inventario previo de acciones
- Layout: enlaces Dashboard, Mis Cursos y Mi Perfil; Página de Creadores, Mi Panel Cliente y Ver catálogo; colapsar/expandir escritorio; cerrar sesión. En móvil se agrega abrir/cerrar el mismo menú. Autenticación y destino de redirección existentes se conservan.
- Resumen: Nuevo Curso, Crear mi primer curso, Ver todos, Editar cada curso y Volver a la página de creadores cuando el perfil está pendiente o sin acceso. Fetch original de perfil y, para aprobados, cursos.
- Mis Cursos: Nuevo Curso/Crear primer curso, Ver en catálogo para activos, Editar, Eliminar con diálogo de confirmación. Fetch original GET y DELETE.
- Nuevo Curso: Volver a Mis Cursos, campos título, descripción corta/completa, categoría, nivel, precio, URL del tráiler y carga de miniatura; Cancelar y Crear Curso. POST y cuerpo originales.
- Editor: Volver a Mis Cursos; pestañas Información/Currículum; guardar información y guardar currículum con los PATCH originales. Campos de información, carga de miniatura, añadir/quitar módulo, editar nombre de módulo, añadir/quitar lección, título/descripción/URL/duración y casilla de lección gratuita.
- Perfil: carga de avatar, nombre, área de especialidad, biografía y Guardar Perfil con PATCH original.
- Página pública de creadores: estados aprobado (Ir a mi Panel), pendiente, no aprobado, formulario (nombre, especialidad, biografía, Enviar Solicitud), Iniciar Sesión y Crear Cuenta para invitados. GET y POST originales de creador.

## Jerarquía: antes → después
El menú fijo dejaba aproximadamente 138 px de contenido a 390 px. Ahora ocupa un cajón móvil de 288 px con capa, Escape, bloqueo del desplazamiento y cierre al navegar; desde `lg` mantiene el panel fijo y su botón de colapsar. El encabezado conserva Ver catálogo y el avatar, y muestra el título de la sección sin truncar la acción.

En estado pendiente, «Solicitud en revisión» aparece completa al entrar. En estado aprobado, «Nuevo Curso» antecede las métricas; ingresos ocupa ancho completo sin cortar el monto. La lista expone Ver (solo cursos activos), Editar y Eliminar con la confirmación original. El formulario de creación mantiene los mismos campos/POST y deja «Crear Curso» accesible al fondo del teléfono. El editor diferencia Datos, Precio y Contenido, mantiene las dos pestañas/PATCH y muestra un solo botón contextual de guardar fijo en móvil. Las URLs de lección ya tienen toda la anchura. El perfil hace visible la carga de foto y separa «Guardar Perfil» del botón flotante de WhatsApp. En `/creator`, la solicitud o el acceso al panel pasan delante del material informativo.

## Inventario después
Todas las acciones del inventario previo permanecen. No cambiaron `fetch`, cuerpos, permisos, cálculos ni destinos. Contratos comparados con `main`: layout href 7→7; resumen fetch 2→2 y href 5→5; cursos fetch 2→2 y href 4→4; nuevo fetch 1→1 y href 2→2; editor fetch 3→3 y href 2→2; perfil fetch 2→2; página pública fetch 2→2 y href 4→4. No faltan llamadas ni enlaces.

## Verificación real
```text
npx tsc --noEmit: exit 0 (sin salida)
ESLint contra main: layout 0→0; resumen 0→0; cursos 1→1; nuevo 0→0; editor 3→3; perfil 0→0; público 1→1. Problemas nuevos: 0 en cada archivo.
npm run build -- --webpack (rev10_demo): exit 0
```
Build final: `/tmp/gpt05-build-final.log`. El cliente Prisma local debió regenerarse tras reiniciarse el entorno (`npx prisma generate`, sin instalar dependencias). `git diff --check`: exit 0.

Firefox real: capturas `/tmp/gpt-qa/GPT-05-{pending,dashboard,courses,new,editor,curriculum,profile,public}-{360,768,1024,1440}.png`. Todas las rutas y anchuras terminaron con `scrollWidth === clientWidth`, incluidas las vistas de editor y currículum. El cajón cambió `aria-expanded` false→true→false con Escape; al elegir Mis Cursos navegó a `/creator/dashboard/cursos` y quedó cerrado. «Crear Curso» vacío mostró el mensaje existente «Título, descripción y precio son requeridos.»; la captura de validación está en `/tmp/gpt-qa/GPT-05-new-validation-360.png`. La captura final de perfil está en `/tmp/gpt-qa/GPT-05-profile-final-360.png`: rectángulos de «Guardar Perfil» y WhatsApp sin intersección (`intersect=false`). El creador demo regresó a `PENDING` después de cada pase.

## PEDIDOS y límites
- PEDIDO: Claude, adaptar el componente compartido `ImageUploadField` a tokens legibles en superficies claras. Estas páginas lo envuelven en `bg-brand-950` para hacer visibles sus controles sin editar un componente fuera de carril.
- PEDIDO: Claude, excluir `/creator` del tour de tienda o ajustar su alcance. El tour global tapa la solicitud de creador cuando el usuario no lo ha completado; en QA se marcó el tour como visto solo en el navegador temporal.
- QA de POST válido pendiente: crear un curso dispara avisos a administradores desde la API; el pase de diseño verificó navegación, formulario y validación sin emitir ese aviso.
