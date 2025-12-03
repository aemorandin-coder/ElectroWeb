import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Send message in conversation
export async function POST(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, senderId, senderName, senderType } = await req.json();

    if (!message || !senderId || !senderName || !senderType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create message
    const newMessage = await prisma.chatMessage.create({
      data: {
        conversationId: params.conversationId,
        senderId,
        senderName,
        senderType,
        message,
        attachments: [],
        isRead: false,
      },
    });

    // Update conversation status if needed
    await prisma.chatConversation.update({
      where: { id: params.conversationId },
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
