'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { FiX, FiCheck, FiAlertTriangle, FiFileText, FiEdit3 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { adminModalOverlay, adminModalPanel, adminLabel, adminInput, adminPrimaryButton, adminSecondaryButton, adminSuccessButton } from '@/lib/admin-ui';

interface BalanceTermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
}

export default function BalanceTermsModal({ isOpen, onClose, onAccept }: BalanceTermsModalProps) {
    const { data: session } = useSession();
    const [step, setStep] = useState<'terms' | 'signature'>('terms');
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [idNumber, setIdNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [, setLoadingProfile] = useState(true);

    const termsRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    // Fetch user profile data
    useEffect(() => {
        const fetchProfile = async () => {
            if (!isOpen || !session?.user) return;
            setLoadingProfile(true);
            try {
                const response = await fetch('/api/user/profile');
                if (response.ok) {
                    const data = await response.json();
                    if (data.profile) {
                        setIdNumber(data.profile.idNumber || '');
                        setPhone(data.profile.phone || '');
                        const addressParts = [data.profile.city, data.profile.state, data.profile.country].filter(Boolean);
                        setAddress(addressParts.join(', ') || '');
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoadingProfile(false);
            }
        };
        fetchProfile();
    }, [isOpen, session]);

    // Handle scroll to enable accept button
    const handleScroll = () => {
        if (termsRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = termsRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 10) {
                setHasScrolledToBottom(true);
            }
        }
    };

    // Canvas drawing functions
    useEffect(() => {
        if (step === 'signature' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#2a63cd';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, [step]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let x, y;
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let x, y;
        if ('touches' in e) {
            e.preventDefault();
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleSubmit = async () => {
        if (!idNumber.trim()) {
            toast.error('Por favor ingresa tu número de cédula');
            return;
        }
        if (!hasSignature) {
            toast.error('Por favor firma en el recuadro');
            return;
        }

        setIsSubmitting(true);

        try {
            const canvas = canvasRef.current;
            const signatureData = canvas?.toDataURL('image/png') || '';

            const response = await fetch('/api/customer/balance/terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idNumber,
                    phone,
                    address,
                    signatureData,
                }),
            });

            if (response.ok) {
                toast.success('Términos y condiciones aceptados');
                onAccept();
                onClose();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Error al aceptar términos');
            }
        } catch (error) {
            console.error('Error submitting terms:', error);
            toast.error('Error al procesar la solicitud');
        } finally {
            setIsSubmitting(false);
        }
    };

    useBodyScrollLock(isOpen);

    if (!isOpen) return null;

    // Use portal to render outside of parent container constraints
    return createPortal(
        <div className={adminModalOverlay}>
            <div className={`${adminModalPanel} max-w-[700px] w-full max-h-[90vh] overflow-hidden flex flex-col`}>
                {/* Header */}
                <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-line flex items-center justify-between">
                    <div className="flex items-center gap-2 lg:gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-brand-500/10 rounded-lg lg:rounded-xl flex items-center justify-center text-brand-500">
                            <FiFileText className="w-4 h-4 lg:w-5 lg:h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm lg:text-base font-bold text-ink">Términos de Recarga</h2>
                            <p className="text-xs text-muted">
                                {step === 'terms' ? 'Paso 1: Leer términos' : 'Paso 2: Firmar'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-muted hover:text-ink hover:bg-surface rounded-lg transition-colors"
                        aria-label="Cerrar"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {step === 'terms' ? (
                    <>
                        {/* Terms Content */}
                        <div
                            ref={termsRef}
                            onScroll={handleScroll}
                            className="p-6 overflow-y-auto max-h-[50vh] text-xs text-ink-soft space-y-4"
                        >
                            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
                                <FiAlertTriangle className="w-5 h-5 text-warning-strong flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-ink-soft leading-relaxed">
                                    <strong className="text-ink font-bold">IMPORTANTE:</strong> Lee cuidadosamente estos términos antes de realizar tu primera recarga.
                                    Al continuar, aceptas legalmente todas las condiciones aquí descritas.
                                </p>
                            </div>

                            <h3 className="font-bold text-ink text-sm">1. ORIGEN LÍCITO DE FONDOS</h3>
                            <p>
                                El usuario declara bajo juramento que todos los fondos utilizados para recargar saldo en esta plataforma
                                provienen de actividades lícitas y legales. Queda estrictamente prohibido el uso de fondos provenientes de:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Actividades de lavado de dinero o activos</li>
                                <li>Financiamiento del terrorismo</li>
                                <li>Narcotráfico o actividades ilícitas relacionadas</li>
                                <li>Fraude, estafa o cualquier otra actividad criminal</li>
                                <li>Evasión fiscal o fondos no declarados</li>
                            </ul>

                            <h3 className="font-bold text-ink text-sm">2. POLÍTICA DE NO REEMBOLSO</h3>
                            <p>
                                <strong className="text-deal font-bold">EL SALDO RECARGADO NO ES REEMBOLSABLE BAJO NINGUNA CIRCUNSTANCIA.</strong>
                            </p>
                            <p>
                                Una vez que el saldo haya sido acreditado a tu cuenta, no podrá ser retirado, transferido a terceros,
                                ni convertido nuevamente en dinero en efectivo o transferencia bancaria. El saldo únicamente podrá
                                ser utilizado para realizar compras de productos dentro de esta plataforma.
                            </p>

                            <h3 className="font-bold text-ink text-sm">3. VERACIDAD DE LA INFORMACIÓN</h3>
                            <p>
                                El usuario se compromete a proporcionar información veraz, exacta y actualizada en todas sus transacciones,
                                incluyendo pero no limitado a:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Número de referencia de pago correcto</li>
                                <li>Monto exacto transferido</li>
                                <li>Datos bancarios propios (no de terceros)</li>
                                <li>Comprobantes de pago legítimos y sin alteraciones</li>
                            </ul>

                            <h3 className="font-bold text-ink text-sm">4. SANCIONES POR INCUMPLIMIENTO</h3>
                            <p>
                                Cualquier intento de fraude, uso de comprobantes falsificados, o suministro de información
                                engañosa resultará en:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Suspensión inmediata y definitiva de la cuenta</li>
                                <li>Pérdida total del saldo acumulado sin derecho a reclamo</li>
                                <li>Reporte a las autoridades financieras y judiciales competentes</li>
                                <li>Acciones legales pertinentes según las leyes de la República Bolivariana de Venezuela</li>
                            </ul>

                            <h3 className="font-bold text-ink text-sm">5. ACEPTACIÓN EXPRESA</h3>
                            <p>
                                Al marcar la casilla de aceptación y estampar tu firma digital, confirmas que has leído,
                                comprendido y aceptado en su totalidad estos Términos y Condiciones, los cuales tienen
                                plena validez legal como contrato de adhesión.
                            </p>
                        </div>

                        {/* Terms Footer */}
                        <div className="p-4 lg:p-6 border-t border-line bg-surface space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    disabled={!hasScrolledToBottom}
                                    className="w-5 h-5 rounded border border-line text-brand-500 focus:ring-brand-500 mt-0.5"
                                />
                                <span className={`text-xs ${hasScrolledToBottom ? 'text-ink' : 'text-subtle'}`}>
                                    He leído, entiendo y acepto todos los términos y condiciones descritos anteriormente.
                                    Declaro que los fondos que utilizaré son de origen lícito.
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setStep('signature')}
                                disabled={!agreedToTerms || !hasScrolledToBottom}
                                className={`${adminPrimaryButton} w-full`}
                            >
                                Continuar a Firma Digital
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Signature Step */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={adminLabel}>
                                        Cédula de Identidad *
                                    </label>
                                    <input
                                        type="text"
                                        value={idNumber}
                                        onChange={(e) => setIdNumber(e.target.value)}
                                        placeholder="V-12345678"
                                        className={adminInput()}
                                    />
                                </div>
                                <div>
                                    <label className={adminLabel}>
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="0414-1234567"
                                        className={adminInput()}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={adminLabel}>
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Ciudad, Estado, País"
                                    className={adminInput()}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={`${adminLabel} mb-0 flex items-center gap-2`}>
                                        <FiEdit3 className="w-4 h-4" />
                                        Firma Digital *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={clearSignature}
                                        className="text-xs text-deal hover:text-deal/80 font-bold"
                                    >
                                        Limpiar Firma
                                    </button>
                                </div>
                                <div className="border border-line rounded-xl p-1 bg-white">
                                    <canvas
                                        ref={canvasRef}
                                        width={500}
                                        height={150}
                                        className="w-full cursor-crosshair rounded-lg bg-surface"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                                <p className="text-xs text-muted mt-1">
                                    Usa tu mouse o dedo para firmar en el recuadro
                                </p>
                            </div>

                            <div className="bg-info/10 border border-info/30 rounded-xl p-3 text-xs text-ink-soft">
                                <strong className="font-bold text-ink">Nota Legal:</strong> Tu firma y datos serán guardados como constancia de aceptación
                                de los términos y condiciones. Este documento puede ser utilizado como prueba legal en caso
                                de disputas.
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 lg:p-6 border-t border-line bg-surface flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep('terms')}
                                className={`${adminSecondaryButton} flex-1`}
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !idNumber || !hasSignature}
                                className={`${adminSuccessButton} flex-1 flex items-center justify-center gap-2`}
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiCheck className="w-5 h-5" />
                                )}
                                Firmar y Aceptar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
