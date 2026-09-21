'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiAlertCircle, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import AuthShell from '@/components/auth/AuthShell';
import BotonGoogle from '@/components/auth/BotonGoogle';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';
import { adminError, adminInput, adminLabel, adminNotice, adminPrimaryButton } from '@/lib/admin-ui';
import { rutaInternaSegura } from '@/lib/rutas';

// Constants for failed attempts
const FAILED_ATTEMPTS_KEY = 'login_failed_attempts';
const FAILED_ATTEMPTS_EXPIRY_KEY = 'login_failed_attempts_expiry';
const MAX_ATTEMPTS_BEFORE_CAPTCHA = 2;
const ATTEMPTS_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

// Errores que llegan en ?error= después de volver de Google (C-85) o de NextAuth
const ERRORES_DE_ACCESO: Record<string, string> = {
  admin_required: 'Se requiere acceso de administrador para esta sección.',
  'google-admin': 'Las cuentas de administrador no entran con Google. Usa tu correo y tu contraseña.',
  'google-correo-no-verificado': 'Tu correo de Google no está verificado. Verifícalo en Google o entra con tu correo.',
  'google-sin-correo': 'Google no nos compartió tu correo. Intenta de nuevo o entra con tu correo.',
  'cuenta-suspendida': 'Esta cuenta está desactivada por la tienda. Escríbenos por WhatsApp o desde Contacto si crees que es un error.',
};
const ERROR_ACCESO_GENERICO = 'No pudimos iniciar sesión con Google. Intenta de nuevo o entra con tu correo.';
const MENSAJE_CUENTA_SOCIAL = 'Esta cuenta no tiene contraseña. Entra con Google o crea una con "¿La olvidaste?".';

/** "DEMASIADOS_INTENTOS:300" (límite del servidor, C-80) → texto con la espera. */
function mensajeDeEspera(error: string): string {
  const segundos = Number(error.split(':')[1]) || 60;
  const minutos = Math.ceil(segundos / 60);
  return `Demasiados intentos con esta cuenta. Espera ${minutos === 1 ? '1 minuto' : `${minutos} minutos`} o recupera tu contraseña con "¿La olvidaste?".`;
}

function LoginPageContent({ google }: { google: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'customer' | 'admin'>('customer');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Captcha state
  const captchaRef = useRef<any>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [forceShowForm, setForceShowForm] = useState(false);

  // Timeout de seguridad: si la sesión tarda más de 800ms, mostrar el formulario igual
  useEffect(() => {
    const t = setTimeout(() => setForceShowForm(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== 'loading') setForceShowForm(true);
  }, [status]);

  // Load failed attempts from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAttempts = localStorage.getItem(FAILED_ATTEMPTS_KEY);
      const expiry = localStorage.getItem(FAILED_ATTEMPTS_EXPIRY_KEY);

      if (storedAttempts && expiry) {
        if (Date.now() > parseInt(expiry)) {
          // Expired, reset
          localStorage.removeItem(FAILED_ATTEMPTS_KEY);
          localStorage.removeItem(FAILED_ATTEMPTS_EXPIRY_KEY);
          setFailedAttempts(0);
          setRequiresCaptcha(false);
        } else {
          const attempts = parseInt(storedAttempts);
          setFailedAttempts(attempts);
          setRequiresCaptcha(attempts >= MAX_ATTEMPTS_BEFORE_CAPTCHA);
        }
      }
    }
  }, []);

  // Captcha handlers
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  // Helper to update failed attempts
  const incrementFailedAttempts = () => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    localStorage.setItem(FAILED_ATTEMPTS_KEY, String(newAttempts));
    localStorage.setItem(FAILED_ATTEMPTS_EXPIRY_KEY, String(Date.now() + ATTEMPTS_EXPIRY_TIME));

    if (newAttempts >= MAX_ATTEMPTS_BEFORE_CAPTCHA) {
      setRequiresCaptcha(true);
    }

    // Reset captcha for next attempt
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
  };

  // Helper to reset failed attempts on successful login
  const resetFailedAttempts = () => {
    setFailedAttempts(0);
    setRequiresCaptcha(false);
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(FAILED_ATTEMPTS_EXPIRY_KEY);
  };



  // Check if redirect is for admin and handle errors
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    const error = searchParams.get('error');
    // Also check callbackUrl to see if we should default to admin tab (e.g. if trying to access /admin)
    const callbackUrl = searchParams.get('callbackUrl');

    if (redirect === 'admin' || (callbackUrl && callbackUrl.includes('/admin'))) {
      setUserType('admin');
    }

    if (error) {
      setError(ERRORES_DE_ACCESO[error] ?? ERROR_ACCESO_GENERICO);
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      const userType = (session.user as any)?.userType || 'customer';
      if (userType === 'admin') {
        router.push('/admin');
      } else {
        const destino =
          rutaInternaSegura(searchParams.get('callbackUrl')) ??
          rutaInternaSegura(searchParams.get('redirect'));
        router.push(destino ?? '/');
      }
      router.refresh();
    }
  }, [status, session, router, searchParams]);

  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case 'email':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu correo electrónico';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(value.trim())) return 'Ingresa un correo electrónico válido';
        return '';

      case 'password':
        if (!value || value === '') return 'Por favor, ingresa tu contraseña';
        return '';

      default:
        return '';
    }
  };

  const handleBlur = (fieldName: string, value: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setValidationErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touchedFields.email) {
      const error = validateField('email', value);
      setValidationErrors(prev => ({ ...prev, email: error }));
    }
    setError('');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touchedFields.password) {
      const error = validateField('password', value);
      setValidationErrors(prev => ({ ...prev, password: error }));
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check captcha if required
    if (requiresCaptcha && !captchaToken) {
      setError('Por favor, completa la verificación de seguridad.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('unified-credentials', {
        email,
        password,
        userType,
        // El servidor lo exige tras 2 fallos con la misma cuenta (C-80)
        captchaToken: captchaToken ?? '',
        redirect: false,
      });

      if (result?.error === 'CUENTA_SOCIAL') {
        setError(MENSAJE_CUENTA_SOCIAL);
      } else if (result?.error === 'CUENTA_SUSPENDIDA') {
        setError(ERRORES_DE_ACCESO['cuenta-suspendida']);
      } else if (result?.error === 'CAPTCHA_REQUERIDO') {
        setRequiresCaptcha(true);
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        setError('Completa la verificación de seguridad para seguir.');
      } else if (result?.error?.startsWith('DEMASIADOS_INTENTOS')) {
        setRequiresCaptcha(true);
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        setError(mensajeDeEspera(result.error));
      } else if (result?.error) {
        incrementFailedAttempts();
        setError('Correo o contraseña incorrectos. Revisa los datos e intenta de nuevo.');
      } else if (result?.ok) {
        // Reset failed attempts on success
        resetFailedAttempts();
        // Wait a bit for session to be established
        await new Promise(resolve => setTimeout(resolve, 300));

        // Fetch user role to determine redirect
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const userRole = sessionData?.user?.role;
        const userTypeFromSession = sessionData?.user?.userType;

        // SUPER_ADMIN and ADMIN always go to admin panel
        if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userTypeFromSession === 'admin') {
          window.location.href = '/admin';
        } else {
          // Vuelve a donde venía el cliente: unas páginas mandan ?callbackUrl= y otras ?redirect=
          const destino =
            rutaInternaSegura(searchParams.get('callbackUrl')) ??
            rutaInternaSegura(searchParams.get('redirect'));
          window.location.href = destino ?? '/';
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error al conectar con el servidor. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar spinner solo si la sesión está cargando Y no ha pasado el timeout
  if (status === 'loading' && !forceShowForm) {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-line mb-4 shadow-sm">
            <svg className="animate-spin h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-muted text-sm font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (status === 'authenticated') {
    return null;
  }

  const destinoCliente =
    rutaInternaSegura(searchParams.get('callbackUrl')) ?? rutaInternaSegura(searchParams.get('redirect'));
  const hrefRegistro = destinoCliente ? `/registro?callbackUrl=${encodeURIComponent(destinoCliente)}` : '/registro';

  return (
    <AuthShell
      volver={{ href: '/', texto: 'Volver a la tienda' }}
      pie={
        <p className="text-sm text-muted">
          ¿No tienes cuenta?{' '}
          <Link href={hrefRegistro} className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
            Crea una aquí
          </Link>
        </p>
      }
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted">{google && userType !== 'admin' ? 'Entra con Google o con tu correo.' : 'Entra con tu correo y tu contraseña.'}</p>
      </div>

      {/* Los administradores nunca entran con Google (decisión de Andrés, C-85) */}
      {google && userType !== 'admin' && <BotonGoogle destino={destinoCliente ?? '/'} deshabilitado={isLoading} />}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className={adminLabel}>
            Correo
          </label>
          <div className="form-field group">
            <svg className="field-icon text-muted group-focus-within:text-brand-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => handleBlur('email', email)}
              autoComplete="email"
              className={adminInput(Boolean(touchedFields.email && validationErrors.email))}
              placeholder={userType === 'admin' ? 'admin@electroshop.com' : 'nombre@gmail.com'}
              disabled={isLoading}
              aria-invalid={Boolean(touchedFields.email && validationErrors.email)}
              aria-describedby={touchedFields.email && validationErrors.email ? 'email-error' : undefined}
            />
          </div>
          {touchedFields.email && validationErrors.email && (
            <p id="email-error" className={adminError}>{validationErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-semibold text-ink">
              Contraseña
            </label>
            <Link href="/recuperar-contrasena" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              ¿La olvidaste?
            </Link>
          </div>
          <div className="form-field group">
            <svg className="field-icon text-muted group-focus-within:text-brand-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => handleBlur('password', password)}
              autoComplete="current-password"
              className={`${adminInput(Boolean(touchedFields.password && validationErrors.password))} has-right-icon`}
              disabled={isLoading}
              aria-invalid={Boolean(touchedFields.password && validationErrors.password)}
              aria-describedby={touchedFields.password && validationErrors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className="field-icon-right text-muted hover:text-ink transition-colors duration-200"
            >
              {showPassword ? <FiEyeOff className="h-5 w-5" aria-hidden="true" /> : <FiEye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          {touchedFields.password && validationErrors.password && (
            <p id="password-error" className={adminError}>{validationErrors.password}</p>
          )}
        </div>

        {/* Captcha: aparece después de 2 intentos fallidos */}
        {requiresCaptcha && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-warning-strong">
              <FiShield className="h-4 w-4 shrink-0" aria-hidden="true" />
              Verificación de seguridad
            </p>
            <div className="flex justify-center">
              <HCaptchaWrapper
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                onVerify={handleCaptchaVerify}
                onExpire={handleCaptchaExpire}
                ref={captchaRef}
                theme="light"
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div role="alert" className={`${adminNotice('danger')} flex items-start gap-2`}>
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        <button type="submit" disabled={isLoading} className={`${adminPrimaryButton} w-full`}>
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              Entrando
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginCliente({ google }: { google: boolean }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white lg:bg-surface" />}>
      <LoginPageContent google={google} />
    </Suspense>
  );
}
