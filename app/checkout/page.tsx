'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';
import PublicHeader from '@/components/public/PublicHeader';
import RechargeModal from '@/components/modals/RechargeModal';
import { FiCreditCard, FiDollarSign, FiPlus, FiCheck, FiUser, FiAlertCircle, FiArrowRight } from 'react-icons/fi';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, getTotalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'DIRECT' | 'WALLET' | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    notes: '',
    paymentMethod: '' as 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'ZELLE' | 'PAYPAL' | 'CREDIT_CARD' | 'CRYPTO' | 'WALLET',
    deliveryMethod: 'HOME_DELIVERY' as 'PICKUP' | 'HOME_DELIVERY' | 'SHIPPING',
  });

  // Load company settings for exchange rates
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => setCompanySettings(data))
      .catch(err => console.error('Error loading settings:', err));
  }, []);

  // Load user data if logged in
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        customerName: session.user.name || '',
        customerEmail: session.user.email || '',
      }));

      // Load profile for phone
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.profile?.phone) {
            setFormData(prev => ({ ...prev, customerPhone: data.profile.phone }));
          }
        })
        .catch(err => console.error('Error loading profile:', err));

      fetchBalance();
    }
  }, [session]);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/customer/balance');
      if (response.ok) {
        const data = await response.json();
        setUserBalance(Number(data.balance));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  // State for redirect animation
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);

  // Redirect if not authenticated with animation
  useEffect(() => {
    if (status === 'unauthenticated') {
      setShowRedirectMessage(true);
      // Redirect after showing the message
      const timer = setTimeout(() => {
        router.push('/registro?redirect=checkout');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  const totalPrice = getTotalPrice();
  const shippingCost = formData.deliveryMethod === 'SHIPPING' ? 10 : 0;
  const finalTotal = totalPrice + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!session?.user) {
      setError('Debes iniciar sesión para realizar un pedido');
      router.push('/login?redirect=checkout');
      return;
    }

    if (!paymentMode) {
      setError('Debes seleccionar un modo de pago');
      setLoading(false);
      return;
    }

    if (paymentMode === 'DIRECT' && !formData.paymentMethod) {
      setError('Debes seleccionar un método de pago');
      setLoading(false);
      return;
    }

    // If wallet mode, set payment method to WALLET
    const finalPaymentMethod = paymentMode === 'WALLET' ? 'WALLET' : formData.paymentMethod;

    try {
      // Get exchange rates
      const exchangeRateVES = companySettings?.exchangeRateVES || 1;
      const exchangeRateEUR = companySettings?.exchangeRateEUR || 1;
      const primaryCurrency = companySettings?.primaryCurrency || 'USD';

      // Create order items in the format expected by the API
      const orderItems = items.map(item => ({
        productId: item.id,
        productName: item.name,
        productSku: item.id, // You might want to add SKU to CartItem
        productImage: item.imageUrl || null,
        pricePerUnit: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const orderData = {
        currency: primaryCurrency,
        subtotal: totalPrice,
        tax: 0,
        shipping: shippingCost,
        discount: 0,
        total: finalTotal,
        exchangeRateVES: exchangeRateVES,
        exchangeRateEUR: exchangeRateEUR,
        paymentMethod: finalPaymentMethod,
        deliveryMethod: formData.deliveryMethod,
        items: orderItems,
        notes: formData.notes || null,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear la orden');
      }

      const order = await response.json();

      // Clear cart
      clearCart();

      // Redirect to success page
      router.push(`/mis-pedidos`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Show loading while checking authentication to prevent flash
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f8f9fa]">
        <PublicHeader />

        {/* Empty Cart Message */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-12 text-center">
            <svg className="w-20 h-20 text-[#e9ecef] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-[#212529] mb-2">Tu carrito está vacío</h2>
            <p className="text-[#6a6c6b] mb-6">
              Agrega productos a tu carrito para continuar con el proceso de pago
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Ver Productos
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Show redirect message IMMEDIATELY if not authenticated (check status directly)
  if (status === 'unauthenticated' || showRedirectMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Main Card - Optimal Width for Readability */}
        <div className="relative z-10 max-w-3xl w-full px-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl animate-slideInUp">
            {/* Icon */}
            <div className="w-24 h-24 mx-auto mb-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl">
              <FiUser className="w-12 h-12 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-3xl font-black text-white text-center mb-3 font-[family-name:var(--font-tektur)]">
              ¡Un momento!
            </h2>

            {/* Subtitle with icon */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <FiAlertCircle className="w-5 h-5 text-cyan-200" />
              <p className="text-blue-100 text-center font-medium">
                No tienes cuenta creada
              </p>
            </div>

            {/* Description */}
            <p className="text-white/90 text-center mb-8 leading-relaxed">
              Crea una y luego te regresamos a tu compra
            </p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-white rounded-full animate-progress"></div>
              </div>
            </div>

            {/* Redirect Info */}
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <FiArrowRight className="w-4 h-4 text-cyan-200 animate-pulse" />
              <p className="text-sm text-blue-100 font-medium">
                Redirigiendo al registro en segundos...
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes progress {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }

          .animate-slideInUp {
            animation: slideInUp 0.6s ease-out;
          }

          .animate-progress {
            animation: progress 3s linear;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f8f9fa]">
      <PublicHeader />

      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd] py-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 animate-fadeInUp">
            Finalizar Compra
          </h1>
          <p className="text-lg text-blue-100 animate-fadeInUp animation-delay-200">
            Completa tus datos para procesar tu pedido
          </p>
        </div>
        <style jsx>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(20px, -50px) scale(1.1); }
            50% { transform: translate(-20px, 20px) scale(0.9); }
            75% { transform: translate(50px, 50px) scale(1.05); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-blob { animation: blob 7s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animate-fadeInUp { animation: fadeInUp 0.8s ease-out; }
          .animation-delay-200 { animation-delay: 0.2s; animation-fill-mode: both; }
        `}</style>
      </section>

      {/* Main Content - Wider for Desktop */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-6">
                <h2 className="text-xl font-semibold text-[#212529] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Información de Contacto
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="customerName" className="block text-sm font-medium text-[#212529] mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-[#212529] mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="customerEmail"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="customerPhone" className="block text-sm font-medium text-[#212529] mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      id="customerPhone"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                      placeholder="+58 424 1234567"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-6">
                <h2 className="text-xl font-semibold text-[#212529] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Dirección de Envío
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="shippingAddress" className="block text-sm font-medium text-[#212529] mb-1">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      id="shippingAddress"
                      name="shippingAddress"
                      value={formData.shippingAddress}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                      placeholder="Calle, número, edificio, apartamento"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="shippingCity" className="block text-sm font-medium text-[#212529] mb-1">
                        Ciudad *
                      </label>
                      <input
                        type="text"
                        id="shippingCity"
                        name="shippingCity"
                        value={formData.shippingCity}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                        placeholder="Guanare"
                      />
                    </div>

                    <div>
                      <label htmlFor="shippingState" className="block text-sm font-medium text-[#212529] mb-1">
                        Estado *
                      </label>
                      <input
                        type="text"
                        id="shippingState"
                        name="shippingState"
                        value={formData.shippingState}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                        placeholder="Portuguesa"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-6">
                <h2 className="text-xl font-semibold text-[#212529] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Método de Pago
                </h2>

                {/* Payment Mode Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('DIRECT')}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left group ${paymentMode === 'DIRECT'
                      ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-lg'
                      : 'border-[#e9ecef] hover:border-[#2a63cd]/50 hover:shadow-md'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${paymentMode === 'DIRECT' ? 'bg-[#2a63cd] text-white' : 'bg-[#f8f9fa] text-[#6a6c6b] group-hover:bg-[#2a63cd]/10 group-hover:text-[#2a63cd]'
                      }`}>
                      <FiCreditCard className="w-6 h-6" />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${paymentMode === 'DIRECT' ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                      Pagar Directamente
                    </h3>
                    <p className="text-sm text-[#6a6c6b]">
                      Usa transferencia, pago móvil o criptomonedas
                    </p>
                    {paymentMode === 'DIRECT' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-[#2a63cd] rounded-full flex items-center justify-center">
                        <FiCheck className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('WALLET')}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left group ${paymentMode === 'WALLET'
                      ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-lg'
                      : 'border-[#e9ecef] hover:border-[#2a63cd]/50 hover:shadow-md'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${paymentMode === 'WALLET' ? 'bg-[#2a63cd] text-white' : 'bg-[#f8f9fa] text-[#6a6c6b] group-hover:bg-[#2a63cd]/10 group-hover:text-[#2a63cd]'
                      }`}>
                      <FiDollarSign className="w-6 h-6" />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${paymentMode === 'WALLET' ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                      Usar Saldo / Recargar
                    </h3>
                    <p className="text-sm text-[#6a6c6b]">
                      Paga con tu saldo disponible en la plataforma
                    </p>
                    {paymentMode === 'WALLET' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-[#2a63cd] rounded-full flex items-center justify-center">
                        <FiCheck className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Direct Payment Options */}
                {paymentMode === 'DIRECT' && (
                  <div className="space-y-3 animate-fadeIn">
                    <label className="flex items-center p-4 border border-[#e9ecef] rounded-xl hover:bg-[#f8f9fa] cursor-pointer transition-all hover:shadow-sm">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="BANK_TRANSFER"
                        checked={formData.paymentMethod === 'BANK_TRANSFER'}
                        onChange={handleChange}
                        className="w-5 h-5 text-[#2a63cd] focus:ring-[#2a63cd]"
                      />
                      <div className="ml-4">
                        <span className="block text-sm font-bold text-[#212529]">Transferencia Bancaria</span>
                        <span className="block text-xs text-[#6a6c6b]">Paga directamente desde tu banco</span>
                      </div>
                    </label>

                    <label className="flex items-center p-4 border border-[#e9ecef] rounded-xl hover:bg-[#f8f9fa] cursor-pointer transition-all hover:shadow-sm">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="MOBILE_PAYMENT"
                        checked={formData.paymentMethod === 'MOBILE_PAYMENT'}
                        onChange={handleChange}
                        className="w-5 h-5 text-[#2a63cd] focus:ring-[#2a63cd]"
                      />
                      <div className="ml-4">
                        <span className="block text-sm font-bold text-[#212529]">Pago Móvil</span>
                        <span className="block text-xs text-[#6a6c6b]">Pago móvil venezolano</span>
                      </div>
                    </label>

                    <label className="flex items-center p-4 border border-[#e9ecef] rounded-xl hover:bg-[#f8f9fa] cursor-pointer transition-all hover:shadow-sm">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="CRYPTO"
                        checked={formData.paymentMethod === 'CRYPTO'}
                        onChange={handleChange}
                        className="w-5 h-5 text-[#2a63cd] focus:ring-[#2a63cd]"
                      />
                      <div className="ml-4">
                        <span className="block text-sm font-bold text-[#212529]">Criptomoneda</span>
                        <span className="block text-xs text-[#6a6c6b]">USDT, Bitcoin, etc.</span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Wallet Payment Options */}
                {paymentMode === 'WALLET' && (
                  <div className="bg-[#f8f9fa] rounded-xl p-6 border border-[#e9ecef] animate-fadeIn">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-sm text-[#6a6c6b] font-medium">Saldo Disponible</p>
                        <p className="text-3xl font-black text-[#212529]">${formatPrice(userBalance)}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-bold ${userBalance >= finalTotal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {userBalance >= finalTotal ? 'Saldo Suficiente' : 'Saldo Insuficiente'}
                      </div>
                    </div>

                    {userBalance < finalTotal && (
                      <div className="text-center">
                        <p className="text-sm text-[#6a6c6b] mb-4">
                          Necesitas <strong>${formatPrice(finalTotal - userBalance)}</strong> adicionales para completar tu compra.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowRechargeModal(true)}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a63cd] text-white font-bold rounded-xl hover:bg-[#1e4ba3] transition-all shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          <FiPlus className="w-5 h-5" />
                          Recargar Saldo
                        </button>
                      </div>
                    )}

                    {userBalance >= finalTotal && (
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                        <FiCheck className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">
                          ¡Genial! Tienes saldo suficiente para realizar esta compra inmediatamente.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery Method */}
              <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-6">
                <h2 className="text-xl font-semibold text-[#212529] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Método de Entrega
                </h2>

                <div className="space-y-3">
                  <label className="flex items-center p-3 border border-[#e9ecef] rounded-lg hover:bg-[#f8f9fa] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="HOME_DELIVERY"
                      checked={formData.deliveryMethod === 'HOME_DELIVERY'}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#2a63cd]"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-[#212529]">Delivery a Domicilio</span>
                      <p className="text-xs text-[#6a6c6b]">Entrega en tu dirección</p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-[#e9ecef] rounded-lg hover:bg-[#f8f9fa] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="PICKUP"
                      checked={formData.deliveryMethod === 'PICKUP'}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#2a63cd]"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-[#212529]">Retiro en Tienda</span>
                      <p className="text-xs text-[#6a6c6b]">Recoge tu pedido en la tienda</p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-[#e9ecef] rounded-lg hover:bg-[#f8f9fa] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="SHIPPING"
                      checked={formData.deliveryMethod === 'SHIPPING'}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#2a63cd]"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-[#212529]">Envío</span>
                      <p className="text-xs text-[#6a6c6b]">Envío por correo (costo adicional)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-6">
                <h2 className="text-xl font-semibold text-[#212529] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Notas Adicionales (Opcional)
                </h2>

                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm resize-none"
                  placeholder="Instrucciones especiales de entrega, preferencias de horario, etc."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (paymentMode === 'WALLET' && userBalance < finalTotal)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-semibold rounded-lg hover:from-[#1e4ba3] hover:to-[#2a63cd] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Completar Pedido</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-[#212529] mb-4">
                Resumen del Pedido
              </h2>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 pb-3 border-b border-[#e9ecef] last:border-0 last:pb-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex-shrink-0 relative overflow-hidden">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[#212529] line-clamp-1 mb-1">
                        {item.name}
                      </h4>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6a6c6b]">x{item.quantity}</span>
                        <span className="font-semibold text-[#2a63cd]">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#e9ecef] space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6a6c6b]">Subtotal</span>
                  <span className="font-medium text-[#212529]">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6a6c6b]">Envío</span>
                  <span className={`font-medium ${shippingCost > 0 ? 'text-[#212529]' : 'text-green-600'}`}>
                    {shippingCost > 0 ? formatPrice(shippingCost) : 'Gratis'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-[#e9ecef]">
                  <span className="text-[#212529]">Total</span>
                  <span className="text-[#2a63cd]">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || (paymentMode === 'WALLET' && userBalance < finalTotal)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirmar Pedido
                  </>
                )}
              </button>

              <Link
                href="/productos"
                className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-[#2a63cd] text-sm font-medium border border-[#e9ecef] rounded-lg hover:bg-[#f8f9fa] transition-all"
              >
                Seguir Comprando
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e9ecef] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-[#6a6c6b]">
            &copy; {new Date().getFullYear()} Electro Shop Morandin C.A. - Todos los derechos reservados
          </p>
        </div>
      </footer>

      <RechargeModal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        onSuccess={fetchBalance}
      />
    </div>
  );
}
