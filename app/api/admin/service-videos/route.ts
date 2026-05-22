import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const videos = await prisma.techServiceVideo.findMany({
      orderBy: { order: 'asc' },
      include: {
        reviews: {
          select: { rating: true },
        },
      },
    });

    const withStats = videos.map((v) => {
      const avg =
        v.reviews.length > 0
          ? v.reviews.reduce((s, r) => s + r.rating, 0) / v.reviews.length
          : null;
      return { ...v, avgRating: avg, reviewCount: v.reviews.length };
    });

    return NextResponse.json(withStats);
  } catch (error) {
    console.error('GET service-videos error:', error);
    return NextResponse.json({ error: 'Error al obtener trabajos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();

    const video = await prisma.techServiceVideo.create({
      data: {
        title: body.title,
        description: body.description || null,
        videoUrl: body.videoUrl,
        thumbnail: body.thumbnail || null,
        platform: body.platform || 'YOUTUBE',
        category: body.category || null,
        beforeImage: body.beforeImage || null,
        afterImage: body.afterImage || null,
        customerName: body.customerName || null,
        testimonial: body.testimonial || null,
        isActive: body.isActive ?? true,
        order: body.order ?? 0,
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error('POST service-videos error:', error);
    return NextResponse.json({ error: 'Error al crear trabajo' }, { status: 500 });
  }
}
