import { getServerSession } from 'next-auth';
import type { ReactNode } from 'react';
import { adminPageSubtitle, adminPageTitle } from '@/lib/admin-ui';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import {
  datosActividad, datosCotizaciones, datosEmbudo, datosMasVendidos, datosPromotores, datosResenas, datosRespaldo, datosTasa,
} from '@/lib/dashboard/datos';
import { ACCESOS, WIDGETS, normalizarDiseno } from '@/lib/dashboard/widgets';
import { prisma } from '@/lib/prisma';
import { getDashboard } from '@/lib/queries/dashboard';
import MetaDelMes from '@/components/admin/dashboard/MetaDelMes';
import TableroEditable, { type FichaWidget, type ItemTablero } from '@/components/admin/dashboard/TableroEditable';
import VisitantesAhora from '@/components/admin/dashboard/VisitantesAhora';
import {
  Tarjeta, WidgetAccesos, WidgetActividad, WidgetCotizaciones, WidgetEmbudo, WidgetInventario, WidgetMasVendidos, WidgetOrdenes,
  WidgetPorAtender, WidgetPromotores, WidgetResenas, WidgetRespaldo, WidgetTasa, WidgetTienda, WidgetTotales, WidgetVentas,
} from '@/components/admin/dashboard/Widgets';

// Siempre al día: son los pendientes y las ventas de este momento
export const dynamic = 'force-dynamic';

/**
 * Dashboard del panel. C-150: una pantalla de trabajo (lo que espera al equipo, las ventas, accesos rápidos).
 * C-171: cada administrador lo arma a su gusto (qué widgets, en qué orden y tamaño, y qué accesos rápidos). El diseño se lee de la
 * base; solo se piden los datos de los widgets que esa persona tiene puestos, y cada tarjeta llega armada al tablero editable.
 * Sin diseño guardado se ve el de siempre. Server Component: lee la base directamente.
 */
export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  // El `proxy` ya exige admin con dos pasos; esto es el candado de la página (ventas y conteos del negocio)
  if (!session?.user || !hasPermission(session, 'VIEW_DASHBOARD')) return null;
  const puede = (permiso: string) => hasPermission(session, permiso);

  // Si la tabla todavía no existe (deploy a medias), se ve el diseño de fábrica en vez de romper el panel
  const guardado = await prisma.adminDashboardLayout.findUnique({ where: { userId: session.user.id } }).catch(() => null);
  const diseno = normalizarDiseno(guardado?.widgets, guardado?.accesos, puede);
  const tiene = (id: string) => diseno.widgets.some((w) => w.id === id);
  const config = guardado?.config && typeof guardado.config === 'object' && !Array.isArray(guardado.config) ? (guardado.config as Record<string, unknown>) : {};
  const metaMesUSD = typeof config.metaMesUSD === 'number' ? config.metaMesUSD : null;

  // Lo de siempre va en una sola tanda (por atender y ventas están siempre). Lo nuevo, solo si está puesto
  const si = <T,>(id: string, cargar: () => Promise<T>): Promise<T | null> => (tiene(id) ? cargar().catch(() => null) : Promise.resolve(null));
  const [datos, embudo, tasa, masVendidos, actividad, promotores, cotizaciones, resenas, respaldo] = await Promise.all([
    getDashboard(),
    si('embudo', datosEmbudo),
    si('tasa', datosTasa),
    si('mas-vendidos', datosMasVendidos),
    si('actividad', datosActividad),
    si('promotores', datosPromotores),
    si('cotizaciones', datosCotizaciones),
    si('resenas', datosResenas),
    si('respaldo', datosRespaldo),
  ]);

  const accesosElegidos = diseno.accesos.map((id) => ACCESOS.find((a) => a.id === id)).filter((a): a is (typeof ACCESOS)[number] => !!a);
  const nodos: Record<string, ReactNode> = {
    accesos: <WidgetAccesos accesos={accesosElegidos} />,
    'por-atender': <WidgetPorAtender porAtender={datos.porAtender} puede={puede} />,
    ventas: <WidgetVentas ventas={datos.ventas} verReportes={puede('VIEW_REPORTS')} />,
    ordenes: <WidgetOrdenes ordenes={datos.ordenesRecientes} />,
    inventario: <WidgetInventario inventario={datos.pocoInventario} />,
    tienda: <WidgetTienda tienda={datos.tienda.filter((t) => !t.soloDueno || puede('MANAGE_SETTINGS'))} />,
    totales: <WidgetTotales totales={datos.totales} />,
    visitantes: <Tarjeta id="visitantes" titulo="Visitantes ahora" detalle="En vivo"><VisitantesAhora /></Tarjeta>,
    meta: <Tarjeta id="meta" titulo="Meta del mes"><MetaDelMes mesUSD={datos.ventas.mesUSD} metaUSD={metaMesUSD} /></Tarjeta>,
    embudo: embudo ? <WidgetEmbudo embudo={embudo} /> : null,
    tasa: tasa ? <WidgetTasa {...tasa} puedeCambiar={puede('MANAGE_SETTINGS')} /> : null,
    'mas-vendidos': masVendidos ? <WidgetMasVendidos productos={masVendidos} /> : null,
    actividad: actividad ? <WidgetActividad filas={actividad} /> : null,
    promotores: promotores ? <WidgetPromotores datos={promotores} /> : null,
    cotizaciones: cotizaciones ? <WidgetCotizaciones datos={cotizaciones} /> : null,
    resenas: resenas ? <WidgetResenas resenas={resenas} /> : null,
    respaldo: respaldo ? <WidgetRespaldo datos={respaldo} /> : null,
  };

  const fichas: FichaWidget[] = WIDGETS.filter((w) => w.permiso === null || puede(w.permiso))
    .map((w) => ({ id: w.id, titulo: w.titulo, descripcion: w.descripcion, obligatorio: w.obligatorio === true, tamanos: w.tamanos, porDefecto: w.porDefecto }));
  const items: ItemTablero[] = diseno.widgets.map((w) => ({
    id: w.id,
    tamano: w.tamano,
    // Un widget cuyos datos no se pudieron leer no rompe el Dashboard: lo dice en su tarjeta
    nodo: nodos[w.id] ?? <Tarjeta id={w.id} titulo={fichas.find((f) => f.id === w.id)?.titulo ?? 'Widget'}><p className="text-sm text-muted">No se pudo cargar ahora. Recarga la página.</p></Tarjeta>,
  }));
  const hoy = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <TableroEditable
      encabezado={(
        <header>
          <h1 className={adminPageTitle}>Dashboard</h1>
          <p className={adminPageSubtitle}>{hoy}</p>
        </header>
      )}
      items={items}
      fichas={fichas}
      accesos={ACCESOS.filter((a) => puede(a.permiso)).map((a) => ({ id: a.id, titulo: a.titulo }))}
      accesosElegidos={diseno.accesos}
    />
  );
}
