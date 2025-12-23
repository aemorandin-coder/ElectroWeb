'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiCopy, FiCheck, FiArrowLeft, FiExternalLink, FiClock,
    FiLock, FiShield, FiAlertTriangle, FiPackage
} from 'react-icons/fi';
import { BsCardList } from 'react-icons/bs';
import { SiSteam, SiPlaystation, SiNintendoswitch, SiRoblox, SiNetflix, SiSpotify, SiApple } from 'react-icons/si';
import { FaGamepad } from 'react-icons/fa';
import toast from 'react-hot-toast';

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
    STEAM: <SiSteam className="w-6 h-6" />,
    PLAYSTATION: <SiPlaystation className="w-6 h-6" />,
    PSN: <SiPlaystation className="w-6 h-6" />,
    XBOX: <FaGamepad className="w-6 h-6" />,
    NINTENDO: <SiNintendoswitch className="w-6 h-6" />,
    ROBLOX: <SiRoblox className="w-6 h-6" />,
    NETFLIX: <SiNetflix className="w-6 h-6" />,
    SPOTIFY: <SiSpotify className="w-6 h-6" />,
    APPLE: <SiApple className="w-6 h-6" />,
    ITUNES: <SiApple className="w-6 h-6" />,
};

const platformColors: Record<string, string> = {
    STEAM: 'from-[#1b2838] to-[#2a475e]',
    PLAYSTATION: 'from-[#003791] to-[#0070d1]',
    PSN: 'from-[#003791] to-[#0070d1]',
    XBOX: 'from-[#107c10] to-[#1db954]',
    NINTENDO: 'from-[#e60012] to-[#ff4757]',
    ROBLOX: 'from-[#c3c3c3] to-[#e3e3e3]',
    NETFLIX: 'from-[#e50914] to-[#831010]',
    SPOTIFY: 'from-[#1db954] to-[#191414]',
    APPLE: 'from-[#555555] to-[#000000]',
    ITUNES: 'from-[#fc3c44] to-[#7d1c7d]',
};

export default function DigitalCodesPage() {
    const { id: orderId } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [data, setData] = useState<DigitalOrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedCodes, setCopiedCodes] = useState<Record<string, boolean>>({});
    const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login');
            return;
        }

        if (status === 'authenticated' && orderId) {
            fetchDigitalCodes();
        }
    }, [status, orderId]);

    const fetchDigitalCodes = async () => {
        try {
            const response = await fetch(`/api/orders/${orderId}/digital?orderId=${orderId}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);
            } else {
                toast.error('Error al cargar los códigos');
                router.push('/customer/orders');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const copyCode = async (codeId: string, code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCodes(prev => ({ ...prev, [codeId]: true }));
            toast.success('¡Código copiado!');
            setTimeout(() => {
                setCopiedCodes(prev => ({ ...prev, [codeId]: false }));
            }, 3000);
        } catch (error) {
            toast.error('Error al copiar');
        }
    };

    const toggleReveal = (codeId: string) => {
        setRevealedCodes(prev => ({ ...prev, [codeId]: !prev[codeId] }));
    };

    const getPlatformIcon = (platform: string | null) => {
        if (!platform) return <FaGamepad className="w-6 h-6" />;
        return platformIcons[platform.toUpperCase()] || <FaGamepad className="w-6 h-6" />;
    };

    const getPlatformGradient = (platform: string | null) => {
        if (!platform) return 'from-purple-600 to-blue-600';
        return platformColors[platform.toUpperCase()] || 'from-purple-600 to-blue-600';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <p className="text-white/60">Cargando tus códigos...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd] flex items-center justify-center p-4">
                <div className="text-center">
                    <FiAlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Orden no encontrada</h1>
                    <p className="text-white/60 mb-6">No pudimos encontrar los códigos de esta orden.</p>
                    <Link href="/customer/orders" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-colors">
                        <FiArrowLeft /> Volver a mis pedidos
                    </Link>
                </div>
            </div>
        );
    }

    const hasPendingCodes = data.digitalItems.some(item => item.codes.length < item.quantity);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd]">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-[#1e4ba3]/90 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/customer/orders" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                            <FiArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline">Volver a pedidos</span>
                        </Link>
                        <div className="text-right">
                            <p className="text-white font-bold">Orden #{data.orderNumber}</p>
                            <p className="text-xs text-white/50">Productos Digitales</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 rounded-2xl border border-white/20 mb-4">
                        <BsCardList className="w-6 h-6 text-yellow-400" />
                        <span className="text-white font-semibold">Entrega Digital</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Tus Códigos Digitales
                    </h1>
                    <p className="text-white/60">
                        {data.isDelivered
                            ? '¡Todos tus códigos están listos para usar!'
                            : 'Algunos códigos aún están siendo procesados.'}
                    </p>
                </div>

                {/* Security Notice */}
                <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                    <FiShield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-emerald-300 font-medium">Códigos protegidos</p>
                        <p className="text-xs text-emerald-400/70">
                            Por seguridad, los códigos están ocultos. Haz clic para revelarlos.
                        </p>
                    </div>
                </div>

                {/* Pending Codes Warning */}
                {hasPendingCodes && (
                    <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                        <FiClock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
                        <div>
                            <p className="text-sm text-amber-300 font-medium">Códigos en proceso</p>
                            <p className="text-xs text-amber-400/70">
                                Algunos códigos aún no han sido entregados. Recibirás una notificación cuando estén listos.
                            </p>
                        </div>
                    </div>
                )}

                {/* Digital Items */}
                <div className="space-y-6">
                    {data.digitalItems.map((item) => (
                        <div
                            key={item.orderItemId}
                            className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden"
                        >
                            {/* Item Header */}
                            <div className={`bg-gradient-to-r ${getPlatformGradient(item.platform)} p-4 sm:p-6`}>
                                <div className="flex items-center gap-4">
                                    {item.image && (
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                                            <Image
                                                src={item.image}
                                                alt={item.productName}
                                                width={80}
                                                height={80}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                            {getPlatformIcon(item.platform)}
                                            <span>{item.platform || 'Digital'}</span>
                                            {item.region && (
                                                <>
                                                    <span className="text-white/30">•</span>
                                                    <span>{item.region}</span>
                                                </>
                                            )}
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-white truncate">{item.productName}</h3>
                                        <p className="text-sm text-white/60">Cantidad: {item.quantity}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Codes Section */}
                            <div className="p-4 sm:p-6 space-y-4">
                                {item.codes.length > 0 ? (
                                    item.codes.map((code, index) => (
                                        <div
                                            key={code.id}
                                            className="bg-slate-800/50 rounded-xl p-4 border border-white/5"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs text-white/50">
                                                    Código {item.codes.length > 1 ? `#${index + 1}` : ''}
                                                </span>
                                                {code.deliveredAt && (
                                                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                                                        <FiCheck className="w-3 h-3" />
                                                        Entregado
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div
                                                    onClick={() => toggleReveal(code.id)}
                                                    className={`flex-1 relative rounded-lg px-4 py-3 font-mono text-lg text-center cursor-pointer transition-all duration-500 border overflow-hidden ${revealedCodes[code.id]
                                                        ? 'bg-white/10 border-emerald-500/50'
                                                        : 'bg-gradient-to-r from-amber-500/80 to-yellow-500/80 border-amber-400 hover:from-amber-500 hover:to-yellow-500'}`}
                                                >
                                                    {revealedCodes[code.id] ? (
                                                        <span className="text-white select-all animate-fade-in">{code.code}</span>
                                                    ) : (
                                                        <>
                                                            {/* Scratch effect overlay */}
                                                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />
                                                            <span className="text-white font-bold flex items-center justify-center gap-2 relative z-10">
                                                                <span className="animate-wiggle">🎫</span>
                                                                ¡Raspa aquí para revelar!
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => copyCode(code.id, code.code)}
                                                    disabled={!revealedCodes[code.id]}
                                                    className={`p-3 rounded-lg transition-all ${copiedCodes[code.id]
                                                        ? 'bg-emerald-600 text-white'
                                                        : revealedCodes[code.id]
                                                            ? 'bg-white/20 hover:bg-white/30 text-white'
                                                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                                                        }`}
                                                    title={copiedCodes[code.id] ? 'Copiado' : 'Copiar código'}
                                                >
                                                    {copiedCodes[code.id] ? (
                                                        <FiCheck className="w-5 h-5" />
                                                    ) : (
                                                        <FiCopy className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <FiPackage className="w-12 h-12 text-white/20 mx-auto mb-3" />
                                        <p className="text-white/50">Código pendiente de envío</p>
                                        <p className="text-xs text-white/30 mt-1">
                                            Recibirás una notificación cuando esté disponible
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Redemption Help */}
                            {item.codes.length > 0 && (
                                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                                    {item.redemptionInstructions ? (
                                        /* Custom Instructions from Product */
                                        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 p-4 rounded-xl border border-emerald-500/20">
                                            <p className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                                <FiCheck className="w-4 h-4" />
                                                Instrucciones de canje
                                            </p>
                                            <div className="text-sm text-white/80 whitespace-pre-line">
                                                {item.redemptionInstructions}
                                            </div>
                                        </div>
                                    ) : item.platform ? (
                                        /* Fallback: External Help Link */
                                        <a
                                            href={getRedemptionUrl(item.platform)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white text-sm transition-colors"
                                        >
                                            <FiExternalLink className="w-4 h-4" />
                                            ¿Cómo canjear en {item.platform}?
                                        </a>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Help Section */}
                <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10 text-center">
                    <p className="text-white/60 text-sm">
                        ¿Tienes problemas con tus códigos?{' '}
                        <Link href="/contacto" className="text-purple-400 hover:text-purple-300 underline">
                            Contáctanos
                        </Link>
                    </p>
                </div>
            </div>
            {/* Animations */}
            <style jsx>{`
                @keyframes wiggle {
                    0%, 100% { transform: rotate(-3deg); }
                    50% { transform: rotate(3deg); }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-wiggle {
                    animation: wiggle 0.5s ease-in-out infinite;
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

function getRedemptionUrl(platform: string): string {
    const urls: Record<string, string> = {
        STEAM: 'https://help.steampowered.com/es/faqs/view/2A12-9D79-C3D7-F870',
        PLAYSTATION: 'https://www.playstation.com/es-es/support/store/redeem-ps-store-voucher-code/',
        PSN: 'https://www.playstation.com/es-es/support/store/redeem-ps-store-voucher-code/',
        XBOX: 'https://support.xbox.com/es-ES/help/subscriptions-billing/redeem-codes-gifting/redeem-prepaid-codes',
        NINTENDO: 'https://www.nintendo.es/Atencion-al-cliente/Nintendo-Switch/Modos-de-compra/Codigos-de-descarga/Como-canjear-codigos-de-descarga-1458785.html',
        ROBLOX: 'https://en.help.roblox.com/hc/es/articles/360000291306-Canjeando-c%C3%B3digos-de-tarjetas-de-regalo',
        NETFLIX: 'https://help.netflix.com/es/node/32950',
        SPOTIFY: 'https://support.spotify.com/es/article/redeem-gift-card/',
        APPLE: 'https://support.apple.com/es-es/HT201209',
        ITUNES: 'https://support.apple.com/es-es/HT201209',
    };
    return urls[platform.toUpperCase()] || 'https://google.com/search?q=como+canjear+codigo+' + platform;
}
