'use client';

// C-249b: crear o cambiar una oferta o un cupón en su propia página, por pasos (PLAN.md §1.9, la A que eligió el equipo el
// 15/11): qué es, el descuento, el código (solo el cupón), las fechas y "Revisar y publicar", con lo que verá el cliente al
// lado: la tarjeta del producto con la oferta, o el cupón en la ficha y al pagar, con las mismas piezas de la tienda.
// Al cambiar una que ya existe, el último paso dice qué cambia (antes → después) y a cuántos afecta, contado por el servidor
// sin guardar. Lo que tenía el formulario de antes sigue aquí, campo por campo, y la edición entre dos personas (C-170):
// la versión con que se abrió, la combinación de cambios y quién más la tiene abierta. La API y sus reglas no cambian.

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Asistente, {
  Afecta, Campo, ElegirPublicar, FilaResumen, ListaCambios, VistaPrevia, type CambioCampo, type PasoAsistente,
} from '@/components/admin/Asistente';
import CampoUnidad from '@/components/admin/CampoUnidad';
import Opcion from '@/components/admin/Opcion';
import PresenciaEnEditor from '@/components/admin/edicion/PresenciaEnEditor';
import { valorEnTexto } from '@/components/admin/edicion/DialogoConflicto';
import CouponBox from '@/components/cart/CouponBox';
import CouponOffers from '@/components/product/CouponOffers';
import ProductCard from '@/components/ui/ProductCard';
import {
  IconoBolsa, IconoBuscar, IconoCalendario, IconoCerrar, IconoCheck, IconoClave, IconoClientes, IconoCupon, IconoGuardar,
  IconoOcultar, IconoOferta, IconoPaquete, IconoPausa, IconoPorcentaje, IconoTienda, IconoVer, IconoWeb, type IconType,
} from '@/components/iconos';
import { adminError, adminHint, adminInput, adminNotice } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { iguales } from '@/lib/edicion/combinar';
import { enviarConVersion } from '@/lib/edicion/guardado';
import { useConflictoDeFormulario } from '@/lib/edicion/useConflictoDeFormulario';
import { mejorOferta, normalizarCodigo, PORCENTAJE_MAXIMO, repartirCupon, type PromotionRule } from '@/lib/promotions-core';
import {
  aFormulario, campoEnTexto, ESTADO, ETIQUETAS, fechaCorta, fichaDe, vacio, type Categoria, type Ficha, type Formulario, type ProductoRef,
  type Promocion,
} from './promocion';

type Clave = 'que' | 'descuento' | 'codigo' | 'fechas' | 'revisar';

const INFO: Record<Clave, { titulo: string; queHacer: string; icono: IconType }> = {
  que: { titulo: 'Qué es', queHacer: 'Oferta o cupón, y cómo se llama.', icono: IconoOferta },
  descuento: { titulo: 'El descuento', queHacer: 'Cuánto baja y a qué productos.', icono: IconoPorcentaje },
  codigo: { titulo: 'El código', queHacer: 'Cómo lo escribe el cliente y quién lo ve.', icono: IconoClave },
  fechas: { titulo: 'Fechas y tope', queHacer: 'Desde cuándo, hasta cuándo y cuántas compras.', icono: IconoCalendario },
  revisar: { titulo: 'Revisar y publicar', queHacer: 'Mira cómo queda antes de guardarlo.', icono: IconoVer },
};
const clavesDe = (kind: Formulario['kind']): Clave[] =>
  kind === 'COUPON' ? ['que', 'descuento', 'codigo', 'fechas', 'revisar'] : ['que', 'descuento', 'fechas', 'revisar'];

/** El paso de cada campo, para llevar ahí al que tiene un error del servidor */
const PASO_DE: Record<string, Clave> = {
  kind: 'que', name: 'que', label: 'que',
  valueType: 'descuento', value: 'descuento', scope: 'descuento', categoryIds: 'descuento', productIds: 'descuento',
  code: 'codigo', isPublic: 'codigo', minSubtotalUSD: 'codigo', maxUsesPerUser: 'codigo',
  startsAt: 'fechas', endsAt: 'fechas', maxUses: 'fechas',
};

/** Un número escrito en el panel ("10", "10,5"); null si está vacío o no es un número */
function numero(valor: string): number | null {
  if (!valor.trim()) return null;
  const n = Number(valor.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Lo que le falta a un paso para seguir (las mismas reglas que valida el servidor); null si está completo */
function problemaDe(clave: Clave, f: Formulario, nuevo: boolean): string | null {
  if (clave === 'que') return f.name.trim().length < 3 ? 'Falta el nombre interno (3 letras o más).' : null;
  if (clave === 'descuento') {
    const n = numero(f.value);
    if (n === null || n <= 0) return 'Falta cuánto baja.';
    if (f.valueType === 'PERCENT' && (!Number.isInteger(n) || n > PORCENTAJE_MAXIMO)) return `El porcentaje va de 1 a ${PORCENTAJE_MAXIMO}, sin decimales.`;
    if (f.valueType === 'AMOUNT' && n > 100000) return 'Ese monto es demasiado alto.';
    if (f.scope === 'CATEGORY' && f.categoryIds.length === 0) return 'Elige al menos una categoría.';
    if (f.scope === 'PRODUCT' && f.products.length === 0) return 'Elige al menos un producto.';
    return null;
  }
  if (clave === 'codigo') {
    if (!normalizarCodigo(f.code)) return 'El código va de 3 a 30 letras, números o guiones.';
    const minimo = numero(f.minSubtotalUSD);
    if (f.minSubtotalUSD.trim() && (minimo === null || minimo <= 0 || minimo > 100000)) return 'La compra mínima no es un monto válido.';
    const porCliente = numero(f.maxUsesPerUser);
    if (f.maxUsesPerUser.trim() && (porCliente === null || !Number.isInteger(porCliente) || porCliente < 1 || porCliente > 100)) return 'Los usos por cliente van de 1 a 100.';
    return null;
  }
  if (clave === 'fechas') {
    if (f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt)) return 'Tiene que terminar después de empezar.';
    if (nuevo && !f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date()) return 'Esa fecha de fin ya pasó.';
    const tope = numero(f.maxUses);
    if (f.maxUses.trim() && (tope === null || !Number.isInteger(tope) || tope < 1 || tope > 1_000_000)) return 'El tope de compras va de 1 a 1.000.000.';
    return null;
  }
  return null;
}

/** El valor del descuento en una palabra: "15%" o "$10 c/u" */
function valorCorto(f: Formulario): string {
  const n = numero(f.value);
  if (n === null || n <= 0) return 'sin valor';
  return f.valueType === 'PERCENT' ? `${n}%` : `${formatUSD(n)}${f.kind === 'AUTOMATIC' ? ' c/u' : ''}`;
}

function alcanceEnPalabras(f: Formulario, categorias: Categoria[]): string {
  if (f.scope === 'ALL') return 'Toda la tienda (productos físicos)';
  if (f.scope === 'CATEGORY') return f.categoryIds.map((id) => categorias.find((c) => c.id === id)?.name ?? 'Categoría').join(', ') || 'Ninguna categoría';
  return f.products.length === 1 ? f.products[0].name : `${f.products.length} productos`;
}

/** Lo que se compara al cambiar una que ya existe, en palabras (§1.9: antes → después) */
function filasDeCambio(categorias: Categoria[]): { campo: string; nombre: string; claves: (keyof Formulario)[]; ver: (f: Formulario) => string; soloCupon?: boolean }[] {
  return [
    { campo: 'name', nombre: 'Nombre interno', claves: ['name'], ver: (f) => f.name.trim() },
    { campo: 'label', nombre: 'Texto para el cliente', claves: ['label'], ver: (f) => f.label.trim() || 'Sin texto' },
    { campo: 'value', nombre: 'Descuento', claves: ['value', 'valueType'], ver: valorCorto },
    { campo: 'scope', nombre: 'Aplica a', claves: ['scope', 'categoryIds', 'products'], ver: (f) => alcanceEnPalabras(f, categorias) },
    { campo: 'code', nombre: 'Código', claves: ['code'], ver: (f) => f.code || '—', soloCupon: true },
    { campo: 'isPublic', nombre: 'Quién lo ve', claves: ['isPublic'], ver: (f) => (f.isPublic ? 'En la ficha del producto' : 'Solo con el código'), soloCupon: true },
    { campo: 'minSubtotalUSD', nombre: 'Compra mínima', claves: ['minSubtotalUSD'], ver: (f) => { const n = numero(f.minSubtotalUSD); return n ? formatUSD(n) : 'Sin mínimo'; }, soloCupon: true },
    { campo: 'maxUsesPerUser', nombre: 'Usos por cliente', claves: ['maxUsesPerUser'], ver: (f) => f.maxUsesPerUser || 'Sin límite', soloCupon: true },
    { campo: 'startsAt', nombre: 'Empieza', claves: ['startsAt'], ver: (f) => (f.startsAt ? fechaCorta(new Date(f.startsAt).toISOString()) : 'Ahora mismo') },
    { campo: 'endsAt', nombre: 'Termina', claves: ['endsAt'], ver: (f) => (f.endsAt ? fechaCorta(new Date(f.endsAt).toISOString()) : 'Sin fecha') },
    { campo: 'maxUses', nombre: 'Tope de compras', claves: ['maxUses'], ver: (f) => (f.maxUses ? `${f.maxUses} compras` : 'Sin tope') },
  ];
}

interface Efecto { productos: number; antes: { productos: number; compras: number; clientes: number; ahorroUSD: number; usos: number } | null }

/** La muestra de la vista previa: el producto elegido, uno de la categoría elegida o uno de la tienda */
function useMuestra(f: Formulario, general: Ficha | null, iniciales: Ficha[]) {
  const [cache, setCache] = useState<Record<string, Ficha | null>>(() => ({
    todo: general,
    ...Object.fromEntries(iniciales.map((p) => [`p:${p.id}`, p])),
  }));
  const producto = f.scope === 'PRODUCT' ? f.products[0]?.id : undefined;
  const categoria = f.scope === 'CATEGORY' ? f.categoryIds[0] : undefined;
  const clave = producto ? `p:${producto}` : categoria ? `c:${categoria}` : 'todo';
  const falta = !(clave in cache);

  useEffect(() => {
    if (!falta || clave === 'todo') return;
    let vigente = true;
    const url = producto ? `/api/products/${encodeURIComponent(producto)}` : `/api/products?category=${encodeURIComponent(categoria ?? '')}&status=published&limit=12`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, unknown> | null) => {
        if (!vigente) return;
        const lista = producto ? [d] : ((d?.products as Record<string, unknown>[] | undefined) ?? []);
        const fichas = lista.map((p) => fichaDe(p)).filter((p): p is Ficha => p !== null);
        setCache((c) => ({ ...c, [clave]: fichas.find((p) => !p.mainImage?.includes('no-image')) ?? fichas[0] ?? null }));
      })
      .catch(() => { if (vigente) setCache((c) => ({ ...c, [clave]: null })); });
    return () => { vigente = false; };
  }, [clave, falta, producto, categoria]);

  const guardar = (p: Ficha) => setCache((c) => ({ ...c, [`p:${p.id}`]: p }));
  return { muestra: cache[clave] ?? null, cargando: falta && clave !== 'todo', guardar };
}

export default function AsistentePromocion({ modo, tipo = 'AUTOMATIC', promocion, productosIniciales, fichasIniciales, muestraGeneral, categorias }: {
  modo: 'nuevo' | 'editar';
  tipo?: Formulario['kind'];
  /** La que se cambia (en "editar") */
  promocion: Promocion | null;
  productosIniciales: ProductoRef[];
  fichasIniciales: Ficha[];
  muestraGeneral: Ficha | null;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const editando = modo === 'editar' ? promocion : null;
  const [productos] = useState(() => new Map(productosIniciales.map((p) => [p.id, p])));
  const [inicial] = useState<Formulario>(() => (editando ? aFormulario(editando, productos) : vacio(tipo)));
  const [form, setForm] = useState<Formulario>(inicial);
  // C-170: el formulario como se abrió (para combinar si otra persona guardó antes) y la versión con que se abrió
  const [formBase, setFormBase] = useState<Formulario>(inicial);
  const [version, setVersion] = useState(editando?.updatedAt);
  const [paso, setPaso] = useState(0);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [publicar, setPublicar] = useState(true);
  const [efecto, setEfecto] = useState<Efecto | null>(null);
  const [contando, setContando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Ficha[]>([]);
  const { muestra, cargando: cargandoMuestra, guardar: guardarFicha } = useMuestra(form, muestraGeneral, fichasIniciales);
  const { resolver: resolverConflicto, dialogo: dialogoConflicto } = useConflictoDeFormulario(
    ETIQUETAS, (campo, valor) => campoEnTexto(campo, valor, categorias, valorEnTexto),
  );

  const claves = clavesDe(form.kind);
  const ultimo = claves.length - 1;
  const cupon = form.kind === 'COUPON';

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => {
      const r = { ...e };
      delete r[k];
      if (k === 'products') delete r.productIds;
      return r;
    });
  };

  // Búsqueda de productos (con pausa para no pedir en cada tecla); solo físicos: los digitales nunca llevan descuento
  useEffect(() => {
    const q = busqueda.trim();
    if (form.scope !== 'PRODUCT' || q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setResultados(((data?.products ?? []) as Record<string, unknown>[]).map((p) => fichaDe(p)).filter((p): p is Ficha => p !== null)))
        .catch(() => { });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [busqueda, form.scope]);

  const cuerpoDe = (f: Formulario) => ({
    kind: f.kind, name: f.name, label: f.label || null, code: f.kind === 'COUPON' ? f.code : null,
    isPublic: f.isPublic, valueType: f.valueType, value: f.value, scope: f.scope,
    categoryIds: f.categoryIds, productIds: f.products.map((p) => p.id),
    minSubtotalUSD: f.minSubtotalUSD || null,
    startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
    endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
    maxUses: f.maxUses || null, maxUsesPerUser: f.maxUsesPerUser || null,
    isActive: editando ? editando.isActive : publicar,
  });

  const filas = filasDeCambio(categorias).filter((c) => cupon || !c.soloCupon);
  const cambios: CambioCampo[] = editando
    ? filas.filter((c) => c.claves.some((k) => !iguales(form[k], inicial[k]))).map((c) => ({ campo: c.campo, nombre: c.nombre, antes: c.ver(inicial), despues: c.ver(form) }))
    : [];

  // Al llegar a "Revisar": cuántos productos entran y, si ya existe, a cuántas compras y clientes toca. No guarda nada
  const contarEfecto = async () => {
    setEfecto(null);
    setContando(true);
    try {
      const r = await fetch('/api/admin/promotions/vista-previa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cuerpoDe(form), ...(editando ? { id: editando.id } : {}) }),
      });
      setEfecto(r.ok ? ((await r.json()) as Efecto) : null);
    } catch {
      setEfecto(null);
    } finally {
      setContando(false);
    }
  };

  const irA = (i: number) => {
    setPaso(i);
    if (i === ultimo) void contarEfecto();
  };

  const volverALaLista = () => { router.push('/admin/discount-requests'); router.refresh(); };

  /** Crear, o editar con la versión con que se abrió (C-170): si otra persona guardó antes se combina y solo se pregunta por lo que las dos tocaron */
  const guardar = async (formulario: Formulario = form, base: string | undefined = version) => {
    setGuardando(true);
    setErrores({});
    const conError = (campos: Record<string, string>, mensaje: string) => {
      setErrores(campos);
      const destino = Object.keys(campos).map((k) => claves.indexOf(PASO_DE[k])).filter((n) => n >= 0).sort((a, b) => a - b)[0];
      if (destino !== undefined) setPaso(destino);
      toast.error(mensaje);
    };
    try {
      if (!editando) {
        const res = await fetch('/api/admin/promotions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpoDe(formulario)) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { conError(data.fields ?? {}, data.error || 'No se pudo guardar'); return; }
        toast.success(publicar ? (cupon ? 'Cupón publicado' : 'Oferta publicada') : (cupon ? 'Cupón guardado en pausa' : 'Oferta guardada en pausa'));
        volverALaLista();
        return;
      }
      const r = await enviarConVersion(`/api/admin/promotions/${editando.id}`, 'PATCH', cuerpoDe(formulario), base);
      if (r.ok) { toast.success('Cambios guardados'); volverALaLista(); return; }
      if (r.conflicto?.tipo === 'cambiado') {
        const actual = r.conflicto.actual as Promocion;
        const suyo = aFormulario(actual, productos);
        resolverConflicto({
          base: formBase, mio: formulario, suyo, quien: r.conflicto.por?.nombre ?? 'Otra persona',
          continuar: (final) => { setForm(final); setFormBase(suyo); setVersion(actual.updatedAt); return guardar(final, actual.updatedAt); },
        });
        return;
      }
      conError((r.cuerpo?.fields as Record<string, string> | undefined) ?? {}, r.error);
      if (r.conflicto?.tipo === 'no_existe') volverALaLista();
    } finally {
      setGuardando(false);
    }
  };

  // ---------- la vista previa: lo que verá el cliente, con las piezas de la tienda
  const valor = numero(form.value) ?? 0;
  const codigo = normalizarCodigo(form.code) ?? 'TUCODIGO';
  const regla: PromotionRule = {
    id: 'vista-previa', kind: form.kind, label: form.label.trim() || null, code: cupon ? codigo : null,
    percentOff: form.valueType === 'PERCENT' && valor > 0 ? Math.round(valor) : null,
    amountOffUSD: form.valueType === 'AMOUNT' && valor > 0 ? valor : null,
    scope: form.scope, productIds: form.products.map((p) => p.id), categoryIds: form.categoryIds,
    minSubtotalUSD: cupon ? numero(form.minSubtotalUSD) : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
  };
  const vista = () => {
    if (cargandoMuestra) return <p className="flex items-center gap-2 text-sm text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" /> Buscando un producto para mostrar…</p>;
    if (!muestra) return <p className={adminNotice('neutral')}>No hay un producto publicado en ese alcance para mostrar cómo queda.</p>;
    const producto = { id: muestra.id, categoryId: muestra.categoryId, productType: 'PHYSICAL' as const };
    if (!cupon) {
      const o = valor > 0 ? mejorOferta([regla], producto, muestra.priceUSD) : null;
      const tarjeta = o
        ? { ...muestra, priceUSD: o.priceUSD, compareAtPriceUSD: Math.max(muestra.priceUSD, muestra.compareAtPriceUSD ?? 0), oferta: { label: o.label, percent: o.percent, endsAt: o.endsAt } }
        : muestra;
      return (
        <VistaPrevia rotulo="Así se ve en la tienda" nota={o ? 'En el catálogo, el buscador y la ficha. Si un producto tiene varios descuentos, gana el mayor.' : 'Todavía sin descuento: escribe cuánto baja.'}>
          <div className="mx-auto w-full max-w-[13.5rem]"><ProductCard product={tarjeta} /></div>
        </VistaPrevia>
      );
    }
    // El cupón: en la ficha (si es público) y al pagar, con una compra que llega a la mínima
    const minimo = regla.minSubtotalUSD ?? 0;
    const cantidad = minimo > muestra.priceUSD ? Math.min(99, Math.ceil(minimo / muestra.priceUSD)) : 1;
    const linea = Math.round(muestra.priceUSD * cantidad * 100) / 100;
    const reparto = valor > 0 ? repartirCupon(regla, [{ key: '0', producto, lineTotalUSD: linea }]) : null;
    const ahorro = reparto?.ok ? reparto.totalUSD : 0;
    const estado = !reparto ? null : reparto.ok
      ? { applied: true, message: `Cupón ${codigo} aplicado: ahorras ${formatUSD(ahorro)}.` }
      : { applied: false, message: reparto.motivo === 'MINIMO' ? `Te faltan ${formatUSD(reparto.faltaUSD ?? 0)} en productos que aplican para usar este cupón.` : 'Este cupón no aplica a los productos de tu carrito (los digitales y los usados no llevan cupones).' };
    return (
      <>
        {form.isPublic ? (
          <VistaPrevia rotulo="En la ficha del producto">
            <CouponOffers coupons={[{ code: codigo, label: regla.label, percentOff: regla.percentOff, amountOffUSD: regla.amountOffUSD, minSubtotalUSD: regla.minSubtotalUSD, endsAt: regla.endsAt }]} />
          </VistaPrevia>
        ) : (
          <p className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs text-ink-soft">
            <IconoOcultar className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /> No sale en la ficha: solo lo usa quien tiene el código.
          </p>
        )}
        <VistaPrevia rotulo="Al pagar" nota={`Con ${cantidad} × ${muestra.name}.`}>
          <div className="space-y-2 rounded-xl border border-line bg-white p-3 text-sm">
            <div className="flex justify-between gap-2"><span className="text-ink-soft">Subtotal:</span><span className="font-semibold tabular-nums text-ink">{formatUSD(linea)}</span></div>
            {ahorro > 0 && (
              <div className="flex justify-between gap-2">
                <span className="flex items-center gap-1 font-medium text-success-strong"><IconoCupon className="h-4 w-4" aria-hidden="true" /> Descuento (cupón {codigo}):</span>
                <span className="font-bold tabular-nums text-success-strong">-{formatUSD(ahorro)}</span>
              </div>
            )}
            <CouponBox code={codigo} onApply={() => undefined} onRemove={() => undefined} status={estado} pendingText="Escribe cuánto baja." />
          </div>
        </VistaPrevia>
      </>
    );
  };

  // ---------- los pasos
  const nuevo = !editando;
  const pasos: PasoAsistente[] = claves.map((c) => ({
    ...INFO[c],
    icono: c === 'que' ? (cupon ? IconoCupon : IconoOferta) : INFO[c].icono,
    problema: c === 'revisar' ? null : problemaDe(c, form, nuevo),
    resumen: c === 'que' ? (form.name.trim() ? `${cupon ? 'Cupón' : 'Oferta'} · ${form.name.trim()}` : cupon ? 'Cupón' : 'Oferta')
      : c === 'descuento' ? (numero(form.value) ? `${valorCorto(form)} · ${alcanceEnPalabras(form, categorias)}` : 'Cuánto y a qué')
        : c === 'codigo' ? (normalizarCodigo(form.code) ?? 'Falta el código')
          : c === 'fechas' ? (form.endsAt ? `Hasta el ${fechaCorta(new Date(form.endsAt).toISOString())}` : 'Sin fecha de fin')
            : editando ? `${cambios.length} ${cambios.length === 1 ? 'cambio' : 'cambios'}` : 'Vista previa',
  }));
  const clave = claves[Math.min(paso, ultimo)];

  const filasEfecto = (): { icono: IconType; texto: ReactNode }[] | null => {
    if (!efecto) return null;
    const lista: { icono: IconType; texto: ReactNode }[] = [];
    const n = efecto.productos;
    const productosTxt = (k: number) => `${k} ${k === 1 ? 'producto' : 'productos'}`;
    if (efecto.antes && efecto.antes.productos !== n) lista.push({ icono: IconoPaquete, texto: <>Aplica a {productosTxt(efecto.antes.productos)} → <strong>{productosTxt(n)}</strong> de la tienda</> });
    else lista.push({ icono: IconoPaquete, texto: <>Aplica a <strong>{productosTxt(n)}</strong> de la tienda{cupon ? ' (sin los usados)' : ''}</> });
    if (editando?.status === 'ACTIVA' && !cupon && cambios.length > 0) lista.push({ icono: IconoTienda, texto: 'Está en la tienda: el precio de esos productos cambia al guardar.' });
    if (efecto.antes && efecto.antes.compras > 0) {
      const { compras, clientes, ahorroUSD } = efecto.antes;
      lista.push({ icono: IconoClientes, texto: <>Ya la usaron <strong>{compras} {compras === 1 ? 'compra' : 'compras'}</strong> de {clientes} {clientes === 1 ? 'cliente' : 'clientes'} ({formatUSD(ahorroUSD)} de ahorro): esas compras no cambian; el cambio vale para las próximas.</> });
    }
    const tope = numero(form.maxUses);
    if (editando && tope !== null && editando.usesCount >= tope) lista.push({ icono: IconoPausa, texto: `Con un tope de ${tope} compras queda agotada: ya lleva ${editando.usesCount}.` });
    return lista;
  };

  const sinCambios = Boolean(editando) && cambios.length === 0;
  const dePromotor = Boolean(editando?.deUnPromotor);
  const usado = Boolean(editando && editando.usesCount > 0);
  const titulo = editando ? `Cambiar: ${editando.name}` : cupon ? 'Nuevo cupón' : 'Nueva oferta';

  return (
    <>
      <Asistente
        titulo={titulo}
        subtitulo={editando ? `${cupon ? 'Cupón' : 'Oferta'} · ${ESTADO[editando.status].label}` : 'Paso a paso, con lo que verá el cliente.'}
        icono={cupon ? IconoCupon : IconoOferta}
        volver={{ href: '/admin/discount-requests', texto: 'Ofertas y cupones' }}
        etiqueta={cupon ? 'Pasos del cupón' : 'Pasos de la oferta'}
        pasos={pasos}
        paso={Math.min(paso, ultimo)}
        onPaso={irA}
        editar={Boolean(editando)}
        arriba={editando ? (
          <>
            <PresenciaEnEditor recurso={`promotion:${editando.id}`} etiqueta={editando.name} nombreRecurso={cupon ? 'cupón' : 'oferta'} femenino={!cupon} />
            {dePromotor && (
              <div className={`${adminNotice('warning')} flex items-center gap-3`}>
                <IconoClientes aria-hidden="true" />
                <p>Este cupón es el código de un promotor: se cambia o se pausa en Marketing → Promotores.</p>
              </div>
            )}
          </>
        ) : undefined}
        final={{
          contenido: guardando ? 'Guardando…' : editando
            ? <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar el cambio</>
            : publicar ? <><IconoCheck className="h-4 w-4" aria-hidden="true" /> {cupon ? 'Publicar el cupón' : 'Publicar la oferta'}</>
              : <><IconoGuardar className="h-4 w-4" aria-hidden="true" /> Guardar en pausa</>,
          onClick: () => void guardar(),
          deshabilitado: guardando || sinCambios || dePromotor,
          motivo: dePromotor ? 'Se cambia en Marketing → Promotores.' : sinCambios ? 'No hay cambios que guardar.' : null,
        }}
        vistaPrevia={vista()}
      >
        {clave === 'que' && (
          <div className="space-y-5">
            {nuevo && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo">
                {(['AUTOMATIC', 'COUPON'] as const).map((k) => (
                  <Opcion key={k} role="radio" aria-checked={form.kind === k} elegida={form.kind === k}
                    onClick={() => { if (form.kind !== k) setForm({ ...form, kind: k, code: '', isPublic: true, minSubtotalUSD: '', maxUsesPerUser: k === 'COUPON' ? '1' : '' }); }}
                    icono={k === 'AUTOMATIC' ? IconoOferta : IconoCupon}
                    titulo={k === 'AUTOMATIC' ? 'Oferta' : 'Cupón'}
                    detalle={k === 'AUTOMATIC' ? 'Precio rebajado para todos, sin código' : 'Descuento al pagar con un código'} />
                ))}
              </div>
            )}
            <Campo etiqueta="Nombre interno" id="promo-nombre" error={errores.name} pista="Solo lo ve el equipo.">
              <input id="promo-nombre" className={`${adminInput(Boolean(errores.name))} sm:max-w-sm`} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Semana del audio" maxLength={80} />
            </Campo>
            <Campo etiqueta="Texto para el cliente (opcional)" id="promo-label" error={errores.label} pista="Se ve junto al precio.">
              <input id="promo-label" className={`${adminInput(Boolean(errores.label))} sm:max-w-xs`} value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Ej.: Semana Tech" maxLength={40} />
            </Campo>
          </div>
        )}

        {clave === 'descuento' && (
          <div className="space-y-5">
            <Campo etiqueta="Cuánto baja" id="promo-valor" error={errores.value}
              ayuda="Si un producto tiene varios descuentos (una oferta, un cupón, un descuento pedido), gana el mayor: no se suman. Los digitales nunca llevan descuento."
              pista={form.valueType === 'PERCENT' ? `De 1 a ${PORCENTAJE_MAXIMO}%.` : cupon ? 'Se descuenta de la compra, repartido entre los productos que aplican.' : 'Lo que baja cada unidad.'}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-2" role="radiogroup" aria-label="Tipo de descuento">
                  {(['PERCENT', 'AMOUNT'] as const).map((t) => (
                    <Opcion key={t} tamano="chica" role="radio" aria-checked={form.valueType === t} elegida={form.valueType === t}
                      onClick={() => set('valueType', t)} titulo={t === 'PERCENT' ? 'Porcentaje' : 'Monto fijo'} />
                  ))}
                </div>
                <CampoUnidad id="promo-valor" unidad={form.valueType === 'PERCENT' ? '%' : '$'} inputMode="decimal" value={form.value} invalido={Boolean(errores.value)}
                  onChange={(e) => set('value', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={form.valueType === 'PERCENT' ? '15' : '10'} />
              </div>
            </Campo>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink">Aplica a</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Alcance">
                {([['ALL', 'Toda la tienda'], ['CATEGORY', 'Categorías'], ['PRODUCT', 'Productos']] as const).map(([v, l]) => (
                  <Opcion key={v} tamano="chica" role="radio" aria-checked={form.scope === v} elegida={form.scope === v} onClick={() => set('scope', v)} titulo={l} />
                ))}
              </div>
              {form.scope === 'ALL' && <p className={adminHint}>Todos los productos físicos de la tienda.</p>}
              {form.scope === 'CATEGORY' && (
                <div className="mt-3 grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
                  {categorias.map((c) => (
                    <label key={c.id} className="flex min-h-11 items-center gap-2 rounded px-2 text-sm text-ink hover:bg-surface">
                      <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={form.categoryIds.includes(c.id)}
                        onChange={(e) => set('categoryIds', e.target.checked ? [...form.categoryIds, c.id] : form.categoryIds.filter((id) => id !== c.id))} />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
              {form.scope === 'PRODUCT' && (
                <div className="mt-3 space-y-2">
                  <div className="relative sm:max-w-sm">
                    <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input aria-label="Buscar productos" className={`${adminInput()} pl-9`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o SKU" />
                  </div>
                  {busqueda.trim().length >= 2 && resultados.length > 0 && (
                    <ul className="max-h-56 overflow-y-auto rounded-lg border border-line sm:max-w-lg">
                      {resultados.filter((r) => !form.products.some((p) => p.id === r.id)).map((r) => (
                        <li key={r.id}>
                          <button type="button"
                            onClick={() => { guardarFicha(r); set('products', [...form.products, { id: r.id, name: r.name, priceUSD: r.priceUSD }]); setBusqueda(''); setResultados([]); }}
                            className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-surface">
                            <span className="truncate text-ink">{r.name}</span>
                            <span className="shrink-0 text-muted">{formatUSD(r.priceUSD)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className={adminHint}>Solo productos físicos.</p>
                  {form.products.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {form.products.map((p) => (
                        <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-sm text-ink">
                          <span className="max-w-48 truncate">{p.name}</span>
                          <button type="button" onClick={() => set('products', form.products.filter((x) => x.id !== p.id))}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-line" aria-label={`Quitar ${p.name}`}>
                            <IconoCerrar className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {(errores.categoryIds || errores.productIds || errores.scope) && <p className={adminError} role="alert">{errores.categoryIds || errores.productIds || errores.scope}</p>}
            </fieldset>
          </div>
        )}

        {clave === 'codigo' && (
          <div className="space-y-5">
            <Campo etiqueta="Código" id="promo-codigo" error={errores.code} pista={usado ? 'Ya se usó en compras: el código no se puede cambiar.' : 'Letras, números o guiones, de 3 a 30.'}>
              <input id="promo-codigo" className={`${adminInput(Boolean(errores.code))} font-mono uppercase sm:max-w-xs`} value={form.code} readOnly={usado}
                onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="HOLA10" maxLength={30} autoComplete="off" />
            </Campo>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink">Quién lo ve</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Quién lo ve">
                <Opcion role="radio" aria-checked={form.isPublic} elegida={form.isPublic} onClick={() => set('isPublic', true)} icono={IconoTienda}
                  titulo="En la ficha del producto" detalle={'Con "Aplicar cupón", para todos'} />
                <Opcion role="radio" aria-checked={!form.isPublic} elegida={!form.isPublic} onClick={() => set('isPublic', false)} icono={IconoClave}
                  titulo="Solo con el código" detalle="Para campañas o promotores" />
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-x-8 gap-y-5">
              <Campo etiqueta="Compra mínima" id="promo-minimo" error={errores.minSubtotalUSD} pista="Vacío: sin mínimo.">
                <CampoUnidad id="promo-minimo" unidad="$" inputMode="decimal" value={form.minSubtotalUSD} invalido={Boolean(errores.minSubtotalUSD)}
                  onChange={(e) => set('minSubtotalUSD', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="Sin mínimo" className="w-40" />
              </Campo>
              <Campo etiqueta="Usos por cliente" id="promo-por-cliente" error={errores.maxUsesPerUser} pista="Vacío: sin límite.">
                <CampoUnidad id="promo-por-cliente" unidad="usos" inputMode="numeric" value={form.maxUsesPerUser} invalido={Boolean(errores.maxUsesPerUser)}
                  onChange={(e) => set('maxUsesPerUser', e.target.value.replace(/\D/g, ''))} placeholder="Sin límite" className="w-40" />
              </Campo>
            </div>
          </div>
        )}

        {clave === 'fechas' && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-x-6 gap-y-5">
              <Campo etiqueta="Empieza" id="promo-desde" error={errores.startsAt} pista="Vacío: ahora mismo.">
                <input id="promo-desde" type="datetime-local" className={`${adminInput(Boolean(errores.startsAt))} w-60`} value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
              </Campo>
              <Campo etiqueta="Termina" id="promo-hasta" error={errores.endsAt} pista="Vacío: hasta que la pauses."
                ayuda="Si faltan menos de 7 días, la tienda lo avisa junto al precio: «Termina mañana», «Hasta el 28 sep».">
                <input id="promo-hasta" type="datetime-local" className={`${adminInput(Boolean(errores.endsAt))} w-60`} value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
              </Campo>
            </div>
            <Campo etiqueta="Tope de compras" id="promo-usos" error={errores.maxUses} pista="Vacío: sin tope. Al llegar, queda agotada.">
              <CampoUnidad id="promo-usos" unidad="compras" inputMode="numeric" value={form.maxUses} invalido={Boolean(errores.maxUses)}
                onChange={(e) => set('maxUses', e.target.value.replace(/\D/g, ''))} placeholder="Sin tope" className="w-44" />
            </Campo>
          </div>
        )}

        {clave === 'revisar' && (
          <div className="space-y-4">
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              <FilaResumen icono={cupon ? IconoCupon : IconoOferta} titulo={`${cupon ? 'Cupón' : 'Oferta'}: ${form.name.trim()}`} detalle={form.label.trim() ? `Para el cliente: "${form.label.trim()}"` : 'Sin texto para el cliente'} onCambiar={() => irA(0)} />
              <FilaResumen icono={IconoPorcentaje} titulo={`${valorCorto(form)} de descuento`} detalle={alcanceEnPalabras(form, categorias)} onCambiar={() => irA(1)} />
              {cupon && (
                <FilaResumen icono={IconoClave} titulo={`Código ${normalizarCodigo(form.code) ?? form.code}`}
                  detalle={[form.isPublic ? 'En la ficha del producto' : 'Solo con el código', numero(form.minSubtotalUSD) ? `desde ${formatUSD(numero(form.minSubtotalUSD) ?? 0)}` : 'sin mínimo', form.maxUsesPerUser ? `${form.maxUsesPerUser} por cliente` : 'sin límite por cliente'].join(' · ')}
                  onCambiar={() => irA(2)} />
              )}
              <FilaResumen icono={IconoCalendario}
                titulo={`${form.startsAt ? `Desde el ${fechaCorta(new Date(form.startsAt).toISOString())}` : 'Desde ahora'} · ${form.endsAt ? `hasta el ${fechaCorta(new Date(form.endsAt).toISOString())}` : 'sin fecha de fin'}`}
                detalle={form.maxUses ? `Tope de ${form.maxUses} compras` : 'Sin tope de compras'} onCambiar={() => irA(claves.indexOf('fechas'))} />
            </ul>

            {nuevo ? (
              <>
                <ElegirPublicar name="promo-publicar" publicar={publicar} onCambiar={setPublicar}
                  ya={{ titulo: cupon ? 'Publicarlo ya' : 'Publicarla ya', detalle: form.startsAt ? 'Empieza en la fecha que elegiste.' : cupon ? 'Se puede usar desde ahora.' : 'Se ve en la tienda desde ahora.', icono: IconoWeb }}
                  sin={{ titulo: cupon ? 'Guardarlo en pausa' : 'Guardarla en pausa', detalle: `${cupon ? 'Lo' : 'La'} reanudas después desde la lista.`, icono: IconoPausa }} />
                <Afecta cargando={contando} filas={filasEfecto()} />
              </>
            ) : (
              <ListaCambios cambios={cambios}>
                {cambios.length > 0 && <Afecta cargando={contando} filas={filasEfecto()} />}
              </ListaCambios>
            )}
            {usado && (
              <p className="flex items-center gap-2 text-xs text-muted"><IconoBolsa className="h-4 w-4 shrink-0" aria-hidden="true" /> Ya se usó en {editando?.usesCount} {editando?.usesCount === 1 ? 'compra' : 'compras'}: el tipo y el código no cambian.</p>
            )}
          </div>
        )}
      </Asistente>
      {dialogoConflicto}
    </>
  );
}

