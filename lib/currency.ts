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

