'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  FiSettings, FiBell, FiEye, FiEyeOff, FiSave, FiUser, FiLock,
  FiAlertCircle, FiMail, FiPackage, FiTag, FiVolume2, FiCheck, FiMonitor,
  FiClock, FiLogOut, FiTrash2, FiAlertTriangle, FiActivity, FiX, FiSend
} from 'react-icons/fi';
import { HiOutlineShieldCheck } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { signOut } from 'next-auth/react';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { adminCard, adminPrimaryButton, adminLabel } from '@/lib/admin-ui';

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative w-9 h-5 lg:w-10 lg:h-5 rounded-full transition-all duration-200 ${checked ? 'bg-brand-500' : 'bg-line-strong'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div
      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${checked ? 'left-4 lg:left-5' : 'left-0.5'
        }`}
    />
  </button>
);

export default function SettingsPage() {
  const { data: session } = useSession();
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
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

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
    // Check email verification status from session
    if (session?.user) {
      setEmailVerified(!!(session.user as any).emailVerified);
    }
  }, [session]);

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
      toast.error('No se pudo cargar la configuración');
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
    } catch {
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
    } catch {
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
      try {
        const response = await fetch('/api/customer/settings', {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Sesiones cerradas');
          await signOut({ callbackUrl: '/login' });
        } else {
          const data = await response.json();
          toast.error(data.error || 'Error al cerrar las sesiones');
        }
      } catch {
        toast.error('Error al cerrar las sesiones');
      }
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
      } catch {
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
      } catch {
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
    } catch {
      toast.error('Error');
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Correo de verificación enviado');
      } else {
        toast.error(data.error || 'Error al enviar correo');
      }
    } catch {
      toast.error('Error al enviar correo de verificación');
    } finally {
      setResendingVerification(false);
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 pb-6">
      {/* Header */}
      <div className={`${adminCard} p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0">
            <FiSettings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-ink">Configuración</h1>
            <p className="text-xs text-muted hidden sm:block">Personaliza tu cuenta</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className={`${adminPrimaryButton} text-xs lg:text-sm py-2 px-4 w-full sm:w-auto flex items-center justify-center gap-2`}
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <FiSave className="w-4 h-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Pending Deletion Warning */}
      {accountStatus === 'PENDING_DELETION' && (
        <div className="bg-deal-bg border border-deal/30 rounded-xl p-3 lg:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-3">
            <FiAlertTriangle className="w-5 h-5 text-deal flex-shrink-0" />
            <div>
              <p className="text-xs lg:text-sm font-bold text-deal">Cuenta programada para eliminación</p>
              <p className="text-xs text-deal/80">Tu cuenta será eliminada en 30 días.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelDeletion}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white border border-deal/40 text-deal text-xs font-bold rounded-lg hover:bg-deal-bg transition-all w-full sm:w-auto"
          >
            <FiX className="w-3.5 h-3.5" />
            Cancelar
          </button>
        </div>
      )}

      {/* Email Verification Status */}
      {!emailVerified && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 lg:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-warning/20 text-warning-strong flex items-center justify-center flex-shrink-0">
              <FiMail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-bold text-warning-strong">Verificación pendiente</p>
              <p className="text-xs text-ink-soft">
                Verifica tu correo para poder comprar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendingVerification}
            className="flex items-center justify-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 bg-warning-strong text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {resendingVerification ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                Enviando...
              </>
            ) : (
              <>
                <FiSend className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reenviar</span> verificación
              </>
            )}
          </button>
        </div>
      )}

      {/* Email Verified Success Badge */}
      {emailVerified && (
        <div className="bg-success/10 border border-success-strong/20 rounded-xl p-2.5 lg:p-3 flex items-center gap-2 lg:gap-3">
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-success/20 text-success-strong flex items-center justify-center flex-shrink-0">
            <FiCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs lg:text-sm font-bold text-success-strong">Correo verificado</p>
            <p className="text-xs text-muted hidden sm:block">Tu cuenta está lista para comprar.</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-3 gap-3 lg:gap-4">
        {/* Column 1: Account Type + Privacy */}
        <div className="space-y-3 lg:space-y-4">
          {/* Account Type */}
          <div className={`${adminCard} overflow-hidden`}>
            <div className="px-3 lg:px-4 py-2.5 border-b border-line bg-surface flex items-center gap-2">
              <FiUser className="w-4 h-4 text-brand-500" />
              <h2 className="text-xs lg:text-sm font-bold text-ink">Tipo de Cuenta</h2>
            </div>
            <div className="p-3 space-y-2">
              <label
                className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all text-xs lg:text-sm ${
                  !settings.purchaseAsBusinessDefault
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-line hover:border-brand-500/40 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="purchaseAsBusinessDefault"
                  checked={!settings.purchaseAsBusinessDefault}
                  onChange={() => setSettings({ ...settings, purchaseAsBusinessDefault: false })}
                  className="w-3.5 h-3.5 text-brand-500 focus:ring-brand-500"
                />
                <span className="font-medium text-ink flex-1">Personal</span>
              </label>

              {/* Sin verificación de empresa no se puede elegir (R11 lo había dejado activo y el servidor lo rechazaba al guardar) */}
              <label
                className={`flex items-center gap-2 p-2.5 border rounded-lg transition-all text-xs lg:text-sm ${
                  settings.purchaseAsBusinessDefault
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-line hover:border-brand-500/40 bg-white'
                } ${settings.businessVerified ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                <input
                  type="radio"
                  name="purchaseAsBusinessDefault"
                  checked={settings.purchaseAsBusinessDefault}
                  onChange={() => setSettings({ ...settings, purchaseAsBusinessDefault: true })}
                  disabled={!settings.businessVerified}
                  className="w-3.5 h-3.5 text-brand-500 focus:ring-brand-500"
                />
                <span className="font-medium text-ink flex-1">Empresa</span>
                {settings.businessVerified ? (
                  <FiCheck className="w-4 h-4 text-success-strong" />
                ) : (
                  <FiAlertCircle className="w-4 h-4 text-warning-strong" />
                )}
              </label>
            </div>
          </div>

          {/* Privacy */}
          <div className={`${adminCard} overflow-hidden`}>
            <div className="px-3 lg:px-4 py-2.5 border-b border-line bg-surface flex items-center gap-2">
              <HiOutlineShieldCheck className="w-4 h-4 text-brand-500" />
              <h2 className="text-xs lg:text-sm font-bold text-ink">Privacidad</h2>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-line">
                <div className="flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-brand-500" />
                  <span className="text-xs lg:text-sm font-medium text-ink">Encuestas</span>
                </div>
                <ToggleSwitch
                  checked={privacy.allowSurveys}
                  onChange={(v) => setPrivacy({ ...privacy, allowSurveys: v })}
                />
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-line">
                <div className="flex items-center gap-2">
                  <FiActivity className="w-4 h-4 text-brand-500" />
                  <span className="text-xs lg:text-sm font-medium text-ink">Datos anónimos</span>
                </div>
                <ToggleSwitch
                  checked={privacy.shareAnonymousData}
                  onChange={(v) => setPrivacy({ ...privacy, shareAnonymousData: v })}
                />
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className={`${adminCard} overflow-hidden`}>
            <div className="px-3 lg:px-4 py-2.5 border-b border-line bg-surface flex items-center gap-2">
              <FiMonitor className="w-4 h-4 text-brand-500" />
              <h2 className="text-xs lg:text-sm font-bold text-ink">Sesión</h2>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs lg:text-sm">
                <FiClock className="w-4 h-4 text-subtle" />
                <span className="text-muted">Acceso:</span>
                <span className="font-medium text-ink">{formatLastLogin(sessionInfo.lastLoginAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs lg:text-sm">
                <FiMonitor className="w-4 h-4 text-subtle" />
                <span className="text-muted">Disp.:</span>
                <span className="font-medium text-ink truncate">{sessionInfo.lastLoginDevice}</span>
              </div>
              <button
                type="button"
                onClick={handleLogoutAllSessions}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-surface text-ink text-xs lg:text-sm font-medium rounded-lg border border-line hover:bg-line transition-all"
              >
                <FiLogOut className="w-4 h-4" />
                Cerrar sesiones
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Notifications */}
        <div className={`${adminCard} overflow-hidden h-fit`}>
          <div className="px-3 lg:px-4 py-2.5 border-b border-line bg-surface flex items-center gap-2">
            <FiBell className="w-4 h-4 text-brand-500" />
            <h2 className="text-xs lg:text-sm font-bold text-ink">Notificaciones</h2>
          </div>
          <div className="p-3 space-y-3">
            {/* Email */}
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FiMail className="w-3 h-3" /> Correo
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-line">
                  <div className="flex items-center gap-2">
                    <FiPackage className="w-4 h-4 text-brand-500" />
                    <span className="text-xs lg:text-sm font-medium text-ink">Pedidos</span>
                  </div>
                  <ToggleSwitch checked={notifications.emailOrders} onChange={(v) => setNotifications({ ...notifications, emailOrders: v })} />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-line">
                  <div className="flex items-center gap-2">
                    <FiTag className="w-4 h-4 text-brand-500" />
                    <span className="text-xs lg:text-sm font-medium text-ink">Promos</span>
                  </div>
                  <ToggleSwitch checked={notifications.emailPromotions} onChange={(v) => setNotifications({ ...notifications, emailPromotions: v })} />
                </div>
              </div>
            </div>

            {/* In-App */}
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FiBell className="w-3 h-3" /> En App
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-line">
                  <div className="flex items-center gap-2">
                    <FiPackage className="w-4 h-4 text-brand-500" />
                    <span className="text-xs lg:text-sm font-medium text-ink">Pedidos</span>
                  </div>
                  <ToggleSwitch checked={notifications.inAppOrders} onChange={(v) => setNotifications({ ...notifications, inAppOrders: v })} />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-line">
                  <div className="flex items-center gap-2">
                    <FiTag className="w-4 h-4 text-brand-500" />
                    <span className="text-xs lg:text-sm font-medium text-ink">Ofertas</span>
                  </div>
                  <ToggleSwitch checked={notifications.inAppPromotions} onChange={(v) => setNotifications({ ...notifications, inAppPromotions: v })} />
                </div>
                <div className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-line">
                  <div className="flex items-center gap-2">
                    <FiVolume2 className="w-4 h-4 text-brand-500" />
                    <span className="text-xs lg:text-sm font-medium text-ink">Sonidos</span>
                  </div>
                  <ToggleSwitch checked={notifications.soundEnabled} onChange={(v) => setNotifications({ ...notifications, soundEnabled: v })} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Security + Danger Zone */}
        <div className="space-y-3 lg:space-y-4">
          {/* Password Change */}
          <div className={`${adminCard} overflow-hidden`}>
            <div className="px-3 lg:px-4 py-2.5 border-b border-line bg-surface flex items-center gap-2">
              <FiLock className="w-4 h-4 text-brand-500" />
              <h2 className="text-xs lg:text-sm font-bold text-ink">Contraseña</h2>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className={adminLabel}>Actual</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full pl-10 pr-10 py-2 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink transition-colors"
                  >
                    {showPasswords.current ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={adminLabel}>Nueva</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-10 pr-10 py-2 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                    placeholder="Mín. 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink transition-colors"
                  >
                    {showPasswords.new ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={adminLabel}>Confirmar</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-10 py-2 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                    placeholder="Repetir"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink transition-colors"
                  >
                    {showPasswords.confirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-xs text-deal mt-1 font-medium">No coinciden</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                className={`${adminPrimaryButton} w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2`}
              >
                {changingPassword ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                ) : (
                  <FiLock className="w-3.5 h-3.5" />
                )}
                Actualizar
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border border-deal/30 overflow-hidden">
            <div className="px-3 lg:px-4 py-2.5 border-b border-deal/20 bg-deal-bg flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 text-deal" />
              <h2 className="text-xs lg:text-sm font-bold text-deal">Zona de Peligro</h2>
            </div>
            <div className="p-3 space-y-2">
              <button
                type="button"
                onClick={handleDeactivateAccount}
                className="w-full flex items-center justify-between p-2.5 border border-line rounded-lg hover:border-warning/50 hover:bg-warning/10 transition-all"
              >
                <div className="flex items-center gap-2">
                  <FiEyeOff className="w-4 h-4 text-warning-strong" />
                  <span className="text-xs lg:text-sm font-medium text-ink">Desactivar</span>
                </div>
                <span className="text-xs text-muted">Temporal</span>
              </button>
              <button
                type="button"
                onClick={handleRequestDeletion}
                disabled={accountStatus === 'PENDING_DELETION'}
                className="w-full flex items-center justify-between p-2.5 border border-line rounded-lg hover:border-deal/50 hover:bg-deal-bg transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <FiTrash2 className="w-4 h-4 text-deal" />
                  <span className="text-xs lg:text-sm font-medium text-ink">Eliminar</span>
                </div>
                <span className="text-xs text-muted">Permanente</span>
              </button>
              <p className="text-xs text-muted px-1">
                Al eliminar, se borran todos tus datos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
