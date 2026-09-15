import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: 'La calificación debe estar entre 1 y 5' },
                { status: 400 }
            );
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
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
                rating,
                comment,
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

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { id, rating, comment, isApproved } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de reseña requerido' }, { status: 400 });
        }

        const review = await prisma.review.findUnique({
            where: { id },
        });

        if (!review) {
            return NextResponse.json({ error: 'Reseña no encontrada' }, { status: 404 });
        }

        const userRole = (session.user as any).role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || (session.user as any).permissions?.includes('MANAGE_CONTENT');
        const isOwner = review.userId === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const updateData: any = {};

        if (isOwner && !isAdmin) {
            if (rating !== undefined) updateData.rating = rating;
            if (comment !== undefined) updateData.comment = comment;
        }

        if (isAdmin) {
            if (isApproved !== undefined) updateData.isApproved = isApproved;
            // Also handle isPublished if sent
            if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
        }

        const updatedReview = await prisma.review.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                product: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        if (isAdmin && isApproved && !review.isApproved && updatedReview.user.email) {
            try {
                const companySettings = await prisma.companySettings.findFirst();
                const productUrl = `${process.env.NEXTAUTH_URL}/productos/${updatedReview.product.slug}#reviews`;

                const emailHtml = generateReviewApprovedEmail({
                    companyName: companySettings?.companyName || 'Electro Shop',
                    companyLogo: companySettings?.logo || '',
                    customerName: updatedReview.user.name || 'Cliente',
                    productName: updatedReview.product.name,
                    productUrl,
                    rating: updatedReview.rating,
                });

                await sendEmail({
                    to: updatedReview.user.email,
                    subject: `¡Tu reseña ha sido publicada! - ${updatedReview.product.name}`,
                    html: emailHtml,
                });
            } catch (emailError) {
                console.error('Error sending review approved email:', emailError);
            }

            try {
                await notifyReviewApproved(
                    updatedReview.userId,
                    updatedReview.product.name,
                    updatedReview.product.slug
                );
            } catch (notifError) {
                console.error('Error creating notification:', notifError);
            }
        }

        return NextResponse.json(updatedReview);
    } catch (error) {
        console.error('Error updating review:', error);
        return NextResponse.json({ error: 'Error al actualizar reseña' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de reseña requerido' }, { status: 400 });
        }

        const review = await prisma.review.findUnique({
            where: { id },
        });

        if (!review) {
            return NextResponse.json({ error: 'Reseña no encontrada' }, { status: 404 });
        }

        const userRole = (session.user as any).role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || (session.user as any).permissions?.includes('MANAGE_CONTENT');
        const isOwner = review.userId === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        await prisma.review.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Reseña eliminada' });
    } catch (error) {
        console.error('Error deleting review:', error);
        return NextResponse.json({ error: 'Error al eliminar reseña' }, { status: 500 });
    }
}
