'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiCheckCircle, FiMail } from 'react-icons/fi';
import AuthShell from '@/components/auth/AuthShell';
import HCaptchaWrapper, { type HCaptchaRefMethods } from '@/components/HCaptchaWrapper';
import { adminError, adminInput, adminLabel, adminPrimaryButton } from '@/lib/admin-ui';

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<{ field: 'email' | 'captcha'; message: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptchaRefMethods>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const captchaBoxRef = useRef<HTMLDivElement>(null);

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setError((current) => current?.field === 'captcha' ? null : current);
  };
  const handleCaptchaExpire = () => setCaptchaToken(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!emailRef.current?.checkValidity()) {
      setError({ field: 'email', message: emailRef.current?.validity.valueMissing ? 'Escribe tu correo' : 'Escribe un correo válido' });
      emailRef.current?.focus();
      return;
    }
    if (!captchaToken) {
      setError({ field: 'captcha', message: 'Por favor, completa la verificación de seguridad.' });
      captchaBoxRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
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
        const message = data.message || 'Error al enviar el correo de recuperación';
        const field = /captcha|seguridad|verificaci/i.test(message) ? 'captcha' : 'email';
        setError({ field, message });
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        if (field === 'captcha') captchaBoxRef.current?.focus();
        else emailRef.current?.focus();
      }
    } catch {
      setError({ field: 'email', message: 'Error de conexión. Por favor intenta de nuevo.' });
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
      emailRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell volver={{ href: '/', texto: 'Volver al inicio' }}>
      {success ? (
        <div className="text-center">
          <FiCheckCircle className="mx-auto h-12 w-12 text-success-strong" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-ink">Revisa tu correo</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Enviamos un enlace de recuperación a <strong className="break-all text-ink">{email}</strong>. Sigue las instrucciones para cambiar tu contraseña.
          </p>
          <Link href="/login" className={`${adminPrimaryButton} mt-6 w-full`}>Volver al Login</Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-ink">Recuperar contraseña</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">Escribe tu correo y te enviaremos un enlace para volver a entrar.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className={adminLabel}>Correo electrónico</label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden="true" />
                <input id="email" ref={emailRef} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  required value={email} onChange={(event) => { setEmail(event.target.value); if (error?.field === 'email') setError(null); }}
                  aria-invalid={error?.field === 'email'} aria-describedby="email-error"
                  className={`${adminInput(error?.field === 'email')} pl-10`} placeholder="nombre@correo.com" />
              </div>
              <p id="email-error" className={`${adminError} min-h-4`} role={error?.field === 'email' ? 'alert' : undefined}>{error?.field === 'email' ? error.message : ''}</p>
            </div>
            <div ref={captchaBoxRef} tabIndex={-1} className="outline-none">
              <p className={adminLabel}>Verificación de seguridad</p>
              <div className="w-full overflow-hidden rounded-lg border border-line bg-surface py-2">
                <HCaptchaWrapper sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                  onVerify={handleCaptchaVerify} onExpire={handleCaptchaExpire} ref={captchaRef} theme="light" />
              </div>
              <p className={`${adminError} min-h-4`} role={error?.field === 'captcha' ? 'alert' : undefined}>{error?.field === 'captcha' ? error.message : ''}</p>
            </div>
            <button type="submit" disabled={loading || !captchaToken} className={`${adminPrimaryButton} w-full`}>
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
          <Link href="/login" className="mt-6 inline-flex h-11 items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
            <FiArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al Login
          </Link>
        </>
      )}
    </AuthShell>
  );
}
