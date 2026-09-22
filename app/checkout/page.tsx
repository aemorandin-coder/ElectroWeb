'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Footer from '@/components/Footer';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';
import PublicHeader from '@/components/public/PublicHeader';
import CheckoutSteps from '@/components/ui/CheckoutSteps';
import PageHeader from '@/components/ui/PageHeader';
import RechargeModal from '@/components/modals/RechargeModalV2';
import CheckoutPagoMovilForm from '@/components/checkout/CheckoutPagoMovilForm';
import ProcessingOverlay, { CHECKOUT_STEPS } from '@/components/ProcessingOverlay';
import { FiCreditCard, FiDollarSign, FiPlus, FiCheck, FiUser, FiAlertCircle, FiArrowRight, FiLock, FiMapPin, FiPackage, FiTruck, FiInfo, FiCopy, FiCheckCircle, FiGift, FiShield } from 'react-icons/fi';
import { FaMobileScreen } from 'react-icons/fa6';
import { FaCheck } from 'react-icons/fa';
import { GIFT_CARD_PIN_LENGTH } from '@/lib/gift-card-pin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet } from '@fortawesome/free-solid-svg-icons';
import { formatUSD, formatVES } from '@/lib/currency';
import { adminCard, adminPrimaryButton, adminSecondaryButton, adminModalOverlay, adminModalPanel, adminModalHeader, adminModalTitle, adminModalBody, adminModalFooter, adminSpinner } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import DatosDelCliente from '@/components/checkout/DatosDelCliente';
import EntregaEnvio, { ENVIO_INICIAL, ResumenEnvio, envioParaServidor, validarEnvio, type EnvioForm } from '@/components/checkout/EntregaEnvio';
import { calculateOrder, toPricingSettings, type DeliveryMethod, type OrderCalculation, type PricingLine } from '@/lib/pricing';

type CheckoutCartItem = ReturnType<typeof useCart>['items'][number];

// Los productos digitales usan ids de carrito "productId-variante[-cuenta]" (C-60) o, en carritos
// guardados antes, "productId-monto[-usuario]": el servidor acepta ambos
function parseCartItemId(item: CheckoutCartItem): { productId: string; digitalAmount?: number; digitalVariantId?: string } {
  if (item.productType !== 'DIGITAL' || !item.id.includes('-')) return { productId: item.id };
  const [productId, amount] = item.id.split('-');
  if (item.digitalVariantId) return { productId, digitalVariantId: item.digitalVariantId };
  const digitalAmount = Number(amount);
  return Number.isFinite(digitalAmount) && digitalAmount > 0 ? { productId, digitalAmount } : { productId };
}

// Lo único que se envía al servidor por producto: el precio lo pone el servidor
function toOrderItem(item: CheckoutCartItem) {
  return {
    ...parseCartItemId(item),
    quantity: item.quantity,
    digitalUsername: item.digitalUsername,
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, getTotalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // C-85: el formulario de teléfono y cédula espera al perfil para no aparecer y desaparecer
  const [perfilCargado, setPerfilCargado] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'DIRECT' | 'WALLET' | null>(null);

  // Dynamic payment methods from database
  const [paymentMethods, setPaymentMethods] = useState<Array<{
    id: string;
    type: string;
    name: string;
    bankName?: string;
    phone?: string;
    holderId?: string;
    email?: string;
    walletAddress?: string;
    network?: string;
    displayNote?: string;
    qrCodeImage?: string;
    isActive: boolean;
  }>>([]);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerIdNumber: '',
    notes: '',
    paymentMethod: '' as string, // Dynamic from database
  });

  // Entrega (C-100): tipo, empresa, oficina o dirección y quién recibe
  const [envio, setEnvio] = useState<EnvioForm>(ENVIO_INICIAL);

  const [showTermsModal, setShowTermsModal] = useState(false);
  useBodyScrollLock(showTermsModal);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Direcciones guardadas: el bloque de entrega las ofrece para no escribirlas otra vez
  const [savedAddresses, setSavedAddresses] = useState<Array<{ address: string; city?: string; state?: string }>>([]);

  // Tooltip for client data warning
  const [showClientDataTooltip, setShowClientDataTooltip] = useState(false);

  // Notes section collapsible
  const [showNotesSection, setShowNotesSection] = useState(false);

  // Order completion tracking
  const [orderCompleted, setOrderCompleted] = useState(false);

  // Processing overlay state
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Active Discounts
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>([]);

  // Mobile Payment Verification State
  const [mobilePaymentVerified, setMobilePaymentVerified] = useState(false);
  const [mobilePaymentData, setMobilePaymentData] = useState<{
    referencia: string;
    telefonoPagador: string;
    bancoOrigen: string;
    fechaPago: string;
    cedulaPagador: string; // Agregado para trazabilidad
    comprobante?: string;
  } | null>(null);

  // Gift Card Redemption State
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardPin, setGiftCardPin] = useState('');
  const [giftCardRedeemed, setGiftCardRedeemed] = useState(false);
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [giftCardError, setGiftCardError] = useState('');
  const [giftCardInfo, setGiftCardInfo] = useState<{
    balanceUSD: number;
    status: string;
    requiresPin: boolean;
  } | null>(null);

  // Load company settings for exchange rates
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        setCompanySettings(data);
        // La primera forma de entrega disponible queda elegida de entrada (C-50b, C-100)
        const primera: DeliveryMethod | null = data?.deliveryEnabled !== false ? 'SHIPPING'
          : data?.localDeliveryEnabled ? 'LOCAL_DELIVERY'
            : data?.pickupEnabled ? 'PICKUP' : null;
        if (primera) setEnvio(prev => ({ ...prev, deliveryMethod: primera }));
      })
      .catch(err => console.error('Error loading settings:', err));

    // Load payment methods from database
    fetch('/api/customer/company-payment-methods')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPaymentMethods(data.filter((m: any) => m.isActive));
        }
      })
      .catch(err => console.error('Error loading payment methods:', err));
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
          setPerfilCargado(true);
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
                // Claves de antes de C-24: address o addressLine1
                setSavedAddresses(addresses
                  .map((a: { address?: string; addressLine1?: string; city?: string; state?: string }) => ({
                    address: a.address || a.addressLine1 || '', city: a.city, state: a.state,
                  }))
                  .filter((a: { address: string }) => a.address));
              }
            } catch (e) {
              console.error('Error parsing saved addresses', e);
            }
          }
        })
        .catch(() => setPerfilCargado(true));

      // Fetch active discounts
      fetch('/api/customer/discount-requests')
        .then(res => res.json())
        .then(data => {
          if (data.activeDiscounts) {
            setActiveDiscounts(data.activeDiscounts);
          }
        })
        .catch(err => console.error('Error loading discounts:', err));

      // Fetch user balance
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
        router.push('/registro?callbackUrl=%2Fcheckout');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  // Mismo cálculo que el servidor (lib/pricing.ts) con los datos del carrito, para mostrar al instante
  const pricingLines = useMemo<PricingLine[]>(() => items.map(item => {
    const { productId } = parseCartItemId(item);
    const activeDiscount = activeDiscounts.find(d =>
      d.productId === productId &&
      d.status === 'APPROVED' &&
      d.expiresAt &&
      new Date(d.expiresAt) > new Date()
    );

    return {
      productId,
      name: item.name,
      productType: item.productType === 'DIGITAL' ? 'DIGITAL' : 'PHYSICAL',
      unitPriceUSD: item.price,
      quantity: item.quantity,
      weightKg: item.weightKg ?? null,
      dimensions: item.dimensions ?? null,
      isConsolidable: item.isConsolidable !== false,
      shippingCostUSD: item.shippingCost || 0,
      freeShipping: item.productType !== 'DIGITAL' && item.freeShipping === true,
      discountPercent: activeDiscount ? (activeDiscount.approvedDiscount || activeDiscount.requestedDiscount) : 0,
    };
  }), [items, activeDiscounts]);

  const localCalculation = useMemo(
    () => calculateOrder(pricingLines, toPricingSettings(companySettings), envio.deliveryMethod),
    [pricingLines, companySettings, envio.deliveryMethod]
  );

  // Cotización del servidor: es lo que realmente se cobra (precios y pesos actualizados).
  // Se guarda con la clave del carrito para no mostrar una cotización vieja.
  const quoteBody = useMemo(
    () => JSON.stringify({ items: items.map(toOrderItem), deliveryMethod: envio.deliveryMethod }),
    [items, envio.deliveryMethod]
  );
  const [serverQuote, setServerQuote] = useState<{ key: string; calculation: OrderCalculation } | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || items.length === 0) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/orders/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: quoteBody,
        signal: controller.signal,
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.calculation) setServerQuote({ key: quoteBody, calculation: data.calculation });
        })
        .catch(() => { });
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quoteBody, status, items.length]);

  const orderCalculation = serverQuote?.key === quoteBody ? serverQuote.calculation : localCalculation;
  const cartSubtotal = orderCalculation.subtotalUSD;
  const cartDiscount = orderCalculation.discountUSD;
  const shippingBreakdown = orderCalculation.shipping;
  const finalTotal = orderCalculation.totalUSD;
  const hasPhysicalItems = items.some(item => item.productType !== 'DIGITAL');
  const orderItemsBody = useMemo(() => items.map(toOrderItem), [items]);
  const clienteEnvio = useMemo(
    () => ({ nombre: formData.customerName, cedula: formData.customerIdNumber, telefono: formData.customerPhone }),
    [formData.customerName, formData.customerIdNumber, formData.customerPhone]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!session?.user) {
      setError('Debes iniciar sesión para realizar un pedido');
      router.push('/login?callbackUrl=%2Fcheckout');
      return;
    }

    // Check if email is verified
    if (!(session.user as any).emailVerified) {
      setError('Debes verificar tu correo electrónico antes de realizar compras. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.');
      setLoading(false);
      return;
    }

    // C-85: teléfono y cédula se piden en la primera compra (el servidor también los exige)
    if (!formData.customerPhone || !formData.customerIdNumber) {
      setError('Completa tu teléfono y tu cédula antes de hacer el pedido.');
      setLoading(false);
      document.getElementById('datos-del-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // C-100: destino y quién recibe (el servidor lo vuelve a validar contra ZOOM y MRW)
    const problemaEnvio = hasPhysicalItems ? validarEnvio(envio, clienteEnvio) : null;
    if (problemaEnvio) {
      setError(problemaEnvio);
      setLoading(false);
      document.getElementById('entrega')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!paymentMode) {
      setError('Debes seleccionar un modo de pago');
      setLoading(false);
      return;
    }

    // If using Gift Card mode (DIRECT), user must have sufficient balance (from redeemed gift cards)
    // The gift card mode now just adds to wallet, so we use WALLET for payment
    if (paymentMode === 'DIRECT') {
      if (userBalance < finalTotal) {
        setError('Debes canjear una Gift Card para tener saldo suficiente, o usa "Usar Saldo / Recargar"');
        setLoading(false);
        return;
      }
    }

    // If wallet mode, check balance
    if (paymentMode === 'WALLET' && userBalance < finalTotal) {
      setError('Saldo insuficiente. Recarga tu saldo o canjea una Gift Card.');
      setLoading(false);
      return;
    }

    // Both modes now use WALLET payment method since gift cards add to wallet balance
    const finalPaymentMethod = 'WALLET';

    // Show processing overlay
    setShowProcessingOverlay(true);
    setProcessingStep(0);
    setProcessingError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // Los pasos avanzan con la respuesta real: antes el cliente esperaba 8 segundos de pausas simuladas
      setProcessingStep(1);

      // Una sola petición: el servidor recalcula precios, envío y total, y separa la orden
      // física de la digital. expectedTotalUSD solo evita cobrar un total distinto al que se ve.
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItemsBody,
          deliveryMethod: envio.deliveryMethod,
          shipping: hasPhysicalItems ? envioParaServidor(envio, clienteEnvio) : undefined,
          paymentMethod: finalPaymentMethod,
          mobilePaymentData: mobilePaymentData || null,
          notes: formData.notes,
          expectedTotalUSD: finalTotal,
        }),
      });

      const orderData = await orderResponse.json().catch(() => ({}));

      if (!orderResponse.ok) {
        if (orderResponse.status === 409 && orderData.calculation) {
          setServerQuote({ key: quoteBody, calculation: orderData.calculation });
        }
        throw new Error(orderData.details?.join(' ') || orderData.error || 'Error al crear la orden');
      }

      const createdOrders: Array<{ orderNumber: string }> = orderData.orders || [];
      setProcessingStep(3);

      // Dirección nueva de un envío a domicilio o delivery: se guarda en el perfil para la próxima compra
      const conDireccion = envio.deliveryMethod === 'LOCAL_DELIVERY' || (envio.deliveryMethod === 'SHIPPING' && envio.mode === 'DOOR');
      const direccion = envio.address.trim();
      if (hasPhysicalItems && conDireccion && direccion && !savedAddresses.some(a => a.address.trim() === direccion)) {
        await saveAddressToProfile({
          address: direccion,
          city: envio.deliveryMethod === 'LOCAL_DELIVERY' ? 'Guanare' : envio.city,
          state: envio.deliveryMethod === 'LOCAL_DELIVERY' ? 'Portuguesa' : envio.state,
        });
      }

      setProcessingStep(4);

      // Mark order as completed BEFORE clearing cart
      setOrderCompleted(true);

      // Un momento para ver la compra completada antes de ir a la confirmación
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Now clear cart and redirect to success page
      clearCart();
      setShowProcessingOverlay(false);

      // Build success URL with order data as query params
      const orderNumbers = createdOrders.map(o => o.orderNumber).join(',');
      const total = Number(orderData.totalUSD ?? finalTotal).toFixed(2);
      router.push(`/checkout/success?orders=${encodeURIComponent(orderNumbers)}&total=${total}`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setProcessingError(errorMsg);
      setError(errorMsg);

      // Hide overlay after showing error
      setTimeout(() => {
        setShowProcessingOverlay(false);
        setProcessingError(null);
      }, 3000);
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

  // Mismo formato que el resto de la tienda ("$1.200,00"). Antes: "USD 1.200,00$" (revisión R12)
  const formatPrice = (price: number) => formatUSD(price);

  // Guarda la dirección en el perfil
  const saveAddressToProfile = async (addressData: { address: string; city: string; state: string }) => {
    try {
      const response = await fetch('/api/user/profile/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressData.address,
          city: addressData.city,
          state: addressData.state,
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

  // Handle Gift Card code input formatting
  const handleGiftCardCodeChange = (value: string) => {
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += cleaned.substring(0, 4);
      if (cleaned.length > 4) {
        formatted += '-' + cleaned.substring(4, 8);
        if (cleaned.length > 8) {
          formatted += '-' + cleaned.substring(8, 12);
          if (cleaned.length > 12) {
            formatted += '-' + cleaned.substring(12, 16);
          }
        }
      }
    }
    setGiftCardCode(formatted);
    setGiftCardError('');
    setGiftCardInfo(null);
  };

  // Check Gift Card Balance
  const handleCheckGiftCard = async () => {
    if (giftCardCode.length < 19) {
      setGiftCardError('Ingresa un código completo');
      return;
    }
    setGiftCardLoading(true);
    setGiftCardError('');
    setGiftCardInfo(null);

    try {
      // Add minimum 3 second delay for loading animation
      const [response] = await Promise.all([
        fetch(`/api/gift-cards/redeem?code=${giftCardCode}`),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);

      const data = await response.json();
      if (!response.ok) {
        setGiftCardError(data.error || 'Gift Card no válida');
        setGiftCardInfo(null);
      } else if (!data.isValid) {
        setGiftCardError(data.message || 'Esta Gift Card no está disponible');
        setGiftCardInfo(null);
      } else {
        setGiftCardInfo({
          balanceUSD: Number(data.balanceUSD) || 0,
          status: data.status,
          requiresPin: Boolean(data.requiresPin)
        });
      }
    } catch (err) {
      setGiftCardError('Error al verificar la Gift Card');
    } finally {
      setGiftCardLoading(false);
    }
  };

  // Redeem Gift Card
  const handleRedeemGiftCard = async () => {
    if (!giftCardInfo || Number(giftCardInfo.balanceUSD) <= 0) {
      setGiftCardError('Esta Gift Card no tiene saldo disponible');
      return;
    }
    setGiftCardLoading(true);
    setGiftCardError('');
    try {
      const response = await fetch('/api/gift-cards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardCode, pin: giftCardPin })
      });
      const data = await response.json();
      if (!response.ok) {
        setGiftCardError(data.error || 'Error al canjear la Gift Card');
      } else {
        setGiftCardRedeemed(true);
        // Update user balance
        const newBalance = userBalance + (data.amountRedeemed || 0);
        setUserBalance(newBalance);
        // Auto switch to WALLET payment mode
        setPaymentMode('WALLET');
        // Clear gift card form for potential additional redemption
        setGiftCardCode('');
        setGiftCardPin('');
        setGiftCardInfo(null);
      }
    } catch (err) {
      setGiftCardError('Error al canjear la Gift Card');
    } finally {
      setGiftCardLoading(false);
    }
  };

  // Show loading while checking authentication to prevent flash
  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-3">
          <div className={adminSpinner} />
          <p className="text-sm font-medium text-muted">Cargando...</p>
        </div>
      </div>
    );
  }


  // Show processing overlay when order is being processed (handled by component at bottom)

  // Only show empty cart if not processing and not completed
  if (items.length === 0 && !showProcessingOverlay && !orderCompleted) {
    return (
      <div className="min-h-dvh bg-surface flex flex-col">
        <PublicHeader />

        {/* Empty Cart Message */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
          <div className={`${adminCard} p-12 text-center max-w-xl mx-auto my-8`}>
            <svg className="w-16 h-16 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-ink mb-2">Tu carrito está vacío</h2>
            <p className="text-sm text-muted mb-6">
              Agrega productos a tu carrito para continuar con el proceso de pago.
            </p>
            <Link
              href="/productos"
              className={adminPrimaryButton}
            >
              Ver productos
            </Link>
          </div>
        </main>

        {/* Keep overlay available even in empty cart state during processing */}
        <ProcessingOverlay
          isVisible={showProcessingOverlay}
          currentStep={processingStep}
          steps={CHECKOUT_STEPS}
          error={processingError}
          title="Procesando tu pedido"
          subtitle="Por favor espera un momento..."
          logoUrl={companySettings?.logo}
        />
      </div>
    );
  }

  // Show redirect message IMMEDIATELY if not authenticated (check status directly)
  if (status === 'unauthenticated' || showRedirectMessage) {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center px-4">
        <div className={`${adminCard} max-w-md w-full p-8 text-center`}>
          <div className="w-16 h-16 mx-auto mb-4 bg-brand-500/10 rounded-full flex items-center justify-center border border-brand-500/20">
            <FiUser className="w-8 h-8 text-brand-600" />
          </div>

          <h2 className="text-2xl font-bold text-ink mb-2">
            ¡Un momento!
          </h2>

          <div className="flex items-center justify-center gap-2 mb-3">
            <FiAlertCircle className="w-4 h-4 text-brand-600" />
            <p className="text-sm font-semibold text-ink">
              No tienes cuenta creada
            </p>
          </div>

          <p className="text-sm text-muted mb-6 leading-relaxed">
            Crea una y luego te regresamos a tu compra.
          </p>

          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-surface rounded-xl border border-line">
            <div className={adminSpinner} style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }} />
            <p className="text-sm text-muted font-medium">
              Redirigiendo al registro en segundos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface flex flex-col">
      <PublicHeader />

      <PageHeader
        breadcrumbs={[{ label: 'Carrito', href: '/carrito' }, { label: 'Finalizar compra' }]}
        icon={<FiLock />}
        title="Finalizar compra"
        description="Completa tus datos para procesar tu pedido."
        meta={<CheckoutSteps current={1} />}
      />

      {/* Main Content - Wider for Desktop */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-deal-bg border border-deal/30 rounded-lg">
                  <div className="flex items-center gap-2 text-deal">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {session?.user && perfilCargado && (
                <DatosDelCliente
                  telefono={formData.customerPhone}
                  cedula={formData.customerIdNumber}
                  onGuardado={({ telefono, cedula }) => {
                    setFormData((prev) => ({ ...prev, customerPhone: telefono, customerIdNumber: cedula }));
                    setError('');
                  }}
                />
              )}

              {/* Entrega (C-100): ZOOM o MRW con cobro a destino, delivery en Guanare o retiro */}
              {hasPhysicalItems && (
                <EntregaEnvio
                  value={envio}
                  onChange={setEnvio}
                  opciones={{
                    nacional: companySettings?.deliveryEnabled !== false,
                    local: companySettings?.localDeliveryEnabled === true,
                    retiro: companySettings?.pickupEnabled === true,
                    tarifaLocal: Number(companySettings?.deliveryFeeUSD) || 0,
                    retiroDireccion: companySettings?.pickupAddress,
                    retiroInstrucciones: companySettings?.pickupInstructions,
                    tasaVES: Number(companySettings?.exchangeRateVES) || 0,
                  }}
                  cliente={clienteEnvio}
                  envio={shippingBreakdown}
                  items={orderItemsBody}
                  direcciones={savedAddresses}
                />
              )}

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-md border border-line p-6 relative overflow-hidden">
                <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  Método de Pago
                </h2>

                {/* Email Verification Backdrop */}
                {session?.user && !(session.user as any).emailVerified && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 rounded-lg overflow-auto p-4">
                    <div className="text-center w-full max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-warning-strong rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-bold text-ink mb-1">Verificación requerida</h3>
                      <p className="text-xs text-muted mb-3">
                        Debes verificar tu correo electrónico antes de continuar.
                      </p>
                      <p className="text-xs text-warning-strong font-medium mb-4 bg-warning/10 p-2 rounded-lg border border-warning/30">
                        Revisa tu bandeja de entrada
                      </p>
                      <Link
                        href="/customer/settings"
                        className={`inline-flex items-center justify-center gap-2 ${adminPrimaryButton} px-5 py-2 text-xs font-bold`}
                      >
                        <FiUser className="w-4 h-4" />
                        Ir a Mi Cuenta
                      </Link>
                    </div>
                  </div>
                )}

                {/* Payment Mode Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMode(paymentMode === 'DIRECT' ? null : 'DIRECT')}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left group overflow-hidden ${paymentMode === 'DIRECT'
                      ? 'border-brand-500 bg-brand-500/5 shadow-sm'
                      : 'border-line bg-white hover:border-brand-500/50 hover:bg-surface'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${paymentMode === 'DIRECT'
                      ? 'bg-brand-500 text-white'
                      : 'bg-brand-500/10 text-brand-600'
                      }`}>
                      <FiGift className="w-6 h-6" />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${paymentMode === 'DIRECT' ? 'text-brand-600' : 'text-ink'}`}>
                      Canjear Gift Card
                    </h3>
                    <p className="text-sm text-muted">
                      Usa una Gift Card para agregar saldo a tu cuenta
                    </p>
                    {paymentMode === 'DIRECT' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
                        <FiCheck className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode(paymentMode === 'WALLET' ? null : 'WALLET')}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left group overflow-hidden ${paymentMode === 'WALLET'
                      ? 'border-brand-500 bg-brand-500/5 shadow-sm'
                      : 'border-line bg-white hover:border-brand-500/50 hover:bg-surface'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${paymentMode === 'WALLET'
                      ? 'bg-brand-500 text-white'
                      : 'bg-brand-500/10 text-brand-600'
                      }`}
                    >
                      <FontAwesomeIcon icon={faWallet} className="w-6 h-6" />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${paymentMode === 'WALLET' ? 'text-brand-600' : 'text-ink'}`}>
                      Usar Saldo / Recargar
                    </h3>
                    <p className="text-sm text-muted">
                      Paga con tu saldo disponible en la plataforma
                    </p>
                    {paymentMode === 'WALLET' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
                        <FiCheck className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Gift Card Redemption Section */}
                {paymentMode === 'DIRECT' && (
                  <div className="bg-surface rounded-2xl p-6 border border-line shadow-sm overflow-hidden relative">

                    <div className="relative">
                      {/* Code Input */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-ink mb-2">
                            Código de Gift Card
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={giftCardCode}
                              onChange={(e) => handleGiftCardCodeChange(e.target.value)}
                              maxLength={19}
                              className="w-full px-4 py-4 text-center text-xl font-mono font-bold tracking-widest border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all uppercase"
                              placeholder="ESMC-XXXX-XXXX-XXXX"
                            />
                            {giftCardCode.length === 19 && !giftCardInfo && (
                              <button
                                type="button"
                                onClick={handleCheckGiftCard}
                                disabled={giftCardLoading}
                                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2 md:px-4 md:py-2 bg-warning text-white text-sm font-bold rounded-lg hover:bg-warning-strong transition-all disabled:opacity-70 disabled:cursor-wait"
                              >
                                {giftCardLoading ? (
                                  <span className="flex items-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="hidden md:inline">Verificando...</span>
                                  </span>
                                ) : (
                                  <>
                                    <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span className="hidden md:inline">Verificar</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Error Message */}
                        {giftCardError && (
                          <div className="flex flex-col items-center justify-center gap-2 p-4 bg-deal-bg border border-deal/30 rounded-xl text-deal">
                            <div className="w-10 h-10 bg-deal text-white rounded-full flex items-center justify-center">
                              <FiAlertCircle className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-sm text-center">{giftCardError}</span>
                            <p className="text-xs text-deal/80 text-center">Verifica el código e intenta de nuevo</p>
                          </div>
                        )}

                        {/* Gift Card Info */}
                        {giftCardInfo && (
                          <div className="animate-fadeIn space-y-4">
                            {/* Balance Display */}
                            <div className={`p-6 rounded-xl border-2 ${giftCardInfo.status === 'ACTIVE' && giftCardInfo.balanceUSD > 0
                              ? 'bg-success/5 border-success/30'
                              : 'bg-surface border-line-strong'}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted">Estado</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${giftCardInfo.status === 'ACTIVE'
                                  ? 'bg-success-strong text-white'
                                  : 'bg-subtle text-white'}`}
                                >
                                  {giftCardInfo.status === 'ACTIVE' ? 'Activa' : giftCardInfo.status === 'DEPLETED' ? 'Sin saldo' : giftCardInfo.status}
                                </span>
                              </div>
                              <div className="text-center py-4">
                                <p className="text-sm text-muted mb-1">Saldo disponible</p>
                                <p className="text-3xl font-bold text-ink">
                                  {formatUSD(giftCardInfo.balanceUSD)}
                                </p>
                                <p className="text-sm text-muted">USD</p>
                              </div>
                            </div>

                            {/* PIN: solo tarjetas impresas (C-71) */}
                            {giftCardInfo.status === 'ACTIVE' && giftCardInfo.balanceUSD > 0 && giftCardInfo.requiresPin && (
                              <div>
                                <label className="block text-sm font-semibold text-ink mb-2">
                                  <FiLock className="inline w-4 h-4 mr-1" />
                                  PIN de la tarjeta
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={giftCardPin}
                                  onChange={(e) => setGiftCardPin(e.target.value.replace(/\D/g, '').slice(0, GIFT_CARD_PIN_LENGTH))}
                                  maxLength={GIFT_CARD_PIN_LENGTH}
                                  className="w-full px-4 py-3 text-center text-lg font-mono font-bold tracking-[0.5em] border border-line rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                  placeholder="••••••"
                                />
                              </div>
                            )}

                            {/* Redeem Button */}
                            {giftCardInfo.status === 'ACTIVE' && giftCardInfo.balanceUSD > 0 && (
                              <button
                                type="button"
                                onClick={handleRedeemGiftCard}
                                disabled={giftCardLoading}
                                className={`w-full ${adminPrimaryButton} py-3 text-base font-bold justify-center gap-2 disabled:opacity-50`}
                              >
                                {giftCardLoading ? (
                                  <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Canjeando...
                                  </>
                                ) : (
                                  <>
                                    <FiGift className="w-5 h-5" />
                                    Canjear {formatUSD(giftCardInfo.balanceUSD)}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Success Message - shows after redemption */}
                        {giftCardRedeemed && (
                          <div className="bg-surface rounded-2xl p-6 border border-line shadow-sm overflow-hidden relative">
                            {/* Main Content */}
                            <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="w-20 h-20 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success-strong flex-shrink-0">
                                <FiCheck className="w-10 h-10" />
                              </div>

                              {/* Balance Info */}
                              <div className="flex-1 text-center md:text-left">
                                <p className="text-sm text-muted mb-1">Tu saldo disponible</p>
                                <p className="text-3xl font-bold text-ink mb-3">
                                  {formatUSD(userBalance)}
                                </p>

                                {/* Saldo suficiente badge */}
                                {userBalance >= finalTotal && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/15 text-success-strong text-xs font-bold rounded-full mb-3">
                                    <FiCheck className="w-3.5 h-3.5" />
                                    Saldo suficiente
                                  </span>
                                )}

                                {/* Order details */}
                                <div className="space-y-1.5 mt-3">
                                  <div className="flex items-center justify-center md:justify-start gap-2 text-sm">
                                    <FiPackage className="w-4 h-4 text-muted" />
                                    <span className="text-muted">Total del pedido:</span>
                                    <span className="font-bold text-ink">{formatUSD(finalTotal)}</span>
                                  </div>
                                  {userBalance >= finalTotal && (
                                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm">
                                      <FiDollarSign className="w-4 h-4 text-success-strong" />
                                      <span className="text-muted">Saldo restante después de la compra:</span>
                                      <span className="font-bold text-success-strong">{formatUSD(userBalance - finalTotal)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Listo para pagar */}
                            <div className="mt-6 p-4 bg-white rounded-xl border border-line text-center">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="w-10 h-10 bg-success-strong rounded-full flex items-center justify-center text-white">
                                  <FiCheck className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-ink">¡Gift Card canjeada!</p>
                                  <p className="text-sm text-muted">El saldo se ha agregado a tu cuenta</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Help text */}
                        <p className="text-xs text-muted text-center">
                          El código está en el email de confirmación o en el reverso de la tarjeta
                        </p>

                        {/* Link to buy gift card */}
                        <div className="pt-4 border-t border-line text-center">
                          <p className="text-sm text-muted mb-2">¿No tienes una Gift Card?</p>
                          <Link
                            href="/gift-cards"
                            className={`inline-flex items-center gap-2 ${adminSecondaryButton} px-4 py-2 text-sm font-semibold`}
                          >
                            <FiGift className="w-4 h-4" />
                            Comprar Gift Card
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wallet Payment Options - Premium Circle Progress Design */}
                {paymentMode === 'WALLET' && (
                  <div className="bg-surface rounded-2xl p-6 border border-line shadow-sm overflow-hidden relative">
                    {/* Main Content - Circle + Info */}
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative flex-shrink-0">

                        <svg className="w-36 h-36 transform -rotate-90 relative z-10" viewBox="0 0 100 100">
                          {/* Background circle with subtle gradient */}
                          <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#2a63cd" />
                              <stop offset="100%" stopColor="#1e4ba3" />
                            </linearGradient>
                          </defs>
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="#e9ecef"
                            strokeWidth="8"
                          />
                          {/* Progress circle with gradient and animation */}
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="url(#progressGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${Math.min((userBalance / finalTotal) * 264, 264)} 264`}
                            className="transition-all duration-1000 ease-out"
                            style={{
                              filter: 'drop-shadow(0 0 8px rgba(42, 99, 205, 0.4))'
                            }}
                          />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all duration-500 bg-brand-500/10 text-brand-600">
                            {userBalance >= finalTotal ? (
                              <FiCheckCircle className="w-6 h-6" />
                            ) : (
                              <FontAwesomeIcon icon={faWallet} className="w-5 h-5" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-brand-500">
                            {Math.min(Math.round((userBalance / finalTotal) * 100), 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Balance Info */}
                      <div className="flex-1 text-center md:text-left">
                        <p className="text-sm text-muted font-medium mb-1">Tu saldo disponible</p>
                        <p className="text-4xl font-bold text-ink mb-3 tracking-tight">
                          {formatPrice(userBalance)}
                        </p>

                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${userBalance >= finalTotal
                          ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                          : 'bg-warning/10 text-warning-strong border border-warning/30'
                          }`}>
                          {userBalance >= finalTotal ? (
                            <>
                              <FiCheck className="w-4 h-4" />
                              Saldo suficiente
                            </>
                          ) : (
                            <>
                              <FiAlertCircle className="w-4 h-4" />
                              Faltan {formatPrice(finalTotal - userBalance)}
                            </>
                          )}
                        </div>

                        {/* Order Total & Remaining Balance */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted">
                            <FiPackage className="w-4 h-4" />
                            <span>Total del pedido: <strong className="text-ink">{formatPrice(finalTotal)}</strong></span>
                          </div>
                          {userBalance >= finalTotal && (
                            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-brand-500 font-medium animate-fadeIn">
                              <FiDollarSign className="w-4 h-4" />
                              <span>Saldo restante después de la compra: <strong className="text-ink">{formatPrice(userBalance - finalTotal)}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Section */}
                    {userBalance < finalTotal ? (
                      <div className="relative mt-6 pt-6 border-t border-line">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <p className="text-sm text-muted">
                            Recarga tu saldo para completar esta compra
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowRechargeModal(true)}
                            className={`inline-flex items-center gap-2 ${adminPrimaryButton} px-5 py-2.5 font-bold`}
                          >
                            <FiPlus className="w-5 h-5" />
                            Recargar Saldo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative mt-6 pt-6 border-t border-line">
                        <div className="flex items-center gap-4 p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center flex-shrink-0">
                            <FaCheck className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-brand-500 text-lg">Listo para pagar</p>
                            <p className="text-sm text-muted">
                              Tu saldo cubre el total. Completa el pedido ahora.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes - Collapsible */}
              <div className="bg-white rounded-lg shadow-md border border-line overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowNotesSection(!showNotesSection)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface transition-colors"
                >
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    Notas Adicionales
                    <span className="text-xs text-muted font-normal">(Opcional)</span>
                  </h2>
                  <svg className={`w-5 h-5 text-muted transition-transform duration-200 ${showNotesSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showNotesSection && (
                  <div className="px-5 pb-5 animate-fadeIn">
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm resize-none"
                      placeholder="Instrucciones especiales de entrega, preferencias de horario, etc."
                    />
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="bg-white rounded-xl shadow-lg border border-line p-6 animate-fadeIn animation-delay-300">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-5 h-5 mt-1 text-brand-500 rounded focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  />
                  <label htmlFor="acceptTerms" className="flex-1 text-sm text-ink leading-relaxed cursor-pointer">
                    Acepto los{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-brand-500 hover:underline font-bold"
                    >
                      términos y condiciones
                    </button>
                    . Confirmo que la información de envío es correcta y entiendo que{' '}
                    <strong className="font-bold text-warning-strong">
                      la empresa no se hace responsable por datos errados ingresados por el usuario
                    </strong>
                    .
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !acceptedTerms || (paymentMode === 'WALLET' && userBalance < finalTotal) || (paymentMode === 'DIRECT' && formData.paymentMethod === 'MOBILE_PAYMENT' && !mobilePaymentVerified)}
                className={`w-full flex items-center justify-center gap-2 ${adminPrimaryButton} py-3.5 text-base font-bold disabled:opacity-50`}
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
                <p className="text-center text-xs text-deal -mt-2">
                  Debes aceptar los términos y condiciones para continuar
                </p>
              )}
              {paymentMode === 'DIRECT' && formData.paymentMethod === 'MOBILE_PAYMENT' && !mobilePaymentVerified && (
                <p className="text-center text-xs text-warning-strong -mt-2 flex items-center justify-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  Debes verificar tu pago móvil antes de continuar
                </p>
              )}
            </form>
          </div>

          {/* Order Summary - Premium Design matching Cart */}
          <div className="lg:col-span-1 space-y-5">
            <div className="sticky top-24 space-y-5">
              {/* Contact Information - Compact Version */}
              <div className={`${adminCard} shadow-sm p-5 space-y-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600">
                      <FiUser className="w-4 h-4 text-white" />
                    </div>
                    Información de Contacto
                  </h2>
                  {(session?.user as any)?.emailVerified && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-success/15 border border-success/30 rounded-full">
                      <FiCheckCircle className="w-3 h-3 text-success-strong" />
                      <span className="text-xs font-bold text-success-strong">Verificado</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-1">Nombre</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-line rounded-lg">
                      <FiLock className="w-3.5 h-3.5 text-muted" />
                      <span className="text-sm text-ink font-medium truncate">{formData.customerName}</span>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-1">Email</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-line rounded-lg">
                      <FiLock className="w-3.5 h-3.5 text-muted" />
                      <span className="text-sm text-ink font-medium truncate">{formData.customerEmail}</span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-1">Teléfono</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-line rounded-lg">
                      <FiLock className="w-3.5 h-3.5 text-muted" />
                      <span className="text-sm text-ink font-medium">{formData.customerPhone || 'No registrado'}</span>
                    </div>
                  </div>

                  {/* ID */}
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-1">Cédula</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-line rounded-lg">
                      <FiLock className="w-3.5 h-3.5 text-muted" />
                      <span className="text-sm text-ink font-medium">{formData.customerIdNumber || 'No registrado'}</span>
                    </div>
                  </div>
                </div>

                {/* Edit Profile Link */}
                <div className="mt-4 pt-3 border-t border-line">
                  <Link
                    href="/customer/profile"
                    className="flex items-center justify-center gap-2 text-xs text-brand-500 hover:text-brand-600 font-semibold transition-colors"
                  >
                    <FiInfo className="w-3.5 h-3.5" />
                    Editar datos en mi perfil
                  </Link>
                </div>
              </div>

              {/* Summary Card */}
              <div className="relative bg-white rounded-2xl border border-line overflow-hidden shadow-xl animate-slideUp">
                {/* Header - Same style as other sections */}
                <div className="px-6 py-4 border-b border-line">
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    Resumen del Pedido
                  </h2>
                </div>

                <div className="p-6">
                  {/* Products List */}
                  <div className="space-y-3 mb-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-line">
                    {items.map((item) => {
                      const originalTotal = item.price * item.quantity;
                      const activeDiscount = activeDiscounts.find(d =>
                        d.productId === item.id &&
                        d.status === 'APPROVED' &&
                        d.expiresAt &&
                        new Date(d.expiresAt) > new Date()
                      );
                      const discountVal = activeDiscount ? (activeDiscount.approvedDiscount || activeDiscount.requestedDiscount) : 0;
                      const finalItemTotal = activeDiscount ? originalTotal * (1 - discountVal / 100) : originalTotal;

                      return (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface transition-colors">
                          <div className="relative flex-shrink-0 w-14 h-14 bg-surface rounded-xl border border-line overflow-hidden">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill sizes="56px"
                                unoptimized={!item.imageUrl.startsWith('/')}
                                className="object-contain p-1"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-line" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-ink line-clamp-1">
                              {item.name}
                            </h4>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted font-medium">x{item.quantity}</span>
                              <div className="text-right">
                                {activeDiscount ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-subtle line-through">{formatPrice(originalTotal)}</span>
                                    <span className="text-sm font-bold text-success-strong">{formatPrice(finalItemTotal)}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold text-ink">{formatPrice(originalTotal)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-line my-4"></div>

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-sm">Subtotal:</span>
                      <div className="text-right">
                        <span className="text-base font-bold text-ink">{formatUSD(cartSubtotal)}</span>
                        {companySettings?.exchangeRateVES && (
                          <div className="text-xs text-brand-500 font-medium">
                            {formatVES(cartSubtotal * Number(companySettings.exchangeRateVES))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Discount */}
                    {cartDiscount > 0 && (
                      <div className="flex justify-between items-center animate-pulse">
                        <span className="text-success-strong flex items-center gap-1 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          Descuento:
                        </span>
                        <div className="text-right">
                          <span className="text-base font-bold text-success-strong">-{formatUSD(cartDiscount)}</span>
                          {companySettings?.exchangeRateVES && (
                            <div className="text-xs text-success font-medium">
                              -{formatVES(cartDiscount * Number(companySettings.exchangeRateVES))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Envío (C-100) */}
                    <ResumenEnvio envio={shippingBreakdown} form={envio} tasaVES={Number(companySettings?.exchangeRateVES) || 0} />

                    {/* Total - Premium Style */}
                    <div className="pt-4 border-t-2 border-dashed border-line">
                      <div className="flex justify-between items-start">
                        <span className="text-lg font-bold text-ink">Total:</span>
                        <div className="text-right">
                          <span className="text-3xl font-bold text-ink">{formatUSD(finalTotal)}</span>
                          {companySettings?.exchangeRateVES && (
                            <div className="mt-1 px-3 py-1 bg-brand-500/10 rounded-lg inline-block">
                              <span className="text-sm font-bold text-brand-500">
                                {formatVES(finalTotal * Number(companySettings.exchangeRateVES))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Exchange Rate Note */}
                    {companySettings?.exchangeRateVES && (
                      <div className="text-xs text-muted text-center pt-2">
                        Tasa de cambio: 1 USD = {formatVES(Number(companySettings.exchangeRateVES))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Continue Shopping Link */}
                <div className="px-6 pb-6">
                  <Link
                    href="/productos"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-surface text-ink font-semibold rounded-xl hover:bg-line border border-line transition-all text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Seguir Comprando
                  </Link>
                </div>
              </div>

              {/* Trust Badges */}
              <div className={`${adminCard} shadow-sm p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Envíos Asegurados</h3>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-warning/10 text-warning-strong border border-warning/20 rounded text-[11px] font-bold">ZOOM</span>
                    <span className="px-2 py-0.5 bg-deal-bg text-deal border border-deal/20 rounded text-[11px] font-bold">MRW</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-xs text-muted">
                    <div className="w-7 h-7 bg-brand-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiTruck className="w-3.5 h-3.5 text-brand-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">Despacho Nacional Garantizado</p>
                      <p className="text-muted">Envíos Rápidos y Seguros a nivel nacional por ZOOM y MRW.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 text-xs text-muted">
                    <div className="w-7 h-7 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiShield className="w-3.5 h-3.5 text-success-strong" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">Protección del Comprador</p>
                      <p className="text-muted">Tu compra viaja 100% asegurada y embalada con materiales de alta resistencia.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <RechargeModal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        onSuccess={fetchBalance}
      />

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className={adminModalOverlay}>
          <div className={`${adminModalPanel} max-w-2xl`}>
            {/* Header */}
            <div className={adminModalHeader}>
              <h2 className={adminModalTitle}>Términos y Condiciones</h2>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 text-muted hover:text-ink rounded-lg transition-colors"
                aria-label="Cerrar modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className={`${adminModalBody} space-y-6 text-sm text-ink`}>
              {/* Critical Warning */}
              <div className="p-4 bg-warning/10 border-l-4 border-warning-strong rounded-r-xl">
                <h3 className="font-bold text-ink mb-2 flex items-center gap-2">
                  <FiAlertCircle className="w-5 h-5 text-warning-strong" />
                  Responsabilidad del Usuario
                </h3>
                <p className="text-ink-soft leading-relaxed">
                  <strong>IMPORTANTE:</strong> El usuario es completamente responsable de verificar que todos los datos de envío (dirección, ciudad, estado, oficina de encomienda, etc.) sean correctos antes de completar su pedido.
                </p>
                <p className="text-ink mt-2 leading-relaxed font-bold">
                  Electro Shop Morandin C.A. NO SE HACE RESPONSABLE por pérdidas, retrasos o costos adicionales derivados de datos errados ingresados por el usuario.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-base mb-2">1. Información General</h3>
                <p className="leading-relaxed text-ink-soft">
                  Al realizar una compra en Electro Shop Morandin C.A., usted acepta estos términos y condiciones en su totalidad. Por favor, léalos cuidadosamente antes de completar su pedido.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-base mb-2">2. Datos de Envío</h3>
                <ul className="list-disc ml-6 space-y-2 text-ink-soft">
                  <li>Es responsabilidad del cliente proporcionar una dirección de envío completa y correcta.</li>
                  <li>Los datos de contacto (nombre, email, teléfono) provienen de su registro y son verificados.</li>
                  <li>Si selecciona envío a oficina de encomienda (ZOOM o MRW), debe proporcionar el código correcto de la oficina o casillero.</li>
                  <li>La empresa NO corregirá datos errados después de que el pedido haya sido procesado.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-2">3. Envíos mediante ZOOM y MRW</h3>
                <ul className="list-disc ml-6 space-y-2 text-ink-soft">
                  <li>Los pedidos se envían mediante las empresas certificadas ZOOM o MRW según la selección del cliente.</li>
                  <li>El cliente debe proporcionar un código de oficina válido o número de casillero.</li>
                  <li>Para retirar el paquete, debe presentar cédula de identidad.</li>
                  <li>El tiempo de entrega depende de la empresa de encomienda seleccionada.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-2">4. Limitación de Responsabilidad</h3>
                <ul className="list-disc ml-6 space-y-2 text-ink-soft">
                  <li>La empresa no se hace responsable de direcciones incorrectas o incompletas proporcionadas por el usuario.</li>
                  <li>No se procesan reembolsos por entregas fallidas debido a datos incorrectos del cliente.</li>
                  <li>Los costos adicionales de reenvío por datos incorrectos serán asumidos por el cliente.</li>
                  <li>La empresa verificará la identidad del destinatario al momento de la entrega.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-2">5. Métodos de Pago</h3>
                <p className="leading-relaxed text-ink-soft">
                  Aceptamos transferencias bancarias, pago móvil, criptomonedas y saldo de billetera. Los pedidos se procesan una vez confirmado el pago.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-base mb-2">6. Política de Cambios y Devoluciones</h3>
                <p className="leading-relaxed text-ink-soft">
                  Consulte nuestra política de cambios y devoluciones. No se aceptan devoluciones por datos de envío incorrectos proporcionados por el cliente.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className={adminModalFooter}>
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className={`w-full sm:w-auto ${adminPrimaryButton}`}
              >
                Aceptar y Continuar
              </button>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className={`w-full sm:w-auto ${adminSecondaryButton}`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay - Reusable component */}
      <ProcessingOverlay
        isVisible={showProcessingOverlay}
        currentStep={processingStep}
        steps={CHECKOUT_STEPS}
        error={processingError}
        title="Procesando tu pedido"
        subtitle="Por favor espera un momento..."
        logoUrl={companySettings?.logo}
      />

    </div>
  );
}
