'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiRotateCcw, FiSave } from 'react-icons/fi';
import { adminCardFlush, adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import {
  ADMIN_EVENTS, ADMIN_EVENT_TYPES, CATEGORY_LABELS,
  type AdminChannel, type AdminEventCategory, type AdminEventDefinition, type ChannelMatrix as Matrix,
} from '@/lib/admin-events/catalog';

const CHANNELS: { key: AdminChannel; label: string }[] = [
  { key: 'panel', label: 'Panel' },
  { key: 'email', label: 'Correo' },
  { key: 'telegram', label: 'Telegram' },
];

const GROUPS = (Object.keys(CATEGORY_LABELS) as AdminEventCategory[]).map((category) => ({
  category,
  types: ADMIN_EVENT_TYPES.filter((type) => (ADMIN_EVENTS[type] as AdminEventDefinition).category === category),
}));

function Check({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-surface">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} className="h-5 w-5 cursor-pointer accent-brand-500" />
    </label>
  );
}

export default function ChannelMatrix({ onGoToTelegram }: { onGoToTelegram: () => void }) {
  const [initial, setInitial] = useState<Matrix | null>(null);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [emailRecipients, setEmailRecipients] = useState(0);
  const [telegramReady, setTelegramReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/notifications/settings', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data) => {
        if (cancelled) return;
        setInitial(data.channels);
        setMatrix(data.channels);
        setEmailRecipients(data.emailRecipients);
        setTelegramReady(data.telegramReady);
      })
      .catch(() => !cancelled && toast.error('No se pudo cargar la configuración de avisos'));
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(() => Boolean(matrix && initial && JSON.stringify(matrix) !== JSON.stringify(initial)), [matrix, initial]);

  if (!matrix || !initial) {
    return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;
  }

  const set = (type: keyof Matrix, channel: AdminChannel, value: boolean) =>
    setMatrix((previous) => (previous ? { ...previous, [type]: { ...previous[type], [channel]: value } } : previous));

  const setColumn = (channel: AdminChannel, value: boolean) =>
    setMatrix((previous) => previous && (Object.fromEntries(ADMIN_EVENT_TYPES.map((type) => [type, { ...previous[type], [channel]: value }])) as Matrix));

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: matrix }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || 'No se pudo guardar');
        return;
      }
      setInitial(data.channels);
      setMatrix(data.channels);
      toast.success('Avisos guardados');
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const columnState = (channel: AdminChannel) => {
    const on = ADMIN_EVENT_TYPES.filter((type) => matrix[type][channel]).length;
    return on === ADMIN_EVENT_TYPES.length ? 'all' : on === 0 ? 'none' : 'some';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <p className={adminNotice('neutral')}>
          <strong className="text-ink">Panel:</strong> campana y bandeja de todos los administradores.
        </p>
        <p className={adminNotice(emailRecipients > 0 ? 'neutral' : 'warning')}>
          <strong className="text-ink">Correo:</strong>{' '}
          {emailRecipients > 0 ? `${emailRecipients} ${emailRecipients === 1 ? 'destinatario' : 'destinatarios'}. ` : 'no hay correos de alerta. '}
          <Link href="/admin/settings#sistema" className="font-semibold underline">{emailRecipients > 0 ? 'Cambiar' : 'Agregar correos'}</Link>
        </p>
        <p className={adminNotice(telegramReady ? 'neutral' : 'warning')}>
          <strong className="text-ink">Telegram:</strong>{' '}
          {telegramReady ? 'bot conectado con chats activos. ' : 'falta conectar el bot o un chat. '}
          <button type="button" onClick={onGoToTelegram} className="font-semibold underline">{telegramReady ? 'Ver chats' : 'Conectar'}</button>
        </p>
      </div>

      <div className={`${adminCardFlush} overflow-x-auto`}>
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface">
              <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Aviso</th>
              {CHANNELS.map(({ key, label }) => {
                const state = columnState(key);
                return (
                  <th key={key} scope="col" className="w-24 px-2 py-2 text-center">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
                    <button type="button" onClick={() => setColumn(key, state !== 'all')} className="mt-0.5 text-xs font-semibold text-brand-600 hover:underline">
                      {state === 'all' ? 'Quitar todos' : 'Marcar todos'}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          {GROUPS.map(({ category, types }) => (
            <tbody key={category} className="border-b border-line last:border-b-0">
              <tr>
                <th colSpan={4} scope="colgroup" className="bg-white px-5 pb-1 pt-4 text-left text-sm font-semibold text-ink">{CATEGORY_LABELS[category]}</th>
              </tr>
              {types.map((type) => {
                const definition = ADMIN_EVENTS[type] as AdminEventDefinition;
                return (
                  <tr key={type} className="hover:bg-surface">
                    <td className="px-5 py-2">
                      <span className="block font-medium text-ink">{definition.label}</span>
                      <span className="block text-xs text-muted">{definition.description}{definition.silent ? ' En Telegram llega sin sonido.' : ''}</span>
                    </td>
                    {CHANNELS.map(({ key, label }) => (
                      <td key={key} className="px-2 py-1 text-center">
                        <Check checked={matrix[type][key]} onChange={(value) => set(type, key, value)} label={`${definition.label}: ${label}`} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      <div className="sticky bottom-0 z-[var(--z-sticky)] pb-3 pt-2" aria-live="polite">
        {dirty && (
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-white p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:pl-5">
            <p className="text-sm font-semibold text-ink">Cambios sin guardar</p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={() => setMatrix(initial)} disabled={saving} className={`${adminSecondaryButton} whitespace-nowrap px-3 sm:px-5`}>
                <FiRotateCcw className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                Descartar
              </button>
              <button type="button" onClick={save} disabled={saving} className={`${adminPrimaryButton} whitespace-nowrap px-3 sm:px-5`}>
                <FiSave className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
