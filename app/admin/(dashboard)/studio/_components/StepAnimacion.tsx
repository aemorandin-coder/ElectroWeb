'use client';

// C-273: el paso Animación (docs/plan/ELECTROSTUDIO.md, Fase 5). Toda la historia: cómo entra (los 5 estilos de siempre),
// cuánto dura el video, cómo termina y el cierre con el logo. La línea de tiempo: una fila por pieza, que se arrastra para
// cambiar cuándo entra y cuándo sale, y la aguja para mirar un segundo. Y de la pieza elegida: su entrada, su énfasis y su
// salida, con los números (lo mismo que la línea de tiempo, con el teclado).
import { useEffect, useId, useRef, type PointerEvent as PtrEvent, type RefObject } from 'react';
import { IconoPausa, IconoPlay, IconoRestablecer } from '@/components/iconos';
import { adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import {
  CIERRE_LOGO, DURACIONES, ENFASIS, ENTRADAS, FINALES, FINAL_DURA, SALIDAS, duracionDe, inicioEntrada, inicioSalida,
  type EnfasisId, type EntradaId, type FinalId, type SalidaId,
} from '@/lib/studio/animaciones';
import { nombreCapa, type CambioCapa } from '@/lib/studio/capas';
import type { StudioCapa } from '@/lib/studio/schema';
import { AnimationPicker } from './DesignControls';
import { CampoNumero } from './PiezasCapa';
import { smallButton, toggleButton } from './ui';
import type { Studio } from './useStudio';

const redondo = (v: number) => Math.round(v * 10) / 10;
const seg = (v: number) => `${redondo(v).toLocaleString('es-VE')} s`;

interface Props {
  studio: Studio;
  sel: string | null;
  onSel: (id: string | null) => void;
  onCambiar: (id: string, cambio: CambioCapa) => void;
  /** Un arrastre en la línea de tiempo es un solo paso de deshacer */
  onEmpezarGesto: () => void;
  onCambiarGesto: (id: string, cambio: CambioCapa) => void;
  tiempo: number | null;
  onTiempo: (t: number | null) => void;
  playing: boolean;
  /** Reproduce desde ese segundo (o lo detiene) */
  onReproducir: (desde: number | null) => void;
  /** El segundo que va la reproducción, para que la aguja la siga */
  tiempoVivo: RefObject<number>;
  onAnim: () => void;
}

export default function StepAnimacion({ studio, sel, onSel, onCambiar, onEmpezarGesto, onCambiarGesto, tiempo, onTiempo, playing, onReproducir, tiempoVivo, onAnim }: Props) {
  const ids = useId();
  const f = studio.current;
  if (!f) return null;
  const dur = duracionDe(f);
  const elegida = f.capas.find((c) => c.id === sel) ?? null;
  const set = (cambio: Partial<typeof f>) => studio.update((x) => ({ ...x, ...cambio }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <AnimationPicker studio={studio} onAnim={onAnim} />
        <fieldset>
          <legend className={adminLabel}>Duración del video</legend>
          <div className="flex flex-wrap gap-2">
            {DURACIONES.map((d) => (
              <button key={d} type="button" aria-pressed={dur === d} onClick={() => set({ duracion: d })} className={toggleButton(dur === d)}>
                {d} s
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={adminLabel}>Al terminar</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(FINALES) as [FinalId, string][]).map(([id, n]) => (
              <button
                key={id}
                type="button"
                aria-pressed={f.final === id}
                onClick={() => {
                  set({ final: id });
                  if (id !== 'ninguno') onReproducir(Math.max(0, dur - (f.cierreLogo ? CIERRE_LOGO : 0) - FINAL_DURA - 1));
                }}
                className={toggleButton(f.final === id)}
              >
                {n}
              </button>
            ))}
          </div>
          <p className={adminHint}>En el último segundo del video. La imagen no cambia.</p>
        </fieldset>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={f.cierreLogo}
            onChange={(e) => {
              set({ cierreLogo: e.target.checked });
              if (e.target.checked) onReproducir(Math.max(0, dur - CIERRE_LOGO - 1));
            }}
            className="mt-0.5 h-4 w-4 accent-brand-500"
          />
          <span>
            <span className="font-semibold">Cierre con el logo</span>
            <span className="block text-xs text-muted">El último segundo y medio, en el azul de la marca con el logo, el Instagram y la web. Sirve para los Reels.</span>
          </span>
        </label>
      </div>

      <LineaTiempo
        capas={f.capas}
        dur={dur}
        cierre={f.cierreLogo}
        sel={sel}
        onSel={onSel}
        onEmpezarGesto={onEmpezarGesto}
        onCambiarGesto={onCambiarGesto}
        tiempo={tiempo}
        onTiempo={onTiempo}
        playing={playing}
        onReproducir={onReproducir}
        tiempoVivo={tiempoVivo}
      />

      {f.capas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong bg-surface p-4 text-sm text-ink-soft">
          Las piezas sueltas (títulos, subtítulos y stickers) aparecen aquí con su entrada y su salida. Agrégalas en el paso anterior.
        </p>
      ) : elegida ? (
        <AnimacionPieza key={elegida.id} id={ids} capa={elegida} indice={f.capas.indexOf(elegida)} dur={dur} cierre={f.cierreLogo} onCambiar={(c) => onCambiar(elegida.id, c)} onReproducir={onReproducir} />
      ) : (
        <p className={adminHint}>Toca una fila de la línea de tiempo (o una pieza en la vista previa) para elegir cómo entra y cómo sale.</p>
      )}
    </div>
  );
}

/** Desde dónde hasta dónde se ve una pieza en el video, y sus tramos de entrada y salida */
function tramos(c: StudioCapa, i: number, dur: number, cierre: boolean) {
  const entra = inicioEntrada(c.entrada.inicio, i);
  const yaEntro = entra + c.entrada.dura;
  const sale = c.salida.tipo === 'ninguna' ? null : inicioSalida(c.salida.inicio, dur, cierre);
  const fin = sale === null ? dur - (cierre ? CIERRE_LOGO : 0) : sale + c.salida.dura;
  return { entra, yaEntro, sale, fin: Math.min(dur, fin) };
}

type Arrastre = { tipo: 'aguja' } | { tipo: 'mover' | 'entra' | 'sale'; id: string; t0: number; x0: number; c0: StudioCapa; i: number };

function LineaTiempo({ capas, dur, cierre, sel, onSel, onEmpezarGesto, onCambiarGesto, tiempo, onTiempo, playing, onReproducir, tiempoVivo }: {
  capas: StudioCapa[];
  dur: number;
  cierre: boolean;
  sel: string | null;
  onSel: (id: string | null) => void;
  onEmpezarGesto: () => void;
  onCambiarGesto: (id: string, cambio: CambioCapa) => void;
  tiempo: number | null;
  onTiempo: (t: number | null) => void;
  playing: boolean;
  onReproducir: (desde: number | null) => void;
  tiempoVivo: RefObject<number>;
}) {
  const pista = useRef<HTMLDivElement | null>(null);
  const caja = useRef<HTMLElement | null>(null);
  const arrastre = useRef<Arrastre | null>(null);

  // Mientras se reproduce, la aguja sigue al video (sin volver a dibujar el panel)
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const paso = () => {
      const x = `${(Math.min(dur, tiempoVivo.current ?? 0) / dur) * 100}%`;
      caja.current?.querySelectorAll<HTMLElement>('[data-aguja]').forEach((a) => {
        a.style.left = x;
        a.style.opacity = '1';
      });
      frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [playing, dur, tiempoVivo]);

  const segundoEn = (clientX: number) => {
    const r = pista.current?.getBoundingClientRect();
    if (!r || !r.width) return 0;
    return Math.min(dur, Math.max(0, ((clientX - r.left) / r.width) * dur));
  };

  const empezar = (e: PtrEvent<HTMLElement>, a: Arrastre) => {
    e.stopPropagation();
    e.preventDefault();
    // Suelta el campo de números que se estaba escribiendo (si no, seguiría mostrando lo escrito)
    if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    arrastre.current = a;
    if (a.tipo === 'aguja') onTiempo(redondo(segundoEn(e.clientX)));
    else onEmpezarGesto();
  };
  const mover = (e: PtrEvent<HTMLElement>) => {
    const a = arrastre.current;
    if (!a) return;
    if (a.tipo === 'aguja') {
      onTiempo(redondo(segundoEn(e.clientX)));
      return;
    }
    const r = pista.current?.getBoundingClientRect();
    if (!r) return;
    const dt = ((e.clientX - a.x0) / r.width) * dur;
    const c = a.c0;
    const tr = tramos(c, a.i, dur, cierre);
    if (a.tipo === 'mover') {
      const entra = redondo(Math.min(dur - 0.3, Math.max(0, tr.entra + dt)));
      const cambio: CambioCapa = { entrada: { ...c.entrada, inicio: entra } };
      if (tr.sale !== null) cambio.salida = { ...c.salida, inicio: redondo(Math.min(dur - 0.2, Math.max(entra + c.entrada.dura, tr.sale + (entra - tr.entra)))) };
      onCambiarGesto(c.id, cambio);
    } else if (a.tipo === 'entra') {
      const tope = (tr.sale ?? dur) - c.entrada.dura;
      onCambiarGesto(c.id, { entrada: { ...c.entrada, inicio: redondo(Math.min(tope, Math.max(0, tr.entra + dt))) } });
    } else {
      // El borde derecho: dónde termina de salir. Sin salida, se le pone "Desvanecer"
      const fin = redondo(Math.min(dur, Math.max(tr.yaEntro + 0.3, tr.fin + dt)));
      const tipo: SalidaId = c.salida.tipo === 'ninguna' ? 'desvanecer' : c.salida.tipo;
      onCambiarGesto(c.id, { salida: { ...c.salida, tipo, inicio: redondo(Math.max(tr.yaEntro, fin - c.salida.dura)) } });
    }
  };
  const soltar = () => {
    arrastre.current = null;
  };

  const marcas = Array.from({ length: Math.floor(dur) + 1 }, (_, i) => i);
  const posAguja = tiempo ?? 0;
  // Un tramo de la aguja en cada fila: juntos se ven como una línea
  const agujaEn = (
    <span data-aguja aria-hidden="true" className="pointer-events-none absolute -inset-y-1 z-10 w-0.5 -translate-x-1/2 rounded bg-deal" style={{ left: `${(posAguja / dur) * 100}%`, opacity: tiempo === null && !playing ? 0 : 1 }} />
  );

  return (
    <section ref={caja} aria-label="Línea de tiempo" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Línea de tiempo</p>
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted" aria-live="polite">{tiempo !== null ? `Mirando el segundo ${seg(tiempo)}` : playing ? 'Reproduciendo' : 'Toca la regla para mirar un segundo'}</span>
          {tiempo !== null && (
            <button type="button" onClick={() => onTiempo(null)} className={smallButton}>
              <IconoRestablecer className="h-4 w-4" aria-hidden="true" />
              Ver la imagen
            </button>
          )}
          <button type="button" onClick={() => onReproducir(playing ? null : tiempo ?? 0)} className={toggleButton(playing)} aria-pressed={playing}>
            {playing ? <IconoPausa className="mr-1.5 h-4 w-4" aria-hidden="true" /> : <IconoPlay className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {playing ? 'Detener' : 'Reproducir'}
          </button>
        </span>
      </div>

      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-2 gap-y-1.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <span aria-hidden="true" />
        {/* La regla: tocarla o arrastrar la aguja muestra ese segundo en la vista previa */}
        <div
          ref={pista}
          role="slider"
          tabIndex={0}
          aria-label="El segundo que se ve en la vista previa"
          aria-valuemin={0}
          aria-valuemax={dur}
          aria-valuenow={redondo(posAguja)}
          aria-valuetext={tiempo === null ? 'La imagen, sin animación' : seg(posAguja)}
          onPointerDown={(e) => empezar(e, { tipo: 'aguja' })}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onKeyDown={(e) => {
            const d = { ArrowLeft: -0.1, ArrowRight: 0.1, Home: -dur, End: dur }[e.key];
            if (d === undefined) return;
            e.preventDefault();
            onTiempo(redondo(Math.min(dur, Math.max(0, (tiempo ?? 0) + d))));
          }}
          className="relative h-7 cursor-pointer touch-none select-none rounded-md border border-line bg-white focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {marcas.map((m) => (
            <span key={m} className="absolute top-0 flex h-full flex-col items-center" style={{ left: `${(m / dur) * 100}%` }} aria-hidden="true">
              <span className="h-2 w-px bg-line-strong" />
              <span className="-translate-x-1/2 text-[11px] leading-4 text-muted">{m}</span>
            </span>
          ))}
          {agujaEn}
        </div>

        <span className="truncate self-center text-xs font-semibold text-ink-soft">La plantilla</span>
        <div className="relative h-6 rounded-md bg-white ring-1 ring-line">
          <span className="absolute inset-y-1 left-0 rounded bg-brand-100" style={{ width: `${((dur - (cierre ? CIERRE_LOGO : 0)) / dur) * 100}%` }} />
          {cierre && <span className="absolute inset-y-1 right-0 rounded bg-brand-700" style={{ width: `${(CIERRE_LOGO / dur) * 100}%` }} title="Cierre con el logo" />}
          {agujaEn}
        </div>

        {capas.map((c, i) => {
          const tr = tramos(c, i, dur, cierre);
          const activa = c.id === sel;
          const izq = (tr.entra / dur) * 100;
          const ancho = (Math.max(0.2, tr.fin - tr.entra) / dur) * 100;
          const entrada = ((tr.yaEntro - tr.entra) / Math.max(0.2, tr.fin - tr.entra)) * 100;
          const salida = tr.sale === null ? 0 : ((tr.fin - tr.sale) / Math.max(0.2, tr.fin - tr.entra)) * 100;
          return (
            <div key={c.id} className="contents">
              <button type="button" onClick={() => onSel(c.id)} aria-pressed={activa} className={`truncate self-center rounded-md px-1 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand-500 ${activa ? 'text-brand-700' : 'text-ink-soft hover:text-ink'}`}>
                {nombreCapa(c)}
              </button>
              <div className="relative h-7 rounded-md bg-white ring-1 ring-line">
                <div
                  role="button"
                  tabIndex={-1}
                  aria-label={`${nombreCapa(c)}: entra en el segundo ${seg(tr.entra)}${tr.sale === null ? ' y se queda' : ` y sale en el ${seg(tr.sale)}`}`}
                  onPointerDown={(e) => {
                    onSel(c.id);
                    empezar(e, { tipo: 'mover', id: c.id, t0: tr.entra, x0: e.clientX, c0: c, i });
                  }}
                  onPointerMove={mover}
                  onPointerUp={soltar}
                  onPointerCancel={soltar}
                  className={`absolute inset-y-0.5 flex cursor-grab touch-none overflow-hidden rounded ${activa ? 'bg-brand-500 ring-2 ring-brand-200' : 'bg-brand-200'}`}
                  style={{ left: `${izq}%`, width: `${ancho}%` }}
                >
                  <span className={`h-full ${activa ? 'bg-brand-700/60' : 'bg-brand-300'}`} style={{ width: `${entrada}%` }} aria-hidden="true" />
                  <span className="flex-1" aria-hidden="true" />
                  {salida > 0 && <span className={`h-full ${activa ? 'bg-brand-700/60' : 'bg-brand-300'}`} style={{ width: `${salida}%` }} aria-hidden="true" />}
                  <span
                    aria-hidden="true"
                    onPointerDown={(e) => {
                      onSel(c.id);
                      empezar(e, { tipo: 'entra', id: c.id, t0: tr.entra, x0: e.clientX, c0: c, i });
                    }}
                    className="absolute inset-y-0 left-0 w-3 cursor-ew-resize touch-none"
                  />
                  <span
                    aria-hidden="true"
                    onPointerDown={(e) => {
                      onSel(c.id);
                      empezar(e, { tipo: 'sale', id: c.id, t0: tr.fin, x0: e.clientX, c0: c, i });
                    }}
                    className="absolute inset-y-0 right-0 w-3 cursor-ew-resize touch-none"
                  />
                </div>
                {agujaEn}
              </div>
            </div>
          );
        })}
      </div>
      <p className={adminHint}>Arrastra una barra para cambiar cuándo entra; sus bordes, cuándo empieza y cuándo termina de salir.</p>
    </section>
  );
}

/** La entrada, el énfasis y la salida de la pieza elegida, con números */
function AnimacionPieza({ id, capa, indice, dur, cierre, onCambiar, onReproducir }: {
  id: string;
  capa: StudioCapa;
  indice: number;
  dur: number;
  cierre: boolean;
  onCambiar: (cambio: CambioCapa) => void;
  onReproducir: (desde: number | null) => void;
}) {
  const tr = tramos(capa, indice, dur, cierre);
  const ver = (desde: number) => onReproducir(Math.max(0, desde - 0.4));
  const entradas = (Object.entries(ENTRADAS) as [EntradaId, string][]).filter(([e]) => e !== 'escribir' || capa.tipo === 'texto');
  return (
    <section aria-label="Cómo entra y sale la pieza elegida" className="flex flex-col gap-4 border-t border-line pt-4">
      <p className="text-sm font-semibold text-ink">{nombreCapa(capa)}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-entrada`} className={adminLabel}>Cómo entra</label>
          <select
            id={`${id}-entrada`}
            value={capa.entrada.tipo}
            onChange={(e) => {
              onCambiar({ entrada: { ...capa.entrada, tipo: e.target.value as EntradaId } });
              ver(tr.entra);
            }}
            className={`${adminInput()} sm:max-w-sm`}
          >
            {entradas.map(([e, n]) => (
              <option key={e} value={e}>{n}</option>
            ))}
          </select>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor={`${id}-entra`} className={adminLabel}>Empieza en</label>
              <CampoNumero id={`${id}-entra`} unidad="s" decimales={1} min={0} max={dur} valor={redondo(tr.entra)} onCambiar={(v) => onCambiar({ entrada: { ...capa.entrada, inicio: Math.min(dur - 0.2, v) } })} />
            </div>
            <div>
              <label htmlFor={`${id}-entra-dura`} className={adminLabel}>Tarda</label>
              <CampoNumero id={`${id}-entra-dura`} unidad="s" decimales={1} min={0.2} max={3} valor={capa.entrada.dura} onCambiar={(v) => onCambiar({ entrada: { ...capa.entrada, dura: v } })} />
            </div>
            {capa.entrada.inicio !== null && (
              <button type="button" className={smallButton} onClick={() => onCambiar({ entrada: { ...capa.entrada, inicio: null } })}>Después de la plantilla</button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-salida`} className={adminLabel}>Cómo sale</label>
          <select
            id={`${id}-salida`}
            value={capa.salida.tipo}
            onChange={(e) => {
              const tipo = e.target.value as SalidaId;
              onCambiar({ salida: { ...capa.salida, tipo } });
              if (tipo !== 'ninguna') ver(inicioSalida(capa.salida.inicio, dur, cierre));
            }}
            className={`${adminInput()} sm:max-w-sm`}
          >
            {(Object.entries(SALIDAS) as [SalidaId, string][]).map(([s, n]) => (
              <option key={s} value={s}>{n}</option>
            ))}
          </select>
          {capa.salida.tipo !== 'ninguna' && tr.sale !== null && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor={`${id}-sale`} className={adminLabel}>Sale en</label>
                <CampoNumero id={`${id}-sale`} unidad="s" decimales={1} min={0} max={dur} valor={redondo(tr.sale)} onCambiar={(v) => onCambiar({ salida: { ...capa.salida, inicio: redondo(Math.min(dur - 0.2, Math.max(tr.yaEntro, v))) } })} />
              </div>
              <div>
                <label htmlFor={`${id}-sale-dura`} className={adminLabel}>Tarda</label>
                <CampoNumero id={`${id}-sale-dura`} unidad="s" decimales={1} min={0.2} max={3} valor={capa.salida.dura} onCambiar={(v) => onCambiar({ salida: { ...capa.salida, dura: v } })} />
              </div>
              {capa.salida.inicio !== null && (
                <button type="button" className={smallButton} onClick={() => onCambiar({ salida: { ...capa.salida, inicio: null } })}>Al final</button>
              )}
            </div>
          )}
        </div>
      </div>

      <fieldset>
        <legend className={adminLabel}>Mientras está</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ENFASIS) as [EnfasisId, string][]).map(([e, n]) => (
            <button
              key={e}
              type="button"
              aria-pressed={capa.enfasis === e}
              onClick={() => {
                onCambiar({ enfasis: e });
                if (e !== 'ninguno') ver(tr.yaEntro);
              }}
              className={toggleButton(capa.enfasis === e)}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="button" onClick={() => ver(tr.entra)} className={`${smallButton} self-start`}>
        <IconoPlay className="h-4 w-4" aria-hidden="true" />
        Ver cómo entra y sale
      </button>
    </section>
  );
}
