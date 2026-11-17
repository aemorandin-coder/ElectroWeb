// C-171: el Dashboard a gusto de cada administrador. Aquí está el catálogo de widgets y accesos rápidos, y la regla que decide
// qué diseño vale. Módulo puro: lo usan la página (servidor), la API que guarda y el tablero (navegador).
//
// C-279: la grilla es de 12 columnas y cada widget mide ancho × alto (columnas × filas de 80 px). Se elige un tamaño del menú
// (Mini 3 × 1, Chico 3 × 2, Mediano 6 × 2…) o se arrastra la esquina para uno a la medida, entre el mínimo y el máximo de ese
// widget. Lo guardado antes (chico, mediano, ancho) se lee igual: pasa a 3 × 2, 6 × 3 y 12 × 2. Sin cambio de base.
// Lo que manda el navegador nunca se cree tal cual: `normalizarDiseno` descarta lo desconocido y lo que la persona no puede ver,
// recorta los tamaños y vuelve a poner los obligatorios si faltan.

/** Columnas × filas de la grilla de 12 (en la tablet son 6 columnas y en el teléfono 4: ver `anchoEn`) */
export interface Medida { ancho: number; alto: number }

export interface WidgetDef {
  id: string;
  titulo: string;
  /** Una línea para el cajón "Agregar" */
  descripcion: string;
  /** El ícono del pack (nombre sin "Icono"), lo pinta components/admin/dashboard/iconos.ts */
  icono: string;
  /** Permiso para verlo (null: cualquier administrador) */
  permiso: string | null;
  /** No se puede quitar (sí mover y cambiar de tamaño) */
  obligatorio?: boolean;
  /** Los tamaños del menú, en orden */
  tamanos: Medida[];
  minimo: Medida;
  maximo: Medida;
  porDefecto: Medida;
}

const m = (ancho: number, alto: number): Medida => ({ ancho, alto });

export const WIDGETS: WidgetDef[] = [
  { id: 'accesos', titulo: 'Accesos rápidos', descripcion: 'Tus botones de siempre, en una fila que no ocupa nada.', icono: 'Puntero', permiso: null, obligatorio: true, tamanos: [m(12, 1), m(6, 2), m(12, 2)], minimo: m(6, 1), maximo: m(12, 2), porDefecto: m(12, 1) },
  { id: 'por-atender', titulo: 'Por atender', descripcion: 'Pagos, pedidos y mensajes que esperan al equipo, con su botón.', icono: 'Bandeja', permiso: null, obligatorio: true, tamanos: [m(3, 1), m(3, 2), m(3, 3), m(6, 2), m(6, 3)], minimo: m(3, 1), maximo: m(12, 5), porDefecto: m(3, 2) },
  { id: 'ventas', titulo: 'Ventas cobradas', descripcion: 'Hoy, el mes y la semana. Sin las canceladas ni las reembolsadas.', icono: 'Ventas', permiso: null, obligatorio: true, tamanos: [m(3, 1), m(3, 2), m(6, 2), m(6, 3), m(6, 4), m(12, 2)], minimo: m(3, 1), maximo: m(12, 5), porDefecto: m(6, 3) },
  { id: 'ordenes', titulo: 'Órdenes recientes', descripcion: 'Las últimas órdenes con su estado y su total.', icono: 'Ordenes', permiso: 'MANAGE_ORDERS', tamanos: [m(3, 2), m(3, 3), m(6, 2), m(6, 3), m(12, 3)], minimo: m(3, 2), maximo: m(12, 6), porDefecto: m(6, 3) },
  { id: 'inventario', titulo: 'Se están acabando', descripcion: 'Lo publicado con poca existencia. La subes ahí mismo.', icono: 'Paquete', permiso: 'MANAGE_PRODUCTS', tamanos: [m(3, 2), m(3, 3), m(6, 2), m(6, 3)], minimo: m(3, 2), maximo: m(12, 5), porDefecto: m(3, 3) },
  { id: 'tienda', titulo: 'Tu tienda: por completar', descripcion: 'Lo que le falta a la tienda por configurar, con su botón.', icono: 'Tienda', permiso: null, tamanos: [m(3, 1), m(3, 2), m(3, 3), m(6, 2)], minimo: m(3, 1), maximo: m(12, 4), porDefecto: m(3, 3) },
  { id: 'totales', titulo: 'Desde que abrió', descripcion: 'Ventas, órdenes, productos y clientes de siempre.', icono: 'Reportes', permiso: null, tamanos: [m(3, 1), m(3, 2), m(6, 1)], minimo: m(3, 1), maximo: m(6, 3), porDefecto: m(3, 2) },
  { id: 'visitantes', titulo: 'En la tienda ahora', descripcion: 'Cuántas personas miran la tienda, con cuenta y sin cuenta. En vivo.', icono: 'EnVivo', permiso: 'VIEW_REPORTS', tamanos: [m(3, 1), m(3, 2)], minimo: m(3, 1), maximo: m(6, 3), porDefecto: m(3, 1) },
  { id: 'embudo', titulo: 'Embudo de hoy', descripcion: 'Visitas, carritos, pagos iniciados y compras del día.', icono: 'Filtro', permiso: 'VIEW_REPORTS', tamanos: [m(3, 2), m(3, 3), m(6, 2)], minimo: m(3, 2), maximo: m(6, 4), porDefecto: m(3, 3) },
  { id: 'meta', titulo: 'Meta del mes', descripcion: 'Lo cobrado contra la meta que pones. Solo el dueño.', icono: 'Objetivo', permiso: 'MANAGE_SETTINGS', tamanos: [m(3, 1), m(3, 2)], minimo: m(3, 1), maximo: m(6, 3), porDefecto: m(3, 1) },
  { id: 'tasa', titulo: 'Tasa del día', descripcion: 'La tasa en bolívares que usa la tienda y cuándo se actualizó.', icono: 'Billete', permiso: null, tamanos: [m(3, 1), m(3, 2)], minimo: m(3, 1), maximo: m(6, 2), porDefecto: m(3, 1) },
  { id: 'sorteo', titulo: 'Sorteo', descripcion: 'La cuenta atrás del sorteo activo, sus boletos y su periodo.', icono: 'Premio', permiso: 'MANAGE_CONTENT', tamanos: [m(3, 2), m(3, 3), m(6, 2), m(6, 3)], minimo: m(3, 2), maximo: m(12, 4), porDefecto: m(3, 3) },
  { id: 'studio', titulo: 'ElectroStudio · esta semana', descripcion: 'Tus historias de la semana, los días libres y la que te sugiere la tienda.', icono: 'Claqueta', permiso: 'MANAGE_CONTENT', tamanos: [m(6, 2), m(6, 3), m(12, 2), m(12, 3)], minimo: m(6, 2), maximo: m(12, 4), porDefecto: m(6, 3) },
  { id: 'viene', titulo: 'Lo que viene', descripcion: 'Las fechas de la tienda: el corte de hoy, los impuestos y el sorteo.', icono: 'Calendario', permiso: null, tamanos: [m(3, 2), m(3, 3), m(6, 2)], minimo: m(3, 2), maximo: m(6, 4), porDefecto: m(3, 2) },
  { id: 'mas-vendidos', titulo: 'Más vendidos de la semana', descripcion: 'Los productos que más unidades vendieron en 7 días.', icono: 'Estrella', permiso: 'VIEW_REPORTS', tamanos: [m(3, 2), m(3, 3), m(6, 2), m(6, 3)], minimo: m(3, 2), maximo: m(6, 5), porDefecto: m(3, 3) },
  { id: 'actividad', titulo: 'El equipo', descripcion: 'Lo último que hizo cada uno en el panel.', icono: 'Clientes', permiso: 'VIEW_REPORTS', tamanos: [m(3, 2), m(6, 2), m(6, 3)], minimo: m(3, 2), maximo: m(12, 4), porDefecto: m(6, 2) },
  { id: 'promotores', titulo: 'Promotores', descripcion: 'Comisiones por acreditar y las que esperan tu revisión.', icono: 'Compartir', permiso: 'MANAGE_USERS', tamanos: [m(3, 1), m(3, 2)], minimo: m(3, 1), maximo: m(6, 3), porDefecto: m(3, 2) },
  { id: 'cotizaciones', titulo: 'Cotizaciones abiertas', descripcion: 'Las que están por armar o esperando al cliente.', icono: 'Documento', permiso: 'MANAGE_ORDERS', tamanos: [m(3, 2), m(3, 3), m(6, 2), m(6, 3)], minimo: m(3, 2), maximo: m(12, 4), porDefecto: m(3, 3) },
  { id: 'resenas', titulo: 'Reseñas recientes', descripcion: 'Lo último que opinaron los clientes.', icono: 'Estrella', permiso: 'MANAGE_CONTENT', tamanos: [m(3, 2), m(3, 3), m(6, 2), m(6, 3)], minimo: m(3, 2), maximo: m(12, 4), porDefecto: m(3, 3) },
  { id: 'respaldo', titulo: 'Respaldo', descripcion: 'El último respaldo y si salió bien.', icono: 'BaseDeDatos', permiso: 'MANAGE_SETTINGS', tamanos: [m(3, 1), m(3, 2)], minimo: m(3, 1), maximo: m(6, 2), porDefecto: m(3, 1) },
];

/** El nombre de un tamaño del menú; los demás se dicen "4 × 2" */
const NOMBRES: Record<string, string> = {
  '3x1': 'Mini', '3x2': 'Chico', '3x3': 'Alto', '6x1': 'Tira', '6x2': 'Mediano', '6x3': 'Grande', '6x4': 'Enorme', '12x1': 'Fila', '12x2': 'Ancho', '12x3': 'Ancho alto',
};
export const nombreTamano = (t: Medida) => NOMBRES[`${t.ancho}x${t.alto}`] ?? `${t.ancho} × ${t.alto}`;

/** Las columnas que ocupa en cada pantalla: 12 en la computadora, 6 en la tablet y 4 en el teléfono */
export const anchoEn = (ancho: number) => ({ md: ancho <= 3 ? 3 : 6, sm: ancho <= 3 ? 2 : 4 });

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

type Fila = [id: string, ancho: number, alto: number];

/** Las plantillas de "Personalizar" (C-279, las eligió el equipo viendo la maqueta). Lo que la persona no puede ver no entra */
export const PLANTILLAS: Array<{ id: string; nombre: string; icono: string; widgets: Fila[] }> = [
  {
    id: 'dueno', nombre: 'Dueño', icono: 'Administrador', widgets: [
      ['accesos', 12, 1], ['ventas', 6, 3], ['sorteo', 3, 3], ['por-atender', 3, 1], ['visitantes', 3, 1], ['meta', 3, 1],
      ['studio', 6, 3], ['inventario', 3, 3], ['tienda', 3, 3], ['viene', 3, 2], ['totales', 3, 2], ['actividad', 6, 2],
    ],
  },
  {
    id: 'ventas', nombre: 'Ventas', icono: 'Ventas', widgets: [
      ['por-atender', 6, 2], ['ventas', 6, 4], ['inventario', 6, 2], ['accesos', 12, 1], ['tasa', 3, 1], ['meta', 3, 1], ['totales', 6, 1], ['ordenes', 12, 3],
    ],
  },
  { id: 'justo', nombre: 'Lo justo', icono: 'Cuadricula', widgets: [['por-atender', 3, 1], ['ventas', 3, 1], ['tasa', 3, 1], ['visitantes', 3, 1], ['accesos', 12, 1]] },
  {
    id: 'marketing', nombre: 'Marketing', icono: 'Claqueta', widgets: [
      ['studio', 12, 2], ['sorteo', 6, 3], ['por-atender', 3, 1], ['visitantes', 3, 1], ['ventas', 6, 2], ['inventario', 6, 2], ['resenas', 6, 2], ['accesos', 12, 1],
    ],
  },
];

/** Sin diseño guardado: la plantilla Dueño */
const DISENO_DE_FABRICA = PLANTILLAS[0].widgets.map(([id, ancho, alto]) => ({ id, ancho, alto }));

/** Lo guardado antes de C-279 */
const LEGADO: Record<string, Medida> = { chico: m(3, 2), mediano: m(6, 3), ancho: m(12, 2) };

export const MAXIMO_WIDGETS = 20;
export const MAXIMO_ACCESOS = 12;

export interface ItemDiseno { id: string; ancho: number; alto: number }

export interface Diseno {
  widgets: ItemDiseno[];
  accesos: string[];
}

const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** El tamaño que vale para ese widget: el pedido (o el de antes de C-279, traducido), recortado a su mínimo y su máximo */
export function medidaValida(def: WidgetDef, crudo: unknown): Medida {
  const c = crudo && typeof crudo === 'object' ? (crudo as { ancho?: unknown; alto?: unknown; tamano?: unknown }) : {};
  let pedida: Medida | null = null;
  if (Number.isInteger(c.ancho) && Number.isInteger(c.alto)) pedida = m(c.ancho as number, c.alto as number);
  else if (typeof c.tamano === 'string' && LEGADO[c.tamano]) pedida = LEGADO[c.tamano];
  if (!pedida) return def.porDefecto;
  return m(entre(pedida.ancho, def.minimo.ancho, def.maximo.ancho), entre(pedida.alto, def.minimo.alto, def.maximo.alto));
}

/**
 * El diseño que vale para esta persona. `puede` dice si tiene un permiso. Lo desconocido, lo repetido y lo que no puede ver se
 * descarta; cada tamaño queda entre el mínimo y el máximo del widget; los obligatorios que falten se agregan al principio.
 * Sin nada guardado (o con algo ilegible) sale el de fábrica.
 */
export function normalizarDiseno(widgets: unknown, accesos: unknown, puede: (permiso: string) => boolean): Diseno {
  const permitido = (permiso: string | null) => permiso === null || puede(permiso);
  const porId = new Map(WIDGETS.map((w) => [w.id, w]));
  const origen: unknown[] = Array.isArray(widgets) ? widgets : DISENO_DE_FABRICA;
  const vistos = new Set<string>();
  const salida: ItemDiseno[] = [];
  for (const crudo of origen.slice(0, 100)) {
    const id = crudo && typeof crudo === 'object' && typeof (crudo as { id?: unknown }).id === 'string' ? (crudo as { id: string }).id : null;
    const def = id ? porId.get(id) : undefined;
    if (!def || vistos.has(def.id) || !permitido(def.permiso)) continue;
    vistos.add(def.id);
    salida.push({ id: def.id, ...medidaValida(def, crudo) });
    if (salida.length >= MAXIMO_WIDGETS) break;
  }
  const faltan = WIDGETS.filter((w) => w.obligatorio && !vistos.has(w.id) && permitido(w.permiso)).map((w) => ({ id: w.id, ...w.porDefecto }));

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
