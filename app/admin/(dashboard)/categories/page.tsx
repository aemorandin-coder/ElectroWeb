'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string | null;
  parentId?: string | null;
  _count?: {
    products: number;
  };
  children?: Category[];
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    parentId: '' as string | null,
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch Categories
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        // Auto-expand all nodes initially or just roots? Let's expand roots by default
        const rootIds = data.filter((c: Category) => !c.parentId).map((c: Category) => c.id);
        setExpandedNodes(new Set(rootIds));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Build Category Tree
  const categoryTree = useMemo(() => {
    const categoryMap = new Map<string, Category>();
    const roots: Category[] = [];

    // Deep clone to avoid mutating state directly during tree construction
    const categoriesClone = JSON.parse(JSON.stringify(categories));

    // First pass: create nodes and map
    categoriesClone.forEach((cat: Category) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: link children to parents
    categoriesClone.forEach((cat: Category) => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [categories]);

  // Filtered List for Search
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return null;
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Handlers
  const handleCreate = (parentId: string | null = null) => {
    setSelectedCategory(null);
    setFormData({ name: '', description: '', image: '', parentId });
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
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, image: data.url }));
      } else {
        console.error('Error uploading image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaveLoading(true);
    try {
      const method = isEditing && selectedCategory ? 'PATCH' : 'POST';
      const body = isEditing && selectedCategory
        ? { id: selectedCategory.id, ...formData }
        : formData;

      // Clean parentId if empty string
      if (body.parentId === '') body.parentId = null;

      const response = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchCategories();
        setIsCreating(false);
        setIsEditing(false);
        if (isEditing) {
          const updated = await response.json();
          setSelectedCategory(updated);
        } else {
          const created = await response.json();
          setSelectedCategory(created);
        }
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
      const response = await fetch(`/api/categories?id=${selectedCategory.id}`, {
        method: 'DELETE',
      });

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

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleViewProducts = () => {
    if (selectedCategory) {
      // Assuming products page can filter by categoryId via query param
      // If not implemented yet, this is the first step
      router.push(`/admin/products?category=${selectedCategory.id}`);
    }
  };

  // Analytics
  const totalProducts = categories.reduce((acc, cat) => acc + (cat._count?.products || 0), 0);
  const totalCategories = categories.length;
  const topCategory = [...categories].sort((a, b) => (b._count?.products || 0) - (a._count?.products || 0))[0];

  return (
    <div className="flex flex-row h-[calc(100%+3rem)] -m-6 w-[calc(100%+3rem)]">
      {/* Left Panel: Category Tree */}
      <div className="w-[320px] flex-shrink-0 border-r border-gray-200 bg-gray-50/30 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
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
            // Search Results List
            <div className="space-y-1">
              {filteredCategories?.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">No se encontraron resultados</div>
              ) : (
                filteredCategories?.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory?.id === cat.id
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
            // Hierarchical Tree
            <CategoryTree
              nodes={categoryTree}
              selectedId={selectedCategory?.id}
              expandedNodes={expandedNodes}
              onSelect={(cat) => {
                setSelectedCategory(cat);
                setIsCreating(false);
                setIsEditing(false);
              }}
              onToggle={toggleExpand}
            />
          )}
        </div>
      </div>

      {/* Right Panel: Details & Analytics */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Analytics Cards */}
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
              <div className="text-lg font-bold text-gray-900 truncate" title={topCategory?.name}>{topCategory?.name || '-'}</div>
              <div className="text-xs text-emerald-600/80 mt-1">{topCategory?._count?.products || 0} productos</div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="min-h-[400px] w-full">
            {(isCreating || isEditing) ? (
              <div className="max-w-3xl animate-fadeIn">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isCreating ? 'Nueva Categoría' : 'Editar Categoría'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Complete los detalles de la categoría a continuación.</p>
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
                  <div className="grid grid-cols-2 gap-6">
                    {/* Image Upload */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Icono / Imagen</label>
                      <div className="flex items-start gap-6">
                        <div className={`w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group ${!formData.image ? 'hover:border-blue-500 hover:bg-blue-50' : ''} transition-all`}>
                          {formData.image ? (
                            <>
                              <Image
                                src={formData.image}
                                alt="Preview"
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, image: '' })}
                                  className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full h-full flex flex-col items-center justify-center text-gray-400"
                            >
                              {uploadingImage ? (
                                <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <>
                                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  <span className="text-xs font-medium">Subir Imagen</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-2">Sube un icono o imagen representativa para esta categoría.</p>
                          <p className="text-xs text-gray-400">Recomendado: PNG o SVG con fondo transparente, 500x500px.</p>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Categoría</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        placeholder="Ej. Smartphones"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Categoría Padre (Opcional)</label>
                      <select
                        value={formData.parentId || ''}
                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      >
                        <option value="">Ninguna (Categoría Raíz)</option>
                        {categories
                          .filter(c => c.id !== selectedCategory?.id)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Si selecciona una categoría padre, esta será una subcategoría.</p>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                        placeholder="Describa brevemente esta categoría..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => { setIsCreating(false); setIsEditing(false); }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={saveLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                    >
                      Guardar Categoría
                    </Button>
                  </div>
                </form>
              </div>
            ) : selectedCategory ? (
              <div className="animate-fadeIn">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex gap-6 items-start">
                    {/* Category Icon Display */}
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedCategory.image ? (
                        <Image
                          src={selectedCategory.image}
                          alt={selectedCategory.name}
                          width={96}
                          height={96}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">ID: {selectedCategory.id.substring(0, 8)}</span>
                        {selectedCategory.parentId && (
                          <>
                            <span>•</span>
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-100">
                              Subcategoría
                            </span>
                          </>
                        )}
                      </div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-3">{selectedCategory.name}</h1>
                      <p className="text-gray-600 text-lg max-w-3xl leading-relaxed">
                        {selectedCategory.description || 'Sin descripción disponible para esta categoría.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => handleEdit(selectedCategory)} className="border border-gray-200 shadow-sm">
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Detalles
                    </h3>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200/50 last:border-0">
                        <span className="text-gray-600">Productos Activos</span>
                        <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">{selectedCategory._count?.products || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200/50 last:border-0">
                        <span className="text-gray-600">Subcategorías</span>
                        <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">{selectedCategory.children?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200/50 last:border-0">
                        <span className="text-gray-600">Estado</span>
                        <span className="text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full text-xs border border-emerald-100">Activo</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Acciones Rápidas
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <button
                        onClick={() => handleCreate(selectedCategory.id)}
                        className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/5 transition-all group text-left"
                      >
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Crear Subcategoría</div>
                          <div className="text-sm text-gray-500 mt-0.5">Añadir una categoría hija a {selectedCategory.name}</div>
                        </div>
                      </button>

                      <button
                        onClick={handleViewProducts}
                        className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-purple-500 hover:shadow-md hover:shadow-purple-500/5 transition-all group text-left"
                      >
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Ver Productos</div>
                          <div className="text-sm text-gray-500 mt-0.5">Gestionar el inventario de esta categoría</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 text-gray-400 min-h-[400px]">
                <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Selecciona una categoría</h3>
                <Button variant="primary" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" onClick={() => handleCreate(null)}>
                  Crear Categoría Raíz
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scaleIn">
            <h3 className="text-lg font-bold text-[#212529] mb-2">¿Eliminar {selectedCategory.name}?</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Esta acción eliminará la categoría y todas sus subcategorías. Los productos asociados quedarán sin categoría.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button variant="primary" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} isLoading={deleteLoading}>
                Eliminar Definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Recursive Tree Component
function CategoryTree({
  nodes,
  selectedId,
  onSelect,
  expandedNodes,
  onToggle,
  level = 0
}: {
  nodes: Category[],
  selectedId?: string,
  onSelect: (c: Category) => void,
  expandedNodes: Set<string>,
  onToggle: (id: string) => void,
  level?: number
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);

        return (
          <div key={node.id}>
            <div
              className={`w-full flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-colors ${selectedId === node.id
                  ? 'bg-[#2a63cd] text-white font-medium shadow-sm'
                  : 'text-[#212529] hover:bg-[#f8f9fa]'
                }`}
              style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
              {/* Expand Toggle Button */}
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(node.id);
                  }}
                  className={`p-1 rounded hover:bg-black/10 ${selectedId === node.id ? 'text-white' : 'text-gray-500'}`}
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-5" /> // Spacer
              )}

              {/* Selection Button */}
              <button
                onClick={() => onSelect(node)}
                className="flex-1 text-left truncate flex items-center gap-2"
              >
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
