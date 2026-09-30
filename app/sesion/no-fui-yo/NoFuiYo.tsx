'use client';

import { useState } from 'react';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { adminDangerButton, adminError } from '@/lib/admin-ui';

export default function NoFuiYo({ s, t, cuenta, dispositivo, ip, fecha }: { s: string; t: string; cuenta: string; dispositivo: string; ip: string | null; fecha: string }) {
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'hecho'>('listo');
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bloquear = async () => {
    setEstado('enviando');
    setError(null);
    const res = await fetch('/api/public/sesion/no-fui-yo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s, t }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error || 'No se pudo bloquear. Revisa tu conexión e intenta de nuevo.');
      setEstado('listo');
      return;
    }
    setCorreo(data.correo);
    setEstado('hecho');
  };

  if (estado === 'hecho') {
    return (
      <div role="status">
        <FiCheckCircle className="h-8 w-8 text-success-strong" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold text-ink">Cuenta bloqueada</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Cerramos todas las sesiones de <strong className="text-ink">{cuenta}</strong> y cambiamos su contraseña por una que nadie conoce.
          Enviamos a <strong className="text-ink">{correo}</strong> un enlace para crear una nueva (sirve 1 hora).
        </p>
      </div>
    );
  }

  return (
    <>
      <FiAlertTriangle className="h-8 w-8 text-warning-strong" aria-hidden="true" />
      <h1 className="mt-3 text-xl font-bold text-ink">¿No fuiste tú?</h1>
      <p className="mt-2 text-sm text-ink-soft">Alguien entró al panel con la cuenta <strong className="text-ink">{cuenta}</strong>:</p>
      <dl className="mt-3 space-y-1 rounded-xl border border-line bg-surface p-3 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-muted">Dispositivo</dt><dd className="font-semibold text-ink">{dispositivo}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">Cuándo</dt><dd className="font-semibold text-ink">{fecha}</dd></div>
        {ip && <div className="flex justify-between gap-3"><dt className="text-muted">IP</dt><dd className="font-semibold text-ink">{ip}</dd></div>}
      </dl>
      <p className="mt-3 text-sm text-ink-soft">Si no fue esa persona, bloquea la cuenta: se cierran todas sus sesiones y su contraseña deja de servir hasta que cree una nueva desde su correo.</p>
      {error && <p className={adminError} role="alert">{error}</p>}
      <button type="button" onClick={bloquear} disabled={estado === 'enviando'} className={`${adminDangerButton} mt-4 w-full`}>
        {estado === 'enviando' ? 'Bloqueando…' : 'No fui yo: cerrar y bloquear'}
      </button>
    </>
  );
}
