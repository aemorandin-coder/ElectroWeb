'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { IconoEnvio } from '@/components/iconos';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { adminHint, adminInput } from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

interface Ciudad { codigo: string; nombre: string; estado: string }

/**
 * C-199: quién despacha los pedidos de este proveedor. La tienda (salen de Guanare) o él mismo desde su ciudad de ZOOM:
 * entonces sus productos van en su propio paquete, solo con envío y siempre con cobro a destino (Andrés, 10/11; la
 * ferretería aliada despacha desde La Victoria). La ficha y la tarjeta dicen "Sale desde …".
 */
export default function DespachaDesde({ proveedorId, codigo, nombre, onGuardado }: {
  proveedorId: string;
  codigo: string | null;
  nombre: string | null;
  onGuardado: (codigo: string | null, nombre: string | null) => void;
}) {
  const { confirm } = useConfirm();
  const [lista, setLista] = useState<{ estados: string[]; ciudades: Ciudad[] } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useCargarAlMontar(async () => {
    try {
      const r = await fetch('/api/public/envio/destinos');
      const d = r.ok ? await r.json() : null;
      if (Array.isArray(d?.ciudades)) setLista(d);
    } catch {
      // Sin la lista de ZOOM no se puede elegir: se ve la de ahora
    }
  });

  const cambiar = async (nuevo: string) => {
    const ciudad = lista?.ciudades.find((c) => c.codigo === nuevo) ?? null;
    const ok = await confirm({
      title: ciudad ? `Despacha él mismo, desde ${ciudad.nombre}` : 'Sus pedidos los despacha la tienda',
      message: ciudad
        ? `Sus productos van en su propio paquete, solo con envío por ZOOM o MRW (sin retiro ni delivery en Guanare) y siempre con cobro a destino. La ficha y la tarjeta dicen "Sale desde ${ciudad.nombre}".`
        : 'Sus productos vuelven a salir de Guanare, en el mismo paquete que lo demás.',
      confirmText: 'Guardar', cancelText: 'Cancelar', type: 'warning',
    });
    if (!ok) return;
    setGuardando(true);
    try {
      const r = await fetch(`/api/admin/proveedores/${proveedorId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dispatchCityCode: nuevo || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'No se pudo guardar'); return; }
      onGuardado(d.dispatchCityCode ?? null, d.dispatchCityName ?? null);
      toast.success(d.dispatchCityName ? `Guardado: sus productos salen desde ${d.dispatchCityName}` : 'Guardado: sus productos salen de la tienda');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border border-line p-3">
      <label htmlFor="despacha-desde" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <IconoEnvio className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" /> Quién despacha sus pedidos
      </label>
      <select
        id="despacha-desde"
        value={codigo ?? ''}
        onChange={(e) => void cambiar(e.target.value)}
        disabled={guardando || (!lista && !codigo)}
        className={`${adminInput()} mt-2`}
      >
        <option value="">La tienda: salen de Guanare</option>
        {codigo && !lista?.ciudades.some((c) => c.codigo === codigo) && <option value={codigo}>Él mismo, desde {nombre ?? codigo}</option>}
        {lista?.estados.map((estado) => (
          <optgroup key={estado} label={estado}>
            {lista.ciudades.filter((c) => c.estado === estado).map((c) => <option key={c.codigo} value={c.codigo}>Él mismo, desde {c.nombre}</option>)}
          </optgroup>
        ))}
      </select>
      <p className={adminHint}>
        {codigo
          ? `Sus productos salen desde ${nombre ?? 'su ciudad'}: en su propio paquete, solo con envío y con cobro a destino.`
          : 'Si despacha él mismo, elige su ciudad: sus productos irán en su propio paquete, solo con envío.'}
      </p>
    </div>
  );
}
