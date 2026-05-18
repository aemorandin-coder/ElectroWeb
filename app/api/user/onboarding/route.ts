import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/onboarding
 * Marca el onboarding del usuario como completado en localStorage (client)
 * y como señal en BD si el campo existe.
 *
 * Issue #26 (Bloque 3) — Tour guiado post-registro
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Intentar actualizar el campo onboardingCompleted si existe en el schema
    // (fire-and-forget — si el campo no existe en Prisma aún, no falla la app)
    try {
      // Usa $executeRawUnsafe para no depender del tipo generado por Prisma
      await prisma.$executeRawUnsafe(
        `UPDATE "Customer" SET "onboardingCompleted" = true WHERE "userId" = $1`,
        userId
      );
    } catch {
      // Tabla/campo no existe aún en schema — localStorage es el fallback
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[onboarding] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
