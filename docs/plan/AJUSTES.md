# Ajustes, acceso y herramientas claras: el plan (C-289)

> **El pedido del 18/11** (el equipo), un plan de rediseño con cuatro partes:
> - **Los dos pasos de la contadora:** "se le hace difícil entender qué app es doble factor y qué tiene que hacer después", y pidió un dispositivo de confianza por 30 días "para no meter el doble factor a cada rato".
>   - De eso sale una regla para todo: "mensajes claros, iconizar, evitar el texto masivo, ser muy gráfico e invitar a dar ejemplos de herramientas externas, tipo Authy, Google Authenticator o Microsoft, y explicar cómo se descarga en la Play Store".
>   - "Esto debe ser una skill global para que todo el equipo de desarrollo sepa cómo debe crear herramientas."
> - **La sección de IA:** "IA · Claude no es solo Claude: debemos organizar mejor y preparar, porque mañana la puedo cambiar por otra IA, Gemini o Grok".
> - **El login de los administradores,** también con dispositivo de confianza.
> - **Ajustes:** "inputs anchísimos, muchos textos, semánticas ilógicas, ajustes repetidos: haz un análisis de lo que necesitamos que se mantenga acá".
>
> **Estado (18/11): terminado.** Las cinco fases están hechas: C-290 y C-291 en producción (rc.106); C-292, C-293 y C-294 en `main` (rc.108 a rc.110), por subir. Sigue C-292b (`PLAN.md` §5.2).
>
> **Este documento es el mapa.** Cada fase es una tarea `C-*` con su rama, sus pruebas, su versión y su deploy. Las decisiones del equipo están en §6: las dos del plan y las seis (D1 a D6) del mismo 18/11. Las maquetas se hacen al empezar cada fase, con datos de producción.

## 1. Lo más importante
- **La regla nueva ya está hecha** (C-289, con este plan): la skill `herramientas-claras` (`.claude/skills/herramientas-claras/SKILL.md`).
  - Tiene diez reglas, las piezas que ya existen y la lista de antes de terminar. Su prueba es la de la contadora: alguien que nunca lo vio lo hace sola, en el teléfono, sin escribirle a nadie.
  - Va en el repositorio, así que la lee cada sesión de Claude en cada PC (la de la oficina, la de la casa y la laptop de Luis). Está citada en `CLAUDE.md` y en `PLAN.md` §1.12.
- **Las fases, en este orden:**
  1. **C-290 · Los dos pasos que se entienden:** la contadora los usa ahora.
  2. **C-291 · El dispositivo de confianza, 30 días:** para todo el panel, con el código otra vez en lo delicado. Puede subir junto con C-290.
  3. **C-292 · La IA de la tienda, no de un proveedor:** proveedores intercambiables, "IA" en los botones; absorbe C-288b.
  4. **C-293 · Ajustes: el mapa nuevo, Tu negocio y Vender.**
  5. **C-294 · Ajustes: Avisos, Conexiones y La tienda en línea.**

  C-293 y C-294 absorben la parte de Configuración de C-206.
- **Dos decisiones ya tomadas el 18/11** (§6.1): el dispositivo de confianza para todos con el código en lo delicado, y "IA" en los botones con el nombre del motor al lado.

## 2. Cómo está hoy (rc.103)

### 2.1 Los dos pasos (C-141)
- **Configurarlos** (`app/admin/(dashboard)/seguridad/page.tsx`): tres tarjetas numeradas.
  1. "Instala una app de códigos en tu teléfono": dice "Google Authenticator o Authy. Son gratis y están en Play Store y App Store. Si ya tienes una, usa esa." Sin logos, sin enlace a la tienda, sin decir qué hace la app.
  2. El QR y la clave para escribir a mano. En el teléfono, "Abrir en la app de códigos", sin explicar por qué no se puede escanear la propia pantalla.
  3. "Escribe el código que muestra la app", y después los 10 códigos de respaldo.
- **Entrar** (`app/login/LoginCliente.tsx`): "Abre tu app de códigos y escribe el código de 6 dígitos de Electro Shop", cada vez.
- **La sesión del panel** (`lib/sesiones.ts`, regla del 30/09 en `PLAN.md` §7.2): una sola sesión, de 12 horas, que se cierra tras 1 hora sin uso. Por eso la contadora escribe la contraseña y el código varias veces al día.
- **El correo de invitación** (`lib/email-templates/cuenta.ts`) avisa con una frase: "con una app de códigos en tu teléfono (Google Authenticator o Authy)".
- **Lo que falta, según la skill:** qué es la app y para qué; los ejemplos con su logo y dónde se bajan; qué pasa después de cada paso y de ahora en adelante; la pantalla del teléfono dibujada; y una salida que diga quién ayuda.

### 2.2 La IA (C-288)
- **Lo que ya es de la tienda** y sirve con cualquier motor:
  - los seis usos;
  - las instrucciones de fábrica (`lib/ia/fabrica.ts`);
  - las reglas y la revisión de cada respuesta (`reglas.ts`, `limpieza.ts`, `revisar.ts`);
  - el registro de pedidos, que ya guarda el proveedor (`ia_pedidos.proveedor`).
- **Lo que está atado a Claude:**
  - la única puerta se llama `lib/ia/claude.ts` y habla el formato de Anthropic;
  - los modelos (`lib/ia/precios.ts`) solo pueden ser Claude, con el "esfuerzo" de Anthropic y su búsqueda web;
  - `ia_ajustes` guarda un solo modelo y una sola clave;
  - Groq, el respaldo de "Buscar en la web", va por un camino aparte (`lib/busqueda-web/groq.ts`), fuera de los ajustes del panel;
  - la sección se llama "IA · Claude" y 19 pantallas del panel dicen "Claude" ("Armar con Claude", "Proponer con Claude", "Claude revisó…").

### 2.3 Ajustes (Configuración)
**Hoy:** 9 secciones en `/admin/settings`, con 75 campos en las seis primeras. Correo, Respaldos e IA tienen su propio guardado. Fuera hay 4 pantallas más que también son ajustes:
- Métodos de pago (Administración);
- Notificaciones → "Qué avisar" y Telegram, que son de toda la tienda y piden `MANAGE_SETTINGS`;
- Equipo;
- Kit de marca (Marketing).

| Sección | Campos | Lleva |
|---|---|---|
| Negocio | 20 | Datos de la empresa, logo e ícono, sello de los presupuestos, contacto, redes, horario |
| Precios y pagos | 7 | Tasa BCV, IVA, IVA de los digitales, mínimo y máximo por compra |
| Envíos y retiro | 13 | ZOOM y MRW, embalaje único o según el paquete, envío gratis, delivery en Guanare, retiro, despachos |
| Portada e inventario | 11 | Destacados, categorías y video del inicio; stock bajo, ocultar agotados y dos avisos de stock |
| Google y redes | 16 | Título, descripción, palabras clave e imagen de 4 páginas |
| Avisos y mantenimiento | 8 | Correos de alerta, colores de los correos, mantenimiento con IPs, y una tarjeta que lleva a Equipo |
| Correo | propio | Servidor SMTP, remitente y el interruptor de las campañas de marketing |
| Respaldos | propio | Google Drive cifrado (C-165) |
| IA · Claude | propio | C-288 |

**Lo que encontró el análisis:**
1. **Repetido:**
   - **Los avisos de stock están dos veces.** "Avisarme cuando un producto quede con stock bajo" y "…se agote" (Portada e inventario) apagan lo mismo que "Stock bajo" y "Producto agotado" en Notificaciones → Qué avisar, que además tienen sus canales.
   - **Quién recibe y qué recibe, en dos páginas.** Los correos de alerta están en Avisos y mantenimiento, y lo que se avisa por cada canal, en Notificaciones.
   - **La tarjeta "Equipo"** dentro de Avisos y mantenimiento solo repite el enlace del menú.
   - **El logo y el ícono** están en Negocio, y el Kit de marca, en Marketing.
   - **El embalaje se muestra de dos formas a la vez:** el precio único con "Embalaje gratis desde", y "según el paquete" con su "Bulto aparte". "Embalaje gratis desde" cambia de lugar según el interruptor.
   - **El bot de Telegram** se configura en Notificaciones y también lo usa ElectroStudio (C-286, C-287).
2. **Sin efecto:**
   - **"Colores de los correos"** (color principal y secundario) se guardan, pero ningún correo los lee. Además chocan con la regla del kit: solo los azules del logo (C-243).
   - **Las palabras clave de las 4 páginas** salen en la página, pero la propia ayuda dice "Google casi no las usa": son 4 campos para casi nada.
3. **Nombres que no dicen lo que hay:**
   - "Precios y pagos" no tiene los pagos: Métodos de pago está en otra parte del menú.
   - "Avisos y mantenimiento" junta cuatro cosas distintas: alertas, colores, mantenimiento y Equipo.
   - "Portada e inventario" junta lo que muestra el inicio (contenido) con las reglas del stock (catálogo).
   - "Correo" lleva el interruptor de las campañas, que es de Marketing.
   - "IA · Claude" lleva la marca del proveedor como nombre.
   - El menú dice "Configuración"; el equipo dice "Ajustes".
4. **Campos anchos:** los campos de texto y de número de `fields.tsx` ocupan todo el ancho de su columna, en una página de hasta `max-w-6xl`. Un "16" de IVA mide lo mismo que la dirección. No siguen §1.5 (`CampoUnidad`, `sm:max-w-sm`, formularios hasta `max-w-3xl`): era la lista pendiente de C-206.
5. **Mucho texto:** casi cada interruptor lleva de 1 a 3 frases debajo. "Los productos digitales también llevan IVA" lleva tres, y el sello de los presupuestos, cuatro entre descripción y ayuda. §1.9 pide una línea y lo demás detrás de (i), con un ejemplo.
6. **Dos formas de guardar:** seis secciones comparten la barra de abajo, y Correo, Respaldos e IA guardan solas. No se sabe cuál pide "Guardar cambios".
7. **En el teléfono:** el menú de 9 secciones se vuelve una tira que se desliza de lado, y lo que está al final no se ve.

## 3. Lo que se queda en Ajustes
**La regla:** Ajustes es cómo funciona la tienda, lo que se decide una vez y casi no se toca. Lo del día a día y el contenido van a su módulo, y lo de cada persona, a su menú.

| Grupo | Sección | Lleva | Viene de |
|---|---|---|---|
| **Tu negocio** | Datos y contacto | Nombre, slogan, razón social, RIF, correo, teléfono, WhatsApp, dirección, redes y horario | Negocio |
| | Logo y sello | Logo, ícono de la pestaña y sello de los presupuestos, con el enlace al Kit de marca | Negocio |
| **Vender** | Tasa e IVA | La tasa BCV (automática o a mano), el IVA y el de los digitales | Precios y pagos |
| | Métodos de pago | La pantalla de hoy, dentro de Ajustes (§6.2, D5) | Administración |
| | Límites de compra | Mínimo y máximo por compra | Precios y pagos |
| | Inventario | Stock bajo desde, ocultar agotados | Portada e inventario |
| | Envíos y retiro | ZOOM y MRW, el embalaje (una sola elección: "un precio por pedido" o "según el paquete"), el envío gratis, el delivery, el retiro y los despachos | Envíos y retiro |
| **Avisos** | Quién recibe qué | Los correos de alerta, Telegram y "Qué avisar" juntos; Notificaciones se queda con la bandeja (D6) | Avisos y mantenimiento, Notificaciones |
| **Conexiones** | Correo | El servidor y el remitente | Correo |
| | IA | Proveedores, motor, usos, reglas y consumo (C-292) | IA · Claude |
| | Respaldos | Igual que hoy | Respaldos |
| **La tienda en línea** | Mantenimiento | El aviso, las horas y las IPs | Avisos y mantenimiento |
| | Portada; Google y redes | Se quedan aquí o pasan a Marketing (D2) | Portada e inventario; Google y redes |
| **Equipo y acceso** | Equipo | Quién entra, su rol, sus dos pasos y sus dispositivos de confianza (C-291) | Equipo |

**Fuera de Ajustes:** Mi seguridad (es de cada persona: se queda en el menú, donde la ven todos, también la contadora), la bandeja de Notificaciones, Versiones y el Kit de marca (una página de consulta, en Marketing).

**Se quita (D3):** los colores de los correos, las palabras clave de las páginas, la tarjeta Equipo repetida y los dos interruptores de stock repetidos. Los datos se quedan en la base: no se borra nada.

**Se mueve:** el interruptor de las campañas de marketing, de Correo a Marketing.

**Así se construye cada sección:**
- los campos, del tamaño de su dato (§1.5);
- una línea y lo demás detrás de (i), con un ejemplo (§1.9);
- para elegir, `Opcion` (§1.10): la tasa automática o a mano, o el tipo de embalaje;
- cada sección guarda sola, con su botón al pie;
- lo que toca dinero (la tasa, el IVA, el envío gratis, el mantenimiento) muestra antes → después y a qué afecta antes de guardar. Por ejemplo: "Todos los precios en bolívares y los Pagos Móvil nuevos".

## 4. Las fases

### Fase 0 · C-289 · El plan y la skill (hecha el 18/11, `estado/C-289.md`)
- Este documento y la skill `herramientas-claras`.
- La regla en `CLAUDE.md` y en `PLAN.md` §1.12, y las dos decisiones del 18/11 en §7.2.

### Fase 1 · C-290 · Los dos pasos que se entienden
**Antes de programar:** maquetas, en el teléfono y en la computadora, de configurar y de entrar, con las tres apps.
- **Al empezar, la hoja "Así funciona"** (C-257), con tres íconos: "Tu contraseña" + "El número de tu teléfono" = "Entras".
  - La frase: "Aunque alguien sepa tu contraseña, sin tu teléfono no entra."
- **Paso 1 · Baja la app:** tres opciones con su logo (`Opcion`): Google Authenticator (la recomendada, la más simple), Microsoft Authenticator y Authy.
  - Cada una con "Android: Play Store" y "iPhone: App Store".
  - En el teléfono, primero la tienda del suyo. En la computadora, el QR que abre la tienda desde el teléfono.
  - Al pie: "Ya la tengo: seguir".
- **Paso 2 · Agrega Electro Shop:** el teléfono dibujado con lo que hay que tocar: abre la app → "+" → "Escanear código QR" → apunta aquí.
  - En el teléfono: "Toca «Abrir en la app»: tu pantalla no se puede escanear a sí misma".
  - La clave escrita, detrás de "¿No puedes escanear?".
- **Paso 3 · Escribe el número:** la app dibujada con "Electro Shop · 123 456" y el círculo de los 30 segundos, y el campo de 6 cifras.
  - El error dice qué hacer: "Ese número ya cambió. Escribe el que ves ahora."
- **Paso 4 · Guarda tus llaves de repuesto:** los 10 códigos de respaldo, como "la llave de repuesto: si pierdes el teléfono, cada una abre una vez". Se descargan, se imprimen o se copian (`CodigosRespaldo`).
- **Al final, "Así será cada vez que entres":** contraseña → número → panel, dibujado, y qué hace el dispositivo de confianza (C-291).
- **Al entrar:**
  - el teléfono dibujado con el número;
  - "Abre tu app (Google Authenticator, Microsoft o Authy) y escribe el número de Electro Shop";
  - la casilla de confianza (C-291);
  - "¿No tienes el teléfono? Usa una llave de repuesto";
  - "¿Cambiaste de teléfono?", con el WhatsApp del dueño, en lugar de "pide al dueño".
- **El correo de invitación,** con lo que va a necesitar antes de abrirlo: el teléfono y una de las tres apps, con sus enlaces.
- **Verificación:**
  - la prueba de la contadora, de cero, en el teléfono y en la computadora;
  - Google Authenticator de verdad en un teléfono del equipo;
  - 360, 768, 1024 y 1440 px, y "reducir movimiento".
- **Sin cambios en la base.**

### Fase 2 · C-291 · El dispositivo de confianza, 30 días
Decisión del 18/11 (§6.1): para todo el panel (la contadora, los administradores y el dueño), con el código otra vez en lo delicado.
- **Al escribir el código para entrar:** la casilla "No pedir el código en esta computadora por 30 días" ("en este teléfono", según dónde se esté). Si está marcada o no al abrir es la D4.
- **Lo que cambia y lo que no:**
  - en ese dispositivo deja de pedirse el código por 30 días;
  - la contraseña se sigue pidiendo, con el mismo límite de intentos y el captcha;
  - la sesión sigue igual: una sola, de 12 horas, que se cierra tras 1 hora sin uso.
- **Lo delicado pide el código otra vez** si la sesión entró sin código (por confianza). Vale 15 minutos:
  - la clave de la IA y la del servidor de correo;
  - Equipo: invitar, cambiar un rol, quitar a alguien y reiniciar sus dos pasos;
  - Métodos de pago;
  - Respaldos: conectar Drive y restaurar.
  - Es la ventana "Confirma con el número de tu app", con el mismo dibujo de C-290.
- **Se ve y se quita:**
  - **en Mi seguridad,** cada dispositivo con su nombre ("Chrome en Windows"), desde cuándo y su último uso, con "Quitar" y "Quitar todos";
  - **en Equipo,** el dueño ve cuántos tiene cada persona y los quita todos.
- **Se borran todos solos** al cambiar la contraseña, al reiniciar los dos pasos, al suspender la cuenta o quitarla del equipo, y al usar "No fui yo".
- **Aviso:** al marcar uno llega un correo, "Marcaste esta computadora como de confianza", con "No fui yo" (C-285).
- **Bitácora:** cuando se marca, cuando se usa y cuando se quita.
- **Base (aditiva):** la tabla `dispositivos_confianza` y dos columnas en `user_sessions`: cómo pasó el segundo paso y cuándo se confirmó lo delicado (§5.1).
- **Pruebas, el caso normal y el manipulado:**
  - la galleta de otra cuenta, una vencida, una quitada y una inventada;
  - la contraseña cambiada y los dos pasos reiniciados;
  - el sexto dispositivo;
  - lo delicado sin el código y con el código vencido;
  - sin la casilla, todo igual que hoy.
- **Al terminar,** la regla de `PLAN.md` §7.2 dice cómo quedó.

### Fase 3 · C-292 · La IA de la tienda, no de un proveedor (absorbe C-288b)
**Antes de programar:** maquetas de "Ajustes → IA" con los proveedores, el cambio de motor con antes → después, y un resultado con "Lo redactó…".
- **Tres capas:**
  - **la tienda:** los usos, las instrucciones, las reglas y la revisión. Ya son neutras y se quedan;
  - **la puerta:** `lib/ia/` (`pedirIA`), que elige el proveedor y el modelo de cada uso, con el principal y el respaldo;
  - **los conectores:** uno por forma de hablar.
    - `anthropic` (Claude);
    - `compatible-openai` para Groq, Grok (xAI) y Gemini (Google): los tres aceptan el formato de OpenAI. Hay que comprobarlo en la documentación de cada uno al programar.
    - Cada conector dice sus modelos con su precio, si tiene "esfuerzo", si busca en la web por su cuenta y cómo se prueba la clave.
- **"Buscar en la web" con otro motor:** si el conector no busca por su cuenta, la tienda le pasa las páginas que encontró, como hoy con Groq. La pantalla dice cuál de las dos hace cada motor.
- **Base (aditiva):**
  - `ia_proveedores`: una fila por proveedor, con la clave cifrada como hoy, si está activo, el modelo por defecto y cuándo se cambió la clave;
  - en `ia_ajustes`, el proveedor principal, el de respaldo y uno por uso, si se elige.
  - Sin filas nuevas, todo sigue como hoy: Anthropic con la clave del panel o del `.env`, y Groq de respaldo en la búsqueda.
- **La pantalla, "Ajustes → IA":**
  - arriba, el motor que responde (logo, proveedor y modelo) y el de respaldo;
  - **Proveedores:** una tarjeta por cada uno (Anthropic · Claude, Google · Gemini, xAI · Grok, Groq), con su clave, "Probar la conexión" y sus modelos. Un proveedor sin clave dice "Conectar".
  - **Usos:** cada uno sigue al principal o elige otro proveedor y modelo (lo que era C-288b);
  - **Reglas e instrucciones:** "Son de la tienda: valen para cualquier motor".
  - **Consumo y fallas,** por proveedor.
  - **Cambiar de motor** va con "Revisar y cambiar": antes → después y "Probar los seis usos con el nuevo" sin guardar (ya existe "Probar").
- **Los textos** (decisión del 18/11):
  - los botones dicen "Armar con IA", "Proponer con IA" o "Redactar con IA", con el ícono de la IA;
  - el resultado dice en letra chica quién lo hizo: "Lo redactó Claude Haiku 5.5";
  - la plantilla de Importar dice que sirve con claude.ai, Gemini o ChatGPT, con su logo (regla 2 de la skill).
- **También de C-288b:** "No sirvió" en cada resultado, con el motivo, para ver lo que el equipo marca como malo.
- **Lo que no:** no se compra ninguna clave nueva. Los conectores de Gemini y Grok se prueban con su API simulada, y el uso real empieza cuando el equipo traiga una clave.
- **Pruebas:**
  - con las API simuladas de los cuatro proveedores: cambiar el principal, el respaldo cuando el principal falla, un uso con otro motor y el costo anotado por proveedor;
  - que la clave nunca salga;
  - los 76 casos de las reglas con cada proveedor, y los 32 de C-288 otra vez.

### Fase 4 · C-293 · Ajustes: el mapa nuevo, Tu negocio y Vender
**Antes de programar:** maquetas del mapa, con la A y la B de D1 en el teléfono y en la computadora, con los datos de producción. También Datos y contacto, Tasa e IVA y Envíos.
- **El marco nuevo:**
  - los grupos de §3, cada sección con su estado en una línea ("Tasa automática · 36,50 Bs", "Mantenimiento apagado", "IA: Claude Haiku 5.5");
  - las direcciones viejas (`#precios`, `#envios`…) siguen llevando a su sección;
  - en el menú, "Ajustes".
- **Tu negocio y Vender,** pasadas a las reglas de §3. Métodos de pago entra si se elige así (D5).
- **Se quita lo de D3** que es de estos grupos: los interruptores de stock repetidos.
- **Dinero:** la misma validación del servidor (`lib/validations/settings.ts`, `PUT /api/settings`) y el aviso del salto de la tasa (S-08). Cambia cómo se ve, no qué se acepta.
- **Pruebas:**
  - cada campo de antes, guardado desde su lugar nuevo y leído en la tienda: el precio en bolívares, el IVA en el carrito, el envío gratis en el checkout y el retiro en la ficha;
  - el caso manipulado de la tasa y del IVA;
  - 360, 768, 1024 y 1440 px.

### Fase 5 · C-294 · Ajustes: Avisos, Conexiones y La tienda en línea
- **Avisos:** los correos de alerta, Telegram y "Qué avisar", juntos (D6).
- **Conexiones:** Correo y Respaldos con las mismas reglas (IA ya viene de C-292). El interruptor de las campañas, a Marketing.
- **La tienda en línea:** el mantenimiento, y Portada y Google y redes donde se elija (D2).
- **Se quita lo de D3 que queda:** los colores de los correos, las palabras clave y la tarjeta Equipo.
- **Pruebas:**
  - un aviso de cada canal (correo, Telegram, la campana);
  - el mantenimiento encendido con una IP permitida;
  - el correo de prueba del servidor de correo;
  - un respaldo a mano.

## 5. Cómo se construye (para Claude)

### 5.1 El dispositivo de confianza
- **La galleta:**
  - un número al azar de 32 bytes, en una galleta `__Host-` con `httpOnly`, `Secure`, `SameSite=Strict` y 30 días;
  - en la base se guarda solo su huella (como `lib/token-huella.ts`), con `userId`, el dispositivo (`describirDispositivo`), la IP, cuándo se creó, cuándo vence, el último uso y cuándo se quitó.
  - Hasta 5 por persona: el sexto quita el más viejo.
  - **Vence a los 30 días de marcarlo:** usarlo no lo alarga.
- **Al entrar:**
  - en `authorize` (`lib/auth.ts`), con los dos pasos activos y sin código, se busca la galleta: tiene que ser de esa misma cuenta, estar vigente y no estar quitada. Si sirve, el segundo paso queda hecho "por confianza". Si no sirve, se pide el código como hoy y la galleta se borra;
  - el límite de intentos y el captcha van antes, como hoy.
- **Marcarlo:** una ruta propia justo después de entrar. Solo acepta una sesión que pasó el segundo paso con el código hace menos de 5 minutos. Antes de escribir la galleta desde una ruta, consultar `node_modules/next/dist/docs/`.
- **Lo delicado:**
  - `exigirCodigoReciente(session)` en esas rutas: con una sesión "por confianza" sin confirmar en los últimos 15 minutos, responde 403 con `codigo: 'CODIGO_RECIENTE'`;
  - la pantalla abre la ventana del código y, al confirmarlo, repite el pedido;
  - las dos columnas nuevas de `user_sessions` guardan cómo se pasó el segundo paso y cuándo se confirmó lo delicado.
- **Quitar:** en las mismas funciones que hoy cierran las sesiones (cambio de contraseña, reinicio de los dos pasos, suspensión, quitar del equipo, "No fui yo"), y con `sessionVersion`.

### 5.2 La IA
- `lib/ia/claude.ts` pasa a `lib/ia/pedir.ts`, con los conectores en `lib/ia/proveedores/`. Los imports se cambian en el mismo commit, sin un archivo que solo reexporte.
- El catálogo de cada proveedor (modelos, precios y lo que puede hacer) va en su conector. Los precios se cargan al programar, de la página de cada proveedor, con su fecha. Cada pedido ya guarda su costo, así que el historial no se mueve.
- `ANTHROPIC_*` y `GROQ_*` del `.env` siguen sirviendo de respaldo. Las claves nuevas van solo en el panel, cifradas como hoy (`lib/ia/clave.ts`).
- Los textos de las 19 pantallas se cambian en un commit propio, para revisarlos juntos.

### 5.3 Ajustes
- Una página por grupo o una por sección, según D1. Cada sección, con su guardado, deja la barra común.
- `fields.tsx` gana los anchos de §1.5: `TextField` y `NumberField` reciben el tamaño de su dato en lugar de estirarse.
- **El método de las pantallas de ChatGPT** (`archivo/CHATGPT.md` §4): antes de mover, el inventario de cada campo y cada acción. Nada desaparece sin estar en D3.

## 6. Decisiones del equipo

### 6.1 Tomadas (18/11)
- **El dispositivo de confianza:** para todo el panel (la contadora, los administradores y el dueño), 30 días. Lo delicado pide el código otra vez. Se ve y se quita en Mi seguridad y en Equipo, llega un correo al marcarlo y se borran todos al cambiar la contraseña o reiniciar los dos pasos.
- **La IA en los textos:** "IA" en los botones, con el nombre del motor al lado en el resultado ("Lo redactó Claude Haiku 5.5"). La sección se llama "IA". Cambiar de motor no toca ningún texto.

### 6.2 Tomadas el 18/11, con las preguntas de la sesión (lo recomendado en las seis)
Al empezar el trabajo ("vamos a arreglar todo"), el equipo eligió con preguntas de opciones, y en D1 con el dibujo de las dos pantallas:
- **D1 · El mapa de Ajustes (C-293):** el menú agrupado. En la computadora, el menú de la izquierda por grupos con el estado de cada sección; en el teléfono, primero la lista y después la sección.
- **D2, D5 y D6 · Lo que se mueve:**
  - Métodos de pago entra a Ajustes → Vender (sale de Administración);
  - "Qué avisar" y Telegram pasan a Ajustes → Avisos con los correos de alerta, y Notificaciones se queda con la bandeja;
  - Portada y Google y redes pasan a Marketing: también las cambian los administradores con permiso de contenido.
- **D3 · Se quitan los cuatro:** los colores de los correos, las palabras clave de las páginas, la tarjeta Equipo repetida y los interruptores de stock repetidos. Los datos se quedan en la base.
- **D4 · La casilla "No pedir el código por 30 días":** apagada al abrir.

**No se propone cambiar** la regla de la sesión del panel: 12 horas y cierre tras 1 hora sin uso (`PLAN.md` §7.2). Si con el dispositivo de confianza la contadora sigue escribiendo la contraseña muy seguido, esa es otra decisión del equipo.

## 7. Lo que no entra (por ahora)
- **Entrar sin contraseña** (llaves de acceso o huella del teléfono): el código sigue siendo el segundo paso.
- **Mandar el código por SMS o por correo:** es más débil que la app. Por eso C-141 eligió la app.
- **Comprar claves de Gemini o Grok:** el conector queda listo; usarlo es decisión de costo del equipo.
- **Los ajustes del cliente** (Mi panel → Mi perfil): este plan es del panel.

## 8. Riesgos y cómo se evitan
- **Un dispositivo de confianza robado** entra con la contraseña. Para eso:
  - lo delicado pide el código;
  - el dispositivo se quita desde cualquier otro y el dueño lo quita desde Equipo;
  - llega un correo al marcarlo;
  - vence a los 30 días sin alargarse.
- **Perder un ajuste al moverlo:** el inventario antes de mover (§5.3) y la prueba de cada campo leído en la tienda (C-293).
- **El dinero:** la tasa, el IVA y el envío mantienen su validación del servidor y su antes → después. Ningún precio se calcula distinto.
- **Un motor nuevo que redacta distinto:** las reglas de la tienda se aplican igual a cualquier motor, y "Probar los seis usos" va antes de cambiar.
- **Las direcciones viejas de Configuración** (marcadores y enlaces de los correos): siguen llevando a su sección.

## 9. Cómo sabemos que salió bien
- La contadora configura los dos pasos sola, en su teléfono, y después entra varios días seguidos sin pedir ayuda y sin escribir el código cada vez.
- Cambiar el motor de la IA es un cambio en Ajustes: no hace falta un deploy ni tocar textos.
- En Ajustes, cada cosa está una sola vez, el nombre de cada sección dice lo que lleva y ningún campo es más ancho que su dato.
- Las pantallas nuevas pasan la lista de la skill `herramientas-claras`.
