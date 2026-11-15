'use client';

// C-235: la mesa de la contadora (la maqueta 4 del 14/11). Arriba, la única pieza azul noche: el saludo y el mes. Abajo, lo
// del mes con datos reales (las facturas de C-229), lo que viene en Contabilidad, su firma y su sello, y las notas con el
// dueño. Nada inventado: lo que todavía no existe va en "Lo que viene", sin montos ni fechas que no se conocen.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconoBolsa, IconoCalendario, IconoChat, IconoCheck, IconoClientes, IconoDescargar, IconoDocumento, IconoEditar, IconoEnviar,
  IconoFlechaDerecha, IconoInfo, IconoPorcentaje, IconoReportes, IconoTienda, type IconType,
} from '@/components/iconos';
import { adminBadge, adminCard, adminError, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import type { FirmaDTO, NotaDTO, ResumenMes } from '@/lib/contabilidad/mesa';
import { nombreMes } from '@/lib/contabilidad/montos';
import { formatVES } from '@/lib/currency';
import FirmaModal from './FirmaModal';

const fecha = (iso: string) => new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit' }).format(new Date(iso));
const cuando = (iso: string) => new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

const LO_QUE_VIENE: Array<{ icono: IconType; titulo: string; detalle: string; cuando?: string }> = [
  { icono: IconoReportes, titulo: 'El libro de ventas en Excel', detalle: 'Las facturas del mes en bolívares, con las columnas que pidas.', cuando: 'Antes del 15/12' },
  { icono: IconoCalendario, titulo: 'El calendario de pagos', detalle: 'IVA, pensiones, retenciones, IVSS, FAOV, INCES, alquiler y alcaldía, con avisos antes de que venzan.' },
  { icono: IconoBolsa, titulo: 'Compras y gastos', detalle: 'Cada factura con su foto: el libro de compras y el crédito fiscal.' },
  { icono: IconoPorcentaje, titulo: 'El IVA del mes y el cierre firmado', detalle: 'La hoja del IVA, "Declarada" y "Pagada", y tu firma en el cierre y en el Excel.' },
  { icono: IconoTienda, titulo: 'El alquiler y la alcaldía', detalle: 'El canon con su retención de ISLR, y actividades económicas, la licencia, la publicidad y el aseo.' },
  { icono: IconoClientes, titulo: 'Nómina y aportes', detalle: 'Los totales del mes; pensiones, IVSS, FAOV e INCES calculados.' },
];

export default function MesaContadora({ yo, saludo, hoy, periodo, empresa, resumen, firma: firmaInicial, contadora, notas: notasIniciales, talonario }: {
  yo: { nombre: string; esContadora: boolean; puedeDeclarar: boolean };
  saludo: string;
  hoy: string;
  periodo: string;
  empresa: { nombre: string; rif: string };
  resumen: ResumenMes;
  /** La de ella, si es la contadora; la de la contadora, si es el dueño */
  firma: FirmaDTO | null;
  contadora: { nombre: string } | null;
  notas: NotaDTO[];
  talonario: { serie: string; proximoTexto: string | null; quedan: number } | null;
}) {
  const router = useRouter();
  const [firma, setFirma] = useState(firmaInicial);
  const [firmando, setFirmando] = useState(false);
  const [notas, setNotas] = useState(notasIniciales);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mes = nombreMes(periodo);
  const Mes = mes.replace(/^./, (c) => c.toUpperCase());
  const primerNombre = (yo.nombre.replace(/^(Lic|Licda|Dr|Dra)\.?\s+/i, '').split(/\s+/)[0] || '').trim();

  const enviarNota = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/contabilidad/notas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mes: periodo, texto: texto.trim() }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error ?? 'No se pudo guardar la nota.');
        return;
      }
      setNotas(d.notas as NotaDTO[]);
      setTexto('');
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const cifras = [
    { titulo: 'Facturas emitidas', valor: String(resumen.emitidas), detalle: resumen.anuladas ? `${resumen.anuladas} anulada${resumen.anuladas === 1 ? '' : 's'}` : 'Ninguna anulada' },
    { titulo: 'Base imponible', valor: formatVES(resumen.baseBs), detalle: 'Sin el IVA' },
    { titulo: 'IVA (débito fiscal)', valor: formatVES(resumen.ivaBs), detalle: 'De las facturas del mes' },
    { titulo: 'Exento o no sujeto', valor: formatVES(resumen.exentoBs), detalle: 'Los renglones con (E)' },
  ];

  return (
    <div className="space-y-4">
      {/* La pieza azul noche: el saludo y el mes */}
      <section className="grid gap-5 rounded-2xl bg-brand-700 p-5 text-white sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center" aria-labelledby="mesa-saludo">
        <div className="min-w-0">
          <h1 id="mesa-saludo" className="text-2xl font-bold lg:text-3xl">{saludo}{primerNombre ? `, ${primerNombre}` : ''}</h1>
          <p className="mt-1 text-sm text-white/80">
            {yo.esContadora ? 'Contadora' : 'Contabilidad'} de {empresa.nombre || 'la empresa'}{empresa.rif ? ` · RIF ${empresa.rif}` : ''} · {hoy}
          </p>
          <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
            <IconoInfo className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
            {resumen.emitidas === 0 && resumen.sinFactura === 0
              ? `${Mes} todavía no tiene facturas ni compras cobradas.`
              : `${Mes}: ${resumen.emitidas} ${resumen.emitidas === 1 ? 'factura' : 'facturas'} · IVA ${formatVES(resumen.ivaBs)} · ${resumen.sinFactura} ${resumen.sinFactura === 1 ? 'compra cobrada' : 'compras cobradas'} sin factura`}
          </p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="text-sm text-white/80">Facturado en {mes}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatVES(resumen.totalBs)}</p>
          <p className="text-xs text-white/80">{talonario ? `Talonario Serie ${talonario.serie} · quedan ${talonario.quedan}` : 'Sin talonario cargado'}</p>
          <Link href="/admin/contabilidad/facturas" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
            Ver las facturas <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <section className={adminCard} aria-labelledby="mes-numeros">
            <h2 id="mes-numeros" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoReportes className="h-5 w-5" aria-hidden="true" /> {Mes} en números</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {cifras.map((c) => (
                <div key={c.titulo} className="rounded-xl border border-line bg-surface p-3">
                  <dt className="text-xs text-muted">{c.titulo}</dt>
                  <dd className="mt-1 text-base font-bold tabular-nums text-ink [overflow-wrap:anywhere]">{c.valor}</dd>
                  <dd className="text-xs text-muted">{c.detalle}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={adminCard} aria-labelledby="ultimas">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="ultimas" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoDocumento className="h-5 w-5" aria-hidden="true" /> Las últimas facturas</h2>
              <Link href="/admin/contabilidad/facturas" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Ver todas</Link>
            </div>
            {resumen.ultimas.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Todavía no hay facturas registradas en {mes}. Las registra el equipo al escribirlas en el talonario.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {resumen.ultimas.map((f) => (
                  <li key={f.id}>
                    <Link href={`/admin/contabilidad/facturas/${f.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:bg-surface">
                      <span className="w-16 font-semibold tabular-nums text-ink">{f.etiqueta}</span>
                      <span className="text-xs tabular-nums text-muted">{fecha(f.fecha)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{f.cliente}</span>
                      {f.estado === 'ANULADA'
                        ? <span className={adminBadge('danger')}>Anulada</span>
                        : <span className="text-sm font-semibold tabular-nums text-ink">{formatVES(f.totalBs)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={adminCard} aria-labelledby="lo-que-viene">
            <h2 id="lo-que-viene" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoCalendario className="h-5 w-5" aria-hidden="true" /> Lo que viene en Contabilidad</h2>
            <p className="mt-1 text-sm text-muted">
              {yo.esContadora ? 'Tus respuestas a las preguntas por WhatsApp' : 'Las respuestas de la contadora a las 17 preguntas'} deciden las columnas, las alícuotas y las fechas.
            </p>
            <ol className="mt-3 space-y-3">
              {LO_QUE_VIENE.map((p) => (
                <li key={p.titulo} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><p.icono className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      {p.titulo}
                      {p.cuando && <span className={adminBadge('brand')}>{p.cuando}</span>}
                    </span>
                    <span className="block text-xs text-muted">{p.detalle}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-4">
          <section className={adminCard} aria-labelledby="firma">
            <h2 id="firma" className="flex items-center gap-2 text-base font-semibold text-ink">
              <IconoEditar className="h-5 w-5" aria-hidden="true" /> {yo.esContadora ? 'Mi firma y sello' : 'La firma de la contadora'}
            </h2>
            <p className="mt-1 text-sm text-muted">Se estampa en cada cierre del mes y en la portada de cada Excel.</p>
            {firma ? (
              <figure className="mt-3 grid justify-items-start gap-0.5 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- una imagen privada en base64, no un archivo público */}
                <img src={firma.imagen} alt={`Firma de ${firma.nombre}`} className="h-16 w-auto max-w-full object-contain" />
                <figcaption className="mt-1">
                  <span className="block font-semibold text-ink">{firma.nombre}</span>
                  <span className="block text-sm text-ink-soft">{firma.titulo} · C.P.C. {firma.cpc}</span>
                </figcaption>
              </figure>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
                {yo.esContadora ? 'Todavía no la dibujas. Toma un minuto y sirve para todos los cierres.'
                  : contadora ? `${contadora.nombre} todavía no dibuja su firma: lo hace al entrar a su mesa.`
                    : 'Cuando la contadora entre con su invitación (Administración → Equipo), dibuja aquí su firma.'}
              </p>
            )}
            {yo.esContadora && yo.puedeDeclarar && (
              <button type="button" onClick={() => setFirmando(true)} className={`${firma ? adminSecondaryButton : adminPrimaryButton} mt-3`}>
                {firma ? <IconoEditar className="h-4 w-4" aria-hidden="true" /> : <IconoCheck className="h-4 w-4" aria-hidden="true" />}
                {firma ? 'Cambiar mi firma' : 'Dibujar mi firma'}
              </button>
            )}
          </section>

          <section className={adminCard} aria-labelledby="descargas">
            <h2 id="descargas" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoDescargar className="h-5 w-5" aria-hidden="true" /> Descargar {mes}</h2>
            <p className="mt-1 text-sm text-muted">El Excel del mes llega con el libro de ventas, antes del 15/12. Mientras tanto, cada factura se ve y se imprime en Facturas.</p>
          </section>

          <section className={adminCard} aria-labelledby="notas">
            <h2 id="notas" className="flex items-center gap-2 text-base font-semibold text-ink"><IconoChat className="h-5 w-5" aria-hidden="true" /> Notas de {mes}</h2>
            <p className="mt-1 text-sm text-muted">{yo.esContadora ? 'Lo que necesitas del equipo, o lo que quieras dejar anotado.' : 'Para la contadora: lo que falta, lo que cambió.'}</p>
            {notas.length > 0 && (
              <ul className="mt-3 space-y-2">
                {notas.map((n) => (
                  <li key={n.id} className={`rounded-xl border p-3 text-sm ${n.mia ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface'}`}>
                    <p className="text-xs font-semibold text-muted">{n.mia ? 'Tú' : n.autor} · {cuando(n.fecha)}</p>
                    <p className="mt-0.5 whitespace-pre-line text-ink [overflow-wrap:anywhere]">{n.texto}</p>
                  </li>
                ))}
              </ul>
            )}
            <label htmlFor="nota-texto" className="sr-only">Escribe una nota</label>
            <textarea id="nota-texto" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} rows={2} placeholder="Escribe una nota…" className="mt-3 w-full rounded-lg border border-line-strong p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            {error && <p role="alert" className={adminError}>{error}</p>}
            <button type="button" onClick={() => void enviarNota()} disabled={enviando || texto.trim().length < 2} className={`${adminSecondaryButton} mt-2`}>
              <IconoEnviar className="h-4 w-4" aria-hidden="true" /> {enviando ? 'Enviando…' : 'Dejar la nota'}
            </button>
          </section>
        </div>
      </div>

      {firmando && (
        <FirmaModal
          actual={firma}
          nombreSugerido={yo.nombre}
          onCerrar={() => setFirmando(false)}
          onGuardada={(f) => { setFirma(f); setFirmando(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
