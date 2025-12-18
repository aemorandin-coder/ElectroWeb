'use client';

import { useState, useEffect } from 'react';
import {
  FiSettings, FiBell, FiShield, FiEye, FiEyeOff, FiSave, FiUser, FiLock,
  FiAlertCircle, FiMail, FiPackage, FiTag, FiVolume2, FiCheck, FiMonitor,
  FiClock, FiLogOut, FiTrash2, FiAlertTriangle, FiActivity, FiX
} from 'react-icons/fi';
import { HiOutlineShieldCheck } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { signOut } from 'next-auth/react';
import { useConfirm } from '@/contexts/ConfirmDialogContext';

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative w-10 h-5 rounded-full transition-all duration-200 ${checked ? 'bg-[#2a63cd]' : 'bg-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div
      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${checked ? 'left-5' : 'left-0.5'
        }`}
    />
  </button>
);

export default function SettingsPage() {
  const { confirm } = useConfirm();

  const [settings, setSettings] = useState({
    purchaseAsBusinessDefault: false,
    businessVerified: false,
    businessVerificationStatus: 'NONE',
  });

  const [notifications, setNotifications] = useState({
    emailOrders: true,
    emailPromotions: false,
    inAppOrders: true,
    inAppPromotions: true,
    soundEnabled: false,
  });

  const [privacy, setPrivacy] = useState({
    allowSurveys: true,
    shareAnonymousData: false,
  });

  const [sessionInfo, setSessionInfo] = useState({
    lastLoginAt: null as string | null,
    lastLoginDevice: 'Desconocido',
  });

  const [accountStatus, setAccountStatus] = useState('ACTIVE');

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
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/customer/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          purchaseAsBusinessDefault: data.purchaseAsBusinessDefault || false,
          businessVerified: data.businessVerified || false,
          businessVerificationStatus: data.businessVerificationStatus || 'NONE',
        });
        if (data.notifications) {
          setNotifications({
            emailOrders: data.notifications.emailOrders ?? true,
            emailPromotions: data.notifications.emailPromotions ?? false,
            inAppOrders: data.notifications.inAppOrders ?? true,
            inAppPromotions: data.notifications.inAppPromotions ?? true,
            soundEnabled: data.notifications.soundEnabled ?? false,
          });
        }
        if (data.privacy) {
          setPrivacy(data.privacy);
        }
        if (data.session) {
          setSessionInfo({
            lastLoginAt: data.session.lastLoginAt,
            lastLoginDevice: data.session.lastLoginDevice || 'Desconocido',
          });
        }
        if (data.accountStatus) {
          setAccountStatus(data.accountStatus);
        }
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
        body: JSON.stringify({
          purchaseAsBusinessDefault: settings.purchaseAsBusinessDefault,
          notifications,
          privacy,
        }),
      });

      if (response.ok) {
        toast.success('Configuración guardada');
      } else {
        toast.error('Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Mínimo 8 caracteres');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/customer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Contraseña actualizada');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Error');
      }
    } catch (error) {
      toast.error('Error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    const confirmed = await confirm({
      title: 'Cerrar todas las sesiones',
      message: 'Se cerrará tu sesión actual y todas las demás. ¿Continuar?',
      confirmText: 'Sí, cerrar todas',
      cancelText: 'Cancelar',
      type: 'warning',
    });

    if (confirmed) {
      toast.success('Sesiones cerradas');
      await signOut({ callbackUrl: '/login' });
    }
  };

  const handleDeactivateAccount = async () => {
    const confirmed = await confirm({
      title: 'Desactivar cuenta',
      message: 'Tu cuenta será desactivada temporalmente. Podrás reactivarla en cualquier momento iniciando sesión. ¿Continuar?',
      confirmText: 'Sí, desactivar',
      cancelText: 'Cancelar',
      type: 'warning',
    });

    if (confirmed) {
      try {
        const response = await fetch('/api/customer/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deactivate' }),
        });

        if (response.ok) {
          toast.success('Cuenta desactivada');
          await signOut({ callbackUrl: '/login' });
        } else {
          toast.error('Error al desactivar');
        }
      } catch (error) {
        toast.error('Error');
      }
    }
  };

  const handleRequestDeletion = async () => {
    const confirmed = await confirm({
      title: 'Eliminar cuenta permanentemente',
      message: 'Esta acción es IRREVERSIBLE. Todos tus datos serán eliminados en 30 días. Durante este período puedes cancelar la solicitud. ¿Estás seguro?',
      confirmText: 'Sí, eliminar mi cuenta',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (confirmed) {
      try {
        const response = await fetch('/api/customer/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request_deletion' }),
        });

        const data = await response.json();
        if (response.ok) {
          toast.success(data.message);
          setAccountStatus('PENDING_DELETION');
        } else {
          toast.error('Error al procesar solicitud');
        }
      } catch (error) {
        toast.error('Error');
      }
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const response = await fetch('/api/customer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_deletion' }),
      });

      if (response.ok) {
        toast.success('Solicitud cancelada');
        setAccountStatus('ACTIVE');
      } else {
        toast.error('Error');
      }
    } catch (error) {
      toast.error('Error');
    }
  };

  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-VE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2a63cd] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <FiSettings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Configuración</h1>
              <p className="text-xs text-blue-100">Personaliza tu cuenta</p>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#2a63cd] text-sm font-bold rounded-lg hover:bg-blue-50 transition-all disabled:opacity-70"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2a63cd] border-t-transparent" />
            ) : (
              <FiSave className="w-4 h-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Pending Deletion Warning */}
      {accountStatus === 'PENDING_DELETION' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-700">Cuenta programada para eliminación</p>
              <p className="text-xs text-red-600">Tu cuenta será eliminada permanentemente en 30 días.</p>
            </div>
          </div>
          <button
            onClick={handleCancelDeletion}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-all"
          >
            <FiX className="w-3 h-3" />
            Cancelar solicitud
          </button>
        </div>
      )}

      {/* Main Grid - Flexible like Marketing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Column 1: Account Type + Privacy */}
        <div className="space-y-4">
          {/* Account Type - Compact */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <FiUser className="w-4 h-4 text-[#2a63cd]" />
              <h2 className="text-sm font-bold text-slate-800">Tipo de Cuenta</h2>
            </div>
            <div className="p-3 space-y-2">
              <label className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all text-sm ${!settings.purchaseAsBusinessDefault ? 'border-[#2a63cd] bg-[#2a63cd]/5' : 'border-slate-200'
                }`}>
                <input
                  type="radio"
                  checked={!settings.purchaseAsBusinessDefault}
                  onChange={() => setSettings({ ...settings, purchaseAsBusinessDefault: false })}
                  className="w-3.5 h-3.5 text-[#2a63cd]"
                />
                <span className="font-medium text-slate-700 flex-1">Persona Natural</span>
                {!settings.purchaseAsBusinessDefault && <FiCheck className="w-4 h-4 text-[#2a63cd]" />}
              </label>

              <label className={`flex items-center gap-2 p-2.5 border rounded-lg transition-all text-sm ${settings.purchaseAsBusinessDefault ? 'border-[#2a63cd] bg-[#2a63cd]/5' : 'border-slate-200'
                } ${!settings.businessVerified ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  checked={settings.purchaseAsBusinessDefault}
                  onChange={() => setSettings({ ...settings, purchaseAsBusinessDefault: true })}
                  disabled={!settings.businessVerified}
                  className="w-3.5 h-3.5 text-[#2a63cd]"
                />
                <span className="font-medium text-slate-700 flex-1">Empresa</span>
                {settings.businessVerified ? (
                  <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">OK</span>
                ) : (
                  <FiAlertCircle className="w-4 h-4 text-amber-500" />
                )}
              </label>
            </div>
          </div>

          {/* Privacy - Compact */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <HiOutlineShieldCheck className="w-4 h-4 text-[#2a63cd]" />
              <h2 className="text-sm font-bold text-slate-800">Privacidad</h2>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FiMail className="w-3.5 h-3.5 text-[#2a63cd]" />
                  <span className="text-xs font-medium text-slate-700">Encuestas</span>
                </div>
                <ToggleSwitch
                  checked={privacy.allowSurveys}
                  onChange={(v) => setPrivacy({ ...privacy, allowSurveys: v })}
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FiActivity className="w-3.5 h-3.5 text-[#2a63cd]" />
                  <span className="text-xs font-medium text-slate-700">Datos anónimos</span>
                </div>
                <ToggleSwitch
                  checked={privacy.shareAnonymousData}
                  onChange={(v) => setPrivacy({ ...privacy, shareAnonymousData: v })}
                />
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <FiMonitor className="w-4 h-4 text-[#2a63cd]" />
              <h2 className="text-sm font-bold text-slate-800">Sesión Actual</h2>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <FiClock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Último acceso:</span>
                <span className="font-medium text-slate-700">{formatLastLogin(sessionInfo.lastLoginAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <FiMonitor className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Dispositivo:</span>
                <span className="font-medium text-slate-700">{sessionInfo.lastLoginDevice}</span>
              </div>
              <button
                onClick={handleLogoutAllSessions}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-all"
              >
                <FiLogOut className="w-3.5 h-3.5" />
                Cerrar todas las sesiones
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <FiBell className="w-4 h-4 text-[#2a63cd]" />
            <h2 className="text-sm font-bold text-slate-800">Notificaciones</h2>
          </div>
          <div className="p-3 space-y-3">
            {/* Email */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FiMail className="w-3 h-3" /> Correo
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiPackage className="w-3.5 h-3.5 text-[#2a63cd]" />
                    <span className="text-xs font-medium text-slate-700">Pedidos</span>
                  </div>
                  <ToggleSwitch checked={notifications.emailOrders} onChange={(v) => setNotifications({ ...notifications, emailOrders: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiTag className="w-3.5 h-3.5 text-[#2a63cd]" />
                    <span className="text-xs font-medium text-slate-700">Promociones</span>
                  </div>
                  <ToggleSwitch checked={notifications.emailPromotions} onChange={(v) => setNotifications({ ...notifications, emailPromotions: v })} />
                </div>
              </div>
            </div>

            {/* In-App */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FiBell className="w-3 h-3" /> En la App
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiPackage className="w-3.5 h-3.5 text-[#2a63cd]" />
                    <span className="text-xs font-medium text-slate-700">Pedidos</span>
                  </div>
                  <ToggleSwitch checked={notifications.inAppOrders} onChange={(v) => setNotifications({ ...notifications, inAppOrders: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiTag className="w-3.5 h-3.5 text-[#2a63cd]" />
                    <span className="text-xs font-medium text-slate-700">Ofertas</span>
                  </div>
                  <ToggleSwitch checked={notifications.inAppPromotions} onChange={(v) => setNotifications({ ...notifications, inAppPromotions: v })} />
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiVolume2 className="w-3.5 h-3.5 text-[#2a63cd]" />
                    <span className="text-xs font-medium text-slate-700">Sonidos</span>
                  </div>
                  <ToggleSwitch checked={notifications.soundEnabled} onChange={(v) => setNotifications({ ...notifications, soundEnabled: v })} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Security + Danger Zone */}
        <div className="space-y-4">
          {/* Password Change - Compact */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <FiLock className="w-4 h-4 text-[#2a63cd]" />
              <h2 className="text-sm font-bold text-slate-800">Cambiar Contraseña</h2>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Actual</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#2a63cd]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswords.current ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nueva</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#2a63cd]"
                    placeholder="Mín. 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswords.new ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirmar</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#2a63cd]"
                    placeholder="Repetir"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswords.confirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-[10px] text-red-500 mt-1">No coinciden</p>
                )}
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                className="w-full py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingPassword ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                ) : (
                  <FiLock className="w-3 h-3" />
                )}
                Actualizar
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold text-red-700">Zona de Peligro</h2>
            </div>
            <div className="p-3 space-y-2">
              <button
                onClick={handleDeactivateAccount}
                className="w-full flex items-center justify-between p-2.5 border border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <FiEyeOff className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-slate-700">Desactivar cuenta</span>
                </div>
                <span className="text-[10px] text-slate-400">Temporal</span>
              </button>
              <button
                onClick={handleRequestDeletion}
                disabled={accountStatus === 'PENDING_DELETION'}
                className="w-full flex items-center justify-between p-2.5 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <FiTrash2 className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-slate-700">Eliminar cuenta</span>
                </div>
                <span className="text-[10px] text-slate-400">Permanente</span>
              </button>
              <p className="text-[10px] text-slate-400 px-1">
                Al eliminar tu cuenta, se borrarán todos tus datos de forma permanente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
