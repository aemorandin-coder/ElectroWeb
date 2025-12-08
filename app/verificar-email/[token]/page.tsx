'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiCheckCircle, FiXCircle, FiLoader, FiMail } from 'react-icons/fi';

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
        <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-white to-[#e9ecef] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#e9ecef]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] px-8 py-6 text-center">
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
                                <div className="w-16 h-16 mx-auto bg-[#2a63cd]/10 rounded-full flex items-center justify-center">
                                    <FiLoader className="w-8 h-8 text-[#2a63cd] animate-spin" />
                                </div>
                                <h2 className="text-xl font-bold text-[#212529]">Verificando...</h2>
                                <p className="text-[#6a6c6b]">Por favor espera mientras verificamos tu email</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                                    <FiCheckCircle className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-emerald-600">Verificado Exitosamente</h2>
                                <p className="text-[#6a6c6b]">{message}</p>
                                <p className="text-sm text-[#adb5bd]">Redirigiendo al login...</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-4">
                                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                                    <FiXCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <h2 className="text-xl font-bold text-red-600">Error de Verificacion</h2>
                                <p className="text-[#6a6c6b]">{message}</p>
                                <div className="pt-4 space-y-3">
                                    <Link
                                        href="/login"
                                        className="block w-full py-3 bg-[#2a63cd] text-white font-medium rounded-lg hover:bg-[#1e4ba3] transition-colors"
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
                                                alert(data.message || data.error);
                                            }
                                        }}
                                        className="block w-full py-3 border border-[#2a63cd] text-[#2a63cd] font-medium rounded-lg hover:bg-[#2a63cd]/5 transition-colors"
                                    >
                                        Reenviar Email
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-[#6a6c6b] mt-6">
                    <Link href="/" className="text-[#2a63cd] hover:underline">
                        Volver al inicio
                    </Link>
                </p>
            </div>
        </div>
    );
}
