'use client';

// C-272: los stickers en el paso Textos y stickers (docs/plan/ELECTROSTUDIO.md, Fase 4; los 6 grupos, D4). La galería
// para elegir uno, su vista (el mismo dibujo que pinta el motor, en SVG) y el panel del sticker elegido.
import { useEffect, useId, useState } from 'react';
import { IconoBuscar, IconoCerrar, IconoEstrella } from '@/components/iconos';
import { adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { tamSticker, type CambioCapa } from '@/lib/studio/capas';
import { chispaSrc } from '@/lib/studio/chispa';
import { cargarFuentes, cssFuente } from '@/lib/studio/fuentes';
import { ICONOS_TODOS } from '@/lib/studio/iconos-todos';
import { CHISPA_POSES, TAM_STICKER, type CapaSticker, type ChispaPose } from '@/lib/studio/schema';
import {
  COLORES_FIJOS, GRUPOS_STICKER, ICONOS_NAVIDAD, STICKERS, stickersDe, type ColorBase, type ColorSticker, type GrupoSticker, type Sticker,
} from '@/lib/studio/stickers';
import { CabeceraCapa, CampoTamano, PosicionGiro } from './PiezasCapa';
import { toggleButton } from './ui';

export interface ExtraSticker {
  icono?: string;
  pose?: ChispaPose;
  gorro?: boolean;
  color?: string;
  color2?: string;
}

/** El sticker dibujado en SVG con los mismos datos que usa el motor */
export function VistaSticker({ st, capa, acento, acento2, className = '' }: {
  st: Sticker;
  capa?: Partial<CapaSticker>;
  acento: string;
  acento2: string;
  className?: string;
}) {
  if (st.id === 'chispa') {
    // eslint-disable-next-line @next/next/no-img-element -- dibujo chico de la galería
    return <img src={chispaSrc(capa?.pose ?? 'saluda', capa?.gorro ?? false)} alt="" className={`${className} object-contain`} />;
  }
  const base = (b: ColorBase) => (b === 'acento' ? acento : b === 'acento2' ? acento2 : COLORES_FIJOS[b]);
  const col = (ref: ColorSticker) => (ref === 'p' ? capa?.color || base(st.base.p) : ref === 's' ? capa?.color2 || base(st.base.s) : COLORES_FIJOS[ref]);
  const texto = capa?.texto ?? st.texto?.def ?? '';
  const piezas = st.icono ? ICONOS_TODOS[st.icono.nombre ?? capa?.icono ?? 'Estrella']?.piezas ?? [] : [];
  const t = st.texto;
  const lineas = texto.split('\n').slice(0, 3);
  return (
    <svg viewBox={`0 0 ${st.vb[0]} ${st.vb[1]}`} className={className} aria-hidden="true" style={{ overflow: 'visible', transform: [st.giro ? `rotate(${st.giro}deg)` : '', capa?.espejo ? 'scaleX(-1)' : ''].join(' ') || undefined }}>
      {st.formas.map((f, i) => (
        <path
          key={i}
          d={f.d}
          fill={f.relleno ? col(f.relleno) : 'none'}
          stroke={f.trazo ? col(f.trazo) : 'none'}
          strokeWidth={f.ancho}
          strokeDasharray={f.punteado?.join(' ')}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={f.opacidad}
        />
      ))}
      {st.icono && (
        <g transform={`translate(${st.icono.x} ${st.icono.y}) scale(${st.icono.s / 24})`} stroke={col(st.icono.color)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          {piezas.map((p, i) => (
            <path key={i} d={p.d} fill={p.relleno ? col(st.icono!.color) : 'none'} fillOpacity={p.relleno === 'sup' ? 0.25 : 1} strokeWidth={p.grosor ? (2.2 * p.grosor) / 2 : undefined} />
          ))}
        </g>
      )}
      {t && texto.trim() && (
        <text
          x={t.x}
          y={t.y - ((lineas.length - 1) * t.tam * 1.05) / 2}
          textAnchor={t.ancla === 'izquierda' ? 'start' : 'middle'}
          dominantBaseline="central"
          fill={col(t.color)}
          style={{ font: cssFuente(t.fuente ?? 'montserrat', t.peso ?? 900, t.cursiva ?? true, t.tam) }}
        >
          {lineas.map((l, i) => {
            // Lo que no entra se achica (como en el motor), a ojo: cada letra de unos 0,62 de la altura
            const largo = l.length * t.tam * 0.62 > t.maxAncho;
            return (
              <tspan key={i} x={t.x} dy={i ? t.tam * 1.05 : 0} textLength={largo ? t.maxAncho : undefined} lengthAdjust="spacingAndGlyphs">
                {l}
              </tspan>
            );
          })}
        </text>
      )}
    </svg>
  );
}

const fondoTile = 'bg-gradient-to-br from-brand-600 to-brand-700';

/** La galería para agregar un sticker (o, con `soloIconos`, para cambiar el ícono del que está elegido) */
export function GaleriaStickers({ acento, acento2, onElegir, onCerrar, soloIconos = false }: {
  acento: string;
  acento2: string;
  onElegir: (st: Sticker, extra?: ExtraSticker) => void;
  onCerrar: () => void;
  soloIconos?: boolean;
}) {
  const [grupo, setGrupo] = useState<GrupoSticker>(soloIconos ? 'iconos' : 'ofertas');
  const [busca, setBusca] = useState('');
  const [gorro, setGorro] = useState(false);
  const idBusca = useId();
  useEffect(() => {
    // Los stickers con texto se ven en su fuente (el navideño, en Playfair)
    void cargarFuentes(['montserrat', 'playfair']);
  }, []);
  const icono = STICKERS.icono;
  const q = busca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const iconos = Object.entries(ICONOS_TODOS).filter(([n, d]) => !q || n.toLowerCase().includes(q) || d.grupo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q));
  const boton = 'group flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 text-xs font-semibold text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
  const tile = `flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl ${fondoTile} p-3 ring-brand-300 transition group-hover:ring-2`;

  return (
    <section aria-label={soloIconos ? 'Elegir otro ícono' : 'Agregar un sticker'} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{soloIconos ? 'Elige el ícono' : 'Elige un sticker'}</p>
        <button type="button" onClick={onCerrar} className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-muted hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500" aria-label="Cerrar la galería">
          <IconoCerrar className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {!soloIconos && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {(Object.entries(GRUPOS_STICKER) as [GrupoSticker, string][]).map(([g, n]) => (
            <button key={g} type="button" aria-pressed={grupo === g} onClick={() => setGrupo(g)} className={`${toggleButton(grupo === g)} shrink-0`}>
              {n}
            </button>
          ))}
        </div>
      )}

      {grupo === 'iconos' ? (
        <>
          <div className="relative sm:max-w-sm">
            <label htmlFor={idBusca} className="sr-only">Buscar un ícono</label>
            <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input id={idBusca} type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Taladro, regalo, envío…" className={`${adminInput()} pl-9`} />
          </div>
          <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
            {iconos.map(([n]) => (
              <button key={n} type="button" onClick={() => onElegir(icono, { icono: n })} className={boton} title={n}>
                <span className={`${tile} p-2`}>
                  <VistaSticker st={icono} capa={{ icono: n }} acento={acento} acento2={acento2} className="h-full w-full" />
                </span>
                <span className="w-full truncate text-center">{n}</span>
              </button>
            ))}
          </div>
          {!iconos.length && <p className={adminHint}>Ningún ícono se llama así. Prueba con otra palabra.</p>}
        </>
      ) : grupo === 'chispa' ? (
        <>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={gorro} onChange={(e) => setGorro(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Con el gorro de Navidad
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(Object.entries(CHISPA_POSES) as [ChispaPose, string][]).map(([pose, n]) => (
              <button key={pose} type="button" onClick={() => onElegir(STICKERS.chispa, { pose, gorro })} className={boton}>
                <span className="flex aspect-square w-full items-end justify-center overflow-hidden rounded-xl border border-line bg-white p-2 ring-brand-300 transition group-hover:ring-2">
                  <VistaSticker st={STICKERS.chispa} capa={{ pose, gorro }} acento={acento} acento2={acento2} className="h-full w-full" />
                </span>
                <span className="w-full truncate text-center">{n}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {stickersDe(grupo).map((st) => (
            <button key={st.id} type="button" onClick={() => onElegir(st)} className={boton}>
              <span className={tile}>
                <VistaSticker st={st} acento={acento} acento2={acento2} className="max-h-full w-full" />
              </span>
              <span className="w-full truncate text-center">{st.nombre}</span>
            </button>
          ))}
          {grupo === 'navidad' &&
            ICONOS_NAVIDAD.map((n) => (
              <button key={n} type="button" onClick={() => onElegir(icono, { icono: n, color2: '#E0263A' })} className={boton}>
                <span className={tile}>
                  <VistaSticker st={icono} capa={{ icono: n, color2: '#E0263A' }} acento={acento} acento2={acento2} className="h-full w-full" />
                </span>
                <span className="w-full truncate text-center">{n}</span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}

/** Los colores de un sticker: como viene, los de siempre y los de la historia */
function paleta(acento: string, acento2: string): [string, string][] {
  return [
    ['', 'Como viene'],
    ['#FFFFFF', 'Blanco'],
    ['#0A1B3D', 'Oscuro'],
    [acento.toUpperCase(), 'Color principal'],
    [acento2.toUpperCase(), 'Color secundario'],
    ['#E0263A', 'Rojo de oferta'],
    ['#FFB400', 'Dorado'],
    ['#FFD447', 'Amarillo'],
  ];
}

function Colores({ etiqueta, valor, acento, acento2, onCambiar }: { etiqueta: string; valor: string; acento: string; acento2: string; onCambiar: (v: string) => void }) {
  return (
    <fieldset>
      <legend className={adminLabel}>{etiqueta}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {paleta(acento, acento2).map(([hex, nombre]) => {
          const activo = valor.toUpperCase() === hex;
          return (
            <button
              key={nombre}
              type="button"
              aria-pressed={activo}
              aria-label={nombre}
              title={nombre}
              onClick={() => onCambiar(hex)}
              className={`flex h-11 sm:h-9 items-center justify-center rounded-full border-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${activo ? 'border-brand-500 ring-2 ring-brand-100' : 'border-line'} ${hex ? 'w-11 sm:w-9' : 'px-3'}`}
              style={hex ? { background: hex } : undefined}
            >
              {hex ? '' : 'Como viene'}
            </button>
          );
        })}
        <label className="flex h-11 sm:h-9 cursor-pointer items-center gap-2 rounded-full border-2 border-line pl-1.5 pr-3 text-xs font-semibold text-ink-soft">
          <input type="color" value={valor || '#FFFFFF'} onChange={(e) => onCambiar(e.target.value.toUpperCase())} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" />
          Otro
        </label>
      </div>
    </fieldset>
  );
}

/** El panel del sticker elegido */
export function PanelSticker({ elegida, acento, acento2, alto, lleno, onCambiar, onDuplicar, onBorrar, onMoverPx }: {
  elegida: CapaSticker;
  acento: string;
  acento2: string;
  alto: number;
  lleno: boolean;
  onCambiar: (cambio: CambioCapa) => void;
  onDuplicar: () => void;
  onBorrar: () => void;
  onMoverPx?: (dx: number, dy: number) => void;
}) {
  const ids = useId();
  const [cambiarIcono, setCambiarIcono] = useState(false);
  const st = STICKERS[elegida.sticker];
  if (!st) return null;
  const usaS = st.formas.some((f) => f.relleno === 's' || f.trazo === 's') || st.texto?.color === 's' || st.icono?.color === 's';
  const usaP = st.formas.some((f) => f.relleno === 'p' || f.trazo === 'p') || st.texto?.color === 'p' || st.icono?.color === 'p';
  // Solo se dan vuelta los que no llevan texto ni ícono (una flecha, Chispa, el gorro)
  const puedeEspejo = !st.texto && !st.icono;
  const multilinea = (st.texto?.def ?? '').includes('\n');

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      <CabeceraCapa titulo={`${st.nombre} elegido`} lleno={lleno} onDuplicar={onDuplicar} onBorrar={onBorrar} />
      <div className="flex items-center gap-3">
        <span className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl p-2 ${st.id === 'chispa' ? 'border border-line bg-white' : fondoTile}`}>
          <VistaSticker st={st} capa={elegida} acento={acento} acento2={acento2} className="max-h-full w-full" />
        </span>
        <p className={adminHint}>Muévelo y agrándalo en la vista previa, o con los números de abajo.</p>
      </div>

      {st.texto && (
        <div>
          <label htmlFor={`${ids}-texto`} className={adminLabel}>Texto del sticker</label>
          {multilinea ? (
            <textarea id={`${ids}-texto`} rows={2} maxLength={st.texto.max ?? 40} value={elegida.texto} onChange={(e) => onCambiar({ texto: e.target.value })} className={`${adminInput()} h-auto py-2 sm:max-w-sm`} />
          ) : (
            <input id={`${ids}-texto`} type="text" maxLength={st.texto.max ?? 40} value={elegida.texto} onChange={(e) => onCambiar({ texto: e.target.value })} className={`${adminInput()} sm:max-w-sm`} />
          )}
          <p className={adminHint}>Si no entra, la letra se achica sola.</p>
        </div>
      )}

      {st.id === 'icono' && (
        <div className="flex flex-col gap-2">
          <p className={adminLabel}>Ícono: {elegida.icono || 'sin elegir'}</p>
          {cambiarIcono ? (
            <GaleriaStickers
              soloIconos
              acento={acento}
              acento2={acento2}
              onCerrar={() => setCambiarIcono(false)}
              onElegir={(_, extra) => {
                if (extra?.icono) onCambiar({ icono: extra.icono });
                setCambiarIcono(false);
              }}
            />
          ) : (
            <button type="button" onClick={() => setCambiarIcono(true)} className={`${toggleButton(false)} self-start`}>
              <IconoEstrella className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Cambiar el ícono
            </button>
          )}
        </div>
      )}

      {st.id === 'chispa' && (
        <>
          <fieldset>
            <legend className={adminLabel}>Pose</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CHISPA_POSES) as [ChispaPose, string][]).map(([pose, n]) => (
                <button key={pose} type="button" aria-pressed={elegida.pose === pose} onClick={() => onCambiar({ pose })} className={toggleButton(elegida.pose === pose)}>
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={elegida.gorro} onChange={(e) => onCambiar({ gorro: e.target.checked })} className="h-4 w-4 accent-brand-500" />
            Con el gorro de Navidad
          </label>
        </>
      )}

      {usaP && <Colores etiqueta={st.texto || st.icono ? 'Color del fondo' : 'Color'} valor={elegida.color} acento={acento} acento2={acento2} onCambiar={(v) => onCambiar({ color: v })} />}
      {usaS && <Colores etiqueta={st.texto ? 'Color del texto' : st.icono ? 'Color del ícono' : 'Color del detalle'} valor={elegida.color2} acento={acento} acento2={acento2} onCambiar={(v) => onCambiar({ color2: v })} />}

      {puedeEspejo && (
        <button type="button" aria-pressed={elegida.espejo} onClick={() => onCambiar({ espejo: !elegida.espejo })} className={`${toggleButton(elegida.espejo)} self-start`}>
          Dar vuelta (espejo)
        </button>
      )}

      <CampoTamano
        id={ids}
        valor={elegida.tam}
        min={TAM_STICKER.min}
        max={TAM_STICKER.max}
        paso={10}
        onCambiar={(v) => onCambiar({ tam: tamSticker(v) })}
        ayuda="El ancho, en px de la imagen (1080). También con las esquinas de la pieza."
      />
      <PosicionGiro id={ids} capa={elegida} alto={alto} onCambiar={onCambiar} onMoverPx={onMoverPx} />
    </div>
  );
}
