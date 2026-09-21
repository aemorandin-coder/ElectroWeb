'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiAlertCircle, FiCheck, FiCheckCircle, FiCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import AuthShell from '@/components/auth/AuthShell';
import { adminError, adminInput, adminLabel, adminPrimaryButton } from '@/lib/admin-ui';
import { contrasenaSchema, REGLAS_CONTRASENA } from '@/lib/validations/registro';

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
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<{ field: 'password' | 'confirmPassword'; message: string } | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError({ field: 'confirmPassword', message: 'Las contraseñas no coinciden' });
      confirmRef.current?.focus();
      return;
    }
    const valid = contrasenaSchema.safeParse(password);
    if (!valid.success) {
      setError({ field: 'password', message: valid.error.issues[0]?.message || 'Contraseña inválida' });
      passwordRef.current?.focus();
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
        setTimeout(() => router.push('/login'), 3000);
      } else {
        const message = data.message || 'Error al restablecer la contraseña';
        if (/token|enlace|expir/i.test(message)) setExpired(true);
        else { setError({ field: 'password', message }); passwordRef.current?.focus(); }
      }
    } catch {
      setError({ field: 'password', message: 'Error de conexión. Por favor intenta de nuevo.' });
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell volver={{ href: '/login', texto: 'Volver al Login' }}>
      {success ? (
        <div className="text-center">
          <FiCheckCircle className="mx-auto h-12 w-12 text-success-strong" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-ink">Contraseña restablecida</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">Tu contraseña se actualizó. Te llevaremos al inicio de sesión en unos segundos.</p>
          <Link href="/login" className={`${adminPrimaryButton} mt-6 w-full`}>Ir al Login</Link>
        </div>
      ) : expired ? (
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-deal" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-ink">Enlace vencido o inválido</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">Este enlace ya no sirve para cambiar la contraseña. Solicita uno nuevo.</p>
          <Link href="/recuperar-contrasena" className={`${adminPrimaryButton} mt-6 w-full`}>Solicitar otro enlace</Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-ink">Nueva contraseña</h1>
          <p className="mt-2 text-sm text-muted">Elige una contraseña segura para tu cuenta.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="password" className={adminLabel}>Nueva contraseña</label>
              <div className="relative">
                <input id="password" ref={passwordRef} type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(event) => { setPassword(event.target.value); if (error?.field === 'password') setError(null); }}
                  aria-invalid={error?.field === 'password'} aria-describedby="password-rules password-error"
                  className={`${adminInput(error?.field === 'password')} pr-12`} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink">
                  {showPassword ? <FiEyeOff className="h-5 w-5" aria-hidden="true" /> : <FiEye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
              <ul id="password-rules" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {REGLAS_CONTRASENA.map((rule) => {
                  const met = rule.cumple(password);
                  const Icon = met ? FiCheck : password ? FiAlertCircle : FiCircle;
                  return <li key={rule.id} className={`flex items-center gap-1.5 text-xs font-medium ${met ? 'text-success-strong' : password ? 'text-deal' : 'text-muted'}`}>
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{rule.texto}
                    <span className="sr-only">{met ? ': listo' : ': falta'}</span>
                  </li>;
                })}
              </ul>
              <p id="password-error" className={`${adminError} min-h-4`} role={error?.field === 'password' ? 'alert' : undefined}>{error?.field === 'password' ? error.message : ''}</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className={adminLabel}>Confirmar contraseña</label>
              <div className="relative">
                <input id="confirmPassword" ref={confirmRef} type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword}
                  onChange={(event) => { setConfirmPassword(event.target.value); if (error?.field === 'confirmPassword') setError(null); }}
                  aria-invalid={error?.field === 'confirmPassword'} aria-describedby="confirm-error"
                  className={`${adminInput(error?.field === 'confirmPassword')} pr-12`} autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'} aria-pressed={showConfirmPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink">
                  {showConfirmPassword ? <FiEyeOff className="h-5 w-5" aria-hidden="true" /> : <FiEye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
              <p id="confirm-error" className={`${adminError} min-h-4`} role={error?.field === 'confirmPassword' ? 'alert' : undefined}>{error?.field === 'confirmPassword' ? error.message : ''}</p>
            </div>
            <button type="submit" disabled={loading} className={`${adminPrimaryButton} w-full`}>
              {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
