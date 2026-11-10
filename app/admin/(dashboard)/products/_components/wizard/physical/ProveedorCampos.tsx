'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { WizardData } from '../types';
import { wizardInput } from '../ui';
import { Campo, controlDe } from '../Campo';

// C-196: a quién se le compra el producto y con qué código lo conoce él. Con el código, la lista del proveedor
// (Productos → Lista del proveedor) le actualiza el costo y la existencia. Solo lo ve el equipo.

interface Proveedor { id: string; name: string }

const NUEVO = '__nuevo__';

export default function ProveedorCampos({ data, onChange, errors }: {
  data: WizardData;
  onChange: (cambios: Partial<WizardData>) => void;
  errors: Partial<Record<keyof WizardData, string>>;
}) {
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetch('/api/admin/proveedores')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vigente) setProveedores(Array.isArray(d?.proveedores) ? d.proveedores : []); })
      .catch(() => { if (vigente) setProveedores([]); });
    return () => { vigente = false; };
  }, []);

  const agregar = async () => {
    const limpio = nombre.trim();
    if (limpio.length < 2) { toast.error('Escribe el nombre del proveedor'); return; }
    setGuardando(true);
    try {
      const r = await fetch('/api/admin/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: limpio }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'No se pudo agregar'); return; }
      setProveedores((lista) => [...(lista ?? []), { id: d.id, name: d.name }].sort((a, b) => a.name.localeCompare(b.name, 'es')));
      onChange({ supplierId: d.id });
      setAgregando(false);
      setNombre('');
    } finally {
      setGuardando(false);
    }
  };

  // Un proveedor guardado que ya no está en la lista (no debería pasar: no se borra con productos) se muestra igual
  const opciones = proveedores ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
      <Campo id="p-proveedor" label="Proveedor" hint="A quién se le compra. Solo lo ve el equipo">
        {agregando ? (
          <div className="flex gap-2">
            <input
              id="p-proveedor"
              aria-describedby="p-proveedor-hint"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void agregar(); } }}
              placeholder="Nombre del proveedor"
              maxLength={80}
              className={`${wizardInput(false)} min-w-0 flex-1`}
              autoFocus
            />
            <button type="button" onClick={() => void agregar()} disabled={guardando} className="h-11 shrink-0 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {guardando ? 'Agregando…' : 'Agregar'}
            </button>
            <button type="button" onClick={() => { setAgregando(false); setNombre(''); }} className="h-11 shrink-0 rounded-lg border border-line px-3 text-sm font-semibold text-ink-soft hover:bg-surface">
              Cancelar
            </button>
          </div>
        ) : (
          <select
            {...controlDe('p-proveedor', undefined, 'hint')}
            value={data.supplierId}
            onChange={(e) => {
              if (e.target.value === NUEVO) { setAgregando(true); return; }
              onChange(e.target.value ? { supplierId: e.target.value } : { supplierId: '', supplierSku: '' });
            }}
            className={wizardInput(false)}
            disabled={proveedores === null}
          >
            {/* Mientras carga la lista, el guardado se ve como "Cargando…" (no como otro proveedor) */}
            <option value="">{proveedores === null && !data.supplierId ? 'Cargando…' : 'Sin proveedor'}</option>
            {data.supplierId && !opciones.some((p) => p.id === data.supplierId) && <option value={data.supplierId}>{proveedores === null ? 'Cargando…' : 'Proveedor guardado'}</option>}
            {opciones.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value={NUEVO}>+ Agregar proveedor…</option>
          </select>
        )}
      </Campo>
      <Campo id="p-codigo-proveedor" label="Código en el proveedor" error={errors.supplierSku} hint="Con este código su lista actualiza el costo y la existencia">
        <input
          {...controlDe('p-codigo-proveedor', errors.supplierSku, 'hint')}
          value={data.supplierSku}
          onChange={(e) => onChange({ supplierSku: e.target.value })}
          disabled={!data.supplierId}
          placeholder={data.supplierId ? 'Ej. R023127' : 'Primero elige el proveedor'}
          maxLength={64}
          className={`${wizardInput(Boolean(errors.supplierSku))} font-mono`}
        />
      </Campo>
    </div>
  );
}
