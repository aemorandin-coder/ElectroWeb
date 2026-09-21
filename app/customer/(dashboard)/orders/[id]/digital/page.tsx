'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiCopy, FiCheck, FiArrowLeft, FiClock,
    FiShield, FiAlertTriangle, FiChevronDown
} from 'react-icons/fi';
import { BsNintendoSwitch } from 'react-icons/bs';
import { SiSteam, SiPlaystation, SiRoblox, SiNetflix, SiSpotify, SiApple } from 'react-icons/si';
import { FaGamepad } from 'react-icons/fa';
import toast from 'react-hot-toast';
import PlatformScratchCard from './_components/PlatformScratchCard';

interface DigitalCode {
    id: string;
    code: string;
    status: string;
    deliveredAt: string | null;
    product: {
        name: string;
        digitalPlatform: string | null;
        digitalRegion: string | null;
        mainImage: string | null;
    };
}

interface DigitalItem {
    orderItemId: string;
    productId: string;
    productName: string;
    platform: string | null;
    region: string | null;
    image: string | null;
    quantity: number;
    deliveryMethod: string;
    codes: DigitalCode[];
    redemptionInstructions?: string | null;
}

interface DigitalOrderData {
    orderId: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    digitalItems: DigitalItem[];
    isDelivered: boolean;
}

const platformIcons: Record<string, React.ReactNode> = {
    STEAM: <SiSteam className="w-4 h-4" />,
    PLAYSTATION: <SiPlaystation className="w-4 h-4" />,
    PSN: <SiPlaystation className="w-4 h-4" />,
    XBOX: <FaGamepad className="w-4 h-4" />,
    NINTENDO: <BsNintendoSwitch className="w-4 h-4" />,
    ROBLOX: <SiRoblox className="w-4 h-4" />,
    NETFLIX: <SiNetflix className="w-4 h-4" />,
    SPOTIFY: <SiSpotify className="w-4 h-4" />,
    APPLE: <SiApple className="w-4 h-4" />,
    ITUNES: <SiApple className="w-4 h-4" />,
};

export default function DigitalCodesPage() {
    const params = useParams();
    const orderId = params?.id as string;
    const router = useRouter();
    const { status } = useSession();
    const [data, setData] = useState<DigitalOrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedCodes, setCopiedCodes] = useState<Record<string, boolean>>({});
    const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>({});
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    // Load persistence
    useEffect(() => {
        if (typeof window !== 'undefined' && orderId) {
            const stored = localStorage.getItem(`revealed_order_${orderId}`);
            if (stored) {
                try {
                    setRevealedCodes(JSON.parse(stored));
                } catch { }
            }
        }
    }, [orderId]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated' && orderId) {
            fetchDigitalCodes();
        }
    }, [status, orderId]);

    async function fetchDigitalCodes() {
        try {
            const response = await fetch(`/api/orders/${orderId}/digital?orderId=${orderId}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);
                // Auto-expand all items initially
                const expanded: Record<string, boolean> = {};
                result.digitalItems.forEach((item: DigitalItem) => {
                    expanded[item.orderItemId] = true;
                });
                setExpandedItems(expanded);
            } else {
                toast.error('Error al cargar los códigos');
                router.push('/customer/orders');
            }
        } catch {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    }

    const copyCode = async (codeId: string, code: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(code);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = code;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            setCopiedCodes(prev => ({ ...prev, [codeId]: true }));
            toast.success('¡Código copiado!');
            setTimeout(() => {
                setCopiedCodes(prev => ({ ...prev, [codeId]: false }));
            }, 2000);
        } catch {
            toast.error('Error al copiar');
        }
    };

    const handleReveal = (codeId: string) => {
        setRevealedCodes(prev => {
            const newState = { ...prev, [codeId]: true };
            if (typeof window !== 'undefined') {
                localStorage.setItem(`revealed_order_${orderId}`, JSON.stringify(newState));
            }
            return newState;
        });
        toast.success('¡Código revelado!');
    };

    const toggleExpand = (itemId: string) => {
        setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    // Calculate progress
    const getTotalCodes = () => data?.digitalItems.reduce((acc, item) => acc + item.codes.length, 0) || 0;
    const getRevealedCount = () => Object.keys(revealedCodes).filter(k => revealedCodes[k]).length;

    if (loading) {
        return (
            <div className="min-h-dvh bg-surface flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-line rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Cargando códigos...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-dvh bg-surface flex items-center justify-center p-4">
                <div className="text-center">
                    <FiAlertTriangle className="w-10 h-10 text-deal mx-auto mb-3" />
                    <h1 className="text-lg font-bold text-ink mb-2">Orden no encontrada</h1>
                    <Link href="/customer/orders" className="inline-flex items-center gap-2 bg-white text-ink px-5 py-2 rounded-xl transition-all border border-line mt-2 hover:bg-surface">
                        <FiArrowLeft /> Volver
                    </Link>
                </div>
            </div>
        );
    }

    const totalCodes = getTotalCodes();
    const revealedCount = getRevealedCount();
    const progressPercent = totalCodes > 0 ? (revealedCount / totalCodes) * 100 : 0;

    return (
        <div className="min-h-dvh bg-surface relative">
            {/* Header */}
            <div className="sticky top-0 z-[var(--z-sticky)] border-b border-line bg-white/95">
                <div className="max-w-4xl mx-auto px-3 py-2">
                    <div className="flex items-center justify-between">
                        <Link href="/customer/orders" className="p-2 bg-surface rounded-xl text-ink hover:bg-line transition-all border border-line">
                            <FiArrowLeft className="w-4 h-4" />
                        </Link>

                        <div className="flex-1 mx-3">
                            {/* Progress Bar */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-500 rounded-full transition-all duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <span className="text-xs text-muted font-bold">{revealedCount}/{totalCodes}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-ink text-xs font-bold">#{data.orderNumber}</p>
                            <p className="text-xs text-brand-600 font-bold uppercase tracking-wider">Códigos digitales</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-3 py-3">
                <div className="space-y-2">
                    {data.digitalItems.map((item) => {
                        const isExpanded = expandedItems[item.orderItemId] !== false;
                        const itemRevealedCount = item.codes.filter(c => revealedCodes[c.id]).length;

                        return (
                            <div
                                key={item.orderItemId}
                                className="rounded-2xl border border-line bg-white"
                            >
                                <button
                                    onClick={() => toggleExpand(item.orderItemId)}
                                    className="w-full p-3 flex items-center gap-3 hover:bg-surface transition-colors bg-surface border-b border-line"
                                >
                                    {/* Product Image */}
                                    {item.image && (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex-shrink-0 relative border border-line">
                                            <Image
                                                src={item.image}
                                                alt={item.productName}
                                                fill sizes="48px"
                                                className="object-contain p-0.5"
                                            />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 uppercase bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                                                {getPlatformIcon(item.platform)}
                                                {item.platform || 'Digital'}
                                            </span>
                                            {item.region && (
                                                <span className="text-xs font-bold text-ink-soft uppercase bg-surface border border-line px-1.5 py-0.5 rounded">
                                                    {item.region}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xs font-bold text-ink truncate">{item.productName}</h3>
                                    </div>

                                    {/* Stats & Expand Icon */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-muted">
                                            {itemRevealedCount}/{item.codes.length}
                                        </span>
                                        <div className={`w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-line' : ''}`}>
                                            <FiChevronDown className="w-3 h-3 text-muted" />
                                        </div>
                                    </div>
                                </button>

                                {/* Collapsible Codes Section */}
                                <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'opacity-100' : 'hidden'}`}>
                                    <div className="grid gap-5 bg-white px-3 pb-4 pt-2 lg:grid-cols-2">
                                        {item.codes.length > 0 ? (
                                            item.codes.map((code, index) => (
                                                <div
                                                    key={code.id}
                                                    className="py-4"
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-bold text-muted uppercase">
                                                            Código digital {item.codes.length > 1 ? `#${index + 1}` : ''}
                                                        </span>
                                                        {revealedCodes[code.id] && (
                                                            <span className="text-xs text-success-strong font-bold uppercase flex items-center gap-0.5 bg-success-strong/10 border border-success-strong/20 px-1.5 py-0.5 rounded-full">
                                                                <FiCheck className="w-2 h-2" />
                                                                Recibido
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <PlatformScratchCard
                                                                code={code.code}
                                                                platform={item.platform}
                                                                productName={item.productName}
                                                                image={item.image}
                                                                region={item.region}
                                                                onReveal={() => handleReveal(code.id)}
                                                                isAlreadyRevealed={!!revealedCodes[code.id]}
                                                                onCopy={() => copyCode(code.id, code.code)}
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={() => copyCode(code.id, code.code)}
                                                            disabled={!revealedCodes[code.id]}
                                                            aria-label={copiedCodes[code.id] ? 'Código copiado' : 'Copiar código'}
                                                            title="Copiar código"
                                                            className={`h-11 self-center px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border ${copiedCodes[code.id]
                                                                ? 'bg-success-strong/10 text-success-strong border-success-strong/30'
                                                                : revealedCodes[code.id]
                                                                    ? 'bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-100'
                                                                    : 'bg-line text-subtle border-line cursor-not-allowed'
                                                                }`}
                                                        >
                                                            <span className="text-sm font-semibold">{copiedCodes[code.id] ? 'Copiado' : 'Copiar código'}</span>
                                                            {copiedCodes[code.id] ? (
                                                                <FiCheck className="w-4 h-4" />
                                                            ) : (
                                                                <FiCopy className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : item.deliveryMethod === 'MANUAL' ? (
                                            <div className="p-4 rounded-xl border border-brand-200 bg-brand-50 text-center space-y-3">
                                                <div className="w-10 h-10 bg-white border border-brand-200 rounded-full flex items-center justify-center mx-auto text-brand-600">
                                                    <FiClock className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">Recarga Directa en Proceso</h4>
                                                    <p className="text-xs text-brand-700 max-w-xs mx-auto leading-relaxed">
                                                        Esta compra se procesa por recarga manual directa a la cuenta ingresada. Nuestro equipo administrativo está acreditando tu saldo en este momento.
                                                    </p>
                                                </div>
                                                <div className="py-1 px-3 bg-white border border-brand-200 rounded-lg inline-block">
                                                    <span className="text-xs font-bold text-brand-700 flex items-center gap-1.5 justify-center">
                                                        Tiempo estimado: 5 - 15 minutos
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 bg-surface rounded-lg border border-dashed border-line">
                                                <FiClock className="w-6 h-6 text-muted mx-auto mb-1" />
                                                <p className="text-xs text-muted font-bold uppercase">Preparando...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Compact Footer Badges */}
                <div className="mt-6 flex justify-center gap-2">
                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-full border border-line shadow-sm">
                        <FiShield className="w-3 h-3 text-brand-600" />
                        <span className="text-xs text-ink font-bold uppercase tracking-wider">Encriptado</span>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-full border border-line shadow-sm">
                        <FiCheck className="w-3 h-3 text-success-strong" />
                        <span className="text-xs text-ink font-bold uppercase tracking-wider">Garantizado</span>
                    </div>
                </div>

                {/* Compact Support CTA */}
                <div className="mt-8 text-center pb-20">
                    <Link href="/contacto" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-line hover:bg-surface transition-all shadow-sm">
                        <span className="text-brand-600 text-xs font-bold uppercase tracking-wider">¿Necesitas ayuda?</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function getPlatformIcon(platform: string | null) {
    if (!platform) return <FaGamepad className="w-3 h-3" />;
    const p = platform.toUpperCase();
    return platformIcons[p] || <FaGamepad className="w-3 h-3" />;
}
