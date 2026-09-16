'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiSend } from 'react-icons/fi';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';
import { adminPrimaryButton, adminLabel } from '@/lib/admin-ui';

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
                const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-,.]+$/;
                if (!nameRegex.test(value)) return 'Solo se permiten letras y caracteres válidos';
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
            // Allow letters, spaces, accents, hyphens, apostrophes and commas
            const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-,.]*$/;
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
            <div className="rounded-2xl border border-line bg-white shadow-sm p-10 text-center relative overflow-hidden">
                <div className="relative">
                    <div className="w-20 h-20 bg-success-strong/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-success-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-ink mb-2">¡Mensaje Enviado!</h3>
                    <p className="text-muted mb-8 text-base">
                        Hemos recibido tu mensaje y te responderemos pronto.
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className={adminPrimaryButton}
                    >
                        Enviar Otro Mensaje
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-line bg-white shadow-sm p-5 md:p-6">
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-ink mb-1">
                    Envíanos un Mensaje
                </h2>
                <p className="text-muted mb-4 text-xs md:text-sm">
                    Completa el formulario y nos pondremos en contacto contigo lo antes posible
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Banner para datos precargados (desde soporte de pago móvil) */}
                    {hasPrefilledData && (
                        <div className="p-4 bg-warning/15 border border-warning/30 rounded-xl animate-fadeIn">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-warning-strong rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-warning-strong font-semibold text-sm">Solicitud de Soporte</p>
                                    <p className="text-ink-soft text-xs mt-1">
                                        Los datos de tu pago han sido precargados. Por favor completa tu nombre y email para que podamos ayudarte.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-deal-bg border border-deal/30 rounded-xl animate-shake">
                            <div className="flex items-center gap-2 text-deal">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-semibold">{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Name Field */}
                    <div>
                        <label htmlFor="name" className={adminLabel}>
                            Nombre Completo
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors duration-200">
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
                                className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${touchedFields.name && validationErrors.name
                                    ? 'border-deal'
                                    : 'border-line focus:border-brand-500'
                                }`}
                                placeholder="Tu nombre completo"
                            />
                        </div>
                        {touchedFields.name && validationErrors.name && (
                            <p className="mt-1 text-xs font-semibold text-deal">{validationErrors.name}</p>
                        )}
                    </div>

                    {/* Email & Phone Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className={adminLabel}>
                                Email
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors duration-200">
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
                                    className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${touchedFields.email && validationErrors.email
                                        ? 'border-deal'
                                        : 'border-line focus:border-brand-500'
                                    }`}
                                    placeholder="tu@email.com"
                                />
                            </div>
                            {touchedFields.email && validationErrors.email && (
                                <p className="mt-1 text-xs font-semibold text-deal">{validationErrors.email}</p>
                            )}
                        </div>

                        {/* Phone Field */}
                        <div>
                            <label htmlFor="phone" className={adminLabel}>
                                Teléfono
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors duration-200">
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
                                    className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${touchedFields.phone && validationErrors.phone
                                        ? 'border-deal'
                                        : 'border-line focus:border-brand-500'
                                    }`}
                                    placeholder="0412..."
                                />
                            </div>
                            {touchedFields.phone && validationErrors.phone && (
                                <p className="mt-1 text-xs font-semibold text-deal">{validationErrors.phone}</p>
                            )}
                        </div>
                    </div>

                    {/* Subject Field */}
                    <div>
                        <label htmlFor="subject" className={adminLabel}>
                            Asunto
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors duration-200">
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
                                className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer ${touchedFields.subject && validationErrors.subject
                                    ? 'border-deal'
                                    : 'border-line focus:border-brand-500'
                                }`}
                            >
                                <option value="">Selecciona...</option>
                                <option value="consulta">Consulta General</option>
                                <option value="producto">Información de Producto</option>
                                <option value="orden">Estado de Orden</option>
                                <option value="soporte">Soporte Técnico</option>
                                <option value="otro">Otro</option>
                            </select>
                            {/* Dropdown arrow */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        {touchedFields.subject && validationErrors.subject && (
                            <p className="mt-1 text-xs font-semibold text-deal">{validationErrors.subject}</p>
                        )}
                    </div>

                    {/* Message Field */}
                    <div>
                        <label htmlFor="message" className={adminLabel}>
                            Mensaje
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-3 text-muted group-focus-within:text-brand-600 transition-colors duration-200">
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
                                className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none transition-all ${touchedFields.message && validationErrors.message
                                    ? 'border-deal'
                                    : 'border-line focus:border-brand-500'
                                }`}
                                placeholder="Escribe tu mensaje..."
                            />
                        </div>
                        {touchedFields.message && validationErrors.message && (
                            <p className="mt-1 text-xs font-semibold text-deal">{validationErrors.message}</p>
                        )}
                    </div>

                    {/* hCaptcha */}
                    <div className="flex justify-center">
                        <div className="bg-surface p-2 md:p-3 rounded-xl border border-line transform scale-90 md:scale-100 origin-center">
                            <HCaptchaWrapper
                                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                                onVerify={handleCaptchaVerify}
                                onExpire={handleCaptchaExpire}
                                ref={captchaRef}
                                theme="light"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !captchaToken}
                        className={`${adminPrimaryButton} w-full`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Enviando mensaje...</span>
                            </>
                        ) : (
                            <>
                                <FiSend className="w-4 h-4" aria-hidden="true" />
                                <span>Enviar Mensaje</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
