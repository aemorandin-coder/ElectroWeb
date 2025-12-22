'use client';

import { useState, useEffect, useRef } from 'react';
import { FiPhone, FiHash, FiCalendar, FiCheck, FiAlertCircle, FiLoader, FiChevronDown, FiCreditCard, FiUpload, FiImage, FiX, FiShield } from 'react-icons/fi';
import Image from 'next/image';
import { BANCOS_VENEZUELA, type BancoVenezuela } from '@/lib/pago-movil/bancos-venezuela';

interface CheckoutPagoMovilFormProps {
    /** Monto esperado del pago */
    montoEsperado: number;
    /** Monto en bolívares */
    montoEnBs: number;
    /** Datos del comercio para mostrar */
    datosComercio: {
        telefono?: string;
        cedula?: string;
        banco?: string;
        titular?: string;
    };
    /** Callback cuando la verificación es exitosa */
    onVerified: (data: {
        verified: boolean;
        referencia: string;
        telefonoPagador: string;
        bancoOrigen: string;
        fechaPago: string;
        comprobante?: string;
    }) => void;
    /** Callback para resetear verificación */
    onReset?: () => void;
    /** Estado de verificación actual */
    isVerified?: boolean;
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
    duplicateReference?: boolean;
}

export default function CheckoutPagoMovilForm({
    montoEsperado,
    montoEnBs,
    datosComercio,
    onVerified,
    onReset,
    isVerified = false,
    className = '',
}: CheckoutPagoMovilFormProps) {
    const [formData, setFormData] = useState({
        telefonoPagador: '',
        bancoOrigen: '',
        referencia: '',
        fechaPago: new Date().toISOString().split('T')[0],
    });

    const [verificando, setVerificando] = useState(false);
    const [resultado, setResultado] = useState<VerificacionResult | null>(null);
    const [showBankDropdown, setShowBankDropdown] = useState(false);
    const [filteredBancos, setFilteredBancos] = useState<BancoVenezuela[]>(BANCOS_VENEZUELA);
    const [bankSearchTerm, setBankSearchTerm] = useState('');

    // Image upload state
    const [comprobante, setComprobante] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten archivos de imagen');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no puede superar 5MB');
            return;
        }

        setUploadingImage(true);

        try {
            // Convert to base64 for preview and storage
            const reader = new FileReader();
            reader.onloadend = () => {
                setComprobante(reader.result as string);
                setUploadingImage(false);
            };
            reader.onerror = () => {
                alert('Error al cargar la imagen');
                setUploadingImage(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error al subir la imagen');
            setUploadingImage(false);
        }
    };

    const removeImage = () => {
        setComprobante(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleVerificar = async () => {
        // Validaciones básicas
        if (!formData.telefonoPagador) {
            setResultado({ success: false, verified: false, message: 'Ingresa el telefono desde donde realizaste el pago' });
            return;
        }
        if (!formData.bancoOrigen) {
            setResultado({ success: false, verified: false, message: 'Selecciona el banco desde donde realizaste el pago' });
            return;
        }
        if (!formData.referencia) {
            setResultado({ success: false, verified: false, message: 'Ingresa el numero de referencia del pago' });
            return;
        }
        if (!formData.fechaPago) {
            setResultado({ success: false, verified: false, message: 'Selecciona la fecha del pago' });
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
                    importe: montoEnBs, // Enviar monto en Bs para verificación
                    contexto: 'ORDER',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setResultado({
                    success: false,
                    verified: false,
                    message: data.error || data.message || 'Error al verificar el pago',
                    duplicateReference: data.duplicateReference,
                });
                return;
            }

            setResultado(data);

            if (data.verified) {
                onVerified({
                    verified: true,
                    referencia: formData.referencia,
                    telefonoPagador: formData.telefonoPagador,
                    bancoOrigen: formData.bancoOrigen,
                    fechaPago: formData.fechaPago,
                    comprobante: comprobante || undefined,
                });
            }
        } catch (error) {
            const message = 'Error de conexion. Por favor, intenta nuevamente.';
            setResultado({
                success: false,
                verified: false,
                message,
            });
        } finally {
            setVerificando(false);
        }
    };

    const handleReset = () => {
        setFormData({
            telefonoPagador: '',
            bancoOrigen: '',
            referencia: '',
            fechaPago: new Date().toISOString().split('T')[0],
        });
        setResultado(null);
        setComprobante(null);
        onReset?.();
    };

    const canSubmit =
        !verificando &&
        formData.telefonoPagador &&
        formData.bancoOrigen &&
        formData.referencia &&
        formData.fechaPago;

    // Si ya está verificado, mostrar estado de éxito
    if (isVerified) {
        return (
            <div className={`${className}`}>
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <FiCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-green-800">Pago Movil Verificado</h4>
                            <p className="text-sm text-green-700">
                                Ref: {formData.referencia} - Banco: {bancoSeleccionado?.nombreCorto || formData.bancoOrigen}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-green-600 hover:text-green-800 text-sm font-semibold underline"
                        >
                            Cambiar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header con icono */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <FiShield className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[#212529]">Verificacion de Pago Movil</h3>
                    <p className="text-xs text-[#6a6c6b]">Completa los datos para validar tu pago</p>
                </div>
            </div>

            {/* Datos del comercio - Premium Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a3b7e] via-[#2a63cd] to-[#1e4ba3] rounded-2xl p-5 shadow-xl shadow-blue-500/20">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
                </div>

                {/* Content */}
                <div className="relative">
                    {/* Title */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Datos para transferir</span>
                    </div>

                    {/* Grid of payment details */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {/* Teléfono */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <div className="flex items-center gap-2 mb-1">
                                <FiPhone className="w-3.5 h-3.5 text-blue-200" />
                                <span className="text-[10px] font-medium text-blue-200 uppercase">Teléfono</span>
                            </div>
                            <p className="text-base font-bold text-white tracking-wide">{datosComercio.telefono || '-'}</p>
                        </div>

                        {/* Cédula/RIF */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <div className="flex items-center gap-2 mb-1">
                                <FiCreditCard className="w-3.5 h-3.5 text-blue-200" />
                                <span className="text-[10px] font-medium text-blue-200 uppercase">CI/RIF</span>
                            </div>
                            <p className="text-base font-bold text-white tracking-wide">{datosComercio.cedula || '-'}</p>
                        </div>

                        {/* Banco */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <div className="flex items-center gap-2 mb-1">
                                <svg className="w-3.5 h-3.5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="text-[10px] font-medium text-blue-200 uppercase">Banco</span>
                            </div>
                            <p className="text-sm font-bold text-white leading-tight">{datosComercio.banco || 'BDV'}</p>
                        </div>
                    </div>

                    {/* Monto destacado */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 shadow-lg shadow-orange-500/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <span className="text-xl font-black text-white">Bs</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-orange-100 uppercase">Monto a transferir</p>
                                    <p className="text-2xl font-black text-white tracking-tight">{montoEnBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-medium text-orange-100 uppercase">Equivalente</p>
                                <p className="text-lg font-bold text-white">${montoEsperado.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Formulario de verificación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teléfono del pagador */}
                <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                        Tu Telefono
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
                            disabled={verificando}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Banco origen */}
                <div className="relative">
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                        Tu Banco
                    </label>
                    <button
                        type="button"
                        onClick={() => !verificando && setShowBankDropdown(!showBankDropdown)}
                        disabled={verificando}
                        className="w-full flex items-center justify-between px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <span className={bancoSeleccionado ? 'text-[#212529]' : 'text-[#6a6c6b]'}>
                            {bancoSeleccionado ? bancoSeleccionado.nombreCorto : 'Selecciona...'}
                        </span>
                        <FiChevronDown className={`w-4 h-4 text-[#6a6c6b] transition-transform ${showBankDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showBankDropdown && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-[#e9ecef] rounded-xl shadow-xl max-h-64 overflow-hidden animate-fadeIn">
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
                                            <span>{banco.nombreCorto}</span>
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
                        Referencia
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
                            disabled={verificando}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Fecha del pago */}
                <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                        Fecha del Pago
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
                            disabled={verificando}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd] transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            {/* Subida de comprobante */}
            <div>
                <label className="block text-xs font-bold text-[#212529] mb-1.5 uppercase tracking-wider">
                    Comprobante de Pago (Opcional)
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />

                {!comprobante ? (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="w-full p-4 border-2 border-dashed border-[#e9ecef] rounded-xl hover:border-[#2a63cd] hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                        {uploadingImage ? (
                            <FiLoader className="w-6 h-6 text-[#2a63cd] animate-spin" />
                        ) : (
                            <>
                                <div className="w-10 h-10 bg-[#f8f9fa] rounded-full flex items-center justify-center group-hover:bg-[#2a63cd] group-hover:text-white transition-colors">
                                    <FiUpload className="w-5 h-5" />
                                </div>
                                <span className="text-sm text-[#6a6c6b] group-hover:text-[#2a63cd]">
                                    Subir captura del pago
                                </span>
                            </>
                        )}
                    </button>
                ) : (
                    <div className="relative inline-block">
                        <Image
                            src={comprobante}
                            alt="Comprobante"
                            width={120}
                            height={120}
                            className="rounded-xl border-2 border-green-200 object-cover"
                        />
                        <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Resultado de la verificación */}
            {resultado && (
                <div
                    className={`rounded-2xl p-4 border-2 animate-fadeIn ${resultado.verified
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                        : resultado.duplicateReference
                            ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300'
                            : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${resultado.verified
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                : resultado.duplicateReference
                                    ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                                    : 'bg-gradient-to-br from-red-500 to-rose-600'
                                }`}
                        >
                            {resultado.verified ? (
                                <FiCheck className="w-5 h-5 text-white" />
                            ) : (
                                <FiAlertCircle className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h4
                                    className={`font-bold ${resultado.verified
                                        ? 'text-green-700'
                                        : resultado.duplicateReference
                                            ? 'text-orange-700'
                                            : 'text-red-700'
                                        }`}
                                >
                                    {resultado.verified
                                        ? 'Pago Verificado Exitosamente'
                                        : resultado.duplicateReference
                                            ? 'Referencia Ya Utilizada'
                                            : 'Verificación Fallida'}
                                </h4>
                                {resultado.code && !resultado.verified && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                                        Código: {resultado.code}
                                    </span>
                                )}
                            </div>
                            <p
                                className={`text-sm mt-1 leading-relaxed ${resultado.verified
                                    ? 'text-green-600'
                                    : resultado.duplicateReference
                                        ? 'text-orange-600'
                                        : 'text-red-600'
                                    }`}
                            >
                                {resultado.message}
                            </p>
                            {!resultado.verified && !resultado.duplicateReference && (
                                <div className="mt-3 pt-3 border-t border-red-200">
                                    <p className="text-xs text-red-500/80 font-medium">
                                        Sugerencias:
                                    </p>
                                    <ul className="mt-1 text-xs text-red-500/70 space-y-0.5">
                                        <li>• Verifica que la referencia sea exacta (revisa tu SMS o app bancaria)</li>
                                        <li>• Confirma que el monto transferido sea exactamente Bs. {montoEnBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
                                        <li>• Asegúrate de seleccionar el banco correcto</li>
                                    </ul>
                                </div>
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
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
                {verificando ? (
                    <>
                        <FiLoader className="w-5 h-5 animate-spin" />
                        Verificando con Banco de Venezuela...
                    </>
                ) : (
                    <>
                        <FiShield className="w-5 h-5" />
                        Verificar Pago
                    </>
                )}
            </button>

            <p className="text-[10px] text-center text-[#6a6c6b]">
                La verificacion se realiza en tiempo real. No podras continuar sin verificar el pago.
            </p>
        </div>
    );
}
