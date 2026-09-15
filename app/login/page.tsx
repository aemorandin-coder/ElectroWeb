'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import EpicTooltip from '@/components/EpicTooltip';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { adminPrimaryButton, adminInput, adminLabel } from '@/lib/admin-ui';

// Constants for failed attempts
const FAILED_ATTEMPTS_KEY = 'login_failed_attempts';
const FAILED_ATTEMPTS_EXPIRY_KEY = 'login_failed_attempts_expiry';
const MAX_ATTEMPTS_BEFORE_CAPTCHA = 2;
const ATTEMPTS_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

function LoginPageContent() {
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
  const { settings: publicSettings, isLoading: publicSettingsLoading } = useSettings();
  const companySettings = publicSettings
    ? { companyName: publicSettings.companyName || 'Electro Shop Morandin', logo: publicSettings.logo ?? null, tagline: publicSettings.tagline ?? null }
    : null;
  const settingsLoaded = !publicSettingsLoading;

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

    if (error === 'admin_required') {
      setError('Se requiere acceso de administrador para esta sección.');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      const userType = (session.user as any)?.userType || 'customer';
      if (userType === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
      router.refresh();
    }
  }, [status, session, router]);

  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case 'email':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu correo electrónico';
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(value)) return 'Ingresa un correo electrónico válido';
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
        redirect: false,
      });

      if (result?.error) {
        incrementFailedAttempts();
        setError('Credenciales invalidas. Por favor, verifique su informacion.');
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
          // Redirect based on callback URL or home
          const callbackUrl = searchParams.get('callbackUrl');
          const action = searchParams.get('action');

          if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.includes('/admin')) {
            // If action was 'buy', go to the product then they can checkout
            // For regular flows, just go to the callback URL
            window.location.href = callbackUrl;
          } else {
            window.location.href = '/';
          }
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

  const companyName = companySettings?.companyName || 'Electro Shop Morandin';
  const companyNameParts = companyName.split(' ');
  const firstName = companyNameParts[0] || 'Electro Shop';
  const restName = companyNameParts.slice(1).join(' ') || 'Morandin';

  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center px-4 py-8 relative">
      {/* Back to Home Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white hover:bg-surface border border-line rounded-full text-ink text-sm font-medium transition-colors shadow-sm group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-muted group-hover:text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al inicio
      </Link>



      <div className="w-full max-w-md relative z-10">
        {/* Logo Section - Only Logo, no text */}
        <div className="text-center mb-4 animate-fadeIn">
          {!settingsLoaded ? (
            /* Loading skeleton while settings load */
            <div className="relative w-36 h-36 mx-auto animate-pulse">
              <div className="w-full h-full bg-surface rounded-2xl border border-line" />
            </div>
          ) : companySettings?.logo ? (
            <div className="relative w-36 h-36 mx-auto">
              <Image
                src={companySettings.logo}
                alt={companyName}
                fill
                sizes="144px"
                className="object-contain"
                priority
              />
            </div>
          ) : (
            /* Fallback: shopping bag icon instead of lightning bolt */
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-50 border border-brand-200">
              <svg className="w-10 h-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          )}
        </div>

        {/* Login Card - Premium Glass Effect */}
        <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-ink mb-1">Iniciar Sesión</h2>
              <p className="text-muted text-sm">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label htmlFor="email" className={adminLabel}>
                  Correo Electrónico
                </label>
                <div className="form-field group">
                  <svg className="field-icon text-muted group-focus-within:text-brand-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => handleBlur('email', email)}
                    autoComplete="email"
                    className={adminInput(Boolean(touchedFields.email && validationErrors.email))}
                    placeholder={userType === 'admin' ? 'admin@electroshop.com' : 'cliente@ejemplo.com'}
                    disabled={isLoading}
                  />
                  <EpicTooltip
                    message={validationErrors.email || ''}
                    visible={touchedFields.email && !!validationErrors.email}
                    position="bottom"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className={adminLabel}>
                    Contraseña
                  </label>
                  <Link
                    href="/recuperar-contrasena"
                    className="text-xs text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="form-field group">
                  <svg className="field-icon text-muted group-focus-within:text-brand-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={() => handleBlur('password', password)}
                    autoComplete={userType === 'admin' ? 'current-password' : 'password'}
                    className={`${adminInput(Boolean(touchedFields.password && validationErrors.password))} has-right-icon`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="field-icon-right text-muted hover:text-ink transition-colors duration-200"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L9.88 9.88m-3.59-3.59l3.29 3.29" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <EpicTooltip
                    message={validationErrors.password || ''}
                    visible={touchedFields.password && !!validationErrors.password}
                    position="bottom"
                  />
                </div>
              </div>

              {/* Captcha - Shows after 2 failed attempts */}
              <div className={`space-y-2 transition-all duration-300 ${requiresCaptcha ? 'opacity-100 max-h-[200px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-warning/15">
                    <svg className="w-3 h-3 text-warning-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-xs text-warning-strong font-medium">
                    Verificación de seguridad requerida
                  </p>
                </div>
                <div className="flex justify-center rounded-xl overflow-hidden bg-surface p-2 border border-line">
                  <HCaptchaWrapper
                    sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                    onVerify={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                    ref={captchaRef}
                    theme="light"
                    size={requiresCaptcha ? 'normal' : 'invisible'}
                  />
                </div>
                {captchaToken && (
                  <div className="flex items-center gap-1.5 text-xs text-success-strong font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verificación completada
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-deal-bg border border-deal/30 rounded-xl">
                  <svg className="w-5 h-5 text-deal flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-deal font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || (requiresCaptcha && !captchaToken)}
                className={`${adminPrimaryButton} w-full`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              {/* Register Link */}
              <div className="text-center pt-4 border-t border-line mt-6">
                <p className="text-sm text-muted">
                  ¿No tienes cuenta?{' '}
                  <Link href="/registro" className="text-brand-600 font-bold hover:text-brand-700 transition-colors hover:underline">
                    Regístrate aquí
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-line mb-4 shadow-sm">
            <svg className="animate-spin h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-muted text-sm font-medium">Cargando...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
