import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';

// C-285: lo que leen las pantallas del creador (app/creator y app/creator/dashboard) y nada más: las notas del equipo y los
// demás campos de la fila no salen del servidor. Su comisión y sus ingresos sí: el panel se los muestra a él.
const CAMPOS_DEL_CREADOR = {
  id: true,
  displayName: true,
  bio: true,
  avatar: true,
  expertise: true,
  status: true,
  commissionRate: true,
  totalRevenue: true,
  _count: { select: { courses: true } },
} satisfies Prisma.CourseCreatorSelect;

// GET — get current user's creator profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const creator = await prisma.courseCreator.findUnique({
      where: { userId },
      select: CAMPOS_DEL_CREADOR,
    });

    return NextResponse.json(creator);
  } catch (error) {
    console.error('GET /api/creator error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// POST — apply to become a creator
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const { displayName, bio, expertise } = await request.json();

    if (!displayName) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const existing = await prisma.courseCreator.findUnique({ where: { userId } });
    if (existing) {
      return NextResponse.json({ error: 'Ya tienes una solicitud enviada' }, { status: 400 });
    }

    const creator = await prisma.courseCreator.create({
      data: { userId, displayName, bio: bio || null, expertise: expertise || null },
      select: CAMPOS_DEL_CREADOR,
    });

    // Notify admins about new creator application (fire-and-forget)
    emitAdminEvent({
      type: 'CREATOR_APPLIED',
      title: `Solicitud de creador · ${String(displayName).slice(0, 80)}`,
      summary: `${String(displayName).slice(0, 80)} quiere publicar cursos`,
      fields: [['Correo', session.user.email], ['Especialidad', typeof expertise === 'string' ? expertise.slice(0, 200) : null]],
      link: '/admin/cursos?vista=creadores',
    });

    return NextResponse.json(creator, { status: 201 });
  } catch (error) {
    console.error('POST /api/creator error:', error);
    return NextResponse.json({ error: 'Error al enviar solicitud' }, { status: 500 });
  }
}

// C-285: largos que acepta el perfil (los de la pantalla de Mi perfil de creador)
const MAX_NOMBRE = 80;
const MAX_ESPECIALIDAD = 200;
const MAX_BIO = 2000;
const MAX_FOTO = 500;

/** La foto: una subida a la propia tienda (/uploads/… o /api/uploads/…) o una dirección https. */
function fotoValida(foto: string): boolean {
  if (/^\/(?:api\/)?uploads\/(?!.*\.\.)[\w./-]+$/.test(foto)) return true;
  if (!foto.startsWith('https://')) return false;
  try {
    const url = new URL(foto);
    return Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Texto opcional del formulario: vacío o ausente es null; algo que no es texto o pasa del largo es undefined (no vale). */
function textoOpcional(valor: unknown, max: number): string | null | undefined {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') return undefined;
  const limpio = valor.trim();
  if (limpio.length > max) return undefined;
  return limpio || null;
}

// PATCH — update creator profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Revisa los datos del perfil' }, { status: 400 });
    }

    // Solo los cuatro campos de la pantalla, con su largo; lo demás que llegue se ignora
    const { displayName, bio, expertise, avatar } = body as Record<string, unknown>;
    if (displayName !== undefined && (typeof displayName !== 'string' || !displayName.trim())) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }
    if (typeof displayName === 'string' && displayName.trim().length > MAX_NOMBRE) {
      return NextResponse.json({ error: `El nombre no puede pasar de ${MAX_NOMBRE} caracteres` }, { status: 400 });
    }
    const bioLimpia = textoOpcional(bio, MAX_BIO);
    if (bioLimpia === undefined) {
      return NextResponse.json({ error: `La biografía no puede pasar de ${MAX_BIO} caracteres` }, { status: 400 });
    }
    const especialidad = textoOpcional(expertise, MAX_ESPECIALIDAD);
    if (especialidad === undefined) {
      return NextResponse.json({ error: `La especialidad no puede pasar de ${MAX_ESPECIALIDAD} caracteres` }, { status: 400 });
    }
    const foto = textoOpcional(avatar, MAX_FOTO);
    if (foto === undefined || (foto !== null && !fotoValida(foto))) {
      return NextResponse.json({ error: 'La foto tiene que subirse desde aquí o ser una dirección https' }, { status: 400 });
    }

    const creator = await prisma.courseCreator.update({
      where: { userId },
      data: {
        displayName: typeof displayName === 'string' ? displayName.trim() : undefined,
        bio: bioLimpia,
        expertise: especialidad,
        avatar: foto,
      },
      select: CAMPOS_DEL_CREADOR,
    });

    return NextResponse.json(creator);
  } catch (error) {
    console.error('PATCH /api/creator error:', error);
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}
