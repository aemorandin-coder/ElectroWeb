import { Decimal } from '@prisma/client/runtime/library';

/**
 * Formatea un precio (que puede ser un Decimal de Prisma o un número) a string con 2 decimales
 */
export function formatPrice(price: Decimal | number | string): string {
  if (typeof price === 'number') {
    return price.toFixed(2);
  }

  if (typeof price === 'string') {
    return parseFloat(price).toFixed(2);
  }

  // Es un Decimal de Prisma
  return parseFloat(price.toString()).toFixed(2);
}

/**
 * Convierte un Decimal de Prisma a número
 */
export function decimalToNumber(decimal: Decimal | number): number {
  if (typeof decimal === 'number') {
    return decimal;
  }
  return parseFloat(decimal.toString());
}

/**
 * Formatea un precio con símbolo de moneda
 */
export function formatCurrency(price: Decimal | number | string, currency: 'USD' | 'VES' | 'EUR' = 'USD'): string {
  const symbols = {
    USD: '$',
    VES: 'Bs.',
    EUR: '€',
  };

  return `${symbols[currency]}${formatPrice(price)}`;
}

/**
 * Genera un slug a partir de un string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formatea una fecha de forma legible
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Trunca un texto a un número máximo de caracteres
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Valida un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Genera un número de orden único
 */
export function generateOrderNumber(lastOrderNumber: string | null): string {
  const year = new Date().getFullYear();

  if (!lastOrderNumber) {
    return `ORD-${year}-0001`;
  }

  const parts = lastOrderNumber.split('-');
  const lastNumber = parseInt(parts[2] || '0');
  const nextNumber = lastNumber + 1;

  return `ORD-${year}-${String(nextNumber).padStart(4, '0')}`;
}
