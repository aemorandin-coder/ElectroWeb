'use client';

// C-276 (rediseño de Clientes, la lista que eligió el equipo el 16/11): quién es cada cliente, qué compra y qué le falta.
// - Filtros con su cuenta (components/admin/Filtros): nuevos, sin activar, con pedidos, con Puntos ES, empresas por verificar,
//   dormidos (sin entrar en 30 días) y suspendidos.
// - La búsqueda espera a que se deje de escribir y busca por nombre, correo, teléfono, cédula, RIF o empresa.
// - Cada fila con sus sellos de confianza, el registro, el último ingreso, los pedidos, lo gastado y sus Puntos ES; de 25 en 25.
// - La ficha de cada cliente es su página (/admin/customers/[id]). Lo que hacía el cuadro de antes (sus datos, la empresa,
//   el resumen, editar y eliminar) vive ahí. Siguen aquí Verificaciones (con su cuenta) y Actualizar.
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Filtros, { type Filtro } from '@/components/admin/Filtros';
import { SellosMini } from '@/components/admin/clientes/Sellos';
import {
  IconoActualizar, IconoBuscar, IconoCalendario, IconoCarrito, IconoChevronDerecha, IconoChevronIzquierda, IconoClientes, IconoCorreo,
  IconoCuenta, IconoEnviar, IconoError, IconoGarantia, IconoMaletin, IconoNovedad, IconoOrdenes, IconoPausa, IconoPuntosEs, IconoReloj,
} from '@/components/iconos';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  adminBadge, adminCardFlush, adminDato, adminIconButton, adminIconChip, adminInput, adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminTableWrap,
  adminSecondaryButton, adminStatCard, adminStatLabel, adminStatValue, adminTh,
} from '@/lib/admin-ui';
import { fechaCorta, haceCuanto } from '@/lib/clientes/fechas';
import type { FiltroClientes } from '@/lib/clientes/lista';
import { formatUSD } from '@/lib/currency';
import type { FilaCliente } from '@/lib/dto/cliente';

interface Respuesta {
  filas: FilaCliente[];
  total: number;
  pagina: number;
  paginas: number;
  cuentas: Record<FiltroClientes, number>;
  cifras: { clientes: number; nuevosMes: number; sinActivar: number; conActivas: number };
}

const POR_PAGINA = 25;

function Avatar({ fila }: { fila: Pick<FilaCliente, 'nombre' | 'correo' | 'foto'> }) {
  const inicial = (fila.nombre || fila.correo || '?').trim().charAt(0).toUpperCase();
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-sm font-bold text-white">
      {fila.foto ? <Image src={fila.foto} alt="" fill sizes="40px" className="object-cover" /> : inicial}
    </span>
  );
}

function UltimoIngreso({ fila }: { fila: FilaCliente }) {
  if (!fila.ultimoIngreso) return <span className="text-muted">Nunca entró</span>;
  return (
    <span className="text-ink-soft">
      {haceCuanto(fila.ultimoIngreso.en)}
      {fila.ultimoIngreso.dispositivo && <span className="block text-xs text-muted">{fila.ultimoIngreso.dispositivo}</span>}
    </span>
  );
}

export default function ClientesPage() {
  const [filtro, setFiltro] = useState<FiltroClientes>('todos');
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<Respuesta | null>(null);
  // La consulta que ya respondió: mientras no sea la que se pide, está cargando (sin setState dentro del efecto)
  const [respondida, setRespondida] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [vuelta, setVuelta] = useState(0);
  const [pendientes, setPendientes] = useState(0);

  // La búsqueda va al servidor cuando se deja de escribir (antes pedía en cada tecla)
  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(texto.trim()); setPagina(1); }, 350);
    return () => clearTimeout(t);
  }, [texto]);

  const consulta = `${filtro}|${busqueda}|${pagina}|${vuelta}`;
  const cargando = respondida !== consulta;
  useEffect(() => {
    const control = new AbortController();
    const params = new URLSearchParams({ filtro, pagina: String(pagina) });
    if (busqueda) params.set('buscar', busqueda);
    fetch(`/api/customers?${params}`, { signal: control.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se pudieron cargar los clientes');
        setDatos(await r.json());
        setError('');
      })
      .catch((e: unknown) => { if (!control.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudieron cargar los clientes'); })
      .finally(() => { if (!control.signal.aborted) setRespondida(consulta); });
    return () => control.abort();
  }, [filtro, busqueda, pagina, vuelta, consulta]);

  useEffect(() => {
    fetch('/api/admin/verifications/pending-count')
      .then(async (r) => { if (r.ok) setPendientes((await r.json()).count || 0); })
      .catch(() => toast.error('No se pudo cargar el conteo de verificaciones'));
  }, []);

  const c = datos?.cuentas;
  const filtros: Filtro<FiltroClientes>[] = [
    { valor: 'todos', etiqueta: 'Todos', ayuda: 'Toda la clientela', Icono: IconoClientes, cuenta: c?.todos },
    { valor: 'nuevos', etiqueta: 'Nuevos', ayuda: 'Este mes', Icono: IconoNovedad, cuenta: c?.nuevos },
    { valor: 'sin-activar', etiqueta: 'Sin activar', ayuda: 'No abrieron el correo', Icono: IconoCorreo, cuenta: c?.['sin-activar'], tono: c?.['sin-activar'] ? 'aviso' : undefined },
    { valor: 'con-pedidos', etiqueta: 'Con pedidos', ayuda: 'Compraron alguna vez', Icono: IconoCarrito, cuenta: c?.['con-pedidos'] },
    { valor: 'con-puntos', etiqueta: 'Con Puntos ES', ayuda: 'Tienen saldo', Icono: IconoPuntosEs, cuenta: c?.['con-puntos'] },
    { valor: 'empresas', etiqueta: 'Empresas', ayuda: 'Por verificar', Icono: IconoMaletin, cuenta: c?.empresas, tono: c?.empresas ? 'aviso' : undefined },
    { valor: 'dormidos', etiqueta: 'Dormidos', ayuda: 'Sin entrar en 30 días', Icono: IconoReloj, cuenta: c?.dormidos },
    ...(c?.suspendidos || filtro === 'suspendidos' ? [{ valor: 'suspendidos' as const, etiqueta: 'Suspendidos', ayuda: 'No pueden entrar', Icono: IconoPausa, cuenta: c?.suspendidos }] : []),
  ];
  const cambiarFiltro = (f: FiltroClientes) => { setFiltro(f); setPagina(1); };
  const filas = datos?.filas ?? [];
  const desde = datos && datos.total > 0 ? (datos.pagina - 1) * POR_PAGINA + 1 : 0;
  const hasta = datos ? Math.min(datos.total, datos.pagina * POR_PAGINA) : 0;

  const cifras = [
    { Icono: IconoCuenta, valor: datos?.cifras.clientes, texto: 'Clientes', tono: 'brand' as const },
    { Icono: IconoCalendario, valor: datos?.cifras.nuevosMes, texto: 'Nuevos este mes', tono: 'success' as const },
    { Icono: IconoCorreo, valor: datos?.cifras.sinActivar, texto: 'Sin activar el correo', tono: 'brand' as const },
    { Icono: IconoOrdenes, valor: datos?.cifras.conActivas, texto: 'Con órdenes activas', tono: 'brand' as const },
  ];

  return (
    <div className="min-w-0">
      <div className={adminPageHeader}>
        <div className="flex items-center gap-3">
          <div className={`${adminIconChip('brand')} hidden sm:flex`}>
            <IconoCuenta className="h-6 w-6 text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className={adminPageTitle}>Clientes</h1>
            <p className={adminPageSubtitle}>Quién es cada uno, qué compra y qué le falta.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/verifications" className={adminSecondaryButton} title="Verificaciones de empresas">
            <IconoGarantia className="h-4 w-4" aria-hidden="true" />
            <span>Verificaciones</span>
            {pendientes > 0 && (
              <span className={adminBadge('warning')}>
                {pendientes > 99 ? '99+' : pendientes}
                <span className="sr-only"> por verificar</span>
              </span>
            )}
          </Link>
          <button type="button" onClick={() => setVuelta((v) => v + 1)} className={`${adminSecondaryButton} w-11 px-0!`} aria-label="Actualizar clientes" title="Actualizar">
            <IconoActualizar className={`h-5 w-5 text-muted ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && (
        <div className={`${adminNotice('danger')} mb-4 flex items-center gap-2`} role="alert">
          <IconoError className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cifras.map(({ Icono, valor, texto: t, tono }) => (
            <div key={t} className={`${adminStatCard} p-3`}>
              <span className={`${adminIconChip(tono)} hidden sm:flex`}><Icono className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className={`${adminStatValue} text-lg tabular-nums`}>{valor ?? '…'}</p>
                <p className={adminStatLabel}>{t}</p>
              </div>
            </div>
          ))}
        </div>

        <label className="relative block">
          <span className="sr-only">Buscar clientes</span>
          <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre, correo, teléfono, cédula o RIF" className={`${adminInput()} pl-10`} />
        </label>

        <Filtros etiqueta="Filtrar clientes" valor={filtro} onCambiar={cambiarFiltro} filtros={filtros} />

        {cargando && !datos ? (
          <div className={`${adminCardFlush} p-8 text-center text-sm text-muted`}>Cargando clientes…</div>
        ) : filas.length === 0 ? (
          <div className={adminCardFlush}>
            <EmptyState
              icon={<IconoClientes className="h-8 w-8" />}
              title={busqueda ? 'Nadie coincide con la búsqueda' : 'No hay clientes aquí'}
              description={busqueda ? 'Prueba con el teléfono, la cédula o una parte del correo.' : 'Cambia el filtro para ver a los demás.'}
            />
          </div>
        ) : (
          <>
            {/* En la computadora: la tabla. Toda la fila abre la ficha (enlace estirado); los botones van encima */}
            <div className={`${adminTableWrap} hidden lg:block`}>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={adminTh}>Cliente</th>
                    <th className={adminTh}>Sellos</th>
                    <th className={`${adminTh} hidden xl:table-cell`}>Registro</th>
                    <th className={`${adminTh} hidden xl:table-cell`}>Último ingreso</th>
                    <th className={`${adminTh} text-right`}>Pedidos</th>
                    <th className={`${adminTh} text-right`}>Gastado</th>
                    <th className={`${adminTh} hidden text-right xl:table-cell`}>Puntos ES</th>
                    <th className={adminTh}><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id} className="relative border-t border-line hover:bg-surface">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar fila={f} />
                          <div className="min-w-0">
                            <Link href={`/admin/customers/${f.id}`} className="font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-brand-500">
                              {f.nombre || 'Sin nombre'}
                            </Link>
                            {f.empresa && <span className={`${adminDato} ml-2 align-middle`}><IconoMaletin className="h-3.5 w-3.5" aria-hidden="true" />Empresa</span>}
                            {f.cuenta === 'SUSPENDED' && <span className={`${adminBadge('danger')} ml-2 align-middle`}>Suspendida</span>}
                            <p className="truncate text-xs text-muted">{f.correo}</p>
                            {/* Entre 1024 y 1280 px, el registro y el último ingreso van aquí (sus columnas no caben) */}
                            <p className="text-xs text-muted xl:hidden">Desde {fechaCorta(f.registro, new Date(f.registro).getFullYear() !== new Date().getFullYear())} · <UltimoIngreso fila={f} /></p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><SellosMini sellos={f.sellos} /></td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft xl:table-cell">{fechaCorta(f.registro, new Date(f.registro).getFullYear() !== new Date().getFullYear())}</td>
                      <td className="hidden whitespace-nowrap px-4 py-3 xl:table-cell"><UltimoIngreso fila={f} /></td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {f.pedidos}
                        {f.activos > 0 && <span className="block text-xs text-brand-600">{f.activos} en curso</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-brand-700">
                        {formatUSD(f.gastado)}
                        {f.puntos > 0 && <span className="block text-xs font-normal text-ink-soft xl:hidden">{formatUSD(f.puntos)} en Puntos ES</span>}
                      </td>
                      <td className="hidden px-4 py-3 text-right tabular-nums xl:table-cell">{f.puntos > 0 ? formatUSD(f.puntos) : <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="relative z-[1] flex justify-end gap-1.5">
                          <Link href={`/admin/customers/${f.id}/escribir`} className={adminIconButton} aria-label={`Escribirle a ${f.nombre || 'este cliente'}`} title="Escribirle">
                            <IconoEnviar className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          <Link href={`/admin/customers/${f.id}`} aria-label={`Ver la ficha de ${f.nombre || 'este cliente'}`} className={`${adminSecondaryButton} h-9! whitespace-nowrap px-2.5! text-xs! xl:px-3!`}>
                            <span className="hidden xl:inline">Ver ficha</span> <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* En el teléfono: tarjetas */}
            <ul className="grid gap-2.5 lg:hidden" aria-label="Clientes">
              {filas.map((f) => (
                <li key={f.id} className="relative rounded-2xl border border-line bg-white p-3">
                  <div className="flex items-center gap-3">
                    <Avatar fila={f} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/customers/${f.id}`} className="font-semibold text-ink after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-2 focus-visible:outline-brand-500">
                        {f.nombre || 'Sin nombre'}
                      </Link>
                      <p className="truncate text-xs text-muted">{f.correo}</p>
                    </div>
                    <IconoChevronDerecha className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <SellosMini sellos={f.sellos} />
                    <span className="text-xs text-muted">{f.ultimoIngreso ? haceCuanto(f.ultimoIngreso.en) : 'Nunca entró'}</span>
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
                    <span>{f.pedidos} {f.pedidos === 1 ? 'pedido' : 'pedidos'}{f.activos > 0 ? ` · ${f.activos} en curso` : ''}</span>
                    <span>Gastado {formatUSD(f.gastado)}</span>
                    {f.puntos > 0 && <span>Puntos ES {formatUSD(f.puntos)}</span>}
                    <span>Desde {fechaCorta(f.registro)}</span>
                    {f.empresa && <span className="font-semibold text-brand-700">Empresa</span>}
                    {f.cuenta === 'SUSPENDED' && <span className="font-semibold text-deal">Suspendida</span>}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
              <span className="tabular-nums">{desde} a {hasta} de {datos?.total ?? 0}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={!datos || datos.pagina <= 1} className={`${adminSecondaryButton} h-10! disabled:opacity-50`}>
                  <IconoChevronIzquierda className="h-4 w-4" aria-hidden="true" /> Anteriores
                </button>
                <button type="button" onClick={() => setPagina((p) => p + 1)} disabled={!datos || datos.pagina >= datos.paginas} className={`${adminSecondaryButton} h-10! disabled:opacity-50`}>
                  Siguientes <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
