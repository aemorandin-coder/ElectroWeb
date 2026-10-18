# Lo de ahora (actualizado 2026-10-18, C-182 · producción en 1.0.0-rc.16)

> Solo lo vigente. El plan completo, la lista de pendientes y las decisiones están en [`PLAN.md`](./PLAN.md) (§5 y §7). Cómo se sube y cómo se prueba, en [`OPERACION.md`](./OPERACION.md). Lo ya subido, con su SQL y sus pruebas, en [`HISTORIAL.md`](./HISTORIAL.md).
> Las referencias viejas a "`SIGUIENTE.md` §N" que quedan en los estados son de antes del 01/10: el deploy y los datos para Claude pasaron a `OPERACION.md`, las decisiones a `PLAN.md` §7 y los bloques de deploy a `HISTORIAL.md`.

## 1. Cómo está todo
- **Producción: `v1.0.0-rc.16`** (`0ce73f7`, C-182), subida el 18/10 con Claude conectado y la aprobación de Luis. Es igual al código de `main`. **No hay código por subir.**
- **Pedido del 16 y 17/10 (Luis): cotizaciones desde Numen.** Numen es la app de precios y proveedores del equipo, en un repositorio privado aparte. Las cotizaciones las arma Numen y las emite la web.
  - **C-181:** la entrada de servidor a servidor, y cuándo el cliente abre su enlace. Hecha (`estado/C-181.md`).
  - **C-182:** el documento con el estilo del presupuesto técnico (Luis eligió la maqueta A, con impresión en blanco y negro) y su PDF. Hecha y en producción el 18/10 (`estado/C-182.md`).
- **Pedido del 16/10 (Luis, del equipo, trabajando con Claude desde su laptop):** la salud del servidor y las imágenes que se ven al compartir un enlace de la tienda. Primero el plan y después el código. Tareas:
  - **C-176 · Mantenimiento del servidor:** hecha el 16/10 (`estado/C-176.md`, `HISTORIAL.md`). El sistema quedó al día, con Node 24, kernel nuevo, fail2ban, HTTP/2 y registros con tope. La tienda estuvo caída unos 10 segundos.
  - **C-177 · Dependencias seguras:** hecha y en producción el 16/10. Next, sharp y nodemailer quedaron en versiones sin las fallas conocidas, y la tienda escucha solo en `127.0.0.1`.
  - **C-178 · Imágenes para compartir:** hecha y en producción el 16/10. Decisiones de Luis con maquetas reales (Andrés puede cambiarlas):
    - Precio solo en dólares.
    - Estilo mixto: los productos en claro; la portada, las categorías y las páginas en oscuro.
    - Nombres tal cual, sin "(SALDO)" en la imagen.
    - Lo subido a mano en SEO manda.
    - La portada dice "Todo lo encuentras con nosotros." (ajuste rc.14, después de verla en WhatsApp).
  - **Aparte:** la portada del perfil de WhatsApp Business, con Chispa, en el estudio de Chispa (`C:\Users\W11\chispa\salida\portada-whatsapp.png`).
- **El ciclo C-168 a C-175 está completo.**
- **Activar "Continuar con Google"** (C-85) es aparte y solo de Andrés: un cliente OAuth nuevo y dos líneas en el `.env` (pasos más abajo). No cambia código.
- **Sin confirmar con Andrés:** la restauración de prueba del respaldo, el redondeo de C-96 y las pruebas visuales de C-162.
- **Gemini:** sin ronda abierta.

## 2. Deploy pendiente: ninguno (producción en `v1.0.0-rc.16`)
Los bloques de C-182 (rc.16) y C-181 (rc.15), con el SQL, lo comprobado y su vuelta atrás, pasaron a `HISTORIAL.md`.

### Por confirmar de rc.16 (C-182, unos 10 minutos)
1. **Panel:** Admin → Cotizaciones → una cotización → abajo, "Lo que no incluye" y "Anexo técnico" (con una tabla: `Equipo | Consumo` y una fila). Guardar y ver la vista previa: el recuadro ámbar y la segunda hoja.
2. **Impresora sin color:** en el enlace, "En blanco y negro". La hoja sale sin fondos de color y se lee completa.
3. **Teléfono:** en el enlace, "Descargar PDF". Abre el presupuesto en hoja carta; si está pendiente, tocar el QR abre el enlace.

### Por confirmar de rc.15 (C-181, unos 5 minutos)
1. **Panel:** Admin → Cotizaciones → una enviada. Debajo de "Enlace para el cliente" dice "El cliente todavía no la abrió" (las de antes no tienen el dato).
2. **WhatsApp:** pega ese enlace en un chat contigo mismo y deja que arme la vista previa, sin abrirlo. Recarga el panel: sigue diciendo que no la abrió.
3. **Teléfono:** abre el enlace en una ventana de incógnito, sin la sesión del panel. Recarga el panel: dice "El cliente la abrió el …".
4. **Lo de siempre:** en una cotización de prueba, "Enviar", "Aprobar" (registrada por ti) y "No se concretó". Si tenía un producto del catálogo, el inventario baja y vuelve como antes.

### La clave de Numen (más adelante, con la confirmación de Andrés)
Cuando Numen esté instalado y conectado. Es una variable nueva de producción.
1. **Terminal del servidor de la tienda:** `openssl rand -hex 32`.
2. Pegar el resultado en `.env` con `nano .env`, en una línea `NUMEN_API_KEY="…"`.
3. Correr `bash scripts/deploy.sh --sin-pull`.
4. Guardar la misma clave en el gestor de contraseñas. Claude la pone en el `numen.env` del servidor de Numen como `NUMEN_WEB_CLAVE`.
5. Comprobar: `curl -s -o /dev/null -w "%{http_code}\n" -X POST https://electroshopve.com/api/numen/cotizaciones` ahora da `401`.

Los bloques de C-178 (rc.13 y su ajuste, rc.14), con lo que se comprobó y su vuelta atrás, pasaron a `HISTORIAL.md`.

### Por confirmar de rc.13 y rc.14 (C-178, unos 10 minutos)
Claude ya comprobó en producción, pidiendo como los lectores de Facebook y WhatsApp, que cada página tiene su imagen. Falta verlo en las apps de verdad:
1. **Facebook:** en [el depurador de Facebook](https://developers.facebook.com/tools/debug/), pega `https://electroshopve.com` y un producto, y toca **"Volver a extraer"**. Debe salir la imagen nueva, ancha, sin advertencias de tamaño.
2. **WhatsApp:** pega un enlace de un producto en un chat contigo mismo. WhatsApp guarda un rato la vista previa de cada enlace: para ver la portada nueva enseguida, prueba con `https://electroshopve.com/?w=2`. **Desde el teléfono**: WhatsApp de escritorio siempre la arma chica (comprobado el 16/10, `estado/C-178.md`); para compartir grande desde la computadora, se reenvía un mensaje que salió grande. Sale la tarjeta con la foto, el nombre y el precio. Los enlaces que ya se habían compartido conservan su vista previa vieja: eso no se puede cambiar.
3. **Configuración → SEO:** en Inicio, Productos, Servicios y Cursos, "Así se ve en WhatsApp" muestra la imagen generada.
4. **Un precio:** cambia el precio de un producto, guarda y vuelve a pasarlo por el depurador de Facebook. La imagen dice el precio nuevo.

### Por confirmar de rc.12 (C-177, unos 5 minutos)
Claude ya comprobó la tienda, el panel sin sesión, el tiempo real y las fotos. Falta lo que solo se ve con tu cuenta:
1. **Correo del panel (nodemailer nuevo):** Configuración → Correo → "Probar conexión" a tu correo: llega.
2. **Correo a un cliente:** en una ventana de incógnito, "Olvidé mi contraseña" con tu correo de cliente: llega y el botón funciona.
3. **Foto de producto (sharp nuevo):** edita un producto y sube una foto con fondo transparente o blanco liso. Sale con fondo blanco, el producto centrado y la cinta ES.

### Por confirmar de rc.7 a rc.11 (ya en producción, unos 15 minutos)
El bloque de rc.7 a rc.11 (C-171, C-170, C-175 y C-172), con su verificación y su vuelta atrás, pasó a `HISTORIAL.md`. Falta que Andrés dé por buenas sus pruebas:
1. **Dashboard:** se ve como siempre. Arriba a la derecha, **Editar**.
2. **Editar:** quita "Órdenes recientes" con el botón rojo; en "Agregar" toca "Visitantes ahora" y "Meta del mes"; cambia el tamaño de una tarjeta; arrastra una con el ícono de la cruz (o usa las flechas); en "Tus accesos rápidos" agrega "Clientes". **Listo**. Recarga: sigue igual. Ábrelo en el teléfono: es el mismo.
3. **Meta del mes:** escribe tu meta en la tarjeta y guarda: muestra el porcentaje y cuánto falta.
4. **Luis:** su Dashboard sigue siendo el de siempre (no cambió con el tuyo) y en "Agregar" **no** le salen "Meta del mes" ni "Respaldo".
5. **Restablecer** (dentro de Editar) vuelve al diseño original.
6. **Sin pisarse (C-170)**, con dos cuentas de administrador: abran la misma **cotización**; uno cambia "Para qué es" y el otro el lugar, y guardan los dos: quedan los dos cambios sin preguntar. Si los dos cambian lo mismo, sale el cuadro para elegir. Lo mismo vale en Promotores (lápiz), Categorías, Ofertas y Campañas. En **ElectroStudio**, escribe en una historia: debe seguir diciendo "Guardado".
7. **Correos (C-175):** Admin → Marketing → Correos → **Plantillas**: abre "Pedido recibido", "Gift card" y "Reseña publicada": arriba el logo largo, un botón azul y el pie con las redes.
8. **Un correo de verdad:** Configuración → Correo → **"Probar conexión"** a tu Gmail. Ábrelo en la computadora y en el teléfono (también en modo oscuro): el logo largo se ve completo y nítido, y nada queda cortado. Si puedes, reenvíalo a un Outlook u Hotmail. Si algo se ve mal, manda la captura.
9. **Destacados (C-172), en la computadora:** abre el inicio y espera 7 segundos: el producto grande cambia por el primero de la columna y arriba a la derecha dice "2 de N". Pon el ratón encima: se detiene. Toca las flechas y la pausa. Déjalo solo: da una vuelta y se queda en el primero. En el teléfono no gira.
10. **Otro correo, de los de siempre:** en una ventana de incógnito, "Olvidé mi contraseña" con tu correo de cliente: llega con el mismo diseño y el botón funciona.

### Por confirmar de lo ya subido (rc.6 y rc.7; detalle en `HISTORIAL.md`)
El Dashboard a tu gusto (pruebas 1 a 5 de arriba). Versiones (Administración → Versiones), el caso de dos administradores sobre un producto (papelera, combinar, aviso al instante), la marquesina del equipo y Reportes en vivo. La línea del cron de la papelera ya está en `crontab -l` (comprobado el 16/10).

### Activar "Continuar con Google" (C-85, cuando quieras; no necesita deploy de código)
1. Google Cloud → proyecto ElectroWeb → Google Auth Platform → **Clientes** → Crear cliente → **Aplicación web**, nombre `ElectroShop inicio de sesión`, y en "URIs de redireccionamiento autorizados": `https://electroshopve.com/api/auth/callback/google`. Es un cliente distinto del de los respaldos.
2. En el servidor, `nano .env` y agregar `GOOGLE_CLIENT_ID="…"` y `GOOGLE_CLIENT_SECRET="…"`; luego `bash scripts/deploy.sh --sin-pull`.
3. En una ventana de incógnito, `/login` y `/registro` muestran "Continuar con Google". Probar con un Gmail que **no** sea el de administrador (los administradores no entran con Google, a propósito). Nunca se probó con Google real (`estado/C-85.md`): si falla, mandar la captura.

### Por confirmar de lo que ya está en producción (C-165 y anteriores)
No hay más deploy pendiente que el de arriba. Estas son las pruebas que Andrés debe dar por buenas (o avisar a Claude con lo que falle). Detalle en `estado/C-165.md`, `estado/C-164.md`, `estado/C-159.md` y `estado/C-160.md`; lo subido, con su SQL, en `HISTORIAL.md`.

### Respaldos (C-165), lo más importante
1. **La clave privada guardada fuera del servidor** (gestor de contraseñas) y una copia del `.env`.
2. **Google conectado:** Configuración → Respaldos → Google Drive muestra "Conectado" y su correo. Requiere la app **publicada** ("En producción" en Google Auth Platform → Público), si no el permiso vence a los 7 días.
3. **"Respaldar ahora":** dos filas "Hecho" (base y fotos/constancias) y dos archivos `.enc` en la carpeta "Respaldos ElectroShop" de su Drive. Si sale "Falló", pasar el texto del historial a Claude.
4. **"Verificar el último":** dice que coincide con Drive.
5. **Respaldo encendido y el cron puesto:** `crontab -l` muestra `5 * * * * /home/luami/cron-respaldos.sh …`; al día siguiente aparece un respaldo "automático" en el historial.
6. **Una restauración de prueba** (`OPERACION.md`, "Restaurar un respaldo", pasos 1 a 3): un respaldo que nunca se abrió no es un respaldo. Repetirla cada trimestre.

### Otras pruebas pendientes (unas 20 minutos)
1. **Últimos menores (C-164):** una valoración con decimales sale con coma ("4,5") en Admin → Cursos o en el panel del creador; Puntos ES → "Recargar": al escribir un monto aparece el equivalente en bolívares.
2. **Dashboard:** con el respaldo encendido y hecho, no sale el recordatorio de respaldos; apagado, sí.
3. **Retención (C-159, si faltaba):** Admin → Cotizaciones → Nueva → una línea de $116 → "Retención del IVA" 75 %: "Retención del IVA (75 %): −$12,00 · Neto a pagar: $104,00". "Enviar por correo" a tu correo: llega con un botón. "Mis cotizaciones" en una cuenta de cliente.
4. **Páginas legales (C-160, si faltaba):** `/terminos` y `/privacidad`: **leer el correo, el WhatsApp y el horario del final** (salen de Configuración → Negocio). Configuración → Correo → "Probar conexión". Buscar `teclado` y ordenar "Menor a mayor". La reseña solo aparece a quien compró.

### Pruebas de lo anterior, si faltan (ya está en producción)
- **Reseña por correo (C-157):** Admin → Marketing → Correos → "Pedir la reseña" (correo de ejemplo con dos botones); Mi perfil → Notificaciones → "Tus reseñas". **Prueba real:** adelantar una orden tuya entregada y correr el cron:
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -c "UPDATE orders SET \"deliveredAt\" = now() - interval '6 days', \"reviewRequestedAt\" = NULL WHERE \"orderNumber\" = 'ORD-2026-00XX'"` (con su número) y `~/cron-resenas.sh`: debe responder `"correos":1` y llegarte el correo.
- **Buscador (C-158):** en la tienda, `audifonos` sin acento y `tecaldo` mal escrito; en Admin → Productos, buscar con y sin acento.
- **Inicio y categorías (C-162, C-163):** en la computadora, "Destacados de la semana" con la foto llenando la tarjeta y "NUEVO" en la esquina; "Compra por categoría" con seis categorías y cada producto en la suya.
- **Volver a subir tres fotos** (las ya armadas no cambian solas): editar el producto, quitar la foto y subirla otra vez. **Tablet W&O** y **audífonos Piston** (para que la cinta salga sin el corte) y **Grand Theft Auto V PS5** (centrada y con aire; quitar las dos primeras, que son la misma). Si no tienes el original, la tienda lo guarda: la dirección de la foto, terminada en `.orig.png` en vez de `.webp`.
- **Buscar en la web (C-155):** Productos → Nuevo → Producto físico, "Teclado mecánico Redragon Kumara K552", "Buscar". Si arriba dice "Los datos vienen de la búsqueda con IA y no se pudieron contrastar", los buscadores no le responden al servidor: avisar a Claude. La clave va en el `.env` del servidor como `GROQ_API_KEY`.
- **Marca (C-155):** ponerla en los audífonos Piston, el SSD y el teclado AOAS.
- **Embalaje según el paquete (C-153):** Configuración → Envíos y retiro → encender, corregir las medidas y los precios de tus sobres y cajas, y poner el monto del embalaje gratis. Una compra barata con envío: en la orden, "Cómo empacar".

### Si algo sale mal
- **El respaldo falla o Google no conecta:** no afecta a la tienda. Ver el motivo en el historial de Configuración → Respaldos y pasárselo a Claude. Mientras tanto sirve `~/respaldo-antes-c165.dump` (hecho antes de subir).
- **Volver atrás el código:** `git reset --hard <commit> && npm install && bash scripts/deploy.sh --sin-pull`, con `<commit>` = `d453809` (deshacer solo C-165) o `2ccba36` (también C-164). Las tablas nuevas no molestan al código anterior (no se quitan). Antes, quitar la línea de `cron-respaldos.sh` de `crontab -e`: la ruta ya no existiría y el cron daría error cada hora.
- **Si el correo del panel deja de salir** (certificado): `SMTP_ALLOW_SELF_SIGNED="true"` en el `.env` y el deploy, o volver atrás.
- **Si el cron de reseñas manda correos de más:** quitar su línea de `crontab -e` y avisar a Claude con lo que respondió `~/cron-resenas.sh`.
- **Redondeo de C-96** (pendiente desde el 24/09, si falta), con su respaldo:
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && pg_dump -Fc "$DB" -f ~/respaldo-antes-redondeo-c96.dump`
  `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/redondeo-c96.sql`
  Muestra tres números: el último debe ser 0; si el del medio ("diferencia real") no es 0, pasarle la salida a Claude.

## 3. Tareas del equipo (Andrés y Luis, sin código)
En el orden en que más destraban:

**En producción**
1. **Las pruebas de la sección 2:**
   - rc.16: el anexo en el panel, la hoja en blanco y negro y el PDF en el teléfono.
   - rc.15: la vista del cliente en el panel.
   - rc.12: el correo y la foto de producto.
   - rc.13 y rc.14: el depurador de Facebook, desde el teléfono.
   - rc.7 a rc.11: el Dashboard.
   - De antes siguen pendientes **una restauración de prueba del respaldo** (`OPERACION.md`), el redondeo de C-96, las pruebas de C-157 y las visuales de C-162.
1b. **El catálogo de WhatsApp (C-180, `PLAN.md` §5.2):**
   - **Hecho el 16/10:** la portada del perfil de WhatsApp Business (con Chispa), y el catálogo creado en Commerce Manager con el feed.
   - **Falta mandarle a Claude la captura de Commerce Manager:** cuántos productos entraron y la pestaña de problemas.
   - **Falta volver a subir desde el panel la foto original, sin cinta, del SSD Hiksemi y del teclado AOAS:** quitar la foto principal y subir el original. La tienda le pone sola la cinta para la web.
   - **Todavía no se conecta el catálogo a la app:** se hace cuando Claude suba C-180.
2. **Guardar aparte, fuera del servidor, la clave privada del respaldo y una copia del `.env`** (gestor de contraseñas). La clave la muestra el panel una sola vez; el `.env` no va dentro del respaldo y trae `NEXTAUTH_SECRET`, `DATABASE_URL` y las claves de pago.
3. **Un monitor de que la tienda está arriba** (gratis, sin código): UptimeRobot o similar apuntando a `https://electroshopve.com/robots.txt` cada 5 minutos, con aviso a tu correo y a Telegram. Todo lo demás (avisos, respaldos) vive en el mismo servidor y no puede avisar si se cae.
4. **Tus llaves para entrar al servidor (C-176):** en tu laptop y en tu PC, en PowerShell, `ssh-keygen -t ed25519` (Enter a todo) y mandarle a Claude el contenido de `C:\Users\<tu usuario>\.ssh\id_ed25519.pub`. Es la llave **pública** y se puede compartir; la privada (`id_ed25519`, sin `.pub`) no sale de tu computadora. Cuando las dos estén puestas, el servidor deja de aceptar contraseña. El certificado HTTPS ya se renueva solo: se renovó el 13/10 y vence el 11/01/2027.
5. **La revisión final** ([`REVISION_FINAL.md`](./REVISION_FINAL.md)): en el teléfono real, marcando cada punto. Pendiente desde el 26/09. **Antes de `v1.0.0`, al menos el dinero:** una compra con Pago Móvil, una con Puntos ES, recargar Puntos ES, un cupón y cancelar una orden (que vuelvan el stock y el cupón).
6. Pasar a borrador el **"Producto Test"** (Consolas) y renombrar los productos digitales que dicen **"(SALDO)"** (`estado/C-136.md`).
7. **Marca** en cada producto físico (campo nuevo, junto a la categoría). La **imagen para compartir** ya la arma la tienda (C-178); subir una propia en Configuración → SEO es opcional.
8. **Cargar catálogo:** con la búsqueda en la web (C-155) o con la carga masiva (Productos → Más → "Importar (.json)").

**Medición (antes de pagar un anuncio)**
9. **Google Search Console:** agregar `electroshopve.com`, enviar `https://electroshopve.com/sitemap.xml` y revisar "Páginas" una semana después.
10. **Google Analytics y píxel de Meta:** poner `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_FB_PIXEL_ID` en el `.env` del servidor y correr el deploy (`estado/C-145.md`).
11. Cuando vaya a pagar anuncios en Meta: el catálogo con `https://electroshopve.com/feed/productos.xml` (pasos en `HISTORIAL.md`, C-149).

**Datos y decisiones que tienen tareas paradas** (`PLAN.md` §7.1)
12. Entrega de un código y de una recarga: **respondió el 01/10** que tarda unas 2 horas y que la meta es 30 minutos. **Falta el horario** en que se atiende (para el plazo en la ficha, C-154b).
13. Medidas y precios reales de los sobres y cajas, el precio del "bulto aparte" y el monto del embalaje gratis.
14. Cuánto cobran ZOOM y MRW en Guanare por el seguro, y si aplica con cobro a destino (C-107).
15. El diagnóstico de clientes borrados (C-92). En el servidor, solo lee:
    `DB=$(grep '^DATABASE_URL' .env | cut -d= -f2- | tr -d '"' | sed 's/?.*//') && psql "$DB" -f docs/plan/scripts/diagnostico-c92.sql > ~/diagnostico-c92.txt 2>&1`
    y pasarle a Claude el contenido de `~/diagnostico-c92.txt`.
16. ¿La cinta ES también en los productos que no son nuevos (al menos en "Caja abierta")? Hoy llevan su etiqueta y no la cinta (`estado/C-161.md`).
17. Avisar cuando SADES vuelva (taller).

**Con el abogado y el contador**
18. Abogado: términos y privacidad (ahora se editan en Legal → Documentos; `estado/C-120.md` §7) y las 3 afirmaciones de `estado/C-144.md` (el motivo "comprobante vencido o ilegible", los plazos y los datos de contacto).
19. Contador: las preguntas de `estado/C-151.md` (IVA de los digitales), `estado/C-147b.md` (embalaje), `estado/C-120.md` §6 y **`estado/C-159.md` (retención del IVA: quiénes retienen, el comprobante y si hay retención de ISLR en los servicios)**.

**Limpieza opcional, en tu máquina** (todo ya está en `main` o fue reemplazado)
- ChatGPT: `git worktree remove ../ElectroShopVe-chatgpt`, `git branch -D chatgpt/R1 chatgpt/product-fixes chatgpt/product-fixes-main` y `git stash drop stash@{0}`.
- Ramas locales ya fusionadas: `git branch --merged main` las lista; se pueden borrar con `git branch -d <rama>`.

## 4. Fila de Claude
La lista completa, con lo que espera datos, está en `PLAN.md` §5.2. **El pedido del 16/10 está hecho** (C-176, C-177 y C-178). **Cotizaciones desde Numen:** C-181 hecha y en producción (rc.15). Sigue **C-182**: el documento y el PDF con el estilo del presupuesto. Luis eligió la maqueta A (la fiel), con la opción de imprimir en blanco y negro. **Sigue C-180** (fotos del feed para el catálogo de WhatsApp) cuando llegue la captura de Commerce Manager (§3, 1b). Quedan de ahí: SSH solo con llave (tus llaves, §3), Prisma 7, Next 16.4 y el aviso de npm 12 (`PLAN.md` §5.2). Lo que espera un dato tuyo:
- Esperan datos: C-154b (plazo de los digitales: ya se sabe que son unas 2 horas, falta el horario), C-107 (seguro), C-92 (clientes) y C-153b (decidir si los "frágiles" llevan más relleno).
- **Decisiones abiertas de promotores** (`PLAN.md` §7.1, A13 y A14): si los digitales pagan comisión, los % por defecto y los términos del programa para el abogado.
- **C-166b (después de una semana con C-166 limpia):** pasar la Content-Security-Policy a "bloquea" (`CSP_ENFORCE="true"` y un deploy) y, con una restauración probada, evaluar subir el volcado directo a Drive sin pasar por disco si la base crece.
- Lo que salga de la revisión final y de las pruebas del deploy se arregla antes que lo demás.
- Mientras tanto Claude puede revisar `REVISION_FINAL.md` contigo (en el teléfono, punto por punto) o escribir la próxima ronda de Gemini cuando haya una tarea mecánica.
- El plazo de la reseña (C-157) queda en 5 días (2 si es digital), en `lib/resenas-avisos.ts` (`DIAS_FISICO`, `DIAS_DIGITAL`), hasta que Andrés diga otra cosa.

## 5. Mensaje para empezar (próxima sesión de Claude)
> Continúa ElectroShopVe (tienda en producción). Lee `CLAUDE.md`, `docs/plan/SIGUIENTE.md` completo y tu memoria del proyecto; `docs/plan/PLAN.md` §5 y §7 para la lista de pendientes y las decisiones, y `docs/plan/OPERACION.md` antes de probar o de dar pasos de deploy.
> 1. Antes de tocar nada: `git status`, `git log -5 --format='%h %an %s'`, `git branch --show-current` y `git branch -a`.
> 2. Fíjate quién escribe (Andrés o Luis: `CLAUDE.md`). Pregunta:
>    - Si ya llegó **la captura de Commerce Manager** para C-180 y si se volvieron a subir las fotos del SSD y del teclado.
>    - Cómo salieron las pruebas de la sección 2 (rc.12 a rc.15), si se subió algo sin Claude y el redondeo de C-96.
>    - Si hay alguno de los datos de la sección 3 (también las llaves de SSH de Andrés).
>    - Producción se comprueba con `git describe --tags` por SSH (`OPERACION.md` §3).
> 3. Si Gemini entregó algo nuevo, revísalo según `CLAUDE.md` antes de mergear.
> 4. Sigue con la fila (sección 4). Al terminar cada tarea: estado HECHO, su fila en `PLAN_CLAUDE.md`, `PLAN.md` §5 y `SIGUIENTE.md` al día (un solo bloque de deploy con el SQL total y las pruebas), merge y push.
