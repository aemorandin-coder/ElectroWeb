'use client';

import type { IconType } from 'react-icons';
import { FiFacebook, FiInstagram, FiYoutube } from 'react-icons/fi';
import { FaTelegram, FaTiktok, FaXTwitter } from 'react-icons/fa6';
import { adminInput } from '@/lib/admin-ui';
import { DAY_LABELS, WEEK_DAYS, type SectionProps, type SettingsKey, type WeekDay } from './settings-form';
import { ImageField, SettingsCard, SwitchRow, TextField } from './fields';

const SOCIALS: { key: Extract<SettingsKey, 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'telegram' | 'tiktok'>; label: string; icon: IconType; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: FiInstagram, placeholder: 'https://instagram.com/usuario' },
  { key: 'tiktok', label: 'TikTok', icon: FaTiktok, placeholder: 'https://tiktok.com/@usuario' },
  { key: 'youtube', label: 'YouTube', icon: FiYoutube, placeholder: 'https://youtube.com/@canal' },
  { key: 'facebook', label: 'Facebook', icon: FiFacebook, placeholder: 'https://facebook.com/pagina' },
  { key: 'twitter', label: 'X (Twitter)', icon: FaXTwitter, placeholder: 'https://x.com/usuario' },
  { key: 'telegram', label: 'Telegram', icon: FaTelegram, placeholder: 'https://t.me/canal' },
];

export default function BusinessSection({ form, set, errors }: SectionProps) {
  const setDay = (day: WeekDay, patch: Partial<(typeof form.businessHours)[WeekDay]>) =>
    set('businessHours', { ...form.businessHours, [day]: { ...form.businessHours[day], ...patch } });

  const copyMondayToWeekdays = () => {
    const monday = form.businessHours.monday;
    set('businessHours', {
      ...form.businessHours,
      tuesday: { ...monday }, wednesday: { ...monday }, thursday: { ...monday }, friday: { ...monday },
    });
  };

  return (
    <>
      <SettingsCard title="Datos de la empresa" description="El nombre y el slogan aparecen en el pie de página, en Google y en los correos.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Nombre comercial" value={form.companyName} onChange={(v) => set('companyName', v)} error={errors.companyName} maxLength={100} />
          <TextField label="Slogan" value={form.tagline} onChange={(v) => set('tagline', v)} error={errors.tagline} maxLength={120} placeholder="Tu tienda de tecnología en Venezuela" />
          <TextField label="Razón social" value={form.legalName} onChange={(v) => set('legalName', v)} error={errors.legalName} maxLength={150} hint="Se muestra en el pie de página junto al RIF" />
          <TextField label="RIF" value={form.rif} onChange={(v) => set('rif', v)} error={errors.rif} maxLength={20} placeholder="J-40590333-3" />
        </div>
      </SettingsCard>

      <SettingsCard title="Logo e ícono">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <ImageField label="Logo" uploadType="logo" value={form.logo} onChange={(v) => set('logo', v)} error={errors.logo} hint="Header, pie de página y correos. PNG con fondo transparente, hasta 2 MB." />
          <ImageField label="Ícono de la pestaña (favicon)" uploadType="favicon" value={form.favicon} onChange={(v) => set('favicon', v)} error={errors.favicon} hint="Cuadrado de 512 × 512 px. Si lo dejas vacío se usa el logo." />
        </div>
      </SettingsCard>

      <SettingsCard title="Contacto" description="Se muestra en Contacto y en el pie de página. El WhatsApp es el del botón flotante.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Correo" type="email" value={form.email} onChange={(v) => set('email', v)} error={errors.email} placeholder="ventas@electroshopve.com" />
          <TextField label="Teléfono" type="tel" value={form.phone} onChange={(v) => set('phone', v)} error={errors.phone} placeholder="+58 257-2511282" />
          <TextField
            label="WhatsApp"
            type="tel"
            value={form.whatsapp}
            onChange={(v) => set('whatsapp', v)}
            error={errors.whatsapp}
            placeholder="+58 412-1234567"
            hint={form.whatsapp.replace(/\D/g, '').length >= 10 ? (
              <a href={`https://wa.me/${form.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">Probar el número</a>
            ) : 'Con código de país: +58'}
          />
          <TextField label="Dirección" value={form.address} onChange={(v) => set('address', v)} error={errors.address} maxLength={250} placeholder="Carrera 5, frente a la plaza Miranda" />
          <TextField label="Ciudad" value={form.city} onChange={(v) => set('city', v)} error={errors.city} placeholder="Guanare" />
          <TextField label="Estado" value={form.state} onChange={(v) => set('state', v)} error={errors.state} placeholder="Portuguesa" />
        </div>
      </SettingsCard>

      <SettingsCard title="Redes sociales" description="Solo aparecen en la tienda las que tengan enlace.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SOCIALS.map(({ key, label, icon: Icon, placeholder }) => (
            <label key={key} className="block min-w-0">
              <span className="sr-only">{label}</span>
              <span className="relative block">
                <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  type="url"
                  value={form[key]}
                  onChange={(event) => set(key, event.target.value)}
                  placeholder={placeholder}
                  aria-label={label}
                  aria-invalid={errors[key] ? true : undefined}
                  className={`${adminInput(Boolean(errors[key]))} pl-9`}
                />
              </span>
              {errors[key] && <span className="mt-1 block text-xs font-semibold text-deal">{label}: {errors[key]}</span>}
            </label>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Horario de atención"
        description="Se muestra en Contacto con el aviso de abierto o cerrado."
        action={<button type="button" onClick={copyMondayToWeekdays} className="text-sm font-semibold text-brand-600 hover:underline">Copiar lunes a viernes</button>}
      >
        <ul className="divide-y divide-line">
          {WEEK_DAYS.map((day) => {
            const hours = form.businessHours[day];
            return (
              <li key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                <div className="w-36 shrink-0">
                  <SwitchRow label={DAY_LABELS[day]} checked={hours.enabled} onChange={(enabled) => setDay(day, { enabled })} />
                </div>
                {hours.enabled ? (
                  <div className="flex items-center gap-2">
                    <input type="time" aria-label={`${DAY_LABELS[day]}: abre`} value={hours.open} onChange={(event) => setDay(day, { open: event.target.value })} className={`${adminInput()} w-32 tabular-nums`} />
                    <span className="text-sm text-muted">a</span>
                    <input type="time" aria-label={`${DAY_LABELS[day]}: cierra`} value={hours.close} onChange={(event) => setDay(day, { close: event.target.value })} className={`${adminInput()} w-32 tabular-nums`} />
                  </div>
                ) : (
                  <span className="text-sm text-muted">Cerrado</span>
                )}
              </li>
            );
          })}
        </ul>
        {errors.businessHours && <p className="mt-2 text-xs font-semibold text-deal">{errors.businessHours}</p>}
      </SettingsCard>
    </>
  );
}
