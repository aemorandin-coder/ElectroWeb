import { NextRequest, NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { motivoRechazo, reviewStatus } from '@/lib/review-status';
import { sendEmail } from '@/lib/email-service';
import { generateReviewApprovedEmail } from '@/lib/email-templates/ReviewApproved';
import { notifyReviewApproved } from '@/lib/notifications';
import { emitAdminEvent } from '@/lib/admin-events';
import { hasPermission } from '@/lib/auth-helpers';
import { getPublicReviews, getReviewSummary } from '@/lib/queries/product';

/**
 * GET /api/reviews (C-31):
 * - `?productId=` (público): solo reseñas aprobadas, con nombre corto de quien reseña. Sin emails ni ids de usuario.
 * - Sin productId, con MANAGE_CONTENT o admin: todas, para moderar (incluye el email).
 * - Sin productId, cliente logueado: solo las suyas ("Mis reseñas").
 * Antes era pública, devolvía el email de cada cliente y, sin `publishedOnly`, también las no aprobadas.
 */
// C-110: nota entera de 1 a 5 y comentario con tope. Antes se aceptaba 3,7 al crear y cualquier número al editar
// (un 999 movía el promedio del producto).
function notaValida(v: unknown): number | null {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
function comentarioValido(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length >= 3 && t.length <= 2000 ? t : null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (productId) {
            const [reviews, stats] = await Promise.all([getPublicReviews(productId), getReviewSummary(productId)]);
            return NextResponse.json({
                reviews,
                stats: { averageRating: stats.average, totalReviews: stats.count },
            });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const canModerate = hasPermission(session, 'MANAGE_CONTENT');
        const reviews = await prisma.review.findMany({
            where: canModerate ? {} : { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                product: { select: { name: true, slug: true } },
                user: { select: { name: true, ...(canModerate ? { email: true } : {}) } },
            },
        });

        return NextResponse.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return NextResponse.json({ error: 'Error al obtener reseñas' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { productId, rating, comment } = body;

        if (!productId || !rating || !comment) {
            return NextResponse.json(
                { error: 'Campos requeridos: productId, rating, comment' },
                { status: 400 }
            );
        }

        if (notaValida(rating) === null) {
            return NextResponse.json(
                { error: 'La calificación debe ser de 1 a 5 estrellas' },
                { status: 400 }
            );
        }
        if (comentarioValido(comment) === null) {
            return NextResponse.json({ error: 'El comentario debe tener entre 3 y 2.000 caracteres' }, { status: 400 });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        // "Opiniones verificadas" (lo promete la ficha): la misma regla que /api/reviews/check-eligibility, que el
        // formulario consulta antes de mostrarse. Antes solo la revisaba el navegador (C-110, C-111).
        const compra = await prisma.orderItem.findFirst({
            where: { productId, order: { userId: session.user.id, status: 'DELIVERED' } },
            select: { id: true },
        });
        if (!compra) {
            return NextResponse.json({ error: 'Solo puedes dejar reseñas de productos que hayas comprado y recibido' }, { status: 403 });
        }

        const existingReview = await prisma.review.findFirst({
            where: {
                productId,
                userId: session.user.id,
            },
        });

        if (existingReview) {
            return NextResponse.json(
                { error: 'Ya has enviado una reseña para este producto' },
                { status: 400 }
            );
        }

        const review = await prisma.review.create({
            data: {
                productId,
                userId: session.user.id,
                rating: notaValida(rating) as number,
                comment: comentarioValido(comment) as string,
                isApproved: false,
            },
            include: { product: { select: { name: true } } },
        });

        emitAdminEvent({
            type: 'REVIEW_SUBMITTED',
            title: `Reseña por aprobar · ${review.product.name}`.slice(0, 150),
            summary: `${session.user.name || session.user.email || 'Un cliente'} calificó con ${rating} de 5`,
            fields: [['Producto', review.product.name], ['Comentario', typeof comment === 'string' ? comment.slice(0, 300) : null]],
            link: '/admin/reviews',
        });

        return NextResponse.json(review, { status: 201 });
    } catch (error) {
        console.error('Error creating review:', error);
        return NextResponse.json({ error: 'Error al crear reseña' }, { status: 500 });
    }
}

type ReviewAction = 'approve' | 'reject';

/** Error de la API de reseñas: siempre `{ success: false, error }` con el código HTTP que corresponde. */
function reviewError(error: string, status: number, extra?: Record<string, unknown>) {
    return NextResponse.json({ success: false, error, ...extra }, { status });
}

/**
 * PATCH /api/reviews (C-124)
 * - Moderación (MANAGE_CONTENT o admin): `{ id, action: 'approve' | 'reject', reason? }`.
 *   Se acepta también `{ id, isApproved: boolean }` (pestañas del panel abiertas antes del deploy).
 * - Dueño: `{ id, rating?, comment? }`. Editada vuelve a moderación.
 * Cualquier otro campo se ignora. Antes el panel mandaba `isPublished`, que no es columna de `reviews`:
 * Prisma lanzaba "Unknown argument" y cada aprobación terminaba en un 500.
 * El promedio de estrellas no se guarda: `getReviewSummary` lo calcula de las aprobadas, así que aprobar
 * es un solo UPDATE y no hace falta transacción.
 */
export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return reviewError('No autorizado', 401);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!body || !id) return reviewError('ID de reseña requerido', 400);

    const canModerate = hasPermission(session, 'MANAGE_CONTENT');
    const action: ReviewAction | null = body.action === 'approve' || body.action === 'reject'
        ? body.action
        : typeof body.isApproved === 'boolean' ? (body.isApproved ? 'approve' : 'reject') : null;

    try {
        const review = await prisma.review.findUnique({ where: { id } });
        if (!review) return reviewError('Reseña no encontrada', 404);

        const isOwner = review.userId === session.user.id;
        let data: Prisma.ReviewUpdateInput;

        if (action && canModerate) {
            if (action === 'approve') {
                data = { isApproved: true, rejectedAt: null, rejectionReason: null };
            } else {
                const reason = motivoRechazo(body.reason);
                if (reason === undefined) return reviewError('El motivo debe tener entre 3 y 300 caracteres', 400);
                data = { isApproved: false, rejectedAt: new Date(), rejectionReason: reason };
            }
        } else if (isOwner && (body.rating !== undefined || body.comment !== undefined)) {
            data = {};
            if (body.rating !== undefined) {
                const nota = notaValida(body.rating);
                if (nota === null) return reviewError('La calificación debe ser de 1 a 5 estrellas', 400);
                data.rating = nota;
            }
            if (body.comment !== undefined) {
                const texto = comentarioValido(body.comment);
                if (texto === null) return reviewError('El comentario debe tener entre 3 y 2.000 caracteres', 400);
                data.comment = texto;
            }
            // Editada vuelve a moderación: antes el texto nuevo de una reseña aprobada salía publicado sin revisión
            data.isApproved = false;
            data.rejectedAt = null;
            data.rejectionReason = null;
        } else if (!canModerate && !isOwner) {
            return reviewError('No autorizado', 403);
        } else {
            return reviewError(action ? 'No tienes permiso para moderar reseñas' : 'No hay cambios para guardar', action ? 403 : 400);
        }

        const updatedReview = await prisma.review.update({
            where: { id },
            data,
            include: {
                user: { select: { name: true, email: true } },
                product: { select: { name: true, slug: true } },
            },
        });

        // Las estrellas salen en las tarjetas del home (ISR): se regeneran con la reseña nueva o sin la retirada
        if (review.isApproved !== updatedReview.isApproved) revalidateStorefront();

        // Aviso al cliente después de responder: un SMTP lento ya no demora ni tumba la aprobación
        if (action === 'approve' && !review.isApproved && updatedReview.user.email) {
            const to = updatedReview.user.email;
            after(async () => {
                try {
                    const companySettings = await prisma.companySettings.findFirst({ select: { companyName: true, logo: true } });
                    await sendEmail({
                        to,
                        subject: `Tu reseña ya está publicada - ${updatedReview.product.name}`,
                        html: generateReviewApprovedEmail({
                            companyName: companySettings?.companyName || 'Electro Shop',
                            companyLogo: companySettings?.logo || '',
                            customerName: updatedReview.user.name || 'Cliente',
                            productName: updatedReview.product.name,
                            productUrl: `${process.env.NEXTAUTH_URL}/productos/${updatedReview.product.slug}#reviews`,
                            rating: updatedReview.rating,
                        }),
                    });
                } catch (emailError) {
                    console.error('[reviews] correo de reseña aprobada:', emailError);
                }
                try {
                    await notifyReviewApproved(updatedReview.userId, updatedReview.product.name, updatedReview.product.slug);
                } catch (notifError) {
                    console.error('[reviews] notificación de reseña aprobada:', notifError);
                }
            });
        }

        return NextResponse.json({
            success: true,
            review: { ...updatedReview, user: { name: updatedReview.user.name, ...(canModerate ? { email: updatedReview.user.email } : {}) } },
            status: reviewStatus(updatedReview),
        });
    } catch (error) {
        const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
        console.error('[reviews] PATCH', { id, action, prismaCode, error });
        if (prismaCode === 'P2025') return reviewError('Reseña no encontrada', 404);
        return reviewError(
            action === 'approve' ? 'No se pudo aprobar la reseña' : action === 'reject' ? 'No se pudo rechazar la reseña' : 'No se pudo actualizar la reseña',
            500,
            // El detalle técnico solo para el equipo: al cliente no se le muestran nombres de tablas ni columnas
            canModerate ? { detail: error instanceof Error ? error.message.slice(0, 300) : String(error), prismaCode } : undefined,
        );
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return reviewError('No autorizado', 401);

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return reviewError('ID de reseña requerido', 400);

    try {
        const review = await prisma.review.findUnique({ where: { id }, select: { userId: true, isApproved: true } });
        if (!review) return reviewError('Reseña no encontrada', 404);

        if (!hasPermission(session, 'MANAGE_CONTENT') && review.userId !== session.user.id) {
            return reviewError('No autorizado', 403);
        }

        await prisma.review.delete({ where: { id } });
        if (review.isApproved) revalidateStorefront();

        return NextResponse.json({ success: true, message: 'Reseña eliminada' });
    } catch (error) {
        console.error('[reviews] DELETE', { id, error });
        return reviewError('No se pudo eliminar la reseña', 500);
    }
}
