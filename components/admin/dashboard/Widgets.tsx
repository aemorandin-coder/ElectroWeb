import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  IconoAdvertencia, IconoBillete, IconoChat, IconoCheck, IconoChevronDerecha, IconoClaqueta, IconoConfirmado, IconoEstrella,
  IconoFlechaDerecha, IconoMas, IconoPremio, IconoReloj,
} from '@/components/iconos';
import { adminBadge } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import type { DatosEmbudo, DatosSorteo, DatosStudio, FilaActividad, MensajePendiente, PagoPendiente } from '@/lib/dashboard/datos';
import type { Pendiente } from '@/lib/dashboard/pendientes';
import { diasEntre, fechaConMes, fechaCorta, periodoDelSorteo, type FechaQueViene } from '@/lib/dashboard/recepcion';
import type { AccesoDef } from '@/lib/dashboard/widgets';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';
import { estadoPago, tonoEstadoOrden } from '@/lib/order-pago';
import type { DashboardData } from '@/lib/queries/dashboard';
import CifraAnimada from './CifraAnimada';
import { ICONO_ACCESO, IconoPor } from './iconos';
import StockRapido from './StockRapido';
import s from './tablero.module.css';

// C-171: el contenido de cada widget del Dashboard. Son piezas de servidor (salvo las que cuentan o se piden en vivo): la página
// las arma con los datos y el tablero editable las recibe ya hechas.
// C-279: cada widget se acomoda al tamaño de su tarjeta con consultas de contenedor (tablero.module.css): en Mini (una fila)
// muestra lo esencial en una línea; con más filas, más contenido; las listas muestran las filas que caben, nunca cortadas.
// `sinH1` se esconde en una fila, `sinH2` hasta dos, `sinH3` hasta tres, `sinH4` hasta cuatro; `soloH1` solo se ve en una fila.

const fechaHora = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const cx = (...clases: Array<string | false | null | undefined>) => clases.filter(Boolean).join(' ');
/** La clase de la fila `i` de una lista: las que no caben se esconden enteras */
const porAlto = (i: number, desde: [number, number, number]) => cx(i >= desde[0] && s.sinH2, i >= desde[1] && s.sinH3, i >= desde[2] && s.sinH4);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** El marco de un widget: la tarjeta con su ícono, su título y, si tiene, algo a la derecha (un enlace o un sello) */
export function Tarjeta({ id, titulo, icono, extra, children }: { id: string; titulo: string; icono: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`w-${id}`} className={s.tarjeta}>
      <div className={s.tCabeza}>
        <IconoPor nombre={icono} aria-hidden="true" />
        <h2 id={`w-${id}`}>{titulo}</h2>
        {extra}
      </div>
      <div className={s.tCuerpo}>{children}</div>
    </section>
  );
}

const Enlace = ({ href, children, clase }: { href: string; children: ReactNode; clase?: string }) => <Link href={href} className={cx(s.enlace, clase)}>{children}</Link>;
const Vacio = ({ children }: { children: ReactNode }) => <p className={s.rotulo}>{children}</p>;

function AlDia({ titulo, detalle, icono = 'hecho' }: { titulo: string; detalle?: string; icono?: 'hecho' | 'premio' }) {
  return (
    <div className={s.alDia}>
      <span className={cx(s.placa, icono === 'hecho' ? s.placaHecho : s.placaClara)} aria-hidden="true">{icono === 'hecho' ? <IconoCheck /> : <IconoPremio />}</span>
      <div className="min-w-0"><b>{titulo}</b>{detalle && <small className={s.sinH1}>{detalle}</small>}</div>
    </div>
  );
}

/* ── Accesos rápidos: una fila de botones (o la grilla, con dos filas) ── */
export function WidgetAccesos({ accesos }: { accesos: AccesoDef[] }) {
  const boton = (a: AccesoDef) => (
    <Link key={a.id} href={a.href}><span className={cx(s.placa, s.placaClara)} aria-hidden="true"><IconoPor nombre={ICONO_ACCESO[a.id] ?? 'Cuadricula'} /></span>{a.titulo}</Link>
  );
  return (
    <section aria-labelledby="w-accesos" className={s.tarjeta} style={{ justifyContent: 'center' }}>
      <h2 id="w-accesos" className="sr-only">Accesos rápidos</h2>
      {accesos.length === 0 ? <p className={s.rotulo} style={{ padding: 14 }}>Sin accesos rápidos. Toca Personalizar para elegir tus botones.</p> : (
        <>
          <nav className={s.dock} aria-label="Accesos rápidos">{accesos.map(boton)}</nav>
          <nav className={s.dockRejilla} aria-label="Accesos rápidos">{accesos.map(boton)}</nav>
        </>
      )}
    </section>
  );
}

/* ── Por atender ── */
export function WidgetPorAtender({ pendientes, pagos, mensajes }: {
  pendientes: Array<Pendiente & { cantidad: number }>;
  pagos: PagoPendiente[];
  mensajes: MensajePendiente[];
}) {
  const total = pendientes.reduce((suma, p) => suma + p.cantidad, 0);
  if (total === 0) {
    return (
      <Tarjeta id="por-atender" titulo="Por atender" icono="Bandeja">
        <AlDia titulo="Todo al día" detalle="Nada espera: ni pagos, ni pedidos, ni mensajes. Si entra algo, lo ves aquí al instante." />
      </Tarjeta>
    );
  }
  const primero = pendientes[0];
  const pago = primero.clave === 'pagosPorConfirmar' ? pagos[0] : undefined;
  const mensaje = primero.clave === 'mensajes' ? mensajes[0] : undefined;
  const hrefPrimero = pago ? `/admin/orders?orden=${encodeURIComponent(pago.numero)}` : primero.href;
  // Las tarjetas con detalle (pagos y mensajes) y después el resto de lo pendiente, en una fila cada uno
  const otros = pendientes.filter((p) => !(p.clave === 'pagosPorConfirmar' && pagos.length > 0) && !(p.clave === 'mensajes' && mensajes.length > 0));
  // Las que no caben en el alto de la tarjeta se esconden enteras: la segunda hasta tres filas, la tercera hasta cuatro
  const clase = (i: number) => porAlto(i, [9, 1, 2]);
  const despuesDePagos = pagos.length;
  const despuesDeMensajes = pagos.length + mensajes.length;
  return (
    <Tarjeta id="por-atender" titulo="Por atender" icono="Bandeja" extra={<span className={cx(adminBadge('warning'), s.sinH1)}><IconoReloj aria-hidden="true" />{total} te {total === 1 ? 'toca' : 'tocan'}</span>}>
      {/* En una fila: lo primero, con su botón */}
      <div className={cx(s.pendLinea, s.soloH1)}>
        <span className={cx(s.placa, s.placaAccion)} aria-hidden="true"><IconoPor nombre={primero.icono} /></span>
        <div className={s.filaTexto}>
          <b>{total > 1 ? `${total} por atender` : primero.cantidad === 1 ? primero.cortoUno : `${primero.cantidad} ${primero.cortoVarios}`}</b>
          <small>{pago ? `${formatUSD(pago.totalUSD)} · ${pago.cliente}` : mensaje ? `${mensaje.cliente}: ${mensaje.texto}` : `${primero.cantidad} ${primero.cantidad === 1 ? primero.uno : primero.varios}`}</small>
        </div>
        <Link href={hrefPrimero} className={s.btnRedondo} aria-label={pago ? `Revisar el pago de ${pago.cliente}` : `Abrir: ${primero.varios}`} title="Abrir"><IconoFlechaDerecha aria-hidden="true" /></Link>
      </div>
      <ul className={cx(s.filas, s.sinH1)}>
        {pagos.map((x, i) => (
          <li key={`pago-${x.id}`} className={cx(s.pendiente, clase(i))}>
            <div className={s.pendFila}>
              <span className={cx(s.placa, s.placaAccion)} aria-hidden="true"><IconoBillete /></span>
              <div className={s.filaTexto}><b>{x.metodo} · {formatUSD(x.totalUSD)}</b><small>{x.cliente} · orden {x.numero}</small></div>
            </div>
            <div className={s.pendAcciones}>
              <Link href={`/admin/orders?orden=${encodeURIComponent(x.numero)}`} className={cx(s.btn, s.btnPrimario)}><IconoCheck aria-hidden="true" />Revisar el pago</Link>
            </div>
          </li>
        ))}
        {mensajes.map((x, i) => (
          <li key={`msj-${x.id}`} className={cx(s.pendiente, clase(despuesDePagos + i))}>
            <div className={s.pendFila}>
              <span className={cx(s.placa, s.placaAccion)} aria-hidden="true"><IconoChat /></span>
              <div className={s.filaTexto}><b>{x.cliente} escribió</b><small className={s.dosLineas}>{x.texto}</small></div>
            </div>
            <div className={s.pendAcciones}>
              <Link href="/admin/inquiries" className={cx(s.btn, s.btnPrimario)}><IconoChat aria-hidden="true" />Responder</Link>
            </div>
          </li>
        ))}
        {otros.map((p, i) => (
          <li key={p.clave} className={clase(despuesDeMensajes + i)}>
            <Link href={p.href} className={s.fila}>
              <span className={cx(s.placa, p.urgente ? s.placaAccion : s.placaGris)} aria-hidden="true"><IconoPor nombre={p.icono} /></span>
              <span className={s.filaTexto}><b>{p.cantidad} {p.cantidad === 1 ? p.uno : p.varios}</b></span>
              <IconoChevronDerecha className="shrink-0 text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

/* ── Ventas cobradas ── */
export function WidgetVentas({ ventas, totales, verReportes }: { ventas: DashboardData['ventas']; totales: DashboardData['totales']; verReportes: boolean }) {
  const maximo = Math.max(...ventas.semana.map((d) => d.totalUSD), 0);
  const semana = ventas.semana.reduce((suma, d) => suma + Math.round(d.totalUSD * 100), 0) / 100;
  const mejor = ventas.semana.reduce<(typeof ventas.semana)[number] | null>((m, d) => (d.totalUSD > (m?.totalUSD ?? 0) ? d : m), null);
  const diaDe = (etiqueta: string) => etiqueta.split(' ')[0].replace('.', '');
  return (
    <Tarjeta id="ventas" titulo="Ventas cobradas" icono="Ventas" extra={verReportes ? <Enlace href="/admin/reports" clase={s.sinH1}>Reportes</Enlace> : undefined}>
      <div className={cx(s.lineaMini, s.soloH1)}>
        <span className={s.rotulo}>Este mes</span>
        <b className={s.cifraChica}><CifraAnimada valor={ventas.mesUSD} formato="usd" retraso={300} /></b>
        <span className={cx(s.rotulo, s.sinMuyAngosto)}>· hoy {formatUSD(ventas.hoyUSD)}</span>
      </div>
      <dl className={cx(s.dosCol, s.sinH1)}>
        <div>
          <dt className={s.rotulo}>Hoy</dt>
          <dd className={s.cifra}><CifraAnimada valor={ventas.hoyUSD} formato="usd" retraso={300} /></dd>
          <dd className={s.rotulo}>{plural(ventas.hoyOrdenes, 'orden', 'órdenes')}</dd>
        </div>
        <div>
          <dt className={s.rotulo}>Este mes</dt>
          <dd className={s.cifra}><CifraAnimada valor={ventas.mesUSD} formato="usd" retraso={300} /></dd>
          <dd className={s.rotulo}>{plural(ventas.mesOrdenes, 'orden', 'órdenes')}</dd>
        </div>
      </dl>
      <div className={cx(s.semana, s.sinH2)}>
        <div className={s.semanaCabeza}><span>Últimos 7 días</span><b>{formatUSD(semana)}</b></div>
        <ol className={s.barras} aria-label="Ventas cobradas por día">
          {ventas.semana.map((dia, i) => {
            const hoy = i === ventas.semana.length - 1;
            const alto = dia.totalUSD > 0 && maximo > 0 ? Math.max(8, (dia.totalUSD / maximo) * 100) : 4;
            return (
              <li key={dia.fecha} title={`${dia.etiqueta}: ${formatUSD(dia.totalUSD)}`}>
                <span className={s.pista}><span className={cx(s.barra, s.crece, dia.totalUSD > 0 && s.barraLlena, hoy && dia.totalUSD === 0 && s.barraHoy)} style={{ height: `${alto}%`, animationDelay: `${420 + i * 60}ms` }} /></span>
                <small className={hoy ? s.hoy : undefined} aria-hidden="true">{hoy ? 'hoy' : diaDe(dia.etiqueta)}</small>
                <span className="sr-only">{dia.etiqueta}: {formatUSD(dia.totalUSD)}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className={cx(s.notaVenta, s.sinH3)}>
        <span className={cx(s.placa, s.placaClara)} aria-hidden="true"><IconoEstrella /></span>
        <span>
          {mejor ? <>La venta de la semana: <b>{mejor.etiqueta.replace('.', '')}</b>, {formatUSD(mejor.totalUSD)}. </> : 'Sin ventas esta semana. '}
          Desde que abrió: <b>{formatUSD(totales.ventasUSD)}</b> en {plural(totales.ordenes, 'orden', 'órdenes')}.
        </span>
      </p>
      <p className={cx(s.rotulo, s.sinH4)} style={{ marginTop: 8 }}>Solo órdenes pagadas, sin las canceladas ni las reembolsadas.</p>
    </Tarjeta>
  );
}

/* ── Órdenes recientes ── */
export function WidgetOrdenes({ ordenes }: { ordenes: DashboardData['ordenesRecientes'] }) {
  return (
    <Tarjeta id="ordenes" titulo="Órdenes recientes" icono="Ordenes" extra={<Enlace href="/admin/orders" clase={s.sinMuyAngosto}>Ver todas</Enlace>}>
      {ordenes.length === 0 ? <Vacio>Todavía no hay órdenes.</Vacio> : (
        <ul className={s.filas}>
          {ordenes.map((orden, i) => {
            const pago = estadoPago(orden.paymentStatus);
            return (
              <li key={orden.id} className={porAlto(i, [2, 4, 5])}>
                <Link href={`/admin/orders?orden=${encodeURIComponent(orden.orderNumber)}`} className={s.fila}>
                  <span className={s.filaTexto}><b>{orden.cliente}</b><small>{orden.orderNumber} · {fechaHora.format(new Date(orden.createdAt))}</small></span>
                  <span className={cx('flex shrink-0 flex-wrap items-center gap-1', s.sinAngosto)}>
                    <span className={adminBadge(tonoEstadoOrden(orden.status))}>{ETIQUETA_ESTADO[orden.status]}</span>
                    {orden.paymentStatus !== 'PAID' && <span className={adminBadge(pago.tono)}>{pago.label}</span>}
                  </span>
                  <span className={s.derecha}>{formatUSD(orden.totalUSD)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}

/* ── Se están acabando ── */
export function WidgetInventario({ inventario }: { inventario: DashboardData['pocoInventario'] }) {
  return (
    <Tarjeta id="inventario" titulo="Se están acabando" icono="Paquete" extra={inventario.total > 0 ? <span className={cx(s.dato, s.sinMuyAngosto)}>{inventario.umbral === 1 ? 'con 1' : `${inventario.umbral} o menos`}</span> : undefined}>
      {inventario.total === 0 ? <AlDia titulo="Nada se está acabando" detalle={`Ningún producto publicado tiene ${inventario.umbral} unidades o menos.`} /> : (
        <>
          <StockRapido productos={inventario.productos} />
          {inventario.total > inventario.productos.length && (
            <p className={cx(s.rotulo, s.sinH4)} style={{ marginTop: 'auto', paddingTop: 6 }}>Y {inventario.total - inventario.productos.length} más en <Link href="/admin/products" className="font-semibold text-brand-600 hover:text-brand-700">Productos</Link>.</p>
          )}
        </>
      )}
    </Tarjeta>
  );
}

/* ── Tu tienda: por completar ── */
export function WidgetTienda({ tienda }: { tienda: DashboardData['tienda'] }) {
  return (
    <Tarjeta id="tienda" titulo="Tu tienda: por completar" icono="Tienda" extra={tienda.length > 0 ? <span className={adminBadge('warning')}>{tienda.length}</span> : undefined}>
      {tienda.length === 0 ? <AlDia titulo="Todo configurado" detalle="A la tienda no le falta nada por configurar." /> : (
        <>
          <p className={cx(s.rotulo, s.soloH1, 'truncate')}>{tienda[0].texto}</p>
          <ul className={cx(s.filas, s.sinH1)}>
            {tienda.map((item, i) => (
              <li key={item.clave} className={porAlto(i, [2, 3, 4])}>
                <Link href={item.href} className={s.filaBoton}>
                  <span className={cx(s.placa, s.placaAccion)} aria-hidden="true"><IconoAdvertencia /></span>
                  <span className={s.filaTexto}><b>{item.texto}</b></span>
                  <IconoChevronDerecha aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Tarjeta>
  );
}

/* ── Desde que abrió ── */
export function WidgetTotales({ totales }: { totales: DashboardData['totales'] }) {
  return (
    <Tarjeta id="totales" titulo="Desde que abrió" icono="Reportes">
      <p className={cx(s.lineaMini, s.soloH1)}><b className={s.cifraChica}><CifraAnimada valor={totales.ventasUSD} formato="usd" retraso={300} /></b><span className={s.rotulo}>en {plural(totales.ordenes, 'orden', 'órdenes')}</span></p>
      <dl className={cx(s.totales, s.sinH1)}>
        <div><dd><b><CifraAnimada valor={totales.ventasUSD} formato="usd" retraso={300} /></b></dd><dt><small>cobrado</small></dt></div>
        <div><dd><b><CifraAnimada valor={totales.ordenes} retraso={300} /></b></dd><dt><small>órdenes</small></dt></div>
        <div><dd><b><CifraAnimada valor={totales.publicados} retraso={300} /></b></dd><dt><small>en la tienda<span className={s.sinMuyAngosto}> de {totales.productos}</span></small></dt></div>
        <div><dd><b><CifraAnimada valor={totales.clientes} retraso={300} /></b></dd><dt><small>clientes</small></dt></div>
      </dl>
    </Tarjeta>
  );
}

/* ── Embudo de hoy ── */
export function WidgetEmbudo({ embudo }: { embudo: DatosEmbudo }) {
  const pasos = [
    { nombre: 'Visitaron la tienda', valor: embudo.visitas },
    { nombre: 'Agregaron al carrito', valor: embudo.carrito },
    { nombre: 'Empezaron a pagar', valor: embudo.pago },
    { nombre: 'Compraron', valor: embudo.compras },
  ];
  const maximo = Math.max(1, embudo.visitas);
  return (
    <Tarjeta id="embudo" titulo="Embudo de hoy" icono="Filtro">
      <ol className={s.embudo}>
        {pasos.map((p) => (
          <li key={p.nombre}>
            <div className={s.embudoFila}><span className="truncate">{p.nombre}</span><b><CifraAnimada valor={p.valor} retraso={300} /></b></div>
            <div className={cx('mt-0.5 h-1.5 overflow-hidden rounded-full bg-line', s.sinH2)} aria-hidden="true">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (p.valor / maximo) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}

/* ── Tasa del día ── */
export function WidgetTasa({ tasa, actualizada, automatica, puedeCambiar }: { tasa: number | null; actualizada: string | null; automatica: boolean; puedeCambiar: boolean }) {
  return (
    <Tarjeta id="tasa" titulo="Tasa del día" icono="Billete" extra={puedeCambiar ? <Enlace href="/admin/settings" clase={s.sinMuyAngosto}>Cambiar</Enlace> : undefined}>
      {tasa ? (
        <>
          <div className={s.lineaMini}><b className={s.cifraChica}><CifraAnimada valor={tasa} formato="ves" desde={tasa * 0.985} retraso={300} /></b><span className={s.rotulo}>por dólar</span></div>
          <p className={cx(s.rotulo, s.sinH1)} style={{ marginTop: 6 }}>
            {actualizada ? `Actualizada el ${fechaHora.format(new Date(actualizada))}` : 'Sin fecha de actualización'}{automatica ? ' · se actualiza sola' : ''}. La usan los precios en bolívares de toda la tienda.
          </p>
        </>
      ) : <Vacio>La tienda no tiene tasa en bolívares.</Vacio>}
    </Tarjeta>
  );
}

/* ── Más vendidos de la semana ── */
export function WidgetMasVendidos({ productos }: { productos: Array<{ id: string; nombre: string; unidades: number }> }) {
  return (
    <Tarjeta id="mas-vendidos" titulo="Más vendidos de la semana" icono="Estrella">
      {productos.length === 0 ? <Vacio>Sin ventas esta semana.</Vacio> : (
        <ol className={s.filas}>
          {productos.map((p, i) => (
            <li key={p.id} className={porAlto(i, [2, 4, 5])}>
              <Link href={`/admin/products/${p.id}`} className={s.fila}>
                <span className={s.inicial} aria-hidden="true">{i + 1}</span>
                <span className={s.filaTexto}><b>{p.nombre}</b></span>
                <span className={s.derecha}>{p.unidades} u.</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  );
}

/* ── El equipo ── */
export function WidgetActividad({ filas }: { filas: FilaActividad[] }) {
  return (
    <Tarjeta id="actividad" titulo="El equipo" icono="Clientes" extra={<Enlace href="/admin/reports" clase={s.sinMuyAngosto}>Todo</Enlace>}>
      {filas.length === 0 ? <Vacio>Todavía no hay actividad.</Vacio> : (
        <ol className={s.filas}>
          {filas.map((f, i) => (
            <li key={f.id} className={cx(s.fila, porAlto(i, [2, 4, 6]))}>
              <span className={s.inicial} aria-hidden="true">{f.quien.trim()[0]?.toUpperCase() ?? '?'}</span>
              <span className={s.filaTexto}><b>{f.quien} · {f.accion}{f.detalle ? `: ${f.detalle}` : ''}</b><small>{fechaHora.format(new Date(f.en))}</small></span>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  );
}

/* ── Promotores ── */
export function WidgetPromotores({ datos }: { datos: { porAcreditar: number; montoUSD: number; porRevisar: number } }) {
  return (
    <Tarjeta id="promotores" titulo="Promotores" icono="Compartir" extra={<Enlace href="/admin/marketing" clase={s.sinMuyAngosto}>Ver</Enlace>}>
      <div className={s.lineaMini}><b className={s.cifraChica}><CifraAnimada valor={datos.porAcreditar} retraso={300} /></b><span className={s.rotulo}>{datos.porAcreditar === 1 ? 'comisión por acreditar' : 'comisiones por acreditar'}</span></div>
      <p className={cx(s.rotulo, s.sinH1)} style={{ marginTop: 6 }}>{formatUSD(datos.montoUSD)} en Puntos ES</p>
      {datos.porRevisar > 0 && <p className={cx(adminBadge('warning'), s.sinH1)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>{datos.porRevisar} {datos.porRevisar === 1 ? 'espera' : 'esperan'} tu revisión</p>}
    </Tarjeta>
  );
}

const ESTADO_COTIZACION: Record<string, string> = { REQUESTED: 'Por armar', DRAFT: 'Borrador', SENT: 'Enviada' };

/* ── Cotizaciones abiertas ── */
export function WidgetCotizaciones({ datos }: { datos: { abiertas: number; lista: Array<{ id: string; numero: string; cliente: string; estado: string; totalUSD: number }> } }) {
  return (
    <Tarjeta id="cotizaciones" titulo="Cotizaciones abiertas" icono="Documento" extra={<Enlace href="/admin/cotizaciones" clase={s.sinMuyAngosto}>Ver</Enlace>}>
      {datos.lista.length === 0 ? <Vacio>No hay cotizaciones abiertas.</Vacio> : (
        <ul className={s.filas}>
          {datos.lista.map((c, i) => (
            <li key={c.id} className={porAlto(i, [2, 3, 4])}>
              <Link href={`/admin/cotizaciones/${c.id}`} className={s.fila}>
                <span className={s.filaTexto}><b>{c.cliente}</b><small>{c.numero} · {ESTADO_COTIZACION[c.estado] ?? c.estado}</small></span>
                <span className={s.derecha}>{formatUSD(c.totalUSD)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

/* ── Reseñas recientes ── */
export function WidgetResenas({ resenas }: { resenas: Array<{ id: string; estrellas: number; comentario: string | null; producto: string; autor: string; pendiente: boolean }> }) {
  return (
    <Tarjeta id="resenas" titulo="Reseñas recientes" icono="Estrella" extra={<Enlace href="/admin/reviews" clase={s.sinMuyAngosto}>Ver</Enlace>}>
      {resenas.length === 0 ? <Vacio>Todavía no hay reseñas.</Vacio> : (
        <ul className={s.filas}>
          {resenas.map((r, i) => (
            <li key={r.id} className={cx(s.fila, porAlto(i, [1, 2, 3]))}>
              <span className={s.filaTexto}>
                <b>
                  <span className="inline-flex items-center gap-0.5 align-[-2px] tabular-nums"><IconoEstrella lleno className="text-tag" aria-hidden="true" />{r.estrellas}<span className="sr-only"> de 5</span></span>{' '}
                  {r.producto}
                </b>
                {r.comentario && <small>{r.autor}: {r.comentario}</small>}
              </span>
              {r.pendiente && <span className={cx(adminBadge('warning'), s.sinMuyAngosto)}>Por moderar</span>}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

/* ── Respaldo ── */
export function WidgetRespaldo({ datos }: { datos: { encendido: boolean; ultimo: { ok: boolean; en: string } | null } }) {
  return (
    <Tarjeta id="respaldo" titulo="Respaldo" icono="BaseDeDatos" extra={<Enlace href="/admin/settings#respaldos" clase={s.sinMuyAngosto}>Abrir</Enlace>}>
      {!datos.encendido ? (
        <p className="flex items-start gap-2 text-sm font-semibold text-deal"><IconoAdvertencia className="mt-0.5 shrink-0" aria-hidden="true" />Los respaldos automáticos están apagados.</p>
      ) : !datos.ultimo ? (
        <Vacio>Encendido. Todavía no corrió ninguno.</Vacio>
      ) : (
        <>
          <p className={`flex items-center gap-2 text-sm font-semibold ${datos.ultimo.ok ? 'text-success-strong' : 'text-deal'}`}>
            {datos.ultimo.ok ? <IconoConfirmado aria-hidden="true" /> : <IconoAdvertencia aria-hidden="true" />}
            {datos.ultimo.ok ? 'El último salió bien' : 'El último falló'}
          </p>
          <p className={cx(s.rotulo, s.sinH1)}>{fechaHora.format(new Date(datos.ultimo.en))}</p>
        </>
      )}
    </Tarjeta>
  );
}

/* ── Sorteo ── */
export function WidgetSorteo({ sorteo, ahora }: { sorteo: DatosSorteo | null; ahora: Date }) {
  if (!sorteo) {
    return (
      <Tarjeta id="sorteo" titulo="Sorteo" icono="Premio">
        <AlDia icono="premio" titulo="No hay un sorteo abierto" detalle="Cuando lo abras, aquí ves la cuenta atrás y los boletos." />
        <div className={cx(s.tPie, s.sinH2)}><Link href="/admin/marketing#sorteo" className={cx(s.btn, s.btnSecundario)}><IconoMas aria-hidden="true" />Crear un sorteo</Link></div>
      </Tarjeta>
    );
  }
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(ahora);
  const dias = diasEntre(hoy, sorteo.resultado);
  const periodo = periodoDelSorteo(ahora, sorteo);
  return (
    <Tarjeta id="sorteo" titulo={sorteo.titulo} icono="Premio" extra={<span className={cx(s.sello, s.selloAvanza, s.sinMuyAngosto)}>Abierto</span>}>
      <div className={s.sorteoArriba}>
        <span className={cx(s.sorteoFoto, 'relative overflow-hidden')}>
          {sorteo.imagen && <Image src={sorteo.imagen} alt={sorteo.premio} fill sizes="120px" className="object-cover" unoptimized={!sorteo.imagen.startsWith('/')} />}
        </span>
        <div className={s.sorteoInfo}>
          <p className={cx(s.rotulo, s.sinMuyAngosto, 'truncate')}>{sorteo.premio}</p>
          {dias > 0 ? (
            <div className={s.sorteoDias}><b className={s.cifra}><CifraAnimada valor={dias} retraso={400} /></b><span>{dias === 1 ? 'día' : 'días'}</span></div>
          ) : <b className={s.cifraChica}>{dias === 0 ? 'Hoy es el sorteo' : 'Toca sortear'}</b>}
          <p className={s.rotulo}>Sale el {fechaConMes(sorteo.resultado)}</p>
        </div>
      </div>
      <p className={cx(s.linea, s.sinH2)}>{plural(sorteo.boletos, 'boleto', 'boletos')}<span className={s.sinMuyAngosto}> · {plural(sorteo.participantes, 'participante', 'participantes')}</span></p>
      <div className={cx(s.periodo, s.sinH2)}>
        <div className={s.periodoBarra}><i style={{ width: `${periodo.pct}%` }} /></div>
        <div className={s.periodoFechas}><span>{fechaCorta(sorteo.desde)}</span><span>Día {periodo.dia} de {periodo.total}</span><span>{fechaCorta(sorteo.hasta)}</span></div>
      </div>
      <div className={cx(s.tPie, s.sinH3)}>
        <Link href="/admin/studio/nueva" className={cx(s.btn, s.btnPrimario)}><IconoClaqueta aria-hidden="true" />Crear la historia</Link>
        <Enlace href="/admin/marketing#sorteo" clase={s.sinMuyAngosto}>Ver</Enlace>
      </div>
    </Tarjeta>
  );
}

/* ── ElectroStudio · esta semana ── */
export function WidgetStudio({ studio, ahora }: { studio: DatosStudio; ahora: Date }) {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(ahora);
  const corto = new Intl.DateTimeFormat('es-VE', { timeZone: 'UTC', weekday: 'short' });
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(new Date(`${studio.lunes}T12:00:00Z`).getTime() + i * 86_400_000);
    const fecha = d.toISOString().slice(0, 10);
    return { fecha, nombre: corto.format(d).replace('.', ''), numero: d.getUTCDate(), hoy: fecha === hoy, historias: studio.historias.filter((h) => h.fecha === fecha) };
  });
  const s1 = studio.sugerida;
  return (
    <Tarjeta id="studio" titulo="ElectroStudio · esta semana" icono="Claqueta" extra={<Enlace href="/admin/studio" clase={s.sinMuyAngosto}>Abrir ElectroStudio</Enlace>}>
      <div className={s.semanaStudio}>
        {dias.map((d) => (
          <div key={d.fecha} className={cx(s.dia, d.hoy && s.diaHoy)}>
            <small>{d.hoy ? 'hoy' : d.nombre} {d.numero}</small>
            {d.historias[0] ? (
              <Link href={`/admin/studio/${d.historias[0].id}`} className={s.historia} title={d.historias[0].nombre}>
                <span>{d.historias[0].nombre}{d.historias.length > 1 ? ` y ${d.historias.length - 1} más` : ''}</span>
              </Link>
            ) : (
              <Link href="/admin/studio/nueva" className={s.historiaVacia} aria-label={`Crear una historia para el ${d.nombre} ${d.numero}`}><IconoMas aria-hidden="true" /></Link>
            )}
          </div>
        ))}
      </div>
      {s1 && (
        <div className={cx(s.sugerida, s.sinH2)}>
          <span className={cx(s.foto, 'relative overflow-hidden')}>{s1.foto && <Image src={s1.foto} alt="" fill sizes="36px" className="object-contain" unoptimized={!s1.foto.startsWith('/')} />}</span>
          <div className={s.filaTexto}><b>Sugerida: {s1.nombre}</b><small>{s1.stock === 1 ? 'Queda 1' : `Quedan ${s1.stock}`} · {formatUSD(s1.precioUSD)} · ideal para «Última unidad»</small></div>
          <Link href="/admin/studio/nueva" className={cx(s.btn, s.btnPrimario)}><IconoClaqueta aria-hidden="true" /><span className={s.sinMuyAngosto}>Crear historia</span></Link>
        </div>
      )}
    </Tarjeta>
  );
}

/* ── Lo que viene ── */
export function WidgetViene({ fechas }: { fechas: FechaQueViene[] }) {
  return (
    <Tarjeta id="viene" titulo="Lo que viene" icono="Calendario">
      <ul className={s.viene}>
        {fechas.map((f, i) => {
          const dia = Number(f.fecha.slice(8, 10));
          return (
            <li key={f.id} className={porAlto(i, [2, 4, 5])}>
              {f.hoy
                ? <span className={cx(s.fechaChica, s.fechaHoy)}><b>Hoy</b><small>{f.hora?.replace(':00', '') ?? ''}</small></span>
                : <span className={s.fechaChica}><b>{dia}</b><small>{fechaCorta(f.fecha).split(' ')[1]}</small></span>}
              <div className={s.filaTexto}><b>{f.titulo}</b><small>{f.detalle}</small></div>
              {!f.hoy && <span className={cx(s.en, s.sinMuyAngosto)}>{f.dias === 1 ? 'mañana' : `en ${f.dias} días`}</span>}
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
}

