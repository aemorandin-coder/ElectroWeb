/**
 * Cryptographic utilities for gift card security
 * Uses Node.js built-in crypto module
 */
import crypto from 'crypto';
import { GIFT_CARD_PIN_LENGTH } from './gift-card-pin';

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
 * Generate a secure PIN (6 digits by default). crypto.randomInt: sin sesgo de módulo.
 */
export function generateSecurePin(length: number = GIFT_CARD_PIN_LENGTH): string {
    let pin = '';
    for (let i = 0; i < length; i++) {
        pin += crypto.randomInt(10).toString();
    }
    return pin;
}

const PIN_HMAC_PREFIX = 'h1$';

function pinSecret(): string {
    const secret = process.env.GIFT_CARD_PIN_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('Falta GIFT_CARD_PIN_SECRET o NEXTAUTH_SECRET para proteger los PIN');
    return secret;
}

/**
 * Hash a PIN for storage: HMAC-SHA256 con clave del servidor (C-71).
 * Antes era SHA-256 sin clave: con 4 dígitos, cualquiera con el hash lo descifraba en milisegundos.
 */
export function hashPin(pin: string): string {
    return PIN_HMAC_PREFIX + crypto.createHmac('sha256', pinSecret()).update(pin).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
    try {
        const bufA = Buffer.from(a, 'hex');
        const bufB = Buffer.from(b, 'hex');
        return bufA.length === bufB.length && bufA.length > 0 && crypto.timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
}

/**
 * Verify a PIN against what is stored. Acepta los 3 formatos que existen en la base de datos:
 * HMAC (`h1$…`, desde C-71), SHA-256 sin clave (64 hex, tarjetas viejas) y texto plano (muy viejas).
 */
export function verifyPin(pin: string, stored: string): boolean {
    if (!pin || !stored) return false;
    if (stored.startsWith(PIN_HMAC_PREFIX)) {
        return safeEqualHex(hashPin(pin).slice(PIN_HMAC_PREFIX.length), stored.slice(PIN_HMAC_PREFIX.length));
    }
    if (/^[0-9a-f]{64}$/i.test(stored)) {
        return safeEqualHex(crypto.createHash('sha256').update(pin).digest('hex'), stored);
    }
    const given = Buffer.from(pin);
    const expected = Buffer.from(stored);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * Generate a unique idempotency key for transactions
 */
export function generateIdempotencyKey(): string {
    return crypto.randomUUID();
}
