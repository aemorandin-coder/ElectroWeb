import { formatUSD, formatVES } from '@/lib/currency';

interface PriceProps {
  priceUSD: number;
  compareAtPriceUSD?: number | null;
  /** Tasa BCV. Si no se pasa, no se muestra el precio en bolívares. */
  exchangeRateVES?: number | null;
  size?: 'card' | 'lg';
}

/** Precio en USD, precio anterior tachado con ahorro, y equivalente en Bs. */
export default function Price({ priceUSD, compareAtPriceUSD, exchangeRateVES, size = 'card' }: PriceProps) {
  const hasDeal = typeof compareAtPriceUSD === 'number' && compareAtPriceUSD > priceUSD;
  const savings = hasDeal ? compareAtPriceUSD - priceUSD : 0;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={size === 'lg' ? 'text-3xl font-bold text-ink lg:text-4xl' : 'text-xl font-bold text-ink'}>
        {formatUSD(priceUSD)}
      </span>
      {hasDeal && (
        <span className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <span className="text-muted line-through">{formatUSD(compareAtPriceUSD)}</span>
          <span className="font-semibold text-deal">Ahorra {formatUSD(savings)}</span>
        </span>
      )}
      {exchangeRateVES ? (
        <span className="text-xs font-medium text-muted">{formatVES(priceUSD * exchangeRateVES)}</span>
      ) : null}
    </div>
  );
}
