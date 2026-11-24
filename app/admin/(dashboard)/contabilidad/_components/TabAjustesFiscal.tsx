'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import CampoUnidad from '@/components/admin/CampoUnidad';
import { OpcionRadio } from '@/components/admin/Opcion';
import {
  IconoCheck, IconoConfiguracion, IconoDocumento, IconoImpresora, IconoInfo, IconoMas, IconoNube, IconoTienda, IconoVerificado,
} from '@/components/iconos';
import {
  adminBadge, adminCard, adminDato, adminError, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton, adminSecondaryButton,
} from '@/lib/admin-ui';
import type { ConfigContableDTO, Hito2027, TalonarioDTO } from '@/lib/dto/contabilidad';

export default function TabAjustesFiscal({ configInicial, talonarios }: {
  configInicial: ConfigContableDTO;
  talonarios: TalonarioDTO[];
}) {
  const router = useRouter();
  const [canal, setCanal] = useState<'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL'>(configInicial.canalEmision);
  const [imprentaProveedor, setImprentaProveedor] = useState<'GENERICO_REST' | 'THE_FACTORY_HKA' | 'OTRO'>(
    configInicial.imprentaProveedor === 'THE_FACTORY_HKA' || configInicial.imprentaProveedor === 'OTRO'
      ? configInicial.imprentaProveedor
      : 'GENERICO_REST',
  );
  const [imprentaAmbiente, setImprentaAmbiente] = useState<'SANDBOX' | 'PRODUCCION'>(configInicial.imprentaAmbiente);
  const [imprentaSerieDigital, setImprentaSerieDigital] = useState(configInicial.imprentaSerieDigital);
  const [imprentaProximoNumero, setImprentaProximoNumero] = useState(String(configInicial.imprentaProximoNumero));
  const [imprentaApiUrl, setImprentaApiUrl] = useState(configInicial.imprentaApiUrl ?? '');

  const [alcaldiaAlicuota, setAlcaldiaAlicuota] = useState(String(configInicial.alcaldiaAlicuota));
  const [alcaldiaMinimoBs, setAlcaldiaMinimoBs] = useState(String(configInicial.alcaldiaMinimoBs));
  const [alcaldiaDiaLimite, setAlcaldiaDiaLimite] = useState(String(configInicial.alcaldiaDiaLimite));
  const [ivaDiaLimite, setIvaDiaLimite] = useState(String(configInicial.ivaDiaLimite));

  const [alquilerArrendador, setAlquilerArrendador] = useState(configInicial.alquilerArrendador ?? '');
  const [alquilerRif, setAlquilerRif] = useState(configInicial.alquilerRif ?? '');
  const [alquilerTipo, setAlquilerTipo] = useState<'PERSONA' | 'EMPRESA'>(configInicial.alquilerTipo);
  const [alquilerCanonUSD, setAlquilerCanonUSD] = useState(String(configInicial.alquilerCanonUSD));
  const [alquilerConIva, setAlquilerConIva] = useState(configInicial.alquilerConIva);
  const [alquilerDiaPago, setAlquilerDiaPago] = useState(String(configInicial.alquilerDiaPago));
  const [alquilerVenceEl, setAlquilerVenceEl] = useState(configInicial.alquilerVenceEl ?? '');

  const [pensionesPorcentaje, setPensionesPorcentaje] = useState(String(configInicial.pensionesPorcentaje));
  const [pensionesDiaLimite, setPensionesDiaLimite] = useState(String(configInicial.pensionesDiaLimite));
  const [nominaBaseMinimaUSD, setNominaBaseMinimaUSD] = useState(String(configInicial.nominaBaseMinimaUSD));
  const [avisosTelegram, setAvisosTelegram] = useState(configInicial.avisosTelegram);
  const [checklist, setChecklist] = useState<Hito2027[]>(configInicial.checklist2027);

  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [pruebaResultado, setPruebaResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string, fallback = 0) => {
    const x = Number(s.replace(',', '.'));
    return Number.isFinite(x) ? x : fallback;
  };
  const int = (s: string, fallback: number, min: number, max: number) => {
    const x = Math.trunc(Number(s));
    return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
  };

  const toggleHito = (id: string) => {
    setChecklist((prev) => prev.map((h) => (h.id === id ? { ...h, hecho: !h.hecho } : h)));
  };

  const probarConexion = async () => {
    setProbando(true);
    setPruebaResultado(null);
    try {
      const r = await fetch('/api/admin/contabilidad/config/probar', { method: 'POST' });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) {
        setPruebaResultado({ ok: false, texto: d?.detalle ?? d?.error ?? 'No se pudo conectar con el proveedor digital.' });
        return;
      }
      setPruebaResultado({ ok: true, texto: `${d.detalle} (modo ${d.modo})` });
    } catch {
      setPruebaResultado({ ok: false, texto: 'Sin conexión al probar el servicio.' });
    } finally {
      setProbando(false);
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/contabilidad/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canalEmision: canal,
          imprentaProveedor: canal === 'IMPRENTA_DIGITAL' ? imprentaProveedor : configInicial.imprentaProveedor,
          imprentaAmbiente,
          imprentaSerieDigital: imprentaSerieDigital.trim().toUpperCase() || 'F',
          imprentaProximoNumero: int(imprentaProximoNumero, 1, 1, 99_999_999),
          imprentaApiUrl: imprentaApiUrl.trim() || null,
          alcaldiaAlicuota: Math.max(0, Math.min(10, num(alcaldiaAlicuota, 1.5))),
          alcaldiaMinimoBs: Math.max(0, num(alcaldiaMinimoBs, 0)),
          alcaldiaDiaLimite: int(alcaldiaDiaLimite, 10, 1, 28),
          ivaDiaLimite: int(ivaDiaLimite, 15, 1, 28),
          alquilerArrendador: alquilerArrendador.trim() || null,
          alquilerRif: alquilerRif.trim() || null,
          alquilerTipo,
          alquilerCanonUSD: Math.max(0, num(alquilerCanonUSD, 0)),
          alquilerConIva,
          alquilerDiaPago: int(alquilerDiaPago, 5, 1, 28),
          alquilerVenceEl: alquilerVenceEl.trim() || '',
          pensionesPorcentaje: Math.max(0, Math.min(30, num(pensionesPorcentaje, 9))),
          pensionesDiaLimite: int(pensionesDiaLimite, 18, 1, 28),
          nominaBaseMinimaUSD: Math.max(0, num(nominaBaseMinimaUSD, 0)),
          checklist2027: checklist,
          avisosTelegram,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error ?? 'No se pudieron guardar los ajustes.');
        return;
      }
      toast.success('Ajustes fiscales guardados');
      router.refresh();
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="space-y-4">
      <section className={adminCard} aria-labelledby="cfg-canal">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="cfg-canal" className="flex items-center gap-2 text-lg font-semibold text-ink">
              <IconoConfiguracion className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Canal principal de facturación
            </h2>
            <p className="mt-1 text-sm text-muted">Elige por dónde se emiten las facturas hoy y prepara la transición antes del 19/04/2027.</p>
          </div>
          <Ayuda etiqueta="Providencia SNAT/2026/00093">
            Desde el 19/04/2027 el comercio electrónico debe facturar en línea por Portal SENIAT o Imprenta Digital autorizada. El talonario queda reservado para contingencias.
          </Ayuda>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3" role="radiogroup" aria-label="Canal de emisión">
          <OpcionRadio
            name="canal-emision"
            elegida={canal === 'TALONARIO'}
            onElegir={() => setCanal('TALONARIO')}
            icono={IconoImpresora}
            titulo="Talonario preimpreso"
            detalle="Papel autorizado por imprenta tradicional (Serie A y contingencia)."
          />
          <OpcionRadio
            name="canal-emision"
            elegida={canal === 'PORTAL_SENIAT'}
            onElegir={() => setCanal('PORTAL_SENIAT')}
            icono={IconoDocumento}
            titulo="Portal SENIAT asistido"
            detalle="Te prepara los renglones en bolívares y luego guardas número, control y PDF."
          />
          <OpcionRadio
            name="canal-emision"
            elegida={canal === 'IMPRENTA_DIGITAL'}
            onElegir={() => setCanal('IMPRENTA_DIGITAL')}
            icono={IconoNube}
            titulo="Imprenta Digital (API)"
            detalle="Timbrado automático con número de control fiscal en línea y QR."
          />
        </div>

        {canal === 'IMPRENTA_DIGITAL' && (
          <div className="mt-4 space-y-4 rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={adminBadge(configInicial.imprentaApiKeyConfigurada ? 'success' : 'brand')}>
                  {configInicial.imprentaApiKeyConfigurada ? 'Llave en servidor configurada' : 'Modo Sandbox local activo'}
                </span>
                <span className={adminDato}>Variable .env: IMPRENTA_DIGITAL_API_KEY</span>
              </div>
              <button type="button" onClick={() => void probarConexion()} disabled={probando} className={adminSecondaryButton}>
                {probando ? 'Probando…' : 'Probar conexión'}
              </button>
            </div>
            {pruebaResultado && (
              <p className={adminNotice(pruebaResultado.ok ? 'success' : 'danger')}>{pruebaResultado.texto}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="cfg-prov" className={adminLabel}>Proveedor autorizado</label>
                <select id="cfg-prov" value={imprentaProveedor} onChange={(e) => setImprentaProveedor(e.target.value as 'GENERICO_REST' | 'THE_FACTORY_HKA' | 'OTRO')} className={adminInput()}>
                  <option value="GENERICO_REST">Adaptador REST estándar</option>
                  <option value="THE_FACTORY_HKA">The Factory HKA</option>
                  <option value="OTRO">Otra imprenta digital</option>
                </select>
              </div>
              <div>
                <label htmlFor="cfg-amb" className={adminLabel}>Ambiente</label>
                <select id="cfg-amb" value={imprentaAmbiente} onChange={(e) => setImprentaAmbiente(e.target.value as 'SANDBOX' | 'PRODUCCION')} className={adminInput()}>
                  <option value="SANDBOX">SANDBOX (Pruebas)</option>
                  <option value="PRODUCCION">PRODUCCIÓN (Fiscal real)</option>
                </select>
              </div>
              <div>
                <label htmlFor="cfg-serie" className={adminLabel}>Serie digital</label>
                <input id="cfg-serie" value={imprentaSerieDigital} maxLength={3} onChange={(e) => setImprentaSerieDigital(e.target.value)} className={`${adminInput()} sm:max-w-28`} />
              </div>
              <div>
                <label htmlFor="cfg-num" className={adminLabel}>Próximo correlativo Sandbox</label>
                <input id="cfg-num" type="number" min={1} value={imprentaProximoNumero} onChange={(e) => setImprentaProximoNumero(e.target.value)} className={`${adminInput()} tabular-nums sm:max-w-40`} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cfg-url" className={adminLabel}>URL base del API (HTTPS)</label>
                <input id="cfg-url" type="url" value={imprentaApiUrl} onChange={(e) => setImprentaApiUrl(e.target.value)} placeholder="https://api.imprentadigital.com/v1" className={adminInput()} />
                <p className={adminHint}>La clave secreta va únicamente en el servidor (<code>IMPRENTA_DIGITAL_API_KEY</code> en <code>.env</code>).</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className={adminCard} aria-labelledby="cfg-talonarios">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="cfg-talonarios" className="text-base font-semibold text-ink">Talonarios físicos y de contingencia</h2>
            <p className="mt-0.5 text-xs text-muted">Registra tanto el talonario ordinario como el de contingencia 00093 (con casilla de hora).</p>
          </div>
          <Link href="/admin/contabilidad/talonarios/nuevo" className={adminSecondaryButton}>
            <IconoMas className="h-4 w-4" aria-hidden="true" /> Cargar talonario
          </Link>
        </div>
        {talonarios.length === 0 ? (
          <p className={`${adminNotice('warning')} mt-3 flex items-center gap-2`}>
            <IconoInfo aria-hidden="true" /> Aún no hay talonarios cargados en el sistema.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {talonarios.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    Serie {t.serie} · {t.uso === 'CONTINGENCIA' ? 'Contingencia' : 'Normal'}
                  </p>
                  <p className="text-xs text-muted tabular-nums">
                    Próxima: {t.proximoTexto ?? 'Agotado'} · Quedan {t.quedan}
                  </p>
                </div>
                <span className={adminBadge(t.quedan > 0 && t.estado === 'EN_USO' ? 'success' : 'neutral')}>
                  {t.quedan > 0 && t.estado === 'EN_USO' ? 'En uso' : 'Agotado'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={adminCard} aria-labelledby="cfg-impuestos">
          <h2 id="cfg-impuestos" className="flex items-center gap-2 text-base font-semibold text-ink">
            <IconoTienda className="h-5 w-5 text-brand-600" aria-hidden="true" />
            Alcaldía de Guanare e IVA
          </h2>
          <p className="mt-0.5 text-xs text-muted">Parámetros con los que se proyecta el calendario mensual.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cfg-alc-alic" className={adminLabel}>Alícuota Alcaldía</label>
              <CampoUnidad id="cfg-alc-alic" unidad="%" inputMode="decimal" value={alcaldiaAlicuota} onChange={(e) => setAlcaldiaAlicuota(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cfg-alc-min" className={adminLabel}>Mínimo tributable</label>
              <CampoUnidad id="cfg-alc-min" unidad="Bs." inputMode="decimal" value={alcaldiaMinimoBs} onChange={(e) => setAlcaldiaMinimoBs(e.target.value)} className="w-40" />
            </div>
            <div>
              <label htmlFor="cfg-alc-dia" className={adminLabel}>Día límite Alcaldía</label>
              <CampoUnidad id="cfg-alc-dia" unidad="día" type="number" min={1} max={28} value={alcaldiaDiaLimite} onChange={(e) => setAlcaldiaDiaLimite(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cfg-iva-dia" className={adminLabel}>Día límite IVA 99030</label>
              <CampoUnidad id="cfg-iva-dia" unidad="día" type="number" min={1} max={28} value={ivaDiaLimite} onChange={(e) => setIvaDiaLimite(e.target.value)} />
            </div>
          </div>
        </section>

        <section className={adminCard} aria-labelledby="cfg-pensiones">
          <h2 id="cfg-pensiones" className="text-base font-semibold text-ink">Pensiones y avisos automáticos</h2>
          <p className="mt-0.5 text-xs text-muted">Contribución especial de protección de pensiones y alertas del cron.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cfg-pen-pct" className={adminLabel}>Porcentaje Ley Pensiones</label>
              <CampoUnidad id="cfg-pen-pct" unidad="%" inputMode="decimal" value={pensionesPorcentaje} onChange={(e) => setPensionesPorcentaje(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cfg-pen-dia" className={adminLabel}>Día límite pago</label>
              <CampoUnidad id="cfg-pen-dia" unidad="día" type="number" min={1} max={28} value={pensionesDiaLimite} onChange={(e) => setPensionesDiaLimite(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cfg-nom-base" className={adminLabel}>Nómina base referencial</label>
              <CampoUnidad id="cfg-nom-base" unidad="USD" inputMode="decimal" value={nominaBaseMinimaUSD} onChange={(e) => setNominaBaseMinimaUSD(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                <input type="checkbox" checked={avisosTelegram} onChange={(e) => setAvisosTelegram(e.target.checked)} className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500" />
                Enviar avisos de vencimiento por Telegram
              </label>
            </div>
          </div>
        </section>
      </div>

      <section className={adminCard} aria-labelledby="cfg-alquiler">
        <h2 id="cfg-alquiler" className="text-base font-semibold text-ink">Contrato de alquiler y retención ISLR</h2>
        <p className="mt-0.5 text-xs text-muted">Arrendador Persona Natural retiene 3 %; Persona Jurídica retiene 5 %.</p>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 max-w-2xl" role="radiogroup" aria-label="Tipo de arrendador">
            <OpcionRadio name="alquiler-tipo" elegida={alquilerTipo === 'EMPRESA'} onElegir={() => setAlquilerTipo('EMPRESA')} titulo="Persona Jurídica (5 %)" detalle="Compañía anónima o empresa." tamano="chica" />
            <OpcionRadio name="alquiler-tipo" elegida={alquilerTipo === 'PERSONA'} onElegir={() => setAlquilerTipo('PERSONA')} titulo="Persona Natural (3 %)" detalle="Propietario particular." tamano="chica" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="cfg-alq-nom" className={adminLabel}>Nombre o razón social</label>
              <input id="cfg-alq-nom" value={alquilerArrendador} onChange={(e) => setAlquilerArrendador(e.target.value)} className={adminInput()} />
            </div>
            <div>
              <label htmlFor="cfg-alq-rif" className={adminLabel}>RIF del arrendador</label>
              <input id="cfg-alq-rif" value={alquilerRif} placeholder="J-30000000-0" onChange={(e) => setAlquilerRif(e.target.value)} className={`${adminInput()} sm:max-w-52`} />
            </div>
            <div>
              <label htmlFor="cfg-alq-canon" className={adminLabel}>Canon mensual</label>
              <CampoUnidad id="cfg-alq-canon" unidad="USD" inputMode="decimal" value={alquilerCanonUSD} onChange={(e) => setAlquilerCanonUSD(e.target.value)} className="w-40" />
            </div>
            <div>
              <label htmlFor="cfg-alq-dia" className={adminLabel}>Día de pago</label>
              <CampoUnidad id="cfg-alq-dia" unidad="día" type="number" min={1} max={28} value={alquilerDiaPago} onChange={(e) => setAlquilerDiaPago(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cfg-alq-vence" className={adminLabel}>Vencimiento del contrato</label>
              <input id="cfg-alq-vence" type="date" value={alquilerVenceEl} onChange={(e) => setAlquilerVenceEl(e.target.value)} className={`${adminInput()} sm:max-w-48`} />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                <input type="checkbox" checked={alquilerConIva} onChange={(e) => setAlquilerConIva(e.target.checked)} className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500" />
                Factura con IVA incluido
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className={adminCard} aria-labelledby="cfg-checklist">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="cfg-checklist" className="flex items-center gap-2 text-base font-semibold text-ink">
              <IconoVerificado className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Hoja de ruta SNAT/2026/00093 (hasta 19/04/2027)
            </h2>
            <p className="mt-0.5 text-xs text-muted">Marca los hitos completados con la contadora; la meta se refleja en el Resumen.</p>
          </div>
          <span className={adminBadge('brand')}>{checklist.filter((h) => h.hecho).length} de {checklist.length} listos</span>
        </div>
        <ul className="mt-4 space-y-2">
          {checklist.map((h) => (
            <li key={h.id}>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3 text-sm hover:border-brand-200">
                <input
                  type="checkbox"
                  checked={h.hecho}
                  onChange={() => toggleHito(h.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-brand-600 focus:ring-brand-500"
                />
                <span className={h.hecho ? 'text-muted line-through' : 'font-medium text-ink'}>{h.texto}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {error && <p role="alert" className={adminError}>{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={guardando} className={adminPrimaryButton}>
          <IconoCheck className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar ajustes fiscales'}
        </button>
      </div>
    </form>
  );
}
