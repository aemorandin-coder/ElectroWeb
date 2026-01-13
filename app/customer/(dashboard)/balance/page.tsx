'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiDownload, FiArrowUpRight, FiArrowDownLeft } from 'react-icons/fi';
import RechargeModal from '@/components/modals/RechargeModalV2';
import { formatPaymentMethod, formatTransactionStatus } from '@/lib/format-helpers';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  status: string;
  paymentMethod?: string;
}

interface UserBalance {
  balance: number;
  totalRecharges: number;
  totalSpent: number;
  recentTransactions: Transaction[];
}

// ============================================
// MOBILE-ONLY SKELETON COMPONENTS
// Premium loading states for mobile
// ============================================
const MobileBalanceSkeleton = () => (
  <div className="lg:hidden space-y-4 p-4">
    {/* Hero Balance Skeleton */}
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6">
      <div className="animate-pulse">
        <div className="h-3 w-20 bg-white/20 rounded-full mb-3" />
        <div className="h-10 w-40 bg-white/30 rounded-lg mb-4" />
        <div className="h-12 w-full bg-white/20 rounded-xl" />
      </div>
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl bg-white border border-gray-100 p-4 animate-pulse">
          <div className="h-3 w-16 bg-gray-200 rounded-full mb-2" />
          <div className="h-6 w-24 bg-gray-300 rounded-lg" />
        </div>
      ))}
    </div>

    {/* Transactions Skeleton */}
    <div className="rounded-xl bg-white border border-gray-100 p-4">
      <div className="h-4 w-24 bg-gray-200 rounded-full mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-3 w-28 bg-gray-200 rounded-full mb-2" />
            <div className="h-2 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-16 bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export default function BalancePage() {
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [mounted, setMounted] = useState(false);
  const [balanceAnimated, setBalanceAnimated] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchBalance();
  }, []);

  // Trigger balance animation after data loads
  useEffect(() => {
    if (userBalance && !balanceAnimated) {
      const timer = setTimeout(() => setBalanceAnimated(true), 100);
      return () => clearTimeout(timer);
    }
  }, [userBalance, balanceAnimated]);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/customer/balance');
      if (response.ok) {
        const data = await response.json();
        // Convert Decimal fields to numbers
        setUserBalance({
          balance: Number(data.balance || 0),
          totalRecharges: Number(data.totalRecharges || 0),
          totalSpent: Number(data.totalSpent || 0),
          recentTransactions: (data.recentTransactions || []).map((t: any) => ({
            ...t,
            amount: Number(t.amount)
          }))
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    return type === 'RECHARGE' ? <FiTrendingUp className="w-4 h-4 lg:w-5 lg:h-5" /> : <FiTrendingDown className="w-4 h-4 lg:w-5 lg:h-5" />;
  };

  const getTransactionColor = (type: string) => {
    return type === 'RECHARGE' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const filteredTransactions = filterType === 'ALL'
    ? userBalance?.recentTransactions || []
    : (userBalance?.recentTransactions || []).filter(t => t.type === filterType);

  // ============================================
  // DESKTOP LOADING STATE (unchanged)
  // ============================================
  if (loading) {
    return (
      <>
        {/* Mobile skeleton */}
        <MobileBalanceSkeleton />

        {/* Desktop loading - unchanged */}
        <div className="hidden lg:flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-[#2a63cd]"></div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ============================================
          🚀 MOBILE VIEW - PREMIUM ANIMATED DESIGN
          Epic animations for Full HD+ / QHD+ devices
          ============================================ */}
      <div className="lg:hidden overflow-y-auto h-full -m-3 bg-gradient-to-b from-slate-50 to-white">
        {/* ========================================
            ANIMATED HERO BALANCE - Premium Effects
            ======================================== */}
        <div className="relative mx-2 mt-2 rounded-2xl overflow-hidden">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#0ea5e9]">
            {/* Floating Orbs with Animation */}
            <div className="absolute top-2 right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-4 left-2 w-16 h-16 bg-cyan-300/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 left-1/3 w-12 h-12 bg-blue-200/10 rounded-full blur-lg animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          </div>

          {/* Content */}
          <div className="relative z-10 p-4">
            {/* Balance Label with Icon */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <FiDollarSign className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white/80 text-[10px] font-medium tracking-wide uppercase">Saldo Disponible</span>
            </div>

            {/* Main Balance - Animated Glow */}
            <div className="relative mb-3">
              <h1
                className="text-4xl font-black text-white tracking-tight animate-fadeIn"
                style={{ textShadow: '0 4px 24px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.2)' }}
              >
                ${userBalance?.balance.toFixed(2) || '0.00'}
              </h1>
              {/* Glow Bar */}
              <div className="absolute -bottom-1 left-0 h-1 w-20 bg-gradient-to-r from-white/60 to-transparent rounded-full animate-pulse" />
            </div>

            {/* Stats Cards Row - Animated Entry */}
            <div className="flex gap-2 mb-3">
              {/* Recargado */}
              <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10 animate-slideInUp" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <FiArrowDownLeft className="w-3 h-3 text-emerald-300" />
                  <span className="text-white/70 text-[8px] uppercase font-bold">Recargado</span>
                </div>
                <p className="text-white font-black text-sm">${userBalance?.totalRecharges.toFixed(0) || '0'}</p>
              </div>

              {/* Gastado */}
              <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <FiArrowUpRight className="w-3 h-3 text-rose-300" />
                  <span className="text-white/70 text-[8px] uppercase font-bold">Gastado</span>
                </div>
                <p className="text-white font-black text-sm">${userBalance?.totalSpent.toFixed(0) || '0'}</p>
              </div>
            </div>

            {/* CTA Button - Shimmer Effect */}
            <button
              onClick={() => setShowRechargeModal(true)}
              className="group relative w-full py-3 rounded-xl font-bold text-sm overflow-hidden transition-all duration-300 active:scale-[0.98]"
              style={{ background: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            >
              {/* Shimmer Animation */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full group-active:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-blue-100/60 to-transparent" />
              <span className="relative flex items-center justify-center gap-2 text-[#1e3a8a]">
                <FiPlus className="w-4 h-4" />
                Recargar Saldo
              </span>
            </button>
          </div>
        </div>

        {/* ========================================
            TRANSACTIONS - With Full Labels
            ======================================== */}
        <div className="px-2 pt-3 pb-20">
          {/* Header with Full Filter Labels */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-700">Movimientos</span>
            <div className="flex gap-1">
              {[
                { value: 'ALL', label: 'Todos' },
                { value: 'RECHARGE', label: 'Recargas' },
                { value: 'PURCHASE', label: 'Compras' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={`px-2 py-1 text-[8px] font-bold rounded-md transition-all ${filterType === filter.value
                    ? 'bg-[#2a63cd] text-white shadow-md'
                    : 'bg-gray-100 text-gray-500'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          {filteredTransactions.length > 0 ? (
            <div className="space-y-1">
              {filteredTransactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded-lg p-2 border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    {/* Icon */}
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${transaction.type === 'RECHARGE'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                      }`}>
                      {transaction.type === 'RECHARGE'
                        ? <FiArrowDownLeft className="w-3 h-3 text-white" />
                        : <FiArrowUpRight className="w-3 h-3 text-white" />
                      }
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-[10px] whitespace-nowrap overflow-hidden text-ellipsis">
                        {transaction.description}
                      </p>
                      <p className="text-[8px] text-gray-400">
                        {new Date(transaction.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>

                    {/* Amount */}
                    <span className={`text-[11px] font-black flex-shrink-0 ${transaction.type === 'RECHARGE' ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                      {transaction.type === 'RECHARGE' ? '+' : '-'}${transaction.amount.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-2 bg-blue-50 rounded-full flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-blue-300" />
              </div>
              <p className="text-[11px] font-bold text-gray-700 mb-1">Sin movimientos</p>
              <p className="text-[9px] text-gray-400 mb-3">
                {filterType === 'ALL' ? 'Aún no tienes transacciones' : 'Sin resultados'}
              </p>
              <button
                onClick={() => setShowRechargeModal(true)}
                className="inline-flex items-center gap-1 px-3 py-2 bg-[#2a63cd] text-white text-[10px] font-bold rounded-lg"
              >
                <FiPlus className="w-3 h-3" />
                Recargar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================
          💻 DESKTOP VIEW - COMPLETELY UNCHANGED
          Only shows on screens >= 1024px
          ============================================ */}
      <div className="hidden lg:block space-y-2 lg:space-y-3 overflow-y-auto h-full">
        {/* Header - Responsive */}
        <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-lg lg:rounded-xl p-3 lg:p-4 text-white shadow-lg animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 lg:gap-0">
            <div>
              <div className="flex items-center gap-2 mb-0.5 lg:mb-1">
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FiDollarSign className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
                </div>
                <h1 className="text-lg lg:text-xl font-bold">Saldo y Pagos</h1>
              </div>
              <p className="text-blue-100 text-xs lg:text-base hidden sm:block">Gestiona tu saldo y realiza recargas</p>
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-3 lg:px-4 py-2 bg-white text-[#2a63cd] font-bold rounded-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-1.5 lg:gap-2 text-sm lg:text-base w-full sm:w-auto"
            >
              <FiPlus className="w-4 h-4" />
              <span className="sm:hidden">Recargar</span>
              <span className="hidden sm:inline">Recargar Saldo</span>
            </button>
          </div>
        </div>

        {/* Balance Cards - Premium HUD Style */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3 animate-slideInUp">
          <div className="bg-white rounded-xl p-2.5 lg:p-3 border border-gray-100 shadow-sm flex flex-col items-center justify-center overflow-hidden h-20 lg:h-auto">
            <p className="text-[7px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo</p>
            <div className="flex items-center justify-center w-full overflow-hidden">
              <span className="text-xl lg:text-2xl font-black text-[#212529] whitespace-nowrap animate-marquee-text">
                ${userBalance?.balance.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="mt-1 w-6 h-1 bg-green-500 rounded-full opacity-20" />
          </div>

          <div className="bg-white rounded-xl p-2.5 lg:p-3 border border-gray-100 shadow-sm flex flex-col items-center justify-center overflow-hidden h-20 lg:h-auto">
            <p className="text-[7px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
            <div className="flex items-center justify-center w-full overflow-hidden">
              <span className="text-xl lg:text-2xl font-black text-[#212529] whitespace-nowrap">
                ${userBalance?.totalRecharges.toFixed(0) || '0'}
              </span>
            </div>
            <div className="mt-1 w-6 h-1 bg-blue-500 rounded-full opacity-20" />
          </div>

          <div className="bg-white rounded-xl p-2.5 lg:p-3 border border-gray-100 shadow-sm flex flex-col items-center justify-center overflow-hidden h-20 lg:h-auto">
            <p className="text-[7px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gastado</p>
            <div className="flex items-center justify-center w-full overflow-hidden">
              <span className="text-xl lg:text-2xl font-black text-[#212529] whitespace-nowrap">
                ${userBalance?.totalSpent.toFixed(0) || '0'}
              </span>
            </div>
            <div className="mt-1 w-6 h-1 bg-red-500 rounded-full opacity-20" />
          </div>
        </div>

        {/* Transactions - Responsive & Optimized */}
        <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden animate-slideInUp">
          <div className="px-3 lg:px-4 py-2.5 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs lg:text-sm font-bold text-[#212529] flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
                <FiTrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#2a63cd]" />
                <span className="hidden sm:inline">Transacciones</span>
                <span className="sm:hidden">Historial</span>
              </h2>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-100">
                  <button
                    onClick={() => setFilterType('ALL')}
                    className={`px-2 py-1 text-[10px] lg:text-xs font-bold rounded-md transition-all ${filterType === 'ALL' ? 'bg-[#2a63cd] text-white shadow-sm' : 'text-[#6a6c6b] hover:bg-gray-50'}`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFilterType('RECHARGE')}
                    className={`px-2 py-1 text-[10px] lg:text-xs font-bold rounded-md transition-all ${filterType === 'RECHARGE' ? 'bg-[#2a63cd] text-white shadow-sm' : 'text-[#6a6c6b] hover:bg-gray-50'}`}
                  >
                    Recargas
                  </button>
                  <button
                    onClick={() => setFilterType('PURCHASE')}
                    className={`px-2 py-1 text-[10px] lg:text-xs font-bold rounded-md transition-all ${filterType === 'PURCHASE' ? 'bg-[#2a63cd] text-white shadow-sm' : 'text-[#6a6c6b] hover:bg-gray-50'}`}
                  >
                    Compras
                  </button>
                </div>
                <button className="p-1.5 lg:p-2 hover:bg-[#f8f9fa] rounded-lg transition-colors hidden sm:block">
                  <FiDownload className="w-4 h-4 lg:w-5 lg:h-5 text-[#6a6c6b]" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-2 lg:p-3">
            {filteredTransactions.length > 0 ? (
              <div className="space-y-1.5 lg:space-y-2">
                {filteredTransactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2.5 lg:p-4 rounded-lg border border-[#e9ecef] hover:bg-[#f8f9fa] transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#212529] text-xs lg:text-base truncate">{transaction.description}</p>
                        <div className="flex items-center gap-1 lg:gap-2 text-[10px] lg:text-sm text-[#6a6c6b]">
                          <span className="truncate">
                            {new Date(transaction.createdAt).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          {transaction.paymentMethod && (
                            <>
                              <span className="text-gray-300 hidden sm:inline">•</span>
                              <span className="text-[8px] lg:text-xs bg-gray-100 px-1.5 lg:px-2 py-0.5 rounded-full hidden sm:inline">
                                {formatPaymentMethod(transaction.paymentMethod)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm lg:text-lg font-bold ${transaction.type === 'RECHARGE' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'RECHARGE' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </p>
                      <span className={`inline-block px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-[8px] lg:text-xs font-semibold ${transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        transaction.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                          transaction.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {formatTransactionStatus(transaction.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 lg:py-12">
                <FiDollarSign className="w-12 h-12 lg:w-16 lg:h-16 text-[#e9ecef] mx-auto mb-3 lg:mb-4" />
                <h3 className="text-base lg:text-lg font-bold text-[#212529] mb-1 lg:mb-2">
                  No hay transacciones
                </h3>
                <p className="text-[#6a6c6b] text-xs lg:text-base mb-4 lg:mb-6 px-4">
                  {filterType === 'ALL'
                    ? 'Aún no has realizado ninguna transacción'
                    : `No tienes ${filterType === 'RECHARGE' ? 'recargas' : 'compras'}`
                  }
                </p>
                <button
                  onClick={() => setShowRechargeModal(true)}
                  className="inline-flex items-center gap-1.5 lg:gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md text-sm lg:text-base"
                >
                  <FiPlus className="w-4 h-4 lg:w-5 lg:h-5" />
                  Primera Recarga
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <RechargeModal
          isOpen={showRechargeModal}
          onClose={() => setShowRechargeModal(false)}
          onSuccess={fetchBalance}
        />,
        document.body
      )}
    </>
  );
}
