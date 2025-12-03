import { SettingsFormData, SettingsValidationErrors } from '@/types/settings';

export function validateSettings(data: Partial<SettingsFormData>): { valid: boolean; errors: SettingsValidationErrors } {
  const errors: SettingsValidationErrors = {};

  // Company Name
  if (data.companyName !== undefined) {
    if (!data.companyName || typeof data.companyName !== 'string' || !data.companyName.trim()) {
      errors.company = 'El nombre de la empresa es requerido';
    } else if (data.companyName.trim().length < 2) {
      errors.company = 'El nombre de la empresa debe tener al menos 2 caracteres';
    } else if (data.companyName.trim().length > 100) {
      errors.company = 'El nombre de la empresa no puede exceder 100 caracteres';
    }
  }

  // Email
  if (data.email !== undefined && data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.contact = 'El formato del email no es válido';
    }
  }

  // Exchange Rates
  if (data.exchangeRateVES !== undefined) {
    const vesRate = typeof data.exchangeRateVES === 'number' ? data.exchangeRateVES : parseFloat(String(data.exchangeRateVES));
    if (isNaN(vesRate) || vesRate <= 0) {
      errors.exchangeRates = 'La tasa de cambio VES debe ser un número mayor a 0';
    }
  }

  if (data.exchangeRateEUR !== undefined) {
    const eurRate = typeof data.exchangeRateEUR === 'number' ? data.exchangeRateEUR : parseFloat(String(data.exchangeRateEUR));
    if (isNaN(eurRate) || eurRate <= 0) {
      errors.exchangeRates = 'La tasa de cambio EUR debe ser un número mayor a 0';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeSocialMedia(socialMedia: any): any[] | undefined {
  if (!socialMedia || !Array.isArray(socialMedia)) {
    return undefined;
  }

  const cleaned = socialMedia
    .filter((item: any) => 
      item && 
      typeof item === 'object' && 
      item.enabled &&
      item.url && 
      String(item.url).trim() !== ''
    )
    .map((item: any) => ({
      name: String(item.name || ''),
      url: String(item.url || ''),
      enabled: true,
      icon: String(item.icon || ''),
    }));

  return cleaned.length > 0 ? cleaned : undefined;
}

export function normalizeExchangeRate(value: any): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  
  if (isNaN(numValue) || numValue <= 0) {
    return null;
  }

  return numValue;
}













