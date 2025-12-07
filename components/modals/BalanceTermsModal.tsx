'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { FiX, FiCheck, FiAlertTriangle, FiFileText, FiEdit3, FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

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
    const [loadingProfile, setLoadingProfile] = useState(true);

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

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Use portal to render outside of parent container constraints
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[700px] max-h-[90vh] overflow-hidden animate-scaleIn flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <FiFileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Términos y Condiciones de Recarga</h2>
                            <p className="text-sm text-white/70">
                                {step === 'terms' ? 'Paso 1 de 2: Leer términos' : 'Paso 2 de 2: Firmar aceptación'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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
                            className="p-6 overflow-y-auto max-h-[50vh] text-sm text-[#495057] space-y-4"
                        >
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                                <FiAlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-yellow-800">
                                    <strong>IMPORTANTE:</strong> Lee cuidadosamente estos términos antes de realizar tu primera recarga.
                                    Al continuar, aceptas legalmente todas las condiciones aquí descritas.
                                </p>
                            </div>

                            <h3 className="font-bold text-[#212529] text-base">1. ORIGEN LÍCITO DE FONDOS</h3>
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

                            <h3 className="font-bold text-[#212529] text-base">2. POLÍTICA DE NO REEMBOLSO</h3>
                            <p>
                                <strong className="text-red-600">EL SALDO RECARGADO NO ES REEMBOLSABLE BAJO NINGUNA CIRCUNSTANCIA.</strong>
                            </p>
                            <p>
                                Una vez que el saldo haya sido acreditado a tu cuenta, no podrá ser retirado, transferido a terceros,
                                ni convertido nuevamente en dinero en efectivo o transferencia bancaria. El saldo únicamente podrá
                                ser utilizado para realizar compras de productos dentro de esta plataforma.
                            </p>

                            <h3 className="font-bold text-[#212529] text-base">3. VERACIDAD DE LA INFORMACIÓN</h3>
                            <p>
                                El usuario se compromete a proporcionar información veraz, exacta y actualizada en todas sus transacciones,
                                incluyendo pero no limitado a:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Número de referencia de pago correcto</li>
                                <li>Monto exacto de la transferencia</li>
                                <li>Datos personales verídicos</li>
                                <li>Comprobantes de pago auténticos</li>
                            </ul>
                            <p>
                                La provisión de información falsa o fraudulenta resultará en el rechazo de la transacción y posible
                                suspensión de la cuenta sin derecho a reembolso.
                            </p>

                            <h3 className="font-bold text-[#212529] text-base">4. TRANSACCIONES FALLIDAS O RECHAZADAS</h3>
                            <p>
                                El usuario acepta que las transacciones pueden ser rechazadas por los siguientes motivos:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Número de referencia incorrecto o inválido</li>
                                <li>Monto transferido diferente al declarado</li>
                                <li>Datos inconsistentes o sospechosos</li>
                                <li>Múltiples intentos fallidos consecutivos</li>
                                <li>Sospecha de actividad fraudulenta</li>
                            </ul>
                            <p>
                                <strong>Las transacciones rechazadas repetidamente pueden resultar en la suspensión temporal o permanente
                                    de la capacidad de recarga del usuario.</strong>
                            </p>

                            <h3 className="font-bold text-[#212529] text-base">5. VERIFICACIÓN Y AUDITORÍA</h3>
                            <p>
                                La empresa se reserva el derecho de:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Verificar la identidad del usuario en cualquier momento</li>
                                <li>Solicitar documentación adicional para validar transacciones</li>
                                <li>Reportar actividades sospechosas a las autoridades competentes</li>
                                <li>Retener fondos durante investigaciones de fraude</li>
                                <li>Cancelar cuentas que violen estos términos</li>
                            </ul>

                            <h3 className="font-bold text-[#212529] text-base">6. RESPONSABILIDAD LEGAL</h3>
                            <p>
                                El usuario acepta total responsabilidad legal por cualquier violación de estos términos y exime a la
                                empresa de cualquier responsabilidad derivada del uso indebido de la plataforma. En caso de disputas
                                legales, el usuario acepta someterse a la jurisdicción de los tribunales competentes de la República
                                Bolivariana de Venezuela.
                            </p>

                            <h3 className="font-bold text-[#212529] text-base">7. MODIFICACIONES</h3>
                            <p>
                                La empresa se reserva el derecho de modificar estos términos en cualquier momento. Los usuarios serán
                                notificados de cambios significativos y deberán aceptar los nuevos términos para continuar utilizando
                                el servicio de recarga.
                            </p>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                                <p className="text-blue-800 text-xs">
                                    <strong>Última actualización:</strong> Diciembre 2024 | Versión 1.0
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[#e9ecef] bg-[#f8f9fa]">
                            {!hasScrolledToBottom && (
                                <p className="text-xs text-center text-[#6a6c6b] mb-4">
                                    Desplázate hasta el final para poder continuar
                                </p>
                            )}
                            <label className="flex items-start gap-3 cursor-pointer mb-4">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    disabled={!hasScrolledToBottom}
                                    className="w-5 h-5 rounded border-2 border-[#2a63cd] text-[#2a63cd] focus:ring-[#2a63cd] mt-0.5"
                                />
                                <span className={`text-sm ${hasScrolledToBottom ? 'text-[#212529]' : 'text-[#adb5bd]'}`}>
                                    He leído, entiendo y acepto todos los términos y condiciones descritos anteriormente.
                                    Declaro que los fondos que utilizaré son de origen lícito.
                                </span>
                            </label>
                            <button
                                onClick={() => setStep('signature')}
                                disabled={!agreedToTerms || !hasScrolledToBottom}
                                className="w-full py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    <label className="block text-xs font-bold text-[#212529] mb-1 uppercase tracking-wider">
                                        Cédula de Identidad *
                                    </label>
                                    <input
                                        type="text"
                                        value={idNumber}
                                        onChange={(e) => setIdNumber(e.target.value)}
                                        placeholder="V-12345678"
                                        className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#212529] mb-1 uppercase tracking-wider">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="0414-1234567"
                                        className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#212529] mb-1 uppercase tracking-wider">
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Ciudad, Estado, País"
                                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-[#212529] uppercase tracking-wider flex items-center gap-2">
                                        <FiEdit3 className="w-4 h-4" />
                                        Firma Digital *
                                    </label>
                                    <button
                                        onClick={clearSignature}
                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                    >
                                        Limpiar Firma
                                    </button>
                                </div>
                                <div className="border-2 border-dashed border-[#2a63cd] rounded-xl p-1 bg-white">
                                    <canvas
                                        ref={canvasRef}
                                        width={500}
                                        height={150}
                                        className="w-full cursor-crosshair rounded-lg bg-[#f8f9fa]"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                                <p className="text-xs text-[#6a6c6b] mt-1">
                                    Usa tu mouse o dedo para firmar en el recuadro
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                                <strong>Nota Legal:</strong> Tu firma y datos serán guardados como constancia de aceptación
                                de los términos y condiciones. Este documento puede ser utilizado como prueba legal en caso
                                de disputas.
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[#e9ecef] bg-[#f8f9fa] flex gap-3">
                            <button
                                onClick={() => setStep('terms')}
                                className="flex-1 py-3 border-2 border-[#e9ecef] text-[#212529] font-bold rounded-xl hover:bg-white transition-all"
                            >
                                Volver
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !idNumber || !hasSignature}
                                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            <style jsx>{`
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out;
                }
            `}</style>
        </div>,
        document.body
    );
}
