'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';

interface Review {
    id: string;
    productId: string;
    userId: string;
    userName: string;
    userImage?: string;
    rating: number;
    title?: string;
    comment: string;
    images: string[];
    isVerifiedPurchase: boolean;
    isApproved: boolean;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function AdminReviewsPage() {
    const { confirm } = useConfirm();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    useEffect(() => {
        fetchReviews();
    }, [filter]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/reviews');
            if (response.ok) {
                const data = await response.json();
                let filteredData = data;

                if (filter === 'pending') {
                    filteredData = data.filter((r: Review) => !r.isApproved && !r.isPublished);
                } else if (filter === 'approved') {
                    filteredData = data.filter((r: Review) => r.isApproved && r.isPublished);
                } else if (filter === 'rejected') {
                    filteredData = data.filter((r: Review) => !r.isApproved && r.isPublished === false);
                }

                setReviews(filteredData);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast.error('Error al cargar reseñas');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (reviewId: string) => {
        const confirmed = await confirm({
            title: 'Aprobar Reseña',
            message: '¿Estás seguro de aprobar y publicar esta reseña?',
            confirmText: 'Sí, Aprobar',
            cancelText: 'Cancelar',
            type: 'info'
        });

        if (!confirmed) return;

        try {
            const response = await fetch('/api/reviews', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: reviewId,
                    isApproved: true,
                    isPublished: true,
                }),
            });

            if (response.ok) {
                toast.success('Reseña aprobada y publicada');
                fetchReviews();
            } else {
                toast.error('Error al aprobar reseña');
            }
        } catch (error) {
            console.error('Error approving review:', error);
            toast.error('Error al aprobar reseña');
        }
    };

    const handleReject = async (reviewId: string) => {
        const confirmed = await confirm({
            title: 'Rechazar Reseña',
            message: '¿Estás seguro de rechazar esta reseña? No será visible para los clientes.',
            confirmText: 'Sí, Rechazar',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            const response = await fetch('/api/reviews', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: reviewId,
                    isApproved: false,
                    isPublished: false,
                }),
            });

            if (response.ok) {
                toast.success('Reseña rechazada');
                fetchReviews();
            } else {
                toast.error('Error al rechazar reseña');
            }
        } catch (error) {
            console.error('Error rejecting review:', error);
            toast.error('Error al rechazar reseña');
        }
    };

    const handleDelete = async (reviewId: string) => {
        const confirmed = await confirm({
            title: 'Eliminar Reseña',
            message: '¿Estás seguro de eliminar esta reseña? Esta acción no se puede deshacer.',
            confirmText: 'Sí, Eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            const response = await fetch(`/api/reviews?id=${reviewId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Reseña eliminada');
                fetchReviews();
            } else {
                toast.error('Error al eliminar reseña');
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            toast.error('Error al eliminar reseña');
        }
    };

    const getStatusBadge = (review: Review) => {
        if (review.isApproved && review.isPublished) {
            return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Publicada</span>;
        } else if (!review.isApproved) {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Pendiente</span>;
        } else {
            return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Rechazada</span>;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Moderación de Reseñas</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Todas ({reviews.length})
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pending'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'approved'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Aprobadas
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-600">No hay reseñas para mostrar</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Calificación
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Comentario
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reviews.map((review) => (
                                <tr key={review.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                {review.userImage ? (
                                                    <img className="h-10 w-10 rounded-full" src={review.userImage} alt="" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                                        {review.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{review.userName}</div>
                                                {review.isVerifiedPurchase && (
                                                    <div className="text-xs text-green-600">✓ Compra verificada</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {[...Array(5)].map((_, i) => (
                                                <svg
                                                    key={i}
                                                    className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                                        }`}
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {review.title && <div className="font-medium mb-1">{review.title}</div>}
                                            <div className="text-gray-600 line-clamp-2">{review.comment}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(review)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString('es-ES')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            {!review.isApproved && (
                                                <button
                                                    onClick={() => handleApprove(review.id)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Aprobar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                            )}
                                            {review.isApproved && (
                                                <button
                                                    onClick={() => handleReject(review.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Rechazar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(review.id)}
                                                className="text-gray-600 hover:text-gray-900"
                                                title="Eliminar"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
