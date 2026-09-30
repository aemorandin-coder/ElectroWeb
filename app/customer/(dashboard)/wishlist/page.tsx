'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { FiArrowDown, FiFilter, FiGift, FiGrid, FiList, FiPackage, FiSearch, FiShoppingCart, FiTag, FiTrash2 } from 'react-icons/fi';
import { PiHeartBreakBold, PiSparkle } from 'react-icons/pi';
import { useCart } from '@/contexts/CartContext';
import { formatUSD, formatVES } from '@/lib/currency';
import { useSettings } from '@/contexts/SettingsContext';
import { adminCard, adminPrimaryButton } from '@/lib/admin-ui';
import { needsProductPage } from '@/components/ui/productCardData';
import OfferNote from '@/components/ui/OfferNote';
import type { PublicProduct } from '@/lib/dto/product';

// Favoritos (C-102). Como Amazon y Best Buy: se ve si el producto está en oferta o si bajó de precio desde que
// se guardó. Ya no se "pide" descuento (decisión de Andrés, 25/09); los aprobados antes se muestran hasta que venzan.
// C-137: grilla compacta (2 columnas en el teléfono, 4 en escritorio), precio en USD y Bs., disponibilidad y
// "Mover al carrito" (lo agrega y lo quita de la lista). El encabezado pasó de una caja grande a una línea.

type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'name' | 'drop';

type Favorito = PublicProduct & { savedPriceUSD: number | null; savedAt: string };

interface DescuentoAprobado {
    productId: string;
    approvedDiscount: number | null;
    requestedDiscount: number;
    expiresAt: string | null;
}

/** % que bajó desde que se guardó (0 si no bajó o no se sabe) */
function bajada(p: Favorito): number {
    if (!p.savedPriceUSD || p.savedPriceUSD <= p.priceUSD) return 0;
    return Math.round((1 - p.priceUSD / p.savedPriceUSD) * 100);
}

export default function WishlistPage() {
    const [favoritos, setFavoritos] = useState<Favorito[]>([]);
    const [aprobados, setAprobados] = useState<DescuentoAprobado[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [removingId, setRemovingId] = useState<string | null>(null);
    const { addItem } = useCart();
    const { settings } = useSettings();
    const tasa = Number(settings?.exchangeRateVES) || 0;

    useEffect(() => {
        let vigente = true;
        Promise.all([
            fetch('/api/customer/wishlist').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/customer/discount-requests').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]).then(([lista, descuentos]) => {
            if (!vigente) return;
            if (!lista) toast.error('No se pudo cargar la lista de favoritos');
            setFavoritos(lista?.products ?? []);
            setAprobados(descuentos?.activeDiscounts ?? []);
            setLoading(false);
        });
        return () => { vigente = false; };
    }, []);

    const removeFromWishlist = async (productId: string, silencioso = false) => {
        setRemovingId(productId);
        try {
            const response = await fetch('/api/customer/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, action: 'remove' }),
            });
            if (!response.ok) throw new Error();
            setFavoritos((actual) => actual.filter((item) => item.id !== productId));
            if (!silencioso) toast.success('Producto eliminado de favoritos');
        } catch {
            if (!silencioso) toast.error('No se pudo eliminar');
        } finally {
            setRemovingId(null);
        }
    };

    // Mismo carrito que la tarjeta de la tienda (antes los digitales entraban como físicos con stock 999)
    const handleAddToCart = (p: Favorito) => {
        const isDigital = p.productType === 'DIGITAL';
        addItem({
            id: p.id,
            name: p.name,
            price: p.priceUSD,
            listPrice: p.compareAtPriceUSD && p.compareAtPriceUSD > p.priceUSD ? p.compareAtPriceUSD : undefined,
            imageUrl: p.mainImage || p.images[0] || undefined,
            stock: isDigital ? 999 : p.stock,
            productType: isDigital ? 'DIGITAL' : 'PHYSICAL',
            weightKg: p.weightKg ?? undefined,
            dimensions: p.dimensions ?? undefined,
            isConsolidable: p.isConsolidable !== false,
            shippingCost: p.shippingCost ?? undefined,
            freeShipping: !isDigital && p.freeShipping === true,
        }, 1);
    };

    /** C-137: al carrito y fuera de la lista (como "Mover al carrito" de Amazon) */
    const moverAlCarrito = async (p: Favorito) => {
        handleAddToCart(p);
        await removeFromWishlist(p.id, true);
        toast.success(`${p.name} pasó al carrito`, { duration: 4000 });
    };

    const aprobadoDe = (productId: string) => aprobados.find((d) => d.productId === productId && d.expiresAt && new Date(d.expiresAt) > new Date());

    const visibles = favoritos
        .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            switch (sortBy) {
                case 'price-asc': return a.priceUSD - b.priceUSD;
                case 'price-desc': return b.priceUSD - a.priceUSD;
                case 'name': return a.name.localeCompare(b.name, 'es');
                case 'drop': return (bajada(b) + (b.oferta?.percent ?? 0)) - (bajada(a) + (a.oferta?.percent ?? 0));
                default: return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
            }
        });

    const disponibles = favoritos.filter((p) => p.productType === 'DIGITAL' || p.stock > 0);
    const totalValue = disponibles.reduce((sum, p) => sum + p.priceUSD, 0);
    const enOferta = favoritos.filter((p) => p.oferta || bajada(p) > 0).length;

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center" role="status" aria-label="Cargando favoritos">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500/20 border-t-brand-500" />
            </div>
        );
    }

    const Estado = ({ p }: { p: Favorito }) => {
        const pct = bajada(p);
        const aprobado = aprobadoDe(p.id);
        return (
            <div className="space-y-1">
                <OfferNote oferta={p.oferta} />
                {pct > 0 && (
                    <p className="flex items-center gap-1 text-xs font-semibold text-success-strong">
                        <FiArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        Bajó {pct}% desde que lo guardaste
                    </p>
                )}
                {aprobado && (
                    <p className="flex items-center gap-1 text-xs font-semibold text-success-strong">
                        <FiGift className="h-3.5 w-3.5" aria-hidden="true" />
                        Tienes {aprobado.approvedDiscount || aprobado.requestedDiscount}% aprobado al pagar
                    </p>
                )}
            </div>
        );
    };

    const Accion = ({ p, compact = false }: { p: Favorito; compact?: boolean }) => {
        const agotado = p.productType !== 'DIGITAL' && p.stock <= 0;
        if (needsProductPage(p)) {
            return (
                <Link href={`/productos/${p.slug}`} className={`${adminPrimaryButton} ${compact ? 'h-11 px-3' : 'h-10 w-full gap-1 whitespace-nowrap px-2 text-xs sm:text-sm'}`}>
                    <FiShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" /> {compact ? <span className="sr-only">Elegir monto</span> : 'Elegir monto'}
                </Link>
            );
        }
        return (
            <button type="button" onClick={() => void moverAlCarrito(p)} disabled={agotado || removingId === p.id} className={`${adminPrimaryButton} ${compact ? 'h-11 px-3' : 'h-10 w-full gap-1 whitespace-nowrap px-2 text-xs sm:text-sm'}`}
                aria-label={compact ? `Mover ${p.name} al carrito` : undefined}>
                <FiShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" /> {!compact && (agotado ? 'Agotado' : <><span className="sm:hidden">Al carrito</span><span className="hidden sm:inline">Mover al carrito</span></>)}
            </button>
        );
    };

    const imagen = (p: Favorito) => p.mainImage || p.images[0] || null;

    const Disponibilidad = ({ p }: { p: Favorito }) => {
        if (p.productType === 'DIGITAL') return <p className="text-xs font-medium text-success-strong">Entrega digital</p>;
        return p.stock > 0
            ? <p className="flex items-center gap-1.5 text-xs font-medium text-success-strong"><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />En stock</p>
            : <p className="flex items-center gap-1.5 text-xs font-medium text-deal"><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />Agotado</p>;
    };

    return (
        <div className="space-y-4 lg:space-y-6">
            <header>
                <h1 className="text-xl font-bold text-ink lg:text-2xl">Favoritos</h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
                    <span>{favoritos.length} {favoritos.length === 1 ? 'producto' : 'productos'}</span>
                    {favoritos.length > 0 && <span>· {disponibles.length} disponibles por {formatUSD(totalValue)}</span>}
                    {enOferta > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-deal">
                            · <FiTag className="h-3.5 w-3.5" aria-hidden="true" />{enOferta} con precio rebajado
                        </span>
                    )}
                </p>
            </header>

            {favoritos.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                        <input type="search" aria-label="Buscar en favoritos" placeholder="Buscar en tu lista…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-11 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="relative flex items-center">
                            <FiFilter className="pointer-events-none absolute left-3 h-4 w-4 text-muted" aria-hidden="true" />
                            <span className="sr-only">Ordenar</span>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="h-11 rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink">
                                <option value="recent">Recientes</option>
                                <option value="drop">Mayor rebaja</option>
                                <option value="price-asc">Menor precio</option>
                                <option value="price-desc">Mayor precio</option>
                                <option value="name">Nombre</option>
                            </select>
                        </label>
                        <div className="flex overflow-hidden rounded-lg border border-line" role="group" aria-label="Vista">
                            <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label="Vista cuadrícula"
                                className={`flex h-11 w-11 items-center justify-center ${viewMode === 'grid' ? 'bg-brand-500 text-white' : 'bg-white text-muted'}`}>
                                <FiGrid className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label="Vista lista"
                                className={`flex h-11 w-11 items-center justify-center ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'bg-white text-muted'}`}>
                                <FiList className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {visibles.length > 0 ? (
                viewMode === 'grid' ? (
                    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                        {visibles.map((p) => {
                            const agotado = p.productType !== 'DIGITAL' && p.stock <= 0;
                            const src = imagen(p);
                            return (
                                <li key={p.id} className={`flex flex-col overflow-hidden rounded-xl border border-line bg-white ${removingId === p.id ? 'opacity-50' : ''}`}>
                                    <div className="relative aspect-square bg-white">
                                        {src ? <Image src={src} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-contain" /> : (
                                            <div className="flex h-full items-center justify-center text-subtle"><FiPackage className="h-10 w-10" aria-hidden="true" /></div>
                                        )}
                                        {p.compareAtPriceUSD && p.compareAtPriceUSD > p.priceUSD && (
                                            <span className="absolute left-2 top-2 rounded bg-deal px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                                -{Math.round((1 - p.priceUSD / p.compareAtPriceUSD) * 100)}%
                                            </span>
                                        )}
                                        {agotado && <span className="absolute inset-x-2 bottom-2 rounded bg-ink/80 px-2 py-1 text-center text-xs font-semibold text-white">Agotado</span>}
                                        <button type="button" onClick={() => removeFromWishlist(p.id)} disabled={removingId === p.id} aria-label={`Quitar ${p.name} de favoritos`}
                                            className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-muted shadow-sm hover:text-deal">
                                            <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                                        <Link href={`/productos/${p.slug}`} className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-ink hover:text-brand-600">{p.name}</Link>
                                        <div>
                                            <p className="flex flex-wrap items-baseline gap-x-1.5">
                                                <span className="text-base font-bold tabular-nums text-ink">{formatUSD(p.priceUSD)}</span>
                                                {p.compareAtPriceUSD && p.compareAtPriceUSD > p.priceUSD && <span className="text-xs text-muted line-through">{formatUSD(p.compareAtPriceUSD)}</span>}
                                            </p>
                                            {tasa > 0 && <p className="text-xs tabular-nums text-muted">{formatVES(p.priceUSD * tasa)}</p>}
                                        </div>
                                        <Disponibilidad p={p} />
                                        <Estado p={p} />
                                        <div className="mt-auto flex pt-1">
                                            <Accion p={p} />
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <ul className="space-y-2">
                        {visibles.map((p) => {
                            const src = imagen(p);
                            return (
                                <li key={p.id} className={`flex items-center gap-3 rounded-2xl border border-line bg-white p-3 ${removingId === p.id ? 'opacity-50' : ''}`}>
                                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                                        {src ? <Image src={src} alt={p.name} fill sizes="80px" className="object-contain" /> : (
                                            <div className="flex h-full items-center justify-center text-subtle"><FiPackage className="h-6 w-6" aria-hidden="true" /></div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <Link href={`/productos/${p.slug}`} className="line-clamp-1 text-sm font-medium text-ink hover:text-brand-600">{p.name}</Link>
                                        <p className="flex flex-wrap items-baseline gap-x-2">
                                            <span className="font-bold tabular-nums text-ink">{formatUSD(p.priceUSD)}</span>
                                            {p.compareAtPriceUSD && p.compareAtPriceUSD > p.priceUSD && <span className="text-xs text-muted line-through">{formatUSD(p.compareAtPriceUSD)}</span>}
                                            {tasa > 0 && <span className="text-xs tabular-nums text-muted">{formatVES(p.priceUSD * tasa)}</span>}
                                        </p>
                                        <Disponibilidad p={p} />
                                        <Estado p={p} />
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Accion p={p} compact />
                                        <button type="button" onClick={() => removeFromWishlist(p.id)} disabled={removingId === p.id} aria-label={`Quitar ${p.name} de favoritos`}
                                            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-deal">
                                            <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )
            ) : searchTerm ? (
                <div className={`${adminCard} py-10 text-center`}>
                    <FiSearch className="mx-auto mb-2 h-8 w-8 text-subtle" aria-hidden="true" />
                    <p className="font-semibold text-ink">Sin resultados para &ldquo;{searchTerm}&rdquo;</p>
                    <button type="button" onClick={() => setSearchTerm('')} className="mt-2 min-h-11 text-sm font-semibold text-brand-600">Limpiar búsqueda</button>
                </div>
            ) : (
                <div className={`${adminCard} py-12 text-center`}>
                    <PiHeartBreakBold className="mx-auto mb-3 h-10 w-10 text-subtle" aria-hidden="true" />
                    <p className="font-semibold text-ink">Tu lista de favoritos está vacía</p>
                    <p className="mt-1 text-sm text-muted">Guarda productos y te mostramos aquí cuando entren en oferta o bajen de precio.</p>
                    <Link href="/productos?oferta=1" className={`${adminPrimaryButton} mt-4`}>
                        <PiSparkle className="h-4 w-4" aria-hidden="true" /> Ver ofertas de hoy
                    </Link>
                </div>
            )}
        </div>
    );
}
