'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiMail, FiPlus, FiX } from 'react-icons/fi';
import { adminBadge, adminInput, adminLabel, adminNotice, adminSecondaryButton } from '@/lib/admin-ui';
import type { SectionProps } from './settings-form';
import { Field, SettingsCard, SwitchRow, TextAreaField } from './fields';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

function ColorField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex items-center gap-3">
        <input id={id} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1" />
        <input
          type="text"
          aria-label={`${label} (código)`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={7}
          className={`${adminInput(Boolean(error))} font-mono uppercase`}
        />
      </div>
    </Field>
  );
}

export default function SystemSection({ form, set, errors }: SectionProps) {
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const emailInputId = useId();

  useEffect(() => {
    let active = true;
    fetch('/api/admin/users?role=admin')
      .then((response) => (response.ok ? response.json() : { users: [] }))
      .then((data) => {
        if (active) setAdmins(Array.isArray(data.users) ? data.users : []);
      })
      .catch(() => {
        if (active) setAdmins([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL.test(email)) {
      setEmailError('Escribe un correo válido');
      return;
    }
    if (form.adminAlertEmails.includes(email)) {
      setEmailError('Ese correo ya está en la lista');
      return;
    }
    set('adminAlertEmails', [...form.adminAlertEmails, email]);
    setNewEmail('');
    setEmailError('');
  };

  return (
    <>
      <SettingsCard
        title="Correos de alerta"
        description="Reciben un correo con cada orden nueva, solicitud de recarga, solicitud de creador y aviso de stock."
      >
        {form.adminAlertEmails.length > 0 ? (
          <ul className="mb-4 flex flex-wrap gap-2">
            {form.adminAlertEmails.map((email) => (
              <li key={email} className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-sm text-ink">
                <FiMail className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  onClick={() => set('adminAlertEmails', form.adminAlertEmails.filter((item) => item !== email))}
                  aria-label={`Quitar ${email}`}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white hover:text-deal"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`${adminNotice('warning')} mb-4`}>Sin correos: las alertas solo llegan a las notificaciones del panel.</p>
        )}
        <label htmlFor={emailInputId} className={adminLabel}>Agregar correo</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={emailInputId}
            type="email"
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              setEmailError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addEmail();
              }
            }}
            placeholder="ventas@electroshopve.com"
            aria-invalid={emailError || errors.adminAlertEmails ? true : undefined}
            className={adminInput(Boolean(emailError || errors.adminAlertEmails))}
          />
          <button type="button" onClick={addEmail} className={`${adminSecondaryButton} shrink-0`}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Agregar
          </button>
        </div>
        {(emailError || errors.adminAlertEmails) && <p className="mt-1 text-xs font-semibold text-deal" role="alert">{emailError || errors.adminAlertEmails}</p>}
      </SettingsCard>

      <SettingsCard title="Colores de los correos" description="Encabezado y botones de los correos que reciben los clientes. La tienda usa siempre el azul de la marca.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorField label="Color principal" value={form.primaryColor} onChange={(v) => set('primaryColor', v)} error={errors.primaryColor} />
          <ColorField label="Color secundario" value={form.secondaryColor} onChange={(v) => set('secondaryColor', v)} error={errors.secondaryColor} />
        </div>
        {/* Vista previa con los colores elegidos: son datos del admin, no tokens de la tienda */}
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <div className="px-4 py-3 text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}>
            {form.companyName || 'Electro Shop'} · Tu orden fue confirmada
          </div>
          <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
            <span className="text-sm text-muted">Vista previa</span>
            <span className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: form.primaryColor }}>Ver mi orden</span>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Modo mantenimiento"
        description="Los visitantes ven un aviso en lugar de la tienda. Los administradores con sesión iniciada entran normal."
        action={form.maintenanceMode ? <span className={adminBadge('warning')}>Activo</span> : null}
      >
        <div className="space-y-5">
          <SwitchRow label="Poner la tienda en mantenimiento" checked={form.maintenanceMode} onChange={(v) => set('maintenanceMode', v)} />
          {form.maintenanceMode && (
            <p className={`${adminNotice('warning')} flex items-start gap-2`}>
              <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Al guardar, la tienda se cierra en unos 15 segundos para todos los clientes.
            </p>
          )}
          <TextAreaField label="Mensaje para los visitantes" value={form.maintenanceMessage} onChange={(v) => set('maintenanceMessage', v)} error={errors.maintenanceMessage} maxLength={500} rows={2} placeholder="Estamos haciendo mejoras. Volvemos en unas horas." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateTimeField label="Empieza" value={form.maintenanceStartTime} onChange={(v) => set('maintenanceStartTime', v)} error={errors.maintenanceStartTime} hint="Vacío: en cuanto se guarde" />
            <DateTimeField label="Termina" value={form.maintenanceEndTime} onChange={(v) => set('maintenanceEndTime', v)} error={errors.maintenanceEndTime} hint="Vacío: hasta que lo apagues" />
          </div>
          <TextAreaField
            label="IPs que pueden entrar"
            value={form.maintenanceAllowedIPs}
            onChange={(v) => set('maintenanceAllowedIPs', v)}
            error={errors.maintenanceAllowedIPs}
            rows={2}
            placeholder="190.202.10.4, 200.44.32.12"
            hint="Separadas por coma. Útil para revisar la tienda desde la oficina sin iniciar sesión."
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Administradores"
        description="Tienen acceso completo al panel."
        action={<Link href="/admin/customers" className="text-sm font-semibold text-brand-600 hover:underline">Gestionar en Clientes</Link>}
      >
        {admins === null ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-muted">No se encontraron administradores.</p>
        ) : (
          <ul className="divide-y divide-line">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700" aria-hidden="true">
                  {(admin.name || admin.email).charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{admin.name || 'Sin nombre'}</span>
                  <span className="block truncate text-xs text-muted">{admin.email}</span>
                </span>
                <span className={adminBadge(admin.role === 'SUPER_ADMIN' ? 'brand' : 'neutral')}>{admin.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</span>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </>
  );
}

function DateTimeField({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (value: string) => void; error?: string; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <div className="flex gap-2">
        <input id={id} type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={error ? true : undefined} className={adminInput(Boolean(error))} />
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label={`Borrar ${label.toLowerCase()}`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-ink">
            <FiX className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </Field>
  );
}
