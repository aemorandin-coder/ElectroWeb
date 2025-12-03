'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Image import removed to avoid chunk loading issues

interface Profile {
  id: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  addresses: any[];
}

export default function MiCuentaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    customerType: 'PERSON' as 'PERSON' | 'COMPANY',
    companyName: '',
    taxId: '',
    address: {
      state: '',
      city: '',
      municipality: '',
      street: '',
      building: '',
      apartment: '',
      zipCode: '',
      reference: '',
    },
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && status === 'authenticated') {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || '',
        email: session.user.email || '',
      }));

      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.profile) {
            setProfile(data.profile);
            setFormData(prev => ({
              ...prev,
              phone: data.profile.phone || '',
              whatsapp: data.profile.whatsapp || '',
              customerType: (data.profile as any).customerType || 'PERSON',
              companyName: (data.profile as any).companyName || '',
              taxId: (data.profile as any).taxId || '',
            }));
            
            // Load default address if exists
            const defaultAddress = data.profile.addresses?.find((addr: any) => addr.isDefault);
            if (defaultAddress) {
              setFormData(prev => ({
                ...prev,
                address: {
                  state: defaultAddress.state || '',
                  city: defaultAddress.city || '',
                  municipality: defaultAddress.municipality || '',
                  street: defaultAddress.street || '',
                  building: defaultAddress.building || '',
                  apartment: defaultAddress.apartment || '',
                  zipCode: defaultAddress.zipCode || '',
                  reference: defaultAddress.reference || '',
                },
              }));
            }
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading profile:', err);
          setLoading(false);
        });
    }
  }, [session, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          customerType: formData.customerType,
          companyName: formData.customerType === 'COMPANY' ? formData.companyName : null,
          taxId: formData.customerType === 'COMPANY' ? formData.taxId : null,
          address: formData.address,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar perfil');
      }

      setSuccess('Perfil actualizado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#2a63cd] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 mb-3 shadow-xl animate-pulse">
            <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-white/80 text-xs font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session || status !== 'authenticated') {
    return null;
  }

  const user = session.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const userImage = (user as any)?.image || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#2a63cd] relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <div className="fixed inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

      <div className="relative z-10">
        {/* Header - Compact */}
        <header className="bg-white/95 backdrop-blur-xl border-b border-white/30 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-sm text-[#212529] hover:text-[#2a63cd] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Inicio</span>
              </Link>
              <h1 className="text-lg font-bold text-[#212529]">Mi Cuenta</h1>
              <Link href="/mis-pedidos" className="text-sm text-[#2a63cd] hover:text-[#1e4ba3] font-medium">
                Pedidos
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Profile Card - Compact */}
          <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#2a63cd] via-[#1e4ba3] to-[#2a63cd]"></div>
            
            <div className="p-6">
              {/* Avatar Section - Compact */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#e9ecef]">
                {userImage ? (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#2a63cd]/30 shadow-lg flex-shrink-0">
                    <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-[#212529] truncate">{userName}</h2>
                  <p className="text-sm text-[#6a6c6b] truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-[#f8f9fa] rounded text-xs font-semibold text-[#2a63cd]">
                    Cliente
                  </span>
                </div>
              </div>

              {/* Form - Compact */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Success/Error Messages - Compact */}
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-green-700 font-medium">{success}</p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {/* Grid Layout - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                      required
                    />
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-3 py-2 text-sm bg-[#e9ecef] border border-[#dee2e6] rounded-lg text-[#6a6c6b] cursor-not-allowed"
                    />
                  </div>

                  {/* Customer Type */}
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                      Tipo de Cliente
                    </label>
                    <select
                      value={formData.customerType}
                      onChange={(e) => setFormData({ ...formData, customerType: e.target.value as 'PERSON' | 'COMPANY' })}
                      className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                    >
                      <option value="PERSON">Persona Natural</option>
                      <option value="COMPANY">Empresa</option>
                    </select>
                  </div>

                  {/* Company Name (if company) */}
                  {formData.customerType === 'COMPANY' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                          Nombre de la Empresa
                        </label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                          placeholder="Nombre de la empresa"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                          RIF / NIT
                        </label>
                        <input
                          type="text"
                          value={formData.taxId}
                          onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                          placeholder="J-12345678-9"
                        />
                      </div>
                    </>
                  )}

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                      placeholder="+58 424 1234567"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                      placeholder="+58 424 1234567"
                    />
                  </div>
                </div>

                {/* Address Section */}
                <div className="pt-4 border-t border-[#e9ecef]">
                  <h3 className="text-sm font-bold text-[#212529] mb-3">Dirección Principal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Estado
                      </label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                        placeholder="Portuguesa"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                        placeholder="Guanare"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Municipio
                      </label>
                      <input
                        type="text"
                        value={formData.address.municipality}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, municipality: e.target.value } })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                        placeholder="Guanare"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Calle / Avenida
                      </label>
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                        placeholder="Av. Principal"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Edificio / Residencia
                      </label>
                      <input
                        type="text"
                        value={formData.address.building}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, building: e.target.value } })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                        placeholder="Torre A"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Apartamento / Casa
                      </label>
                      <input
                        type="text"
                        value={formData.address.apartment}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, apartment: e.target.value } })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                        placeholder="Apto 5B"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Código Postal
                      </label>
                      <input
                        type="text"
                        value={formData.address.zipCode}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                        placeholder="3301"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">
                        Punto de Referencia
                      </label>
                      <input
                        type="text"
                        value={formData.address.reference}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, reference: e.target.value } })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/10 transition-all"
                        placeholder="Frente al banco"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button - Compact */}
                <div className="flex gap-3 pt-4 border-t border-[#e9ecef]">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] hover:from-[#1e4ba3] hover:to-[#2a63cd] text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-[#2a63cd]/30 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <Link
                    href="/mis-pedidos"
                    className="px-4 py-2.5 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] font-semibold rounded-lg transition-colors border border-[#dee2e6] text-sm"
                  >
                    Ver Pedidos
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
