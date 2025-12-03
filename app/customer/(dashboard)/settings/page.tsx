'use client';

import { useState, useEffect } from 'react';
import { FiSettings, FiBell, FiShield, FiMail, FiLock, FiGlobe, FiEye, FiEyeOff, FiSun, FiMoon, FiMonitor, FiSave, FiBriefcase, FiUser, FiCreditCard, FiActivity } from 'react-icons/fi';

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
    // TODO: API call to change password
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
    <div className="space-y-3 overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white shadow-lg animate-fadeIn relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FiSettings className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold">Configuración</h1>
          </div>
          <p className="text-xs text-blue-100">Personaliza tu experiencia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Purchase Type Preference - New Section */}
        <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-4 py-2 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FiUser className="w-3 h-3 text-[#2a63cd]" />
              </div>
              <h2 className="text-sm font-bold text-[#212529]">Tipo de Compra</h2>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <h3 className="text-sm font-bold text-[#212529] mb-2">¿Cómo deseas realizar tus compras?</h3>
              <p className="text-xs text-[#6a6c6b] mb-4">
                Selecciona si prefieres comprar como persona natural o como empresa (requiere verificación)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Personal Option */}
                <div className="relative">
                  <input
                    type="radio"
                    id="purchase-personal"
                    name="purchase-type"
                    checked={!settings.purchaseAsBusinessDefault}
                    onChange={() => setSettings({ ...settings, purchaseAsBusinessDefault: false })}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor="purchase-personal"
                    className="block p-4 bg-white border-2 border-[#e9ecef] rounded-lg cursor-pointer hover:border-[#2a63cd]/50 peer-checked:border-[#2a63cd] peer-checked:bg-blue-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiUser className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#212529]">Persona Natural</p>
                        <p className="text-xs text-[#6a6c6b]">Para compras personales</p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Business Option */}
                <div className="relative">
                  <input
                    type="radio"
                    id="purchase-business"
                    name="purchase-type"
                    className="peer sr-only"
                    disabled={!settings.businessVerified}
                    checked={settings.purchaseAsBusinessDefault}
                    onChange={() => setSettings({ ...settings, purchaseAsBusinessDefault: true })}
                  />
                  <label
                    htmlFor="purchase-business"
                    className={`block p-4 bg-white border-2 rounded-lg transition-all
                      ${!settings.businessVerified
                        ? 'border-[#e9ecef] cursor-not-allowed opacity-60'
                        : 'border-[#e9ecef] cursor-pointer hover:border-[#2a63cd]/50 peer-checked:border-[#2a63cd] peer-checked:bg-purple-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiBriefcase className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#212529]">Empresa</p>
                        <p className="text-xs text-[#6a6c6b]">
                          {settings.businessVerified ? 'Compras corporativas' : 'Requiere verificación'}
                        </p>
                      </div>
                    </div>
                    {!settings.businessVerified && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit
                          ${settings.businessVerificationStatus === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-orange-100 text-orange-700'
                          }`}>
                          {settings.businessVerificationStatus === 'PENDING' ? '⏳ En revisión' : '🔒 Verifica tu empresa'}
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Additional Business Info */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-xs text-[#6a6c6b]">
                  <strong className="text-[#212529]">Nota:</strong> Para habilitar compras como empresa, primero debes verificar tu cuenta empresarial en la sección "Mi Perfil → Cuenta Empresarial".
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                <FiUser className="w-3 h-3 text-[#2a63cd]" />
              </div>
              <h2 className="text-sm font-bold text-[#212529]">Cuenta</h2>
              <p className="text-xs text-[#6a6c6b]">Información de tu cuenta</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-lg">
            <div>
              <p className="font-medium text-[#212529]">Estado de la cuenta</p>
              <p className="text-sm text-[#6a6c6b]">Activa y verificada</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
              Activa
            </span>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-lg">
            <div>
              <p className="font-medium text-[#212529]">Tipo de cuenta</p>
              <p className="text-sm text-[#6a6c6b]">Cliente Regular</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              Regular
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <FiBell className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#212529]">Notificaciones</h2>
              <p className="text-xs text-[#6a6c6b]">Gestiona tus preferencias</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[
            { key: 'emailNotifications', label: 'Notificaciones por email', description: 'Recibe actualizaciones importantes' },
            { key: 'orderUpdates', label: 'Actualizaciones de pedidos', description: 'Estado de tus compras' },
            { key: 'promotions', label: 'Promociones y ofertas', description: 'Descuentos especiales' },
            { key: 'newsletter', label: 'Boletín informativo', description: 'Noticias y novedades' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between cursor-pointer group p-3 rounded-lg hover:bg-[#f8f9fa] transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium text-[#212529]">{item.label}</p>
                <p className="text-xs text-[#6a6c6b]">{item.description}</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings[item.key as keyof typeof settings] as boolean}
                  onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#e9ecef] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2a63cd]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2a63cd]"></div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <FiShield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#212529]">Seguridad</h2>
              <p className="text-xs text-[#6a6c6b]">Protege tu cuenta</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <label className="flex items-center justify-between cursor-pointer p-4 bg-[#f8f9fa] rounded-lg hover:bg-[#e9ecef] transition-colors">
            <div className="flex-1">
              <p className="text-sm font-medium text-[#212529]">Autenticación de dos factores</p>
              <p className="text-xs text-[#6a6c6b]">Mayor seguridad para tu cuenta</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.twoFactorAuth}
                onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#e9ecef] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2a63cd]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2a63cd]"></div>
            </div>
          </label>

          <div className="pt-4 border-t border-[#e9ecef]">
            <h3 className="text-sm font-bold text-[#212529] mb-3">Sesiones Activas</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FiMonitor className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-[#212529]">Sesión actual</p>
                    <p className="text-xs text-[#6a6c6b]">Windows • Chrome</p>
                  </div>
                </div>
                <span className="text-xs text-green-600 font-semibold">Activa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-lg border border-[#e9ecef] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FiGlobe className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#212529]">Preferencias</h2>
              <p className="text-xs text-[#6a6c6b]">Personaliza tu experiencia</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#212529] mb-2">
              <FiGlobe className="inline w-4 h-4 mr-2" />
              Idioma
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#212529] mb-2">
              <FiCreditCard className="inline w-4 h-4 mr-2" />
              Moneda
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="VES">VES (Bs)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#212529] mb-2">
              <FiSun className="inline w-4 h-4 mr-2" />
              Tema
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', label: 'Claro', icon: FiSun },
                { value: 'dark', label: 'Oscuro', icon: FiMoon },
                { value: 'auto', label: 'Auto', icon: FiMonitor },
              ].map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setSettings({ ...settings, theme: theme.value })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${settings.theme === theme.value
                    ? 'border-[#2a63cd] bg-[#2a63cd]/5'
                    : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                    }`}
                >
                  <theme.icon className={`w-5 h-5 ${settings.theme === theme.value ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`} />
                  <span className={`text-xs font-medium ${settings.theme === theme.value ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'}`}>
                    {theme.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-[#e9ecef] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FiLock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#212529]">Cambiar Contraseña</h2>
              <p className="text-xs text-[#6a6c6b]">Actualiza tu contraseña regularmente</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#212529] mb-2">Contraseña Actual</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2.5 pr-10 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a6c6b] hover:text-[#212529]"
                >
                  {showPasswords.current ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#212529] mb-2">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2.5 pr-10 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a6c6b] hover:text-[#212529]"
                >
                  {showPasswords.new ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#212529] mb-2">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 pr-10 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a6c6b] hover:text-[#212529]"
                >
                  {showPasswords.confirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            className="mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
          >
            <FiLock className="w-4 h-4" />
            Cambiar Contraseña
          </button>
        </div>
      </div>

      {/* Save Settings Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-semibold rounded-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FiSave className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}
