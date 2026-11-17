// C-276: lo que el equipo le puede escribir a un cliente desde su ficha ("Escribirle"). Módulo puro: lo usan la vista previa
// del asistente y el servidor que envía, así que lo que se ve es lo que llega. Sin emojis; los textos los arma el servidor
// otra vez (nunca confía en el título ni en el enlace que manda el navegador, salvo el mensaje libre, que se valida).

export const PLANTILLAS = ['terminos', 'activar', 'pedido', 'carrito', 'libre'] as const;
export type Plantilla = (typeof PLANTILLAS)[number];

export const CANALES = ['campana', 'correo', 'whatsapp'] as const;
export type Canal = (typeof CANALES)[number];

export interface MensajeArmado {
  titulo: string;
  mensaje: string;
  /** Una ruta de la tienda ("/customer/documentos") o null */
  enlace: string | null;
  boton: string | null;
  asunto: string;
}

export interface DatosPlantilla {
  nombre: string | null;
  pedido?: { numero: string; estado: string } | null;
  titulo?: string;
  mensaje?: string;
  enlace?: string | null;
}

export const TOPE_TITULO = 80;
export const TOPE_MENSAJE = 600;

const primerNombre = (nombre: string | null) => (nombre || '').trim().split(/\s+/)[0] || null;

/** Un enlace del mensaje libre: una ruta de la tienda o una dirección de electroshopve.com. Nunca otra página. */
export function enlaceValido(valor: string | null | undefined): string | null | 'invalido' {
  const v = (valor || '').trim();
  if (!v) return null;
  if (v.startsWith('/') && !v.startsWith('//') && !/\s/.test(v) && v.length <= 200) return v;
  try {
    const u = new URL(v);
    if (u.protocol === 'https:' && (u.hostname === 'electroshopve.com' || u.hostname === 'www.electroshopve.com')) return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    // no es una dirección
  }
  return 'invalido';
}

const DEL_PEDIDO: Record<string, (n: string) => [string, string]> = {
  PENDING: (n) => [`Tu pedido ${n} espera tu pago`, 'Cuando lo pagues, lo preparamos de una vez. Si tienes alguna duda con el pago, escríbenos.'],
  CONFIRMED: (n) => [`Tu pedido ${n} espera tu pago`, 'Cuando lo pagues, lo preparamos de una vez. Si tienes alguna duda con el pago, escríbenos.'],
  PAID: (n) => [`Estamos preparando tu pedido ${n}`, 'Ya está pagado y lo estamos alistando: te avisamos cuando salga.'],
  PROCESSING: (n) => [`Estamos preparando tu pedido ${n}`, 'Ya está pagado y lo estamos alistando: te avisamos cuando salga.'],
  READY_FOR_PICKUP: (n) => [`Tu pedido ${n} está listo`, 'Ya puedes retirarlo en la tienda. Trae tu cédula o el número del pedido.'],
  SHIPPED: (n) => [`Tu pedido ${n} va en camino`, 'Ya salió. En Mis pedidos ves la guía y por dónde va.'],
  DELIVERED: (n) => [`¿Cómo te fue con tu pedido ${n}?`, 'Si algo no llegó bien, escríbenos y lo resolvemos.'],
};

export function armarMensaje(plantilla: Plantilla, d: DatosPlantilla): MensajeArmado | { error: string } {
  const nombre = primerNombre(d.nombre);
  switch (plantilla) {
    case 'terminos':
      return {
        titulo: 'Firma los términos de Puntos ES',
        mensaje: 'Para recargar Puntos ES hace falta tu firma en la versión vigente de los términos. Te toma un minuto, desde el teléfono o la computadora.',
        enlace: '/customer/documentos', boton: 'Leer y firmar',
        asunto: `Falta tu firma${nombre ? `, ${nombre}` : ''}`,
      };
    case 'activar':
      return {
        titulo: 'Activa tu cuenta',
        mensaje: 'Te enviamos de nuevo el enlace para activar tu cuenta. Búscalo en tu correo (y en la carpeta de spam): con la cuenta activa compras y sigues tus pedidos.',
        enlace: null, boton: null,
        asunto: 'Activa tu cuenta de Electro Shop',
      };
    case 'pedido': {
      if (!d.pedido) return { error: 'Elige el pedido' };
      const [titulo, mensaje] = (DEL_PEDIDO[d.pedido.estado] ?? ((n: string) => [`Sobre tu pedido ${n}`, 'Tiene novedades: míralas en Mis pedidos.']))(d.pedido.numero);
      return { titulo, mensaje, enlace: '/customer/orders', boton: 'Ver mi pedido', asunto: titulo };
    }
    case 'carrito':
      return {
        titulo: 'Tu carrito te espera',
        mensaje: 'Dejaste productos en tu carrito. Si tienes alguna duda sobre ellos, escríbenos y te ayudamos a elegir.',
        enlace: '/carrito', boton: 'Ver mi carrito',
        asunto: `${nombre ? `${nombre}, tu` : 'Tu'} carrito te espera`,
      };
    case 'libre': {
      const titulo = (d.titulo || '').trim();
      const mensaje = (d.mensaje || '').trim();
      if (titulo.length < 3) return { error: 'Escribe un título' };
      if (titulo.length > TOPE_TITULO) return { error: `El título va hasta ${TOPE_TITULO} letras` };
      if (mensaje.length < 3) return { error: 'Escribe el mensaje' };
      if (mensaje.length > TOPE_MENSAJE) return { error: `El mensaje va hasta ${TOPE_MENSAJE} letras` };
      const enlace = enlaceValido(d.enlace);
      if (enlace === 'invalido') return { error: 'El enlace tiene que ser de electroshopve.com' };
      return { titulo, mensaje, enlace, boton: enlace ? 'Ver más' : null, asunto: titulo };
    }
  }
}

/** El texto para WhatsApp: título, mensaje y, si hay, el enlace completo */
export function textoWhatsApp(m: Pick<MensajeArmado, 'titulo' | 'mensaje' | 'enlace'>, nombre: string | null, origen: string): string {
  const saludo = primerNombre(nombre) ? `Hola ${primerNombre(nombre)}. ` : 'Hola. ';
  return `${saludo}${m.titulo}\n\n${m.mensaje}${m.enlace ? `\n${origen}${m.enlace}` : ''}\n\nElectro Shop`;
}
