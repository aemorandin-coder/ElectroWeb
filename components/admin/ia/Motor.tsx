'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IconoAdvertencia, IconoCheck, IconoFlechaDerecha, IconoNovedad } from '@/components/iconos';
import Opcion from '@/components/admin/Opcion';
import { adminCard, adminHint, adminInput, adminLabel, adminNotice, adminPrimaryButton } from '@/lib/admin-ui';
import { ESFUERZOS, MODELOS_IA, nombreDeEsfuerzo, type Esfuerzo } from '@/lib/ia/precios';
import { infoProveedor, nombreDelMotor, PROVEEDORES, type IdProveedor } from '@/lib/ia/proveedores/catalogo';
import { USOS_IA } from '@/lib/ia/reglas';
import { LOGOS } from './LogoProveedor';
import { claveDe, llamar, modeloDe, usd, type DatosIa } from './tipos';

// C-288 · El motor de Claude: el modelo y el esfuerzo (con lo que habría costado el mes con cada modelo), con su antes → después.
// C-292 · El motor de toda la tienda, de cualquier proveedor (el equipo, 18/11: "mañana la puedo cambiar por Gemini o Grok"):
// - quién responde: Claude, Gemini, Grok o Groq (solo los que tienen su clave);
// - el modelo: los de Claude con su precio; los de los demás, de la lista que trae el proveedor con su clave;
// - el esfuerzo, solo en Claude;
// - el respaldo, si el principal falla o se queda sin clave.
// Se publica con "Revisar y publicar"; rige desde el próximo pedido. Las claves van en "Proveedores y claves".

export default function Motor({ datos, alGuardar }: { datos: DatosIa; alGuardar: () => Promise<void> }) {
  const [proveedor, setProveedor] = useState<IdProveedor>(datos.proveedor);
  const [modelos, setModelos] = useState<Partial<Record<IdProveedor, string>>>(() => Object.fromEntries(PROVEEDORES.map((p) => [p.id, modeloDe(datos, p.id) ?? ''])));
  const [esfuerzo, setEsfuerzo] = useState<Esfuerzo>(datos.motor.esfuerzo);
  const [respaldo, setRespaldo] = useState<IdProveedor | null>(datos.respaldo);
  const [lista, setLista] = useState<{ de: IdProveedor; modelos: string[]; error: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const { consumo } = datos;
  const costoCon = (id: string) => consumo.comparacion.find((c) => c.modelo === id)?.costoUsd ?? 0;
  const mes = consumo.mes.split(' de ')[0];
  const modelo = modelos[proveedor] ?? '';
  const esAnthropic = proveedor === 'anthropic';
  const conClave = (id: IdProveedor) => claveDe(datos, id).hay;

  // Los modelos de un proveedor que no es Anthropic los trae él mismo, con su clave
  useEffect(() => {
    if (esAnthropic || !conClave(proveedor) || lista?.de === proveedor) return;
    let vigente = true;
    void llamar<{ modelos?: string[] }>(`/api/admin/ia/modelos?proveedor=${proveedor}`, 'GET').then((r) => {
      if (vigente) setLista({ de: proveedor, modelos: r.datos.modelos ?? [], error: r.ok ? '' : r.datos.error ?? 'No se pudo leer su lista de modelos.' });
    }).catch(() => vigente && setLista({ de: proveedor, modelos: [], error: 'Sin conexión.' }));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se pide una vez por proveedor
  }, [proveedor]);

  const antes = { proveedor: datos.proveedor, modelo: modeloDe(datos, datos.proveedor) ?? '', esfuerzo: datos.motor.esfuerzo, respaldo: datos.respaldo };
  const despues = { proveedor, modelo, esfuerzo, respaldo };
  const cambia = antes.proveedor !== despues.proveedor || antes.modelo !== despues.modelo || (esAnthropic && antes.esfuerzo !== despues.esfuerzo) || antes.respaldo !== despues.respaldo;
  const listo = Boolean(modelo) && conClave(proveedor) && (!respaldo || (respaldo !== proveedor && conClave(respaldo)));
  // A cuántos usos les cambia: los que no tienen motor propio ("Buscar en la web" sigue con Claude si el principal es otro)
  const siguen = USOS_IA.filter((u) => !datos.porUso[u.id] && (u.id !== 'busqueda' || proveedor === 'anthropic')).length;

  const publicar = async () => {
    setOcupado(true);
    try {
      const r = await llamar('/api/admin/ia/motor', 'PUT', { proveedor, modelo, ...(esAnthropic ? { esfuerzo } : {}), respaldo, desde: datos.updatedAt });
      if (r.ok) toast.success('Motor publicado: rige desde el próximo pedido');
      else toast.error(r.datos.error ?? 'No se pudo publicar el motor');
      if (r.ok || r.estado === 409) await alGuardar();
    } catch {
      toast.error('Sin conexión. Prueba otra vez.');
    } finally {
      setOcupado(false);
    }
  };

  const boton = (
    <button type="button" onClick={() => void publicar()} disabled={!cambia || !listo || ocupado} className={adminPrimaryButton}>
      <IconoCheck className="h-4 w-4" aria-hidden="true" />{ocupado ? 'Publicando…' : !cambia ? 'Sin cambios' : !listo ? 'Falta el modelo o la clave' : 'Publicar el cambio'}
    </button>
  );

  const resumen = (m: typeof antes) => (
    <>
      <b className="text-base text-ink">{m.modelo ? nombreDelMotor(m.proveedor, m.modelo) : 'Sin modelo'}</b>
      <span className="block text-xs text-muted">
        {infoProveedor(m.proveedor).empresa}
        {m.proveedor === 'anthropic' ? ` · esfuerzo ${nombreDeEsfuerzo(m.esfuerzo)}` : ''}
        {' · '}{m.respaldo ? `respaldo: ${infoProveedor(m.respaldo).motor}` : 'sin respaldo'}
      </span>
    </>
  );

  return (
    <div className="space-y-4">
      {/* C-298: por prioridad. Quién responde y el modelo a lo ancho; el esfuerzo al lado del respaldo; "Revisar y publicar" al final */}
      <section className={adminCard}>
        <h4 className="text-base font-semibold text-ink">Quién responde</h4>
        <p className="mt-0.5 text-sm text-muted">Las instrucciones y las reglas son de la tienda: valen igual con cualquiera.</p>
        <div className="mt-3 grid gap-2.5 @2xl:grid-cols-2" role="radiogroup" aria-label="Proveedor de IA">
          {PROVEEDORES.map((p) => {
            const hay = conClave(p.id);
            return (
              <Opcion
                key={p.id}
                role="radio"
                aria-checked={proveedor === p.id}
                elegida={proveedor === p.id}
                icono={LOGOS[p.id]}
                titulo={<>{p.motor} <span className="font-normal text-muted">· {p.empresa}</span>{datos.proveedor === p.id ? ' · el de ahora' : ''}</>}
                detalle={hay ? p.para : 'Sin clave: conéctala en "Proveedores y claves".'}
                disabled={!hay && proveedor !== p.id}
                onClick={() => { setProveedor(p.id); if (respaldo === p.id) setRespaldo(null); }}
              />
            );
          })}
        </div>
        {!esAnthropic && (
          <p className={adminHint}>&quot;Buscar en la web&quot; sigue con Claude: es el que busca por su cuenta. Los demás usos pasan a {infoProveedor(proveedor).motor}.</p>
        )}
      </section>

      <section className={`${adminCard} @container`}>
        <h4 className="text-base font-semibold text-ink">Modelo</h4>
        {esAnthropic ? (
          <>
            <p className="mt-0.5 text-sm text-muted">Lo que habría costado {mes} con cada uno, con lo que se usó de verdad.</p>
            <div className="mt-3 grid gap-2.5" role="group" aria-label="Modelo de Claude">
              {!MODELOS_IA.some((m) => m.id === datos.motor.modelo) && (
                <p className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink-soft">Ahora usa <b>{datos.motor.modelo}</b>, un modelo que se puso en el servidor y no está en esta lista.</p>
              )}
              {MODELOS_IA.map((m) => (
                <Opcion
                  key={m.id}
                  elegida={modelo === m.id}
                  icono={IconoNovedad}
                  titulo={<>{m.nombre}{datos.motor.modelo === m.id && datos.proveedor === 'anthropic' ? ' · el de ahora' : ''}</>}
                  detalle={<>{m.para} {usd(m.entrada)} / {usd(m.salida)} el millón de tokens.<span className="@md:hidden"> Este mes: <b className="text-ink">{usd(costoCon(m.id))}</b>.</span></>}
                  extra={<span className="hidden shrink-0 text-right text-xs text-ink-soft @md:block"><b className="block text-[15px] tabular-nums text-ink">{usd(costoCon(m.id))}</b>al mes</span>}
                  aria-pressed={modelo === m.id}
                  onClick={() => setModelos((x) => ({ ...x, anthropic: m.id }))}
                />
              ))}
            </div>
            {consumo.total.pedidos === 0 && <p className={adminHint}>Todavía no hay pedidos este mes: el costo se calcula con lo que se use.</p>}
          </>
        ) : (
          <div className="mt-2">
            <label htmlFor="ia-modelo" className={adminLabel}>El modelo de {infoProveedor(proveedor).motor}</label>
            {lista?.de === proveedor && lista.modelos.length > 0 ? (
              <select id="ia-modelo" value={modelo} onChange={(e) => setModelos((x) => ({ ...x, [proveedor]: e.target.value }))} className={`${adminInput()} sm:max-w-sm`}>
                {!modelo && <option value="">Elige un modelo</option>}
                {modelo && !lista.modelos.includes(modelo) && <option value={modelo}>{modelo}</option>}
                {lista.modelos.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input id="ia-modelo" value={modelo} onChange={(e) => setModelos((x) => ({ ...x, [proveedor]: e.target.value.trim() }))} placeholder="El nombre del modelo, como lo da el proveedor" className={`${adminInput()} font-mono text-sm sm:max-w-sm`} />
            )}
            <p className={adminHint}>
              {lista?.de === proveedor && lista.error ? lista.error : lista?.de === proveedor ? `La lista la da ${infoProveedor(proveedor).empresa} con tu clave.` : 'Cargando su lista de modelos…'}
              {' '}Los precios, en <a href={infoProveedor(proveedor).precios} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">su página</a>.
            </p>
          </div>
        )}
      </section>

      <div className={`grid gap-4 ${esAnthropic ? '@3xl:grid-cols-2' : ''} @3xl:items-start`}>
        {esAnthropic && (
          <section className={adminCard}>
            <h4 className="text-base font-semibold text-ink">Esfuerzo</h4>
            <p className="mt-0.5 text-sm text-muted">Cuánto piensa antes de responder. Más esfuerzo: mejor, más lento y más caro.</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Esfuerzo de Claude">
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
        )}

        <section className={adminCard}>
          <h4 className="text-base font-semibold text-ink">Respaldo</h4>
          <p className="mt-0.5 text-sm text-muted">Si {infoProveedor(proveedor).motor} no responde o se queda sin clave, le pide a este.</p>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Respaldo">
            <Opcion tamano="chica" role="radio" aria-checked={respaldo === null} elegida={respaldo === null} titulo="Ninguno" onClick={() => setRespaldo(null)} />
            {PROVEEDORES.filter((p) => p.id !== proveedor).map((p) => (
              <Opcion key={p.id} tamano="chica" role="radio" aria-checked={respaldo === p.id} elegida={respaldo === p.id} titulo={p.motor} disabled={!conClave(p.id)} onClick={() => setRespaldo(p.id)} />
            ))}
          </div>
          <p className={adminHint}>Solo los que tienen su clave. Groq sigue además de respaldo en &quot;Buscar en la web&quot;.</p>
        </section>
      </div>

      <section className={`${adminCard} ${cambia ? 'border-brand-500' : ''}`} aria-labelledby="ia-motor-revisar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 id="ia-motor-revisar" className="text-base font-semibold text-ink">Revisar y publicar</h4>
            <p className="mt-0.5 text-sm text-muted">
              {!cambia
                ? 'Sin cambios. Elige otro motor, modelo o respaldo y aquí sale el antes y el después.'
                : `Cambia ${siguen} de ${USOS_IA.length} usos (los que siguen al principal), desde el próximo pedido. Lo ya redactado no cambia.`}
            </p>
          </div>
          {!cambia && boton}
        </div>
        {cambia && (
          <>
            <div className="mt-3 grid items-center gap-2.5 @md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="rounded-xl border border-line p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Antes</p>
                {resumen(antes)}
              </div>
              <IconoFlechaDerecha className="mx-auto hidden h-5 w-5 text-brand-500 @md:block" aria-hidden="true" />
              <div className="rounded-xl border border-brand-500 bg-brand-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">Después</p>
                {resumen(despues)}
              </div>
            </div>
            <div className="mt-3 flex justify-end">{boton}</div>
          </>
        )}
      </section>
    </div>
  );
}
