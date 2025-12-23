'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';
import PublicHeader from '@/components/public/PublicHeader';
import RechargeModal from '@/components/modals/RechargeModal';
import CheckoutPagoMovilForm from '@/components/checkout/CheckoutPagoMovilForm';
import { FiCreditCard, FiDollarSign, FiPlus, FiCheck, FiUser, FiAlertCircle, FiArrowRight, FiLock, FiMapPin, FiPackage, FiTruck, FiInfo, FiCopy, FiCheckCircle, FiZap } from 'react-icons/fi';
import { FaMobileScreen } from 'react-icons/fa6';
import { FaCheck } from 'react-icons/fa';
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
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    notes: '',
    paymentMethod: '' as string, // Dynamic from database
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

  // Notes section collapsible
  const [showNotesSection, setShowNotesSection] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false); // Track if order was just completed
  const [successOrderData, setSuccessOrderData] = useState<{
    orderNumber: string;
    total: number;
    items: Array<{ name: string; quantity: number }>;
  } | null>(null);

  // Active Discounts
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>([]);
  const [appliedDiscountIds, setAppliedDiscountIds] = useState<string[]>([]);

  // Mobile Payment Verification State
  const [mobilePaymentVerified, setMobilePaymentVerified] = useState(false);
  const [mobilePaymentData, setMobilePaymentData] = useState<{
    referencia: string;
    telefonoPagador: string;
    bancoOrigen: string;
    fechaPago: string;
    comprobante?: string;
  } | null>(null);

  // Load company settings for exchange rates
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => setCompanySettings(data))
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

      // Fetch user balance
      fetchBalance();
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

  // Calculate volumetric weight from dimensions (L x W x H in cm / 5000)
  const calculateVolumetricWeight = (dimensions: string | undefined): number => {
    if (!dimensions) return 0;
    try {
      const dims = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
      const { length = 0, width = 0, height = 0 } = dims;
      // Volumetric weight formula: L × W × H / 5000 (standard for courier companies)
      return (length * width * height) / 5000;
    } catch {
      return 0;
    }
  };

  // Calculate shipping cost with detailed breakdown
  interface ShippingBreakdown {
    total: number;
    packagingFee: number;
    consolidatedCost: number;
    bulkyCost: number;
    totalWeight: number;
    isFreeShipping: boolean;
    consolidableItems: Array<{ name: string; quantity: number; weight: number; volumetricWeight: number; usedWeight: number }>;
    bulkyItems: Array<{ name: string; quantity: number; cost: number }>;
    digitalItems: Array<{ name: string; quantity: number }>;
  }

  const getShippingBreakdown = (): ShippingBreakdown => {
    const breakdown: ShippingBreakdown = {
      total: 0,
      packagingFee: 0,
      consolidatedCost: 0,
      bulkyCost: 0,
      totalWeight: 0,
      isFreeShipping: false,
      consolidableItems: [],
      bulkyItems: [],
      digitalItems: [],
    };

    // No shipping for pickup
    if (formData.deliveryMethod === 'PICKUP') {
      return breakdown;
    }

    // Check if all items are digital - no shipping needed
    const allDigital = items.every(item => item.productType === 'DIGITAL');
    if (allDigital) {
      items.forEach(item => {
        breakdown.digitalItems.push({ name: item.name, quantity: item.quantity });
      });
      return breakdown;
    }

    // Get shipping config from company settings
    const packagingFee = companySettings?.packagingFeeUSD ? Number(companySettings.packagingFeeUSD) : 2.50;
    const shippingCostPerKg = companySettings?.shippingCostPerKg ? Number(companySettings.shippingCostPerKg) : 2;
    const minConsolidatedShipping = companySettings?.minConsolidatedShipping ? Number(companySettings.minConsolidatedShipping) : 3;
    const freeThreshold = companySettings?.freeDeliveryThresholdUSD ? Number(companySettings.freeDeliveryThresholdUSD) : null;

    breakdown.packagingFee = packagingFee;

    // Check if order qualifies for free shipping
    if (freeThreshold && cartSubtotal >= freeThreshold) {
      breakdown.isFreeShipping = true;
      breakdown.total = packagingFee; // Only charge packaging fee
      items.forEach(item => {
        if (item.productType === 'DIGITAL') {
          breakdown.digitalItems.push({ name: item.name, quantity: item.quantity });
        } else if (item.isConsolidable !== false) {
          breakdown.consolidableItems.push({
            name: item.name,
            quantity: item.quantity,
            weight: (item.weightKg || 0.1) * item.quantity,
            volumetricWeight: 0,
            usedWeight: 0
          });
        } else {
          breakdown.bulkyItems.push({ name: item.name, quantity: item.quantity, cost: 0 });
        }
      });
      return breakdown;
    }

    // Separate items by shipping type
    let consolidatedWeight = 0;
    let bulkyItemsShipping = 0;

    items.forEach(item => {
      // Digital products
      if (item.productType === 'DIGITAL') {
        breakdown.digitalItems.push({ name: item.name, quantity: item.quantity });
        return;
      }

      // Physical products
      if (item.isConsolidable !== false) {
        // Consolidable: use the greater of real weight vs volumetric weight
        const realWeight = (item.weightKg || 0.1) * item.quantity;
        const volumetricWeight = calculateVolumetricWeight((item as any).dimensions) * item.quantity;
        const usedWeight = Math.max(realWeight, volumetricWeight);

        consolidatedWeight += usedWeight;
        breakdown.consolidableItems.push({
          name: item.name,
          quantity: item.quantity,
          weight: realWeight,
          volumetricWeight: volumetricWeight,
          usedWeight: usedWeight
        });
      } else {
        // Non-consolidable (bulky): add fixed shipping cost
        const itemShipping = (item.shippingCost || 0) * item.quantity;
        bulkyItemsShipping += itemShipping;
        breakdown.bulkyItems.push({
          name: item.name,
          quantity: item.quantity,
          cost: itemShipping
        });
      }
    });

    // Calculate consolidated shipping (by weight)
    let consolidatedShipping = 0;
    if (consolidatedWeight > 0) {
      consolidatedShipping = Math.max(consolidatedWeight * shippingCostPerKg, minConsolidatedShipping);
    }

    breakdown.consolidatedCost = Math.round(consolidatedShipping * 100) / 100;
    breakdown.bulkyCost = Math.round(bulkyItemsShipping * 100) / 100;
    breakdown.totalWeight = Math.round(consolidatedWeight * 100) / 100;
    breakdown.total = Math.round((consolidatedShipping + bulkyItemsShipping + packagingFee) * 100) / 100;

    return breakdown;
  };

  // Memoize the shipping breakdown
  const shippingBreakdown = getShippingBreakdown();
  const shippingCost = shippingBreakdown.total;

  // Override finalTotal to include shipping
  const finalOrderTotal = cartTotal + shippingCost;
  const finalTotal = finalOrderTotal; // Keep variable name for compatibility with rest of file

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!session?.user) {
      setError('Debes iniciar sesion para realizar un pedido');
      router.push('/login?callbackUrl=%2Fcheckout');
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

    // Validate mobile payment verification
    if (paymentMode === 'DIRECT' && formData.paymentMethod === 'MOBILE_PAYMENT' && !mobilePaymentVerified) {
      setError('Debes verificar tu pago móvil antes de continuar');
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

      // SEPARATE ITEMS INTO PHYSICAL AND DIGITAL
      const physicalItems = items.filter(item => item.productType !== 'DIGITAL');
      const digitalItems = items.filter(item => item.productType === 'DIGITAL');

      const hasPhysical = physicalItems.length > 0;
      const hasDigital = digitalItems.length > 0;

      const createdOrders: Array<{ orderNumber: string; type: 'physical' | 'digital'; total: number; itemCount: number }> = [];

      // CREATE ORDER FOR PHYSICAL PRODUCTS (if any)
      if (hasPhysical) {
        const physicalOrderItems = physicalItems.map(item => ({
          productId: item.id,
          productName: item.name,
          productSku: item.id,
          productImage: item.imageUrl || null,
          pricePerUnit: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        }));

        const physicalSubtotal = physicalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const physicalDiscount = physicalItems.reduce((sum, item) => {
          const discount = activeDiscounts.find(d =>
            d.productId === item.id && d.status === 'APPROVED' && d.expiresAt && new Date(d.expiresAt) > new Date()
          );
          if (discount) {
            const discountVal = discount.approvedDiscount || discount.requestedDiscount;
            return sum + ((item.price * item.quantity) * (discountVal / 100));
          }
          return sum;
        }, 0);
        const physicalTotal = (physicalSubtotal - physicalDiscount) + shippingCost;

        const physicalOrderData = {
          currency: primaryCurrency,
          subtotal: physicalSubtotal,
          tax: 0,
          shipping: shippingCost,
          discount: physicalDiscount,
          total: physicalTotal,
          exchangeRateVES,
          exchangeRateEUR,
          paymentMethod: finalPaymentMethod,
          deliveryMethod: formData.deliveryMethod,
          items: physicalOrderItems,
          notes: formData.notes ? `${formData.notes} [Productos Físicos]` : '[Productos Físicos]',
          appliedDiscountIds: appliedDiscountIds.filter(id => physicalItems.some(item =>
            activeDiscounts.find(d => d.id === id && d.productId === item.id)
          )),
          mobilePaymentData: mobilePaymentData || null,
        };

        const physicalResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(physicalOrderData),
        });

        if (!physicalResponse.ok) {
          const data = await physicalResponse.json();
          throw new Error(data.error || 'Error al crear la orden de productos físicos');
        }

        const physicalOrder = await physicalResponse.json();
        createdOrders.push({
          orderNumber: physicalOrder.orderNumber,
          type: 'physical',
          total: physicalTotal,
          itemCount: physicalItems.length,
        });
      }

      // CREATE ORDER FOR DIGITAL PRODUCTS (if any)
      if (hasDigital) {
        const digitalOrderItems = digitalItems.map(item => {
          // For digital products, the cart ID has format: "productId-amount" (e.g., "abc123-10")
          // We need to extract the original product ID for the database
          const originalProductId = item.productType === 'DIGITAL' && item.id.includes('-')
            ? item.id.substring(0, item.id.lastIndexOf('-'))
            : item.id;

          return {
            productId: originalProductId,
            productName: item.name,
            productSku: originalProductId, // Use original ID as SKU too
            productImage: item.imageUrl || null,
            pricePerUnit: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          };
        });

        const digitalSubtotal = digitalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const digitalDiscount = digitalItems.reduce((sum, item) => {
          const discount = activeDiscounts.find(d =>
            d.productId === item.id && d.status === 'APPROVED' && d.expiresAt && new Date(d.expiresAt) > new Date()
          );
          if (discount) {
            const discountVal = discount.approvedDiscount || discount.requestedDiscount;
            return sum + ((item.price * item.quantity) * (discountVal / 100));
          }
          return sum;
        }, 0);
        const digitalTotal = digitalSubtotal - digitalDiscount; // No shipping for digital

        const digitalOrderData = {
          currency: primaryCurrency,
          subtotal: digitalSubtotal,
          tax: 0,
          shipping: 0, // No shipping for digital products
          discount: digitalDiscount,
          total: digitalTotal,
          exchangeRateVES,
          exchangeRateEUR,
          paymentMethod: finalPaymentMethod,
          deliveryMethod: 'DIGITAL', // Special delivery method for digital
          items: digitalOrderItems,
          notes: formData.notes ? `${formData.notes} [Productos Digitales]` : '[Productos Digitales]',
          appliedDiscountIds: appliedDiscountIds.filter(id => digitalItems.some(item =>
            activeDiscounts.find(d => d.id === id && d.productId === item.id)
          )),
          mobilePaymentData: mobilePaymentData || null,
        };

        const digitalResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(digitalOrderData),
        });

        if (!digitalResponse.ok) {
          const data = await digitalResponse.json();
          throw new Error(data.error || 'Error al crear la orden de productos digitales');
        }

        const digitalOrder = await digitalResponse.json();
        createdOrders.push({
          orderNumber: digitalOrder.orderNumber,
          type: 'digital',
          total: digitalTotal,
          itemCount: digitalItems.length,
        });
      }

      // Save address to profile if it's a new address (only if there were physical items)
      if (hasPhysical && isNewAddress && formData.shippingAddress && formData.shippingCity && formData.shippingState) {
        await saveAddressToProfile(formData);
      }

      // Clear cart
      clearCart();

      // Mark order as completed to prevent showing empty cart message
      setOrderCompleted(true);

      // Set success data - handle multiple orders
      const totalAmount = createdOrders.reduce((sum, o) => sum + o.total, 0);
      const orderNumbers = createdOrders.map(o => o.orderNumber).join(', ');

      setSuccessOrderData({
        orderNumber: orderNumbers,
        total: totalAmount,
        items: items.map(item => ({ name: item.name, quantity: item.quantity }))
      });
      setShowSuccessModal(true);

      // Redirect after 5 seconds (comfortable delay)
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
    // Format: USD 1.200,00$
    const formatted = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
    return `USD ${formatted}$`;
  };

  // Format number only (without USD prefix and $ suffix) - for places that show USD separately
  const formatNumber = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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

  // Show processing/success screen if order was just completed
  if (orderCompleted && successOrderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Success Card */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 sm:p-12 shadow-2xl animate-slideInUp text-center">
            {/* Success Icon with Animation */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-8">
              <div className="absolute inset-0 bg-green-500/30 rounded-full animate-ping"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                <svg className="w-14 h-14 sm:w-16 sm:h-16 text-white animate-scaleIn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 font-[family-name:var(--font-tektur)]">
              ¡Pedido Realizado!
            </h2>

            {/* Order Number */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full border border-white/30 mb-6">
              <span className="text-base font-medium text-white/80">Orden:</span>
              <span className="text-lg font-bold text-white">{successOrderData.orderNumber}</span>
            </div>

            {/* Order Summary */}
            <div className="bg-white/10 rounded-2xl p-6 sm:p-8 mb-8 border border-white/20">
              <p className="text-white/90 text-base sm:text-lg mb-3">
                {successOrderData.items.length} producto{successOrderData.items.length > 1 ? 's' : ''}
              </p>
              <p className="text-3xl sm:text-4xl font-black text-white">
                ${successOrderData.total.toFixed(2)} USD
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <p className="text-base text-white/70 mb-3">Redirigiendo a tus pedidos...</p>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden max-w-md mx-auto">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-white rounded-full animate-progressBar"></div>
              </div>
            </div>

            {/* Manual Link */}
            <button
              onClick={() => router.push('/customer/orders')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white text-base font-semibold rounded-full transition-all border border-white/30"
            >
              <FiArrowRight className="w-5 h-5" />
              Ir ahora a mis pedidos
            </button>
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

          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.5);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes progressBar {
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

          .animate-scaleIn {
            animation: scaleIn 0.4s ease-out 0.3s both;
          }

          .animate-progressBar {
            animation: progressBar 5s linear;
          }
        `}</style>
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

      {/* Premium Hero Section - Compact */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd] py-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 animate-fadeInUp">
            Finalizar Compra
          </h1>
          <p className="text-base text-blue-100 animate-fadeInUp animation-delay-200">
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

              {/* Email Verification Warning Banner - Compact */}
              {session?.user && !(session.user as any).emailVerified && (
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FiAlertCircle className="w-4 h-4 text-[#2a63cd]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#212529]">
                        <strong className="font-bold text-[#1e4ba3]">Verifica tu email</strong> para realizar compras. Revisa tu bandeja de entrada.
                      </p>
                    </div>
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
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2a63cd] text-white text-xs font-medium rounded-lg hover:bg-[#1e4ba3] transition-colors"
                    >
                      <FiAlertCircle className="w-3 h-3" />
                      Reenviar
                    </button>
                  </div>
                </div>
              )}


              {/* Shipping Information */}
              <div className="bg-white rounded-xl shadow-lg border border-[#e9ecef] p-6 animate-fadeIn animation-delay-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center shadow-sm">
                      <FiMapPin className="w-4 h-4 text-white" />
                    </div>
                    Dirección de Envío
                  </h2>
                  {/* Compact Warning Badge with Tooltip */}
                  <div className="relative group">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-300 rounded-full cursor-help">
                      <FiAlertCircle className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-xs font-bold text-orange-700">Recuerda verificar tus datos</span>
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-orange-50 border border-orange-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="absolute -top-1.5 right-6 w-3 h-3 bg-orange-50 border-l border-t border-orange-200 transform rotate-45"></div>
                      <p className="text-xs text-orange-800 leading-relaxed">
                        Los datos de envío serán usados para entregar tus productos. <strong className="font-bold">La empresa no se hace responsable de datos errados.</strong>
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
                      className={`px-3 py-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${!formData.isOfficeDelivery
                        ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-md'
                        : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                        }`}
                    >
                      <FiMapPin className={`w-5 h-5 flex-shrink-0 ${!formData.isOfficeDelivery ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`} />
                      <div className="text-left">
                        <p className={`text-sm font-bold ${!formData.isOfficeDelivery ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                          Dirección Personal
                        </p>
                        <p className="text-xs text-[#6a6c6b]">Envío a domicilio</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isOfficeDelivery: true })}
                      className={`px-3 py-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${formData.isOfficeDelivery
                        ? 'border-[#2a63cd] bg-[#2a63cd]/5 shadow-md'
                        : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                        }`}
                    >
                      <FiPackage className={`w-5 h-5 flex-shrink-0 ${formData.isOfficeDelivery ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`} />
                      <div className="text-left">
                        <p className={`text-sm font-bold ${formData.isOfficeDelivery ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>
                          Oficina Courier
                        </p>
                        <p className="text-xs text-[#6a6c6b]">ZOOM o MRW</p>
                      </div>
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
                <h2 className="text-lg font-bold text-[#212529] mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
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
                    {paymentMethods.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 border border-dashed border-gray-300 rounded-xl">
                        <p>Cargando métodos de pago...</p>
                      </div>
                    ) : (
                      paymentMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${formData.paymentMethod === method.type
                            ? 'border-[#2a63cd] bg-blue-50/50 shadow-sm'
                            : 'border-[#e9ecef] hover:border-[#2a63cd]/50 hover:bg-[#f8f9fa]'
                            }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.type}
                            checked={formData.paymentMethod === method.type}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, paymentMethod: e.target.value }));
                              // Reset mobile payment verification when changing method
                              setMobilePaymentVerified(false);
                              setMobilePaymentData(null);
                            }}
                            className="w-5 h-5 mt-0.5 text-[#2a63cd] focus:ring-[#2a63cd]"
                          />
                          <div className="ml-4 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {method.type === 'MOBILE_PAYMENT' && (
                                <FaMobileScreen className="w-4 h-4 text-[#2a63cd]" />
                              )}
                              <span className="text-sm font-bold text-[#212529]">{method.name}</span>
                              {method.bankName && (
                                <span className="text-xs text-[#6a6c6b]">• {method.bankName}</span>
                              )}
                              {method.type === 'MERCANTIL_PANAMA' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-[#2a63cd] rounded-full">
                                  Internacional
                                </span>
                              )}
                              {/* Show displayNote only for non-MOBILE_PAYMENT methods */}
                              {method.displayNote && method.type !== 'MOBILE_PAYMENT' && (
                                <span className="text-xs text-[#2a63cd] font-medium flex items-center gap-1">
                                  <FiZap className="w-3 h-3" />
                                  {method.displayNote}
                                </span>
                              )}
                            </div>
                            {/* Show details when selected - but NOT for MOBILE_PAYMENT (shown in verification form) */}
                            {formData.paymentMethod === method.type && method.type !== 'MOBILE_PAYMENT' && (
                              <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 animate-fadeIn">
                                {method.phone && (
                                  <p className="text-xs text-gray-600">
                                    <strong>Teléfono:</strong> {method.phone}
                                  </p>
                                )}
                                {method.holderId && (
                                  <p className="text-xs text-gray-600">
                                    <strong>Cédula/RIF:</strong> {method.holderId}
                                  </p>
                                )}
                                {method.email && (
                                  <p className="text-xs text-gray-600">
                                    <strong>Email:</strong> {method.email}
                                  </p>
                                )}
                                {method.walletAddress && (
                                  <p className="text-xs text-gray-600 font-mono break-all">
                                    <strong>Wallet:</strong> {method.walletAddress}
                                  </p>
                                )}
                                {method.network && (
                                  <p className="text-xs text-gray-600">
                                    <strong>Red:</strong> {method.network}
                                  </p>
                                )}
                                {method.qrCodeImage && (
                                  <div className="mt-2">
                                    <Image
                                      src={method.qrCodeImage}
                                      alt="QR Code"
                                      width={120}
                                      height={120}
                                      className="rounded-lg border border-gray-200"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </label>
                      ))
                    )}

                    {/* Mobile Payment Verification Form */}
                    {formData.paymentMethod === 'MOBILE_PAYMENT' && (
                      <div className="mt-4 animate-fadeIn">
                        <CheckoutPagoMovilForm
                          montoEsperado={finalTotal}
                          montoEnBs={finalTotal * Number(companySettings?.exchangeRateVES || 0)}
                          datosComercio={{
                            telefono: paymentMethods.find(m => m.type === 'MOBILE_PAYMENT')?.phone,
                            cedula: paymentMethods.find(m => m.type === 'MOBILE_PAYMENT')?.holderId,
                            banco: paymentMethods.find(m => m.type === 'MOBILE_PAYMENT')?.bankName,
                          }}
                          onVerified={(data) => {
                            setMobilePaymentVerified(true);
                            setMobilePaymentData(data);
                          }}
                          onReset={() => {
                            setMobilePaymentVerified(false);
                            setMobilePaymentData(null);
                          }}
                          isVerified={mobilePaymentVerified}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Wallet Payment Options - Premium Circle Progress Design */}
                {paymentMode === 'WALLET' && (
                  <div className="bg-gradient-to-br from-[#f8f9fa] to-white rounded-2xl p-6 border border-[#e9ecef] animate-fadeIn shadow-sm overflow-hidden relative">
                    {/* Subtle animated background */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#2a63cd]/10 to-transparent rounded-full blur-3xl animate-pulse" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#2a63cd]/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    </div>

                    {/* Main Content - Circle + Info */}
                    <div className="relative flex flex-col md:flex-row items-center gap-6">
                      {/* Animated Circle Progress */}
                      <div className="relative flex-shrink-0">
                        {/* Outer rotating ring */}
                        <div className="absolute inset-[-8px] rounded-full border-2 border-dashed border-[#2a63cd]/20 animate-spin" style={{ animationDuration: '20s' }} />

                        {/* Pulse ring effect */}
                        <div className="absolute inset-[-4px] rounded-full animate-ping opacity-20 bg-[#2a63cd]" style={{ animationDuration: '2s' }} />

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
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all duration-500 bg-gradient-to-br from-[#2a63cd]/10 to-[#2a63cd]/20 text-[#2a63cd]">
                            {userBalance >= finalTotal ? (
                              <FiCheckCircle className="w-6 h-6 animate-bounce" style={{ animationDuration: '2s' }} />
                            ) : (
                              <FontAwesomeIcon icon={faWallet} className="w-5 h-5" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-[#2a63cd]">
                            {Math.min(Math.round((userBalance / finalTotal) * 100), 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Balance Info */}
                      <div className="flex-1 text-center md:text-left">
                        <p className="text-sm text-[#6a6c6b] font-medium mb-1">Tu saldo disponible</p>
                        <p className="text-4xl font-black text-[#212529] mb-3 tracking-tight">
                          {formatPrice(userBalance)}
                        </p>

                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${userBalance >= finalTotal
                          ? 'bg-[#2a63cd]/10 text-[#2a63cd] border border-[#2a63cd]/20'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
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
                          <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-[#6a6c6b]">
                            <FiPackage className="w-4 h-4" />
                            <span>Total del pedido: <strong className="text-[#212529]">{formatPrice(finalTotal)}</strong></span>
                          </div>
                          {userBalance >= finalTotal && (
                            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-[#2a63cd] font-medium animate-fadeIn">
                              <FiDollarSign className="w-4 h-4" />
                              <span>Saldo restante después de la compra: <strong className="text-[#212529]">{formatPrice(userBalance - finalTotal)}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Section */}
                    {userBalance < finalTotal ? (
                      <div className="relative mt-6 pt-6 border-t border-[#e9ecef]">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <p className="text-sm text-[#6a6c6b]">
                            Recarga tu saldo para completar esta compra
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowRechargeModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                          >
                            <FiPlus className="w-5 h-5" />
                            Recargar Saldo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative mt-6 pt-6 border-t border-[#e9ecef]">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#2a63cd]/5 to-[#1e4ba3]/10 border border-[#2a63cd]/20 rounded-xl">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#2a63cd]/30 animate-pulse">
                            <FaCheck className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-[#2a63cd] text-lg">Listo para pagar</p>
                            <p className="text-sm text-[#6a6c6b]">
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
              <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowNotesSection(!showNotesSection)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    Notas Adicionales
                    <span className="text-xs text-[#6a6c6b] font-normal">(Opcional)</span>
                  </h2>
                  <svg className={`w-5 h-5 text-[#6a6c6b] transition-transform duration-200 ${showNotesSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm resize-none"
                      placeholder="Instrucciones especiales de entrega, preferencias de horario, etc."
                    />
                  </div>
                )}
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
                disabled={loading || !acceptedTerms || (paymentMode === 'WALLET' && userBalance < finalTotal) || (paymentMode === 'DIRECT' && formData.paymentMethod === 'MOBILE_PAYMENT' && !mobilePaymentVerified)}
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
              {paymentMode === 'DIRECT' && formData.paymentMethod === 'MOBILE_PAYMENT' && !mobilePaymentVerified && (
                <p className="text-center text-xs text-orange-600 -mt-2 animate-pulse flex items-center justify-center gap-1">
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
              <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-lg border border-blue-100 p-5 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center shadow-sm">
                      <FiUser className="w-4 h-4 text-white" />
                    </div>
                    Información de Contacto
                  </h2>
                  {(session?.user as any)?.emailVerified && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 border border-green-300 rounded-full">
                      <FiCheckCircle className="w-3 h-3 text-green-700" />
                      <span className="text-[10px] font-bold text-green-700">Verificado</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[#6a6c6b] uppercase mb-1">Nombre</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg">
                      <FiLock className="w-3.5 h-3.5 text-[#6a6c6b]" />
                      <span className="text-sm text-[#212529] font-medium truncate">{formData.customerName}</span>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[#6a6c6b] uppercase mb-1">Email</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg">
                      <FiLock className="w-3.5 h-3.5 text-[#6a6c6b]" />
                      <span className="text-sm text-[#212529] font-medium truncate">{formData.customerEmail}</span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[#6a6c6b] uppercase mb-1">Teléfono</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg">
                      <FiLock className="w-3.5 h-3.5 text-[#6a6c6b]" />
                      <span className="text-sm text-[#212529] font-medium">{formData.customerPhone || 'No registrado'}</span>
                    </div>
                  </div>

                  {/* ID */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[#6a6c6b] uppercase mb-1">Cédula</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg">
                      <FiLock className="w-3.5 h-3.5 text-[#6a6c6b]" />
                      <span className="text-sm text-[#212529] font-medium">{formData.customerIdNumber || 'No registrado'}</span>
                    </div>
                  </div>
                </div>

                {/* Edit Profile Link */}
                <div className="mt-4 pt-3 border-t border-blue-100">
                  <Link
                    href="/customer/profile"
                    className="flex items-center justify-center gap-2 text-xs text-[#2a63cd] hover:text-[#1e4ba3] font-semibold transition-colors"
                  >
                    <FiInfo className="w-3.5 h-3.5" />
                    Editar datos en mi perfil
                  </Link>
                </div>
              </div>

              {/* Summary Card */}
              <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl animate-slideUp">
                {/* Header - Same style as other sections */}
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-[#212529] flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    Resumen del Pedido
                  </h2>
                </div>

                <div className="p-6">
                  {/* Products List */}
                  <div className="space-y-3 mb-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
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
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="relative flex-shrink-0 w-14 h-14 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-contain p-1"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">
                              {item.name}
                            </h4>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-slate-500 font-medium">x{item.quantity}</span>
                              <div className="text-right">
                                {activeDiscount ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-slate-400 line-through">{formatPrice(originalTotal)}</span>
                                    <span className="text-sm font-bold text-green-600">{formatPrice(finalItemTotal)}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold text-slate-800">{formatPrice(originalTotal)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 my-4"></div>

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Subtotal:</span>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-xs text-slate-400">USD</span>
                          <span className="text-base font-bold text-slate-700">{formatNumber(cartSubtotal)}$</span>
                        </div>
                        {companySettings?.exchangeRateVES && (
                          <div className="text-xs text-[#2a63cd] font-medium">
                            Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cartSubtotal * Number(companySettings.exchangeRateVES))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Discount */}
                    {cartDiscount > 0 && (
                      <div className="flex justify-between items-center animate-pulse">
                        <span className="text-green-600 flex items-center gap-1 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          Descuento:
                        </span>
                        <div className="text-right">
                          <span className="text-base font-bold text-green-600">-{formatPrice(cartDiscount)}</span>
                          {companySettings?.exchangeRateVES && (
                            <div className="text-xs text-green-500 font-medium">
                              -Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cartDiscount * Number(companySettings.exchangeRateVES))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Shipping with Detailed Breakdown */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-sm">Envío:</span>
                          {/* Info tooltip */}
                          <div className="group relative">
                            <FiInfo className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-72 z-50">
                              <div className="font-semibold mb-1">📦 Sobre el envío</div>
                              <p className="text-slate-300 leading-relaxed">
                                Los costos de envío son manejados por las empresas de encomienda (ZOOM, MRW, TEALCA). Solo cobramos <strong className="text-white">${shippingBreakdown.packagingFee.toFixed(2)}</strong> por embalaje.
                              </p>
                              {shippingBreakdown.totalWeight > 0 && (
                                <p className="text-slate-300 mt-1">
                                  Peso total: <strong className="text-white">{shippingBreakdown.totalWeight.toFixed(2)} kg</strong>
                                </p>
                              )}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {shippingCost > 0 ? (
                            <>
                              <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-xs text-slate-400">USD</span>
                                <span className="text-base font-bold text-slate-700">{formatNumber(shippingCost)}$</span>
                              </div>
                              {companySettings?.exchangeRateVES && (
                                <div className="text-xs text-[#2a63cd] font-medium">
                                  Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(shippingCost * Number(companySettings.exchangeRateVES))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-sm font-bold text-green-600">Gratis</span>
                          )}
                        </div>
                      </div>

                      {/* Shipping Breakdown Details (expandable) */}
                      {shippingCost > 0 && formData.deliveryMethod !== 'PICKUP' && (
                        <details className="group">
                          <summary className="text-[10px] text-[#2a63cd] font-medium cursor-pointer hover:text-[#1e4ba3] flex items-center gap-1">
                            <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Ver desglose de envío
                          </summary>
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                            {/* Free shipping badge */}
                            {shippingBreakdown.isFreeShipping && (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-1.5 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-semibold">¡Envío gratis por compras mayores!</span>
                              </div>
                            )}

                            {/* Digital items */}
                            {shippingBreakdown.digitalItems.length > 0 && (
                              <div className="space-y-1">
                                <div className="font-semibold text-purple-600 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Digitales (sin envío):
                                </div>
                                {shippingBreakdown.digitalItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-500 pl-4">
                                    <span className="truncate max-w-[60%]">{item.name} x{item.quantity}</span>
                                    <span className="text-green-600 font-medium">$0.00</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Consolidable items */}
                            {shippingBreakdown.consolidableItems.length > 0 && !shippingBreakdown.isFreeShipping && (
                              <div className="space-y-1">
                                <div className="font-semibold text-blue-600 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                  Consolidables (por peso):
                                </div>
                                {shippingBreakdown.consolidableItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-500 pl-4">
                                    <span className="truncate max-w-[55%]">{item.name} x{item.quantity}</span>
                                    <span className="text-slate-600">
                                      {item.volumetricWeight > item.weight ? (
                                        <span className="text-amber-600" title="Se usa peso volumétrico">
                                          {item.usedWeight.toFixed(2)} kg*
                                        </span>
                                      ) : (
                                        <span>{item.usedWeight.toFixed(2)} kg</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                                <div className="flex justify-between pt-1 border-t border-slate-200 font-medium">
                                  <span className="text-slate-600">Subtotal ({shippingBreakdown.totalWeight.toFixed(2)} kg × $2/kg):</span>
                                  <span className="text-blue-600">${shippingBreakdown.consolidatedCost.toFixed(2)}</span>
                                </div>
                              </div>
                            )}

                            {/* Bulky items */}
                            {shippingBreakdown.bulkyItems.length > 0 && !shippingBreakdown.isFreeShipping && (
                              <div className="space-y-1">
                                <div className="font-semibold text-amber-600 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                  Productos grandes (envío individual):
                                </div>
                                {shippingBreakdown.bulkyItems.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-500 pl-4">
                                    <span className="truncate max-w-[60%]">{item.name} x{item.quantity}</span>
                                    <span className="text-amber-600 font-medium">${item.cost.toFixed(2)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between pt-1 border-t border-slate-200 font-medium">
                                  <span className="text-slate-600">Subtotal envío individual:</span>
                                  <span className="text-amber-600">${shippingBreakdown.bulkyCost.toFixed(2)}</span>
                                </div>
                              </div>
                            )}

                            {/* Packaging fee */}
                            <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-600">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                                </svg>
                                Embalaje y preparación:
                              </span>
                              <span className="font-medium">${shippingBreakdown.packagingFee.toFixed(2)}</span>
                            </div>

                            {/* Volumetric weight note */}
                            {shippingBreakdown.consolidableItems.some(item => item.volumetricWeight > item.weight) && (
                              <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-start gap-1">
                                <span className="font-bold">*</span>
                                <span>Se usó peso volumétrico (L×A×H÷5000) por ser mayor al peso real.</span>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>

                    {/* Total - Premium Style */}
                    <div className="pt-4 border-t-2 border-dashed border-slate-200">
                      <div className="flex justify-between items-start">
                        <span className="text-lg font-bold text-slate-800">Total:</span>
                        <div className="text-right">
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-sm font-bold text-slate-400">USD</span>
                            <span className="text-3xl font-black text-slate-800">{formatNumber(finalTotal)}$</span>
                          </div>
                          {companySettings?.exchangeRateVES && (
                            <div className="mt-1 px-3 py-1 bg-[#2a63cd]/10 rounded-lg inline-block">
                              <span className="text-sm font-bold text-[#2a63cd]">
                                Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(finalTotal * Number(companySettings.exchangeRateVES))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Exchange Rate Note */}
                    {companySettings?.exchangeRateVES && (
                      <div className="text-[10px] text-slate-400 text-center pt-2">
                        Tasa de cambio: 1 USD = Bs. {Number(companySettings.exchangeRateVES).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Continue Shopping Link */}
                <div className="px-6 pb-6">
                  <Link
                    href="/productos"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-300 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Seguir Comprando
                  </Link>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-lg animate-slideUp" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Compra Segura</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600 group hover:text-[#2a63cd] transition-colors">
                    <div className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FiLock className="w-4 h-4 text-[#2a63cd]" />
                    </div>
                    <span className="font-medium">Pago Seguro SSL</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 group hover:text-[#2a63cd] transition-colors">
                    <div className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FiCheckCircle className="w-4 h-4 text-[#2a63cd]" />
                    </div>
                    <span className="font-medium">Garantía Oficial</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 group hover:text-[#2a63cd] transition-colors">
                    <div className="w-8 h-8 bg-[#2a63cd]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FiTruck className="w-4 h-4 text-[#2a63cd]" />
                    </div>
                    <span className="font-medium">Envío Rápido</span>
                  </div>
                </div>
              </div>
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
