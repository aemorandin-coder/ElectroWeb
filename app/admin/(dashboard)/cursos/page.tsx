'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { hasPermission } from '@/lib/auth-helpers';
import {
  adminBadge, adminCardFlush, adminIconButton, adminPageHeader, adminPageSubtitle, adminPageTitle,
  adminPrimaryButton, adminSecondaryButton, adminSpinner, adminSuccessButton, adminTab, adminTabList, adminTabScroll,
} from '@/lib/admin-ui';
import { formatRating, formatUSD } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import {
  IconoCandado, IconoCircuito, IconoClientes, IconoCursos, IconoEliminar, IconoEstrella, IconoEstrellaLlena,
  IconoMaletin, IconoMas, IconoRouter, IconoSoftware, IconoVideojuegos, type IconType,
} from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';
import CreadoresPanel from './_components/CreadoresPanel';

const ICONO_CATEGORIA: Record<string, IconType> = {
  DESARROLLO: IconoSoftware,
  REDES: IconoRouter,
  ELECTRONICA: IconoCircuito,
  GAMING: IconoVideojuegos,
  SEGURIDAD: IconoCandado,
  NEGOCIOS: IconoMaletin,
};

const CATEGORIES = [
  { value: 'DESARROLLO', label: 'Desarrollo' },
  { value: 'REDES', label: 'Redes' },
  { value: 'ELECTRONICA', label: 'Electrónica' },
  { value: 'GAMING', label: 'Gaming' },
  { value: 'SEGURIDAD', label: 'Seguridad' },
  { value: 'NEGOCIOS', label: 'Negocios' },
];

type Course = {
  id: string;
  title: string;
  slug: string;
  shortDesc?: string;
  description: string;
  trailerUrl?: string;
  category?: string;
  level?: string;
  instructor?: string;
  priceUSD: number;
  thumbnail?: string;
  isFeatured: boolean;
  isActive: boolean;
  enrollmentCount: number;
  rating?: number;
  metaTitle?: string;
  metaDescription?: string;
  creator?: { displayName: string } | null;
  _count?: { enrollments: number; reviews: number; modules: number };
};

const enRevision = (course: Course) => !course.isActive && Boolean(course.creator);

export default function AdminCursosPage() {
  const { data: session } = useSession();
  const puedeCursos = hasPermission(session, 'MANAGE_CONTENT');
  const puedeCreadores = hasPermission(session, 'MANAGE_USERS');

  const { confirm } = useConfirm();
  const [vista, setVista] = useState<'cursos' | 'creadores'>('cursos');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('');

  useEffect(() => {
    const leerVista = () => {
      const p = new URLSearchParams(window.location.search).get('vista');
      if (p === 'creadores' && puedeCreadores) setVista('creadores');
      else if (!puedeCursos && puedeCreadores) setVista('creadores');
      else setVista('cursos');
    };
    const t = window.setTimeout(leerVista, 0);
    window.addEventListener('popstate', leerVista);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('popstate', leerVista);
    };
  }, [puedeCursos, puedeCreadores]);

  const cambiarVista = (next: 'cursos' | 'creadores') => {
    setVista(next);
    const url = new URL(window.location.href);
    if (next === 'creadores') url.searchParams.set('vista', 'creadores');
    else url.searchParams.delete('vista');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  async function loadCourses() {
    if (!puedeCursos) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/courses');
      if (res.ok) setCourses(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useCargarAlMontar(loadCourses, [puedeCursos]);

  async function handleToggle(course: Course) {
    const res = await fetch(`/api/admin/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !course.isActive }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error || 'No se pudo actualizar el curso');
      return;
    }
    toast.success(course.isActive ? 'Curso desactivado' : enRevision(course) ? 'Curso aprobado y publicado' : 'Curso activado');
    loadCourses();
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Eliminar curso',
      message: '¿Eliminar este curso? Se perderán todos los módulos e inscripciones.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
      loadCourses();
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = filterCat ? courses.filter((c) => c.category === filterCat) : courses;

  return (
    <div className="min-w-0 space-y-5">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Cursos y Creadores</h1>
          <p className={adminPageSubtitle}>
            {vista === 'creadores'
              ? 'Solicitudes y perfiles de instructores de la academia.'
              : `${courses.length} cursos publicados y en revisión.`}
          </p>
        </div>
        {vista === 'cursos' && puedeCursos && (
          <Link href="/admin/cursos/nuevo" className={adminPrimaryButton}>
            <IconoMas className="h-4 w-4" aria-hidden="true" />
            Nuevo Curso
          </Link>
        )}
      </div>

      {puedeCursos && puedeCreadores && (
        <div className={adminTabScroll}>
          <div className={adminTabList} role="tablist" aria-label="Academia">
            <button
              type="button"
              role="tab"
              aria-selected={vista === 'cursos'}
              onClick={() => cambiarVista('cursos')}
              className={adminTab(vista === 'cursos')}
            >
              <IconoCursos className="h-4 w-4" aria-hidden="true" />
              Cursos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={vista === 'creadores'}
              onClick={() => cambiarVista('creadores')}
              className={adminTab(vista === 'creadores')}
            >
              <IconoClientes className="h-4 w-4" aria-hidden="true" />
              Creadores
            </button>
          </div>
        </div>
      )}

      {vista === 'creadores' && puedeCreadores ? (
        <CreadoresPanel />
      ) : (
        <>
          <Filtros
            etiqueta="Filtrar por categoría"
            valor={filterCat}
            onCambiar={setFilterCat}
            filtros={[
              { valor: '', etiqueta: 'Todos', ayuda: 'Todos los cursos', Icono: IconoCursos, cuenta: courses.length },
              ...CATEGORIES.map((cat) => ({
                valor: cat.value,
                etiqueta: cat.label,
                ayuda: `Cursos de ${cat.label.toLowerCase()}`,
                Icono: ICONO_CATEGORIA[cat.value] ?? IconoCursos,
                cuenta: courses.filter((c) => c.category === cat.value).length,
              })),
            ]}
          />

          {loading ? (
            <div className="flex justify-center py-16">
              <span className={adminSpinner} aria-label="Cargando cursos" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <IconoCursos className="mx-auto mb-3 h-12 w-12 text-muted" aria-hidden="true" />
              <p className="text-sm text-muted">No hay cursos aún. ¡Crea el primero!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((course) => (
                <div key={course.id} className={`${adminCardFlush} flex flex-col transition-colors hover:border-brand-300`}>
                  <div className="relative h-40 bg-brand-50">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <IconoCursos className="h-12 w-12 text-brand-500/30" aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex gap-1">
                      {course.category && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-soft ring-1 ring-inset ring-line">
                          {CATEGORIES.find((c) => c.value === course.category)?.label}
                        </span>
                      )}
                      {course.isFeatured && (
                        <span className={adminBadge('brand')}>
                          <IconoEstrella lleno className="h-3 w-3 shrink-0" aria-hidden="true" />
                          Destacado
                        </span>
                      )}
                    </div>
                    <div className="absolute right-2 top-2">
                      <span className={adminBadge(course.isActive ? 'success' : enRevision(course) ? 'warning' : 'neutral')}>
                        {course.isActive ? 'Activo' : enRevision(course) ? 'En revisión' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-ink">{course.title}</h3>
                    {course.creator && <p className="mb-1 text-xs text-muted">Creador: {course.creator.displayName}</p>}
                    {course.shortDesc && <p className="mb-2 line-clamp-2 text-xs text-muted">{course.shortDesc}</p>}
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs tabular-nums text-muted">
                      <span className="font-semibold text-ink">{formatUSD(Number(course.priceUSD))}</span>
                      <span>{course._count?.enrollments ?? course.enrollmentCount} inscritos</span>
                      <span>{course._count?.modules ?? 0} módulos</span>
                      {course.rating && (
                        <span className="inline-flex items-center gap-1">
                          <IconoEstrellaLlena className="h-3 w-3 shrink-0 text-warning" aria-hidden="true" />
                          {formatRating(course.rating)}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center gap-2">
                      <Link href={`/admin/cursos/${course.id}`} className={`${adminSecondaryButton} flex-1 px-3!`}>
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggle(course)}
                        className={`${course.isActive ? adminSecondaryButton : enRevision(course) ? adminSuccessButton : adminPrimaryButton} flex-1 px-3!`}
                      >
                        {course.isActive ? 'Desactivar' : enRevision(course) ? 'Aprobar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(course.id)}
                        disabled={deletingId === course.id}
                        aria-label={`Eliminar ${course.title}`}
                        className={`${adminIconButton} h-11 w-11 text-deal hover:bg-deal-bg`}
                      >
                        <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
