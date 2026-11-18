'use client';

// C-221: el tablero del sorteo ya creado (PLAN.md §1.9): el estado en su sello, la línea de tiempo con "hoy", lo que dejó
// (con sus íconos), las acciones a la vista y, cuando cierra, sortear en 3 pasos. Todo lo que mostraba la pantalla de C-212
// sigue aquí: los cuatro números, el % del premio pagado, quiénes participan con sus avisos, "Sortear ahora" con su
// confirmación, el ganador con la huella y "Sorteo nuevo con estos datos".
// C-254: debajo del ganador, la entrega. Antes de publicarla, en el azul de "lo que alguien tiene que hacer", con lo que
// hace falta y "Publicar la entrega"; publicada, su foto, su nombre, hasta cuándo sale en la bandera, "Cambiar" y "Quitar
// de la tienda" (por si la persona cambia de idea).

import { useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Ayuda from '@/components/admin/Ayuda';
import {
  IconoBillete, IconoCalendario, IconoCamaraFotos, IconoCheck, IconoClientes, IconoCopiar, IconoCorreo, IconoCupon, IconoEditar,
  IconoInterruptorApagado, IconoInterruptorEncendido, IconoLista, IconoOcultar, IconoPremio, IconoRegalo, IconoReloj, IconoVentas,
  IconoVer, IconoVerificado, IconoVideo, type IconType,
} from '@/components/iconos';
import { diaLargo } from '@/components/sorteo/PremioSorteo';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import {
  adminBadge, adminCard, adminDato, adminNotice, adminPrimaryButton, adminSecondaryButton, adminStatCard, adminStatLabel, adminStatValue,
  adminTable, adminTableWrap, adminTd, adminTh, placaAccion,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { banderaHasta, nombreConCiudad } from '@/lib/sorteo/entrega';
import { leerYoutube } from '@/lib/youtube';
import EstrellasDelSorteo from './EstrellasDelSorteo';
import { diaMes, estadoDe, type Datos, type EntregaPanel } from './tipos';

const instante = (dia: string, fin = false) => new Date(`${dia}T${fin ? '23:59:59' : '00:00:00'}-04:00`).getTime();

export default function TableroSorteo({ datos, onEditar, onNuevo, onEntrega, onRecargar }: {
  datos: Datos;
  onEditar: () => void;
  onNuevo: () => void;
  /** C-254: abre "Publicar la entrega" (o "Cambiar") */
  onEntrega: () => void;
  onRecargar: () => Promise<void>;
}) {
  const { confirm } = useConfirm();
  const [ocupado, setOcupado] = useState(false);
  // "Hoy" se fija al abrir el tablero (se vuelve a leer al recargar)
  const [ahora] = useState(() => Date.now());
  const s = datos.sorteo;
  if (!s) return null;
  const n = datos.numeros ?? { boletos: 0, participantes: 0, ventasUSD: 0, margenUSD: 0 };
  const participantes = datos.participantes ?? [];
  const estado = estadoDe(s);
  const sorteado = Boolean(s.sorteadoAt);
  const cubre = s.costoPremioUSD > 0 ? Math.min(100, Math.round((n.margenUSD / s.costoPremioUSD) * 100)) : 0;
  const conAviso = participantes.filter((p) => p.aviso).length;

  // La línea de tiempo: del inicio al resultado, con la última compra y "hoy"
  const t0 = instante(s.desde);
  const tFin = instante(s.resultadoEl, true);
  const pos = (t: number) => Math.min(100, Math.max(0, ((t - t0) / Math.max(1, tFin - t0)) * 100));
  const hoyEn = pos(ahora);
  const faltanCierre = Math.max(0, Math.ceil((instante(s.hasta, true) - ahora) / 86_400_000));
  const cuando = sorteado ? `Sorteado el ${new Date(s.sorteadoAt as string).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}`
    : s.cerrado ? `Cerró el ${diaMes(s.hasta)}`
      : ahora < t0 ? `Empieza el ${diaMes(s.desde)}`
        : `Faltan ${faltanCierre} ${faltanCierre === 1 ? 'día' : 'días'} para cerrar`;

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/sorteo`);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar. El enlace es /sorteo');
    }
  };

  const encender = async (activo: boolean) => {
    const ok = await confirm({
      title: activo ? 'Publicar el sorteo' : 'Apagar el sorteo',
      message: activo
        ? 'Se ve en /sorteo y en Mi panel, y los enlaces para invitar empiezan a contar.'
        : 'Deja de verse en /sorteo y en Mi panel. Las compras siguen contando por sus fechas.',
      confirmText: activo ? 'Publicar' : 'Apagar',
      cancelText: 'Cancelar',
      type: activo ? 'info' : 'warning',
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const r = await fetch('/api/admin/sorteo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) { toast.error(d?.error || 'No se pudo cambiar'); return; }
      toast.success(activo ? 'Sorteo publicado' : 'Sorteo apagado');
      await onRecargar();
    } finally {
      setOcupado(false);
    }
  };

  // C-254: la persona cambió de idea: se borra lo suyo y la tienda vuelve al correo tapado
  const quitarEntrega = async () => {
    const ok = await confirm({
      title: 'Quitar la entrega de la tienda',
      message: 'Dejan de salir su foto, su video y su nombre en /sorteo y en la bandera del inicio. La tienda vuelve a mostrar solo su correo tapado.',
      confirmText: 'Quitar',
      cancelText: 'Cancelar',
      type: 'warning',
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const r = await fetch('/api/admin/sorteo/entrega', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sorteoId: s.id }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) { toast.error(d?.error || 'No se pudo quitar'); return; }
      toast.success('Entrega quitada de la tienda');
      await onRecargar();
    } finally {
      setOcupado(false);
    }
  };

  const sortear = async () => {
    const ok = await confirm({
      title: '¿Sortear ahora?',
      message: `Se elige 1 boleto al azar entre los ${n.boletos}. Se hace una sola vez y no se puede repetir.`,
      confirmText: 'Sí, sortear',
      cancelText: 'Todavía no',
      type: 'warning',
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const r = await fetch('/api/admin/sorteo/sortear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sorteoId: s.id }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) { toast.error(d?.error || 'No se pudo sortear'); return; }
      toast.success(d.ganadorCodigo ? `Ganó el boleto ${d.ganadorCodigo} de ${d.ganadorEmail}` : `Ganó ${d.ganadorEmail}`);
      await onRecargar();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* El sorteo: su estado y lo que se puede hacer con él */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
            <IconoRegalo className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink">{s.titulo}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className={adminBadge(estado.tono)}>{estado.etiqueta}</span>
              <span className={adminDato}><IconoReloj className="h-3.5 w-3.5" aria-hidden="true" /> {cuando}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copiarEnlace()} className={`${adminSecondaryButton} h-9 px-3`}><IconoCopiar className="h-4 w-4" aria-hidden="true" /> Copiar enlace</button>
          <a href="/sorteo" target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} h-9 px-3`}><IconoVer className="h-4 w-4" aria-hidden="true" /> Ver en la tienda</a>
          {!sorteado && <button type="button" onClick={onEditar} className={`${adminSecondaryButton} h-9 px-3`}><IconoEditar className="h-4 w-4" aria-hidden="true" /> Cambiar</button>}
          {!sorteado && (
            s.activo
              ? <button type="button" onClick={() => void encender(false)} disabled={ocupado} className={`${adminSecondaryButton} h-9 px-3`}><IconoInterruptorApagado className="h-4 w-4" aria-hidden="true" /> Apagar</button>
              : <button type="button" onClick={() => void encender(true)} disabled={ocupado} className={`${adminPrimaryButton} h-9 px-3`}><IconoInterruptorEncendido className="h-4 w-4" aria-hidden="true" /> Publicar</button>
          )}
        </div>
      </div>

      {/* Del inicio al resultado, y dónde está hoy */}
      <div className={adminCard}>
        <div className="relative mx-1 mt-7 h-2 rounded-full bg-line">
          <span className="absolute inset-y-0 left-0 origin-left rounded-full bg-brand-500 transition-transform duration-700 starting:scale-x-0 motion-reduce:transition-none" style={{ width: `${hoyEn}%` }} />
          <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-ink-soft" style={{ left: `${pos(instante(s.hasta, true))}%` }} aria-hidden="true" />
          {!sorteado && ahora >= t0 && ahora <= tFin && (
            <span className="absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded-md bg-brand-700 px-1.5 py-0.5 text-xs font-semibold text-white" style={{ left: `${Math.min(92, Math.max(8, hoyEn))}%` }}>
              Hoy, {diaMes(new Date(ahora - 4 * 3600 * 1000).toISOString().slice(0, 10))}
            </span>
          )}
        </div>
        <div className="mt-3 flex justify-between gap-2 text-xs text-muted">
          <span><strong className="font-semibold text-ink">{diaMes(s.desde)}</strong> empieza</span>
          <span className="text-center"><strong className="font-semibold text-ink">{diaMes(s.hasta)}</strong> última compra</span>
          <span className="text-right"><strong className="font-semibold text-ink">{diaMes(s.resultadoEl)}</strong> resultado</span>
        </div>
      </div>

      {/* Lo que dejó el sorteo: lo primero que hay que mirar cada día */}
      <section aria-labelledby="sorteo-numeros" className="space-y-3">
        <h3 id="sorteo-numeros" className="sr-only">Lo que dejó el sorteo</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Numero icono={IconoCupon} etiqueta="Boletos" valor={String(n.boletos)} />
          <Numero icono={IconoClientes} etiqueta="Participantes" valor={String(n.participantes)} />
          <Numero icono={IconoVentas} etiqueta="Ventas con boleto" valor={formatUSD(n.ventasUSD)} />
          <Numero icono={IconoBillete} etiqueta="Margen estimado" valor={formatUSD(n.margenUSD)} />
        </div>
        {s.costoPremioUSD > 0 && (
          <div className={`${adminCard} py-4`}>
            <p className="flex flex-wrap items-center gap-1 text-sm text-ink">
              <strong className="font-semibold tabular-nums">{cubre} %</strong> del premio ya está pagado con el margen ({formatUSD(n.margenUSD)} de {formatUSD(s.costoPremioUSD)})
              <Ayuda>El margen se estima en 20 centavos por dólar vendido (costo + 30 % + IVA), con las compras que dieron boleto. No descuenta las que se habrían hecho igual sin el sorteo.</Ayuda>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
              <div className="h-full origin-left rounded-full bg-success-strong transition-transform duration-700 starting:scale-x-0 motion-reduce:transition-none" style={{ width: `${Math.max(2, cubre)}%` }} />
            </div>
          </div>
        )}
      </section>

      {/* C-297: el producto estrella de cada semana, mientras está abierto */}
      {!sorteado && !s.cerrado && <EstrellasDelSorteo />}

      {/* Cuando cierra: sortear en 3 pasos */}
      {!sorteado && s.cerrado && (
        <section aria-labelledby="sorteo-sortear" className={adminCard}>
          <h3 id="sorteo-sortear" className="text-base font-semibold text-ink">Ya cerró: falta sortear</h3>
          <ol className="mt-3 grid gap-3 lg:grid-cols-3">
            <PasoSortear icono={IconoLista} titulo="1. Revisa" detalle={conAviso > 0 ? `${conAviso} ${conAviso === 1 ? 'participante tiene' : 'participantes tienen'} amigos que no cuentan.` : 'Nadie tiene avisos.'}>
              {conAviso > 0 && <a href="#sorteo-participantes" className="text-sm font-semibold text-brand-500 hover:underline">Ver la lista</a>}
            </PasoSortear>
            <PasoSortear icono={IconoPremio} titulo="2. Sortea" detalle={`Una sola vez, entre los ${n.boletos} boletos.`} fuerte>
              <button type="button" onClick={() => void sortear()} disabled={ocupado || n.boletos === 0} className={`${adminPrimaryButton} h-9 px-3`}>
                <IconoPremio className="h-4 w-4" aria-hidden="true" /> Sortear ahora
              </button>
            </PasoSortear>
            <PasoSortear icono={IconoCorreo} titulo="3. Le llega el correo" detalle="Al ganador le llega solo, y a los demás el resultado. Tú coordinas la entrega." />
          </ol>
        </section>
      )}

      {/* El ganador, con la huella de la lista con que se sorteó */}
      {sorteado && (
        <section aria-labelledby="sorteo-ganador" className={`${adminCard} border-success-strong/30`}>
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-strong text-white"><IconoCheck className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              {/* C-263: con el código del boleto, el mismo que el cliente ve en su boleto y que se publica con el correo tapado */}
              <h3 id="sorteo-ganador" className="text-base font-semibold text-ink">{s.ganadorCodigo ? <>Ganó el boleto <span className="tracking-wider">{s.ganadorCodigo}</span> de {s.ganadorEmail}</> : <>Ganó {s.ganadorEmail}</>}</h3>
              <p className="mt-0.5 text-sm text-ink-soft">{s.ganadorDetalle}. Sorteado el {new Date(s.sorteadoAt as string).toLocaleString('es-VE', { timeZone: 'America/Caracas' })} entre {s.boletosAlSortear} boletos.</p>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                Huella de la lista: <span className={`${adminDato} break-all`}>{s.huellaLista}</span>
                <Ayuda>La huella resume la lista exacta de boletos con que se sorteó. Si alguien la pide, se puede comprobar que nadie la cambió después.</Ayuda>
              </p>
              <p className="mt-1 text-xs text-muted">{s.entrega.publicadaAt ? 'En la tienda sale la entrega (abajo), con su permiso.' : 'En la tienda sale con el correo tapado.'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {s.ganadorEmail && (
                  <a href={`mailto:${s.ganadorEmail}?subject=${encodeURIComponent(`Ganaste el ${s.titulo}`)}`} className={`${adminPrimaryButton} h-9 px-3`}>
                    <IconoCorreo className="h-4 w-4" aria-hidden="true" /> Escribirle para la entrega
                  </a>
                )}
                <button type="button" onClick={onNuevo} className={`${adminSecondaryButton} h-9 px-3`}><IconoRegalo className="h-4 w-4" aria-hidden="true" /> Sorteo nuevo con estos datos</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {sorteado && <EntregaDelSorteo entrega={s.entrega} ahora={ahora} ocupado={ocupado} onEntrega={onEntrega} onQuitar={() => void quitarEntrega()} />}

      {participantes.length > 0 && (
        <section id="sorteo-participantes" aria-labelledby="sorteo-participan" className="space-y-2">
          <h3 id="sorteo-participan" className="flex items-center gap-1 text-base font-semibold text-ink">
            Quiénes participan
            <Ayuda>De más boletos a menos. Las invitaciones no se verifican por teléfono: los avisos son para revisarlos antes de sortear.</Ayuda>
          </h3>
          <div className={adminTableWrap}>
            <table className={adminTable}>
              <thead><tr><th className={adminTh}>Cliente</th><th className={adminTh}>Por compra</th><th className={adminTh}>Por reseñas</th><th className={adminTh}>Por invitar</th><th className={adminTh}>Revisar</th></tr></thead>
              <tbody>
                {participantes.map((p) => (
                  <tr key={p.userId}>
                    <td className={adminTd}><span className="block font-medium">{p.nombre || 'Sin nombre'}</span><span className="block text-xs text-muted">{p.email}</span></td>
                    <td className={`${adminTd} tabular-nums`}>{p.porCompra}</td>
                    <td className={`${adminTd} tabular-nums`}>{p.porResena}</td>
                    <td className={`${adminTd} tabular-nums`}>{p.porInvitar}{p.invitados > 0 && <span className="block text-xs text-muted">{p.invitados} {p.invitados === 1 ? 'amigo' : 'amigos'}</span>}</td>
                    <td className={adminTd}>{p.aviso ? <span className={adminDato}>{p.aviso}</span> : <span className="text-xs text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Numero({ icono: Icono, etiqueta, valor }: { icono: IconType; etiqueta: string; valor: string }) {
  return (
    <div className={adminStatCard}>
      <span className="iconos-marca flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icono className="h-5 w-5" aria-hidden="true" /></span>
      <div className="min-w-0">
        <span className={adminStatLabel}>{etiqueta}</span>
        <p className={`${adminStatValue} tabular-nums`}>{valor}</p>
      </div>
    </div>
  );
}

function PasoSortear({ icono: Icono, titulo, detalle, fuerte = false, children }: { icono: IconType; titulo: string; detalle: string; fuerte?: boolean; children?: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${fuerte ? 'bg-brand-700 text-white' : 'iconos-marca bg-brand-50 text-brand-700'}`}><Icono className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-semibold text-ink">{titulo}</p>
          <p className="text-xs text-muted">{detalle}</p>
        </div>
        {children}
      </div>
    </li>
  );
}

/** C-254: la entrega en la tienda, debajo del ganador: lo que falta, o lo publicado con sus acciones */
function EntregaDelSorteo({ entrega, ahora, ocupado, onEntrega, onQuitar }: { entrega: EntregaPanel; ahora: number; ocupado: boolean; onEntrega: () => void; onQuitar: () => void }) {
  if (!entrega.publicadaAt) {
    return (
      <section aria-labelledby="sorteo-entrega" className={adminNotice('warning')}>
        <div className="flex flex-wrap items-start gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${placaAccion}`}><IconoCamaraFotos className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="sorteo-entrega" className="text-base font-semibold text-brand-900">La entrega, en la tienda</h3>
              <span className={adminBadge('warning')}>Falta publicarla</span>
            </div>
            <p className="mt-1 text-sm">Su foto, su video y su nombre salen en /sorteo y 7 días en la bandera del inicio. Sin publicarla, sale solo su correo tapado.</p>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-brand-900">
              {([[IconoCamaraFotos, 'Su foto con el premio'], [IconoVideo, 'El video en YouTube (si hay)'], [IconoVerificado, 'Su permiso']] as const).map(([Icono, texto]) => (
                <li key={texto} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-brand-200"><Icono className="h-4 w-4 text-brand-500" aria-hidden="true" /> {texto}</li>
              ))}
            </ul>
            <button type="button" onClick={onEntrega} disabled={ocupado} className={`${adminPrimaryButton} mt-4`}>
              <IconoPremio className="h-4 w-4" aria-hidden="true" /> Publicar la entrega
            </button>
          </div>
        </div>
      </section>
    );
  }
  const video = leerYoutube(entrega.video);
  const publicada = new Date(entrega.publicadaAt);
  const hasta = banderaHasta(publicada);
  return (
    <section aria-labelledby="sorteo-entrega" className={adminCard}>
      <div className="flex flex-wrap items-start gap-4">
        {entrega.foto && (
          <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-line">
            <Image src={entrega.foto} alt="" fill sizes="64px" className="object-cover" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="sorteo-entrega" className="text-base font-semibold text-ink">La entrega: {nombreConCiudad(entrega.nombre, entrega.ciudad)}</h3>
            <span className={adminBadge('success')}><IconoCheck className="h-3.5 w-3.5" aria-hidden="true" /> Publicada</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className={adminDato}><IconoVideo className="h-3.5 w-3.5" aria-hidden="true" /> {video ? (video.vertical ? 'Short de YouTube' : 'Video de YouTube') : 'Sin video'}</span>
            {entrega.permiso && <span className={adminDato}><IconoVerificado className="h-3.5 w-3.5" aria-hidden="true" /> Aceptó salir en la tienda</span>}
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <IconoCalendario className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
            {ahora < hasta.getTime() ? `En la bandera del inicio hasta el ${diaLargo(hasta)}.` : `Salió en la bandera del inicio hasta el ${diaLargo(hasta)}.`} En /sorteo, mientras siga este sorteo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/sorteo" target="_blank" rel="noopener noreferrer" className={`${adminSecondaryButton} h-9 px-3`}><IconoVer className="h-4 w-4" aria-hidden="true" /> Ver en la tienda</a>
            <button type="button" onClick={onEntrega} disabled={ocupado} className={`${adminSecondaryButton} h-9 px-3`}><IconoEditar className="h-4 w-4" aria-hidden="true" /> Cambiar</button>
            <button type="button" onClick={onQuitar} disabled={ocupado} className={`${adminSecondaryButton} h-9 px-3 text-deal!`}><IconoOcultar className="h-4 w-4" aria-hidden="true" /> Quitar de la tienda</button>
          </div>
        </div>
      </div>
    </section>
  );
}
