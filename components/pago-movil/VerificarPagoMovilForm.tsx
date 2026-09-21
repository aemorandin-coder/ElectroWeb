'use client';
import { formatUSD, formatVES } from '@/lib/currency';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiPhone, FiHash, FiCalendar, FiCheck, FiAlertCircle, FiLoader, FiChevronDown, FiMessageCircle, FiUser } from 'react-icons/fi';
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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
[ Solicitud de Soporte - Verificación de Pago Móvil ]

DATOS DEL PAGO:
• Cédula: ${formData.cedulaPagador}
• Teléfono: ${formData.telefonoPagador}
• Banco: ${banco?.nombre || formData.bancoOrigen}
• Referencia: ${formData.referencia}
• Fecha: ${formData.fechaPago}
• Monto USD: ${formatUSD(montoEsperado)}
${montoEnBs ? `• Monto Bs: ${formatVES(montoEnBs)}` : ''}

ERROR ENCONTRADO:
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

    const validateFields = (): boolean => {
        const errors: Record<string, string> = {};
        const cedulaRegex = /^[VvEe]?\d{6,9}$/;
        const cedulaLimpia = formData.cedulaPagador.trim().replace(/[.-]/g, '');
        if (!cedulaLimpia || !cedulaRegex.test(cedulaLimpia))
            errors.cedulaPagador = 'Formato requerido: V12345678 o E12345678';
        if (!formData.telefonoPagador.match(/^04[0-9]{9}$/))
            errors.telefonoPagador = 'Formato: 04121234567 (11 dígitos)';
        if (!formData.bancoOrigen)
            errors.bancoOrigen = 'Debes seleccionar tu banco';
        if (!formData.referencia.match(/^\d{4,8}$/))
            errors.referencia = 'Entre 4 y 8 dígitos numéricos';
        if (!formData.fechaPago)
            errors.fechaPago = 'Selecciona la fecha del pago';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleVerificar = async () => {
        // Validación visual inline antes de enviar
        if (!validateFields()) {
            onError?.('Por favor corrige los errores en el formulario.');
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
                    onError?.('Esta referencia de pago ya fue utilizada anteriormente. Por seguridad, esta acción ha sido registrada.');
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
        } catch {
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
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Fecha del Pago <span className="text-deal">*</span>
                    </label>
                    <div className="form-field">
                        <FiCalendar className="field-icon text-muted" />
                        <input
                            type="date"
                            name="fechaPago"
                            value={formData.fechaPago}
                            onChange={handleChange}
                            max={new Date().toISOString().split('T')[0]}
                            disabled={disabled || verificationState === 'verifying'}
                            className={`w-full pr-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm disabled:bg-surface disabled:cursor-not-allowed ${
                                fieldErrors.fechaPago ? 'border-deal/40 bg-deal-bg' : 'border-line'
                            }`}
                        />
                    </div>
                    {fieldErrors.fechaPago && (
                        <p className="text-deal text-xs mt-1 flex items-center gap-1">
                            <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors.fechaPago}
                        </p>
                    )}
                </div>

                {/* Referencia */}
                <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Nº de Referencia <span className="text-deal">*</span>
                    </label>
                    <div className="form-field">
                        <FiHash className="field-icon text-muted" />
                        <input
                            type="text"
                            name="referencia"
                            value={formData.referencia}
                            onChange={handleChange}
                            placeholder="Ej: 12345678"
                            maxLength={8}
                            inputMode="numeric"
                            disabled={disabled || verificationState === 'verifying'}
                            className={`w-full pr-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm disabled:bg-surface disabled:cursor-not-allowed ${
                                fieldErrors.referencia ? 'border-deal/40 bg-deal-bg' : 'border-line'
                            }`}
                        />
                    </div>
                    {fieldErrors.referencia ? (
                        <p className="text-deal text-xs mt-1 flex items-center gap-1">
                            <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors.referencia}
                        </p>
                    ) : (
                        <p className="text-xs text-muted mt-1">4 a 8 dígitos numéricos</p>
                    )}
                </div>
            </div>

            {/* Grid de 2 columnas para campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cédula del pagador */}
                <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Cédula del Titular <span className="text-deal">*</span>
                    </label>
                    <div className="form-field">
                        <FiUser className="field-icon text-muted" />
                        <input
                            type="text"
                            name="cedulaPagador"
                            value={formData.cedulaPagador}
                            onChange={handleChange}
                            placeholder="V12345678"
                            maxLength={12}
                            autoCapitalize="characters"
                            disabled={disabled || verificationState === 'verifying'}
                            className={`w-full pr-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm disabled:bg-surface disabled:cursor-not-allowed ${
                                fieldErrors.cedulaPagador ? 'border-deal/40 bg-deal-bg' : 'border-line'
                            }`}
                        />
                    </div>
                    {fieldErrors.cedulaPagador ? (
                        <p className="text-deal text-xs mt-1 flex items-center gap-1">
                            <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors.cedulaPagador}
                        </p>
                    ) : (
                        <p className="text-xs text-muted mt-1">Ej: V12345678 o E12345678</p>
                    )}
                </div>

                {/* Teléfono del pagador */}
                <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Teléfono del Pago <span className="text-deal">*</span>
                    </label>
                    <div className="form-field">
                        <FiPhone className="field-icon text-muted" />
                        <input
                            type="tel"
                            name="telefonoPagador"
                            value={formData.telefonoPagador}
                            onChange={handleChange}
                            placeholder="04121234567"
                            inputMode="tel"
                            maxLength={11}
                            disabled={disabled || verificationState === 'verifying'}
                            className={`w-full pr-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm disabled:bg-surface disabled:cursor-not-allowed ${
                                fieldErrors.telefonoPagador ? 'border-deal/40 bg-deal-bg' : 'border-line'
                            }`}
                        />
                    </div>
                    {fieldErrors.telefonoPagador ? (
                        <p className="text-deal text-xs mt-1 flex items-center gap-1">
                            <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors.telefonoPagador}
                        </p>
                    ) : (
                        <p className="text-xs text-muted mt-1">Teléfono desde donde pagaste</p>
                    )}
                </div>

                {/* Banco origen - Dropdown mejorado */}
                <div className="relative">
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Banco de Origen <span className="text-deal">*</span>
                    </label>
                    {fieldErrors.bancoOrigen && (
                        <p className="text-deal text-xs mb-1 flex items-center gap-1">
                            <FiAlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors.bancoOrigen}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => !disabled && verificationState !== 'verifying' && setShowBankDropdown(!showBankDropdown)}
                        disabled={disabled || verificationState === 'verifying'}
                        className="w-full flex items-center justify-between px-4 py-2.5 border-2 border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm bg-white disabled:bg-surface disabled:cursor-not-allowed"
                    >
                        <span className={bancoSeleccionado ? 'text-ink' : 'text-muted'}>
                            {bancoSeleccionado ? bancoSeleccionado.nombreCorto : 'Seleccionar banco...'}
                        </span>
                        <FiChevronDown className={`w-4 h-4 text-muted transition-transform ${showBankDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown de bancos */}
                    {showBankDropdown && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-line rounded-xl shadow-xl max-h-64 overflow-hidden animate-fadeIn">
                            {/* Buscador */}
                            <div className="p-2 border-b border-line">
                                <input
                                    type="text"
                                    value={bankSearchTerm}
                                    onChange={(e) => setBankSearchTerm(e.target.value)}
                                    placeholder="Buscar banco..."
                                    className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-brand-500/5 transition-colors flex items-center justify-between ${formData.bancoOrigen === banco.codigo ? 'bg-brand-500/10 text-brand-600' : 'text-ink'
                                                }`}
                                        >
                                            <span>{banco.nombre}</span>
                                            <span className="text-xs text-muted">{banco.codigo}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-muted text-center">
                                        No se encontraron bancos
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Monto a verificar - Bs como protagonista */}
                <div className="bg-warning/10 rounded-xl p-4 border border-warning/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Monto a pagar:</span>
                            <p className="text-xs text-warning-strong mt-0.5">Tasa BCV oficial</p>
                        </div>
                        <div className="text-right">
                            {montoEnBs ? (
                                <>
                                    <span className="text-2xl font-bold text-warning-strong">{formatVES(montoEnBs)}</span>
                                    <p className="text-xs text-muted">({formatUSD(montoEsperado)})</p>
                                </>
                            ) : (
                                <span className="text-xl font-bold text-brand-500">{formatUSD(montoEsperado)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Resultado de la verificación - Compacto y centrado */}
            {resultado && (
                <div
                    className={`rounded-xl p-4 border animate-fadeIn text-center ${verificationState === 'success'
                        ? 'bg-success/5 border-success/30'
                        : verificationState === 'duplicate'
                            ? 'bg-warning/10 border-warning/30'
                            : 'bg-deal-bg border-deal/30'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${verificationState === 'success'
                                ? 'bg-success-strong'
                                : verificationState === 'duplicate'
                                    ? 'bg-warning'
                                    : 'bg-deal-bg0'
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
                                ? 'text-success-strong'
                                : verificationState === 'duplicate'
                                    ? 'text-warning-strong'
                                    : 'text-deal'
                                }`}
                        >
                            {verificationState === 'success'
                                ? resultado.autoApproved
                                    ? 'Pago Verificado y Saldo Acreditado'
                                    : 'Pago Verificado'
                                : verificationState === 'duplicate'
                                    ? 'Referencia Ya Utilizada'
                                    : 'Pago No Verificado'}
                        </span>
                    </div>
                    <p
                        className={`text-xs ${verificationState === 'success'
                            ? 'text-success-strong'
                            : verificationState === 'duplicate'
                                ? 'text-warning-strong'
                                : 'text-deal'
                            }`}
                    >
                        {resultado.message}
                    </p>
                    {resultado.requiresContact && verificationState !== 'success' && (
                        <button
                            onClick={handleContactRedirect}
                            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${verificationState === 'duplicate'
                                ? 'bg-warning/20 text-warning-strong hover:bg-warning/30'
                                : 'bg-deal-bg text-deal hover:bg-deal/20'
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
                    ? 'bg-success-strong text-white cursor-default'
                    : verificationState === 'verifying'
                        ? 'bg-brand-500 text-white cursor-wait'
                        : 'bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
            >
                {getButtonContent()}
            </button>
        </div>
    );
}
