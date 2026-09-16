'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { FiUser, FiMail, FiPhone, FiCalendar, FiSave, FiCamera, FiMapPin, FiGlobe, FiAward, FiShoppingBag, FiBriefcase, FiFileText, FiCheckCircle, FiAlertCircle, FiClock, FiTrendingUp, FiPackage } from 'react-icons/fi';
import { HiMiniBanknotes } from 'react-icons/hi2';
import DocumentUpload from '@/components/customer/DocumentUpload';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  adminCard,
  adminPrimaryButton,
  adminSecondaryButton,
  adminTab,
  adminBadge,
  adminModalOverlay,
  adminModalPanel,
} from '@/lib/admin-ui';

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

  // Tutorial for business account
  const [showBusinessTip, setShowBusinessTip] = useState(false);
  useBodyScrollLock(showBusinessTip);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchProfile();
    fetchStats();

    // Check if user has seen the business tip
    const hasSeenTip = localStorage.getItem('hasSeenBusinessTip');
    if (!hasSeenTip) {
      setTimeout(() => setShowBusinessTip(true), 2500);
    }
  }, []);

  const dismissBusinessTip = () => {
    setShowBusinessTip(false);
    localStorage.setItem('hasSeenBusinessTip', 'true');
  };

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
      toast.error('No se pudieron cargar las estadísticas');
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
        icon: <FiAlertCircle className="w-5 h-5 text-brand-500" />,
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
          <span className={adminBadge('success')}>
            <FiCheckCircle className="w-3 h-3" />
            Verificado
          </span>
        );
      case 'PENDING':
        return (
          <span className={adminBadge('warning')}>
            <FiClock className="w-3 h-3" />
            Pendiente de revisión
          </span>
        );
      case 'REJECTED':
        return (
          <span className={adminBadge('danger')}>
            <FiAlertCircle className="w-3 h-3" />
            Rechazado
          </span>
        );
      default:
        return (
          <span className={adminBadge('neutral')}>
            <FiClock className="w-3 h-3" />
            No verificado
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2 lg:space-y-3">
      {/* Header with Save Button */}
      <div className={`${adminCard} p-4 lg:p-5 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0">
            <FiUser className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg lg:text-2xl font-bold text-ink tracking-tight">Mi Perfil</h1>
            <p className="text-xs lg:text-sm text-muted font-medium">Gestiona tu información y preferencias</p>
          </div>
        </div>
        {activeTab === 'personal' && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`${adminPrimaryButton} text-xs lg:text-sm py-2 px-4 flex items-center justify-center gap-2`}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">Guardando...</span>
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                <span className="hidden sm:inline">Guardar Cambios</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-line">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={adminTab(activeTab === 'personal')}
          >
            Información Personal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={adminTab(activeTab === 'business')}
          >
            <FiBriefcase className="inline w-4 h-4 mr-1" />
            Cuenta Empresarial
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={adminTab(activeTab === 'stats')}
          >
            Estadísticas
          </button>
        </div>

        <div className="p-2 sm:p-4 lg:p-5">
          {activeTab === 'personal' ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
              {/* Profile Picture */}
              <div className="xl:col-span-1">
                <div className="bg-transparent sm:bg-white rounded-2xl border-0 sm:border border-line shadow-none sm:shadow-md p-0 sm:p-5 sticky top-24">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4 group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <div className="w-28 h-28 rounded-full bg-brand-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl overflow-hidden ring-4 ring-brand-100 group-hover:ring-brand-200 transition-all">
                        {avatarPreview || profile.avatar || profile.image ? (
                          <Image
                            src={(avatarPreview || profile.avatar || profile.image) as string}
                            alt="Profile"
                            width={112}
                            height={112}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          session?.user?.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 p-2 bg-brand-500 rounded-full shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                        <FiCamera className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-1">{profile.name || 'Usuario'}</h3>
                    <p className="text-sm text-muted font-medium mb-5">{profile.email}</p>

                    {/* Quick Stats */}
                    <div className="w-full space-y-3 pt-4 border-t border-line">
                      <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-500">
                          <FiCalendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted font-bold uppercase tracking-wider">Miembro desde</p>
                          <p className="text-sm font-bold text-ink">
                            {new Date(stats.memberSince).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success-strong">
                          <FiPackage className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted font-bold uppercase tracking-wider">Total Pedidos</p>
                          <p className="text-sm font-bold text-ink">{stats.totalOrders}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <div className="xl:col-span-2">
                <div className="space-y-4 sm:space-y-6">
                  {/* Alert for sensitive info */}
                  <div className="bg-surface border border-line rounded-xl p-3 sm:p-4 flex items-start gap-3 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <FiAlertCircle className="w-4 h-4 text-brand-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink mb-0.5">Protección de Seguridad</p>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        Tu nombre completo y cédula están protegidos por seguridad una vez configurados. Si necesitas actualizar esta información por razones legales, por favor contacta a nuestro equipo de soporte técnico.
                      </p>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="bg-transparent sm:bg-white rounded-2xl border-0 sm:border border-line shadow-none sm:shadow-md p-0 sm:p-6">
                    <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                      <FiUser className="w-5 h-5 text-brand-500" />
                      Información Personal
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nombre - 1 columna (o 2 en web) */}
                      <div className="sm:col-span-2 relative group">
                        <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                          Nombre Completo *
                        </label>
                        <div className="relative">
                          <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                          <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => !isNameLocked && setProfile({ ...profile, name: e.target.value })}
                            disabled={isNameLocked}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 disabled:bg-surface disabled:text-muted disabled:border-line disabled:cursor-not-allowed font-medium shadow-sm"
                            placeholder="Ej: Juan Pérez"
                          />
                        </div>
                        {isNameLocked && (
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-ink text-white text-xs rounded-lg px-3 py-2.5 z-20 shadow-xl text-center">
                            <div className="relative">
                              <strong>Protegido:</strong> Por seguridad, contacta a soporte para modificar tu nombre.
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-ink"></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cédula */}
                      <div className="col-span-1 relative group">
                        <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                          Documento de Identidad *
                        </label>
                        <div className="relative">
                          <FiFileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                          <input
                            type="text"
                            value={profile.idNumber}
                            // Se bloquea con la cédula GUARDADA: con la que se escribe, el campo se cerraba después de la primera letra (C-85)
                            onChange={(e) => !initialProfile.idNumber && setProfile({ ...profile, idNumber: e.target.value.toUpperCase() })}
                            disabled={!!initialProfile.idNumber}
                            maxLength={15}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 disabled:bg-surface disabled:text-muted disabled:border-line disabled:cursor-not-allowed uppercase font-medium shadow-sm"
                            placeholder="V-12345678"
                          />
                        </div>
                      </div>

                      {/* Teléfono */}
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                          Teléfono Móvil
                        </label>
                        <div className="flex gap-2">
                          {/* Country Dropdown */}
                          <div className="relative" ref={dropdownRef}>
                            <button
                              type="button"
                              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                              className="h-full px-4 py-3 bg-surface border border-line rounded-xl flex items-center gap-2 hover:border-brand-500 transition-all duration-200 focus:outline-none focus:border-brand-500 shadow-sm"
                            >
                              <div className="relative w-5 h-3.5 shadow-sm rounded-sm overflow-hidden flex-shrink-0">
                                <Image src={`https://flagcdn.com/w40/${COUNTRY_CODES.find(c => c.code === countryCode)?.iso || 've'}.png`} alt="Flag" fill sizes="20px" className="object-cover" />
                              </div>
                              <span className="text-xs font-bold text-ink">{countryCode}</span>
                            </button>

                            {showCountryDropdown && (
                              <div className="absolute top-full left-0 mt-1 w-56 max-h-56 overflow-y-auto bg-white border border-line rounded-xl shadow-2xl z-[var(--z-dropdown)] py-1">
                                {COUNTRY_CODES.map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                      setCountryCode(country.code);
                                      setShowCountryDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-brand-50 transition-colors"
                                  >
                                    <div className="relative w-5 h-3.5 shadow-sm rounded-sm overflow-hidden flex-shrink-0">
                                      <Image src={`https://flagcdn.com/w40/${country.iso}.png`} alt={country.country} fill sizes="20px" className="object-cover" />
                                    </div>
                                    <span className="text-sm text-ink flex-1 truncate font-medium">{country.country}</span>
                                    <span className="text-xs text-brand-500 font-bold bg-brand-50 px-1.5 py-0.5 rounded-md">{country.code}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="relative flex-1">
                            <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                            <input
                              type="tel"
                              value={profile.phone}
                              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                              maxLength={11}
                              className="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 font-medium shadow-sm"
                              placeholder="4121234567"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                          <input
                            type="email"
                            value={profile.email}
                            disabled
                            className="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-line rounded-xl text-muted cursor-not-allowed font-medium shadow-sm"
                          />
                        </div>
                      </div>

                      {/* Fecha de Nacimiento */}
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                          Nacimiento
                        </label>
                        <div className="relative">
                          <FiCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none z-10" />
                          <input
                            type="date"
                            value={profile.birthdate}
                            onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 font-medium text-ink shadow-sm"
                          />
                        </div>
                      </div>

                      {/* Género */}
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                          Género
                        </label>
                        <div className="relative">
                          <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none z-10" />
                          <select
                            value={profile.gender}
                            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                            className="w-full pl-10 pr-8 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 font-medium text-ink shadow-sm"
                          >
                            <option value="prefer_not_to_say">No especificar</option>
                            <option value="male">Masculino</option>
                            <option value="female">Femenino</option>
                            <option value="other">Otro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-transparent sm:bg-white rounded-2xl border-0 sm:border border-line shadow-none sm:shadow-md p-0 sm:p-6 mb-6 sm:mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                        <FiMapPin className="w-5 h-5 text-brand-500" />
                        Dirección de Facturación
                      </h2>
                      <div className="group relative hidden sm:block ml-2">
                        <FiAlertCircle className="w-4 h-4 text-subtle hover:text-brand-500 transition-colors cursor-help" />
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-ink text-white text-xs rounded-lg px-4 py-3 z-20 shadow-xl font-medium leading-relaxed">
                          <div className="relative">
                            Esta información se usa principalmente para facturación. Para gestionar tus lugares de envío, dirígete a la sección <strong>"Direcciones"</strong> en el menú principal.
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-ink"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                          Ciudad
                        </label>
                        <div className="relative">
                          <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                          <input
                            type="text"
                            value={profile.city}
                            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 font-medium shadow-sm"
                            placeholder="Ej: Caracas"
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                          Estado
                        </label>
                        <div className="relative">
                          <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none z-10" />
                          <select
                            value={profile.state}
                            onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                            className="w-full pl-10 pr-8 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 font-medium text-ink shadow-sm"
                          >
                            <option value="">Sel...</option>
                            {VENEZUELA_STATES.map(state => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Type Selector */}
                  <div className="bg-transparent sm:bg-white rounded-2xl border-0 sm:border border-line shadow-none sm:shadow-md p-0 sm:p-6 mb-6 sm:mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                        <FiFileText className="w-5 h-5 text-brand-500" />
                        Preferencias de Facturación
                      </h2>
                      <div className="group relative ml-2">
                        <FiAlertCircle className="w-4 h-4 text-subtle hover:text-brand-500 transition-colors cursor-help" />
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-ink text-white text-xs rounded-lg px-4 py-3 z-20 shadow-xl font-medium leading-relaxed">
                          <div className="relative">
                            Selecciona cómo deseas recibir tus recibos de compra. La opción "Empresa Jurídica" requiere verificación empresarial aprobada.
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-ink"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Natural Person */}
                      <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${profile.receiptType === 'PERSON'
                        ? 'border-brand-500 bg-brand-50 shadow-sm'
                        : 'border-line bg-white hover:border-line hover:bg-surface'
                        }`}>
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${profile.receiptType === 'PERSON' ? 'border-brand-500 bg-brand-500' : 'border-line-strong'}`}>
                          {profile.receiptType === 'PERSON' && <FiCheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FiUser className={`w-4 h-4 ${profile.receiptType === 'PERSON' ? 'text-brand-500' : 'text-subtle'}`} />
                            <span className="text-sm font-bold text-ink">Persona Natural</span>
                          </div>
                          <p className="text-xs text-muted font-medium leading-relaxed">
                            Recibos a nombre propio con tu cédula de identidad.
                          </p>
                        </div>
                        {/* Hidden input to maintain logic */}
                        <input
                          type="radio"
                          name="receiptType"
                          value="PERSON"
                          checked={profile.receiptType === 'PERSON'}
                          onChange={(e) => setProfile({ ...profile, receiptType: e.target.value })}
                          className="hidden"
                        />
                      </label>

                      {/* Business */}
                      <div className="relative group">
                        <label className={`flex items-start gap-3 p-4 border-2 rounded-xl transition-all h-full ${profile.receiptType === 'BUSINESS'
                          ? 'border-brand-500 bg-brand-50 shadow-sm'
                          : profile.businessVerificationStatus !== 'APPROVED'
                            ? 'border-line bg-surface cursor-not-allowed opacity-70'
                            : 'border-line bg-white hover:border-line hover:bg-surface cursor-pointer'
                          }`}>
                          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${profile.receiptType === 'BUSINESS' ? 'border-brand-500 bg-brand-500' : 'border-line-strong'}`}>
                            {profile.receiptType === 'BUSINESS' && <FiCheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FiBriefcase className={`w-4 h-4 ${profile.receiptType === 'BUSINESS' ? 'text-brand-500' : 'text-subtle'}`} />
                              <span className="text-sm font-bold text-ink">Empresa Jurídica</span>
                            </div>
                            <p className="text-xs text-muted font-medium leading-relaxed">
                              Facturas formales a nombre de tu empresa con número de RIF.
                            </p>
                          </div>
                          {/* Hidden input */}
                          <input
                            type="radio"
                            name="receiptType"
                            value="BUSINESS"
                            checked={profile.receiptType === 'BUSINESS'}
                            onChange={(e) => setProfile({ ...profile, receiptType: e.target.value })}
                            disabled={profile.businessVerificationStatus !== 'APPROVED'}
                            className="hidden"
                          />
                        </label>
                        
                        {/* Lock overlay for not approved */}
                        {profile.businessVerificationStatus !== 'APPROVED' && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center" onClick={() => {
                            toast.error('Requiere cuenta empresarial verificada. Ve a la pestaña de "Cuenta Empresarial".');
                            setTimeout(() => setActiveTab('business'), 1500);
                          }}>
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-warning/10 text-warning-strong text-xs font-bold rounded flex items-center gap-1 shadow-sm border border-warning/30">
                              <FiAlertCircle className="w-3 h-3" />
                              Verificación Requerida
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : activeTab === 'business' ? (
            <div className="space-y-3">
              {/* Business Account Section - Compact */}
              <div className="bg-surface rounded-xl p-3 border border-line">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiBriefcase className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-ink mb-1">Certificación de Cuenta Empresarial</h3>
                    <p className="text-xs text-muted mb-2">
                      Verifica tu empresa para acceder a beneficios exclusivos, facturación fiscal y condiciones especiales.
                    </p>

                    {/* Verification Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink">Estado:</span>
                      {getStatusBadge(profile.businessVerificationStatus || 'NONE')}
                    </div>

                    {profile.businessVerificationStatus === 'REJECTED' && profile.businessVerificationNotes && (
                      <div className="mt-2 p-2 bg-deal-bg border border-deal/20 rounded-lg text-xs text-deal">
                        <strong>Motivo del rechazo:</strong> {profile.businessVerificationNotes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Information Form - Compact */}
              <div className="bg-transparent sm:bg-white rounded-xl border-0 sm:border border-line shadow-none sm:shadow-sm p-0 sm:p-4">
                <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                  <FiFileText className="w-4 h-4 text-brand-500" />
                  Información de la Empresa
                </h3>

                <div className="space-y-3">
                  {/* Company Name & RIF */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        Nombre de la Empresa *
                      </label>
                      <div className="relative">
                        <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                        <input
                          type="text"
                          value={profile.companyName}
                          onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                          disabled={profile.businessVerificationStatus === 'PENDING' || profile.businessVerificationStatus === 'APPROVED'}
                          placeholder="Ej: Tecnología Avanzada C.A."
                          className="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 disabled:bg-surface disabled:text-muted disabled:border-line disabled:cursor-not-allowed font-medium shadow-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wider">
                        RIF / NIT *
                      </label>
                      <div className="relative">
                        <FiFileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                        <input
                          type="text"
                          value={profile.taxId}
                          onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                          disabled={profile.businessVerificationStatus === 'PENDING' || profile.businessVerificationStatus === 'APPROVED'}
                          placeholder="Ej: J-12345678-9"
                          className="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-line focus:border-brand-500 focus:border-brand-500 rounded-xl outline-none hover:border-brand-500 transition-all duration-200 disabled:bg-surface disabled:text-muted disabled:border-line disabled:cursor-not-allowed font-medium shadow-sm"
                        />
                      </div>
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
                  <div className="bg-surface border border-success-strong/20 rounded-lg p-2.5">
                    <h4 className="text-xs font-bold text-success-strong mb-1.5 flex items-center gap-1.5">
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      Beneficios de Cuenta Empresarial
                    </h4>
                    <ul className="text-xs text-success-strong space-y-0.5 ml-5 list-disc">
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
                      className="w-full px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
                  className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-line shadow-sm hover:shadow-lg transition-all"
                  
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-brand-500 rounded-lg flex items-center justify-center">
                      <FiPackage className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <p className="text-xl lg:text-3xl font-bold text-brand-500">{stats.totalOrders}</p>
                  </div>
                  <h3 className="font-bold text-xs lg:text-sm text-muted mt-1 lg:mt-2 uppercase tracking-wider">Pedidos</h3>
                </div>

                <div
                  className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-line shadow-sm hover:shadow-lg transition-all"
                  
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-brand-500 rounded-lg flex items-center justify-center">
                      <HiMiniBanknotes className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-xl lg:text-3xl font-bold text-brand-500">${stats.totalSpent.toFixed(0)}</p>
                    </div>
                  </div>
                  <h3 className="font-bold text-xs lg:text-sm text-muted mt-1 lg:mt-2 uppercase tracking-wider">Gastado</h3>
                </div>

                <div
                  className="bg-white rounded-lg lg:rounded-xl p-3 lg:p-4 border border-line shadow-sm hover:shadow-lg transition-all"
                  
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-brand-500 rounded-lg flex items-center justify-center">
                      <FiAward className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <p className="text-xs lg:text-lg font-bold text-brand-500">
                      {new Date(stats.memberSince).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <h3 className="font-bold text-xs lg:text-sm text-muted mt-1 lg:mt-2 uppercase tracking-wider">Cliente</h3>
                </div>
              </div>

              <div
                className="bg-surface rounded-xl p-4 border border-line"
                
              >
                <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                  <FiAward className="w-5 h-5 text-brand-500" />
                  Logros y Beneficios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-line shadow-sm">
                    <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiTrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-ink">Cliente Frecuente</p>
                      <p className="text-xs text-muted">Más de 5 pedidos realizados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-line shadow-sm opacity-50">
                    <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HiMiniBanknotes className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-ink">VIP</p>
                      <p className="text-xs text-muted">Gasta más de $500</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Business Account Tutorial Tip */}
      {showBusinessTip && isMounted && createPortal(
        <div className={adminModalOverlay}>
          <div className={`${adminModalPanel} w-full max-w-[420px] overflow-hidden`}>
            {/* Header */}
            <div className="bg-surface border-b border-line p-5 text-ink flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiBriefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">¡Sabías que...</h2>
                  <p className="text-xs text-muted">Descubre algo nuevo</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-success/10 text-success-strong rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiFileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-base mb-1">¿Necesitas facturación fiscal?</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Puedes registrar tu empresa y obtener <strong className="text-brand-500">facturas fiscales automáticas</strong> en todas tus compras.
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-surface rounded-xl p-4 border border-line">
                <p className="text-xs font-semibold text-brand-600 mb-2">Beneficios exclusivos:</p>
                <ul className="text-xs text-muted space-y-1.5 ml-4 list-disc">
                  <li>Facturación con RIF empresarial</li>
                  <li>Precios mayoristas y descuentos especiales</li>
                  <li>Atención prioritaria y ejecutivo de cuenta</li>
                  <li>Línea de crédito para compras recurrentes</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={dismissBusinessTip}
                  className={`${adminSecondaryButton} flex-1 text-xs`}
                >
                  Entendido
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissBusinessTip();
                    setActiveTab('business');
                  }}
                  className={`${adminPrimaryButton} flex-1 text-xs`}
                >
                  Activar Empresa
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
