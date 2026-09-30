import { redirect } from 'next/navigation';

// C-138: Configuración pasó a Mi perfil (pestañas Seguridad y Notificaciones). Los enlaces viejos siguen llegando.
export default function SettingsPage() {
  redirect('/customer/profile?tab=seguridad');
}
