export interface CurrencySettings {
  primaryCurrency: 'USD' | 'VES' | 'EUR';
  exchangeRateVES: number;
  exchangeRateEUR: number;
}

export function convertPrice(
  priceUSD: number,
  targetCurrency: 'USD' | 'VES' | 'EUR',
  exchangeRates: { VES: number; EUR: number }
): number {
  if (targetCurrency === 'USD') {
    return priceUSD;
  } else if (targetCurrency === 'VES') {
    return priceUSD * exchangeRates.VES;
  } else if (targetCurrency === 'EUR') {
    return priceUSD * exchangeRates.EUR;
  }
  return priceUSD;
}

export function formatPrice(
  priceUSD: number,
  currency: 'USD' | 'VES' | 'EUR' = 'USD',
  exchangeRates?: { VES: number; EUR: number }
): string {
  let finalPrice = priceUSD;
  
  if (exchangeRates && currency !== 'USD') {
    finalPrice = convertPrice(priceUSD, currency, exchangeRates);
  }

  const currencySymbols: Record<string, string> = {
    USD: '$',
    VES: 'Bs.',
    EUR: '€',
  };

  const symbol = currencySymbols[currency] || '$';
  
  // Format number with 2 decimal places
  const formatted = finalPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return `${symbol} ${formatted}`;
}


// ============================================
// Formato único de precios de la tienda (PLAN.md §1.4, decisión D4)
// formatUSD(1099) → "$1.099,00" · formatVES(40113.5) → "Bs. 40.113,50"
// Formato manual (no Intl) para que servidor y navegador den exactamente el mismo texto.
// ============================================

function formatAmount(value: number): string {
  // Los Decimal de Prisma llegan del API como texto ("320"): Number.isFinite no convierte,
  // así que antes se mostraban como $0,00.
  const numero = typeof value === 'number' ? value : Number(value);
  const safe = Number.isFinite(numero) ? numero : 0;
  const [integer, decimals] = Math.abs(safe).toFixed(2).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = safe < 0 && Number(`${integer}.${decimals}`) !== 0 ? '-' : '';
  return `${sign}${grouped},${decimals}`;
}

export function formatUSD(amount: number): string {
  const text = formatAmount(amount);
  return text.startsWith('-') ? `-$${text.slice(1)}` : `$${text}`;
}

export function formatVES(amount: number): string {
  return `Bs. ${formatAmount(amount)}`;
}
