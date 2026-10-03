'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiCheck, FiChevronLeft, FiChevronRight, FiEdit2, FiLock, FiMaximize2, FiMinus, FiMove, FiPlus, FiRotateCcw, FiX } from 'react-icons/fi';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { MAXIMO_ACCESOS, MAXIMO_WIDGETS, type Tamano } from '@/lib/dashboard/widgets';
import { useTiempoReal } from '@/lib/realtime/hooks';

// C-171: el Dashboard que cada administrador arma a su gusto, como el panel rápido de un teléfono (Samsung One UI):
// "Editar" → cada tarjeta muestra un "−" para quitarla (o un candado si es de las necesarias), se arrastra para ordenar, se le
// cambia el tamaño, abajo está lo que se puede agregar con un "+", y "Listo" guarda. El diseño es de cada persona y vive en la base.
//
// Las tarjetas llegan ya armadas desde el servidor (`nodo`). Lo que se agrega en modo edición todavía no tiene datos: se ve su
// nombre y se llena al tocar Listo. Movimiento: entrada escalonada, arrastre animado y nada que se mueva sin fin; con "reducir
// movimiento" no hay animación.

export interface ItemTablero {
  id: string;
  tamano: Tamano;
  nodo: ReactNode;
}

export interface FichaWidget {
  id: string;
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  tamanos: Tamano[];
  porDefecto: Tamano;
}

interface Props {
  /** El título de la página: el botón Editar va a su lado */
  encabezado: ReactNode;
  items: ItemTablero[];
  /** Todos los widgets que esta persona puede ver (puestos o no) */
  fichas: FichaWidget[];
  accesos: Array<{ id: string; titulo: string }>;
  accesosElegidos: string[];
}

const ANCHO: Record<Tamano, string> = {
  chico: 'sm:col-span-1',
  mediano: 'sm:col-span-2',
  ancho: 'sm:col-span-2 lg:col-span-4',
};
const NOMBRE_TAMANO: Record<Tamano, string> = { chico: 'Chico', mediano: 'Mediano', ancho: 'Ancho' };
const boton = 'inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-30';

interface PropsTarjeta {
  id: string;
  ficha: FichaWidget;
  tamano: Tamano;
  nodo: ReactNode | undefined;
  primero: boolean;
  ultimo: boolean;
  onQuitar: () => void;
  onTamano: () => void;
  onMover: (delta: -1 | 1) => void;
}

function TarjetaEditable({ id, ficha, tamano, nodo, primero, ultimo, onQuitar, onTamano, onMover }: PropsTarjeta) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${ANCHO[tamano]} relative flex flex-col rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50 ${isDragging ? 'z-10 shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        {ficha.obligatorio ? (
          <span className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-xs font-semibold text-brand-700" title="Siempre está: se puede mover, no quitar">
            <FiLock className="h-3.5 w-3.5" aria-hidden="true" /> Fijo
          </span>
        ) : (
          <button type="button" onClick={onQuitar} aria-label={`Quitar ${ficha.titulo}`} title="Quitar" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-deal text-white hover:bg-deal/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deal">
            <FiMinus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-700">{ficha.titulo}</span>
        {ficha.tamanos.length > 1 && (
          <button type="button" onClick={onTamano} aria-label={`Tamaño de ${ficha.titulo}: ${NOMBRE_TAMANO[tamano]}. Tocar para cambiar`} title={`Tamaño: ${NOMBRE_TAMANO[tamano]}`} className={`${boton} w-auto gap-1 px-2 text-xs font-semibold`}>
            <FiMaximize2 className="h-3.5 w-3.5" aria-hidden="true" /> {NOMBRE_TAMANO[tamano]}
          </button>
        )}
        <button type="button" onClick={() => onMover(-1)} disabled={primero} aria-label={`Mover ${ficha.titulo} antes`} title="Mover antes" className={boton}><FiChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" onClick={() => onMover(1)} disabled={ultimo} aria-label={`Mover ${ficha.titulo} después`} title="Mover después" className={boton}><FiChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Arrastrar ${ficha.titulo}`} title="Arrastrar para ordenar" className={`${boton} cursor-grab touch-none active:cursor-grabbing`}>
          <FiMove className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {/* El contenido se ve, pero no se toca mientras se edita */}
      <div className="pointer-events-none flex-1 select-none px-1.5 pb-1.5 opacity-80" aria-hidden="true">
        {nodo ?? (
          <div className="flex h-full min-h-24 flex-col justify-center rounded-3xl border border-line bg-white p-4">
            <p className="text-sm font-semibold text-ink">{ficha.titulo}</p>
            <p className="text-xs text-muted">{ficha.descripcion} Se llena al tocar Listo.</p>
          </div>
        )}
      </div>
    </li>
  );
}

export default function TableroEditable({ encabezado, items, fichas, accesos, accesosElegidos }: Props) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [refrescando, startTransition] = useTransition();
  // null = viendo. En edición, el orden y los tamaños que se están armando
  const [borrador, setBorrador] = useState<Array<{ id: string; tamano: Tamano }> | null>(null);
  const [botones, setBotones] = useState<string[]>(accesosElegidos);
  const [guardando, setGuardando] = useState(false);
  const bandeja = useRef<HTMLElement>(null);
  const fichaDe = new Map(fichas.map((f) => [f.id, f]));
  const nodoDe = new Map(items.map((i) => [i.id, i.nodo]));

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // En vivo: una orden nueva o un pago confirmado ponen al día las cifras (a lo sumo cada 5 s, y no mientras se edita)
  const ultimoRefresco = useRef(0);
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editando = borrador !== null;
  useTiempoReal((evento) => {
    if (editando || (evento.tipo !== 'order:status_updated' && evento.tipo !== 'payment:verified')) return;
    const espera = Math.max(0, 5000 - (Date.now() - ultimoRefresco.current));
    if (pendiente.current) clearTimeout(pendiente.current);
    pendiente.current = setTimeout(() => {
      ultimoRefresco.current = Date.now();
      startTransition(() => router.refresh());
    }, espera);
  });
  useEffect(() => () => { if (pendiente.current) clearTimeout(pendiente.current); }, []);

  const empezar = () => {
    setBorrador(items.map((i) => ({ id: i.id, tamano: i.tamano })));
    setBotones(accesosElegidos);
  };
  const cancelar = () => setBorrador(null);

  const guardar = async (cuerpo: Record<string, unknown> | null) => {
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/dashboard/layout', cuerpo
        ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }
        : { method: 'DELETE' });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error || 'No se pudo guardar tu Dashboard');
        return;
      }
      toast.success(cuerpo ? 'Tu Dashboard quedó guardado' : 'Dashboard restablecido');
      setBorrador(null);
      startTransition(() => router.refresh());
    } finally {
      setGuardando(false);
    }
  };

  const restablecer = async () => {
    const ok = await confirm({ title: 'Restablecer el Dashboard', message: 'Vuelve al diseño original: se pierden el orden, los tamaños y los botones que elegiste.', confirmText: 'Restablecer', cancelText: 'Cancelar', type: 'warning' });
    if (ok) await guardar(null);
  };

  const alSoltar = (evento: DragEndEvent) => {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    setBorrador((actual) => {
      if (!actual) return actual;
      const de = actual.findIndex((w) => w.id === active.id);
      const a = actual.findIndex((w) => w.id === over.id);
      return de < 0 || a < 0 ? actual : arrayMove(actual, de, a);
    });
  };

  if (!borrador) {
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          {encabezado}
          <button type="button" onClick={empezar} className={adminSecondaryButton}>
            <FiEdit2 className="h-4 w-4" aria-hidden="true" /> Editar
          </button>
        </div>
        <ul className={`grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4 ${refrescando ? 'opacity-90' : ''}`}>
          {items.map((item, i) => (
            <li key={item.id} className={`${ANCHO[item.tamano]} animate-fadeIn motion-reduce:animate-none`} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
              {item.nodo}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const puestos = new Set(borrador.map((w) => w.id));
  const disponibles = fichas.filter((f) => !puestos.has(f.id));
  const lleno = borrador.length >= MAXIMO_WIDGETS;

  return (
    <div>
      <div className="mb-4">{encabezado}</div>
      <div className="mb-3 rounded-2xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700" role="status">
        <span className="font-semibold">Estás editando tu Dashboard.</span> Quita con el botón rojo, arrastra para ordenar, cambia el tamaño y agrega lo que quieras de la lista de abajo. Es solo tuyo: no cambia el de nadie más.
      </div>

      <DndContext id="tablero-dashboard" sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
        <SortableContext items={borrador.map((w) => w.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {borrador.map((w, i) => {
              const ficha = fichaDe.get(w.id);
              if (!ficha) return null;
              return (
                <TarjetaEditable
                  key={w.id}
                  id={w.id}
                  ficha={ficha}
                  tamano={w.tamano}
                  nodo={nodoDe.get(w.id)}
                  primero={i === 0}
                  ultimo={i === borrador.length - 1}
                  onQuitar={() => setBorrador((actual) => actual?.filter((x) => x.id !== w.id) ?? actual)}
                  onTamano={() => setBorrador((actual) => actual?.map((x) => (x.id === w.id ? { ...x, tamano: ficha.tamanos[(ficha.tamanos.indexOf(x.tamano) + 1) % ficha.tamanos.length] } : x)) ?? actual)}
                  onMover={(delta) => setBorrador((actual) => (actual && i + delta >= 0 && i + delta < actual.length ? arrayMove(actual, i, i + delta) : actual))}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <section ref={bandeja} aria-labelledby="agregar-titulo" className="mt-6 scroll-mt-24 rounded-3xl border border-line bg-white p-4">
        <h2 id="agregar-titulo" className="text-base font-semibold text-ink">Agregar</h2>
        {disponibles.length === 0 ? <p className="mt-1 text-sm text-muted">Ya tienes puesto todo lo que puedes ver.</p> : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {disponibles.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  disabled={lleno}
                  onClick={() => setBorrador((actual) => (actual ? [...actual, { id: f.id, tamano: f.porDefecto }] : actual))}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left hover:border-brand-500 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white" aria-hidden="true"><FiPlus className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{f.titulo}</span>
                    <span className="block text-xs text-muted">{f.descripcion}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {lleno && <p className="mt-2 text-xs text-muted">Llegaste al máximo de {MAXIMO_WIDGETS} widgets: quita uno para agregar otro.</p>}

        <h3 className="mt-5 text-sm font-semibold text-ink">Tus accesos rápidos</h3>
        <p className="text-xs text-muted">Toca para poner o quitar un botón (hasta {MAXIMO_ACCESOS}). Salen en el orden en que los eliges.</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Botones de accesos rápidos">
          {accesos.map((a) => {
            const puesto = botones.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={puesto}
                disabled={!puesto && botones.length >= MAXIMO_ACCESOS}
                onClick={() => setBotones((actual) => (puesto ? actual.filter((x) => x !== a.id) : [...actual, a.id]))}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold disabled:opacity-40 ${puesto ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-soft hover:bg-surface'}`}
              >
                {puesto ? <FiCheck className="h-4 w-4" aria-hidden="true" /> : <FiPlus className="h-4 w-4" aria-hidden="true" />}
                {a.titulo}
              </button>
            );
          })}
        </div>
      </section>

      {/* Barra de acciones siempre a mano, también en el teléfono */}
      <div className="sticky bottom-3 z-[var(--z-sticky)] mt-4 rounded-2xl border border-line bg-white p-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => bandeja.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={`${adminSecondaryButton} mr-auto`}>
            <FiPlus className="h-4 w-4" aria-hidden="true" /> Agregar
          </button>
          <button type="button" onClick={() => void restablecer()} disabled={guardando} className={adminSecondaryButton}>
            <FiRotateCcw className="h-4 w-4" aria-hidden="true" /> <span className="max-sm:sr-only">Restablecer</span>
          </button>
          <button type="button" onClick={cancelar} disabled={guardando} className={adminSecondaryButton}>
            <FiX className="h-4 w-4" aria-hidden="true" /> <span className="max-sm:sr-only">Cancelar</span>
          </button>
          <button type="button" onClick={() => void guardar({ widgets: borrador, accesos: botones })} disabled={guardando} className={adminPrimaryButton}>
            <FiCheck className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Listo'}
          </button>
        </div>
      </div>
    </div>
  );
}
