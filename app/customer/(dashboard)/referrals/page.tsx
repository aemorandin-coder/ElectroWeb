'use client';

import { useState, useEffect, Fragment } from 'react';
import {
    FiGift,
    FiCopy,
    FiShare2,
    FiUsers,
    FiDollarSign,
    FiCheckCircle,
    FiClock,
    FiAward,
    FiTrendingUp,
    FiUserPlus,
    FiShoppingCart,
    FiChevronRight,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Influencer {
    id: string;
    code: string;
    name: string;
    commissionRate: number;
    status: string;
    createdAt: string;
}

interface Stats {
    totalConversions: number;
    approvedConversions: number;
    pendingEarnings: number;
    approvedEarnings: number;
    totalEarnings: number;
    thisMonthEarnings: number;
}

interface Conversion {
    id: string;
    type: string;
    grossAmount: number;
    commission: number;
    status: string;
    createdAt: string;
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    totalEarnings: number;
    conversionsCount: number;
    isCurrentUser: boolean;
}

interface ReferralData {
    enrolled: boolean;
    influencer?: Influencer;
    stats?: Stats;
    conversions?: Conversion[];
    currentUserRank?: number | null;
    leaderboard?: LeaderboardEntry[];
}

type Tier = 'bronze' | 'silver' | 'gold';

const TIERS: Record<Tier, {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: string;
}> = {
    bronze: {
        label: 'Bronce',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: '🥉',
    },
    silver: {
        label: 'Plata',
        color: 'text-slate-500',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: '🥈',
    },
    gold: {
        label: 'Oro',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: '🥇',
    },
};

function getTier(approvedConversions: number): Tier {
    if (approvedConversions >= 50) return 'gold';
    if (approvedConversions >= 10) return 'silver';
    return 'bronze';
}

function getTierProgress(approvedConversions: number) {
    if (approvedConversions >= 50) {
        return { current: 'gold' as Tier, nextTier: null, progress: 100, needed: 0 };
    }
    if (approvedConversions >= 10) {
        const progress = ((approvedConversions - 10) / 40) * 100;
        return { current: 'silver' as Tier, nextTier: 'gold' as Tier, progress, needed: 50 - approvedConversions };
    }
    const progress = (approvedConversions / 10) * 100;
    return { current: 'bronze' as Tier, nextTier: 'silver' as Tier, progress, needed: 10 - approvedConversions };
}

const CONVERSION_LABELS: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
    REGISTRATION: { label: 'Registro', Icon: FiUserPlus, color: 'text-blue-600' },
    PURCHASE: { label: 'Compra', Icon: FiShoppingCart, color: 'text-green-600' },
    RECHARGE: { label: 'Recarga', Icon: FiDollarSign, color: 'text-purple-600' },
};

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
};

function StatCard({
    label,
    value,
    Icon,
    color,
    bg,
    suffix = '',
}: {
    label: string;
    value: string;
    Icon: React.ElementType;
    color: string;
    bg: string;
    suffix?: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-[#e9ecef] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <span className="text-xs text-[#6a6c6b]">{label}</span>
            </div>
            <p className="text-xl font-bold text-[#212529]">
                {value}
                <span className="text-xs font-normal text-[#6a6c6b]">{suffix}</span>
            </p>
        </div>
    );
}

function NotEnrolledView() {
    return (
        <div className="space-y-6">
            <div className="text-center pt-4 pb-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] mb-4 shadow-lg shadow-[#2a63cd]/30">
                    <FiGift className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-[#212529] mb-2">Programa de Referidos</h1>
                <p className="text-[#6a6c6b] max-w-md mx-auto text-sm leading-relaxed">
                    Comparte la tienda con tus amigos y gana{' '}
                    <strong className="text-[#2a63cd]">comisiones reales</strong> por cada
                    persona que use tu enlace para comprar o recargarse.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    {
                        Icon: FiDollarSign,
                        title: 'Comisiones reales',
                        desc: 'Gana un porcentaje por cada venta generada por tus referidos',
                        color: 'text-green-600',
                        bg: 'bg-green-50',
                    },
                    {
                        Icon: FiAward,
                        title: 'Sistema de niveles',
                        desc: 'Sube de Bronce a Plata y Oro para desbloquear mejores beneficios',
                        color: 'text-yellow-600',
                        bg: 'bg-yellow-50',
                    },
                    {
                        Icon: FiUsers,
                        title: 'Sin límite de referidos',
                        desc: 'Cuantas más personas invites, más puedes ganar mes a mes',
                        color: 'text-blue-600',
                        bg: 'bg-blue-50',
                    },
                ].map((b) => (
                    <div
                        key={b.title}
                        className="flex items-start gap-3 p-4 bg-[#f8f9fa] rounded-xl border border-[#e9ecef]"
                    >
                        <div
                            className={`w-9 h-9 rounded-lg ${b.bg} flex items-center justify-center flex-shrink-0`}
                        >
                            <b.Icon className={`w-4 h-4 ${b.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#212529]">{b.title}</p>
                            <p className="text-xs text-[#6a6c6b] mt-0.5">{b.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <h3 className="text-base font-bold text-[#212529] mb-3 text-center">¿Cómo funciona?</h3>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    {[
                        {
                            n: '1',
                            title: 'Únete al programa',
                            desc: 'Contáctanos para activar tu cuenta de referidos',
                        },
                        {
                            n: '2',
                            title: 'Comparte tu enlace',
                            desc: 'Envía tu enlace único a amigos y redes sociales',
                        },
                        {
                            n: '3',
                            title: 'Gana comisiones',
                            desc: 'Recibe pagos por cada compra de tus referidos',
                        },
                    ].map((step, idx) => (
                        <Fragment key={step.n}>
                            <div className="flex-1 text-center p-4 bg-gradient-to-br from-[#f8f9fa] to-white rounded-xl border border-[#e9ecef]">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">
                                    {step.n}
                                </div>
                                <p className="text-sm font-semibold text-[#212529]">{step.title}</p>
                                <p className="text-xs text-[#6a6c6b] mt-0.5">{step.desc}</p>
                            </div>
                            {idx < 2 && (
                                <FiChevronRight className="hidden sm:block w-5 h-5 text-[#dee2e6] flex-shrink-0 self-center" />
                            )}
                        </Fragment>
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-r from-[#1e3a8a]/5 to-[#2a63cd]/5 border border-[#2a63cd]/15 rounded-xl p-5 text-center">
                <p className="text-sm font-semibold text-[#212529] mb-1">¿Listo para empezar?</p>
                <p className="text-xs text-[#6a6c6b] mb-4">
                    Nuestro equipo revisará tu solicitud y activará tu enlace personalizado
                </p>
                <a
                    href="/contacto"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#2a63cd]/25 hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                    <FiGift className="w-4 h-4" />
                    Solicitar acceso al programa
                </a>
            </div>
        </div>
    );
}

export default function ReferralsPage() {
    const [data, setData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [siteUrl, setSiteUrl] = useState('');

    useEffect(() => {
        setSiteUrl(window.location.origin);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/customer/referrals');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const referralUrl =
        data?.influencer && siteUrl ? `${siteUrl}/?ref=${data.influencer.code}` : '';

    const handleCopy = async () => {
        if (!referralUrl) return;
        try {
            await navigator.clipboard.writeText(referralUrl);
            setCopied(true);
            toast.success('¡Enlace copiado!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('No se pudo copiar el enlace');
        }
    };

    const shareWhatsApp = () => {
        const text = `¡Te recomiendo esta tienda! Regístrate con mi enlace y obtén beneficios: ${referralUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareTelegram = () => {
        const text = `¡Usa mi enlace de referido y obtén beneficios!`;
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`,
            '_blank'
        );
    };

    const shareTwitter = () => {
        const text = `Descubrí esta increíble tienda. ¡Regístrate con mi enlace y obtén beneficios!`;
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralUrl)}`,
            '_blank'
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2a63cd]" />
            </div>
        );
    }

    if (!data?.enrolled) {
        return <NotEnrolledView />;
    }

    const { influencer, stats, conversions, leaderboard, currentUserRank } = data;
    if (!influencer || !stats) return null;

    const tier = getTier(stats.approvedConversions);
    const tierInfo = TIERS[tier];
    const tierProgress = getTierProgress(stats.approvedConversions);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${tierInfo.bg} ${tierInfo.border}`}
                >
                    <span className="text-2xl">{tierInfo.icon}</span>
                    <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${tierInfo.color}`}>
                            Nivel Actual
                        </p>
                        <p className={`text-base font-bold ${tierInfo.color}`}>{tierInfo.label}</p>
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold text-[#212529]">Mi Programa de Referidos</h1>
                        {influencer.status === 'PAUSED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                                Pausado
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[#6a6c6b]">
                        Comisión de{' '}
                        <span className="font-semibold text-[#2a63cd]">
                            {influencer.commissionRate}%
                        </span>{' '}
                        por cada conversión aprobada
                    </p>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    label="Pendiente"
                    value={`$${stats.pendingEarnings.toFixed(2)}`}
                    Icon={FiClock}
                    color="text-yellow-600"
                    bg="bg-yellow-50"
                />
                <StatCard
                    label="Aprobado"
                    value={`$${stats.approvedEarnings.toFixed(2)}`}
                    Icon={FiCheckCircle}
                    color="text-green-600"
                    bg="bg-green-50"
                />
                <StatCard
                    label="Este mes"
                    value={`$${stats.thisMonthEarnings.toFixed(2)}`}
                    Icon={FiTrendingUp}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    label="Conversiones"
                    value={stats.approvedConversions.toString()}
                    Icon={FiUsers}
                    color="text-purple-600"
                    bg="bg-purple-50"
                    suffix=" aprobadas"
                />
            </div>

            {/* Referral link card */}
            <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2a63cd] rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                    <FiShare2 className="w-4 h-4 opacity-80" />
                    <h3 className="text-sm font-semibold">Tu Enlace de Referido</h3>
                </div>

                {/* URL row */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 font-mono text-xs text-white/90 truncate min-w-0">
                        {referralUrl || 'Cargando...'}
                    </div>
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                            copied
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-[#2a63cd] hover:bg-white/90'
                        }`}
                    >
                        {copied ? (
                            <FiCheckCircle className="w-3.5 h-3.5" />
                        ) : (
                            <FiCopy className="w-3.5 h-3.5" />
                        )}
                        {copied ? 'Copiado' : 'Copiar'}
                    </button>
                </div>

                {/* Code badge */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-white/60 text-xs">Tu código:</span>
                    <span className="bg-white/15 border border-white/25 rounded-lg px-3 py-1 text-sm font-bold tracking-widest">
                        {influencer.code}
                    </span>
                </div>

                {/* Share buttons */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={shareWhatsApp}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1eb558] rounded-lg text-xs font-semibold transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp
                    </button>
                    <button
                        onClick={shareTelegram}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#229ED9] hover:bg-[#1a8bbf] rounded-lg text-xs font-semibold transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        Telegram
                    </button>
                    <button
                        onClick={shareTwitter}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-gray-800 rounded-lg text-xs font-semibold transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Twitter / X
                    </button>
                </div>
            </div>

            {/* How it works */}
            <div>
                <h3 className="text-base font-bold text-[#212529] mb-3">¿Cómo funciona?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        {
                            title: 'Comparte tu enlace',
                            desc: 'Envía tu enlace único a amigos y seguidores en redes sociales',
                            Icon: FiShare2,
                            color: 'text-blue-500',
                            bg: 'bg-blue-50',
                            step: '1',
                        },
                        {
                            title: 'Tu amigo compra',
                            desc: 'Cuando se registran o realizan una compra usando tu enlace',
                            Icon: FiShoppingCart,
                            color: 'text-green-500',
                            bg: 'bg-green-50',
                            step: '2',
                        },
                        {
                            title: 'Ganas comisión',
                            desc: `Recibes el ${influencer.commissionRate}% de cada conversión aprobada`,
                            Icon: FiDollarSign,
                            color: 'text-purple-500',
                            bg: 'bg-purple-50',
                            step: '3',
                        },
                    ].map((item) => (
                        <div
                            key={item.step}
                            className="flex items-start gap-3 p-4 bg-[#f8f9fa] rounded-xl border border-[#e9ecef]"
                        >
                            <div
                                className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}
                            >
                                <item.Icon className={`w-4 h-4 ${item.color}`} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-bold text-[#2a63cd]">
                                        Paso {item.step}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-[#212529]">{item.title}</p>
                                <p className="text-xs text-[#6a6c6b] mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tier progression */}
            <div className="bg-[#f8f9fa] rounded-xl border border-[#e9ecef] p-5">
                <h3 className="text-base font-bold text-[#212529] mb-4">Progreso de Nivel</h3>
                <div className="flex items-center justify-between mb-3">
                    {(['bronze', 'silver', 'gold'] as Tier[]).map((t, idx) => {
                        const info = TIERS[t];
                        const isActive = tier === t;
                        const isPast =
                            (t === 'bronze' && tier !== 'bronze') ||
                            (t === 'silver' && tier === 'gold');
                        return (
                            <Fragment key={t}>
                                <div
                                    className={`flex flex-col items-center gap-1 transition-opacity ${
                                        isActive ? 'opacity-100' : isPast ? 'opacity-70' : 'opacity-35'
                                    }`}
                                >
                                    <span className="text-2xl">{info.icon}</span>
                                    <span
                                        className={`text-xs font-semibold ${isActive ? info.color : 'text-[#6a6c6b]'}`}
                                    >
                                        {info.label}
                                    </span>
                                    <span className="text-[10px] text-[#adb5bd]">
                                        {t === 'bronze' ? '0+' : t === 'silver' ? '10+' : '50+'}
                                    </span>
                                </div>
                                {idx < 2 && (
                                    <div className="flex-1 mx-3 h-2 bg-[#dee2e6] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-full transition-all duration-700"
                                            style={{
                                                width:
                                                    t === 'bronze'
                                                        ? tier === 'bronze'
                                                            ? `${Math.min(100, (stats.approvedConversions / 10) * 100)}%`
                                                            : '100%'
                                                        : tier === 'silver'
                                                          ? `${Math.min(100, ((stats.approvedConversions - 10) / 40) * 100)}%`
                                                          : tier === 'gold'
                                                            ? '100%'
                                                            : '0%',
                                            }}
                                        />
                                    </div>
                                )}
                            </Fragment>
                        );
                    })}
                </div>
                {tierProgress.nextTier && (
                    <p className="text-center text-xs text-[#6a6c6b]">
                        Necesitas{' '}
                        <span className="font-semibold text-[#2a63cd]">{tierProgress.needed}</span>{' '}
                        conversiones más para alcanzar nivel{' '}
                        <span className="font-semibold">{TIERS[tierProgress.nextTier].label}</span>
                    </p>
                )}
            </div>

            {/* Conversions + Leaderboard */}
            <div className="grid lg:grid-cols-2 gap-4">
                {/* Conversions table */}
                <div>
                    <h3 className="text-base font-bold text-[#212529] mb-3">
                        Mis Conversiones Recientes
                    </h3>
                    {!conversions || conversions.length === 0 ? (
                        <div className="text-center py-10 text-[#6a6c6b] text-sm bg-[#f8f9fa] rounded-xl border border-[#e9ecef]">
                            <FiUsers className="w-8 h-8 mx-auto mb-2 opacity-25" />
                            <p>No hay conversiones aún.</p>
                            <p className="text-xs mt-1">¡Comparte tu enlace para empezar!</p>
                        </div>
                    ) : (
                        <div className="border border-[#e9ecef] rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[#f8f9fa] border-b border-[#e9ecef]">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#6a6c6b]">
                                            Tipo
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6a6c6b]">
                                            Comisión
                                        </th>
                                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-[#6a6c6b]">
                                            Estado
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-[#6a6c6b]">
                                            Fecha
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f0f0]">
                                    {conversions.slice(0, 10).map((conv) => {
                                        const typeInfo = CONVERSION_LABELS[conv.type] || {
                                            label: conv.type,
                                            Icon: FiGift,
                                            color: 'text-gray-600',
                                        };
                                        return (
                                            <tr key={conv.id} className="hover:bg-[#fafafa]">
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <typeInfo.Icon
                                                            className={`w-3.5 h-3.5 ${typeInfo.color}`}
                                                        />
                                                        <span className="text-xs text-[#212529]">
                                                            {typeInfo.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <span className="text-xs font-semibold text-[#212529]">
                                                        ${conv.commission.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[conv.status] || 'bg-gray-100 text-gray-700'}`}
                                                    >
                                                        {STATUS_LABELS[conv.status] || conv.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-xs text-[#6a6c6b]">
                                                    {format(new Date(conv.createdAt), 'dd/MM/yy', {
                                                        locale: es,
                                                    })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Leaderboard */}
                <div>
                    <h3 className="text-base font-bold text-[#212529] mb-3">
                        Clasificación{' '}
                        <span className="text-[#6a6c6b] font-normal text-sm">· Top Referidores</span>
                    </h3>
                    {!leaderboard || leaderboard.length === 0 ? (
                        <div className="text-center py-10 text-[#6a6c6b] text-sm bg-[#f8f9fa] rounded-xl border border-[#e9ecef]">
                            <FiAward className="w-8 h-8 mx-auto mb-2 opacity-25" />
                            <p>Sé el primero en el ranking.</p>
                            <p className="text-xs mt-1">El clasificador se actualiza en tiempo real.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaderboard.map((entry) => (
                                <div
                                    key={entry.rank}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                                        entry.isCurrentUser
                                            ? 'bg-[#2a63cd]/5 border-[#2a63cd]/20'
                                            : 'bg-[#f8f9fa] border-[#e9ecef]'
                                    }`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            entry.rank === 1
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : entry.rank === 2
                                                  ? 'bg-slate-100 text-slate-600'
                                                  : entry.rank === 3
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-[#e9ecef] text-[#6a6c6b]'
                                        }`}
                                    >
                                        {entry.rank <= 3
                                            ? ['🥇', '🥈', '🥉'][entry.rank - 1]
                                            : `#${entry.rank}`}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[#212529] truncate">
                                            {entry.name}
                                            {entry.isCurrentUser && (
                                                <span className="ml-1.5 text-[10px] text-[#2a63cd] font-normal">
                                                    (Tú)
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-[#6a6c6b]">
                                            {entry.conversionsCount} conversiones
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-[#2a63cd]">
                                        ${entry.totalEarnings.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            {currentUserRank && currentUserRank > 10 && (
                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-[#2a63cd]/5 border-[#2a63cd]/20">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[#2a63cd]/10 text-[#2a63cd]">
                                        #{currentUserRank}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-[#2a63cd]">
                                            Tu posición
                                        </p>
                                        <p className="text-xs text-[#6a6c6b]">
                                            Sigue compartiendo para subir
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
