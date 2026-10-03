// C-171: el Dashboard a gusto de cada administrador. Aquí está el catálogo de widgets y accesos rápidos, y la regla que decide
// qué diseño vale. Módulo puro: lo usan la página (servidor), la API que guarda y el tablero (navegador).
//
// Como el panel rápido de un teléfono: se quitan, se agregan y se ordenan; los necesarios (`obligatorio`) siempre están.
// Lo que manda el navegador nunca se cree tal cual: `normalizarDiseno` descarta lo desconocido y lo que la persona no puede ver,
// y vuelve a poner los obligatorios si faltan.

export type Tamano = 'chico' | 'mediano' | 'ancho';

export interface WidgetDef {
  id: string;
  titulo: string;
  /** Una línea para la bandeja "Agregar" */
  descripcion: string;
  /** Permiso para verlo (null: cualquier administrador) */
  permiso: string | null;
  /** No se puede quitar (sí mover y cambiar de tamaño) */
  obligatorio?: boolean;
  tamanos: Tamano[];
  porDefecto: Tamano;
}

export const WIDGETS: WidgetDef[] = [
  { id: 'accesos', titulo: 'Accesos rápidos', descripcion: 'Los botones que más usas. Tú eliges cuáles.', permiso: null, obligatorio: true, tamanos: ['ancho'], porDefecto: 'ancho' },
  { id: 'por-atender', titulo: 'Por atender', descripcion: 'Lo que espera al equipo: pagos, pedidos, mensajes.', permiso: null, obligatorio: true, tamanos: ['mediano', 'ancho'], porDefecto: 'mediano' },
  { id: 'ventas', titulo: 'Ventas cobradas', descripcion: 'Hoy, este mes y los últimos 7 días.', permiso: null, obligatorio: true, tamanos: ['mediano', 'ancho'], porDefecto: 'mediano' },
  { id: 'ordenes', titulo: 'Órdenes recientes', descripcion: 'Las últimas órdenes con su estado.', permiso: 'MANAGE_ORDERS', tamanos: ['mediano', 'ancho'], porDefecto: 'mediano' },
  { id: 'inventario', titulo: 'Poco inventario', descripcion: 'Productos publicados que se están acabando.', permiso: 'MANAGE_PRODUCTS', tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'tienda', titulo: 'Tu tienda: por completar', descripcion: 'Lo que le falta a la tienda por configurar.', permiso: null, tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'totales', titulo: 'En total', descripcion: 'Ventas, órdenes, productos y clientes desde el inicio.', permiso: null, tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'visitantes', titulo: 'Visitantes ahora', descripcion: 'Cuántas personas están en la tienda, con cuenta y sin cuenta. En vivo.', permiso: 'VIEW_REPORTS', tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'embudo', titulo: 'Embudo de hoy', descripcion: 'Visitas, carritos, pagos iniciados y compras del día.', permiso: 'VIEW_REPORTS', tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'meta', titulo: 'Meta del mes', descripcion: 'Cuánto va del mes contra la meta que tú pones.', permiso: 'MANAGE_SETTINGS', tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'tasa', titulo: 'Tasa del día', descripcion: 'La tasa en bolívares que usa la tienda y cuándo se actualizó.', permiso: null, tamanos: ['chico'], porDefecto: 'chico' },
  { id: 'mas-vendidos', titulo: 'Más vendidos de la semana', descripcion: 'Los productos que más unidades vendieron en 7 días.', permiso: 'VIEW_REPORTS', tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'actividad', titulo: 'Actividad del equipo', descripcion: 'Quién hizo qué en el panel, lo más reciente.', permiso: 'VIEW_REPORTS', tamanos: ['mediano', 'ancho'], porDefecto: 'mediano' },
  { id: 'promotores', titulo: 'Promotores', descripcion: 'Comisiones por acreditar y las que esperan tu revisión.', permiso: 'MANAGE_USERS', tamanos: ['chico'], porDefecto: 'chico' },
  { id: 'cotizaciones', titulo: 'Cotizaciones abiertas', descripcion: 'Las que están por armar o esperando al cliente.', permiso: 'MANAGE_ORDERS', tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'resenas', titulo: 'Reseñas recientes', descripcion: 'Lo último que opinaron los clientes.', permiso: 'MANAGE_CONTENT', tamanos: ['chico', 'mediano'], porDefecto: 'chico' },
  { id: 'respaldo', titulo: 'Respaldo', descripcion: 'El último respaldo y si salió bien.', permiso: 'MANAGE_SETTINGS', tamanos: ['chico'], porDefecto: 'chico' },
];

export interface AccesoDef { id: string; titulo: string; href: string; permiso: string }

export const ACCESOS: AccesoDef[] = [
  { id: 'nuevo-producto', titulo: 'Nuevo producto', href: '/admin/products/new', permiso: 'MANAGE_PRODUCTS' },
  { id: 'ordenes', titulo: 'Ver órdenes', href: '/admin/orders', permiso: 'MANAGE_ORDERS' },
  { id: 'nueva-cotizacion', titulo: 'Nueva cotización', href: '/admin/cotizaciones/nueva', permiso: 'MANAGE_ORDERS' },
  { id: 'consultar-pago', titulo: 'Consultar un pago', href: '/admin/transactions', permiso: 'MANAGE_ORDERS' },
  { id: 'oferta', titulo: 'Oferta o cupón', href: '/admin/discount-requests', permiso: 'MANAGE_CONTENT' },
  { id: 'nueva-historia', titulo: 'Nueva historia', href: '/admin/studio/nueva', permiso: 'MANAGE_CONTENT' },
  { id: 'importar', titulo: 'Importar productos', href: '/admin/products/importar', permiso: 'MANAGE_PRODUCTS' },
  { id: 'categorias', titulo: 'Categorías', href: '/admin/categories', permiso: 'MANAGE_PRODUCTS' },
  { id: 'relacion-ventas', titulo: 'Relación de ventas', href: '/admin/reports', permiso: 'VIEW_REPORTS' },
  { id: 'configuracion', titulo: 'Configuración', href: '/admin/settings', permiso: 'MANAGE_SETTINGS' },
  // Nuevos en C-171: se pueden agregar al elegir los botones
  { id: 'productos', titulo: 'Productos', href: '/admin/products', permiso: 'MANAGE_PRODUCTS' },
  { id: 'clientes', titulo: 'Clientes', href: '/admin/customers', permiso: 'MANAGE_USERS' },
  { id: 'mensajes', titulo: 'Mensajes', href: '/admin/inquiries', permiso: 'MANAGE_CONTENT' },
  { id: 'promotores', titulo: 'Promotores', href: '/admin/marketing', permiso: 'MANAGE_CONTENT' },
  { id: 'resenas', titulo: 'Reseñas', href: '/admin/reviews', permiso: 'MANAGE_CONTENT' },
  { id: 'garantias', titulo: 'Garantías', href: '/admin/garantias', permiso: 'MANAGE_ORDERS' },
];

/** Los diez de siempre (el Dashboard de antes de C-171) */
const ACCESOS_DE_FABRICA = ['nuevo-producto', 'ordenes', 'nueva-cotizacion', 'consultar-pago', 'oferta', 'nueva-historia', 'importar', 'categorias', 'relacion-ventas', 'configuracion'];

/** El Dashboard de antes de C-171, tal cual */
const DISENO_DE_FABRICA: Array<{ id: string; tamano: Tamano }> = [
  { id: 'accesos', tamano: 'ancho' },
  { id: 'por-atender', tamano: 'mediano' },
  { id: 'ventas', tamano: 'mediano' },
  { id: 'ordenes', tamano: 'mediano' },
  { id: 'inventario', tamano: 'chico' },
  { id: 'totales', tamano: 'chico' },
  { id: 'tienda', tamano: 'mediano' },
];

export const MAXIMO_WIDGETS = 20;
export const MAXIMO_ACCESOS = 12;

export interface Diseno {
  widgets: Array<{ id: string; tamano: Tamano }>;
  accesos: string[];
}

/**
 * El diseño que vale para esta persona. `puede` dice si tiene un permiso. Lo desconocido, lo repetido y lo que no puede ver se
 * descarta; un tamaño que el widget no admite pasa al suyo por defecto; los obligatorios que falten se agregan al principio.
 * Sin nada guardado (o con algo ilegible) sale el de fábrica.
 */
export function normalizarDiseno(widgets: unknown, accesos: unknown, puede: (permiso: string) => boolean): Diseno {
  const permitido = (permiso: string | null) => permiso === null || puede(permiso);
  const porId = new Map(WIDGETS.map((w) => [w.id, w]));
  const origen = Array.isArray(widgets) ? widgets : DISENO_DE_FABRICA;
  const vistos = new Set<string>();
  const salida: Diseno['widgets'] = [];
  for (const crudo of origen.slice(0, 100)) {
    const id = crudo && typeof crudo === 'object' && typeof (crudo as { id?: unknown }).id === 'string' ? (crudo as { id: string }).id : null;
    const def = id ? porId.get(id) : undefined;
    if (!def || vistos.has(def.id) || !permitido(def.permiso)) continue;
    const pedido = (crudo as { tamano?: unknown }).tamano;
    vistos.add(def.id);
    salida.push({ id: def.id, tamano: def.tamanos.includes(pedido as Tamano) ? (pedido as Tamano) : def.porDefecto });
    if (salida.length >= MAXIMO_WIDGETS) break;
  }
  const faltan = WIDGETS.filter((w) => w.obligatorio && !vistos.has(w.id) && permitido(w.permiso)).map((w) => ({ id: w.id, tamano: w.porDefecto }));

  const accesoPorId = new Map(ACCESOS.map((a) => [a.id, a]));
  const pedidos = Array.isArray(accesos) ? accesos : ACCESOS_DE_FABRICA;
  const elegidos = [...new Set(pedidos.filter((a): a is string => typeof a === 'string'))]
    .filter((id) => { const a = accesoPorId.get(id); return !!a && puede(a.permiso); })
    .slice(0, MAXIMO_ACCESOS);

  return { widgets: [...faltan, ...salida], accesos: elegidos };
}

/** Lo que esta persona puede agregar y todavía no tiene puesto */
export function widgetsDisponibles(diseno: Diseno, puede: (permiso: string) => boolean): WidgetDef[] {
  const puestos = new Set(diseno.widgets.map((w) => w.id));
  return WIDGETS.filter((w) => !puestos.has(w.id) && (w.permiso === null || puede(w.permiso)));
}
