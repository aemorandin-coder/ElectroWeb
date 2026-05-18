'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicHeader from '@/components/public/PublicHeader';

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
  '#2a63cd', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
];
const PIECES = 60;

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]" aria-hidden="true">
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
      {/* Outer ring pulse */}
      <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
      {/* Inner circle */}
      <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
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
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] text-white flex items-center justify-center text-xs font-black shadow-md">
        {n}
      </span>
      <span className="text-sm text-slate-600 leading-relaxed pt-0.5">{text}</span>
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

  // Apagar confetti después de 4s
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4500);
    return () => clearTimeout(t);
  }, []);

  const copyOrder = (num: string) => {
    navigator.clipboard.writeText(num).catch(() => {});
    setCopied(num);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatUSD = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(n);

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
        <PublicHeader />

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">

          {/* ── Card principal ── */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">

            {/* Header verde */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-8 pt-10 pb-16 text-center relative overflow-hidden">
              {/* Background blobs */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

              <AnimatedCheck />
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2 drop-shadow-lg">
                ¡Pedido Confirmado!
              </h1>
              <p className="text-green-100 text-base">
                Tu compra ha sido procesada exitosamente
              </p>
            </div>

            <div className="px-8 -mt-8 pb-8 space-y-6">

              {/* ── Número(s) de orden ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {orderNumbers.length > 1 ? 'Números de Orden' : 'Número de Orden'}
                </p>

                {orderNumbers.length > 0 ? (
                  <div className="space-y-2">
                    {orderNumbers.map((num) => (
                      <button
                        key={num}
                        onClick={() => copyOrder(num)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#2a63cd]/5 to-[#1e4ba3]/5 rounded-xl border border-[#2a63cd]/20 hover:border-[#2a63cd]/40 group transition-all"
                      >
                        <span className="text-xl font-black text-[#2a63cd] tracking-wider">
                          #{num}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-[#2a63cd] transition-colors">
                          {copied === num ? (
                            <>
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-500 font-medium">¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <p className="text-slate-400 text-sm">—</p>
                )}

                {/* Total */}
                {total > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Total pagado:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold text-slate-400">USD</span>
                      <span className="text-2xl font-black text-slate-800">{formatUSD(total)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Info boxes ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex-shrink-0 w-9 h-9 bg-[#2a63cd]/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Email enviado</p>
                    <p className="text-xs text-slate-500 mt-0.5">Revisa tu correo para los detalles del pedido</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex-shrink-0 w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Te contactaremos</p>
                    <p className="text-xs text-slate-500 mt-0.5">Nuestro equipo coordinará tu entrega</p>
                  </div>
                </div>
              </div>

              {/* ── Próximos pasos ── */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/customer/orders"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Ver mis pedidos
                </Link>
                <Link
                  href="/productos"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-white text-slate-700 font-semibold rounded-2xl border-2 border-slate-200 hover:border-[#2a63cd]/40 hover:text-[#2a63cd] hover:bg-blue-50/50 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Seguir comprando
                </Link>
              </div>

            </div>
          </div>

          {/* ── Soporte ── */}
          <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-700">¿Tienes alguna pregunta?</p>
              <p className="text-xs text-slate-400 mt-0.5">Nuestro equipo está disponible para ayudarte</p>
            </div>
            <Link
              href="/contacto"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">Cargando confirmación...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
