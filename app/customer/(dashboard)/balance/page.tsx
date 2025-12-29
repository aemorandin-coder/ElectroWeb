'use client';

import { useState, useEffect } from 'react';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiDownload } from 'react-icons/fi';
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

export default function BalancePage() {
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    fetchBalance();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2 lg:space-y-3 overflow-y-auto h-full">
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

      {/* Balance Cards - Responsive */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3 animate-slideInUp">
        <div className="bg-white rounded-lg p-2.5 lg:p-3 border border-[#e9ecef] shadow-sm">
          <div className="flex items-center gap-1.5 lg:gap-2 mb-0.5 lg:mb-1">
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-green-600" />
            </div>
            <h3 className="text-[10px] lg:text-xs font-medium text-[#6a6c6b]">Saldo</h3>
          </div>
          <p className="text-sm lg:text-lg font-bold text-[#212529]">
            ${userBalance?.balance.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg p-2.5 lg:p-3 border border-[#e9ecef] shadow-sm">
          <div className="flex items-center gap-1.5 lg:gap-2 mb-0.5 lg:mb-1">
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-blue-600" />
            </div>
            <h3 className="text-[10px] lg:text-xs font-medium text-[#6a6c6b]">Recargado</h3>
          </div>
          <p className="text-sm lg:text-lg font-bold text-[#212529]">
            ${userBalance?.totalRecharges.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg p-2.5 lg:p-3 border border-[#e9ecef] shadow-sm">
          <div className="flex items-center gap-1.5 lg:gap-2 mb-0.5 lg:mb-1">
            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiTrendingDown className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-purple-600" />
            </div>
            <h3 className="text-[10px] lg:text-xs font-medium text-[#6a6c6b]">Gastado</h3>
          </div>
          <p className="text-sm lg:text-lg font-bold text-[#212529]">
            ${userBalance?.totalSpent.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Transactions - Responsive */}
      <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden animate-slideInUp">
        <div className="px-3 lg:px-4 py-2 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs lg:text-sm font-bold text-[#212529] flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
              <FiTrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#2a63cd]" />
              <span className="hidden sm:inline">Transacciones</span>
              <span className="sm:hidden">Trans.</span>
            </h2>
            <div className="flex items-center gap-1 lg:gap-2">
              <div className="flex items-center gap-0.5 lg:gap-1 bg-white border border-[#e9ecef] rounded-lg p-0.5">
                {['ALL', 'RECHARGE', 'PURCHASE'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-medium transition-all ${filterType === type
                      ? 'bg-[#2a63cd] text-white'
                      : 'text-[#6a6c6b] hover:bg-[#f8f9fa]'
                      }`}
                  >
                    {type === 'ALL' && 'Todo'}
                    {type === 'RECHARGE' && <><span className="hidden sm:inline">Recargas</span><span className="sm:hidden">+</span></>}
                    {type === 'PURCHASE' && <><span className="hidden sm:inline">Compras</span><span className="sm:hidden">-</span></>}
                  </button>
                ))}
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

      <RechargeModal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        onSuccess={fetchBalance}
      />
    </div>
  );
}

