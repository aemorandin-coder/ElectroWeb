'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { IconoMas, IconoMenos, IconoPaquete } from '@/components/iconos';
import { formatUSD } from '@/lib/currency';
import type { DashboardData } from '@/lib/queries/dashboard';
import s from './tablero.module.css';

// C-279: "Se están acabando" con la existencia que se sube ahí mismo: − n +, y "Guardar 1 → 3" cuando cambia.
// Guarda con la ruta de siempre (PATCH /api/products/[id], que exige el permiso y la versión con que se abrió): si otro lo
// cambió mientras tanto, lo dice y trae lo nuevo en vez de pisarlo.

type Producto = DashboardData['pocoInventario']['productos'][number];

function Fila({ p, clase }: { p: Producto; clase: string }) {
  const router = useRouter();
  const [stock, setStock] = useState(p.stock);
  const [guardando, setGuardando] = useState(false);
  const cambio = stock !== p.stock;

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock, baseUpdatedAt: p.version }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409) {
        toast.error('Alguien cambió este producto hace un momento: te traigo lo nuevo');
        router.refresh();
        return;
      }
      if (!res.ok) { toast.error(data.error || 'No se pudo guardar la existencia'); return; }
      toast.success(`${p.name}: ${stock === 1 ? 'queda 1' : `quedan ${stock}`}`);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <li className={`${s.filaStock} ${clase}`}>
      {p.foto ? (
        <span className={`${s.foto} relative overflow-hidden`}><Image src={p.foto} alt="" fill sizes="36px" className="object-contain" unoptimized={!p.foto.startsWith('/')} /></span>
      ) : <span className={`${s.placa} ${s.placaGris}`} aria-hidden="true"><IconoPaquete /></span>}
      <Link href={`/admin/products/${p.id}`} className={s.nombre} title={p.name}>{p.name}</Link>
      <span className={s.abajo}>
        <small><span className={s.queda}>{stock === 1 ? 'Queda 1' : stock === 0 ? 'Agotado' : `Quedan ${stock}`}</span> · {formatUSD(p.precioUSD)}</small>
        <span className={`${s.pasoStock} ${s.sinMuyAngosto}`}>
          <button type="button" aria-label={`Uno menos de ${p.name}`} disabled={guardando || stock <= 0} onClick={() => setStock((n) => Math.max(0, n - 1))}><IconoMenos aria-hidden="true" /></button>
          <output aria-live="polite" aria-label={`Existencia de ${p.name}`}>{stock}</output>
          <button type="button" aria-label={`Uno más de ${p.name}`} disabled={guardando || stock >= 1_000_000} onClick={() => setStock((n) => n + 1)}><IconoMas aria-hidden="true" /></button>
        </span>
        {cambio && (
          <button type="button" onClick={() => void guardar()} disabled={guardando} className={`${s.btn} ${s.btnPrimario} ${s.guardarStock}`}>
            {guardando ? 'Guardando…' : `Guardar ${p.stock} → ${stock}`}
          </button>
        )}
      </span>
    </li>
  );
}

export default function StockRapido({ productos }: { productos: Producto[] }) {
  // Las filas que no caben en el tamaño de la tarjeta se esconden enteras (nunca cortadas a la mitad)
  const clase = (i: number) => [i >= 1 ? s.sinH2 : '', i >= 3 ? s.sinH3 : '', i >= 4 ? s.sinH4 : ''].join(' ');
  return (
    <ul className={s.filas}>
      {productos.map((p, i) => <Fila key={`${p.id}-${p.version}`} p={p} clase={clase(i)} />)}
    </ul>
  );
}
