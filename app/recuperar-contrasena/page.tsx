'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiMail, FiArrowLeft, FiCheck, FiShield } from 'react-icons/fi';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';

export default function RecuperarContrasenaPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<any>(null);
    const [companySettings, setCompanySettings] = useState<{
        companyName: string;
        logo: string | null;
    } | null>(null);

    useEffect(() => {
        fetch('/api/settings/public')
            .then(res => res.json())
            .then(data => {
                setCompanySettings({
                    companyName: data.companyName || 'Electro Shop Morandin',
                    logo: data.logo,
                });
            })
            .catch(err => console.error('Error loading company settings:', err));
    }, []);

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
        <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 py-8 relative overflow-hidden">
            {/* Back to Home Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 rounded-full text-white text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg group"
            >
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al inicio
            </Link>

            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

            {/* Main Container */}
            <div className="relative z-10 w-full max-w-5xl">
                {success ? (
                    /* Success State */
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 md:p-12 shadow-2xl animate-slideInUp">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-xl flex-shrink-0">
                                <FiCheck className="w-12 h-12 text-green-600" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
                                    ¡Correo Enviado Exitosamente!
                                </h2>
                                <p className="text-white/90 mb-6 text-base leading-relaxed">
                                    Hemos enviado un enlace de recuperación a <strong className="text-cyan-200">{email}</strong>.
                                    Revisa tu bandeja de entrada y sigue las instrucciones.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2a63cd] font-bold rounded-xl hover:bg-white/90 transition-all shadow-lg"
                                >
                                    <FiArrowLeft className="w-5 h-5" />
                                    Volver al Login
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Form State - Two Column Layout */
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden animate-slideInUp">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            {/* Left Side - Info Panel (Compact & Centered) */}
                            <div className="bg-white/5 p-6 flex flex-col items-center justify-between text-center border-b lg:border-b-0 lg:border-r border-white/10 min-h-[350px]">
                                {/* Top Content */}
                                <div className="flex flex-col items-center">
                                    {/* Logo - Centered & Bigger */}
                                    {companySettings?.logo && (
                                        <div className="relative w-28 h-28 mb-4 animate-scaleIn">
                                            <Image
                                                src={companySettings.logo}
                                                alt={companyName}
                                                fill
                                                className="object-contain drop-shadow-xl"
                                                priority
                                            />
                                        </div>
                                    )}

                                    <h2 className="text-xl font-black text-white mb-2">
                                        Recuperar Acceso
                                    </h2>
                                    <p className="text-white/80 text-sm leading-relaxed mb-4">
                                        ¿Olvidaste tu contraseña? Te ayudamos a recuperar el acceso.
                                    </p>

                                    {/* Security Features - Centered with Glass Effect */}
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-default group">
                                            <FiShield className="w-4 h-4 text-cyan-300 group-hover:animate-pulse" />
                                            <span className="text-xs text-white font-medium">100% Seguro</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-default group">
                                            <FiMail className="w-4 h-4 text-cyan-300 group-hover:animate-pulse" />
                                            <span className="text-xs text-white font-medium">Link válido 1 hora</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Signature */}
                                <div className="mt-4 pt-4 border-t border-white/10 w-full">
                                    <p className="text-[10px] text-white/40 leading-tight">
                                        Desarrollado por<br />
                                        <span className="text-white/50 font-medium">Electro Shop - Estudio de desarrollo software y soluciones tecnológicas</span>
                                    </p>
                                </div>
                            </div>

                            {/* Right Side - Form */}
                            <div className="p-6 lg:p-8">
                                <h3 className="text-xl font-bold text-white mb-1">
                                    Ingresa tu correo electrónico
                                </h3>
                                <p className="text-blue-200 text-sm mb-5">
                                    Te enviaremos un enlace para restablecer tu contraseña
                                </p>

                                {/* Error Message */}
                                {error && (
                                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-2">
                                        <svg className="w-5 h-5 text-red-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-white text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Email Input */}
                                    <div>
                                        <label htmlFor="email" className="block text-xs font-bold text-blue-100 uppercase tracking-wider mb-2">
                                            Correo Electrónico
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors">
                                                <FiMail className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="email"
                                                id="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent focus:bg-white/20 backdrop-blur-md text-base transition-all"
                                                placeholder="ejemplo@correo.com"
                                            />
                                        </div>
                                    </div>

                                    {/* hCaptcha */}
                                    <div className="flex justify-center">
                                        <div className="bg-white/5 p-2 rounded-xl border border-white/10 inline-block">
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
                                        className="w-full px-6 py-3.5 bg-white text-[#2a63cd] font-bold rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-[#2a63cd]" fill="none" viewBox="0 0 24 24">
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
                                    <div className="text-center pt-3 border-t border-white/10">
                                        <Link
                                            href="/login"
                                            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium group"
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
