'use client';

import { useState, useEffect, useMemo } from 'react';
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
import CheckoutPagoMovilForm, { conciliarPagos, type PagoMovilVerificado } from '@/components/checkout/CheckoutPagoMovilForm';
import { montoBs } from '@/lib/pago-movil/monto';
import ProcessingOverlay, { CHECKOUT_STEPS } from '@/components/ProcessingOverlay';
import { FiDollarSign, FiCheck, FiUser, FiAlertCircle, FiArrowRight, FiLock, FiPackage, FiInfo, FiCheckCircle, FiGift, FiShield, FiAlertTriangle } from 'react-icons/fi';
import { GIFT_CARD_PIN_LENGTH } from '@/lib/gift-card-pin';
import PaymentMethodSelector, { opcionesDePago, type MetodoCheckout, type MetodoPagoEmpresa } from '@/components/checkout/PaymentMethodSelector';
import PagoManualPanel from '@/components/checkout/PagoManualPanel';
import PagoPuntosPanel from '@/components/checkout/PagoPuntosPanel';
import { esPagoManual, leerReferenciaManual, repartirPuntos, type TipoPagoManual } from '@/lib/checkout-pago';
import { formatPuntos, formatUSD, formatVES } from '@/lib/currency';
import { adminCard, adminNotice, adminPrimaryButton, adminSecondaryButton, adminModalOverlay, adminModalPanel, adminModalHeader, adminModalTitle, adminModalBody, adminModalFooter, adminSpinner } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import DatosDelCliente from '@/components/checkout/DatosDelCliente';
import EntregaEnvio, { ENVIO_INICIAL, ResumenEnvio, envioDesdeDireccion, envioParaServidor, validarEnvio, type DireccionGuardada, type EnvioForm } from '@/components/checkout/EntregaEnvio';
import { ConfianzaEnvio } from '@/components/envios/ConfianzaEnvio';
import { calculateOrder, toPricingSettings, type DeliveryMethod, type OrderCalculation, type PricingLine } from '@/lib/pricing';

import { parseCartItemId, toOrderItem } from '@/lib/cart-items';
import CouponBox from '@/components/cart/CouponBox';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useSettings } from '@/contexts/SettingsContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, clearCart, couponCode, setCouponCode } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // C-85: el formulario de teléfono y cédula espera al perfil para no aparecer y desaparecer
  const [perfilCargado, setPerfilCargado] = useState(false);
  // Ajustes públicos del contexto (vienen del servidor en el layout): antes se volvían a pedir a /api/settings/public (C-111)
  const { settings: companySettings } = useSettings();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  // C-132: Puntos ES, Pago Móvil o un método manual (Binance Pay, PayPal…) por su id
  const [paymentMode, setPaymentMode] = useState<'WALLET' | 'PAGO_MOVIL' | 'MANUAL'>('WALLET');
  const [metodoManualId, setMetodoManualId] = useState<string | null>(null);
  const [referenciaManual, setReferenciaManual] = useState('');
  // Pago mixto: Puntos ES + Pago Móvil por lo que falta
  const [usarPuntos, setUsarPuntos] = useState(false);
  const [mostrarGiftCard, setMostrarGiftCard] = useState(false);

  // Dynamic payment methods from database
  const [paymentMethods, setPaymentMethods] = useState<MetodoPagoEmpresa[]>([]);

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

  // Notes section collapsible
  const [showNotesSection, setShowNotesSection] = useState(false);

  // Order completion tracking
  const [orderCompleted, setOrderCompleted] = useState(false);

  // Processing overlay state
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Active Discounts
  // Descuentos aprobados de antes de C-102 que siguen vigentes (lo que devuelve /api/customer/discount-requests)
  const [activeDiscounts, setActiveDiscounts] = useState<Array<{ productId: string; status: string; expiresAt: string | null; approvedDiscount: number | null; requestedDiscount: number }>>([]);

  // C-125: Pagos Móvil verificados de esta compra (el primero y, si faltó algo, el de la diferencia)
  const [pagosMovil, setPagosMovil] = useState<PagoMovilVerificado[]>([]);

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

  // La primera forma de entrega disponible queda elegida de entrada (C-50b, C-100)
  useCargarAlMontar(() => {
    if (!companySettings) return;
    const primera: DeliveryMethod | null = companySettings.deliveryEnabled !== false ? 'SHIPPING'
      : companySettings.localDeliveryEnabled ? 'LOCAL_DELIVERY'
        : companySettings.pickupEnabled ? 'PICKUP' : null;
    if (primera) setEnvio(prev => ({ ...prev, deliveryMethod: primera }));
  }, [companySettings]);

  useEffect(() => {

    // Load payment methods from database
    fetch('/api/customer/company-payment-methods')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPaymentMethods(data.filter((m: MetodoPagoEmpresa & { isActive?: boolean }) => m.isActive));
        }
      })
      .catch(err => console.error('Error loading payment methods:', err));
  }, []);

  // Load user data if logged in

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

  useCargarAlMontar(() => {
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
                // Las agencias (ZOOM, MRW) no son direcciones para un envío a domicilio (C-137)
                setSavedAddresses(addresses
                  .filter((a: { type?: string }) => a?.type !== 'ZOOM' && a?.type !== 'MRW')
                  .map((a: { address?: string; addressLine1?: string; city?: string; state?: string }) => ({
                    address: a.address || a.addressLine1 || '', city: a.city, state: a.state,
                  }))
                  .filter((a: { address: string }) => a.address));
                // C-137: la agencia predeterminada de "Mis direcciones" queda propuesta (si no eligió empresa todavía)
                const predeterminada = (addresses as DireccionGuardada[]).find((a) => a?.isDefault);
                if (predeterminada && companySettings?.deliveryEnabled !== false) {
                  setEnvio((prev) => (prev.carrier ? prev : envioDesdeDireccion(predeterminada, prev) ?? prev));
                }
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

  // State for redirect animation
  // Sin sesión se muestra el aviso y se redirige a los 3 s (C-111: el aviso se deriva, no es un estado aparte)
  const showRedirectMessage = status === 'unauthenticated';

  // Redirect if not authenticated with animation
  useEffect(() => {
    if (status === 'unauthenticated') {
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
    () => JSON.stringify({
      items: items.map(toOrderItem),
      deliveryMethod: envio.deliveryMethod,
      couponCode,
      // C-132: con pago mixto el monto en Bs. firmado es solo lo que falta después de los Puntos ES
      ...(paymentMode === 'PAGO_MOVIL' && usarPuntos ? { usarPuntos: true } : {}),
    }),
    [items, envio.deliveryMethod, couponCode, paymentMode, usarPuntos]
  );
  type CuponCotizado = { code: string; applied: boolean; message: string; savingsUSD: number };
  // C-114: la cotización también dice si la orden se podrá crear (mínimo, máximo, entrega, productos). Mientras haya
  // algún problema no se muestra el Pago Móvil: antes el cliente pagaba y recién después la orden se rechazaba.
  const [serverQuote, setServerQuote] = useState<{
    key: string;
    calculation: OrderCalculation;
    coupon: CuponCotizado | null;
    problems: string[];
    /** C-132: reparto del pago mixto que calculó el servidor con los Puntos ES reales */
    mixto: { puntosUSD: number; restanteUSD: number } | null;
  } | null>(null);
  // C-125: monto exacto en Bs. y tasa firmados por el servidor. Se guarda la última cotización buena: si después
  // aparece un problema, el cliente que ya pagó sigue viendo el monto que se le pidió
  const [cotizacionBs, setCotizacionBs] = useState<{ montoBs: number; tasa: number; token: string } | null>(null);

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
          if (data?.pagoMovil?.token) {
            setCotizacionBs(data.pagoMovil);
          }
          if (data?.calculation) {
            setServerQuote({
              key: quoteBody,
              calculation: data.calculation,
              coupon: data.coupon ?? null,
              problems: [...(Array.isArray(data.errors) ? data.errors : []), ...(Array.isArray(data.blockers) ? data.blockers : [])],
              mixto: data.puntosES?.mixto ?? null,
            });
          }
          if (typeof data?.puntosES?.disponibleUSD === 'number') {
            setUserBalance(data.puntosES.disponibleUSD);
          }
        })
        .catch(() => { });
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quoteBody, status, items.length]);

  const quoteReady = serverQuote?.key === quoteBody;
  const orderCalculation = quoteReady ? serverQuote.calculation : localCalculation;
  const couponQuote = quoteReady ? serverQuote.coupon : null;
  const quoteProblems = quoteReady ? serverQuote.problems : [];
  // Solo se paga cuando el servidor confirmó este mismo carrito y no hay nada que impida crear la orden
  const canPay = quoteReady && quoteProblems.length === 0;
  // Si ya vio los datos del Pago Móvil (quizás ya transfirió), el formulario no se oculta aunque después aparezca un
  // problema: así puede verificar su pago y, si la orden no se puede crear, el servidor lo pasa a su saldo
  const [pagoMovilVisto, setPagoMovilVisto] = useState(false);
  if (paymentMode === 'PAGO_MOVIL' && canPay && !pagoMovilVisto) setPagoMovilVisto(true);
  // C-125: cubierto = lo pagado alcanza (exacto, redondeo o de más). Cada pago cuenta a su tasa congelada
  // C-132: pago mixto activo solo si el servidor lo confirmó para este mismo carrito
  const mixto = paymentMode === 'PAGO_MOVIL' && usarPuntos && quoteReady ? serverQuote.mixto : null;
  const montoPagoMovilUSD = mixto ? mixto.restanteUSD : orderCalculation.totalUSD;
  const conciliacionPM = conciliarPagos(pagosMovil, montoPagoMovilUSD, cotizacionBs?.tasa ?? 0);
  const mobilePaymentVerified = conciliacionPM !== null && conciliacionPM.estado !== 'FALTA';
  const mobilePaymentData = pagosMovil.length > 0
    ? { ...pagosMovil[0], referencias: pagosMovil.map((p) => p.referencia) }
    : null;
  const mostrarPagoMovil = canPay || pagosMovil.length > 0 || pagoMovilVisto;
  const cartSubtotal = orderCalculation.subtotalUSD;
  const cartDiscount = orderCalculation.discountUSD;
  const shippingBreakdown = orderCalculation.shipping;
  const finalTotal = orderCalculation.totalUSD;
  const hasPhysicalItems = items.some(item => item.productType !== 'DIGITAL');
  // C-106: con ZOOM o MRW (cobro a destino) el total es lo que se paga hoy; el flete va aparte
  const fleteAparte = hasPhysicalItems && envio.deliveryMethod === 'SHIPPING' && !shippingBreakdown.isFreeShipping;
  // Pago Móvil directo solo con la conciliación del BDV configurada en el servidor (C-101)
  const pagoMovilDirecto = companySettings?.pagoMovilDirecto === true;
  const metodoManual = paymentMode === 'MANUAL' ? paymentMethods.find((m) => m.id === metodoManualId && esPagoManual(m.type)) ?? null : null;
  const opcionesPago = opcionesDePago({ totalUSD: finalTotal, puntosUSD: userBalance, tasa: cotizacionBs?.tasa ?? 0, pagoMovilDirecto, metodos: paymentMethods });
  const metodoElegido: MetodoCheckout = paymentMode === 'MANUAL' && metodoManualId ? `MANUAL:${metodoManualId}` : paymentMode === 'MANUAL' ? 'WALLET' : paymentMode;
  const elegirMetodo = (m: MetodoCheckout) => {
    if (m.startsWith('MANUAL:')) {
      setPaymentMode('MANUAL');
      setMetodoManualId(m.slice('MANUAL:'.length));
    } else {
      setPaymentMode(m as 'WALLET' | 'PAGO_MOVIL');
    }
    setError('');
  };
  // Se puede combinar si los Puntos ES alcanzan para una parte y no para todo
  const puedeMixto = pagoMovilDirecto && repartirPuntos(userBalance, finalTotal).mixto;
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
    if (!(session.user as { emailVerified?: unknown }).emailVerified) {
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

    if (!paymentMode || (paymentMode === 'MANUAL' && !metodoManual)) {
      setError('Elige cómo deseas pagar.');
      setLoading(false);
      return;
    }

    // C-132: pago manual con su referencia (el servidor la vuelve a validar y no deja repetirla)
    if (paymentMode === 'MANUAL' && !leerReferenciaManual(referenciaManual)) {
      setError('Escribe la referencia de tu pago para que el equipo lo confirme.');
      setLoading(false);
      document.getElementById('referencia-pago')?.focus();
      return;
    }

    if (paymentMode === 'WALLET' && userBalance < finalTotal) {
      setError('No te alcanzan los Puntos ES. Recárgalos antes de completar el pedido.');
      setLoading(false);
      return;
    }

    // C-114: con un Pago Móvil ya verificado se deja confirmar igual: si la orden no se puede crear, el servidor lo pasa al saldo
    if (quoteProblems.length > 0 && !(paymentMode === 'PAGO_MOVIL' && mobilePaymentVerified)) {
      setError(quoteProblems.join(' '));
      setLoading(false);
      document.getElementById('metodo-de-pago')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (paymentMode === 'PAGO_MOVIL' && !mobilePaymentVerified) {
      setError('Debes verificar tu Pago Móvil antes de completar el pedido.');
      setLoading(false);
      return;
    }

    const finalPaymentMethod = paymentMode === 'PAGO_MOVIL' ? 'MOBILE_PAYMENT' : paymentMode === 'MANUAL' && metodoManual ? metodoManual.type : 'WALLET';

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
          mobilePaymentData: paymentMode === 'PAGO_MOVIL' ? mobilePaymentData : null,
          usarPuntos: paymentMode === 'PAGO_MOVIL' && mixto !== null,
          companyPaymentMethodId: paymentMode === 'MANUAL' ? metodoManual?.id : undefined,
          paymentReference: paymentMode === 'MANUAL' ? referenciaManual : undefined,
          notes: formData.notes,
          couponCode,
          expectedTotalUSD: finalTotal,
        }),
      });

      const orderData = await orderResponse.json().catch(() => ({}));

      if (!orderResponse.ok) {
        if (orderResponse.status === 409 && orderData.calculation) {
          setServerQuote({ key: quoteBody, calculation: orderData.calculation, coupon: orderData.coupon ?? null, problems: [], mixto: null });
        }
        // C-114: la orden no se pudo crear y el Pago Móvil pasó al saldo: ese pago ya no sirve, ahora se paga con saldo
        if (typeof orderData.creditedUSD === 'number') {
          setPagosMovil([]);
          setPaymentMode('WALLET');
          void fetchBalance();
        }
        // C-125: el pago no alcanzó (cambió el total o la tasa): los pagos siguen registrados y el formulario pide la diferencia
        // C-132: los Puntos ES cambiaron (o ya cubren el total): se recotiza y el cliente revisa
        if (orderData.puntosCambiaron) {
          setUsarPuntos(false);
          void fetchBalance();
        }
        if (orderData.field === 'referencia-pago') document.getElementById('referencia-pago')?.focus();
        if (orderResponse.status === 402 && orderData.pagoIncompleto) {
          document.getElementById('metodo-de-pago')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        throw new Error(orderData.details?.join(' ') || orderData.error || 'Error al crear la orden');
      }

      const createdOrders: Array<{ orderNumber: string }> = orderData.orders || [];
      // C-125: pagó de más con Pago Móvil: la diferencia ya está en su saldo
      if (orderData.sobrepago && typeof orderData.creditedUSD === 'number') {
        toast.success(`Pagaste de más: te acreditamos ${formatPuntos(orderData.creditedUSD)}.`, { duration: 6000 });
      }
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
      // C-132: pago manual: la confirmación dice que el pago se está verificando y hasta cuándo se aparta
      const porVerificar = orderData.porVerificar ? `&verificar=1&metodo=${encodeURIComponent(metodoManual?.name ?? '')}` : '';
      router.push(`/checkout/success?orders=${encodeURIComponent(orderNumbers)}&total=${total}${porVerificar}`);

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
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
    } catch {
      setGiftCardError('Error al verificar la Gift Card');
    } finally {
      setGiftCardLoading(false);
    }
  };

  // Redeem Gift Card
  const handleRedeemGiftCard = async () => {
    if (!giftCardInfo || Number(giftCardInfo.balanceUSD) <= 0) {
      setGiftCardError('Esta gift card ya no tiene valor disponible');
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
        // Vuelve a Puntos ES con el valor ya sumado
        setPaymentMode('WALLET');
        setMostrarGiftCard(false);
        // Clear gift card form for potential additional redemption
        setGiftCardCode('');
        setGiftCardPin('');
        setGiftCardInfo(null);
      }
    } catch {
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
                    embalaje: toPricingSettings(companySettings).packagingFeeUSD,
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
              <div id="metodo-de-pago" className="bg-white rounded-lg shadow-md border border-line p-6 relative overflow-hidden">
                <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  Método de Pago
                </h2>

                {/* Email Verification Backdrop */}
                {session?.user && !(session.user as { emailVerified?: unknown }).emailVerified && (
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
                        href="/customer/profile?tab=datos"
                        className={`inline-flex items-center justify-center gap-2 ${adminPrimaryButton} px-5 py-2 text-xs font-bold`}
                      >
                        <FiUser className="w-4 h-4" />
                        Ir a Mi Cuenta
                      </Link>
                    </div>
                  </div>
                )}

                {/* C-114: lo que impide crear la orden se dice ANTES de pagar */}
                {quoteProblems.length > 0 && (
                  <div role="alert" className={`${adminNotice('warning')} mb-6`}>
                    <p className="flex items-center gap-2 font-semibold">
                      <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Todavía no puedes pagar esta compra
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-6">
                      {quoteProblems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* C-132: "¿Cómo deseas pagar?" con los métodos activos del panel y su panel debajo */}
                <div className="mb-4">
                  <PaymentMethodSelector opciones={opcionesPago} value={metodoElegido} onChange={elegirMetodo} />
                </div>

                {paymentMode === 'WALLET' && (
                  <div className="mb-6">
                    <PagoPuntosPanel
                      disponibleUSD={userBalance}
                      totalUSD={finalTotal}
                      pagoMovilDisponible={pagoMovilDirecto}
                      onPagarRestoConPagoMovil={() => { setUsarPuntos(true); setPaymentMode('PAGO_MOVIL'); }}
                      onRecargar={() => setShowRechargeModal(true)}
                      onGiftCard={() => setMostrarGiftCard((v) => !v)}
                    />
                  </div>
                )}

                {paymentMode === 'MANUAL' && metodoManual && (
                  <div className="mb-6">
                    <PagoManualPanel
                      metodo={metodoManual as MetodoPagoEmpresa & { type: TipoPagoManual }}
                      totalUSD={finalTotal}
                      tasa={cotizacionBs?.tasa ?? 0}
                      referencia={referenciaManual}
                      onReferencia={setReferenciaManual}
                      listo={canPay}
                    />
                  </div>
                )}

                {/* Sin cotización del servidor (o con problemas) no se muestran los datos para transferir */}
                {paymentMode === 'PAGO_MOVIL' && !mostrarPagoMovil && (
                  <div className={`${adminNotice('neutral')} mb-6`}>
                    {quoteProblems.length > 0
                      ? 'Resuelve lo de arriba y aquí aparecerán los datos para tu Pago Móvil. Así no pagas algo que no se puede despachar.'
                      : 'Calculando el total exacto de tu compra…'}
                  </div>
                )}

                {/* Direct BDV Pago Movil Form */}
                {paymentMode === 'PAGO_MOVIL' && mostrarPagoMovil && (
                  <div className="bg-surface rounded-2xl p-2 sm:p-6 border border-line shadow-sm mb-6">
                    <div className="mb-4 pb-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="font-bold text-ink text-base">Verificación Directa de Pago Móvil</h3>
                        <p className="text-xs text-muted">Transfiere a la cuenta de la tienda y confirma con la referencia</p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-success-strong/10 text-success-strong text-xs font-bold rounded-full">
                        <FiShield className="w-3.5 h-3.5" />
                        Conciliación BDV
                      </span>
                    </div>
                    {/* C-132: pago mixto. Con puntos que no alcanzan, el Pago Móvil es solo por la diferencia */}
                    {puedeMixto && (
                      <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-brand-200 bg-white p-3">
                        <input
                          type="checkbox"
                          checked={usarPuntos}
                          onChange={(e) => setUsarPuntos(e.target.checked)}
                          className="mt-0.5 h-5 w-5 shrink-0 rounded text-brand-500 focus:ring-2 focus:ring-brand-500"
                        />
                        <span className="text-sm text-ink-soft">
                          <strong className="font-semibold text-ink">Usar mis {formatPuntos(userBalance)}</strong>
                          {' '}y pagar solo {formatUSD(repartirPuntos(userBalance, finalTotal).restanteUSD)} por Pago Móvil.
                          {usarPuntos && !mixto && <span className="block text-xs text-muted">Calculando el monto en bolívares…</span>}
                        </span>
                      </label>
                    )}
                    <CheckoutPagoMovilForm
                      montoUSD={montoPagoMovilUSD}
                      montoBs={montoBs(montoPagoMovilUSD, cotizacionBs?.tasa ?? 0)}
                      tasa={cotizacionBs?.tasa ?? 0}
                      cotizacion={cotizacionBs?.token ?? null}
                      pagador={{ cedula: formData.customerIdNumber, telefono: formData.customerPhone }}
                      pagos={pagosMovil}
                      onPagosChange={setPagosMovil}
                      datosComercio={{
                        telefono: paymentMethods.find(m => m.type === 'MOBILE_PAYMENT')?.phone ?? undefined,
                        cedula: paymentMethods.find(m => m.type === 'MOBILE_PAYMENT')?.holderId ?? undefined,
                        banco: paymentMethods.find(m => m.type === 'MOBILE_PAYMENT')?.bankName ?? undefined,
                        titular: paymentMethods.find(m => m.type === 'MOBILE_PAYMENT')?.holderName ?? undefined,
                      }}
                    />
                  </div>
                )}

                {/* Gift Card Redemption Section */}
                {paymentMode === 'WALLET' && mostrarGiftCard && (
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
                                  {giftCardInfo.status === 'ACTIVE' ? 'Activa' : giftCardInfo.status === 'DEPLETED' ? 'Usada' : giftCardInfo.status}
                                </span>
                              </div>
                              <div className="text-center py-4">
                                <p className="text-sm text-muted mb-1">Valor disponible</p>
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
                                <p className="text-sm text-muted mb-1">Tus Puntos ES</p>
                                <p className="text-3xl font-bold text-ink mb-3">
                                  {formatUSD(userBalance)}
                                </p>

                                {/* Puntos ES suficientes badge */}
                                {userBalance >= finalTotal && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/15 text-success-strong text-xs font-bold rounded-full mb-3">
                                    <FiCheck className="w-3.5 h-3.5" />
                                    Puntos ES suficientes
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
                                      <span className="text-muted">Te quedan después de la compra:</span>
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
                                  <p className="text-sm text-muted">El valor pasó a tus Puntos ES</p>
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
                disabled={
                  loading ||
                  !acceptedTerms ||
                  !paymentMode ||
                  (!canPay && !(paymentMode === 'PAGO_MOVIL' && mobilePaymentVerified)) ||
                  (paymentMode === 'WALLET' && userBalance < finalTotal) ||
                  (paymentMode === 'PAGO_MOVIL' && !mobilePaymentVerified) ||
                  (paymentMode === 'MANUAL' && (!metodoManual || !leerReferenciaManual(referenciaManual)))
                }
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
              {paymentMode === 'PAGO_MOVIL' && !mobilePaymentVerified && (
                <p className="text-center text-xs text-warning-strong -mt-2 flex items-center justify-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  Debes verificar tu Pago Móvil antes de completar el pedido
                </p>
              )}
              {paymentMode === 'MANUAL' && metodoManual && !leerReferenciaManual(referenciaManual) && (
                <p className="text-center text-xs text-warning-strong -mt-2 flex items-center justify-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  Escribe la referencia de tu pago para completar el pedido
                </p>
              )}
              {paymentMode === 'WALLET' && userBalance < finalTotal && (
                <p className="text-center text-xs text-warning-strong -mt-2 flex items-center justify-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  No te alcanzan los Puntos ES. Recárgalos para completar el pedido.
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
                  {Boolean((session?.user as { emailVerified?: unknown } | undefined)?.emailVerified) && (
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
                            {item.conditionBadge && <p className="text-xs font-semibold text-ink-soft">{item.conditionBadge}</p>}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted font-medium">x{item.quantity}</span>
                              <div className="text-right">
                                {activeDiscount ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-subtle line-through">{formatPrice(originalTotal)}</span>
                                    <span className="text-sm font-bold text-success-strong">{formatPrice(finalItemTotal)}</span>
                                  </div>
                                ) : item.listPrice && item.listPrice > item.price ? (
                                  // C-102: en oferta, el precio de antes tachado
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-subtle line-through">{formatPrice(item.listPrice * item.quantity)}</span>
                                    <span className="text-sm font-bold text-ink">{formatPrice(originalTotal)}</span>
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
                      <div className="flex justify-between items-center">
                        <span className="text-success-strong flex items-center gap-1 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          {couponQuote?.applied ? `Descuento (cupón ${couponQuote.code}):` : 'Descuento:'}
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

                    {/* Cupón (C-102) */}
                    <CouponBox
                      code={couponCode}
                      onApply={(code) => setCouponCode(code)}
                      onRemove={() => setCouponCode(null)}
                      status={couponQuote ? { applied: couponQuote.applied, message: couponQuote.message } : null}
                      pendingText="Verificando…"
                    />

                    {/* Envío (C-100) */}
                    <ResumenEnvio envio={shippingBreakdown} form={envio} tasaVES={Number(companySettings?.exchangeRateVES) || 0} hayFisicos={hasPhysicalItems} />

                    {/* Total - Premium Style */}
                    <div className="pt-4 border-t-2 border-dashed border-line">
                      <div className="flex justify-between items-start">
                        <span className="text-lg font-bold text-ink">{fleteAparte ? 'Total a pagar hoy:' : 'Total:'}</span>
                        <div className="text-right">
                          <span className="text-3xl font-bold text-ink">{formatUSD(finalTotal)}</span>
                          {companySettings?.exchangeRateVES && (
                            <div className="mt-1 px-3 py-1 bg-brand-500/10 rounded-lg inline-block">
                              <span className="text-sm font-bold text-brand-500">
                                {formatVES(montoBs(finalTotal, cotizacionBs?.tasa || Number(companySettings.exchangeRateVES)))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {fleteAparte && (
                        <p className="mt-2 text-right text-xs text-muted">
                          No incluye el flete: se lo pagas a {envio.carrier || 'la empresa de envíos'} al {envio.mode === 'DOOR' ? 'recibir' : 'retirar'}.
                        </p>
                      )}
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

              <ConfianzaEnvio />
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
                  <li>Si selecciona envío a oficina de encomienda (ZOOM o MRW), debe elegir la oficina o agencia correcta de la lista.</li>
                  <li>La empresa NO corregirá datos errados después de que el pedido haya sido procesado.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-base mb-2">3. Envíos mediante ZOOM y MRW</h3>
                <ul className="list-disc ml-6 space-y-2 text-ink-soft">
                  <li>Los pedidos se envían mediante las empresas certificadas ZOOM o MRW según la selección del cliente.</li>
                  <li>El flete es con cobro a destino: el cliente se lo paga a ZOOM o MRW al retirar o recibir el paquete. La tienda cobra solo el embalaje, salvo en los pedidos con envío gratis, donde paga todo.</li>
                  <li>El cliente elige la oficina o agencia de la lista, o indica una dirección completa si el envío es a domicilio.</li>
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
                  Aceptamos transferencias bancarias, pago móvil, criptomonedas y tus Puntos ES. Los pedidos se procesan una vez confirmado el pago.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-base mb-2">6. Garantía, Devoluciones y Productos Usados</h3>
                <ul className="list-disc ml-6 space-y-2 text-ink-soft">
                  <li>La garantía la da la tienda, por fallas de funcionamiento y por el plazo que indica la ficha de cada producto, desde la entrega.</li>
                  <li>No se aceptan devoluciones por cambio de opinión ni por datos de envío incorrectos. Si el producto llega con una falla, dañado o distinto a lo publicado, se atiende como garantía.</li>
                  <li>Los productos usados, reacondicionados y de caja abierta se venden en el estado descrito en su ficha, con fotos reales de la unidad. Al comprarlos, usted acepta ese estado. No aplican cupones.</li>
                  <li>Los códigos y recargas digitales entregados no tienen devolución.</li>
                  <li>
                    Detalles completos en los{' '}
                    <a href="/terminos#garantia" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
                      términos y condiciones
                    </a>
                    .
                  </li>
                </ul>
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
