import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendCourseEnrollmentEmail } from '@/lib/email-templates/CourseCertificate';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para inscribirte' }, { status: 401 });
    }

    const { slug } = await params;
    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email as string;
    const userName = ((session.user as any).name as string) || 'Estudiante';

    const course = await prisma.course.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        priceUSD: true,
        title: true,
        enrollmentCount: true,
        creatorId: true,
        creator: { select: { id: true, commissionRate: true, displayName: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    // Check existing enrollment
    const existing = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Ya estás inscrito en este curso' }, { status: 400 });
    }

    // Prevent creator from buying their own course
    if (course.creatorId) {
      const userCreator = await prisma.courseCreator.findUnique({ where: { userId } });
      if (userCreator && userCreator.id === course.creatorId) {
        return NextResponse.json(
          { error: 'No puedes inscribirte en tu propio curso' },
          { status: 403 }
        );
      }
    }

    const instructorName = course.creator?.displayName || 'ElectroShop';

    // ── Free course ─────────────────────────────────────────────────────────
    if (Number(course.priceUSD) === 0) {
      const [enrollment] = await prisma.$transaction([
        prisma.courseEnrollment.create({ data: { courseId: course.id, userId } }),
        prisma.course.update({
          where: { id: course.id },
          data: { enrollmentCount: { increment: 1 } },
        }),
      ]);

      sendCourseEnrollmentEmail(userEmail, {
        studentName: userName,
        courseTitle: course.title,
        instructorName,
        courseSlug: course.slug,
      }).catch((err) => console.error('[Enrollment email error]', err));

      return NextResponse.json({ enrollment, message: 'Inscripción exitosa' }, { status: 201 });
    }

    // ── Paid course ──────────────────────────────────────────────────────────
    const userBalance = await prisma.userBalance.findUnique({ where: { userId } });
    if (!userBalance || Number(userBalance.balance) < Number(course.priceUSD)) {
      return NextResponse.json(
        { error: 'Saldo insuficiente. Recarga tu billetera para inscribirte.' },
        { status: 402 }
      );
    }

    // Calculate creator's commission cut
    const price = Number(course.priceUSD);
    const commissionRate = Number(course.creator?.commissionRate ?? 90);
    const creatorCut = course.creator ? Math.round(price * (commissionRate / 100) * 100) / 100 : 0;

    // Atomic interactive transaction
    const enrollment = await prisma.$transaction(async (tx) => {
      await tx.userBalance.update({
        where: { userId },
        data: {
          balance: { decrement: course.priceUSD },
          totalSpent: { increment: course.priceUSD },
        },
      });

      const newEnrollment = await tx.courseEnrollment.create({
        data: { courseId: course.id, userId },
      });

      await tx.transaction.create({
        data: {
          balanceId: userBalance.id,
          type: 'PURCHASE',
          status: 'COMPLETED',
          amount: course.priceUSD,
          currency: 'USD',
          description: `Inscripción: ${course.title}`,
        },
      });

      await tx.course.update({
        where: { id: course.id },
        data: { enrollmentCount: { increment: 1 } },
      });

      if (course.creator && creatorCut > 0) {
        await tx.courseCreator.update({
          where: { id: course.creator.id },
          data: { totalRevenue: { increment: creatorCut } },
        });
      }

      return newEnrollment;
    });

    // Send enrollment confirmation email (fire-and-forget)
    sendCourseEnrollmentEmail(userEmail, {
      studentName: userName,
      courseTitle: course.title,
      instructorName,
      courseSlug: course.slug,
    }).catch((err) => console.error('[Enrollment email error]', err));

    return NextResponse.json({ enrollment, message: 'Inscripción exitosa' }, { status: 201 });
  } catch (error) {
    console.error('POST enroll error:', error);
    return NextResponse.json({ error: 'Error al procesar inscripción' }, { status: 500 });
  }
}
