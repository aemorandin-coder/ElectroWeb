'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiPhone, FiHash, FiCalendar, FiCheck, FiAlertCircle, FiLoader, FiChevronDown, FiCreditCard, FiMessageCircle, FiUser } from 'react-icons/fi';
import { BANCOS_VENEZUELA, type BancoVenezuela } from '@/lib/pago-movil/bancos-venezuela';

interface VerificarPagoMovilFormProps {
    /** Monto esperado del pago */
    montoEsperado: number;
    /** Monto en bolívares (para mostrar referencia) */
    montoEnBs?: number;
    /** Contexto de la verificación */
    contexto?: 'RECHARGE' | 'ORDER' | 'GENERAL';
    /** ID de la transacción de recarga (si aplica) */
    transactionId?: string;
    /** ID de la orden (si aplica) */
    orderId?: string;
    /** Callback cuando la verificación es exitosa */
    onSuccess?: (data: { verified: boolean; autoApproved?: boolean; amount?: string }) => void;
    /** Callback cuando hay error */
    onError?: (message: string) => void;
    /** Datos iniciales del formulario */
    initialData?: {
        telefonoPagador?: string;
        bancoOrigen?: string;
        referencia?: string;
        fechaPago?: string;
        cedulaPagador?: string;
    };
    /** Si está deshabilitado */
    disabled?: boolean;
    /** Clase CSS adicional */
    className?: string;
}

interface VerificacionResult {
    success: boolean;
    verified: boolean;
    autoApproved?: boolean;
    message: string;
    amount?: string;
    code?: number;
    errorType?: 'DUPLICATE_REFERENCE' | 'BANK_ERROR' | 'SERVER_ERROR' | 'VALIDATION_ERROR';
    requiresContact?: boolean;
    duplicateReference?: boolean;
}

// Estados de verificación para UI mejorada
type VerificationState = 'idle' | 'verifying' | 'success' | 'error' | 'duplicate';

export default function VerificarPagoMovilForm({
    montoEsperado,
    montoEnBs,
    contexto = 'GENERAL',
    transactionId,
    orderId,
    onSuccess,
    onError,
    initialData,
    disabled = false,
    className = '',
}: VerificarPagoMovilFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        telefonoPagador: initialData?.telefonoPagador || '',
        bancoOrigen: initialData?.bancoOrigen || '',
        referencia: initialData?.referencia || '',
        fechaPago: initialData?.fechaPago || new Date().toISOString().split('T')[0],
        cedulaPagador: initialData?.cedulaPagador || '',
    });

    const [verificationState, setVerificationState] = useState<VerificationState>('idle');
    const [resultado, setResultado] = useState<VerificacionResult | null>(null);
    const [showBankDropdown, setShowBankDropdown] = useState(false);
    const [filteredBancos, setFilteredBancos] = useState<BancoVenezuela[]>(BANCOS_VENEZUELA);
    const [bankSearchTerm, setBankSearchTerm] = useState('');

    // Filtrar bancos por término de búsqueda
    useEffect(() => {
        if (!bankSearchTerm) {
            setFilteredBancos(BANCOS_VENEZUELA);
        } else {
            const term = bankSearchTerm.toLowerCase();
            setFilteredBancos(
                BANCOS_VENEZUELA.filter(
                    banco =>
                        banco.nombre.toLowerCase().includes(term) ||
                        banco.nombreCorto.toLowerCase().includes(term) ||
                        banco.codigo.includes(term)
                )
            );
        }
    }, [bankSearchTerm]);

    // Obtener banco seleccionado
    const bancoSeleccionado = BANCOS_VENEZUELA.find(b => b.codigo === formData.bancoOrigen);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Limpiar resultado anterior
        if (resultado) {
            setResultado(null);
            setVerificationState('idle');
        }
    };

    const handleSelectBanco = (banco: BancoVenezuela) => {
        setFormData(prev => ({ ...prev, bancoOrigen: banco.codigo }));
        setShowBankDropdown(false);
        setBankSearchTerm('');
        if (resultado) {
            setResultado(null);
            setVerificationState('idle');
        }
    };

    // Genera URL de contacto con datos precargados
    const getContactUrl = (errorMessage: string) => {
        const banco = BANCOS_VENEZUELA.find(b => b.codigo === formData.bancoOrigen);
        const mensaje = `
📩 Solicitud de Soporte - Verificación de Pago Móvil

📋 DATOS DEL PAGO:
• Cédula: ${formData.cedulaPagador}
• Teléfono: ${formData.telefonoPagador}
• Banco: ${banco?.nombre || formData.bancoOrigen}
• Referencia: ${formData.referencia}
• Fecha: ${formData.fechaPago}
• Monto USD: $${montoEsperado.toFixed(2)}
${montoEnBs ? `• Monto Bs: ${montoEnBs.toFixed(2)}` : ''}

⚠️ ERROR ENCONTRADO:
${errorMessage}

Por favor necesito ayuda para verificar mi pago.
        `.trim();

        const params = new URLSearchParams({
            nombre: '',
            email: '',
            asunto: 'soporte',
            mensaje: mensaje
        });

        return `/contacto?${params.toString()}`;
    };

    // Redirige a página de contacto con datos precargados
    const handleContactRedirect = () => {
        const url = getContactUrl(resultado?.message || 'Error en la verificación del pago');
        router.push(url);
    };

    const handleVerificar = async () => {
        // Validaciones básicas
        if (!formData.cedulaPagador) {
            onError?.('Ingresa la cédula del titular de la cuenta');
            return;
        }
        if (!formData.telefonoPagador) {
            onError?.('Ingresa el teléfono desde donde realizaste el pago');
            return;
        }
        if (!formData.bancoOrigen) {
            onError?.('Selecciona el banco desde donde realizaste el pago');
            return;
        }
        if (!formData.referencia) {
            onError?.('Ingresa el número de referencia del pago');
            return;
        }
        if (!formData.fechaPago) {
            onError?.('Selecciona la fecha del pago');
            return;
        }

        setVerificationState('verifying');
        setResultado(null);

        try {
            const response = await fetch('/api/pago-movil/verificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    importe: montoEnBs || montoEsperado, // Monto en Bs para verificar con BDV
                    importeUsd: montoEsperado, // Monto en USD para la transacción
                    contexto,
                    transactionId,
                    orderId,
                    reqCed: true, // Siempre validar cédula para mayor seguridad
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Determinar tipo de error
                if (data.duplicateReference || data.errorType === 'DUPLICATE_REFERENCE') {
                    setVerificationState('duplicate');
                    setResultado({
                        success: false,
                        verified: false,
                        message: data.message || data.error || 'Esta referencia ya fue utilizada.',
                        errorType: 'DUPLICATE_REFERENCE',
                        duplicateReference: true,
                        requiresContact: true,
                    });
                    onError?.('⚠️ Esta referencia de pago ya fue utilizada anteriormente. Por seguridad, esta acción ha sido registrada.');
                } else {
                    setVerificationState('error');
                    setResultado({
                        success: false,
                        verified: false,
                        message: data.error || 'Error al verificar el pago',
                        errorType: 'VALIDATION_ERROR',
                        requiresContact: true,
                    });
                    onError?.(data.error || 'Error al verificar el pago');
                }
                return;
            }

            setResultado(data);

            if (data.verified) {
                setVerificationState('success');
                onSuccess?.(data);
            } else {
                // Pago no verificado - puede ser error del banco
                setVerificationState('error');
                setResultado({
                    ...data,
                    errorType: 'BANK_ERROR',
                    requiresContact: true,
                });
                onError?.(data.message);
            }
        } catch (error) {
            // Error de conexión/servidor
            const message = 'Error de conexión. Por favor, intenta nuevamente.';
            setVerificationState('error');
            setResultado({
                success: false,
                verified: false,
                message,
                errorType: 'SERVER_ERROR',
                requiresContact: true,
            });
            onError?.(message);
        }
    };

    const canSubmit =
        !disabled &&
        verificationState !== 'verifying' &&
        formData.cedulaPagador &&
        formData.telefonoPagador &&
        formData.bancoOrigen &&
        formData.referencia &&
        formData.fechaPago;

    // Texto del botón según estado
    const getButtonContent = () => {
        switch (verificationState) {
            case 'verifying':
                return (
                    <>
                        <FiLoader className="w-5 h-5 animate-spin" />
                        <span>Validando con Banco de Venezuela...</span>
                    </>
                );
            case 'success':
                return (
                    <>
                        <FiCheck className="w-5 h-5" />
                        <span>¡Verificación Exitosa!</span>
                    </>
                );
            default:
                return (
                    <>
                        <FiCheck className="w-5 h-5" />
                        <span>Verificar Pago y Confirmar Saldo</span>
                    </>
                );
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Fila superior: Fecha y Referencia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fecha del pago */}
                <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                        Fecha del Pago <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6c6b]">
                            <FiCalendar className="w-4 h-4" />
                        </div>
                        <input
                            type="date"
                            name="fechaPago"
                            value={formData.fechaPago}
                            onChange={handleChange}
                            max={new Date().toISOString().split('T')[0]}
                            disabled={disabled || verificationState === 'verifying'}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Referencia */}
                <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                        Nº de Referencia <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6c6b]">
                            <FiHash className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            name="referencia"
                            value={formData.referencia}
                            onChange={handleChange}
                            placeholder="12345678"
                            maxLength={8}
                            disabled={disabled || verificationState === 'verifying'}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                    <p className="text-[10px] text-[#6a6c6b] mt-1">Últimos 4-8 dígitos</p>
                </div>
            </div>

            {/* Grid de 2 columnas para campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cédula del pagador */}
                <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                        Cédula del Titular <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6c6b]">
                            <FiUser className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            name="cedulaPagador"
                            value={formData.cedulaPagador}
                            onChange={handleChange}
                            placeholder="V12345678"
                            maxLength={12}
                            disabled={disabled || verificationState === 'verifying'}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                    <p className="text-[10px] text-[#6a6c6b] mt-1">Ej: V12345678 o E12345678</p>
                </div>

                {/* Teléfono del pagador */}
                <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                        Teléfono del Pago <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6c6b]">
                            <FiPhone className="w-4 h-4" />
                        </div>
                        <input
                            type="tel"
                            name="telefonoPagador"
                            value={formData.telefonoPagador}
                            onChange={handleChange}
                            placeholder="04121234567"
                            pattern="04[0-9]{9}"
                            maxLength={11}
                            disabled={disabled || verificationState === 'verifying'}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                    <p className="text-[10px] text-[#6a6c6b] mt-1">Teléfono desde donde pagaste</p>
                </div>

                {/* Banco origen - Dropdown mejorado */}
                <div className="relative">
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                        Banco de Origen <span className="text-red-500">*</span>
                    </label>
                    <button
                        type="button"
                        onClick={() => !disabled && verificationState !== 'verifying' && setShowBankDropdown(!showBankDropdown)}
                        disabled={disabled || verificationState === 'verifying'}
                        className="w-full flex items-center justify-between px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <span className={bancoSeleccionado ? 'text-[#212529]' : 'text-[#6a6c6b]'}>
                            {bancoSeleccionado ? bancoSeleccionado.nombreCorto : 'Seleccionar banco...'}
                        </span>
                        <FiChevronDown className={`w-4 h-4 text-[#6a6c6b] transition-transform ${showBankDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown de bancos */}
                    {showBankDropdown && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-[#e9ecef] rounded-xl shadow-xl max-h-64 overflow-hidden animate-fadeIn">
                            {/* Buscador */}
                            <div className="p-2 border-b border-[#e9ecef]">
                                <input
                                    type="text"
                                    value={bankSearchTerm}
                                    onChange={(e) => setBankSearchTerm(e.target.value)}
                                    placeholder="Buscar banco..."
                                    className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2a63cd]"
                                    autoFocus
                                />
                            </div>
                            {/* Lista de bancos */}
                            <div className="max-h-48 overflow-y-auto">
                                {filteredBancos.length > 0 ? (
                                    filteredBancos.map(banco => (
                                        <button
                                            key={banco.codigo}
                                            type="button"
                                            onClick={() => handleSelectBanco(banco)}
                                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${formData.bancoOrigen === banco.codigo ? 'bg-blue-50 text-[#2a63cd]' : 'text-[#212529]'
                                                }`}
                                        >
                                            <span>{banco.nombre}</span>
                                            <span className="text-xs text-[#6a6c6b]">{banco.codigo}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-[#6a6c6b] text-center">
                                        No se encontraron bancos
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Monto a verificar - Bs como protagonista */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-[#6a6c6b] uppercase tracking-wider">Monto a pagar:</span>
                            <p className="text-[10px] text-orange-600 mt-0.5">Tasa BCV oficial</p>
                        </div>
                        <div className="text-right">
                            {montoEnBs ? (
                                <>
                                    <span className="text-2xl font-black text-orange-600">Bs. {montoEnBs.toFixed(2)}</span>
                                    <p className="text-xs text-[#6a6c6b]">(${montoEsperado.toFixed(2)} USD)</p>
                                </>
                            ) : (
                                <span className="text-xl font-black text-[#2a63cd]">${montoEsperado.toFixed(2)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Resultado de la verificación - Compacto y centrado */}
            {resultado && (
                <div
                    className={`rounded-xl p-4 border animate-fadeIn text-center ${verificationState === 'success'
                        ? 'bg-green-50 border-green-200'
                        : verificationState === 'duplicate'
                            ? 'bg-orange-50 border-orange-300'
                            : 'bg-red-50 border-red-200'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${verificationState === 'success'
                                ? 'bg-green-500'
                                : verificationState === 'duplicate'
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                                }`}
                        >
                            {verificationState === 'success' ? (
                                <FiCheck className="w-3.5 h-3.5 text-white" />
                            ) : (
                                <FiAlertCircle className="w-3.5 h-3.5 text-white" />
                            )}
                        </div>
                        <span
                            className={`font-bold text-sm ${verificationState === 'success'
                                ? 'text-green-700'
                                : verificationState === 'duplicate'
                                    ? 'text-orange-700'
                                    : 'text-red-700'
                                }`}
                        >
                            {verificationState === 'success'
                                ? resultado.autoApproved
                                    ? '🎉 Pago Verificado y Saldo Acreditado'
                                    : 'Pago Verificado'
                                : verificationState === 'duplicate'
                                    ? '⚠️ Referencia Ya Utilizada'
                                    : 'Pago No Verificado'}
                        </span>
                    </div>
                    <p
                        className={`text-xs ${verificationState === 'success'
                            ? 'text-green-600'
                            : verificationState === 'duplicate'
                                ? 'text-orange-600'
                                : 'text-red-600'
                            }`}
                    >
                        {resultado.message}
                    </p>
                    {resultado.requiresContact && verificationState !== 'success' && (
                        <button
                            onClick={handleContactRedirect}
                            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${verificationState === 'duplicate'
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                        >
                            <FiMessageCircle className="w-3.5 h-3.5" />
                            Contactar Soporte
                        </button>
                    )}
                </div>
            )}

            {/* Botón de verificar */}
            <button
                type="button"
                onClick={handleVerificar}
                disabled={!canSubmit || verificationState === 'success'}
                className={`w-full py-3.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${verificationState === 'success'
                    ? 'bg-green-500 text-white cursor-default'
                    : verificationState === 'verifying'
                        ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white cursor-wait'
                        : 'bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                    }`}
            >
                {getButtonContent()}
            </button>
        </div>
    );
}
