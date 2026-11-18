'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconoCheck } from '@/components/iconos';
import Plegable from '@/components/admin/Plegable';
import { adminBadge, adminDato, adminHint, adminInput, adminSecondaryButton } from '@/lib/admin-ui';
import { PROVEEDORES, type IdProveedor } from '@/lib/ia/proveedores/catalogo';
import ClaveDeApi from './ClaveDeApi';
import { LOGOS } from './LogoProveedor';
import { claveDe, llamar, type DatosIa } from './tipos';

// C-292 · Proveedores y claves: una tarjeta por proveedor (Anthropic, Google, xAI y Groq) con su logo, para qué conviene, su clave
// (se prueba antes de guardarla y queda cifrada) y, en los que no son Anthropic, lo que cuesta: el equipo lo copia de su página
// oficial, porque la tienda no lo sabe (sin precio, el consumo cuenta solo los tokens).
// C-298: cada proveedor, un plegable con su estado en la cabecera (responde ahora, de respaldo, con o sin clave).

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
  // C-298: cada proveedor se pliega. Abierto, el que responde ahora y el que tiene la clave rota
  return (
    <div className="grid gap-2.5 @4xl:grid-cols-2 @4xl:items-start">
      {PROVEEDORES.map((p) => {
        const clave = claveDe(datos, p.id);
        const enUso = datos.proveedor === p.id ? 'Responde ahora' : datos.respaldo === p.id ? 'De respaldo' : null;
        return (
          <Plegable
            key={p.id}
            id={`ia-prov-${p.id}`}
            icono={LOGOS[p.id]}
            placa={clave.hay ? 'fuerte' : 'suave'}
            abierto={datos.proveedor === p.id || clave.claveRota}
            titulo={<>{p.motor} <span className="font-normal text-muted">· {p.empresa}</span></>}
            resumen={p.para}
            extra={(
              <>
                {enUso && <span className={enUso === 'Responde ahora' ? adminBadge('brand') : adminDato}>{enUso}</span>}
                {clave.claveRota
                  ? <span className={adminBadge('warning')}>Pegar la clave otra vez</span>
                  : clave.hay
                    ? <span className={adminBadge('success')}><IconoCheck className="h-3 w-3" aria-hidden="true" />Con clave</span>
                    : <span className={adminDato}>Sin clave</span>}
              </>
            )}
          >
            <ClaveDeApi datos={datos} alGuardar={alGuardar} proveedor={p.id} />
            {p.id !== 'anthropic' && <Precio datos={datos} id={p.id} alGuardar={alGuardar} />}
          </Plegable>
        );
      })}
    </div>
  );
}
