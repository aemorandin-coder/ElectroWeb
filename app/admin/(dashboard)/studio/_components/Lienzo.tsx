'use client';

// C-270: tocar, mover, agrandar y girar las capas sobre la vista previa (docs/plan/ELECTROSTUDIO.md §4, Fase 2).
// Va encima del canvas: las cajas salen del último dibujo del motor (capasCajas) y las asas son HTML, así no salen en la
// imagen. Durante el gesto los cambios no entran al historial; al empezar, `onEmpezar` guarda un solo paso de deshacer.
import { useEffect, useRef, useState, type KeyboardEvent as KeyEvent, type PointerEvent as PtrEvent, type RefObject } from 'react';
import { IconoAbrirCandado, IconoCandado, IconoCopiar, IconoEliminar, IconoFlechaAbajo, IconoFlechaArriba, IconoRestablecer } from '@/components/iconos';
import { etiquetaCapa, tamDe, type CambioCapa } from '@/lib/studio/capas';
import { W, ZONA_IG, type CajaCapa } from '@/lib/studio/engine';
import type { StudioCapa } from '@/lib/studio/schema';

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Alto del lienzo del formato (1920, 1350 o 1080) */
  alto: number;
  capas: StudioCapa[];
  cajas: CajaCapa[];
  sel: string | null;
  /** Mientras se reproduce la animación o se exporta, sin asas */
  activo: boolean;
  historia: boolean;
  onSel: (id: string | null) => void;
  onEmpezar: () => void;
  onCambiar: (id: string, cambio: CambioCapa) => void;
  onBorrar: (id: string) => void;
  onDuplicar: (id: string) => void;
  onOrden: (id: string, paso: 1 | -1) => void;
  onEditar: (id: string) => void;
  /** C-287: los títulos de la plantilla que se arrastran (sus cajas, del último dibujo) y cuánto se corrió cada uno */
  piezas: CajaCapa[];
  corrimientos: Record<string, { dx: number; dy: number }>;
  onMoverPieza: (id: string, dx: number, dy: number) => void;
  onVolverPieza: (id: string) => void;
}

/** C-287: cómo se llama cada título de la plantilla, para el lector de pantalla y la barra */
const NOMBRE_PIEZA: Record<string, string> = { titulo: 'El título', 'titulo-1': 'El título del primer producto', 'titulo-2': 'El título del segundo producto', etiqueta: 'La etiqueta de arriba' };

type Gesto =
  | { tipo: 'mover'; id: string; x0: number; y0: number; cx0: number; cy0: number }
  | { tipo: 'tam'; id: string; cx: number; cy: number; d0: number; tam0: number; ancho0: number; capa: StudioCapa['tipo'] }
  | { tipo: 'giro'; id: string; cx: number; cy: number; a0: number; giro0: number }
  | { tipo: 'pinza'; id: string; d0: number; a0: number; tam0: number; ancho0: number; giro0: number; capa: StudioCapa['tipo'] }
  | { tipo: 'pieza'; id: string; x0: number; y0: number; dx0: number; dy0: number };

/** A cuántos px de la pantalla se pega al centro */
const IMAN = 8;
const RECTOS = [-180, -90, 0, 90, 180];

export default function Lienzo({ canvasRef, alto, capas, cajas, sel, activo, historia, onSel, onEmpezar, onCambiar, onBorrar, onDuplicar, onOrden, onEditar, piezas, corrimientos, onMoverPieza, onVolverPieza }: Props) {
  // C-287: el título de la plantilla elegido (las capas tienen su propia elección, `sel`)
  const [piezaSel, setPiezaSel] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement | null>(null);
  const [k, setK] = useState(0);
  const gesto = useRef<Gesto | null>(null);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const [guias, setGuias] = useState({ v: false, h: false, zona: false });

  // La escala de la vista previa: px de la pantalla por px del lienzo
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const medir = () => setK(c.clientWidth / W);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(c);
    return () => ro.disconnect();
  }, [canvasRef]);

  const capaDe = (id: string) => capas.find((c) => c.id === id);
  const cajaDe = (id: string) => cajas.find((c) => c.id === id);
  /** El centro de la capa en la pantalla */
  const centro = (c: StudioCapa) => {
    const r = raiz.current?.getBoundingClientRect();
    return { x: (r?.left ?? 0) + c.x * W * k, y: (r?.top ?? 0) + c.y * alto * k };
  };

  const empezar = (e: PtrEvent<HTMLElement>, g: Gesto) => {
    e.stopPropagation();
    e.preventDefault();
    // C-273: suelta el campo de números que se estaba escribiendo (si no, seguiría mostrando lo escrito)
    if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
    raiz.current?.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    onEmpezar();
    gesto.current = g;
  };

  const alTocarCapa = (e: PtrEvent<HTMLElement>, c: StudioCapa) => {
    if (e.button !== 0) return;
    if (sel !== c.id) onSel(c.id);
    raiz.current?.focus({ preventScroll: true });
    if (c.bloqueada) {
      e.stopPropagation();
      return;
    }
    // Segundo dedo sobre la capa elegida: pellizcar
    if (gesto.current && punteros.current.size === 1 && gesto.current.id === c.id) {
      e.stopPropagation();
      raiz.current?.setPointerCapture(e.pointerId);
      punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      empezarPinza(c);
      return;
    }
    empezar(e, { tipo: 'mover', id: c.id, x0: e.clientX, y0: e.clientY, cx0: c.x * W, cy0: c.y * alto });
  };

  const alTocarPieza = (e: PtrEvent<HTMLElement>, id: string) => {
    if (e.button !== 0) return;
    if (sel) onSel(null);
    setPiezaSel(id);
    raiz.current?.focus({ preventScroll: true });
    const o = corrimientos[id] ?? { dx: 0, dy: 0 };
    empezar(e, { tipo: 'pieza', id, x0: e.clientX, y0: e.clientY, dx0: o.dx, dy0: o.dy });
  };

  const empezarPinza = (c: StudioCapa) => {
    const [a, b] = [...punteros.current.values()];
    if (!a || !b) return;
    gesto.current = { tipo: 'pinza', id: c.id, d0: Math.hypot(b.x - a.x, b.y - a.y), a0: Math.atan2(b.y - a.y, b.x - a.x), tam0: c.tam, ancho0: c.tipo === 'texto' ? c.anchoMax : 0, giro0: c.giro, capa: c.tipo };
  };

  const alTocarFondo = (e: PtrEvent<HTMLDivElement>) => {
    // Segundo dedo fuera de la capa, con un gesto en curso: también pellizca
    if (gesto.current && punteros.current.size === 1) {
      const c = capaDe(gesto.current.id);
      if (c) {
        raiz.current?.setPointerCapture(e.pointerId);
        punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        empezarPinza(c);
        return;
      }
    }
    if (e.target === raiz.current) {
      onSel(null);
      setPiezaSel(null);
    }
  };

  const alMover = (e: PtrEvent<HTMLDivElement>) => {
    const g = gesto.current;
    if (!g || !punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.tipo === 'pieza') {
      if (!k) return;
      const caja = piezas.find((p) => p.id === g.id);
      let dx = g.dx0 + (e.clientX - g.x0) / k;
      let dy = g.dy0 + (e.clientY - g.y0) / k;
      // Se pega al centro de la imagen, como las capas
      if (caja) {
        const cx = caja.cx - (corrimientos[g.id]?.dx ?? 0) + dx;
        const cy = caja.cy - (corrimientos[g.id]?.dy ?? 0) + dy;
        const v = Math.abs(cx - W / 2) * k < IMAN;
        const h = Math.abs(cy - alto / 2) * k < IMAN;
        if (v) dx += W / 2 - cx;
        if (h) dy += alto / 2 - cy;
        setGuias({ v, h, zona: historia && (cy - caja.h / 2 < ZONA_IG.arriba || cy + caja.h / 2 > alto - ZONA_IG.abajo) });
      }
      onMoverPieza(g.id, Math.round(Math.max(-W, Math.min(W, dx))), Math.round(Math.max(-alto, Math.min(alto, dy))));
      return;
    }
    const c = capaDe(g.id);
    if (!c || !k) return;
    if (g.tipo === 'mover') {
      let x = g.cx0 + (e.clientX - g.x0) / k;
      let y = g.cy0 + (e.clientY - g.y0) / k;
      const v = Math.abs(x - W / 2) * k < IMAN;
      const h = Math.abs(y - alto / 2) * k < IMAN;
      if (v) x = W / 2;
      if (h) y = alto / 2;
      x = Math.min(W, Math.max(0, x));
      y = Math.min(alto, Math.max(0, y));
      const caja = cajaDe(g.id);
      const medio = (caja?.h ?? 0) / 2;
      setGuias({ v, h, zona: historia && (y - medio < ZONA_IG.arriba || y + medio > alto - ZONA_IG.abajo) });
      onCambiar(g.id, { x: x / W, y: y / alto });
    } else if (g.tipo === 'tam') {
      const d = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
      onCambiar(g.id, escalar(g, d / Math.max(6, g.d0)));
    } else if (g.tipo === 'giro') {
      onCambiar(g.id, { giro: recto(g.giro0 + ((Math.atan2(e.clientY - g.cy, e.clientX - g.cx) - g.a0) * 180) / Math.PI) });
    } else {
      const [a, b] = [...punteros.current.values()];
      if (!a || !b) return;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      onCambiar(g.id, { ...escalar(g, d / Math.max(6, g.d0)), giro: recto(g.giro0 + ((ang - g.a0) * 180) / Math.PI) });
    }
  };

  const alSoltar = (e: PtrEvent<HTMLDivElement>) => {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size === 0) {
      gesto.current = null;
      setGuias({ v: false, h: false, zona: false });
    } else if (gesto.current?.tipo === 'pinza') {
      // Queda un dedo: sigue moviendo desde donde está
      const c = capaDe(gesto.current.id);
      const [p] = [...punteros.current.values()];
      if (c && p) gesto.current = { tipo: 'mover', id: c.id, x0: p.x, y0: p.y, cx0: c.x * W, cy0: c.y * alto };
    }
  };

  const alTeclear = (e: KeyEvent<HTMLDivElement>) => {
    // C-287: un título de la plantilla elegido se mueve con las flechas (1 px; con Mayús, 10) y Escape lo suelta
    if (piezaSel && !sel) {
      if (e.key === 'Escape') { setPiezaSel(null); return; }
      const paso = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
      if (!d) return;
      e.preventDefault();
      onEmpezar();
      const o = corrimientos[piezaSel] ?? { dx: 0, dy: 0 };
      onMoverPieza(piezaSel, o.dx + d[0], o.dy + d[1]);
      return;
    }
    const c = sel ? capaDe(sel) : undefined;
    if (!c) return;
    if (e.key === 'Escape') {
      onSel(null);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      onDuplicar(c.id);
      return;
    }
    if (c.bloqueada) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onBorrar(c.id);
      return;
    }
    const paso = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
    if (!d) return;
    e.preventDefault();
    onEmpezar();
    onCambiar(c.id, { x: Math.min(1, Math.max(0, c.x + d[0] / W)), y: Math.min(1, Math.max(0, c.y + d[1] / alto)) });
  };

  if (!k) return null;
  const elegida = sel ? capaDe(sel) : undefined;
  const cajaSel = elegida ? cajaDe(elegida.id) : undefined;

  return (
    <div
      ref={raiz}
      tabIndex={0}
      role="group"
      aria-label="Piezas sueltas: tócalas para moverlas. Con el teclado, elige una en la lista y muévela con las flechas."
      onPointerDown={alTocarFondo}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onKeyDown={alTeclear}
      className="absolute inset-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      style={{ touchAction: elegida ? 'none' : 'pan-y' }}
    >
      {/* Las zonas para tocar, recortadas al lienzo (así una pieza grande no tapa los botones de al lado). El recuadro y
          las asas de la elegida van afuera: pueden salir del borde para que se puedan tomar */}
      <div className="absolute inset-0 overflow-hidden rounded-md">
      {/* Lo que tapa Instagram, mientras se mueve algo cerca */}
      {guias.zona && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 border-b border-dashed border-white/80 bg-deal/25" style={{ height: ZONA_IG.arriba * k }} />
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-dashed border-white/80 bg-deal/25" style={{ height: ZONA_IG.abajo * k }} />
        </>
      )}
      {guias.v && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-brand-300" />}
      {guias.h && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-brand-300" />}

      {/* C-287: los títulos de la plantilla, debajo de las capas (que van encima en la imagen) */}
      {activo &&
        piezas.map((p) => (
          <div
            key={p.id}
            role="button"
            tabIndex={-1}
            aria-label={`${NOMBRE_PIEZA[p.id] ?? 'Un título'} de la plantilla: arrástralo para moverlo`}
            aria-pressed={piezaSel === p.id}
            onPointerDown={(e) => alTocarPieza(e, p.id)}
            className="absolute cursor-move"
            style={{ left: p.cx * k, top: p.cy * k, width: Math.max(16, p.w * k), height: Math.max(16, p.h * k), transform: 'translate(-50%, -50%)', touchAction: 'none' }}
          />
        ))}
      {activo &&
        capas.map((c) => {
          const caja = cajaDe(c.id);
          if (!caja || c.oculta) return null;
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={-1}
              aria-label={etiquetaCapa(c)}
              aria-pressed={sel === c.id}
              onPointerDown={(e) => alTocarCapa(e, c)}
              onDoubleClick={() => onEditar(c.id)}
              className={`absolute ${c.bloqueada ? 'cursor-default' : 'cursor-move'}`}
              style={{
                left: c.x * W * k,
                top: c.y * alto * k,
                width: Math.max(16, caja.w * k),
                height: Math.max(16, caja.h * k),
                transform: `translate(-50%, -50%) rotate(${c.giro}deg)`,
                touchAction: 'none',
              }}
            />
          );
        })}
      </div>

      {activo && piezaSel && !elegida && (() => {
        const p = piezas.find((x) => x.id === piezaSel);
        if (!p) return null;
        const corrido = Boolean(corrimientos[p.id]?.dx || corrimientos[p.id]?.dy);
        const arriba = p.cy * k - (p.h * k) / 2 - 52 > 0;
        return (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute rounded-[3px] border-[1.5px] border-white outline outline-[1.5px] outline-brand-500" style={{ left: p.cx * k, top: p.cy * k, width: p.w * k + 8, height: p.h * k + 8, transform: 'translate(-50%, -50%)' }} />
            <div
              role="toolbar"
              aria-label={NOMBRE_PIEZA[p.id] ?? 'El título'}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute z-10 flex items-center gap-1 rounded-lg bg-white p-1 pl-2 text-xs font-semibold text-ink-soft shadow-lg ring-1 ring-line"
              style={{ left: Math.max(4, p.cx * k - 90), top: arriba ? p.cy * k - (p.h * k) / 2 - 48 : p.cy * k + (p.h * k) / 2 + 10 }}
            >
              <span className="whitespace-nowrap">{NOMBRE_PIEZA[p.id] ?? 'El título'}</span>
              <button type="button" disabled={!corrido} onClick={() => onVolverPieza(p.id)} className="flex h-8 items-center gap-1 rounded-md px-2 text-ink-soft hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40" title="Volver a su lugar">
                <IconoRestablecer className="h-4 w-4" aria-hidden="true" />
                <span>A su lugar</span>
              </button>
            </div>
          </>
        );
      })()}

      {activo && elegida && cajaSel && !elegida.oculta && (
        <Seleccion
          capa={elegida}
          caja={cajaSel}
          k={k}
          alto={alto}
          onTam={(e) => {
            const c = centro(elegida);
            empezar(e, { tipo: 'tam', id: elegida.id, cx: c.x, cy: c.y, d0: Math.hypot(e.clientX - c.x, e.clientY - c.y), tam0: elegida.tam, ancho0: elegida.tipo === 'texto' ? elegida.anchoMax : 0, capa: elegida.tipo });
          }}
          onGiro={(e) => {
            const c = centro(elegida);
            empezar(e, { tipo: 'giro', id: elegida.id, cx: c.x, cy: c.y, a0: Math.atan2(e.clientY - c.y, e.clientX - c.x), giro0: elegida.giro });
          }}
          onBorrar={() => onBorrar(elegida.id)}
          onDuplicar={() => onDuplicar(elegida.id)}
          onOrden={(p) => onOrden(elegida.id, p)}
          onBloquear={() => {
            onEmpezar();
            onCambiar(elegida.id, { bloqueada: !elegida.bloqueada });
          }}
          primera={capas[0]?.id === elegida.id}
          ultima={capas[capas.length - 1]?.id === elegida.id}
        />
      )}
    </div>
  );
}

/**
 * Agrandar con las esquinas o con dos dedos: el texto y su ancho máximo crecen juntos (C-271), así las líneas cortan en
 * el mismo lugar. Con el campo de px, en cambio, el ancho queda y el texto baja de línea.
 */
function escalar(g: { tam0: number; ancho0: number; capa: StudioCapa['tipo'] }, factor: number): CambioCapa {
  const tam = tamDe({ tipo: g.capa }, g.tam0 * factor);
  const f = tam / g.tam0;
  return g.ancho0 ? { tam, anchoMax: Math.min(1080, Math.max(40, Math.round(g.ancho0 * f))) } : { tam };
}

/** Ángulo entre -180 y 180, que se pega a los rectos a menos de 4 grados */
function recto(g: number): number {
  let a = ((((g + 180) % 360) + 360) % 360) - 180;
  for (const r of RECTOS) if (Math.abs(a - r) < 4) a = r === -180 ? 180 : r;
  return Math.round(a);
}

const ASA = 'absolute h-3.5 w-3.5 rounded-full border-2 border-brand-500 bg-white shadow-sm';

function Seleccion({ capa, caja, k, alto, onTam, onGiro, onBorrar, onDuplicar, onOrden, onBloquear, primera, ultima }: {
  capa: StudioCapa;
  caja: CajaCapa;
  k: number;
  alto: number;
  onTam: (e: PtrEvent<HTMLElement>) => void;
  onGiro: (e: PtrEvent<HTMLElement>) => void;
  onBorrar: () => void;
  onDuplicar: () => void;
  onOrden: (paso: 1 | -1) => void;
  onBloquear: () => void;
  primera: boolean;
  ultima: boolean;
}) {
  let w = Math.max(16, caja.w * k) + 8;
  let h = Math.max(16, caja.h * k) + 8;
  let x = capa.x * W * k;
  let y = capa.y * alto * k;
  // Una pieza más grande que la imagen: el recuadro se recorta al borde (más 10 px) para que las asas queden a mano.
  // Siguen agrandando desde el centro de la pieza. Con giro no se recorta (sería otra forma)
  if (!capa.giro) {
    const m = 10;
    const l = Math.max(-m, x - w / 2);
    const r = Math.min(W * k + m, x + w / 2);
    const t = Math.max(-m, y - h / 2);
    const b = Math.min(alto * k + m, y + h / 2);
    if (r - l > 16 && b - t > 16) {
      x = (l + r) / 2;
      y = (t + b) / 2;
      w = r - l;
      h = b - t;
    }
  }
  // La barra va arriba de la capa; si no cabe, abajo
  const arriba = y - h / 2 - 76 > 0;
  const boton = 'flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-brand-50 hover:text-brand-600 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-500';
  const parar = (e: PtrEvent<HTMLElement>) => e.stopPropagation();
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-[3px] border-[1.5px] border-white outline outline-[1.5px] outline-brand-500"
        style={{ left: x, top: y, width: w, height: h, transform: `translate(-50%, -50%) rotate(${capa.giro}deg)` }}
      >
        {!capa.bloqueada && (
          <>
            {(['-left-2 -top-2 cursor-nwse-resize', '-right-2 -top-2 cursor-nesw-resize', '-left-2 -bottom-2 cursor-nesw-resize', '-right-2 -bottom-2 cursor-nwse-resize'] as const).map((pos) => (
              <span key={pos} className={`${ASA} ${pos} pointer-events-auto`} style={{ touchAction: 'none' }} onPointerDown={onTam} />
            ))}
            <span className="pointer-events-auto absolute -top-9 left-1/2 flex h-5 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-white bg-brand-500 shadow-sm" style={{ touchAction: 'none' }} onPointerDown={onGiro} />
            <span className="absolute -top-4 left-1/2 h-4 w-px -translate-x-1/2 bg-brand-500" />
          </>
        )}
        <span className="absolute -bottom-8 -right-2 whitespace-nowrap rounded-md bg-brand-700 px-1.5 py-1 text-[11px] font-semibold leading-none text-white">
          {capa.tam} px{capa.giro ? ` · ${capa.giro}°` : ''}
        </span>
      </div>
      <div
        role="toolbar"
        aria-label="La pieza elegida"
        onPointerDown={parar}
        className="absolute z-10 flex gap-0.5 rounded-lg bg-white p-1 shadow-lg ring-1 ring-line"
        style={{ left: Math.max(4, x - 90), top: arriba ? Math.max(4, y - h / 2 - 76) : y + h / 2 + 40 }}
      >
        <button type="button" className={boton} onClick={onDuplicar} aria-label="Duplicar (Ctrl+D)" title="Duplicar (Ctrl+D)"><IconoCopiar className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" className={boton} onClick={() => onOrden(1)} disabled={ultima} aria-label="Traer adelante" title="Adelante"><IconoFlechaArriba className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" className={boton} onClick={() => onOrden(-1)} disabled={primera} aria-label="Llevar atrás" title="Atrás"><IconoFlechaAbajo className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" className={boton} onClick={onBloquear} aria-pressed={capa.bloqueada} aria-label={capa.bloqueada ? 'Desbloquear' : 'Bloquear: que no se mueva sin querer'} title={capa.bloqueada ? 'Desbloquear' : 'Bloquear'}>
          {capa.bloqueada ? <IconoCandado className="h-4 w-4" aria-hidden="true" /> : <IconoAbrirCandado className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button type="button" className={`${boton} hover:text-deal`} onClick={onBorrar} aria-label="Borrar (Supr)" title="Borrar (Supr)"><IconoEliminar className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </>
  );
}
