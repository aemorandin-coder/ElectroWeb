// Recetas de clases del panel admin (C-52). Paleta de la tienda: brand, ink, muted, line, surface y estados.
// Las páginas del admin las importan en lugar de escribir colores sueltos (tarjetas R9 de Gemini).

/* ── Página ───────────────────────────────────────────────────────────── */
export const adminPageHeader = 'mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between';
export const adminPageTitle = 'text-2xl font-bold text-ink';
export const adminPageSubtitle = 'mt-1 text-sm text-muted';
export const adminSectionTitle = 'text-lg font-semibold text-ink';

/* ── Contenedores ─────────────────────────────────────────────────────── */
export const adminCard = 'rounded-2xl border border-line bg-white p-5';
export const adminCardFlush = 'overflow-hidden rounded-2xl border border-line bg-white';
export const adminDivider = 'border-t border-line';

/* ── Formularios ──────────────────────────────────────────────────────── */
export const adminLabel = 'mb-1.5 block text-sm font-semibold text-ink';
export const adminHint = 'mt-1 text-xs text-muted';
export const adminError = 'mt-1 text-xs font-semibold text-deal';

export function adminInput(hasError = false): string {
  return [
    'h-11 w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-subtle',
    'focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-surface disabled:text-muted',
    hasError ? 'border-deal' : 'border-line focus:border-brand-500',
  ].join(' ');
}

/** Tarjeta o botón elegible (tipo, plan, método). */
export function adminChoice(selected: boolean): string {
  return [
    'rounded-xl border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    selected ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-200',
  ].join(' ');
}

/* ── Botones ──────────────────────────────────────────────────────────── */
const buttonBase =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
export const adminPrimaryButton = `${buttonBase} bg-brand-500 text-white hover:bg-brand-600`;
export const adminSecondaryButton = `${buttonBase} border border-line bg-white text-ink hover:bg-surface`;
export const adminDangerButton = `${buttonBase} bg-deal text-white hover:bg-deal/90`;
export const adminSuccessButton = `${buttonBase} bg-success-strong text-white hover:bg-success-strong/90`;
/** Botón de solo ícono (editar, borrar, cerrar). Siempre con aria-label. */
export const adminIconButton =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-40';

/* ── Tablas ───────────────────────────────────────────────────────────── */
/** Envuelve siempre la <table>: en móvil se desliza en vez de romper la página. */
export const adminTableWrap = 'overflow-x-auto rounded-2xl border border-line bg-white';
export const adminTable = 'w-full text-sm';
export const adminTh = 'bg-surface px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted';
export const adminTd = 'border-t border-line px-4 py-3 text-ink';
export const adminRowHover = 'hover:bg-surface';

/* ── Estados (badges, chips de ícono, avisos) ─────────────────────────── */
export type AdminTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const TONES: Record<AdminTone, { badge: string; chip: string; notice: string }> = {
  neutral: { badge: 'bg-surface text-ink-soft', chip: 'bg-surface text-ink-soft', notice: 'border-line bg-surface text-ink-soft' },
  brand: { badge: 'bg-brand-50 text-brand-700', chip: 'bg-brand-50 text-brand-600', notice: 'border-brand-200 bg-brand-50 text-brand-700' },
  success: { badge: 'bg-success-strong/10 text-success-strong', chip: 'bg-success-strong/10 text-success-strong', notice: 'border-success-strong/20 bg-success-strong/5 text-success-strong' },
  warning: { badge: 'bg-warning/15 text-warning-strong', chip: 'bg-warning/15 text-warning-strong', notice: 'border-warning/30 bg-warning/10 text-warning-strong' },
  danger: { badge: 'bg-deal-bg text-deal', chip: 'bg-deal-bg text-deal', notice: 'border-deal/30 bg-deal-bg text-deal' },
};

/** Badge de estado: "Pendiente", "Pagado", "Rechazado". */
export function adminBadge(tone: AdminTone): string {
  return `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone].badge}`;
}

/** Cuadro con ícono de una tarjeta de estadística o de una fila. */
export function adminIconChip(tone: AdminTone): string {
  return `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone].chip}`;
}

/** Aviso en línea (info, éxito, advertencia, error). */
export function adminNotice(tone: AdminTone): string {
  return `rounded-xl border p-4 text-sm ${TONES[tone].notice}`;
}

/* ── Estadísticas ─────────────────────────────────────────────────────── */
export const adminStatCard = 'flex items-center gap-4 rounded-2xl border border-line bg-white p-5';
export const adminStatLabel = 'text-sm text-muted';
export const adminStatValue = 'text-2xl font-bold text-ink';

/* ── Modales ──────────────────────────────────────────────────────────── */
/** Capa del modal. Acompañar con useBodyScrollLock(abierto) en el componente. */
export const adminModalOverlay = 'fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4';
/** Panel: hoja inferior en móvil, centrado desde sm. Sumar un ancho: sm:max-w-md | sm:max-w-lg | sm:max-w-2xl | sm:max-w-4xl. */
export const adminModalPanel = 'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-lg sm:rounded-2xl';
export const adminModalHeader = 'flex items-center justify-between gap-3 border-b border-line px-5 py-4';
export const adminModalTitle = 'text-lg font-semibold text-ink';
export const adminModalBody = 'overflow-y-auto px-5 py-4';
export const adminModalFooter = 'flex flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3 sm:flex-row sm:justify-end';

/* ── Pestañas y filtros ───────────────────────────────────────────────── */
export function adminTab(active: boolean): string {
  return [
    'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors',
    active ? 'bg-brand-500 text-white' : 'text-ink-soft hover:bg-surface hover:text-ink',
  ].join(' ');
}

/* ── Vacío y carga ────────────────────────────────────────────────────── */
export const adminEmpty = 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center';
export const adminSpinner = 'h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent';
