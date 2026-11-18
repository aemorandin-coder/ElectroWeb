'use client';

import { useState } from 'react';
import { IconoCheck } from '@/components/iconos';
import Opcion from '@/components/admin/Opcion';
import { adminInput, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { MOTIVOS_NO_SIRVIO, type MotivoNoSirvio } from '@/lib/ia/proveedores/catalogo';

// C-292 · La firma de un resultado de la IA (decisión del equipo del 18/11: los botones dicen "IA" y el resultado dice quién lo
// hizo, en letra chica) y "No sirvió" (lo que era C-288b): el motivo queda en el pedido y se ve en Ajustes → IA → Consumo y fallas,
// para saber qué motor y qué uso fallan.

export default function FirmaIA({ firma, pedidoId, nota }: { firma: string; pedidoId?: string; nota?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoNoSirvio | null>(null);
  const [detalle, setDetalle] = useState('');
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'enviado' | 'error'>('listo');

  const enviar = async () => {
    if (!motivo || !pedidoId) return;
    setEstado('enviando');
    try {
      const r = await fetch('/api/admin/ia/no-sirvio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, motivo, ...(detalle.trim() ? { detalle: detalle.trim() } : {}) }),
      });
      setEstado(r.ok ? 'enviado' : 'error');
    } catch {
      setEstado('error');
    }
  };

  return (
    <div className="text-xs text-muted">
      <p>
        Lo redactó {firma}.{nota ? ` ${nota}` : ''}
        {pedidoId && estado !== 'enviado' && !abierto && (
          <button type="button" onClick={() => setAbierto(true)} className="ml-1 inline-flex min-h-11 items-center font-semibold text-brand-600 hover:underline sm:min-h-0">
            No sirvió
          </button>
        )}
      </p>
      {estado === 'enviado' && (
        <p className="mt-1 flex items-center gap-1 font-semibold text-success-strong" role="status">
          <IconoCheck className="h-3.5 w-3.5" aria-hidden="true" /> Gracias: queda anotado en Ajustes → IA.
        </p>
      )}
      {abierto && estado !== 'enviado' && (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-surface p-3">
          <p className="text-sm font-semibold text-ink">¿Qué falló?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Por qué no sirvió">
            {MOTIVOS_NO_SIRVIO.map((m) => (
              <Opcion key={m.id} tamano="chica" role="radio" aria-checked={motivo === m.id} elegida={motivo === m.id} titulo={m.texto} onClick={() => setMotivo(m.id)} />
            ))}
          </div>
          <label className="sr-only" htmlFor={`no-sirvio-${pedidoId}`}>Un detalle, si quieres</label>
          <input id={`no-sirvio-${pedidoId}`} value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={200} placeholder="Un detalle, si quieres (opcional)" className={`${adminInput()} h-10 sm:max-w-md`} />
          {estado === 'error' && <p className="font-semibold text-deal" role="alert">No se pudo anotar. Prueba otra vez.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void enviar()} disabled={!motivo || estado === 'enviando'} className={`${adminPrimaryButton} h-9! px-3! text-[13px]`}>{estado === 'enviando' ? 'Enviando…' : 'Anotar'}</button>
            <button type="button" onClick={() => { setAbierto(false); setMotivo(null); setDetalle(''); }} className={`${adminSecondaryButton} h-9! px-3! text-[13px]`}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
