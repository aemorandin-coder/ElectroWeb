'use client';

// C-270: el paso "Textos y stickers" (docs/plan/ELECTROSTUDIO.md, Fase 2): agregar títulos, subtítulos y textos sueltos,
// la lista de piezas (la de arriba va adelante) y lo de la pieza elegida. Se mueven y se agrandan sobre la vista previa.
// C-272: también los stickers (PanelSticker.tsx), con su galería.
import { useEffect, useId, useState, type RefObject } from 'react';
import {
  IconoAbrirCandado, IconoCandado, IconoEstrella, IconoFlechaAbajo, IconoFlechaArriba, IconoMas, IconoOcultar, IconoTexto, IconoVer,
} from '@/components/iconos';
import { adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { ESTILOS_LISTOS, estiloListoDe, nombreCapa, puedeAgregarCapa, tamTexto, type CambioCapa } from '@/lib/studio/capas';
import { FUENTES, FUENTES_IDS, cargarFuentes, cssFuente, fuenteDe, pesoEn } from '@/lib/studio/fuentes';
import { formatHeight, W } from '@/lib/studio/engine';
import {
  ALINEAR_CAPA, CAPAS_MAX, ESTILOS_CAPA, FONDOS_CAPA, TAM_TEXTO, type AlinearCapa, type CapaTexto, type EstiloCapa, type FondoCapa, type StudioCapa,
} from '@/lib/studio/schema';
import type { Sticker } from '@/lib/studio/stickers';
import { GaleriaStickers, PanelSticker, type ExtraSticker } from './PanelSticker';
import { CabeceraCapa, CampoNumero, CampoTamano, PosicionGiro } from './PiezasCapa';
import { smallButton, toggleButton } from './ui';
import type { Studio } from './useStudio';

export interface AccionesCapas {
  agregar: (estilo: EstiloCapa) => void;
  agregarSticker: (st: Sticker, extra?: ExtraSticker) => void;
  cambiar: (id: string, cambio: CambioCapa) => void;
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
  [400, 'Normal'],
  [600, 'Seminegrita'],
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
  const [galeria, setGaleria] = useState(false);
  const f = studio.current;
  if (!f) return null;
  const capas = f.capas;
  const elegida = capas.find((c) => c.id === sel) ?? null;
  const alto = formatHeight(f.format);
  const lleno = !puedeAgregarCapa(capas);
  const acento = f.accent || studio.brand.accent;
  const acento2 = f.accent2 || studio.brand.accent2;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(['titulo', 'subtitulo', 'texto'] as EstiloCapa[]).map((e) => (
          <button key={e} type="button" disabled={lleno} onClick={() => acciones.agregar(e)} className={e === 'texto' ? smallButton : `${smallButton} border-brand-200! bg-brand-50! text-brand-700! hover:bg-brand-100!`}>
            <IconoMas className="h-4 w-4" aria-hidden="true" />
            {ESTILOS_CAPA[e]}
          </button>
        ))}
        <button type="button" disabled={lleno} aria-expanded={galeria} onClick={() => setGaleria((g) => !g)} className={`${smallButton} border-brand-200! bg-brand-50! text-brand-700! hover:bg-brand-100!`}>
          <IconoEstrella className="h-4 w-4" aria-hidden="true" />
          Sticker
        </button>
      </div>
      {lleno && <p className={adminHint}>Llegaste a {CAPAS_MAX} piezas: borra una para agregar otra.</p>}
      {galeria && !lleno && (
        <GaleriaStickers
          acento={acento}
          acento2={acento2}
          onCerrar={() => setGaleria(false)}
          onElegir={(st, extra) => {
            acciones.agregarSticker(st, extra);
            setGaleria(false);
          }}
        />
      )}

      {capas.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="Piezas sueltas, la de arriba va adelante">
          {[...capas].reverse().map((c, iInv) => {
            const i = capas.length - 1 - iInv;
            const activa = c.id === sel;
            return (
              <li key={c.id} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${activa ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-line bg-white'}`}>
                <button type="button" onClick={() => onSel(activa ? null : c.id)} aria-pressed={activa} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-brand-500">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-600">
                    {c.tipo === 'sticker' ? <IconoEstrella className="h-4 w-4" aria-hidden="true" /> : <IconoTexto className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${c.oculta ? 'text-muted line-through' : 'text-ink'}`}>{nombreCapa(c)}</span>
                    <span className="block truncate text-xs text-muted">
                      {c.tipo === 'sticker' ? `Sticker · ${c.tam} px de ancho` : `${ESTILOS_CAPA[c.estilo]} · ${c.tam} px`}
                      {c.bloqueada ? ' · bloqueada' : ''}
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
          Todavía no hay piezas sueltas. Agrega un título, un subtítulo o un sticker: aparece en la vista previa, donde lo mueves con el dedo o el ratón y lo agrandas con las esquinas.
        </p>
      )}

      {elegida?.tipo === 'texto' && (
        <PanelTexto studio={studio} elegida={elegida} alto={alto} lleno={lleno} acciones={acciones} textoRef={textoRef} />
      )}
      {elegida?.tipo === 'sticker' && (
        <PanelSticker
          elegida={elegida}
          acento={acento}
          acento2={acento2}
          alto={alto}
          lleno={lleno}
          onCambiar={(cambio) => acciones.cambiar(elegida.id, cambio)}
          onDuplicar={() => acciones.duplicar(elegida.id)}
          onBorrar={() => acciones.borrar(elegida.id)}
        />
      )}
    </div>
  );
}

/** El panel del texto elegido */
function PanelTexto({ studio, elegida, alto, lleno, acciones, textoRef }: {
  studio: Studio;
  elegida: CapaTexto;
  alto: number;
  lleno: boolean;
  acciones: AccionesCapas;
  textoRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const ids = useId();
  const fuente = fuenteDe(elegida.fuente);
  // Los pesos que de verdad tiene la fuente (Anton y Bebas, uno solo), sin repetidos
  const pesos: [number, string][] = [];
  for (const [p, n] of PESOS) {
    const v = pesoEn(fuente, p);
    if (!pesos.some(([q]) => q === v)) pesos.push([v, n]);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      <CabeceraCapa titulo={`${ESTILOS_CAPA[elegida.estilo]} elegido`} lleno={lleno} onDuplicar={() => acciones.duplicar(elegida.id)} onBorrar={() => acciones.borrar(elegida.id)} />

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
            <p className={adminHint}>Enter baja de línea. Para resaltar una palabra, ponla entre asteriscos: ¡Feliz *Navidad*!</p>
          </div>

          <CargarFuentes />
          <fieldset>
            <legend className={adminLabel}>Estilo listo</legend>
            <div className="flex flex-wrap gap-2">
              {ESTILOS_LISTOS.map((e) => {
                const activo = estiloListoDe(elegida) === e.id;
                const f = e.cambio;
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => acciones.cambiar(elegida.id, e.cambio)}
                    className={`inline-flex h-10 items-center rounded-lg border px-3 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${activo ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-line bg-white hover:bg-surface'}`}
                    style={{ font: cssFuente(f.fuente ?? 'montserrat', f.peso ?? 700, f.cursiva ?? false, 17), textTransform: f.mayusculas ? 'uppercase' : undefined }}
                  >
                    {e.nombre}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className={adminLabel}>Fuente</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FUENTES_IDS.map((id) => {
                const f = FUENTES[id];
                const activo = elegida.fuente === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => acciones.cambiar(elegida.id, { fuente: id })}
                    className={`flex min-w-0 flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${activo ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-line bg-white hover:bg-surface'}`}
                  >
                    <span className="max-w-full truncate text-ink" style={{ font: cssFuente(id, 700, false, 21) }}>{f.nombre}</span>
                    <span className="max-w-full truncate text-xs text-muted">{f.rol}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <CampoTamano
            id={ids}
            valor={elegida.tam}
            min={TAM_TEXTO.min}
            max={TAM_TEXTO.max}
            paso={4}
            onCambiar={(v) => acciones.cambiar(elegida.id, { tam: tamTexto(v) })}
            ayuda="En px de la imagen (1080 de ancho). También con las esquinas de la pieza."
          />

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
              ).map(([campo, nombre]) => {
                const sinCursiva = campo === 'cursiva' && !fuente?.cursiva;
                const activo = elegida[campo] && !sinCursiva;
                return (
                  <button
                    key={campo}
                    type="button"
                    aria-pressed={activo}
                    disabled={sinCursiva}
                    title={sinCursiva ? `${fuente?.nombre} no tiene cursiva` : undefined}
                    onClick={() => acciones.cambiar(elegida.id, { [campo]: !elegida[campo] })}
                    className={`${toggleButton(activo)} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {nombre}
                  </button>
                );
              })}
              {pesos.length > 1 && (
                <>
                  <label className="sr-only" htmlFor={`${ids}-peso`}>Grosor</label>
                  <select id={`${ids}-peso`} value={fuente ? pesoEn(fuente, elegida.peso) : elegida.peso} onChange={(e) => acciones.cambiar(elegida.id, { peso: Number(e.target.value) })} className={`${adminInput()} h-9 w-auto`}>
                    {pesos.map(([p, n]) => (
                      <option key={p} value={p}>{n}</option>
                    ))}
                  </select>
                </>
              )}
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

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex h-11 items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={elegida.anchoMax > 0}
                onChange={(e) => acciones.cambiar(elegida.id, { anchoMax: e.target.checked ? 860 : 0 })}
                className="h-4 w-4 accent-brand-500"
              />
              Que baje de línea solo
            </label>
            {elegida.anchoMax > 0 && (
              <div>
                <label htmlFor={`${ids}-ancho`} className={adminLabel}>Ancho máximo</label>
                <CampoNumero id={`${ids}-ancho`} unidad="px" min={40} max={W} valor={elegida.anchoMax} onCambiar={(v) => acciones.cambiar(elegida.id, { anchoMax: v })} />
              </div>
            )}
          </div>

          {(elegida.texto.includes('\n') || elegida.anchoMax > 0) && (
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

      <PosicionGiro id={ids} capa={elegida} alto={alto} onCambiar={(cambio) => acciones.cambiar(elegida.id, cambio)} />
    </div>
  );
}

/** Las 8 fuentes, para que el selector muestre cada nombre en su propia letra (se cargan una vez, al abrirlo) */
function CargarFuentes() {
  useEffect(() => {
    void cargarFuentes(FUENTES_IDS);
  }, []);
  return null;
}

const iconito = 'flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-500';

export type { StudioCapa };
