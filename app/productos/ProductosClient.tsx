'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import FadeIn from '@/components/ui/FadeIn';
import { FiSearch, FiFilter, FiX, FiChevronLeft, FiChevronRight, FiSliders } from 'react-icons/fi';
import { useSettings } from '@/contexts/SettingsContext';

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
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('Buscar productos...');

  // Typing animation for search input placeholder
  useEffect(() => {
    const phrases = [
      '¿Qué estás buscando hoy?',
      'Buscar laptops...',
      'Buscar audífonos inalámbricos...',
      'Buscar cargador rápido...',
      'Buscar corneta bluetooth...',
      'Buscar tarjeta de video...',
      'Buscar mouse gamer...',
      'Buscar cable HDMI...'
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const type = () => {
      const currentPhrase = phrases[phraseIndex];
      
      if (isDeleting) {
        setAnimatedPlaceholder(currentPhrase.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setAnimatedPlaceholder(currentPhrase.substring(0, charIndex + 1));
        charIndex++;
      }

      let typingSpeed = isDeleting ? 30 : 70;

      if (!isDeleting && charIndex === currentPhrase.length) {
        typingSpeed = 2000; // Pause when finished typing
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typingSpeed = 400; // Pause before starting next phrase
      }

      timeoutId = setTimeout(type, typingSpeed);
    };

    type();
    return () => clearTimeout(timeoutId);
  }, []);

  const whatsappNumber = settings?.whatsapp || '584241234567';
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`;

  // Responsive: 8 en mobile (2 cols), 12 en tablet (3 cols), 12 en desktop (4 cols)
  const [productsPerPage, setProductsPerPage] = useState(12);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      if (width < 768) {
        setProductsPerPage(8); // 2 columns x 4 rows
      } else if (width < 1280) {
        setProductsPerPage(12); // 3 columns x 4 rows
      } else {
        setProductsPerPage(12); // 4 columns x 3 rows (keeps the grid perfectly full!)
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Leer parámetros de búsqueda y categoría desde la URL al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const querySearch = params.get('search');
      const queryCategory = params.get('category');
      if (querySearch) {
        setSearchTerm(querySearch);
      }
      if (queryCategory) {
        setSelectedCategory(queryCategory);
      }
    }
  }, []);

  // Lock body scroll when mobile filters are open
  useEffect(() => {
    if (showMobileFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMobileFilters]);

  const filteredProducts = initialProducts
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.category.slug === selectedCategory;
      const matchesPrice = product.priceUSD >= priceRange[0] && product.priceUSD <= priceRange[1];
      const matchesFeatured = sortBy !== 'featured' || product.isFeatured;
      return matchesSearch && matchesCategory && matchesPrice && matchesFeatured;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.priceUSD - b.priceUSD;
        case 'price-desc': return b.priceUSD - a.priceUSD;
        case 'name': return a.name.localeCompare(b.name);
        case 'featured': return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        case 'newest':
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const hasActiveFilters = searchTerm || selectedCategory || priceRange[1] < 10000;
  const activeFiltersCount = [searchTerm, selectedCategory, priceRange[1] < 10000].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPriceRange([0, 10000]);
    setCurrentPage(1);
  };

  // Pagination numbers for mobile (max 5 visible)
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <>
      {/* Mobile Search Bar - Sticky */}
      <div className="lg:hidden sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2">
          <div className="relative flex-1 group/msearch">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/90 w-5 h-5 group-focus-within/msearch:scale-110 group-focus-within/msearch:rotate-6 transition-transform duration-300" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder={animatedPlaceholder}
              className="w-full pl-10 pr-10 py-2.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] border border-blue-400/20 rounded-xl text-white placeholder-blue-100/70 text-sm focus:outline-none focus:border-white focus:ring-0 transition-all shadow-[0_2px_10px_rgba(42,99,205,0.1)] focus:shadow-[0_4px_15px_rgba(42,99,205,0.2)] font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowMobileFilters(true)}
            className="relative flex items-center justify-center w-11 h-11 bg-[#2a63cd] text-white rounded-xl shadow-lg hover:bg-[#1e4ba3] transition-all duration-300 active:scale-95"
          >
            <FiSliders className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#2a63cd]/10 text-[#2a63cd] text-xs font-medium rounded-full">
                {initialCategories.find(c => c.slug === selectedCategory)?.name}
                <button onClick={() => { setSelectedCategory(''); setCurrentPage(1); }}>
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            )}
            {priceRange[1] < 10000 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#2a63cd]/10 text-[#2a63cd] text-xs font-medium rounded-full">
                Hasta ${priceRange[1]}
                <button onClick={() => { setPriceRange([0, 10000]); setCurrentPage(1); }}>
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-full"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Filtros</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="overflow-y-auto h-[calc(100vh-140px)] p-4 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Categoría</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => { setSelectedCategory(''); setCurrentPage(1); }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium ${selectedCategory === ''
                      ? 'bg-[#2a63cd] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    Todas las categorías
                  </button>
                  {initialCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.slug); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium ${selectedCategory === cat.slug
                        ? 'bg-[#2a63cd] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Rango de Precio</h3>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => { setPriceRange([0, parseInt(e.target.value)]); setCurrentPage(1); }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2a63cd]"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-sm font-bold text-[#2a63cd]">${priceRange[0]}</span>
                  <span className="text-sm font-bold text-[#2a63cd]">${priceRange[1]}</span>
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Ordenar por</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2a63cd]"
                >
                  <option value="newest">Más recientes</option>
                  <option value="featured">★ Destacados</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
                >
                  Limpiar
                </button>
              )}
              <button
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 py-3 bg-[#2a63cd] text-white font-bold rounded-xl"
              >
                Ver {filteredProducts.length} productos
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Desktop Left Sidebar Filters */}
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_10px_35px_-5px_rgba(42,99,205,0.04)] space-y-5">
              

              {/* Categories */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categoría</h4>
                <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
                  <button
                    onClick={() => { setSelectedCategory(''); setCurrentPage(1); }}
                    className={`w-full text-left py-2 rounded-r-xl text-sm font-medium transition-all duration-200 flex items-center justify-between border-l-4 ${
                      selectedCategory === ''
                        ? 'bg-gradient-to-r from-blue-50/70 to-transparent text-[#2a63cd] font-bold border-[#2a63cd] pl-2.5'
                        : 'text-gray-600 hover:bg-gray-50/50 hover:text-gray-900 border-transparent pl-2.5'
                    }`}
                  >
                    <span>Todas las categorías</span>
                  </button>
                  {initialCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.slug); setCurrentPage(1); }}
                      className={`w-full text-left py-2 rounded-r-xl text-sm font-medium transition-all duration-200 flex items-center justify-between border-l-4 ${
                        selectedCategory === cat.slug
                          ? 'bg-gradient-to-r from-blue-50/70 to-transparent text-[#2a63cd] font-bold border-[#2a63cd] pl-2.5'
                          : 'text-gray-600 hover:bg-gray-50/50 hover:text-gray-900 border-transparent pl-2.5'
                      }`}
                    >
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Precio Máximo</h4>
                  <span className="text-sm font-black text-[#2a63cd]">
                    ${priceRange[1] === 10000 ? '10k+' : priceRange[1]}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => { setPriceRange([0, parseInt(e.target.value)]); setCurrentPage(1); }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2a63cd]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                  <span>$0</span>
                  <span>$10,000+</span>
                </div>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordenar por</h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2a63cd] cursor-pointer"
                >
                  <option value="newest">Más recientes</option>
                  <option value="featured">★ Destacados</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <FiX className="w-4 h-4" />
                  Limpiar Filtros
                </button>
              )}

              {/* Promo Banner Card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] text-white p-4 shadow-[0_4px_15px_rgba(42,99,205,0.15)] group">
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10 flex flex-col">
                  <span className="inline-block self-start px-2 py-0.5 bg-white/20 rounded-full text-[9px] uppercase tracking-wider font-extrabold mb-2">
                    Soporte
                  </span>
                  <h5 className="text-sm font-extrabold mb-1">¿Dudas con un producto?</h5>
                  <p className="text-[11px] text-blue-100 leading-relaxed mb-3.5">
                    Contáctanos directamente vía WhatsApp para atención directa y personalizada.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full py-2 bg-white text-[#2a63cd] text-xs font-bold rounded-xl hover:bg-blue-50 active:scale-95 transition-all shadow-sm"
                  >
                    Hablar con un asesor
                  </a>
                </div>
              </div>

            </div>
          </aside>

          {/* Products Section */}
          <div className="flex-1">
            
            {/* Desktop Search Bar - Wide & Centered above products */}
            <div className="hidden lg:block mb-8 max-w-2xl mx-auto w-full animate-fadeIn">
              <div className="relative group/search">
                {/* Glowing background blur effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#2a63cd]/20 to-blue-500/10 rounded-2xl blur-lg opacity-85 group-focus-within/search:opacity-100 group-hover/search:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative flex items-center bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] border border-blue-400/30 rounded-2xl shadow-[0_4px_25px_rgba(42,99,205,0.15)] hover:border-blue-300/50 focus-within:border-white focus-within:shadow-[0_8px_30px_rgba(42,99,205,0.25)] transition-all duration-300 overflow-hidden">
                  <div className="pl-4 pr-2 text-white/90">
                    <FiSearch className="w-5 h-5 group-focus-within/search:scale-110 group-focus-within/search:rotate-6 transition-transform duration-300" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    placeholder={animatedPlaceholder}
                    className="w-full pl-2 pr-12 py-4 bg-transparent border-0 text-white placeholder-blue-100/70 text-sm focus:outline-none focus:ring-0 font-medium"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 text-blue-200 hover:text-white transition-colors duration-200"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {currentProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiSearch className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron productos</h3>
                <p className="text-gray-500 mb-6 text-sm">Ajusta tus filtros o busca con otros términos.</p>
                <Link
                  href="/solicitar-producto"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a63cd] text-white font-bold rounded-xl hover:bg-[#1e4ba3] transition-colors"
                >
                  Solicitar Producto
                </Link>
              </div>
            ) : (
              <>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-bold text-gray-900">{filteredProducts.length}</span> producto{filteredProducts.length !== 1 && 's'}
                      {selectedCategory && ` en ${initialCategories.find(c => c.slug === selectedCategory)?.name}`}
                    </p>
                  </div>
                  <div className="hidden sm:block text-sm text-gray-500">
                    Página {currentPage} de {totalPages}
                  </div>
                </div>

                {/* Products Grid - 4 columns max with sidebar */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-8">
                  {currentProducts.map((product, index) => (
                    <FadeIn key={product.id} delay={index * 0.03} duration={0.4}>
                      <ProductCard product={product} />
                    </FadeIn>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <FiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <div className="flex gap-1">
                      {getVisiblePages().map((page, idx) => (
                        typeof page === 'number' ? (
                          <button
                            key={idx}
                            onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-bold text-sm transition-all ${currentPage === page
                              ? 'bg-[#2a63cd] text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {page}
                          </button>
                        ) : (
                          <span key={idx} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400">
                            {page}
                          </span>
                        )
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <FiChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </main>


    </>
  );
}
