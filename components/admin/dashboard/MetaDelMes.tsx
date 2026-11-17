'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatUSD } from '@/lib/currency';
import CifraAnimada from './CifraAnimada';
import s from './tablero.module.css';

// C-171: widget "Meta del mes" (solo el dueño). La meta la escribe aquí mismo y se guarda en la base con su Dashboard:
// nunca en el repositorio, que es público.
// C-279: cabe en una fila (Mini): la meta es el monto subrayado, que al tocarlo se vuelve un campo para cambiarla.

export default function MetaDelMes({ mesUSD, metaUSD, diasQueQuedan, ultimoDia }: { mesUSD: number; metaUSD: number | null; diasQueQuedan: number; ultimoDia: number }) {
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

  const campo = (
    <form className="inline-flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
      <input
        autoFocus
        aria-label="Meta de ventas del mes, en dólares"
        inputMode="decimal"
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/[^0-9.,]/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Escape') { setEditando(false); setTexto(metaUSD ? String(metaUSD) : ''); } }}
        placeholder="5000"
        className={s.metaEntrada}
      />
      <button type="submit" disabled={guardando} className={`${s.btn} ${s.btnPrimario}`} style={{ height: 28 }}>{guardando ? 'Guardando…' : 'Guardar'}</button>
    </form>
  );

  if (!metaUSD) {
    return editando ? campo : (
      <div>
        <p className={`${s.rotulo} ${s.sinH1}`} style={{ marginBottom: 6 }}>Lo cobrado este mes: <b className="text-ink">{formatUSD(mesUSD)}</b></p>
        <button type="button" onClick={() => setEditando(true)} className={s.metaEditar} style={{ whiteSpace: 'nowrap' }}>Poner la meta</button>
      </div>
    );
  }

  const pct = Math.min(100, (mesUSD / metaUSD) * 100);
  const falta = Math.max(0, metaUSD - mesUSD);
  return (
    <div>
      <div className={s.lineaMini}>
        <b className={s.cifraChica}><CifraAnimada valor={mesUSD} formato="usd" retraso={300} /></b>
        {editando ? campo : (
          <span className={s.rotulo}>de <button type="button" onClick={() => setEditando(true)} className={s.metaEditar} title="Cambiar la meta">{formatUSD(metaUSD)}</button></span>
        )}
      </div>
      <div className={s.metaBarra} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la meta del mes">
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className={`${s.rotulo} ${s.sinH1}`} style={{ marginTop: 8 }}>
        {falta > 0
          ? <>Faltan <b className="text-ink">{formatUSD(falta)}</b>{diasQueQuedan > 0 ? `: unos ${formatUSD(falta / diasQueQuedan)} por día hasta el ${ultimoDia}.` : '.'}</>
          : 'Meta cumplida.'}
      </p>
    </div>
  );
}
