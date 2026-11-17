'use client';

import { useState } from 'react';
import { IconoCandado, IconoPlay } from '@/components/iconos';
import { adminBadge, adminHint, adminInput, adminNotice, adminPrimaryButton } from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { ResultadoDePrueba } from '@/lib/ia/probar';
import { reglaPorId, type UsoIa } from '@/lib/ia/reglas';
import { queHizo } from './Atajadas';
import { llamar, segundos } from './tipos';

// C-288 · Paso 3 de editar unas instrucciones: se prueban con un caso real, sin guardar nada. El caso depende del uso (el nombre de un
// producto, una consulta, un correo…). Devuelve lo que respondió Claude y qué reglas de la tienda pasó.

type Prueba = Extract<ResultadoDePrueba, { ok: true }>;

const CASO: Record<UsoIa, { rotulo: string; ejemplo: string; largo?: boolean }> = {
  busqueda: { rotulo: 'El nombre del producto', ejemplo: 'Taladro percutor Emtop ETID65 650 W' },
  proveedor: { rotulo: 'Una línea de la lista: CÓDIGO · NOMBRE DEL PROVEEDOR', ejemplo: 'TALAD-650 · TALAD PERC 1/2 650W EMTOP ETID65' },
  respuesta: { rotulo: 'Una de las últimas consultas', ejemplo: '' },
  urgencia: { rotulo: 'El mensaje de un cliente', ejemplo: 'Pagué mi orden hace tres días y todavía no me llega. Necesito que me digan algo hoy.', largo: true },
  cliente: { rotulo: 'El correo de un cliente', ejemplo: '' },
  campana: { rotulo: 'El objetivo de la campaña', ejemplo: 'Gift cards para regalar en Navidad' },
};

const ESTADO_DE_REGLA = {
  paso: { texto: 'Pasó', sello: adminBadge('success') },
  cambio: { texto: 'La tienda la arregló', sello: adminBadge('brand') },
  pidio: { texto: 'Se le pidió otra vez', sello: adminBadge('brand') },
  marca: { texto: 'Queda para revisar', sello: adminBadge('warning') },
} as const;

export default function PruebaDeInstrucciones({ uso, texto, alProbar }: { uso: UsoIa; texto: string; alProbar: () => void }) {
  const info = CASO[uso];
  const [caso, setCaso] = useState(info.ejemplo);
  const [consultas, setConsultas] = useState<Array<{ id: string; nombre: string; asunto: string }>>([]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [prueba, setPrueba] = useState<Prueba | null>(null);

  // Para probar una respuesta se elige una de las últimas consultas
  useCargarAlMontar(async () => {
    if (uso !== 'respuesta') return;
    const r = await llamar<{ consultas: typeof consultas }>('/api/admin/ia/instrucciones/probar', 'GET').catch(() => null);
    if (r?.ok) {
      setConsultas(r.datos.consultas);
      setCaso((actual) => actual || r.datos.consultas[0]?.id || '');
    }
  });

  const probar = async () => {
    setOcupado(true);
    setError('');
    setPrueba(null);
    try {
      const r = await llamar<Prueba>('/api/admin/ia/instrucciones/probar', 'POST', { uso, texto, caso });
      if (!r.ok) {
        setError(r.datos.error ?? 'No se pudo hacer la prueba.');
        return;
      }
      setPrueba(r.datos);
      alProbar();
    } catch {
      setError('Sin conexión. Prueba otra vez.');
    } finally {
      setOcupado(false);
    }
  };

  const pasaron = prueba ? prueba.reglas.filter((r) => r.estado === 'paso').length : 0;

  return (
    <div>
      <label htmlFor="ia-caso" className="mb-1.5 block text-sm font-semibold text-ink">{info.rotulo}</label>
      {uso === 'respuesta' ? (
        <select id="ia-caso" value={caso} onChange={(e) => setCaso(e.target.value)} className={`${adminInput(false)} sm:max-w-xl`}>
          {consultas.length === 0 && <option value="">No hay consultas todavía</option>}
          {consultas.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.asunto}</option>)}
        </select>
      ) : info.largo ? (
        <textarea id="ia-caso" value={caso} onChange={(e) => setCaso(e.target.value)} rows={3} maxLength={700} className={`${adminInput(false)} h-auto py-2.5`} />
      ) : (
        <input id="ia-caso" value={caso} onChange={(e) => setCaso(e.target.value)} maxLength={uso === 'cliente' ? 200 : 300} placeholder={uso === 'cliente' ? 'cliente@correo.com' : undefined} className={`${adminInput(false)} sm:max-w-xl`} />
      )}
      <p className={adminHint}>La prueba cuesta lo mismo que un pedido de verdad y no guarda nada.{uso === 'busqueda' ? ' Busca en la web como siempre: puede tardar hasta un minuto.' : ''}</p>
      <button type="button" onClick={() => void probar()} disabled={ocupado || caso.trim().length < 2} className={`${adminPrimaryButton} mt-3 h-9! px-3! text-[13px]`}>
        <IconoPlay className="h-4 w-4" aria-hidden="true" />{ocupado ? 'Claude está trabajando…' : 'Probar con las instrucciones de arriba'}
      </button>

      {error && <p className="mt-3 text-sm font-semibold text-deal" role="alert">{error}</p>}

      {prueba && (
        <div className="mt-4 space-y-3 rounded-2xl border border-line p-3.5" aria-live="polite">
          <p className="text-xs text-muted">Resultado{prueba.firma ? ` · ${prueba.firma}` : ''} · {segundos(prueba.ms)}{prueba.pidioOtraVez ? ' · se le pidió otra vez una regla' : ''}</p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-ink [overflow-wrap:anywhere]">{prueba.texto}</pre>

          <div className="border-t border-line pt-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <IconoCandado className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Pasó {pasaron} de {prueba.reglas.length} reglas{pasaron < prueba.reglas.length ? '; las otras las arregló la tienda' : ''}
            </p>
            <ul className="mt-2 grid gap-1.5">
              {prueba.reglas.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
                  <span className="min-w-0 flex-1">{reglaPorId(r.id)?.texto ?? r.id}</span>
                  <span className={ESTADO_DE_REGLA[r.estado].sello}>{ESTADO_DE_REGLA[r.estado].texto}</span>
                </li>
              ))}
            </ul>
          </div>

          {prueba.atajadas.length > 0 && (
            <div className="border-t border-line pt-3">
              <p className="text-sm font-semibold text-ink">Lo que atajó la tienda</p>
              <ul className="mt-1.5 grid gap-1 text-sm text-ink-soft">
                {prueba.atajadas.map((a, i) => <li key={`${a.regla}-${i}`} className="[overflow-wrap:anywhere]">{queHizo(a)}</li>)}
              </ul>
            </div>
          )}
          {prueba.avisos.length > 0 && (
            <div className={`${adminNotice('warning')} text-xs`}>
              <p className="font-semibold">Quedaría en el aviso para el equipo:</p>
              <ul className="mt-1 list-disc pl-4">{prueba.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
