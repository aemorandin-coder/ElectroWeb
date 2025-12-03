'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi';

export default function RecuperarContrasenaPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
            } else {
                setError(data.message || 'Error al enviar el correo de recuperación');
            }
        } catch (err) {
            setError('Error de conexión. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                {success ? (
                    /* Success State */
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                            <FiCheck className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-3">
                            ¡Correo Enviado!
                        </h2>
                        <p className="text-white/90 mb-6">
                            Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
                            Por favor revisa tu bandeja de entrada y sigue las instrucciones.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#2a63cd] font-bold rounded-xl hover:bg-white/90 transition-all shadow-lg"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                            Volver al Login
                        </Link>
                    </div>
                ) : (
                    /* Form State */
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                        {/* Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                            <FiMail className="w-10 h-10 text-white" />
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-black text-white text-center mb-3">
                            Recuperar Contraseña
                        </h2>
                        <p className="text-white/80 text-center mb-8">
                            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                                <p className="text-white text-sm text-center">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur-md"
                                    placeholder="tu@email.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-4 bg-white text-[#2a63cd] font-bold rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                            </button>
                        </form>

                        {/* Back to Login */}
                        <div className="mt-6 text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium"
                            >
                                <FiArrowLeft className="w-4 h-4" />
                                Volver al Login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
