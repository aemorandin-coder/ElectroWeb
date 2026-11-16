'use client';

// C-212: el sorteo en Mi panel: cuántos boletos tiene el cliente y el enlace a /sorteo. Sin sorteo activo no sale nada.
// C-221: la tarjeta en sí (`TarjetaSorteoVista`) también la usa la vista previa del panel, con los datos que se están
// editando; y dice la compra mínima de verdad (antes decía "$10" fijo).
// C-263 (el equipo eligió la maqueta A, 15/11): con boletos, en lugar de la tarjeta, "¡Tienes 3 boletos para la PS4!" con
// sus boletos épicos (BoletosDelPanel), la línea de los amigos, "Compartir mi flyer" y "Descargar mis boletos". Sin
// boletos, o ya sorteado, la tarjeta de siempre. Los dos azules oscuros (los boletos y Puntos ES) los acomoda C-265.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconoChevronDerecha, IconoClientes, IconoCupon, IconoRegalo } from '@/components/iconos';
import LogoCorto from '@/components/sorteo/LogoCorto';
import { BoletosDelPanel } from '@/components/sorteo/MisBoletos';
import { formatUSD } from '@/lib/currency';
import type { MisBoletosPublicos } from '@/lib/dto/sorteo';

export interface DatosTarjetaSorteo {
  titulo: string;
  premio: string;
  resultadoEl: string;
  cerrado: boolean;
  sorteado: boolean;
  compraMinimaUSD?: number;
  topeInvitar?: number;
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
  // C-255 (el equipo, 15/11: "siempre habla claro sobre dos caminos"): la compra primero, y con boletos, cómo sumar más
  const linea = sorteo.sorteado ? 'Ya se sorteó: mira quién ganó.'
    : total > 0 ? `Tienes ${total} ${total === 1 ? 'boleto' : 'boletos'}: suma más comprando${invitar ? ' o invitando' : ''}. Resultado el ${dia}.`
      : `Compra ${minimo} o más${invitar ? ', o invita a 2 amigos,' : ''} y participa. Resultado el ${dia}.`;
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
  return `Compra ${minimo} o más${faltan === 1 ? ', o suma 1 amigo más' : faltan === 2 ? ', o invita a 2 amigos' : ''}`;
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
  return <TarjetaSorteoVista sorteo={datos.sorteo} total={datos.total ?? 0} progreso={datos.invitar} />;
}
