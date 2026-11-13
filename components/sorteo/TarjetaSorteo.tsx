'use client';

// C-212: el sorteo en Mi panel: cuántos boletos tiene el cliente y el enlace a /sorteo. Sin sorteo activo no sale nada.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconoChevronDerecha, IconoRegalo } from '@/components/iconos';

interface Datos {
  sorteo: { titulo: string; premio: string; resultadoEl: string; cerrado: boolean; sorteado: boolean } | null;
  total?: number;
}

export default function TarjetaSorteo() {
  const [datos, setDatos] = useState<Datos | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/customer/sorteo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Datos | null) => { if (vivo) setDatos(d); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  if (!datos?.sorteo) return null;
  const { sorteo, total = 0 } = datos;
  const dia = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(new Date(sorteo.resultadoEl));
  const linea = sorteo.sorteado ? 'Ya se sorteó: mira quién ganó.'
    : total > 0 ? `Tienes ${total} ${total === 1 ? 'boleto' : 'boletos'}. Resultado el ${dia}.`
      : `Compra $10 o más, o invita a 2 amigos, y participa. Resultado el ${dia}.`;
  return (
    <Link href="/sorteo" className="group relative flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-500 lg:p-5">
      <span className="iconos-marca flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-950">
        <IconoRegalo className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink group-hover:text-brand-600">{sorteo.titulo}: {sorteo.premio}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{linea}</span>
      </span>
      <IconoChevronDerecha className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
