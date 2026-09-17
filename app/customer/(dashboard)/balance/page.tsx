'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiDownload, FiArrowUpRight, FiArrowDownLeft } from 'react-icons/fi';
import RechargeModal from '@/components/modals/RechargeModalV2';
import { formatPaymentMethod, formatTransactionStatus, isCreditTransaction } from '@/lib/format-helpers';
import { formatUSD } from '@/lib/currency';
import { toast } from 'react-hot-toast';

interface RawTransaction {
  id: string;
  type: string;
  amount: number | string;
  description: string;
  createdAt: string;
  status: string;
  paymentMethod?: string;
  [key: string]: unknown;
}

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
    <div className="relative overflow-hidden rounded-2xl bg-brand-950 p-6">
      <div className="animate-pulse">
        <div className="h-3 w-20 bg-white/20 rounded-full mb-3" />
        <div className="h-10 w-40 bg-white/30 rounded-lg mb-4" />
        <div className="h-12 w-full bg-white/20 rounded-xl" />
      </div>
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl bg-white border border-line p-4 animate-pulse">
          <div className="h-3 w-16 bg-line rounded-full mb-2" />
          <div className="h-6 w-24 bg-surface rounded-lg" />
        </div>
      ))}
    </div>

    {/* Transactions Skeleton */}
    <div className="rounded-xl bg-white border border-line p-4">
      <div className="h-4 w-24 bg-line rounded-full mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-line last:border-0 animate-pulse">
          <div className="w-10 h-10 bg-surface rounded-xl" />
          <div className="flex-1">
            <div className="h-3 w-28 bg-line rounded-full mb-2" />
            <div className="h-2 w-20 bg-surface rounded-full" />
          </div>
          <div className="h-4 w-16 bg-line rounded-full" />
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
          recentTransactions: (data.recentTransactions || []).map((t: RawTransaction) => ({
            ...t,
            amount: Number(t.amount)
          }))
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('No se pudo cargar el saldo');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    return isCreditTransaction(type) ? <FiTrendingUp className="w-4 h-4 lg:w-5 lg:h-5" /> : <FiTrendingDown className="w-4 h-4 lg:w-5 lg:h-5" />;
  };

  const getTransactionColor = (type: string) => {
    return isCreditTransaction(type) ? 'text-success-strong bg-success-strong/10' : 'text-deal bg-deal-bg';
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
          <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-brand-500"></div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ============================================
          MOBILE VIEW - PREMIUM ANIMATED DESIGN
          Epic animations for Full HD+ / QHD+ devices
          ============================================ */}
      <div className="lg:hidden overflow-y-auto h-full space-y-4">
        {/* ========================================
            ANIMATED HERO BALANCE - Premium Effects
            ======================================== */}
        <div className="relative rounded-2xl bg-brand-600 p-4 text-white overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <FiDollarSign className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white/80 text-xs font-medium tracking-wide uppercase">Saldo Disponible</span>
          </div>

          <div className="mb-3">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              {formatUSD(userBalance?.balance || 0)}
            </h1>
          </div>

          {/* Stats Cards Row */}
          <div className="flex gap-2 mb-3">
            {/* Recargado */}
            <div className="flex-1 bg-white/15 rounded-lg p-2 text-center border border-white/20">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <FiArrowDownLeft className="w-3 h-3 text-white" />
                <span className="text-white/80 text-xs uppercase font-bold">Recargado</span>
              </div>
              <p className="text-white font-bold text-sm">{formatUSD(userBalance?.totalRecharges || 0)}</p>
            </div>

            {/* Gastado */}
            <div className="flex-1 bg-white/15 rounded-lg p-2 text-center border border-white/20">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <FiArrowUpRight className="w-3 h-3 text-white" />
                <span className="text-white/80 text-xs uppercase font-bold">Gastado</span>
              </div>
              <p className="text-white font-bold text-sm">{formatUSD(userBalance?.totalSpent || 0)}</p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setShowRechargeModal(true)}
            className="w-full py-3 rounded-xl font-bold text-sm bg-white text-brand-700 shadow-sm flex items-center justify-center gap-2 hover:bg-surface active:scale-[0.98] transition-all"
          >
            <FiPlus className="w-4 h-4" />
            Recargar Saldo
          </button>
        </div>

        {/* TRANSACTIONS */}
        <div className="pt-3 pb-20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-ink">Movimientos</span>
            <div className="flex gap-1.5">
              {[
                { value: 'ALL', label: 'Todos' },
                { value: 'RECHARGE', label: 'Recargas' },
                { value: 'PURCHASE', label: 'Compras' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === filter.value
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-surface text-muted hover:bg-line border border-line'
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
                  className="bg-white rounded-lg p-2 border border-line shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    {/* Icon */}
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isCreditTransaction(transaction.type)
                      ? 'bg-success-strong/10 text-success-strong'
                      : 'bg-deal-bg text-deal'
                      }`}>
                      {isCreditTransaction(transaction.type)
                        ? <FiArrowDownLeft className="w-3 h-3" />
                        : <FiArrowUpRight className="w-3 h-3" />
                      }
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(transaction.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>

                    {/* Amount */}
                    <span className={`text-xs font-bold flex-shrink-0 ${isCreditTransaction(transaction.type) ? 'text-success-strong' : 'text-ink'}`}>
                      {isCreditTransaction(transaction.type) ? '+' : '-'}{formatUSD(transaction.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-2 bg-brand-50 rounded-full flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-brand-500" />
              </div>
              <p className="text-xs font-bold text-ink mb-1">Sin movimientos</p>
              <p className="text-xs text-muted mb-3">
                {filterType === 'ALL' ? 'Aún no tienes transacciones' : 'Sin resultados'}
              </p>
              <button
                onClick={() => setShowRechargeModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-xs font-bold rounded-lg hover:bg-brand-600 transition-colors shadow-sm"
              >
                <FiPlus className="w-3.5 h-3.5" />
                Recargar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================
          DESKTOP VIEW - COMPLETELY UNCHANGED
          Only shows on screens >= 1024px
          ============================================ */}
      <div className="hidden lg:block space-y-2 lg:space-y-3 overflow-y-auto h-full">
        {/* Header */}
        <div className="bg-brand-600 rounded-xl p-3 lg:p-4 text-white shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 lg:gap-0">
            <div>
              <div className="flex items-center gap-2 mb-0.5 lg:mb-1">
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <FiDollarSign className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
                </div>
                <h1 className="text-lg lg:text-xl font-bold">Saldo y Pagos</h1>
              </div>
              <p className="text-white/80 text-xs lg:text-sm hidden sm:block">Gestiona tu saldo y realiza recargas</p>
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-3 lg:px-4 py-2 bg-white text-brand-600 font-bold rounded-lg hover:bg-surface transition-all flex items-center justify-center gap-1.5 lg:gap-2 text-sm lg:text-base w-full sm:w-auto"
            >
              <FiPlus className="w-4 h-4" />
              <span className="sm:hidden">Recargar</span>
              <span className="hidden sm:inline">Recargar Saldo</span>
            </button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          <div className="bg-white rounded-xl p-2.5 lg:p-3 border border-line shadow-sm flex flex-col items-center justify-center overflow-hidden h-20 lg:h-auto">
            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Saldo</p>
            <div className="flex items-center justify-center w-full overflow-hidden">
              <span className="text-xl lg:text-2xl font-bold text-ink whitespace-nowrap">
                {formatUSD(userBalance?.balance || 0)}
              </span>
            </div>
            <div className="mt-1 w-6 h-1 bg-success-strong rounded-full opacity-20" />
          </div>

          <div className="bg-white rounded-xl p-2.5 lg:p-3 border border-line shadow-sm flex flex-col items-center justify-center overflow-hidden h-20 lg:h-auto">
            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Total</p>
            <div className="flex items-center justify-center w-full overflow-hidden">
              <span className="text-xl lg:text-2xl font-bold text-ink whitespace-nowrap">
                {formatUSD(userBalance?.totalRecharges || 0)}
              </span>
            </div>
            <div className="mt-1 w-6 h-1 bg-brand-500 rounded-full opacity-20" />
          </div>

          <div className="bg-white rounded-xl p-2.5 lg:p-3 border border-line shadow-sm flex flex-col items-center justify-center overflow-hidden h-20 lg:h-auto">
            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Gastado</p>
            <div className="flex items-center justify-center w-full overflow-hidden">
              <span className="text-xl lg:text-2xl font-bold text-ink whitespace-nowrap">
                {formatUSD(userBalance?.totalSpent || 0)}
              </span>
            </div>
            <div className="mt-1 w-6 h-1 bg-deal rounded-full opacity-20" />
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-lg border border-line shadow-sm overflow-hidden">
          <div className="px-3 lg:px-4 py-2.5 border-b border-line bg-surface">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs lg:text-sm font-bold text-ink flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
                <FiTrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-brand-500" />
                <span className="hidden sm:inline">Transacciones</span>
                <span className="sm:hidden">Historial</span>
              </h2>
              <div className="flex items-center gap-1 lg:gap-2">
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-line">
                  <button
                    onClick={() => setFilterType('ALL')}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'ALL' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:bg-surface'}`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFilterType('RECHARGE')}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'RECHARGE' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:bg-surface'}`}
                  >
                    Recargas
                  </button>
                  <button
                    onClick={() => setFilterType('PURCHASE')}
                    className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'PURCHASE' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:bg-surface'}`}
                  >
                    Compras
                  </button>
                </div>
                <button className="p-1.5 lg:p-2 hover:bg-surface rounded-lg transition-colors hidden sm:block">
                  <FiDownload className="w-4 h-4 lg:w-5 lg:h-5 text-muted" />
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
                    className="flex items-center justify-between p-2.5 lg:p-4 rounded-lg border border-line hover:bg-surface transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-xs lg:text-base truncate">{transaction.description}</p>
                        <div className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm text-muted">
                          <span className="truncate">
                            {new Date(transaction.createdAt).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          {transaction.paymentMethod && (
                            <>
                              <span className="text-subtle hidden sm:inline">•</span>
                              <span className="text-xs bg-surface border border-line px-1.5 lg:px-2 py-0.5 rounded-full text-muted hidden sm:inline">
                                {formatPaymentMethod(transaction.paymentMethod)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm lg:text-lg font-bold ${isCreditTransaction(transaction.type) ? 'text-success-strong' : 'text-deal'}`}>
                        {isCreditTransaction(transaction.type) ? '+' : '-'}{formatUSD(transaction.amount)}
                      </p>
                      <span className={`inline-block px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-xs font-semibold ${transaction.status === 'COMPLETED' ? 'bg-success-strong/10 text-success-strong' :
                        transaction.status === 'PENDING' ? 'bg-warning/15 text-warning-strong' :
                          transaction.status === 'CANCELLED' ? 'bg-deal-bg text-deal' :
                            'bg-deal-bg text-deal'
                        }`}>
                        {formatTransactionStatus(transaction.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 lg:py-12">
                <FiDollarSign className="w-12 h-12 lg:w-16 lg:h-16 text-line mx-auto mb-3 lg:mb-4" />
                <h3 className="text-base lg:text-lg font-bold text-ink mb-1 lg:mb-2">
                  No hay transacciones
                </h3>
                <p className="text-muted text-xs lg:text-base mb-4 lg:mb-6 px-4">
                  {filterType === 'ALL'
                    ? 'Aún no has realizado ninguna transacción'
                    : `No tienes ${filterType === 'RECHARGE' ? 'recargas' : 'compras'}`
                  }
                </p>
                <button
                  onClick={() => setShowRechargeModal(true)}
                  className="inline-flex items-center gap-1.5 lg:gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 transition-all shadow-sm text-sm lg:text-base"
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
