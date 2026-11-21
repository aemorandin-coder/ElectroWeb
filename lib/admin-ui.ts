// Recetas de clases del panel admin (C-52). Paleta de la tienda: brand, ink, muted, line, surface y estados.
// Las páginas del admin las importan en lugar de escribir colores sueltos (tarjetas R9 de Gemini).

/* ── Página ───────────────────────────────────────────────────────────── */
export const adminPageStack = 'min-w-0 space-y-5';
export const adminPageHeader = 'mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between';
export const adminPageHeaderCompact = 'mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between';
export const adminPageTitle = 'text-2xl font-bold text-ink text-balance';
export const adminPageSubtitle = 'mt-1 text-sm text-muted text-pretty';
export const adminSectionTitle = 'text-lg font-semibold text-ink text-balance';

/* ── Contenedores ─────────────────────────────────────────────────────── */
export const adminCard = 'rounded-2xl border border-line bg-white p-5';
export const adminCardFlush = 'overflow-hidden rounded-2xl border border-line bg-white';
export const adminDivider = 'border-t border-line';

/* ── Formularios ──────────────────────────────────────────────────────── */
export const adminLabel = 'mb-1.5 block text-sm font-semibold text-ink';
/** C-205: la ayuda no pasa de 65 caracteres por línea (PLAN.md §1.5) */
export const adminHint = 'mt-1 max-w-prose text-xs text-muted text-pretty';
export const adminError = 'mt-1 text-xs font-semibold text-deal';

export function adminInput(hasError = false): string {
  return [
    'h-11 w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-subtle',
    'focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-surface disabled:text-muted',
    hasError ? 'border-deal' : 'border-line-strong focus:border-brand-500',
  ].join(' ');
}

/**
 * Solo la piel (borde y color) de algo elegible, para una pieza que arma su propia disposición.
 * C-242: para elegir una cosa entre varias usa `components/admin/Opcion`, que trae el ícono, el título, la línea y el relleno.
 * Esta clase sola deja el ícono encima y el texto pegado al borde (el asistente de factura, 14/11).
 */
export function adminChoice(selected: boolean): string {
  return [
    'rounded-xl border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    selected ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-200',
  ].join(' ');
}

/* ── Botones ──────────────────────────────────────────────────────────── */
// C-210 (Andrés, 13/11: "los botones de acciones, animados"): responden al pasar el ratón (se levantan un poco, con
// sombra) y al tocarlos (se hunden). Con "reducir movimiento" solo cambian de color. Uno apagado no se mueve.
const MOVIMIENTO =
  'transition duration-150 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] ' +
  'disabled:hover:translate-y-0 disabled:active:scale-100 disabled:hover:shadow-none';
const buttonBase =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold ${MOVIMIENTO} disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`;
export const adminPrimaryButton = `${buttonBase} bg-brand-500 text-white hover:bg-brand-600 hover:shadow-md hover:shadow-brand-500/25`;
export const adminSecondaryButton = `${buttonBase} border border-line-strong bg-white text-ink hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 hover:shadow-md hover:shadow-brand-600/10`;
export const adminDangerButton = `${buttonBase} bg-deal text-white hover:bg-deal/90 hover:shadow-md hover:shadow-deal/25`;
export const adminSuccessButton = `${buttonBase} bg-success-strong text-white hover:bg-success-strong/90 hover:shadow-md hover:shadow-success-strong/25`;
// C-245: lo que se suma a un botón compartido no siempre le gana a lo que ya trae: en el CSS, `px-5` va después de
// `px-0`, `h-11` después de `h-9` y `text-ink` después de `text-deal`. Para un cuadrado de 44 px, `w-11 px-0!`; para el
// rojo de borrar o rechazar sobre el secundario, `text-deal!` (el `!` lo hace ganar).
/** Botón de solo ícono (editar, borrar, cerrar). Siempre con aria-label. */
export const adminIconButton =
  `inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted ${MOVIMIENTO} hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-40`;

/* ── Tablas ───────────────────────────────────────────────────────────── */
/** Envuelve siempre la <table>: en móvil se desliza en vez de romper la página. */
export const adminTableWrap = 'overflow-x-auto rounded-2xl border border-line-strong bg-white';
export const adminTable = 'w-full text-sm';
export const adminTh = 'border-b border-line-strong bg-line/55 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft text-balance';
export const adminTd = 'border-t border-line px-4 py-3 text-ink';
export const adminRowHover = 'hover:bg-surface';
export const adminRowZebra = 'odd:bg-white even:bg-line/40 hover:bg-line/60 transition-colors';

/* ── Estados (badges, chips de ícono, avisos) ─────────────────────────── */
export type AdminTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

/**
 * C-226 (Andrés, 14/11: "ese color de contenedor ámbar lo detesto, está en todos lados"; eligió el azul claro viendo las
 * tres opciones): lo que alguien tiene que hacer, en bloque, va en el azul claro de la tienda con el ícono blanco en su placa
 * del azul de la marca (C-243, el kit; antes, cian sobre azul noche). Nunca un contenedor ámbar (PLAN.md §1.1). El ícono
 * hijo directo del aviso toma la placa solo.
 */
export const avisoAccion =
  'border-brand-200 bg-brand-50 text-brand-900 [&>svg]:h-7 [&>svg]:w-7 [&>svg]:shrink-0 [&>svg]:rounded-lg [&>svg]:bg-brand-500 [&>svg]:p-1.5 [&>svg]:text-white';
/** C-226: la placa de un ícono de acción cuando no es hijo directo del aviso (dentro de un párrafo o de un título). */
export const iconoAccion = 'h-7 w-7 shrink-0 rounded-lg bg-brand-500 p-1.5 text-white';
/** C-226: el cuadro de ícono de lo que alguien tiene que hacer (una fila, una tarjeta): el azul de la marca con el ícono blanco (C-243). */
export const placaAccion = 'bg-brand-500 text-white';

// C-210 (Andrés eligió la versión A, "como la tienda", para todo el panel): el badge va lleno y con texto blanco, como los
// sellos de la tienda ("DIGITAL", "Envío gratis"): blanco sobre azul 8,4:1, sobre verde fuerte 5,5:1 y sobre rojo 4,8:1.
// El neutro es un dato: gris.
const TONES: Record<AdminTone, { badge: string; chip: string; notice: string }> = {
  neutral: { badge: 'bg-surface text-ink-soft ring-1 ring-inset ring-line', chip: 'bg-surface text-ink-soft', notice: 'border-line bg-surface text-ink-soft' },
  brand: { badge: 'bg-brand-600 text-white', chip: 'bg-brand-50 text-brand-600', notice: 'border-brand-200 bg-brand-50 text-brand-700' },
  success: { badge: 'bg-success-strong text-white', chip: 'bg-success-strong/10 text-success-strong', notice: 'border-success-strong/20 bg-success-strong/5 text-success-strong' },
  // C-216 (Andrés, 13/11: "esas píldoras ámbar, las detesto"): la píldora de lo que alguien tiene que hacer es un sello
  // del azul oscuro del logo (brand-700) con texto e ícono blancos (C-243, el kit; antes, azul noche con cian). C-226
  // (14/11): el aviso en bloque y el cuadro de ícono tampoco son ámbar; el nombre del tono quedó, el color cambió.
  // G-71: vibra suavemente en el panel para distinguir pendientes sin ser agresiva (inactiva en la tienda).
  warning: { badge: 'bg-brand-700 text-white admin-pendiente-vibra', chip: placaAccion, notice: avisoAccion },
  danger: { badge: 'bg-deal text-white', chip: 'bg-deal-bg text-deal', notice: 'border-deal/30 bg-deal-bg text-deal' },
};

/** Badge de estado: "Pendiente", "Pagado", "Rechazado". Con ícono cuando lo hay (estado de la orden: `PildoraEstadoOrden`). */
export function adminBadge(tone: AdminTone): string {
  return `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone].badge}`;
}

/** C-210: un dato en píldora (la guía de ZOOM, un código): gris, con su ícono, para que no compita con el estado. */
export const adminDato =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink-soft ring-1 ring-inset ring-line';

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
export const adminModalTitle = 'text-lg font-semibold text-ink text-balance';
export const adminModalBody = 'overflow-y-auto px-5 py-4';
export const adminModalFooter = 'flex flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-3 sm:flex-row sm:justify-end';

/* ── Pestañas y filtros ───────────────────────────────────────────────── */
export function adminTab(active: boolean): string {
  return [
    'inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg border-b-2 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    active ? 'border-brand-700 bg-brand-500 text-white' : 'border-transparent text-ink-soft hover:bg-surface hover:text-ink',
  ].join(' ');
}

/* ── Vacío y carga ────────────────────────────────────────────────────── */
export const adminEmpty = 'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center';
export const adminSpinner = 'h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent';
