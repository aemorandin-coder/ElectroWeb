'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/contexts/SettingsContext';

interface Product {
    id: string;
    name: string;
    slug: string;
    priceUSD: any;
    images: string | string[];
    mainImage?: string | null;
    category: { name: string };
    stock: number;
    isFeatured?: boolean;
    description?: string;
}

interface ProductCardProps {
    product: Product;
    index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
    const { settings } = useSettings();
    const [imageError, setImageError] = useState(false);

    let images: string[] = [];
    try {
        if (typeof product.images === 'string' && product.images) {
            images = JSON.parse(product.images);
        } else if (Array.isArray(product.images)) {
            images = product.images;
        }
    } catch (e) {
        images = [];
    }

    const mainImage = product.mainImage || (images.length > 0 ? images[0] : null);
    const priceUSD = Number(product.priceUSD);
    const priceVES = settings?.exchangeRateVES ? priceUSD * settings.exchangeRateVES : null;

    return (
        <Link href={`/productos/${product.slug}`} className="group relative block">
            <div className="relative bg-white rounded-2xl overflow-hidden transition-all duration-500 border border-gray-100 h-full flex flex-col hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2a63cd]/20 via-purple-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"></div>

                <div className="relative aspect-square bg-gradient-to-br from-[#f8f9fa] to-gray-100 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10"></div>

                    {mainImage && !imageError ? (
                        <Image
                            src={mainImage}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6">
                            <Image
                                src="/favicon.ico"
                                alt="Logo"
                                width={80}
                                height={80}
                                className="mb-3 opacity-40"
                            />
                            <p className="text-xs text-gray-400 font-medium text-center">Imagen de Producto</p>
                        </div>
                    )}

                    {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                            <span className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-full shadow-2xl">Agotado</span>
                        </div>
                    )}
                </div>

                <div className="p-3 flex-1 flex flex-col">

                    <h3 className="text-sm font-bold text-[#212529] mb-1 line-clamp-2 group-hover:text-[#2a63cd] transition-colors duration-300 min-h-[28px]">
                        {product.name}
                    </h3>

                    {product.description && (
                        <p className="text-xs text-[#6a6c6b] mb-2 line-clamp-1">{product.description}</p>
                    )}

                    <div className="mt-auto">
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div>
                                <p className="text-[10px] text-[#6a6c6b] mb-0.5">Precio</p>
                                <div className="flex flex-col">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs font-bold text-[#212529] opacity-60">USD</span>
                                        <span className="text-xl font-black text-[#212529]">{priceUSD.toFixed(2)}</span>
                                    </div>
                                    {priceVES && (
                                        <div className="flex items-baseline gap-1 -mt-1">
                                            <span className="text-[10px] font-bold text-gray-500">Bs</span>
                                            <span className="text-sm font-bold text-gray-500">{priceVES.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {product.stock > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] text-green-700 font-bold">Stock: {product.stock}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-full px-3 py-1.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-xs font-bold rounded-xl text-center shadow-lg flex items-center justify-center gap-1.5">
                                Ver Detalles
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
