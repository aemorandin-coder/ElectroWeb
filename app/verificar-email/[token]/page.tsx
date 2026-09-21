'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import AuthShell from '@/components/auth/AuthShell';
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
          setTimeout(() => router.push('/login?verified=true'), 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Error al verificar');
        }
      } catch {
        setStatus('error');
        setMessage('Error de conexion');
      }
    };
    if (params.token) verifyEmail();
  }, [params.token, router]);

  const handleResend = async () => {
    const email = prompt('Ingresa tu email para reenviar la verificacion:');
    if (email) {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message || 'Email reenviado');
      else toast.error(data.error || 'No se pudo reenviar el email');
    }
  };

  return (
    <AuthShell volver={{ href: '/', texto: 'Volver al inicio' }}>
      <div className="text-center">
        {status === 'loading' && (
          <>
            <FiLoader className="mx-auto h-12 w-12 animate-spin text-brand-600" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-ink">Verificando tu correo</h1>
            <p className="mt-2 text-sm text-muted">Espera un momento mientras confirmamos el enlace.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <FiCheckCircle className="mx-auto h-12 w-12 text-success-strong" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-ink">Correo verificado</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
            <p className="mt-2 text-xs text-muted">Te llevaremos al inicio de sesión en unos segundos.</p>
            <Link href="/login?verified=true" className={`${adminPrimaryButton} mt-6 w-full`}>Ir al Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <FiAlertCircle className="mx-auto h-12 w-12 text-deal" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-ink">No pudimos verificar el correo</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
            <div className="mt-6 space-y-3">
              <Link href="/login" className={`${adminPrimaryButton} w-full`}>Ir al Login</Link>
              <button type="button" onClick={handleResend} className={`${adminSecondaryButton} w-full`}>Reenviar Email</button>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  );
}
