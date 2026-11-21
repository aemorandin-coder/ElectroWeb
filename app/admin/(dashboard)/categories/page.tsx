'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import ModalDialog from '@/components/ui/ModalDialog';
import { IconoBuscar, IconoCerrar, IconoChevronDerecha, IconoMas, IconoReportes } from '@/components/iconos';
import {
  adminBadge, adminCard, adminCardFlush, adminDangerButton, adminModalBody, adminModalFooter, adminModalHeader,
  adminModalTitle, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton,
  adminStatCard, adminStatLabel, adminStatValue,
} from '@/lib/admin-ui';
import { getAutoIcon, getCategoryColor } from '@/lib/category-icons';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useConfirm } from '@/contexts/ConfirmDialogContext';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string | null;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  isDepartment?: boolean;
  updatedAt?: string;
  _count?: { products: number };
  children?: Category[];
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { confirm } = useConfirm();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        const rootIds = data.filter((c: Category) => !c.parentId).map((c: Category) => c.id);
        setExpandedNodes(new Set(rootIds));
      }
    } catch {
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setIsLoading(false);
    }
  };

  useCargarAlMontar(fetchCategories);

  const categoryTree = useMemo(() => {
    const categoryMap = new Map<string, Category>();
    const roots: Category[] = [];
    const categoriesClone: Category[] = structuredClone(categories);
    categoriesClone.forEach((cat) => categoryMap.set(cat.id, { ...cat, children: [] }));
    categoriesClone.forEach((cat) => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return null;
    return categories.filter((cat) => cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [categories, searchTerm]);

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setDeleteLoading(true);
    try {
      let response = await fetch(`/api/categories?id=${selectedCategory.id}`, { method: 'DELETE' });
      if (response.status === 409) {
        const aviso = await response.clone().json().catch(() => ({}));
        if (aviso?.conflicto === 'en_edicion') {
          const seguir = await confirm({
            title: 'La están editando ahora',
            message: `${aviso.error}. Si la eliminas, verá un aviso. ¿Eliminarla igual?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            type: 'warning',
          });
          if (!seguir) {
            setShowDeleteModal(false);
            return;
          }
          response = await fetch(`/api/categories?id=${selectedCategory.id}&forzar=1`, { method: 'DELETE' });
        }
      }
      if (response.ok) {
        await fetchCategories();
        setSelectedCategory(null);
        setShowDeleteModal(false);
        toast.success('Categoría eliminada');
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'No se pudo eliminar la categoría');
        setShowDeleteModal(false);
      }
    } catch {
      toast.error('No se pudo eliminar la categoría');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedNodes(newExpanded);
  };

  const totalProducts = categories.reduce((acc, cat) => acc + (cat._count?.products || 0), 0);
  const totalCategories = categories.length;
  const topCategory = categories.toSorted((a, b) => (b._count?.products || 0) - (a._count?.products || 0))[0];

  return (
    <div className="min-w-0 space-y-5">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Categorías</h1>
          <p className={adminPageSubtitle}>Departamentos, categorías y subcategorías del catálogo.</p>
        </div>
        <Link href="/admin/categories/nueva" className={adminPrimaryButton}>
          <IconoMas className="h-4 w-4" aria-hidden="true" />
          Nueva Categoría
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className={adminStatCard}>
          <div>
            <p className={adminStatLabel}>Total Categorías</p>
            <p className={`${adminStatValue} tabular-nums`}>{totalCategories}</p>
          </div>
        </div>
        <div className={adminStatCard}>
          <div>
            <p className={adminStatLabel}>Total Productos</p>
            <p className={`${adminStatValue} tabular-nums`}>{totalProducts}</p>
          </div>
        </div>
        <div className={`${adminStatCard} col-span-2 sm:col-span-1`}>
          <div className="min-w-0">
            <p className={adminStatLabel}>Categoría Top</p>
            <p className="truncate text-lg font-bold text-ink">{topCategory?.name || '—'}</p>
            <p className="text-xs tabular-nums text-muted">{topCategory?._count?.products || 0} productos</p>
          </div>
        </div>
      </div>

      {/* Master-Detail container */}
      <div className={`${adminCardFlush} grid lg:min-h-[34rem] lg:grid-cols-[19rem_minmax(0,1fr)]`}>
        {/* Left Panel: Category Tree */}
        <div className="flex flex-col border-b border-line bg-surface/60 lg:border-b-0 lg:border-r">
          <div className="border-b border-line bg-white p-3.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar categoría..."
                aria-label="Buscar categoría"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            </div>
          </div>

          <div className="max-h-80 flex-1 overflow-y-auto p-2.5 lg:max-h-none">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted">Cargando...</div>
            ) : categories.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">No hay categorías</div>
            ) : searchTerm ? (
              <div className="space-y-1">
                {filteredCategories?.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted">Sin resultados</div>
                ) : (
                  filteredCategories?.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedCategory?.id === cat.id
                          ? 'bg-brand-500 font-semibold text-white'
                          : 'border border-line bg-white text-ink hover:bg-surface'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <CategoryTree
                nodes={categoryTree}
                selectedId={selectedCategory?.id}
                expandedNodes={expandedNodes}
                onSelect={(cat) => setSelectedCategory(cat)}
                onToggle={toggleExpand}
              />
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col bg-white p-4 sm:p-6">
          {selectedCategory ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  {(() => {
                    const cv = getCategoryColor(selectedCategory.color, 0);
                    return (
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line"
                        style={{ background: `linear-gradient(135deg, ${cv.from}, ${cv.to})` }}
                      >
                        {selectedCategory.image ? (
                          <Image src={selectedCategory.image} alt={selectedCategory.name} width={56} height={56} className="h-full w-full object-contain p-2" />
                        ) : (
                          <CategoryIconRenderer
                            iconName={selectedCategory.icon || getAutoIcon(selectedCategory.name)}
                            className="h-8 w-8 text-white"
                          />
                        )}
                      </div>
                    );
                  })()}

                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded bg-surface px-2 py-0.5 font-mono">
                        ID: {selectedCategory.id.substring(0, 8)}
                      </span>
                      {selectedCategory.parentId && (
                        <span className={adminBadge('brand')}>Subcategoría</span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-ink text-balance">{selectedCategory.name}</h2>
                    <p className="mt-1 max-w-prose text-sm text-muted text-pretty">
                      {selectedCategory.description || 'Sin descripción.'}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link href={`/admin/categories/${selectedCategory.id}`} className={adminSecondaryButton}>
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className={`${adminSecondaryButton} text-deal!`}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-ink">Detalles</h3>
                  <div className={`${adminCard} bg-surface/50 space-y-2.5 p-4`}>
                    <div className="flex items-center justify-between border-b border-line pb-2.5">
                      <span className="text-sm text-muted">Productos</span>
                      <span className="rounded-lg border border-line bg-white px-3 py-1 text-sm font-bold tabular-nums text-ink">
                        {selectedCategory._count?.products || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-line pb-2.5">
                      <span className="text-sm text-muted">Subcategorías</span>
                      <span className="rounded-lg border border-line bg-white px-3 py-1 text-sm font-bold tabular-nums text-ink">
                        {selectedCategory.children?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-sm text-muted">Estado</span>
                      <span className={adminBadge('success')}>Activo</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-ink">Acciones Rápidas</h3>
                  <div className="space-y-2.5">
                    <Link
                      href={`/admin/categories/nueva?padre=${selectedCategory.id}`}
                      className="group flex w-full items-center gap-3.5 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                        <IconoMas className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink group-hover:text-brand-600">Crear Subcategoría</p>
                        <p className="mt-0.5 truncate text-xs text-muted">Añadir hija a {selectedCategory.name}</p>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => router.push(`/admin/products?category=${selectedCategory.id}`)}
                      className="group flex w-full items-center gap-3.5 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                        <IconoReportes className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink group-hover:text-brand-600">Ver Productos</p>
                        <p className="mt-0.5 text-xs text-muted">Gestionar inventario de esta categoría</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[22rem] flex-col items-center justify-center p-6 text-center">
              <p className="text-base font-semibold text-ink">Selecciona una categoría del árbol</p>
              <p className="mt-1 max-w-prose text-sm text-muted">Elige una categoría a la izquierda para editarla o crear subcategorías.</p>
              <Link href="/admin/categories/nueva" className={`${adminPrimaryButton} mt-4`}>
                <IconoMas className="h-4 w-4" aria-hidden="true" />
                Crear Categoría Raíz
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Native <dialog> delete modal */}
      <ModalDialog
        open={Boolean(showDeleteModal && selectedCategory)}
        onClose={() => setShowDeleteModal(false)}
        closedBy="closerequest"
        size="md"
        role="alertdialog"
        ariaLabelledBy="delete-cat-title"
      >
        {selectedCategory && (
          <>
            <div className={adminModalHeader}>
              <h3 id="delete-cat-title" className={adminModalTitle}>¿Eliminar {selectedCategory.name}?</h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                aria-label="Cerrar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
              >
                <IconoCerrar className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className={adminModalBody}>
              <p className="text-sm text-muted">
                Esta acción eliminará la categoría y todas sus subcategorías. Los productos asociados quedarán sin categoría.
              </p>
            </div>
            <div className={adminModalFooter}>
              <button type="button" autoFocus onClick={() => setShowDeleteModal(false)} className={adminSecondaryButton}>
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading} className={adminDangerButton}>
                {deleteLoading ? 'Eliminando…' : 'Eliminar Definitivamente'}
              </button>
            </div>
          </>
        )}
      </ModalDialog>
    </div>
  );
}

function CategoryTree({
  nodes, selectedId, onSelect, expandedNodes, onToggle, level = 0,
}: {
  nodes: Category[];
  selectedId?: string;
  onSelect: (c: Category) => void;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  level?: number;
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const cv = getCategoryColor(node.color, 0);

        return (
          <div key={node.id}>
            <div
              className={`flex min-h-10 items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                selectedId === node.id
                  ? 'bg-brand-500 font-semibold text-white'
                  : 'text-ink hover:bg-surface'
              }`}
              style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                  aria-label={isExpanded ? `Contraer ${node.name}` : `Expandir ${node.name}`}
                  className={`rounded p-1 hover:bg-ink/10 ${selectedId === node.id ? 'text-white' : 'text-muted'}`}
                >
                  <IconoChevronDerecha className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <div className="w-5" />
              )}

              <div
                className="h-2 w-2 shrink-0 rounded-full opacity-80"
                style={{ backgroundColor: cv.swatch }}
              />

              <button type="button" onClick={() => onSelect(node)} className="flex flex-1 items-center gap-2 truncate text-left">
                <span className="truncate">{node.name}</span>
                {node._count?.products ? (
                  <span className={`ml-auto text-xs tabular-nums ${selectedId === node.id ? 'text-white/85' : 'text-muted'}`}>
                    {node._count.products}
                  </span>
                ) : null}
              </button>
            </div>

            {hasChildren && isExpanded && (
              <CategoryTree
                nodes={node.children!}
                selectedId={selectedId}
                onSelect={onSelect}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
