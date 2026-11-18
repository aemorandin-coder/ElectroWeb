'use client';

// C-295: el final de una historia. El pedido del 18/11: "al finalizar uno queda así, ¿cómo que y ahora?". Al sacar la
// imagen o el video, la pantalla entera pasa a ser la pieza fuerte (el azul oscuro del logo):
// - mientras se arma, la vista previa con el anillo de lo que falta;
// - al terminar, la historia en grande con un destello y chispas (una sola vez; quieta con "reducir movimiento"), cuánto
//   tardaste y cuántas van esta semana;
// - y qué hacer con ella: compartirla, descargarla, mandarla a Telegram, copiar el texto y el enlace, o seguir con otra.
// Reemplaza en el editor la ventana "¿Qué hago con…?" de C-287: las mismas salidas, ahora después de verla lista.

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { toast } from 'react-hot-toast';
import { FaTelegram } from 'react-icons/fa6';
import {
  IconoCerrar, IconoCheck, IconoClaqueta, IconoCompartir, IconoCopiar, IconoDescargar, IconoEditar, IconoEnlace, IconoImagen, IconoMas,
  IconoReloj, IconoTexto, type IconType,
} from '@/components/iconos';
import IconoDibujado from '@/components/onboarding/IconoDibujado';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCajonAccesible } from '@/lib/hooks/useCajonAccesible';
import { downloadBlob, puedeCompartirArchivo, shareFile } from '@/lib/studio/exportar';
import type { FormatId } from '@/lib/studio/schema';
import { enviarATelegram, useEstadoTelegram } from './ElegirSalida';

export interface ArchivoListo {
  blob: Blob;
  nombre: string;
  /** URL de objeto para verlo aquí (quien lo crea la libera al cerrar) */
  url: string;
  segundos?: number;
  ancho?: number;
  alto?: number;
  /** Un aviso del navegador (grabó en WEBM o en tiempo real) */
  nota?: string;
}

export interface Final {
  tipo: 'imagen' | 'video';
  fase: 'armando' | 'lista';
  /** De 0 a 1 */
  progreso: number;
  /** La vista previa del momento, mientras se arma */
  poster: string | null;
  archivo: ArchivoListo | null;
  /** Segundos desde que se abrió la historia, si es la primera vez que se saca (para "Lista en 2:14"); si no, null */
  tiempo: number | null;
  /** Es el mejor tiempo de este navegador */
  record: boolean;
  /** Cuántas historias se sacaron esta semana, contando esta */
  semana: number;
}

interface Props {
  final: Final;
  formato: FormatId;
  /** El texto para Instagram y el enlace que cuenta las visitas */
  texto: string;
  enlace: string;
  onCerrar: () => void;
  onOtraIgual: () => void;
  onNueva: () => void;
  onOtroTipo: () => void;
  /** Sin texto todavía: lleva a Publicar, donde se escribe */
  onEscribirTexto: () => void;
}

/** El alto de la historia en la pantalla, según su forma: que quepan arriba el título y abajo los botones */
const TARJETA: Record<FormatId, string> = {
  story: 'aspect-[9/16] h-[min(41dvh,34rem)] lg:h-[min(78dvh,42rem)]',
  post45: 'aspect-[4/5] h-[min(40dvh,30rem)] lg:h-[min(70dvh,34rem)]',
  post11: 'aspect-square h-[min(36dvh,26rem)] lg:h-[min(60dvh,28rem)]',
};

/** Las chispas del final: repartidas con el ángulo de oro, para que no se vean en fila (y sin azar: siempre las mismas) */
const CHISPAS = Array.from({ length: 26 }, (_, i) => {
  const angulo = (i * 137.5 * Math.PI) / 180;
  const lejos = 130 + ((i * 53) % 110);
  return {
    dx: Math.round(Math.cos(angulo) * lejos),
    dy: Math.round(Math.sin(angulo) * lejos * 1.25),
    giro: (i * 97) % 360,
    color: ['bg-white', 'bg-brand-300', 'bg-brand-200', 'bg-brand-50'][i % 4],
    forma: i % 3 === 0 ? 'h-2.5 w-2.5 rounded-full' : i % 3 === 1 ? 'h-1.5 w-3.5 rounded-sm' : 'h-3 w-1.5 rounded-sm',
    retraso: (i % 5) * 0.03,
  };
});

function minutos(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m}:${String(r).padStart(2, '0')}` : `${r} s`;
}

/** Una salida, como en la hoja de compartir del teléfono: el ícono en su círculo y lo que hace, en dos palabras */
function Salida({ icono: Icono, titulo, detalle, onClick, disabled, hecho, i }: {
  icono: IconType | typeof FaTelegram;
  titulo: string;
  /** Lo que pasa al tocarlo, completo, para el lector de pantalla y al dejar el dedo encima */
  detalle: string;
  onClick: () => void;
  disabled?: boolean;
  hecho?: boolean;
  i: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${titulo}: ${detalle}`}
      title={detalle}
      style={{ '--i': i } as CSSProperties}
      className="studio-lista-sube flex min-w-0 flex-col items-center gap-1.5 rounded-xl bg-white/10 px-1 py-2.5 text-center text-xs font-semibold leading-tight text-white ring-1 ring-white/15 transition-[background-color,transform] hover:bg-white/15 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${hecho ? 'bg-success-strong' : 'bg-white/15'}`}>
        {hecho ? <IconoCheck className="h-5 w-5" aria-hidden="true" /> : <Icono className="h-5 w-5" aria-hidden="true" />}
      </span>
      {titulo}
    </button>
  );
}

export default function Terminada({ final, formato, texto, enlace, onCerrar, onOtraIgual, onNueva, onOtroTipo, onEscribirTexto }: Props) {
  const id = useId();
  const telegram = useEstadoTelegram();
  const [enviado, setEnviado] = useState<'no' | 'enviando' | 'si'>('no');
  const [guardado, setGuardado] = useState(false);
  const principal = useRef<HTMLButtonElement | null>(null);
  useBodyScrollLock(true);
  useCajonAccesible(true, `final-${id}`, onCerrar);

  const { tipo, fase, archivo } = final;
  const lista = fase === 'lista' && archivo !== null;
  const nombre = tipo === 'video' ? 'el video' : 'la imagen';
  const compartible = lista && puedeCompartirArchivo(new File([archivo.blob], archivo.nombre, { type: archivo.blob.type }));

  // Al quedar lista: una vibración de "listo" (Android) y el foco en lo principal
  useEffect(() => {
    if (!lista) return;
    try {
      navigator.vibrate?.([14, 60, 22]);
    } catch {
      // Sin vibrador: nada
    }
    // Sin el contorno del teclado: sale si se sigue con Tab (como la hoja "Así funciona")
    const t = window.setTimeout(() => principal.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions), 400);
    return () => window.clearTimeout(t);
  }, [lista]);

  const descargar = () => {
    if (!archivo) return;
    downloadBlob(archivo.blob, archivo.nombre);
    setGuardado(true);
  };
  const compartir = async () => {
    if (!archivo) return;
    if (!(await shareFile(archivo.blob, archivo.nombre, texto))) descargar();
  };
  const aTelegram = async () => {
    if (!archivo || enviado === 'enviando') return;
    setEnviado('enviando');
    const ok = await enviarATelegram({ blob: archivo.blob, nombre: archivo.nombre, texto, tipo, segundos: archivo.segundos, ancho: archivo.ancho, alto: archivo.alto });
    setEnviado(ok ? 'si' : 'no');
  };
  const copiar = async (que: string, listo: string) => {
    try {
      await navigator.clipboard.writeText(que);
      toast.success(listo);
    } catch {
      toast.error('No se pudo copiar: este navegador no deja. Cópialo en Publicar.');
    }
  };

  const chats = telegram?.chats ?? 0;
  const detalleTelegram = enviado === 'si' ? 'Ya llegó'
    : enviado === 'enviando' ? 'Mandando…'
      : telegram === null ? 'Revisando el bot…'
        : telegram.disponible ? `Llega a ${chats === 1 ? '1 chat' : `${chats} chats`}, en Full HD`
          : telegram.motivo ?? 'Se conecta en Notificaciones → Telegram';
  const pct = Math.round(final.progreso * 100);
  const vuelta = 2 * Math.PI * 42;

  return (
    <div
      id={`final-${id}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-titulo`}
      className="studio-lista-fondo fixed inset-0 z-[var(--z-modal)] overflow-y-auto overscroll-contain bg-brand-700 text-white"
    >
      {/* Un brillo suave detrás de la historia (blanco: sobre el azul oscuro no va otro azul) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(255,255,255,0.16),transparent_62%)]" />
      {/* Mientras se arma no se puede cortar: la × aparece cuando está lista */}
      {lista && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar y seguir editando"
          className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
        >
          <IconoCerrar className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] lg:grid lg:max-w-4xl lg:grid-cols-[auto_minmax(0,24rem)] lg:content-center lg:gap-x-12 lg:gap-y-5">
        <header className="flex flex-col items-center text-center lg:col-start-2 lg:row-start-1 lg:items-start lg:self-end lg:text-left" aria-live="polite">
          {lista ? (
            <>
              <span className="studio-lista-sello flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-700 shadow-lg">
                <IconoDibujado Icono={IconoCheck} className="h-7 w-7" retraso={0.25} />
              </span>
              <h2 id={`${id}-titulo`} className="mt-2 text-xl font-bold">
                {tipo === 'video' ? 'Tu video está listo' : 'Tu imagen está lista'}
              </h2>
              <p className="mt-0.5 text-sm text-brand-300">
                {tipo === 'video'
                  ? `${Math.round(archivo.segundos ?? 0)} s · ${archivo.ancho ?? 1080} × ${archivo.alto ?? 1920} · ${archivo.nombre.endsWith('.webm') ? 'WEBM' : 'MP4'}`
                  : `${archivo.ancho ?? 1080} × ${archivo.alto ?? 1920} · PNG`}
              </p>
              <div className="studio-lista-sube mt-2 flex flex-wrap justify-center gap-1.5 lg:justify-start" style={{ '--i': 0 } as CSSProperties}>
                {final.tiempo !== null && (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold ring-1 ring-white/15">
                    <IconoReloj className="h-3.5 w-3.5" aria-hidden="true" />
                    Lista en {minutos(final.tiempo)}
                  </span>
                )}
                {final.record && (
                  <span className="inline-flex h-7 items-center rounded-full bg-white px-3 text-xs font-bold text-brand-700">Tu mejor tiempo</span>
                )}
                {final.semana > 0 && (
                  <span className="inline-flex h-7 items-center rounded-full bg-white/10 px-3 text-xs font-semibold ring-1 ring-white/15">
                    {final.semana === 1 ? 'La primera de la semana' : `${final.semana} esta semana`}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 id={`${id}-titulo`} className="text-xl font-bold">Armando {nombre}</h2>
              <p className="mt-0.5 text-sm text-brand-300">
                {tipo === 'video' ? 'Full HD a 60 cuadros: deja la pantalla encendida' : 'En Full HD'}
              </p>
            </>
          )}
        </header>

        {/* La historia: mientras se arma, la vista previa con el anillo; lista, el archivo de verdad */}
        <div className="relative lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {lista && (
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
              {CHISPAS.map((c, i) => (
                <span
                  key={i}
                  className={`studio-lista-chispa absolute ${c.color} ${c.forma}`}
                  style={{ '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, '--giro': `${c.giro}deg`, '--retraso': `${c.retraso}s` } as CSSProperties}
                />
              ))}
            </div>
          )}
          <div className={`${lista ? 'studio-lista-tarjeta' : ''} relative overflow-hidden rounded-2xl bg-white/10 shadow-2xl ring-1 ring-white/20 ${TARJETA[formato]}`}>
            {lista ? (
              tipo === 'video' ? (
                <video src={archivo.url} autoPlay loop muted playsInline className="h-full w-full object-cover" aria-label="El video de la historia" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- es un archivo recién hecho en este navegador (blob:)
                <img src={archivo.url} alt="La imagen de la historia" className="h-full w-full object-cover" />
              )
            ) : (
              <>
                {final.poster && (
                  // eslint-disable-next-line @next/next/no-img-element -- la vista previa del momento (data:)
                  <img src={final.poster} alt="" className="h-full w-full object-cover opacity-50" />
                )}
                {/* Un disco detrás del anillo, para que se lea sobre cualquier historia */}
                <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-700/80" />
                <div className="absolute inset-0 flex items-center justify-center" role="progressbar" aria-label={`Armando ${nombre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                  <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90" aria-hidden="true">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="7" className="text-white/20" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={vuelta}
                      strokeDashoffset={vuelta * (1 - final.progreso)}
                      className="text-white transition-[stroke-dashoffset] duration-300 ease-out"
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold tabular-nums">{pct} %</span>
                </div>
              </>
            )}
            {lista && <span aria-hidden="true" className="studio-lista-destello pointer-events-none absolute inset-0" />}
          </div>
        </div>

        {lista && (
          <div className="flex w-full flex-col gap-4 lg:col-start-2 lg:row-start-2 lg:self-start">
            <button
              ref={principal}
              type="button"
              onClick={() => void (compartible ? compartir() : descargar())}
              style={{ '--i': 1 } as CSSProperties}
              className="studio-lista-sube flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-white text-base font-bold text-brand-700 shadow-lg transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {compartible ? <IconoCompartir className="h-5 w-5" aria-hidden="true" /> : guardado ? <IconoCheck className="h-5 w-5" aria-hidden="true" /> : <IconoDescargar className="h-5 w-5" aria-hidden="true" />}
              {compartible ? 'Compartir: Instagram, WhatsApp…' : guardado ? 'Descargado: otra vez' : `Descargar ${nombre}`}
            </button>
            <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2">
              {compartible && (
                <Salida i={2} icono={IconoDescargar} titulo={guardado ? 'Descargada' : 'Descargar'} detalle={guardado ? 'Ya está en el teléfono: otra vez' : 'Queda en el teléfono'} hecho={guardado} onClick={descargar} />
              )}
              <Salida
                i={3}
                icono={FaTelegram}
                titulo={enviado === 'si' ? 'En Telegram' : enviado === 'enviando' ? 'Mandando…' : 'Telegram'}
                detalle={detalleTelegram}
                hecho={enviado === 'si'}
                disabled={!telegram?.disponible || enviado !== 'no'}
                onClick={() => void aTelegram()}
              />
              {texto.trim() ? (
                <Salida i={4} icono={IconoTexto} titulo="Copiar texto" detalle="El texto para pegarlo en Instagram" onClick={() => void copiar(texto, 'Texto copiado')} />
              ) : (
                <Salida i={4} icono={IconoTexto} titulo="Escribir texto" detalle="Todavía no tiene texto para Instagram: se escribe en Publicar" onClick={onEscribirTexto} />
              )}
              {enlace && <Salida i={5} icono={IconoEnlace} titulo="Copiar enlace" detalle="El enlace que cuenta las visitas, para el sticker de enlace" onClick={() => void copiar(enlace, 'Enlace copiado')} />}
            </div>
            {/* Lo que no se ve en el botón: por qué Telegram está apagado, o a dónde llega */}
            <p className="studio-lista-sube -mt-2 text-center text-xs text-brand-300" style={{ '--i': 6 } as CSSProperties}>
              Telegram: {detalleTelegram.charAt(0).toLowerCase() + detalleTelegram.slice(1)}
            </p>
            {archivo.nota && <p className="text-center text-xs text-brand-300">{archivo.nota}</p>}

            <nav aria-label="Y ahora" className="studio-lista-sube w-full border-t border-white/15 pt-3" style={{ '--i': 7 } as CSSProperties}>
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-brand-300">Y ahora</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onOtraIgual} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
                  <IconoCopiar className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Otra igual
                </button>
                <button type="button" onClick={onNueva} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
                  <IconoMas className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Historia nueva
                </button>
                <button type="button" onClick={onOtroTipo} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
                  {tipo === 'video' ? <IconoImagen className="h-4 w-4 shrink-0" aria-hidden="true" /> : <IconoClaqueta className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  {tipo === 'video' ? 'También la imagen' : 'También el video'}
                </button>
                <button type="button" onClick={onCerrar} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
                  <IconoEditar className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Seguir editando
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-brand-300">&quot;Otra igual&quot; copia esta historia para cambiarle el producto.</p>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
