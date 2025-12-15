'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PublicHeader from '@/components/public/PublicHeader';
import { FiGift, FiCheck, FiAlertCircle, FiCreditCard, FiLock, FiSearch } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function RedeemGiftCardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [code, setCode] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [cardInfo, setCardInfo] = useState<any>(null);
    const [error, setError] = useState('');
    const [redeemSuccess, setRedeemSuccess] = useState(false);
    const [redeemedAmount, setRedeemedAmount] = useState(0);

    const handleCodeChange = (value: string) => {
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
        setCode(formatted);
        setError('');
        setCardInfo(null);
    };

    const handleCheckBalance = async () => {
        if (code.length < 19) {
            setError('Ingresa un código completo');
            return;
        }
        setIsChecking(true);
        setError('');
        try {
            const response = await fetch(`/api/gift-cards/redeem?code=${code}`);
            const data = await response.json();
            if (!response.ok) {
                setError(data.error);
                setCardInfo(null);
            } else {
                setCardInfo(data);
            }
        } catch (err) {
            setError('Error al verificar la Gift Card');
        } finally {
            setIsChecking(false);
        }
    };

    const handleRedeem = async () => {
        if (!session) {
            toast.error('Debes iniciar sesión para canjear una Gift Card');
            router.push('/login?redirect=/canjear-gift-card');
            return;
        }
        if (!cardInfo || Number(cardInfo.balanceUSD) <= 0) {
            setError('Esta Gift Card no tiene saldo disponible');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/gift-cards/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, pin })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error);
                toast.error(data.error);
            } else {
                setRedeemSuccess(true);
                setRedeemedAmount(data.amountRedeemed);
                toast.success(`¡$${data.amountRedeemed.toFixed(2)} agregados a tu saldo!`);
            }
        } catch (err) {
            setError('Error al canjear la Gift Card');
            toast.error('Error al canjear la Gift Card');
        } finally {
            setIsLoading(false);
        }
    };

    if (redeemSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
                <PublicHeader />
                <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 24px' }}>
                    <div style={{ background: 'white', borderRadius: '24px', padding: '48px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                        <div style={{ width: '96px', height: '96px', margin: '0 auto 32px', background: 'linear-gradient(135deg, #22c55e, #10b981)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FiCheck style={{ width: '48px', height: '48px', color: 'white' }} />
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#111', marginBottom: '16px' }}>¡Canjeada Exitosamente!</h1>
                        <p style={{ color: '#666', marginBottom: '24px' }}>Hemos agregado el saldo de tu Gift Card a tu cuenta</p>
                        <div style={{ background: 'linear-gradient(135deg, #eff6ff, #eef2ff)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
                            <span style={{ fontSize: '14px', color: '#666' }}>Monto acreditado</span>
                            <div style={{ fontSize: '48px', fontWeight: '900', background: 'linear-gradient(90deg, #2a63cd, #1e4ba3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                ${redeemedAmount.toFixed(2)}
                            </div>
                            <span style={{ fontSize: '14px', color: '#666' }}>USD</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <Link href="/customer/wallet" style={{ flex: 1, minWidth: '140px', padding: '16px', background: 'linear-gradient(90deg, #2a63cd, #1e4ba3)', color: 'white', fontWeight: '700', borderRadius: '12px', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <FiCreditCard /> Ver mi saldo
                            </Link>
                            <Link href="/productos" style={{ flex: 1, minWidth: '140px', padding: '16px', background: '#f3f4f6', color: '#374151', fontWeight: '700', borderRadius: '12px', textAlign: 'center', textDecoration: 'none' }}>
                                Ir a comprar
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <PublicHeader />

            {/* Hero */}
            <section style={{ background: 'linear-gradient(135deg, #2a63cd, #1e4ba3, #1a3b7e)', padding: '32px 0 80px', textAlign: 'center' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '50px', marginBottom: '24px' }}>
                        <FiGift style={{ color: '#fcd34d' }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>Canjea tu Gift Card</span>
                    </div>
                    <h1 style={{ fontSize: '36px', fontWeight: '900', color: 'white', marginBottom: '16px' }}>
                        Agregar saldo con <span style={{ color: '#fcd34d' }}>Gift Card</span>
                    </h1>
                    <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>
                        Ingresa el código de tu Gift Card para agregar el saldo a tu cuenta
                    </p>
                </div>
            </section>

            {/* Form */}
            <main style={{ maxWidth: '600px', margin: '-48px auto 0', padding: '0 24px 80px' }}>
                <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>

                    {/* Code Input */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            <FiCreditCard style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                            Código de Gift Card
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => handleCodeChange(e.target.value)}
                                maxLength={19}
                                style={{ width: '100%', padding: '16px', textAlign: 'center', fontSize: '20px', fontFamily: 'monospace', fontWeight: '700', letterSpacing: '2px', border: '2px solid #e5e7eb', borderRadius: '12px', textTransform: 'uppercase', outline: 'none' }}
                                placeholder="ESMC-XXXX-XXXX-XXXX"
                            />
                            {code.length === 19 && !cardInfo && (
                                <button
                                    onClick={handleCheckBalance}
                                    disabled={isChecking}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', padding: '8px 16px', background: '#2a63cd', color: 'white', fontSize: '14px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {isChecking ? '...' : <><FiSearch /> Verificar</>}
                                </button>
                            )}
                        </div>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', textAlign: 'center' }}>
                            El código está en el email de confirmación o en el reverso de la tarjeta
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ marginBottom: '24px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FiAlertCircle style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{error}</span>
                        </div>
                    )}

                    {/* Card Info */}
                    {cardInfo && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ padding: '24px', borderRadius: '16px', border: '2px solid', borderColor: cardInfo.status === 'ACTIVE' ? '#86efac' : '#e5e7eb', background: cardInfo.status === 'ACTIVE' ? '#f0fdf4' : '#f9fafb' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Estado</span>
                                    <span style={{ padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', background: cardInfo.status === 'ACTIVE' ? '#22c55e' : '#9ca3af', color: 'white' }}>
                                        {cardInfo.status === 'ACTIVE' ? 'Activa' : cardInfo.status === 'DEPLETED' ? 'Sin saldo' : cardInfo.status}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Saldo disponible</span>
                                    <div style={{ fontSize: '48px', fontWeight: '900', background: 'linear-gradient(90deg, #22c55e, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        ${Number(cardInfo.balanceUSD).toFixed(2)}
                                    </div>
                                    <span style={{ fontSize: '14px', color: '#6b7280' }}>USD</span>
                                </div>
                            </div>

                            {/* PIN Input */}
                            {cardInfo.status === 'ACTIVE' && Number(cardInfo.balanceUSD) > 0 && (
                                <div style={{ marginTop: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                                        <FiLock style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                                        PIN (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength={4}
                                        style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '18px', fontFamily: 'monospace', fontWeight: '700', letterSpacing: '8px', border: '2px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                                        placeholder="••••"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Login Warning */}
                    {!session && status !== 'loading' && cardInfo && (
                        <div style={{ marginBottom: '24px', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FiAlertCircle style={{ flexShrink: 0 }} />
                            <div style={{ fontSize: '14px' }}>
                                <p style={{ fontWeight: '500', margin: 0 }}>Debes iniciar sesión para canjear</p>
                                <Link href="/login?redirect=/canjear-gift-card" style={{ color: '#78350f', textDecoration: 'underline' }}>
                                    Iniciar sesión
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Redeem Button */}
                    {cardInfo && cardInfo.status === 'ACTIVE' && Number(cardInfo.balanceUSD) > 0 && (
                        <button
                            onClick={handleRedeem}
                            disabled={isLoading || !session}
                            style={{ width: '100%', padding: '16px', background: 'linear-gradient(90deg, #22c55e, #10b981)', color: 'white', fontWeight: '700', fontSize: '16px', borderRadius: '12px', border: 'none', cursor: isLoading || !session ? 'not-allowed' : 'pointer', opacity: isLoading || !session ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {isLoading ? '...' : <><HiSparkles /> Canjear ${Number(cardInfo.balanceUSD).toFixed(2)}</>}
                        </button>
                    )}

                    {/* Help Link */}
                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <Link href="/contacto" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
                            ¿Problemas con tu Gift Card? Contáctanos
                        </Link>
                    </div>
                </div>

                {/* Buy Gift Card CTA */}
                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <p style={{ color: '#4b5563', marginBottom: '16px' }}>¿No tienes una Gift Card?</p>
                    <Link
                        href="/gift-cards"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'linear-gradient(90deg, #2a63cd, #1e4ba3)', color: 'white', fontWeight: '700', borderRadius: '12px', textDecoration: 'none' }}
                    >
                        <FiGift /> Comprar Gift Card
                    </Link>
                </div>
            </main>
        </div>
    );
}
