'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconoAjustes, IconoAyuda, IconoCandado, IconoChevronDerecha, IconoEditar, IconoPlay } from '@/components/iconos';
import { adminBadge, adminDato, adminInput, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { MODELOS_IA } from '@/lib/ia/precios';
import { nombreDelMotor, PROVEEDORES, type IdProveedor } from '@/lib/ia/proveedores/catalogo';
import { PLANTILLA_IMPORTAR, reglasDe, USOS_IA, type UsoIa } from '@/lib/ia/reglas';
import { ICONOS_DE_USO } from './iconos';
import { claveDe, llamar, modeloDe, usd, type DatosIa } from './tipos';

// C-288 · Los usos de Claude: una tarjeta por uso, con dónde está, qué hace, lo que consumió este mes, cuántas reglas tiene y
// si falla. "Instrucciones" y "Probar" abren el cajón por pasos. La plantilla de Importar con claude.ai va aparte: no usa la
// clave del panel, así que solo se ven sus reglas al importar.
// C-292: cada uso sigue al motor principal o tiene el suyo (lo que era C-288b: "Sonnet solo para Buscar en la web"). "Buscar en la
// web" solo con Claude: es el que busca por su cuenta.

/** El motor propio de un uso: el proveedor (con su clave) y el modelo, o seguir al principal */
function MotorDelUso({ datos, uso, alCerrar, alGuardar }: { datos: DatosIa; uso: UsoIa; alCerrar: () => void; alGuardar: () => Promise<void> }) {
  const propio = datos.porUso[uso];
  const [proveedor, setProveedor] = useState<IdProveedor>(propio?.proveedor ?? (uso === 'busqueda' ? 'anthropic' : datos.proveedor));
  const [modelo, setModelo] = useState(propio?.modelo ?? modeloDe(datos, propio?.proveedor ?? datos.proveedor) ?? '');
  const [ocupado, setOcupado] = useState(false);
  const opciones = PROVEEDORES.filter((p) => claveDe(datos, p.id).hay && (uso !== 'busqueda' || p.id === 'anthropic'));

  const guardar = async (seguirAlPrincipal: boolean) => {
    setOcupado(true);
    try {
      const r = await llamar('/api/admin/ia/uso-motor', 'PUT', { uso, proveedor: seguirAlPrincipal ? null : proveedor, modelo: seguirAlPrincipal ? null : modelo, desde: datos.updatedAt });
      if (r.ok) toast.success(seguirAlPrincipal ? 'Sigue al motor principal' : 'Motor del uso guardado: rige desde el próximo pedido');
      else toast.error(r.datos.error ?? 'No se pudo guardar');
      if (r.ok || r.estado === 409) { await alGuardar(); alCerrar(); }
    } catch {
      toast.error('Sin conexión. Prueba otra vez.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`ia-uso-prov-${uso}`}>Proveedor</label>
        <select id={`ia-uso-prov-${uso}`} value={proveedor} onChange={(e) => { const p = e.target.value as IdProveedor; setProveedor(p); setModelo(modeloDe(datos, p) ?? ''); }} className={`${adminInput()} h-10 w-auto`}>
          {opciones.map((p) => <option key={p.id} value={p.id}>{p.motor}</option>)}
        </select>
        <label className="sr-only" htmlFor={`ia-uso-modelo-${uso}`}>Modelo</label>
        {proveedor === 'anthropic' ? (
          <select id={`ia-uso-modelo-${uso}`} value={modelo} onChange={(e) => setModelo(e.target.value)} className={`${adminInput()} h-10 w-auto`}>
            {MODELOS_IA.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        ) : (
          <input id={`ia-uso-modelo-${uso}`} value={modelo} onChange={(e) => setModelo(e.target.value.trim())} placeholder="Modelo" className={`${adminInput()} h-10 min-w-0 flex-1 font-mono text-xs sm:max-w-xs`} />
        )}
      </div>
      {uso === 'busqueda' && <p className="text-xs text-muted">Por ahora solo Claude: es el que busca en la web por su cuenta.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void guardar(false)} disabled={ocupado || !modelo} className={`${adminPrimaryButton} ${botonChico}`}>Guardar</button>
        {propio && <button type="button" onClick={() => void guardar(true)} disabled={ocupado} className={`${adminSecondaryButton} ${botonChico}`}>Seguir al principal</button>}
        <button type="button" onClick={alCerrar} disabled={ocupado} className={`${adminSecondaryButton} ${botonChico}`}>Cancelar</button>
      </div>
    </div>
  );
}

const botonChico = 'h-9! px-3! text-[13px]';

export default function Usos({ datos, onEditar, alGuardar }: { datos: DatosIa; onEditar: (uso: UsoIa, paso: 0 | 2) => void; alGuardar: () => Promise<void> }) {
  const [cambiandoMotor, setCambiandoMotor] = useState<UsoIa | null>(null);
  const principal = nombreDelMotor(datos.proveedor, modeloDe(datos, datos.proveedor) ?? '');
  /** Con qué responde este uso: el suyo, o el principal (Buscar en la web, sin uno propio, siempre Claude) */
  const motorDe = (uso: UsoIa): string => {
    const propio = datos.porUso[uso];
    if (propio) return `${nombreDelMotor(propio.proveedor, propio.modelo)} · el suyo`;
    if (uso === 'busqueda' && datos.proveedor !== 'anthropic') return `${nombreDelMotor('anthropic', datos.motor.modelo)} · busca por su cuenta`;
    return `${principal} · el principal`;
  };
  return (
    <div className="grid gap-3.5 @xl:grid-cols-2">
      {USOS_IA.map((uso) => {
        const Icono = ICONOS_DE_USO[uso.icono];
        const delServidor = datos.usos.find((u) => u.id === uso.id);
        const fila = datos.consumo.porUso.find((f) => f.uso === uso.id);
        const fallas = fila?.fallas ?? 0;
        return (
          <article key={uso.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                <Icono className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h4 className="text-[15px] font-semibold text-ink">{uso.nombre}</h4>
                <p className="mt-0.5 flex items-start gap-1 text-xs text-muted">
                  <IconoChevronDerecha className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{uso.donde}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-ink-soft">{uso.hace}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={adminDato}>{motorDe(uso.id)}</span>
              <span className={adminDato}>{fila ? `${fila.pedidos} ${fila.pedidos === 1 ? 'pedido' : 'pedidos'} · ${usd(fila.costoUsd)}` : 'Sin pedidos este mes'}</span>
              <span className={adminDato}><IconoCandado className="h-3 w-3" aria-hidden="true" />{reglasDe(uso.id).length} reglas</span>
              {fallas > 0 ? <span className={adminBadge('warning')}>{fallas} {fallas === 1 ? 'falla' : 'fallas'}</span> : <span className={adminDato}>Sin fallas</span>}
              {delServidor?.delEquipo ? <span className={adminBadge('brand')}>Instrucciones del equipo</span> : <span className={adminDato}>Instrucciones de fábrica</span>}
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => onEditar(uso.id, 0)} className={`${adminPrimaryButton} ${botonChico}`}>
                <IconoEditar className="h-4 w-4" aria-hidden="true" />Instrucciones
              </button>
              <button type="button" onClick={() => onEditar(uso.id, 2)} className={`${adminSecondaryButton} ${botonChico}`}>
                <IconoPlay className="h-4 w-4" aria-hidden="true" />Probar
              </button>
              <button type="button" onClick={() => setCambiandoMotor(cambiandoMotor === uso.id ? null : uso.id)} aria-expanded={cambiandoMotor === uso.id} className={`${adminSecondaryButton} ${botonChico}`}>
                <IconoAjustes className="h-4 w-4" aria-hidden="true" />Motor
              </button>
            </div>
            {cambiandoMotor === uso.id && <MotorDelUso datos={datos} uso={uso.id} alCerrar={() => setCambiandoMotor(null)} alGuardar={alGuardar} />}
          </article>
        );
      })}

      <article className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600">
            <ICONOS_DE_USO.IconoSubir className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h4 className="text-[15px] font-semibold text-ink">{PLANTILLA_IMPORTAR.nombre}</h4>
            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted">
              <IconoChevronDerecha className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{PLANTILLA_IMPORTAR.donde}</span>
            </p>
          </div>
        </div>
        <p className="text-sm text-ink-soft">{PLANTILLA_IMPORTAR.hace}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className={adminDato}>claude.ai, Gemini o ChatGPT · tu cuenta</span>
          <span className={adminDato}><IconoCandado className="h-3 w-3" aria-hidden="true" />{reglasDe('plantilla').length} reglas al importar</span>
        </div>
        <div className="mt-auto pt-1">
          <a href="#ia-guia" className={`${adminSecondaryButton} ${botonChico}`}>
            <IconoAyuda className="h-4 w-4" aria-hidden="true" />Cómo usarla
          </a>
        </div>
      </article>
    </div>
  );
}
