'use client';

import { useState, useEffect } from 'react';
import { FiSettings, FiBell, FiShield, FiGlobe, FiEye, FiEyeOff, FiSun, FiMoon, FiMonitor, FiSave, FiBriefcase, FiUser, FiCreditCard, FiLock, FiAlertCircle, FiActivity } from 'react-icons/fi';
import EpicTooltip from '@/components/EpicTooltip';

// Reusable Section Component
const SettingsSection = ({ title, icon: Icon, children, description }: any) => (
  <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm overflow-hidden h-fit">
    <div className="px-4 py-3 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
        <Icon className="w-4 h-4 text-[#2a63cd]" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-[#212529]">{title}</h2>
        {description && <p className="text-[10px] text-[#6a6c6b]">{description}</p>}
      </div>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
    newsletter: true,
    twoFactorAuth: false,
    language: 'es',
    currency: 'USD',
    theme: 'light',
    isBusinessAccount: false,
    businessVerified: false,
    businessVerificationStatus: 'NONE',
    purchaseAsBusinessDefault: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/customer/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/customer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Configuración guardada exitosamente');
      } else {
        alert('Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    alert('Función de cambio de contraseña - Próximamente');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto h-full pb-4 pr-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white shadow-lg relative overflow-hidden flex items-center justify-between">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <FiSettings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Configuración</h1>
            <p className="text-xs text-blue-100">Personaliza tu experiencia en Electro Shop</p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="relative z-10 px-5 py-2 bg-white text-[#2a63cd] text-sm font-bold rounded-lg hover:bg-blue-50 transition-all shadow-md flex items-center gap-2 disabled:opacity-75"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {/* Column 1: Preferences & Purchase Type */}
        <div className="lg:col-span-1 space-y-3">
          {/* Purchase Type */}
          <SettingsSection title="Preferencias y Seguridad" icon={FiBriefcase} description="Opciones de cuenta y visualización">
            <div className="space-y-4">
              {/* Purchase Type */}
              <div className="p-3 border border-[#e9ecef] rounded-xl">
                <h3 className="text-xs font-bold text-[#212529] mb-2 flex items-center gap-2">
                  <FiUser className="w-3.5 h-3.5 text-[#2a63cd]" />
                  Tipo de Compra
                </h3>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${!settings.purchaseAsBusinessDefault
                    ? 'border-[#2a63cd] bg-blue-50/50'
                    : 'border-[#e9ecef] hover:border-blue-200'
                    }`}>
                    <input
                      type="radio"
                      name="purchaseType"
                      checked={!settings.purchaseAsBusinessDefault}
                      onChange={() => setSettings({ ...settings, purchaseAsBusinessDefault: false })}
                      className="w-4 h-4 text-[#2a63cd] focus:ring-[#2a63cd]"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-[#212529]">Persona Natural</span>
                    </div>
                  </label>

                  <div className="relative group/tooltip">
                    <label className={`flex items-center gap-3 p-2.5 border rounded-lg transition-all ${settings.purchaseAsBusinessDefault
                      ? 'border-[#2a63cd] bg-blue-50/50'
                      : 'border-[#e9ecef] hover:border-blue-200'
                      } ${!settings.businessVerified ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name="purchaseType"
                        checked={settings.purchaseAsBusinessDefault}
                        onChange={() => setSettings({ ...settings, purchaseAsBusinessDefault: true })}
                        disabled={!settings.businessVerified}
                        className="w-4 h-4 text-[#2a63cd] focus:ring-[#2a63cd]"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#212529]">Empresa (Jurídico)</span>
                        {settings.businessVerified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Verificado</span>}
                      </div>
                    </label>
                    {!settings.businessVerified && (
                      <div className="absolute top-1/2 right-2 -translate-y-1/2">
                        <FiAlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute left-full top-0 ml-2 w-48 hidden group-hover/tooltip:block z-50">
                          <div className="bg-[#1e293b] text-white text-[10px] p-2 rounded-lg shadow-xl">
                            Debes verificar tu empresa en "Mi Perfil" para activar esta opción.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme */}
              <div className="p-3 border border-[#e9ecef] rounded-xl bg-white">
                <h3 className="text-xs font-bold text-[#212529] mb-2 flex items-center gap-2">
                  <FiSun className="w-3.5 h-3.5 text-[#2a63cd]" />
                  Tema de Aplicación
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'light', label: 'Claro', icon: FiSun },
                    { val: 'dark', label: 'Oscuro', icon: FiMoon },
                    { val: 'auto', label: 'Auto', icon: FiMonitor }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setSettings({ ...settings, theme: opt.val })}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${settings.theme === opt.val
                        ? 'border-[#2a63cd] bg-blue-50 text-[#2a63cd] shadow-sm'
                        : 'border-[#e9ecef] text-gray-500 hover:bg-gray-50 bg-white'
                        }`}
                    >
                      <opt.icon className="w-3.5 h-3.5 mb-1" />
                      <span className="text-[10px] font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Security Section Integrated */}
              <div className="p-3 border border-[#e9ecef] rounded-xl bg-white">
                <h3 className="text-xs font-bold text-[#212529] mb-2 flex items-center gap-2">
                  <FiShield className="w-3.5 h-3.5 text-[#2a63cd]" />
                  Seguridad
                </h3>
                <div className="space-y-2">
                  <div className="p-2.5 bg-red-50 rounded-lg border border-red-100 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <FiLock className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-red-700">Autenticación 2FA</h3>
                      <p className="text-[10px] text-red-600/80">Capa extra de seguridad</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings.twoFactorAuth}
                        onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-red-500"></div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiMonitor className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-[10px] font-bold text-green-700">Sesión Activa</span>
                    </div>
                    <span className="text-[10px] text-green-600">Windows • Chrome</span>
                  </div>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>

        {/* Column 2: Notifications */}
        <div className="lg:col-span-1 space-y-3">
          <SettingsSection title="Notificaciones" icon={FiBell} description="Elige qué alertas recibir">
            <div className="space-y-0.5">
              {[
                { key: 'emailNotifications', label: 'Correos Electrónicos', sub: 'Resúmenes y alertas importantes', icon: FiActivity },
                { key: 'orderUpdates', label: 'Actualización de Pedidos', sub: 'Cambios de estado de tus compras', icon: FiBriefcase },
                { key: 'promotions', label: 'Ofertas y Promociones', sub: 'Descuentos exclusivos para ti', icon: FiCreditCard },
                { key: 'newsletter', label: 'Boletín Semanal', sub: 'Novedades tecnológicas', icon: FiGlobe },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group border border-transparent hover:border-gray-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${settings[item.key as keyof typeof settings] ? 'bg-blue-100 text-[#2a63cd]' : 'bg-gray-100 text-gray-400'
                    }`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-medium transition-colors ${settings[item.key as keyof typeof settings] ? 'text-[#212529]' : 'text-gray-500'}`}>{item.label}</p>
                    <p className="text-[10px] text-[#6a6c6b]">{item.sub}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings[item.key as keyof typeof settings] as boolean}
                      onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2a63cd]"></div>
                  </div>
                </label>
              ))}
            </div>
          </SettingsSection>
        </div>

        {/* Column 3: Change Password & Currency */}
        <div className="lg:col-span-1">
          <SettingsSection title="Seguridad y Región" icon={FiLock} description="Contraseña y moneda">
            <div className="space-y-4">
              {/* Currency Section */}
              <div className="p-3 border border-[#e9ecef] rounded-xl bg-white">
                <h3 className="text-xs font-bold text-[#212529] mb-2 flex items-center gap-2">
                  <FiCreditCard className="w-3.5 h-3.5 text-[#2a63cd]" />
                  Moneda Principal
                </h3>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd] bg-white cursor-pointer hover:border-blue-200 transition-colors"
                >
                  <option value="USD">Dólares Americanos (USD)</option>
                  <option value="VES">Bolívares (VES)</option>
                  <option value="EUR">Euros (EUR)</option>
                </select>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Password Change Fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wider">Contraseña Actual</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full pl-3 pr-8 py-2 text-xs border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                      placeholder="••••••••"
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2a63cd]"
                    >
                      {showPasswords.current ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wider">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full pl-3 pr-8 py-2 text-xs border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                      placeholder="••••••••"
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2a63cd]"
                    >
                      {showPasswords.new ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6a6c6b] uppercase tracking-wider">Confirmar</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full pl-3 pr-8 py-2 text-xs border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                      placeholder="••••••••"
                    />
                    <button
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2a63cd]"
                    >
                      {showPasswords.confirm ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  className="w-full py-2.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <FiLock className="w-3 h-3" />
                  Actualizar Contraseña
                </button>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div >
    </div >
  );
}
