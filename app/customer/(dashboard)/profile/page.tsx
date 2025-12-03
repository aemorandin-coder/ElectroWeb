'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FiUser, FiMail, FiPhone, FiCalendar, FiSave, FiCamera, FiMapPin, FiGlobe, FiAward, FiShoppingBag, FiDollarSign, FiBriefcase, FiFileText, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';
import DocumentUpload from '@/components/customer/DocumentUpload';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';

interface Profile {
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  birthdate?: string;
  gender?: string;
  image?: string;
  city?: string;
  country?: string;
  // Business fields
  companyName?: string;
  taxId?: string;
  businessVerificationStatus?: string;
  businessConstitutiveAct?: string;
  businessRIFDocument?: string;
  businessVerificationNotes?: string;
}

interface UserStats {
  totalOrders: number;
  totalSpent: number;
  memberSince: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'business' | 'stats'>('personal');
  const [stats, setStats] = useState<UserStats>({
    totalOrders: 0,
    totalSpent: 0,
    memberSince: new Date().toISOString()
  });

  const [profile, setProfile] = useState<Profile>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    birthdate: '',
    gender: '',
    image: '',
    city: '',
    country: 'Venezuela',
    companyName: '',
    taxId: '',
    businessVerificationStatus: 'NONE',
    businessConstitutiveAct: '',
    businessRIFDocument: ''
  });

  // Business Verification State
  const [businessFiles, setBusinessFiles] = useState<{
    acta: File | null;
    rif: File | null;
  }>({ acta: null, rif: null });
  const [submittingBusiness, setSubmittingBusiness] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.user?.name || '',
          email: data.user?.email || '',
          phone: data.profile?.phone || '',
          bio: data.profile?.bio || '',
          birthdate: data.profile?.birthdate || '',
          gender: data.profile?.gender || '',
          image: data.image || '',
          city: data.profile?.city || '',
          country: data.profile?.country || 'Venezuela',
          companyName: data.profile?.companyName || '',
          taxId: data.profile?.taxId || '',
          businessVerificationStatus: data.profile?.businessVerificationStatus || 'NONE',
          businessConstitutiveAct: data.profile?.businessConstitutiveAct || '',
          businessRIFDocument: data.profile?.businessRIFDocument || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/customer/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalOrders: data.orders || 0,
          totalSpent: data.totalSpent || 0,
          memberSince: new Date().toISOString() // Fallback to current date
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    const confirmed = await confirm({
      title: 'Guardar Cambios',
      message: '¿Estás seguro de que deseas actualizar tu información de perfil?',
      confirmText: 'Sí, Guardar',
      cancelText: 'Cancelar',
      variant: 'info'
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          profile: {
            phone: profile.phone,
            bio: profile.bio,
            birthdate: profile.birthdate,
            gender: profile.gender,
            city: profile.city,
            country: profile.country
          }
        }),
      });

      if (response.ok) {
        toast.success('Perfil actualizado exitosamente');
      } else {
        toast.error('Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessSubmit = async () => {
    if (!profile.companyName || !profile.taxId || !businessFiles.acta || !businessFiles.rif) {
      toast.error('Por favor completa todos los campos y sube los documentos requeridos');
      return;
    }

    setSubmittingBusiness(true);
    try {
      const formData = new FormData();
      formData.append('companyName', profile.companyName);
      formData.append('taxId', profile.taxId);
      formData.append('actaConstitutiva', businessFiles.acta);
      formData.append('rifDocument', businessFiles.rif);

      const response = await fetch('/api/customer/business/verify', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Solicitud enviada exitosamente. Te notificaremos cuando sea aprobada.');
        // Update local profile state
        setProfile(prev => ({
          ...prev,
          businessVerificationStatus: 'PENDING',
          businessConstitutiveAct: 'uploaded', // Placeholder to show it's there
          businessRIFDocument: 'uploaded'
        }));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al enviar la solicitud');
      }
    } catch (error) {
      console.error('Error submitting business verification:', error);
      toast.error('Error al enviar la solicitud');
    } finally {
      setSubmittingBusiness(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
            <FiCheckCircle className="w-3 h-3" />
            Verificado
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full flex items-center gap-1">
            <FiClock className="w-3 h-3" />
            Pendiente de revisión
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1">
            <FiAlertCircle className="w-3 h-3" />
            Rechazado
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full flex items-center gap-1">
            <FiClock className="w-3 h-3" />
            No verificado
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-2xl p-6 text-white shadow-xl animate-fadeIn relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FiUser className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Mi Perfil</h1>
          </div>
          <p className="text-sm text-blue-100">Gestiona tu información personal</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm overflow-hidden">
        <div className="flex border-b border-[#e9ecef]">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'personal'
              ? 'bg-[#2a63cd] text-white'
              : 'text-[#6a6c6b] hover:bg-[#f8f9fa]'
              }`}
          >
            Información Personal
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'business'
              ? 'bg-[#2a63cd] text-white'
              : 'text-[#6a6c6b] hover:bg-[#f8f9fa]'
              }`}
          >
            <FiBriefcase className="inline w-4 h-4 mr-2" />
            Cuenta Empresarial
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'stats'
              ? 'bg-[#2a63cd] text-white'
              : 'text-[#6a6c6b] hover:bg-[#f8f9fa]'
              }`}
          >
            Estadísticas
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'personal' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Profile Picture */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm p-4">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                        {profile.image ? (
                          <img
                            src={profile.image}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          session?.user?.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-[#f8f9fa] transition-all border-2 border-white">
                        <FiCamera className="w-4 h-4 text-[#2a63cd]" />
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-[#212529] mb-1">{profile.name || 'Usuario'}</h3>
                    <p className="text-sm text-[#6a6c6b] mb-4">{profile.email}</p>

                    {/* Quick Stats */}
                    <div className="w-full space-y-3 pt-4 border-t border-[#e9ecef]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6a6c6b]">Miembro desde</span>
                        <span className="font-medium text-[#212529]">
                          {new Date(stats.memberSince).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6a6c6b]">Total pedidos</span>
                        <span className="font-medium text-[#212529]">{stats.totalOrders}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6a6c6b]">Total gastado</span>
                        <span className="font-medium text-[#212529]">${stats.totalSpent.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <h2 className="text-lg font-bold text-[#212529] mb-4">Información Básica</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#212529] mb-2">
                          <FiUser className="inline w-4 h-4 mr-2" />
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#212529] mb-2">
                          <FiMail className="inline w-4 h-4 mr-2" />
                          Email
                        </label>
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg bg-[#f8f9fa] text-[#6a6c6b] cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#212529] mb-2">
                          <FiPhone className="inline w-4 h-4 mr-2" />
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                          placeholder="0414-1234567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#212529] mb-2">
                          <FiCalendar className="inline w-4 h-4 mr-2" />
                          Fecha de Nacimiento
                        </label>
                        <input
                          type="date"
                          value={profile.birthdate}
                          onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                          className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <h2 className="text-lg font-bold text-[#212529] mb-4">Ubicación</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#212529] mb-2">
                          <FiMapPin className="inline w-4 h-4 mr-2" />
                          Ciudad
                        </label>
                        <input
                          type="text"
                          value={profile.city}
                          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                          className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                          placeholder="Guanare"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#212529] mb-2">
                          <FiGlobe className="inline w-4 h-4 mr-2" />
                          País
                        </label>
                        <select
                          value={profile.country}
                          onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                          className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                        >
                          <option value="Venezuela">Venezuela</option>
                          <option value="Colombia">Colombia</option>
                          <option value="Panamá">Panamá</option>
                          <option value="USA">Estados Unidos</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div>
                    <h2 className="text-lg font-bold text-[#212529] mb-4">Información Adicional</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#212529] mb-2">
                          Género
                        </label>
                        <select
                          value={profile.gender}
                          onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                          className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="male">Masculino</option>
                          <option value="female">Femenino</option>
                          <option value="other">Otro</option>
                          <option value="prefer_not_to_say">Prefiero no decir</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#212529] mb-2">
                          Biografía
                        </label>
                        <textarea
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] resize-none"
                          placeholder="Cuéntanos sobre ti..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-8 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-semibold rounded-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FiSave className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'business' ? (
            <div className="space-y-4">
              {/* Business Account Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiBriefcase className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[#212529] mb-2">Certificación de Cuenta Empresarial</h3>
                    <p className="text-sm text-[#6a6c6b] mb-4">
                      Verifica tu empresa para acceder a beneficios exclusivos, facturación fiscal y condiciones especiales.
                    </p>

                    {/* Verification Status */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-medium text-[#212529]">Estado:</span>
                      {getStatusBadge(profile.businessVerificationStatus || 'NONE')}
                    </div>

                    {profile.businessVerificationStatus === 'REJECTED' && profile.businessVerificationNotes && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                        <strong>Motivo del rechazo:</strong> {profile.businessVerificationNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Information Form */}
              <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm p-6">
                <h3 className="text-lg font-bold text-[#212529] mb-4 flex items-center gap-2">
                  <FiFileText className="w-5 h-5 text-[#2a63cd]" />
                  Información de la Empresa
                </h3>

                <div className="space-y-4">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">
                      Nombre de la Empresa *
                    </label>
                    <input
                      type="text"
                      value={profile.companyName}
                      onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                      disabled={profile.businessVerificationStatus === 'PENDING' || profile.businessVerificationStatus === 'APPROVED'}
                      placeholder="Ej: Tecnología Avanzada C.A."
                      className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  {/* RIF */}
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">
                      RIF / NIT *
                    </label>
                    <input
                      type="text"
                      value={profile.taxId}
                      onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                      disabled={profile.businessVerificationStatus === 'PENDING' || profile.businessVerificationStatus === 'APPROVED'}
                      placeholder="Ej: J-12345678-9"
                      className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    <p className="text-xs text-[#6a6c6b] mt-1">Registro de Información Fiscal de tu empresa</p>
                  </div>

                  {/* Document Uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <DocumentUpload
                      label="Acta Constitutiva *"
                      accept=".pdf,.jpg,.jpeg,.png"
                      currentFileUrl={profile.businessConstitutiveAct}
                      disabled={profile.businessVerificationStatus === 'PENDING' || profile.businessVerificationStatus === 'APPROVED'}
                      onFileSelect={(file) => setBusinessFiles(prev => ({ ...prev, acta: file }))}
                    />
                    <DocumentUpload
                      label="Documento RIF *"
                      accept=".pdf,.jpg,.jpeg,.png"
                      currentFileUrl={profile.businessRIFDocument}
                      disabled={profile.businessVerificationStatus === 'PENDING' || profile.businessVerificationStatus === 'APPROVED'}
                      onFileSelect={(file) => setBusinessFiles(prev => ({ ...prev, rif: file }))}
                    />
                  </div>

                  {/* Benefits Info */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                    <h4 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                      <FiCheckCircle className="w-4 h-4" />
                      Beneficios de Cuenta Empresarial
                    </h4>
                    <ul className="text-xs text-green-700 space-y-1 ml-6 list-disc">
                      <li>Facturación fiscal automática</li>
                      <li>Descuentos por volumen</li>
                      <li>Condiciones de pago especiales</li>
                      <li>Gestor de cuenta dedicado</li>
                      <li>Reportes de gastos mensuales</li>
                    </ul>
                  </div>

                  {/* Submit Button */}
                  {profile.businessVerificationStatus !== 'APPROVED' && profile.businessVerificationStatus !== 'PENDING' && (
                    <button
                      onClick={handleBusinessSubmit}
                      disabled={submittingBusiness}
                      className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-semibold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {submittingBusiness ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <FiFileText className="w-5 h-5" />
                          Enviar Solicitud de Verificación
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Stats Tab */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <FiShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-[#212529]">Total Pedidos</h3>
                  </div>
                  <p className="text-4xl font-bold text-blue-600">{stats.totalOrders}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <FiDollarSign className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-[#212529]">Total Gastado</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-green-600 opacity-60">USD</span>
                    <span className="text-4xl font-bold text-green-600">{stats.totalSpent.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <FiAward className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-[#212529]">Miembro Desde</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Date(stats.memberSince).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                <h3 className="text-lg font-bold text-[#212529] mb-4 flex items-center gap-2">
                  <FiAward className="w-5 h-5 text-orange-600" />
                  Logros y Beneficios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-orange-200">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FiAward className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#212529]">Cliente Frecuente</p>
                      <p className="text-xs text-[#6a6c6b]">Más de 5 pedidos realizados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-blue-200 opacity-50">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FiAward className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#212529]">VIP</p>
                      <p className="text-xs text-[#6a6c6b]">Gasta más de $500</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
