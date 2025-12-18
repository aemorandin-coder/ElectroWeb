'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import EpicTooltip from '@/components/EpicTooltip';
import HCaptcha from '@hcaptcha/react-hcaptcha';

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
    idNumber: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [countryCode, setCountryCode] = useState('+58');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
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
        // Validate: only letters, spaces, and ONE comma allowed
        const commaCount = (value.match(/,/g) || []).length;
        if (commaCount > 1) return 'Solo se permite una coma para separar apellidos';
        // Check for invalid characters (anything that's not a letter, space, accent, or comma)
        const nameRegex = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s,]+$/;
        if (!nameRegex.test(value)) return 'Solo letras y una coma son permitidos';
        return '';

      case 'idNumber':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu cédula';
        // Venezuelan cedula format: V-12345678, E-12345678, J-12345678, P-12345678
        // Also accept without dash: V12345678
        const cedulaRegex = /^[VEJPvejp]-?\d{5,10}$/;
        if (!cedulaRegex.test(value.trim())) {
          return 'Formato: V-12345678 (V, E, J o P seguido de 5-10 dígitos)';
        }
        return '';

      case 'email':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu correo electrónico';
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(value)) return 'Ingresa un correo electrónico válido';
        return '';

      case 'phone':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu número de teléfono';
        // Only validate digits
        const digitsOnly = value.replace(/\D/g, '');
        if (digitsOnly.length < 10) return 'El teléfono debe tener al menos 10 dígitos';
        if (digitsOnly.length > 11) return 'El teléfono no puede tener más de 11 dígitos';
        // Venezuelan phone validation: should start with 04 (mobile)
        if (countryCode === '+58' && !digitsOnly.startsWith('04') && !digitsOnly.startsWith('4')) {
          return 'En Venezuela, el teléfono móvil debe comenzar con 04';
        }
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

  // Handler to clear tooltip after auto-hide
  const handleTooltipHide = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: false }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    // Name validation: Only letters, spaces, accents, and ONE comma allowed
    if (name === 'name') {
      // Count commas in the new value
      const commaCount = (value.match(/,/g) || []).length;
      // Check if last character is invalid
      const lastChar = value.slice(-1);
      const isValidChar = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s,]$/.test(lastChar) || lastChar === '';

      // Reject if trying to add more than one comma or invalid character
      if (commaCount > 1 || !isValidChar) {
        return;
      }
    }

    // Phone validation: Only numbers, max 11 characters
    if (name === 'phone') {
      // Only allow digits
      if (value && !/^\d*$/.test(value)) {
        return;
      }
      // Max 11 characters
      if (value.length > 11) {
        return;
      }
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

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check CAPTCHA first
    if (!captchaToken) {
      setError('Por favor, completa la verificación de seguridad.');
      return;
    }

    // Validate fields in order and show only the FIRST error
    const allFields = ['name', 'idNumber', 'email', 'phone', 'password', 'confirmPassword', 'acceptTerms'];
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
          idNumber: formData.idNumber,
          phone: fullPhone,
          password: formData.password,
          captchaToken,
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
        // Redirect to home
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Error al registrar usuario. Intente nuevamente.');
      // Reset captcha on error
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const companyName = companySettings?.companyName || 'Electro Shop Morandin';

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] flex items-center justify-center px-4 py-6 relative overflow-hidden">
      {/* Back to Login Button */}
      <Link
        href="/login"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 rounded-full text-white text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver atrás
      </Link>

      {/* Animated Background Elements - Matching Homepage Hero */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern Overlay - Using CSS class instead of missing SVG */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-[700px] relative z-10">

        {/* Logo Section */}
        <div className="text-center mb-4 animate-fadeIn">
          {companySettings?.logo ? (
            <div className="relative w-28 h-28 mx-auto animate-scaleIn drop-shadow-2xl filter brightness-110">
              <Image
                src={companySettings.logo}
                alt={companyName}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md shadow-2xl border border-white/30 animate-scaleIn">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Register Card - Premium Glass Effect matching Homepage Hero Cards */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-slideInUp">
          <div className="p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Crear Cuenta</h2>
              <p className="text-blue-100 text-sm">Completa tus datos para comenzar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Name + ID Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label htmlFor="name" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                      Nombre Completo
                    </label>
                    {/* Info Tooltip for Name Format */}
                    <div className="relative group/info">
                      <button type="button" className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-200 flex items-center justify-center text-xs font-bold hover:bg-cyan-500/50 transition-colors">
                        ?
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#1e293b] border border-cyan-500/30 rounded-xl shadow-2xl opacity-0 group-hover/info:opacity-100 transition-opacity duration-300 pointer-events-none z-50 backdrop-blur-xl">
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1e293b] border-b border-r border-cyan-500/30 transform rotate-45"></div>
                        <p className="text-xs text-blue-100 leading-relaxed">
                          <span className="font-bold text-cyan-300">Formato:</span> Nombre Apellido<br />
                          <span className="text-white/70">Puedes usar una coma para separar apellidos.</span><br />
                          <span className="text-cyan-200">Ej: Juan Pérez, García</span>
                        </p>
                      </div>
                    </div>
                  </div>
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
                      autoFocus
                      className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200 text-sm"
                      placeholder="Juan Pérez"
                      disabled={isLoading}
                    />
                    <EpicTooltip
                      message={validationErrors.name || ''}
                      visible={touchedFields.name && !!validationErrors.name}
                      position="bottom"
                      autoHideDelay={3000}
                      onHide={() => handleTooltipHide('name')}
                    />
                  </div>
                </div>

                {/* Cédula Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label htmlFor="idNumber" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                      Cédula
                    </label>
                    {/* Info Tooltip */}
                    <div className="relative group/info">
                      <button type="button" className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-200 flex items-center justify-center text-xs font-bold hover:bg-cyan-500/50 transition-colors">
                        ?
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#1e293b] border border-cyan-500/30 rounded-xl shadow-2xl opacity-0 group-hover/info:opacity-100 transition-opacity duration-300 pointer-events-none z-50 backdrop-blur-xl">
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1e293b] border-b border-r border-cyan-500/30 transform rotate-45"></div>
                        <p className="text-xs text-blue-100 leading-relaxed">
                          <span className="font-bold text-cyan-300">Formato:</span> V-12345678<br />
                          <span className="text-white/70">Prefijos válidos: V (venezolano), E (extranjero), J (jurídico), P (pasaporte)</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-white transition-colors duration-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <input
                      id="idNumber"
                      name="idNumber"
                      type="text"
                      value={formData.idNumber}
                      onChange={handleChange}
                      onBlur={() => handleBlur('idNumber')}
                      className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200 text-sm uppercase"
                      placeholder="V-12345678"
                      disabled={isLoading}
                    />
                    <EpicTooltip
                      message={validationErrors.idNumber || ''}
                      visible={touchedFields.idNumber && !!validationErrors.idNumber}
                      position="bottom"
                      autoHideDelay={3000}
                      onHide={() => handleTooltipHide('idNumber')}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200 text-sm"
                      placeholder="correo@ejemplo.com"
                      disabled={isLoading}
                    />
                    <EpicTooltip
                      message={validationErrors.email || ''}
                      visible={touchedFields.email && !!validationErrors.email}
                      position="bottom"
                      autoHideDelay={3000}
                      onHide={() => handleTooltipHide('email')}
                    />
                  </div>
                </div>

                {/* Phone Field with Country Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label htmlFor="phone" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                      Teléfono WhatsApp
                    </label>
                    {/* WhatsApp indicator */}
                    <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div className="flex gap-2">
                    {/* Country Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="h-full px-2 bg-white/10 border border-white/20 rounded-xl text-white flex items-center gap-1.5 hover:bg-white/20 transition-all min-w-[80px]"
                      >
                        <div className="relative w-5 h-3.5 shadow-sm rounded-sm overflow-hidden">
                          <Image
                            src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                            alt={selectedCountry.country}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-xs font-medium">{selectedCountry.code}</span>
                        <svg className={`w-2.5 h-2.5 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={11}
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={() => handleBlur('phone')}
                        autoComplete="tel"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200 text-sm"
                        placeholder="4121234567"
                        disabled={isLoading}
                      />
                      <EpicTooltip
                        message={validationErrors.phone || ''}
                        visible={touchedFields.phone && !!validationErrors.phone}
                        position="bottom"
                        autoHideDelay={3000}
                        onHide={() => handleTooltipHide('phone')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Password + Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password Field */}
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
                      className="w-full pl-11 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all duration-200 text-sm"
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
                      autoHideDelay={3000}
                      onHide={() => handleTooltipHide('password')}
                    />
                  </div>
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
                      className={`w-full pl-11 pr-10 py-3 bg-white/10 border rounded-xl text-white placeholder:text-blue-200/50 focus:outline-none focus:bg-white/20 focus:ring-1 transition-all duration-200 text-sm ${formData.confirmPassword && formData.password !== formData.confirmPassword
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
                      autoHideDelay={3000}
                      onHide={() => handleTooltipHide('confirmPassword')}
                    />
                  </div>
                </div>
              </div>

              {/* Password Strength Meter - Full Width */}
              {formData.password && (
                <div className="mt-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-medium text-blue-200">Seguridad de contraseña</span>
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

              {/* Terms and Conditions - Centered */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-center gap-3 cursor-pointer group">
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
                      autoHideDelay={3000}
                      onHide={() => handleTooltipHide('acceptTerms')}
                    />
                  </div>
                  <span className="text-sm text-blue-100 group-hover:text-white transition-colors">
                    Acepto los <Link href="/terminos" className="text-white font-semibold hover:underline">Términos y Condiciones</Link> y la Política de Privacidad.
                  </span>
                </label>
              </div>

              {/* hCaptcha */}
              <div className="flex justify-center pt-2">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <HCaptcha
                    sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                    onVerify={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                    ref={captchaRef}
                    theme="dark"
                  />
                </div>
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
                disabled={isLoading || !captchaToken}
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
        <div className="mt-6 text-center">
          <p className="text-xs text-blue-200/80">
            &copy; {new Date().getFullYear()} {companyName}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
