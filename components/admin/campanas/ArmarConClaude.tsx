'use client';

// C-217: "Armar con Claude" en el editor de campañas (Andrés, 13/11, la idea C). Se escribe el objetivo y Claude arma el
// asunto, la vista previa y el texto con productos reales de la tienda (la foto, el precio y el enlace los pone la tienda).
// Llena el editor: se revisa, se cambia lo que haga falta y se guarda como siempre.

import { useState } from 'react';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { IconoNovedad } from '@/components/iconos';
import { formatUSD } from '@/lib/currency';
import { adminCard, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton } from '@/lib/admin-ui';
import type { BorradorCampana } from '@/lib/ia/campana';

type Contenido = Pick<BorradorCampana, 'subject' | 'preheader' | 'bloques'>;

const EJEMPLOS = ['Gift cards para Navidad, con la fecha límite de envío', 'Herramientas para el taller, con lo nuevo de la ferretería', 'Audífonos y accesorios para regalar'];

export default function ArmarConClaude({ hayContenido, alArmar }: { hayContenido: boolean; alArmar: (c: Contenido) => void }) {
  const { confirm } = useConfirm();
  const [objetivo, setObjetivo] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState('');
  const [usado, setUsado] = useState<Pick<BorradorCampana, 'productos' | 'firma'> | null>(null);

  const armar = async () => {
    if (hayContenido) {
      const ok = await confirm({ title: 'Reemplazar el contenido', message: 'Claude va a reemplazar el asunto y los bloques que tiene esta campaña. ¿Seguir?', confirmText: 'Reemplazar', cancelText: 'Cancelar', type: 'warning' });
      if (!ok) return;
    }
    setPensando(true);
    setError('');
    try {
      const r = await fetch('/api/admin/campaigns/redactar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ objetivo }) });
      const datos = (await r.json().catch(() => ({}))) as Partial<BorradorCampana> & { error?: string };
      if (!r.ok || !datos.bloques) {
        setError(datos.error || 'No se pudo armar el borrador.');
        return;
      }
      alArmar({ subject: datos.subject ?? '', preheader: datos.preheader ?? '', bloques: datos.bloques });
      setUsado({ productos: datos.productos ?? [], firma: datos.firma ?? '' });
    } catch {
      setError('Sin conexión con la tienda. Prueba otra vez.');
    } finally {
      setPensando(false);
    }
  };

  return (
    <section className={`${adminCard} space-y-3`} aria-labelledby="armar-claude">
      <h3 id="armar-claude" className="flex items-center gap-2 text-sm font-bold text-ink">
        <IconoNovedad className="h-4 w-4 text-brand-600" aria-hidden="true" /> Armar con Claude
      </h3>
      <div>
        <label htmlFor="campana-objetivo" className={adminLabel}>¿De qué es la campaña?</label>
        <textarea
          id="campana-objetivo" value={objetivo} maxLength={600} rows={2} onChange={(e) => setObjetivo(e.target.value)}
          placeholder={EJEMPLOS[0]} className={adminInput()}
        />
        <p className={adminHint}>Claude escribe el asunto y el texto y elige hasta 4 productos de la tienda; la foto, el precio y el enlace los pone la tienda. Después lo revisas y lo guardas.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={armar} disabled={pensando || objetivo.trim().length < 8} className={`${adminPrimaryButton} min-h-11`}>
          {pensando
            ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            : <IconoNovedad className="h-4 w-4" aria-hidden="true" />}
          {pensando ? 'Armando… unos 20 segundos' : 'Armar el borrador'}
        </button>
        {!objetivo && EJEMPLOS.slice(1).map((e) => (
          <button key={e} type="button" onClick={() => setObjetivo(e)} className="min-h-11 rounded-full px-3 text-xs font-medium text-brand-600 hover:bg-brand-50">{e}</button>
        ))}
      </div>
      {usado && (
        <p className="text-xs text-muted" role="status">
          Usó {usado.productos.length ? usado.productos.map((p) => `${p.nombre} (${formatUSD(p.precioUSD)})`).join(', ') : 'ningún producto'}. Redactado por {usado.firma}: revísalo antes de guardar.
        </p>
      )}
      {error && <p className={adminNotice('danger')} role="alert">{error}</p>}
    </section>
  );
}
