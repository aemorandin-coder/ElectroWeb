import { z } from 'zod';
import { PaymentMethodType } from '@prisma/client';

export const paymentMethodTypeEnum = z.nativeEnum(PaymentMethodType);

// Base common fields
const basePaymentMethodSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type: paymentMethodTypeEnum,
  instructions: z.string().trim().optional().nullable(),
  displayNote: z.string().trim().optional().nullable(),
  logo: z.string().trim().optional().nullable(),
  qrCodeImage: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  minAmount: z.coerce.number().positive('El monto mínimo debe ser mayor a 0').optional().nullable(),
  maxAmount: z.coerce.number().positive('El monto máximo debe ser mayor a 0').optional().nullable(),
  isActive: z.boolean().default(true),
});

export type BasePaymentMethodInput = z.infer<typeof basePaymentMethodSchema>;

export interface CleanedPaymentMethodData {
  name: string;
  type: PaymentMethodType;
  instructions: string | null;
  displayNote: string | null;
  logo: string | null;
  qrCodeImage: string | null;
  sortOrder: number;
  minAmount: number | null;
  maxAmount: number | null;
  isActive: boolean;
  bankName: string | null;
  accountNumber: string | null;
  accountType: string | null;
  holderName: string | null;
  holderId: string | null;
  phone: string | null;
  email: string | null;
  payId: string | null;
  walletAddress: string | null;
  network: string | null;
}

/**
 * Valida y sanea los campos de un método de pago según su tipo.
 * Garantiza que campos de otros tipos se limpien (null) para no contaminar la base de datos (P2).
 */
export function validateAndSanitizePaymentMethod(input: unknown): {
  success: true;
  data: CleanedPaymentMethodData;
} | {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
} {
  const baseResult = basePaymentMethodSchema.safeParse(input);
  if (!baseResult.success) {
    const firstIssue = baseResult.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message || 'Datos básicos inválidos',
    };
  }

  const base = baseResult.data;
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  // Validar límites si ambos están presentes
  if (base.minAmount != null && base.maxAmount != null && base.minAmount > base.maxAmount) {
    return {
      success: false,
      error: 'El monto mínimo no puede ser mayor que el monto máximo',
    };
  }

  const cleaned: CleanedPaymentMethodData = {
    name: base.name,
    type: base.type,
    instructions: base.instructions?.trim() || null,
    displayNote: base.displayNote?.trim() || null,
    logo: base.logo?.trim() || null,
    qrCodeImage: base.qrCodeImage?.trim() || null,
    sortOrder: base.sortOrder,
    minAmount: base.minAmount ?? null,
    maxAmount: base.maxAmount ?? null,
    isActive: base.isActive,
    bankName: null,
    accountNumber: null,
    accountType: null,
    holderName: null,
    holderId: null,
    phone: null,
    email: null,
    payId: null,
    walletAddress: null,
    network: null,
  };

  switch (base.type) {
    case 'MOBILE_PAYMENT': {
      const bankName = typeof raw.bankName === 'string' ? raw.bankName.trim() : '';
      const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
      const holderId = typeof raw.holderId === 'string' ? raw.holderId.trim() : '';

      if (!bankName) return { success: false, error: 'Indica el banco receptor del Pago Móvil' };
      if (!phone) return { success: false, error: 'Indica el número de teléfono del Pago Móvil' };
      if (!holderId) return { success: false, error: 'Indica la cédula o RIF del titular del Pago Móvil' };

      cleaned.bankName = bankName;
      cleaned.phone = phone;
      cleaned.holderId = holderId;
      cleaned.holderName = typeof raw.holderName === 'string' && raw.holderName.trim() ? raw.holderName.trim() : null;
      break;
    }

    case 'BANK_TRANSFER': {
      const bankName = typeof raw.bankName === 'string' ? raw.bankName.trim() : '';
      const accountNumber = typeof raw.accountNumber === 'string' ? raw.accountNumber.trim().replace(/\s+/g, '') : '';
      const holderName = typeof raw.holderName === 'string' ? raw.holderName.trim() : '';
      const holderId = typeof raw.holderId === 'string' ? raw.holderId.trim() : '';

      if (!bankName) return { success: false, error: 'Indica el nombre del banco' };
      if (!accountNumber || !/^\d{20}$/.test(accountNumber)) {
        return { success: false, error: 'El número de cuenta bancaria debe contener exactamente 20 dígitos numéricos' };
      }
      if (!holderName) return { success: false, error: 'Indica el titular de la cuenta' };
      if (!holderId) return { success: false, error: 'Indica la cédula o RIF del titular' };

      cleaned.bankName = bankName;
      cleaned.accountNumber = accountNumber;
      cleaned.holderName = holderName;
      cleaned.holderId = holderId;
      cleaned.accountType = typeof raw.accountType === 'string' && raw.accountType.trim() ? raw.accountType.trim() : 'CORRIENTE';
      break;
    }

    case 'BINANCE_PAY': {
      const email = typeof raw.email === 'string' ? raw.email.trim() : '';
      const payId = typeof raw.payId === 'string' ? raw.payId.trim() : '';

      if (!email && !payId) {
        return { success: false, error: 'Para Binance Pay debes indicar al menos el correo electrónico o el Pay ID' };
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: 'Correo de Binance Pay con formato inválido' };
      }

      cleaned.email = email || null;
      cleaned.payId = payId || null;
      cleaned.holderName = typeof raw.holderName === 'string' && raw.holderName.trim() ? raw.holderName.trim() : null;
      break;
    }

    case 'ZELLE':
    case 'PAYPAL':
    case 'ZINLI': {
      const email = typeof raw.email === 'string' ? raw.email.trim() : '';
      const holderName = typeof raw.holderName === 'string' ? raw.holderName.trim() : '';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: `Indica un correo electrónico válido para ${base.type}` };
      }
      if (!holderName) {
        return { success: false, error: `Indica el nombre del titular para ${base.type}` };
      }

      cleaned.email = email;
      cleaned.holderName = holderName;
      break;
    }

    case 'MERCANTIL_PANAMA': {
      const bankName = typeof raw.bankName === 'string' && raw.bankName.trim() ? raw.bankName.trim() : 'Mercantil Banco Panamá';
      const accountNumber = typeof raw.accountNumber === 'string' ? raw.accountNumber.trim() : '';
      const holderName = typeof raw.holderName === 'string' ? raw.holderName.trim() : '';
      const email = typeof raw.email === 'string' ? raw.email.trim() : '';

      if (!accountNumber && !email) {
        return { success: false, error: 'Indica el número de cuenta o correo de Mercantil Panamá' };
      }

      cleaned.bankName = bankName;
      cleaned.accountNumber = accountNumber || null;
      cleaned.holderName = holderName || null;
      cleaned.email = email || null;
      cleaned.holderId = typeof raw.holderId === 'string' && raw.holderId.trim() ? raw.holderId.trim() : null;
      break;
    }

    case 'CRYPTO': {
      const walletAddress = typeof raw.walletAddress === 'string' ? raw.walletAddress.trim() : '';
      const network = typeof raw.network === 'string' ? raw.network.trim() : '';

      if (!walletAddress) return { success: false, error: 'Indica la dirección de la billetera (wallet)' };
      if (!network) return { success: false, error: 'Indica la red de la criptomoneda (ej. USDT TRC20, BEP20)' };

      cleaned.walletAddress = walletAddress;
      cleaned.network = network;
      break;
    }

    case 'CASH':
    case 'OTHER': {
      cleaned.holderName = typeof raw.holderName === 'string' && raw.holderName.trim() ? raw.holderName.trim() : null;
      break;
    }
  }

  return { success: true, data: cleaned };
}
