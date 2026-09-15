// Estilos compartidos del asistente de productos (C-60). Paleta de la tienda: brand, ink, muted, line, surface.
// Los pasos de producto físico todavía no los usan: tarjeta G-29 para Gemini.

export const wizardCard = 'rounded-2xl border border-line bg-white p-5';
export const wizardSectionTitle = 'text-xl font-bold text-ink';
export const wizardSectionHelp = 'mt-1 text-sm text-muted';
export const wizardLabel = 'mb-1.5 block text-sm font-semibold text-ink';
export const wizardHint = 'mt-1 text-xs text-muted';
export const wizardError = 'mt-1 text-xs font-semibold text-deal';

export function wizardInput(hasError = false): string {
  return [
    'h-11 w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-muted',
    'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
    hasError ? 'border-deal' : 'border-line focus:border-brand-500',
  ].join(' ');
}

export function wizardChoice(selected: boolean): string {
  return [
    'rounded-xl border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    selected ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-200',
  ].join(' ');
}

export const wizardPrimaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
export const wizardSecondaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-500';
