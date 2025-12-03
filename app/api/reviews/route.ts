import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { generateReviewApprovedEmail } from '@/lib/email-templates/ReviewApproved';
import { notifyReviewApproved } from '@/lib/notifications';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const userId = searchParams.get('userId');
        const publishedOnly = searchParams.get('publishedOnly') === 'true';

        const where: any = {};

        if (productId) {
            where.productId = productId;
        }

        if (userId) {
            where.userId = userId;
        }

        if (publishedOnly) {
            where.isApproved = true;
        }

        const reviews = await prisma.review.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        if (productId) {
            const approvedReviews = reviews.filter(r => r.isApproved);
            const totalRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = approvedReviews.length > 0 ? totalRating / approvedReviews.length : 0;

            return NextResponse.json({
                reviews,
                stats: {
                    averageRating,
                    totalReviews: approvedReviews.length,
                },
            });
        }

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

        const isAdmin = (session.user as any).permissions?.includes('MANAGE_CONTENT');
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

        if (isAdmin && isApproved && !review.isApproved) {
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

        const isAdmin = (session.user as any).permissions?.includes('MANAGE_CONTENT');
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
