'use client';

// C-249d: crear o cambiar un promotor en su propia página, por pasos (PLAN.md §1.9, la A que eligió el equipo el 15/11):
// quién es, su código (solo al crearlo: después no se cambia, ya puede estar publicado), la comisión y el descuento, y
// "Revisar y publicar", con lo que pasa en el carrito y lo que gana él al lado. Antes eran dos ventanas ("Nuevo promotor" y
// "Editar"); lo que tenían sigue aquí, campo por campo, y suma las notas al cambiarlo (la API ya las aceptaba).
// Hay dinero: la comisión (en Puntos ES, sobre los productos sin IVA ni envío, C-167) y el descuento de su código. Cada paso
// dice qué le falta con las reglas del servidor, y antes de guardar el servidor lo valida sin guardar
// (/api/influencers/vista-previa). Las APIs que guardan no cambian. La edición entre dos personas sigue (C-170).

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Asistente, { Afecta, Campo, ElegirPublicar, FilaResumen, ListaCambios, VistaPrevia, type CambioCampo, type PasoAsistente } from '@/components/admin/Asistente';
import Ayuda from '@/components/admin/Ayuda';
import CampoUnidad from '@/components/admin/CampoUnidad';
import PresenciaEnEditor from '@/components/admin/edicion/PresenciaEnEditor';
import CouponBox from '@/components/cart/CouponBox';
import {
  IconoBillete, IconoBuscar, IconoCerrar, IconoClave, IconoClientes, IconoCopiar, IconoCupon, IconoEnlace, IconoPausa, IconoPorcentaje,
  IconoPuntosEs, IconoVer, IconoVerificado, IconoWeb, type IconType,
} from '@/components/iconos';
import { adminHint, adminInput, adminNotice } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { enviarConVersion } from '@/lib/edicion/guardado';
import { useConflictoDeFormulario } from '@/lib/edicion/useConflictoDeFormulario';
import { ivaIncluido, roundMoney } from '@/lib/pricing';
import { repartirCupon } from '@/lib/promotions-core';

export interface PromotorPanel {
  id: string; code: string; name: string; commissionRate: number; customerDiscountPercent: number; notes: string;
  status: 'ACTIVE' | 'PAUSED'; updatedAt: string; usuario: { nombre: string | null; email: string | null }; conCupon: boolean;
}
export interface Ejemplo { producto: { nombre: string; precioUSD: number } | null; ivaPorcentaje: number }

interface Formulario { name: string; commissionRate: string; customerDiscountPercent: string; notes: string }
interface Usuario { id: string; name: string | null; email: string | null }
interface Afectados { porAcreditar: number; porAcreditarUSD: number; acreditadas: number; acreditadasUSD: number; comprasConCodigo: number }

type Clave = 'quien' | 'codigo' | 'dinero' | 'revisar';
const INFO: Record<Clave, { titulo: string; queHacer: string; icono: IconType }> = {
  quien: { titulo: 'Quién es', queHacer: 'La cuenta de la tienda y el nombre con que sale.', icono: IconoClientes },
  codigo: { titulo: 'Su código', queHacer: 'Lo que sus seguidores escriben en el carrito.', icono: IconoClave },
  dinero: { titulo: 'Comisión y descuento', queHacer: 'Lo que gana él y lo que ahorra el cliente.', icono: IconoPorcentaje },
  revisar: { titulo: 'Revisar y publicar', queHacer: 'Mira cómo queda antes de guardarlo.', icono: IconoVer },
};
const LISTA = '/admin/marketing#promotores';
const ETIQUETAS: Record<keyof Formulario, string> = { name: 'Nombre para mostrar', commissionRate: 'Comisión %', customerDiscountPercent: 'Descuento al cliente %', notes: 'Notas internas' };
// Las mismas reglas de lib/influencer-admin.ts y lib/influencer-cupon.ts
const COMISION_MAXIMA = 50;
const DESCUENTO_MAXIMO = 30;
const MONTO_REVISION_MANUAL = 50;

/** Letras, números, guion y guion bajo, en mayúsculas (limpiarCodigo del servidor) */
const limpiarCodigo = (v: string) => v.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
/** "4,5" → 4.5; null si está vacío o no es un número */
const numero = (v: string) => { if (!v.trim()) return null; const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : null; };
const pct = (v: string) => `${numero(v) ?? '—'} %`.replace('.', ',');

function problemaDinero(f: Formulario): string | null {
  const c = numero(f.commissionRate);
  if (c === null || c < 0 || c > COMISION_MAXIMA) return `La comisión va de 0 a ${COMISION_MAXIMA} %.`;
  const d = numero(f.customerDiscountPercent);
  if (d === null || !Number.isInteger(d) || d < 1 || d > DESCUENTO_MAXIMO) return `El descuento al cliente va de 1 a ${DESCUENTO_MAXIMO} %, sin decimales.`;
  return null;
}

/** Una compra de ejemplo con su código: cuánto ahorra el cliente y cuánto gana el promotor (baseComision y repartirCupon) */
function calcular(ejemplo: Ejemplo, f: Formulario) {
  const precio = ejemplo.producto?.precioUSD ?? 100;
  const d = numero(f.customerDiscountPercent);
  const reparto = d && d >= 1 ? repartirCupon(
    { id: 'promotor', kind: 'COUPON', label: null, code: 'X', percentOff: Math.min(Math.round(d), DESCUENTO_MAXIMO), amountOffUSD: null, scope: 'ALL', productIds: [], categoryIds: [], minSubtotalUSD: null, endsAt: null },
    [{ key: '0', producto: { id: 'muestra', categoryId: '', productType: 'PHYSICAL' }, lineTotalUSD: precio }],
  ) : null;
  const ahorro = reparto?.ok ? reparto.totalUSD : 0;
  const productos = Math.max(0, precio - ahorro);
  const base = ejemplo.ivaPorcentaje > 0 ? ivaIncluido(productos, ejemplo.ivaPorcentaje).baseUSD : roundMoney(productos);
  const comision = roundMoney((base * (numero(f.commissionRate) ?? 0)) / 100);
  return { precio, ahorro, base, comision };
}

const formularioDe = (p: PromotorPanel | null): Formulario => ({
  name: p?.name ?? '', commissionRate: p ? String(p.commissionRate) : '5', customerDiscountPercent: p ? String(p.customerDiscountPercent) : '5', notes: p?.notes ?? '',
});

export default function AsistentePromotor({ promotor, ejemplo }: { promotor: PromotorPanel | null; ejemplo: Ejemplo }) {
  const router = useRouter();
  const editar = Boolean(promotor);
  const claves: Clave[] = editar ? ['quien', 'dinero', 'revisar'] : ['quien', 'codigo', 'dinero', 'revisar'];
  const ultimo = claves.length - 1;
  const [inicial] = useState<Formulario>(() => formularioDe(promotor));
  const [form, setForm] = useState<Formulario>(inicial);
  // C-170: lo que había al abrir (para combinar si otra persona guardó antes) y la versión con que se abrió
  const [formBase, setFormBase] = useState<Formulario>(inicial);
  const [version, setVersion] = useState(promotor?.updatedAt);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [code, setCode] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Usuario[]>([]);
  const [paso, setPaso] = useState(0);
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [revision, setRevision] = useState<{ cargando: boolean; error: string | null; campo: string | null; afecta: Afectados | null }>({ cargando: false, error: null, campo: null, afecta: null });
  const { resolver: resolverConflicto, dialogo: dialogoConflicto } = useConflictoDeFormulario(ETIQUETAS);

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Búsqueda de usuarios con espera (antes se pedía al servidor en cada tecla)
  const buscar = !editar && !usuario && busqueda.trim().length >= 2;
  useEffect(() => {
    if (!buscar) return;
    const control = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/users?search=${encodeURIComponent(busqueda.trim())}&limit=8`, { signal: control.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setResultados(d.users || []); })
        .catch(() => undefined);
    }, 300);
    return () => { clearTimeout(t); control.abort(); };
  }, [busqueda, buscar]);

  // ---------- lo que le falta a cada paso
  const problemaDe = (c: Clave): string | null => {
    if (c === 'quien') {
      if (!editar && !usuario) return 'Elige la cuenta de la tienda del promotor.';
      if (form.name.trim().length < 2) return 'Falta el nombre para mostrar (2 letras o más).';
      return null;
    }
    if (c === 'codigo') return code.length < 3 || code.length > 20 ? 'El código va de 3 a 20 letras, números, _ o -.' : null;
    if (c === 'dinero') return problemaDinero(form);
    return null;
  };

  const cuerpoNuevo = () => ({
    userId: usuario?.id ?? '', code, name: form.name.trim(), notes: form.notes.trim() || null,
    commissionRate: String(numero(form.commissionRate) ?? ''), customerDiscountPercent: String(numero(form.customerDiscountPercent) ?? ''),
  });
  const cuerpoEdicion = (f: Formulario) => ({
    name: f.name.trim(), notes: f.notes.trim() || null,
    commissionRate: String(numero(f.commissionRate) ?? ''), customerDiscountPercent: String(numero(f.customerDiscountPercent) ?? ''),
  });

  // Al llegar a "Revisar": el servidor dice si pasa (el código libre, la cuenta) y, al cambiarlo, cuántas comisiones y compras tiene
  const comprobar = async () => {
    setRevision({ cargando: true, error: null, campo: null, afecta: null });
    try {
      const r = await fetch('/api/influencers/vista-previa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promotor ? { id: promotor.id, ...cuerpoEdicion(form) } : cuerpoNuevo()),
      });
      const d = await r.json().catch(() => null);
      setRevision({ cargando: false, error: r.ok ? null : d?.error || 'No se pudo revisar', campo: d?.campo ?? null, afecta: d?.afecta ?? null });
    } catch {
      setRevision({ cargando: false, error: null, campo: null, afecta: null });
    }
  };

  const irA = (i: number) => {
    setPaso(i);
    if (i === ultimo) void comprobar();
  };
  const pasoDeCampo = (campo: string | null) => {
    const c: Clave = campo === 'code' ? 'codigo' : campo === 'commissionRate' || campo === 'customerDiscountPercent' ? 'dinero' : 'quien';
    return Math.max(0, claves.indexOf(c));
  };

  const volverALaLista = () => { router.push(LISTA); router.refresh(); };

  const crear = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/influencers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpoNuevo()) });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || 'No se pudo crear el promotor');
        setPaso(/código/i.test(String(data?.error)) ? claves.indexOf('codigo') : 0);
        return;
      }
      // La API crea al promotor activo; "Guardarlo en pausa" lo pausa enseguida (pausar no pide versión)
      if (!activo) {
        const p = await fetch(`/api/influencers/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PAUSED' }) }).catch(() => null);
        if (!p?.ok) { toast.error('Se creó activo, pero no se pudo pausar: páusalo desde la lista.'); volverALaLista(); return; }
      }
      toast.success(activo ? `Promotor creado con el código ${data.code}` : `Promotor creado en pausa con el código ${data.code}`);
      volverALaLista();
    } finally {
      setGuardando(false);
    }
  };

  /** Guarda con la versión con que se abrió. Si otra persona guardó antes, se combina lo de cada una y solo se pregunta por lo que las dos tocaron (C-170). */
  const guardarEdicion = async (formulario: Formulario = form, base: string | undefined = version) => {
    if (!promotor) return;
    setGuardando(true);
    try {
      const r = await enviarConVersion(`/api/influencers/${promotor.id}`, 'PATCH', cuerpoEdicion(formulario), base);
      if (r.ok) { toast.success('Promotor actualizado. Las comisiones ya creadas no cambian.'); volverALaLista(); return; }
      if (r.conflicto?.tipo === 'cambiado') {
        const actual = r.conflicto.actual as { name: string; commissionRate: number | string; customerDiscountPercent: number; notes: string | null; updatedAt: string };
        const suyo: Formulario = { name: actual.name, commissionRate: String(actual.commissionRate), customerDiscountPercent: String(actual.customerDiscountPercent), notes: actual.notes ?? '' };
        resolverConflicto({
          base: formBase, mio: formulario, suyo, quien: r.conflicto.por?.nombre ?? 'Otra persona',
          continuar: (final) => { setForm(final); setFormBase(suyo); setVersion(actual.updatedAt); return guardarEdicion(final, actual.updatedAt); },
        });
        return;
      }
      toast.error(r.error);
      if (r.conflicto?.tipo === 'no_existe') volverALaLista();
    } finally {
      setGuardando(false);
    }
  };

  // ---------- la vista previa: el código en el carrito y lo que gana él, con una compra de la tienda
  const c = calcular(ejemplo, form);
  const codigoVisto = (promotor?.code ?? code) || 'SUCODIGO';
  const nombre = form.name.trim() || 'El promotor';
  const enlace = `${typeof window === 'undefined' ? '' : window.location.origin}/registro?ref=${codigoVisto}`;
  const pausado = editar ? promotor?.status === 'PAUSED' : !activo;
  const aplicado = !pausado && c.ahorro > 0;
  const vistaPrevia = (
    <>
      <VistaPrevia rotulo="En el carrito" nota={ejemplo.producto ? `Con 1 × ${ejemplo.producto.nombre}.` : 'Con una compra de $100 en productos.'}>
        <div className="space-y-2 rounded-xl border border-line bg-white p-3 text-sm">
          <div className="flex justify-between gap-2"><span className="text-ink-soft">Subtotal:</span><span className="font-semibold tabular-nums text-ink">{formatUSD(c.precio)}</span></div>
          {aplicado && (
            <div className="flex justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1 font-medium text-success-strong"><IconoCupon className="h-4 w-4 shrink-0" aria-hidden="true" /> Descuento (cupón {codigoVisto}):</span>
              <span className="whitespace-nowrap font-bold tabular-nums text-success-strong">-{formatUSD(c.ahorro)}</span>
            </div>
          )}
          <CouponBox code={codigoVisto} onApply={() => undefined} onRemove={() => undefined}
            status={pausado ? { applied: false, message: 'Este cupón no está activo.' } : aplicado ? { applied: true, message: `Cupón ${codigoVisto} aplicado: ahorras ${formatUSD(c.ahorro)}.` } : null}
            pendingText="Escribe el descuento al cliente." />
        </div>
      </VistaPrevia>
      <VistaPrevia rotulo={`Lo que gana ${nombre}`}>
        <div className="space-y-1.5 rounded-xl border border-line bg-white p-3 text-sm">
          <div className="flex justify-between gap-2"><span className="text-ink-soft">Productos sin IVA:</span><span className="tabular-nums text-ink">{formatUSD(c.base)}</span></div>
          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1 font-semibold text-ink"><IconoPuntosEs className="h-4 w-4 text-brand-500" aria-hidden="true" /> Su comisión ({pct(form.commissionRate)}):</span>
            <span className="font-bold tabular-nums text-ink">{formatUSD(c.comision)}</span>
          </div>
          <p className="text-xs text-muted">{pausado ? 'Cuando esté activo: ' : ''}En Puntos ES, sola 7 días después de la entrega. Nunca en dinero.</p>
          {c.comision > MONTO_REVISION_MANUAL && <p className="text-xs font-semibold text-ink-soft">Pasa de {formatUSD(MONTO_REVISION_MANUAL)}: la revisa el equipo antes de acreditarla.</p>}
        </div>
      </VistaPrevia>
      <VistaPrevia rotulo="Su enlace">
        <p className="break-all rounded-xl border border-line bg-white p-3 font-mono text-xs text-brand-700">{enlace}</p>
      </VistaPrevia>
    </>
  );

  // ---------- antes → después y a cuántos afecta
  const filasCambio: { campo: keyof Formulario; nombre: string; ver: (f: Formulario) => string }[] = [
    { campo: 'name', nombre: 'Nombre', ver: (f) => f.name.trim() },
    { campo: 'notes', nombre: 'Notas', ver: (f) => f.notes.trim() || 'Sin notas' },
    { campo: 'commissionRate', nombre: 'Comisión', ver: (f) => pct(f.commissionRate) },
    { campo: 'customerDiscountPercent', nombre: 'Descuento', ver: (f) => pct(f.customerDiscountPercent) },
  ];
  const igualCampo = (k: keyof Formulario) => (k === 'commissionRate' || k === 'customerDiscountPercent' ? numero(form[k]) === numero(inicial[k]) : form[k].trim() === inicial[k].trim());
  const cambios: CambioCampo[] = editar ? filasCambio.filter((f) => !igualCampo(f.campo)).map((f) => ({ campo: f.campo, nombre: f.nombre, antes: f.ver(inicial), despues: f.ver(form) })) : [];
  const cambia = (k: keyof Formulario) => cambios.some((x) => x.campo === k);

  const filasAfecta = (): { icono: IconType; texto: ReactNode }[] | null => {
    if (editar) {
      const a = revision.afecta;
      if (!a) return null;
      const lista: { icono: IconType; texto: ReactNode }[] = [];
      if (cambia('commissionRate')) {
        lista.push({ icono: IconoBillete, texto: a.porAcreditar > 0
          ? <>Tiene <strong>{a.porAcreditar} {a.porAcreditar === 1 ? 'comisión' : 'comisiones'} por acreditar</strong> ({formatUSD(a.porAcreditarUSD)}): siguen con el {pct(inicial.commissionRate)}. El {pct(form.commissionRate)} vale para las compras nuevas.</>
          : <>El {pct(form.commissionRate)} vale para las compras nuevas{a.acreditadas > 0 ? `: las ${a.acreditadas} ya acreditadas no cambian` : ''}.</> });
      }
      if (cambia('customerDiscountPercent')) {
        lista.push({ icono: IconoCupon, texto: <>Su código descuenta <strong>{pct(form.customerDiscountPercent)}</strong> desde que guardes{a.comprasConCodigo > 0 ? `. Ya se usó en ${a.comprasConCodigo} ${a.comprasConCodigo === 1 ? 'compra' : 'compras'}: esas no cambian` : ''}.</> });
      }
      if (cambia('name')) lista.push({ icono: IconoVerificado, texto: <>Su cupón pasa a llamarse «Código de promotor · {form.name.trim()}» en Ofertas y cupones.</> });
      if (cambia('notes') && lista.length === 0) lista.push({ icono: IconoClientes, texto: 'Las notas solo las ve el equipo.' });
      return lista;
    }
    if (revision.error) return null;
    return [
      { icono: IconoCupon, texto: <>El código <strong>{code}</strong> está libre: queda como cupón del carrito con {pct(form.customerDiscountPercent)} para quien lo escriba{activo ? '' : ', cuando lo actives'}.</> },
      { icono: IconoPuntosEs, texto: <>{nombre} gana {pct(form.commissionRate)} en Puntos ES de cada compra pagada con su código o de quien se registre con su enlace.</> },
    ];
  };

  const pasos: PasoAsistente[] = claves.map((k) => ({
    ...INFO[k],
    problema: k === 'revisar' ? null : problemaDe(k),
    resumen: k === 'quien' ? (form.name.trim() || (usuario ? usuario.email ?? 'Cuenta elegida' : 'Falta la cuenta'))
      : k === 'codigo' ? (code || 'Falta el código')
        : k === 'dinero' ? `Gana ${pct(form.commissionRate)} · descuenta ${pct(form.customerDiscountPercent)}`
          : editar ? `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}` : 'Vista previa',
  }));
  const clave = claves[Math.min(paso, ultimo)];
  const sinCambios = editar && cambios.length === 0;

  return (
    <>
      <Asistente
        titulo={promotor ? `Cambiar: ${promotor.name}` : 'Nuevo promotor'}
        subtitulo={promotor ? `Promotor · ${promotor.code} · ${promotor.status === 'ACTIVE' ? 'Activo' : 'Pausado'}` : 'Paso a paso, con lo que pasa en el carrito y lo que gana.'}
        icono={IconoVerificado}
        volver={{ href: LISTA, texto: 'Promotores' }}
        etiqueta="Pasos del promotor"
        pasos={pasos}
        paso={Math.min(paso, ultimo)}
        onPaso={irA}
        editar={editar}
        arriba={promotor ? (
          <>
            <PresenciaEnEditor recurso={`influencer:${promotor.id}`} etiqueta={promotor.name} nombreRecurso="promotor" />
            {!promotor.conCupon && (
              <p className={adminNotice('warning')}>Un cupón normal ya usa el código {promotor.code}: su código no funciona en el carrito hasta que ese cupón cambie de código.</p>
            )}
          </>
        ) : undefined}
        final={{
          contenido: guardando ? 'Guardando…' : editar ? 'Guardar el cambio' : activo ? 'Crear el promotor' : 'Crear en pausa',
          onClick: () => void (editar ? guardarEdicion() : crear()),
          deshabilitado: guardando || revision.cargando || Boolean(revision.error) || sinCambios,
          motivo: revision.error ? 'Arregla lo que dice arriba para seguir.' : sinCambios ? 'No hay cambios que guardar.' : null,
        }}
        vistaPrevia={vistaPrevia}
      >
        {clave === 'quien' && (
          <div className="space-y-5">
            {promotor ? (
              <Campo etiqueta="Cuenta de la tienda">
                <p className="text-sm text-ink">{promotor.usuario.nombre || 'Sin nombre'} <span className="text-muted">· {promotor.usuario.email}</span></p>
              </Campo>
            ) : (
              <Campo etiqueta="Cuenta de la tienda" id="promotor-usuario" pista={usuario ? undefined : 'Busca por nombre o correo: la cuenta tiene que existir.'}>
                {usuario ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 text-sm text-ink">
                      <IconoClientes className="h-4 w-4 text-brand-500" aria-hidden="true" />
                      <span className="font-semibold">{usuario.name || 'Sin nombre'}</span>
                      <span className="text-muted [overflow-wrap:anywhere]">{usuario.email}</span>
                    </span>
                    <button type="button" onClick={() => { setUsuario(null); setBusqueda(''); setResultados([]); }} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-500 hover:underline">
                      <IconoCerrar className="h-4 w-4" aria-hidden="true" /> Elegir otra
                    </button>
                  </div>
                ) : (
                  <div className="sm:max-w-sm">
                    <div className="relative">
                      <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                      <input id="promotor-usuario" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o correo" className={`${adminInput()} pl-9`} autoComplete="off" />
                    </div>
                    {buscar && resultados.length > 0 && (
                      <ul className="mt-1 overflow-hidden rounded-lg border border-line">
                        {resultados.map((u) => (
                          <li key={u.id}>
                            <button type="button"
                              onClick={() => { setUsuario(u); setForm((f) => ({ ...f, name: f.name || u.name || '' })); setResultados([]); }}
                              className="w-full border-b border-line px-3 py-2 text-left text-sm last:border-0 hover:bg-surface">
                              <span className="block font-medium text-ink">{u.name || 'Sin nombre'}</span>
                              <span className="block text-xs text-muted">{u.email}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Campo>
            )}
            <Campo etiqueta="Nombre para mostrar" id="promotor-nombre" pista="Así sale en su cupón y en la lista.">
              <input id="promotor-nombre" value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} placeholder="GamerPro VE" className={`${adminInput()} sm:max-w-sm`} />
            </Campo>
            <Campo etiqueta="Notas internas (opcional)" id="promotor-notas" pista="Solo las ve el equipo.">
              <textarea id="promotor-notas" rows={2} maxLength={500} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Canal, acuerdo…" className={`${adminInput()} h-auto resize-none py-2.5`} />
            </Campo>
          </div>
        )}

        {clave === 'codigo' && (
          <div className="space-y-5">
            <Campo etiqueta="Código" id="promotor-codigo" pista="Letras, números, _ o -, de 3 a 20. Después no se cambia."
              ayuda="Es también el cupón que el cliente escribe en el carrito: le da el descuento y la compra cuenta para el promotor, aunque el cliente ya tuviera cuenta.">
              <input id="promotor-codigo" value={code} maxLength={20} onChange={(e) => setCode(limpiarCodigo(e.target.value))} placeholder="GAMER10" className={`${adminInput()} font-mono uppercase sm:max-w-xs`} autoComplete="off" />
            </Campo>
            {code && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink"><IconoEnlace className="h-4 w-4 text-brand-500" aria-hidden="true" /> Su enlace</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-all font-mono text-xs text-brand-700">{enlace}</span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(enlace).then(() => toast.success('Enlace copiado'), () => toast.error('No se pudo copiar'))}
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-500 hover:underline">
                    <IconoCopiar className="h-4 w-4" aria-hidden="true" /> Copiar
                  </button>
                </div>
                <p className={adminHint}>Quien se registre desde aquí cuenta para él si no usa otro código.</p>
              </div>
            )}
          </div>
        )}

        {clave === 'dinero' && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-x-8 gap-y-5">
              <Campo etiqueta="Comisión" id="promotor-comision" pista={`Lo que gana, en Puntos ES. De 0 a ${COMISION_MAXIMA} %.`}
                ayuda="Sobre los productos, sin IVA ni envío. Se acredita sola 7 días después de la entrega; las que parecen una autocompra o pasan de $50 las revisa el equipo. Si la orden se cancela, se anula sola.">
                <CampoUnidad id="promotor-comision" unidad="%" inputMode="decimal" value={form.commissionRate} invalido={Boolean(problemaDinero(form)?.startsWith('La comisión'))}
                  onChange={(e) => set('commissionRate', e.target.value.replace(/[^0-9.,]/g, ''))} />
              </Campo>
              <Campo etiqueta="Descuento al cliente" id="promotor-descuento" pista={`Lo que descuenta su código. De 1 a ${DESCUENTO_MAXIMO} %.`}>
                <CampoUnidad id="promotor-descuento" unidad="%" inputMode="numeric" value={form.customerDiscountPercent} invalido={Boolean(problemaDinero(form)?.startsWith('El descuento'))}
                  onChange={(e) => set('customerDiscountPercent', e.target.value.replace(/\D/g, ''))} />
              </Campo>
            </div>
            {!problemaDinero(form) && (
              <p className="flex items-start gap-2 text-sm text-ink-soft">
                <IconoBillete className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                <span>Compra de {formatUSD(c.precio)} con su código → el cliente ahorra <strong className="text-ink">{formatUSD(c.ahorro)}</strong> y él gana <strong className="text-ink">{formatUSD(c.comision)}</strong> en Puntos ES.</span>
                <Ayuda etiqueta="Cómo se calcula">La comisión es sobre lo que se cobra por los productos (después del descuento), sin el IVA que llevan dentro{ejemplo.ivaPorcentaje > 0 ? ` (${ejemplo.ivaPorcentaje} %)` : ''} ni el envío.</Ayuda>
              </p>
            )}
            {editar && <p className={adminHint}>Los cambios valen para las compras nuevas: las comisiones ya creadas no cambian.</p>}
          </div>
        )}

        {clave === 'revisar' && (
          <div className="space-y-4">
            {revision.error && (
              <div className={`${adminNotice('danger')} flex flex-wrap items-center justify-between gap-2`} role="alert">
                <span>{revision.error}</span>
                <button type="button" onClick={() => setPaso(pasoDeCampo(revision.campo))} className="inline-flex min-h-11 items-center font-semibold underline">Cambiarlo</button>
              </div>
            )}
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              <FilaResumen icono={IconoClientes} titulo={form.name.trim()} detalle={[promotor?.usuario.email ?? usuario?.email ?? '', form.notes.trim() ? 'con notas' : ''].filter(Boolean).join(' · ')} onCambiar={() => irA(0)} />
              {!editar && <FilaResumen icono={IconoClave} titulo={`Código ${code}`} detalle="También es su cupón del carrito" onCambiar={() => irA(claves.indexOf('codigo'))} />}
              <FilaResumen icono={IconoPorcentaje} titulo={`Gana ${pct(form.commissionRate)} · su código descuenta ${pct(form.customerDiscountPercent)}`} detalle="En Puntos ES, sobre los productos sin IVA ni envío" onCambiar={() => irA(claves.indexOf('dinero'))} />
            </ul>

            {editar ? (
              <ListaCambios cambios={cambios}>
                {cambios.length > 0 && <Afecta cargando={revision.cargando} filas={filasAfecta()} />}
              </ListaCambios>
            ) : (
              <>
                <ElegirPublicar name="promotor-activo" publicar={activo} onCambiar={setActivo}
                  ya={{ titulo: 'Activarlo ya', detalle: 'Su código descuenta y cuenta desde ahora.', icono: IconoWeb }}
                  sin={{ titulo: 'Guardarlo en pausa', detalle: 'Lo activas después desde la lista.', icono: IconoPausa }} />
                {!revision.error && <Afecta cargando={revision.cargando} filas={filasAfecta()} />}
              </>
            )}
            {editar && promotor?.status === 'PAUSED' && <p className="text-xs text-muted">Está pausado: su código no descuenta ni cuenta hasta que lo actives desde la lista.</p>}
          </div>
        )}
      </Asistente>
      {dialogoConflicto}
    </>
  );
}
