'use client';

import { adminBadge, adminModalOverlay, adminModalPanel, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

import { toast } from 'react-hot-toast';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import { getCategoryColor, getAutoIcon } from '@/lib/category-icons';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { IconoBuscar, IconoChevronDerecha, IconoMas, IconoReportes } from '@/components/iconos';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string | null;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  /** C-200: departamento aparte (Ferretería) */
  isDepartment?: boolean;
  /** C-170: la versión con que se abre el editor */
  updatedAt?: string;
  _count?: { products: number };
  children?: Category[];
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  // C-249b: crear y cambiar una categoría van por pasos en su propia página (/admin/categories/nueva y /[id], PLAN.md §1.9)
  const { confirm } = useConfirm();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  useBodyScrollLock(showDeleteModal);
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
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setIsLoading(false);
    }
  };

  useCargarAlMontar(fetchCategories);

  const categoryTree = useMemo(() => {
    const categoryMap = new Map<string, Category>();
    const roots: Category[] = [];
    const categoriesClone: Category[] = JSON.parse(JSON.stringify(categories));
    categoriesClone.forEach(cat => categoryMap.set(cat.id, { ...cat, children: [] }));
    categoriesClone.forEach(cat => {
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
    return categories.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [categories, searchTerm]);

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setDeleteLoading(true);
    try {
      let response = await fetch(`/api/categories?id=${selectedCategory.id}`, { method: 'DELETE' });
      // C-170: otra persona la tiene abierta ahora: se pregunta antes de eliminarla
      if (response.status === 409) {
        const aviso = await response.clone().json().catch(() => ({}));
        if (aviso?.conflicto === 'en_edicion') {
          const seguir = await confirm({ title: 'La están editando ahora', message: `${aviso.error}. Si la eliminas, verá un aviso. ¿Eliminarla igual?`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'warning' });
          if (!seguir) { setShowDeleteModal(false); return; }
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
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('No se pudo eliminar la categoría');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) { newExpanded.delete(id); } else { newExpanded.add(id); }
    setExpandedNodes(newExpanded);
  };

  const totalProducts = categories.reduce((acc, cat) => acc + (cat._count?.products || 0), 0);
  const totalCategories = categories.length;
  const topCategory = [...categories].sort((a, b) => (b._count?.products || 0) - (a._count?.products || 0))[0];

  return (
    <div className="-m-4 flex flex-col md:-m-6 lg:min-h-[calc(100dvh-10rem)] lg:flex-row">
      {/* Left Panel: Category Tree */}
      <div className="flex w-full shrink-0 flex-col border-b border-line bg-surface lg:w-[300px] lg:border-b-0 lg:border-r overflow-hidden">
        <div className="p-4 border-b border-line bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-ink">Categorías</h2>
            <Link
              href="/admin/categories/nueva"
              className="p-1.5 bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 transition-colors"
              title="Nueva Categoría Raíz"
              aria-label="Nueva categoría principal"
            >
              <IconoMas className="w-5 h-5" />
            </Link>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-line rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            <IconoBuscar className="w-4 h-4 text-subtle absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center py-8 text-subtle text-sm">Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-subtle text-sm">No hay categorías</div>
          ) : searchTerm ? (
            <div className="space-y-1">
              {filteredCategories?.length === 0 ? (
                <div className="text-center py-4 text-subtle text-sm">Sin resultados</div>
              ) : (
                filteredCategories?.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory?.id === cat.id
                        ? 'bg-brand-500 text-white font-medium shadow-sm'
                        : 'text-ink hover:bg-surface bg-white border border-line'
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
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Analytics */}
          <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-3 sm:gap-6">
            <div className="rounded-xl border border-line bg-white p-5">
              <div className="mb-1 text-sm text-muted">Total Categorías</div>
              <div className="text-3xl font-bold text-ink">{totalCategories}</div>
            </div>
            <div className="rounded-xl border border-line bg-white p-5">
              <div className="mb-1 text-sm text-muted">Total Productos</div>
              <div className="text-3xl font-bold text-ink">{totalProducts}</div>
            </div>
            <div className="col-span-2 rounded-xl border border-line bg-white p-5 sm:col-span-1">
              <div className="mb-1 text-sm text-muted">Categoría Top</div>
              <div className="text-lg font-bold text-ink truncate">{topCategory?.name || '-'}</div>
              <div className="mt-1 text-xs text-muted">{topCategory?._count?.products || 0} productos</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="min-h-[400px]">
            {selectedCategory ? (
              /* ── DETAIL VIEW ── */
              <div className="animate-fadeIn">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex gap-5 items-start">
                    {/* Icon on color */}
                    {(() => {
                      const cv = getCategoryColor(selectedCategory.color, 0);
                      return (
                        <div
                          className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${cv.from}, ${cv.to})` }}
                        >
                          {selectedCategory.image ? (
                            <Image src={selectedCategory.image} alt={selectedCategory.name} width={56} height={56} className="w-full h-full object-contain p-2" />
                          ) : (
                            <CategoryIconRenderer
                              iconName={selectedCategory.icon || getAutoIcon(selectedCategory.name)}
                              className="w-10 h-10 text-white drop-shadow-md"
                            />
                          )}
                        </div>
                      );
                    })()}

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted mb-2">
                        <span className="font-mono bg-surface px-2 py-0.5 rounded text-xs">
                          ID: {selectedCategory.id.substring(0, 8)}
                        </span>
                        {selectedCategory.parentId && (
                          <span className={adminBadge('brand')}>
                            Subcategoría
                          </span>
                        )}
                      </div>
                      <h1 className="text-3xl font-bold text-ink mb-2">{selectedCategory.name}</h1>
                      <p className="text-muted max-w-2xl leading-relaxed">
                        {selectedCategory.description || 'Sin descripción.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-shrink-0">
                    <Link href={`/admin/categories/${selectedCategory.id}`} className={adminSecondaryButton}>
                      Editar
                    </Link>
                    <Button variant="ghost" className="text-deal bg-deal/10 text-deal" onClick={() => setShowDeleteModal(true)}>
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-ink">Detalles</h3>
                    <div className="bg-surface rounded-2xl p-5 border border-line space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-line/50">
                        <span className="text-muted text-sm">Productos</span>
                        <span className="font-bold text-ink bg-white px-3 py-1 rounded-lg shadow-sm border border-line text-sm">
                          {selectedCategory._count?.products || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-line/50">
                        <span className="text-muted text-sm">Subcategorías</span>
                        <span className="font-bold text-ink bg-white px-3 py-1 rounded-lg shadow-sm border border-line text-sm">
                          {selectedCategory.children?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted text-sm">Estado</span>
                        <span className={adminBadge('success')}>
                          Activo
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-ink">Acciones Rápidas</h3>
                    <div className="space-y-3">
                      <Link
                        href={`/admin/categories/nueva?padre=${selectedCategory.id}`}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-line rounded-2xl hover:border-brand-500 hover:shadow-md transition-all group text-left"
                      >
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                          <IconoMas className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-ink text-sm group-hover:text-brand-600 transition-colors">Crear Subcategoría</div>
                          <div className="text-xs text-muted mt-0.5">Añadir hija a {selectedCategory.name}</div>
                        </div>
                      </Link>

                      <button
                        onClick={() => router.push(`/admin/products?category=${selectedCategory.id}`)}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-line rounded-2xl hover:border-brand-500 transition-all group text-left"
                      >
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                          <IconoReportes className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-ink text-sm group-hover:text-brand-600 transition-colors">Ver Productos</div>
                          <div className="text-xs text-muted mt-0.5">Gestionar inventario de esta categoría</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── EMPTY STATE ── */
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 text-subtle min-h-[400px]">
                <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-ink mb-4">Selecciona una categoría</h3>
                <Link href="/admin/categories/nueva" className={adminPrimaryButton}>
                  Crear Categoría Raíz
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedCategory && (
        <div className={adminModalOverlay}>
          <div className={`${adminModalPanel} sm:max-w-md p-6`}>
            <h3 className="text-lg font-bold text-ink mb-2">¿Eliminar {selectedCategory.name}?</h3>
            <p className="text-muted mb-6 text-sm">
              Esta acción eliminará la categoría y todas sus subcategorías. Los productos asociados quedarán sin categoría.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button
                variant="primary"
                className="bg-deal hover:bg-deal/90 text-white"
                onClick={handleDelete}
                isLoading={deleteLoading}
              >
                Eliminar Definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
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
      {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const cv = getCategoryColor(node.color, 0);

        return (
          <div key={node.id}>
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                selectedId === node.id
                  ? 'bg-brand-500 text-white font-medium shadow-sm'
                  : 'text-ink hover:bg-surface'
              }`}
              style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                  className={`p-1 rounded hover:bg-ink/10 ${selectedId === node.id ? 'text-white' : 'text-muted'}`}
                >
                  <IconoChevronDerecha className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <div className="w-5" />
              )}

              {/* Color dot */}
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 opacity-80"
                style={{ backgroundColor: cv.swatch }}
              />

              <button onClick={() => onSelect(node)} className="flex-1 text-left truncate flex items-center gap-2">
                <span className="truncate">{node.name}</span>
                {node._count?.products ? (
                  <span className={`ml-auto text-xs ${selectedId === node.id ? 'text-white/80' : 'text-subtle'}`}>
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
