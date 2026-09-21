'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import AuthShell from '@/components/auth/AuthShell';
import { adminError, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';

export default function VerifyEmailPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  // Reenviar el enlace: campo en la página en vez del prompt() nativo (C-80)
  const [reenvio, setReenvio] = useState(false);
  const [correo, setCorreo] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const correoRef = useRef<HTMLInputElement>(null);

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

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = correo.trim();
    if (!email || !correoRef.current?.checkValidity()) {
      setErrorCorreo(email ? 'Escribe un correo válido' : 'Escribe tu correo');
      correoRef.current?.focus();
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message || 'Email reenviado');
      else toast.error(data.error || 'No se pudo reenviar el email');
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
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
              {!reenvio && (
                <button type="button" onClick={() => { setReenvio(true); setTimeout(() => correoRef.current?.focus(), 0); }} className={`${adminSecondaryButton} w-full`}>Reenviar Email</button>
              )}
            </div>
            {reenvio && (
              <form onSubmit={handleResend} className="mt-6 text-left" noValidate>
                <label htmlFor="correo-reenvio" className={adminLabel}>Tu correo</label>
                <input id="correo-reenvio" ref={correoRef} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  autoComplete="email" required value={correo} onChange={(event) => { setCorreo(event.target.value); setErrorCorreo(''); }}
                  aria-invalid={Boolean(errorCorreo)} aria-describedby="correo-reenvio-error" className={adminInput(Boolean(errorCorreo))} placeholder="nombre@correo.com" />
                <p id="correo-reenvio-error" className={`${adminError} min-h-4`} role={errorCorreo ? 'alert' : undefined}>{errorCorreo}</p>
                <button type="submit" disabled={enviando} className={`${adminSecondaryButton} mt-2 w-full`}>
                  {enviando ? 'Enviando...' : 'Reenviar enlace'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </AuthShell>
  );
}
