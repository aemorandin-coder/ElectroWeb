import { piezasIcono } from '@/lib/studio/icons';

/** El mismo ícono del pack que dibuja el canvas, en SVG para el editor (C-193: con la superficie y el detalle sólido) */
export default function StudioIcon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {piezasIcono(name).map((p) => (
        <path
          key={p.d}
          d={p.d}
          strokeWidth={p.grosor}
          fill={p.relleno ? 'currentColor' : undefined}
          fillOpacity={p.relleno === 'sup' ? 0.25 : undefined}
        />
      ))}
    </svg>
  );
}
