// Texto inicial de /terminos y /privacidad (C-160). Hasta C-159 eran páginas escritas en el código; desde C-160 son
// documentos legales (tabla `legal_documents`) que se editan en el panel (Legal → Documentos → "Nueva versión").
// Estos textos solo se usan la primera vez, para crear la versión que ya estaba publicada. Después manda la base.
//
// Formato (lib/legal-docs-core.ts): "## Título {#ancla}", "### Subtítulo", "- viñeta", "!! aviso", "**negrita**" y
// "{{dato}}", que se cambia al mostrar la página (lib/legal-publico.ts, `variablesLegales`):
//   {{correo}} {{whatsapp}} {{telefono}} {{direccion}} {{horario}}   → Configuración → Negocio
//   {{garantia_nuevo}} {{garantia_reacondicionado}} {{garantia_usado}} → días por defecto (lib/product-condition.ts)
//   {{ayuda_caja_abierta}} {{ayuda_reacondicionado}} {{ayuda_usado}}   → qué significa cada condición
//   {{definicion_excelente}} {{definicion_muy_bueno}} {{definicion_bueno}} → estado estético
// Los anclas (#garantia, #usados, #puntos-es, #envios, #digitales) los usan enlaces de la tienda: no se quitan.

export const SLUG_TERMINOS = 'terminos';
export const SLUG_PRIVACIDAD = 'privacidad';

/** Las páginas que se leen en la tienda en vez de firmarse (viven aquí para no cruzar imports con legal-docs). */
export const PAGINAS_LEGALES_PUBLICAS: readonly string[] = [SLUG_TERMINOS, SLUG_PRIVACIDAD];
export const esPaginaLegalPublica = (slug: string): boolean => PAGINAS_LEGALES_PUBLICAS.includes(slug);

export interface TextoLegalInicial {
  slug: string;
  title: string;
  /** Número de versión con el que se crea: sigue la numeración que tenían las páginas (3.1 → 4, 2.0 → 3) */
  version: number;
  /** Fecha de la última actualización del texto de código (no la del primer arranque de la base) */
  publishedAt: Date;
  content: string;
}

const TERMINOS = `## 1. Aceptación de los Términos {#aceptacion}
Al acceder y utilizar los servicios de **Electro Shop Morandin C.A.** (en adelante “la Empresa”), usted acepta estar legalmente vinculado por estos términos y condiciones. Si no está de acuerdo con alguno de estos términos, por favor no utilice nuestros servicios. La Empresa se reserva el derecho de modificar estos términos en cualquier momento, siendo responsabilidad del usuario revisar periódicamente los cambios.

## 2. Registro y Seguridad de la Cuenta {#cuenta}
Para acceder a ciertas funciones, deberá registrarse y crear una cuenta proporcionando información veraz y actualizada. Usted es responsable de:
- Mantener la confidencialidad de su contraseña y credenciales de acceso
- Todas las actividades que ocurran bajo su cuenta
- Notificar inmediatamente cualquier uso no autorizado de su cuenta
- Proporcionar documentación de identidad cuando se solicite para verificación

La Empresa puede requerir verificación de identidad mediante cédula y firma digital para ciertas operaciones, especialmente relacionadas con los Puntos ES y transacciones financieras.

## 3. Puntos ES y Recargas {#puntos-es}
Los Puntos ES (Puntos ElectroShop) son un pago anticipado que el usuario hace a Electro Shop para comprar en la tienda. Cada Punto ES equivale a un dólar estadounidense (USD). No son dinero electrónico ni una cuenta de pago: solo sirven para comprar productos y servicios de Electro Shop. Por eso se escriben con el signo de dólar: **"$12,50 Puntos ES"** son 12,50 Puntos ES, que pagan 12,50 dólares de compras en la tienda. Los precios en bolívares se muestran a la tasa del Banco Central de Venezuela del día. Al utilizar este servicio, el usuario acepta las siguientes condiciones:

### 3.1 Política de No Reembolso
!! LOS PUNTOS ES RECARGADOS NO SON REEMBOLSABLES BAJO NINGUNA CIRCUNSTANCIA.
Una vez acreditados, los Puntos ES no podrán ser retirados, transferidos a terceros, ni convertidos en dinero en efectivo. Los Puntos ES únicamente pueden utilizarse para compras dentro de la plataforma.

Si el usuario pide cerrar su cuenta, los Puntos ES que le queden se pierden: antes de cerrarla puede usarlos en productos de la tienda.

### 3.2 Origen Lícito de Fondos
El usuario declara bajo juramento que todos los fondos utilizados para recargar Puntos ES provienen de actividades lícitas y legales. Queda estrictamente prohibido el uso de fondos provenientes de:
- Lavado de dinero o financiamiento del terrorismo
- Narcotráfico o actividades ilícitas
- Fraude, estafa o cualquier actividad criminal
- Evasión fiscal o fondos no declarados

### 3.3 Verificación de Transacciones
Las solicitudes de recarga están sujetas a verificación por parte del equipo de administración. Las transacciones pueden ser rechazadas por:
- Número de referencia inválido o incorrecto
- Monto transferido diferente al declarado
- Datos inconsistentes o sospechosos
- Múltiples intentos fallidos consecutivos
- Sospecha de actividad fraudulenta
- Comprobante de pago vencido o ilegible

El usuario será notificado con el motivo específico del rechazo para su transparencia.

### 3.4 Aceptación de Términos de Recarga
Antes de realizar su primera recarga, el usuario debe aceptar los términos específicos de los Puntos ES mediante firma digital. Esta aceptación incluye:
- Lectura completa de los términos y condiciones de recarga
- Provisión de número de cédula de identidad
- Firma digital como constancia de aceptación
- Registro de fecha, hora y dirección IP para fines legales

## 4. Métodos de Pago y Precios {#pagos}
Los métodos de pago disponibles son **los que la tienda muestra al momento de pagar**, además de los Puntos ES que el usuario tenga en su cuenta. Pueden cambiar con el tiempo. La Empresa no recibe pagos por medios distintos a los que aparecen ahí.

Cada pago se verifica antes de procesar el pedido.

Todos los precios están expresados en **Dólares Americanos (USD)** y pueden ser pagados en Bolívares a la tasa de cambio oficial del BCV vigente al momento del pago. La Empresa se reserva el derecho de actualizar los precios sin previo aviso.

## 5. Envíos y Entregas {#envios}
Realizamos envíos dentro de la **República Bolivariana de Venezuela**. Condiciones:
- Los pedidos se procesan dentro de las 24-48 horas hábiles posteriores a la confirmación del pago
- Envíos nacionales por ZOOM o MRW con **cobro a destino**: la tienda cobra el embalaje y el flete lo paga el cliente a la empresa de envíos al retirar. Los productos marcados con envío gratis viajan sin costo para el cliente
- Los tiempos de entrega dependen de la empresa de envíos y del destino (en general, 2 a 7 días hábiles)
- El cliente puede optar por retiro en tienda sin costo adicional, o por delivery en Guanare cuando esté disponible
- Para retiro en tienda, solo el titular de la cuenta o persona autorizada puede retirar el producto presentando cédula de identidad
- El monto mínimo de compra, si la tienda lo establece, cuenta solo el valor de los productos: el embalaje y el envío van aparte. El carrito y el pago lo indican antes de pagar

## 6. Garantía y Devoluciones {#garantia}
La garantía la presta **la Empresa** y cubre las **fallas de funcionamiento** del producto. El plazo de cada producto aparece en su ficha antes de comprar y queda guardado en el pedido; cuenta desde la entrega. Si la ficha no indica otro plazo: productos nuevos y de caja abierta, {{garantia_nuevo}} días; reacondicionados, {{garantia_reacondicionado}} días; usados, {{garantia_usado}} días. La garantía del fabricante, cuando exista, se suma a la de la Empresa y se tramita según sus condiciones.

### 6.1 Qué no cubre la garantía
- Golpes, caídas, humedad, líquidos, fallas eléctricas externas (bajones o picos de voltaje) o mal uso
- Aperturas, reparaciones o modificaciones hechas por terceros, o sellos de garantía rotos
- El desgaste normal y el estado estético descrito en la ficha de un producto usado, reacondicionado o de caja abierta
- Consumibles y accesorios con vida útil propia, salvo que lleguen defectuosos
- Daños posteriores a la entrega

### 6.2 Cómo pedir la garantía
- Desde “Garantía” en tu cuenta, dentro del plazo del producto, indicando el pedido y describiendo la falla
- La Empresa puede pedir fotos, un video o revisar el equipo en la tienda. El cliente entrega el producto con sus accesorios
- La evaluación tarda de 5 a 10 días hábiles desde que la Empresa recibe el producto

### 6.3 Qué hace la Empresa si procede
Repara el producto; si no es posible, lo cambia por uno igual o equivalente; si tampoco es posible, devuelve el monto pagado por ese producto en Puntos ES a la cuenta del cliente en la tienda.

### 6.4 Devoluciones
**No se aceptan devoluciones por cambio de opinión.** Si el producto llega con una falla, dañado o distinto a lo publicado (modelo, condición o lo que dice incluir), se atiende como garantía según el punto 6.3. Por eso cada ficha describe el producto, y la de un usado muestra fotos reales de la unidad.

### 6.5 Daños en el envío
Revisa el paquete al recibirlo o retirarlo en la agencia. Si llega dañado, avísanos dentro de las **48 horas** siguientes con fotos del empaque y del producto, para reclamar a la empresa de envíos.

## 7. Productos Usados, Reacondicionados y de Caja Abierta {#usados}
- **Caja abierta:** {{ayuda_caja_abierta}} **Reacondicionado:** {{ayuda_reacondicionado}} **Usado:** {{ayuda_usado}}
- Estado estético: **Excelente**: {{definicion_excelente}} **Muy bueno**: {{definicion_muy_bueno}} **Bueno**: {{definicion_bueno}}
- La ficha de cada uno indica su condición, estado estético, empaque (caja original, genérica o sin caja), qué incluye y qué no, y cuando aplica, horas de uso, salud de la batería, detalles y pruebas hechas. Las fotos son de la unidad que se vende. **Al comprarlo, el cliente acepta ese estado.**
- Los accesorios que incluya pueden no ser originales: son compatibles y funcionan
- La garantía es la de la Empresa por el plazo que indica la ficha (punto 6), por fallas de funcionamiento; no cubre el desgaste descrito
- Los cupones de descuento no aplican a estos productos. Las ofertas de la tienda sí

## 8. Productos Digitales {#digitales}
- Gift cards, códigos y recargas se entregan por la cuenta del cliente o en la cuenta que indique al comprar
- Una vez entregado el código o hecha la recarga, **no tiene devolución**. Si un código no funciona, avísanos y lo revisamos con el proveedor
- El cliente es responsable de indicar bien la cuenta, la región y la plataforma: una recarga hecha a los datos indicados no se puede revertir

## 9. Responsabilidad Legal {#responsabilidad}
El usuario acepta total responsabilidad legal por cualquier violación de estos términos y exime a la Empresa de cualquier responsabilidad derivada del uso indebido de la plataforma. La Empresa se reserva el derecho de:
- Verificar la identidad del usuario en cualquier momento
- Solicitar documentación adicional para validar transacciones
- Reportar actividades sospechosas a las autoridades competentes
- Retener fondos durante investigaciones de fraude
- Suspender o cancelar cuentas que violen estos términos sin derecho a reembolso

En caso de disputas legales, el usuario acepta someterse a la jurisdicción de los tribunales competentes de la **República Bolivariana de Venezuela**.

## 10. Firma Digital y Documentos Electrónicos {#firma-digital}
La firma digital proporcionada por el usuario mediante nuestro sistema de canvas electrónico tiene plena validez legal según la legislación venezolana vigente. Los documentos firmados digitalmente, incluyendo la aceptación de términos de recarga, constituyen prueba legal vinculante y pueden ser utilizados como evidencia en procedimientos judiciales.

## 11. Propiedad Intelectual {#propiedad-intelectual}
Todo el contenido incluido en este sitio, como texto, gráficos, logotipos, iconos, imágenes, clips de audio, descargas digitales, compilaciones de datos y software, es propiedad de Electro Shop Morandin C.A. o de sus proveedores de contenido y está protegido por las leyes de propiedad intelectual nacionales e internacionales. Queda prohibida la reproducción, distribución o modificación sin autorización expresa.

## 12. Contacto {#contacto}
Para consultas sobre estos términos y condiciones, puede contactarnos a través de:
- **Email:** {{correo}}
- **WhatsApp:** {{whatsapp}}
- **Horario de atención:** {{horario}}`;

const PRIVACIDAD = `En **Electro Shop Morandin C.A.** nos comprometemos a proteger su privacidad y datos personales. Esta política describe cómo recopilamos, utilizamos, almacenamos y protegemos su información cuando utiliza nuestra plataforma de comercio electrónico.

## 1. Recopilación de Información {#recopilacion}
Recopilamos información personal que usted nos proporciona voluntariamente al:
- **Registrarse:** Nombre completo, correo electrónico, contraseña (encriptada)
- **Completar su perfil:** Número de cédula, teléfono, dirección de envío
- **Realizar compras:** Historial de pedidos, métodos de pago utilizados
- **Recargar Puntos ES:** Referencias de pago, montos, método de pago
- **Aceptar términos de recarga:** Cédula de identidad, firma digital, fecha y hora de aceptación, dirección IP
- **Comunicarse con nosotros:** Mensajes, solicitudes de soporte, comentarios

## 2. Información Recopilada Automáticamente {#automatica}
Cuando utiliza nuestra plataforma, recopilamos automáticamente cierta información técnica:
- **Dirección IP:** Registrada durante acciones críticas como aceptación de términos y transacciones
- **User Agent:** Información del navegador y dispositivo utilizado
- **Cookies de sesión:** Para mantener su sesión activa y preferencias
- **Registros de actividad:** Notificaciones recibidas, acciones realizadas en la cuenta

## 3. Uso de la Información {#uso}
Utilizamos la información recopilada para los siguientes propósitos:
- Procesar y gestionar sus pedidos y transacciones
- Verificar su identidad para operaciones financieras
- Gestionar sus Puntos ES y solicitudes de recarga
- Enviar notificaciones sobre el estado de sus pedidos y transacciones
- Prevenir fraudes y actividades sospechosas
- Generar documentos legales como constancias de aceptación de términos
- Mejorar nuestros servicios y experiencia de usuario
- Comunicarnos con usted sobre su cuenta, pedidos o consultas
- Cumplir con obligaciones legales y regulatorias

## 4. Datos de Firma Digital {#firma-digital}
Para cumplir con requisitos legales y anti-lavado de dinero, al aceptar los términos de recarga de Puntos ES, almacenamos:
- Imagen de su firma digital (formato Base64)
- Número de cédula de identidad
- Fecha y hora exacta de la aceptación
- Dirección IP desde donde se realizó la aceptación
- Información del navegador utilizado (User Agent)
- Versión de los términos aceptados

!! Importante: Esta información se almacena como evidencia legal y puede ser utilizada en procedimientos judiciales o auditorías. El período de retención es indefinido para fines de cumplimiento legal.

## 5. Protección de Datos {#proteccion}
Implementamos medidas de seguridad técnicas y organizativas para proteger su información:
- **Encriptación SSL/TLS:** Todas las comunicaciones entre su navegador y nuestros servidores están encriptadas
- **Contraseñas hasheadas:** Las contraseñas se almacenan utilizando algoritmos de hash seguros (bcrypt)
- **Sesiones seguras:** Utilizamos tokens JWT con expiración para la autenticación
- **Acceso restringido:** Solo el personal autorizado puede acceder a datos sensibles
- **Base de datos segura:** Los datos se almacenan en servidores con medidas de seguridad avanzadas
- **Auditoría:** Mantenemos registros de acceso y modificaciones a datos sensibles

## 6. Cookies y Tecnologías Similares {#cookies}
Utilizamos cookies para mejorar su experiencia en nuestra plataforma:
- **Cookies esenciales:** Necesarias para mantener su sesión activa y el funcionamiento del carrito de compras
- **Cookies de preferencias:** Recuerdan sus configuraciones y preferencias
- **Cookies de autenticación:** Mantienen su sesión segura entre visitas

Puede configurar su navegador para rechazar las cookies, pero esto podría limitar algunas funcionalidades del sitio, como el inicio de sesión automático o el carrito de compras.

## 7. Compartir Información {#compartir}
**No vendemos ni alquilamos su información personal a terceros.** Solo compartimos su información en las siguientes circunstancias:
- **Proveedores de envío:** Nombre, dirección y teléfono para entregas
- **Procesadores de pago:** Información necesaria para validar transacciones
- **Autoridades competentes:** Cuando sea requerido por ley o ante sospechas de actividades ilícitas
- **Cumplimiento legal:** Para cumplir con obligaciones legales, regulatorias o procesos judiciales

## 8. Sus Derechos {#derechos}
Usted tiene los siguientes derechos sobre su información personal:
- **Acceso:** Puede solicitar una copia de los datos que tenemos sobre usted
- **Rectificación:** Puede actualizar o corregir su información desde su perfil de usuario
- **Eliminación:** Puede solicitar la eliminación de su cuenta y datos asociados
- **Portabilidad:** Puede solicitar sus datos en un formato estructurado
- **Oposición:** Puede oponerse al uso de sus datos para ciertos fines

!! Nota: Los datos relacionados con transacciones financieras, aceptación de términos y firmas digitales no pueden ser eliminados debido a requisitos legales de auditoría y anti-lavado de dinero.

## 9. Retención de Datos {#retencion}
Conservamos su información personal durante el tiempo necesario para cumplir con los propósitos descritos en esta política:
- **Datos de cuenta:** Mientras su cuenta esté activa, más 2 años adicionales tras la eliminación
- **Historial de pedidos:** Mínimo 5 años por requisitos fiscales
- **Movimientos de Puntos ES:** Mínimo 10 años por requisitos anti-lavado
- **Documentos de aceptación de términos:** Indefinidamente como evidencia legal
- **Firmas digitales:** Indefinidamente como evidencia legal

## 10. Cambios a Esta Política {#cambios}
Podemos actualizar esta política de privacidad periódicamente. Le notificaremos sobre cambios significativos mediante un aviso en nuestra plataforma o por correo electrónico. Le recomendamos revisar esta política regularmente para estar informado sobre cómo protegemos su información.

## 11. Contacto {#contacto}
Si tiene preguntas sobre esta política de privacidad o desea ejercer sus derechos, puede contactarnos:
- **Email:** {{correo}}
- **WhatsApp:** {{whatsapp}}
- **Dirección:** {{direccion}}
- **Horario de atención:** {{horario}}`;

/** Fecha del último cambio del texto de código (C-144 para los términos; C-131 pasó la privacidad a "Puntos ES") */
const ULTIMO_CAMBIO = new Date('2026-09-30T12:00:00-04:00');

export const TEXTOS_LEGALES_INICIALES: Record<string, TextoLegalInicial> = {
  [SLUG_TERMINOS]: { slug: SLUG_TERMINOS, title: 'Términos y condiciones', version: 4, publishedAt: ULTIMO_CAMBIO, content: TERMINOS },
  [SLUG_PRIVACIDAD]: { slug: SLUG_PRIVACIDAD, title: 'Política de privacidad', version: 3, publishedAt: ULTIMO_CAMBIO, content: PRIVACIDAD },
};
