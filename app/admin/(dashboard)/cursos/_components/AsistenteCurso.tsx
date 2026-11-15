'use client';

// C-249e: crear o cambiar un curso en su propia página, por pasos (PLAN.md §1.9, la A que eligió el equipo el 15/11): qué
// es, para quién, el precio y la portada, el temario y "Revisar y publicar", con la tarjeta de /cursos al lado. Antes era
// una ventana con dos pestañas (Información y Currículum); lo que tenía sigue aquí, campo por campo.
// - La miniatura se sube (antes se pegaba su dirección), con la pieza de la foto del sorteo (/api/upload/settings, 'curso').
// - Cada paso dice qué le falta con las reglas del servidor (lib/validations/creator-course.ts).
// - Al cambiar uno, antes → después y a cuántos inscritos toca. Las APIs (/api/admin/courses) no cambian.

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Asistente, { Afecta, Campo, ElegirPublicar, FilaResumen, ListaCambios, VistaPrevia, type CambioCampo, type PasoAsistente } from '@/components/admin/Asistente';
import CampoUnidad from '@/components/admin/CampoUnidad';
import Opcion from '@/components/admin/Opcion';
import SubirFoto from '@/components/admin/SubirFoto';
import CourseCard from '@/components/cursos/CourseCard';
import {
  IconoBillete, IconoCerrar, IconoClientes, IconoCursos, IconoEstrella, IconoFlechaAbajo, IconoFlechaArriba, IconoGuardar, IconoLista,
  IconoMas, IconoObjetivo, IconoOcultar, IconoVer, IconoWeb, type IconType,
} from '@/components/iconos';
import { adminHint, adminIconButton, adminInput, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { iguales } from '@/lib/edicion/combinar';

interface Leccion { id?: string; title: string; description: string; videoUrl: string; duration: string; isFree: boolean }
interface Modulo { id?: string; title: string; lessons: Leccion[] }

export interface CursoPanel {
  id: string; slug: string; title: string; shortDesc: string; description: string; category: string; level: string; instructor: string;
  priceUSD: number; thumbnail: string; trailerUrl: string; isFeatured: boolean; isActive: boolean; metaTitle: string; metaDescription: string;
  creador: string | null; rating: number | null; enrollmentCount: number; totalDuration: number | null; inscritos: number; resenas: number;
  modulos: Modulo[];
}

interface Formulario { title: string; shortDesc: string; description: string; category: string; level: string; instructor: string; priceUSD: string; thumbnail: string; trailerUrl: string; isFeatured: boolean }

// Las mismas de la tienda (app/cursos)
const CATEGORIAS = [
  { value: 'DESARROLLO', label: 'Desarrollo' }, { value: 'REDES', label: 'Redes' }, { value: 'ELECTRONICA', label: 'Electrónica' },
  { value: 'GAMING', label: 'Gaming' }, { value: 'SEGURIDAD', label: 'Seguridad' }, { value: 'NEGOCIOS', label: 'Negocios' },
];
const NIVELES = [{ value: 'PRINCIPIANTE', label: 'Principiante' }, { value: 'INTERMEDIO', label: 'Intermedio' }, { value: 'AVANZADO', label: 'Avanzado' }];

const PASOS: { titulo: string; queHacer: string; icono: IconType }[] = [
  { titulo: 'Qué es', queHacer: 'El título y lo que se aprende.', icono: IconoCursos },
  { titulo: 'Para quién', queHacer: 'La categoría, el nivel y quién lo enseña.', icono: IconoObjetivo },
  { titulo: 'Precio y portada', queHacer: 'Cuánto cuesta, la miniatura y el tráiler.', icono: IconoBillete },
  { titulo: 'El temario', queHacer: 'Los módulos y sus lecciones, en orden.', icono: IconoLista },
  { titulo: 'Revisar y publicar', queHacer: 'Mira cómo queda antes de guardarlo.', icono: IconoVer },
];
const ULTIMO = PASOS.length - 1;
const LISTA = '/admin/cursos';

// lib/validations/creator-course.ts (no se importa aquí: el cliente no lleva zod del servidor)
const enlaceValido = (v: string) => { const t = v.trim(); return t === '' || (t.length <= 500 && (/^https?:\/\/[^\s]+$/i.test(t) || /^\/(?!\/)[^\s]*$/.test(t))); };
const numero = (v: string) => { if (!v.trim()) return null; const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : null; };

const formularioDe = (c: CursoPanel | null): Formulario => ({
  title: c?.title ?? '', shortDesc: c?.shortDesc ?? '', description: c?.description ?? '', category: c?.category ?? '', level: c?.level ?? '',
  instructor: c?.instructor ?? '', priceUSD: c ? String(c.priceUSD) : '', thumbnail: c?.thumbnail ?? '', trailerUrl: c?.trailerUrl ?? '', isFeatured: c?.isFeatured ?? false,
});
const etiquetaDe = (lista: { value: string; label: string }[], v: string) => lista.find((x) => x.value === v)?.label ?? 'Sin elegir';
const contarLecciones = (m: Modulo[]) => m.reduce((s, x) => s + x.lessons.length, 0);

export default function AsistenteCurso({ curso }: { curso: CursoPanel | null }) {
  const router = useRouter();
  const editar = Boolean(curso);
  const [inicial] = useState<Formulario>(() => formularioDe(curso));
  const [form, setForm] = useState<Formulario>(inicial);
  const [temario, setTemario] = useState<Modulo[]>(() => curso?.modulos ?? []);
  const [publicar, setPublicar] = useState(curso ? curso.isActive : true);
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const enRevision = Boolean(curso && !curso.isActive && curso.creador);

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setForm((f) => ({ ...f, [k]: v }));

  // ---------- el temario
  const cambiarModulo = (i: number, cambios: Partial<Modulo>) => setTemario((t) => t.map((m, j) => (j === i ? { ...m, ...cambios } : m)));
  const moverModulo = (i: number, d: number) => setTemario((t) => {
    const n = [...t]; const k = i + d;
    if (k < 0 || k >= n.length) return t;
    [n[i], n[k]] = [n[k], n[i]];
    return n;
  });
  const cambiarLeccion = (i: number, j: number, cambios: Partial<Leccion>) =>
    setTemario((t) => t.map((m, a) => (a === i ? { ...m, lessons: m.lessons.map((l, b) => (b === j ? { ...l, ...cambios } : l)) } : m)));
  const agregarLeccion = (i: number) => setTemario((t) => t.map((m, a) => (a === i ? { ...m, lessons: [...m.lessons, { title: '', description: '', videoUrl: '', duration: '', isFree: false }] } : m)));
  const quitarLeccion = (i: number, j: number) => setTemario((t) => t.map((m, a) => (a === i ? { ...m, lessons: m.lessons.filter((_, b) => b !== j) } : m)));

  // ---------- lo que le falta a cada paso (las reglas del servidor)
  const problemaDe = (i: number): string | null => {
    if (i === 0) {
      if (form.title.trim().length < 3) return 'Falta el título (3 letras o más).';
      if (form.description.trim().length < 10) return 'Falta la descripción completa (10 letras o más).';
      return null;
    }
    if (i === 2) {
      const p = numero(form.priceUSD);
      if (p === null || p < 0 || p > 10000) return 'El precio va de $0 (gratis) a $10.000.';
      if (!enlaceValido(form.trailerUrl)) return 'El enlace del tráiler no es válido: usa https://…';
      return null;
    }
    if (i === 3) {
      for (let a = 0; a < temario.length; a++) {
        if (!temario[a].title.trim()) return `Al módulo ${a + 1} le falta el nombre.`;
        for (let b = 0; b < temario[a].lessons.length; b++) {
          const l = temario[a].lessons[b];
          if (!l.title.trim()) return `A la lección ${b + 1} del módulo ${a + 1} le falta el título.`;
          if (!enlaceValido(l.videoUrl)) return `El video de la lección ${b + 1} del módulo ${a + 1} no es un enlace válido.`;
          if (l.duration.trim() && !/^\d{1,6}$/.test(l.duration.trim())) return `La duración de la lección ${b + 1} del módulo ${a + 1} va en segundos, sin decimales.`;
        }
      }
      return null;
    }
    return null;
  };

  const volverALaLista = () => { router.push(LISTA); router.refresh(); };

  const cuerpo = () => ({
    title: form.title.trim(), shortDesc: form.shortDesc.trim(), description: form.description.trim(), category: form.category, level: form.level,
    instructor: form.instructor.trim(), priceUSD: numero(form.priceUSD) ?? 0, thumbnail: form.thumbnail, trailerUrl: form.trailerUrl.trim(),
    isFeatured: form.isFeatured, isActive: publicar,
    // Lo que no se ve aquí se devuelve como estaba (antes también)
    metaTitle: curso?.metaTitle ?? '', metaDescription: curso?.metaDescription ?? '',
  });
  // El orden de cada módulo y lección es el de la lista
  const temarioParaGuardar = () => temario.map((m, i) => ({
    ...(m.id ? { id: m.id } : {}), title: m.title.trim(), order: i,
    lessons: m.lessons.map((l, j) => ({ ...(l.id ? { id: l.id } : {}), title: l.title.trim(), description: l.description || null, videoUrl: l.videoUrl.trim(), duration: l.duration.trim(), isFree: l.isFree, order: j })),
  }));

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch(curso ? `/api/admin/courses/${curso.id}` : '/api/admin/courses', {
        method: curso ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo()),
      });
      const guardado = await res.json().catch(() => null);
      if (!res.ok) { toast.error(guardado?.error || 'Error al guardar el curso'); return; }
      const id = curso?.id ?? guardado.id;
      // El temario va aparte, como antes. Al cambiar uno que tenía módulos, también vacío (antes no se podía quitar el último)
      if (temario.length > 0 || (curso && curso.modulos.length > 0)) {
        if (!iguales(temario, curso?.modulos ?? [])) {
          const r = await fetch(`/api/admin/courses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ curriculum: temarioParaGuardar() }) });
          if (!r.ok) {
            const d = await r.json().catch(() => null);
            toast.error(d?.error || 'El curso se guardó, pero el temario no');
            volverALaLista();
            return;
          }
        }
      }
      toast.success(curso ? 'Cambios guardados' : publicar ? 'Curso publicado' : 'Curso guardado sin publicar');
      volverALaLista();
    } catch {
      toast.error('Error al guardar el curso');
    } finally {
      setGuardando(false);
    }
  };

  // ---------- antes → después y a cuántos inscritos toca
  const lecciones = contarLecciones(temario);
  const antesLecciones = contarLecciones(curso?.modulos ?? []);
  const filas: { campo: keyof Formulario; nombre: string; ver: (f: Formulario) => string }[] = [
    { campo: 'title', nombre: 'Título', ver: (f) => f.title.trim() },
    { campo: 'shortDesc', nombre: 'Descripción corta', ver: (f) => f.shortDesc.trim() || 'Sin descripción corta' },
    { campo: 'description', nombre: 'Descripción', ver: (f) => (f.description.trim().length > 60 ? `${f.description.trim().slice(0, 60)}…` : f.description.trim()) },
    { campo: 'category', nombre: 'Categoría', ver: (f) => etiquetaDe(CATEGORIAS, f.category) },
    { campo: 'level', nombre: 'Nivel', ver: (f) => etiquetaDe(NIVELES, f.level) },
    { campo: 'instructor', nombre: 'Instructor', ver: (f) => f.instructor.trim() || 'Sin instructor' },
    { campo: 'priceUSD', nombre: 'Precio', ver: (f) => { const p = numero(f.priceUSD) ?? 0; return p === 0 ? 'Gratis' : formatUSD(p); } },
    { campo: 'thumbnail', nombre: 'Miniatura', ver: (f) => (f.thumbnail ? 'Con miniatura' : 'Sin miniatura') },
    { campo: 'trailerUrl', nombre: 'Tráiler', ver: (f) => f.trailerUrl.trim() || 'Sin tráiler' },
    { campo: 'isFeatured', nombre: 'Destacado', ver: (f) => (f.isFeatured ? 'Sí' : 'No') },
  ];
  const igual = (k: keyof Formulario) => (k === 'priceUSD' ? numero(form.priceUSD) === numero(inicial.priceUSD) : k === 'thumbnail' ? form.thumbnail === inicial.thumbnail : typeof form[k] === 'string' ? String(form[k]).trim() === String(inicial[k]).trim() : form[k] === inicial[k]);
  const cambios: CambioCampo[] = curso ? [
    ...filas.filter((f) => !igual(f.campo)).map((f) => ({ campo: f.campo, nombre: f.nombre, antes: f.ver(inicial), despues: f.ver(form) })),
    ...(!iguales(temario, curso.modulos) ? [{ campo: 'temario', nombre: 'Temario', antes: `${curso.modulos.length} módulos, ${antesLecciones} lecciones`, despues: `${temario.length} módulos, ${lecciones} lecciones` }] : []),
    ...(publicar !== curso.isActive ? [{ campo: 'isActive', nombre: 'En /cursos', antes: curso.isActive ? 'Publicado' : enRevision ? 'En revisión' : 'Sin publicar', despues: publicar ? 'Publicado' : 'Sin publicar' }] : []),
  ] : [];

  const filasAfecta = (): { icono: IconType; texto: ReactNode }[] => {
    if (!curso) return [];
    const n = curso.inscritos;
    const lista: { icono: IconType; texto: ReactNode }[] = [];
    if (cambios.some((c) => c.campo === 'priceUSD')) lista.push({ icono: IconoBillete, texto: <>Tiene <strong>{n} {n === 1 ? 'inscrito' : 'inscritos'}</strong>: el precio nuevo vale para quienes se inscriban desde ahora.</> });
    const quitadas = (curso.modulos ?? []).flatMap((m) => m.lessons).filter((l) => l.id && !temario.some((m) => m.lessons.some((x) => x.id === l.id))).length;
    if (quitadas > 0) lista.push({ icono: IconoLista, texto: <>Quitas <strong>{quitadas} {quitadas === 1 ? 'lección' : 'lecciones'}</strong>: se borran del curso, también para {n === 1 ? 'el inscrito' : `los ${n} inscritos`}.</> });
    else if (cambios.some((c) => c.campo === 'temario')) lista.push({ icono: IconoLista, texto: `El temario cambia para ${n === 1 ? 'el inscrito' : `los ${n} inscritos`}.` });
    if (publicar !== curso.isActive) {
      lista.push(publicar
        ? { icono: IconoWeb, texto: enRevision ? <>Se aprueba y se publica: a <strong>{curso.creador}</strong> le llega el aviso en su panel y por correo.</> : 'Se ve en /cursos desde que guardes.' }
        : { icono: IconoOcultar, texto: 'Deja de verse en /cursos.' });
    }
    if (cambios.some((c) => c.campo === 'title')) lista.push({ icono: IconoWeb, texto: `La dirección /cursos/${curso.slug} no cambia.` });
    if (lista.length === 0 && cambios.length > 0) lista.push({ icono: IconoClientes, texto: <>Tiene {n} {n === 1 ? 'inscrito' : 'inscritos'} y {curso.resenas} {curso.resenas === 1 ? 'reseña' : 'reseñas'}: ven el cambio al entrar.</> });
    return lista;
  };

  // ---------- la vista previa: la tarjeta de /cursos
  const vistaPrevia = (
    <VistaPrevia rotulo="Así se ve en /cursos" nota={publicar ? 'En el catálogo de cursos y, si es destacado, arriba.' : 'Sin publicar: todavía no se ve en la tienda.'}>
      <div className="mx-auto w-full max-w-[18rem]">
        <CourseCard compartir={false} course={{
          id: curso?.id ?? 'nuevo', title: form.title.trim() || 'Título del curso', slug: curso?.slug ?? 'nuevo', shortDesc: form.shortDesc.trim() || null,
          thumbnail: form.thumbnail || null, category: form.category || null, level: form.level || null, priceUSD: numero(form.priceUSD) ?? 0,
          rating: curso?.rating ?? null, enrollmentCount: curso?.enrollmentCount ?? 0, totalLessons: lecciones || null, totalDuration: curso?.totalDuration ?? null,
          isFeatured: form.isFeatured, instructor: form.instructor.trim() || null, creator: curso?.creador ? { displayName: curso.creador } : null,
        }} />
      </div>
    </VistaPrevia>
  );

  const pasos: PasoAsistente[] = PASOS.map((p, i) => ({
    ...p,
    problema: i < ULTIMO ? problemaDe(i) : null,
    resumen: i === 0 ? (form.title.trim() || 'Falta el título')
      : i === 1 ? [form.category ? etiquetaDe(CATEGORIAS, form.category) : '', form.level ? etiquetaDe(NIVELES, form.level) : ''].filter(Boolean).join(' · ') || 'Opcional'
        : i === 2 ? (numero(form.priceUSD) === 0 ? 'Gratis' : numero(form.priceUSD) !== null ? formatUSD(numero(form.priceUSD) ?? 0) : 'Falta el precio')
          : i === 3 ? `${temario.length} ${temario.length === 1 ? 'módulo' : 'módulos'} · ${lecciones} ${lecciones === 1 ? 'lección' : 'lecciones'}`
            : curso ? `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}` : 'Vista previa',
  }));
  const sinCambios = editar && cambios.length === 0;

  return (
    <Asistente
      titulo={curso ? `Cambiar: ${curso.title}` : 'Nuevo curso'}
      subtitulo={curso ? `Curso · ${curso.isActive ? 'Publicado' : enRevision ? `En revisión (de ${curso.creador})` : 'Sin publicar'}` : 'Paso a paso, con la tarjeta de /cursos al lado.'}
      icono={IconoCursos}
      volver={{ href: LISTA, texto: 'Cursos' }}
      etiqueta="Pasos del curso"
      pasos={pasos}
      paso={paso}
      onPaso={setPaso}
      editar={editar}
      final={{
        contenido: guardando ? 'Guardando…' : <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> {curso ? 'Guardar el cambio' : publicar ? 'Publicar el curso' : 'Guardar sin publicar'}</>,
        onClick: () => void guardar(),
        deshabilitado: guardando || sinCambios,
        motivo: sinCambios ? 'No hay cambios que guardar.' : null,
      }}
      vistaPrevia={vistaPrevia}
    >
      {paso === 0 && (
        <div className="space-y-5">
          <Campo etiqueta="Título" id="curso-titulo">
            <input id="curso-titulo" value={form.title} maxLength={150} onChange={(e) => set('title', e.target.value)} placeholder="Redes desde cero" className={adminInput()} />
          </Campo>
          <Campo etiqueta="Descripción corta (opcional)" id="curso-corta" pista="Una o dos líneas, para la tarjeta.">
            <input id="curso-corta" value={form.shortDesc} maxLength={300} onChange={(e) => set('shortDesc', e.target.value)} placeholder="Arma y configura la red de tu casa o tu negocio" className={adminInput()} />
          </Campo>
          <Campo etiqueta="Descripción completa" id="curso-descripcion" pista="Lo que se aprende, para la página del curso.">
            <textarea id="curso-descripcion" value={form.description} rows={5} maxLength={20000} onChange={(e) => set('description', e.target.value)} placeholder="Describe el curso en detalle…" className={`${adminInput()} h-auto py-2.5`} />
          </Campo>
        </div>
      )}

      {paso === 1 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Categoría</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría">
              {[{ value: '', label: 'Ninguna' }, ...CATEGORIAS].map((c) => (
                <Opcion key={c.value || 'ninguna'} tamano="chica" role="radio" aria-checked={form.category === c.value} elegida={form.category === c.value} onClick={() => set('category', c.value)} titulo={c.label} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Nivel</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Nivel">
              {[{ value: '', label: 'Sin nivel' }, ...NIVELES].map((l) => (
                <Opcion key={l.value || 'ninguno'} tamano="chica" role="radio" aria-checked={form.level === l.value} elegida={form.level === l.value} onClick={() => set('level', l.value)} titulo={l.label} />
              ))}
            </div>
          </fieldset>
          <Campo etiqueta="Instructor (opcional)" id="curso-instructor" pista={curso?.creador ? `Es de un creador (${curso.creador}): en la tienda sale su nombre.` : 'Si lo dejas vacío, sale "ElectroShop".'}>
            <input id="curso-instructor" value={form.instructor} maxLength={120} onChange={(e) => set('instructor', e.target.value)} placeholder="Nombre del instructor" className={`${adminInput()} sm:max-w-sm`} />
          </Campo>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-5">
          <Campo etiqueta="Precio" id="curso-precio" pista="0 es gratis.">
            <CampoUnidad id="curso-precio" unidad="$" inputMode="decimal" value={form.priceUSD} onChange={(e) => set('priceUSD', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" />
          </Campo>
          <SubirFoto nombre="curso-miniatura" etiqueta="Miniatura" tipo="curso" url={form.thumbnail} onCambiar={(u) => set('thumbnail', u)} conFoto="Así sale en la tarjeta" pista="JPG, PNG o WEBP, hasta 5 MB. Mejor apaisada (16:9)." />
          <Campo etiqueta="Tráiler (opcional)" id="curso-trailer" pista="Un video de YouTube o Vimeo, sin listar.">
            <input id="curso-trailer" value={form.trailerUrl} onChange={(e) => set('trailerUrl', e.target.value)} placeholder="https://youtube.com/watch?v=…" className={`${adminInput()} sm:max-w-lg`} />
          </Campo>
          <Opcion aria-pressed={form.isFeatured} elegida={form.isFeatured} onClick={() => set('isFeatured', !form.isFeatured)} icono={IconoEstrella}
            titulo="Destacado" detalle="Sale arriba en /cursos, con su estrella." className="sm:max-w-sm" />
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4">
          {temario.length === 0 && <p className="rounded-xl border-2 border-dashed border-line-strong py-8 text-center text-sm text-muted">Aún no hay módulos. Agrega el primero.</p>}
          <ol className="space-y-4">
            {temario.map((m, i) => (
              <li key={m.id ?? `nuevo-${i}`} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-xs font-bold text-muted">{i + 1}.</span>
                  <input aria-label={`Nombre del módulo ${i + 1}`} value={m.title} maxLength={200} onChange={(e) => cambiarModulo(i, { title: e.target.value })} placeholder="Nombre del módulo" className={`${adminInput()} min-w-0 flex-1`} />
                  <button type="button" onClick={() => moverModulo(i, -1)} disabled={i === 0} className={adminIconButton} aria-label="Subir módulo"><IconoFlechaArriba className="h-4 w-4" /></button>
                  <button type="button" onClick={() => moverModulo(i, 1)} disabled={i === temario.length - 1} className={adminIconButton} aria-label="Bajar módulo"><IconoFlechaAbajo className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setTemario((t) => t.filter((_, j) => j !== i))} className={`${adminIconButton} hover:text-deal`} aria-label={`Quitar el módulo ${i + 1}`}><IconoCerrar className="h-4 w-4" /></button>
                </div>
                <ul className="ml-8 mt-3 space-y-3">
                  {m.lessons.map((l, j) => (
                    <li key={l.id ?? `nueva-${j}`} className="space-y-2 border-l-2 border-line pl-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 shrink-0 text-xs text-muted">{j + 1}.</span>
                        <input aria-label={`Título de la lección ${j + 1}`} value={l.title} maxLength={200} onChange={(e) => cambiarLeccion(i, j, { title: e.target.value })} placeholder="Título de la lección" className={`${adminInput()} min-w-0 flex-1`} />
                        <button type="button" onClick={() => quitarLeccion(i, j)} className={`${adminIconButton} hover:text-deal`} aria-label={`Quitar la lección ${j + 1}`}><IconoCerrar className="h-4 w-4" /></button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-7">
                        <input aria-label={`Video de la lección ${j + 1}`} value={l.videoUrl} onChange={(e) => cambiarLeccion(i, j, { videoUrl: e.target.value })} placeholder="Video de YouTube o Vimeo (sin listar)" className={`${adminInput()} min-w-0 flex-1 basis-56`} />
                        <CampoUnidad aria-label={`Duración de la lección ${j + 1}, en segundos`} unidad="seg" inputMode="numeric" value={l.duration} onChange={(e) => cambiarLeccion(i, j, { duration: e.target.value.replace(/\D/g, '') })} placeholder="Duración" />
                        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-soft">
                          <input type="checkbox" checked={l.isFree} onChange={(e) => cambiarLeccion(i, j, { isFree: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                          Gratis (de muestra)
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => agregarLeccion(i)} className="ml-8 mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
                  <IconoMas className="h-4 w-4" aria-hidden="true" /> Lección
                </button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setTemario((t) => [...t, { title: `Módulo ${t.length + 1}`, lessons: [] }])} className={adminSecondaryButton}>
            <IconoMas className="h-4 w-4" aria-hidden="true" /> Agregar un módulo
          </button>
          <p className={adminHint}>{temario.length} {temario.length === 1 ? 'módulo' : 'módulos'} · {lecciones} {lecciones === 1 ? 'lección' : 'lecciones'}. Una lección gratis se ve sin comprar el curso.</p>
        </div>
      )}

      {paso === ULTIMO && (
        <div className="space-y-4">
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            <FilaResumen icono={IconoCursos} titulo={form.title.trim()} detalle={form.shortDesc.trim() || 'Sin descripción corta'} onCambiar={() => setPaso(0)} />
            <FilaResumen icono={IconoObjetivo} titulo={`${etiquetaDe(CATEGORIAS, form.category)} · ${etiquetaDe(NIVELES, form.level)}`} detalle={form.instructor.trim() || curso?.creador || 'ElectroShop'} onCambiar={() => setPaso(1)} />
            <FilaResumen icono={IconoBillete} titulo={numero(form.priceUSD) === 0 ? 'Gratis' : formatUSD(numero(form.priceUSD) ?? 0)} detalle={[form.thumbnail ? 'Con miniatura' : 'Sin miniatura', form.trailerUrl.trim() ? 'con tráiler' : 'sin tráiler', form.isFeatured ? 'destacado' : ''].filter(Boolean).join(' · ')} onCambiar={() => setPaso(2)} />
            <FilaResumen icono={IconoLista} titulo={`${temario.length} ${temario.length === 1 ? 'módulo' : 'módulos'} · ${lecciones} ${lecciones === 1 ? 'lección' : 'lecciones'}`} detalle={temario.map((m) => m.title.trim()).filter(Boolean).join(', ') || 'Sin temario todavía'} onCambiar={() => setPaso(3)} />
          </ul>
          <ElegirPublicar name="curso-publicar" publicar={publicar} onCambiar={setPublicar}
            ya={{ titulo: enRevision ? 'Aprobarlo y publicarlo' : curso?.isActive ? 'Publicado' : 'Publicarlo ya', detalle: enRevision ? 'Se ve en /cursos y se le avisa al creador.' : 'Se ve en /cursos.', icono: IconoWeb }}
            sin={{ titulo: curso ? (enRevision ? 'Dejarlo en revisión' : 'Sin publicar') : 'Guardarlo sin publicar', detalle: 'No se ve en la tienda; lo publicas después desde la lista.', icono: IconoOcultar }} />
          {curso && (
            <ListaCambios cambios={cambios}>
              {cambios.length > 0 && <Afecta cargando={false} filas={filasAfecta()} />}
            </ListaCambios>
          )}
        </div>
      )}
    </Asistente>
  );
}
