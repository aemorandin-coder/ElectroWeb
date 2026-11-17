import { getServerSession } from 'next-auth';
import type { ReactNode } from 'react';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import {
  datosActividad, datosCotizaciones, datosEmbudo, datosMasVendidos, datosPendientes, datosPromotores, datosResenas, datosRespaldo,
  datosSorteo, datosStudio, datosTasa,
} from '@/lib/dashboard/datos';
import { ACCIONES_PALETA } from '@/lib/dashboard/paleta';
import { pendientesDe } from '@/lib/dashboard/pendientes';
import { armarRecepcion, loQueViene } from '@/lib/dashboard/recepcion';
import { ACCESOS, PLANTILLAS, WIDGETS, normalizarDiseno } from '@/lib/dashboard/widgets';
import { calendarioDe } from '@/lib/horarios';
import { prisma } from '@/lib/prisma';
import { getDashboard } from '@/lib/queries/dashboard';
import MetaDelMes from '@/components/admin/dashboard/MetaDelMes';
import TableroEditable, { type FichaWidget, type ItemTablero } from '@/components/admin/dashboard/TableroEditable';
import VisitantesAhora from '@/components/admin/dashboard/VisitantesAhora';
import {
  Tarjeta, WidgetAccesos, WidgetActividad, WidgetCotizaciones, WidgetEmbudo, WidgetInventario, WidgetMasVendidos, WidgetOrdenes,
  WidgetPorAtender, WidgetPromotores, WidgetResenas, WidgetRespaldo, WidgetSorteo, WidgetStudio, WidgetTasa, WidgetTienda,
  WidgetTotales, WidgetVentas, WidgetViene,
} from '@/components/admin/dashboard/Widgets';

// Siempre al día: son los pendientes y las ventas de este momento
export const dynamic = 'force-dynamic';

/**
 * Dashboard del panel. C-150: una pantalla de trabajo (lo que espera al equipo, las ventas, accesos rápidos).
 * C-171: cada administrador lo arma a su gusto (qué widgets, en qué orden y tamaño, y qué accesos rápidos). El diseño se lee de la
 * base; solo se piden los datos de los widgets que esa persona tiene puestos, y cada tarjeta llega armada al tablero editable.
 * C-279: arriba, la recepción (el saludo, la frase del día, el buscador, los pasos y el pulso) en lugar del título "Dashboard";
 * la grilla es de 12 columnas con tamaños a la medida. Sin diseño guardado se ve la plantilla Dueño.
 * Server Component: lee la base directamente.
 */
export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  // El `proxy` ya exige admin con dos pasos; esto es el candado de la página (ventas y conteos del negocio)
  if (!session?.user || !hasPermission(session, 'VIEW_DASHBOARD')) return null;
  const puede = (permiso: string) => hasPermission(session, permiso);
  const ahora = new Date();

  // Si la tabla todavía no existe (deploy a medias), se ve el diseño de fábrica en vez de romper el panel
  const guardado = await prisma.adminDashboardLayout.findUnique({ where: { userId: session.user.id } }).catch(() => null);
  const diseno = normalizarDiseno(guardado?.widgets, guardado?.accesos, puede);
  const tiene = (id: string) => diseno.widgets.some((w) => w.id === id);
  const config = guardado?.config && typeof guardado.config === 'object' && !Array.isArray(guardado.config) ? (guardado.config as Record<string, unknown>) : {};
  const metaMesUSD = typeof config.metaMesUSD === 'number' ? config.metaMesUSD : null;

  // Lo de siempre va en una sola tanda (por atender y ventas están siempre). Lo nuevo, solo si está puesto
  const si = <T,>(id: string, cargar: () => Promise<T>): Promise<T | null> => (tiene(id) ? cargar().catch(() => null) : Promise.resolve(null));
  const verPagos = puede('MANAGE_ORDERS');
  const verMensajes = puede('MANAGE_CONTENT');
  const [datos, ajustes, pendientes, sorteo, embudo, tasa, masVendidos, actividad, promotores, cotizaciones, resenas, respaldo, studio] = await Promise.all([
    getDashboard(),
    prisma.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true, autoExchangeRates: true, horaCorte: true, diasCerrados: true, diasAbiertos: true } }).catch(() => null),
    datosPendientes(verPagos, verMensajes).catch(() => ({ pagos: [], mensajes: [] })),
    // La recepción cuenta los días del sorteo: se pide siempre (es una sola fila; sus boletos, solo si está el widget)
    datosSorteo(tiene('sorteo')).catch(() => null),
    si('embudo', datosEmbudo),
    si('tasa', datosTasa),
    si('mas-vendidos', datosMasVendidos),
    si('actividad', datosActividad),
    si('promotores', datosPromotores),
    si('cotizaciones', datosCotizaciones),
    si('resenas', datosResenas),
    si('respaldo', datosRespaldo),
    si('studio', datosStudio),
  ]);
  const calendario = calendarioDe(ajustes);
  const tienda = datos.tienda.filter((t) => !t.soloDueno || puede('MANAGE_SETTINGS'));
  const recepcion = armarRecepcion({
    ahora, nombre: session.user.name, puede, datos: { ...datos, tienda }, sorteo, calendario,
    tasa: ajustes?.exchangeRateVES ? { valor: Number(ajustes.exchangeRateVES), automatica: ajustes.autoExchangeRates } : null,
    primerPago: pendientes.pagos[0]?.numero ?? null,
  });

  // La meta del mes: cuántos días le quedan al mes (en Venezuela)
  const [anio, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(ahora).split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

  const accesosElegidos = diseno.accesos.map((id) => ACCESOS.find((a) => a.id === id)).filter((a): a is (typeof ACCESOS)[number] => !!a);
  const nodos: Record<string, ReactNode> = {
    accesos: <WidgetAccesos accesos={accesosElegidos} />,
    'por-atender': <WidgetPorAtender pendientes={pendientesDe(datos.porAtender, puede)} pagos={pendientes.pagos} mensajes={pendientes.mensajes} />,
    ventas: <WidgetVentas ventas={datos.ventas} totales={datos.totales} verReportes={puede('VIEW_REPORTS')} />,
    ordenes: <WidgetOrdenes ordenes={datos.ordenesRecientes} />,
    inventario: <WidgetInventario inventario={datos.pocoInventario} />,
    tienda: <WidgetTienda tienda={tienda} />,
    totales: <WidgetTotales totales={datos.totales} />,
    visitantes: <Tarjeta id="visitantes" titulo="En la tienda ahora" icono="EnVivo"><VisitantesAhora /></Tarjeta>,
    meta: <Tarjeta id="meta" titulo="Meta del mes" icono="Objetivo"><MetaDelMes mesUSD={datos.ventas.mesUSD} metaUSD={metaMesUSD} diasQueQuedan={ultimoDia - dia + 1} ultimoDia={ultimoDia} /></Tarjeta>,
    sorteo: <WidgetSorteo sorteo={sorteo} ahora={ahora} />,
    viene: <WidgetViene fechas={loQueViene(ahora, calendario, sorteo, puede('VER_CONTABILIDAD'))} />,
    embudo: embudo ? <WidgetEmbudo embudo={embudo} /> : null,
    tasa: tasa ? <WidgetTasa {...tasa} puedeCambiar={puede('MANAGE_SETTINGS')} /> : null,
    'mas-vendidos': masVendidos ? <WidgetMasVendidos productos={masVendidos} /> : null,
    actividad: actividad ? <WidgetActividad filas={actividad} /> : null,
    promotores: promotores ? <WidgetPromotores datos={promotores} /> : null,
    cotizaciones: cotizaciones ? <WidgetCotizaciones datos={cotizaciones} /> : null,
    resenas: resenas ? <WidgetResenas resenas={resenas} /> : null,
    respaldo: respaldo ? <WidgetRespaldo datos={respaldo} /> : null,
    studio: studio ? <WidgetStudio studio={studio} ahora={ahora} /> : null,
  };

  const visibles = WIDGETS.filter((w) => w.permiso === null || puede(w.permiso));
  const fichas: FichaWidget[] = visibles.map((w) => ({
    id: w.id, titulo: w.titulo, descripcion: w.descripcion, icono: w.icono, obligatorio: w.obligatorio === true,
    tamanos: w.tamanos, minimo: w.minimo, maximo: w.maximo, porDefecto: w.porDefecto,
  }));
  const items: ItemTablero[] = diseno.widgets.map((w) => {
    const ficha = fichas.find((f) => f.id === w.id);
    return {
      ...w,
      // Un widget cuyos datos no se pudieron leer no rompe el Dashboard: lo dice en su tarjeta
      nodo: nodos[w.id] ?? <Tarjeta id={w.id} titulo={ficha?.titulo ?? 'Widget'} icono={ficha?.icono ?? 'Cuadricula'}><p className="text-sm text-muted">No se pudo cargar ahora. Recarga la página.</p></Tarjeta>,
    };
  });
  const ids = new Set(visibles.map((w) => w.id));
  const plantillas = PLANTILLAS.map((p) => ({ id: p.id, nombre: p.nombre, icono: p.icono, widgets: p.widgets.filter(([id]) => ids.has(id)).map(([id, ancho, alto]) => ({ id, ancho, alto })) }));
  const acciones = ACCIONES_PALETA.filter((a) => a.permisos.some(puede));

  return (
    <TableroEditable
      recepcion={recepcion}
      items={items}
      fichas={fichas}
      accesos={ACCESOS.filter((a) => puede(a.permiso)).map((a) => ({ id: a.id, titulo: a.titulo }))}
      accesosElegidos={diseno.accesos}
      acciones={acciones}
      plantillas={plantillas}
    />
  );
}
