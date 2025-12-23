'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiUser, FiMail, FiPhone, FiPackage, FiDollarSign, FiClock, FiCheck, FiShield, FiTruck } from 'react-icons/fi';
import { IoMdPricetags } from 'react-icons/io';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';
import AnimatedWave from '@/components/AnimatedWave';

const categories = [
  'Gaming',
  'Laptops',
  'Componentes',
  'Periféricos',
  'CCTV',
  'Consolas',
  'Accesorios',
  'Otro'
];

interface ValidationErrors {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productName?: string;
  productDescription?: string;
  category?: string;
}

export default function SolicitarProductoClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    productName: '',
    productDescription: '',
    category: '',
    estimatedBudget: '',
    urgency: 'normal' as 'low' | 'normal' | 'high',
  });

  // AutoFocus on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case 'customerName':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu nombre';
        if (value.length < 2) return 'El nombre debe tener al menos 2 caracteres';
        const commaCount = (value.match(/,/g) || []).length;
        if (commaCount > 1) return 'Solo se permite una coma';
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,]+$/;
        if (!nameRegex.test(value)) return 'Solo se permiten letras';
        return '';

      case 'customerEmail':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu email';
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(value)) return 'Ingresa un email válido';
        return '';

      case 'customerPhone':
        if (!value || value.trim() === '') return 'Por favor, ingresa tu teléfono';
        if (value.length < 7) return 'Mínimo 7 dígitos';
        return '';

      case 'productName':
        if (!value || value.trim() === '') return 'Ingresa el nombre del producto';
        return '';

      case 'productDescription':
        if (!value || value.trim() === '') return 'Describe el producto que buscas';
        if (value.length < 10) return 'Mínimo 10 caracteres';
        return '';

      case 'category':
        if (!value || value === '') return 'Selecciona una categoría';
        return '';

      default:
        return '';
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, formData[fieldName as keyof typeof formData] as string);
    setValidationErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Validation for name field
    if (name === 'customerName') {
      const commaCount = (value.match(/,/g) || []).length;
      if (commaCount > 1) return;
      const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,]*$/;
      if (!nameRegex.test(value)) return;
    }

    // Validation for phone field - only numbers, max 11 digits
    if (name === 'customerPhone') {
      const numbersOnly = value.replace(/[^0-9]/g, '');
      if (numbersOnly.length > 11) return;
      setFormData(prev => ({ ...prev, [name]: numbersOnly }));
      if (touchedFields[name]) {
        const error = validateField(name, numbersOnly);
        setValidationErrors(prev => ({ ...prev, [name]: error }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (touchedFields[name]) {
      const error = validateField(name, value);
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check CAPTCHA
    if (!captchaToken) {
      setError('Por favor, completa la verificación de seguridad.');
      return;
    }

    // Validate all required fields
    const requiredFields = ['customerName', 'customerEmail', 'customerPhone', 'productName', 'productDescription', 'category'];
    const errors: ValidationErrors = {};

    for (const field of requiredFields) {
      const error = validateField(field, formData[field as keyof typeof formData] as string);
      if (error) {
        errors[field as keyof ValidationErrors] = error;
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setTouchedFields(requiredFields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/product-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          captchaToken
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar la solicitud');
      }

      setSuccess(true);
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        productName: '',
        productDescription: '',
        category: '',
        estimatedBudget: '',
        urgency: 'normal',
      });

      setTimeout(() => {
        router.push('/');
      }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Epic Hero Section */}
      <section className="relative bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-3 mb-6 animate-fadeIn">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-sm font-semibold text-white">Servicio Personalizado</span>
            </div>
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight animate-slideInUp">
            Solicitar <span className="text-cyan-200">Producto</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-4xl mx-auto mb-8 animate-slideInUp text-center" style={{ animationDelay: '0.1s' }}>
            ¿No encuentras lo que buscas? Cuéntanos qué necesitas y te lo conseguimos al mejor precio.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all">
              <FiShield className="w-4 h-4 text-cyan-300" />
              <span className="text-sm text-white font-medium">100% Seguro</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all">
              <FiTruck className="w-4 h-4 text-cyan-300" />
              <span className="text-sm text-white font-medium">Envío Nacional</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all">
              <IoMdPricetags className="w-4 h-4 text-cyan-300" />
              <span className="text-sm text-white font-medium">Mejores Precios</span>
            </div>
          </div>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>

      {/* Main Content */}
      <main className="bg-white max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10">
        {success ? (
          /* Success State - Epic Design */
          <div className="bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-3xl shadow-2xl p-10 text-center relative overflow-hidden animate-scaleIn">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl"></div>

            <div className="relative">
              <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30 animate-bounce">
                <FiCheck className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">¡Solicitud Enviada!</h2>
              <p className="text-blue-200/90 text-lg mb-4 max-w-md mx-auto">
                Hemos recibido tu solicitud y nuestro equipo ya está buscando las mejores opciones para ti.
              </p>
              <p className="text-white/60 text-sm mb-8">
                Te contactaremos en las próximas 24-48 horas • Serás redirigido al inicio...
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/')}
                  className="px-8 py-3 bg-white text-[#2a63cd] font-bold rounded-xl hover:scale-105 transition-all shadow-lg"
                >
                  Ir al Inicio
                </button>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-8 py-3 bg-white/10 text-white font-bold rounded-xl border border-white/20 hover:bg-white/20 transition-all"
                >
                  Nueva Solicitud
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section - 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl"></div>

                <div className="relative">
                  <h2 className="text-2xl font-black text-white mb-2">
                    Completa tu Solicitud
                  </h2>
                  <p className="text-blue-200/70 mb-6 text-sm">
                    Mientras más detalles nos des, mejor podremos ayudarte
                  </p>

                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-shake">
                      <div className="flex items-center gap-2 text-red-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold">{error}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Contact Section Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <FiUser className="w-4 h-4 text-cyan-300" />
                      </div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider">Información de Contacto</span>
                    </div>

                    {/* Name Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label htmlFor="customerName" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                          Nombre Completo
                        </label>
                        <span className="text-[10px] text-blue-200/60">(Solo letras)</span>
                      </div>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                          <FiUser className="w-5 h-5" />
                        </div>
                        <input
                          ref={nameInputRef}
                          type="text"
                          id="customerName"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleChange}
                          onBlur={() => handleBlur('customerName')}
                          className={`w-full pl-11 pr-4 py-3 bg-white/10 border ${touchedFields.customerName && validationErrors.customerName ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all`}
                          placeholder="Tu nombre completo"
                        />
                        {touchedFields.customerName && validationErrors.customerName && (
                          <p className="text-xs text-red-400 mt-1">{validationErrors.customerName}</p>
                        )}
                      </div>
                    </div>

                    {/* Email & Phone Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="customerEmail" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                          Email
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                            <FiMail className="w-5 h-5" />
                          </div>
                          <input
                            type="email"
                            id="customerEmail"
                            name="customerEmail"
                            value={formData.customerEmail}
                            onChange={handleChange}
                            onBlur={() => handleBlur('customerEmail')}
                            className={`w-full pl-11 pr-4 py-3 bg-white/10 border ${touchedFields.customerEmail && validationErrors.customerEmail ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all`}
                            placeholder="tu@email.com"
                          />
                          {touchedFields.customerEmail && validationErrors.customerEmail && (
                            <p className="text-xs text-red-400 mt-1">{validationErrors.customerEmail}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <label htmlFor="customerPhone" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                            Teléfono
                          </label>
                          <span className="text-[10px] text-blue-200/60">(Solo números)</span>
                        </div>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                            <FiPhone className="w-5 h-5" />
                          </div>
                          <input
                            type="tel"
                            id="customerPhone"
                            name="customerPhone"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={11}
                            value={formData.customerPhone}
                            onChange={handleChange}
                            onBlur={() => handleBlur('customerPhone')}
                            className={`w-full pl-11 pr-4 py-3 bg-white/10 border ${touchedFields.customerPhone && validationErrors.customerPhone ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all`}
                            placeholder="04121234567"
                          />
                          {touchedFields.customerPhone && validationErrors.customerPhone && (
                            <p className="text-xs text-red-400 mt-1">{validationErrors.customerPhone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Product Section Header */}
                    <div className="flex items-center gap-2 mt-6 mb-2 pt-4 border-t border-white/10">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <FiPackage className="w-4 h-4 text-cyan-300" />
                      </div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider">Detalles del Producto</span>
                    </div>

                    {/* Product Name & Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="productName" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                          Nombre del Producto
                        </label>
                        <input
                          type="text"
                          id="productName"
                          name="productName"
                          value={formData.productName}
                          onChange={handleChange}
                          onBlur={() => handleBlur('productName')}
                          className={`w-full px-4 py-3 bg-white/10 border ${touchedFields.productName && validationErrors.productName ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all`}
                          placeholder="Ej: RTX 4090, MacBook Pro M3"
                        />
                        {touchedFields.productName && validationErrors.productName && (
                          <p className="text-xs text-red-400 mt-1">{validationErrors.productName}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="category" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                          Categoría
                        </label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          onBlur={() => handleBlur('category')}
                          className={`w-full px-4 py-3 bg-white/10 border ${touchedFields.category && validationErrors.category ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all appearance-none cursor-pointer`}
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="" className="bg-slate-800">Selecciona categoría</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                          ))}
                        </select>
                        {touchedFields.category && validationErrors.category && (
                          <p className="text-xs text-red-400 mt-1">{validationErrors.category}</p>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label htmlFor="productDescription" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                        Descripción Detallada
                      </label>
                      <textarea
                        id="productDescription"
                        name="productDescription"
                        value={formData.productDescription}
                        onChange={handleChange}
                        onBlur={() => handleBlur('productDescription')}
                        rows={4}
                        className={`w-full px-4 py-3 bg-white/10 border ${touchedFields.productDescription && validationErrors.productDescription ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all resize-none`}
                        placeholder="Describe las características específicas: modelo, especificaciones, marca preferida..."
                      />
                      {touchedFields.productDescription && validationErrors.productDescription && (
                        <p className="text-xs text-red-400 mt-1">{validationErrors.productDescription}</p>
                      )}
                    </div>

                    {/* Budget & Urgency */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="estimatedBudget" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                          Presupuesto <span className="text-blue-200/50">(Opcional)</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50">
                            <FiDollarSign className="w-5 h-5" />
                          </div>
                          <input
                            type="text"
                            id="estimatedBudget"
                            name="estimatedBudget"
                            value={formData.estimatedBudget}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                            placeholder="$500 - $1000"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="urgency" className="block text-xs font-bold text-blue-100 uppercase tracking-wider">
                          Urgencia
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50">
                            <FiClock className="w-5 h-5" />
                          </div>
                          <select
                            id="urgency"
                            name="urgency"
                            value={formData.urgency}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all appearance-none cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                          >
                            <option value="low" className="bg-slate-800">Baja - Puedo esperar</option>
                            <option value="normal" className="bg-slate-800">Normal - Unas semanas</option>
                            <option value="high" className="bg-slate-800">Alta - Lo necesito pronto</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* hCaptcha */}
                    <div className="flex justify-center pt-4">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <HCaptchaWrapper
                          sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                          onVerify={handleCaptchaVerify}
                          onExpire={handleCaptchaExpire}
                          ref={captchaRef}
                          theme="dark"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading || !captchaToken}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#2a63cd] font-bold rounded-xl hover:bg-white/90 hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Enviando solicitud...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Enviar Solicitud
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Info Section - 1 column */}
            <div className="space-y-6">
              {/* How it works */}
              <div className="bg-gradient-to-br from-[#2a63cd]/10 to-[#1e4ba3]/10 rounded-2xl border border-[#2a63cd]/20 p-6">
                <h3 className="text-lg font-bold text-[#212529] mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#2a63cd] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  ¿Cómo funciona?
                </h3>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Envía tu solicitud', desc: 'Describe el producto que buscas' },
                    { step: '2', title: 'Buscamos opciones', desc: 'Investigamos los mejores precios' },
                    { step: '3', title: 'Te contactamos', desc: 'Te enviamos una cotización' },
                    { step: '4', title: 'Procesamos tu pedido', desc: 'Gestionamos la compra por ti' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#2a63cd] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <p className="font-semibold text-[#212529] text-sm">{item.title}</p>
                        <p className="text-xs text-[#6a6c6b]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guarantee */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <FiShield className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-emerald-800">Garantía de Servicio</h3>
                </div>
                <p className="text-sm text-emerald-700">
                  Nos comprometemos a encontrar el mejor precio del mercado. Si consigues un precio menor, ¡lo igualamos!
                </p>
              </div>

              {/* Contact */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <p className="text-sm text-[#6a6c6b] mb-3">¿Tienes dudas? Contáctanos:</p>
                <a
                  href="https://wa.me/584121234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all hover:scale-[1.02] font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Chatea con Nosotros
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
