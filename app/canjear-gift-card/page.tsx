'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiAlertCircle, FiArrowRight, FiCheck, FiCreditCard, FiGift, FiLock, FiSearch } from 'react-icons/fi';
import PublicHeader from '@/components/public/PublicHeader';
import Footer from '@/components/Footer';
import Container from '@/components/ui/Container';
import PageHeader from '@/components/ui/PageHeader';
import GiftCard3D, { type GiftCardFace } from '@/components/gift-card/GiftCard3D';
import { formatUSD } from '@/lib/currency';
import { GIFT_CARD_PIN_LENGTH } from '@/lib/gift-card-pin';

interface CardInfo {
  codeLast4: string;
  status: string;
  isValid: boolean;
  requiresPin: boolean;
  balanceUSD?: number;
  message?: string;
  design?: { slug?: string | null; name?: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Sin activar',
  DEPLETED: 'Ya canjeada',
  EXPIRED: 'Vencida',
  SUSPENDED: 'Suspendida',
  CANCELLED: 'Cancelada',
  PARTIALLY_USED: 'Activa',
};

/** "esmc7k2p..." → "ESMC-7K2P-..." mientras se escribe (16 caracteres). */
function formatCodeInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1-');
}

/**
 * Canje de gift card (C-71): se verifica el código, se pide el PIN solo si la tarjeta lo tiene (impresas),
 * y al acreditar la tarjeta gira al frente y el saldo cuenta hasta el monto.
 */
export default function RedeemGiftCardPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState<{ amount: number; newBalance: number } | null>(null);
  const [face, setFace] = useState<GiftCardFace>('back');

  const codeComplete = code.length === 19;
  const canRedeem = Boolean(cardInfo?.isValid) && !redeemed;

  const resetCard = (value: string) => {
    setCode(formatCodeInput(value));
    setCardInfo(null);
    setPin('');
    setError('');
    setFace('back');
  };

  const handleCheck = async () => {
    if (!codeComplete) {
      setError('Escribe los 16 caracteres del código');
      return;
    }
    setIsChecking(true);
    setError('');
    try {
      const response = await fetch(`/api/gift-cards/redeem?code=${encodeURIComponent(code)}`);
      const data = await response.json();
      if (!response.ok) {
        setCardInfo(null);
        setError(data.error || 'No encontramos esa gift card');
      } else {
        setCardInfo(data);
        if (!data.isValid) setError(data.message || 'Esta gift card no está disponible para canje');
      }
    } catch {
      setError('No se pudo verificar la gift card. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleRedeem = async () => {
    if (!cardInfo) return;
    if (cardInfo.requiresPin && pin.length !== GIFT_CARD_PIN_LENGTH) {
      setError(`Escribe los ${GIFT_CARD_PIN_LENGTH} dígitos del PIN que está bajo el raspadito`);
      return;
    }
    setIsRedeeming(true);
    setError('');
    try {
      const response = await fetch('/api/gift-cards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin: cardInfo.requiresPin ? pin : undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'No se pudo canjear la gift card');
        return;
      }
      setRedeemed({ amount: Number(data.amountRedeemed) || 0, newBalance: Number(data.newBalance) || 0 });
      setFace('front');
      toast.success(`Listo: ${formatUSD(Number(data.amountRedeemed) || 0)} en tu saldo`);
    } catch {
      setError('No se pudo canjear la gift card. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Antes de canjear el monto solo se ve con sesión; al canjear, cuenta desde 0 hasta lo acreditado
  const cardAmount = redeemed ? redeemed.amount : 0;
  const amountLabel = redeemed ? null : cardInfo?.balanceUSD !== undefined ? formatUSD(cardInfo.balanceUSD) : '$ ••••';

  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader />

      <main>
        <PageHeader
          breadcrumbs={[{ label: 'Gift Cards', href: '/gift-cards' }, { label: 'Canjear' }]}
          icon={<FiGift />}
          eyebrow="Gift Cards"
          title="Canjear gift card"
          description="Escribe el código de tu tarjeta. El saldo pasa a tu cuenta y lo usas en cualquier compra de la tienda."
        />
        <Container className="py-6 lg:py-10">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-12">
            <section aria-label="Tu gift card" className="flex min-w-0 flex-col items-center gap-4 lg:sticky lg:top-24">
              <GiftCard3D
                className="w-full max-w-[440px]"
                design={cardInfo?.design?.slug}
                amountUSD={cardAmount}
                amountLabel={amountLabel}
                kind={cardInfo?.requiresPin ? 'print' : 'digital'}
                code={codeComplete ? code : null}
                status={cardInfo?.requiresPin ? (cardInfo.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') : null}
                face={face}
                onFaceChange={setFace}
              />
              <p className="text-center text-sm text-muted">
                {redeemed ? 'Saldo acreditado. Puedes girarla para ver el código.' : 'Así se ve tu tarjeta. Arrástrala de lado para girarla.'}
              </p>
            </section>

            <section className="min-w-0 rounded-2xl border border-line bg-white p-5 lg:p-6">
              {redeemed ? (
                <div className="flex flex-col gap-5" role="status">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success-strong/10 text-success-strong">
                      <FiCheck className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-ink">Gift card canjeada</h2>
                      <p className="text-sm text-muted">El saldo ya está en tu cuenta.</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-surface p-4">
                      <dt className="text-xs font-medium text-muted">Acreditado</dt>
                      <dd className="mt-1 text-2xl font-bold text-success-strong">{formatUSD(redeemed.amount)}</dd>
                    </div>
                    <div className="rounded-xl bg-surface p-4">
                      <dt className="text-xs font-medium text-muted">Tu saldo ahora</dt>
                      <dd className="mt-1 text-2xl font-bold text-ink">{formatUSD(redeemed.newBalance)}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link href="/productos" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
                      Ir a comprar <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link href="/customer/balance" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-surface">
                      <FiCreditCard className="h-4 w-4" aria-hidden="true" /> Ver mi saldo
                    </Link>
                  </div>
                </div>
              ) : (
                <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); if (cardInfo?.isValid) handleRedeem(); else handleCheck(); }}>
                  <div>
                    <label htmlFor="gift-code" className="mb-1.5 block text-sm font-semibold text-ink">Código de la gift card</label>
                    <div className="flex gap-2">
                      <input
                        id="gift-code"
                        value={code}
                        onChange={(event) => resetCard(event.target.value)}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        inputMode="text"
                        placeholder="ESMC-XXXX-XXXX-XXXX"
                        className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-center font-mono text-base font-bold tracking-widest text-ink placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      {!cardInfo?.isValid && (
                        <button
                          type="submit"
                          disabled={!codeComplete || isChecking}
                          className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiSearch className="h-4 w-4" aria-hidden="true" />
                          {isChecking ? 'Verificando…' : 'Verificar'}
                        </button>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted">Está en el correo que recibiste o en el reverso de la tarjeta impresa.</p>
                  </div>

                  {cardInfo && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-4">
                      <div>
                        <p className="text-xs font-medium text-muted">Tarjeta terminada en {cardInfo.codeLast4}</p>
                        <p className="mt-0.5 text-lg font-bold text-ink">
                          {cardInfo.balanceUSD !== undefined ? formatUSD(cardInfo.balanceUSD) : session ? '—' : 'Inicia sesión para ver el saldo'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cardInfo.isValid ? 'bg-success-strong/10 text-success-strong' : 'bg-warning/15 text-warning-strong'}`}>
                        {STATUS_LABELS[cardInfo.status] || cardInfo.status}
                      </span>
                    </div>
                  )}

                  {cardInfo?.isValid && cardInfo.requiresPin && (
                    <div>
                      <label htmlFor="gift-pin" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                        <FiLock className="h-4 w-4" aria-hidden="true" /> PIN
                      </label>
                      <input
                        id="gift-pin"
                        value={pin}
                        onChange={(event) => { setPin(event.target.value.replace(/\D/g, '').slice(0, GIFT_CARD_PIN_LENGTH)); setError(''); }}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={GIFT_CARD_PIN_LENGTH}
                        placeholder="••••••"
                        className="h-12 w-full rounded-lg border border-line bg-white px-3 text-center font-mono text-xl font-bold tracking-[0.4em] text-ink placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      <p className="mt-1.5 text-xs text-muted">Tarjeta impresa: raspa la franja plateada del reverso para ver los {GIFT_CARD_PIN_LENGTH} dígitos.</p>
                    </div>
                  )}

                  {error && (
                    <p className="flex items-start gap-2 rounded-xl border border-deal/30 bg-deal-bg p-3 text-sm font-medium text-deal" role="alert">
                      <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
                    </p>
                  )}

                  {canRedeem && (
                    session ? (
                      <button
                        type="submit"
                        disabled={isRedeeming}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-success-strong px-5 text-base font-semibold text-white hover:bg-success-strong/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiGift className="h-5 w-5" aria-hidden="true" />
                        {isRedeeming ? 'Canjeando…' : `Canjear ${cardInfo?.balanceUSD !== undefined ? formatUSD(cardInfo.balanceUSD) : ''}`}
                      </button>
                    ) : sessionStatus !== 'loading' && (
                      <Link
                        href="/login?redirect=/canjear-gift-card"
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-base font-semibold text-white hover:bg-brand-600"
                      >
                        Inicia sesión para canjear
                      </Link>
                    )
                  )}

                  <p className="border-t border-line pt-4 text-sm text-muted">
                    ¿Problemas con tu tarjeta? <Link href="/contacto" className="font-semibold text-brand-600 hover:text-brand-700">Escríbenos</Link>
                    {' · '}
                    <Link href="/gift-cards" className="font-semibold text-brand-600 hover:text-brand-700">Comprar una gift card</Link>
                  </p>
                </form>
              )}
            </section>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
