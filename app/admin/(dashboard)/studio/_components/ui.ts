// Clases de ElectroStudio que no están en lib/admin-ui (botón chico, zona para soltar la foto)
export const smallButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
export const smallDangerButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-deal/30 bg-white px-3 text-sm font-semibold text-deal transition-colors hover:bg-deal-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
export const sectionSummary =
  'flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden';

export function toggleButton(active: boolean): string {
  return [
    'inline-flex h-9 items-center rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    active ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-ink-soft hover:bg-surface hover:text-ink',
  ].join(' ');
}

export function dropZone(over: boolean, missing: boolean): string {
  return [
    'flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors focus-within:outline-2 focus-within:outline-brand-500',
    over ? 'border-brand-500 bg-brand-50' : missing ? 'border-warning bg-warning/10' : 'border-line bg-surface hover:border-brand-200',
  ].join(' ');
}
