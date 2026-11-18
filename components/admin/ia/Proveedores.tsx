'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminBadge, adminCard, adminHint, adminInput, adminSecondaryButton } from '@/lib/admin-ui';
import { PROVEEDORES, type IdProveedor } from '@/lib/ia/proveedores/catalogo';
import ClaveDeApi from './ClaveDeApi';
import { LOGOS } from './LogoProveedor';
import { claveDe, llamar, type DatosIa } from './tipos';

// C-292 · Proveedores y claves: una tarjeta por proveedor (Anthropic, Google, xAI y Groq) con su logo, para qué conviene, su clave
// (se prueba antes de guardarla y queda cifrada) y, en los que no son Anthropic, lo que cuesta: el equipo lo copia de su página
// oficial, porque la tienda no lo sabe (sin precio, el consumo cuenta solo los tokens).

function Precio({ datos, id, alGuardar }: { datos: DatosIa; id: Exclude<IdProveedor, 'anthropic'>; alGuardar: () => Promise<void> }) {
  const p = datos.proveedores.find((x) => x.id === id);
  const [entrada, setEntrada] = useState(p?.precioEntrada != null ? String(p.precioEntrada) : '');
  const [salida, setSalida] = useState(p?.precioSalida != null ? String(p.precioSalida) : '');
  const [ocupado, setOcupado] = useState(false);
  const numero = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
  const cambia = numero(entrada) !== (p?.precioEntrada ?? null) || numero(salida) !== (p?.precioSalida ?? null);

  const guardar = async () => {
    setOcupado(true);
    try {
      const r = await llamar('/api/admin/ia/proveedor', 'PUT', { proveedor: id, precioEntrada: numero(entrada), precioSalida: numero(salida) });
      if (r.ok) toast.success('Precio guardado: cuenta desde el próximo pedido');
      else toast.error(r.datos.error ?? 'No se pudo guardar el precio');
      if (r.ok) await alGuardar();
    } catch {
      toast.error('Sin conexión. Prueba otra vez.');
    } finally {
      setOcupado(false);
    }
  };

  const campo = (etiqueta: string, valor: string, cambiar: (v: string) => void, idCampo: string) => (
    <div>
      <label htmlFor={idCampo} className="mb-1 block text-xs font-semibold text-ink-soft">{etiqueta}</label>
      <div className="relative w-32">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-muted">$</span>
        <input id={idCampo} inputMode="decimal" value={valor} onChange={(e) => cambiar(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="—" className={`${adminInput()} pl-7 tabular-nums`} />
      </div>
    </div>
  );

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-sm font-semibold text-ink">Lo que cuesta, por millón de tokens</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        {campo('Lo que entra', entrada, setEntrada, `ia-precio-entrada-${id}`)}
        {campo('Lo que sale', salida, setSalida, `ia-precio-salida-${id}`)}
        <button type="button" onClick={() => void guardar()} disabled={!cambia || ocupado} className={`${adminSecondaryButton} h-11`}>{ocupado ? 'Guardando…' : 'Guardar el precio'}</button>
      </div>
      <p className={adminHint}>Cópialo de su página oficial. Vacío: el consumo cuenta solo los tokens.</p>
    </div>
  );
}

export default function Proveedores({ datos, alGuardar }: { datos: DatosIa; alGuardar: () => Promise<void> }) {
  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      {PROVEEDORES.map((p) => {
        const Logo = LOGOS[p.id];
        const clave = claveDe(datos, p.id);
        const enUso = datos.proveedor === p.id ? 'Responde ahora' : datos.respaldo === p.id ? 'De respaldo' : null;
        return (
          <section key={p.id} className={adminCard} aria-labelledby={`ia-prov-${p.id}`}>
            <div className="mb-3 flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${clave.hay ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'}`}>
                <Logo className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 id={`ia-prov-${p.id}`} className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                  {p.motor} <span className="font-normal text-muted">· {p.empresa}</span>
                  {enUso && <span className={adminBadge('warning')}>{enUso}</span>}
                </h4>
                <p className="text-sm text-muted">{p.para}</p>
              </div>
            </div>
            <ClaveDeApi datos={datos} alGuardar={alGuardar} proveedor={p.id} />
            {p.id !== 'anthropic' && <Precio datos={datos} id={p.id} alGuardar={alGuardar} />}
          </section>
        );
      })}
    </div>
  );
}
