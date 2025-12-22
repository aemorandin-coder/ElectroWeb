'use client';

import { useState, useEffect } from 'react';
import { FiPhone, FiHash, FiCalendar, FiDollarSign, FiCheck, FiAlertCircle, FiLoader, FiChevronDown, FiCreditCard } from 'react-icons/fi';
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
}

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
    const [formData, setFormData] = useState({
        telefonoPagador: initialData?.telefonoPagador || '',
        bancoOrigen: initialData?.bancoOrigen || '',
        referencia: initialData?.referencia || '',
        fechaPago: initialData?.fechaPago || new Date().toISOString().split('T')[0],
    });

    const [verificando, setVerificando] = useState(false);
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
        if (resultado) setResultado(null);
    };

    const handleSelectBanco = (banco: BancoVenezuela) => {
        setFormData(prev => ({ ...prev, bancoOrigen: banco.codigo }));
        setShowBankDropdown(false);
        setBankSearchTerm('');
        if (resultado) setResultado(null);
    };

    const handleVerificar = async () => {
        // Validaciones básicas
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

        setVerificando(true);
        setResultado(null);

        try {
            const response = await fetch('/api/pago-movil/verificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    importe: montoEsperado,
                    contexto,
                    transactionId,
                    orderId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setResultado({
                    success: false,
                    verified: false,
                    message: data.error || 'Error al verificar el pago',
                });
                onError?.(data.error || 'Error al verificar el pago');
                return;
            }

            setResultado(data);

            if (data.verified) {
                onSuccess?.(data);
            } else {
                onError?.(data.message);
            }
        } catch (error) {
            const message = 'Error de conexión. Por favor, intenta nuevamente.';
            setResultado({
                success: false,
                verified: false,
                message,
            });
            onError?.(message);
        } finally {
            setVerificando(false);
        }
    };

    const canSubmit =
        !disabled &&
        !verificando &&
        formData.telefonoPagador &&
        formData.bancoOrigen &&
        formData.referencia &&
        formData.fechaPago;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header con icono */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg">
                    <FiCreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-[#212529]">Verificar Pago Movil</h3>
                    <p className="text-xs text-[#6a6c6b]">Ingresa los datos de tu pago para verificarlo automaticamente</p>
                </div>
            </div>

            {/* Monto a verificar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6a6c6b]">Monto a verificar:</span>
                    <div className="text-right">
                        <span className="text-xl font-black text-[#2a63cd]">${montoEsperado.toFixed(2)}</span>
                        {montoEnBs && (
                            <p className="text-sm text-[#6a6c6b]">Bs. {montoEnBs.toFixed(2)}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Teléfono del pagador */}
            <div>
                <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                    Telefono desde donde pagaste
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
                        disabled={disabled || verificando}
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                </div>
            </div>

            {/* Banco origen - Dropdown mejorado */}
            <div className="relative">
                <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                    Banco desde donde pagaste
                </label>
                <button
                    type="button"
                    onClick={() => !disabled && !verificando && setShowBankDropdown(!showBankDropdown)}
                    disabled={disabled || verificando}
                    className="w-full flex items-center justify-between px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                    <span className={bancoSeleccionado ? 'text-[#212529]' : 'text-[#6a6c6b]'}>
                        {bancoSeleccionado ? bancoSeleccionado.nombre : 'Selecciona tu banco...'}
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

            {/* Referencia */}
            <div>
                <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                    Numero de Referencia
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
                        disabled={disabled || verificando}
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                </div>
                <p className="text-[10px] text-[#6a6c6b] mt-1">
                    Los ultimos 4 a 8 digitos de la confirmacion
                </p>
            </div>

            {/* Fecha del pago */}
            <div>
                <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                    Fecha del pago
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
                        disabled={disabled || verificando}
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                </div>
            </div>

            {/* Resultado de la verificación */}
            {resultado && (
                <div
                    className={`rounded-xl p-4 border animate-fadeIn ${resultado.verified
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${resultado.verified ? 'bg-green-500' : 'bg-red-500'
                                }`}
                        >
                            {resultado.verified ? (
                                <FiCheck className="w-4 h-4 text-white" />
                            ) : (
                                <FiAlertCircle className="w-4 h-4 text-white" />
                            )}
                        </div>
                        <div>
                            <h4
                                className={`font-bold text-sm ${resultado.verified ? 'text-green-700' : 'text-red-700'
                                    }`}
                            >
                                {resultado.verified
                                    ? resultado.autoApproved
                                        ? 'Pago Verificado y Aprobado Automaticamente'
                                        : 'Pago Verificado Exitosamente'
                                    : 'Pago No Verificado'}
                            </h4>
                            <p
                                className={`text-xs mt-1 ${resultado.verified ? 'text-green-600' : 'text-red-600'
                                    }`}
                            >
                                {resultado.message}
                            </p>
                            {resultado.verified && resultado.amount && (
                                <p className="text-xs mt-1 text-green-600 font-semibold">
                                    Monto verificado: ${resultado.amount}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Botón de verificar */}
            <button
                type="button"
                onClick={handleVerificar}
                disabled={!canSubmit}
                className="w-full py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
                {verificando ? (
                    <>
                        <FiLoader className="w-5 h-5 animate-spin" />
                        Verificando con Banco de Venezuela...
                    </>
                ) : (
                    <>
                        <FiCheck className="w-5 h-5" />
                        Verificar Pago
                    </>
                )}
            </button>

            {/* Nota informativa */}
            <p className="text-[10px] text-center text-[#6a6c6b]">
                La verificacion se realiza en tiempo real con el Banco de Venezuela
            </p>
        </div>
    );
}
