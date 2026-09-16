'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicHeader from '@/components/public/PublicHeader';
import { formatUSD } from '@/lib/currency';
import { adminCard, adminPrimaryButton, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';

/**
 * /checkout/success — Issue #4 (Bloque 3 Audit)
 *
 * Página de confirmación de pedido premium.
 * Recibe query params:
 *   - orders: números de orden separados por coma (ej: "ORD-001,ORD-002")
 *   - total:  monto total del pedido en USD (ej: "125.50")
 */

/* ─── Confetti CSS-only ─── */
const CONFETTI_COLORS = [
  '#2a63cd', '#10b981', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4',
];
const PIECES = 60;

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[var(--z-modal)]" aria-hidden="true">
      {Array.from({ length: PIECES }).map((_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 3}s`;
        const duration = `${2.5 + Math.random() * 2}s`;
        const size = `${6 + Math.floor(Math.random() * 8)}px`;
        const rotate = `${Math.random() * 720}deg`;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '-20px',
              left,
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animation: `confettiFall ${duration} ${delay} ease-in forwards`,
              transform: `rotate(${rotate})`,
              opacity: 0.9,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── Check Icon Animated ─── */
function AnimatedCheck() {
  return (
    <div className="relative w-24 h-24 mx-auto mb-6">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full bg-success/15" />
      {/* Inner circle */}
      <div className="relative w-24 h-24 bg-success-strong rounded-full flex items-center justify-center shadow-lg">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
            style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'drawCheck 0.5s 0.3s ease-out forwards' }}
          />
        </svg>
      </div>
      <style>{`
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── Step Badge ─── */
function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">
        {n}
      </span>
      <span className="text-sm text-ink-soft leading-relaxed pt-0.5">{text}</span>
    </li>
  );
}

/* ─── Main Content ─── */
function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const ordersParam = searchParams.get('orders') ?? '';
  const totalParam = searchParams.get('total') ?? '0';

  const orderNumbers = ordersParam ? decodeURIComponent(ordersParam).split(',').filter(Boolean) : [];
  const total = parseFloat(totalParam) || 0;

  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Apagar confetti después de 4.5s
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4500);
    return () => clearTimeout(t);
  }, []);

  const copyOrder = (num: string) => {
    navigator.clipboard.writeText(num).catch(() => {});
    setCopied(num);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="min-h-dvh bg-surface flex flex-col">
        <PublicHeader />

        <main className="flex-1 max-w-2xl mx-auto px-4 py-8 sm:py-12 w-full">

          {/* ── Tarjeta Principal ── */}
          <div className={`${adminCard} p-6 sm:p-10 text-center relative overflow-hidden shadow-sm`}>

            {/* Check animado */}
            <AnimatedCheck />

            {/* Título */}
            <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-2">
              ¡Gracias por tu compra!
            </h1>
            <p className="text-muted text-base mb-6 max-w-md mx-auto">
              Tu pedido ha sido recibido y ya lo estamos procesando.
            </p>

            {/* ── Números de Orden ── */}
            <div className="space-y-3 mb-6">
              <div className="bg-surface rounded-xl border border-line p-4 mb-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  {orderNumbers.length > 1 ? 'Tus números de pedido' : 'Tu número de pedido'}
                </p>

                {orderNumbers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {orderNumbers.map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => copyOrder(num)}
                        title="Haz clic para copiar"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-line rounded-lg font-mono font-bold text-sm text-ink hover:border-brand-500 hover:text-brand-600 transition-colors group cursor-pointer"
                      >
                        <span>{num}</span>
                        <span className="text-xs text-muted group-hover:text-brand-600 font-sans font-normal">
                          {copied === num ? (
                            <span className="text-success-strong font-medium">¡Copiado!</span>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5 inline mr-0.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copiar
                            </>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm">—</p>
                )}

                {/* Total */}
                {total > 0 && (
                  <div className="mt-4 pt-4 border-t border-line flex justify-between items-center">
                    <span className="text-sm font-medium text-muted">Total pagado:</span>
                    <span className="text-2xl font-bold text-ink">{formatUSD(total)}</span>
                  </div>
                )}
              </div>

              {/* ── Info boxes ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-4 bg-brand-500/5 rounded-xl border border-brand-500/15">
                  <div className="flex-shrink-0 w-9 h-9 bg-brand-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">Email enviado</p>
                    <p className="text-xs text-muted mt-0.5">Revisa tu correo para los detalles del pedido</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-success/5 rounded-xl border border-success/15">
                  <div className="flex-shrink-0 w-9 h-9 bg-success/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-success-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">Te contactaremos</p>
                    <p className="text-xs text-muted mt-0.5">Nuestro equipo coordinará tu entrega</p>
                  </div>
                </div>
              </div>

              {/* ── Próximos pasos ── */}
              <div className="bg-surface rounded-xl border border-line p-5">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Próximos Pasos
                </h2>
                <ol className="space-y-3">
                  <Step n={1} text="Recibirás un email con el resumen de tu pedido" />
                  <Step n={2} text="Nuestro equipo verificará tu orden y disponibilidad" />
                  <Step n={3} text="Te contactaremos para coordinar la entrega o retiro" />
                  <Step n={4} text="¡Tu pedido llega a tu puerta o lo retiras en tienda!" />
                </ol>
              </div>

              {/* ── CTA Buttons ── */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/customer/orders"
                  className={`flex-1 ${adminPrimaryButton} py-3 text-sm font-bold justify-center`}
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Ver mis pedidos
                </Link>
                <Link
                  href="/productos"
                  className={`flex-1 ${adminSecondaryButton} py-3 text-sm font-semibold justify-center`}
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Seguir comprando
                </Link>
              </div>

            </div>
          </div>

          {/* ── Soporte ── */}
          <div className={`${adminCard} mt-6 p-5 flex flex-col sm:flex-row items-center justify-between gap-4`}>
            <div>
              <p className="text-sm font-bold text-ink">¿Tienes alguna pregunta?</p>
              <p className="text-xs text-muted mt-0.5">Nuestro equipo está disponible para ayudarte</p>
            </div>
            <Link
              href="/contacto"
              className={`${adminSecondaryButton} px-4 py-2 text-sm whitespace-nowrap`}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contactar soporte
            </Link>
          </div>

        </main>
      </div>
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-surface flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-3">
          <div className={adminSpinner} />
          <p className="text-muted text-sm font-medium">Cargando confirmación...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
