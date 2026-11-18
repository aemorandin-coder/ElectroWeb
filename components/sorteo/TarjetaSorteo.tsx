'use client';

// C-212: el sorteo en Mi panel: cuántos boletos tiene el cliente y el enlace a /sorteo. Sin sorteo activo no sale nada.
// C-221: la tarjeta en sí (`TarjetaSorteoVista`) también la usa la vista previa del panel, con los datos que se están
// editando; y dice la compra mínima de verdad (antes decía "$10" fijo).
// C-263 (el equipo eligió la maqueta A, 15/11): con boletos, en lugar de la tarjeta, "¡Tienes 3 boletos para la PS4!" con
// sus boletos épicos (BoletosDelPanel), la línea de los amigos, "Compartir mi flyer" y "Descargar mis boletos". Sin
// boletos, o ya sorteado, la tarjeta de siempre. Los dos azules oscuros (los boletos y Puntos ES) los acomoda C-265.
// C-302 (el equipo, 18/11: "colocar esta información en el panel del cliente para que la gente se anime, de forma
// discreta", y "el boleto que quedó muy genial; que aún tienes tiempo de conseguir boletos, y las vías"):
// - sin boletos y con el sorteo abierto, la invitación: "Aún tienes N días para ganar boletos", las vías con sus números
//   (la escala, el producto estrella, las reseñas y los amigos) y el boleto de muestra con su correo tapado;
// - con boletos, debajo del título, "Aún tienes N días para sumar más" y las vías en píldoras chicas.
// Mientras el sorteo está abierto, la pieza fuerte de Mi panel es el sorteo, tenga boletos o no (conPiezaDelSorteo).
import { Fragment, useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { IconoCarrito, IconoChat, IconoChevronDerecha, IconoClientes, IconoCupon, IconoEstrella, IconoRegalo, type IconType } from '@/components/iconos';
import LogoCorto from '@/components/sorteo/LogoCorto';
import { BoletosDelPanel } from '@/components/sorteo/MisBoletos';
import { BoletoDeMuestra } from '@/components/sorteo/MuestraDeBoleto';
import { formatUSD } from '@/lib/currency';
import type { MisBoletosPublicos } from '@/lib/dto/sorteo';
import { boletosPorMonto, boletosTexto, escalones, type ReglaDeCompra } from '@/lib/sorteo/escala';

export interface DatosTarjetaSorteo {
  titulo: string;
  premio: string;
  resultadoEl: string;
  cerrado: boolean;
  sorteado: boolean;
  compraMinimaUSD?: number;
  topeInvitar?: number;
  /** C-297: los boletos de una compra de la mínima (antes, siempre 1) */
  boletosPorCompra?: number;
  /** C-302: la escala, los boletos por reseña, el producto estrella de esta semana y la última compra que cuenta (ISO) */
  regla?: ReglaDeCompra;
  porResena?: number;
  estrella?: { nombre: string; boletos: number } | null;
  hasta?: string;
}

/** C-302: los días que quedan para ganar boletos (el de hoy cuenta), o null si no se sabe */
function diasParaCerrar(hasta: string | undefined): number | null {
  if (!hasta) return null;
  const ms = new Date(hasta).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : null;
}

/** C-302: "Aún tienes 32 días para ganar boletos", "Hoy es el último día para…" o, sin la fecha, "Todavía tienes tiempo para…" */
function quedaTiempo(dias: number | null, para: string): string {
  if (dias === null) return `Todavía tienes tiempo para ${para}`;
  if (dias <= 1) return `Hoy es el último día para ${para}`;
  return `Aún tienes ${dias} días para ${para}`;
}

/**
 * C-302: las vías para ganar boletos, con sus números: comprar (la escala), el producto estrella, las reseñas y los
 * amigos. `compacto`: en píldoras chicas, en una fila (con boletos); si no, una lista corta con su ícono.
 */
function ViasDelSorteo({ sorteo, compacto = false }: { sorteo: DatosTarjetaSorteo; compacto?: boolean }) {
  const regla = sorteo.regla ?? { minimoUSD: sorteo.compraMinimaUSD ?? 10, porCompra: sorteo.boletosPorCompra ?? 1, escalaUSD: 0, porEscala: 0 };
  const pasos = escalones(regla, 3);
  const tope = sorteo.topeInvitar ?? 0;
  const porResena = sorteo.porResena ?? 0;
  const e = sorteo.estrella;
  const vias: Array<{ clave: string; Icono: IconType; ve: ReactNode; lee: string }> = [
    {
      clave: 'compra', Icono: IconoCarrito,
      ve: <>Compra {pasos.map((p, i) => <Fragment key={p.montoUSD}>{i > 0 && <span className="text-muted"> · </span>}{montoCorto(p.montoUSD)} → <strong className="font-semibold text-brand-700">{p.boletos}</strong></Fragment>)}</>,
      lee: `Comprando: ${pasos.map((p) => `${montoCorto(p.montoUSD)}, ${boletosTexto(p.boletos)}`).join('; ')}`,
    },
    ...(e ? [{
      clave: 'estrella', Icono: IconoEstrella,
      ve: <>{compacto ? 'Producto estrella' : <>Producto estrella <span className="text-ink-soft">({e.nombre})</span></>} <strong className="font-semibold text-brand-700">+{e.boletos}</strong></>,
      lee: `El producto estrella de la semana, ${e.nombre}: ${e.boletos} boletos más por cada uno`,
    }] : []),
    ...(porResena > 0 ? [{
      clave: 'resena', Icono: IconoChat,
      ve: <>Tu reseña <strong className="font-semibold text-brand-700">+{porResena}</strong></>,
      lee: `Cada reseña de lo que compraste: ${boletosTexto(porResena)}`,
    }] : []),
    ...(tope > 0 ? [{
      clave: 'amigos', Icono: IconoClientes,
      ve: <>2 amigos <strong className="font-semibold text-brand-700">+1</strong>{compacto ? '' : `, hasta ${tope}`}</>,
      lee: `Invitando: 2 amigos, 1 boleto, hasta ${tope}`,
    }] : []),
  ];
  if (compacto) {
    return (
      <ul className="iconos-marca mt-2 flex flex-wrap gap-1.5" aria-label="Cómo sumar boletos">
        {vias.map(({ clave, Icono, ve, lee }) => (
          <li key={clave} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-ink">
            <Icono className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
            <span aria-hidden="true">{ve}</span><span className="sr-only">{lee}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="iconos-marca mt-3 grid gap-2 text-sm text-ink" aria-label="Cómo ganar boletos">
      {vias.map(({ clave, Icono, ve, lee }) => (
        <li key={clave} className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <Icono className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate" aria-hidden="true">{ve}</span><span className="sr-only">{lee}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * C-302: sin boletos y con el sorteo abierto, la invitación de Mi panel: cuánto tiempo queda, las vías y el boleto que le
 * espera (con su correo tapado). Se acomoda al ancho de su caja (`@container`): en la vista previa angosta del panel va en
 * una columna, como en el teléfono.
 */
export function InvitacionAlSorteo({ sorteo, muestra, correo, enlace = true }: {
  sorteo: DatosTarjetaSorteo;
  /** Lo público del sorteo para dibujar el boleto de muestra, o null (sin boleto) */
  muestra: MisBoletosPublicos['sorteo'] | null;
  /** Su correo tapado ("an***@gmail.com"): así se verá su boleto */
  correo?: string;
  enlace?: boolean;
}) {
  const id = useId();
  const dia = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(new Date(sorteo.resultadoEl));
  const titulo = quedaTiempo(diasParaCerrar(sorteo.hasta), 'ganar boletos');
  const regla = sorteo.regla ?? { minimoUSD: sorteo.compraMinimaUSD ?? 10, porCompra: sorteo.boletosPorCompra ?? 1, escalaUSD: 0, porEscala: 0 };
  return (
    <section aria-labelledby={id} className="@container relative rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="grid grid-cols-1 items-center gap-5 @xl:grid-cols-[minmax(0,1fr)_17rem] @3xl:grid-cols-[minmax(0,1fr)_19rem] @xl:gap-8">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <IconoRegalo className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
            <span className="min-w-0 truncate">{sorteo.titulo}: {sorteo.premio}</span>
          </p>
          <h2 id={id} className="mt-1 text-lg font-bold leading-tight text-ink lg:text-xl">{titulo}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">Resultado el {dia}. Cada boleto es una oportunidad.</p>
          <ViasDelSorteo sorteo={sorteo} />
          {enlace && (
            <Link href="/sorteo" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-600 after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500">
              Ver el sorteo <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        {muestra && (
          <div className="mx-auto w-full max-w-[17.5rem] @xl:max-w-none">
            <p className="mb-3 text-xs font-semibold text-ink-soft">Así se verá tu boleto</p>
            <BoletoDeMuestra sorteo={muestra} minimo={montoCorto(regla.minimoUSD)} porCompra={boletosPorMonto(regla.minimoUSD, regla)} correo={correo} />
          </div>
        )}
      </div>
    </section>
  );
}

/** C-262: lo de los amigos invitados (de /api/customer/sorteo), sin sus nombres */
export interface ProgresoInvitar {
  porInvitar: number;
  tope: number;
  faltanParaProximo: number;
  /** Amigos que se unieron y todavía no cuentan (falta que activen su cuenta o que agreguen su teléfono) */
  pendientes: number;
}

/** C-262: la línea de los amigos, o null si no hay nada que decir (la línea de arriba ya invita a 2 amigos) */
function lineaAmigos(p: ProgresoInvitar): string | null {
  if (p.pendientes > 0) return p.pendientes === 1 ? '1 amigo tuyo todavía no cuenta: mira qué le falta.' : `${p.pendientes} amigos tuyos todavía no cuentan: mira qué les falta.`;
  if (p.faltanParaProximo === 1) return 'Te falta 1 amigo para tu próximo boleto.';
  if (p.faltanParaProximo === 0 && p.tope > 0) return `Ya ganaste los ${p.tope} ${p.tope === 1 ? 'boleto' : 'boletos'} de invitar.`;
  return null;
}

/** "$10" y no "$10,00": un monto redondo se lee mejor */
export const montoCorto = (usd: number) => (Number.isInteger(usd) ? `$${usd}` : formatUSD(usd));

export function TarjetaSorteoVista({ sorteo, total = 0, enlace = true, progreso }: { sorteo: DatosTarjetaSorteo; total?: number; enlace?: boolean; progreso?: ProgresoInvitar }) {
  const dia = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(new Date(sorteo.resultadoEl));
  const minimo = montoCorto(sorteo.compraMinimaUSD ?? 10);
  const invitar = (sorteo.topeInvitar ?? 1) > 0;
  // C-297: una compra de la mínima da varios ("Compra $5 o más y ganas 2 boletos")
  const porCompra = sorteo.boletosPorCompra ?? 1;
  // C-255 (el equipo, 15/11: "siempre habla claro sobre dos caminos"): la compra primero, y con boletos, cómo sumar más
  const linea = sorteo.sorteado ? 'Ya se sorteó: mira quién ganó.'
    : total > 0 ? `Tienes ${total} ${total === 1 ? 'boleto' : 'boletos'}: suma más comprando${invitar ? ' o invitando' : ''}. Resultado el ${dia}.`
      : `Compra ${minimo} o más y ganas ${porCompra} ${porCompra === 1 ? 'boleto' : 'boletos'}${invitar ? ', o invita a 2 amigos' : ''}. Resultado el ${dia}.`;
  const amigos = invitar && progreso && !sorteo.cerrado && !sorteo.sorteado ? lineaAmigos(progreso) : null;
  const cuerpo = (
    <>
      <span className="iconos-marca flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <IconoRegalo className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink group-hover:text-brand-600">{sorteo.titulo}: {sorteo.premio}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{linea}</span>
        {amigos && (
          <span className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            <IconoClientes className="h-4 w-4 shrink-0" aria-hidden="true" />
            {amigos}
          </span>
        )}
      </span>
      <IconoChevronDerecha className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
    </>
  );
  const clases = 'group relative flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors lg:p-5';
  // En la vista previa del panel no es un enlace: es un dibujo de lo que verá el cliente
  if (!enlace) return <div className={clases}>{cuerpo}</div>;
  return (
    <Link href="/sorteo" className={`${clases} hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-500`}>
      {cuerpo}
    </Link>
  );
}

/** C-263: lo que da el próximo boleto, para "Tu próximo boleto" ("Compra $5 o más, o suma 1 amigo más") */
function proximoBoleto(sorteo: DatosTarjetaSorteo, p: ProgresoInvitar | undefined): string {
  const minimo = montoCorto(sorteo.compraMinimaUSD ?? 10);
  const faltan = p && p.tope > 0 ? p.faltanParaProximo : 0;
  const porCompra = sorteo.boletosPorCompra ?? 1;
  return `Compra ${minimo} o más${porCompra > 1 ? ` (${porCompra} boletos)` : ''}${faltan === 1 ? ', o suma 1 amigo más' : faltan === 2 ? ', o invita a 2 amigos' : ''}`;
}

/** C-263: con boletos, la sección de Mi panel con los boletos épicos */
function SeccionBoletos({ sorteo, mis, progreso }: { sorteo: DatosTarjetaSorteo; mis: MisBoletosPublicos; progreso?: ProgresoInvitar }) {
  const total = mis.boletos.length;
  const dia = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(new Date(sorteo.resultadoEl));
  const invitar = (sorteo.topeInvitar ?? 1) > 0;
  const amigos = invitar && progreso && !sorteo.cerrado ? lineaAmigos(progreso) : null;
  return (
    <section aria-labelledby="mis-boletos-titulo" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
            <IconoCupon className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted">{sorteo.titulo}<span className="hidden sm:inline"> · Resultado el {dia}</span></p>
            <h2 id="mis-boletos-titulo" className="text-lg font-bold leading-tight text-ink lg:text-xl">
              ¡Tienes {total} {total === 1 ? 'boleto' : 'boletos'} para {mis.sorteo.logo ? <>la{' '}<span className="sr-only">{mis.sorteo.logo === 'ps4' ? 'PS4' : 'PS5'}</span><LogoCorto logo={mis.sorteo.logo} /></> : 'el sorteo'}!
            </h2>
          </div>
        </div>
        <Link href="/sorteo" className="hidden min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:inline-flex">
          Ver el sorteo <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {/* C-302: cuánto tiempo queda para sumar más y por qué vías, en una línea y sus píldoras */}
      {!sorteo.cerrado && (
        <div className="mt-3">
          <p className="text-sm text-ink-soft">{quedaTiempo(diasParaCerrar(sorteo.hasta), 'sumar más')}:</p>
          <ViasDelSorteo sorteo={sorteo} compacto />
        </div>
      )}
      <BoletosDelPanel datos={mis} amigos={amigos} flyer={!sorteo.cerrado} proximo={sorteo.cerrado ? null : proximoBoleto(sorteo, progreso)} />
    </section>
  );
}

/** Lo que devuelve /api/customer/sorteo */
export interface DatosSorteoCliente { sorteo: DatosTarjetaSorteo | null; total?: number; invitar?: ProgresoInvitar; mis?: MisBoletosPublicos }

/** C-265: si Mi panel muestra los boletos épicos (la pieza fuerte del inicio mientras dura el sorteo) */
export function conBoletos(datos: DatosSorteoCliente | null | undefined): boolean {
  return Boolean(datos?.sorteo && datos.mis && datos.mis.boletos.length > 0 && !datos.sorteo.sorteado);
}

/** C-302: sin boletos y con el sorteo abierto, Mi panel muestra la invitación con el boleto de muestra */
export function conInvitacion(datos: DatosSorteoCliente | null | undefined): boolean {
  return Boolean(datos?.sorteo && datos.mis && !conBoletos(datos) && !datos.sorteo.cerrado && !datos.sorteo.sorteado);
}

/**
 * C-302: si el sorteo es la pieza fuerte de Mi panel (sus boletos, o el boleto de muestra que lo invita). Entonces Puntos
 * ES va en blanco: una sola pieza en el azul oscuro del logo (PLAN.md §1.1, la regla de C-265)
 */
export const conPiezaDelSorteo = (datos: DatosSorteoCliente | null | undefined) => conBoletos(datos) || conInvitacion(datos);

/**
 * La tarjeta del sorteo de Mi panel. C-265: el inicio le pasa los datos que ya pidió (`datos`), así decide en el mismo
 * momento si Puntos ES va en blanco (con boletos) o en el azul oscuro (sin ellos). Sin `datos`, los pide ella.
 */
export default function TarjetaSorteo({ datos: dados }: { datos?: DatosSorteoCliente | null } = {}) {
  const [pedidos, setDatos] = useState<DatosSorteoCliente | null>(null);
  const propios = dados === undefined;
  useEffect(() => {
    if (!propios) return;
    let vivo = true;
    fetch('/api/customer/sorteo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DatosSorteoCliente | null) => { if (vivo) setDatos(d); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [propios]);
  const datos = propios ? pedidos : dados;
  if (!datos?.sorteo) return null;
  if (conBoletos(datos) && datos.mis) return <SeccionBoletos sorteo={datos.sorteo} mis={datos.mis} progreso={datos.invitar} />;
  if (conInvitacion(datos) && datos.mis) return <InvitacionAlSorteo sorteo={datos.sorteo} muestra={datos.mis.sorteo} correo={datos.mis.correo || undefined} />;
  return <TarjetaSorteoVista sorteo={datos.sorteo} total={datos.total ?? 0} progreso={datos.invitar} />;
}
