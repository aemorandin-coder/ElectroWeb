'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconoAdvertencia, IconoCheck, IconoNovedad } from '@/components/iconos';
import Opcion from '@/components/admin/Opcion';
import { adminCard, adminHint, adminNotice, adminPrimaryButton } from '@/lib/admin-ui';
import { ESFUERZOS, MODELOS_IA, nombreDeEsfuerzo, nombreDeModelo, type Esfuerzo } from '@/lib/ia/precios';
import ClaveDeApi from './ClaveDeApi';
import { llamar, usd, type DatosIa } from './tipos';

// C-288 · El motor de Claude y su clave. El modelo y el esfuerzo se eligen aquí (con lo que habría costado el mes con cada modelo) y
// se publican con su antes → después; rigen desde el próximo pedido. La clave tiene su propio guardado (se prueba antes).

export default function Motor({ datos, alGuardar }: { datos: DatosIa; alGuardar: () => Promise<void> }) {
  const [modelo, setModelo] = useState<string>(datos.motor.modelo);
  const [esfuerzo, setEsfuerzo] = useState<Esfuerzo>(datos.motor.esfuerzo);
  const [ocupado, setOcupado] = useState(false);
  const { consumo } = datos;
  const costoCon = (id: string) => consumo.comparacion.find((c) => c.modelo === id)?.costoUsd ?? 0;
  const mes = consumo.mes.split(' de ')[0];
  const cambia = modelo !== datos.motor.modelo || esfuerzo !== datos.motor.esfuerzo;
  // El modelo de ahora puede ser uno que se puso a mano en el .env y no está en la lista: se muestra aparte, no se puede elegir
  const deLaLista = MODELOS_IA.some((m) => m.id === datos.motor.modelo);

  const publicar = async () => {
    setOcupado(true);
    try {
      const r = await llamar('/api/admin/ia/motor', 'PUT', { modelo, esfuerzo, desde: datos.updatedAt });
      if (r.ok) toast.success('Motor publicado: rige desde el próximo pedido');
      else toast.error(r.datos.error ?? 'No se pudo publicar el motor');
      if (r.ok || r.estado === 409) await alGuardar();
    } catch {
      toast.error('Sin conexión. Prueba otra vez.');
    } finally {
      setOcupado(false);
    }
  };

  const resumen = (m: string, e: Esfuerzo) => (
    <>
      <b className="text-base text-ink">{nombreDeModelo(m)}</b>
      <span className="block text-xs text-muted">
        Esfuerzo {nombreDeEsfuerzo(e)} · {MODELOS_IA.some((x) => x.id === m) ? <><span className="font-semibold tabular-nums">{usd(costoCon(m))}</span> al mes</> : 'sin precio en la lista'}
      </span>
    </>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
      <div className="min-w-0 space-y-4">
        <section className={adminCard}>
          <h4 className="text-base font-semibold text-ink">Modelo</h4>
          <p className="mt-0.5 text-sm text-muted">Lo que habría costado {mes} con cada uno, con lo que se usó de verdad.</p>
          <div className="mt-3 grid gap-2.5" role="group" aria-label="Modelo de Claude">
            {!deLaLista && (
              <p className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink-soft">Ahora usa <b>{nombreDeModelo(datos.motor.modelo)}</b>, un modelo que se puso en el servidor y no está en esta lista.</p>
            )}
            {MODELOS_IA.map((m) => (
              <Opcion
                key={m.id}
                elegida={modelo === m.id}
                icono={IconoNovedad}
                titulo={<>{m.nombre}{datos.motor.modelo === m.id ? ' · el de ahora' : ''}</>}
                detalle={`${m.para} ${usd(m.entrada)} / ${usd(m.salida)} el millón de tokens.`}
                extra={<span className="shrink-0 text-right text-xs text-ink-soft"><b className="block text-[15px] tabular-nums text-ink">{usd(costoCon(m.id))}</b>al mes</span>}
                aria-pressed={modelo === m.id}
                onClick={() => setModelo(m.id)}
              />
            ))}
          </div>
          {consumo.total.pedidos === 0 && <p className={adminHint}>Todavía no hay pedidos este mes: el costo se calcula con lo que se use.</p>}
        </section>

        <section className={adminCard}>
          <h4 className="text-base font-semibold text-ink">Esfuerzo</h4>
          <p className="mt-0.5 text-sm text-muted">Cuánto piensa antes de responder. Más esfuerzo: mejores respuestas, más lentas y más caras.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Esfuerzo de Claude">
            {ESFUERZOS.map((e) => (
              <Opcion key={e.id} tamano="chica" elegida={esfuerzo === e.id} titulo={e.nombre[0].toUpperCase() + e.nombre.slice(1)} aria-pressed={esfuerzo === e.id} onClick={() => setEsfuerzo(e.id)} />
            ))}
          </div>
          {esfuerzo === 'max' ? (
            <div className={`${adminNotice('warning')} mt-3 flex items-start gap-3`}>
              <IconoAdvertencia aria-hidden="true" />
              <span>&quot;Máximo&quot; puede pasar del minuto que espera el servidor: &quot;Buscar en la web&quot; se cortaría. Medido el 13/11 con productos reales: alto, 13 a 17 s; máximo, 98 a 158 s.</span>
            </div>
          ) : (
            <p className={adminHint}>&quot;Máximo&quot; puede pasar del minuto que espera el servidor. Medido el 13/11: alto, 13 a 17 s; máximo, 98 a 158 s.</p>
          )}
        </section>
      </div>

      <div className="min-w-0 space-y-4">
        <section className={adminCard}>
          <h4 className="mb-3 text-base font-semibold text-ink">La clave de la API</h4>
          <ClaveDeApi datos={datos} alGuardar={alGuardar} />
        </section>

        <section className={adminCard}>
          <h4 className="text-base font-semibold text-ink">Revisar y publicar</h4>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Antes</p>
              {resumen(datos.motor.modelo, datos.motor.esfuerzo)}
            </div>
            <div className={`rounded-xl border p-3 ${cambia ? 'border-brand-500 bg-brand-50' : 'border-line'}`}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Después</p>
              {resumen(modelo, esfuerzo)}
            </div>
          </div>
          <p className={adminHint}>Afecta a los seis usos, desde el próximo pedido. Lo que ya redactó Claude no cambia.{datos.motor.fuente === 'env' ? ' Hoy el motor sale del servidor: al publicar queda el del panel.' : ''}</p>
          <button type="button" onClick={() => void publicar()} disabled={!cambia || ocupado} className={`${adminPrimaryButton} mt-3`}>
            <IconoCheck className="h-4 w-4" aria-hidden="true" />{ocupado ? 'Publicando…' : cambia ? 'Publicar el cambio' : 'Sin cambios'}
          </button>
        </section>
      </div>
    </div>
  );
}
