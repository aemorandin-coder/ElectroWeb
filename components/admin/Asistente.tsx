'use client';

// C-249b: el marco de un asistente del panel en su propia página (PLAN.md §1.9, la A que eligió el equipo el 15/11): la
// cabecera con la vuelta a la lista, los pasos con su ícono, un paso a la vez en su tarjeta con el pie (§1.6) y, al lado, la
// vista previa de lo que verá el cliente. En el teléfono, "Ver cómo queda" la abre en una hoja; en "Revisar y publicar"
// va debajo, siempre a la vista. Es el mismo dibujo del sorteo (C-221), para que cada formulario nuevo no lo repita.
// Las piezas de adentro (Campo, FilaResumen, ListaCambios, VistaPrevia) también son de aquí.

import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import Ayuda from '@/components/admin/Ayuda';
import { OpcionRadio } from '@/components/admin/Opcion';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import {
  IconoCerrar, IconoCheck, IconoEditar, IconoFlechaDerecha, IconoFlechaIzquierda, IconoVer, type IconType,
} from '@/components/iconos';
import {
  adminCard, adminError, adminHint, adminIconButton, adminModalBody, adminModalHeader, adminModalOverlay, adminModalPanel,
  adminModalTitle, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

export interface PasoAsistente {
  titulo: string;
  icono: IconType;
  /** Una línea: qué se decide en el paso */
  queHacer: string;
  /** Lo elegido, en una línea (o lo que falta) */
  resumen: string;
  /** Lo que le falta para seguir; null si está completo. El último paso ("Revisar y publicar") no lo usa */
  problema: string | null;
}

export interface BotonFinal {
  contenido: ReactNode;
  onClick: () => void;
  deshabilitado?: boolean;
  /** Por qué todavía no se puede, en el pie */
  motivo?: string | null;
}

export default function Asistente({
  titulo, subtitulo, icono: Icono, volver, etiqueta, pasos, paso, onPaso, editar = false, arriba, final, vistaPrevia, children,
}: {
  titulo: string;
  subtitulo?: string;
  icono: IconType;
  /** La lista de donde se vino: "Cancelar" en el primer paso y el enlace de arriba */
  volver: { href: string; texto: string };
  etiqueta: string;
  pasos: PasoAsistente[];
  paso: number;
  onPaso: (i: number) => void;
  /** Cambiar algo que ya existe: todo está hecho desde el principio */
  editar?: boolean;
  /** Lo que va entre la cabecera y los pasos (quién más lo está editando, un aviso) */
  arriba?: ReactNode;
  final: BotonFinal;
  vistaPrevia: ReactNode;
  children: ReactNode;
}) {
  const ultimo = pasos.length - 1;
  // Hasta dónde llegó: lo de antes está hecho. Al cambiar algo que ya existe, todo está hecho desde el principio
  const [alcanzado, setAlcanzado] = useState(editar ? ultimo : paso);
  const [verMovil, setVerMovil] = useState(false);
  const tarjeta = useRef<HTMLElement>(null);
  useBodyScrollLock(verMovil);

  const listoHasta = (i: number) => pasos.slice(0, i).every((p) => p.problema === null);
  const ir = (i: number) => {
    setAlcanzado((a) => Math.max(a, i));
    setVerMovil(false);
    onPaso(i);
    // Si el paso anterior era largo, el nuevo empieza arriba
    const caja = tarjeta.current;
    if (caja && caja.getBoundingClientRect().top < 0) caja.scrollIntoView({ block: 'start' });
  };

  const lista: Paso[] = pasos.map((p, i) => ({
    titulo: p.titulo,
    icono: p.icono,
    resumen: p.resumen,
    hecho: i < ultimo && i < alcanzado + (editar ? 1 : 0) && p.problema === null,
    disponible: listoHasta(i),
  }));
  const actual = pasos[paso];
  const problema = paso < ultimo ? actual.problema : null;
  const IconoPaso = actual.icono;

  return (
    <div className="min-w-0 space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
            <Icono className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link href={volver.href} className="inline-flex min-h-6 items-center gap-1 text-xs font-semibold text-brand-500 hover:underline">
              <IconoFlechaIzquierda className="h-3.5 w-3.5" aria-hidden="true" /> {volver.texto}
            </Link>
            <h1 className={`${adminPageTitle} [overflow-wrap:anywhere]`}>{titulo}</h1>
            {subtitulo && <p className={`${adminPageSubtitle} mt-0`}>{subtitulo}</p>}
          </div>
        </div>
      </header>

      {arriba}

      <Pasos pasos={lista} actual={paso} onIr={ir} etiqueta={etiqueta} />

      {paso < ultimo && (
        <button type="button" onClick={() => setVerMovil(true)} className={`${adminSecondaryButton} w-full lg:hidden`}>
          <IconoVer className="h-4 w-4" aria-hidden="true" /> Ver cómo queda
        </button>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section ref={tarjeta} className={`${adminCard} scroll-mt-36`} aria-labelledby="asistente-paso-titulo">
          <div className="mb-5 flex items-center gap-3">
            <span className="iconos-marca flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <IconoPaso className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="asistente-paso-titulo" className="text-base font-semibold text-ink">{actual.titulo}</h2>
              <p className="text-sm text-muted">{actual.queHacer}</p>
            </div>
          </div>

          <div className="max-w-3xl">{children}</div>

          {/* El pie (§1.6): a la izquierda volver; a la derecha adónde lleva, o por qué todavía no */}
          <div className="-mx-5 -mb-5 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-line bg-surface px-5 py-3">
            {paso > 0 ? (
              <button type="button" onClick={() => ir(paso - 1)} className={adminSecondaryButton}><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Atrás</button>
            ) : (
              <Link href={volver.href} className={adminSecondaryButton}>Cancelar</Link>
            )}
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
              {problema && <p className="text-xs text-muted" role="status">{problema}</p>}
              {paso === ultimo && final.motivo && <p className="text-xs text-muted" role="status">{final.motivo}</p>}
              {paso < ultimo ? (
                <button type="button" onClick={() => ir(paso + 1)} disabled={Boolean(problema)} className={adminPrimaryButton}>
                  Siguiente: {pasos[paso + 1].titulo.toLowerCase()} <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={final.onClick} disabled={final.deshabilitado || !listoHasta(ultimo)} className={adminPrimaryButton}>
                  {final.contenido}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* La vista previa: en la computadora, siempre al lado; en el teléfono, al revisar (antes, con "Ver cómo queda") */}
        <aside className={`${paso === ultimo ? '' : 'hidden lg:block'} space-y-4 lg:sticky lg:top-44`} aria-label="Vista previa">
          {vistaPrevia}
        </aside>
      </div>

      {verMovil && (
        <div className={`${adminModalOverlay} lg:hidden`} role="dialog" aria-modal="true" aria-labelledby="asistente-vista-titulo" onKeyDown={(e) => { if (e.key === 'Escape') setVerMovil(false); }}>
          <div className={`${adminModalPanel} sm:max-w-md`}>
            <div className={adminModalHeader}>
              <h2 id="asistente-vista-titulo" className={adminModalTitle}>Cómo queda</h2>
              <button type="button" onClick={() => setVerMovil(false)} className={`${adminIconButton} h-11 w-11`} aria-label="Cerrar la vista previa">
                <IconoCerrar className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className={`${adminModalBody} space-y-4 pb-6`}>{vistaPrevia}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Un campo con su etiqueta, la (i) si hace falta, una línea de ayuda o el error */
export function Campo({ etiqueta, id, error, pista, ayuda, children }: {
  etiqueta: string; id?: string; error?: string; pista?: ReactNode; ayuda?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1">
        {id ? <label htmlFor={id} className="text-sm font-semibold text-ink">{etiqueta}</label> : <p className="text-sm font-semibold text-ink">{etiqueta}</p>}
        {ayuda && <Ayuda>{ayuda}</Ayuda>}
      </div>
      {children}
      {error ? <p className={adminError} role="alert">{error}</p> : pista ? <p className={adminHint}>{pista}</p> : null}
    </div>
  );
}

/** Un renglón del resumen de "Revisar y publicar", con "Cambiar" para volver a su paso */
export function FilaResumen({ icono: Icono, titulo, detalle, onCambiar }: { icono: IconType; titulo: string; detalle?: string; onCambiar: () => void }) {
  return (
    <li className="flex items-center gap-3 bg-white px-4 py-3">
      <span className="iconos-marca flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icono className="h-4 w-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink [overflow-wrap:anywhere]">{titulo}</span>
        {detalle && <span className="block text-xs text-muted [overflow-wrap:anywhere]">{detalle}</span>}
      </span>
      <button type="button" onClick={onCambiar} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
        <IconoEditar className="h-4 w-4" aria-hidden="true" /> Cambiar
      </button>
    </li>
  );
}

export interface CambioCampo { campo: string; nombre: string; antes: string; despues: string }

/** Al cambiar algo publicado (§1.9): antes → después de cada campo que cambió */
export function ListaCambios({ cambios, children }: { cambios: CambioCampo[]; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink"><IconoEditar className="h-4 w-4 text-brand-500" aria-hidden="true" /> Lo que cambia</p>
      {cambios.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Todavía no cambiaste nada.</p>
      ) : (
        <ul className="mt-2 grid gap-1.5">
          {cambios.map((c) => (
            <li key={c.campo} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm">
              <span className="text-ink-soft">{c.nombre}</span>
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                <s className="min-w-0 text-muted [overflow-wrap:anywhere]">{c.antes}</s>
                <IconoFlechaDerecha className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 rounded-md bg-brand-50 px-1.5 font-semibold text-brand-700 [overflow-wrap:anywhere]">{c.despues}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

/** A cuántos afecta un cambio: cada renglón con su ícono, en el azul claro (lo cuenta el servidor sin guardar) */
export function Afecta({ cargando, filas, sinDatos = 'No se pudo contar a cuántos afecta. Puedes guardar igual.' }: {
  cargando: boolean; filas: { icono: IconType; texto: ReactNode }[] | null; sinDatos?: string;
}) {
  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-ink" aria-live="polite">
      {cargando ? (
        <p className="flex items-center gap-2 text-ink-soft"><span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" /> Contando a cuántos afecta…</p>
      ) : filas === null ? (
        <p className="text-ink-soft">{sinDatos}</p>
      ) : filas.length === 0 ? (
        <p className="flex items-center gap-2"><IconoCheck className="h-4 w-4 text-success-strong" aria-hidden="true" /> No le cambia nada a nadie.</p>
      ) : (
        <ul className="grid gap-1">
          {filas.map((f, i) => {
            const I = f.icono;
            return <li key={i} className="flex items-start gap-2"><I className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" /> <span className="min-w-0">{f.texto}</span></li>;
          })}
        </ul>
      )}
    </div>
  );
}

/** Un bloque de la vista previa con su rótulo ("Así se ve en la tienda"). Lo de adentro no se puede tocar. */
export function VistaPrevia({ rotulo, nota, children }: { rotulo: string; nota?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <IconoVer className="h-4 w-4 text-brand-500" aria-hidden="true" /> {rotulo}
      </p>
      {/* inert: es una muestra; ni el carrito ni los enlaces responden */}
      <div inert className="select-none">{children}</div>
      {nota && <p className={adminHint}>{nota}</p>}
    </div>
  );
}

/** "Publicarlo ya" o "Guardarlo sin publicar" (§1.9: un interruptor no va en algo que todavía no existe), con `OpcionRadio` (§1.10) */
export function ElegirPublicar({ publicar, onCambiar, ya, sin, name }: {
  publicar: boolean; onCambiar: (v: boolean) => void; name: string;
  ya: { titulo: string; detalle: string; icono: IconType };
  sin: { titulo: string; detalle: string; icono: IconType };
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="sr-only">Cuándo se ve en la tienda</legend>
      <OpcionRadio name={name} elegida={publicar} onElegir={() => onCambiar(true)} icono={ya.icono} titulo={ya.titulo} detalle={ya.detalle} />
      <OpcionRadio name={name} elegida={!publicar} onElegir={() => onCambiar(false)} icono={sin.icono} titulo={sin.titulo} detalle={sin.detalle} />
    </fieldset>
  );
}
