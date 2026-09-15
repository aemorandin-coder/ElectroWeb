import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Create new chat conversation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    // Nombre y correo salen de la sesión, no del cuerpo (C-70)
    const userName = session.user.name || null;
    const userEmail = session.user.email || null;

    // Check if user already has an open conversation
    const existingConversation = await prisma.chatConversation.findFirst({
      where: {
        userId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (existingConversation) {
      return NextResponse.json({ conversation: existingConversation });
    }

    // Create new conversation
    const conversation = await prisma.chatConversation.create({
      data: {
        userId,
        userName,
        userEmail,
        status: 'OPEN',
        priority: 1,
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
