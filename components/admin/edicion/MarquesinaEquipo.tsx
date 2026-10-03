'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEdicionEnVivo } from '@/lib/edicion/useEdicionEnVivo';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { MODULOS, moduloDeRuta } from '@/lib/modulos';
import type { PersonaEnLinea } from '@/lib/realtime/eventos';
import { useTiempoReal } from '@/lib/realtime/hooks';

// C-174: la marquesina del equipo. Una franja debajo de la barra de arriba que dice quién del equipo está conectado y en qué
// sector del panel: "Luis está en Productos, editando «Teclado Redragon K552»". Solo aparece si hay alguien más.
//
// Cada pestaña del panel avisa en qué módulo está (`seccion:<módulo>`, con la presencia de C-169) y los editores avisan lo que
// editan (la etiqueta del recurso). Aquí se juntan todos los avisos por persona. Llega por el canal en vivo, solo a
// administradores con los dos pasos. Una pestaña en segundo plano deja de avisar y a los 60 s sale de la franja.

/** Velocidad de la marquesina: píxeles por segundo */
const VELOCIDAD = 45;

type PorRecurso = Record<string, PersonaEnLinea[]>;

interface Entrada {
  id: string;
  nombre: string;
  /** Módulos en los que tiene una pestaña abierta (normalmente uno) */
  sectores: Array<{ id: string; nombre: string; href: string }>;
  /** Lo que está editando, si lo dice */
  editando: string[];
}

const NOMBRE_SECTOR = new Map(MODULOS.map((m) => [m.id, { nombre: m.nombre, href: m.paginas[0] ?? '/admin' }]));

function agrupar(porRecurso: PorRecurso, yo: string | undefined): Entrada[] {
  const personas = new Map<string, Entrada>();
  const de = (p: PersonaEnLinea) => {
    let e = personas.get(p.id);
    if (!e) {
      e = { id: p.id, nombre: p.nombre, sectores: [], editando: [] };
      personas.set(p.id, e);
    }
    return e;
  };
  for (const [recurso, gente] of Object.entries(porRecurso)) {
    for (const p of gente) {
      if (p.id === yo) continue;
      const entrada = de(p);
      if (recurso.startsWith('seccion:')) {
        const id = recurso.slice('seccion:'.length);
        const sector = NOMBRE_SECTOR.get(id);
        if (sector && !entrada.sectores.some((s) => s.id === id)) entrada.sectores.push({ id, nombre: sector.nombre, href: sector.href });
      } else if (p.donde && !entrada.editando.includes(p.donde)) {
        entrada.editando.push(p.donde);
      }
    }
  }
  return [...personas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** "Luis está en Productos, editando «Teclado»" como texto, para lectores de pantalla */
function enTexto(e: Entrada): string {
  const sitio = e.sectores.length > 0 ? ` en ${e.sectores.map((s) => s.nombre).join(' y ')}` : ' conectado';
  const edita = e.editando.length > 0 ? `, editando ${e.editando.map((x) => `«${x}»`).join(' y ')}` : '';
  return `${e.nombre} está${sitio}${edita}`;
}

function Inicial({ nombre }: { nombre: string }) {
  return (
    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white" aria-hidden="true">
      {nombre.trim()[0]?.toUpperCase() ?? '?'}
      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white bg-success" />
    </span>
  );
}

function Persona({ e, enlaces }: { e: Entrada; enlaces: boolean }) {
  const destino = e.sectores[0]?.href;
  const contenido = (
    <>
      <Inicial nombre={e.nombre} />
      <span>
        <span className="font-semibold">{e.nombre}</span> está {e.sectores.length > 0 ? `en ${e.sectores.map((s) => s.nombre).join(' y ')}` : 'conectado'}
        {e.editando.length > 0 && <>, editando <span className="font-semibold">{e.editando.map((x) => `«${x}»`).join(' y ')}</span></>}
      </span>
    </>
  );
  const clases = 'inline-flex items-center gap-2 rounded-full px-2 py-1';
  return enlaces && destino
    ? <Link href={destino} className={`${clases} hover:bg-white focus-visible:outline-2 focus-visible:outline-brand-500`}>{contenido}</Link>
    : <span className={clases}>{contenido}</span>;
}

export default function MarquesinaEquipo({ pathname, yo }: { pathname: string; yo: string | undefined }) {
  const [porRecurso, setPorRecurso] = useState<PorRecurso>({});
  const modulo = moduloDeRuta(pathname);
  // Esta pestaña avisa en qué sector está (y se va al cambiar de pantalla o cerrarse)
  useEdicionEnVivo(yo ? `seccion:${modulo?.id ?? 'panel'}` : null, yo);

  // Lo que ya había abierto al entrar
  useCargarAlMontar(async () => {
    const res = await fetch('/api/admin/presencia?todos=1', { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) return;
    const datos = (await res.json().catch(() => null)) as { presentes?: PorRecurso } | null;
    if (datos?.presentes) setPorRecurso(datos.presentes);
  }, [yo]);
  // Y los cambios, al instante. Un recurso sin nadie se quita
  useTiempoReal((evento) => {
    if (evento.tipo !== 'admin:presencia') return;
    setPorRecurso((previo) => {
      const siguiente = { ...previo };
      if (evento.editores.length > 0) siguiente[evento.recurso] = evento.editores;
      else delete siguiente[evento.recurso];
      return siguiente;
    });
  }, {
    onReconectar: () => {
      void fetch('/api/admin/presencia?todos=1', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { presentes?: PorRecurso } | null) => { if (d?.presentes) setPorRecurso(d.presentes); })
        .catch(() => undefined);
    },
  });

  const entradas = useMemo(() => agrupar(porRecurso, yo), [porRecurso, yo]);

  // Corre solo si el texto no cabe en la franja
  const banda = useRef<HTMLDivElement>(null);
  const copia = useRef<HTMLDivElement>(null);
  const [corre, setCorre] = useState(false);
  const [duracion, setDuracion] = useState(30);
  const [pausada, setPausada] = useState(false);
  const clave = entradas.map(enTexto).join('|');
  useEffect(() => {
    // El observador avisa al empezar a mirar y cada vez que cambia el ancho de la franja o del texto
    const medir = () => {
      if (!banda.current || !copia.current) return;
      const ancho = copia.current.scrollWidth;
      setCorre(ancho > banda.current.clientWidth);
      setDuracion(Math.max(12, Math.round(ancho / VELOCIDAD)));
    };
    const observador = new ResizeObserver(medir);
    if (banda.current) observador.observe(banda.current);
    if (copia.current) observador.observe(copia.current);
    return () => observador.disconnect();
  }, [clave]);

  if (entradas.length === 0) return null;

  return (
    <div
      ref={banda}
      role="region"
      aria-label={`Equipo conectado: ${entradas.map(enTexto).join('. ')}`}
      data-pausada={pausada}
      onTouchStart={() => setPausada((v) => !v)}
      className="marquesina-banda sticky top-16 z-[var(--z-sticky)] flex h-8 items-center overflow-hidden border-b border-brand-200 bg-brand-50 text-xs text-brand-700"
    >
      <div className="marquesina-pista flex w-max items-center whitespace-nowrap" data-corre={corre} style={{ '--marquesina-duracion': `${duracion}s` } as CSSProperties}>
        <div ref={copia} className="flex shrink-0 items-center gap-6 px-4">{entradas.map((e) => <Persona key={e.id} e={e} enlaces />)}</div>
        {/* La segunda copia cierra el bucle sin salto; para lectores de pantalla no existe */}
        {corre && <div className="marquesina-copia flex shrink-0 items-center gap-6 px-4" aria-hidden="true">{entradas.map((e) => <Persona key={e.id} e={e} enlaces={false} />)}</div>}
      </div>
    </div>
  );
}
