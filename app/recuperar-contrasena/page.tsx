'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiMail, FiArrowLeft, FiCheck, FiShield } from 'react-icons/fi';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { adminPrimaryButton, adminLabel } from '@/lib/admin-ui';

export default function RecuperarContrasenaPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<any>(null);
    const { settings: publicSettings } = useSettings();
    const companySettings = publicSettings
      ? { companyName: publicSettings.companyName || 'Electro Shop Morandin', logo: publicSettings.logo ?? null }
      : null;

    const handleCaptchaVerify = (token: string) => {
        setCaptchaToken(token);
    };

    const handleCaptchaExpire = () => {
        setCaptchaToken(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!captchaToken) {
            setError('Por favor, completa la verificación de seguridad.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, captchaToken }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
            } else {
                setError(data.message || 'Error al enviar el correo de recuperación');
                captchaRef.current?.resetCaptcha();
                setCaptchaToken(null);
            }
        } catch (err) {
            setError('Error de conexión. Por favor intenta de nuevo.');
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
        } finally {
            setLoading(false);
        }
    };

    const companyName = companySettings?.companyName || 'Electro Shop Morandin';

    return (
        <div className="min-h-dvh bg-surface flex items-center justify-center px-4 py-8 relative">
            {/* Back to Home Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white hover:bg-surface border border-line rounded-full text-ink text-sm font-medium transition-colors shadow-sm group"
            >
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-muted group-hover:text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al inicio
            </Link>



            {/* Main Container */}
            <div className="relative z-10 w-full max-w-4xl">
                {success ? (
                    /* Success State */
                    <div className="rounded-2xl border border-line bg-white p-8 md:p-12 shadow-sm">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-20 h-20 bg-success-strong/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <FiCheck className="w-10 h-10 text-success-strong" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3">
                                    ¡Correo Enviado Exitosamente!
                                </h2>
                                <p className="text-muted mb-6 text-base leading-relaxed">
                                    Hemos enviado un enlace de recuperación a <strong className="text-ink">{email}</strong>.
                                    Revisa tu bandeja de entrada y sigue las instrucciones.
                                </p>
                                <Link
                                    href="/login"
                                    className={adminPrimaryButton}
                                >
                                    <FiArrowLeft className="w-5 h-5" />
                                    Volver al Login
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Form State - Two Column Layout */
                    <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            {/* Left Side - Info Panel */}
                            <div className="bg-surface p-6 sm:p-8 flex flex-col items-center justify-between text-center border-b lg:border-b-0 lg:border-r border-line min-h-[350px]">
                                <div className="flex flex-col items-center">
                                    {companySettings?.logo && (
                                        <div className="relative w-28 h-28 mb-4">
                                            <Image
                                                src={companySettings.logo}
                                                alt={companyName}
                                                fill
                                                sizes="112px"
                                                className="object-contain"
                                                priority
                                            />
                                        </div>
                                    )}

                                    <h2 className="text-xl font-bold text-ink mb-2">
                                        Recuperar Acceso
                                    </h2>
                                    <p className="text-muted text-sm leading-relaxed mb-6">
                                        ¿Olvidaste tu contraseña? Te ayudamos a recuperar el acceso.
                                    </p>

                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-line shadow-xs">
                                            <FiShield className="w-4 h-4 text-brand-600" />
                                            <span className="text-xs text-ink-soft font-medium">100% Seguro</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-line shadow-xs">
                                            <FiMail className="w-4 h-4 text-brand-600" />
                                            <span className="text-xs text-ink-soft font-medium">Link válido 1 hora</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-line w-full">
                                    <p className="text-xs text-muted leading-tight">
                                        Desarrollado por<br />
                                        <span className="text-ink-soft font-medium">Electro Shop - Estudio de desarrollo software y soluciones tecnológicas</span>
                                    </p>
                                </div>
                            </div>

                            {/* Right Side - Form */}
                            <div className="p-6 sm:p-8">
                                <h3 className="text-xl font-bold text-ink mb-1">
                                    Ingresa tu correo electrónico
                                </h3>
                                <p className="text-muted text-sm mb-5">
                                    Te enviaremos un enlace para restablecer tu contraseña
                                </p>

                                {/* Error Message */}
                                {error && (
                                    <div className="mb-4 p-3 bg-deal-bg border border-deal/30 rounded-xl flex items-start gap-2">
                                        <svg className="w-5 h-5 text-deal flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-deal text-sm font-medium">{error}</p>
                                    </div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Email Input */}
                                    <div>
                                        <label htmlFor="email" className={adminLabel}>
                                            Correo Electrónico
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors">
                                                <FiMail className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="email"
                                                inputMode="email"
                                                autoCapitalize="none"
                                                autoCorrect="off"
                                                spellCheck={false}
                                                id="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-line rounded-lg text-ink placeholder:text-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm transition-all"
                                                placeholder="ejemplo@correo.com"
                                            />
                                        </div>
                                    </div>

                                    {/* hCaptcha */}
                                    <div className="flex justify-center">
                                        <div className="bg-surface p-2 rounded-xl border border-line inline-block">
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
                                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Enviando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Enviar Enlace de Recuperación</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </>
                                        )}
                                    </button>

                                    {/* Back to Login */}
                                    <div className="text-center pt-3 border-t border-line">
                                        <Link
                                            href="/login"
                                            className="inline-flex items-center gap-2 text-muted hover:text-brand-600 transition-colors text-sm font-medium group"
                                        >
                                            <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                            Volver al Login
                                        </Link>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
