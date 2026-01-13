'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiUser, FiMail, FiPhone, FiPackage, FiDollarSign, FiClock, FiCheck, FiShield, FiTruck, FiMonitor, FiCpu, FiHardDrive, FiSmartphone, FiHeadphones, FiWifi } from 'react-icons/fi';
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

const FloatingTechIcons = () => {
  const icons = [
    { Icon: FiMonitor, delay: '0s', position: 'top-8 left-10' },
    { Icon: FiCpu, delay: '0.5s', position: 'top-20 right-16' },
    { Icon: FiHardDrive, delay: '1s', position: 'bottom-12 left-20' },
    { Icon: FiSmartphone, delay: '1.5s', position: 'bottom-8 right-12' },
    { Icon: FiHeadphones, delay: '2s', position: 'top-1/2 left-8' },
    { Icon: FiWifi, delay: '2.5s', position: 'top-1/3 right-8' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
      {icons.map(({ Icon, delay, position }, i) => (
        <div
          key={i}
          className={`absolute ${position} animate-bounce`}
          style={{ animationDelay: delay, animationDuration: '3s' }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      ))}
    </div>
  );
};

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
        {/* Floating Icons Effect */}
        <FloatingTechIcons />

        {/* Animated Background Particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-3 mb-4 animate-fadeIn">
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-xs font-semibold text-white">Servicio Personalizado</span>
            </div>
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight animate-slideInUp">
            Solicitar <span className="text-cyan-200">Producto</span>
          </h1>
          <p className="text-sm md:text-lg text-white/90 max-w-4xl mx-auto mb-6 animate-slideInUp text-center" style={{ animationDelay: '0.1s' }}>
            ¿No encuentras lo que buscas? Cuéntanos qué necesitas y te lo conseguimos al mejor precio.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-2 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all">
              <FiShield className="w-3 h-3 text-cyan-300" />
              <span className="text-xs text-white font-medium">100% Seguro</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all">
              <FiTruck className="w-3 h-3 text-cyan-300" />
              <span className="text-xs text-white font-medium">Envío Nacional</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all">
              <IoMdPricetags className="w-3 h-3 text-cyan-300" />
              <span className="text-xs text-white font-medium">Mejores Precios</span>
            </div>
          </div>
        </div>

        {/* Animated Wave Divider */}
        <AnimatedWave />
      </section>

      {/* Main Content */}
      <main className="bg-white max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 lg:-mt-10">
        {success ? (
          /* Success State - Epic Design */
          <div className="bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-3xl shadow-2xl p-10 text-center relative overflow-hidden animate-scaleIn">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl"></div>

            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30 animate-bounce">
                <FiCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-4">¡Solicitud Enviada!</h2>
              <p className="text-blue-200/90 text-base mb-4 max-w-md mx-auto">
                Hemos recibido tu solicitud y nuestro equipo ya está buscando las mejores opciones para ti.
              </p>
              <p className="text-white/60 text-xs mb-8">
                Te contactaremos en las próximas 24-48 horas • Serás redirigido al inicio...
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2.5 bg-white text-[#2a63cd] font-bold rounded-xl hover:scale-105 transition-all shadow-lg text-sm"
                >
                  Ir al Inicio
                </button>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-6 py-2.5 bg-white/10 text-white font-bold rounded-xl border border-white/20 hover:bg-white/20 transition-all text-sm"
                >
                  Nueva Solicitud
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Form Section */}
            <div className="bg-gradient-to-br from-[#2a63cd] via-[#1e4ba3] to-[#1a3b7e] rounded-3xl shadow-2xl p-6 lg:p-8 relative overflow-hidden border border-white/10">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-300/10 rounded-full blur-2xl"></div>

              <div className="relative">
                <h2 className="text-xl font-black text-white mb-1 text-center">
                  Completa tu Solicitud
                </h2>
                <p className="text-blue-200/70 mb-6 text-[11px] text-center">
                  Mientras más detalles nos des, mejor podremos ayudarte
                </p>

                {error && (
                  <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-shake">
                    <div className="flex items-center gap-2 text-red-400">
                      <FiAlertCircle className="w-4 h-4" />
                      <span className="text-xs font-semibold">{error}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Contact Info Header */}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="h-px w-6 bg-white/10"></div>
                    <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-widest px-1">Contacto</span>
                    <div className="h-px w-6 bg-white/10"></div>
                  </div>

                  {/* Name & Email Grid - Side by side on mobile */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                          <FiUser className="w-3 h-3" />
                        </div>
                        <input
                          ref={nameInputRef}
                          type="text"
                          id="customerName"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleChange}
                          onBlur={() => handleBlur('customerName')}
                          className={`w-full pl-8 pr-2 py-2 bg-white/10 border ${touchedFields.customerName && validationErrors.customerName ? 'border-red-500/50' : 'border-white/20'} rounded-lg text-white text-[11px] placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all`}
                          placeholder="Nombre"
                        />
                      </div>
                      {touchedFields.customerName && validationErrors.customerName && (
                        <p className="text-[9px] text-red-400 text-center">{validationErrors.customerName}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                          <FiMail className="w-3 h-3" />
                        </div>
                        <input
                          type="email"
                          id="customerEmail"
                          name="customerEmail"
                          value={formData.customerEmail}
                          onChange={handleChange}
                          onBlur={() => handleBlur('customerEmail')}
                          className={`w-full pl-8 pr-2 py-2 bg-white/10 border ${touchedFields.customerEmail && validationErrors.customerEmail ? 'border-red-500/50' : 'border-white/20'} rounded-lg text-white text-[11px] placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all`}
                          placeholder="Email"
                        />
                      </div>
                      {touchedFields.customerEmail && validationErrors.customerEmail && (
                        <p className="text-[9px] text-red-400 text-center">{validationErrors.customerEmail}</p>
                      )}
                    </div>
                  </div>

                  {/* Phone Field - Full width */}
                  <div className="space-y-1">
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                        <FiPhone className="w-3 h-3" />
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
                        className={`w-full pl-8 pr-2 py-2 bg-white/10 border ${touchedFields.customerPhone && validationErrors.customerPhone ? 'border-red-500/50' : 'border-white/20'} rounded-lg text-white text-[11px] placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all`}
                        placeholder="Teléfono (04XX-XXXXXXX)"
                      />
                    </div>
                    {touchedFields.customerPhone && validationErrors.customerPhone && (
                      <p className="text-[9px] text-red-400 text-center">{validationErrors.customerPhone}</p>
                    )}
                  </div>

                  {/* Product Info Header */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="h-px w-8 bg-white/10"></div>
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest px-2">Producto</span>
                    <div className="h-px w-8 bg-white/10"></div>
                  </div>

                  {/* Product Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                          <FiPackage className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          id="productName"
                          name="productName"
                          value={formData.productName}
                          onChange={handleChange}
                          onBlur={() => handleBlur('productName')}
                          className={`w-full pl-12 pr-4 py-2.5 bg-white/10 border ${touchedFields.productName && validationErrors.productName ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white text-xs placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all text-center`}
                          placeholder="Nombre del Producto"
                        />
                      </div>
                      {touchedFields.productName && validationErrors.productName && (
                        <p className="text-[10px] text-red-400 text-center">{validationErrors.productName}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        onBlur={() => handleBlur('category')}
                        className={`w-full px-4 py-2.5 bg-white/10 border ${touchedFields.category && validationErrors.category ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white text-xs focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all appearance-none cursor-pointer text-center`}
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="" className="bg-slate-800">Selecciona categoría</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                        ))}
                      </select>
                      {touchedFields.category && validationErrors.category && (
                        <p className="text-[10px] text-red-400 text-center">{validationErrors.category}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <textarea
                      id="productDescription"
                      name="productDescription"
                      value={formData.productDescription}
                      onChange={handleChange}
                      onBlur={() => handleBlur('productDescription')}
                      rows={2}
                      className={`w-full px-4 py-2.5 bg-white/10 border ${touchedFields.productDescription && validationErrors.productDescription ? 'border-red-500/50' : 'border-white/20'} rounded-xl text-white text-xs placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all resize-none text-center`}
                      placeholder="Descripción Detallada (modelo, marca...)"
                    />
                    {touchedFields.productDescription && validationErrors.productDescription && (
                      <p className="text-[10px] text-red-400 text-center">{validationErrors.productDescription}</p>
                    )}
                  </div>

                  {/* Budget & Urgency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                          <FiDollarSign className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          id="estimatedBudget"
                          name="estimatedBudget"
                          value={formData.estimatedBudget}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-xs placeholder:text-blue-200/30 focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all text-center"
                          placeholder="Presupuesto (Opcional)"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-white transition-colors">
                          <FiClock className="w-4 h-4" />
                        </div>
                        <select
                          id="urgency"
                          name="urgency"
                          value={formData.urgency}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white text-xs focus:outline-none focus:bg-white/20 focus:border-white/40 transition-all appearance-none cursor-pointer text-center"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="low" className="bg-slate-800">Urgencia: Baja</option>
                          <option value="normal" className="bg-slate-800">Urgencia: Normal</option>
                          <option value="high" className="bg-slate-800">Urgencia: Alta</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* hCaptcha */}
                  <div className="flex justify-center pt-2">
                    <HCaptchaWrapper
                      sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                      onVerify={handleCaptchaVerify}
                      onExpire={handleCaptchaExpire}
                      ref={captchaRef}
                      theme="dark"
                      size="normal"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !captchaToken}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#2a63cd] text-sm font-black rounded-xl hover:bg-white/90 hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        Solicitar Ahora
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Steps Info - Horizontal on Desktop when compact */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { step: '1', title: 'Solicitas', icon: FiPackage },
                { step: '2', title: 'Buscamos', icon: FiPackage },
                { step: '3', title: 'Cotizamos', icon: FiPackage },
                { step: '4', title: 'Recibes', icon: FiTruck },
              ].map((item) => (
                <div key={item.step} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] text-white flex items-center justify-center mb-2 shadow-lg">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-800">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
function FiAlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
