// Empresas de envío y tipos de entrega (C-100). Módulo puro: lo usan el servidor, el checkout y los paneles.

/** Empresas que el cliente puede elegir en el checkout. */
export const EMPRESAS = ['ZOOM', 'MRW'] as const;
/** Empresas con las que el panel puede marcar un envío (TEALCA, DOMESA u otra si hace falta). */
export const EMPRESAS_GUIA = ['ZOOM', 'MRW', 'TEALCA', 'DOMESA', 'OTHER'] as const;

export type Empresa = (typeof EMPRESAS)[number];
export type EmpresaGuia = (typeof EMPRESAS_GUIA)[number];
export type ModoEnvio = 'OFFICE' | 'DOOR';
export type PagaEnvio = 'CUSTOMER' | 'STORE';

export const NOMBRE_EMPRESA: Record<EmpresaGuia, string> = {
  ZOOM: 'ZOOM',
  MRW: 'MRW',
  TEALCA: 'TEALCA',
  DOMESA: 'DOMESA',
  OTHER: 'Otra empresa',
};

/** Los 24 estados con su nombre correcto. ZOOM y MRW los mandan sin tildes ("BOLIVAR", "Tachira"). */
export const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes', 'Delta Amacuro',
  'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta',
  'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Yaracuy', 'Zulia',
] as const;

const sinTildes = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** "TACHIRA", "Tachira" o "táchira" → "Táchira". Si no es un estado conocido, devuelve el texto tal cual. */
export function nombreEstado(valor: string): string {
  const clave = sinTildes(valor);
  return ESTADOS_VENEZUELA.find((estado) => sinTildes(estado) === clave) ?? valor.trim();
}

/** "ZOOM LA URBINA" → "Zoom La Urbina". ZOOM y MRW mandan los nombres en mayúsculas. */
export function capitalizarNombre(valor: string): string {
  return valor
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

/** Ciudad de origen de los envíos (Guanare) en la tabla de ciudades de ZOOM. */
export const ZOOM_CIUDAD_ORIGEN = '43';

/**
 * Página de rastreo de cada empresa. Ninguna acepta la guía en la URL de forma documentada,
 * por eso el cliente también ve el botón "Copiar guía". ZOOM redirige `?guia=` a su buscador.
 */
export function urlRastreo(empresa: string | null | undefined, guia: string | null | undefined): string | null {
  const codigo = (guia ?? '').trim();
  if (!codigo) return null;
  switch (empresa) {
    case 'ZOOM':
      return `https://zoom.red/tracking-de-envios-personas/?guia=${encodeURIComponent(codigo)}`;
    case 'MRW':
      return 'https://mrwve.com/mi-envio';
    case 'TEALCA':
      return 'https://tealca.com/rastreo/';
    case 'DOMESA':
      return 'https://www.domesa.com.ve/';
    default:
      return null;
  }
}

/** Tipos de entrega que acepta el checkout desde C-100. HOME_DELIVERY y STORE_PICKUP quedan en órdenes viejas. */
export const ETIQUETA_ENTREGA: Record<string, string> = {
  SHIPPING: 'Envío nacional',
  LOCAL_DELIVERY: 'Delivery en Guanare',
  PICKUP: 'Retiro en tienda',
  HOME_DELIVERY: 'Envío a domicilio',
  STORE_PICKUP: 'Retiro en tienda',
  DIGITAL: 'Digital',
};

export function esRetiro(deliveryMethod: string | null | undefined): boolean {
  return deliveryMethod === 'PICKUP' || deliveryMethod === 'STORE_PICKUP';
}

/** Órdenes que viajan por una empresa de encomiendas (necesitan guía para marcarse enviadas). */
export function usaEmpresa(deliveryMethod: string | null | undefined): boolean {
  return deliveryMethod === 'SHIPPING' || deliveryMethod === 'HOME_DELIVERY';
}

export function etiquetaModo(modo: string | null | undefined): string {
  return modo === 'DOOR' ? 'A domicilio' : 'Retiro en oficina';
}

export interface PasoOrden {
  estado: 'CONFIRMED' | 'PAID' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'SHIPPED' | 'DELIVERED';
  accion: string;
  /** Abre el formulario de la guía antes de marcarla enviada. */
  pideGuia: boolean;
}

/**
 * El siguiente paso de una orden según cómo se entrega (C-100). Un pedido digital se cierra solo al entregar
 * el último código; el botón queda para los que se entregaron antes de C-100 o fuera de la página de códigos.
 */
export function siguientePaso(estado: string, deliveryMethod: string | null | undefined): PasoOrden | null {
  switch (estado) {
    case 'PENDING':
      return { estado: 'CONFIRMED', accion: 'Confirmar pedido', pideGuia: false };
    case 'CONFIRMED':
      return { estado: 'PAID', accion: 'Marcar pagado', pideGuia: false };
    case 'PAID':
      return { estado: 'PROCESSING', accion: 'Comenzar preparación', pideGuia: false };
    case 'PROCESSING':
      if (deliveryMethod === 'DIGITAL') return { estado: 'DELIVERED', accion: 'Marcar entregado', pideGuia: false };
      if (esRetiro(deliveryMethod)) return { estado: 'READY_FOR_PICKUP', accion: 'Lista para recoger', pideGuia: false };
      if (deliveryMethod === 'LOCAL_DELIVERY') return { estado: 'SHIPPED', accion: 'Salió a entregar', pideGuia: false };
      return { estado: 'SHIPPED', accion: 'Marcar enviado', pideGuia: true };
    case 'READY_FOR_PICKUP':
      return { estado: 'DELIVERED', accion: 'Entregada al cliente', pideGuia: false };
    case 'SHIPPED':
      return { estado: 'DELIVERED', accion: 'Marcar entregado', pideGuia: false };
    default:
      return null;
  }
}
