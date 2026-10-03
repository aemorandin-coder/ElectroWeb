'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminInput, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import CifraAnimada from './CifraAnimada';

// C-171: widget "Meta del mes" (solo el dueño). La meta la escribe aquí mismo y se guarda en la base con su Dashboard:
// nunca en el repositorio, que es público.

export default function MetaDelMes({ mesUSD, metaUSD }: { mesUSD: number; metaUSD: number | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(metaUSD ? String(metaUSD) : '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      const valor = texto.trim() === '' ? null : Number(texto.replace(/\./g, '').replace(',', '.'));
      const res = await fetch('/api/admin/dashboard/layout', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metaMesUSD: valor }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'No se pudo guardar la meta'); return; }
      toast.success(valor === null ? 'Meta quitada' : 'Meta guardada');
      setEditando(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  };

  if (editando || !metaUSD) {
    return (
      <div>
        <label htmlFor="meta-mes" className="text-sm text-ink-soft">{metaUSD ? 'Meta de ventas del mes, en dólares' : 'Pon la meta de ventas de este mes, en dólares'}</label>
        <input id="meta-mes" inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="Por ejemplo 5000" className={`${adminInput()} mt-2`} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void guardar()} disabled={guardando} className={adminPrimaryButton}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          {metaUSD && <button type="button" onClick={() => { setEditando(false); setTexto(String(metaUSD)); }} className={adminSecondaryButton}>Cancelar</button>}
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((mesUSD / metaUSD) * 100));
  const falta = Math.max(0, metaUSD - mesUSD);
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <CifraAnimada valor={pct} className="text-3xl font-bold tabular-nums text-ink" />
        <span className="text-xl font-bold text-ink">%</span>
        <span className="text-sm text-muted">de la meta</span>
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la meta del mes">
        <div className={`h-full rounded-full transition-[width] duration-700 ${pct >= 100 ? 'bg-success' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-ink-soft"><span className="font-semibold tabular-nums text-ink">{formatUSD(mesUSD)}</span> de {formatUSD(metaUSD)}</p>
      <p className="text-xs text-muted">{falta > 0 ? `Faltan ${formatUSD(falta)}` : 'Meta cumplida'}</p>
      <button type="button" onClick={() => setEditando(true)} className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-brand-600 hover:text-brand-700">Cambiar meta</button>
    </div>
  );
}
