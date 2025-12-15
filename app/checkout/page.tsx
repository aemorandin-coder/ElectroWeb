'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';
import PublicHeader from '@/components/public/PublicHeader';
import RechargeModal from '@/components/modals/RechargeModal';
import { FiCreditCard, FiDollarSign, FiPlus, FiCheck, FiUser, FiAlertCircle, FiArrowRight, FiLock, FiMapPin, FiPackage, FiTruck, FiInfo, FiCopy, FiCheckCircle } from 'react-icons/fi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet } from '@fortawesome/free-solid-svg-icons';

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
    customerIdNumber: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    notes: '',
    paymentMethod: '' as 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'ZELLE' | 'PAYPAL' | 'CREDIT_CARD' | 'CRYPTO' | 'WALLET',
    deliveryMethod: 'HOME_DELIVERY' as 'PICKUP' | 'HOME_DELIVERY' | 'SHIPPING',
    courierService: '' as 'ZOOM' | 'MRW' | '',
    courierOfficeId: '',
    isOfficeDelivery: false,
  });

  // Refs for auto-focus
  const shippingAddressRef = useRef<HTMLInputElement>(null);
  const shippingCityRef = useRef<HTMLInputElement>(null);
  const shippingStateRef = useRef<HTMLInputElement>(null);

  // State for tooltips
  const [showShippingWarning, setShowShippingWarning] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [isNewAddress, setIsNewAddress] = useState(true);

  // Google Maps feature
  const [showGoogleMapsHelper, setShowGoogleMapsHelper] = useState(false);
  const [copiedFromMaps, setCopiedFromMaps] = useState(false);

  // Tooltip for client data warning
  const [showClientDataTooltip, setShowClientDataTooltip] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderData, setSuccessOrderData] = useState<{
    orderNumber: string;
    total: number;
    items: Array<{ name: string; quantity: number }>;
  } | null>(null);

  // Active Discounts
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>([]);
  const [appliedDiscountIds, setAppliedDiscountIds] = useState<string[]>([]);

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

      // Load profile for phone, idNumber and saved addresses
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.profile?.phone || data.profile?.idNumber) {
            setFormData(prev => ({
              ...prev,
              customerPhone: data.profile.phone || prev.customerPhone,
              customerIdNumber: data.profile.idNumber || prev.customerIdNumber
            }));
          }

          // Load saved addresses
          if (data.profile?.savedAddresses) {
            try {
              const addresses = typeof data.profile.savedAddresses === 'string'
                ? JSON.parse(data.profile.savedAddresses)
                : data.profile.savedAddresses;

              if (Array.isArray(addresses)) {
                setSavedAddresses(addresses);
                if (addresses.length > 0) {
                  setShowAddressSelector(true);
                  setIsNewAddress(false);
                  setFormData(prev => ({
                    ...prev,
                    ...addresses[0]
                  }));
                }
              }
            } catch (e) {
              console.error('Error parsing saved addresses', e);
            }
          }
        });

      // Fetch active discounts
      fetch('/api/customer/discount-requests')
        .then(res => res.json())
        .then(data => {
          if (data.activeDiscounts) {
            setActiveDiscounts(data.activeDiscounts);
          }
        })
        .catch(err => console.error('Error loading discounts:', err));
    }
  }, [session]);

  // Calculate totals with discounts
  const { cartSubtotal, cartDiscount, cartTotal, discountIds } = useMemo(() => {
    let sub = 0;
    let disc = 0;
    const ids: string[] = [];

    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      sub += itemTotal;

      const activeDiscount = activeDiscounts.find(d =>
        d.productId === item.id &&
        d.status === 'APPROVED' &&
        d.expiresAt &&
        new Date(d.expiresAt) > new Date()
      );

      if (activeDiscount) {
        const discountVal = activeDiscount.approvedDiscount || activeDiscount.requestedDiscount;
        const discountAmount = itemTotal * (discountVal / 100);
        disc += discountAmount;
        ids.push(activeDiscount.id);
      }
    });

    return {
      cartSubtotal: sub,
      cartDiscount: disc,
      cartTotal: sub - disc,
      discountIds: ids
    };
  }, [items, activeDiscounts]);

  // Update applied discount IDs state
  useEffect(() => {
    setAppliedDiscountIds(discountIds);
  }, [discountIds]);

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

  // Auto-focus on shipping address when section becomes visible
  useEffect(() => {
    if (session?.user && formData.customerName) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (!formData.isOfficeDelivery && shippingAddressRef.current) {
          shippingAddressRef.current.focus();
        }
      }, 500);
    }
  }, [session, formData.customerName]);

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

  // Calculate shipping cost from settings
  const getShippingCost = () => {
    if (formData.deliveryMethod !== 'SHIPPING' && formData.deliveryMethod !== 'HOME_DELIVERY') {
      return 0; // Free for pickup
    }

    const configuredFee = companySettings?.deliveryFeeUSD ? Number(companySettings.deliveryFeeUSD) : 10;
    const freeThreshold = companySettings?.freeDeliveryThresholdUSD ? Number(companySettings.freeDeliveryThresholdUSD) : null;

    // Check if order qualifies for free shipping
    if (freeThreshold && cartSubtotal >= freeThreshold) {
      return 0;
    }

    return configuredFee;
  };

  const shippingCost = getShippingCost();
  // Override finalTotal to include shipping
  const finalOrderTotal = cartTotal + shippingCost;
  const finalTotal = finalOrderTotal; // Keep variable name for compatibility with rest of file

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!session?.user) {
      setError('Debes iniciar sesion para realizar un pedido');
      router.push('/login?redirect=checkout');
      return;
    }

    // Check if email is verified
    if (!(session.user as any).emailVerified) {
      setError('Debes verificar tu correo electronico antes de realizar compras. Revisa tu bandeja de entrada y haz clic en el enlace de verificacion.');
      setLoading(false);
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
        subtotal: cartSubtotal,
        tax: 0,
        shipping: shippingCost,
        discount: cartDiscount,
        total: finalTotal,
        exchangeRateVES: exchangeRateVES,
        exchangeRateEUR: exchangeRateEUR,
        paymentMethod: finalPaymentMethod,
        deliveryMethod: formData.deliveryMethod,
        items: orderItems,
        notes: formData.notes || null,
        appliedDiscountIds: appliedDiscountIds,
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

      // Save address to profile if it's a new address
      if (isNewAddress && formData.shippingAddress && formData.shippingCity && formData.shippingState) {
        await saveAddressToProfile(formData);
      }

      // Clear cart
      clearCart();

      // Set success data and show modal
      setSuccessOrderData({
        orderNumber: order.orderNumber,
        total: finalTotal,
        items: items.map(item => ({ name: item.name, quantity: item.quantity }))
      });
      setShowSuccessModal(true);

      // Redirect after 5 seconds
      setTimeout(() => {
        router.push('/customer/orders');
      }, 5000);
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

  // Function to paste from clipboard (Google Maps feature)
  const handlePasteFromGoogleMaps = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFormData(prev => ({ ...prev, shippingAddress: text }));
        setCopiedFromMaps(true);
        setTimeout(() => setCopiedFromMaps(false), 3000);
      }
    } catch (err) {
      console.error('Error reading clipboard:', err);
      alert('No se pudo leer del portapapeles. Por favor, copia manualmente la dirección.');
    }
  };

  // Function to select a saved address
  const handleSelectSavedAddress = (address: any) => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: address.address,
      shippingCity: address.city,
      shippingState: address.state,
    }));
    setIsNewAddress(false);
    setShowAddressSelector(false);
  };

  // Function to save address to profile
  const saveAddressToProfile = async (addressData: any) => {
    try {
      const response = await fetch('/api/user/profile/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressData.shippingAddress,
          city: addressData.shippingCity,
          state: addressData.shippingState,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedAddresses(data.savedAddresses || []);
      }
    } catch (err) {
      console.error('Error saving address:', err);
    }
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

              {/* Email Verification Warning Banner */}
              {session?.user && !(session.user as any).emailVerified && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FiAlertCircle className="w-5 h-5 text-[#2a63cd]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1e4ba3] text-sm mb-1">Verifica tu correo electronico</h3>
                      <p className="text-[#212529] text-sm mb-3">
                        Para poder realizar compras, necesitas verificar tu email.
                        Revisa tu bandeja de entrada y haz clic en el enlace de verificacion.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/auth/resend-verification', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: (session.user as any).email }),
                            });
                            const data = await res.json();
                            alert(data.message || 'Email de verificacion enviado');
                          } catch (err) {
                            alert('Error al reenviar email');
                          }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] transition-colors"
                      >
                        <FiAlertCircle className="w-4 h-4" />
                        Reenviar email de verificacion
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information - Read Only */}
              <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl shadow-lg border border-blue-100 p-6 animate-fadeIn relative">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#212529] flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center shadow-md">
                      <FiUser className="w-5 h-5 text-white" />
                    </div>
                    Información de Contacto
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Show Verified badge only if user is actually verified */}
                    {(session?.user as any)?.emailVerified && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-full">
                        <FiCheckCircle className="w-3.5 h-3.5 text-green-700" />
                        <span className="text-xs font-bold text-green-700">Verificado</span>
                      </div>
                    )}
                    {/* Tooltip Icono */}
                    <div
                      className="relative group"
                      onMouseEnter={() => setShowClientDataTooltip(true)}
                      onMouseLeave={() => setShowClientDataTooltip(false)}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#2a63cd] hover:bg-[#1e4ba3] flex items-center justify-center cursor-help transition-all animate-pulse hover:animate-none shadow-lg">
                        <FiAlertCircle className="w-4 h-4 text-white" />
                      </div>
                      {/* Epic Tooltip */}
                      {showClientDataTooltip && (
                        <div className="absolute right-0 top-full mt-3 w-80 z-50 animate-scaleIn">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-2xl border-2 border-[#2a63cd] p-5 relative">
                            {/* Arrow */}
                            <div className="absolute -top-2 right-6 w-4 h-4 bg-[#2a63cd] rotate-45 border-t-2 border-l-2 border-[#2a63cd]"></div>
                            <div className="absolute -top-1.5 right-6 w-4 h-4 bg-gradient-to-br from-blue-50 to-indigo-50 rotate-45"></div>

                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-10 h-10 rounded-xl bg-[#2a63cd] flex items-center justify-center flex-shrink-0 shadow-md">
                                <FiAlertCircle className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-black text-[#1e4ba3] text-sm mb-1 flex items-center gap-2">
                                  <FiAlertCircle className="w-4 h-4 text-amber-500" />
                                  Importante para el Retiro
                                </h3>
                                <p className="text-xs text-[#212529] leading-relaxed font-medium">
                                  Estos datos registrados (nombre, email, teléfono) son los <strong className="font-black">ÚNICOS válidos</strong> para retirar tu producto.
                                </p>
                              </div>
                            </div>

                            <div className="bg-white/70 rounded-xl p-3 border border-[#2a63cd]/30">
                              <p className="text-xs text-[#212529] leading-relaxed">
                                <strong className="font-black">Solo tú, el cliente logeado</strong>, podrás retirar el pedido presentando tu identificación que coincida con estos datos.
                              </p>
                            </div>

                            <div className="mt-3 flex items-center gap-2 text-xs text-[#2a63cd]">
                              <FiCheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="font-medium">Por seguridad, estos datos no son editables aquí</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  {/* Security Shield Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent rounded-lg pointer-events-none z-10"></div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-[#212529] mb-2 flex items-center gap-2">
                        Nombre Completo
                        <div className="group relative">
                          <FiInfo className="w-4 h-4 text-[#6a6c6b] cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-[#212529] text-white text-xs rounded-lg shadow-xl z-20 animate-scaleIn">
                            Dato protegido de tu registro. No se puede modificar aquí por seguridad.
                            <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-[#212529]"></div>
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6c6b] z-20" />
                        <input
                          type="text"
                          value={formData.customerName}
                          readOnly
                          disabled
                          className="w-full pl-12 pr-4 py-3 border-2 border-[#e9ecef] bg-[#f8f9fa] text-[#212529] rounded-xl cursor-not-allowed font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#212529] mb-2 flex items-center gap-2">
                        Email
                        <div className="group relative">
                          <FiInfo className="w-4 h-4 text-[#6a6c6b] cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-[#212529] text-white text-xs rounded-lg shadow-xl z-20 animate-scaleIn">
                            Email registrado y verificado. Para cambiarlo dirígete a tu perfil.
                            <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-[#212529]"></div>
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6c6b] z-20" />
                        <input
                          type="email"
                          value={formData.customerEmail}
                          readOnly
                          disabled
                          className="w-full pl-12 pr-4 py-3 border-2 border-[#e9ecef] bg-[#f8f9fa] text-[#212529] rounded-xl cursor-not-allowed font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#212529] mb-2 flex items-center gap-2">
                        Teléfono
                        <div className="group relative">
                          <FiInfo className="w-4 h-4 text-[#6a6c6b] cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-[#212529] text-white text-xs rounded-lg shadow-xl z-20 animate-scaleIn">
                            Teléfono de contacto registrado. Actualízalo desde tu perfil si es necesario.
                            <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-[#212529]"></div>
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6c6b] z-20" />
                        <input
                          type="tel"
                          value={formData.customerPhone}
                          readOnly
                          disabled
                          className="w-full pl-12 pr-4 py-3 border-2 border-[#e9ecef] bg-[#f8f9fa] text-[#212529] rounded-xl cursor-not-allowed font-medium"
                        />
                      </div>
                    </div>

                    {/* ID Number / Passport */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-[#212529] mb-2 flex items-center gap-2">
                        Cédula / Pasaporte
                        <div className="group relative">
                          <FiInfo className="w-4 h-4 text-[#6a6c6b] cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-[#212529] text-white text-xs rounded-lg shadow-xl z-20 animate-scaleIn">
                            Documento de identidad registrado. Este dato se usará para validar el retiro del producto.
                            <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-[#212529]"></div>
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6a6c6b] z-20" />
                        <input
                          type="text"
                          value={formData.customerIdNumber || 'No registrado'}
                          readOnly
                          disabled
                          className="w-full pl-12 pr-4 py-3 border-2 border-[#e9ecef] bg-[#f8f9fa] text-[#212529] rounded-xl cursor-not-allowed font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <FiInfo className="w-5 h-5 text-[#2a63cd] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#212529] leading-relaxed">
                      <strong className="font-bold">Datos protegidos:</strong> Esta información proviene de tu registro y no puede modificarse durante el checkout por seguridad.
                      Para actualizar tus datos, ve a tu <Link href="/customer/profile" className="text-[#2a63cd] hover:underline font-bold">perfil de usuario</Link>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping Information - Enhanced */}
              <div className="bg-white rounded-xl shadow-lg border border-[#e9ecef] p-6 animate-fadeIn animation-delay-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#212529] flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center shadow-md">
                      <FiMapPin className="w-5 h-5 text-white" />
                    </div>
                    Dirección de Envío
                  </h2>
                </div>

                {/* Critical Warning Banner */}
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-400 rounded-r-xl shadow-sm animate-pulse-slow">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-orange-900 mb-1 text-sm">¡Importante! Verifica tus datos</h3>
                      <p className="text-xs text-orange-800 leading-relaxed">
                        Verifica que tus datos de envío sean correctos, porque serán usados a la hora de envío de tus productos comprados.
                        <strong className="font-bold"> La empresa no se hace responsable de datos errados ingresados por el usuario.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delivery Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-[#212529] mb-3">
                    Tipo de Entrega *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isOfficeDelivery: false, courierOfficeId: '' })}
                      className={`p-4 rounded-xl border-2 transition-all ${!formData.isOfficeDelivery
                        ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-md'
                        : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                        }`}
                    >
                      <FiMapPin className={`w-6 h-6 mx-auto mb-2 ${!formData.isOfficeDelivery ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`} />
                      <p className={`text-sm font-bold ${!formData.isOfficeDelivery ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                        Dirección Personal
                      </p>
                      <p className="text-xs text-[#6a6c6b] mt-1">Envío a domicilio</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isOfficeDelivery: true })}
                      className={`p-4 rounded-xl border-2 transition-all ${formData.isOfficeDelivery
                        ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-md'
                        : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                        }`}
                    >
                      <FiPackage className={`w-6 h-6 mx-auto mb-2 ${formData.isOfficeDelivery ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`} />
                      <p className={`text-sm font-bold ${formData.isOfficeDelivery ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                        Oficina Courier
                      </p>
                      <p className="text-xs text-[#6a6c6b] mt-1">ZOOM o MRW</p>
                    </button>
                  </div>
                </div>

                {/* Personal Address Form */}
                {!formData.isOfficeDelivery && (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Saved Addresses Selector */}
                    {savedAddresses.length > 0 && (
                      <div className="mb-4">
                        <button
                          type="button"
                          onClick={() => setShowAddressSelector(!showAddressSelector)}
                          className="w-full p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                              <FiMapPin className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-[#212529]">Direcciones Guardadas</p>
                              <p className="text-xs text-[#6a6c6b]">Tienes {savedAddresses.length} dirección(es) guardada(s)</p>
                            </div>
                          </div>
                          <FiArrowRight className={`w-5 h-5 text-blue-600 transition-transform ${showAddressSelector ? 'rotate-90' : ''}`} />
                        </button>

                        {showAddressSelector && (
                          <div className="mt-3 space-y-2 animate-slideDown">
                            {savedAddresses.map((address, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleSelectSavedAddress(address)}
                                className="w-full p-4 bg-white border-2 border-[#e9ecef] rounded-xl hover:border-[#2a63cd] hover:bg-blue-50/50 transition-all text-left group"
                              >
                                <div className="flex items-start gap-3">
                                  <FiCheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#212529] mb-1">{address.address}</p>
                                    <p className="text-xs text-[#6a6c6b]">{address.city}, {address.state}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setIsNewAddress(true);
                                setShowAddressSelector(false);
                                setFormData(prev => ({ ...prev, shippingAddress: '', shippingCity: '', shippingState: '' }));
                              }}
                              className="w-full p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-dashed border-green-300 rounded-xl hover:border-green-500 transition-all flex items-center justify-center gap-2 group"
                            >
                              <FiPlus className="w-4 h-4 text-green-600 group-hover:scale-125 transition-transform" />
                              <span className="text-sm font-bold text-green-700">Agregar Nueva Dirección</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="shippingAddress" className="block text-sm font-semibold text-[#212529]">
                          Dirección Completa *
                        </label>
                        {/* Google Maps Helper Button */}
                        <button
                          type="button"
                          onClick={() => setShowGoogleMapsHelper(!showGoogleMapsHelper)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full hover:from-red-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                        >
                          <FiMapPin className="w-3.5 h-3.5" />
                          Google Maps
                        </button>
                      </div>

                      {/* Google Maps Helper Panel */}
                      {showGoogleMapsHelper && (
                        <div className="mb-3 p-4 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl animate-slideDown shadow-lg">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                              <FiMapPin className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-black text-orange-900 text-sm mb-1 flex items-center gap-2">
                                <FiMapPin className="w-4 h-4" />
                                Ayuda de Google Maps
                              </h4>
                              <p className="text-xs text-orange-800 leading-relaxed">
                                Si no conoces tu dirección exacta o quieres copiarla fácilmente desde Google Maps:
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex items-start gap-2 text-xs text-orange-900">
                              <span className="font-black text-orange-600 flex-shrink-0">1.</span>
                              <p>Abre <strong>Google Maps</strong> en otra pestaña</p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-orange-900">
                              <span className="font-black text-orange-600 flex-shrink-0">2.</span>
                              <p>Busca tu ubicación y haz clic derecho en el mapa</p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-orange-900">
                              <span className="font-black text-orange-600 flex-shrink-0">3.</span>
                              <p>Copia la dirección que aparece</p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-orange-900">
                              <span className="font-black text-orange-600 flex-shrink-0">4.</span>
                              <p>Haz clic en el botón de abajo para pegarla automáticamente</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handlePasteFromGoogleMaps}
                            className="w-full p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                          >
                            {copiedFromMaps ? (
                              <>
                                <FiCheckCircle className="w-5 h-5 animate-bounce" />
                                <span>Dirección Pegada!</span>
                              </>
                            ) : (
                              <>
                                <FiCopy className="w-5 h-5" />
                                <span>Pegar Desde Portapapeles</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="relative">
                        <FiMapPin className="absolute left-4 top-3.5 text-[#6a6c6b]" />
                        <input
                          ref={shippingAddressRef}
                          type="text"
                          id="shippingAddress"
                          name="shippingAddress"
                          value={formData.shippingAddress}
                          onChange={(e) => {
                            handleChange(e);
                            setIsNewAddress(true);
                          }}
                          onFocus={() => setShowShippingWarning(true)}
                          onBlur={() => setTimeout(() => setShowShippingWarning(false), 200)}
                          required={!formData.isOfficeDelivery}
                          className="w-full pl-12 pr-4 py-3 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent transition-all"
                          placeholder="Av. Principal, Edif. Torre, Piso 5, Apto 5-B"
                        />
                      </div>
                      {showShippingWarning && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-800 animate-scaleIn">
                          <FiInfo className="w-4 h-4 flex-shrink-0" />
                          <span>Incluye puntos de referencia para facilitar la entrega</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="shippingCity" className="block text-sm font-semibold text-[#212529] mb-2">
                          Ciudad *
                        </label>
                        <input
                          ref={shippingCityRef}
                          type="text"
                          id="shippingCity"
                          name="shippingCity"
                          value={formData.shippingCity}
                          onChange={handleChange}
                          required={!formData.isOfficeDelivery}
                          className="w-full px-4 py-3 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent transition-all"
                          placeholder="Guanare"
                        />
                      </div>

                      <div>
                        <label htmlFor="shippingState" className="block text-sm font-semibold text-[#212529] mb-2">
                          Estado *
                        </label>
                        <input
                          ref={shippingStateRef}
                          type="text"
                          id="shippingState"
                          name="shippingState"
                          value={formData.shippingState}
                          onChange={handleChange}
                          required={!formData.isOfficeDelivery}
                          className="w-full px-4 py-3 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent transition-all"
                          placeholder="Portuguesa"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Courier Office Selection */}
                {formData.isOfficeDelivery && (
                  <div className="space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-sm font-semibold text-[#212529] mb-3">
                        Empresa de Encomienda *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, courierService: 'ZOOM' })}
                          className={`p-4 rounded-xl border-2 transition-all ${formData.courierService === 'ZOOM'
                            ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-md'
                            : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                            }`}
                        >
                          <FiTruck className={`w-6 h-6 mx-auto mb-2 ${formData.courierService === 'ZOOM' ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`} />
                          <p className={`text-sm font-bold ${formData.courierService === 'ZOOM' ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                            ZOOM
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, courierService: 'MRW' })}
                          className={`p-4 rounded-xl border-2 transition-all ${formData.courierService === 'MRW'
                            ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-md'
                            : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                            }`}
                        >
                          <FiTruck className={`w-6 h-6 mx-auto mb-2 ${formData.courierService === 'MRW' ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`} />
                          <p className={`text-sm font-bold ${formData.courierService === 'MRW' ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                            MRW
                          </p>
                        </button>
                      </div>
                    </div>

                    {formData.courierService && (
                      <div className="animate-fadeIn">
                        <label htmlFor="courierOfficeId" className="block text-sm font-semibold text-[#212529] mb-2">
                          Oficina {formData.courierService} / Casillero *
                        </label>
                        <div className="relative">
                          <FiPackage className="absolute left-4 top-3.5 text-[#6a6c6b]" />
                          <input
                            type="text"
                            id="courierOfficeId"
                            name="courierOfficeId"
                            value={formData.courierOfficeId}
                            onChange={(e) => setFormData({ ...formData, courierOfficeId: e.target.value })}
                            required={formData.isOfficeDelivery}
                            className="w-full pl-12 pr-4 py-3 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent transition-all"
                            placeholder={`ID de oficina ${formData.courierService} o número de casillero`}
                          />
                        </div>
                        <p className="mt-2 text-xs text-[#6a6c6b] flex items-center gap-1">
                          <FiInfo className="w-3 h-3" />
                          Ingresa el código de la oficina {formData.courierService} más cercana o tu número de casillero
                        </p>
                      </div>
                    )}

                    {/* Info about courier services */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <h4 className="font-bold text-sm text-[#212529] mb-2 flex items-center gap-2">
                        <FiInfo className="w-4 h-4 text-[#2a63cd]" />
                        Sobre las oficinas de encomienda
                      </h4>
                      <ul className="text-xs text-[#6a6c6b] space-y-1 ml-6 list-disc">
                        <li>Tu pedido será enviado a la oficina {formData.courierService || 'ZOOM/MRW'} que indiques</li>
                        <li>Recibirás una notificación cuando tu paquete llegue a la oficina</li>
                        <li>Debes retirar tu paquete con tu cédula de identidad</li>
                      </ul>
                    </div>
                  </div>
                )}
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
                    className={`relative p-6 rounded-xl border-2 transition-all text-left group overflow-hidden ${paymentMode === 'WALLET'
                      ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-lg'
                      : 'border-[#2a63cd]/30 bg-gradient-to-br from-white to-blue-50 hover:border-[#2a63cd]/50 hover:shadow-lg shadow-md'
                      }`}
                  >
                    {/* Animated glow effect - Always active */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2a63cd]/15 to-transparent animate-shimmer"></div>

                    {/* Sparkle effects */}
                    <div className="absolute top-2 right-8 w-2 h-2 bg-[#2a63cd] rounded-full animate-ping opacity-40"></div>
                    <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-[#6366f1] rounded-full animate-ping opacity-30" style={{ animationDelay: '0.5s' }}></div>

                    {/* Icon with epic animation - Always animated */}
                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${paymentMode === 'WALLET'
                      ? 'bg-gradient-to-br from-[#2a63cd] to-[#6366f1] text-white shadow-lg shadow-[#2a63cd]/40'
                      : 'bg-gradient-to-br from-[#2a63cd]/20 to-[#6366f1]/20 text-[#2a63cd]'
                      }`}
                    >
                      {/* Pulse ring animation - Always active */}
                      <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[#2a63cd]"></div>
                      {/* Rotating ring - Always active */}
                      <div className="absolute inset-[-3px] rounded-full border-2 border-dashed border-[#2a63cd]/40 animate-spin" style={{ animationDuration: '6s' }}></div>
                      <FontAwesomeIcon icon={faWallet} className="w-6 h-6 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${paymentMode === 'WALLET' ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                      Usar Saldo / Recargar
                    </h3>
                    <p className="text-sm text-[#6a6c6b]">
                      Paga con tu saldo disponible en la plataforma
                    </p>
                    {userBalance > 0 && (
                      <div className="mt-2 text-xs font-bold text-[#2a63cd] animate-pulse flex items-center gap-1">
                        <FiDollarSign className="w-3.5 h-3.5" />
                        Saldo: ${formatPrice(userBalance)}
                      </div>
                    )}
                    {paymentMode === 'WALLET' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-[#2a63cd] rounded-full flex items-center justify-center animate-bounce">
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

              {/* Terms and Conditions */}
              <div className="bg-white rounded-xl shadow-lg border border-[#e9ecef] p-6 animate-fadeIn animation-delay-300">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-5 h-5 mt-1 text-[#2a63cd] rounded focus:ring-2 focus:ring-[#2a63cd] cursor-pointer"
                  />
                  <label htmlFor="acceptTerms" className="flex-1 text-sm text-[#212529] leading-relaxed cursor-pointer">
                    Acepto los{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-[#2a63cd] hover:underline font-bold"
                    >
                      términos y condiciones
                    </button>
                    . Confirmo que la información de envío es correcta y entiendo que{' '}
                    <strong className="font-bold text-orange-700">
                      la empresa no se hace responsable por datos errados ingresados por el usuario
                    </strong>
                    .
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !acceptedTerms || (paymentMode === 'WALLET' && userBalance < finalTotal)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold text-lg rounded-xl hover:from-[#1e4ba3] hover:to-[#2a63cd] transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando Pedido...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-6 h-6" />
                    <span>Completar Pedido</span>
                    <FiArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {!acceptedTerms && (
                <p className="text-center text-xs text-red-600 -mt-2 animate-pulse">
                  Debes aceptar los términos y condiciones para continuar
                </p>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-[#212529] mb-4">
                Resumen del Pedido
              </h2>

              <div className="space-y-3 mb-4">
                {items.map((item) => {
                  const originalTotal = item.price * item.quantity;
                  const finalItemTotal = item.price * item.quantity;
                  const activeDiscount = false;

                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative flex-shrink-0 w-12 h-12 bg-white rounded-lg border border-[#e9ecef] overflow-hidden">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                            {activeDiscount ? (
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-gray-400 line-through">{formatPrice(originalTotal)}</span>
                                <span className="text-green-600 font-bold">{formatPrice(finalItemTotal)}</span>
                              </div>
                            ) : formatPrice(originalTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#e9ecef] space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6a6c6b]">Subtotal</span>
                  <span className="font-medium text-[#212529]">{formatPrice(cartSubtotal)}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm animate-pulse">
                    <span className="text-green-600 flex items-center gap-1 font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      Descuento aplicado
                    </span>
                    <span className="font-bold text-green-600">-{formatPrice(cartDiscount)}</span>
                  </div>
                )}
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

      {/* Terms and Conditions Modal */}
      {
        showTermsModal && (
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 99999 }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{
                width: '100%',
                maxWidth: '700px',
                minWidth: '320px',
                maxHeight: '85vh',
                animation: 'modalScaleIn 0.3s ease-out'
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Términos y Condiciones</h2>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                <div className="space-y-6 text-sm text-[#212529]">
                  {/* Critical Warning */}
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-500 rounded-r-xl">
                    <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                      <FiAlertCircle className="w-5 h-5" />
                      Responsabilidad del Usuario
                    </h3>
                    <p className="text-orange-800 leading-relaxed">
                      <strong>IMPORTANTE:</strong> El usuario es completamente responsable de verificar que todos los datos de envío (dirección, ciudad, estado, oficina de encomienda, etc.) sean correctos antes de completar su pedido.
                    </p>
                    <p className="text-orange-800 mt-2 leading-relaxed font-bold">
                      Electro Shop Morandin C.A. NO SE HACE RESPONSABLE por pérdidas, retrasos o costos adicionales derivados de datos errados ingresados por el usuario.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-2">1. Información General</h3>
                    <p className="leading-relaxed">
                      Al realizar una compra en Electro Shop Morandin C.A., usted acepta estos términos y condiciones en su totalidad. Por favor, léalos cuidadosamente antes de completar su pedido.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-2">2. Datos de Envío</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Es responsabilidad del cliente proporcionar una dirección de envío completa y correcta.</li>
                      <li>Los datos de contacto (nombre, email, teléfono) provienen de su registro y son verificados.</li>
                      <li>Si selecciona envío a oficina de encomienda (ZOOM o MRW), debe proporcionar el código correcto de la oficina o casillero.</li>
                      <li>La empresa NO corregirá datos errados después de que el pedido haya sido procesado.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-2">3. Envíos mediante ZOOM y MRW</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Los pedidos se envían mediante las empresas certificadas ZOOM o MRW según la selección del cliente.</li>
                      <li>El cliente debe proporcionar un código de oficina válido o número de casillero.</li>
                      <li>Para retirar el paquete, debe presentar cédula de identidad.</li>
                      <li>El tiempo de entrega depende de la empresa de encomienda seleccionada.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-2">4. Limitación de Responsabilidad</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>La empresa no se hace responsable de direcciones incorrectas o incompletas proporcionadas por el usuario.</li>
                      <li>No se procesan reembolsos por entregas fallidas debido a datos incorrectos del cliente.</li>
                      <li>Los costos adicionales de reenvío por datos incorrectos serán asumidos por el cliente.</li>
                      <li>La empresa verificará la identidad del destinatario al momento de la entrega.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-2">5. Métodos de Pago</h3>
                    <p className="leading-relaxed">
                      Aceptamos transferencias bancarias, pago móvil, criptomonedas y saldo de billetera. Los pedidos se procesan una vez confirmado el pago.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-2">6. Política de Cambios y Devoluciones</h3>
                    <p className="leading-relaxed">
                      Consulte nuestra política de cambios y devoluciones. No se aceptan devoluciones por datos de envío incorrectos proporcionados por el cliente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-[#f8f9fa] border-t border-[#e9ecef] flex gap-3">
                <button
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  Aceptar y Continuar
                </button>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="px-6 py-3 bg-white border-2 border-[#e9ecef] text-[#212529] font-medium rounded-xl hover:bg-[#f8f9fa] transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Epic Success Modal */}
      {
        showSuccessModal && successOrderData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-fadeIn">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a]/95 via-[#2563eb]/95 to-[#2a63cd]/95 backdrop-blur-xl" />

            {/* Animated Background Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-green-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl w-full max-w-lg p-8 animate-scaleInBounce">
              {/* Animated Checkmark */}
              <div className="w-28 h-28 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full animate-pulse shadow-2xl shadow-emerald-500/30"></div>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeDasharray="251.2"
                    strokeDashoffset="251.2"
                    strokeLinecap="round"
                    className="animate-drawCircle"
                  />
                  <path
                    d="M30 52 L45 67 L70 35"
                    fill="none"
                    stroke="white"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="70"
                    strokeDashoffset="70"
                    className="animate-drawCheck"
                  />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-black text-white text-center mb-2 animate-slideUp flex items-center justify-center gap-3">
                ¡Gracias por tu compra!
                <FiCheck className="w-8 h-8 text-cyan-300 animate-bounce" />
              </h2>

              {/* Order Number */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 mb-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                <p className="text-center text-blue-100 text-sm mb-1">Número de Orden</p>
                <p className="text-center text-2xl font-black text-white tracking-wider">
                  {successOrderData.orderNumber}
                </p>
              </div>

              {/* Products Summary */}
              <div className="mb-6 animate-slideUp" style={{ animationDelay: '0.3s' }}>
                <p className="text-white/80 text-sm mb-3 text-center">Productos en tu pedido:</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {successOrderData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-xl">
                      <span className="text-white text-sm truncate flex-1">{item.name}</span>
                      <span className="text-cyan-200 text-sm font-bold ml-2">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl border border-white/10 mb-6 animate-slideUp" style={{ animationDelay: '0.4s' }}>
                <span className="text-white font-medium">Total pagado</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-white/60">USD</span>
                  <span className="text-2xl font-black text-white">{successOrderData.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 p-4 mb-6 animate-slideUp" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiCheck className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium mb-1">
                      Recibirás confirmación por correo y notificaciones en la plataforma
                    </p>
                    <p className="text-blue-200 text-xs">
                      Ve a <strong className="text-white">Mi Perfil → Mis Pedidos</strong> para hacer seguimiento
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <p className="text-center text-white/60 text-xs mb-2">Redirigiendo a tus pedidos...</p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-white rounded-full animate-progressBar"></div>
                </div>
              </div>

              {/* Button */}
              <button
                onClick={() => router.push('/customer/orders')}
                className="w-full py-4 bg-white text-[#2a63cd] font-bold rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                Ver Mis Pedidos Ahora
              </button>
            </div>

            <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes drawCircle {
              to { stroke-dashoffset: 0; }
            }
            @keyframes drawCheck {
              to { stroke-dashoffset: 0; }
            }
            @keyframes scaleInBounce {
              0% { opacity: 0; transform: scale(0.8); }
              50% { transform: scale(1.02); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes progressBar {
              from { width: 0%; }
              to { width: 100%; }
            }
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out;
            }
            .animate-drawCircle {
              animation: drawCircle 0.8s ease-out 0.3s forwards;
            }
            .animate-drawCheck {
              animation: drawCheck 0.5s ease-out 0.9s forwards;
            }
            .animate-scaleInBounce {
              animation: scaleInBounce 0.5s ease-out;
            }
            .animate-slideUp {
              animation: slideUp 0.6s ease-out both;
            }
            .animate-progressBar {
              animation: progressBar 5s linear;
            }
          `}</style>
          </div>
        )
      }

    </div >
  );
}
