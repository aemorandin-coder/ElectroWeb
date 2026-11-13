'use client';

// Marketing → Sorteo (C-212; Andrés, 13/11: la PlayStation 4, con el resultado el 20/12). Arriba lo que dejó el sorteo
// (las ventas con boleto contra el costo del premio), después cómo es, quiénes participan y el sorteo en sí, que se hace
// una sola vez cuando ya cerró.

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import CampoUnidad from '@/components/admin/CampoUnidad';
import { IconoCheck, IconoGuardar, IconoRegalo } from '@/components/iconos';
import { Field, SettingsCard, SwitchRow, TextField } from '@/app/admin/(dashboard)/settings/_components/fields';
import {
  adminBadge, adminDato, adminHint, adminInput, adminNotice, adminPrimaryButton, adminSecondaryButton, adminSpinner, adminStatCard,
  adminStatLabel, adminStatValue, adminTable, adminTableWrap, adminTd, adminTh, type AdminTone,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

interface Formulario {
  titulo: string; premio: string; imagen: string; costoPremioUSD: string; compraMinimaUSD: string; topeInvitar: string;
  desde: string; hasta: string; resultadoEl: string; activo: boolean;
}
interface SorteoPanel extends Omit<Formulario, 'costoPremioUSD' | 'compraMinimaUSD' | 'topeInvitar'> {
  id: string; costoPremioUSD: number; compraMinimaUSD: number; topeInvitar: number; cerrado: boolean;
  sorteadoAt: string | null; ganadorEmail: string | null; ganadorDetalle: string | null; boletosAlSortear: number | null; huellaLista: string | null;
}
interface Participante { userId: string; email: string; nombre: string; porCompra: number; porInvitar: number; invitados: number; aviso: string }
interface Datos { sorteo: SorteoPanel | null; numeros?: { boletos: number; participantes: number; ventasUSD: number; margenUSD: number }; participantes?: Participante[] }

const hoy = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
// El que pidió Andrés el 13/11: lo que se propone para el primero
const PROPUESTO: Formulario = {
  titulo: 'Sorteo de Navidad', premio: 'PlayStation 4 reacondicionada con 1 control y 1 TB', imagen: '', costoPremioUSD: '220',
  compraMinimaUSD: '10', topeInvitar: '3', desde: hoy(), hasta: '2026-12-18', resultadoEl: '2026-12-20', activo: false,
};

const formularioDe = (s: SorteoPanel): Formulario => ({
  titulo: s.titulo, premio: s.premio, imagen: s.imagen, costoPremioUSD: String(s.costoPremioUSD), compraMinimaUSD: String(s.compraMinimaUSD),
  topeInvitar: String(s.topeInvitar), desde: s.desde, hasta: s.hasta, resultadoEl: s.resultadoEl, activo: s.activo,
});

function estadoDe(s: SorteoPanel | null): { etiqueta: string; tono: AdminTone } {
  if (!s) return { etiqueta: 'Sin crear', tono: 'neutral' };
  if (s.sorteadoAt) return { etiqueta: 'Sorteado', tono: 'success' };
  if (s.cerrado) return { etiqueta: 'Cerrado: falta sortear', tono: 'warning' };
  return s.activo ? { etiqueta: 'En la tienda', tono: 'brand' } : { etiqueta: 'Apagado', tono: 'neutral' };
}

export default function Sorteo() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [form, setForm] = useState<Formulario>(PROPUESTO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [sorteando, setSorteando] = useState(false);

  const cargar = async () => {
    const r = await fetch('/api/admin/sorteo');
    if (!r.ok) { toast.error('No se pudo cargar el sorteo'); return; }
    const d = (await r.json()) as Datos;
    setDatos(d);
    if (d.sorteo) setForm(formularioDe(d.sorteo));
  };
  useCargarAlMontar(cargar);

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => { const r = { ...e }; delete r[k]; return r; });
  };

  const guardar = async (nuevo = false) => {
    setGuardando(true);
    try {
      const r = await fetch('/api/admin/sorteo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, nuevo }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) { if (d?.fields) setErrores(d.fields); toast.error(d?.error || 'No se pudo guardar'); return; }
      toast.success(nuevo ? 'Sorteo nuevo creado' : 'Sorteo guardado');
      await cargar();
    } finally {
      setGuardando(false);
    }
  };

  const sortear = async () => {
    if (!datos?.sorteo) return;
    setSorteando(true);
    try {
      const r = await fetch('/api/admin/sorteo/sortear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sorteoId: datos.sorteo.id }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) { toast.error(d?.error || 'No se pudo sortear'); return; }
      toast.success(`Ganó ${d.ganadorEmail}`);
      setConfirmar(false);
      await cargar();
    } finally {
      setSorteando(false);
    }
  };

  if (!datos) return <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>;

  const s = datos.sorteo;
  const estado = estadoDe(s);
  const n = datos.numeros;
  const costo = s?.costoPremioUSD ?? 0;
  const cubre = n && costo > 0 ? Math.min(100, Math.round((n.margenUSD / costo) * 100)) : 0;
  const bloqueado = Boolean(s?.sorteadoAt);

  return (
    <div className="space-y-5">
      {/* Lo que dejó el sorteo: lo primero que hay que mirar cada día */}
      {s && n && (
        <section aria-labelledby="sorteo-numeros" className="space-y-3">
          <h2 id="sorteo-numeros" className="text-base font-semibold text-ink">Lo que dejó el sorteo</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={adminStatCard}><div><span className={adminStatLabel}>Boletos</span><p className={`${adminStatValue} tabular-nums`}>{n.boletos}</p></div></div>
            <div className={adminStatCard}><div><span className={adminStatLabel}>Participantes</span><p className={`${adminStatValue} tabular-nums`}>{n.participantes}</p></div></div>
            <div className={adminStatCard}><div><span className={adminStatLabel}>Ventas con boleto</span><p className={`${adminStatValue} tabular-nums`}>{formatUSD(n.ventasUSD)}</p></div></div>
            <div className={adminStatCard}><div><span className={adminStatLabel}>Margen estimado</span><p className={`${adminStatValue} tabular-nums`}>{formatUSD(n.margenUSD)}</p></div></div>
          </div>
          {costo > 0 && (
            <div className="max-w-3xl rounded-2xl border border-line bg-white p-4">
              <p className="text-sm text-ink"><strong className="font-semibold tabular-nums">{cubre} %</strong> del premio ya está pagado con el margen ({formatUSD(n.margenUSD)} de {formatUSD(costo)}).</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(2, cubre)}%` }} /></div>
              <p className={adminHint}>El margen se estima en 20 centavos por dólar vendido (costo + 30 % + IVA), con las compras que dieron boleto. No cuenta las que se habrían hecho igual sin el sorteo.</p>
            </div>
          )}
        </section>
      )}

      {/* El sorteo en sí */}
      {s && !s.sorteadoAt && s.cerrado && (
        <div className={`${adminNotice('warning')} max-w-3xl`}>
          <p className="font-semibold">Cerró el {s.hasta}. Falta sortear.</p>
          <p className="mt-1">Se elige un boleto al azar entre los {n?.boletos ?? 0}: cada compra y cada 2 amigos invitados son una oportunidad. Se hace una sola vez y queda guardado con la huella de la lista.</p>
          {!confirmar ? (
            <button type="button" onClick={() => setConfirmar(true)} className={`${adminPrimaryButton} mt-3`}><IconoRegalo className="h-4 w-4" aria-hidden="true" /> Sortear ahora</button>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={sortear} disabled={sorteando} className={adminPrimaryButton}>{sorteando ? 'Sorteando…' : 'Sí, sortear (no se puede repetir)'}</button>
              <button type="button" onClick={() => setConfirmar(false)} disabled={sorteando} className={adminSecondaryButton}>Todavía no</button>
            </div>
          )}
        </div>
      )}
      {s?.sorteadoAt && (
        <div className={`${adminNotice('success')} max-w-3xl`}>
          <p className="font-semibold">Ganó {s.ganadorEmail}</p>
          <p className="mt-1">{s.ganadorDetalle}. Sorteado el {new Date(s.sorteadoAt).toLocaleString('es-VE')} entre {s.boletosAlSortear} boletos.</p>
          <p className="mt-1 break-all text-xs">Huella de la lista: <span className={adminDato}>{s.huellaLista}</span></p>
          <p className="mt-2 text-xs">En la tienda sale con el correo tapado. Escríbele para coordinar el envío del premio.</p>
          <button type="button" onClick={() => guardar(true)} disabled={guardando} className={`${adminSecondaryButton} mt-3`}>Sorteo nuevo con estos datos</button>
        </div>
      )}

      <SettingsCard
        title="Cómo es"
        description="Se ve en la tienda en /sorteo y en Mi panel. Los boletos se cuentan solos: no hay que cargar nada."
        action={<span className={adminBadge(estado.tono)}>{estado.etiqueta}</span>}
      >
        <fieldset disabled={bloqueado} className="max-w-3xl space-y-4">
          <SwitchRow label="En la tienda" description="Apagado, no se ve en la tienda ni cuenta invitaciones. Las compras se cuentan igual por las fechas." checked={form.activo} onChange={(v) => set('activo', v)} />
          <TextField label="Título" value={form.titulo} onChange={(v) => set('titulo', v)} maxLength={60} error={errores.titulo} className="sm:max-w-sm" />
          <TextField label="Premio" value={form.premio} onChange={(v) => set('premio', v)} maxLength={120} error={errores.premio} hint='Tal como es: "reacondicionada", con lo que trae.' />
          <TextField label="Foto del premio" value={form.imagen} onChange={(v) => set('imagen', v)} maxLength={300} placeholder="/uploads/products/…" hint="La dirección de una foto subida a la tienda (la de un producto sirve) o una https." error={errores.imagen} />
          <div className="flex flex-wrap gap-4">
            <Field label="Compra mínima" htmlFor="sorteo-minimo" error={errores.compraMinimaUSD} hint="En productos, sin el envío.">
              <CampoUnidad id="sorteo-minimo" unidad="$" inputMode="decimal" value={form.compraMinimaUSD} onChange={(e) => set('compraMinimaUSD', e.target.value)} invalido={Boolean(errores.compraMinimaUSD)} />
            </Field>
            <Field label="Tope por invitar" htmlFor="sorteo-tope" error={errores.topeInvitar} hint="1 boleto por cada 2 amigos.">
              <CampoUnidad id="sorteo-tope" unidad="boletos" inputMode="numeric" value={form.topeInvitar} onChange={(e) => set('topeInvitar', e.target.value)} invalido={Boolean(errores.topeInvitar)} />
            </Field>
            <Field label="Costo del premio" htmlFor="sorteo-costo" error={errores.costoPremioUSD} hint="Con su envío. Solo lo ve el equipo.">
              <CampoUnidad id="sorteo-costo" unidad="$" inputMode="decimal" value={form.costoPremioUSD} onChange={(e) => set('costoPremioUSD', e.target.value)} invalido={Boolean(errores.costoPremioUSD)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Field label="Desde" htmlFor="sorteo-desde" error={errores.desde}>
              <input id="sorteo-desde" type="date" value={form.desde} onChange={(e) => set('desde', e.target.value)} className={`${adminInput(Boolean(errores.desde))} w-44`} />
            </Field>
            <Field label="Última compra que cuenta" htmlFor="sorteo-hasta" error={errores.hasta}>
              <input id="sorteo-hasta" type="date" value={form.hasta} onChange={(e) => set('hasta', e.target.value)} className={`${adminInput(Boolean(errores.hasta))} w-44`} />
            </Field>
            <Field label="Resultado" htmlFor="sorteo-resultado" error={errores.resultadoEl}>
              <input id="sorteo-resultado" type="date" value={form.resultadoEl} onChange={(e) => set('resultadoEl', e.target.value)} className={`${adminInput(Boolean(errores.resultadoEl))} w-44`} />
            </Field>
          </div>
          <p className={adminHint}>Los días son de Venezuela y se incluyen enteros. Una compra cuenta si se pagó y no se canceló ni se devolvió; una compra partida en dos paquetes cuenta como una.</p>
        </fieldset>
        {!bloqueado && (
          <button type="button" onClick={() => guardar(false)} disabled={guardando} className={`${adminPrimaryButton} mt-5`}>
            {guardando ? 'Guardando…' : s ? <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar</> : <><IconoCheck className="h-4 w-4" aria-hidden="true" /> Crear el sorteo</>}
          </button>
        )}
      </SettingsCard>

      {s && datos.participantes && datos.participantes.length > 0 && (
        <SettingsCard title="Quiénes participan" description="De más boletos a menos. Los avisos son para revisar antes de sortear: las invitaciones no se verifican por teléfono.">
          <div className={adminTableWrap}>
            <table className={adminTable}>
              <thead><tr><th className={adminTh}>Cliente</th><th className={adminTh}>Por compra</th><th className={adminTh}>Por invitar</th><th className={adminTh}>Aviso</th></tr></thead>
              <tbody>
                {datos.participantes.map((p) => (
                  <tr key={p.userId}>
                    <td className={adminTd}><span className="block font-medium">{p.nombre || 'Sin nombre'}</span><span className="block text-xs text-muted">{p.email}</span></td>
                    <td className={`${adminTd} tabular-nums`}>{p.porCompra}</td>
                    <td className={`${adminTd} tabular-nums`}>{p.porInvitar}{p.invitados > 0 && <span className="block text-xs text-muted">{p.invitados} invitados</span>}</td>
                    <td className={adminTd}>{p.aviso ? <span className={adminDato}>{p.aviso}</span> : <span className="text-xs text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsCard>
      )}
    </div>
  );
}
