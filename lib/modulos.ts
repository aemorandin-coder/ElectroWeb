// C-168: versión de cada módulo del panel (y de lo que usa la tienda).
//
// El sistema es UN solo programa: todos los módulos se suben juntos en cada deploy. La versión de un módulo no dice "qué se
// subió" sino "en qué versión del sistema cambió ese módulo por última vez": si Productos dice 1.2.0 desde 1.0.0-rc.5, en
// producción ese módulo es el de rc.5 aunque el sistema vaya en rc.9. Lo que corre en el servidor lo dice la etiqueta de
// git (`git describe --tags`); esto dice qué cambió y cuándo.
//
// REGLA: cada tarea que toca archivos de un módulo agrega al frente de su `historial` una entrada con la versión nueva
// (MAYOR.MENOR.PARCHE, como `CHANGELOG.md`). `npm run check:modulos` compara contra `main` y falla si un módulo cambió y su
// versión no. Este archivo no cuenta como cambio de ningún módulo.
//
// Sin dependencias del servidor: lo importan el menú del panel (cliente), la página Versiones y el script de revisión.

export interface CambioModulo {
  /** Versión del módulo (MAYOR.MENOR.PARCHE) */
  version: string;
  /** Versión del sistema (`package.json`) en la que entró este cambio */
  sistema: string;
  /** Tarea (C-XX) */
  tarea: string;
  /** Una línea, para el equipo (sin tecnicismos) */
  resumen: string;
  /** No sale en "Qué hay de nuevo" (solo en la página Versiones): para la entrada con la que un módulo empezó a registrarse */
  silencioso?: boolean;
}

export interface ModuloPanel {
  id: string;
  nombre: string;
  descripcion: string;
  /** Direcciones del panel que son de este módulo (prefijos). Sirven para saber en qué módulo está quien navega */
  paginas: string[];
  /** Archivos del repositorio que son de este módulo (prefijos de ruta). Sirven a `check:modulos` */
  archivos: string[];
  /** Lo más nuevo primero. La versión del módulo es la de la primera entrada */
  historial: [CambioModulo, ...CambioModulo[]];
}

const PRIMERA: Pick<CambioModulo, 'version' | 'sistema' | 'tarea'> = { version: '1.0.0', sistema: '1.0.0-rc.4', tarea: 'C-168' };
const RC4 = { sistema: '1.0.0-rc.4' } as const;
const RC5 = { sistema: '1.0.0-rc.5' } as const;
const RC6 = { sistema: '1.0.0-rc.6' } as const;
const RC7 = { sistema: '1.0.0-rc.7' } as const;
const RC8 = { sistema: '1.0.0-rc.8' } as const;
const primera = (resumen: string): CambioModulo => ({ ...PRIMERA, resumen, silencioso: true });

export const MODULOS: ModuloPanel[] = [
  {
    id: 'panel',
    nombre: 'Marco del panel',
    descripcion: 'Menú, sesión, dos pasos, notificaciones y lo que comparten todas las pantallas del panel.',
    paginas: ['/admin/seguridad', '/admin/notifications', '/admin/versiones'],
    archivos: [
      'app/admin/(dashboard)/layout.tsx', 'app/admin/(dashboard)/not-found.tsx', 'app/admin/(dashboard)/seguridad/',
      'app/admin/(dashboard)/notifications/', 'app/admin/(dashboard)/versiones/', 'app/admin/login/',
      'components/admin/ControlSesionAdmin.tsx', 'components/admin/CodigosRespaldo.tsx', 'components/admin/version/',
      'components/notifications/', 'app/api/notifications/', 'app/api/admin/notifications/', 'app/api/admin/telegram/',
      'app/api/admin/dos-pasos/', 'app/api/admin/sidebar-counts/', 'app/api/admin/version/', 'app/api/realtime/',
      'lib/admin-ui.ts', 'lib/auth-helpers.ts', 'lib/auth.ts', 'lib/sesiones.ts', 'lib/dos-pasos.ts', 'lib/notifications.ts',
      'lib/admin-alerts.ts', 'lib/telegram/', 'lib/realtime/', 'lib/version-build.ts', 'proxy.ts',
      // C-169: lo que comparten las pantallas que se editan entre varios (presencia, conflictos, borrador, historial)
      'components/admin/edicion/', 'lib/edicion/', 'app/api/admin/presencia/', 'app/api/admin/historial/',
    ],
    historial: [{ version: '1.3.0', ...RC8, tarea: 'C-170', resumen: 'Las piezas para que dos administradores no se pisen (versión al guardar, combinar cambios, presencia) ahora sirven a todo el panel.', silencioso: true }, { version: '1.2.0', ...RC5, tarea: 'C-174', resumen: 'Marquesina del equipo: una franja debajo de la barra de arriba dice quién está conectado y en qué sector ("Luis está en Productos, editando…").' }, { version: '1.1.0', ...RC4, tarea: 'C-169', resumen: 'Trabajo en equipo: se ve quién más está editando lo mismo, se avisa en vivo cuando otro lo cambia o lo mueve a la papelera, y los borradores sin guardar se conservan en el navegador.' }, { ...PRIMERA, resumen: 'Ahora cada módulo del panel lleva su versión (abajo del menú y en la barra de arriba) y se avisa cuando hay una versión nueva.' }],
  },
  {
    id: 'dashboard',
    nombre: 'Dashboard',
    descripcion: 'La pantalla de trabajo: lo que espera al equipo, las ventas y los accesos rápidos.',
    paginas: [],
    archivos: ['app/admin/(dashboard)/page.tsx', 'components/admin/dashboard/', 'lib/dashboard/', 'lib/queries/dashboard.ts', 'app/api/admin/dashboard/', 'app/api/admin/live-users/'],
    historial: [{ version: '1.1.0', ...RC7, tarea: 'C-171', resumen: 'Dashboard a tu gusto: toca Editar para quitar, agregar, ordenar y cambiar el tamaño de las tarjetas, y elegir tus accesos rápidos. Diez tarjetas nuevas (visitantes ahora, embudo de hoy, meta del mes, actividad del equipo…). Cada persona tiene el suyo.' }, { version: '1.0.2', ...RC6, tarea: 'C-173', resumen: 'Los visitantes en vivo salen de quién está conectado, no de contar eventos de 5 minutos.', silencioso: true }, { version: '1.0.1', ...RC4, tarea: 'C-169', resumen: 'El total de productos ya no cuenta los de la papelera.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'ordenes',
    nombre: 'Órdenes y pagos',
    descripcion: 'Órdenes, transacciones, Pago Móvil, garantías, envíos y reservas de stock.',
    paginas: ['/admin/orders', '/admin/transactions', '/admin/garantias'],
    archivos: [
      'app/admin/(dashboard)/orders/', 'app/admin/(dashboard)/transactions/', 'app/admin/(dashboard)/garantias/',
      'app/api/orders/', 'app/api/admin/orders/', 'app/api/admin/transactions/', 'app/api/admin/pago-movil/',
      'app/api/admin/pagos-sin-orden/', 'app/api/admin/warranty/', 'app/api/pago-movil/', 'app/api/envios/', 'app/api/webhooks/',
      'components/orders/', 'components/envios/', 'components/warranty/', 'components/pago-movil/',
      'lib/order-', 'lib/pago-movil', 'lib/envios/', 'lib/embalaje.ts', 'lib/reservas.ts', 'lib/stock.ts', 'lib/warranty',
      'lib/facturacion.ts', 'lib/pricing.ts',
    ],
    historial: [primera('Primera versión registrada.')],
  },
  {
    id: 'productos',
    nombre: 'Productos',
    descripcion: 'Productos, categorías, reseñas, carga masiva, búsqueda en la web y la conexión con SADES.',
    paginas: ['/admin/products', '/admin/categories', '/admin/reviews'],
    archivos: [
      'app/admin/(dashboard)/products/', 'app/admin/(dashboard)/categories/', 'app/admin/(dashboard)/reviews/',
      'app/api/products/', 'app/api/admin/products/', 'app/api/admin/sades/', 'app/api/categories/', 'app/api/reviews/', 'app/api/digital-codes/',
      'lib/product-', 'lib/busqueda-web/', 'lib/busqueda-sql.ts', 'lib/spec-sugerencias.ts', 'lib/marcas.ts', 'lib/precio-sugerido.ts',
      'lib/digital-', 'lib/sades.ts', 'lib/review-status.ts', 'lib/resenas-avisos.ts', 'lib/stock-alerts.ts',
      'lib/papelera.ts', 'app/api/cron/papelera/',
    ],
    historial: [{ version: '1.2.0', ...RC8, tarea: 'C-170', resumen: 'Categorías: si otra persona guardó antes, se combinan los cambios; se ve quién la tiene abierta y se pregunta antes de borrar una que otro edita.' }, { version: '1.1.1', ...RC5, tarea: 'C-174', resumen: 'El editor dice a los demás qué producto tiene abierto (para la marquesina del equipo).' }, { version: '1.1.0', ...RC4, tarea: 'C-169', resumen: 'Eliminar manda a la papelera (30 días, con Deshacer). Si otro administrador guarda o mueve el producto mientras lo editas, se combinan los cambios, se avisa y no se pierde lo que escribiste. Se ve quién lo está editando.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'ofertas',
    nombre: 'Ofertas y cupones',
    descripcion: 'Ofertas, cupones y las solicitudes de descuento.',
    paginas: ['/admin/discount-requests'],
    archivos: ['app/admin/(dashboard)/discount-requests/', 'app/api/admin/discount-requests/', 'app/api/admin/promotions/', 'lib/promotions'],
    historial: [{ version: '1.1.0', ...RC8, tarea: 'C-170', resumen: 'Ofertas y cupones: si otra persona guardó antes, se combinan los cambios y solo se pregunta por lo que las dos tocaron; se ve quién la tiene abierta.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'marketing',
    nombre: 'Marketing',
    descripcion: 'Campañas por correo, plantillas y el popup promocional.',
    paginas: ['/admin/marketing'],
    archivos: [
      'app/admin/(dashboard)/marketing/page.tsx', 'app/admin/(dashboard)/marketing/_components/Campanas.tsx',
      'app/admin/(dashboard)/marketing/_components/Plantillas.tsx', 'app/admin/(dashboard)/marketing/_components/Popup.tsx',
      'app/api/admin/campaigns/', 'app/api/admin/email/', 'lib/email-campaigns.ts', 'lib/hot-ad.ts', 'lib/email-templates/',
    ],
    historial: [{ version: '1.1.0', ...RC8, tarea: 'C-170', resumen: 'Campañas de correo: el borrador ya no se pisa entre dos personas (se combinan los cambios) y se ve quién lo tiene abierto.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'promotores',
    nombre: 'Promotores',
    descripcion: 'Promotores, sus códigos, solicitudes y comisiones en Puntos ES.',
    paginas: [],
    archivos: ['app/admin/(dashboard)/marketing/_components/Promotores.tsx', 'app/api/influencers/', 'app/api/cron/promotores/', 'lib/influencer-'],
    historial: [{ version: '1.1.0', ...RC8, tarea: 'C-170', resumen: 'Editar un promotor ya no pisa lo que otra persona guardó; y si alguien ya atendió una comisión o una solicitud, lo dice con su nombre.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'studio',
    nombre: 'ElectroStudio',
    descripcion: 'Historias e imágenes para redes sociales.',
    paginas: ['/admin/studio'],
    archivos: ['app/admin/(dashboard)/studio/', 'app/api/admin/studio/', 'lib/studio/', 'components/social/'],
    historial: [{ version: '1.1.0', ...RC8, tarea: 'C-170', resumen: 'El guardado automático junta los cambios si dos personas editan la misma historia, y avisa quién más la tiene abierta.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'cursos',
    nombre: 'Cursos',
    descripcion: 'Cursos, creadores y sus solicitudes.',
    paginas: ['/admin/cursos', '/admin/creators'],
    archivos: [
      'app/admin/(dashboard)/cursos/', 'app/admin/(dashboard)/creators/', 'app/api/admin/courses/', 'app/api/admin/creators/',
      'app/api/courses/', 'app/api/creator/', 'app/creator/', 'app/cursos/', 'components/cursos/',
    ],
    historial: [{ version: '1.0.1', ...RC8, tarea: 'C-170', resumen: 'Aprobar o rechazar a un creador dos veces a la vez ya no manda el correo dos veces.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'servicios',
    nombre: 'Trabajos realizados',
    descripcion: 'Videos y trabajos del taller que se muestran en la tienda.',
    paginas: ['/admin/servicios'],
    archivos: ['app/admin/(dashboard)/servicios/', 'app/api/admin/service-videos/', 'app/api/tech-service-videos/', 'app/api/service-reviews/', 'app/servicios/', 'components/servicios/'],
    historial: [primera('Primera versión registrada.')],
  },
  {
    id: 'cotizaciones',
    nombre: 'Cotizaciones',
    descripcion: 'Presupuestos para empresas e instituciones, con retención del IVA.',
    paginas: ['/admin/cotizaciones'],
    archivos: ['app/admin/(dashboard)/cotizaciones/', 'app/api/cotizaciones/', 'app/api/admin/cotizaciones/', 'lib/cotizaciones/', 'components/cotizaciones/', 'app/cotizacion/'],
    historial: [{ version: '1.1.0', ...RC8, tarea: 'C-170', resumen: 'Dos personas en la misma cotización: se combinan los cambios (también las líneas) y solo se pregunta por lo que las dos tocaron.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'clientes',
    nombre: 'Clientes',
    descripcion: 'Clientes, verificaciones de empresas, mensajes, solicitudes de producto y gift cards.',
    paginas: ['/admin/customers', '/admin/verifications', '/admin/inquiries', '/admin/gift-cards'],
    archivos: [
      'app/admin/(dashboard)/customers/', 'app/admin/(dashboard)/verifications/', 'app/admin/(dashboard)/inquiries/', 'app/admin/(dashboard)/gift-cards/',
      'app/api/admin/users/', 'app/api/admin/verifications/', 'app/api/admin/gift-cards/', 'app/api/customers/', 'app/api/users/', 'app/api/user/',
      'app/api/gift-cards/', 'app/api/contact/', 'app/api/product-requests/', 'components/gift-card/', 'components/contact/',
      'lib/gift-card',
    ],
    historial: [{ version: '1.0.1', ...RC8, tarea: 'C-170', resumen: 'Verificar una empresa o atender una solicitud de producto dos veces a la vez ya no avisa dos veces al cliente.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'reportes',
    nombre: 'Reportes y seguridad',
    descripcion: 'Reportes de ventas, relación de ventas, bitácora y avisos de seguridad.',
    paginas: ['/admin/reports'],
    archivos: [
      'app/admin/(dashboard)/reports/', 'app/api/admin/reports/', 'app/api/admin/csp/', 'app/api/csp-report/', 'app/api/analytics/',
      'lib/csp-', 'lib/relacion-ventas.ts', 'lib/audit-', 'components/AnalyticsTracker.tsx', 'lib/login-guard.ts', 'lib/rate-limit.ts',
      'lib/visitantes.ts', 'lib/analytics-bots.ts', 'app/api/admin/visitantes/', 'app/api/admin/hoy/',
    ],
    historial: [{ version: '1.1.1', ...RC8, tarea: 'C-170', resumen: 'La bitácora entiende los cambios de cualquier registro del panel (quién cambió qué).', silencioso: true }, { version: '1.1.0', ...RC6, tarea: 'C-173', resumen: 'Reportes en vivo: arriba de todo, cuántas personas están conectadas a la tienda ahora (con cuenta y sin cuenta), qué miran, de dónde llegaron y quién es cada una; lo cobrado hoy se actualiza con cada orden o pago; las cifras se ponen al día solas.' }, { version: '1.0.1', ...RC4, tarea: 'C-169', resumen: 'La bitácora entiende "movido a la papelera", "restaurado" y "borrado para siempre", y el total de productos no cuenta la papelera.' }, primera('Primera versión registrada.')],
  },
  {
    id: 'configuracion',
    nombre: 'Configuración',
    descripcion: 'Configuración de la tienda, métodos de pago, equipo, documentos legales y respaldos.',
    paginas: ['/admin/settings', '/admin/payments', '/admin/equipo', '/admin/legal'],
    archivos: [
      'app/admin/(dashboard)/settings/', 'app/admin/(dashboard)/payments/', 'app/admin/(dashboard)/equipo/', 'app/admin/(dashboard)/legal/',
      'app/api/settings/', 'app/api/admin/respaldos/', 'app/api/admin/equipo/', 'app/api/admin/legal/', 'app/api/admin/payments/',
      'app/api/admin/exchange-rate/', 'app/api/exchange-rates/', 'app/api/legal/', 'app/api/cron/envios/', 'app/api/cron/favoritos/', 'app/api/cron/resenas/',
      'app/api/cron/respaldos/', 'lib/respaldos/', 'lib/equipo.ts', 'lib/legal-',
      'lib/site-settings.ts', 'lib/exchange-rate.ts', 'lib/correo.ts', 'lib/email-service.ts', 'lib/smtp-seguro.ts', 'lib/maintenance.ts',
      'components/admin/EmailSettingsPanel.tsx', 'components/legal/', 'scripts/deploy.sh',
    ],
    historial: [primera('Primera versión registrada.')],
  },
  {
    id: 'tienda',
    nombre: 'Tienda',
    descripcion: 'Lo que ven los clientes: inicio, catálogo, ficha de producto, buscador y páginas públicas.',
    paginas: [],
    archivos: [
      'app/page.tsx', 'app/layout.tsx', 'app/globals.css', 'app/productos/', 'app/categorias/', 'app/p/', 'app/feed/', 'app/llms.txt/',
      'app/robots.ts', 'app/sitemap.ts', 'app/contacto/', 'app/terminos/', 'app/privacidad/', 'app/solicitar-producto/',
      'components/home/', 'components/catalog/', 'components/product/', 'components/public/', 'components/ui/', 'components/seo/',
      'components/Footer.tsx', 'components/WhatsAppButton.tsx', 'components/HotAdOverlay.tsx', 'components/reviews/', 'components/modals/',
      'lib/queries/home.ts', 'lib/queries/catalog.ts', 'lib/queries/product.ts', 'lib/queries/navigation.ts', 'lib/queries/seo.ts',
      'lib/queries/busqueda-catalogo.ts', 'lib/queries/hot-ad.ts', 'lib/dto/', 'lib/seo.ts', 'lib/feed.ts', 'lib/llms.ts',
    ],
    historial: [{ version: '1.0.1', ...RC5, tarea: 'C-174', resumen: 'Estilo de la marquesina del panel en globals.css (no se usa en la tienda).', silencioso: true }, primera('Primera versión registrada.')],
  },
  {
    id: 'cuenta',
    nombre: 'Carrito, checkout y cuenta del cliente',
    descripcion: 'Carrito, pago, Puntos ES y el panel del cliente.',
    paginas: [],
    archivos: [
      'app/carrito/', 'app/checkout/', 'app/customer/', 'app/login/', 'app/registro/', 'app/sesion/', 'app/recuperar-contrasena/',
      'app/verificar-email/', 'app/api/cart/', 'app/api/customer/', 'app/api/auth/', 'app/api/sesion/',
      'components/cart/', 'components/checkout/', 'components/customer/', 'components/auth/', 'components/onboarding/',
      'lib/checkout-pago.ts', 'lib/cart-items.ts', 'lib/saved-addresses.ts', 'contexts/',
    ],
    historial: [primera('Primera versión registrada.')],
  },
];

export const MODULO_PANEL_ID = 'panel';

/** La versión de un módulo es la de su entrada más reciente */
export function versionDe(modulo: ModuloPanel): string {
  return modulo.historial[0].version;
}

/** Qué módulo es la pantalla en la que está quien navega. Coincide por el prefijo más largo; `/admin` es el Dashboard. */
export function moduloDeRuta(pathname: string): ModuloPanel | null {
  if (pathname === '/admin') return MODULOS.find((m) => m.id === 'dashboard') ?? null;
  let mejor: { modulo: ModuloPanel; largo: number } | null = null;
  for (const modulo of MODULOS) {
    for (const pagina of modulo.paginas) {
      if ((pathname === pagina || pathname.startsWith(`${pagina}/`)) && (!mejor || pagina.length > mejor.largo)) {
        mejor = { modulo, largo: pagina.length };
      }
    }
  }
  return mejor?.modulo ?? null;
}

/**
 * Compara dos versiones `MAYOR.MENOR.PARCHE` o `MAYOR.MENOR.PARCHE-rc.N`. Negativo si a < b. Una candidata (`-rc.N`) es anterior
 * a la versión final con los mismos números. Una versión que no se entiende se trata como la más vieja.
 */
export function compararVersiones(a: string, b: string): number {
  const leer = (v: string) => {
    const m = /^(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/.exec(v.trim().replace(/^v/, ''));
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? Number.POSITIVE_INFINITY : Number(m[4])];
  };
  const x = leer(a);
  const y = leer(b);
  if (!x || !y) return x ? 1 : y ? -1 : 0;
  for (let i = 0; i < 4; i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}

export interface NovedadModulo {
  modulo: ModuloPanel;
  cambios: CambioModulo[];
}

/**
 * Lo que cambió en el sistema después de `desde` (la última versión que el administrador vio), módulo por módulo. Sin `desde`
 * (primera vez), solo lo de la versión actual del sistema.
 */
export function novedadesDesde(desde: string | null, sistemaActual: string): NovedadModulo[] {
  const salida: NovedadModulo[] = [];
  for (const modulo of MODULOS) {
    const cambios = modulo.historial.filter((c) => !c.silencioso && (desde
      ? compararVersiones(c.sistema, desde) > 0 && compararVersiones(c.sistema, sistemaActual) <= 0
      : compararVersiones(c.sistema, sistemaActual) === 0));
    if (cambios.length > 0) salida.push({ modulo, cambios });
  }
  return salida;
}
