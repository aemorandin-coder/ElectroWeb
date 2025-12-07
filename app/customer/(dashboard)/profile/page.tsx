'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { FiUser, FiMail, FiPhone, FiCalendar, FiSave, FiCamera, FiMapPin, FiGlobe, FiAward, FiShoppingBag, FiBriefcase, FiFileText, FiCheckCircle, FiAlertCircle, FiClock, FiTrendingUp, FiPackage } from 'react-icons/fi';
import { HiMiniBanknotes } from 'react-icons/hi2';
import DocumentUpload from '@/components/customer/DocumentUpload';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';

interface Profile {
  name: string;
  email: string;
  idNumber?: string;
  phone?: string;
  bio?: string;
  birthdate?: string;
  gender?: string;
  image?: string;
  avatar?: string;
  city?: string;
  state?: string;
  country?: string;
  receiptType?: string; // PERSON or BUSINESS
  // Business fields
  companyName?: string;
  taxId?: string;
  businessVerificationStatus?: string;
  businessConstitutiveAct?: string;
  businessRIFDocument?: string;
  businessVerificationNotes?: string;
}

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

const VENEZUELA_STATES = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes",
  "Delta Amacuro", "Distrito Capital", "Falcón", "Guárico", "Lara", "Mérida", "Miranda",
  "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", "La Guaira",
  "Yaracuy", "Zulia"
];

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
    idNumber: '',
    phone: '',
    bio: '',
    birthdate: '',
    gender: '',
    image: '',
    city: '',
    state: '',
    country: 'Venezuela',
    receiptType: 'PERSON',
    companyName: '',
    taxId: '',
    businessVerificationStatus: 'NONE',
    businessConstitutiveAct: '',
    businessRIFDocument: ''
  });

  // Track initial profile state for change detection
  const [initialProfile, setInitialProfile] = useState<Profile>({
    name: '',
    email: '',
    idNumber: '',
    phone: '',
    bio: '',
    birthdate: '',
    gender: '',
    image: '',
    city: '',
    state: '',
    country: 'Venezuela',
    receiptType: 'PERSON',
    companyName: '',
    taxId: '',
    businessVerificationStatus: 'NONE',
    businessConstitutiveAct: '',
    businessRIFDocument: ''
  });

  const [countryCode, setCountryCode] = useState('+58');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const [isNameLocked, setIsNameLocked] = useState(false);

  // Business Verification State
  const [businessFiles, setBusinessFiles] = useState<{
    acta: File | null;
    rif: File | null;
  }>({ acta: null, rif: null });
  const [submittingBusiness, setSubmittingBusiness] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        const profileData = {
          name: data.user?.name || '',
          email: data.user?.email || '',
          idNumber: data.profile?.idNumber || '',
          phone: data.profile?.phone || '',
          bio: data.profile?.bio || '',
          birthdate: data.profile?.birthdate || '',
          gender: data.profile?.gender || '',
          image: data.user?.image || '',
          avatar: data.profile?.avatar || '',
          city: data.profile?.city || '',
          state: data.profile?.state || '',
          country: data.profile?.country || 'Venezuela',
          receiptType: data.profile?.receiptType || 'PERSON',
          companyName: data.profile?.companyName || '',
          taxId: data.profile?.taxId || '',
          businessVerificationStatus: data.profile?.businessVerificationStatus || 'NONE',
          businessConstitutiveAct: data.profile?.businessConstitutiveAct || '',
          businessRIFDocument: data.profile?.businessRIFDocument || ''
        };

        setProfile(profileData);
        setInitialProfile(profileData); // Save initial state

        // Handle Phone splitting
        if (data.profile?.phone) {
          const foundCode = COUNTRY_CODES.find(c => data.profile.phone.startsWith(c.code));
          if (foundCode) {
            setCountryCode(foundCode.code);
            // Remove code and update profile phone state with just the number
            const cleanPhone = data.profile.phone.replace(foundCode.code, '').trim();
            const updatedProfile = { ...profileData, phone: cleanPhone };
            setProfile(updatedProfile);
            setInitialProfile(updatedProfile);
          }
        }
        // Lock name if it's already set
        if (data.user?.name) {
          setIsNameLocked(true);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error al cargar el perfil');
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
    // Check if there are any changes
    const hasChanges =
      profile.name !== initialProfile.name ||
      profile.idNumber !== initialProfile.idNumber ||
      profile.phone !== initialProfile.phone ||
      profile.bio !== initialProfile.bio ||
      profile.birthdate !== initialProfile.birthdate ||
      profile.gender !== initialProfile.gender ||
      profile.city !== initialProfile.city ||
      profile.state !== initialProfile.state ||
      profile.country !== initialProfile.country ||
      profile.image !== initialProfile.image;

    if (!hasChanges) {
      toast('No hay cambios para guardar', {
        icon: 'ℹ️',
        duration: 3000,
      });
      return;
    }

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
      let imageUrl = profile.image;

      // If image is base64 (new upload), save it first
      if (profile.image && profile.image.startsWith('data:image/')) {
        try {
          const avatarResponse = await fetch('/api/user/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: profile.image }),
          });

          const avatarData = await avatarResponse.json();

          if (avatarResponse.ok && avatarData.success) {
            imageUrl = avatarData.image;
          } else {
            toast.error('Error al subir la imagen');
            setSaving(false);
            return;
          }
        } catch (error) {
          console.error('Error uploading avatar:', error);
          toast.error('Error al subir la imagen');
          setSaving(false);
          return;
        }
      }

      // Now save all profile data
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          image: imageUrl,
          profile: {
            idNumber: profile.idNumber,
            phone: profile.phone ? `${countryCode} ${profile.phone}` : '',
            bio: profile.bio,
            birthdate: profile.birthdate,
            gender: profile.gender,
            city: profile.city,
            state: profile.state,
            country: profile.country
          }
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || 'Perfil actualizado exitosamente');
        // Update initial profile to new values
        setInitialProfile({ ...profile, image: imageUrl });
        // Refresh session to update user data in header
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Convert to base64 for preview only - don't save yet
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      // Update profile state for preview but don't save to database
      setProfile(prev => ({ ...prev, image: base64 }));
      toast.success('Imagen cargada. Presiona "Guardar Cambios" para aplicar');
    };
    reader.readAsDataURL(file);
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
    <div className="space-y-3">
      {/* Header with Save Button */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FiUser className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mi Perfil</h1>
              <p className="text-xs text-blue-100">Gestiona tu información personal</p>
            </div>
          </div>
          {activeTab === 'personal' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-white text-[#2a63cd] font-bold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm overflow-hidden">
        <div className="flex border-b border-[#e9ecef]">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'personal'
              ? 'bg-[#2a63cd] text-white'
              : 'text-[#6a6c6b] hover:bg-[#f8f9fa]'
              }`}
          >
            Información Personal
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'business'
              ? 'bg-[#2a63cd] text-white'
              : 'text-[#6a6c6b] hover:bg-[#f8f9fa]'
              }`}
          >
            <FiBriefcase className="inline w-4 h-4 mr-1" />
            Cuenta Empresarial
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'stats'
              ? 'bg-[#2a63cd] text-white'
              : 'text-[#6a6c6b] hover:bg-[#f8f9fa]'
              }`}
          >
            Estadísticas
          </button>
        </div>

        <div className="p-3">
          {activeTab === 'personal' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Profile Picture */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm p-3">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3 group">
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                        {avatarPreview || profile.avatar || profile.image ? (
                          <img
                            src={avatarPreview || profile.avatar || profile.image}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          session?.user?.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <button
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg hover:bg-[#2a63cd] transition-all border-2 border-white group-hover:scale-110"
                        type="button"
                      >
                        <FiCamera className="w-3.5 h-3.5 text-[#2a63cd] group-hover:text-white transition-colors" />
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-[#212529] mb-0.5">{profile.name || 'Usuario'}</h3>
                    <p className="text-xs text-[#6a6c6b] mb-3">{profile.email}</p>

                    {/* Quick Stats */}
                    <div className="w-full space-y-2 pt-3 border-t border-[#e9ecef]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6a6c6b]">Miembro desde</span>
                        <span className="font-medium text-[#212529]">
                          {new Date(stats.memberSince).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6a6c6b]">Total pedidos</span>
                        <span className="font-medium text-[#212529]">{stats.totalOrders}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6a6c6b]">Total gastado</span>
                        <span className="font-medium text-[#212529]">${stats.totalSpent.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <div className="lg:col-span-2">
                <div className="space-y-3">
                  {/* Alert for sensitive info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
                    <FiAlertCircle className="w-4 h-4 text-[#2a63cd] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#212529]">
                      <strong>Información sensible:</strong> El nombre y cédula no son modificables una vez guardados. Para cambios, contacta al administrador.
                    </p>
                  </div>

                  {/* Basic Info */}
                  <div>
                    <h2 className="text-base font-bold text-[#212529] mb-2">Información Básica</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative group">
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          <FiUser className="inline w-3.5 h-3.5 mr-1" />
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => !isNameLocked && setProfile({ ...profile, name: e.target.value })}
                          disabled={isNameLocked}
                          className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Ej: Juan Pérez"
                        />
                        {isNameLocked && (
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-xs rounded-lg px-3 py-2 z-20 shadow-xl">
                            <div className="relative">
                              <strong>Información bloqueada:</strong> Contacta al administrador para cambiar este campo
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-[#1e4ba3]"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative group">
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          <FiFileText className="inline w-3.5 h-3.5 mr-1" />
                          Cédula / Pasaporte *
                        </label>
                        <input
                          type="text"
                          value={profile.idNumber}
                          onChange={(e) => !profile.idNumber && setProfile({ ...profile, idNumber: e.target.value })}
                          disabled={!!profile.idNumber}
                          className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Ej: V-12345678"
                        />
                        {profile.idNumber && (
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-xs rounded-lg px-3 py-2 z-20 shadow-xl">
                            <div className="relative">
                              <strong>Información bloqueada:</strong> Contacta al administrador para cambiar este campo
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-[#1e4ba3]"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          <FiMail className="inline w-3.5 h-3.5 mr-1" />
                          Email
                        </label>
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg bg-[#f8f9fa] text-[#6a6c6b] cursor-not-allowed"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          <FiPhone className="inline w-3.5 h-3.5 mr-1" />
                          Teléfono
                        </label>
                        <div className="flex gap-2">
                          {/* Country Dropdown */}
                          <div className="relative" ref={dropdownRef}>
                            <button
                              type="button"
                              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                              className="h-full px-2 bg-white border border-[#e9ecef] rounded-lg flex items-center gap-1 hover:bg-gray-50 transition-all min-w-[80px]"
                            >
                              <div className="relative w-5 h-3.5 shadow-sm rounded-sm overflow-hidden flex-shrink-0">
                                <Image
                                  src={`https://flagcdn.com/w40/${COUNTRY_CODES.find(c => c.code === countryCode)?.iso || 've'}.png`}
                                  alt="Flag"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <span className="text-xs font-medium text-[#212529]">{countryCode}</span>
                              <svg className={`w-2.5 h-2.5 text-gray-500 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {showCountryDropdown && (
                              <div className="absolute top-full left-0 mt-1 w-56 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                                {COUNTRY_CODES.map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                      setCountryCode(country.code);
                                      setShowCountryDropdown(false);
                                    }}
                                    className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                                  >
                                    <div className="relative w-5 h-3.5 shadow-sm rounded-sm overflow-hidden flex-shrink-0">
                                      <Image
                                        src={`https://flagcdn.com/w40/${country.iso}.png`}
                                        alt={country.country}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <span className="text-sm text-gray-700 flex-1 truncate">{country.country}</span>
                                    <span className="text-xs text-blue-600 font-mono">{country.code}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="flex-1 px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                            placeholder="412 1234567"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          <FiCalendar className="inline w-3.5 h-3.5 mr-1" />
                          Fecha de Nacimiento
                        </label>
                        <input
                          type="date"
                          value={profile.birthdate}
                          onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          Género
                        </label>
                        <select
                          value={profile.gender}
                          onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="male">Masculino</option>
                          <option value="female">Femenino</option>
                          <option value="other">Otro</option>
                          <option value="prefer_not_to_say">Prefiero no decir</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-base font-bold text-[#212529]">Dirección de Residencia</h2>
                      <div className="group relative">
                        <FiAlertCircle className="w-4 h-4 text-[#2a63cd] cursor-help" />
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-xs rounded-lg px-3 py-2 z-20 shadow-xl">
                          <div className="relative">
                            Esta dirección es solo para facturación e información. Para agregar direcciones de envío, ve a la sección "Direcciones"
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-[#1e4ba3]"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          <FiMapPin className="inline w-3.5 h-3.5 mr-1" />
                          Ciudad
                        </label>
                        <input
                          type="text"
                          value={profile.city}
                          onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                          placeholder="Guanare"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          <FiMapPin className="inline w-3.5 h-3.5 mr-1" />
                          Estado
                        </label>
                        <select
                          value={profile.state}
                          onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                          disabled={profile.country !== 'Venezuela'}
                        >
                          <option value="">Seleccionar...</option>
                          {profile.country === 'Venezuela' ? (
                            VENEZUELA_STATES.map(state => (
                              <option key={state} value={state}>{state}</option>
                            ))
                          ) : (
                            <option value="N/A">N/A</option>
                          )}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[#212529] mb-1.5">
                          <FiGlobe className="inline w-3.5 h-3.5 mr-1" />
                          País
                        </label>
                        <select
                          value={profile.country}
                          onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                        >
                          <option value="Venezuela">Venezuela</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Type Selector */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-base font-bold text-[#212529]">Preferencias de Facturación</h2>
                      <div className="group relative">
                        <FiAlertCircle className="w-4 h-4 text-[#2a63cd] cursor-help" />
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-xs rounded-lg px-3 py-2 z-20 shadow-xl">
                          <div className="relative">
                            Selecciona cómo deseas recibir tus recibos de compra. La opción "Empresa" requiere verificación empresarial aprobada
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-[#1e4ba3]"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${profile.receiptType === 'PERSON'
                        ? 'border-[#2a63cd] bg-blue-50'
                        : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                        }`}>
                        <input
                          type="radio"
                          name="receiptType"
                          value="PERSON"
                          checked={profile.receiptType === 'PERSON'}
                          onChange={(e) => setProfile({ ...profile, receiptType: e.target.value })}
                          className="w-4 h-4 text-[#2a63cd] focus:ring-[#2a63cd]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FiUser className="w-4 h-4 text-[#2a63cd]" />
                            <span className="text-sm font-semibold text-[#212529]">Persona Natural</span>
                          </div>
                          <p className="text-xs text-[#6a6c6b] mt-0.5">Recibos con tu nombre e información personal</p>
                        </div>
                      </label>
                      <div className="relative group">
                        <label className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${profile.receiptType === 'BUSINESS'
                          ? 'border-[#2a63cd] bg-blue-50'
                          : 'border-[#e9ecef]'
                          } ${profile.businessVerificationStatus !== 'APPROVED'
                            ? 'cursor-not-allowed opacity-60'
                            : 'cursor-pointer hover:border-[#2a63cd]/30'
                          }`}>
                          <input
                            type="radio"
                            name="receiptType"
                            value="BUSINESS"
                            checked={profile.receiptType === 'BUSINESS'}
                            onChange={(e) => setProfile({ ...profile, receiptType: e.target.value })}
                            disabled={profile.businessVerificationStatus !== 'APPROVED'}
                            className="w-4 h-4 text-[#2a63cd] focus:ring-[#2a63cd] disabled:cursor-not-allowed"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FiBriefcase className="w-4 h-4 text-[#2a63cd]" />
                              <span className="text-sm font-semibold text-[#212529]">Empresa</span>
                              {profile.businessVerificationStatus === 'APPROVED' && (
                                <FiCheckCircle className="w-3.5 h-3.5 text-green-600" />
                              )}
                            </div>
                            <p className="text-xs text-[#6a6c6b] mt-0.5">Facturación fiscal con datos de tu empresa</p>
                          </div>
                        </label>
                        {profile.businessVerificationStatus !== 'APPROVED' && (
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-xs rounded-lg px-3 py-2 z-20 shadow-xl">
                            <div className="relative">
                              <strong>Verificación requerida:</strong> Para facturar como empresa, primero debes completar y aprobar la verificación empresarial en la pestaña "Cuenta Empresarial"
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-[#1e4ba3]"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div>
                    <h2 className="text-base font-bold text-[#212529] mb-2">Información Adicional</h2>
                    <div>
                      <label className="block text-xs font-medium text-[#212529] mb-1">
                        Biografía
                      </label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={1}
                        className="w-full px-3 py-1.5 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] resize-none h-8"
                        placeholder="Cuéntanos brevemente sobre ti..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'business' ? (
            <div className="space-y-3">
              {/* Business Account Section - Compact */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiBriefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-[#212529] mb-1">Certificación de Cuenta Empresarial</h3>
                    <p className="text-xs text-[#6a6c6b] mb-2">
                      Verifica tu empresa para acceder a beneficios exclusivos, facturación fiscal y condiciones especiales.
                    </p>

                    {/* Verification Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#212529]">Estado:</span>
                      {getStatusBadge(profile.businessVerificationStatus || 'NONE')}
                    </div>

                    {profile.businessVerificationStatus === 'REJECTED' && profile.businessVerificationNotes && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                        <strong>Motivo del rechazo:</strong> {profile.businessVerificationNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Information Form - Compact */}
              <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm p-3">
                <h3 className="text-base font-bold text-[#212529] mb-3 flex items-center gap-2">
                  <FiFileText className="w-4 h-4 text-[#2a63cd]" />
                  Información de la Empresa
                </h3>

                <div className="space-y-3">
                  {/* Company Name & RIF */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#212529] mb-1.5">
                        Nombre de la Empresa *
                      </label>
                      <input
                        type="text"
                        value={profile.companyName}
                        onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                        disabled={profile.businessVerificationStatus === 'PENDING' || profile.businessVerificationStatus === 'APPROVED'}
                        placeholder="Ej: Tecnología Avanzada C.A."
                        className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#212529] mb-1.5">
                        RIF / NIT *
                      </label>
                      <input
                        type="text"
                        value={profile.taxId}
                        onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                        disabled={profile.businessVerificationStatus === 'PENDING' || profile.businessVerificationStatus === 'APPROVED'}
                        placeholder="Ej: J-12345678-9"
                        className="w-full px-3 py-2 text-sm border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  {/* Document Uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                  {/* Benefits Info - Compact */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                    <h4 className="text-xs font-bold text-green-800 mb-1.5 flex items-center gap-1.5">
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      Beneficios de Cuenta Empresarial
                    </h4>
                    <ul className="text-xs text-green-700 space-y-0.5 ml-5 list-disc">
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
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-semibold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {submittingBusiness ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <FiFileText className="w-4 h-4" />
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="bg-white rounded-xl p-4 border border-[#e9ecef] shadow-sm hover:shadow-lg transition-all"
                  style={{ animation: 'fadeInUp 0.5s ease-out 0ms both' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center">
                      <FiPackage className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-3xl font-black text-[#2a63cd]">{stats.totalOrders}</p>
                  </div>
                  <h3 className="font-semibold text-sm text-[#6a6c6b] mt-2">Total Pedidos</h3>
                </div>

                <div
                  className="bg-white rounded-xl p-4 border border-[#e9ecef] shadow-sm hover:shadow-lg transition-all"
                  style={{ animation: 'fadeInUp 0.5s ease-out 100ms both' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center">
                      <HiMiniBanknotes className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-[#2a63cd]">${stats.totalSpent.toFixed(2)}</p>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm text-[#6a6c6b] mt-2">Total Gastado</h3>
                </div>

                <div
                  className="bg-white rounded-xl p-4 border border-[#e9ecef] shadow-sm hover:shadow-lg transition-all"
                  style={{ animation: 'fadeInUp 0.5s ease-out 200ms both' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center">
                      <FiAward className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-lg font-bold text-[#2a63cd]">
                      {new Date(stats.memberSince).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <h3 className="font-semibold text-sm text-[#6a6c6b] mt-2">Miembro Desde</h3>
                </div>
              </div>

              <div
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100"
                style={{ animation: 'fadeInUp 0.5s ease-out 300ms both' }}
              >
                <h3 className="text-base font-bold text-[#212529] mb-3 flex items-center gap-2">
                  <FiAward className="w-5 h-5 text-[#2a63cd]" />
                  Logros y Beneficios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#e9ecef] shadow-sm">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiTrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#212529]">Cliente Frecuente</p>
                      <p className="text-xs text-[#6a6c6b]">Más de 5 pedidos realizados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#e9ecef] shadow-sm opacity-50">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-lg flex items-center justify-center flex-shrink-0">
                      <HiMiniBanknotes className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#212529]">VIP</p>
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
