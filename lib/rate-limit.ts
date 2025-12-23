/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis-based solution like @upstash/ratelimit
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    });
}, 60000); // Clean every minute

interface RateLimitConfig {
    /** Maximum number of requests allowed in the window */
    maxRequests: number;
    /** Time window in seconds */
    windowSeconds: number;
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetIn: number; // seconds until reset
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP or userId)
 * @param endpoint - API endpoint name for separate limits
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
): RateLimitResult {
    const key = `${endpoint}:${identifier}`;
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;

    let entry = rateLimitStore.get(key);

    // If no entry or expired, create new one
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 1,
            resetTime: now + windowMs,
        };
        rateLimitStore.set(key, entry);
        return {
            success: true,
            remaining: config.maxRequests - 1,
            resetIn: config.windowSeconds,
        };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);

    return {
        success: entry.count <= config.maxRequests,
        remaining,
        resetIn,
    };
}

/**
 * Pre-configured rate limit profiles
 */
export const RATE_LIMITS = {
    // Very strict - for login/auth endpoints
    AUTH: { maxRequests: 5, windowSeconds: 60 },

    // Strict - for sensitive operations
    SENSITIVE: { maxRequests: 10, windowSeconds: 60 },

    // Standard - for normal API calls
    STANDARD: { maxRequests: 30, windowSeconds: 60 },

    // Relaxed - for read-only public endpoints
    PUBLIC: { maxRequests: 100, windowSeconds: 60 },

    // Very relaxed - for static-like content
    STATIC: { maxRequests: 200, windowSeconds: 60 },
};

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
    // Check various headers for IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback
    return 'unknown';
}

/**
 * Helper to create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig) {
    return {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetIn.toString(),
    };
}
