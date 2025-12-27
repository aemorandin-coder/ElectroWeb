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

// ============================================
// PROGRESSIVE BLOCKING FOR FAILED ATTEMPTS
// ============================================

interface FailedAttemptEntry {
    attempts: number;
    lastAttempt: number;
    blockedUntil: number | null;
}

// Store for tracking failed attempts
const failedAttemptsStore = new Map<string, FailedAttemptEntry>();

// Block durations in seconds (progressive)
const BLOCK_DURATIONS = [
    60,      // 1 minute after 5 attempts
    300,     // 5 minutes after 10 attempts
    900,     // 15 minutes after 15 attempts
    3600,    // 1 hour after 20 attempts
];

/**
 * Record a failed attempt and check if should be blocked
 * @param identifier - Unique identifier (userId:IP or just IP)
 * @param action - Action name for tracking
 * @returns Object with blocked status and time remaining
 */
export function recordFailedAttempt(
    identifier: string,
    action: string
): { blocked: boolean; blockedFor: number; attempts: number } {
    const key = `failed:${action}:${identifier}`;
    const now = Date.now();

    let entry = failedAttemptsStore.get(key);

    if (!entry) {
        entry = {
            attempts: 1,
            lastAttempt: now,
            blockedUntil: null,
        };
        failedAttemptsStore.set(key, entry);
        return { blocked: false, blockedFor: 0, attempts: 1 };
    }

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
        const blockedFor = Math.ceil((entry.blockedUntil - now) / 1000);
        return { blocked: true, blockedFor, attempts: entry.attempts };
    }

    // Reset if last attempt was more than 1 hour ago
    if (now - entry.lastAttempt > 3600000) {
        entry.attempts = 1;
        entry.blockedUntil = null;
    } else {
        entry.attempts++;
    }

    entry.lastAttempt = now;

    // Determine if should block and for how long
    if (entry.attempts >= 5) {
        const blockIndex = Math.min(
            Math.floor((entry.attempts - 5) / 5),
            BLOCK_DURATIONS.length - 1
        );
        const blockDuration = BLOCK_DURATIONS[blockIndex];
        entry.blockedUntil = now + (blockDuration * 1000);

        failedAttemptsStore.set(key, entry);
        return {
            blocked: true,
            blockedFor: blockDuration,
            attempts: entry.attempts
        };
    }

    failedAttemptsStore.set(key, entry);
    return { blocked: false, blockedFor: 0, attempts: entry.attempts };
}

/**
 * Check if identifier is currently blocked
 */
export function isBlocked(identifier: string, action: string): {
    blocked: boolean;
    blockedFor: number;
    attempts: number;
} {
    const key = `failed:${action}:${identifier}`;
    const entry = failedAttemptsStore.get(key);

    if (!entry) {
        return { blocked: false, blockedFor: 0, attempts: 0 };
    }

    const now = Date.now();

    if (entry.blockedUntil && now < entry.blockedUntil) {
        const blockedFor = Math.ceil((entry.blockedUntil - now) / 1000);
        return { blocked: true, blockedFor, attempts: entry.attempts };
    }

    return { blocked: false, blockedFor: 0, attempts: entry.attempts };
}

/**
 * Reset failed attempts after successful action
 */
export function resetFailedAttempts(identifier: string, action: string): void {
    const key = `failed:${action}:${identifier}`;
    failedAttemptsStore.delete(key);
}

/**
 * Clean up old failed attempt entries periodically
 */
setInterval(() => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    Array.from(failedAttemptsStore.entries()).forEach(([key, entry]) => {
        // Remove entries that haven't had activity in over an hour
        // and are no longer blocked
        if (entry.lastAttempt < oneHourAgo &&
            (!entry.blockedUntil || now > entry.blockedUntil)) {
            failedAttemptsStore.delete(key);
        }
    });
}, 300000); // Clean every 5 minutes

