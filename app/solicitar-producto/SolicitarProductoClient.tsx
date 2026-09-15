'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FiUser, FiMail, FiPhone, FiPackage, FiDollarSign, FiClock, FiCheck, FiShield, FiTruck, FiSearch } from 'react-icons/fi';
import { IoMdPricetags } from 'react-icons/io';
import HCaptchaWrapper from '@/components/HCaptchaWrapper';
import { adminPrimaryButton } from '@/lib/admin-ui';
import PageHeader, { PageHeaderChip } from '@/components/ui/PageHeader';

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

  // Precargar nombre y email si hay sesion
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        customerName: prev.customerName || session.user?.name || '',
        customerEmail: prev.customerEmail || session.user?.email || '',
      }));
    }
  }, [session]);

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
      <PageHeader
        breadcrumbs={[{ label: 'Productos', href: '/productos' }, { label: 'Solicitar producto' }]}
        icon={<FiSearch />}
        eyebrow="Servicio personalizado"
        title="Solicitar producto"
        description="¿No encuentras lo que buscas? Cuéntanos qué necesitas y te lo conseguimos al mejor precio."
        meta={
          <>
            <PageHeaderChip><FiShield className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> 100% seguro</PageHeaderChip>
            <PageHeaderChip><FiTruck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Envío nacional</PageHeaderChip>
            <PageHeaderChip><IoMdPricetags className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Mejores precios</PageHeaderChip>
          </>
        }
      />

      {/* Main Content */}
      <main className="bg-white max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {success ? (
          /* Success State */
          <div className="rounded-2xl border border-line bg-white shadow-sm p-8 text-center relative overflow-hidden">
            <div className="relative">
              <div className="w-16 h-16 bg-success-strong/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-success-strong">
                <FiCheck className="w-8 h-8 text-success-strong" />
              </div>
              <h2 className="text-2xl font-bold text-ink mb-3">¡Solicitud Enviada!</h2>
              <p className="text-muted text-base mb-3 max-w-md mx-auto">
                Hemos recibido tu solicitud y nuestro equipo ya está buscando las mejores opciones para ti.
              </p>
              <p className="text-muted text-xs mb-8">
                Te contactaremos en las próximas 24-48 horas • Serás redirigido al inicio...
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/')}
                  className={adminPrimaryButton}
                >
                  Ir al Inicio
                </button>
                <button
                  onClick={() => setSuccess(false)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold border border-line bg-white text-ink hover:bg-surface transition-colors"
                >
                  Nueva Solicitud
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Form Section */}
            <div className="rounded-2xl border border-line bg-white shadow-sm p-6 lg:p-8 relative">


              <div className="relative">
                <h2 className="text-xl font-bold text-ink mb-1 text-center">
                  Completa tu Solicitud
                </h2>
                <p className="text-muted mb-6 text-xs text-center">
                  Mientras más detalles nos des, mejor podremos ayudarte
                </p>

                {error && (
                  <div className="mb-6 p-3 bg-deal-bg border border-deal/30 rounded-xl animate-shake">
                    <div className="flex items-center gap-2 text-deal">
                      <FiAlertCircle className="w-4 h-4" />
                      <span className="text-xs font-semibold">{error}</span>
                    </div>
                  </div>
                )}

                {!session && (
                  <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-700">
                    <span>Para solicitar un producto necesitas una cuenta. </span>
                    <Link
                      href="/login?callbackUrl=%2Fsolicitar-producto"
                      className="font-bold text-brand-600 underline hover:text-brand-700 transition-colors"
                    >
                      Iniciar sesión
                    </Link>
                    <span> o </span>
                    <Link
                      href="/registro"
                      className="font-bold text-brand-600 underline hover:text-brand-700 transition-colors"
                    >
                      Crear cuenta
                    </Link>
                    <span>.</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Contact Info Header */}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="h-px w-6 bg-line"></div>
                    <span className="text-[11px] font-bold text-brand-600 uppercase tracking-widest px-1">Contacto</span>
                    <div className="h-px w-6 bg-line"></div>
                  </div>

                  {/* Name & Email Grid - Side by side on mobile */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors">
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
                          className={`w-full pl-8 pr-2 py-2 bg-white border rounded-lg text-ink text-xs placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${touchedFields.customerName && validationErrors.customerName ? 'border-deal' : 'border-line focus:border-brand-500'}`}
                          placeholder="Nombre"
                        />
                      </div>
                      {touchedFields.customerName && validationErrors.customerName && (
                        <p className="text-[11px] text-deal text-center">{validationErrors.customerName}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors">
                          <FiMail className="w-3 h-3" />
                        </div>
                        <input
                          type="email"
                          id="customerEmail"
                          name="customerEmail"
                          value={formData.customerEmail}
                          onChange={handleChange}
                          onBlur={() => handleBlur('customerEmail')}
                          className={`w-full pl-8 pr-2 py-2 bg-white border rounded-lg text-ink text-xs placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${touchedFields.customerEmail && validationErrors.customerEmail ? 'border-deal' : 'border-line focus:border-brand-500'}`}
                          placeholder="Email"
                        />
                      </div>
                      {touchedFields.customerEmail && validationErrors.customerEmail && (
                        <p className="text-[11px] text-deal text-center">{validationErrors.customerEmail}</p>
                      )}
                    </div>
                  </div>

                  {/* Phone Field - Full width */}
                  <div className="space-y-1">
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors">
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
                        className={`w-full pl-8 pr-2 py-2 bg-white border rounded-lg text-ink text-xs placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${touchedFields.customerPhone && validationErrors.customerPhone ? 'border-deal' : 'border-line focus:border-brand-500'}`}
                        placeholder="Teléfono (04XX-XXXXXXX)"
                      />
                    </div>
                    {touchedFields.customerPhone && validationErrors.customerPhone && (
                      <p className="text-[11px] text-deal text-center">{validationErrors.customerPhone}</p>
                    )}
                  </div>

                  {/* Product Info Header */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="h-px w-8 bg-line"></div>
                    <span className="text-xs font-bold text-brand-600 uppercase tracking-widest px-2">Producto</span>
                    <div className="h-px w-8 bg-line"></div>
                  </div>

                  {/* Product Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors">
                          <FiPackage className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          id="productName"
                          name="productName"
                          value={formData.productName}
                          onChange={handleChange}
                          onBlur={() => handleBlur('productName')}
                          className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-ink text-xs placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${touchedFields.productName && validationErrors.productName ? 'border-deal' : 'border-line focus:border-brand-500'}`}
                          placeholder="Nombre del Producto"
                        />
                      </div>
                      {touchedFields.productName && validationErrors.productName && (
                        <p className="text-xs text-deal text-center">{validationErrors.productName}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        onBlur={() => handleBlur('category')}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-ink text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer ${touchedFields.category && validationErrors.category ? 'border-deal' : 'border-line focus:border-brand-500'}`}
                      >
                        <option value="">Selecciona categoría</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {touchedFields.category && validationErrors.category && (
                        <p className="text-xs text-deal text-center">{validationErrors.category}</p>
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
                      className={`w-full px-4 py-2.5 bg-white border rounded-lg text-ink text-xs placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none ${touchedFields.productDescription && validationErrors.productDescription ? 'border-deal' : 'border-line focus:border-brand-500'}`}
                      placeholder="Descripción Detallada (modelo, marca...)"
                    />
                    {touchedFields.productDescription && validationErrors.productDescription && (
                      <p className="text-xs text-deal text-center">{validationErrors.productDescription}</p>
                    )}
                  </div>

                  {/* Budget & Urgency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors">
                          <FiDollarSign className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          id="estimatedBudget"
                          name="estimatedBudget"
                          value={formData.estimatedBudget}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-line rounded-lg text-ink text-xs placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                          placeholder="Presupuesto (Opcional)"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-600 transition-colors">
                          <FiClock className="w-4 h-4" />
                        </div>
                        <select
                          id="urgency"
                          name="urgency"
                          value={formData.urgency}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-line rounded-lg text-ink text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer"
                        >
                          <option value="low">Urgencia: Baja</option>
                          <option value="normal">Urgencia: Normal</option>
                          <option value="high">Urgencia: Alta</option>
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
                      theme="light"
                      size="normal"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !captchaToken || !session}
                    className={`${adminPrimaryButton} w-full`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Solicitar Ahora</span>
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
                <div key={item.step} className="bg-white p-4 rounded-2xl border border-line shadow-xs flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-ink">{item.title}</p>
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
