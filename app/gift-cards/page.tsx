'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useCart } from '@/contexts/CartContext';
import PublicHeader from '@/components/public/PublicHeader';
import ProcessingOverlay, { GIFT_CARD_STEPS } from '@/components/ProcessingOverlay';

import { FiGift, FiCheck, FiAlertCircle, FiMail, FiArrowRight, FiClock, FiShoppingCart, FiCreditCard, FiMonitor, FiCpu, FiHardDrive, FiSmartphone, FiHeadphones, FiWifi, FiLock, FiCalendar, FiEye, FiUser, FiStar } from 'react-icons/fi';
import { AiOutlineDeliveredProcedure } from 'react-icons/ai';

// Predefined amounts
const PRESET_AMOUNTS = [25, 50, 100, 200];

// Epic card designs with mosaic patterns
const CARD_DESIGNS = [
    // Original designs
    {
        id: 'obsidian-gold',
        name: 'Obsidian Gold',
        gradient: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 30%, #2d2d2d 70%, #1a1a1a 100%)',
        accent: '#fbbf24',
        secondAccent: '#f97316',
        pattern: 'golden',
        chipColor: '#fbbf24',
        holographic: true
    },
    {
        id: 'aurora-neon',
        name: 'Aurora Neon',
        gradient: 'linear-gradient(135deg, #0f0f23 0%, #1a0a2e 25%, #16213e 50%, #0a2540 75%, #0f172a 100%)',
        accent: '#38bdf8',
        secondAccent: '#a855f7',
        pattern: 'tech',
        chipColor: '#38bdf8',
        holographic: true
    },
    {
        id: 'cosmic-violet',
        name: 'Cosmic Violet',
        gradient: 'linear-gradient(135deg, #0f0517 0%, #1e1b4b 25%, #4c1d95 50%, #6d28d9 75%, #4c1d95 100%)',
        accent: '#c4b5fd',
        secondAccent: '#f472b6',
        pattern: 'circuit',
        chipColor: '#c4b5fd',
        holographic: true
    },
    {
        id: 'matrix-green',
        name: 'Matrix Green',
        gradient: 'linear-gradient(135deg, #020617 0%, #042f2e 30%, #064e3b 50%, #065f46 70%, #022c22 100%)',
        accent: '#4ade80',
        secondAccent: '#22d3d1',
        pattern: 'diamond',
        chipColor: '#4ade80',
        holographic: true
    },
    // Christmas themes
    {
        id: 'christmas-classic',
        name: 'Navidad Clásica',
        gradient: 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 25%, #c41e3a 50%, #8b0000 75%, #1a472a 100%)',
        accent: '#ffd700',
        secondAccent: '#ff6b6b',
        pattern: 'christmas',
        chipColor: '#ffd700',
        holographic: true
    },
    {
        id: 'winter-wonderland',
        name: 'Invierno Mágico',
        gradient: 'linear-gradient(135deg, #0c2340 0%, #1e3a5f 25%, #4a90b5 50%, #87ceeb 75%, #1e3a5f 100%)',
        accent: '#ffffff',
        secondAccent: '#b8d4e8',
        pattern: 'snowflake',
        chipColor: '#ffffff',
        holographic: true
    },
    // Brand themes - Electro Shop blue
    {
        id: 'electro-premium',
        name: 'Electro Premium',
        gradient: 'linear-gradient(135deg, #1a3b7e 0%, #1e4ba3 25%, #2a63cd 50%, #1e4ba3 75%, #1a3b7e 100%)',
        accent: '#ffffff',
        secondAccent: '#60a5fa',
        pattern: 'brand',
        chipColor: '#ffffff',
        holographic: true
    },
    {
        id: 'electro-dark',
        name: 'Electro Dark',
        gradient: 'linear-gradient(135deg, #0a1628 0%, #0f172a 25%, #1e3a5f 50%, #2a63cd 75%, #0f172a 100%)',
        accent: '#2a63cd',
        secondAccent: '#38bdf8',
        pattern: 'brand',
        chipColor: '#2a63cd',
        holographic: true
    },
];

// Floating Tech Icons component (like homepage)
const FloatingTechIcons = () => {
    const icons = [
        { Icon: FiMonitor, delay: '0s', position: 'top-4 left-8' },
        { Icon: FiCpu, delay: '0.5s', position: 'top-12 right-12' },
        { Icon: FiHardDrive, delay: '1s', position: 'bottom-8 left-16' },
        { Icon: FiSmartphone, delay: '1.5s', position: 'bottom-4 right-8' },
        { Icon: FiHeadphones, delay: '2s', position: 'top-1/2 left-4' },
        { Icon: FiWifi, delay: '2.5s', position: 'top-1/3 right-4' },
    ];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {icons.map(({ Icon, delay, position }, i) => (
                <div
                    key={i}
                    className={`absolute ${position} opacity-20 animate-bounce`}
                    style={{ animationDelay: delay, animationDuration: '3s' }}
                >
                    <Icon className="w-6 h-6 text-white" />
                </div>
            ))}
        </div>
    );
};

// Card Pattern Component - Creates epic holographic effect
const CardPattern = ({ pattern, accent, secondAccent }: { pattern: string; accent: string; secondAccent?: string }) => {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Animated gradient overlay */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    background: `linear-gradient(45deg, transparent 30%, ${accent}15 50%, transparent 70%)`,
                    animation: 'shimmer 3s ease-in-out infinite',
                }}
            />

            {/* Pattern-specific decorations */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 250">
                {/* Circuit lines - default */}
                {(pattern === 'tech' || pattern === 'circuit' || pattern === 'golden' || pattern === 'diamond') && (
                    <>
                        <line x1="0" y1="60" x2="120" y2="60" stroke={accent} strokeWidth="0.5" opacity="0.5" />
                        <line x1="280" y1="60" x2="400" y2="60" stroke={accent} strokeWidth="0.5" opacity="0.5" />
                        <line x1="0" y1="190" x2="80" y2="190" stroke={accent} strokeWidth="0.5" opacity="0.5" />
                        <line x1="320" y1="190" x2="400" y2="190" stroke={accent} strokeWidth="0.5" opacity="0.5" />
                        <circle cx="120" cy="60" r="3" fill={accent} opacity="0.6" />
                        <circle cx="280" cy="60" r="3" fill={accent} opacity="0.6" />
                        <circle cx="80" cy="190" r="3" fill={accent} opacity="0.6" />
                        <circle cx="320" cy="190" r="3" fill={accent} opacity="0.6" />
                        <path d="M10 10 L40 10 L40 30" stroke={accent} strokeWidth="1" fill="none" opacity="0.4" />
                        <path d="M390 10 L360 10 L360 30" stroke={accent} strokeWidth="1" fill="none" opacity="0.4" />
                        <path d="M10 240 L40 240 L40 220" stroke={accent} strokeWidth="1" fill="none" opacity="0.4" />
                        <path d="M390 240 L360 240 L360 220" stroke={accent} strokeWidth="1" fill="none" opacity="0.4" />
                    </>
                )}

                {/* Christmas pattern - stars and ornaments */}
                {pattern === 'christmas' && (
                    <>
                        {/* Stars */}
                        <polygon points="30,15 33,25 43,25 35,32 38,42 30,36 22,42 25,32 17,25 27,25" fill={accent} opacity="0.6" />
                        <polygon points="370,20 372,27 380,27 374,32 376,40 370,36 364,40 366,32 360,27 368,27" fill={accent} opacity="0.5" />
                        <polygon points="350,200 352,207 360,207 354,212 356,220 350,216 344,220 346,212 340,207 348,207" fill={accent} opacity="0.4" />
                        {/* Ornament circles */}
                        <circle cx="50" cy="200" r="12" stroke={secondAccent || accent} strokeWidth="2" fill="none" opacity="0.5" />
                        <line x1="50" y1="188" x2="50" y2="182" stroke={secondAccent || accent} strokeWidth="1.5" opacity="0.5" />
                        <circle cx="350" cy="60" r="10" stroke={secondAccent || accent} strokeWidth="2" fill="none" opacity="0.4" />
                        {/* Holly leaves */}
                        <ellipse cx="380" cy="230" rx="8" ry="4" fill="#2d5a3d" opacity="0.6" transform="rotate(-30 380 230)" />
                        <ellipse cx="388" cy="235" rx="8" ry="4" fill="#2d5a3d" opacity="0.6" transform="rotate(30 388 235)" />
                        <circle cx="384" cy="238" r="3" fill="#c41e3a" opacity="0.8" />
                    </>
                )}

                {/* Snowflake pattern */}
                {pattern === 'snowflake' && (
                    <>
                        {/* Snowflakes */}
                        <g transform="translate(35, 35)" opacity="0.6">
                            <line x1="0" y1="-12" x2="0" y2="12" stroke={accent} strokeWidth="1.5" />
                            <line x1="-10" y1="-6" x2="10" y2="6" stroke={accent} strokeWidth="1.5" />
                            <line x1="-10" y1="6" x2="10" y2="-6" stroke={accent} strokeWidth="1.5" />
                            <line x1="-4" y1="-10" x2="4" y2="-6" stroke={accent} strokeWidth="1" />
                            <line x1="4" y1="-10" x2="-4" y2="-6" stroke={accent} strokeWidth="1" />
                        </g>
                        <g transform="translate(365, 200)" opacity="0.5">
                            <line x1="0" y1="-10" x2="0" y2="10" stroke={accent} strokeWidth="1.5" />
                            <line x1="-8" y1="-5" x2="8" y2="5" stroke={accent} strokeWidth="1.5" />
                            <line x1="-8" y1="5" x2="8" y2="-5" stroke={accent} strokeWidth="1.5" />
                        </g>
                        <g transform="translate(360, 40)" opacity="0.4">
                            <line x1="0" y1="-8" x2="0" y2="8" stroke={accent} strokeWidth="1" />
                            <line x1="-7" y1="-4" x2="7" y2="4" stroke={accent} strokeWidth="1" />
                            <line x1="-7" y1="4" x2="7" y2="-4" stroke={accent} strokeWidth="1" />
                        </g>
                        <g transform="translate(50, 210)" opacity="0.5">
                            <line x1="0" y1="-10" x2="0" y2="10" stroke={accent} strokeWidth="1.5" />
                            <line x1="-8" y1="-5" x2="8" y2="5" stroke={accent} strokeWidth="1.5" />
                            <line x1="-8" y1="5" x2="8" y2="-5" stroke={accent} strokeWidth="1.5" />
                        </g>
                        {/* Small dots like snow */}
                        <circle cx="100" cy="50" r="2" fill={accent} opacity="0.4" />
                        <circle cx="300" cy="80" r="1.5" fill={accent} opacity="0.3" />
                        <circle cx="150" cy="200" r="2" fill={accent} opacity="0.4" />
                        <circle cx="250" cy="180" r="1.5" fill={accent} opacity="0.3" />
                    </>
                )}

                {/* Brand pattern - Electro Shop style */}
                {pattern === 'brand' && (
                    <>
                        {/* Stylized "E" shape */}
                        <g transform="translate(340, 30)" opacity="0.5">
                            <path d="M0 0 L20 0 L20 4 L4 4 L4 10 L16 10 L16 14 L4 14 L4 20 L20 20 L20 24 L0 24 Z" fill={accent} />
                        </g>
                        {/* Tech lines */}
                        <line x1="20" y1="40" x2="100" y2="40" stroke={accent} strokeWidth="1" opacity="0.4" strokeDasharray="4 2" />
                        <line x1="300" y1="210" x2="380" y2="210" stroke={accent} strokeWidth="1" opacity="0.4" strokeDasharray="4 2" />
                        {/* Corner accents */}
                        <path d="M10 10 L30 10 M10 10 L10 30" stroke={accent} strokeWidth="2" fill="none" opacity="0.5" />
                        <path d="M390 10 L370 10 M390 10 L390 30" stroke={accent} strokeWidth="2" fill="none" opacity="0.5" />
                        <path d="M10 240 L30 240 M10 240 L10 220" stroke={accent} strokeWidth="2" fill="none" opacity="0.5" />
                        <path d="M390 240 L370 240 M390 240 L390 220" stroke={accent} strokeWidth="2" fill="none" opacity="0.5" />
                        {/* Grid dots */}
                        <circle cx="60" cy="200" r="2" fill={accent} opacity="0.3" />
                        <circle cx="80" cy="200" r="2" fill={accent} opacity="0.3" />
                        <circle cx="60" cy="220" r="2" fill={accent} opacity="0.3" />
                        <circle cx="80" cy="220" r="2" fill={accent} opacity="0.3" />
                    </>
                )}
            </svg>

            {/* Holographic shimmer */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `linear-gradient(105deg, transparent 40%, ${accent}10 45%, ${secondAccent || accent}15 50%, ${accent}10 55%, transparent 60%)`,
                    backgroundSize: '200% 200%',
                    animation: 'gradient-x 4s ease infinite',
                }}
            />

            {/* Floating particles */}
            <div className="absolute top-4 right-8 w-1 h-1 rounded-full animate-ping" style={{ backgroundColor: accent, animationDuration: '2s' }} />
            <div className="absolute top-12 right-20 w-0.5 h-0.5 rounded-full animate-ping" style={{ backgroundColor: accent, animationDuration: '3s', animationDelay: '0.5s' }} />
            <div className="absolute bottom-16 left-12 w-1 h-1 rounded-full animate-ping" style={{ backgroundColor: accent, animationDuration: '2.5s', animationDelay: '1s' }} />
        </div>
    );
};

// Generate a fictitious gift card code
const generateFakeCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments = [];
    for (let s = 0; s < 4; s++) {
        let segment = '';
        for (let i = 0; i < 4; i++) {
            segment += chars[(s * 4 + i * 7) % chars.length];
        }
        segments.push(segment);
    }
    return segments.join('-');
};

const FAKE_CODE = 'ELEC-GIFT-2024-SHOP';

export default function GiftCardsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { addItem } = useCart();

    // Form state
    const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [selectedDesign, setSelectedDesign] = useState(CARD_DESIGNS[0]);
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [personalMessage, setPersonalMessage] = useState('');
    const [isFlipped, setIsFlipped] = useState(false);

    // NEW: Gift for myself checkbox
    const [isForMyself, setIsForMyself] = useState(false);

    // NEW: Scheduled delivery date
    const [scheduledDate, setScheduledDate] = useState<string>('');
    const [showScheduledSection, setShowScheduledSection] = useState(false);

    // NEW: Design category tabs
    const [designCategory, setDesignCategory] = useState<'all' | 'premium' | 'christmas' | 'brand'>('all');

    // NEW: Show email preview modal
    const [showEmailPreview, setShowEmailPreview] = useState(false);

    // NEW: Exchange rate for Bs display
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);

    // Company logo for overlay
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);

    // Form refs for validation focus
    const recipientNameRef = useRef<HTMLInputElement>(null);
    const recipientEmailRef = useRef<HTMLInputElement>(null);

    // Form errors
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

    // Validation state
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [recipientExists, setRecipientExists] = useState<boolean | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [isSendingInvite, setIsSendingInvite] = useState(false);

    // Purchase state
    const [isLoading, setIsLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);

    // Processing overlay state
    const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);
    const [processingStep, setProcessingStep] = useState(0);
    const [processingError, setProcessingError] = useState<string | null>(null);

    // Calculate final amount
    const finalAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);
    const canPayWithBalance = userBalance >= finalAmount && finalAmount > 0;
    const finalAmountBs = exchangeRate ? finalAmount * exchangeRate : null;

    // Filter designs by category
    const filteredDesigns = designCategory === 'all'
        ? CARD_DESIGNS
        : CARD_DESIGNS.filter(d => {
            if (designCategory === 'premium') return ['obsidian-gold', 'aurora-neon', 'cosmic-violet', 'matrix-green'].includes(d.id);
            if (designCategory === 'christmas') return ['christmas-classic', 'winter-wonderland'].includes(d.id);
            if (designCategory === 'brand') return ['electro-premium', 'electro-dark'].includes(d.id);
            return true;
        });

    // Fetch exchange rate and company logo
    useEffect(() => {
        // Fetch exchange rate
        fetch('/api/exchange-rates')
            .then(res => res.json())
            .then(data => {
                if (data.rateVES) setExchangeRate(data.rateVES);
            })
            .catch(console.error);

        // Fetch company settings for logo
        fetch('/api/settings/public')
            .then(res => res.json())
            .then(data => {
                if (data.logo) setCompanyLogo(data.logo);
            })
            .catch(console.error);
    }, []);

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

    // Fetch user balance
    useEffect(() => {
        if (session?.user) {
            fetch('/api/customer/balance')
                .then(res => res.json())
                .then(data => {
                    if (data.balance !== undefined && typeof data.balance === 'number') {
                        setUserBalance(data.balance);
                    } else if (data.balance !== undefined) {
                        setUserBalance(parseFloat(data.balance) || 0);
                    }
                })
                .catch(console.error);
        }
    }, [session]);

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
            toast.error('Debes iniciar sesión para comprar');
            router.push('/login?redirect=/gift-cards');
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

        // Show processing overlay and scroll to view
        setShowProcessingOverlay(true);
        setProcessingStep(0);
        setProcessingError(null);
        setIsLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            // Step 1: Verificando pago (3 sec delay)
            await new Promise(resolve => setTimeout(resolve, 3000));
            setProcessingStep(1);

            if (canPayWithBalance) {
                // Pay with balance
                const res = await fetch('/api/customer/balance/deduct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: finalAmount,
                        description: `Gift Card para ${recipientName}`,
                    }),
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Error al procesar el pago');
                }

                // Step 2: Creando Gift Card (3 sec delay)
                setProcessingStep(2);
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Create gift card
                const giftRes = await fetch('/api/gift-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: finalAmount,
                        recipientEmail,
                        recipientName,
                        message: personalMessage,
                        design: selectedDesign.id,
                    }),
                });

                if (!giftRes.ok) {
                    const errorData = await giftRes.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Error al crear la gift card');
                }

                // Step 3: Enviando al correo (3 sec delay)
                setProcessingStep(3);
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Step 4: Redirigiendo (3 sec delay)
                setProcessingStep(4);
                await new Promise(resolve => setTimeout(resolve, 3000));

                toast.success('¡Gift Card enviada exitosamente!');
                router.push('/customer/balance');
            } else {
                // Add to cart with design info encoded in ID
                addItem({
                    id: `gift-card-${selectedDesign.id}-${Date.now()}`,
                    name: `Gift Card $${finalAmount} para ${recipientName}`,
                    price: finalAmount,
                    imageUrl: `gift-card-design:${selectedDesign.id}`,
                    stock: 999,
                });

                setProcessingStep(4);
                await new Promise(resolve => setTimeout(resolve, 2000));

                setShowProcessingOverlay(false);
                toast.success('Gift Card agregada al carrito');
                router.push('/carrito');
            }
        } catch (error: any) {
            console.error('Error:', error);
            setProcessingError(error.message || 'Ocurrió un error. Intenta de nuevo.');
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
        <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#f8f9fa]">
            {/* CSS for animations */}
            <style jsx global>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%) skewX(-20deg); }
                    100% { transform: translateX(200%) skewX(-20deg); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>

            <PublicHeader />

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                <FloatingTechIcons />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full">
                            <FiGift className="w-4 h-4 text-white" />
                            <span className="text-white text-xs font-semibold">El regalo perfecto</span>
                        </div>
                        <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
                        Regala <span className="bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">Tecnología</span>
                    </h1>
                    <p className="text-base text-white/90 max-w-3xl mx-auto leading-relaxed">
                        Ellos eligen, tú regalas felicidad. Gift Cards instantáneas para cualquier ocasión.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid lg:grid-cols-2 gap-8">

                    {/* Left: Gift Card Preview */}
                    <div className="flex flex-col items-center">
                        {/* Epic Card Preview */}
                        <div
                            onClick={() => setIsFlipped(!isFlipped)}
                            className="cursor-pointer mb-6 group"
                            style={{ perspective: '1200px', width: '400px', height: '250px' }}
                        >
                            <div
                                className="w-full h-full transition-transform duration-700 group-hover:scale-105"
                                style={{
                                    transformStyle: 'preserve-3d',
                                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                }}
                            >
                                {/* Front */}
                                <div
                                    className="absolute w-full h-full rounded-3xl overflow-hidden"
                                    style={{
                                        backfaceVisibility: 'hidden',
                                        background: selectedDesign.gradient,
                                        boxShadow: `0 25px 50px -12px ${selectedDesign.accent}40, 0 12px 24px -8px rgba(0,0,0,0.3)`,
                                    }}
                                >
                                    <CardPattern pattern={selectedDesign.pattern} accent={selectedDesign.accent} secondAccent={(selectedDesign as any).secondAccent} />

                                    {/* Holographic border effect */}
                                    <div className="absolute inset-0 rounded-3xl border-2 border-white/10" />
                                    <div
                                        className="absolute inset-0 rounded-3xl"
                                        style={{
                                            background: `linear-gradient(135deg, ${selectedDesign.accent}20 0%, transparent 50%, ${(selectedDesign as any).secondAccent || selectedDesign.accent}20 100%)`,
                                        }}
                                    />

                                    <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                {/* Premium Logo - Using Company Favicon */}
                                                <div
                                                    className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm overflow-hidden"
                                                    style={{ background: `linear-gradient(135deg, ${selectedDesign.accent}40, ${selectedDesign.accent}20)`, border: `1px solid ${selectedDesign.accent}50` }}
                                                >
                                                    <Image
                                                        src="/uploads/favicon-1763674129215.png"
                                                        alt="Electro Shop"
                                                        width={32}
                                                        height={32}
                                                        className="object-contain"
                                                        unoptimized
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-white font-black text-xl tracking-tight">ELECTRO</p>
                                                    <p className="text-xs font-semibold tracking-widest" style={{ color: selectedDesign.accent }}>SHOP</p>
                                                </div>
                                            </div>
                                            <div
                                                className="px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest backdrop-blur-sm"
                                                style={{ background: `${selectedDesign.accent}25`, color: selectedDesign.accent, border: `1px solid ${selectedDesign.accent}40` }}
                                            >
                                                GIFT CARD
                                            </div>
                                        </div>

                                        {/* EMV Chip */}
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2">
                                            <div
                                                className="w-12 h-10 rounded-lg relative overflow-hidden"
                                                style={{
                                                    background: `linear-gradient(145deg, ${(selectedDesign as any).chipColor || '#fbbf24'} 0%, #d4a41d 50%, ${(selectedDesign as any).chipColor || '#fbbf24'} 100%)`,
                                                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.3)'
                                                }}
                                            >
                                                {/* Chip grid lines */}
                                                <div className="absolute inset-0 grid grid-cols-3 gap-px p-1">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className="bg-black/10 rounded-sm" />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-white/50 text-xs font-medium tracking-wider mb-1">VALOR</p>
                                                <p
                                                    className="text-5xl font-black tracking-tight"
                                                    style={{ color: selectedDesign.accent, textShadow: `0 0 30px ${selectedDesign.accent}60` }}
                                                >
                                                    ${finalAmount.toFixed(0)}
                                                    <span className="text-2xl font-bold">.00</span>
                                                </p>
                                            </div>
                                            {/* Decorative contactless icon */}
                                            <div className="opacity-40">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                                    <path d="M8.5 14.5A4.5 4.5 0 0 1 13 10" strokeLinecap="round" />
                                                    <path d="M5.5 17A8 8 0 0 1 13 7" strokeLinecap="round" />
                                                    <path d="M2.5 19.5A12 12 0 0 1 13 4" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium holographic strip at bottom */}
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-3"
                                        style={{
                                            backgroundImage: `linear-gradient(90deg, ${selectedDesign.accent}, ${(selectedDesign as any).secondAccent || selectedDesign.accent}, ${selectedDesign.accent})`,
                                            backgroundSize: '200% 100%',
                                            animation: 'gradient-x 3s ease infinite',
                                        }}
                                    />
                                </div>

                                {/* Back */}
                                <div
                                    className="absolute w-full h-full rounded-3xl overflow-hidden"
                                    style={{
                                        backfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)',
                                        background: selectedDesign.gradient,
                                        boxShadow: `0 25px 50px -12px ${selectedDesign.accent}40, 0 12px 24px -8px rgba(0,0,0,0.3)`,
                                    }}
                                >
                                    <CardPattern pattern={selectedDesign.pattern} accent={selectedDesign.accent} secondAccent={(selectedDesign as any).secondAccent} />
                                    <div className="absolute inset-0 rounded-3xl border-2 border-white/10" />

                                    {/* Magnetic stripe */}
                                    <div className="absolute top-6 left-0 right-0 h-12 bg-black/80" />

                                    <div className="relative z-10 p-6 h-full flex flex-col justify-between pt-24">
                                        {/* Recipient info */}
                                        <div className="text-center">
                                            <p className="text-white/40 text-xs font-medium tracking-wider mb-1">PARA</p>
                                            <p className="text-xl font-bold text-white mb-2">
                                                {recipientName || 'Destinatario'}
                                            </p>
                                            {personalMessage && (
                                                <div
                                                    className="mx-auto px-4 py-2 rounded-lg max-w-xs backdrop-blur-sm"
                                                    style={{ background: `${selectedDesign.accent}15`, border: `1px solid ${selectedDesign.accent}30` }}
                                                >
                                                    <p className="text-white/70 text-sm italic">
                                                        &quot;{personalMessage}&quot;
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Redemption Code */}
                                        <div className="text-center">
                                            <p className="text-white/40 text-[10px] font-medium tracking-wider mb-2">CÓDIGO DE CANJE</p>
                                            <div
                                                className="inline-block px-6 py-3 rounded-xl backdrop-blur-sm"
                                                style={{ background: `${selectedDesign.accent}15`, border: `1px solid ${selectedDesign.accent}40` }}
                                            >
                                                <p
                                                    className="text-lg font-mono font-bold tracking-widest"
                                                    style={{ color: selectedDesign.accent }}
                                                >
                                                    {FAKE_CODE}
                                                </p>
                                            </div>
                                            <p className="text-white/30 text-[9px] mt-2 font-medium">Válido solo en electroshop.com</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-500 text-sm mb-6">Clic en la tarjeta para voltear</p>

                        {/* Design Category Tabs */}
                        <div className="flex justify-center gap-2 mb-4">
                            {[
                                { id: 'all', label: 'Todos', icon: null },
                                { id: 'premium', label: 'Premium', icon: <FiStar className="w-3 h-3" /> },
                                { id: 'christmas', label: 'Navidad', icon: <FiGift className="w-3 h-3" /> },
                                { id: 'brand', label: 'Electro', icon: <FiMonitor className="w-3 h-3" /> },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setDesignCategory(cat.id as typeof designCategory)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${designCategory === cat.id
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Design Selection */}
                        <div className="flex flex-wrap justify-center gap-3">
                            {filteredDesigns.map((design) => (
                                <button
                                    key={design.id}
                                    onClick={() => setSelectedDesign(design)}
                                    className={`group flex flex-col items-center p-3 rounded-xl transition-all ${selectedDesign.id === design.id
                                        ? 'bg-gray-100 ring-2 ring-blue-500'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div
                                        className="w-16 h-10 rounded-lg mb-2 shadow-md relative overflow-hidden"
                                        style={{ background: design.gradient }}
                                    >
                                        <div
                                            className="absolute inset-0 opacity-30"
                                            style={{
                                                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, ${design.accent}20 3px, ${design.accent}20 4px)`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600">{design.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Configuration Form */}
                    <div className="bg-white rounded-2xl p-5 shadow-xl border border-gray-100">
                        {/* Step 1: Amount */}
                        <div className="mb-5">
                            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center text-xs font-bold shadow-lg">1</span>
                                Selecciona el monto
                            </h3>
                            <div className="grid grid-cols-5 gap-2 mb-2">
                                {PRESET_AMOUNTS.map((amount) => (
                                    <div key={amount} className="relative">
                                        {amount === 50 && (
                                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[8px] font-bold rounded-full shadow-lg z-20 whitespace-nowrap">
                                                ⭐ Popular
                                            </span>
                                        )}
                                        <button
                                            onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                                            className={`w-full group relative py-3 rounded-xl font-bold text-base transition-all duration-300 overflow-hidden ${selectedAmount === amount
                                                ? 'text-white shadow-lg scale-105 ring-2 ring-blue-400/30'
                                                : 'bg-white text-gray-700 hover:scale-105 hover:shadow-md border border-gray-200 hover:border-blue-300'
                                                }`}
                                        >
                                            {selectedAmount === amount && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 animate-gradient-x" />
                                            )}
                                            <span className="relative z-10 flex items-center justify-center gap-0.5">
                                                <span className={`text-xs ${selectedAmount === amount ? 'text-blue-200' : 'text-gray-400'}`}>$</span>
                                                <span>{amount}</span>
                                            </span>
                                        </button>
                                    </div>
                                ))}
                                {/* Custom Amount Input - in the same row */}
                                <div className="relative group">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">$</span>
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
                                        className={`w-full pl-5 pr-8 py-3 rounded-xl border text-center font-bold text-base transition-all duration-300 outline-none ${customAmount
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                                            : 'border-gray-200 text-gray-700 hover:border-blue-300'
                                            }`}
                                    />
                                    {/* Tooltip icon */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-help">
                                        <svg className="w-4 h-4 text-gray-400 hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {/* Tooltip popup */}
                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
                                            <div className="font-semibold mb-1">Monto personalizado</div>
                                            <ul className="space-y-0.5 text-gray-300">
                                                <li>• Mínimo: $5</li>
                                                <li>• Máximo: $1,000</li>
                                                <li>• Solo múltiplos de $5</li>
                                            </ul>
                                            <div className="text-gray-400 mt-1 text-[10px]">Se redondea automáticamente</div>
                                            <div className="absolute -bottom-1 right-3 w-2 h-2 bg-gray-900 rotate-45"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Min/Max indicator */}
                            <p className="text-[10px] text-gray-400 text-center">Mínimo $5 — Máximo $1,000 (múltiplos de $5)</p>
                        </div>

                        {/* Step 2: Recipient Info */}
                        <div className="mb-5">
                            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center text-xs font-bold">2</span>
                                Destinatario
                            </h3>

                            {/* Gift Type Selection - Two buttons in a row */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {/* For Someone Else */}
                                <button
                                    type="button"
                                    onClick={() => setIsForMyself(false)}
                                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg font-semibold text-sm transition-all ${!isForMyself
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <FiGift className="w-4 h-4" />
                                    Es un regalo
                                </button>

                                {/* For Myself */}
                                {session && (
                                    <button
                                        type="button"
                                        onClick={() => setIsForMyself(true)}
                                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg font-semibold text-sm transition-all ${isForMyself
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        <FiUser className="w-4 h-4" />
                                        Para mí mismo
                                    </button>
                                )}
                            </div>

                            {/* Recipient Name & Email Inputs - Same row */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Name */}
                                <div className="relative">
                                    <input
                                        ref={recipientNameRef}
                                        type="text"
                                        placeholder="Nombre"
                                        value={recipientName}
                                        onChange={(e) => { setRecipientName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
                                        className={`w-full px-3 py-2.5 rounded-lg border outline-none transition-colors text-sm ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-blue-500'
                                            }`}
                                    />
                                    {errors.name && (
                                        <div className="absolute -bottom-4 left-0 text-[10px] text-red-500 flex items-center gap-1">
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
                                        onChange={(e) => { setRecipientEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
                                        className={`w-full px-3 py-2.5 pr-8 rounded-lg border outline-none transition-colors text-sm ${errors.email ? 'border-red-400 bg-red-50' :
                                            recipientExists === false ? 'border-amber-400' :
                                                recipientExists === true ? 'border-green-500' :
                                                    'border-gray-200 focus:border-blue-500'
                                            }`}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        {isCheckingEmail && <span className="text-gray-400 text-xs">...</span>}
                                        {!isCheckingEmail && recipientExists === true && <FiCheck className="w-3.5 h-3.5 text-green-500" />}
                                        {!isCheckingEmail && recipientExists === false && <FiAlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                                    </div>
                                    {errors.email && (
                                        <div className="absolute -bottom-4 left-0 text-[10px] text-red-500 flex items-center gap-1">
                                            <FiAlertCircle className="w-2.5 h-2.5" />
                                            {errors.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {recipientExists === false && !errors.email && (
                                <p className="text-xs text-amber-600 mt-1">
                                    Usuario no registrado. Se enviará invitación.
                                </p>
                            )}
                        </div>

                        {/* Step 3: Personal Message */}
                        <div className="mb-4">
                            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center text-xs font-bold">3</span>
                                Mensaje personal (opcional)
                            </h3>
                            <textarea
                                placeholder="Escribe un mensaje especial..."
                                value={personalMessage}
                                onChange={(e) => setPersonalMessage(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-0 outline-none resize-none text-sm"
                                rows={2}
                                maxLength={200}
                            />
                            <p className="text-[10px] text-gray-400 text-right">{personalMessage.length}/200</p>
                        </div>

                        {/* Step 4: Scheduled Delivery (optional) - Collapsible */}
                        {!isForMyself && (
                            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowScheduledSection(!showScheduledSection)}
                                    className="w-full px-3 py-2.5 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <FiCalendar className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-gray-700">Programar envío (opcional)</span>
                                    </div>
                                    <svg
                                        className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${showScheduledSection ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showScheduledSection ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-3 bg-white border-t border-gray-100">
                                        <input
                                            type="date"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-0 outline-none text-sm"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">
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
                                className="w-full mb-4 py-2 rounded-lg border border-blue-200 text-blue-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                            >
                                <FiEye className="w-4 h-4" />
                                Ver cómo lucirá el email
                            </button>
                        )}

                        {/* Summary */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <div className="flex justify-between mb-1">
                                <span className="text-gray-600 text-sm">Gift Card</span>
                                <div className="text-right">
                                    <span className="font-bold text-gray-900">${finalAmount.toFixed(2)}</span>
                                    {finalAmountBs && (
                                        <p className="text-[10px] text-gray-500">≈ Bs. {finalAmountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    )}
                                </div>
                            </div>
                            {session && (
                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="text-gray-600 text-sm">Tu saldo</span>
                                    <span className={`font-bold text-sm ${canPayWithBalance ? 'text-green-600' : 'text-amber-600'}`}>
                                        ${(typeof userBalance === 'number' ? userBalance : 0).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Security Badge */}
                        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 mb-3">
                            <FiLock className="w-3 h-3" />
                            <span>Pago 100% seguro — Entrega garantizada</span>
                        </div>

                        {/* Purchase Button */}
                        <button
                            onClick={handlePurchase}
                            disabled={isLoading || finalAmount < 5}
                            className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${finalAmount >= 5
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isLoading ? '...' : canPayWithBalance ? (
                                <><FiCreditCard className="w-4 h-4" /> Pagar con saldo</>
                            ) : (
                                <><FiShoppingCart className="w-4 h-4" /> Agregar al carrito</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Features Section - Compact */}
                <section className="mt-12 mb-8">
                    <h2 className="text-xl font-bold text-center text-gray-900 mb-6">
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
                            <div key={i} className="bg-white rounded-xl p-4 shadow-md border border-gray-100 text-center hover:shadow-lg transition-shadow">
                                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white">
                                    {feature.icon}
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">{feature.title}</h3>
                                <p className="text-xs text-gray-500">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* CTA Section - Like Homepage */}
            <section className="py-12 bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-5 left-10 w-48 h-48 bg-white rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-5 right-10 w-64 h-64 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                {/* Floating Tech Icons */}
                <FloatingTechIcons />

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
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2a63cd] text-sm font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
                        >
                            <FiGift className="w-4 h-4" />
                            Canjear Gift Card
                            <FiArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer - Simple style like servicios page */}
            <footer className="bg-[#212529]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-400">
                        &copy; {new Date().getFullYear()} Electro Shop Morandin C.A. - Todos los derechos reservados
                    </p>
                </div>
            </footer>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                            <FiMail className="w-8 h-8 text-white" />
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Usuario no registrado</h3>

                        <p className="text-gray-600 mb-6">
                            El email <strong>{recipientEmail}</strong> no está registrado en Electro Shop.
                            <br /><br />
                            ¿Quieres enviarle una invitación para que cree su cuenta y pueda recibir tu regalo de <strong>${finalAmount.toFixed(2)}</strong>?
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={sendInvitation}
                                disabled={isSendingInvite}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSendingInvite ? 'Enviando...' : <><FiMail /> Sí, enviar invitación</>}
                            </button>

                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                        </div>

                        <p className="mt-4 text-xs text-gray-400">
                            La invitación incluirá un enlace para registrarse y recibir el regalo automáticamente.
                        </p>
                    </div>
                </div>
            )}

            {/* Email Preview Modal */}
            {showEmailPreview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
                        {/* Email Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
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
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                ¡Hola {recipientName}! 🎉
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {session?.user?.name || 'Alguien especial'} te ha enviado una Gift Card de Electro Shop por:
                            </p>

                            {/* Gift Card Preview Mini */}
                            <div
                                className="w-48 h-28 mx-auto rounded-xl mb-4 relative overflow-hidden shadow-lg"
                                style={{ background: selectedDesign.gradient }}
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-black text-white drop-shadow-lg">${finalAmount}</span>
                                </div>
                            </div>

                            {personalMessage && (
                                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm italic text-gray-600">
                                    "{personalMessage}"
                                </div>
                            )}

                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <p className="text-xs text-gray-500 mb-2">Tu código único:</p>
                                <p className="font-mono font-bold text-blue-600 text-lg tracking-wider">XXXX-XXXX-XXXX-XXXX</p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setShowEmailPreview(false)}
                                className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cerrar vista previa
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
