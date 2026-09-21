'use client';

import { adminModalOverlay, adminModalPanel } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

import { toast } from 'react-hot-toast';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import CategoryIconRenderer from '@/components/CategoryIconRenderer';
import {
  ICON_OPTIONS, COLOR_OPTIONS,
  getCategoryIcon, getCategoryColor, getAutoIcon,
  parseImportStatement, loadIconDynamic,
} from '@/lib/category-icons';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string | null;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
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
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const customIconRef = useRef<HTMLInputElement>(null);
  // Custom import field
  const [importInput, setImportInput] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importPreviewComponent, setImportPreviewComponent] = useState<React.ComponentType<{ className?: string }> | null>(null);
  const [importParsedName, setImportParsedName] = useState('');

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

  useEffect(() => { fetchCategories(); }, []);

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
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || null,
      icon: category.icon || '',
      color: category.color || '',
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaveLoading(true);
    try {
      const method = isEditing && selectedCategory ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = isEditing && selectedCategory
        ? { id: selectedCategory.id, ...formData }
        : { ...formData };

      if (body.parentId === '') body.parentId = null;
      if (body.icon === '') body.icon = null;
      if (body.color === '') body.color = null;

      const response = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchCategories();
        setIsCreating(false);
        setIsEditing(false);
        const updated = await response.json();
        setSelectedCategory(updated);
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
      const response = await fetch(`/api/categories?id=${selectedCategory.id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchCategories();
        setSelectedCategory(null);
        setShowDeleteModal(false);
        setIsEditing(false);
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

  const handleImportInput = async (val: string) => {
    setImportInput(val);
    setImportError('');
    setImportPreviewComponent(null);
    setImportParsedName('');
    if (!val.trim()) return;
    const parsed = parseImportStatement(val.trim());
    if (!parsed) {
      if (val.trim().length > 3) setImportError('Formato no reconocido');
      return;
    }
    setImportLoading(true);
    try {
      const icon = await loadIconDynamic(parsed.iconName);
      if (icon) {
        setImportPreviewComponent(() => icon);
        setImportParsedName(parsed.iconName);
      } else {
        setImportError(`"${parsed.iconName}" no encontrado en ${parsed.library}`);
      }
    } catch {
      setImportError('Error al cargar la librería');
    } finally {
      setImportLoading(false);
    }
  };

  const confirmImportIcon = () => {
    if (!importParsedName) return;
    setFormData(prev => ({ ...prev, icon: importParsedName, image: '' }));
    setImportInput('');
    setImportPreviewComponent(null);
    setImportParsedName('');
    setImportError('');
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
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
            <svg className="w-4 h-4 text-subtle absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-surface p-5 rounded-xl border border-brand-200 shadow-sm">
              <div className="text-sm text-brand-600 font-medium mb-1">Total Categorías</div>
              <div className="text-3xl font-bold text-ink">{totalCategories}</div>
            </div>
            <div className="bg-surface p-5 rounded-xl border border-brand-200 shadow-sm">
              <div className="text-sm text-brand-600 font-medium mb-1">Total Productos</div>
              <div className="text-3xl font-bold text-ink">{totalProducts}</div>
            </div>
            <div className="bg-surface p-5 rounded-xl border border-success/20 shadow-sm">
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
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">

                  {/* ── Preview ── */}
                  <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-line">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${previewColor.from}, ${previewColor.to})` }}
                    >
                      {formData.image ? (
                        <Image src={formData.image} alt="Icono" width={48} height={48} className="w-full h-full object-contain p-1" />
                      ) : (
                        <PreviewIcon className="w-8 h-8 text-white drop-shadow" />
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
                          onClick={() => setFormData(prev => ({ ...prev, icon: prev.icon === name ? '' : name }))}
                          className={[
                            'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all',
                            formData.icon === name
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
                        Seleccionado: <span className="font-medium text-brand-600">{ICON_OPTIONS.find(o => o.name === formData.icon)?.label}</span>
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
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
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

                    {/* ── Import from any react-icons library ── */}
                    <div className="mt-4 pt-4 border-t border-line">
                      <p className="text-xs font-medium text-muted mb-2">
                        Importar cualquier ícono de react-icons / lucide
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={importInput}
                          onChange={e => handleImportInput(e.target.value)}
                          placeholder={`import { GiLaptop } from "react-icons/gi"`}
                          className="flex-1 px-3 py-2 text-xs border border-line rounded-lg font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 bg-surface placeholder:text-subtle"
                          spellCheck={false}
                        />
                        {importLoading && (
                          <div className="flex items-center px-3">
                            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {importError && (
                        <p className="text-[11px] text-deal mt-1.5">{importError}</p>
                      )}

                      {importPreviewComponent && (() => {
                        const ImportIcon = importPreviewComponent;
                        return (
                          <div className="flex items-center gap-3 mt-2 p-2.5 bg-brand-50 border border-brand-200 rounded-xl">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${previewColor.from}, ${previewColor.to})` }}
                            >
                              <ImportIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono font-semibold text-ink truncate">{importParsedName}</p>
                              <p className="text-xs text-subtle">Ícono cargado correctamente</p>
                            </div>
                            <button
                              type="button"
                              onClick={confirmImportIcon}
                              className="px-3 py-1.5 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-500 transition-colors flex-shrink-0"
                            >
                              Usar
                            </button>
                          </div>
                        );
                      })()}

                      <p className="text-xs text-subtle mt-1.5">
                        Acepta la línea completa de import o solo el nombre: <span className="font-mono">GiLaptop</span>
                      </p>
                    </div>
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
                        className="w-full flex items-center gap-4 p-4 bg-white border border-line rounded-2xl hover:border-brand-500 hover:shadow-md hover:shadow-blue-500/5 transition-all group text-left"
                      >
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
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
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
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
                  className="px-8 py-3 bg-brand-500 hover:bg-brand-500 text-white shadow-lg shadow-blue-600/20"
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
                  <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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
