import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';

// Rate limit for analytics endpoint - prevent DoS
const ANALYTICS_RATE_LIMIT = {
    maxRequests: 100,
    windowSeconds: 60, // 100 events per minute per IP
};

// POST - Record an analytics event
export async function POST(request: NextRequest) {
    try {
        const clientIP = getClientIP(request);

        // Rate limiting - protect against event flooding
        const rateLimit = checkRateLimit(clientIP, 'analytics:event', ANALYTICS_RATE_LIMIT);

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Too many requests' },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit, ANALYTICS_RATE_LIMIT)
                }
            );
        }

        const data = await request.json();

        // Validate required fields
        if (!data.eventType || typeof data.eventType !== 'string') {
            return NextResponse.json(
                { error: 'eventType is required and must be a string' },
                { status: 400 }
            );
        }

        // Sanitize event type - only allow alphanumeric and underscores
        const sanitizedEventType = data.eventType.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);

        if (!sanitizedEventType) {
            return NextResponse.json(
                { error: 'Invalid eventType format' },
                { status: 400 }
            );
        }

        // Validate event category
        const validCategories = ['interaction', 'navigation', 'conversion', 'error', 'performance'];
        const eventCategory = validCategories.includes(data.eventCategory)
            ? data.eventCategory
            : 'interaction';

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

        // Sanitize optional string fields
        const sanitizeString = (val: any, maxLen: number = 255): string | null => {
            if (!val || typeof val !== 'string') return null;
            return val.substring(0, maxLen).replace(/<[^>]*>/g, ''); // Strip HTML
        };

        // Validate eventValue
        let eventValue: number | null = null;
        if (data.eventValue !== undefined && data.eventValue !== null) {
            const parsed = parseFloat(data.eventValue);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1000000) {
                eventValue = parsed;
            }
        }

        const event = await prisma.analyticsEvent.create({
            data: {
                eventType: sanitizedEventType,
                eventCategory,
                eventAction: sanitizeString(data.eventAction, 100),
                eventLabel: sanitizeString(data.eventLabel, 255),
                eventValue,
                page: sanitizeString(data.page, 500),
                referrer: sanitizeString(data.referrer, 500),
                userId: sanitizeString(data.userId, 50),
                userEmail: sanitizeString(data.userEmail, 255),
                sessionId: sanitizeString(data.sessionId, 100),
                deviceType,
                browser,
                os,
                ipAddress,
                country: sanitizeString(data.country, 50),
                city: sanitizeString(data.city, 100),
                isSuspicious: Boolean(data.isSuspicious),
                threatLevel: sanitizeString(data.threatLevel, 20),
                threatDetails: sanitizeString(data.threatDetails, 500),
                metadata: data.metadata ? JSON.stringify(data.metadata).substring(0, 2000) : undefined,
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
