'use client';

import { useState, useEffect } from 'react';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiDownload, FiFilter, FiCopy, FiCheck, FiPhone } from 'react-icons/fi';
import { SiBinance } from 'react-icons/si';
import { BsBank2 } from 'react-icons/bs';
import RechargeModal from '@/components/modals/RechargeModal';

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
  const [copiedMethod, setCopiedMethod] = useState<string | null>(null);
  const [companyPaymentMethods, setCompanyPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    fetchBalance();
    fetchPaymentMethods();
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

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/customer/company-payment-methods');
      if (response.ok) {
        const data = await response.json();
        const formattedMethods = data.map((method: any) => ({
          id: method.id,
          name: method.name,
          type: method.type,
          icon: getMethodIcon(method.type),
          color: getMethodColor(method.type),
          details: getMethodDetails(method),
          disabled: !method.isActive
        }));
        setCompanyPaymentMethods(formattedMethods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'MOBILE_PAYMENT': return <FiPhone className="w-8 h-8 text-white" />;
      case 'BINANCE':
      case 'CRYPTO': return <SiBinance className="w-8 h-8 text-white" />;
      case 'BANK_TRANSFER': return <BsBank2 className="w-8 h-8 text-white" />;
      case 'ZELLE': return <FiDollarSign className="w-8 h-8 text-white" />;
      default: return <FiDollarSign className="w-8 h-8 text-white" />;
    }
  };

  const getMethodColor = (type: string) => {
    switch (type) {
      case 'MOBILE_PAYMENT': return 'from-yellow-500 to-yellow-600';
      case 'CRYPTO': return 'from-yellow-400 to-orange-500';
      case 'BANK_TRANSFER': return 'from-blue-500 to-blue-600';
      case 'ZELLE': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getMethodDetails = (method: any) => {
    const details = [];
    if (method.type === 'MOBILE_PAYMENT') {
      if (method.holderId) details.push({ label: 'Cédula', value: method.holderId, copyable: true });
      if (method.phone) details.push({ label: 'Teléfono', value: method.phone, copyable: true });
      if (method.bankName) details.push({ label: 'Banco', value: method.bankName, copyable: false });
    } else if (method.type === 'BANK_TRANSFER') {
      if (method.bankName) details.push({ label: 'Banco', value: method.bankName, copyable: false });
      if (method.accountNumber) details.push({ label: 'Cuenta', value: method.accountNumber, copyable: true });
      if (method.holderName) details.push({ label: 'Titular', value: method.holderName, copyable: false });
      if (method.holderId) details.push({ label: 'C.I./RIF', value: method.holderId, copyable: true });
    } else if (method.type === 'ZELLE' || method.type === 'PAYPAL') {
      if (method.email) details.push({ label: 'Email', value: method.email, copyable: true });
      if (method.holderName) details.push({ label: 'Titular', value: method.holderName, copyable: false });
    } else if (method.type === 'CRYPTO') {
      if (method.walletAddress) details.push({ label: 'Wallet', value: method.walletAddress, copyable: true });
      if (method.network) details.push({ label: 'Red', value: method.network, copyable: false });
    }

    if (method.instructions) {
      details.push({ label: 'Nota', value: method.instructions, copyable: false });
    }

    return details;
  };

  const copyToClipboard = async (text: string, methodId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMethod(methodId);
      setTimeout(() => setCopiedMethod(null), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const getTransactionIcon = (type: string) => {
    return type === 'RECHARGE' ? <FiTrendingUp className="w-5 h-5" /> : <FiTrendingDown className="w-5 h-5" />;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white shadow-lg animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FiDollarSign className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold">Saldo y Pagos</h1>
            </div>
            <p className="text-blue-100">Gestiona tu saldo y realiza recargas</p>
          </div>
          <button
            onClick={() => setShowRechargeModal(true)}
            className="px-4 py-2 bg-white text-[#2a63cd] font-bold rounded-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Recargar Saldo
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-3 gap-3 animate-slideInUp">
        <div className="bg-white rounded-lg p-3 border border-[#e9ecef] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-3 h-3 text-green-600" />
            </div>
            <h3 className="text-xs font-medium text-[#6a6c6b]">Saldo</h3>
          </div>
          <p className="text-lg font-bold text-[#212529]">
            ${userBalance?.balance.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-[#e9ecef] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-3 h-3 text-blue-600" />
            </div>
            <h3 className="text-xs font-medium text-[#6a6c6b]">Recargado</h3>
          </div>
          <p className="text-lg font-bold text-[#212529]">
            ${userBalance?.totalRecharges.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-[#e9ecef] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiTrendingDown className="w-3 h-3 text-purple-600" />
            </div>
            <h3 className="text-xs font-medium text-[#6a6c6b]">Gastado</h3>
          </div>
          <p className="text-lg font-bold text-[#212529]">
            ${userBalance?.totalSpent.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Company Payment Methods */}
      <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden animate-fadeIn">
        <div className="px-4 py-2 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
          <h2 className="text-sm font-bold text-[#212529] flex items-center gap-2">
            <FiDollarSign className="w-4 h-4 text-[#2a63cd]" />
            Métodos de Pago
          </h2>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyPaymentMethods.map((method) => (
              <div
                key={method.id}
                className={`relative p-5 rounded-xl border-2 transition-all ${method.disabled
                  ? 'border-[#e9ecef] bg-[#f8f9fa] opacity-60'
                  : 'border-[#e9ecef] hover:border-[#2a63cd]/30 hover:shadow-md'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    {method.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#212529] mb-3">{method.name}</h3>
                    <div className="space-y-2">
                      {method.details.map((detail: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-[#6a6c6b] font-medium">{detail.label}:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#212529] font-semibold truncate max-w-[150px]">{detail.value}</span>
                            {detail.copyable && (
                              <button
                                onClick={() => copyToClipboard(detail.value, `${method.id}-${index}`)}
                                className="p-1.5 hover:bg-[#f8f9fa] rounded-lg transition-colors"
                                title="Copiar"
                              >
                                {copiedMethod === `${method.id}-${index}` ? (
                                  <FiCheck className="w-4 h-4 text-green-600" />
                                ) : (
                                  <FiCopy className="w-4 h-4 text-[#6a6c6b]" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {method.disabled && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                    Próximamente
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden animate-slideInUp">
        <div className="px-4 py-2 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#212529] flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4 text-[#2a63cd]" />
              Transacciones
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-[#e9ecef] rounded-lg p-0.5">
                {['ALL', 'RECHARGE', 'PURCHASE'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${filterType === type
                      ? 'bg-[#2a63cd] text-white'
                      : 'text-[#6a6c6b] hover:bg-[#f8f9fa]'
                      }`}
                  >
                    {type === 'ALL' ? 'Todas' : type === 'RECHARGE' ? 'Recargas' : 'Compras'}
                  </button>
                ))}
              </div>
              <button className="p-2 hover:bg-[#f8f9fa] rounded-lg transition-colors">
                <FiDownload className="w-5 h-5 text-[#6a6c6b]" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-3">
          {filteredTransactions.length > 0 ? (
            <div className="space-y-2">
              {filteredTransactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-[#e9ecef] hover:bg-[#f8f9fa] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-[#212529]">{transaction.description}</p>
                      <p className="text-sm text-[#6a6c6b]">
                        {new Date(transaction.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${transaction.type === 'RECHARGE' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'RECHARGE' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      transaction.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      {transaction.status === 'COMPLETED' ? 'Completado' :
                        transaction.status === 'PENDING' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FiDollarSign className="w-16 h-16 text-[#e9ecef] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#212529] mb-2">
                No hay transacciones
              </h3>
              <p className="text-[#6a6c6b] mb-6">
                {filterType === 'ALL'
                  ? 'Aún no has realizado ninguna transacción'
                  : `No tienes transacciones de tipo "${filterType === 'RECHARGE' ? 'Recargas' : 'Compras'}"`
                }
              </p>
              <button
                onClick={() => setShowRechargeModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md"
              >
                <FiPlus className="w-5 h-5" />
                Realizar Primera Recarga
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
