'use client';

// C-221: crear o cambiar el sorteo en 4 pasos (PLAN.md §1.9, la A que eligió el equipo el 14/11): el premio, cómo se gana,
// las fechas y "Revisar y publicar", con la vista previa de lo que verá el cliente al lado. Al cambiar uno que ya existe, el
// último paso dice qué cambia (antes → después) y a cuántos clientes les cambian los boletos, antes de guardar.
// C-253: un paso más, "Lo que trae" (lo que viene con el premio, el sello del banner y el nombre corto de la bandera del
// inicio), con la bandera al lado como sale en la tienda.

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Ayuda from '@/components/admin/Ayuda';
import CampoUnidad from '@/components/admin/CampoUnidad';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import {
  IconoBolsa, IconoBuscar, IconoCalendario, IconoChat, IconoCheck, IconoClientes, IconoCupon, IconoEditar, IconoEliminar, IconoFlechaDerecha,
  IconoFlechaIzquierda, IconoGuardar, IconoImagen, IconoInterruptorEncendido, IconoMas, IconoOcultar, IconoPaquete, IconoPremio, IconoRegalo,
  IconoSubir, IconoVer, IconoWeb, type IconType,
} from '@/components/iconos';
import PremioSorteo from '@/components/sorteo/PremioSorteo';
import { CuerpoPestana } from '@/components/sorteo/BanderaSorteo';
import { iconoDeCosa } from '@/components/sorteo/iconosQueTrae';
import { logoDelNombreCorto, MAX_QUE_TRAE, partesDelPremio } from '@/lib/sorteo/premio';
import { TarjetaSorteoVista, montoCorto } from '@/components/sorteo/TarjetaSorteo';
import ProductPicker from '@/app/admin/(dashboard)/studio/_components/ProductPicker';
import { adminCard, adminError, adminHint, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { boletosPorMonto } from '@/lib/sorteo/escala';
import {
  diaMes, diasEntre, esDia, fechaCorta, numero, PASO_DE, problemaDe, type Formulario, type SorteoPanel,
} from './tipos';

interface Efecto { boletosAntes: number; boletosDespues: number; pierden: number; ganan: number }

/** El último paso, "Revisar y publicar" (el sexto: C-297 partió "Cómo se gana" en dos) */
const REVISAR = 5;

const PASOS: { titulo: string; icono: IconType; queHacer: string }[] = [
  { titulo: 'El premio', icono: IconoRegalo, queHacer: 'Qué se lleva el ganador y cómo se ve.' },
  { titulo: 'Lo que trae', icono: IconoPaquete, queHacer: 'Lo que viene con el premio, el sello y el nombre de la bandera.' },
  // C-297 (Andrés, 18/11): comprar vale más; las reseñas, un camino más. De 2 a 4 campos por paso (PLAN.md §1.9)
  { titulo: 'Comprando', icono: IconoBolsa, queHacer: 'Cuántos boletos da una compra, y más si es grande.' },
  { titulo: 'Reseñas y amigos', icono: IconoClientes, queHacer: 'Los otros caminos: contar cómo le fue e invitar.' },
  { titulo: 'Fechas', icono: IconoCalendario, queHacer: 'Desde cuándo cuenta, la última compra y el resultado.' },
  { titulo: 'Revisar y publicar', icono: IconoVer, queHacer: 'Mira cómo queda antes de guardarlo.' },
];

/** Lo que se compara al cambiar un sorteo que ya existe, en palabras */
const CAMPOS: { k: keyof Formulario; nombre: string; ver: (f: Formulario) => string }[] = [
  { k: 'titulo', nombre: 'Título', ver: (f) => f.titulo.trim() },
  { k: 'premio', nombre: 'Premio', ver: (f) => f.premio.trim() },
  { k: 'imagen', nombre: 'Foto', ver: (f) => (f.imagen ? 'con foto' : 'sin foto') },
  { k: 'incluye', nombre: 'Lo que trae', ver: (f) => (f.incluye.length ? f.incluye.map((c) => c.texto.trim()).join(' · ') : 'nada') },
  { k: 'lema', nombre: 'Sello', ver: (f) => f.lema.trim() || 'sin sello' },
  { k: 'nombreCorto', nombre: 'Nombre en el inicio', ver: (f) => f.nombreCorto.trim() || 'sin nombre corto' },
  { k: 'costoPremioUSD', nombre: 'Costo del premio', ver: (f) => montoCorto(numero(f.costoPremioUSD) ?? 0) },
  { k: 'compraMinimaUSD', nombre: 'Compra mínima', ver: (f) => montoCorto(numero(f.compraMinimaUSD) ?? 0) },
  { k: 'boletosPorCompra', nombre: 'Boletos de la compra mínima', ver: (f) => `${numero(f.boletosPorCompra) ?? 0}` },
  { k: 'escalaUSD', nombre: 'Tramo de la escala', ver: (f) => ((numero(f.escalaUSD) ?? 0) > 0 ? `cada ${montoCorto(numero(f.escalaUSD) ?? 0)}` : 'sin escala') },
  { k: 'boletosPorEscala', nombre: 'Boletos por tramo', ver: (f) => ((numero(f.escalaUSD) ?? 0) > 0 ? `${numero(f.boletosPorEscala) ?? 0}` : 'sin escala') },
  { k: 'boletosPorResena', nombre: 'Por reseña', ver: (f) => ((numero(f.boletosPorResena) ?? 0) > 0 ? `${numero(f.boletosPorResena)} boletos` : 'no dan') },
  { k: 'topeInvitar', nombre: 'Tope por invitar', ver: (f) => ((numero(f.topeInvitar) ?? 0) > 0 ? `${numero(f.topeInvitar)} boletos` : 'sin invitar') },
  { k: 'desde', nombre: 'Empieza', ver: (f) => fechaCorta(f.desde) },
  { k: 'hasta', nombre: 'Última compra', ver: (f) => fechaCorta(f.hasta) },
  { k: 'resultadoEl', nombre: 'Resultado', ver: (f) => fechaCorta(f.resultadoEl) },
];
const CUENTAN_BOLETOS: (keyof Formulario)[] = ['desde', 'hasta', 'compraMinimaUSD', 'topeInvitar', 'boletosPorCompra', 'escalaUSD', 'boletosPorEscala', 'boletosPorResena'];

// "Lo que trae" es una lista: se compara entera
const valor = (f: Formulario, k: keyof Formulario) => (k === 'incluye' ? JSON.stringify(f.incluye.map((c) => [c.texto.trim(), c.detalle.trim()])) : String(f[k]).trim());
const mismo = (a: Formulario, b: Formulario, k: keyof Formulario) => valor(a, k) === valor(b, k);

export default function AsistenteSorteo({ modo, inicial, actual, pasoInicial = 0, onCancelar, onListo }: {
  modo: 'nuevo' | 'editar';
  inicial: Formulario;
  /** El sorteo que se está cambiando (en "editar") */
  actual: SorteoPanel | null;
  pasoInicial?: number;
  /** Sin esto (el primer sorteo) no hay a dónde volver */
  onCancelar?: () => void;
  onListo: () => Promise<void>;
}) {
  const [form, setForm] = useState<Formulario>(inicial);
  const [paso, setPaso] = useState(pasoInicial);
  // Hasta dónde llegó: lo de antes está hecho. Al cambiar uno que ya existe, todo está hecho desde el principio
  const [alcanzado, setAlcanzado] = useState(modo === 'editar' ? REVISAR : pasoInicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [publicar, setPublicar] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [elegir, setElegir] = useState(false);
  const [efecto, setEfecto] = useState<Efecto | null>(null);
  const [calculando, setCalculando] = useState(false);
  const topeAntes = useRef(numero(inicial.topeInvitar) || 3);
  // C-297: lo que tenían la escala y las reseñas al apagarlas, para volver a eso al encenderlas
  const escalaAntes = useRef({ monto: numero(inicial.escalaUSD) || 50, boletos: numero(inicial.boletosPorEscala) || 5 });
  const resenaAntes = useRef(numero(inicial.boletosPorResena) || 1);
  const archivo = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => { const r = { ...e }; delete r[k]; return r; });
  };

  const problemas = [0, 1, 2, 3, 4].map((i) => problemaDe(i, form));
  const listoHasta = (i: number) => problemas.slice(0, i).every((p) => p === null);
  const cambios = modo === 'editar' ? CAMPOS.filter((c) => !mismo(form, inicial, c.k)) : [];
  const cambianBoletos = cambios.some((c) => CUENTAN_BOLETOS.includes(c.k));

  const minimo = numero(form.compraMinimaUSD) ?? 0;
  const tope = numero(form.topeInvitar) ?? 0;
  const costo = numero(form.costoPremioUSD) ?? 0;
  const invitar = tope > 0;
  // C-297: la escala y las reseñas
  const porCompra = numero(form.boletosPorCompra) ?? 0;
  const escala = numero(form.escalaUSD) ?? 0;
  const porEscala = numero(form.boletosPorEscala) ?? 0;
  const porResena = numero(form.boletosPorResena) ?? 0;
  const conEscala = escala > 0;
  const resenas = porResena > 0;
  const regla = { minimoUSD: minimo, porCompra, escalaUSD: escala, porEscala };

  const pasos: Paso[] = PASOS.map((p, i) => ({
    titulo: p.titulo,
    icono: p.icono,
    hecho: i < REVISAR && i < alcanzado + (modo === 'editar' ? 1 : 0) && problemas[i] === null,
    disponible: listoHasta(i),
    resumen: i === 0 ? (form.premio.trim() ? `${form.premio.trim()} · ${montoCorto(costo)}` : 'Qué se lleva el ganador')
      : i === 1 ? (form.incluye.length ? `${form.incluye.length} ${form.incluye.length === 1 ? 'cosa' : 'cosas'}${form.nombreCorto.trim() ? ` · ${form.nombreCorto.trim()}` : ''}` : 'Opcional')
      : i === 2 ? `${montoCorto(minimo)} → ${porCompra}${conEscala ? ` · cada ${montoCorto(escala)} → ${porEscala}` : ''}`
        : i === 3 ? `${resenas ? `Reseña → ${porResena}` : 'Sin reseñas'} · ${invitar ? '2 amigos' : 'sin invitar'}`
          : i === 4 ? (esDia(form.hasta) ? `Última compra el ${diaMes(form.hasta)}` : 'Cuándo y hasta cuándo')
          : modo === 'editar' ? `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}` : 'Vista previa',
  }));

  const cuerpo = () => ({
    titulo: form.titulo.trim(), premio: form.premio.trim(), imagen: form.imagen.trim(),
    incluye: form.incluye.map((c) => ({ texto: c.texto.trim(), detalle: c.detalle.trim() })).filter((c) => c.texto),
    lema: form.lema.trim(), nombreCorto: form.nombreCorto.trim(),
    costoPremioUSD: numero(form.costoPremioUSD), compraMinimaUSD: numero(form.compraMinimaUSD), topeInvitar: numero(form.topeInvitar),
    boletosPorCompra: numero(form.boletosPorCompra), escalaUSD: conEscala ? escala : 0, boletosPorEscala: conEscala ? porEscala : 0, boletosPorResena: porResena,
    desde: form.desde, hasta: form.hasta, resultadoEl: form.resultadoEl,
    activo: modo === 'nuevo' ? publicar : form.activo,
    nuevo: modo === 'nuevo',
  });

  // Al llegar a "Revisar" con un cambio que toca los boletos: cuántos boletos y a cuántos clientes, sin guardar
  const calcularEfecto = async () => {
    setEfecto(null);
    if (modo !== 'editar' || !actual || actual.sorteadoAt || !cambianBoletos) return;
    setCalculando(true);
    try {
      const r = await fetch('/api/admin/sorteo/vista-previa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo()) });
      const d = r.ok ? ((await r.json()) as { efecto: Efecto | null }) : null;
      setEfecto(d?.efecto ?? null);
    } catch {
      setEfecto(null);
    } finally {
      setCalculando(false);
    }
  };

  const ir = (i: number) => {
    setPaso(i);
    setAlcanzado((a) => Math.max(a, i));
    setElegir(false);
    if (i === REVISAR) void calcularEfecto();
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await fetch('/api/admin/sorteo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo()) });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        const campos = (d?.fields ?? {}) as Record<string, string>;
        setErrores(campos);
        const primero = Object.keys(campos).map((k) => PASO_DE[k]).filter((n) => n !== undefined).sort()[0];
        if (primero !== undefined) setPaso(primero);
        toast.error(d?.error || 'No se pudo guardar');
        return;
      }
      toast.success(modo === 'editar' ? 'Cambio guardado' : publicar ? 'Sorteo publicado' : 'Sorteo guardado sin publicar');
      await onListo();
    } finally {
      setGuardando(false);
    }
  };

  const subirFoto = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('La foto pesa más de 5 MB'); return; }
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'sorteo');
      const r = await fetch('/api/upload/settings', { method: 'POST', body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || typeof d.url !== 'string') { toast.error(d.error || 'No se pudo subir la foto'); return; }
      set('imagen', d.url);
    } catch {
      toast.error('Sin conexión. Intenta de nuevo.');
    } finally {
      setSubiendo(false);
      if (archivo.current) archivo.current.value = '';
    }
  };

  const fechaResultado = esDia(form.resultadoEl) ? new Date(`${form.resultadoEl}T00:00:00-04:00`) : new Date();
  const dias = esDia(form.desde) && esDia(form.hasta) ? diasEntre(form.desde, form.hasta) + 1 : null;
  const alResultado = esDia(form.hasta) && esDia(form.resultadoEl) ? diasEntre(form.hasta, form.resultadoEl) : null;
  const problema = paso < REVISAR ? problemas[paso] : null;
  const sinCambios = modo === 'editar' && cambios.length === 0;

  // El ejemplo de "Comprando" (C-297): una compra chica, una grande y una que no llega; y el de "Reseñas y amigos"
  const compraChica = Math.max(minimo, Math.round(minimo * 2.4));
  const compraGrande = conEscala ? Math.round(escala * 2.4) : null;
  const compraQueNo = minimo > 1 ? Math.max(1, Math.floor(minimo * 0.8)) : null;
  const totalCompras = boletosPorMonto(compraChica, regla) + (compraGrande ? boletosPorMonto(compraGrande, regla) : 0);
  const porAmigos = Math.min(2, tope);
  const totalOtros = (resenas ? porResena : 0) + (invitar ? porAmigos : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
          <IconoRegalo className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-ink">{modo === 'editar' ? `Cambiar: ${inicial.titulo}` : 'Nuevo sorteo'}</h2>
      </div>

      <Pasos pasos={pasos} actual={paso} onIr={ir} etiqueta="Pasos del sorteo" />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <section className={adminCard} aria-labelledby="sorteo-paso-titulo">
          <div className="mb-5 flex items-center gap-3">
            <span className="iconos-marca flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              {(() => { const Icono = PASOS[paso].icono; return <Icono className="h-5 w-5" aria-hidden="true" />; })()}
            </span>
            <div className="min-w-0">
              <h3 id="sorteo-paso-titulo" className="text-base font-semibold text-ink">{PASOS[paso].titulo}</h3>
              <p className="text-sm text-muted">{PASOS[paso].queHacer}</p>
            </div>
          </div>

          <div className="max-w-3xl">
            {paso === 0 && (
              <div className="space-y-5">
                <Campo etiqueta="Título" id="sorteo-titulo" error={errores.titulo}>
                  <input id="sorteo-titulo" value={form.titulo} maxLength={60} onChange={(e) => set('titulo', e.target.value)} className={`${adminInput(Boolean(errores.titulo))} sm:max-w-sm`} />
                </Campo>
                <Campo etiqueta="Premio" id="sorteo-premio" error={errores.premio} pista='Tal como es. Lo que va entre paréntesis sale aparte: "PlayStation 4 Sony (Remanufacturada)".'>
                  <input id="sorteo-premio" value={form.premio} maxLength={120} onChange={(e) => set('premio', e.target.value)} className={`${adminInput(Boolean(errores.premio))} sm:max-w-lg`} />
                </Campo>
                <div>
                  <p className={adminLabel}>Foto del premio</p>
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-3 sm:max-w-lg">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
                      {subiendo ? <span className={adminSpinner} aria-label="Subiendo" />
                        : form.imagen ? <Image src={form.imagen} alt="" fill sizes="80px" className="object-contain" unoptimized={!form.imagen.startsWith('/')} />
                          : <IconoImagen className="h-7 w-7 text-subtle" aria-hidden="true" />}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className="text-sm font-semibold text-ink">{form.imagen ? 'Así sale en /sorteo' : 'Todavía sin foto'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <input ref={archivo} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirFoto(f); }} />
                        <button type="button" onClick={() => archivo.current?.click()} disabled={subiendo} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
                          <IconoSubir className="h-4 w-4" aria-hidden="true" /> {form.imagen ? 'Subir otra' : 'Subir foto'}
                        </button>
                        <button type="button" onClick={() => setElegir((v) => !v)} aria-expanded={elegir} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
                          <IconoBuscar className="h-4 w-4" aria-hidden="true" /> Elegir de la tienda
                        </button>
                        {form.imagen && (
                          <button type="button" onClick={() => set('imagen', '')} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-deal hover:underline">
                            <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {elegir && (
                    <div className="mt-2 sm:max-w-lg">
                      <ProductPicker
                        onCancel={() => setElegir(false)}
                        onPick={(p) => {
                          if (!p.image) { toast.error('Ese producto no tiene foto'); return; }
                          set('imagen', p.image);
                          setElegir(false);
                        }}
                      />
                    </div>
                  )}
                  {errores.imagen && <p className={adminError} role="alert">{errores.imagen}</p>}
                </div>
                <Campo etiqueta="Costo del premio" id="sorteo-costo" error={errores.costoPremioUSD} ayuda="Con el envío del premio. Sirve para saber cuánto del premio ya pagaron las ventas del sorteo. Los clientes no lo ven." pista="Solo lo ve el equipo.">
                  <CampoUnidad id="sorteo-costo" unidad="$" inputMode="decimal" value={form.costoPremioUSD} onChange={(e) => set('costoPremioUSD', e.target.value)} invalido={Boolean(errores.costoPremioUSD)} />
                </Campo>
              </div>
            )}

            {paso === 1 && (
              <PasoQueTrae form={form} set={set} errores={errores} />
            )}

            {paso === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="iconos-marca flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><IconoBolsa className="h-4 w-4" aria-hidden="true" /></span>
                    <p className="flex-1 text-sm font-semibold text-ink">Cada compra</p>
                    <span className="text-xs text-muted">Siempre</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                    <label htmlFor="sorteo-minimo">Una compra de</label>
                    <CampoUnidad id="sorteo-minimo" unidad="$" inputMode="decimal" value={form.compraMinimaUSD} onChange={(e) => set('compraMinimaUSD', e.target.value)} invalido={Boolean(errores.compraMinimaUSD)} className="w-28" />
                    <label htmlFor="sorteo-por-compra">o más da</label>
                    <CampoUnidad id="sorteo-por-compra" unidad="boletos" inputMode="numeric" value={form.boletosPorCompra} onChange={(e) => set('boletosPorCompra', e.target.value)} invalido={Boolean(errores.boletosPorCompra)} className="w-36" />
                    <Ayuda>Cuenta lo de los productos, sin el envío. Una compra que llega en dos paquetes cuenta como una, y una cancelada o devuelta no cuenta.</Ayuda>
                  </div>
                  {(errores.compraMinimaUSD || errores.boletosPorCompra) && <p className={adminError} role="alert">{errores.compraMinimaUSD ?? errores.boletosPorCompra}</p>}
                </div>
                <div className="rounded-2xl border border-line p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="iconos-marca flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><IconoCupon className="h-4 w-4" aria-hidden="true" /></span>
                    <p id="sorteo-escala" className="flex-1 text-sm font-semibold text-ink">Más boletos si compra más</p>
                    <Interruptor
                      etiqueta="sorteo-escala"
                      encendido={conEscala}
                      onCambiar={(v) => {
                        if (!v) escalaAntes.current = { monto: escala || escalaAntes.current.monto, boletos: porEscala || escalaAntes.current.boletos };
                        set('escalaUSD', v ? String(escalaAntes.current.monto) : '0');
                        set('boletosPorEscala', v ? String(escalaAntes.current.boletos) : '0');
                      }}
                    />
                  </div>
                  {conEscala ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      <label htmlFor="sorteo-escala-monto">Cada</label>
                      <CampoUnidad id="sorteo-escala-monto" unidad="$" inputMode="decimal" value={form.escalaUSD} onChange={(e) => set('escalaUSD', e.target.value)} invalido={Boolean(errores.escalaUSD)} className="w-28" />
                      <label htmlFor="sorteo-escala-boletos">de la compra da</label>
                      <CampoUnidad id="sorteo-escala-boletos" unidad="boletos" inputMode="numeric" value={form.boletosPorEscala} onChange={(e) => set('boletosPorEscala', e.target.value)} invalido={Boolean(errores.boletosPorEscala)} className="w-36" />
                      <Ayuda>Vale lo que dé más: la compra mínima o la escala. Con $5 = 2 y cada $50 = 5, una de $40 da 2, una de $50 da 5 y una de $120 da 10.</Ayuda>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Apagado: toda compra de la mínima o más da lo mismo.</p>
                  )}
                  {errores.escalaUSD && <p className={adminError} role="alert">{errores.escalaUSD}</p>}
                </div>
                {minimo >= 1 && porCompra >= 1 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-50 p-3">
                    <span className="mr-1 text-xs font-semibold text-ink-soft">Así le queda a un cliente:</span>
                    <Ficha icono={IconoBolsa}>Compra de {montoCorto(compraChica)} → {boletosPorMonto(compraChica, regla)}</Ficha>
                    {compraGrande !== null && <Ficha icono={IconoBolsa}>Compra de {montoCorto(compraGrande)} → {boletosPorMonto(compraGrande, regla)}</Ficha>}
                    {compraQueNo !== null && <Ficha icono={IconoBolsa}>Compra de {montoCorto(compraQueNo)} → 0</Ficha>}
                    <span className="font-bold text-ink-soft" aria-hidden="true">=</span>
                    <span key={`${minimo}-${porCompra}-${escala}-${porEscala}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1 text-sm font-bold text-white transition-transform duration-300 starting:scale-75 motion-reduce:transition-none">
                      <IconoCupon className="h-4 w-4" aria-hidden="true" /> {totalCompras} {totalCompras === 1 ? 'boleto' : 'boletos'}
                    </span>
                  </div>
                )}
                <p className={adminHint}>El producto estrella de cada semana se elige en el tablero del sorteo: suma sus boletos a los de la compra.</p>
              </div>
            )}

            {paso === 3 && (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-line p-4">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className="iconos-marca flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><IconoChat className="h-4 w-4" aria-hidden="true" /></span>
                      <p id="sorteo-resenas" className="flex-1 text-sm font-semibold text-ink">Con sus reseñas</p>
                      <Interruptor
                        etiqueta="sorteo-resenas"
                        encendido={resenas}
                        onCambiar={(v) => {
                          if (!v) resenaAntes.current = porResena || resenaAntes.current;
                          set('boletosPorResena', v ? String(resenaAntes.current || 1) : '0');
                        }}
                      />
                    </div>
                    {resenas ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                        <label htmlFor="sorteo-resena">Cada reseña aprobada da</label>
                        <CampoUnidad id="sorteo-resena" unidad="boletos" inputMode="numeric" value={form.boletosPorResena} onChange={(e) => set('boletosPorResena', e.target.value)} invalido={Boolean(errores.boletosPorResena)} className="w-36" />
                        <Ayuda>Solo de lo que compró y le llegó (la tienda no deja reseñar otra cosa), escrita durante el sorteo. Cuenta al aprobarla, con cualquier calificación: no se rechaza una por ser mala.</Ayuda>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">Apagado: las reseñas no dan boletos.</p>
                    )}
                    {errores.boletosPorResena && <p className={adminError} role="alert">{errores.boletosPorResena}</p>}
                  </div>
                  <div className="rounded-2xl border border-line p-4">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className="iconos-marca flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><IconoClientes className="h-4 w-4" aria-hidden="true" /></span>
                      <p id="sorteo-invitar" className="flex-1 text-sm font-semibold text-ink">Invitando amigos</p>
                      <Interruptor
                        etiqueta="sorteo-invitar"
                        encendido={invitar}
                        onCambiar={(v) => {
                          if (!v) topeAntes.current = tope || topeAntes.current;
                          set('topeInvitar', v ? String(topeAntes.current || 3) : '0');
                        }}
                      />
                    </div>
                    {invitar ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
                        <label htmlFor="sorteo-tope">1 boleto por cada 2 amigos, hasta</label>
                        <CampoUnidad id="sorteo-tope" unidad="boletos" inputMode="numeric" value={form.topeInvitar} onChange={(e) => set('topeInvitar', e.target.value)} invalido={Boolean(errores.topeInvitar)} className="w-36" />
                        <Ayuda>Un amigo cuenta si se registra con el enlace del cliente, verifica su correo y su teléfono no se repite en el sorteo. Es la forma de participar sin comprar.</Ayuda>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">Apagado: no hay forma de participar sin comprar.</p>
                    )}
                    {errores.topeInvitar && <p className={adminError} role="alert">{errores.topeInvitar}</p>}
                  </div>
                </div>
                {totalOtros > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-50 p-3">
                    <span className="mr-1 text-xs font-semibold text-ink-soft">Así le queda a un cliente:</span>
                    {resenas && <Ficha icono={IconoChat}>1 reseña → {porResena}</Ficha>}
                    {invitar && <Ficha icono={IconoClientes}>4 amigos → {porAmigos}</Ficha>}
                    <span className="font-bold text-ink-soft" aria-hidden="true">=</span>
                    <span key={`${porResena}-${tope}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-1 text-sm font-bold text-white transition-transform duration-300 starting:scale-75 motion-reduce:transition-none">
                      <IconoCupon className="h-4 w-4" aria-hidden="true" /> {totalOtros} {totalOtros === 1 ? 'boleto' : 'boletos'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {paso === 4 && (
              <div className="space-y-3">
                <ol className="grid gap-4 lg:grid-cols-[auto_minmax(4rem,1fr)_auto_minmax(4rem,1fr)_auto] lg:items-start lg:gap-0">
                  <Hito icono={IconoInterruptorEncendido} etiqueta="Empieza" id="sorteo-desde" valor={form.desde} onCambiar={(v) => set('desde', v)} error={errores.desde} />
                  <Tramo texto={dias !== null && dias > 0 ? `${dias} ${dias === 1 ? 'día' : 'días'} para participar` : ''} fuerte />
                  <Hito icono={IconoBolsa} etiqueta="Última compra que cuenta" id="sorteo-hasta" valor={form.hasta} onCambiar={(v) => set('hasta', v)} error={errores.hasta} />
                  <Tramo texto={alResultado === null || alResultado < 0 ? '' : alResultado === 0 ? 'el mismo día' : `${alResultado} ${alResultado === 1 ? 'día' : 'días'}`} />
                  <Hito icono={IconoPremio} etiqueta="Resultado" id="sorteo-resultado" valor={form.resultadoEl} onCambiar={(v) => set('resultadoEl', v)} error={errores.resultadoEl} fuerte />
                </ol>
                <p className="flex items-center gap-1 text-xs text-muted">
                  Días de Venezuela, completos.
                  <Ayuda>Una compra pagada el día de la última compra, hasta las 11:59 p. m., cuenta. El resultado se puede dar el mismo día del cierre o después.</Ayuda>
                </p>
              </div>
            )}

            {paso === REVISAR && (
              <div className="space-y-4">
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  <Resumen icono={IconoRegalo} titulo={form.premio.trim()} detalle={`${form.titulo.trim()} · ${form.imagen ? 'con foto' : 'sin foto'} · costo ${formatUSD(costo)} (solo el equipo)`} onCambiar={() => ir(0)} />
                  <Resumen icono={IconoPaquete} titulo={form.incluye.length ? form.incluye.map((c) => c.texto.trim()).join(' · ') : 'Sin "Lo que trae"'} detalle={[form.lema.trim() && `Sello: ${form.lema.trim()}`, form.nombreCorto.trim() && `En el inicio: ${form.nombreCorto.trim()}`].filter(Boolean).join(' · ')} onCambiar={() => ir(1)} />
                  <Resumen icono={IconoBolsa} titulo={`Compra de ${montoCorto(minimo)} o más: ${porCompra} ${porCompra === 1 ? 'boleto' : 'boletos'}`} detalle={conEscala ? `Y cada ${montoCorto(escala)} de la compra, ${porEscala}` : 'Sin escala'} onCambiar={() => ir(2)} />
                  <Resumen icono={IconoClientes} titulo={`${resenas ? `Cada reseña: ${porResena}` : 'Sin reseñas'} · ${invitar ? '2 amigos = 1 boleto' : 'sin invitar'}`} detalle={invitar ? `Hasta ${tope} ${tope === 1 ? 'boleto' : 'boletos'} por invitar` : 'Sin boletos por invitar'} onCambiar={() => ir(3)} />
                  <Resumen icono={IconoCalendario} titulo={`Del ${diaMes(form.desde)} al ${diaMes(form.hasta)} · resultado el ${diaMes(form.resultadoEl)}`} detalle={dias ? `${dias} ${dias === 1 ? 'día' : 'días'} para participar` : ''} onCambiar={() => ir(4)} />
                </ul>

                {modo === 'nuevo' ? (
                  <fieldset className="grid gap-2">
                    <legend className="sr-only">Cuándo se ve en la tienda</legend>
                    <Opcion marcada={publicar} onElegir={() => setPublicar(true)} icono={IconoWeb} titulo="Publicarlo ya" detalle="Sale en /sorteo y en Mi panel desde hoy." />
                    <Opcion marcada={!publicar} onElegir={() => setPublicar(false)} icono={IconoOcultar} titulo="Guardarlo sin publicar" detalle="Lo enciendes después desde su tablero." />
                  </fieldset>
                ) : (
                  <div className="rounded-2xl border border-line p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink"><IconoEditar className="h-4 w-4 text-brand-500" aria-hidden="true" /> Lo que cambia</p>
                    {cambios.length === 0 ? (
                      <p className="mt-2 text-sm text-muted">Todavía no cambiaste nada.</p>
                    ) : (
                      <ul className="mt-2 grid gap-1.5">
                        {cambios.map((c) => {
                          const antes = c.k === 'imagen' && inicial.imagen && form.imagen ? 'la de antes' : c.ver(inicial);
                          const despues = c.k === 'imagen' && inicial.imagen && form.imagen ? 'otra foto' : c.ver(form);
                          return (
                            <li key={c.k} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm">
                              <span className="text-ink-soft">{c.nombre}</span>
                              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <s className="truncate text-muted">{antes}</s>
                                <IconoFlechaDerecha className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                                <span className="truncate rounded-md bg-brand-50 px-1.5 font-semibold text-brand-700">{despues}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {cambianBoletos && (
                      <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-ink" aria-live="polite">
                        {calculando ? (
                          <p className="flex items-center gap-2 text-ink-soft"><span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" /> Contando los boletos con los datos nuevos…</p>
                        ) : efecto ? (
                          efecto.boletosAntes === efecto.boletosDespues && efecto.pierden === 0 && efecto.ganan === 0 ? (
                            <p className="flex items-center gap-2"><IconoCheck className="h-4 w-4 text-success-strong" aria-hidden="true" /> Nadie gana ni pierde boletos con este cambio.</p>
                          ) : (
                            <ul className="grid gap-1">
                              <li className="flex items-center gap-2"><IconoCupon className="h-4 w-4 text-brand-500" aria-hidden="true" /> Boletos: {efecto.boletosAntes} → <strong>{efecto.boletosDespues}</strong></li>
                              {efecto.pierden > 0 && <li className="flex items-center gap-2"><IconoClientes className="h-4 w-4 text-brand-500" aria-hidden="true" /> {efecto.pierden} {efecto.pierden === 1 ? 'cliente pierde boletos' : 'clientes pierden boletos'}</li>}
                              {efecto.ganan > 0 && <li className="flex items-center gap-2"><IconoClientes className="h-4 w-4 text-brand-500" aria-hidden="true" /> {efecto.ganan} {efecto.ganan === 1 ? 'cliente gana boletos' : 'clientes ganan boletos'}</li>}
                            </ul>
                          )
                        ) : (
                          <p className="text-ink-soft">No se pudo contar el efecto. Puedes guardar igual.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* El pie (§1.6): a la izquierda volver; a la derecha adónde lleva, o por qué todavía no */}
          <div className="-mx-5 -mb-5 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-line bg-surface px-5 py-3">
            {paso > 0 ? (
              <button type="button" onClick={() => setPaso(paso - 1)} className={adminSecondaryButton}><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Atrás</button>
            ) : onCancelar ? (
              <button type="button" onClick={onCancelar} className={adminSecondaryButton}>Cancelar</button>
            ) : <span />}
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
              {problema && <p className="text-xs text-muted" role="status">{problema}</p>}
              {sinCambios && paso === REVISAR && <p className="text-xs text-muted" role="status">No hay cambios que guardar.</p>}
              {paso < REVISAR ? (
                <button type="button" onClick={() => ir(paso + 1)} disabled={Boolean(problema)} className={adminPrimaryButton}>
                  Siguiente: {PASOS[paso + 1].titulo.toLowerCase()} <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={() => void guardar()} disabled={guardando || sinCambios || !listoHasta(REVISAR)} className={adminPrimaryButton}>
                  {guardando ? 'Guardando…' : modo === 'editar'
                    ? <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar el cambio</>
                    : publicar ? <><IconoCheck className="h-4 w-4" aria-hidden="true" /> Publicar el sorteo</>
                      : <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar sin publicar</>}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* La vista previa: lo que verá el cliente, con los datos de ahora. En el teléfono, solo al revisar */}
        <aside className={`${paso === REVISAR ? '' : 'hidden lg:block'} space-y-4 lg:sticky lg:top-44`} aria-label="Vista previa">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <IconoVer className="h-4 w-4 text-brand-500" aria-hidden="true" /> Así se ve en la tienda
            </p>
            <div className="mx-auto w-full max-w-[17rem] rounded-[2rem] border-8 border-ink bg-white p-2.5">
              <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-line-strong" aria-hidden="true" />
              <PremioSorteo titulo={form.titulo.trim()} premio={form.premio.trim()} imagen={form.imagen || null} resultadoEl={fechaResultado} incluye={form.incluye.filter((c) => c.texto.trim())} lema={form.lema} nombreCorto={form.nombreCorto} compacto />
              <div className="mt-2 rounded-xl border border-line p-3">
                <p className="text-xs font-semibold text-ink">Cómo participar</p>
                <ul className="mt-1.5 grid gap-1 text-xs text-ink-soft">
                  <li className="flex items-start gap-1.5"><IconoBolsa className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" /> Compra {montoCorto(minimo)} o más: {porCompra} {porCompra === 1 ? 'boleto' : 'boletos'}</li>
                  {conEscala && <li className="flex items-start gap-1.5"><IconoCupon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" /> Cada {montoCorto(escala)}: {porEscala} boletos</li>}
                  {resenas && <li className="flex items-start gap-1.5"><IconoChat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" /> Cada reseña: {porResena} {porResena === 1 ? 'boleto' : 'boletos'}</li>}
                  {invitar && <li className="flex items-start gap-1.5"><IconoClientes className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" /> 2 amigos: 1 boleto (hasta {tope})</li>}
                </ul>
              </div>
            </div>
          </div>
          {paso === REVISAR && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <IconoVer className="h-4 w-4 text-brand-500" aria-hidden="true" /> En Mi panel del cliente
              </p>
              <TarjetaSorteoVista
                enlace={false}
                sorteo={{ titulo: form.titulo.trim(), premio: form.premio.trim(), resultadoEl: fechaResultado.toISOString(), cerrado: false, sorteado: false, compraMinimaUSD: minimo, topeInvitar: tope }}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Un campo con su etiqueta, la (i) si hace falta, una línea de ayuda o el error */
function Campo({ etiqueta, id, error, pista, ayuda, children }: { etiqueta: string; id: string; error?: string; pista?: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">{etiqueta}</label>
        {ayuda && <Ayuda>{ayuda}</Ayuda>}
      </div>
      {children}
      {error ? <p className={adminError} role="alert">{error}</p> : pista ? <p className={adminHint}>{pista}</p> : null}
    </div>
  );
}

function Interruptor({ etiqueta, encendido, onCambiar }: { etiqueta: string; encendido: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-labelledby={etiqueta}
      onClick={() => onCambiar(!encendido)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${encendido ? 'bg-success-strong' : 'bg-subtle'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${encendido ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Ficha({ icono: Icono, children }: { icono: IconType; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs text-ink transition-opacity duration-300 starting:opacity-0 motion-reduce:transition-none">
      <Icono className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {children}
    </span>
  );
}

function Hito({ icono: Icono, etiqueta, id, valor, onCambiar, error, fuerte = false }: {
  icono: IconType; etiqueta: string; id: string; valor: string; onCambiar: (v: string) => void; error?: string; fuerte?: boolean;
}) {
  return (
    <li className="flex flex-col items-start gap-1.5 lg:items-center lg:text-center">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${fuerte ? 'bg-brand-700 text-white' : 'iconos-marca bg-brand-50 text-brand-700'}`}>
        <Icono className="h-5 w-5" aria-hidden="true" />
      </span>
      <label htmlFor={id} className="text-sm font-semibold text-ink">{etiqueta}</label>
      <input id={id} type="date" value={valor} onChange={(e) => onCambiar(e.target.value)} className={`${adminInput(Boolean(error))} w-44`} />
      {error && <p className={adminError} role="alert">{error}</p>}
    </li>
  );
}

/** El tramo entre dos fechas: una línea y cuántos días son */
function Tramo({ texto, fuerte = false }: { texto: string; fuerte?: boolean }) {
  return (
    <li aria-hidden={texto ? undefined : true} className="flex items-center gap-2 pl-4 lg:relative lg:block lg:h-10 lg:pl-0">
      <span className={`block h-6 w-0.5 rounded-full lg:absolute lg:inset-x-2 lg:top-5 lg:h-0.5 lg:w-auto ${fuerte ? 'bg-brand-500' : 'bg-brand-200'}`} />
      <span className="text-xs text-muted lg:absolute lg:inset-x-0 lg:top-7 lg:text-center">{texto}</span>
    </li>
  );
}

function Resumen({ icono: Icono, titulo, detalle, onCambiar }: { icono: IconType; titulo: string; detalle: string; onCambiar: () => void }) {
  return (
    <li className="flex items-center gap-3 bg-white px-4 py-3">
      <span className="iconos-marca flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icono className="h-4 w-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{titulo}</span>
        {detalle && <span className="block text-xs text-muted">{detalle}</span>}
      </span>
      <button type="button" onClick={onCambiar} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline">
        <IconoEditar className="h-4 w-4" aria-hidden="true" /> Cambiar
      </button>
    </li>
  );
}

function Opcion({ marcada, onElegir, icono: Icono, titulo, detalle }: { marcada: boolean; onElegir: () => void; icono: IconType; titulo: string; detalle: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${marcada ? 'border-2 border-brand-500 bg-brand-50' : 'border border-line bg-white hover:border-brand-300'}`}>
      <input type="radio" name="sorteo-publicar" checked={marcada} onChange={onElegir} className="h-4 w-4 accent-brand-500" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{titulo}</span>
        <span className="block text-xs text-muted">{detalle}</span>
      </span>
      <Icono className={`h-5 w-5 shrink-0 ${marcada ? 'text-brand-500' : 'text-muted'}`} aria-hidden="true" />
    </label>
  );
}

/** C-253: el paso "Lo que trae": hasta 4 cosas con su ícono (sale solo, por lo que dice), el sello y el nombre corto */
function PasoQueTrae({ form, set, errores }: {
  form: Formulario;
  set: <K extends keyof Formulario>(k: K, v: Formulario[K]) => void;
  errores: Record<string, string>;
}) {
  const cosas = form.incluye;
  const cambiar = (i: number, campo: 'texto' | 'detalle', v: string) => set('incluye', cosas.map((c, j) => (j === i ? { ...c, [campo]: v } : c)));
  const { nombre } = partesDelPremio(form.premio);
  const corto = form.nombreCorto.trim() || null;
  const logo = logoDelNombreCorto(corto);
  return (
    <div className="space-y-6">
      <fieldset className="min-w-0">
        <legend className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-ink">
          Lo que trae
          <Ayuda>Sale en /sorteo, en una franja debajo del premio, cada cosa con su ícono. El ícono sale solo por lo que escribes (GB, control, cable…). El detalle es una línea chica debajo, si hace falta.</Ayuda>
        </legend>
        {cosas.length > 0 && (
          <ul className="grid gap-2">
            {cosas.map((c, i) => {
              const Icono = iconoDeCosa(c.texto);
              return (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white"><Icono className="h-5 w-5" aria-hidden="true" /></span>
                  <input aria-label={`Cosa ${i + 1}`} value={c.texto} maxLength={60} placeholder="1 control azul eléctrico" onChange={(e) => cambiar(i, 'texto', e.target.value)} className={`${adminInput(false)} min-w-0 flex-1 sm:max-w-xs`} />
                  <input aria-label={`Detalle de la cosa ${i + 1}`} value={c.detalle} maxLength={40} placeholder="Detalle (si quieres)" onChange={(e) => cambiar(i, 'detalle', e.target.value)} className={`${adminInput(false)} min-w-0 flex-1 sm:max-w-56`} />
                  <button type="button" onClick={() => set('incluye', cosas.filter((_, j) => j !== i))} aria-label={`Quitar ${c.texto || `la cosa ${i + 1}`}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-deal">
                    <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {cosas.length < MAX_QUE_TRAE && (
          <button type="button" onClick={() => set('incluye', [...cosas, { texto: '', detalle: '' }])} className={`${adminSecondaryButton} mt-2`}>
            <IconoMas className="h-4 w-4" aria-hidden="true" /> {cosas.length ? 'Agregar otra' : 'Agregar lo que trae'}
          </button>
        )}
        {errores.incluye && <p className={adminError} role="alert">{errores.incluye}</p>}
      </fieldset>

      <Campo etiqueta="Sello" id="sorteo-lema" error={errores.lema} pista="Una frase corta junto al nombre. Ej.: ¡Lista para jugar!">
        <input id="sorteo-lema" value={form.lema} maxLength={30} onChange={(e) => set('lema', e.target.value)} className={`${adminInput(Boolean(errores.lema))} sm:max-w-xs`} />
      </Campo>

      <div className="flex flex-wrap items-start gap-5">
        <Campo
          etiqueta="Nombre en el inicio"
          id="sorteo-corto"
          error={errores.nombreCorto}
          ayuda={`Va en la bandera del inicio, al borde de la pantalla: "¡Gánate una …". Con PS4 o PS5 sale su logo oficial. Vacío, la bandera dice "Sorteo".${nombre ? ` El premio completo (${nombre}) sigue en /sorteo.` : ''}`}
          pista={logo ? 'Sale con el logo oficial.' : 'Corto, hasta 16 letras. Ej.: PS4'}
        >
          <input id="sorteo-corto" value={form.nombreCorto} maxLength={16} onChange={(e) => set('nombreCorto', e.target.value)} className={`${adminInput(Boolean(errores.nombreCorto))} w-40`} />
        </Campo>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Así se ve en el inicio</p>
          <div className="flex w-24 flex-col items-center gap-2.5 rounded-r-2xl bg-brand-700 pb-3.5 pl-2 pr-2.5 pt-2.5 text-center text-white shadow-lg">
            <CuerpoPestana foto={form.imagen && form.imagen.startsWith('/') ? form.imagen : null} corto={corto} />
          </div>
        </div>
      </div>
    </div>
  );
}
