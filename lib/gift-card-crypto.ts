/**
 * Cryptographic utilities for gift card security
 * Uses Node.js built-in crypto module
 */
import crypto from 'crypto';

/**
 * Generate a cryptographically secure random code
 * Uses crypto.randomBytes for high entropy
 */
export function generateSecureCode(length: number = 16): string {
    // Use a set of unambiguous characters
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }

    return result;
}

/**
 * Generate a formatted gift card code
 * Format: ESMC-XXXX-XXXX-XXXX (16 chars of entropy)
 */
export function generateGiftCardCode(): string {
    const code = generateSecureCode(12);
    // Format as ESMC-XXXX-XXXX-XXXX
    return `ESMC${code.slice(0, 4)}${code.slice(4, 8)}${code.slice(8, 12)}`;
}

/**
 * Hash a gift card code using SHA-256
 * This is what we store in the database
 */
export function hashGiftCardCode(code: string): string {
    // Normalize: uppercase, remove dashes/spaces
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verify a code against a stored hash
 */
export function verifyGiftCardCode(code: string, storedHash: string): boolean {
    const codeHash = hashGiftCardCode(code);
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(codeHash, 'hex'),
            Buffer.from(storedHash, 'hex')
        );
    } catch {
        return false;
    }
}

/**
 * Extract last 4 characters of a code for display
 */
export function getCodeLastFour(code: string): string {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normalized.slice(-4);
}

/**
 * Generate a secure PIN (4-6 digits)
 */
export function generateSecurePin(length: number = 4): string {
    const bytes = crypto.randomBytes(length);
    let pin = '';
    for (let i = 0; i < length; i++) {
        pin += (bytes[i] % 10).toString();
    }
    return pin;
}

/**
 * Hash a PIN for storage
 */
export function hashPin(pin: string): string {
    return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * Verify a PIN against stored hash
 */
export function verifyPin(pin: string, storedHash: string): boolean {
    const pinHash = hashPin(pin);
    try {
        return crypto.timingSafeEqual(
            Buffer.from(pinHash, 'hex'),
            Buffer.from(storedHash, 'hex')
        );
    } catch {
        return false;
    }
}

/**
 * Generate a unique idempotency key for transactions
 */
export function generateIdempotencyKey(): string {
    return crypto.randomUUID();
}
