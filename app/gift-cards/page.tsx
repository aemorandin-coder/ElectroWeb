'use client';
import { formatUSD, formatVES } from '@/lib/currency';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PublicHeader from '@/components/public/PublicHeader';
import { useSettings } from '@/contexts/SettingsContext';
import ProcessingOverlay, { GIFT_CARD_STEPS } from '@/components/ProcessingOverlay';
import RechargeModal from '@/components/modals/RechargeModalV2';
import GiftCard3D from '@/components/gift-card/GiftCard3D';
import PageHeader from '@/components/ui/PageHeader';
import { GIFT_CARD_DESIGNS, getGiftCardDesign, type GiftCardDesignSlug } from '@/lib/gift-card-designs';
import Footer from '@/components/Footer';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { adminModalOverlay, adminModalPanel, adminNotice } from '@/lib/admin-ui';

import { FiGift, FiCheck, FiAlertCircle, FiMail, FiArrowRight, FiClock, FiPlusCircle, FiLogIn, FiCreditCard, FiLock, FiCalendar, FiEye, FiUser, FiStar } from 'react-icons/fi';
import { AiOutlineDeliveredProcedure } from 'react-icons/ai';

// Predefined amounts
const PRESET_AMOUNTS = [25, 50, 100, 200];

export default function GiftCardsPage() {
    const { data: session } = useSession();
    const router = useRouter();

    // Form state
    const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [designSlug, setDesignSlug] = useState<GiftCardDesignSlug>('electro');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [personalMessage, setPersonalMessage] = useState('');

    // NEW: Gift for myself checkbox
    const [isForMyself, setIsForMyself] = useState(false);

    // NEW: Scheduled delivery date
    const [scheduledDate, setScheduledDate] = useState<string>('');
    const [showScheduledSection, setShowScheduledSection] = useState(false);

    // NEW: Show email preview modal
    const [showEmailPreview, setShowEmailPreview] = useState(false);

    // Tasa y logo de los settings que el layout ya leyó en el servidor (antes se pedía la tasa a /api/exchange-rates)
    const { settings: publicSettings } = useSettings();
    const companyLogo = publicSettings?.logo ?? null;
    const exchangeRate = publicSettings?.exchangeRateVES || null;

    // Form refs for validation focus
    const recipientNameRef = useRef<HTMLInputElement>(null);
    const recipientEmailRef = useRef<HTMLInputElement>(null);

    // Form errors
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

    // Validation state
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [recipientExists, setRecipientExists] = useState<boolean | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    useBodyScrollLock(showInviteModal || showEmailPreview);
    const [isSendingInvite, setIsSendingInvite] = useState(false);

    // Purchase state
    const [isLoading, setIsLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [saldoCargado, setSaldoCargado] = useState(false);
    const [showRecharge, setShowRecharge] = useState(false);

    // Processing overlay state
    const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
    const [processingStep, setProcessingStep] = useState(0);
    const [processingError, setProcessingError] = useState<string | null>(null);

    // Calculate final amount
    const finalAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);
    const canPayWithBalance = userBalance >= finalAmount && finalAmount > 0;
    // C-87 (Andrés, 16/09): la gift card solo se paga con saldo. Sin saldo suficiente se recarga primero;
    // antes iba al carrito y el checkout la rechazaba ("Las gift cards no se pueden pagar desde el checkout").
    const faltaSaldo = Math.max(0, finalAmount - userBalance);
    const finalAmountBs = exchangeRate ? finalAmount * exchangeRate : null;

    // NEW: Handle "for myself" checkbox
    useEffect(() => {
        if (isForMyself && session?.user) {
            setRecipientName(session.user.name || '');
            setRecipientEmail(session.user.email || '');
        } else if (!isForMyself) {
            // Only clear if switching OFF
            if (recipientEmail === session?.user?.email) {
                setRecipientName('');
                setRecipientEmail('');
            }
        }
    }, [isForMyself, session]);

    // Saldo del cliente: al entrar y después de recargar
    const cargarSaldo = useCallback(() => {
        return fetch('/api/customer/balance')
            .then(res => res.json())
            .then(data => {
                if (data.balance !== undefined) setUserBalance(Number(data.balance) || 0);
            })
            .catch(console.error)
            .finally(() => setSaldoCargado(true));
    }, []);

    useEffect(() => {
        if (session?.user) cargarSaldo();
    }, [session, cargarSaldo]);

    // Check if recipient email exists
    const checkRecipientEmail = useCallback(async (email: string) => {
        if (!email || !email.includes('@')) {
            setRecipientExists(null);
            return;
        }

        setIsCheckingEmail(true);
        try {
            const res = await fetch(`/api/users/check?email=${encodeURIComponent(email)}`);
            const data = await res.json();
            if (res.ok) {
                setRecipientExists(data.exists);
            } else {
                setRecipientExists(null);
            }
        } catch (error) {
            console.error('Error checking email:', error);
            setRecipientExists(null);
        } finally {
            setIsCheckingEmail(false);
        }
    }, []);

    // Debounced email check
    useEffect(() => {
        const timer = setTimeout(() => {
            if (recipientEmail) {
                checkRecipientEmail(recipientEmail);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [recipientEmail, checkRecipientEmail]);

    // Handle purchase
    const handlePurchase = async () => {
        if (!session) {
            router.push('/login?callbackUrl=%2Fgift-cards');
            return;
        }

        if (finalAmount < 5) {
            toast.error('El monto mínimo es $5');
            return;
        }

        // Clear previous errors
        setErrors({});

        if (!recipientName.trim()) {
            setErrors(prev => ({ ...prev, name: 'Ingresa el nombre del destinatario' }));
            recipientNameRef.current?.focus();
            toast.error('Ingresa el nombre del destinatario');
            return;
        }

        if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
            setErrors(prev => ({ ...prev, email: 'Ingresa un email válido' }));
            recipientEmailRef.current?.focus();
            toast.error('Ingresa un email válido');
            return;
        }

        // If recipient doesn't exist, show invite modal
        if (recipientExists === false) {
            setErrors(prev => ({ ...prev, email: 'Este usuario no está registrado en Electro Shop' }));
            recipientEmailRef.current?.focus();
            setShowInviteModal(true);
            return;
        }

        if (!canPayWithBalance) {
            setShowRecharge(true);
            return;
        }

        // Show processing overlay and scroll to view
        setShowProcessingOverlay(true);
        setProcessingStep(0);
        setProcessingError(null);
        setIsLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Los pasos siguen lo que pasa de verdad: antes había 9 segundos de esperas simuladas con setTimeout
        const pausa = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        try {
            // El servidor descuenta el saldo y crea la tarjeta en una sola operación (C-71)
            setProcessingStep(1);
            const giftRes = await fetch('/api/gift-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalAmount,
                    recipientEmail,
                    recipientName,
                    message: personalMessage,
                    design: designSlug,
                    payWithBalance: true,
                }),
            });

            if (!giftRes.ok) {
                const errorData = await giftRes.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al crear la gift card');
            }

            setProcessingStep(3);
            await pausa(700);
            setProcessingStep(4);
            toast.success('Gift Card enviada');
            router.push('/customer/balance');
        } catch (error) {
            console.error('Error:', error);
            setProcessingError(error instanceof Error ? error.message : 'Ocurrió un error. Intenta de nuevo.');
            await new Promise(resolve => setTimeout(resolve, 3000));
            setShowProcessingOverlay(false);
            setProcessingError(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Send invitation email
    const sendInvitation = async () => {
        setIsSendingInvite(true);
        try {
            const res = await fetch('/api/users/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: recipientEmail,
                    senderName: session?.user?.name || 'Un amigo',
                    giftAmount: finalAmount,
                }),
            });

            if (res.ok) {
                toast.success('Invitación enviada exitosamente');
                setShowInviteModal(false);
            } else {
                throw new Error('Error al enviar invitación');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('No se pudo enviar la invitación');
        } finally {
            setIsSendingInvite(false);
        }
    };

    return (
        <div className="min-h-dvh bg-surface">

            <PublicHeader />

            <PageHeader
                breadcrumbs={[{ label: 'Gift Cards' }]}
                icon={<FiGift />}
                eyebrow="Gift Cards"
                title="Regala tecnología"
                description="Elige el diseño y el monto. La tarjeta llega al correo de quien la recibe y la canjea como saldo en la tienda."
                actions={
                    <Link href="/canjear-gift-card" className="inline-flex h-11 items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-100">
                        Canjear una gift card
                    </Link>
                }
            />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-12">
                <div className="grid lg:grid-cols-2 gap-4 lg:gap-8">

                    {/* Left: Gift Card Preview */}
                    <div className="flex flex-col items-center">
                        <GiftCard3D
                            className="mb-5 w-full max-w-[340px] lg:mb-8 lg:max-w-[440px]"
                            design={designSlug}
                            amountUSD={finalAmount}
                            recipientName={recipientName || null}
                            kind="digital"
                        />

                        <p className="mb-3 text-center text-xs text-muted lg:mb-5 lg:text-sm">
                            Inclínala con el dedo o el mouse. Arrástrala de lado para ver el reverso.
                        </p>

                        <fieldset className="w-full max-w-[440px]">
                            <legend className="sr-only">Diseño de la tarjeta</legend>
                            <div className="grid grid-cols-4 gap-2">
                                {GIFT_CARD_DESIGNS.map((design) => {
                                    const selected = designSlug === design.slug;
                                    return (
                                        <label
                                            key={design.slug}
                                            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2 text-center text-xs font-medium transition-colors ${selected ? 'border-brand-500 bg-brand-50 text-ink' : 'border-line text-ink-soft hover:border-brand-200'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="gift-card-design"
                                                value={design.slug}
                                                checked={selected}
                                                onChange={() => setDesignSlug(design.slug)}
                                                className="sr-only"
                                            />
                                            <span className="block aspect-[1.586] w-full rounded-md" style={{ background: design.background }} aria-hidden="true" />
                                            {design.name}
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>
                    </div>

                    {/* Right: Configuration Form */}
                    <div className="bg-white rounded-xl lg:rounded-2xl p-3 lg:p-5 shadow-xl border border-line">
                        {/* Step 1: Amount */}
                        <div className="mb-3 lg:mb-5">
                            <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                                Selecciona el monto
                            </h3>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 mb-2">
                                {PRESET_AMOUNTS.map((amount) => (
                                    <div key={amount} className="relative">
                                        {amount === 50 && (
                                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full z-20 whitespace-nowrap inline-flex items-center gap-1">
                                                <FiStar className="h-3 w-3 fill-current shrink-0" aria-hidden="true" />Popular
                                            </span>
                                        )}
                                        <button
                                            onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                                            className={`w-full group relative py-3 rounded-xl font-bold text-base transition-colors ${selectedAmount === amount
                                                ? 'bg-brand-600 text-white'
                                                : 'bg-white text-ink border border-line hover:border-brand-300'
                                                }`}
                                        >
                                            
                                            <span className="relative z-10 flex items-center justify-center gap-0.5">
                                                <span className={`text-xs ${selectedAmount === amount ? 'text-brand-100' : 'text-muted'}`}>$</span>
                                                <span>{amount}</span>
                                            </span>
                                        </button>
                                    </div>
                                ))}
                                {/* Custom Amount Input - in the same row */}
                                <div className="relative group col-span-2 sm:col-span-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted font-semibold text-xs">$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="Otro"
                                        title="Ingresa un monto personalizado (múltiplos de $5)"
                                        value={customAmount}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Only allow numbers
                                            if (!/^\d*$/.test(value)) return;
                                            // Convert to number for validation
                                            const numValue = parseInt(value, 10);
                                            // Don't allow values greater than 1000
                                            if (numValue > 1000) return;
                                            setCustomAmount(value);
                                            setSelectedAmount(null);
                                        }}
                                        onBlur={(e) => {
                                            const value = parseInt(e.target.value, 10);
                                            if (!e.target.value || isNaN(value)) return;

                                            // Round to nearest multiple of 5
                                            let rounded = Math.round(value / 5) * 5;

                                            // Ensure minimum of 5 and maximum of 1000
                                            if (rounded < 5) rounded = 5;
                                            if (rounded > 1000) rounded = 1000;

                                            setCustomAmount(rounded.toString());
                                        }}
                                        className={`w-full pl-5 pr-8 py-3 rounded-xl border text-center font-bold text-base transition-colors outline-none ${customAmount
                                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                                            : 'border-line text-ink hover:border-brand-300'
                                            }`}
                                    />
                                    {/* Tooltip icon */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-help">
                                        <svg className="w-4 h-4 text-muted hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {/* Tooltip popup */}
                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-ink text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[var(--z-dropdown)] shadow-lg">
                                            <div className="font-semibold mb-1">Monto personalizado</div>
                                            <ul className="space-y-0.5 text-subtle">
                                                <li>• Mínimo: $5</li>
                                                <li>• Máximo: $1,000</li>
                                                <li>• Solo múltiplos de $5</li>
                                            </ul>
                                            <div className="text-subtle mt-1 text-xs">Se redondea automáticamente</div>
                                            <div className="absolute -bottom-1 right-3 w-2 h-2 bg-ink rotate-45"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Min/Max indicator */}
                            <p className="text-xs text-muted text-center">Mínimo $5 — Máximo $1,000 (múltiplos de $5)</p>
                        </div>

                        {/* Step 2: Recipient Info */}
                        <div className="mb-3">
                            <h3 className="text-sm font-bold text-ink mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                                Destinatario
                            </h3>

                            {/* Gift Type Selection - Two buttons in a row */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                {/* For Someone Else */}
                                <button
                                    type="button"
                                    onClick={() => setIsForMyself(false)}
                                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg font-semibold text-xs transition-all ${!isForMyself
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-surface text-ink-soft hover:bg-line/50 border border-line'
                                        }`}
                                >
                                    <FiGift className="w-3.5 h-3.5" />
                                    Es un regalo
                                </button>

                                {/* For Myself */}
                                {session && (
                                    <button
                                        type="button"
                                        onClick={() => setIsForMyself(true)}
                                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg font-semibold text-xs transition-all ${isForMyself
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-surface text-ink-soft hover:bg-line/50 border border-line'
                                            }`}
                                    >
                                        <FiUser className="w-3.5 h-3.5" />
                                        Para mí mismo
                                    </button>
                                )}
                            </div>

                            {/* Recipient Name & Email Inputs - Same row */}
                            <div className={`grid grid-cols-2 gap-2 transition-all duration-300 ${isForMyself ? 'opacity-60' : 'opacity-100'}`}>
                                {/* Name */}
                                <div className="relative">
                                    <input
                                        ref={recipientNameRef}
                                        type="text"
                                        placeholder="Nombre"
                                        value={recipientName}
                                        readOnly={isForMyself}
                                        onChange={(e) => { if (!isForMyself) { setRecipientName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); } }}
                                        className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors text-xs ${isForMyself ? 'bg-brand-50 border-brand-200 text-brand-700 cursor-default' : errors.name ? 'border-deal bg-deal-bg' : 'border-line focus:border-brand-500'
                                            }`}
                                    />
                                    {isForMyself && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <FiUser className="w-3 h-3 text-brand-500" />
                                        </div>
                                    )}
                                    {errors.name && (
                                        <div className="absolute -bottom-4 left-0 text-xs text-deal flex items-center gap-1">
                                            <FiAlertCircle className="w-2.5 h-2.5" />
                                            {errors.name}
                                        </div>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="relative">
                                    <input
                                        ref={recipientEmailRef}
                                        type="email"
                                        placeholder="Email"
                                        value={recipientEmail}
                                        readOnly={isForMyself}
                                        onChange={(e) => { if (!isForMyself) { setRecipientEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); } }}
                                        className={`w-full px-3 py-2 pr-8 rounded-lg border outline-none transition-colors text-xs ${isForMyself ? 'bg-brand-50 border-brand-200 text-brand-700 cursor-default' :
                                            errors.email ? 'border-deal bg-deal-bg' :
                                                recipientExists === false ? 'border-warning' :
                                                    recipientExists === true ? 'border-success' :
                                                        'border-line focus:border-brand-500'
                                            }`}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        {isForMyself && <FiLock className="w-3 h-3 text-brand-500" />}
                                        {!isForMyself && isCheckingEmail && <span className="text-muted text-xs">...</span>}
                                        {!isForMyself && !isCheckingEmail && recipientExists === true && <FiCheck className="w-3.5 h-3.5 text-success" />}
                                        {!isForMyself && !isCheckingEmail && recipientExists === false && <FiAlertCircle className="w-3.5 h-3.5 text-warning" />}
                                    </div>
                                    {errors.email && (
                                        <div className="absolute -bottom-4 left-0 text-xs text-deal flex items-center gap-1">
                                            <FiAlertCircle className="w-2.5 h-2.5" />
                                            {errors.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isForMyself && (
                                <p className="text-xs text-brand-500 mt-1.5 flex items-center gap-1">
                                    <FiLock className="w-2.5 h-2.5" />
                                    Se usarán tus datos de cuenta automáticamente
                                </p>
                            )}

                            {recipientExists === false && !errors.email && (
                                <p className="text-xs text-warning-strong mt-1">
                                    Usuario no registrado. Se enviará invitación.
                                </p>
                            )}
                        </div>

                        {/* Step 3: Personal Message */}
                        <div className="mb-3">
                            <h3 className="text-sm font-bold text-ink mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                                Mensaje personal (opcional)
                            </h3>
                            <textarea
                                placeholder="Escribe un mensaje especial..."
                                value={personalMessage}
                                onChange={(e) => setPersonalMessage(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-line focus:border-brand-500 focus:ring-0 text-ink placeholder-muted outline-none resize-none text-xs"
                                rows={2}
                                maxLength={200}
                            />
                            <p className="text-xs text-muted text-right">{personalMessage.length}/200</p>
                        </div>

                        {/* Step 4: Scheduled Delivery (optional) - Collapsible */}
                        {!isForMyself && (
                            <div className="mb-3 border border-line rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowScheduledSection(!showScheduledSection)}
                                    className="w-full px-3 py-2 bg-surface flex items-center justify-between hover:bg-line/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <FiCalendar className="w-3.5 h-3.5 text-brand-600" />
                                        <span className="text-xs font-medium text-ink">Programar envío (opcional)</span>
                                    </div>
                                    <svg
                                        className={`w-3.5 h-3.5 text-muted transition-transform duration-300 ${showScheduledSection ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showScheduledSection ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-2 bg-white border-t border-line">
                                        <input
                                            type="date"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-3 py-1.5 rounded-lg border border-line focus:border-brand-500 focus:ring-0 text-ink placeholder-muted outline-none text-xs"
                                        />
                                        <p className="text-xs text-muted mt-1">
                                            {scheduledDate ? `Se enviará el ${new Date(scheduledDate + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}` : 'Dejar vacío para envío inmediato'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Preview Email Button */}
                        {!isForMyself && recipientName && recipientEmail && (
                            <button
                                type="button"
                                onClick={() => setShowEmailPreview(true)}
                                className="w-full mb-4 py-2 rounded-lg border border-brand-200 text-brand-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-brand-50 transition-colors"
                            >
                                <FiEye className="w-4 h-4" />
                                Ver cómo lucirá el email
                            </button>
                        )}

                        {/* Summary */}
                        <div className="bg-surface rounded-lg p-3 mb-3 border border-line">
                            <div className="flex justify-between mb-1">
                                <span className="text-muted text-sm">Gift Card</span>
                                <div className="text-right">
                                    <span className="font-bold text-ink">{formatUSD(finalAmount)}</span>
                                    {finalAmountBs && (
                                        <p className="text-xs text-muted">≈ {formatVES(finalAmountBs)}</p>
                                    )}
                                </div>
                            </div>
                            {session && (
                                <div className="flex justify-between pt-2 border-t border-line">
                                    <span className="text-muted text-sm">Tu saldo</span>
                                    <span className={`font-bold text-sm ${canPayWithBalance ? 'text-success-strong' : 'text-warning-strong'}`}>
                                        {formatUSD(typeof userBalance === 'number' ? userBalance : 0)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Security Badge */}
                        <div className="flex items-center justify-center gap-2 text-xs text-muted mb-3">
                            <FiLock className="w-3 h-3" />
                            <span>Pago 100% seguro — Entrega garantizada</span>
                        </div>

                        {/* C-87: sin saldo suficiente se recarga aquí mismo; la gift card no pasa por el carrito */}
                        {session && saldoCargado && finalAmount >= 5 && !canPayWithBalance && (
                            <p className={`${adminNotice('warning')} mb-3`}>
                                Te faltan <strong>{formatUSD(faltaSaldo)}</strong> de saldo. Recarga y envía tu gift card desde esta misma página.
                            </p>
                        )}

                        {/* Purchase Button */}
                        <button
                            type="button"
                            onClick={!session || canPayWithBalance ? handlePurchase : () => setShowRecharge(true)}
                            disabled={isLoading || (Boolean(session) && (finalAmount < 5 || !saldoCargado))}
                            className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${!session || finalAmount >= 5
                                ? 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer'
                                : 'bg-line text-muted cursor-not-allowed'
                                }`}
                        >
                            {!session ? (
                                <><FiLogIn className="w-4 h-4" /> Inicia sesión para comprar</>
                            ) : isLoading ? 'Procesando' : !saldoCargado ? 'Cargando tu saldo' : canPayWithBalance ? (
                                <><FiCreditCard className="w-4 h-4" /> Pagar con saldo</>
                            ) : (
                                <><FiPlusCircle className="w-4 h-4" /> Recargar saldo</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Features Section - Compact */}
                <section className="mt-12 mb-8">
                    <h2 className="text-xl font-bold text-center text-ink mb-6">
                        ¿Por qué elegir nuestras Gift Cards?
                    </h2>
                    <div className="grid md:grid-cols-4 gap-4">
                        {[
                            {
                                icon: <AiOutlineDeliveredProcedure className="w-5 h-5" />,
                                title: 'Entrega Instantánea',
                                description: 'Código por email inmediatamente.',
                            },
                            {
                                icon: <FiClock className="w-5 h-5" />,
                                title: 'Sin Expiración',
                                description: 'Úsalas cuando quieras.',
                            },
                            {
                                icon: <FiGift className="w-5 h-5" />,
                                title: 'Personalizable',
                                description: 'Añade un mensaje personal.',
                            },
                            {
                                icon: <FiLock className="w-5 h-5" />,
                                title: '100% Seguro',
                                description: 'Transacciones protegidas y garantizadas.',
                            },
                        ].map((feature, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 shadow-md border border-line text-center">
                                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                                    {feature.icon}
                                </div>
                                <h3 className="text-sm font-bold text-ink mb-1">{feature.title}</h3>
                                <p className="text-xs text-muted">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* CTA Section - Like Homepage */}
            <section className="py-12 bg-brand-600 text-white relative">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-white text-center md:text-left">
                            <h2 className="text-2xl font-bold mb-2">¿Tienes una Gift Card?</h2>
                            <p className="text-base text-white/80">
                                Canjéala ahora y comienza a comprar los mejores productos tecnológicos
                            </p>
                        </div>
                        <Link
                            href="/canjear-gift-card"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-500 text-sm font-bold rounded-xl hover:bg-surface transition-colors whitespace-nowrap"
                        >
                            <FiGift className="w-4 h-4" />
                            Canjear Gift Card
                            <FiArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />

            {/* Invite Modal */}
            {showInviteModal && (
                <div className={adminModalOverlay}>
                    <div className={`${adminModalPanel} max-w-md w-full p-8 text-center`}>
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warning/15 text-warning-strong flex items-center justify-center">
                            <FiMail className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-bold text-ink mb-3">Usuario no registrado</h3>

                        <p className="text-ink-soft mb-6">
                            El email <strong>{recipientEmail}</strong> no está registrado en Electro Shop.
                            <br /><br />
                            ¿Quieres enviarle una invitación para que cree su cuenta y pueda recibir tu regalo de <strong>{formatUSD(finalAmount)}</strong>?
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={sendInvitation}
                                disabled={isSendingInvite}
                                className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                {isSendingInvite ? 'Enviando...' : <><FiMail /> Sí, enviar invitación</>}
                            </button>

                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="w-full py-4 bg-surface border border-line text-ink-soft font-bold rounded-xl hover:bg-line/50 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>

                        <p className="mt-4 text-xs text-muted">
                            La invitación incluirá un enlace para registrarse y recibir el regalo automáticamente.
                        </p>
                    </div>
                </div>
            )}

            {/* Email Preview Modal */}
            {showEmailPreview && (
                <div className={adminModalOverlay}>
                    <div className={`${adminModalPanel} max-w-lg w-full overflow-hidden`}>
                        {/* Email Header */}
                        <div className="bg-brand-600 px-6 py-4 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <FiGift className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold">¡Tienes un regalo de Electro Shop!</p>
                                    <p className="text-xs text-white/70">De: {session?.user?.name || 'Tu amigo'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Email Body */}
                        <div className="p-6 text-center">
                            <h3 className="text-xl font-bold text-ink mb-2">
                                ¡Hola {recipientName}!
                            </h3>
                            <p className="text-ink-soft mb-4">
                                {session?.user?.name || 'Alguien especial'} te ha enviado una Gift Card de Electro Shop por:
                            </p>

                            {/* Gift Card Preview Mini */}
                            <div
                                className="w-48 h-28 mx-auto rounded-xl mb-4 relative overflow-hidden shadow-lg"
                                style={{ background: getGiftCardDesign(designSlug).background }}
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-white drop-shadow-lg">${finalAmount}</span>
                                </div>
                            </div>

                            {personalMessage && (
                                <div className="bg-surface rounded-lg p-3 mb-4 text-sm italic text-ink-soft border border-line">
                                    &ldquo;{personalMessage}&rdquo;
                                </div>
                            )}

                            <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                                <p className="text-xs text-muted mb-2">Tu código único:</p>
                                <p className="font-mono font-bold text-brand-600 text-lg tracking-wider">XXXX-XXXX-XXXX-XXXX</p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setShowEmailPreview(false)}
                                className="w-full py-3 bg-surface border border-line text-ink font-bold rounded-xl hover:bg-line/50 transition-colors"
                            >
                                Cerrar vista previa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <RechargeModal
                isOpen={showRecharge}
                onClose={() => setShowRecharge(false)}
                onSuccess={() => {
                    setShowRecharge(false);
                    cargarSaldo();
                }}
            />

            {/* Processing Overlay - Using reusable component */}
            <ProcessingOverlay
                isVisible={showProcessingOverlay}
                currentStep={processingStep}
                steps={GIFT_CARD_STEPS}
                error={processingError}
                title="Procesando tu Gift Card"
                subtitle="Por favor espera un momento..."
                logoUrl={companyLogo}
            />
        </div>
    );
}
