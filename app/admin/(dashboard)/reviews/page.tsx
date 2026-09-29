'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiCheck, FiExternalLink, FiRefreshCw, FiStar, FiTrash2, FiX } from 'react-icons/fi';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMontado } from '@/lib/hooks/useMontado';
import { REVIEW_STATUS_LABEL, reviewStatus, type ReviewStatus } from '@/lib/review-status';
import {
    adminBadge,
    adminDangerButton,
    adminEmpty,
    adminHint,
    adminIconButton,
    adminInput,
    adminLabel,
    adminModalBody,
    adminModalFooter,
    adminModalHeader,
    adminModalOverlay,
    adminModalPanel,
    adminModalTitle,
    adminPageHeader,
    adminPageSubtitle,
    adminPageTitle,
    adminSecondaryButton,
    adminSpinner,
    adminSuccessButton,
    adminTab,
    adminTableWrap,
    adminTd,
    adminTh,
    type AdminTone,
} from '@/lib/admin-ui';

// C-124: moderación de reseñas. Antes el panel mandaba `isPublished` (no existe en la base) y cada
// aprobación daba 500; los filtros "Aprobadas" y el estado "Publicada" dependían de ese mismo campo y
// nunca coincidían, y una reseña rechazada se veía como pendiente.

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    isApproved: boolean;
    rejectedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
    user: { name: string | null; email?: string } | null;
    product: { name: string; slug: string } | null;
}

type Filtro = 'ALL' | ReviewStatus;

const FILTROS: Array<[Filtro, string]> = [
    ['PENDING', 'Pendientes'],
    ['APPROVED', 'Publicadas'],
    ['REJECTED', 'Rechazadas'],
    ['ALL', 'Todas'],
];

const TONO: Record<ReviewStatus, AdminTone> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };

const fecha = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Caracas' });

/** Mensaje del servidor, con el detalle técnico si lo trae (solo lo reciben los admins). */
async function mensajeError(response: Response, fallback: string): Promise<string> {
    const data = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
    const base = data?.error || fallback;
    return data?.detail ? `${base}: ${data.detail}` : base;
}

function Estrellas({ rating }: { rating: number }) {
    return (
        <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} de 5 estrellas`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <FiStar key={n} className={`h-4 w-4 ${n <= rating ? 'fill-warning text-warning' : 'text-subtle'}`} aria-hidden="true" />
            ))}
        </span>
    );
}

export default function AdminReviewsPage() {
    const { confirm } = useConfirm();
    const mounted = useMontado();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<Filtro>('PENDING');
    const [ocupada, setOcupada] = useState<string | null>(null);
    const [rechazando, setRechazando] = useState<Review | null>(null);
    const [motivo, setMotivo] = useState('');

    useBodyScrollLock(rechazando !== null);

    async function fetchReviews() {
        setLoading(true);
        try {
            const response = await fetch('/api/reviews');
            if (!response.ok) throw new Error(await mensajeError(response, 'Error al cargar reseñas'));
            setReviews(await response.json());
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al cargar reseñas');
        } finally {
            setLoading(false);
        }
    }

    useCargarAlMontar(fetchReviews, []);

    const conteo = useMemo(() => {
        const c: Record<Filtro, number> = { ALL: reviews.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
        for (const review of reviews) c[reviewStatus(review)] += 1;
        return c;
    }, [reviews]);

    const visibles = filtro === 'ALL' ? reviews : reviews.filter((review) => reviewStatus(review) === filtro);

    async function moderar(review: Review, action: 'approve' | 'reject', reason?: string) {
        setOcupada(review.id);
        try {
            const response = await fetch('/api/reviews', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: review.id, action, ...(reason ? { reason } : {}) }),
            });
            if (!response.ok) {
                toast.error(await mensajeError(response, action === 'approve' ? 'Error al aprobar reseña' : 'Error al rechazar reseña'));
                return false;
            }
            const data = (await response.json()) as { review: Review };
            // Actualización en sitio: la fila cambia de pestaña sin recargar toda la lista
            setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, ...data.review, user: r.user } : r)));
            toast.success(action === 'approve' ? 'Reseña publicada. Avisamos al cliente.' : 'Reseña rechazada');
            window.dispatchEvent(new Event('refresh-sidebar-counts'));
            return true;
        } catch {
            toast.error('Sin conexión. Intenta de nuevo.');
            return false;
        } finally {
            setOcupada(null);
        }
    }

    async function aprobar(review: Review) {
        const ok = await confirm({
            title: 'Publicar reseña',
            message: `Se mostrará en la ficha de ${review.product?.name ?? 'el producto'} y el cliente recibirá un aviso.`,
            confirmText: 'Publicar',
            cancelText: 'Cancelar',
            type: 'info',
        });
        if (ok) await moderar(review, 'approve');
    }

    async function confirmarRechazo() {
        if (!rechazando) return;
        const texto = motivo.trim();
        if (texto && texto.length < 3) {
            toast.error('El motivo debe tener al menos 3 caracteres, o déjalo vacío.');
            return;
        }
        if (await moderar(rechazando, 'reject', texto || undefined)) {
            setRechazando(null);
            setMotivo('');
        }
    }

    async function eliminar(review: Review) {
        const ok = await confirm({
            title: 'Eliminar reseña',
            message: 'Se borra para siempre. Si solo no debe verse, recházala.',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            type: 'danger',
        });
        if (!ok) return;
        setOcupada(review.id);
        try {
            const response = await fetch(`/api/reviews?id=${encodeURIComponent(review.id)}`, { method: 'DELETE' });
            if (!response.ok) {
                toast.error(await mensajeError(response, 'Error al eliminar reseña'));
                return;
            }
            setReviews((prev) => prev.filter((r) => r.id !== review.id));
            toast.success('Reseña eliminada');
        } finally {
            setOcupada(null);
        }
    }

    const acciones = (review: Review) => {
        const estado = reviewStatus(review);
        const busy = ocupada === review.id;
        return (
            <div className="flex items-center gap-2 lg:justify-end [&>button:not(:last-child)]:flex-1 lg:[&>button:not(:last-child)]:flex-none">
                {estado !== 'APPROVED' && (
                    <button type="button" onClick={() => aprobar(review)} disabled={busy} className={adminSuccessButton}>
                        <FiCheck className="h-4 w-4" aria-hidden="true" /> Publicar
                    </button>
                )}
                {estado !== 'REJECTED' && (
                    <button
                        type="button"
                        onClick={() => { setMotivo(''); setRechazando(review); }}
                        disabled={busy}
                        className={adminSecondaryButton}
                    >
                        <FiX className="h-4 w-4" aria-hidden="true" /> {estado === 'APPROVED' ? 'Retirar' : 'Rechazar'}
                    </button>
                )}
                <button type="button" onClick={() => eliminar(review)} disabled={busy} className={`${adminIconButton} h-11 w-11`} aria-label="Eliminar reseña" title="Eliminar">
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        );
    };

    const producto = (review: Review) =>
        review.product ? (
            <a
                href={`/productos/${review.product.slug}#reviews`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
            >
                <span className="line-clamp-1">{review.product.name}</span>
                <FiExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
        ) : (
            <span className="text-muted">Producto eliminado</span>
        );

    const estadoBadge = (review: Review) => {
        const estado = reviewStatus(review);
        return <span className={adminBadge(TONO[estado])}>{REVIEW_STATUS_LABEL[estado]}</span>;
    };

    return (
        <div className="space-y-5">
            <div className={adminPageHeader}>
                <div>
                    <h1 className={adminPageTitle}>Reseñas</h1>
                    <p className={adminPageSubtitle}>Solo las publicadas se ven en la tienda y cuentan para las estrellas.</p>
                </div>
                <button type="button" onClick={fetchReviews} disabled={loading} className={adminSecondaryButton}>
                    <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Actualizar
                </button>
            </div>

            <nav aria-label="Filtrar reseñas" className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex w-max gap-2">
                    {FILTROS.map(([valor, etiqueta]) => (
                        <button key={valor} type="button" onClick={() => setFiltro(valor)} aria-pressed={filtro === valor} className={`${adminTab(filtro === valor)} h-11`}>
                            {etiqueta}
                            {!loading && <span className="tabular-nums">{conteo[valor]}</span>}
                        </button>
                    ))}
                </div>
            </nav>

            {loading ? (
                <div className="flex justify-center py-12"><div className={adminSpinner} /></div>
            ) : visibles.length === 0 ? (
                <div className={adminEmpty}>
                    <p className="text-sm text-muted">
                        {filtro === 'PENDING' ? 'No hay reseñas esperando revisión.' : 'No hay reseñas en esta lista.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* Teléfono: tarjetas con las acciones a la vista */}
                    <ul className="space-y-3 lg:hidden">
                        {visibles.map((review) => (
                            <li key={review.id} className="space-y-2 rounded-2xl border border-line bg-white p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-ink">{review.user?.name || 'Cliente'}</p>
                                        {review.user?.email && <p className="truncate text-xs text-muted">{review.user.email}</p>}
                                    </div>
                                    {estadoBadge(review)}
                                </div>
                                <div className="text-sm">{producto(review)}</div>
                                <div className="flex items-center gap-2">
                                    <Estrellas rating={review.rating} />
                                    <span className="text-xs text-muted">{fecha.format(new Date(review.createdAt))}</span>
                                </div>
                                {review.comment && <p className="text-sm text-ink-soft [overflow-wrap:anywhere]">{review.comment}</p>}
                                {review.rejectionReason && <p className="text-xs text-muted">Motivo: {review.rejectionReason}</p>}
                                {acciones(review)}
                            </li>
                        ))}
                    </ul>

                    <div className={`${adminTableWrap} hidden lg:block`}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className={adminTh}>Cliente</th>
                                    <th className={adminTh}>Producto y reseña</th>
                                    <th className={adminTh}>Estado</th>
                                    <th className={adminTh}>Fecha</th>
                                    <th className={`${adminTh} text-right`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map((review) => (
                                    <tr key={review.id} className="align-top hover:bg-surface">
                                        <td className={`${adminTd} max-w-48`}>
                                            <p className="font-medium text-ink">{review.user?.name || 'Cliente'}</p>
                                            {review.user?.email && <p className="truncate text-xs text-muted">{review.user.email}</p>}
                                        </td>
                                        <td className={`${adminTd} max-w-md space-y-1`}>
                                            {producto(review)}
                                            <div><Estrellas rating={review.rating} /></div>
                                            {review.comment && <p className="text-ink-soft [overflow-wrap:anywhere]">{review.comment}</p>}
                                            {review.rejectionReason && <p className="text-xs text-muted">Motivo: {review.rejectionReason}</p>}
                                        </td>
                                        <td className={adminTd}>{estadoBadge(review)}</td>
                                        <td className={`${adminTd} whitespace-nowrap text-muted`}>{fecha.format(new Date(review.createdAt))}</td>
                                        <td className={`${adminTd} whitespace-nowrap`}>{acciones(review)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {mounted && rechazando && createPortal(
                <div className={adminModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setRechazando(null); }}>
                    <div className={`${adminModalPanel} sm:max-w-md`} role="dialog" aria-modal="true" aria-labelledby="rechazo-titulo">
                        <div className={adminModalHeader}>
                            <h2 id="rechazo-titulo" className={adminModalTitle}>
                                {rechazando.isApproved ? 'Retirar reseña publicada' : 'Rechazar reseña'}
                            </h2>
                            <button type="button" onClick={() => setRechazando(null)} className={`${adminIconButton} h-11 w-11`} aria-label="Cerrar">
                                <FiX className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        <div className={`${adminModalBody} space-y-3`}>
                            <p className="text-sm text-ink-soft">
                                Deja de verse en la tienda y no cuenta para las estrellas. El cliente la ve como rechazada en &quot;Mis reseñas&quot; y puede editarla.
                            </p>
                            <div>
                                <label htmlFor="motivo-rechazo" className={adminLabel}>Motivo (opcional)</label>
                                <textarea
                                    id="motivo-rechazo"
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    maxLength={300}
                                    rows={3}
                                    placeholder="Ej: habla de otro producto"
                                    className={`${adminInput()} h-auto resize-none py-2.5`}
                                />
                                <p className={adminHint}>El cliente lo ve junto a su reseña.</p>
                            </div>
                        </div>
                        <div className={adminModalFooter}>
                            <button type="button" onClick={() => setRechazando(null)} className={adminSecondaryButton}>Volver</button>
                            <button type="button" onClick={confirmarRechazo} disabled={ocupada === rechazando.id} className={adminDangerButton}>
                                <FiX className="h-4 w-4" aria-hidden="true" /> {rechazando.isApproved ? 'Retirar' : 'Rechazar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
