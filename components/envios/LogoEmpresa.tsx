import Image from 'next/image';
import type { Empresa } from '@/lib/envios/empresas';

// Logos oficiales, tomados de zoom.red y mrwve.com (C-106). MRW sin la línea "Venezuela": en tamaño pequeño no se lee.
// Ancho y alto al tamaño en que se muestran (24 px de alto): así /_next/image sirve una versión de 128-256 px, no la original.
const LOGOS: Record<Empresa, { src: string; ancho: number; alto: number }> = {
  ZOOM: { src: '/images/envios/zoom.png', ancho: 122, alto: 24 },
  MRW: { src: '/images/envios/mrw.png', ancho: 148, alto: 24 },
};

/** Logo de la empresa de envíos. El alto se da con `className` (por defecto h-5); el ancho sale de la proporción. */
export function LogoEmpresa({ empresa, className = 'h-5' }: { empresa: Empresa; className?: string }) {
  const logo = LOGOS[empresa];
  return (
    <Image
      src={logo.src}
      alt={empresa}
      width={logo.ancho}
      height={logo.alto}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
