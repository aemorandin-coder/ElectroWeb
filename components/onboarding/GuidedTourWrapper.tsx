'use client';

import dynamic from 'next/dynamic';

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
  return <GuidedTour />;
}
