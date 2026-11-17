// C-279: lo que el buscador del Dashboard (Ctrl K) encuentra sin preguntarle al servidor: las acciones y las pantallas del panel.
// Módulo puro. La página lo filtra por los permisos de la persona; los productos y las órdenes los busca /api/admin/buscar.
// Sin Claude por ahora (decisión del equipo del 17/11).
import { ACCESOS } from './widgets';

export interface AccionPaleta {
  id: string;
  titulo: string;
  /** Palabras con que también se encuentra */
  claves: string;
  icono: string;
  href: string;
  grupo: 'Acciones' | 'Ir a';
  /** Uno basta */
  permisos: string[];
}

const EXTRA: Record<string, string> = {
  'nuevo-producto': 'crear producto agregar', ordenes: 'pedidos ventas', 'nueva-cotizacion': 'presupuesto empresa', 'consultar-pago': 'pago movil referencia transaccion',
  oferta: 'descuento promo cupon', 'nueva-historia': 'instagram flyer story studio', importar: 'carga masiva excel proveedor', categorias: 'catalogo',
  'relacion-ventas': 'reportes ventas', configuracion: 'ajustes tasa', productos: 'inventario existencia stock', clientes: 'usuarios cuentas',
  mensajes: 'contacto preguntas responder', promotores: 'referidos comisiones', resenas: 'opiniones estrellas', garantias: 'reclamos falla',
};
const ICONO: Record<string, string> = {
  'nuevo-producto': 'Mas', ordenes: 'Ordenes', 'nueva-cotizacion': 'Documento', 'consultar-pago': 'Billete', oferta: 'Porcentaje',
  'nueva-historia': 'Claqueta', importar: 'Subir', categorias: 'Variantes', 'relacion-ventas': 'Reportes', configuracion: 'Configuracion',
  productos: 'Paquete', clientes: 'Clientes', mensajes: 'Chat', promotores: 'Compartir', resenas: 'Estrella', garantias: 'Salvavidas',
};
const PANTALLAS = new Set(['ordenes', 'relacion-ventas', 'configuracion', 'productos', 'clientes', 'mensajes', 'promotores', 'resenas', 'garantias', 'categorias']);

export const ACCIONES_PALETA: AccionPaleta[] = [
  ...ACCESOS.map((a) => ({
    id: a.id, titulo: a.titulo, claves: EXTRA[a.id] ?? '', icono: ICONO[a.id] ?? 'Cuadricula', href: a.href,
    grupo: (PANTALLAS.has(a.id) ? 'Ir a' : 'Acciones') as AccionPaleta['grupo'], permisos: [a.permiso],
  })),
  { id: 'facturas', titulo: 'Contabilidad · Facturas', claves: 'factura talonario contadora', icono: 'Documento', href: '/admin/contabilidad/facturas', grupo: 'Ir a', permisos: ['FACTURAR', 'VER_CONTABILIDAD'] },
  { id: 'sorteo', titulo: 'Marketing · Sorteo', claves: 'rifa premio boletos ganador', icono: 'Premio', href: '/admin/marketing#sorteo', grupo: 'Ir a', permisos: ['MANAGE_CONTENT'] },
  { id: 'studio', titulo: 'ElectroStudio', claves: 'historias flyers instagram', icono: 'Claqueta', href: '/admin/studio', grupo: 'Ir a', permisos: ['MANAGE_CONTENT'] },
  { id: 'transacciones', titulo: 'Transacciones', claves: 'pagos recargas puntos es', icono: 'Billete', href: '/admin/transactions', grupo: 'Ir a', permisos: ['MANAGE_ORDERS'] },
];

/** Sin acentos ni mayúsculas, para comparar lo que se escribe */
export const normalizar = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
