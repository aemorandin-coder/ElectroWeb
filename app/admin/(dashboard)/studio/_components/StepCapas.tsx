'use client';

// C-270: el paso "Textos y stickers" (docs/plan/ELECTROSTUDIO.md, Fase 2): agregar títulos, subtítulos y textos sueltos,
// la lista de piezas (la de arriba va adelante) y lo de la pieza elegida. Se mueven y se agrandan sobre la vista previa.
import { useId, type RefObject } from 'react';
import {
  IconoAbrirCandado, IconoCandado, IconoCopiar, IconoEliminar, IconoFlechaAbajo, IconoFlechaArriba, IconoMas, IconoMenos,
  IconoOcultar, IconoTexto, IconoVer,
} from '@/components/iconos';
import CampoUnidad from '@/components/admin/CampoUnidad';
import { adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { nombreCapa, puedeAgregarCapa, tamTexto } from '@/lib/studio/capas';
import { formatHeight, W } from '@/lib/studio/engine';
import {
  ALINEAR_CAPA, CAPAS_MAX, ESTILOS_CAPA, FONDOS_CAPA, TAM_TEXTO, type AlinearCapa, type CapaTexto, type EstiloCapa, type FondoCapa, type StudioCapa,
} from '@/lib/studio/schema';
import { smallButton, toggleButton } from './ui';
import type { Studio } from './useStudio';

export interface AccionesCapas {
  agregar: (estilo: EstiloCapa) => void;
  cambiar: (id: string, cambio: Partial<CapaTexto>) => void;
  borrar: (id: string) => void;
  duplicar: (id: string) => void;
  orden: (id: string, paso: 1 | -1) => void;
}

/** Los colores de la pieza: automático (blanco u oscuro según el fondo), los de la historia y los de siempre */
function colores(studio: Studio): [string, string][] {
  const f = studio.current;
  return [
    ['', 'Automático'],
    ['#FFFFFF', 'Blanco'],
    ['#0A1B3D', 'Oscuro'],
    [(f?.accent || studio.brand.accent).toUpperCase(), 'Color principal'],
    [(f?.accent2 || studio.brand.accent2).toUpperCase(), 'Color secundario'],
    ['#E0263A', 'Rojo de oferta'],
    ['#FFB400', 'Dorado'],
  ];
}

const PESOS: [number, string][] = [
  [600, 'Normal'],
  [800, 'Negrita'],
  [900, 'Extra'],
];

export default function StepCapas({ studio, sel, onSel, acciones, textoRef }: {
  studio: Studio;
  sel: string | null;
  onSel: (id: string | null) => void;
  acciones: AccionesCapas;
  textoRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const ids = useId();
  const f = studio.current;
  if (!f) return null;
  const capas = f.capas;
  const elegida = capas.find((c) => c.id === sel) ?? null;
  const alto = formatHeight(f.format);
  const lleno = !puedeAgregarCapa(capas);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(['titulo', 'subtitulo', 'texto'] as EstiloCapa[]).map((e) => (
          <button key={e} type="button" disabled={lleno} onClick={() => acciones.agregar(e)} className={e === 'texto' ? smallButton : `${smallButton} border-brand-200! bg-brand-50! text-brand-700! hover:bg-brand-100!`}>
            <IconoMas className="h-4 w-4" aria-hidden="true" />
            {ESTILOS_CAPA[e]}
          </button>
        ))}
      </div>
      {lleno && <p className={adminHint}>Llegaste a {CAPAS_MAX} piezas: borra una para agregar otra.</p>}

      {capas.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="Piezas sueltas, la de arriba va adelante">
          {[...capas].reverse().map((c, iInv) => {
            const i = capas.length - 1 - iInv;
            const activa = c.id === sel;
            return (
              <li key={c.id} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${activa ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-line bg-white'}`}>
                <button type="button" onClick={() => onSel(activa ? null : c.id)} aria-pressed={activa} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-brand-500">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-600">
                    <IconoTexto className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${c.oculta ? 'text-muted line-through' : 'text-ink'}`}>{nombreCapa(c)}</span>
                    <span className="block truncate text-xs text-muted">
                      {ESTILOS_CAPA[c.estilo]} · {c.tam} px{c.bloqueada ? ' · bloqueada' : ''}
                    </span>
                  </span>
                </button>
                <span className="flex shrink-0 items-center">
                  <button type="button" className={iconito} onClick={() => acciones.cambiar(c.id, { oculta: !c.oculta })} aria-pressed={c.oculta} aria-label={c.oculta ? `Mostrar "${nombreCapa(c)}"` : `Ocultar "${nombreCapa(c)}"`} title={c.oculta ? 'Mostrar' : 'Ocultar'}>
                    {c.oculta ? <IconoOcultar className="h-4 w-4" aria-hidden="true" /> : <IconoVer className="h-4 w-4" aria-hidden="true" />}
                  </button>
                  <button type="button" className={iconito} onClick={() => acciones.cambiar(c.id, { bloqueada: !c.bloqueada })} aria-pressed={c.bloqueada} aria-label={c.bloqueada ? `Desbloquear "${nombreCapa(c)}"` : `Bloquear "${nombreCapa(c)}"`} title={c.bloqueada ? 'Desbloquear' : 'Bloquear'}>
                    {c.bloqueada ? <IconoCandado className="h-4 w-4" aria-hidden="true" /> : <IconoAbrirCandado className="h-4 w-4" aria-hidden="true" />}
                  </button>
                  <button type="button" className={iconito} onClick={() => acciones.orden(c.id, 1)} disabled={i === capas.length - 1} aria-label={`Traer "${nombreCapa(c)}" adelante`} title="Adelante">
                    <IconoFlechaArriba className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={iconito} onClick={() => acciones.orden(c.id, -1)} disabled={i === 0} aria-label={`Llevar "${nombreCapa(c)}" atrás`} title="Atrás">
                    <IconoFlechaAbajo className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong bg-surface p-4 text-sm text-ink-soft">
          Todavía no hay piezas sueltas. Agrega un título o un subtítulo: aparece en la vista previa, donde lo mueves con el dedo o el ratón y lo agrandas con las esquinas.
        </p>
      )}

      {elegida && (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{ESTILOS_CAPA[elegida.estilo]} elegido</p>
            <span className="flex gap-1.5">
              <button type="button" onClick={() => acciones.duplicar(elegida.id)} disabled={lleno} className={smallButton}>
                <IconoCopiar className="h-4 w-4" aria-hidden="true" />
                Duplicar
              </button>
              <button type="button" onClick={() => acciones.borrar(elegida.id)} className={`${smallButton} text-deal! hover:bg-deal-bg`}>
                <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                Borrar
              </button>
            </span>
          </div>

          <div>
            <label htmlFor={`${ids}-texto`} className={adminLabel}>Texto</label>
            <textarea
              id={`${ids}-texto`}
              ref={textoRef}
              rows={2}
              value={elegida.texto}
              maxLength={200}
              onChange={(e) => acciones.cambiar(elegida.id, { texto: e.target.value })}
              className={`${adminInput()} h-auto py-2`}
            />
            <p className={adminHint}>Enter baja de línea. Para mover la pieza, arrástrala en la vista previa.</p>
          </div>

          <div>
            <span className={adminLabel} id={`${ids}-tam-et`}>Tamaño</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={iconoBorde} onClick={() => acciones.cambiar(elegida.id, { tam: tamTexto(elegida.tam - 4) })} disabled={elegida.tam <= TAM_TEXTO.min} aria-label="Más chico (4 px)">
                <IconoMenos className="h-4 w-4" aria-hidden="true" />
              </button>
              <CampoUnidad
                unidad="px"
                type="number"
                inputMode="numeric"
                min={TAM_TEXTO.min}
                max={TAM_TEXTO.max}
                value={elegida.tam}
                aria-labelledby={`${ids}-tam-et`}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= TAM_TEXTO.min) acciones.cambiar(elegida.id, { tam: tamTexto(v) });
                }}
              />
              <button type="button" className={iconoBorde} onClick={() => acciones.cambiar(elegida.id, { tam: tamTexto(elegida.tam + 4) })} disabled={elegida.tam >= TAM_TEXTO.max} aria-label="Más grande (4 px)">
                <IconoMas className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                type="range"
                min={TAM_TEXTO.min}
                max={TAM_TEXTO.max}
                value={elegida.tam}
                aria-labelledby={`${ids}-tam-et`}
                onChange={(e) => acciones.cambiar(elegida.id, { tam: Number(e.target.value) })}
                className="min-w-32 flex-1 accent-brand-500"
              />
            </div>
            <p className={adminHint}>En px de la imagen (1080 de ancho). También con las esquinas de la pieza.</p>
          </div>

          <fieldset>
            <legend className={adminLabel}>Color</legend>
            <div className="flex flex-wrap items-center gap-2">
              {colores(studio).map(([hex, nombre]) => {
                const activo = elegida.color.toUpperCase() === hex;
                return (
                  <button
                    key={nombre}
                    type="button"
                    aria-pressed={activo}
                    aria-label={nombre}
                    title={nombre}
                    onClick={() => acciones.cambiar(elegida.id, { color: hex })}
                    className={`flex h-9 items-center justify-center rounded-full border-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${activo ? 'border-brand-500 ring-2 ring-brand-100' : 'border-line'} ${hex ? 'w-9' : 'px-3'}`}
                    style={hex ? { background: hex } : undefined}
                  >
                    {hex ? '' : 'Auto'}
                  </button>
                );
              })}
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 border-line pl-1 pr-3 text-xs font-semibold text-ink-soft">
                <input type="color" value={elegida.color || '#FFFFFF'} onChange={(e) => acciones.cambiar(elegida.id, { color: e.target.value.toUpperCase() })} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                Otro
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className={adminLabel}>Estilo</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['mayusculas', 'Mayúsculas'],
                  ['cursiva', 'Cursiva'],
                  ['contorno', 'Contorno'],
                  ['sombra', 'Sombra'],
                ] as const
              ).map(([campo, nombre]) => (
                <button key={campo} type="button" aria-pressed={elegida[campo]} onClick={() => acciones.cambiar(elegida.id, { [campo]: !elegida[campo] })} className={toggleButton(elegida[campo])}>
                  {nombre}
                </button>
              ))}
              <label className="sr-only" htmlFor={`${ids}-peso`}>Grosor</label>
              <select id={`${ids}-peso`} value={elegida.peso} onChange={(e) => acciones.cambiar(elegida.id, { peso: Number(e.target.value) })} className={`${adminInput()} h-9 w-auto`}>
                {PESOS.map(([p, n]) => (
                  <option key={p} value={p}>{n}</option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset>
            <legend className={adminLabel}>Fondo</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(FONDOS_CAPA) as [FondoCapa, string][]).map(([id, nombre]) => (
                <button key={id} type="button" aria-pressed={elegida.fondo === id} onClick={() => acciones.cambiar(elegida.id, { fondo: id })} className={toggleButton(elegida.fondo === id)}>
                  {nombre}
                </button>
              ))}
            </div>
          </fieldset>

          {elegida.texto.includes('\n') && (
            <fieldset>
              <legend className={adminLabel}>Las líneas, alineadas a la</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(ALINEAR_CAPA) as [AlinearCapa, string][]).map(([id, nombre]) => (
                  <button key={id} type="button" aria-pressed={elegida.alinear === id} onClick={() => acciones.cambiar(elegida.id, { alinear: id })} className={toggleButton(elegida.alinear === id)}>
                    {nombre}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <details className="border-t border-line pt-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink">Posición y giro, con números</summary>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor={`${ids}-x`} className={adminLabel}>De izquierda a derecha</label>
                <CampoUnidad id={`${ids}-x`} unidad="px" type="number" inputMode="numeric" min={0} max={W} value={Math.round(elegida.x * W)} onChange={(e) => acciones.cambiar(elegida.id, { x: Math.min(1, Math.max(0, Number(e.target.value) / W)) })} />
              </div>
              <div>
                <label htmlFor={`${ids}-y`} className={adminLabel}>De arriba abajo</label>
                <CampoUnidad id={`${ids}-y`} unidad="px" type="number" inputMode="numeric" min={0} max={alto} value={Math.round(elegida.y * alto)} onChange={(e) => acciones.cambiar(elegida.id, { y: Math.min(1, Math.max(0, Number(e.target.value) / alto)) })} />
              </div>
              <div>
                <label htmlFor={`${ids}-giro`} className={adminLabel}>Giro</label>
                <CampoUnidad id={`${ids}-giro`} unidad="°" type="number" inputMode="numeric" min={-180} max={180} value={elegida.giro} onChange={(e) => acciones.cambiar(elegida.id, { giro: Math.max(-180, Math.min(180, Math.round(Number(e.target.value) || 0))) })} />
              </div>
              <button type="button" className={smallButton} onClick={() => acciones.cambiar(elegida.id, { x: 0.5 })}>Centrar</button>
              {elegida.giro !== 0 && (
                <button type="button" className={smallButton} onClick={() => acciones.cambiar(elegida.id, { giro: 0 })}>Sin giro</button>
              )}
            </div>
            <p className={`${adminHint} mt-2`}>En la vista previa, las flechas del teclado mueven la pieza 1 px (con Mayús, 10).</p>
          </details>
        </div>
      )}
    </div>
  );
}

const iconito = 'flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-500';
const iconoBorde = 'flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:bg-surface disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-500';

export type { StudioCapa };
