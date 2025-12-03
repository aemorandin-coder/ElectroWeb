'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import EpicTooltip from '@/components/EpicTooltip';

const COUNTRY_CODES = [
  { code: '+58', country: 'Venezuela', iso: 've' },
  { code: '+1', country: 'USA', iso: 'us' },
  { code: '+57', country: 'Colombia', iso: 'co' },
  { code: '+55', country: 'Brasil', iso: 'br' },
  { code: '+34', country: 'España', iso: 'es' },
  { code: '+507', country: 'Panamá', iso: 'pa' },
  { code: '+56', country: 'Chile', iso: 'cl' },
  { code: '+54', country: 'Argentina', iso: 'ar' },
  { code: '+51', country: 'Perú', iso: 'pe' },
  { code: '+593', country: 'Ecuador', iso: 'ec' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    isBusiness: false,
  });
  const [countryCode, setCountryCode] = useState('+58');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [companySettings, setCompanySettings] = useState<{
    companyName: string;
    logo: string | null;
    tagline: string | null;
  } | null>(null);

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
      .catch(err => console.error('Error loading company settings:', err));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const calculatePasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 6) strength += 20;
    if (pass.length >= 10) strength += 20;
    if (/[A-Z]/.test(pass)) strength += 20;
    if (/[0-9]/.test(pass)) strength += 20;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 20;
    return strength;
  };

  const validateField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'name':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu nombre completo';
        if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
        return '';

      case 'email':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu correo electrónico';
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(value)) return 'Ingresa un correo electrónico válido';
        return '';

      case 'phone':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu número de teléfono';
        if (value.trim().length < 7) return 'Ingresa un número de teléfono válido';
        return '';

      case 'password':
        if (!value || value === '') return 'Por favor, ingresa una contraseña';
        if (value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
        return '';

      case 'confirmPassword':
        if (!value || value === '') return 'Por favor, confirma tu contraseña';
        if (value !== formData.password) return 'Las contraseñas no coinciden';
        return '';

      case 'acceptTerms':
        if (!value) return 'Debes aceptar los términos para continuar';
        return '';

      default:
        return '';
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, formData[fieldName as keyof typeof formData]);
    setValidationErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    // Name validation: No numbers allowed
    if (name === 'name') {
      if (/\d/.test(value)) return; // Ignore if contains numbers
    }

    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value as string));
    }

    // Clear validation error when user starts typing
    if (touchedFields[name]) {
      const error = validateField(name, newValue);
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }

    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate fields in order and show only the FIRST error
    const allFields = ['name', 'email', 'phone', 'password', 'confirmPassword', 'acceptTerms'];
    let firstError: { field: string; message: string } | null = null;

    for (const field of allFields) {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error && !firstError) {
        firstError = { field, message: error };
        break; // Stop at first error
      }
    }

    // If there's an error, show only that one
    if (firstError) {
      setTouchedFields({ [firstError.field]: true });
      setValidationErrors({ [firstError.field]: firstError.message });
      setError('Por favor, corrige el error en el formulario.');
      return;
    }

    // Clear all errors if validation passes
    setTouchedFields({});
    setValidationErrors({});

    setIsLoading(true);

    try {
      // Register user
      const fullPhone = `${countryCode} ${formData.phone}`;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: fullPhone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar usuario');
      }

      // Auto login after registration
      const result = await signIn('unified-credentials', {
        email: formData.email,
        password: formData.password,
        userType: 'customer',
        redirect: false,
      });

      if (result?.error) {
        setError('Cuenta creada exitosamente, pero hubo un error al iniciar sesión. Por favor, inicia sesión manualmente.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else if (result?.ok) {
        // Wait a bit for session to be established
        await new Promise(resolve => setTimeout(resolve, 200));
        // Redirect to profile if they wanted business account, else home
        window.location.href = formData.isBusiness ? '/customer/profile?tab=business' : '/';
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Error al registrar usuario. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const companyName = companySettings?.companyName || 'Electro Shop Morandin';
  const companyNameParts = companyName.split(' ');
  const firstName = companyNameParts[0] || 'Electro Shop';
  const restName = companyNameParts.slice(1).join(' ') || 'Morandin';

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 py-12 relative overflow-hidden">
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

      {/* Animated Background Elements - Matching Homepage Hero */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern Overlay - Using CSS class instead of missing SVG */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-[500px] relative z-10">
        {/* Logo and Brand Section */}
        <div className="text-center mb-8 animate-fadeIn">
          {companySettings?.logo ? (
            <div className="relative w-40 h-40 mx-auto mb-6 animate-scaleIn drop-shadow-2xl filter brightness-110">
              <Image
                src={companySettings.logo}
                alt={companyName}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md mb-6 shadow-2xl border border-white/30 animate-scaleIn">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
          <h1 className="text-4xl font-black text-white tracking-tight mb-3 drop-shadow-lg font-[family-name:var(--font-tektur)]">
            {firstName} <span className="text-cyan-200">{restName}</span>
          </h1>
          <p className="text-white/90 text-base font-medium w-full mx-auto leading-relaxed">
            Únete a la plataforma líder en tecnología y electrónica.
          </p>
        </div>

        {/* Register Card - Premium Glass Effect matching Homepage Hero Cards */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-slideInUp">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Crear Cuenta</h2>
              <p className="text-blue-100 text-sm">Completa tus datos para comenzar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Nombre Completo
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={() => handleBlur('name')}
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200"
                    placeholder="Ej. Juan Pérez"
                    disabled={isLoading}
                  />
                  <EpicTooltip
                    message={validationErrors.name || ''}
                    visible={touchedFields.name && !!validationErrors.name}
                    position="bottom"
                  />
                </div>
              </div>

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
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200"
                    placeholder="ejemplo@correo.com"
                    disabled={isLoading}
                  />
                  <EpicTooltip
                    message={validationErrors.email || ''}
                    visible={touchedFields.email && !!validationErrors.email}
                    position="bottom"
                  />
                </div>
              </div>

              {/* Phone Field with Country Picker */}
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Teléfono
                </label>
                <div className="flex gap-2">
                  {/* Country Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="h-full px-3 bg-white/10 border border-white/20 rounded-xl text-white flex items-center gap-2 hover:bg-white/20 transition-all min-w-[100px]"
                    >
                      <div className="relative w-6 h-4 shadow-sm rounded-sm overflow-hidden">
                        <Image
                          src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                          alt={selectedCountry.country}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-sm font-medium">{selectedCountry.code}</span>
                      <svg className={`w-3 h-3 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-56 max-h-60 overflow-y-auto bg-[#1e293b] border border-white/10 rounded-xl shadow-xl z-50 backdrop-blur-xl custom-scrollbar">
                        {COUNTRY_CODES.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setCountryCode(country.code);
                              setShowCountryDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                          >
                            <div className="relative w-6 h-4 shadow-sm rounded-sm overflow-hidden flex-shrink-0">
                              <Image
                                src={`https://flagcdn.com/w40/${country.iso}.png`}
                                alt={country.country}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <span className="text-sm text-white flex-1 truncate">{country.country}</span>
                            <span className="text-xs text-blue-200 font-mono">{country.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone Input */}
                  <div className="relative group flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors duration-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={() => handleBlur('phone')}
                      autoComplete="tel"
                      className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200"
                      placeholder="412 1234567"
                      disabled={isLoading}
                    />
                    <EpicTooltip
                      message={validationErrors.phone || ''}
                      visible={touchedFields.phone && !!validationErrors.phone}
                      position="bottom"
                    />
                  </div>
                </div>

                {/* Epic Tooltip for Shipping Info */}
                <div className="relative mt-2 group/tooltip">
                  <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg backdrop-blur-sm hover:bg-cyan-500/20 transition-colors cursor-help">
                    <svg className="w-4 h-4 text-cyan-300 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-cyan-100 font-medium">
                      Información de envío internacional
                    </p>
                  </div>

                  {/* Tooltip Popup */}
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-[#1e293b] border border-cyan-500/30 rounded-xl shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-300 pointer-events-none z-50 backdrop-blur-xl">
                    <div className="absolute -bottom-1 left-6 w-2 h-2 bg-[#1e293b] border-b border-r border-cyan-500/30 transform rotate-45"></div>
                    <p className="text-xs text-blue-100 leading-relaxed">
                      Puedes registrar números internacionales, pero actualmente solo realizamos envíos dentro de <span className="font-bold text-cyan-300">Venezuela 🇻🇪</span>.
                      <br /><br />
                      ¡Estamos trabajando para expandirnos a más países pronto!
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Field with Strength Meter */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    autoComplete="new-password"
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
                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-medium text-blue-200">Seguridad</span>
                      <span className={`text-[10px] font-medium ${passwordStrength < 40 ? 'text-red-300' :
                        passwordStrength < 80 ? 'text-yellow-300' : 'text-green-300'
                        }`}>
                        {passwordStrength < 40 ? 'Débil' : passwordStrength < 80 ? 'Media' : 'Fuerte'}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength < 40 ? 'bg-red-400' :
                          passwordStrength < 80 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                  Confirmar Contraseña
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    autoComplete="new-password"
                    className={`w-full pl-11 pr-10 py-3 bg-white/10 border rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:ring-1 transition-all duration-200 ${formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 focus:border-white/40 focus:ring-white/40'
                      }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition-colors duration-200"
                  >
                    {showConfirmPassword ? (
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
                    message={validationErrors.confirmPassword || ''}
                    visible={touchedFields.confirmPassword && !!validationErrors.confirmPassword}
                    position="bottom"
                  />
                </div>
              </div>

              {/* Terms and Business Toggle */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                      onBlur={() => handleBlur('acceptTerms')}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/30 bg-white/10 checked:border-white checked:bg-white transition-all"
                    />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#2a63cd] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <EpicTooltip
                      message={validationErrors.acceptTerms || ''}
                      visible={touchedFields.acceptTerms && !!validationErrors.acceptTerms}
                      position="right"
                    />
                  </div>
                  <span className="text-sm text-blue-100 group-hover:text-white transition-colors">
                    Acepto los <Link href="/terminos" className="text-white font-semibold hover:underline">Términos y Condiciones</Link> y la Política de Privacidad.
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      name="isBusiness"
                      checked={formData.isBusiness}
                      onChange={handleChange}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/30 bg-white/10 checked:border-cyan-400 checked:bg-cyan-400 transition-all"
                    />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#1a3b7e] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-blue-100 group-hover:text-white transition-colors">
                    Quiero registrar una <span className="text-cyan-200 font-bold">Cuenta Empresarial</span> (Jurídica).
                  </span>
                </label>
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
                disabled={isLoading}
                className="group relative w-full bg-white text-[#2a63cd] font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-base">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-[#2a63cd]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creando tu cuenta...</span>
                    </>
                  ) : (
                    <>
                      <span>Comenzar Ahora</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Login Link */}
              <div className="text-center pt-2 border-t border-white/10 mt-6">
                <p className="text-sm text-blue-100">
                  ¿Ya tienes una cuenta?{' '}
                  <Link href="/login" className="text-white font-bold hover:text-cyan-200 transition-colors hover:underline">
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-blue-200/80">
            &copy; {new Date().getFullYear()} {companyName}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
