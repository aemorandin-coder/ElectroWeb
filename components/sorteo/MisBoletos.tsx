'use client';

// C-263: los boletos épicos del cliente, en "Tus boletos" de /sorteo (uno debajo del otro) y en Mi panel (en fila; en el
// teléfono, para deslizar, con "Tu próximo boleto" al final). Debajo de cada uno, solo en la pantalla, el monto de la
// compra o los dos amigos (ni la imagen que se descarga ni el flyer los llevan). Con más de 3, los 3 últimos: en /sorteo
// "Ver los N" los abre; en Mi panel, "Ver los N en el sorteo" lleva a /sorteo.
// "Descargar" baja una imagen con todos; "Mi flyer" abre la hoja para compartir (CompartirFlyer).
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { IconoChevronAbajo, IconoChevronDerecha, IconoClientes, IconoCompartir, IconoDescargar, IconoImagen } from '@/components/iconos';
import BoletoEpico, { recursosDelBoleto } from '@/components/sorteo/BoletoEpico';
import { formatUSD } from '@/lib/currency';
import type { MisBoletosPublicos } from '@/lib/dto/sorteo';
import { cargarImagen, imagenDeBoletos, marcasDelFlyer, type BoletoParaDibujar, type DatosFlyer, type SorteoParaDibujar } from '@/lib/sorteo/dibujo';
import { canvasBlob, downloadBlob } from '@/lib/studio/exportar';

const CompartirFlyer = dynamic(() => import('@/components/sorteo/CompartirFlyer'), { ssr: false });

const ZONA = 'America/Caracas';
const diaCorto = (iso: string) => new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', timeZone: ZONA }).format(new Date(iso)).replace('.', '').toUpperCase();
const diaLargo = (iso: string) => new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: ZONA }).format(new Date(iso));
const fechaChica = (iso: string) => new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', timeZone: ZONA }).format(new Date(iso)).replace('.', '');

/** C-297: el sorteo como lo dibuja el boleto, con el correo que va en él (el del cliente, o uno de muestra) */
export const dibujoDelSorteo = (s: MisBoletosPublicos['sorteo'], correo: string): SorteoParaDibujar => ({
  titulo: s.titulo, logo: s.logo, nombre: s.nombreCorto ?? s.premio, correo, dia: diaCorto(s.resultadoEl), resultado: diaLargo(s.resultadoEl),
});

/** Lo que necesita el dibujo, de los datos del cliente */
export function paraDibujar(d: MisBoletosPublicos) {
  const sorteo = dibujoDelSorteo(d.sorteo, d.correo);
  const boletos: BoletoParaDibujar[] = d.boletos.map((b, i) => ({ codigo: b.codigo, tipo: b.tipo, origen: b.origen, n: i + 1, total: d.boletos.length }));
  // C-297: una compra da varios boletos: se muestran por grupo (los que nacieron juntos), con el primero al frente y su cantidad
  const grupos = agrupar(d);
  const frentes = grupos.map((g) => ({ ...boletos[g.indices[0]], cantidad: g.indices.length }));
  const url = new URL(d.enlace);
  const flyer: DatosFlyer = {
    boletos: frentes.slice(-3), total: boletos.length, enlace: d.enlace, enlaceTexto: `${url.host}${url.pathname}`, dominio: url.host,
    marcas: marcasDelFlyer(d.sorteo.logo),
  };
  const premio = d.sorteo.logo ? `la ${d.sorteo.logo === 'ps4' ? 'PS4' : 'PS5'}` : `el ${d.sorteo.titulo}`;
  const texto = `¡Ya tengo ${boletos.length} ${boletos.length === 1 ? 'boleto' : 'boletos'} para ${premio} de Electro Shop! Participa conmigo: ${d.enlace}`;
  return { sorteo, boletos, grupos, frentes, flyer, texto };
}

/** C-297: los boletos que nacieron juntos (una compra con los de su producto estrella, una reseña, un par de amigos), en orden */
export function agrupar(d: MisBoletosPublicos): Array<{ grupo: string; indices: number[] }> {
  const mapa = new Map<string, number[]>();
  d.boletos.forEach((b, i) => {
    const lista = mapa.get(b.grupo) ?? [];
    lista.push(i);
    mapa.set(b.grupo, lista);
  });
  return [...mapa.entries()].map(([grupo, indices]) => ({ grupo, indices }));
}

/** "Mi flyer para el estado": el botón y su hoja */
export function BotonFlyer({ datos, etiqueta = 'Mi flyer para el estado', clase }: { datos: MisBoletosPublicos; etiqueta?: string; clase?: string }) {
  const [abierta, setAbierta] = useState(false);
  const d = useMemo(() => paraDibujar(datos), [datos]);
  if (d.boletos.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className={clase ?? 'inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-200 bg-white px-5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'}
      >
        {clase ? <IconoCompartir className="h-5 w-5" aria-hidden="true" /> : <IconoImagen className="h-4 w-4" aria-hidden="true" />} {etiqueta}
      </button>
      {abierta && <CompartirFlyer datos={d.flyer} sorteo={d.sorteo} foto={datos.sorteo.imagen} texto={d.texto} alCerrar={() => setAbierta(false)} />}
    </>
  );
}

/** C-297: la imagen que se descarga lleva un boleto por grupo (con su cantidad), los últimos: con 50 boletos sería muy alta */
const MAX_EN_LA_IMAGEN = 12;

async function descargarBoletos(datos: MisBoletosPublicos, sorteo: SorteoParaDibujar, boletos: BoletoParaDibujar[]) {
  try {
    const [r, logo] = await Promise.all([recursosDelBoleto(datos.sorteo.imagen), cargarImagen('/images/studio/logo-color.png')]);
    const c = imagenDeBoletos(boletos, sorteo, r, logo, new URL(datos.enlace).host);
    const blob = await canvasBlob(c);
    if (!blob) throw new Error('Sin imagen');
    downloadBlob(blob, boletos.length === 1 ? `boleto-${boletos[0].codigo.toLowerCase()}-electroshop.png` : 'mis-boletos-electroshop.png');
  } catch {
    toast.error('No se pudo preparar la imagen. Inténtalo de nuevo.');
  }
}

/**
 * La línea chica de debajo de cada boleto, solo en la pantalla. C-297: de un grupo: la compra con su monto y, si dio varios,
 * de dónde salió cada parte ("5 por el monto y 10 del producto estrella"); la reseña con su producto; los dos amigos.
 */
function lineasDe(d: MisBoletosPublicos, indices: number[]): { linea: string; detalle: string | null } {
  const b = d.boletos[indices[0]];
  const fecha = fechaChica(b.fecha);
  if (b.tipo === 'compra' || b.tipo === 'estrella') {
    const orden = b.grupo.startsWith('compra:') ? b.grupo.slice('compra:'.length) : '';
    const porEstrella = indices.filter((i) => d.boletos[i].tipo === 'estrella').length;
    const porMonto = indices.length - porEstrella;
    const detalle = porEstrella > 0
      ? `${porMonto > 0 ? `${porMonto} por el monto y ` : ''}${porEstrella} del producto estrella`
      : indices.length > 1 ? `${indices.length} boletos por el monto` : null;
    return { linea: `Compra ${orden}${b.monto != null ? ` · ${formatUSD(b.monto)}` : ''} · ${fecha}`, detalle };
  }
  if (b.tipo === 'resena') return { linea: `Tu reseña${b.producto ? ` de ${b.producto}` : ''} · ${fecha}`, detalle: null };
  return { linea: b.amigos.length ? `${b.amigos.join(' y ')} · ${fecha}` : fecha, detalle: null };
}

/**
 * C-297: un grupo de boletos: el primero al frente y, si son varios, la pila detrás y su cantidad (el talón dice "15
 * boletos"). Sus códigos, uno por boleto, se abren debajo: con cualquiera de ellos se puede ganar.
 */
export function GrupoDeBoletos({ datos, indices, frente, sorteo, retraso }: {
  datos: MisBoletosPublicos;
  indices: number[];
  frente: BoletoParaDibujar;
  sorteo: SorteoParaDibujar;
  retraso: number;
}) {
  const n = indices.length;
  const { linea, detalle } = lineasDe(datos, indices);
  return (
    <>
      <div className="relative">
        {n > 1 && (
          <>
            <span aria-hidden="true" className="absolute inset-x-5 -bottom-3 top-3 rounded-2xl bg-brand-700/25" />
            <span aria-hidden="true" className="absolute inset-x-2.5 -bottom-1.5 top-1.5 rounded-2xl bg-brand-700/50" />
          </>
        )}
        <div className="relative">
          <BoletoEpico boleto={frente} sorteo={sorteo} foto={datos.sorteo.imagen} retraso={retraso} />
        </div>
        {n > 1 && (
          <span className="absolute -right-1.5 -top-2.5 rounded-full bg-brand-500 px-2.5 py-0.5 text-sm font-bold text-white shadow ring-2 ring-white">
            {n}<span className="sr-only"> boletos</span>
          </span>
        )}
      </div>
      <p className={`${n > 1 ? 'mt-4' : 'mt-1.5'} px-1 text-xs text-muted`}>{linea}</p>
      {detalle && <p className="px-1 text-xs font-semibold text-brand-700">{detalle}</p>}
      {n > 1 && (
        <details className="group mt-1 px-1">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-brand-600 [&::-webkit-details-marker]:hidden">
            Ver sus {n} códigos <IconoChevronAbajo className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Los códigos de estos boletos">
            {indices.map((i) => (
              <li key={datos.boletos[i].codigo} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold tracking-wider text-brand-700">{datos.boletos[i].codigo}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

const BOTON_SECUNDARIO = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

/** "Tus boletos" de /sorteo: uno debajo del otro, con su línea; "Descargar" y "Mi flyer" debajo. C-297: por grupo */
export function BoletosDelSorteo({ datos, flyer }: { datos: MisBoletosPublicos; flyer: boolean }) {
  const [todos, setTodos] = useState(false);
  const { sorteo, boletos, grupos, frentes } = useMemo(() => paraDibujar(datos), [datos]);
  if (boletos.length === 0) return null;
  const desde = todos ? 0 : Math.max(0, grupos.length - 3);
  return (
    <>
      {desde > 0 && (
        <button type="button" onClick={() => setTodos(true)} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Ver todos tus boletos ({boletos.length}) <IconoChevronAbajo className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {/* C-297 (el equipo, 18/11: "mucho scroll"): en el teléfono, en fila para deslizar; en la computadora, uno debajo del otro */}
      <ul className={`${desde > 0 ? 'mt-2' : 'mt-5'} -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 pt-3 [scrollbar-width:none] lg:mx-0 lg:block lg:space-y-6 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden`} aria-label="Tus boletos">
        {grupos.slice(desde).map((g, i) => (
          <li key={g.grupo} className="w-[17.5rem] shrink-0 snap-start sm:w-[20rem] lg:w-auto">
            <GrupoDeBoletos datos={datos} indices={g.indices} frente={frentes[desde + i]} sorteo={sorteo} retraso={i * 0.2} />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void descargarBoletos(datos, sorteo, frentes.slice(-MAX_EN_LA_IMAGEN))} className={`${BOTON_SECUNDARIO} px-4!`}>
          <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Descargar
        </button>
        {flyer && <BotonFlyer datos={datos} etiqueta="Mi flyer" />}
      </div>
    </>
  );
}

/** Mi panel: los 3 últimos en fila (en el teléfono, para deslizar), "Tu próximo boleto" y lo de compartir */
export function BoletosDelPanel({ datos, amigos, flyer, proximo }: {
  datos: MisBoletosPublicos;
  /** La línea de los amigos (C-262), o null */
  amigos: string | null;
  flyer: boolean;
  /** Lo que da el próximo boleto ("Compra $5 o más, o suma 1 amigo más"), o null si ya no se pueden sumar */
  proximo: string | null;
}) {
  const { sorteo, boletos, grupos, frentes } = useMemo(() => paraDibujar(datos), [datos]);
  // C-297: los 3 últimos grupos (una compra que dio 15 es una pila), no los 3 últimos boletos
  const ultimos = grupos.slice(-3);
  const desde = grupos.length - ultimos.length;
  return (
    <>
      <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 pt-3 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {ultimos.map((g, i) => (
          <div key={g.grupo} className="w-[17.5rem] shrink-0 snap-start sm:w-[22rem] lg:w-auto">
            <GrupoDeBoletos datos={datos} indices={g.indices} frente={frentes[desde + i]} sorteo={sorteo} retraso={i * 0.2} />
          </div>
        ))}
        {proximo && (
          <div className={`w-[17.5rem] shrink-0 snap-start sm:w-[22rem] ${ultimos.length >= 3 ? 'lg:hidden' : ''} lg:w-auto`}>
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-3 text-center" style={{ aspectRatio: '320 / 164' }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white" aria-hidden="true">+1</span>
              <span className="text-sm font-semibold text-ink">Tu próximo boleto</span>
              <span className="max-w-[16rem] text-xs leading-snug text-ink-soft">{proximo}</span>
            </div>
          </div>
        )}
      </div>
      {grupos.length > 3 && (
        <Link href="/sorteo#tus-boletos" className="-mt-2 mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Ver los {boletos.length} en el sorteo <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
      <div className="flex flex-col gap-3 border-t border-line pt-4 lg:flex-row lg:items-center lg:justify-between">
        {amigos ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            <IconoClientes className="h-4 w-4 shrink-0" aria-hidden="true" /> {amigos}
          </p>
        ) : <span />}
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          {flyer && <BotonFlyer datos={datos} etiqueta="Compartir mi flyer" clase="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:w-auto" />}
          <button
            type="button"
            onClick={() => void descargarBoletos(datos, sorteo, frentes.slice(-MAX_EN_LA_IMAGEN))}
            className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-brand-600 sm:rounded-full sm:border sm:border-line sm:bg-white sm:px-5 sm:text-ink sm:hover:border-brand-300 sm:hover:text-brand-600"
          >
            <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Descargar mis boletos
          </button>
        </div>
      </div>
    </>
  );
}

