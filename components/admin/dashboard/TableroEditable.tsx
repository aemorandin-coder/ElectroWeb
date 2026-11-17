'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition,
  type CSSProperties, type KeyboardEvent as KeyboardEventReact, type PointerEvent as PointerEventReact, type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import {
  IconoAgrandar, IconoAjustes, IconoCandado, IconoCerrar, IconoCheck, IconoMas, IconoMenos, IconoMover, IconoRestablecer,
} from '@/components/iconos';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { iconoAccion } from '@/lib/admin-ui';
import type { AccionPaleta } from '@/lib/dashboard/paleta';
import type { DatosRecepcion } from '@/lib/dashboard/recepcion';
import { MAXIMO_ACCESOS, MAXIMO_WIDGETS, anchoEn, nombreTamano, type ItemDiseno, type Medida } from '@/lib/dashboard/widgets';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useTiempoReal } from '@/lib/realtime/hooks';
import { IconoPor } from './iconos';
import { confeti, destacar, dibujar, entra, posiciones, quieto, viajar } from './movimiento';
import Paleta from './Paleta';
import Recepcion from './Recepcion';
import s from './tablero.module.css';

// C-171: el Dashboard que cada administrador arma a su gusto. El diseño es de cada persona y vive en la base.
// C-279: la recepción arriba y la grilla de 12 columnas (6 en la tablet, 4 en el teléfono). "Personalizar": cada tarjeta se
// arrastra para moverla (o se mueve con las flechas), se le elige un tamaño del menú o se arrastra su esquina para uno a la
// medida, y se quita (las necesarias tienen candado). Abajo, las plantillas y "Agregar" (el cajón); "Listo" guarda.
// Las tarjetas llegan armadas desde el servidor (`nodo`) y su contenido se acomoda al tamaño solo (consultas de contenedor),
// también mientras se arrastra la esquina. Movimiento: la llegada en cascada, las tarjetas que viajan a su lugar (FLIP) y el
// confeti de un pago confirmado; todo una vez y nada con "reducir movimiento".

export interface ItemTablero extends ItemDiseno {
  nodo: ReactNode;
}

export interface FichaWidget {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  obligatorio: boolean;
  tamanos: Medida[];
  minimo: Medida;
  maximo: Medida;
  porDefecto: Medida;
}

interface Props {
  recepcion: DatosRecepcion;
  items: ItemTablero[];
  /** Todos los widgets que esta persona puede ver (puestos o no) */
  fichas: FichaWidget[];
  accesos: Array<{ id: string; titulo: string }>;
  accesosElegidos: string[];
  acciones: AccionPaleta[];
  plantillas: Array<{ id: string; nombre: string; icono: string; widgets: ItemDiseno[] }>;
}

const cx = (...clases: Array<string | false | null | undefined>) => clases.filter(Boolean).join(' ');
const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const sinNodo = (lista: ItemDiseno[]) => lista.map(({ id, ancho, alto }) => ({ id, ancho, alto }));

/** El menú de tamaños: los que admite el widget, dibujados con su forma */
function MenuTamano({ ficha, actual, onElegir, onCerrar }: { ficha: FichaWidget; actual: Medida; onElegir: (m: Medida) => void; onCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    entra(caja.current, 'zoom', 0);
    caja.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"], button')?.focus();
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) onCerrar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [onCerrar]);
  return (
    <div ref={caja} className={s.menuTamano} role="group" aria-label={`Tamaño de ${ficha.titulo}`}>
      <p>Elige un tamaño o arrastra la esquina para uno a tu medida.</p>
      <ul>
        {ficha.tamanos.map((t) => (
          <li key={`${t.ancho}x${t.alto}`}>
            <button type="button" aria-pressed={t.ancho === actual.ancho && t.alto === actual.alto} onClick={() => onElegir(t)}>
              <span className={s.miniForma} aria-hidden="true">
                {Array.from({ length: 4 * Math.max(1, t.alto) }, (_, i) => <i key={i} className={i % 4 < t.ancho / 3 ? s.on : undefined} />)}
              </span>
              {nombreTamano(t)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TableroEditable({ recepcion, items, fichas, accesos, accesosElegidos, acciones, plantillas }: Props) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [refrescando, startTransition] = useTransition();
  // null = viendo. En edición, el orden y los tamaños que se están armando
  const [borrador, setBorrador] = useState<ItemDiseno[] | null>(null);
  // Lo recién guardado, hasta que llega del servidor (para que no vuelva por un momento el diseño de antes)
  const [guardado, setGuardado] = useState<{ items: ItemTablero[]; lista: ItemDiseno[] } | null>(null);
  const [botones, setBotones] = useState<string[]>(accesosElegidos);
  const [guardando, setGuardando] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [cajon, setCajon] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [plantilla, setPlantilla] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [redimensionando, setRedimensionando] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState('');
  const [columnas, setColumnas] = useState(12);
  const grilla = useRef<HTMLUListElement>(null);
  const aviso = useRef<HTMLDivElement>(null);
  const fichaDe = new Map(fichas.map((f) => [f.id, f]));
  const nodoDe = new Map(items.map((i) => [i.id, i.nodo]));
  const editando = borrador !== null;
  // Cuando llega el diseño del servidor (`items` nuevos), lo guardado ya está ahí y deja de valer
  const recienGuardado = guardado && guardado.items === items ? guardado.lista : null;
  const lista: ItemDiseno[] = borrador ?? recienGuardado ?? sinNodo(items);
  useBodyScrollLock(cajon);

  // FLIP: antes de cambiar el diseño se anotan las posiciones; después de pintarlo, cada tarjeta viaja a su lugar
  const flip = useRef<{ antes: Map<string, DOMRect>; excepto: string | null; ms: number } | null>(null);
  const cambiar = useCallback((fn: (actual: ItemDiseno[]) => ItemDiseno[], opciones: { excepto?: string | null; ms?: number } = {}) => {
    flip.current = { antes: posiciones(grilla.current), excepto: opciones.excepto ?? null, ms: opciones.ms ?? 460 };
    setBorrador((actual) => (actual ? fn(actual) : actual));
  }, []);
  useLayoutEffect(() => {
    if (!flip.current) return;
    const { antes, excepto, ms } = flip.current;
    flip.current = null;
    viajar(grilla.current, antes, { excepto, ms });
  }, [borrador, guardado]);

  // La llegada: las tarjetas suben en cascada, de arriba a la izquierda hacia abajo a la derecha, y su ícono se dibuja
  useEffect(() => {
    const g = grilla.current;
    if (!g || quieto()) return;
    const celdas = [...g.querySelectorAll<HTMLElement>(':scope > [data-id]')];
    const rects = celdas.map((c) => c.getBoundingClientRect());
    const top0 = Math.min(...rects.map((r) => r.top));
    const left0 = Math.min(...rects.map((r) => r.left));
    celdas.forEach((c, i) => {
      const retraso = 950 + Math.round((rects[i].top - top0) / 4 + (rects[i].left - left0) / 7);
      entra(c, 'sube', retraso);
      dibujar(c.querySelector(`.${s.tCabeza} > svg`), retraso + 120);
      c.querySelectorAll(`.${s.dock} svg, .${s.dockRejilla} svg, .${s.alDia} svg`).forEach((icono, j) => dibujar(icono, retraso + 150 + j * 45, 600));
    });
  }, []);

  // Las columnas de la grilla en esta pantalla (12, 6 o 4): para la cuadrícula de puntos y para la esquina
  useEffect(() => {
    const medir = () => { const g = grilla.current; if (g) setColumnas(getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length || 12); };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  // Ctrl K (o ⌘K) abre el buscador
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaleta(true); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  const tarjetaDe = (id: string) => grilla.current?.querySelector<HTMLElement>(`:scope > [data-id="${id}"]`) ?? null;
  const irA = useCallback((id: string) => {
    const celda = grilla.current?.querySelector<HTMLElement>(`:scope > [data-id="${id}"]`);
    if (!celda) return false;
    celda.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'center' });
    window.setTimeout(() => destacar(celda.querySelector(`.${s.tarjeta}`)), 300);
    return true;
  }, []);

  // En vivo: una orden nueva o un pago confirmado ponen al día las cifras (a lo sumo cada 5 s, y no mientras se edita).
  // Un pago confirmado tira el confeti sobre las ventas
  const ultimoRefresco = useRef(0);
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  useTiempoReal((evento) => {
    if (editando || (evento.tipo !== 'order:status_updated' && evento.tipo !== 'payment:verified')) return;
    const espera = Math.max(0, 5000 - (Date.now() - ultimoRefresco.current));
    if (pendiente.current) clearTimeout(pendiente.current);
    const pago = evento.tipo === 'payment:verified' && evento.aprobado && evento.contexto === 'ORDER';
    pendiente.current = setTimeout(() => {
      ultimoRefresco.current = Date.now();
      startTransition(() => router.refresh());
      window.setTimeout(() => {
        destacar(tarjetaDe('por-atender')?.querySelector(`.${s.tarjeta}`));
        if (pago) { const v = tarjetaDe('ventas'); destacar(v?.querySelector(`.${s.tarjeta}`)); confeti(v?.getBoundingClientRect() ?? null); }
      }, 700);
    }, espera);
  });
  useEffect(() => () => { if (pendiente.current) clearTimeout(pendiente.current); }, []);

  /* ── Personalizar ── */
  const empezar = () => {
    setBorrador(sinNodo(lista));
    setBotones(accesosElegidos);
    setPlantilla(null);
    window.setTimeout(() => {
      aviso.current?.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'start' });
      entra(aviso.current, 'barrido', 0);
      dibujar(aviso.current?.querySelector('svg'), 120, 650);
      if (!quieto()) grilla.current?.querySelectorAll<HTMLElement>(':scope > [data-id]').forEach((c, i) => c.animate([{ transform: 'scale(1)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], { duration: 420, delay: i * 25, easing: 'ease-out' }));
    }, 30);
  };
  const cancelar = () => {
    flip.current = { antes: posiciones(grilla.current), excepto: null, ms: 460 };
    setBorrador(null);
    setMenu(null);
    setCajon(false);
  };

  const guardar = async (cuerpo: Record<string, unknown> | null) => {
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/dashboard/layout', cuerpo
        ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }
        : { method: 'DELETE' });
      const data = (await res.json().catch(() => ({}))) as { error?: string; widgets?: ItemDiseno[] };
      if (!res.ok) { toast.error(data.error || 'No se pudo guardar tu tablero'); return; }
      toast.success(cuerpo ? 'Tu tablero quedó guardado. Solo cambia el tuyo.' : 'Volviste al tablero de fábrica');
      flip.current = { antes: posiciones(grilla.current), excepto: null, ms: 460 };
      const nuevo = Array.isArray(data.widgets) ? sinNodo(data.widgets) : borrador;
      setGuardado(nuevo ? { items, lista: nuevo } : null);
      setBorrador(null);
      setMenu(null);
      setCajon(false);
      startTransition(() => router.refresh());
    } finally {
      setGuardando(false);
    }
  };
  const listo = () => void guardar({ widgets: borrador, accesos: botones });

  const restablecer = async () => {
    const ok = await confirm({ title: 'Volver al tablero de fábrica', message: 'Vuelve a la plantilla Dueño: se pierden el orden, los tamaños y los botones que elegiste. La meta del mes se queda.', confirmText: 'Volver al de fábrica', cancelText: 'Cancelar', type: 'warning' });
    if (ok) await guardar(null);
  };

  const ponerTamano = (id: string, m: Medida, ms = 460) => cambiar((actual) => actual.map((w) => (w.id === id ? { ...w, ancho: m.ancho, alto: m.alto } : w)), { ms });

  const quitar = (id: string) => {
    const celda = tarjetaDe(id);
    if (celda && !quieto()) celda.classList.add(s.sale);
    window.setTimeout(() => cambiar((actual) => actual.filter((w) => w.id !== id)), quieto() ? 0 : 320);
    setAnuncio(`${fichaDe.get(id)?.titulo ?? 'El widget'} se quitó`);
  };

  const agregar = (id: string) => {
    const ficha = fichaDe.get(id);
    if (!ficha || (borrador?.length ?? 0) >= MAXIMO_WIDGETS) return;
    cambiar((actual) => [...actual, { id, ...ficha.porDefecto }]);
    setCajon(false);
    setAnuncio(`${ficha.titulo} se agregó al final`);
    window.setTimeout(() => irA(id), 250);
  };

  const aplicarPlantilla = (id: string) => {
    const p = plantillas.find((x) => x.id === id);
    if (!p) return;
    setPlantilla(id);
    const nueva = p.widgets.filter((w) => fichaDe.has(w.id));
    const faltan = fichas.filter((f) => f.obligatorio && !nueva.some((w) => w.id === f.id)).map((f) => ({ id: f.id, ...f.porDefecto }));
    cambiar(() => [...faltan, ...nueva], { ms: 560 });
    setAnuncio(`Plantilla ${p.nombre}`);
  };

  /** Mueve `id` antes o después de `destino` */
  const reordenar = (actual: ItemDiseno[], id: string, destino: string, antes: boolean) => {
    const movido = actual.find((w) => w.id === id);
    if (!movido || id === destino) return actual;
    const sin = actual.filter((w) => w.id !== id);
    const i = sin.findIndex((w) => w.id === destino);
    if (i < 0) return actual;
    sin.splice(antes ? i : i + 1, 0, movido);
    return sin;
  };

  // Mover: se arrastra con la cruz; las demás se corren para hacerle lugar
  const arrastrarMover = (ev: PointerEventReact<HTMLButtonElement>, id: string) => {
    if (ev.button !== 0) return;
    const g = grilla.current;
    const el = tarjetaDe(id);
    if (!g || !el) return;
    ev.preventDefault();
    setMenu(null);
    const r = el.getBoundingClientRect();
    const off = { x: ev.clientX - r.left, y: ev.clientY - r.top };
    let ultimo: string | null = null;
    let espera = 0;
    setArrastrando(id);
    const posicionar = (x: number, y: number) => {
      const gr = g.getBoundingClientRect();
      el.style.transform = `translate(${x - off.x - (gr.left + el.offsetLeft)}px, ${y - off.y - (gr.top + el.offsetTop)}px)`;
    };
    const mover = (e: PointerEvent) => {
      posicionar(e.clientX, e.clientY);
      if (performance.now() < espera) return;
      const bajo = document.elementsFromPoint(e.clientX, e.clientY)
        .map((n) => (n instanceof HTMLElement ? n.closest<HTMLElement>('[data-id]') : null))
        .find((n): n is HTMLElement => !!n && n !== el && n.parentElement === g);
      if (!bajo || bajo.dataset.id === ultimo) return;
      const rb = bajo.getBoundingClientRect();
      const destino = bajo.dataset.id ?? '';
      cambiar((actual) => reordenar(actual, id, destino, e.clientX < rb.left + rb.width / 2), { excepto: id, ms: 360 });
      requestAnimationFrame(() => posicionar(e.clientX, e.clientY));
      ultimo = destino;
      espera = performance.now() + 260;
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      const t = el.style.transform;
      el.style.transform = '';
      setArrastrando(null);
      if (!quieto() && t) el.animate([{ transform: t }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  };

  // Con el teclado: las flechas cambian el lugar de la tarjeta
  const moverConTeclas = (e: KeyboardEventReact<HTMLButtonElement>, id: string) => {
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
    if (!delta || !borrador) return;
    e.preventDefault();
    const i = borrador.findIndex((w) => w.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= borrador.length) return;
    cambiar((actual) => reordenar(actual, id, actual[j].id, delta < 0), { ms: 360 });
    setAnuncio(`${fichaDe.get(id)?.titulo ?? 'El widget'}: lugar ${j + 1} de ${borrador.length}`);
  };

  // A tu medida: la esquina se arrastra y el tamaño se pega a la cuadrícula
  const arrastrarEsquina = (ev: PointerEventReact<HTMLSpanElement>, id: string) => {
    const g = grilla.current;
    const el = tarjetaDe(id);
    const ficha = fichaDe.get(id);
    if (ev.button !== 0 || !g || !el || !ficha) return;
    ev.preventDefault();
    ev.stopPropagation();
    setMenu(null);
    const estilo = getComputedStyle(g);
    const cols = estilo.gridTemplateColumns.split(' ').filter(Boolean).length || 12;
    const gap = parseFloat(estilo.columnGap) || 16;
    const fila = parseFloat(estilo.gridAutoRows) || 80;
    const escala = 12 / cols;
    const celda = (g.clientWidth - gap * (cols - 1)) / cols;
    const r0 = el.getBoundingClientRect();
    const x0 = ev.clientX;
    const y0 = ev.clientY;
    const actual = borrador?.find((w) => w.id === id);
    let ultimo = actual ? `${actual.ancho}x${actual.alto}` : '';
    setRedimensionando(id);
    const mover = (e: PointerEvent) => {
      const ancho = r0.width + (e.clientX - x0);
      const alto = r0.height + (e.clientY - y0);
      const nw = entre(Math.round((ancho + gap) / (celda + gap)), Math.ceil(ficha.minimo.ancho / escala), cols);
      const nh = entre(Math.round((alto + gap) / (fila + gap)), ficha.minimo.alto, ficha.maximo.alto);
      const anchoDe12 = entre(cols === 12 ? nw : Math.round(nw * escala), ficha.minimo.ancho, ficha.maximo.ancho);
      const clave = `${anchoDe12}x${nh}`;
      if (clave === ultimo) return;
      ultimo = clave;
      ponerTamano(id, { ancho: anchoDe12, alto: nh }, 300);
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      setRedimensionando(null);
      const m = ultimo.split('x').map(Number);
      if (m.length === 2) setAnuncio(`${ficha.titulo}: ${nombreTamano({ ancho: m[0], alto: m[1] })}`);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  };

  const puestos = new Set(lista.map((w) => w.id));
  const disponibles = fichas.filter((f) => !puestos.has(f.id));
  const lleno = lista.length >= MAXIMO_WIDGETS;
  const cerrarMenu = useCallback(() => setMenu(null), []);

  return (
    <div className={cx(s.raiz, editando && s.editando)}>
      <Recepcion datos={recepcion} editando={editando} onBuscar={() => setPaleta(true)} onPersonalizar={() => (editando ? listo() : empezar())} onIrA={irA} />

      <p className="sr-only" role="status" aria-live="polite">{anuncio}</p>

      {editando && (
        <div ref={aviso} className={s.avisoEdicion} role="status">
          <IconoAjustes className={iconoAccion} aria-hidden="true" />
          <span><b>Estás armando tu tablero.</b> Arrastra la cruz para mover, la esquina para cambiar el tamaño, o elige una plantilla abajo. Es solo tuyo: no cambia el de nadie más.</span>
        </div>
      )}

      <ul ref={grilla} className={cx(s.grilla, refrescando && 'opacity-95')} style={{ '--cols': columnas } as CSSProperties} aria-label="Tu tablero">
        {lista.map((w) => {
          const ficha = fichaDe.get(w.id);
          if (!ficha) return null;
          const { md, sm } = anchoEn(w.ancho);
          const nodo = nodoDe.get(w.id);
          const contenido = nodo ?? (
            <section className={s.tarjeta}>
              <div className={s.tCabeza}><IconoPor nombre={ficha.icono} aria-hidden="true" /><h2>{ficha.titulo}</h2></div>
              <div className={s.tCuerpo}><p className={s.rotulo}>{ficha.descripcion} {editando ? 'Se llena al tocar Listo.' : 'Cargando…'}</p></div>
            </section>
          );
          return (
            <li
              key={w.id}
              data-id={w.id}
              className={cx(s.w, arrastrando === w.id && s.arrastrando, redimensionando === w.id && s.redimensionando, menu === w.id && s.levantada)}
              style={{ '--w': w.ancho, '--h': w.alto, '--wm': md, '--ws': sm } as CSSProperties}
            >
              {editando ? <div className={s.bloqueado} aria-hidden="true">{contenido}</div> : contenido}
              {editando && (
                <>
                  <div className={s.wHerr}>
                    <button type="button" className={s.mover} onPointerDown={(e) => arrastrarMover(e, w.id)} onKeyDown={(e) => moverConTeclas(e, w.id)} aria-label={`Mover ${ficha.titulo}: arrástralo, o usa las flechas`} title="Arrastra para mover">
                      <IconoMover aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setMenu(menu === w.id ? null : w.id)} aria-expanded={menu === w.id} aria-label={`Tamaño de ${ficha.titulo}: ${nombreTamano(w)}`} title="Elegir el tamaño">
                      <IconoAgrandar aria-hidden="true" />
                    </button>
                    {ficha.obligatorio
                      ? <span className={s.fijo} title="Siempre está: se mueve y se agranda, no se quita"><IconoCandado aria-hidden="true" />Fijo</span>
                      : <button type="button" className={s.quitar} onClick={() => quitar(w.id)} aria-label={`Quitar ${ficha.titulo}`} title="Quitar"><IconoMenos aria-hidden="true" /></button>}
                  </div>
                  <span className={cx(s.dato, s.wMedida)} aria-hidden="true">{w.ancho} × {w.alto}</span>
                  <span className={s.wAsa} onPointerDown={(e) => arrastrarEsquina(e, w.id)} title="Arrastra para agrandar o achicar" aria-hidden="true" />
                  {menu === w.id && <MenuTamano ficha={ficha} actual={w} onElegir={(m) => { ponerTamano(w.id, m); setMenu(null); setAnuncio(`${ficha.titulo}: ${nombreTamano(m)}`); }} onCerrar={cerrarMenu} />}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {editando && (
        <div className={s.barraEdicion}>
          <div className={s.plantillas} role="group" aria-label="Plantillas">
            <span>Plantillas</span>
            {plantillas.map((p) => (
              <button key={p.id} type="button" aria-pressed={plantilla === p.id} onClick={() => aplicarPlantilla(p.id)}><IconoPor nombre={p.icono} aria-hidden="true" />{p.nombre}</button>
            ))}
          </div>
          <button type="button" onClick={() => setCajon(true)} className={cx(s.btn, s.btnSecundario)} style={{ height: 40 }}><IconoMas aria-hidden="true" />Agregar</button>
          <button type="button" onClick={() => void restablecer()} disabled={guardando} className={cx(s.btn, s.btnSecundario)} style={{ height: 40 }} title="Volver al de fábrica"><IconoRestablecer aria-hidden="true" /><span className={s.textoBoton}>De fábrica</span></button>
          <button type="button" onClick={cancelar} disabled={guardando} className={cx(s.btn, s.btnSecundario)} style={{ height: 40 }}><IconoCerrar aria-hidden="true" /><span className={s.textoBoton}>Cancelar</span></button>
          <button type="button" onClick={listo} disabled={guardando} className={cx(s.btn, s.btnPrimario)} style={{ height: 40 }}><IconoCheck aria-hidden="true" />{guardando ? 'Guardando…' : 'Listo'}</button>
        </div>
      )}

      {cajon && (
        <>
          <div className={s.velo} onClick={() => setCajon(false)} aria-hidden="true" />
          <aside className={s.cajon} role="dialog" aria-modal="true" aria-labelledby="cajon-titulo" onKeyDown={(e) => { if (e.key === 'Escape') setCajon(false); }}>
            <div className={s.cajonCabeza}>
              <span className={cx(s.placa, s.placaClara)} aria-hidden="true"><IconoMas /></span>
              <h2 id="cajon-titulo">Agregar al tablero</h2>
              {/* El foco entra al cajón por aquí */}
              <button type="button" autoFocus onClick={() => setCajon(false)} aria-label="Cerrar"><IconoCerrar aria-hidden="true" /></button>
            </div>
            <div className={s.cajonLista}>
              {disponibles.length === 0 ? <p className={s.rotulo}>Ya tienes puesto todo lo que puedes ver.</p> : disponibles.map((f, i) => (
                  <div key={f.id} className={s.ficha} ref={(n) => { if (n && i < 8) entra(n, 'sube', 120 + i * 60); }}>
                    <div className={s.fichaFila}>
                      <span className={cx(s.placa, s.placaClara)} aria-hidden="true"><IconoPor nombre={f.icono} /></span>
                      <div className={s.filaTexto}><b>{f.titulo}</b><small>{f.descripcion}</small></div>
                    </div>
                    <div className={s.fichaFila}>
                      <span className={s.rotulo} style={{ flex: 1 }}>{f.tamanos.length} tamaños, o a tu medida</span>
                      <button type="button" disabled={lleno} onClick={() => agregar(f.id)} className={cx(s.btn, s.btnPrimario)}><IconoMas aria-hidden="true" />Agregar</button>
                    </div>
                  </div>
              ))}
              {lleno && <p className={s.rotulo}>Llegaste al máximo de {MAXIMO_WIDGETS} widgets: quita uno para agregar otro.</p>}

              <h3>Tus accesos rápidos</h3>
              <p className={s.rotulo}>Toca para poner o quitar un botón (hasta {MAXIMO_ACCESOS}). Salen en el orden en que los eliges.</p>
              <div className={s.accesosElegir} role="group" aria-label="Botones de accesos rápidos">
                {accesos.map((a) => {
                  const puesto = botones.includes(a.id);
                  return (
                    <button key={a.id} type="button" aria-pressed={puesto} disabled={!puesto && botones.length >= MAXIMO_ACCESOS} onClick={() => setBotones((actual) => (puesto ? actual.filter((x) => x !== a.id) : [...actual, a.id]))}>
                      {puesto ? <IconoCheck aria-hidden="true" /> : <IconoMas aria-hidden="true" />}{a.titulo}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </>
      )}

      <Paleta abierta={paleta} onCerrar={() => setPaleta(false)} acciones={acciones} pasos={recepcion.pasos} onPersonalizar={() => { if (!editando) empezar(); }} />
    </div>
  );
}
