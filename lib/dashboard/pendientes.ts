// C-279: lo que espera al equipo, en el orden en que conviene atenderlo (primero el dinero y lo que espera un cliente).
// Módulo puro: lo usan el widget "Por atender" y la recepción (los pasos del día y la frase). Los textos vienen de C-150.
import type { DashboardData } from '@/lib/queries/dashboard';

export type ClavePendiente = keyof DashboardData['porAtender'];

export interface Pendiente {
  clave: ClavePendiente;
  uno: string;
  varios: string;
  /** Para la frase de la recepción ("2 pagos por confirmar y 1 mensaje") */
  cortoUno: string;
  cortoVarios: string;
  href: string;
  /** El ícono del pack, sin "Icono" */
  icono: string;
  permiso: 'MANAGE_PRODUCTS' | 'MANAGE_ORDERS' | 'MANAGE_CONTENT' | 'MANAGE_USERS';
  /** Dinero o un cliente esperando: va primero, en azul, y entra en la frase de la recepción */
  urgente?: boolean;
  /** El paso del día en la recepción ("Confirmar el pago") */
  paso?: { uno: string; varios: string };
}

export const PENDIENTES: Pendiente[] = [
  { clave: 'pagosPorConfirmar', uno: 'pago por confirmar', varios: 'pagos por confirmar', cortoUno: '1 pago por confirmar', cortoVarios: 'pagos por confirmar', href: '/admin/orders', icono: 'Billete', permiso: 'MANAGE_ORDERS', urgente: true, paso: { uno: 'Confirmar el pago', varios: 'Confirmar los pagos' } },
  { clave: 'porPreparar', uno: 'pedido pagado por preparar o entregar', varios: 'pedidos pagados por preparar o entregar', cortoUno: '1 pedido por preparar', cortoVarios: 'pedidos por preparar', href: '/admin/orders', icono: 'Envio', permiso: 'MANAGE_ORDERS', urgente: true, paso: { uno: 'Preparar el pedido', varios: 'Preparar los pedidos' } },
  { clave: 'recargas', uno: 'recarga de Puntos ES por confirmar', varios: 'recargas de Puntos ES por confirmar', cortoUno: '1 recarga de Puntos ES', cortoVarios: 'recargas de Puntos ES', href: '/admin/transactions', icono: 'RecargarPuntos', permiso: 'MANAGE_ORDERS', urgente: true, paso: { uno: 'Confirmar la recarga', varios: 'Confirmar las recargas' } },
  { clave: 'pagosSinOrden', uno: 'Pago Móvil sin orden', varios: 'Pagos Móvil sin orden', cortoUno: '1 Pago Móvil sin orden', cortoVarios: 'Pagos Móvil sin orden', href: '/admin/transactions', icono: 'Advertencia', permiso: 'MANAGE_ORDERS', urgente: true, paso: { uno: 'Revisar el Pago Móvil', varios: 'Revisar los Pago Móvil' } },
  { clave: 'mensajes', uno: 'mensaje de cliente', varios: 'mensajes de clientes', cortoUno: '1 mensaje', cortoVarios: 'mensajes', href: '/admin/inquiries', icono: 'Chat', permiso: 'MANAGE_CONTENT', urgente: true, paso: { uno: 'Responder', varios: 'Responder' } },
  { clave: 'cotizaciones', uno: 'cotización por armar', varios: 'cotizaciones por armar', cortoUno: '1 cotización', cortoVarios: 'cotizaciones', href: '/admin/cotizaciones', icono: 'Documento', permiso: 'MANAGE_ORDERS', paso: { uno: 'Armar la cotización', varios: 'Armar las cotizaciones' } },
  { clave: 'garantias', uno: 'garantía por atender', varios: 'garantías por atender', cortoUno: '1 garantía', cortoVarios: 'garantías', href: '/admin/garantias', icono: 'Salvavidas', permiso: 'MANAGE_ORDERS', paso: { uno: 'Atender la garantía', varios: 'Atender las garantías' } },
  { clave: 'facturasEmpresa', uno: 'compra de empresa sin número de factura', varios: 'compras de empresa sin número de factura', cortoUno: '1 factura', cortoVarios: 'facturas', href: '/admin/orders', icono: 'Documento', permiso: 'MANAGE_ORDERS' },
  { clave: 'solicitudes', uno: 'solicitud de producto', varios: 'solicitudes de producto', cortoUno: '1 solicitud', cortoVarios: 'solicitudes', href: '/admin/inquiries?tab=requests', icono: 'Variantes', permiso: 'MANAGE_CONTENT' },
  { clave: 'sinStock', uno: 'producto publicado sin existencias', varios: 'productos publicados sin existencias', cortoUno: '1 producto agotado', cortoVarios: 'productos agotados', href: '/admin/products', icono: 'Paquete', permiso: 'MANAGE_PRODUCTS' },
  { clave: 'resenas', uno: 'reseña por moderar', varios: 'reseñas por moderar', cortoUno: '1 reseña', cortoVarios: 'reseñas', href: '/admin/reviews', icono: 'Estrella', permiso: 'MANAGE_CONTENT' },
  { clave: 'descuentos', uno: 'descuento por aprobar', varios: 'descuentos por aprobar', cortoUno: '1 descuento', cortoVarios: 'descuentos', href: '/admin/discount-requests', icono: 'Porcentaje', permiso: 'MANAGE_CONTENT' },
  { clave: 'verificaciones', uno: 'empresa por verificar', varios: 'empresas por verificar', cortoUno: '1 empresa', cortoVarios: 'empresas', href: '/admin/customers?vista=verificaciones', icono: 'Garantia', permiso: 'MANAGE_USERS' },
  { clave: 'referidos', uno: 'comisión de promotor por aprobar', varios: 'comisiones de promotores por aprobar', cortoUno: '1 comisión', cortoVarios: 'comisiones', href: '/admin/discount-requests?vista=afiliados', icono: 'Compartir', permiso: 'MANAGE_CONTENT' },
  { clave: 'creadores', uno: 'solicitud de creador de cursos', varios: 'solicitudes de creadores de cursos', cortoUno: '1 creador', cortoVarios: 'creadores', href: '/admin/cursos?vista=creadores', icono: 'Clientes', permiso: 'MANAGE_USERS' },
  { clave: 'cursos', uno: 'curso por aprobar', varios: 'cursos por aprobar', cortoUno: '1 curso', cortoVarios: 'cursos', href: '/admin/cursos', icono: 'ServicioTecnico', permiso: 'MANAGE_CONTENT' },
];

/** Los que esta persona ve y tienen algo, en su orden */
export function pendientesDe(porAtender: DashboardData['porAtender'], puede: (permiso: string) => boolean) {
  return PENDIENTES.filter((p) => puede(p.permiso) && porAtender[p.clave] > 0).map((p) => ({ ...p, cantidad: porAtender[p.clave] }));
}
