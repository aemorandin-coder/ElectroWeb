'use client';

import { adminModalOverlay, adminModalPanel } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

import { toast } from 'react-hot-toast';

import { useState, useMemo, useRef, createElement } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import {
  ICON_OPTIONS, COLOR_OPTIONS,
  getCategoryIcon, getCategoryIconOption, getCategoryColor, getAutoIcon,
} from '@/lib/category-icons';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import PresenciaEnEditor from '@/components/admin/edicion/PresenciaEnEditor';
import { enviarConVersion } from '@/lib/edicion/guardado';
import { useConflictoDeFormulario } from '@/lib/edicion/useConflictoDeFormulario';
import { IconoBuscar, IconoCerrar, IconoChevronDerecha, IconoMas, IconoReportes, IconoSubir } from '@/components/iconos';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string | null;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
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
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    parentId: '' as string | null,
    icon: '',
    color: '',
  });
  // C-170: lo que había al abrir el editor, para combinar si otra persona guardó antes
  const [formBase, setFormBase] = useState<typeof formData | null>(null);
  const { confirm } = useConfirm();
  const { resolver: resolverConflicto, dialogo: dialogoConflicto } = useConflictoDeFormulario({
    name: 'Nombre', description: 'Descripción', image: 'Imagen', parentId: 'Categoría principal', icon: 'Ícono', color: 'Color',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const customIconRef = useRef<HTMLInputElement>(null);

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

  const handleCreate = (parentId: string | null = null) => {
    setSelectedCategory(null);
    setFormData({ name: '', description: '', image: '', parentId, icon: '', color: '' });
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEdit = (category: Category) => {
    const formulario = {
      name: category.name,
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || null,
      icon: category.icon || '',
      color: category.color || '',
    };
    setSelectedCategory(category);
    setFormData(formulario);
    setFormBase(formulario);
    setIsEditing(true);
    setIsCreating(false);
  };

  /** El cuerpo del guardado: lo vacío viaja como null */
  const cuerpoDe = (formulario: typeof formData) => ({
    ...formulario,
    parentId: formulario.parentId || null,
    icon: formulario.icon || null,
    color: formulario.color || null,
  });

  /** Edición con la versión con que se abrió (C-170): si otra persona guardó antes, se combina lo de cada una y solo se pregunta por lo que las dos tocaron */
  const guardarEdicion = async (formulario: typeof formData, version: string | undefined) => {
    if (!selectedCategory) return;
    setSaveLoading(true);
    try {
      const r = await enviarConVersion<Category>('/api/categories', 'PATCH', { id: selectedCategory.id, ...cuerpoDe(formulario) }, version);
      if (r.ok) {
        await fetchCategories();
        setIsCreating(false);
        setIsEditing(false);
        setSelectedCategory(r.datos);
        toast.success('Categoría guardada');
        return;
      }
      if (r.conflicto?.tipo === 'cambiado') {
        const actual = r.conflicto.actual as Category;
        const suyo = { name: actual.name, description: actual.description || '', image: actual.image || '', parentId: actual.parentId || null, icon: actual.icon || '', color: actual.color || '' };
        resolverConflicto({
          base: formBase ?? suyo, mio: formulario, suyo, quien: r.conflicto.por?.nombre ?? 'Otra persona',
          continuar: (final) => { setFormData(final); setFormBase(suyo); return guardarEdicion(final, actual.updatedAt); },
        });
        return;
      }
      toast.error(r.error);
      if (r.conflicto?.tipo === 'no_existe') {
        await fetchCategories();
        setIsEditing(false);
        setSelectedCategory(null);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (isEditing && selectedCategory) {
      await guardarEdicion(formData, selectedCategory.updatedAt);
      return;
    }
    setSaveLoading(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoDe(formData)),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        await fetchCategories();
        setIsCreating(false);
        setIsEditing(false);
        setSelectedCategory(data);
        toast.success('Categoría guardada');
      } else {
        // Antes un rechazo del servidor (nombre repetido, categoría en ciclo) no decía nada (C-110)
        toast.error(data.error || 'No se pudo guardar la categoría');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('No se pudo guardar la categoría');
    } finally {
      setSaveLoading(false);
    }
  };

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
        setIsEditing(false);
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

  const handleCustomIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, image: data.url, icon: '' }));
      }
    } catch (err) {
      console.error('Error uploading icon:', err);
      toast.error('No se pudo subir el ícono');
    } finally {
      setUploadingIcon(false);
      if (customIconRef.current) customIconRef.current.value = '';
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

  // Live preview for form
  const PreviewIcon = getCategoryIcon(formData.icon || (formData.name ? getAutoIcon(formData.name) : ''));
  const previewColor = getCategoryColor(formData.color || null, 0);
  // C-189: la opción del pack que corresponde al ícono guardado (también los nombres de antes, como "GiGameConsole")
  const iconoElegido = getCategoryIconOption(formData.icon);

  return (
    <div className="-m-4 flex flex-col md:-m-6 lg:min-h-[calc(100dvh-10rem)] lg:flex-row">
      {/* Left Panel: Category Tree */}
      <div className="flex w-full shrink-0 flex-col border-b border-line bg-surface lg:w-[300px] lg:border-b-0 lg:border-r overflow-hidden">
        <div className="p-4 border-b border-line bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-ink">Categorías</h2>
            <button
              onClick={() => handleCreate(null)}
              className="p-1.5 bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 transition-colors"
              title="Nueva Categoría Raíz"
            >
              <IconoMas className="w-5 h-5" />
            </button>
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
                    onClick={() => { setSelectedCategory(cat); setIsCreating(false); setIsEditing(false); }}
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
              onSelect={(cat) => { setSelectedCategory(cat); setIsCreating(false); setIsEditing(false); }}
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
            <div className="bg-surface p-5 rounded-xl border border-brand-200 shadow-sm">
              <div className="text-sm text-brand-600 font-medium mb-1">Total Categorías</div>
              <div className="text-3xl font-bold text-ink">{totalCategories}</div>
            </div>
            <div className="bg-surface p-5 rounded-xl border border-brand-200 shadow-sm">
              <div className="text-sm text-brand-600 font-medium mb-1">Total Productos</div>
              <div className="text-3xl font-bold text-ink">{totalProducts}</div>
            </div>
            <div className="col-span-2 bg-surface p-5 rounded-xl border border-success/20 shadow-sm sm:col-span-1">
              <div className="text-sm text-success-strong font-medium mb-1">Categoría Top</div>
              <div className="text-lg font-bold text-ink truncate">{topCategory?.name || '-'}</div>
              <div className="text-xs text-success-strong/80 mt-1">{topCategory?._count?.products || 0} productos</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="min-h-[400px]">
            {(isCreating || isEditing) ? (
              /* ── FORM ── */
              <div className="max-w-2xl animate-fadeIn">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-line">
                  <div>
                    <h2 className="text-2xl font-bold text-ink">
                      {isCreating ? 'Nueva Categoría' : 'Editar Categoría'}
                    </h2>
                    <p className="text-muted text-sm mt-1">Configura el icono, color y datos de la categoría.</p>
                  </div>
                  <button
                    onClick={() => { setIsCreating(false); setIsEditing(false); }}
                    className="p-2 text-subtle hover:text-muted hover:bg-surface rounded-full transition-all"
                  >
                    <IconoCerrar className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  {isEditing && selectedCategory && (
                    <PresenciaEnEditor recurso={`category:${selectedCategory.id}`} etiqueta={selectedCategory.name} nombreRecurso="categoría" femenino />
                  )}

                  {/* ── Preview ── */}
                  <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-line">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${previewColor.from}, ${previewColor.to})` }}
                    >
                      {formData.image ? (
                        <Image src={formData.image} alt="Icono" width={48} height={48} className="w-full h-full object-contain p-1" />
                      ) : (
                        // createElement: el ícono se elige en cada render (C-111, regla static-components)
                        createElement(PreviewIcon, { className: 'w-8 h-8 text-white drop-shadow' })
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{formData.name || 'Nombre de la categoría'}</p>
                      <p className="text-xs text-subtle mt-0.5">Vista previa del icono y color</p>
                    </div>
                  </div>

                  {/* ── Name ── */}
                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-2">
                      Nombre <span className="text-deal">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-line focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all outline-none"
                      placeholder="Ej. Smartphones"
                      required
                    />
                  </div>

                  {/* ── Icon Picker ── */}
                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-2">Icono</label>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {ICON_OPTIONS.map(({ name, label, Icon }) => (
                        <button
                          key={name}
                          type="button"
                          title={label}
                          aria-label={label}
                          aria-pressed={iconoElegido?.name === name}
                          onClick={() => setFormData(prev => ({ ...prev, icon: getCategoryIconOption(prev.icon)?.name === name ? '' : name }))}
                          className={[
                            'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all',
                            iconoElegido?.name === name
                              ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-sm'
                              : 'border-line hover:border-line-strong text-subtle hover:text-ink-soft',
                          ].join(' ')}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                    {formData.icon && (
                      <p className="text-xs text-muted mt-1.5">
                        Seleccionado: <span className="font-medium text-brand-600">{iconoElegido?.label ?? 'uno que ya no está en la lista (se ve como "Otros")'}</span>
                        {' · '}
                        <button type="button" className="text-subtle text-deal transition-colors" onClick={() => setFormData(prev => ({ ...prev, icon: '' }))}>
                          Quitar
                        </button>
                      </p>
                    )}
                    {!formData.icon && !formData.image && formData.name && (
                      <p className="text-xs text-subtle mt-1.5">Se asignará automáticamente por el nombre si no seleccionas uno.</p>
                    )}

                    {/* Custom icon upload */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line">
                      <input
                        ref={customIconRef}
                        type="file"
                        className="hidden"
                        accept="image/png,image/svg+xml,image/webp"
                        onChange={handleCustomIconUpload}
                      />
                      <button
                        type="button"
                        onClick={() => customIconRef.current?.click()}
                        disabled={uploadingIcon}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-line rounded-lg hover:bg-surface transition-colors text-muted disabled:opacity-50"
                      >
                        {uploadingIcon ? (
                          <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <IconoSubir className="w-3.5 h-3.5" />
                        )}
                        Subir icono personalizado
                      </button>
                      {formData.image && (
                        <div className="flex items-center gap-2">
                          <Image src={formData.image} alt="Custom" width={28} height={28} className="w-7 h-7 rounded object-contain border border-line bg-surface" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                            className="text-xs text-deal text-deal transition-colors"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-subtle mt-1">PNG · SVG · WebP · fondo transparente recomendado · máx. 2 MB</p>
                  </div>

                  {/* ── Color Palette ── */}
                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-2">Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_OPTIONS.map(({ name, label, swatch }) => (
                        <button
                          key={name}
                          type="button"
                          title={label}
                          onClick={() => setFormData(prev => ({ ...prev, color: prev.color === name ? '' : name }))}
                          className={[
                            'w-9 h-9 rounded-full border-4 transition-all',
                            formData.color === name
                              ? 'border-ink shadow-lg'
                              : 'border-white shadow hover:shadow-md',
                          ].join(' ')}
                          style={{ backgroundColor: swatch }}
                        />
                      ))}

                      {/* Custom color picker */}
                      <label
                        title="Color personalizado"
                        className={[
                          'w-9 h-9 rounded-full border-4 cursor-pointer transition-all relative overflow-hidden flex items-center justify-center',
                          formData.color?.startsWith('#')
                            ? 'border-ink shadow-lg'
                            : 'border-white shadow hover:shadow-md bg-surface',
                        ].join(' ')}
                        style={formData.color?.startsWith('#') ? { backgroundColor: formData.color } : {}}
                      >
                        <input
                          type="color"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          value={
                            formData.color?.startsWith('#')
                              ? formData.color
                              : (COLOR_OPTIONS.find(c => c.name === formData.color)?.swatch || '#3b82f6')
                          }
                          onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        />
                      </label>
                    </div>
                    {!formData.color && (
                      <p className="text-xs text-subtle mt-1.5">Se asignará automáticamente si no seleccionas un color.</p>
                    )}
                    {formData.color?.startsWith('#') && (
                      <p className="text-xs text-muted mt-1.5">
                        Color personalizado: <span className="font-mono font-medium">{formData.color}</span>
                        {' · '}
                        <button type="button" className="text-subtle text-deal transition-colors" onClick={() => setFormData(prev => ({ ...prev, color: '' }))}>Quitar</button>
                      </p>
                    )}
                  </div>

                  {/* ── Category Parent ── */}
                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-2">Categoría Padre (Opcional)</label>
                    <select
                      value={formData.parentId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value || null }))}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-line focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all outline-none"
                    >
                      <option value="">Ninguna (Categoría Raíz)</option>
                      {categories
                        .filter(c => c.id !== selectedCategory?.id)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-muted mt-1">Si seleccionas una categoría padre, esta será una subcategoría.</p>
                  </div>

                  {/* ── Description ── */}
                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-2">Descripción</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-line focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all outline-none resize-none"
                      placeholder="Describe brevemente esta categoría..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-line">
                    <Button variant="ghost" type="button" onClick={() => { setIsCreating(false); setIsEditing(false); }}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit" isLoading={saveLoading} className="bg-brand-500 hover:bg-brand-500 text-white px-8">
                      Guardar Categoría
                    </Button>
                  </div>
                </form>
              </div>
            ) : selectedCategory ? (
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
                          <span className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full text-xs font-medium border border-brand-200">
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
                    <Button variant="secondary" onClick={() => handleEdit(selectedCategory)} className="border border-line shadow-sm">
                      Editar
                    </Button>
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
                        <span className="text-success-strong font-medium bg-success/10 px-3 py-1 rounded-full text-xs border border-success/20">
                          Activo
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-ink">Acciones Rápidas</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => handleCreate(selectedCategory.id)}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-line rounded-2xl hover:border-brand-500 hover:shadow-md transition-all group text-left"
                      >
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                          <IconoMas className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-ink text-sm group-hover:text-brand-600 transition-colors">Crear Subcategoría</div>
                          <div className="text-xs text-muted mt-0.5">Añadir hija a {selectedCategory.name}</div>
                        </div>
                      </button>

                      <button
                        onClick={() => router.push(`/admin/products?category=${selectedCategory.id}`)}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-line rounded-2xl hover:border-brand-500 transition-all group text-left"
                      >
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 group-bg-brand-600 group-hover:text-white transition-colors">
                          <IconoReportes className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-ink text-sm group-text-brand-600 transition-colors">Ver Productos</div>
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
                <Button
                  variant="primary"
                  className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white"
                  onClick={() => handleCreate(null)}
                >
                  Crear Categoría Raíz
                </Button>
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
      {dialogoConflicto}
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
