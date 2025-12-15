'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import FadeIn from '@/components/ui/FadeIn';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceUSD: number;
  category: Category;
  stock: number;
  images: string[];
  mainImage?: string | null;
  isFeatured: boolean;
  isNew: boolean;
  hasDiscount: boolean;
  discountPercent?: number;
  brand?: string;
  createdAt: string;
}

interface ProductosClientProps {
  initialProducts: Product[];
  initialCategories: Category[];
}

export default function ProductosClient({ initialProducts, initialCategories }: ProductosClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const filteredProducts = initialProducts
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.category.slug === selectedCategory;
      const matchesPrice = product.priceUSD >= priceRange[0] && product.priceUSD <= priceRange[1];
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.priceUSD - b.priceUSD;
        case 'price-desc':
          return b.priceUSD - a.priceUSD;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar - Premium Glass Design */}
        <aside className="lg:w-80 flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Search Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-[#212529]">Buscar</h2>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm bg-white/50 backdrop-blur-sm transition-all"
                />
                <svg className="w-5 h-5 text-[#6a6c6b] absolute left-3 top-1/2 transform -translate-y-1/2 group-focus-within:text-[#2a63cd] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filter Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-[#212529]">Categoría</h2>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${selectedCategory === ''
                    ? 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white shadow-lg'
                    : 'bg-gray-50 text-[#212529] hover:bg-gray-100'
                    }`}
                >
                  <span className="text-sm font-medium">Todas las categorías</span>
                </button>
                {initialCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${selectedCategory === cat.slug
                      ? 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white shadow-lg'
                      : 'bg-gray-50 text-[#212529] hover:bg-gray-100'
                      }`}
                  >
                    <span className="text-sm font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-[#212529]">Rango de Precio</h2>
              </div>
              <div className="space-y-4">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2a63cd]"
                />
                <div className="flex justify-between items-center">
                  <div className="px-4 py-2 bg-gradient-to-r from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-lg">
                    <span className="text-sm font-bold text-[#2a63cd]">${priceRange[0]}</span>
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-lg">
                    <span className="text-sm font-bold text-[#2a63cd]">${priceRange[1]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sort Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-[#212529]">Ordenar por</h2>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm bg-white/50 backdrop-blur-sm font-medium"
              >
                <option value="newest">Más recientes</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || selectedCategory || priceRange[1] < 10000) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setPriceRange([0, 10000]);
                  setCurrentPage(1);
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:from-[#1e4ba3] hover:to-[#1a3b7e] transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {currentProducts.length === 0 ? (
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 px-12 py-12 text-center shadow-2xl w-full">
              <div className="relative w-full max-w-4xl mx-auto">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#212529] mb-3">
                  No se encontraron productos
                </h3>
                <p className="text-[#6a6c6b] mb-6 text-base leading-normal block w-full">
                  Ajusta tus filtros o busca con otros términos.
                </p>
                <Link
                  href="/solicitar-producto"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-2xl transition-all hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Solicitar Producto Personalizado
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#212529] mb-1">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'Producto' : 'Productos'}
                  </h2>
                  <p className="text-sm text-[#6a6c6b]">
                    Mostrando {indexOfFirstProduct + 1}-{Math.min(indexOfLastProduct, filteredProducts.length)} de {filteredProducts.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 bg-gradient-to-r from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-xl">
                    <span className="text-sm font-bold text-[#2a63cd]">Página {currentPage} de {totalPages}</span>
                  </div>
                </div>
              </div>

              {/* Products Grid with Premium 3D Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {currentProducts.map((product, index) => (
                  <FadeIn key={product.id} delay={index * 0.05} duration={0.5}>
                    <ProductCard product={product} />
                  </FadeIn>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl font-bold transition-all ${currentPage === page
                          ? 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white shadow-lg'
                          : 'bg-white border border-gray-200 text-[#212529] hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
