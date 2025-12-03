'use client';

import { useState } from 'react';
import ProductCard from '@/components/ui/ProductCard';
import FadeIn from '@/components/ui/FadeIn';
import { FiSearch, FiChevronDown } from 'react-icons/fi';

interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    image?: string | null;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    priceUSD: number;
    images: string[];
    category: Category;
    brand?: { name: string };
    stock: number;
    isFeatured: boolean;
    status: string;
}

export default function CategoryClient({
    category,
    initialProducts
}: {
    category: Category;
    initialProducts: Product[]
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    // Filter and Sort Logic
    const filteredProducts = initialProducts
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            switch (sortBy) {
                case 'price-asc': return Number(a.priceUSD) - Number(b.priceUSD);
                case 'price-desc': return Number(b.priceUSD) - Number(a.priceUSD);
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'newest': default: return 0; // Assuming initialProducts are already sorted by date or we rely on DB sort
            }
        });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-10">
            {/* Toolbar */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder={`Buscar en ${category.name}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-700"
                    />
                    <FiSearch className="absolute left-3 top-3 text-gray-400" />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-sm text-gray-500 whitespace-nowrap hidden sm:inline">Ordenar por:</span>
                    <div className="relative w-full md:w-48">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full appearance-none pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-700 cursor-pointer"
                        >
                            <option value="newest">Más recientes</option>
                            <option value="price-asc">Precio: Menor a Mayor</option>
                            <option value="price-desc">Precio: Mayor a Menor</option>
                            <option value="name-asc">Nombre (A-Z)</option>
                        </select>
                        <FiChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <div className="w-full text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm px-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-50 rounded-full mb-6">
                        <FiSearch className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron productos</h3>
                    <p className="text-gray-500 w-full max-w-3xl mx-auto text-lg">
                        {searchTerm
                            ? `No hay resultados para "${searchTerm}" en esta categoría.`
                            : 'Esta categoría aún no tiene productos publicados.'}
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-6 text-blue-600 font-medium hover:underline"
                        >
                            Limpiar búsqueda
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product, index) => (
                        <FadeIn key={product.id} delay={index * 0.05} duration={0.5}>
                            <ProductCard product={product as any} />
                        </FadeIn>
                    ))}
                </div>
            )}
        </div>
    );
}
