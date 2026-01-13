'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';

interface ValidationErrors {
    name?: string;
    email?: string;
    phone?: string;
    subject?: string;
    message?: string;
}

export default function ContactForm() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
    });
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<any>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [hasPrefilledData, setHasPrefilledData] = useState(false);

    // Precargar datos desde URL params (ej: mensaje de soporte de pago móvil)
    useEffect(() => {
        const nombre = searchParams.get('nombre');
        const email = searchParams.get('email');
        const asunto = searchParams.get('asunto');
        const mensaje = searchParams.get('mensaje');

        if (nombre || email || asunto || mensaje) {
            setFormData(prev => ({
                ...prev,
                name: nombre || prev.name,
                email: email || prev.email,
                subject: asunto || prev.subject,
                message: mensaje || prev.message,
            }));
            setHasPrefilledData(true);
        }
    }, [searchParams]);

    // AutoFocus on mount (en el campo apropiado si hay datos precargados)
    useEffect(() => {
        if (hasPrefilledData) {
            // Si hay datos precargados, enfocar en nombre si está vacío
            if (!formData.name) {
                nameInputRef.current?.focus();
            }
        } else {
            nameInputRef.current?.focus();
        }
    }, [hasPrefilledData]);

    const validateField = (fieldName: string, value: string): string => {
        switch (fieldName) {
            case 'name':
                if (!value || value.trim() === '') return 'Por favor, ingresa tu nombre';
                if (value.length < 2) return 'El nombre debe tener al menos 2 caracteres';
                // Only allow letters, spaces, accents, and ONE comma
                const commaCount = (value.match(/,/g) || []).length;
                if (commaCount > 1) return 'Solo se permite una coma para separar apellidos';
                const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,]+$/;
                if (!nameRegex.test(value)) return 'Solo se permiten letras, espacios y una coma';
                return '';

            case 'email':
                if (!value || value.trim() === '') return 'Por favor, ingresa tu email';
                const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
                if (!emailRegex.test(value)) return 'Ingresa un email válido';
                return '';

            case 'phone':
                if (!value || value.trim() === '') return 'Por favor, ingresa tu teléfono';
                if (value.length < 7) return 'Ingresa un número válido (mín. 7 dígitos)';
                if (value.length > 11) return 'Máximo 11 dígitos';
                return '';

            case 'subject':
                if (!value || value === '') return 'Por favor, selecciona un asunto';
                return '';

            case 'message':
                if (!value || value.trim() === '') return 'Por favor, escribe tu mensaje';
                if (value.length < 10) return 'El mensaje debe tener al menos 10 caracteres';
                return '';

            default:
                return '';
        }
    };

    const handleBlur = (fieldName: string, value: string) => {
        setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
        const error = validateField(fieldName, value);
        setValidationErrors(prev => ({ ...prev, [fieldName]: error }));
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        // Validation rules for specific fields
        if (name === 'name') {
            // Only allow letters, spaces, accents, and comma
            const commaCount = (value.match(/,/g) || []).length;
            if (commaCount > 1) return; // Block more than 1 comma
            const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,]*$/;
            if (!nameRegex.test(value)) return;
        }

        if (name === 'phone') {
            // Only allow numbers, max 11 digits
            const numbersOnly = value.replace(/[^0-9]/g, '');
            if (numbersOnly.length > 11) return;
            setFormData(prev => ({ ...prev, [name]: numbersOnly }));

            if (touchedFields[name]) {
                const error = validateField(name, numbersOnly);
                setValidationErrors(prev => ({ ...prev, [name]: error }));
            }
            setError('');
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        if (touchedFields[name]) {
            const error = validateField(name, value);
            setValidationErrors(prev => ({ ...prev, [name]: error }));
        }
        setError('');
    };

    const handleCaptchaVerify = (token: string) => {
        setCaptchaToken(token);
    };

    const handleCaptchaExpire = () => {
        setCaptchaToken(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check CAPTCHA first
        if (!captchaToken) {
            setError('Por favor, completa la verificación de seguridad.');
            return;
        }

        // Validate all fields
        const errors: ValidationErrors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key as keyof typeof formData]);
            if (error) errors[key as keyof ValidationErrors] = error;
        });

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setTouchedFields({ name: true, email: true, phone: true, subject: true, message: true });
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    captchaToken
                }),
            });

            if (response.ok) {
                setSuccess(true);
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    subject: '',
                    message: '',
                });
                setTouchedFields({});
                setValidationErrors({});
                setCaptchaToken(null);
            } else {
                const data = await response.json();
                setError(data.error || 'Error al enviar el mensaje');
                captchaRef.current?.resetCaptcha();
                setCaptchaToken(null);
            }
        } catch (err) {
            setError('Error al enviar el mensaje. Por favor intenta nuevamente.');
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-2xl shadow-2xl p-10 text-center animate-fadeIn relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl"></div>

                <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-3">¡Mensaje Enviado!</h3>
                    <p className="text-blue-200/80 mb-8 text-lg">
                        Hemos recibido tu mensaje y te responderemos pronto.
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="px-8 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-[#2a63cd]/30 hover:scale-105 transition-all duration-300"
                    >
                        Enviar Otro Mensaje
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-2xl shadow-2xl p-4 md:p-8 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl"></div>

            <div className="relative">
                <h2 className="text-xl md:text-3xl font-black text-white mb-2">
                    Envíanos un Mensaje
                </h2>
                <p className="text-blue-200/70 mb-4 md:mb-6 text-xs md:text-base">
                    Completa el formulario y nos pondremos en contacto contigo lo antes posible
                </p>

                <form onSubmit={handleSubmit} className="space-y-2 md:space-y-5">
                    {/* Banner para datos precargados (desde soporte de pago móvil) */}
                    {hasPrefilledData && (
                        <div className="p-4 bg-orange-500/20 border border-orange-400/50 rounded-xl animate-fadeIn">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-orange-200 font-semibold text-sm">Solicitud de Soporte</p>
                                    <p className="text-orange-200/80 text-xs mt-1">
                                        Los datos de tu pago han sido precargados. Por favor completa tu nombre y email para que podamos ayudarte.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-shake">
                            <div className="flex items-center gap-2 text-red-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-semibold">{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Name Field */}
                    <div className="space-y-1 md:space-y-1.5">
                        <div className="flex items-center gap-2">
                            <label htmlFor="name" className="block text-[10px] md:text-xs font-bold text-blue-100 uppercase tracking-wider">
                                Nombre Completo
                            </label>
                            <span className="text-[9px] md:text-[10px] text-blue-200/60 hidden md:inline">(Solo letras y una coma)</span>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors duration-200">
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <input
                                ref={nameInputRef}
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                onBlur={() => handleBlur('name', formData.name)}
                                className={`w-full pl-12 pr-12 md:pl-11 md:pr-11 py-2 md:py-3 bg-white/10 border ${touchedFields.name && validationErrors.name
                                    ? 'border-red-500/50 focus:border-red-500'
                                    : 'border-white/20 focus:border-white/40'
                                    } rounded-xl text-white text-xs md:text-base placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:ring-1 focus:ring-white/40 transition-all duration-200 text-center`}
                                placeholder="Tu nombre completo"
                            />
                            {touchedFields.name && validationErrors.name && (
                                <p className="absolute -bottom-4 md:-bottom-5 left-0 text-[10px] md:text-xs text-red-400 font-medium">{validationErrors.name}</p>
                            )}
                        </div>
                    </div>

                    {/* Email & Phone Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-5">
                        {/* Email Field */}
                        <div className="space-y-1 md:space-y-1.5">
                            <label htmlFor="email" className="block text-[10px] md:text-xs font-bold text-blue-100 uppercase tracking-wider">
                                Email
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors duration-200">
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('email', formData.email)}
                                    className={`w-full pl-12 pr-12 md:pl-11 md:pr-11 py-2 md:py-3 bg-white/10 border ${touchedFields.email && validationErrors.email
                                        ? 'border-red-500/50 focus:border-red-500'
                                        : 'border-white/20 focus:border-white/40'
                                        } rounded-xl text-white text-xs md:text-base placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:ring-1 focus:ring-white/40 transition-all duration-200 text-center`}
                                    placeholder="tu@email.com"
                                />
                                {touchedFields.email && validationErrors.email && (
                                    <p className="absolute -bottom-4 md:-bottom-5 left-0 text-[10px] md:text-xs text-red-400 font-medium">{validationErrors.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Phone Field */}
                        <div className="space-y-1 md:space-y-1.5">
                            <div className="flex items-center gap-1">
                                <label htmlFor="phone" className="block text-[10px] md:text-xs font-bold text-blue-100 uppercase tracking-wider">
                                    Teléfono
                                </label>
                            </div>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors duration-200">
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={11}
                                    value={formData.phone}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('phone', formData.phone)}
                                    className={`w-full pl-12 pr-12 md:pl-11 md:pr-11 py-2 md:py-3 bg-white/10 border ${touchedFields.phone && validationErrors.phone
                                        ? 'border-red-500/50 focus:border-red-500'
                                        : 'border-white/20 focus:border-white/40'
                                        } rounded-xl text-white text-xs md:text-base placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:ring-1 focus:ring-white/40 transition-all duration-200 text-center`}
                                    placeholder="0412..."
                                />
                                {touchedFields.phone && validationErrors.phone && (
                                    <p className="absolute -bottom-4 md:-bottom-5 left-0 text-[10px] md:text-xs text-red-400 font-medium">{validationErrors.phone}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subject Field */}
                    <div className="space-y-1 md:space-y-1.5 pt-1 md:pt-2">
                        <label htmlFor="subject" className="block text-[10px] md:text-xs font-bold text-blue-100 uppercase tracking-wider">
                            Asunto
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors duration-200">
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <select
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                onBlur={() => handleBlur('subject', formData.subject)}
                                className={`w-full pl-12 pr-12 md:pl-11 md:pr-11 py-2 md:py-3 bg-white/10 border ${touchedFields.subject && validationErrors.subject
                                    ? 'border-red-500/50 focus:border-red-500'
                                    : 'border-white/20 focus:border-white/40'
                                    } rounded-xl text-white text-xs md:text-base focus:outline-none focus:bg-white/20 focus:ring-1 focus:ring-white/40 transition-all duration-200 appearance-none cursor-pointer text-center`}
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="" className="bg-slate-800 text-white">Selecciona...</option>
                                <option value="consulta" className="bg-slate-800 text-white">Consulta General</option>
                                <option value="producto" className="bg-slate-800 text-white">Información de Producto</option>
                                <option value="orden" className="bg-slate-800 text-white">Estado de Orden</option>
                                <option value="soporte" className="bg-slate-800 text-white">Soporte Técnico</option>
                                <option value="otro" className="bg-slate-800 text-white">Otro</option>
                            </select>
                            {/* Dropdown arrow */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200/50 pointer-events-none">
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            {touchedFields.subject && validationErrors.subject && (
                                <p className="absolute -bottom-4 md:-bottom-5 left-0 text-[10px] md:text-xs text-red-400 font-medium">{validationErrors.subject}</p>
                            )}
                        </div>
                    </div>

                    {/* Message Field */}
                    <div className="space-y-1 md:space-y-1.5 pt-1 md:pt-2">
                        <label htmlFor="message" className="block text-[10px] md:text-xs font-bold text-blue-100 uppercase tracking-wider">
                            Mensaje
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-3 text-blue-200/50 group-focus-within:text-white transition-colors duration-200">
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                onBlur={() => handleBlur('message', formData.message)}
                                rows={3}
                                className={`w-full pl-12 pr-12 md:pl-11 md:pr-11 py-2 md:py-3 bg-white/10 border ${touchedFields.message && validationErrors.message
                                    ? 'border-red-500/50 focus:border-red-500'
                                    : 'border-white/20 focus:border-white/40'
                                    } rounded-xl text-white text-xs md:text-base placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:ring-1 focus:ring-white/40 resize-none transition-all duration-200 md:h-auto text-center`}
                                placeholder="Escribe tu mensaje..."
                            />
                            {touchedFields.message && validationErrors.message && (
                                <p className="absolute -bottom-5 left-0 text-[10px] md:text-xs text-red-400 font-medium">{validationErrors.message}</p>
                            )}
                        </div>
                    </div>

                    {/* hCaptcha */}
                    <div className="flex justify-center pt-1 md:pt-2">
                        <div className="bg-white/5 p-2 md:p-3 rounded-xl border border-white/10 transform scale-90 md:scale-100 origin-center">
                            <HCaptchaWrapper
                                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                                onVerify={handleCaptchaVerify}
                                onExpire={handleCaptchaExpire}
                                ref={captchaRef}
                                theme="dark"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !captchaToken}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#2a63cd] font-bold rounded-xl hover:bg-white/90 hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Enviando mensaje...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Enviar Mensaje
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
