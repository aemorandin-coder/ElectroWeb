import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Check if user can review a product
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !session.user.id) {
            return NextResponse.json({
                canReview: false,
                message: 'Debes iniciar sesión para dejar una reseña'
            });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({
                canReview: false,
                message: 'Producto no especificado'
            }, { status: 400 });
        }

        // Check if user has already reviewed this product
        const existingReview = await prisma.review.findFirst({
            where: {
                productId,
                userId: session.user.id,
            },
        });

        if (existingReview) {
            return NextResponse.json({
                canReview: false,
                message: 'Ya has enviado una reseña para este producto',
            });
        }

        // Check if user has purchased and received this product
        const deliveredOrder = await prisma.orderItem.findFirst({
            where: {
                productId,
                order: {
                    userId: session.user.id,
                    status: 'DELIVERED',
                },
            },
        });

        if (!deliveredOrder) {
            return NextResponse.json({
                canReview: false,
                message: 'Solo puedes dejar reseñas de productos que hayas comprado y recibido',
            });
        }

        return NextResponse.json({
            canReview: true,
            message: 'Puedes dejar una reseña para este producto',
        });
    } catch (error) {
        console.error('Error checking review eligibility:', error);
        return NextResponse.json({
            canReview: false,
            message: 'Error al verificar elegibilidad'
        }, { status: 500 });
    }
}
