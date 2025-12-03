'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/public/PublicHeader';

export default function SolicitarProductoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/product-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

      // Redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PublicHeader />
      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {success ? (
          <div className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#212529] mb-2">¡Solicitud Enviada!</h2>
            <p className="text-[#6a6c6b] mb-4">
              Hemos recibido tu solicitud y nos pondremos en contacto contigo pronto.
            </p>
            <p className="text-sm text-[#6a6c6b]">
              Serás redirigido al inicio en unos segundos...
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#212529] mb-2">
                Solicitar Producto
              </h1>
              <p className="text-[#6a6c6b]">
                ¿No encuentras lo que buscas? Completa el formulario y te ayudaremos a conseguirlo al mejor precio.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-[#e9ecef] p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#212529] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Información de Contacto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-[#212529] mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-[#212529] mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="customerEmail"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="customerPhone" className="block text-sm font-medium text-[#212529] mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      id="customerPhone"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                      placeholder="+58 424 1234567"
                    />
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#212529] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Detalles del Producto
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="productName" className="block text-sm font-medium text-[#212529] mb-1">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      id="productName"
                      name="productName"
                      value={formData.productName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                      placeholder="Ej: RTX 4090, MacBook Pro M3, etc."
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-[#212529] mb-1">
                      Categoría *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm bg-white"
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="productDescription" className="block text-sm font-medium text-[#212529] mb-1">
                      Descripción Detallada *
                    </label>
                    <textarea
                      id="productDescription"
                      name="productDescription"
                      value={formData.productDescription}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm resize-none"
                      placeholder="Describe las características específicas que buscas: modelo, especificaciones, marca preferida, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="estimatedBudget" className="block text-sm font-medium text-[#212529] mb-1">
                        Presupuesto Estimado (Opcional)
                      </label>
                      <input
                        type="text"
                        id="estimatedBudget"
                        name="estimatedBudget"
                        value={formData.estimatedBudget}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm"
                        placeholder="$500 - $1000"
                      />
                    </div>

                    <div>
                      <label htmlFor="urgency" className="block text-sm font-medium text-[#212529] mb-1">
                        Urgencia *
                      </label>
                      <select
                        id="urgency"
                        name="urgency"
                        value={formData.urgency}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent text-sm bg-white"
                      >
                        <option value="low">Baja - Puedo esperar</option>
                        <option value="normal">Normal - En unas semanas</option>
                        <option value="high">Alta - Lo necesito pronto</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4 border-t border-[#e9ecef]">
                <p className="text-xs text-[#6a6c6b]">
                  * Campos obligatorios
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#2a63cd] text-white text-sm font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Enviar Solicitud
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Info Section */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#212529] mb-1">
                    ¿Cómo funciona?
                  </h4>
                  <ul className="text-xs text-[#6a6c6b] space-y-1">
                    <li>1. Completa el formulario con los detalles del producto que buscas</li>
                    <li>2. Nuestro equipo investigará las mejores opciones y precios</li>
                    <li>3. Te contactaremos por email o teléfono con una cotización</li>
                    <li>4. Si te interesa, procesamos tu pedido y lo gestionamos</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e9ecef] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-[#6a6c6b]">
            &copy; {new Date().getFullYear()} Electro Shop Morandin C.A. - Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
