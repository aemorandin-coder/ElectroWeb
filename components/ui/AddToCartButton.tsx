'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '@/contexts/CartContext';
import { needsProductPage, type ProductCardData } from './productCardData';

interface AddToCartButtonProps {
  product: ProductCardData;
  className?: string;
}

const BASE =
  'relative z-10 inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold lg:h-10 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

/** Botón "Agregar al carrito" siempre visible (sin hover). Va encima del stretched link de la tarjeta. */
export default function AddToCartButton({ product, className = '' }: AddToCartButtonProps) {
  const { addItem } = useCart();

  if (needsProductPage(product)) {
    return (
      <Link href={`/productos/${product.slug}`} className={`${BASE} bg-brand-500 text-white hover:bg-brand-600 ${className}`}>
        Elegir monto
      </Link>
    );
  }

  const isDigital = product.productType === 'DIGITAL';
  const soldOut = !isDigital && product.stock <= 0;

  if (soldOut) {
    return (
      <button type="button" disabled className={`${BASE} cursor-not-allowed bg-gray-100 text-ink-soft ${className}`}>
        Agotado
      </button>
    );
  }

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.priceUSD,
      imageUrl: product.mainImage || product.images?.[0] || undefined,
      stock: isDigital ? 999 : product.stock,
      productType: isDigital ? 'DIGITAL' : 'PHYSICAL',
      weightKg: product.weightKg ?? undefined,
      dimensions: product.dimensions ?? undefined,
      isConsolidable: product.isConsolidable !== false,
      shippingCost: product.shippingCost ?? undefined,
    });
    toast.success('Agregado al carrito');
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`Agregar ${product.name} al carrito`}
      className={`${BASE} whitespace-nowrap bg-brand-500 text-white hover:bg-brand-600 ${className}`}
    >
      {/* En tarjetas angostas (2 columnas a 360px) el texto largo partía en dos líneas */}
      <span className="sm:hidden">Agregar</span>
      <span className="hidden sm:inline">Agregar al carrito</span>
    </button>
  );
}
