'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiCheckCircle, FiXCircle, FiLoader, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';

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
        <div className="min-h-dvh bg-gradient-to-br from-surface via-white to-line flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-line">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-8 py-6 text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <FiMail className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Verificacion de Email</h1>
                        <p className="text-white/80 text-sm mt-1">Electro Shop</p>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center">
                        {status === 'loading' && (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-brand-500/10 rounded-full flex items-center justify-center">
                                    <FiLoader className="w-8 h-8 text-brand-500 animate-spin" />
                                </div>
                                <h2 className="text-xl font-bold text-ink">Verificando...</h2>
                                <p className="text-muted">Por favor espera mientras verificamos tu email</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                                    <FiCheckCircle className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-emerald-600">Verificado Exitosamente</h2>
                                <p className="text-muted">{message}</p>
                                <p className="text-sm text-subtle">Redirigiendo al login...</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                                    <FiXCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <h2 className="text-xl font-bold text-red-600">Error de Verificacion</h2>
                                <p className="text-muted">{message}</p>
                                <div className="pt-4 space-y-3">
                                    <Link
                                        href="/login"
                                        className="block w-full py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors"
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
                                        className="block w-full py-3 border border-brand-500 text-brand-500 font-medium rounded-lg hover:bg-brand-500/5 transition-colors"
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
                    <Link href="/" className="text-brand-500 hover:underline">
                        Volver al inicio
                    </Link>
                </p>
            </div>
        </div>
    );
}
