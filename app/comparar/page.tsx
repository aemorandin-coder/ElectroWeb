'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import PublicHeader from '@/components/public/PublicHeader';
import { FiX, FiShoppingCart, FiStar, FiCheck, FiMinus, FiPlus } from 'react-icons/fi';

interface Product {
  id: string;
  name: string;
  slug: string;
  priceUSD: number;
  mainImage: string | null;
  images: string[];
  category: {
    name: string;
  };
  brand: string | null;
  model: string | null;
  specifications: any;
  stock: number;
  description: string;
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',') || [];
    if (ids.length > 0) {
      fetchProducts(ids);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchProducts = async (ids: string[]) => {
    try {
      const promises = ids.map(id => fetch(`/api/products/${id}`).then(r => r.json()));
      const fetchedProducts = await Promise.all(promises);
      setProducts(fetchedProducts.filter(p => p && p.id));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = (productId: string) => {
    const newProducts = products.filter(p => p.id !== productId);
    setProducts(newProducts);

    if (newProducts.length === 0) {
      router.push('/productos');
    } else {
      const newIds = newProducts.map(p => p.id).join(',');
      router.push(`/comparar?ids=${newIds}`);
    }
  };

  const addMoreProducts = () => {
    router.push('/productos');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PublicHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[#212529] mb-4">Comparador de Productos</h1>
            <p className="text-[#6a6c6b] mb-8">No hay productos para comparar</p>
            <Link
              href="/productos"
              className="inline-block px-6 py-3 bg-[#2a63cd] text-white font-bold rounded-xl hover:bg-[#1e4ba3] transition-all shadow-lg hover:shadow-xl"
            >
              Ver Productos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Extract all specification keys
  const allSpecKeys = new Set<string>();
  products.forEach(product => {
    if (product.specifications && typeof product.specifications === 'object') {
      Object.keys(product.specifications).forEach(key => allSpecKeys.add(key));
    }
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PublicHeader />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Comparador de Productos</h1>
          <p className="text-blue-100">Compara hasta 4 productos lado a lado</p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8f9fa] border-b-2 border-[#e9ecef]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-[#212529] w-48 sticky left-0 bg-[#f8f9fa] z-10">
                    Característica
                  </th>
                  {products.map(product => (
                    <th key={product.id} className="px-6 py-4 min-w-[280px]">
                      <div className="relative">
                        <button
                          onClick={() => removeProduct(product.id)}
                          className="absolute top-0 right-0 p-2 text-red-600 hover:bg-red-50 rounded-full transition-all"
                        >
                          <FiX className="w-5 h-5" />
                        </button>
                        <div className="relative w-full h-48 bg-[#f8f9fa] rounded-lg mb-4 overflow-hidden">
                          {(product.mainImage || product.images[0]) ? (
                            <Image
                              src={product.mainImage || product.images[0]}
                              alt={product.name}
                              fill
                              className="object-contain p-4"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-16 h-16 text-[#adb5bd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/productos/${product.slug}`}
                          className="font-bold text-[#212529] hover:text-[#2a63cd] transition-colors line-clamp-2 mb-2"
                        >
                          {product.name}
                        </Link>
                        <div className="flex items-baseline justify-center gap-1 mb-3">
                          <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                          <span className="text-2xl font-bold text-[#212529]">
                            {Number(product.priceUSD).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <Link
                          href={`/productos/${product.slug}`}
                          className="block w-full px-4 py-2 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all text-center"
                        >
                          Ver Detalles
                        </Link>
                      </div>
                    </th>
                  ))}
                  {products.length < 4 && (
                    <th className="px-6 py-4 min-w-[280px]">
                      <button
                        onClick={addMoreProducts}
                        className="w-full h-full min-h-[300px] border-2 border-dashed border-[#e9ecef] rounded-lg hover:border-[#2a63cd] hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-3 text-[#6a6c6b] hover:text-[#2a63cd]"
                      >
                        <FiPlus className="w-8 h-8" />
                        <span className="font-semibold">Agregar Producto</span>
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef]">
                {/* Category */}
                <tr className="hover:bg-[#f8f9fa] transition-colors">
                  <td className="px-6 py-4 font-semibold text-[#212529] sticky left-0 bg-white">
                    Categoría
                  </td>
                  {products.map(product => (
                    <td key={product.id} className="px-6 py-4 text-[#6a6c6b]">
                      {product.category.name}
                    </td>
                  ))}
                  {products.length < 4 && <td className="px-6 py-4"></td>}
                </tr>

                {/* Brand */}
                <tr className="hover:bg-[#f8f9fa] transition-colors">
                  <td className="px-6 py-4 font-semibold text-[#212529] sticky left-0 bg-white">
                    Marca
                  </td>
                  {products.map(product => (
                    <td key={product.id} className="px-6 py-4 text-[#6a6c6b]">
                      {product.brand || '-'}
                    </td>
                  ))}
                  {products.length < 4 && <td className="px-6 py-4"></td>}
                </tr>

                {/* Model */}
                <tr className="hover:bg-[#f8f9fa] transition-colors">
                  <td className="px-6 py-4 font-semibold text-[#212529] sticky left-0 bg-white">
                    Modelo
                  </td>
                  {products.map(product => (
                    <td key={product.id} className="px-6 py-4 text-[#6a6c6b]">
                      {product.model || '-'}
                    </td>
                  ))}
                  {products.length < 4 && <td className="px-6 py-4"></td>}
                </tr>

                {/* Stock */}
                <tr className="hover:bg-[#f8f9fa] transition-colors">
                  <td className="px-6 py-4 font-semibold text-[#212529] sticky left-0 bg-white">
                    Disponibilidad
                  </td>
                  {products.map(product => (
                    <td key={product.id} className="px-6 py-4">
                      {product.stock > 0 ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                          <FiCheck className="w-4 h-4" />
                          En Stock ({product.stock})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                          <FiMinus className="w-4 h-4" />
                          Agotado
                        </span>
                      )}
                    </td>
                  ))}
                  {products.length < 4 && <td className="px-6 py-4"></td>}
                </tr>

                {/* Specifications */}
                {Array.from(allSpecKeys).map(specKey => (
                  <tr key={specKey} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#212529] sticky left-0 bg-white capitalize">
                      {specKey.replace(/_/g, ' ')}
                    </td>
                    {products.map(product => {
                      const specs = product.specifications || {};
                      const value = specs[specKey];
                      return (
                        <td key={product.id} className="px-6 py-4 text-[#6a6c6b]">
                          {value !== undefined && value !== null ? String(value) : '-'}
                        </td>
                      );
                    })}
                    {products.length < 4 && <td className="px-6 py-4"></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            href="/productos"
            className="inline-block px-6 py-3 bg-white text-[#2a63cd] font-bold rounded-xl border-2 border-[#2a63cd] hover:bg-[#f8f9fa] transition-all"
          >
            Volver a Productos
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa]">
        <PublicHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
        </div>
      </div>
    }>
      <ComparePageContent />
    </Suspense>
  );
}
