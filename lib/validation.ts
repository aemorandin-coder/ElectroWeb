import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Common validation schemas
 */
export const schemas = {
    // Email validation
    email: z.string().email('Email inválido').toLowerCase().trim(),

    // Password validation
    password: z.string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres')
        .max(100, 'La contraseña es demasiado larga'),

    // Phone validation (Venezuela format)
    phone: z.string()
        .regex(/^(0412|0414|0416|0424|0426)\d{7}$/, 'Formato de teléfono inválido. Ej: 04121234567'),

    // Venezuelan ID/RIF validation
    idNumber: z.string()
        .regex(/^[VEJPG]-?\d{6,9}$/, 'Formato de cédula/RIF inválido. Ej: V-12345678'),

    // Name validation
    name: z.string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(100, 'El nombre es demasiado largo')
        .trim(),

    // UUID validation
    uuid: z.string().uuid('ID inválido'),

    // Positive number
    positiveNumber: z.number().positive('Debe ser un número positivo'),

    // Decimal price
    price: z.number().min(0, 'El precio no puede ser negativo'),

    // Pago Móvil reference
    pagoMovilReferencia: z.string()
        .regex(/^\d{4,8}$/, 'La referencia debe tener entre 4 y 8 dígitos'),

    // Date string (YYYY-MM-DD)
    dateString: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
};

/**
 * Schema builders for common patterns
 */
export const schemaBuilders = {
    // Pagination
    pagination: z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().min(1).max(100).default(20),
    }),

    // Order by
    orderBy: (validFields: string[]) => z.object({
        field: z.enum(validFields as [string, ...string[]]),
        direction: z.enum(['asc', 'desc']).default('desc'),
    }),
};

/**
 * Validate request body with schema
 * Returns parsed data or error response
 */
export async function validateBody<T extends z.ZodSchema>(
    request: Request,
    schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const errors = result.error.issues.map((e: z.ZodIssue) => ({
                field: e.path.join('.'),
                message: e.message,
            }));

            return {
                success: false,
                response: NextResponse.json(
                    {
                        error: 'Datos inválidos',
                        details: errors,
                    },
                    { status: 400 }
                ),
            };
        }

        return { success: true, data: result.data };
    } catch {
        return {
            success: false,
            response: NextResponse.json(
                { error: 'JSON inválido en el cuerpo de la solicitud' },
                { status: 400 }
            ),
        };
    }
}

/**
 * Validate query params with schema
 */
export function validateQuery<T extends z.ZodSchema>(
    searchParams: URLSearchParams,
    schema: T
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
    const params: Record<string, string | string[]> = {};

    searchParams.forEach((value, key) => {
        if (params[key]) {
            if (Array.isArray(params[key])) {
                (params[key] as string[]).push(value);
            } else {
                params[key] = [params[key] as string, value];
            }
        } else {
            params[key] = value;
        }
    });

    const result = schema.safeParse(params);

    if (!result.success) {
        return {
            success: false,
            response: NextResponse.json(
                {
                    error: 'Parámetros inválidos',
                    details: result.error.issues.map((e: z.ZodIssue) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                },
                { status: 400 }
            ),
        };
    }

    return { success: true, data: result.data };
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(str: string): string {
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}

/**
 * Sanitize object values recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized as T;
}
