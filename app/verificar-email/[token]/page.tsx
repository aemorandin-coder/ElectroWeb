'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiCheckCircle, FiXCircle, FiLoader, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

export default function VerifyEmailPage() {
    const params = useParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const response = await fetch(`/api/auth/verify-email/${params.token}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage(data.message);
                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        router.push('/login?verified=true');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Error al verificar');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Error de conexion');
            }
        };

        if (params.token) {
            verifyEmail();
        }
    }, [params.token, router]);

    return (
        <div className="min-h-dvh bg-surface flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-line">
                    {/* Header */}
                    <div className="bg-brand-500 px-8 py-6 text-center text-white">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <FiMail className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Verificación de Email</h1>
                        <p className="text-white/80 text-sm mt-1">Electro Shop</p>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center">
                        {status === 'loading' && (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-brand-50 rounded-full flex items-center justify-center">
                                    <FiLoader className="w-8 h-8 text-brand-600 animate-spin" />
                                </div>
                                <h2 className="text-xl font-bold text-ink">Verificando...</h2>
                                <p className="text-muted">Por favor espera mientras verificamos tu email</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-success-strong/10 rounded-full flex items-center justify-center">
                                    <FiCheckCircle className="w-8 h-8 text-success-strong" />
                                </div>
                                <h2 className="text-xl font-bold text-success-strong">Verificado Exitosamente</h2>
                                <p className="text-muted">{message}</p>
                                <p className="text-sm text-subtle">Redirigiendo al login...</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-deal-bg rounded-full flex items-center justify-center">
                                    <FiXCircle className="w-8 h-8 text-deal" />
                                </div>
                                <h2 className="text-xl font-bold text-deal">Error de Verificación</h2>
                                <p className="text-muted">{message}</p>
                                <div className="pt-4 space-y-3">
                                    <Link
                                        href="/login"
                                        className={`${adminPrimaryButton} w-full`}
                                    >
                                        Ir al Login
                                    </Link>
                                    <button
                                        onClick={async () => {
                                            const email = prompt('Ingresa tu email para reenviar la verificacion:');
                                            if (email) {
                                                const res = await fetch('/api/auth/resend-verification', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ email }),
                                                });
                                                const data = await res.json();
                                                if (res.ok) { toast.success(data.message || 'Email reenviado'); } else { toast.error(data.error || 'No se pudo reenviar el email'); }
                                            }
                                        }}
                                        className={`${adminSecondaryButton} w-full`}
                                    >
                                        Reenviar Email
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-muted mt-6">
                    <Link href="/" className="text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                        Volver al inicio
                    </Link>
                </p>
            </div>
        </div>
    );
}
