'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiPhone, FiHash, FiCalendar, FiCheck, FiAlertCircle, FiLoader, FiChevronDown, FiCreditCard, FiUpload, FiImage, FiX, FiShield } from 'react-icons/fi';
import { HiOutlineQrcode } from 'react-icons/hi';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { BANCOS_VENEZUELA, type BancoVenezuela } from '@/lib/pago-movil/bancos-venezuela';
import { adminModalOverlay, adminModalPanel, adminModalHeader, adminModalTitle, adminModalBody } from '@/lib/admin-ui';

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
        cedulaPagador: string; // Agregado para trazabilidad
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
        cedulaPagador: '', // Requerido para validación de seguridad
    });

    const [verificando, setVerificando] = useState(false);
    const [resultado, setResultado] = useState<VerificacionResult | null>(null);
    const [showBankDropdown, setShowBankDropdown] = useState(false);
    const [filteredBancos, setFilteredBancos] = useState<BancoVenezuela[]>(BANCOS_VENEZUELA);
    const [bankSearchTerm, setBankSearchTerm] = useState('');

    // Image upload state
    const [comprobante, setComprobante] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // For portal
    useEffect(() => {
        setMounted(true);
    }, []);

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
            toast.error('Solo se permiten archivos de imagen');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no puede superar 5MB');
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
                toast.error('Error al cargar la imagen');
                setUploadingImage(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Error al subir la imagen');
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
        // Validaciones básicas - mismas que en VerificarPagoMovilForm
        if (!formData.cedulaPagador) {
            setResultado({ success: false, verified: false, message: 'Ingresa la cédula del titular de la cuenta' });
            return;
        }

        // Validar formato de cédula
        const cedulaRegex = /^[VvEe]?\d{6,9}$/;
        const cedulaLimpia = formData.cedulaPagador.trim().replace(/[.-]/g, '');
        if (!cedulaRegex.test(cedulaLimpia)) {
            setResultado({ success: false, verified: false, message: 'Formato de cédula inválido. Ejemplo: V12345678' });
            return;
        }

        if (!formData.telefonoPagador) {
            setResultado({ success: false, verified: false, message: 'Ingresa el teléfono desde donde realizaste el pago' });
            return;
        }
        if (!formData.bancoOrigen) {
            setResultado({ success: false, verified: false, message: 'Selecciona el banco desde donde realizaste el pago' });
            return;
        }
        if (!formData.referencia) {
            setResultado({ success: false, verified: false, message: 'Ingresa el número de referencia del pago' });
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
                    reqCed: true, // Validar cédula para mayor seguridad
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
                    cedulaPagador: formData.cedulaPagador, // Agregado para trazabilidad
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
            cedulaPagador: '',
        });
        setResultado(null);
        setComprobante(null);
        onReset?.();
    };

    const canSubmit =
        !verificando &&
        formData.cedulaPagador &&
        formData.telefonoPagador &&
        formData.bancoOrigen &&
        formData.referencia &&
        formData.fechaPago;

    // Si ya está verificado, mostrar estado de éxito
    if (isVerified) {
        return (
            <div className={`${className}`}>
                <div className="bg-success/5 border border-success/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success-strong rounded-full flex items-center justify-center flex-shrink-0 text-white">
                            <FiCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-success-strong">Pago Móvil Verificado</h4>
                            <p className="text-sm text-ink">
                                Ref: {formData.referencia} - Banco: {bancoSeleccionado?.nombreCorto || formData.bancoOrigen}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-brand-600 hover:text-brand-700 text-sm font-semibold underline"
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
            {/* Header con icono - CENTRADO */}
            <div className="flex flex-col items-center text-center gap-2 mb-4">
                <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-600">
                    <FiShield className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-ink">Verificación de Pago Móvil</h3>
                    <p className="text-xs text-muted">Completa los datos para validar tu pago</p>
                </div>
            </div>

            {/* Datos del comercio */}
            <div className="relative overflow-hidden bg-surface border border-line rounded-2xl p-5">
                {/* Content */}
                <div>
                    {/* Title */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-success rounded-full" />
                        <span className="text-xs font-bold text-muted uppercase tracking-widest">Datos para transferir</span>
                    </div>

                    {/* Grid of payment details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {/* Teléfono */}
                        <div className="bg-white rounded-xl p-3 border border-line text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <FiPhone className="w-3.5 h-3.5 text-brand-600" />
                                <span className="text-xs font-semibold text-muted uppercase">Teléfono</span>
                            </div>
                            <p className="text-base font-bold text-ink tracking-wide">{datosComercio.telefono || '-'}</p>
                        </div>

                        {/* Cédula/RIF */}
                        <div className="bg-white rounded-xl p-3 border border-line text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <FiCreditCard className="w-3.5 h-3.5 text-brand-600" />
                                <span className="text-xs font-semibold text-muted uppercase">CI/RIF</span>
                            </div>
                            <p className="text-base font-bold text-ink tracking-wide">{datosComercio.cedula || '-'}</p>
                        </div>

                        {/* Banco */}
                        <div className="bg-white rounded-xl p-3 border border-line text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="text-xs font-semibold text-muted uppercase">Banco</span>
                            </div>
                            <p className="text-sm font-bold text-ink leading-tight">{(datosComercio.banco || 'BDV').replace('Banco de ', '')}</p>
                        </div>

                        {/* QR Button */}
                        <button
                            type="button"
                            onClick={() => setShowQRModal(true)}
                            className="bg-white rounded-xl p-3 border border-line hover:bg-surface transition-colors group cursor-pointer text-center"
                        >
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <HiOutlineQrcode className="w-3.5 h-3.5 text-brand-600" />
                                <span className="text-xs font-semibold text-muted uppercase">Código QR</span>
                            </div>
                            <p className="text-sm font-bold text-brand-600 group-hover:text-brand-700 transition-colors flex items-center justify-center gap-1">
                                Ver QR
                                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </p>
                        </button>
                    </div>

                    {/* Monto destacado */}
                    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center">
                                    <span className="text-xl font-bold text-warning-strong">Bs</span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-warning-strong uppercase">Monto a transferir</p>
                                    <p className="text-2xl font-bold text-ink tracking-tight">{montoEnBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold text-muted uppercase">Equivalente</p>
                                <p className="text-lg font-bold text-ink">${montoEsperado.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Formulario de verificación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cédula del pagador */}
                <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Tu Cédula <span className="text-deal">*</span>
                    </label>
                    <div className="form-field">
                        <FiCreditCard className="field-icon text-muted" />
                        <input
                            type="text"
                            name="cedulaPagador"
                            value={formData.cedulaPagador}
                            onChange={handleChange}
                            placeholder="V12345678"
                            maxLength={10}
                            autoCapitalize="characters"
                            disabled={verificando}
                            className="w-full pr-4 py-2.5 border-2 border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                    <p className="text-xs text-muted mt-1">Cédula del titular de la cuenta</p>
                </div>

                {/* Teléfono del pagador */}
                <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Tu Teléfono <span className="text-deal">*</span>
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
                            disabled={verificando}
                            className="w-full pr-4 py-2.5 border-2 border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Banco origen */}
                <div className="relative">
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Tu Banco
                    </label>
                    <button
                        type="button"
                        onClick={() => !verificando && setShowBankDropdown(!showBankDropdown)}
                        disabled={verificando}
                        className="w-full flex items-center justify-between px-4 py-2.5 border-2 border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <span className={bancoSeleccionado ? 'text-ink' : 'text-muted'}>
                            {bancoSeleccionado ? bancoSeleccionado.nombreCorto : 'Selecciona...'}
                        </span>
                        <FiChevronDown className={`w-4 h-4 text-muted transition-transform ${showBankDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showBankDropdown && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-line rounded-xl shadow-xl max-h-64 overflow-hidden animate-fadeIn">
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
                                            <span>{banco.nombreCorto}</span>
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

                {/* Referencia */}
                <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Referencia
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
                            disabled={verificando}
                            className="w-full pr-4 py-2.5 border-2 border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                    <p className="text-xs text-muted mt-1">4 a 8 dígitos numéricos</p>
                </div>

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
                            disabled={verificando}
                            className="w-full pr-4 py-2.5 border-2 border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Subida de comprobante */}
                <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Comprobante (Opcional)
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
                            className="w-full py-2.5 px-4 border-2 border-dashed border-line rounded-xl hover:border-brand-500 hover:bg-brand-500/5/50 transition-all flex items-center justify-center gap-2 group"
                        >
                            {uploadingImage ? (
                                <FiLoader className="w-4 h-4 text-brand-500 animate-spin" />
                            ) : (
                                <>
                                    <FiUpload className="w-4 h-4 text-muted group-hover:text-brand-500" />
                                    <span className="text-sm text-muted group-hover:text-brand-500">
                                        Subir captura
                                    </span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="relative inline-flex items-center gap-2">
                            <Image
                                src={comprobante}
                                alt="Comprobante"
                                width={40}
                                height={40}
                                className="rounded-lg border border-success/30 object-cover"
                            />
                            <span className="text-xs text-success-strong font-medium">Subido</span>
                            <button
                                type="button"
                                onClick={removeImage}
                                className="w-5 h-5 bg-deal text-white rounded-full flex items-center justify-center hover:bg-deal/90 transition-colors shadow-md"
                            >
                                <FiX className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Resultado de la verificación */}
            {resultado && (
                <div
                    className={`rounded-2xl p-4 border-2 animate-fadeIn ${resultado.verified
                        ? 'bg-success/5 border-success/30'
                        : resultado.duplicateReference
                            ? 'bg-warning/10 border-warning/30'
                            : 'bg-deal-bg border-deal/30'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${resultado.verified
                                ? 'bg-success-strong'
                                : resultado.duplicateReference
                                    ? 'bg-warning'
                                    : 'bg-deal'
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
                                        ? 'text-success-strong'
                                        : resultado.duplicateReference
                                            ? 'text-warning-strong'
                                            : 'text-deal'
                                        }`}
                                >
                                    {resultado.verified
                                        ? 'Pago Verificado Exitosamente'
                                        : resultado.duplicateReference
                                            ? 'Referencia Ya Utilizada'
                                            : 'Verificación Fallida'}
                                </h4>
                                {resultado.code && !resultado.verified && (
                                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                                        Código: {resultado.code}
                                    </span>
                                )}
                            </div>
                            <p
                                className={`text-sm mt-1 leading-relaxed ${resultado.verified
                                    ? 'text-success-strong'
                                    : resultado.duplicateReference
                                        ? 'text-warning-strong'
                                        : 'text-deal'
                                    }`}
                            >
                                {resultado.message}
                            </p>
                            {!resultado.verified && !resultado.duplicateReference && (
                                <div className="mt-3 pt-3 border-t border-deal/30">
                                    <p className="text-xs text-deal/80 font-medium">
                                        Sugerencias:
                                    </p>
                                    <ul className="mt-1 text-xs text-deal/70 space-y-0.5">
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
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
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

            <p className="text-xs text-center text-muted">
                La verificacion se realiza en tiempo real. No podras continuar sin verificar el pago.
            </p>

            {/* QR Modal - Using Portal to render outside of parent constraints */}
            {showQRModal && mounted && createPortal(
                <div
                    className={adminModalOverlay}
                    onClick={() => setShowQRModal(false)}
                >
                    {/* Modal Content */}
                    <div
                        className={`${adminModalPanel} max-w-sm`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={adminModalHeader}>
                            <div className="flex items-center gap-2.5">
                                <HiOutlineQrcode className="w-5 h-5 text-brand-600" />
                                <div>
                                    <h3 className={adminModalTitle}>Código QR Pago Móvil</h3>
                                    <p className="text-xs text-muted">Escanea con tu banco para pagar</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowQRModal(false)}
                                className="p-1.5 text-muted hover:text-ink rounded-lg transition-colors"
                                aria-label="Cerrar modal"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* QR Image */}
                        <div className={`${adminModalBody} flex flex-col items-center text-center p-6`}>
                            <div className="bg-white p-4 rounded-xl border border-line shadow-sm mb-4">
                                <Image
                                    src="/images/qrbdv.png"
                                    alt="Código QR Pago Móvil BDV"
                                    width={280}
                                    height={280}
                                    className="rounded-lg"
                                />
                            </div>
                            <p className="text-xs text-muted text-center mb-3">
                                Escanea este código QR con tu app bancaria o VeQR para realizar el pago.
                            </p>
                            <div className="inline-flex items-center gap-1.5 text-xs text-brand-600 bg-brand-500/10 px-3 py-1.5 rounded-lg font-medium">
                                <FiShield className="w-3.5 h-3.5" />
                                <span>Pago seguro con Banco de Venezuela</span>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            </div>
    );
}
