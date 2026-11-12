'use client';

import { useEffect, useRef } from 'react';

/**
 * C-204: la foto de una fila antes de subirla, leída del archivo en el navegador (no viaja a ningún lado). La dirección
 * blob: se crea y se libera con el archivo; se le pone a la imagen directo, sin pasar por el estado.
 */
export default function Miniatura({ file, alt, className = 'h-12 w-12' }: { file: File; alt: string; className?: string }) {
  const imagen = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    if (imagen.current) imagen.current.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <span className={`${className} block shrink-0 overflow-hidden rounded-lg border border-line bg-white`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- una dirección blob: del navegador; next/image no la sirve */}
      <img ref={imagen} alt={alt} className="h-full w-full object-contain" decoding="async" />
    </span>
  );
}
