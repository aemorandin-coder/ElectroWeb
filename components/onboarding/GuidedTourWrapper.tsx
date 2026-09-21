'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { esRutaDeAcceso } from '@/lib/rutas';

/**
 * Wrapper cliente para GuidedTour.
 * Necesario porque app/layout.tsx es un Server Component y
 * next/dynamic con ssr:false solo funciona en Client Components.
 */
const GuidedTour = dynamic(
  () => import('@/components/onboarding/GuidedTour').then(m => ({ default: m.GuidedTour })),
  { ssr: false }
);

export function GuidedTourWrapper() {
  const pathname = usePathname();
  // El tour habla de la tienda (catálogo, carrito): no pinta nada sobre los paneles, el acceso ni el checkout (C-89)
  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/creator') ||
    pathname?.startsWith('/customer') ||
    pathname?.startsWith('/checkout') ||
    esRutaDeAcceso(pathname)
  ) {
    return null;
  }
  return <GuidedTour />;
}
