import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Record an analytics event
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        // Get IP and user agent from headers
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Parse device info from user agent
        const deviceType = /Mobile|Android|iPhone|iPad/i.test(userAgent) ?
            (/iPad|Tablet/i.test(userAgent) ? 'tablet' : 'mobile') : 'desktop';

        const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)/i)?.[0] || 'unknown';
        const os = userAgent.match(/(Windows|Mac OS|Linux|Android|iOS)/i)?.[0] || 'unknown';

        const event = await prisma.analyticsEvent.create({
            data: {
                eventType: data.eventType,
                eventCategory: data.eventCategory || 'interaction',
                eventAction: data.eventAction,
                eventLabel: data.eventLabel,
                eventValue: data.eventValue ? parseFloat(data.eventValue) : null,
                page: data.page,
                referrer: data.referrer,
                userId: data.userId,
                userEmail: data.userEmail,
                sessionId: data.sessionId,
                deviceType,
                browser,
                os,
                ipAddress,
                country: data.country,
                city: data.city,
                isSuspicious: data.isSuspicious || false,
                threatLevel: data.threatLevel,
                threatDetails: data.threatDetails,
                metadata: data.metadata,
            },
        });

        return NextResponse.json({ success: true, eventId: event.id });
    } catch (error) {
        console.error('Error recording analytics event:', error);
        return NextResponse.json(
            { error: 'Failed to record event' },
            { status: 500 }
        );
    }
}
