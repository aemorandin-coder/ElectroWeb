'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { IconoCargando, IconoConfirmado, IconoError } from '@/components/iconos';
import toast from 'react-hot-toast';
import AuthShell from '@/components/auth/AuthShell';
import { adminError, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { rutaInternaSegura } from '@/lib/rutas';

// C-255: el enlace del correo trae adónde volver (?destino=/sorteo, lo manda el registro). Con la sesión abierta desde el
// registro, vuelve directo ahí (antes iba al login, que lo mandaba al inicio y se perdía el sorteo); sin sesión, al login,
// que después lo lleva ahí.

export default function VerifyEmailPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [siguiente, setSiguiente] = useState({ href: '/login?verified=true', texto: 'Ir al Login', aviso: 'Te llevaremos al inicio de sesión en unos segundos.' });
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
          const destino = rutaInternaSegura(new URLSearchParams(window.location.search).get('destino'));
          // La sesión ya sabe que el correo está activo (lib/auth.ts lo lee mientras no lo esté)
          const sesion = await getSession().catch(() => null);
          const ir = sesion?.user
            ? { href: destino ?? '/', texto: destino === '/sorteo' ? 'Volver al sorteo' : 'Seguir', aviso: 'Te llevamos de vuelta en unos segundos.' }
            : { href: `/login?verified=true${destino ? `&callbackUrl=${encodeURIComponent(destino)}` : ''}`, texto: 'Ir al Login', aviso: 'Te llevaremos al inicio de sesión en unos segundos.' };
          setStatus('success');
          setMessage(sesion?.user ? 'Tu cuenta está activa.' : data.message);
          setSiguiente(ir);
          setTimeout(() => router.push(ir.href), 3000);
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
            <IconoCargando className="mx-auto h-12 w-12 animate-spin text-brand-600" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-ink">Verificando tu correo</h1>
            <p className="mt-2 text-sm text-muted">Espera un momento mientras confirmamos el enlace.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <IconoConfirmado className="mx-auto h-12 w-12 text-success-strong" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-ink">Correo verificado</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
            <p className="mt-2 text-xs text-muted">{siguiente.aviso}</p>
            <Link href={siguiente.href} className={`${adminPrimaryButton} mt-6 w-full`}>{siguiente.texto}</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <IconoError className="mx-auto h-12 w-12 text-deal" aria-hidden="true" />
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
