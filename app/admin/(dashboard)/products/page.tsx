'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSpinner';
import { formatPrice } from '@/lib/currency';
import { FiRefreshCw, FiCheckCircle, FiAlertCircle, FiDatabase, FiBox, FiX, FiExternalLink } from 'react-icons/fi';
import { parseProductImages } from '@/lib/product-utils';

interface Product {
  id: string;
  name: string;
  sku: string;
  priceUSD: number;
  stock: number;
  isActive: boolean;
  images?: string[];
  mainImage?: string | null;
  description?: string;
  brand?: string;
  model?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  hasDiscount?: boolean;
  discountPercent?: number;
  specifications?: Record<string, any>;
  shortCode?: string | null;
  slug?: string;
  category?: {
    name: string;
  };
  status?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Stats {
  products: {
    total: number;
    published: number;
    draft: number;
    outOfStock: number;
    inactive?: number;
  };
}

export default function ProductsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'local' | 'sades'>('local');

  // Local Products State
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currencySettings, setCurrencySettings] = useState<{
    primaryCurrency: 'USD' | 'VES' | 'EUR';
    exchangeRates: { VES: number; EUR: number };
  } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadData, setBulkUploadData] = useState<any[]>([]);
  const [bulkUploadLoading, setbulkUploadLoading] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState<any>(null);
  const [showQuickViewModal, setShowQuickViewModal] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewLoading, setQuickViewLoading] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Bulk editing state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<'price' | 'stock' | 'category' | 'status' | 'pricePercent'>('status');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [bulkEditLoading, setBulkEditLoading] = useState(false);

  // Excel Mode State
  const [isExcelMode, setIsExcelMode] = useState(false);
  const [excelUpdates, setExcelUpdates] = useState<Record<string, any>>({});
  const [excelSaving, setExcelSaving] = useState(false);

  // Status filter state
  const [filterStatus, setFilterStatus] = useState('all');

  // Sades Integration State
  const [sadesHealth, setSadesHealth] = useState<'checking' | 'ok' | 'error'>('checking');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    processed: 0,
    totalEstimado: 0,
    created: 0,
    updated: 0,
    status: 'idle'
  });
  const [syncLogs, setSyncLogs] = useState<{ message: string; timestamp: string }[]>([]);


  // Check health when tab changes to sades
  useEffect(() => {
    if (activeTab === 'sades') {
      checkSadesHealth();
    }
  }, [activeTab]);

  const addSyncLog = (message: string) => {
    setSyncLogs(prev => [{ message, timestamp: new Date().toLocaleTimeString() }, ...prev]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, statsRes, settingsRes] = await Promise.all([
        fetch('/api/products?all=true'),
        fetch('/api/categories'),
        fetch('/api/stats'),
        fetch('/api/settings')
      ]);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        // Parse images if they are strings
        const parsedProducts = productsData.map((p: any) => ({
          ...p,
          images: parseProductImages(p.images),
          priceUSD: Number(p.priceUSD),
          isActive: p.status === 'PUBLISHED' || p.isActive === true,
        }));
        setProducts(parsedProducts);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setCurrencySettings({
          primaryCurrency: (settingsData.primaryCurrency as 'USD' | 'VES' | 'EUR') || 'USD',
          exchangeRates: {
            VES: parseFloat(String(settingsData.exchangeRateVES)) || 36.50,
            EUR: parseFloat(String(settingsData.exchangeRateEUR)) || 0.92,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleExcelChange = (id: string, field: string, value: any) => {
    setExcelUpdates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleSaveExcel = async () => {
    setExcelSaving(true);
    try {
      const updates = Object.entries(excelUpdates).map(([id, data]) => ({
        id,
        ...data,
        status: data.isActive !== undefined ? (data.isActive ? 'PUBLISHED' : 'DRAFT') : undefined
      }));

      if (updates.length === 0) {
        setIsExcelMode(false);
        return;
      }

      const response = await fetch('/api/products/bulk/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        // Refresh products
        fetchData();
        setIsExcelMode(false);
        setExcelUpdates({});
      }
    } catch (error) {
      console.error('Error saving excel updates:', error);
    } finally {
      setExcelSaving(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !product.isActive,
        }),
      });

      if (response.ok) {
        setProducts(products.map(p =>
          p.id === product.id ? { ...p, isActive: !p.isActive } : p
        ));
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        if (result.archived) {
          setProducts(products.map(p =>
            p.id === selectedProduct.id
              ? { ...p, isActive: false, status: 'ARCHIVED' }
              : p
          ));
          alert(result.message || 'El producto fue archivado porque tiene órdenes asociadas.');
        } else {
          setProducts(products.filter(p => p.id !== selectedProduct.id));
        }
        setShowDeleteModal(false);
        setSelectedProduct(null);
      } else {
        alert(result.error || 'Error al eliminar el producto');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error de conexión al intentar eliminar el producto');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const detailsRes = await fetch(`/api/products/${product.id}`);
      if (!detailsRes.ok) return;

      const fullProduct = await detailsRes.json();

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${fullProduct.name} (Copia)`,
          sku: `${fullProduct.sku}-COPY-${Date.now()}`,
          description: fullProduct.description || '',
          priceUSD: fullProduct.priceUSD,
          stock: 0,
          categoryId: fullProduct.categoryId,
          brand: fullProduct.brand,
          model: fullProduct.model,
          images: fullProduct.images || [],
          mainImage: fullProduct.mainImage,
          specifications: fullProduct.specifications,
          isActive: false,
          isFeatured: false,
          isNew: false,
          hasDiscount: false,
        }),
      });

      if (response.ok) {
        const newProduct = await response.json();
        setProducts([newProduct, ...products]);
      }
    } catch (error) {
      console.error('Error duplicating product:', error);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/products/bulk/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_productos.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleExportProducts = () => {
    try {
      const headers = ['nombre', 'sku', 'descripcion', 'categoria', 'precioUSD', 'stock', 'activo', 'destacado'];
      const csvRows = [headers.join(',')];
      products.forEach(product => {
        const row = [
          product.name,
          product.sku,
          product.description || '',
          product.category?.name || '',
          product.priceUSD,
          product.stock,
          product.isActive ? 'true' : 'false',
          product.isFeatured ? 'true' : 'false',
        ].map(value => `"${value}"`);
        csvRows.push(row.join(','));
      });
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting products:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    setBulkUploadData(data);
  };

  const handleBulkUpload = async () => {
    if (bulkUploadData.length === 0) return;

    setbulkUploadLoading(true);
    try {
      const response = await fetch('/api/products/bulk/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: bulkUploadData }),
      });

      if (response.ok) {
        const results = await response.json();
        setBulkUploadResults(results);

        const productsRes = await fetch('/api/products?all=true');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.map((p: any) => ({
            ...p,
            images: parseProductImages(p.images),
            priceUSD: Number(p.priceUSD),
            isActive: p.status === 'PUBLISHED' || p.isActive === true,
          })));
        }
      }
    } catch (error) {
      console.error('Error uploading products:', error);
    } finally {
      setbulkUploadLoading(false);
    }
  };

  const handleQuickView = async (product: Product) => {
    setShowQuickViewModal(true);
    setQuickViewLoading(true);

    try {
      const response = await fetch(`/api/products/${product.id}`);
      if (response.ok) {
        const fullProduct = await response.json();
        fullProduct.images = parseProductImages(fullProduct.images);
        setQuickViewProduct(fullProduct);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setQuickViewLoading(false);
    }
  };

  const handleSelectAll = () => {
    const filteredIds = filteredProducts.map(p => p.id);
    const allFilteredSelected = filteredIds.every(id => selectedProducts.includes(id));
    if (allFilteredSelected) {
      setSelectedProducts(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedProducts(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkEdit = async () => {
    if (selectedProducts.length === 0) return;
    if (bulkEditField !== 'status' && !bulkEditValue) return;

    setBulkEditLoading(true);
    try {
      let payload: any = { productIds: selectedProducts };

      if (bulkEditField === 'status') {
        payload.field = 'status';
        payload.value = bulkEditValue || 'PUBLISHED';
      } else if (bulkEditField === 'price') {
        payload.field = 'price';
        payload.value = parseFloat(bulkEditValue);
      } else if (bulkEditField === 'pricePercent') {
        payload.field = 'pricePercent';
        payload.value = parseFloat(bulkEditValue);
      } else if (bulkEditField === 'stock') {
        payload.field = 'stock';
        payload.value = parseInt(bulkEditValue);
      } else if (bulkEditField === 'category') {
        payload.field = 'category';
        payload.value = bulkEditValue;
      }

      const response = await fetch('/api/products/bulk/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchData();
        setShowBulkEditModal(false);
        setSelectedProducts([]);
        setBulkEditValue('');
      } else {
        const err = await response.json();
        alert(err.error || 'Error al aplicar cambios masivos');
      }
    } catch (error) {
      console.error('Error bulk editing:', error);
      alert('Error de conexión');
    } finally {
      setBulkEditLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;

    if (!confirm(`¿Eliminar ${selectedProducts.length} productos seleccionados? Los que tengan órdenes asociadas serán archivados.`)) return;

    try {
      const results = await Promise.all(
        selectedProducts.map(id =>
          fetch(`/api/products/${id}`, { method: 'DELETE' }).then(r => r.json().then(data => ({ id, ...data, ok: r.ok })))
        )
      );

      const archived = results.filter(r => r.ok && r.archived).length;
      const deleted = results.filter(r => r.ok && !r.archived).length;
      const failed = results.filter(r => !r.ok).length;

      setProducts(prev =>
        prev
          .filter(p => !selectedProducts.includes(p.id) || results.find(r => r.id === p.id)?.archived)
          .map(p => {
            const result = results.find(r => r.id === p.id);
            if (result?.archived) return { ...p, isActive: false, status: 'ARCHIVED' };
            return p;
          })
      );
      setSelectedProducts([]);

      const parts = [];
      if (deleted > 0) parts.push(`${deleted} eliminado${deleted > 1 ? 's' : ''}`);
      if (archived > 0) parts.push(`${archived} archivado${archived > 1 ? 's' : ''} (tienen órdenes)`);
      if (failed > 0) parts.push(`${failed} con error`);
      if (parts.length > 0) alert(parts.join(', '));
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('Error de conexión al intentar eliminar los productos');
    }
  };

  // --- SADES LOGIC ---
  const checkSadesHealth = async () => {
    setSadesHealth('checking');
    try {
      const res = await fetch('/api/admin/sades/health');
      setSadesHealth(res.ok ? 'ok' : 'error');
    } catch {
      setSadesHealth('error');
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;

    const confirmSync = window.confirm(
      "¿Estás seguro de iniciar la sincronización?\n\n" +
      "• Se actualizarán precios y stocks de productos existentes (por SKU).\n" +
      "• Se crearán nuevos productos como BORRADOR.\n" +
      "• Se descargarán las imágenes.\n\n" +
      "Este proceso puede tardar varios minutos."
    );

    if (!confirmSync) return;

    setIsSyncing(true);
    setSyncProgress({ processed: 0, totalEstimado: 0, created: 0, updated: 0, status: 'starting' });
    setSyncLogs([{ message: 'Iniciando sincronización...', timestamp: new Date().toLocaleTimeString() }]);

    let cursor = 0;
    let hasMore = true;
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;

    try {
      while (hasMore) {
        addSyncLog(`Solicitando lote (cursor: ${cursor})...`);

        const res = await fetch('/api/admin/sades/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursor })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error en la sincronización');
        }

        const data = await res.json();

        totalProcessed += data.processed;
        totalCreated += data.created;
        totalUpdated += data.updated;

        setSyncProgress({
          processed: totalProcessed,
          totalEstimado: data.hasMore ? totalProcessed + 100 : totalProcessed,
          created: totalCreated,
          updated: totalUpdated,
          status: 'processing'
        });

        addSyncLog(`✅ Lote procesado: ${data.processed} items (${data.created} nuevos, ${data.updated} actualizados)`);

        cursor = data.nextCursor;
        hasMore = data.hasMore;

        await new Promise(r => setTimeout(r, 1000));
      }

      addSyncLog('🎉 Sincronización completada con éxito.');
      setSyncProgress(prev => ({ ...prev, status: 'completed' }));

      fetchData();

    } catch (error: any) {
      console.error('Sync error:', error);
      addSyncLog(`❌ Error crítico: ${error.message}`);
      setSyncProgress(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsSyncing(false);
    }
  };

  const renderTabNavigation = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
      <button
        onClick={() => setActiveTab('local')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'local'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
          }`}
      >
        Catálogo Local
      </button>
      <button
        onClick={() => setActiveTab('sades')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'sades'
            ? 'bg-white text-purple-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
          }`}
      >
        <FiDatabase className="w-4 h-4" />
        Conexión ElectroCaja/Sades
      </button>
    </div>
  );

  const renderSadesView = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${sadesHealth === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <FiDatabase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Conexión ElectroCaja / Sades</h2>
              <p className="text-sm text-gray-500">Sincroniza inventario, precios e imágenes en tiempo real.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex h-3 w-3 rounded-full ${sadesHealth === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-gray-700">
              {sadesHealth === 'ok' ? 'Conectado' : 'Sin Conexión'}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Fuente de Verdad</p>
              <p className="font-medium text-gray-900">SADES (Remoto)</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Modo de Sync</p>
              <p className="font-medium text-gray-900">Actualizar + Crear Borradores</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Identificador</p>
              <p className="font-medium text-gray-900">SKU (Código de Barras)</p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleSync}
            isLoading={isSyncing}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
          >
            <FiRefreshCw className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Todo Ahora'}
          </Button>
        </div>
      </div>

      {/* Sync Progress UI */}
      {(isSyncing || syncProgress.status !== 'idle') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Progreso de Sincronización</h3>
            <span className="text-xs font-mono text-gray-500">
              {syncProgress.processed} items procesados
            </span>
          </div>

          <div className="p-6 space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min((syncProgress.processed / (syncProgress.totalEstimado || 1)) * 100, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{syncProgress.created}</p>
                <p className="text-xs text-green-800">Nuevos (Borradores)</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{syncProgress.updated}</p>
                <p className="text-xs text-blue-800">Actualizados</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">{syncProgress.processed}</p>
                <p className="text-xs text-gray-800">Total Escaneados</p>
              </div>
            </div>

            {/* Logs Console */}
            <div className="mt-4 bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 h-48 overflow-y-auto custom-scrollbar">
              {syncLogs.length === 0 ? (
                <span className="text-gray-600 italic">Esperando inicio de logs...</span>
              ) : (
                syncLogs.map((log, i) => (
                  <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                    <span className="text-purple-400 mr-2">[{log.timestamp}]</span>
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const filteredProducts = products
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => filterCategory === 'all' || p.category?.name === categories.find(c => c.id === filterCategory)?.name)
    .filter(p => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'published') return p.isActive;
      if (filterStatus === 'draft') return !p.isActive && p.status !== 'ARCHIVED';
      if (filterStatus === 'out-of-stock') return p.stock <= 0;
      return true;
    });

  const renderLocalView = () => (
    <>
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Header */}
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-semibold text-[#212529]">
                Productos
              </h1>
              <p className="text-sm text-[#6a6c6b] mt-0.5">
                Administra el catálogo de productos
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Botón Carga Masiva */}
              <div className="group relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowBulkUploadModal(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Carga Masiva
                </Button>
              </div>

              {/* Botón Exportar */}
              <div className="group relative">
                <Button
                  variant="ghost"
                  onClick={handleExportProducts}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar
                </Button>
              </div>

              {/* Botón Nuevo Producto */}
              <Button
                variant="primary"
                onClick={() => router.push('/admin/products/new')}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Producto
              </Button>

              {/* Botones Edición Rápida */}
              {isExcelMode ? (
                <div className="flex items-center gap-2 animate-fadeIn">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsExcelMode(false);
                      setExcelUpdates({});
                    }}
                    className="text-red-600 hover:bg-red-50 border border-red-100"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveExcel}
                    isLoading={excelSaving}
                    disabled={Object.keys(excelUpdates).length === 0}
                    className="bg-black text-white hover:bg-gray-800 shadow-lg"
                  >
                    Guardar ({Object.keys(excelUpdates).length})
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setIsExcelMode(true)}
                  className="text-[#2a63cd] hover:bg-blue-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Edición Rápida
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 stagger-children">
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 bg-[#2a63cd]/10 rounded-lg">
                <svg className="w-4 h-4 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[#6a6c6b] font-medium">Total</p>
                <p className="text-lg font-semibold text-[#212529]">
                  {isLoading ? '...' : stats?.products.total || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 bg-green-500/10 rounded-lg">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[#6a6c6b] font-medium">Publicados</p>
                <p className="text-lg font-semibold text-[#212529]">
                  {isLoading ? '...' : stats?.products.published || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 bg-orange-500/10 rounded-lg">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[#6a6c6b] font-medium">Borradores</p>
                <p className="text-lg font-semibold text-[#212529]">
                  {isLoading ? '...' : stats?.products.draft || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 bg-gray-500/10 rounded-lg">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[#6a6c6b] font-medium">Inactivos</p>
                <p className="text-lg font-semibold text-[#212529]">
                  {isLoading ? '...' : stats?.products.inactive || 0} {/* Fixed stat key */}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 bg-red-500/10 rounded-lg">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[#6a6c6b] font-medium">Sin Stock</p>
                <p className="text-lg font-semibold text-[#212529]">
                  {isLoading ? '...' : stats?.products.outOfStock || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm animate-slideInRight">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6a6c6b]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg text-[#212529] placeholder:text-[#adb5bd] focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-4 focus:ring-[#2a63cd]/10 transition-all duration-200"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg text-[#212529] focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-4 focus:ring-[#2a63cd]/10 transition-all duration-200"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg text-[#212529] focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-4 focus:ring-[#2a63cd]/10 transition-all duration-200"
            >
              <option value="all">Todos los estados</option>
              <option value="published">Publicado</option>
              <option value="draft">Borrador</option>
              <option value="out-of-stock">Sin Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedProducts.length > 0 && (
        <div className="flex items-center gap-3 bg-[#2a63cd] text-white px-4 py-3 rounded-lg shadow-lg animate-fadeIn">
          <span className="text-sm font-semibold">{selectedProducts.length} producto{selectedProducts.length > 1 ? 's' : ''} seleccionado{selectedProducts.length > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={() => { setBulkEditField('status'); setBulkEditValue('PUBLISHED'); setShowBulkEditModal(true); }} className="text-white hover:bg-white/20 border border-white/30">
              Activar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setBulkEditField('status'); setBulkEditValue('DRAFT'); setShowBulkEditModal(true); }} className="text-white hover:bg-white/20 border border-white/30">
              Desactivar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setBulkEditField('pricePercent'); setBulkEditValue(''); setShowBulkEditModal(true); }} className="text-white hover:bg-white/20 border border-white/30">
              Cambiar Precio
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setBulkEditField('category'); setBulkEditValue(''); setShowBulkEditModal(true); }} className="text-white hover:bg-white/20 border border-white/30">
              Mover Categoría
            </Button>
            <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="text-red-200 hover:bg-red-500/30 border border-red-300/50">
              Eliminar
            </Button>
            <button onClick={() => setSelectedProducts([])} className="ml-2 text-white/60 hover:text-white text-xs">✕ Limpiar</button>
          </div>
        </div>
      )}

      {/* Scrollable Products Table */}
      <div className="flex-1 overflow-y-auto pr-2 mt-4">
        <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden animate-scaleIn">
          <div className="px-4 py-3 border-b border-[#e9ecef]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#212529]">Listado de Productos</h2>
              <div className="flex items-center gap-1.5 text-xs text-[#6a6c6b]">
                <span>Mostrando</span>
                <span className="font-semibold text-[#212529]">{filteredProducts.length}</span>
                {filteredProducts.length !== products.length && (
                  <span className="text-[#6a6c6b]">de {products.length}</span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
            {isLoading ? (
              <TableSkeleton rows={3} />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                title="No hay productos"
                action={<Button variant="primary" onClick={() => router.push('/admin/products/new')}>Agregar Producto</Button>}
              />
            ) : (
              filteredProducts.map((product) => {
                const price = currencySettings
                  ? formatPrice(
                    parseFloat(String(product.priceUSD)),
                    currencySettings.primaryCurrency,
                    currencySettings.exchangeRates
                  )
                  : `$${parseFloat(String(product.priceUSD)).toFixed(2)}`;

                return (
                  <div key={product.id} className="bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      <div className="flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden bg-[#f8f9fa] border border-[#e9ecef]">
                        {(product.mainImage || (product.images && product.images.length > 0)) && !failedImages.has(product.id) ? (
                          <Image
                            src={product.mainImage || product.images![0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                            onError={() => setFailedImages(prev => new Set(prev).add(product.id))}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-0 bg-gray-100">
                            <Image
                              src="/images/no-image.png"
                              alt="Sin imagen"
                              fill
                              className="object-cover opacity-60"
                            />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-semibold text-[#212529] line-clamp-2">{product.name}</h3>
                          <p className="text-xs text-[#6a6c6b] mt-0.5">SKU: {product.sku}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${product.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                            }`}>
                            {product.isActive ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                          <span className="text-sm font-bold text-[#2a63cd]">{price}</span>
                        </div>
                      </div>
                    </div>
                    {/* Botones de acción móvil */}
                    <div className="mt-4 flex gap-2 pt-3 border-t border-[#e9ecef]">
                      <Button variant="ghost" size="sm" onClick={() => handleQuickView(product)} className="flex-1 text-xs justify-center">
                        Ver
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/products/${product.id}`)} className="flex-1 text-xs justify-center">
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-xs justify-center text-red-600 hover:bg-red-50" onClick={() => { setSelectedProduct(product); setShowDeleteModal(true); }}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto border-t border-[#e9ecef]">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-[#f8f9fa]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider sticky left-0 bg-[#f8f9fa] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef] bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4">
                      <TableSkeleton rows={5} />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <EmptyState
                        title="No se encontraron productos"
                        icon={<FiBox className="w-10 h-10 text-gray-300 mx-auto mb-2" />}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#f8f9fa] transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white group-hover:bg-[#f8f9fa] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10 relative rounded overflow-hidden bg-gray-100 border border-gray-200">
                              {(product.mainImage || (product.images && product.images.length > 0)) && !failedImages.has(product.id) ? (
                                <Image
                                  src={product.mainImage || product.images![0]}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  onError={() => setFailedImages(prev => new Set(prev).add(product.id))}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FiBox className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-[#212529] max-w-[200px] truncate" title={product.name}>{product.name}</div>
                              {product.isFeatured && <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded ml-1">Destacado</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6a6c6b]">{product.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6a6c6b]">{product.category?.name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#212529]">{product.priceUSD} USD</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6a6c6b]">
                          <span className={product.stock <= 5 ? "text-red-600 font-medium" : ""}>
                            {product.stock} u.
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button onClick={() => handleToggleStatus(product)} className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition-colors ${product.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}>
                            {product.isActive ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end items-center gap-1">
                            <button onClick={() => handleDuplicate(product)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Duplicar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            </button>
                            <button onClick={() => handleQuickView(product)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Vista rápida">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            <button onClick={() => router.push(`/admin/products/${product.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => { setSelectedProduct(product); setShowDeleteModal(true); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-2">Eliminar Producto</h3>
            <p className="text-gray-600 mb-6">¿Estás seguro de que deseas eliminar "{selectedProduct.name}"? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleDelete} isLoading={deleteLoading} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">Eliminar</Button>
            </div>
          </div>
        </div>
      )}

      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-gray-900">
                Edición Masiva — {selectedProducts.length} producto{selectedProducts.length > 1 ? 's' : ''}
              </h3>
              <button onClick={() => setShowBulkEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operación</label>
                <select
                  value={bulkEditField}
                  onChange={(e) => { setBulkEditField(e.target.value as any); setBulkEditValue(''); }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="status">Cambiar estado (activar/desactivar)</option>
                  <option value="pricePercent">Cambiar precio por % (ej: +10% o -5%)</option>
                  <option value="price">Establecer precio fijo (USD)</option>
                  <option value="category">Mover a categoría</option>
                </select>
              </div>

              {bulkEditField === 'status' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Estado</label>
                  <select
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="PUBLISHED">Activo (Publicado)</option>
                    <option value="DRAFT">Borrador (Inactivo)</option>
                  </select>
                </div>
              )}

              {bulkEditField === 'pricePercent' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje de cambio</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                      placeholder="Ej: 10 para +10%, -5 para -5%"
                      className="w-full px-3 py-2.5 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Positivo sube el precio, negativo lo baja.</p>
                </div>
              )}

              {bulkEditField === 'price' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo precio (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {bulkEditField === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva categoría</label>
                  <select
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setShowBulkEditModal(false)}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={handleBulkEdit}
                isLoading={bulkEditLoading}
                disabled={bulkEditField !== 'status' && !bulkEditValue}
                className="bg-[#2a63cd] hover:bg-[#1e4ba3] text-white"
              >
                Aplicar a {selectedProducts.length} producto{selectedProducts.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick View Modal ──────────────────────────────────────────── */}
      {showQuickViewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Vista Rápida</h3>
              <button
                onClick={() => { setShowQuickViewModal(false); setQuickViewProduct(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            {quickViewLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : quickViewProduct ? (
              <div className="flex flex-col sm:flex-row overflow-y-auto flex-1">
                {/* Image */}
                <div className="sm:w-56 flex-shrink-0 bg-gray-50 flex items-center justify-center p-6 border-b sm:border-b-0 sm:border-r border-gray-100">
                  {(quickViewProduct.images && quickViewProduct.images.length > 0) ? (
                    <div className="relative w-40 h-40">
                      <Image
                        src={quickViewProduct.images[0]}
                        alt={quickViewProduct.name}
                        fill
                        className="object-contain rounded-xl"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-white rounded-xl border border-gray-200 flex items-center justify-center">
                      <FiBox className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-6 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-bold text-gray-900 leading-tight">{quickViewProduct.name}</h2>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${quickViewProduct.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {quickViewProduct.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-1">SKU: {quickViewProduct.sku}</p>
                    {quickViewProduct.isFeatured && (
                      <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">⭐ Destacado</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#f8f9fa] rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Precio</p>
                      <p className="text-base font-bold text-gray-900">${Number(quickViewProduct.priceUSD).toFixed(2)} USD</p>
                    </div>
                    <div className="bg-[#f8f9fa] rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Stock</p>
                      <p className={`text-base font-bold ${(quickViewProduct.stock || 0) <= 5 ? 'text-red-600' : 'text-gray-900'}`}>
                        {quickViewProduct.stock} u.
                      </p>
                    </div>
                    <div className="bg-[#f8f9fa] rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Categoría</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{quickViewProduct.category?.name || '-'}</p>
                    </div>
                    <div className="bg-[#f8f9fa] rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Tipo</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {(quickViewProduct as any).productType === 'DIGITAL' ? '⚡ Digital' : '📦 Físico'}
                      </p>
                    </div>
                  </div>

                  {quickViewProduct.description && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Descripción</p>
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{quickViewProduct.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Footer */}
            {quickViewProduct && !quickViewLoading && (
              <div className="px-6 py-3 border-t border-gray-100 bg-[#f8f9fa] flex items-center justify-between gap-3">
                <button
                  onClick={() => { handleToggleStatus(quickViewProduct); setShowQuickViewModal(false); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    quickViewProduct.isActive
                      ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                      : 'border-green-200 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {quickViewProduct.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`/productos/${(quickViewProduct as any).slug || quickViewProduct.id}`, '_blank')}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white transition-colors"
                  >
                    <FiExternalLink className="w-3.5 h-3.5" />
                    Ver en tienda
                  </button>
                  <button
                    onClick={() => { setShowQuickViewModal(false); router.push(`/admin/products/${quickViewProduct.id}`); }}
                    className="flex items-center gap-2 px-5 py-2 bg-[#2a63cd] text-white text-xs font-semibold rounded-lg hover:bg-[#1e4ba3] transition-colors"
                  >
                    Editar producto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Carga Masiva de Productos</h3>
              <button onClick={() => setShowBulkUploadModal(false)} className="text-gray-400 hover:text-gray-600"><FiX className="w-5 h-5" /></button>
            </div>

            {!bulkUploadResults ? (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                  <p className="font-semibold mb-1">Instrucciones:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Utiliza el archivo CSV (Excel) para cargar múltiples productos.</li>
                    <li>Las imágenes deben ser URLs públicas o rutas relativas si ya están en el servidor.</li>
                    <li>El SKU debe ser único.</li>
                  </ul>
                  <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="mt-3 text-blue-700 underline pl-0">Descargar Plantilla CSV</Button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csvUpload" />
                  <label htmlFor="csvUpload" className="cursor-pointer block">
                    <FiBox className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">Click para seleccionar archivo CSV</p>
                    <p className="text-xs text-gray-400 mt-1">Soporta solo archivos .csv</p>
                  </label>
                </div>

                {bulkUploadData.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Vista Previa ({bulkUploadData.length} productos)</p>
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-gray-50 font-medium text-gray-500">
                          <tr>
                            {Object.keys(bulkUploadData[0]).slice(0, 5).map(k => <th key={k} className="px-3 py-2">{k}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {bulkUploadData.slice(0, 5).map((row, i) => (
                            <tr key={i}>
                              {Object.values(row).slice(0, 5).map((v: any, j) => <td key={j} className="px-3 py-2">{v}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bulkUploadData.length > 5 && <p className="p-2 text-center text-xs text-gray-500 italic">... y {bulkUploadData.length - 5} más</p>}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <Button variant="ghost" onClick={() => setBulkUploadData([])}>Descartar</Button>
                      <Button variant="primary" onClick={handleBulkUpload} isLoading={bulkUploadLoading}>Procesar Carga</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className={`p-4 rounded-lg flex items-center gap-3 ${bulkUploadResults.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                  {bulkUploadResults.error ? <FiAlertCircle className="w-6 h-6" /> : <FiCheckCircle className="w-6 h-6" />}
                  <div>
                    <p className="font-bold">{bulkUploadResults.message || (bulkUploadResults.error ? 'Error en la carga' : 'Carga Exitosa')}</p>
                    {bulkUploadResults.details && <p className="text-sm mt-1">{bulkUploadResults.details}</p>}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={() => { setShowBulkUploadModal(false); setBulkUploadResults(null); setBulkUploadData([]); }}>Cerrar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="h-full flex flex-col p-6 max-w-[1600px] mx-auto">
      {renderTabNavigation()}
      {activeTab === 'local' ? renderLocalView() : renderSadesView()}
    </div>
  );
}
