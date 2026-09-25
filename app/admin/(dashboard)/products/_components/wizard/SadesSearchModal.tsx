'use client';

import { useState, useEffect, useRef } from 'react';
import { FiX, FiSearch, FiDownload, FiPackage } from 'react-icons/fi';
import { WizardData } from './types';
import { formatUSD } from '@/lib/currency';

interface SadesResult {
  sku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precioUSD: number;
  stock: number;
  imagenApiUrl: string | null;
}

interface Props {
  onImport: (updates: Partial<WizardData>) => void;
  onClose: () => void;
}

export default function SadesSearchModal({ onImport, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SadesResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
    doSearch('');
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const doSearch = async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/sades/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Error al buscar en SADES');
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al buscar en SADES');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (product: SadesResult) => {
    setImporting(product.sku);
    try {
      // Build a slug from the name
      const slug = product.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const updates: Partial<WizardData> = {
        name: product.nombre,
        sku: product.sku,
        description: product.descripcion || '',
        priceUSD: product.precioUSD?.toString() || '',
        stock: product.stock?.toString() || '0',
      };

      // If SADES provides an image URL, include it
      if (product.imagenApiUrl) {
        updates.images = [product.imagenApiUrl];
      }

      onImport(updates);
      onClose();
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h2 className="text-lg font-bold text-ink">Importar desde SADES</h2>
            <p className="text-sm text-muted mt-0.5">Busca un producto del catálogo para pre-llenar el formulario</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-ink-soft hover:bg-surface rounded-xl transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-line">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, SKU o categoría..."
              className="w-full pl-9 pr-4 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 bg-deal-bg border border-deal/30 rounded-xl text-sm text-deal">{error}</div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <FiSearch className="w-10 h-10 mb-3" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          )}

          {results.map((product) => (
            <div
              key={product.sku}
              className="flex items-center gap-4 px-6 py-3 border-b border-line hover:bg-surface transition-colors group"
            >
              {/* Image placeholder */}
              <div className="w-12 h-12 rounded-lg bg-surface flex-shrink-0 overflow-hidden border border-line flex items-center justify-center">
                {product.imagenApiUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imagenApiUrl}
                    alt={product.nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <FiPackage className="h-5 w-5 text-muted" aria-hidden="true" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{product.nombre}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted font-mono">SKU: {product.sku}</span>
                  <span className="text-xs text-muted">{product.categoria}</span>
                </div>
              </div>

              {/* Price & stock */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-ink">{product.precioUSD != null ? formatUSD(product.precioUSD) : '—'}</p>
                <p className={`text-xs mt-0.5 ${product.stock > 0 ? 'text-success-strong' : 'text-deal'}`}>
                  Stock: {product.stock}
                </p>
              </div>

              {/* Import button */}
              <button
                onClick={() => handleImport(product)}
                disabled={importing === product.sku}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-60 flex-shrink-0 opacity-0 group-hover:opacity-100"
              >
                {importing === product.sku ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiDownload className="w-4 h-4" />
                )}
                Importar
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-surface">
          <p className="text-xs text-muted">
            Los datos importados pre-llenan el formulario. Puedes editarlos antes de publicar.
          </p>
        </div>
      </div>
    </div>
  );
}
