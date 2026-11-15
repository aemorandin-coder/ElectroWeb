'use client';

// Cursos del panel. C-249e: crear o cambiar uno va por pasos en su propia página (/admin/cursos/nuevo y /admin/cursos/<id>,
// PLAN.md §1.9); "Nuevo curso" y "Editar" llevan ahí. Aquí quedan la lista, los filtros, activar o aprobar y eliminar.

import Link from 'next/link';
import { adminBadge, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';

import { useConfirm } from '@/contexts/ConfirmDialogContext';

import { useState } from 'react';
import {
  IconoCandado, IconoCircuito, IconoCursos, IconoEliminar, IconoEstrella, IconoEstrellaLlena, IconoMaletin, IconoMas, IconoRouter,
  IconoSoftware, IconoVideojuegos, type IconType,
} from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';

/** C-249: el ícono de cada categoría en su píldora de filtro (§1.7) */
const ICONO_CATEGORIA: Record<string, IconType> = {
  DESARROLLO: IconoSoftware, REDES: IconoRouter, ELECTRONICA: IconoCircuito, GAMING: IconoVideojuegos, SEGURIDAD: IconoCandado, NEGOCIOS: IconoMaletin,
};
import { toast } from 'react-hot-toast';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { formatRating } from '@/lib/currency';

const CATEGORIES = [
  { value: 'DESARROLLO', label: 'Desarrollo' },
  { value: 'REDES', label: 'Redes' },
  { value: 'ELECTRONICA', label: 'Electrónica' },
  { value: 'GAMING', label: 'Gaming' },
  { value: 'SEGURIDAD', label: 'Seguridad' },
  { value: 'NEGOCIOS', label: 'Negocios' },
];

// C-192: la categoría no es un estado: todas con la misma etiqueta (antes verde, ámbar y rojo según el tema). C-245: un dato, en gris (§1.8)
const CATEGORY_COLORS: Record<string, string> = {
  DESARROLLO: 'bg-white text-ink-soft ring-1 ring-inset ring-line',
  REDES: 'bg-white text-ink-soft ring-1 ring-inset ring-line',
  ELECTRONICA: 'bg-white text-ink-soft ring-1 ring-inset ring-line',
  GAMING: 'bg-white text-ink-soft ring-1 ring-inset ring-line',
  SEGURIDAD: 'bg-white text-ink-soft ring-1 ring-inset ring-line',
  NEGOCIOS: 'bg-white text-ink-soft ring-1 ring-inset ring-line',
};

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

/** Curso de un creador que todavía no se publicó: es el que espera aprobación. */
const enRevision = (course: Course) => !course.isActive && Boolean(course.creator);

export default function AdminCursosPage() {
  const { confirm } = useConfirm();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('');

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/courses');
      if (res.ok) setCourses(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useCargarAlMontar(loadCourses);

  // Antes no se revisaba la respuesta: si el servidor fallaba, el botón no hacía nada visible
  async function handleToggle(course: Course) {
    const res = await fetch('/api/admin/courses/' + course.id, {
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
    const confirmed = await confirm({ title: 'Eliminar curso', message: '¿Eliminar este curso? Se perderán todos los módulos e inscripciones.', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await fetch('/api/admin/courses/' + id, { method: 'DELETE' });
      loadCourses();
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = filterCat ? courses.filter((c) => c.category === filterCat) : courses;

  return (
    <div>
      {/* Header */}
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Cursos / Plataforma</h1>
          <p className={adminPageSubtitle}>{courses.length} cursos en total</p>
        </div>
        <Link href="/admin/cursos/nuevo" className={adminPrimaryButton}>
          <IconoMas className="w-4 h-4" aria-hidden="true" />
          Nuevo Curso
        </Link>
      </div>

      {/* C-249: las categorías en píldoras con ícono, cuenta y lo que juntan (§1.7) */}
      <div className="mb-6">
        <Filtros
          etiqueta="Filtrar por categoría"
          valor={filterCat}
          onCambiar={setFilterCat}
          filtros={[
            { valor: '', etiqueta: 'Todos', ayuda: 'Todos los cursos', Icono: IconoCursos, cuenta: courses.length },
            ...CATEGORIES.map((cat) => ({
              valor: cat.value, etiqueta: cat.label, ayuda: `Cursos de ${cat.label.toLowerCase()}`, Icono: ICONO_CATEGORIA[cat.value] ?? IconoCursos,
              cuenta: courses.filter((c) => c.category === cat.value).length,
            })),
          ]}
        />
      </div>

      {/* Courses grid */}
      {loading ? (
        <div className="text-center py-16 text-muted">Cargando cursos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <IconoCursos className="mx-auto mb-3 h-12 w-12 text-muted" aria-hidden="true" />
          <p className="text-muted">No hay cursos aún. ¡Crea el primero!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <div key={course.id} className="bg-white border border-line rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-40 bg-brand-50">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <IconoCursos className="w-12 h-12 text-brand-500/30" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  {course.category && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[course.category] || 'bg-surface text-muted'}`}>
                      {CATEGORIES.find((c) => c.value === course.category)?.label}
                    </span>
                  )}
                  {course.isFeatured && (
                    <span className={adminBadge('brand')}><IconoEstrella lleno className="h-3 w-3 shrink-0" aria-hidden="true" />Destacado</span>
                  )}
                </div>
                <div className="absolute top-2 right-2">
                  {/* C-216: como el resto del panel: activo en verde, por revisar en azul noche, inactivo en gris */}
                  <span className={adminBadge(course.isActive ? 'success' : enRevision(course) ? 'warning' : 'neutral')}>
                    {course.isActive ? 'Activo' : enRevision(course) ? 'En revisión' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-ink text-sm line-clamp-2 mb-1">{course.title}</h3>
                {course.creator && <p className="text-xs text-muted mb-1">Creador: {course.creator.displayName}</p>}
                {course.shortDesc && <p className="text-xs text-muted line-clamp-2 mb-2">{course.shortDesc}</p>}
                <div className="flex items-center gap-3 text-xs text-muted mb-3">
                  <span>{formatUSD(Number(course.priceUSD))}</span>
                  <span>{course._count?.enrollments ?? course.enrollmentCount} inscritos</span>
                  <span>{course._count?.modules ?? 0} módulos</span>
                  {course.rating && <span className="inline-flex items-center gap-1"><IconoEstrellaLlena className="h-3 w-3 text-warning shrink-0" aria-hidden="true" />{formatRating(course.rating)}</span>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/cursos/${course.id}`} className="flex-1 py-1.5 text-center text-xs font-semibold text-brand-500 border border-brand-500 rounded-lg hover:bg-brand-500 hover:text-white transition-colors">Editar</Link>
                  <button
                    onClick={() => handleToggle(course)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${course.isActive ? 'border-line text-ink-soft hover:bg-surface' : enRevision(course) ? 'border-success-strong bg-success-strong text-white hover:bg-success-strong/90' : 'border-success/30 text-success-strong hover:bg-success/10'}`}
                  >
                    {course.isActive ? 'Desactivar' : enRevision(course) ? 'Aprobar' : 'Activar'}
                  </button>
                  <button onClick={() => handleDelete(course.id)} disabled={deletingId === course.id} className="p-1.5 text-deal hover:text-deal hover:bg-deal/10 rounded-lg transition-colors">
                    <IconoEliminar className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
