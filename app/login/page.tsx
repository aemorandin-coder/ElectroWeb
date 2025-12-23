'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import EpicTooltip from '@/components/EpicTooltip';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';

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
  const [companySettings, setCompanySettings] = useState<{
    companyName: string;
    logo: string | null;
    tagline: string | null;
  } | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Captcha state
  const captchaRef = useRef<any>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);

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

  // Load company settings
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        setCompanySettings({
          companyName: data.companyName || 'Electro Shop Morandin',
          logo: data.logo,
          tagline: data.tagline,
        });
      })
      .catch(err => console.error('Error loading company settings:', err))
      .finally(() => setSettingsLoaded(true));
  }, []);

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

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 mb-4 shadow-2xl animate-pulse">
            <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-white/80 text-sm font-medium">Verificando sesión...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 py-4 relative overflow-hidden">
      {/* Back to Home Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 rounded-full text-white text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al inicio
      </Link>

      {/* Animated Background Elements - Matching Registration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-[450px] relative z-10 -mt-[10%]">
        {/* Logo Section - Only Logo, no text */}
        <div className="text-center mb-4 animate-fadeIn">
          {!settingsLoaded ? (
            /* Loading skeleton while settings load */
            <div className="relative w-36 h-36 mx-auto animate-pulse">
              <div className="w-full h-full bg-white/20 rounded-2xl" />
            </div>
          ) : companySettings?.logo ? (
            <div className="relative w-36 h-36 mx-auto animate-scaleIn drop-shadow-2xl filter brightness-110">
              <Image
                src={companySettings.logo}
                alt={companyName}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            /* Fallback: shopping bag icon instead of lightning bolt */
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md shadow-2xl border border-white/30 animate-scaleIn">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          )}
        </div>

        {/* Login Card - Premium Glass Effect */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-slideInUp">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Iniciar Sesión</h2>
              <p className="text-blue-100 text-sm">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => handleBlur('email', email)}
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200"
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
                  <label htmlFor="password" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <Link
                    href="/recuperar-contrasena"
                    className="text-xs text-blue-200 hover:text-white transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={() => handleBlur('password', password)}
                    autoComplete={userType === 'admin' ? 'current-password' : 'password'}
                    className="w-full pl-11 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition-colors duration-200"
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
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20">
                    <svg className="w-3 h-3 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-xs text-amber-200">
                    Verificación de seguridad requerida
                  </p>
                </div>
                <div className="flex justify-center rounded-xl overflow-hidden bg-white/5 p-2">
                  <HCaptchaWrapper
                    sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                    onVerify={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                    ref={captchaRef}
                    theme="dark"
                    size={requiresCaptcha ? 'normal' : 'invisible'}
                  />
                </div>
                {captchaToken && (
                  <div className="flex items-center gap-1.5 text-xs text-green-300">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verificación completada
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl animate-shake backdrop-blur-sm">
                  <svg className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-100 font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || (requiresCaptcha && !captchaToken)}
                className="group relative w-full bg-white text-[#2a63cd] font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-base">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-[#2a63cd]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <span>Iniciar Sesión</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Register Link */}
              <div className="text-center pt-2 border-t border-white/10 mt-6">
                <p className="text-sm text-blue-100">
                  ¿No tienes cuenta?{' '}
                  <Link href="/registro" className="text-white font-bold hover:text-cyan-200 transition-colors hover:underline">
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
      <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 mb-4 shadow-2xl animate-pulse">
            <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-white/80 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
