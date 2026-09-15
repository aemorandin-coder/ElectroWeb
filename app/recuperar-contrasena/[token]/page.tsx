'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FiLock, FiArrowLeft, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import { adminPrimaryButton, adminInput, adminLabel } from '@/lib/admin-ui';

export default function ResetPasswordPage() {
    const router = useRouter();
    const params = useParams();
    const token = params.token as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                setError(data.message || 'Error al restablecer la contraseña');
            }
        } catch (err) {
            setError('Error de conexión. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-dvh bg-surface flex items-center justify-center px-4 py-8 relative">


            <div className="relative z-10 w-full max-w-md">
                {success ? (
                    /* Success State */
                    <div className="rounded-2xl border border-line bg-white p-8 shadow-sm text-center">
                        <div className="w-16 h-16 mx-auto mb-6 bg-success-strong/10 rounded-full flex items-center justify-center">
                            <FiCheck className="w-8 h-8 text-success-strong" />
                        </div>
                        <h2 className="text-2xl font-bold text-ink mb-3">
                            ¡Contraseña Restablecida!
                        </h2>
                        <p className="text-muted mb-6 text-sm">
                            Tu contraseña ha sido actualizada exitosamente. Serás redirigido al login en unos segundos...
                        </p>
                        <Link
                            href="/login"
                            className={adminPrimaryButton}
                        >
                            Ir al Login
                        </Link>
                    </div>
                ) : (
                    /* Form State */
                    <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
                        {/* Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 bg-brand-50 rounded-full flex items-center justify-center border border-brand-200">
                            <FiLock className="w-8 h-8 text-brand-600" />
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-ink text-center mb-2">
                            Nueva Contraseña
                        </h2>
                        <p className="text-muted text-center text-sm mb-6">
                            Ingresa tu nueva contraseña
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-deal-bg border border-deal/30 rounded-xl">
                                <p className="text-deal text-sm text-center font-medium">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="password" className={adminLabel}>
                                    Nueva Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 bg-white border border-line rounded-lg text-ink placeholder:text-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm pr-12 transition-all"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                                    >
                                        {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className={adminLabel}>
                                    Confirmar Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 bg-white border border-line rounded-lg text-ink placeholder:text-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm pr-12 transition-all"
                                        placeholder="Repite tu contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                                    >
                                        {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`${adminPrimaryButton} w-full`}
                            >
                                {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                            </button>
                        </form>

                        {/* Back to Login */}
                        <div className="mt-6 text-center pt-4 border-t border-line">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-muted hover:text-brand-600 transition-colors text-sm font-medium"
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
