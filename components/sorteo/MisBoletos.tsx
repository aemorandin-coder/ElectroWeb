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

/** Lo que necesita el dibujo, de los datos del cliente */
export function paraDibujar(d: MisBoletosPublicos) {
  const sorteo: SorteoParaDibujar = {
    titulo: d.sorteo.titulo, logo: d.sorteo.logo, nombre: d.sorteo.nombreCorto ?? d.sorteo.premio, correo: d.correo,
    dia: diaCorto(d.sorteo.resultadoEl), resultado: diaLargo(d.sorteo.resultadoEl),
  };
  const boletos: BoletoParaDibujar[] = d.boletos.map((b, i) => ({ codigo: b.codigo, tipo: b.tipo, origen: b.origen, n: i + 1, total: d.boletos.length }));
  const url = new URL(d.enlace);
  const flyer: DatosFlyer = {
    boletos: boletos.slice(-3), total: boletos.length, enlace: d.enlace, enlaceTexto: `${url.host}${url.pathname}`, dominio: url.host,
    marcas: marcasDelFlyer(d.sorteo.logo),
  };
  const premio = d.sorteo.logo ? `la ${d.sorteo.logo === 'ps4' ? 'PS4' : 'PS5'}` : `el ${d.sorteo.titulo}`;
  const texto = `¡Ya tengo ${boletos.length} ${boletos.length === 1 ? 'boleto' : 'boletos'} para ${premio} de Electro Shop! Participa conmigo: ${d.enlace}`;
  return { sorteo, boletos, flyer, texto };
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

/** La línea chica de debajo de cada boleto, solo en la pantalla */
function lineaDe(b: MisBoletosPublicos['boletos'][number]): string {
  if (b.tipo === 'compra') return `${b.origen}${b.monto != null ? ` · ${formatUSD(b.monto)}` : ''} · ${fechaChica(b.fecha)}`;
  return b.amigos.length ? `${b.amigos.join(' y ')} · ${fechaChica(b.fecha)}` : fechaChica(b.fecha);
}

const BOTON_SECUNDARIO = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

/** "Tus boletos" de /sorteo: uno debajo del otro, con su línea; "Descargar" y "Mi flyer" debajo */
export function BoletosDelSorteo({ datos, flyer }: { datos: MisBoletosPublicos; flyer: boolean }) {
  const [todos, setTodos] = useState(false);
  const { sorteo, boletos } = useMemo(() => paraDibujar(datos), [datos]);
  if (boletos.length === 0) return null;
  const desde = todos ? 0 : Math.max(0, boletos.length - 3);
  return (
    <>
      {desde > 0 && (
        <button type="button" onClick={() => setTodos(true)} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Ver los {boletos.length} boletos <IconoChevronAbajo className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <ul className={`${desde > 0 ? 'mt-2' : 'mt-5'} space-y-5`} aria-label="Tus boletos">
        {boletos.slice(desde).map((b, i) => (
          <li key={b.codigo}>
            <BoletoEpico boleto={b} sorteo={sorteo} foto={datos.sorteo.imagen} retraso={i * 0.2} />
            <p className="mt-1.5 px-1 text-xs text-muted">{lineaDe(datos.boletos[desde + i])}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void descargarBoletos(datos, sorteo, boletos)} className={`${BOTON_SECUNDARIO} px-4!`}>
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
  const { sorteo, boletos } = useMemo(() => paraDibujar(datos), [datos]);
  const ultimos = boletos.slice(-3);
  const desde = boletos.length - ultimos.length;
  return (
    <>
      <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 pt-3 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {ultimos.map((b, i) => (
          <div key={b.codigo} className="w-[17.5rem] shrink-0 snap-start sm:w-[22rem] lg:w-auto">
            <BoletoEpico boleto={b} sorteo={sorteo} foto={datos.sorteo.imagen} retraso={i * 0.2} />
            <p className="mt-1.5 px-1 text-xs text-muted">{lineaDe(datos.boletos[desde + i])}</p>
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
      {boletos.length > 3 && (
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
            onClick={() => void descargarBoletos(datos, sorteo, boletos)}
            className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-brand-600 sm:rounded-full sm:border sm:border-line sm:bg-white sm:px-5 sm:text-ink sm:hover:border-brand-300 sm:hover:text-brand-600"
          >
            <IconoDescargar className="h-4 w-4" aria-hidden="true" /> Descargar mis boletos
          </button>
        </div>
      </div>
    </>
  );
}

