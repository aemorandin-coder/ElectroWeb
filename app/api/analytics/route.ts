import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';
import { ipParaRegistro } from '@/lib/ip';
import { getToken } from 'next-auth/jwt';
import { BOT_UA } from '@/lib/analytics-bots';


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

        // Cuerpo vacío o cortado (el navegador corta la petición al cambiar de página): 400, no error del servidor (C-109)
        const data = await request.json().catch(() => null);

        // Validate required fields
        if (!data || typeof data !== 'object' || !data.eventType || typeof data.eventType !== 'string') {
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

        // Las compras que llegan por una historia de ElectroStudio las anota solo el servidor (C-113)
        if (sanitizedEventType === 'studio_order') {
            return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 });
        }

        // Validate event category
        const validCategories = ['interaction', 'navigation', 'conversion', 'error', 'performance'];
        const eventCategory = validCategories.includes(data.eventCategory)
            ? data.eventCategory
            : 'interaction';

        // Get IP and user agent from headers
        const ipAddress = ipParaRegistro(request.headers);
        const userAgent = request.headers.get('user-agent') || 'unknown';
        if (userAgent === 'unknown' || BOT_UA.test(userAgent)) {
            return NextResponse.json({ success: true, ignored: 'bot' });
        }
        // El panel no se mide (el rastreador ya lo salta; esto cubre llamadas directas)
        if (typeof data.page === 'string' && data.page.startsWith('/admin')) {
            return NextResponse.json({ success: true, ignored: 'admin' });
        }
        // Quién es sale del token de sesión, nunca del body: antes cualquiera podía anotar eventos a nombre de otro (C-104)
        const token = await getToken({ req: request }).catch(() => null);
        const userId = typeof token?.id === 'string' ? token.id : null;

        // Parse device info from user agent
        // Tableta: iPad o Android sin "Mobile" (así se anuncian las tabletas Android)
        const deviceType = /iPad|Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))
            ? 'tablet'
            : /Mobile|Android|iPhone/i.test(userAgent) ? 'mobile' : 'desktop';

        // El orden importa: Edge y Opera también dicen "Chrome", Chrome también dice "Safari",
        // y un iPhone dice "like Mac OS X" (antes contaba como Mac)
        const browser = /Edg\//.test(userAgent) ? 'Edge'
            : /OPR\/|Opera/.test(userAgent) ? 'Opera'
            : /Firefox|FxiOS/.test(userAgent) ? 'Firefox'
            : /Chrome|CriOS/.test(userAgent) ? 'Chrome'
            : /Safari/.test(userAgent) ? 'Safari'
            : 'unknown';
        const os = /iPhone|iPad|iPod/.test(userAgent) ? 'iOS'
            : /Android/.test(userAgent) ? 'Android'
            : /Windows/.test(userAgent) ? 'Windows'
            : /Mac OS/.test(userAgent) ? 'macOS'
            : /Linux/.test(userAgent) ? 'Linux'
            : 'unknown';

        // Sanitize optional string fields
        const sanitizeString = (val: unknown, maxLen: number = 255): string | null => {
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
                userId,
                sessionId: sanitizeString(data.sessionId, 100),
                deviceType,
                browser,
                os,
                ipAddress,
                country: sanitizeString(data.country, 50),
                city: sanitizeString(data.city, 100),
                // isSuspicious/threatLevel ya no se aceptan del navegador: la seguridad sale de la bitácora del servidor (C-104)
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
