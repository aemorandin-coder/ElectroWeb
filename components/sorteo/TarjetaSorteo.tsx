'use client';

// C-212: el sorteo en Mi panel: cuántos boletos tiene el cliente y el enlace a /sorteo. Sin sorteo activo no sale nada.
// C-221: la tarjeta en sí (`TarjetaSorteoVista`) también la usa la vista previa del panel, con los datos que se están
// editando; y dice la compra mínima de verdad (antes decía "$10" fijo).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconoChevronDerecha, IconoClientes, IconoRegalo } from '@/components/iconos';
import { formatUSD } from '@/lib/currency';

export interface DatosTarjetaSorteo {
  titulo: string;
  premio: string;
  resultadoEl: string;
  cerrado: boolean;
  sorteado: boolean;
  compraMinimaUSD?: number;
  topeInvitar?: number;
}

/** C-262: lo de los amigos invitados (de /api/customer/sorteo), sin sus nombres */
export interface ProgresoInvitar {
  porInvitar: number;
  tope: number;
  faltanParaProximo: number;
  /** Amigos que se unieron y todavía no cuentan (falta que activen su cuenta o que agreguen su teléfono) */
  pendientes: number;
}

/** C-262: la línea de los amigos, o null si no hay nada que decir (la línea de arriba ya invita a 2 amigos) */
function lineaAmigos(p: ProgresoInvitar): string | null {
  if (p.pendientes > 0) return p.pendientes === 1 ? '1 amigo tuyo todavía no cuenta: mira qué le falta.' : `${p.pendientes} amigos tuyos todavía no cuentan: mira qué les falta.`;
  if (p.faltanParaProximo === 1) return 'Te falta 1 amigo para tu próximo boleto.';
  if (p.faltanParaProximo === 0 && p.tope > 0) return `Ya ganaste los ${p.tope} ${p.tope === 1 ? 'boleto' : 'boletos'} de invitar.`;
  return null;
}

/** "$10" y no "$10,00": un monto redondo se lee mejor */
export const montoCorto = (usd: number) => (Number.isInteger(usd) ? `$${usd}` : formatUSD(usd));

export function TarjetaSorteoVista({ sorteo, total = 0, enlace = true, progreso }: { sorteo: DatosTarjetaSorteo; total?: number; enlace?: boolean; progreso?: ProgresoInvitar }) {
  const dia = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' }).format(new Date(sorteo.resultadoEl));
  const minimo = montoCorto(sorteo.compraMinimaUSD ?? 10);
  const invitar = (sorteo.topeInvitar ?? 1) > 0;
  // C-255 (el equipo, 15/11: "siempre habla claro sobre dos caminos"): la compra primero, y con boletos, cómo sumar más
  const linea = sorteo.sorteado ? 'Ya se sorteó: mira quién ganó.'
    : total > 0 ? `Tienes ${total} ${total === 1 ? 'boleto' : 'boletos'}: suma más comprando${invitar ? ' o invitando' : ''}. Resultado el ${dia}.`
      : `Compra ${minimo} o más${invitar ? ', o invita a 2 amigos,' : ''} y participa. Resultado el ${dia}.`;
  const amigos = invitar && progreso && !sorteo.cerrado && !sorteo.sorteado ? lineaAmigos(progreso) : null;
  const cuerpo = (
    <>
      <span className="iconos-marca flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <IconoRegalo className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink group-hover:text-brand-600">{sorteo.titulo}: {sorteo.premio}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{linea}</span>
        {amigos && (
          <span className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
            <IconoClientes className="h-4 w-4 shrink-0" aria-hidden="true" />
            {amigos}
          </span>
        )}
      </span>
      <IconoChevronDerecha className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
    </>
  );
  const clases = 'group relative flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors lg:p-5';
  // En la vista previa del panel no es un enlace: es un dibujo de lo que verá el cliente
  if (!enlace) return <div className={clases}>{cuerpo}</div>;
  return (
    <Link href="/sorteo" className={`${clases} hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-500`}>
      {cuerpo}
    </Link>
  );
}

export default function TarjetaSorteo() {
  const [datos, setDatos] = useState<{ sorteo: DatosTarjetaSorteo | null; total?: number; invitar?: ProgresoInvitar } | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/customer/sorteo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sorteo: DatosTarjetaSorteo | null; total?: number; invitar?: ProgresoInvitar } | null) => { if (vivo) setDatos(d); })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  if (!datos?.sorteo) return null;
  return <TarjetaSorteoVista sorteo={datos.sorteo} total={datos.total ?? 0} progreso={datos.invitar} />;
}
