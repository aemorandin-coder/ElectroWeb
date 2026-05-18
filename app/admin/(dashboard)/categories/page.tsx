'use client';

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
  const [importPreviewComponent, setImportPreviewComponent] = useState<React.ComponentType<any> | null>(null);
  const [importParsedName, setImportParsedName] = useState('');

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
    } catch (error) {
      console.error('Error fetching categories:', error);
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
    <div className="flex flex-row h-[calc(100%+3rem)] -m-6 w-[calc(100%+3rem)]">
      {/* Left Panel: Category Tree */}
      <div className="w-[300px] flex-shrink-0 border-r border-gray-200 bg-gray-50/30 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-gray-800">Categorías</h2>
            <button
              onClick={() => handleCreate(null)}
              className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
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
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay categorías</div>
          ) : searchTerm ? (
            <div className="space-y-1">
              {filteredCategories?.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">Sin resultados</div>
              ) : (
                filteredCategories?.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat); setIsCreating(false); setIsEditing(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory?.id === cat.id
                        ? 'bg-[#2a63cd] text-white font-medium shadow-sm'
                        : 'text-[#212529] hover:bg-[#f8f9fa] bg-white border border-gray-100'
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
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <div className="flex-1 overflow-y-auto p-8">
          {/* Analytics */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border border-blue-100 shadow-sm">
              <div className="text-sm text-blue-600 font-medium mb-1">Total Categorías</div>
              <div className="text-3xl font-bold text-gray-900">{totalCategories}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border border-purple-100 shadow-sm">
              <div className="text-sm text-purple-600 font-medium mb-1">Total Productos</div>
              <div className="text-3xl font-bold text-gray-900">{totalProducts}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border border-emerald-100 shadow-sm">
              <div className="text-sm text-emerald-600 font-medium mb-1">Categoría Top</div>
              <div className="text-lg font-bold text-gray-900 truncate">{topCategory?.name || '-'}</div>
              <div className="text-xs text-emerald-600/80 mt-1">{topCategory?._count?.products || 0} productos</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="min-h-[400px]">
            {(isCreating || isEditing) ? (
              /* ── FORM ── */
              <div className="max-w-2xl animate-fadeIn">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isCreating ? 'Nueva Categoría' : 'Editar Categoría'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Configura el icono, color y datos de la categoría.</p>
                  </div>
                  <button
                    onClick={() => { setIsCreating(false); setIsEditing(false); }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">

                  {/* ── Preview ── */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
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
                      <p className="text-sm font-semibold text-gray-900">{formData.name || 'Nombre de la categoría'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Vista previa del icono y color</p>
                    </div>
                  </div>

                  {/* ── Name ── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      placeholder="Ej. Smartphones"
                      required
                    />
                  </div>

                  {/* ── Icon Picker ── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Icono</label>
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
                              ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-700',
                          ].join(' ')}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      ))}
                    </div>
                    {formData.icon && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        Seleccionado: <span className="font-medium text-blue-600">{ICON_OPTIONS.find(o => o.name === formData.icon)?.label}</span>
                        {' · '}
                        <button type="button" className="text-gray-400 hover:text-red-500 transition-colors" onClick={() => setFormData(prev => ({ ...prev, icon: '' }))}>
                          Quitar
                        </button>
                      </p>
                    )}
                    {!formData.icon && !formData.image && formData.name && (
                      <p className="text-xs text-gray-400 mt-1.5">Se asignará automáticamente por el nombre si no seleccionas uno.</p>
                    )}

                    {/* Custom icon upload */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
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
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-50"
                      >
                        {uploadingIcon ? (
                          <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        )}
                        Subir icono personalizado
                      </button>
                      {formData.image && (
                        <div className="flex items-center gap-2">
                          <Image src={formData.image} alt="Custom" width={28} height={28} className="w-7 h-7 rounded object-contain border border-gray-200 bg-gray-50" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">PNG · SVG · WebP · fondo transparente recomendado · máx. 2 MB</p>

                    {/* ── Import from any react-icons library ── */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Importar cualquier ícono de react-icons / lucide
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={importInput}
                          onChange={e => handleImportInput(e.target.value)}
                          placeholder={`import { GiLaptop } from "react-icons/gi"`}
                          className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-gray-50 placeholder:text-gray-300"
                          spellCheck={false}
                        />
                        {importLoading && (
                          <div className="flex items-center px-3">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {importError && (
                        <p className="text-[11px] text-red-500 mt-1.5">{importError}</p>
                      )}

                      {importPreviewComponent && (() => {
                        const ImportIcon = importPreviewComponent;
                        return (
                          <div className="flex items-center gap-3 mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${previewColor.from}, ${previewColor.to})` }}
                            >
                              <ImportIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono font-semibold text-gray-800 truncate">{importParsedName}</p>
                              <p className="text-[10px] text-gray-400">Ícono cargado correctamente</p>
                            </div>
                            <button
                              type="button"
                              onClick={confirmImportIcon}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                            >
                              Usar
                            </button>
                          </div>
                        );
                      })()}

                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Acepta la línea completa de import o solo el nombre: <span className="font-mono">GiLaptop</span>
                      </p>
                    </div>
                  </div>

                  {/* ── Color Palette ── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
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
                              ? 'border-gray-900 scale-110 shadow-lg'
                              : 'border-white shadow hover:scale-105 hover:shadow-md',
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
                            ? 'border-gray-900 scale-110 shadow-lg'
                            : 'border-white shadow hover:scale-105 hover:shadow-md bg-gradient-to-br from-red-400 via-yellow-400 to-blue-500',
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
                      <p className="text-xs text-gray-400 mt-1.5">Se asignará automáticamente si no seleccionas un color.</p>
                    )}
                    {formData.color?.startsWith('#') && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        Color personalizado: <span className="font-mono font-medium">{formData.color}</span>
                        {' · '}
                        <button type="button" className="text-gray-400 hover:text-red-500 transition-colors" onClick={() => setFormData(prev => ({ ...prev, color: '' }))}>Quitar</button>
                      </p>
                    )}
                  </div>

                  {/* ── Category Parent ── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoría Padre (Opcional)</label>
                    <select
                      value={formData.parentId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value || null }))}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    >
                      <option value="">Ninguna (Categoría Raíz)</option>
                      {categories
                        .filter(c => c.id !== selectedCategory?.id)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Si seleccionas una categoría padre, esta será una subcategoría.</p>
                  </div>

                  {/* ── Description ── */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                      placeholder="Describe brevemente esta categoría..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="ghost" type="button" onClick={() => { setIsCreating(false); setIsEditing(false); }}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit" isLoading={saveLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
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
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                          ID: {selectedCategory.id.substring(0, 8)}
                        </span>
                        {selectedCategory.parentId && (
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-100">
                            Subcategoría
                          </span>
                        )}
                      </div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedCategory.name}</h1>
                      <p className="text-gray-500 max-w-2xl leading-relaxed">
                        {selectedCategory.description || 'Sin descripción.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-shrink-0">
                    <Button variant="secondary" onClick={() => handleEdit(selectedCategory)} className="border border-gray-200 shadow-sm">
                      Editar
                    </Button>
                    <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setShowDeleteModal(true)}>
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">Detalles</h3>
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                        <span className="text-gray-600 text-sm">Productos</span>
                        <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100 text-sm">
                          {selectedCategory._count?.products || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                        <span className="text-gray-600 text-sm">Subcategorías</span>
                        <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100 text-sm">
                          {selectedCategory.children?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 text-sm">Estado</span>
                        <span className="text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full text-xs border border-emerald-100">
                          Activo
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">Acciones Rápidas</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => handleCreate(selectedCategory.id)}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/5 transition-all group text-left"
                      >
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">Crear Subcategoría</div>
                          <div className="text-xs text-gray-500 mt-0.5">Añadir hija a {selectedCategory.name}</div>
                        </div>
                      </button>

                      <button
                        onClick={() => router.push(`/admin/products?category=${selectedCategory.id}`)}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-purple-500 hover:shadow-md hover:shadow-purple-500/5 transition-all group text-left"
                      >
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm group-hover:text-purple-600 transition-colors">Ver Productos</div>
                          <div className="text-xs text-gray-500 mt-0.5">Gestionar inventario de esta categoría</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── EMPTY STATE ── */
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 text-gray-400 min-h-[400px]">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Selecciona una categoría</h3>
                <Button
                  variant="primary"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar {selectedCategory.name}?</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Esta acción eliminará la categoría y todas sus subcategorías. Los productos asociados quedarán sin categoría.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 text-white"
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
                  ? 'bg-[#2a63cd] text-white font-medium shadow-sm'
                  : 'text-[#212529] hover:bg-[#f8f9fa]'
              }`}
              style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                  className={`p-1 rounded hover:bg-black/10 ${selectedId === node.id ? 'text-white' : 'text-gray-500'}`}
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
                  <span className={`ml-auto text-xs ${selectedId === node.id ? 'text-blue-100' : 'text-gray-400'}`}>
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
