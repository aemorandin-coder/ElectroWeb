import { ICON_PATHS } from '@/lib/studio/icons';

/** El mismo ícono de línea que dibuja el canvas, en SVG para el editor */
export default function StudioIcon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {(ICON_PATHS[name] || ICON_PATHS.check).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
