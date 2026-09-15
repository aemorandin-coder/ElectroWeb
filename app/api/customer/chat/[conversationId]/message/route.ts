import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Send message in conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SEGURIDAD (C-70): solo el dueño o un admin escriben, y el remitente sale de la sesión
    // (antes llegaba del cuerpo: cualquiera escribía en chats ajenos haciéndose pasar por el admin)
    const role = session.user.role;
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { userId: true } });
    if (!conversation || (!isAdmin && conversation.userId !== session.user.id)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    const senderId = session.user.id;
    const senderName = session.user.name || session.user.email || (isAdmin ? 'Electro Shop' : 'Cliente');
    const senderType = isAdmin ? 'admin' : 'customer';

    // Create message
    const newMessage = await prisma.chatMessage.create({
      data: {
        conversationId: conversationId,
        senderId,
        senderName,
        senderType,
        message,
        attachments: '[]',
        isRead: false,
      },
    });

    // Update conversation status if needed
    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        status: senderType === 'customer' ? 'OPEN' : 'IN_PROGRESS',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
