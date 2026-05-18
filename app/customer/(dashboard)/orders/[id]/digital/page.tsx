'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiCopy, FiCheck, FiArrowLeft, FiClock,
    FiLock, FiShield, FiAlertTriangle, FiPackage, FiChevronDown, FiChevronUp
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
    NINTENDO: <SiNintendoswitch className="w-4 h-4" />,
    ROBLOX: <SiRoblox className="w-4 h-4" />,
    NETFLIX: <SiNetflix className="w-4 h-4" />,
    SPOTIFY: <SiSpotify className="w-4 h-4" />,
    APPLE: <SiApple className="w-4 h-4" />,
    ITUNES: <SiApple className="w-4 h-4" />,
};

// EPIC ScratchCard Component with shimmer and glow effects
function ScratchCard({
    code,
    onReveal,
    isAlreadyRevealed,
    onCopy
}: {
    code: string,
    onReveal: () => void,
    isAlreadyRevealed: boolean,
    onCopy: () => void
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isInternalRevealed, setIsInternalRevealed] = useState(isAlreadyRevealed);
    const [isRevealing, setIsRevealing] = useState(false);

    useEffect(() => {
        setIsInternalRevealed(isAlreadyRevealed);
    }, [isAlreadyRevealed]);

    useEffect(() => {
        if (isInternalRevealed) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const resize = () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
                drawCover();
            }
        };

        const drawCover = () => {
            if (!ctx) return;
            // Epic gradient - matching brand colors
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#1e3a8a');
            gradient.addColorStop(0.5, '#2563eb');
            gradient.addColorStop(1, '#0ea5e9');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Animated shimmer pattern
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            for (let i = 0; i < canvas.width; i += 4) {
                ctx.beginPath();
                ctx.moveTo(i, 0); ctx.lineTo(i + 20, canvas.height);
                ctx.stroke();
            }

            // Center text with glow
            ctx.font = 'bold 10px system-ui';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 4;
            ctx.fillText('RASPAR PARA REVELAR', canvas.width / 2, canvas.height / 2 + 3);
            ctx.shadowBlur = 0;
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [isInternalRevealed]);

    const scratch = (e: any) => {
        if (isInternalRevealed) return;
        setIsRevealing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (clientX === undefined || clientY === undefined) return;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparent = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] === 0) transparent++;
        }

        if (transparent / (pixels.length / 4) > 0.40) {
            setIsInternalRevealed(true);
            onReveal();
        }
    };

    return (
        <div className="relative w-full h-9 rounded-lg overflow-hidden shadow-lg group">
            {/* Glow effect behind */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-lg blur opacity-40 group-hover:opacity-70 transition duration-500 animate-pulse" />

            {/* The Code underneath */}
            <div
                onClick={() => isInternalRevealed && onCopy()}
                className={`relative z-10 h-full bg-[#0f172a] flex items-center justify-center font-mono text-[10px] font-black text-white tracking-widest ${isInternalRevealed ? 'cursor-pointer hover:bg-[#1e293b] active:bg-[#0f172a] transition-colors shadow-[inset_0_0_15px_rgba(6,182,212,0.3)]' : ''}`}
            >
                <span className="truncate px-2">{code}</span>
                {isInternalRevealed && (
                    <span className="absolute right-2 text-cyan-400 text-[8px] animate-pulse">TAP TO COPY</span>
                )}
            </div>

            {/* The Scratch Layer */}
            {!isInternalRevealed && (
                <canvas
                    ref={canvasRef}
                    onMouseMove={scratch}
                    onTouchMove={scratch}
                    className="absolute inset-0 z-20 cursor-crosshair touch-none transition-opacity duration-500"
                    style={{ opacity: isRevealing ? 0.85 : 1 }}
                />
            )}
        </div>
    );
}

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
                } catch (e) { }
            }
        }
    }, [orderId]);

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
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

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
        } catch (error) {
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
            <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#0ea5e9] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-white/20 rounded-full"></div>
                        <div className="absolute inset-0 w-12 h-12 border-4 border-t-white rounded-full animate-spin"></div>
                    </div>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.2em]">Cargando códigos...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-4">
                <div className="text-center">
                    <FiAlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3 animate-bounce shadow-[0_0_15px_rgba(244,63,94,0.5)] rounded-full" />
                    <h1 className="text-lg font-bold text-white mb-2">Orden no encontrada</h1>
                    <Link href="/customer/orders" className="inline-flex items-center gap-2 bg-white/5 text-white px-5 py-2 rounded-xl transition-all border border-white/10 mt-2 hover:bg-white/10 active:scale-95">
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
        <div className="min-h-screen bg-[#0a0f1d] relative overflow-hidden">
            {/* Epic Floating Orbs Background - Gaming Neon */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-10 right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-[80px] animate-pulse" />
                <div className="absolute bottom-20 left-5 w-56 h-56 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-blue-500/20 rounded-full blur-[60px] animate-bounce" style={{ animationDuration: '4s' }} />
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f172a]/50 to-[#0a0f1d]" />
            </div>

            {/* Compact Sticky Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-[#0a0f1d]/80">
                <div className="max-w-4xl mx-auto px-3 py-2">
                    <div className="flex items-center justify-between">
                        <Link href="/customer/orders" className="p-2 bg-white/5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all active:scale-90 border border-white/5 hover:border-white/20">
                            <FiArrowLeft className="w-4 h-4" />
                        </Link>

                        <div className="flex-1 mx-3">
                            {/* Progress Bar */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <span className="text-[9px] text-gray-400 font-bold">{revealedCount}/{totalCodes}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-white text-[10px] font-black">#{data.orderNumber}</p>
                            <p className="text-[7px] text-cyan-400 font-bold uppercase tracking-wider drop-shadow-[0_0_2px_rgba(34,211,238,0.8)]">Digital Delivery</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-3 py-3 relative z-10">
                <div className="space-y-2">
                    {data.digitalItems.map((item) => {
                        const isExpanded = expandedItems[item.orderItemId] !== false;
                        const itemRevealedCount = item.codes.filter(c => revealedCodes[c.id]).length;

                        return (
                            <div
                                key={item.orderItemId}
                                className="bg-white/95 backdrop-blur-md rounded-xl overflow-hidden shadow-xl transition-all duration-300 animate-fadeIn"
                            >
                                <button
                                    onClick={() => toggleExpand(item.orderItemId)}
                                    className="w-full p-3 flex items-center gap-3 hover:bg-[#1e293b]/50 transition-colors bg-[#0f172a]/90 backdrop-blur-md border border-white/10 rounded-t-xl"
                                >
                                    {/* Product Image */}
                                    {item.image && (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#0a0f1d] flex-shrink-0 relative border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                                            <Image
                                                src={item.image}
                                                alt={item.productName}
                                                fill
                                                className="object-contain p-0.5"
                                            />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            {/* Platform Badge - Animated */}
                                            <span className="inline-flex items-center gap-1 text-[7px] font-black text-cyan-400 uppercase bg-cyan-950/50 border border-cyan-500/30 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                                                {getPlatformIcon(item.platform)}
                                                {item.platform || 'Digital'}
                                            </span>
                                            {item.region && (
                                                <span className="text-[7px] font-black text-purple-400 uppercase bg-purple-950/50 border border-purple-500/30 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(192,132,252,0.2)]">
                                                    {item.region}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xs font-bold text-gray-100 truncate">{item.productName}</h3>
                                    </div>

                                    {/* Stats & Expand Icon */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-gray-400">
                                            {itemRevealedCount}/{item.codes.length}
                                        </span>
                                        <div className={`w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-white/10' : ''}`}>
                                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                                        </div>
                                    </div>
                                </button>

                                {/* Collapsible Codes Section */}
                                <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-3 pb-3 space-y-2 bg-[#0a0f1d] border-x border-b border-white/10 rounded-b-xl pt-2">
                                        {item.codes.length > 0 ? (
                                            item.codes.map((code, index) => (
                                                <div
                                                    key={code.id}
                                                    className="bg-[#0f172a] rounded-lg p-2 border border-white/5 shadow-inner shadow-black/50 animate-slideInUp"
                                                    style={{ animationDelay: `${index * 0.05}s` }}
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[8px] font-bold text-gray-500 uppercase">
                                                            Confirmación de recarga {item.codes.length > 1 ? `#${index + 1}` : ''}
                                                        </span>
                                                        {revealedCodes[code.id] && (
                                                            <span className="text-[7px] text-emerald-400 font-bold uppercase flex items-center gap-0.5 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                                                                <FiCheck className="w-2 h-2" />
                                                                Recibido
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1">
                                                            <ScratchCard
                                                                code={code.code}
                                                                onReveal={() => handleReveal(code.id)}
                                                                isAlreadyRevealed={!!revealedCodes[code.id]}
                                                                onCopy={() => copyCode(code.id, code.code)}
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={() => copyCode(code.id, code.code)}
                                                            disabled={!revealedCodes[code.id]}
                                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90 border ${copiedCodes[code.id]
                                                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                                                                : revealedCodes[code.id]
                                                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                                                    : 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            {copiedCodes[code.id] ? (
                                                                <FiCheck className="w-4 h-4 animate-bounce" />
                                                            ) : (
                                                                <FiCopy className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : item.deliveryMethod === 'MANUAL' ? (
                                            <div className="p-4 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 to-blue-950/40 backdrop-blur-sm text-center space-y-3">
                                                <div className="w-10 h-10 bg-purple-950/80 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse">
                                                    <FiClock className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Recarga Directa en Proceso</h4>
                                                    <p className="text-[10px] text-gray-300 max-w-xs mx-auto leading-relaxed">
                                                        Esta compra se procesa por recarga manual directa a la cuenta ingresada. Nuestro equipo administrativo está acreditando tu saldo en este momento.
                                                    </p>
                                                </div>
                                                <div className="py-1 px-3 bg-purple-950/60 border border-purple-500/20 rounded-lg inline-block">
                                                    <span className="text-[9px] font-bold text-purple-300 flex items-center gap-1.5 justify-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                                                        Tiempo estimado: 5 - 15 minutos
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 bg-[#0f172a] rounded-lg border border-dashed border-white/10">
                                                <FiClock className="w-6 h-6 text-gray-600 mx-auto mb-1 animate-pulse" />
                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Preparando...</p>
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
                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0f172a] rounded-full border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                        <FiShield className="w-3 h-3 text-cyan-400" />
                        <span className="text-[7px] text-cyan-100 font-bold uppercase tracking-wider">Encriptado</span>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0f172a] rounded-full border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                        <FiCheck className="w-3 h-3 text-purple-400" />
                        <span className="text-[7px] text-purple-100 font-bold uppercase tracking-wider">Garantizado</span>
                    </div>
                </div>

                {/* Compact Support CTA */}
                <div className="mt-8 text-center pb-20">
                    <Link href="/contacto" className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 backdrop-blur-md rounded-full border border-cyan-500/30 hover:border-cyan-400/50 transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        <span className="text-cyan-50 text-[10px] font-bold uppercase tracking-widest group-hover:text-cyan-200 transition-colors">¿Necesitas ayuda?</span>
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
