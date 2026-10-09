'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiAlertTriangle, FiArrowLeft, FiArrowRight, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

import {
  WizardData,
  Category,
  DEFAULT_WIZARD_DATA,
  PHYSICAL_STEPS,
  DIGITAL_STEPS,
  validatePhysicalStep1,
  validatePhysicalStep2,
  validatePhysicalStep3,
  validateDigitalStep1,
  validateDigitalStep2,
  validateDigitalStep3,
  validatePublish,
  leerNumero,
} from './wizard/types';
import { estadoDeProducto, productoAFormulario, type EstadoProducto, type ProductoApi } from './wizard/producto-a-formulario';
import { combinar, type ConflictoDeCampo } from '@/lib/edicion/combinar';
import { ETIQUETA_CAMPO_FORMULARIO } from '@/lib/edicion/producto';
import { useBorradorLocal } from '@/lib/edicion/useBorrador';
import { useEdicionEnVivo, type CambioAjeno } from '@/lib/edicion/useEdicionEnVivo';
import AvisoPresencia from '@/components/admin/edicion/AvisoPresencia';
import AvisoCambioAjeno from '@/components/admin/edicion/AvisoCambioAjeno';
import BorradorRecuperado from '@/components/admin/edicion/BorradorRecuperado';
import HistorialRecurso from '@/components/admin/edicion/HistorialRecurso';
import DialogoConflicto, { valorEnTexto, type Eleccion } from '@/components/admin/edicion/DialogoConflicto';
import WizardProgress from './wizard/WizardProgress';
import ImagePanel from './wizard/ImagePanel';
import StepTypeSelector from './wizard/StepTypeSelector';
import PhysicalStep1BasicInfo from './wizard/physical/Step1BasicInfo';
import PhysicalStep2Prices from './wizard/physical/Step2Prices';
import PhysicalStep3Specs from './wizard/physical/Step3Specs';
import DigitalStep1Platform from './wizard/digital/Step1Platform';
import DigitalStep2Variants from './wizard/digital/Step2Variants';
import DigitalStep3Delivery from './wizard/digital/Step3Delivery';
import StepSEO from './wizard/StepSEO';
import StepPublish from './wizard/StepPublish';
import { wizardPrimaryButton, wizardSecondaryButton } from './wizard/ui';

// STEP INDEX (after type selector):
// Physical:  0=Info, 1=Prices, 2=Specs, 3=SEO, 4=Publish
// Digital:   0=Platform, 1=Denominations, 2=Delivery, 3=SEO, 4=Publish
const PUBLISH_STEP = 4;

interface Props {
  productId?: string;
}

/**
 * C-169: lo que el editor sabe del producto tal como lo abrió: el formulario, su versión (`updatedAt`) y su estado.
 * Es la BASE para combinar si otra persona lo cambia mientras tanto.
 */
interface BaseEdicion { form: WizardData; version: string | null; estado: EstadoProducto }

/** Al combinar, el estado (publicado, borrador…) viaja con el formulario como un campo más */
type Mezcla = WizardData & { __estado: EstadoProducto };
const ETIQUETAS: Record<string, string> = { ...ETIQUETA_CAMPO_FORMULARIO, __estado: 'Estado (publicado, borrador o archivado)' };
const NOMBRE_ESTADO: Record<string, string> = { PUBLISHED: 'Publicado', DRAFT: 'Borrador', ARCHIVED: 'Archivado' };

interface ConflictoPendiente {
  quien: string;
  conflictos: Array<ConflictoDeCampo<Mezcla>>;
  combinado: Mezcla;
  terminar: (mezcla: Mezcla) => Promise<void>;
}

/** El cuerpo del PATCH o del POST: lo que el servidor espera, armado desde el formulario */
function construirPayload(data: WizardData, publishStatus: EstadoProducto): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: data.name.trim(),
    sku: data.sku.trim(),
    description: data.description.trim(),
    categoryId: data.categoryId,
    images: data.images,
    // Solo el estado: el servidor prefiere isActive y un producto archivado volvía a borrador al editarlo (C-134)
    status: publishStatus,
    isFeatured: data.isFeatured,
    barcode: data.barcode || null,
    tags: data.tags,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    productType: data.productType,
  };

  if (data.productType === 'PHYSICAL') {
    // C-134: con coma o punto ("12,50"). Antes parseFloat("12,50") mandaba 12
    payload.priceUSD = leerNumero(data.priceUSD);
    payload.compareAtPriceUSD = data.compareAtPriceUSD.trim() ? leerNumero(data.compareAtPriceUSD) : null;
    payload.costPerItem = data.costPerItem.trim() ? leerNumero(data.costPerItem) : null;
    payload.stock = leerNumero(data.stock);
    payload.weightKg = data.weightKg.trim() ? leerNumero(data.weightKg) : 0;
    payload.isConsolidable = data.isConsolidable;
    payload.shippingCost = data.isConsolidable ? 0 : (data.shippingCost.trim() ? leerNumero(data.shippingCost) : 0);
    payload.freeShipping = data.freeShipping;
    // C-155: la marca por su nombre; vacía, el producto queda sin marca
    payload.brandName = data.brand.trim();
    payload.specifications = Object.keys(data.specifications).length > 0 ? data.specifications : null;
    // C-119: condición; el servidor la valida y, si es nuevo, guarda vacío lo de usado
    Object.assign(payload, {
      condition: data.condition,
      conditionGrade: data.conditionGrade || null,
      packaging: data.packaging || null,
      includedItems: data.includedItems,
      missingItems: data.missingItems,
      usageHours: data.usageHours,
      batteryHealth: data.batteryHealth,
      cosmeticNotes: data.cosmeticNotes,
      testNotes: data.testNotes,
      warrantyDays: data.warrantyDays,
      serialNumber: data.serialNumber,
    });
    if (data.dimensionLength || data.dimensionWidth || data.dimensionHeight) {
      payload.dimensions = JSON.stringify({
        length: leerNumero(data.dimensionLength) || 0,
        width: leerNumero(data.dimensionWidth) || 0,
        height: leerNumero(data.dimensionHeight) || 0,
      });
    }
  } else {
    // El precio "desde" y la validación final los hace el servidor (C-60)
    payload.stock = 999;
    payload.digitalPlatform = data.digitalPlatform;
    payload.digitalRegion = data.digitalRegion;
    payload.deliveryMethod = data.deliveryMethod;
    payload.redemptionInstructions = data.redemptionInstructions || null;
    payload.accountFieldLabel = data.deliveryMethod === 'MANUAL' ? data.accountFieldLabel.trim() || null : null;
    payload.accountFieldHint = data.deliveryMethod === 'MANUAL' ? data.accountFieldHint.trim() || null : null;
    payload.digitalMarginPercent = data.marginPercent;
    payload.digitalVariants = data.digitalVariants.map((v) => ({
      id: v.id,
      faceValue: Number.parseFloat(v.faceValue.replace(',', '.')),
      unit: v.unit,
      label: v.label.trim(),
      costUSD: Number.parseFloat(v.costUSD.replace(',', '.')) || 0,
      priceUSD: Number.parseFloat(v.priceUSD.replace(',', '.')) || 0,
      provider: v.provider || null,
      isActive: v.isActive,
    }));
  }
  return payload;
}

export default function ProductWizard({ productId }: Props) {
  const router = useRouter();
  const { data: sesion } = useSession();
  const yo = sesion?.user?.id;
  const isEditing = !!productId;

  type WizardStep = -1 | 0 | 1 | 2 | 3 | 4;
  const [step, setStep] = useState<WizardStep>(-1); // -1 = type selector
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD_DATA);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // En edición arranca cargando (C-111: antes se ponía en true dentro del efecto)
  const [isFetching, setIsFetching] = useState(isEditing);
  const [isLoading, setIsLoading] = useState(false);
  // C-133: al editar se guarda desde cualquier paso, con el estado que ya tenía el producto (publicado, borrador…)
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoProducto>('DRAFT');
  /** Los datos tal como se cargaron: sin cambios, "Guardar cambios" no hace nada */
  const [datosCargados, setDatosCargados] = useState<string | null>(null);
  const sinCambios = isEditing && datosCargados !== null && JSON.stringify(data) === datosCargados;
  /**
   * C-133: pasos donde se cambió algo. Al editar solo se validan esos: antes, para cambiar el precio de un producto
   * viejo había que completar todo lo que hoy pide el alta (3 especificaciones, peso, dimensiones…) en todos los pasos.
   * Lo esencial (precio, stock, categoría, SKU) lo sigue validando el servidor.
   */
  const [pasosTocados, setPasosTocados] = useState<Set<number>>(() => new Set());

  // ─── Trabajo en equipo (C-169) ────────────────────────────────────────────
  // La base con que se abrió el producto, en una referencia para los guardados que reintentan (leen siempre la última) y en
  // estado para el borrador. `bloqueo`: el producto ya estaba en la papelera al abrirlo, o el guardado lo descubrió.
  const baseRef = useRef<BaseEdicion | null>(null);
  const [base, setBase] = useState<BaseEdicion | null>(null);
  const fijarBase = useCallback((nueva: BaseEdicion) => {
    baseRef.current = nueva;
    setBase(nueva);
  }, []);
  const [bloqueo, setBloqueo] = useState<CambioAjeno | null>(null);
  const [conflicto, setConflicto] = useState<ConflictoPendiente | null>(null);
  const [restaurando, setRestaurando] = useState(false);
  const { otros, cambio, olvidarCambio } = useEdicionEnVivo(isEditing && productId ? `product:${productId}` : null, yo, base?.form.name || undefined);
  // Lo grave es lo último que se supo: movido a la papelera (al abrir, al guardar o en vivo) sin que lo hayan restaurado después
  const restauradoDespues = cambio?.accion === 'restaurado' && bloqueo !== null && cambio.en > bloqueo.en;
  const aviso: CambioAjeno | null = cambio && (cambio.accion === 'papelera' || cambio.accion === 'eliminado')
    ? cambio
    : (bloqueo && !restauradoDespues ? bloqueo : cambio);
  const bloqueado = aviso !== null && (aviso.accion === 'papelera' || aviso.accion === 'eliminado');

  // Borrador en este navegador: cada 2 s mientras haya cambios sin guardar (con uno viejo por decidir, no se pisa)
  const clave = yo && !isFetching ? `product:${productId ?? 'nuevo'}:${yo}` : null;
  const hayCambios = isEditing
    ? datosCargados !== null && JSON.stringify(data) !== datosCargados
    : step >= 0 && JSON.stringify(data) !== JSON.stringify(DEFAULT_WIZARD_DATA);
  const { borrador, limpiar: limpiarBorrador } = useBorradorLocal<WizardData>({
    clave,
    datos: data,
    base: isEditing ? base?.form ?? null : DEFAULT_WIZARD_DATA,
    baseVersion: base?.version ?? null,
    sucio: hayCambios,
  });

  const merge = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    if (step >= 0 && !pasosTocados.has(step)) setPasosTocados((prev) => new Set(prev).add(step));
    const cleared: Record<string, string> = {};
    Object.keys(updates).forEach((k) => { if (errors[k]) cleared[k] = ''; });
    if (Object.keys(cleared).length > 0) setErrors((prev) => ({ ...prev, ...cleared }));
  };

  // ─── Load categories ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.ok ? r.json() : [])
      .then(setCategories)
      .catch(() => {});
  }, []);

  // ─── Load product in edit mode ─────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing) return;

    fetch(`/api/products/${productId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Product not found');
        return r.json() as Promise<ProductoApi>;
      })
      .then((product) => {
        const cargado = productoAFormulario(product);
        const estado = estadoDeProducto(product);
        setData(cargado);
        setDatosCargados(JSON.stringify(cargado));
        setEstadoGuardado(estado);
        fijarBase({ form: cargado, version: product.updatedAt, estado });
        // C-169: en la papelera. Se abre igual (el trabajo no se pierde) pero avisa y no deja guardar encima
        if (product.deletedAt) {
          setBloqueo({ accion: 'papelera', por: { id: '', nombre: product.deletedByName ?? 'Alguien del equipo' }, en: product.deletedAt });
        }

        // Skip type selector in edit mode, start at step 0
        setStep(0);
      })
      .catch(() => {
        setErrors({ general: 'No se pudo cargar el producto.' });
        setTimeout(() => router.push('/admin/products'), 2000);
      })
      .finally(() => setIsFetching(false));
  }, [productId, isEditing, router, fijarBase]);

  // ─── Step validation ───────────────────────────────────────────────────────
  const validate = (s: number): Record<string, string> | null => {
    let errs: Record<string, string> = {};

    if (data.productType === 'PHYSICAL') {
      if (s === 0) errs = validatePhysicalStep1(data);
      else if (s === 1) errs = validatePhysicalStep2(data);
      else if (s === 2) errs = validatePhysicalStep3(data);
    } else {
      if (s === 0) errs = validateDigitalStep1(data);
      else if (s === 1) errs = validateDigitalStep2(data);
      else if (s === 2) errs = validateDigitalStep3(data);
    }

    if (s === PUBLISH_STEP) errs = { ...errs, ...validatePublish(data) };

    setErrors(errs);
    return Object.keys(errs).length === 0 ? null : errs;
  };

  const handleNext = () => {
    // Al editar, pasar de largo por un paso que no se tocó no pide completarlo
    if ((!isEditing || pasosTocados.has(step)) && validate(step)) return;
    setStep((prev) => (prev + 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors({});
    if (step === 0) { setStep(-1); return; }
    setStep((prev) => (prev - 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Combinar con lo que otra persona guardó (C-169) ───────────────────────
  /**
   * `actual` es el producto como está ahora en el servidor. Se combina con lo que tengo (`propios`) usando como base lo que
   * abrí: lo que solo cambió la otra persona entra solo, lo que solo cambié yo se queda, y solo lo que los dos tocamos se
   * pregunta. Después `alTerminar` recibe el formulario combinado (para guardar o solo para seguir editando).
   */
  const aplicarActual = async (
    actual: ProductoApi,
    quien: string,
    propios: WizardData,
    estadoPropio: EstadoProducto,
    alTerminar: (datos: WizardData, estado: EstadoProducto) => Promise<void> | void,
  ): Promise<void> => {
    const suyoForm = productoAFormulario(actual);
    const suyoEstado = estadoDeProducto(actual);
    const abierto = baseRef.current;
    const resultado = combinar<Mezcla>(
      { ...(abierto?.form ?? suyoForm), __estado: abierto?.estado ?? suyoEstado },
      { ...propios, __estado: estadoPropio },
      { ...suyoForm, __estado: suyoEstado },
    );
    const terminar = async (mezcla: Mezcla) => {
      const { __estado: estado, ...formulario } = mezcla;
      // Desde aquí la base es lo que hay en el servidor: lo siguiente que se guarde parte de esa versión
      fijarBase({ form: suyoForm, version: actual.updatedAt, estado: suyoEstado });
      setDatosCargados(JSON.stringify(suyoForm));
      setEstadoGuardado(estado);
      setData(formulario);
      await alTerminar(formulario, estado);
    };
    if (resultado.conflictos.length === 0) {
      await terminar(resultado.combinado);
      return;
    }
    setConflicto({ quien, conflictos: resultado.conflictos, combinado: resultado.combinado, terminar });
  };

  const resolverConflicto = async (elecciones: Record<string, Eleccion>) => {
    if (!conflicto) return;
    const elegido: Mezcla = { ...conflicto.combinado };
    for (const c of conflicto.conflictos) {
      if (elecciones[c.campo] === 'suyo') (elegido as unknown as Record<string, unknown>)[c.campo] = c.suyo;
    }
    const pendiente = conflicto;
    setConflicto(null);
    await pendiente.terminar(elegido);
  };

  const formatearConflicto = (campo: string, valor: unknown): string => {
    if (campo === 'categoryId') return categories.find((c) => c.id === valor)?.name ?? valorEnTexto(valor);
    if (campo === '__estado') return NOMBRE_ESTADO[String(valor)] ?? valorEnTexto(valor);
    if (campo === 'specifications' && valor && typeof valor === 'object') {
      const n = Object.keys(valor as object).length;
      return `${n} ${n === 1 ? 'especificación' : 'especificaciones'}`;
    }
    return valorEnTexto(valor);
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  /** Manda el formulario. Al editar lleva la versión con que se abrió; si otra persona guardó antes, combina y reintenta (hasta 3 veces). */
  const enviar = async (datos: WizardData, publishStatus: EstadoProducto, intento: number): Promise<void> => {
    setIsLoading(true);
    setErrors({});

    try {
      const payload = construirPayload(datos, publishStatus);
      if (isEditing) payload.baseUpdatedAt = baseRef.current?.version ?? undefined;

      const url = isEditing ? `/api/products/${productId}` : '/api/products';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // C-133: sin cuadro ni espera. Antes se esperaban 2,5 s a propósito, y el cuadro decía "¡Producto Publicado!
        // Ya está disponible en la tienda" también al guardar un borrador
        const guardado = (await res.json().catch(() => null)) as { slug?: string } | null;
        limpiarBorrador();
        const texto = isEditing
          ? 'Cambios guardados'
          : publishStatus === 'PUBLISHED' ? 'Producto publicado' : 'Guardado como borrador: no se ve en la tienda';
        toast.success((t) => (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {texto}
            {publishStatus === 'PUBLISHED' && guardado?.slug && (
              <a href={`/productos/${guardado.slug}`} target="_blank" rel="noopener" onClick={() => toast.dismiss(t.id)} className="font-semibold text-brand-600 underline">
                Ver en la tienda
              </a>
            )}
          </span>
        ), { duration: 6000 });
        router.push('/admin/products');
        return;
      }

      const cuerpo = (await res.json().catch(() => ({}))) as {
        error?: string; details?: string; conflicto?: string; actual?: ProductoApi; por?: { nombre?: string; en?: string };
      };
      // Otra persona guardó mientras se editaba: se combina y se reintenta
      if (isEditing && res.status === 409 && cuerpo.conflicto === 'cambiado' && cuerpo.actual && intento < 3) {
        await aplicarActual(cuerpo.actual, cuerpo.por?.nombre ?? 'Otra persona', datos, publishStatus, (d, e) => enviar(d, e, intento + 1));
        return;
      }
      // Lo movieron a la papelera (410) o ya no existe (404): no se puede guardar encima, pero nada se pierde
      if (isEditing && (res.status === 410 || cuerpo.conflicto === 'no_existe')) {
        setBloqueo({
          accion: res.status === 410 ? 'papelera' : 'eliminado',
          por: { id: '', nombre: cuerpo.por?.nombre ?? 'Alguien del equipo' },
          en: cuerpo.por?.en ?? new Date().toISOString(),
        });
        return;
      }
      setErrors({ general: cuerpo.details ? `${cuerpo.error}: ${cuerpo.details}` : (cuerpo.error || 'Error al guardar el producto.') });
    } catch {
      setErrors({ general: 'Error de conexión. Verifica tu internet.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (publishStatus: EstadoProducto) => {
    if (bloqueado) {
      toast.error('Este producto está en la papelera: restáuralo o guárdalo como producto nuevo');
      return;
    }
    // Al editar se puede saltar pasos desde la barra: si alguno de los que se tocaron quedó incompleto, se vuelve a él
    for (let s = 0; s < PUBLISH_STEP; s++) {
      if (isEditing && !pasosTocados.has(s)) continue;
      const errs = validate(s);
      if (errs) {
        setStep(s as WizardStep);
        // C-133: se dice por qué no se guardó (antes solo cambiaba de paso y había que buscar el campo en rojo)
        const primero = Object.values(errs).find((m) => m && m !== '*');
        toast.error(`Falta completar "${steps[s]}"${primero ? `: ${primero}` : ''}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    const errsFinal = validate(PUBLISH_STEP);
    if (errsFinal) {
      toast.error(Object.values(errsFinal).find(Boolean) ?? 'Revisa los datos del producto');
      return;
    }
    await enviar(data, publishStatus, 0);
  };

  /** C-133: guardar lo editado desde cualquier paso, sin cambiar si estaba publicado o en borrador */
  const guardarCambios = () => {
    if (sinCambios || isLoading || bloqueado) return;
    void handleSubmit(estadoGuardado);
  };

  // ─── Papelera: restaurar y seguir, o guardar lo escrito como producto nuevo ──
  const restaurarYSeguir = async () => {
    setRestaurando(true);
    try {
      const res = await fetch(`/api/products/${productId}/restaurar`, { method: 'POST' });
      if (!res.ok) {
        toast.error((await res.json().catch(() => ({}))).error || 'No se pudo restaurar el producto');
        return;
      }
      const actualRes = await fetch(`/api/products/${productId}`);
      if (!actualRes.ok) {
        toast.error('Se restauró, pero no se pudo recargar. Recarga la página.');
        return;
      }
      const actual = (await actualRes.json()) as ProductoApi;
      setBloqueo(null);
      olvidarCambio();
      // Lo que otra persona haya cambiado antes de moverlo se combina con lo que escribí
      await aplicarActual(actual, 'Otra persona', data, estadoGuardado, () => undefined);
      toast.success('Producto restaurado. Puedes seguir editando.');
    } finally {
      setRestaurando(false);
    }
  };

  const guardarComoNuevo = async () => {
    setRestaurando(true);
    try {
      // El SKU del original sigue siendo suyo (aunque esté en la papelera): la copia lleva "-COPIA", "-COPIA-2"…
      const candidatos = [1, 2, 3].map((n) => `${data.sku.trim()}-COPIA${n === 1 ? '' : `-${n}`}`.slice(0, 60));
      for (const sku of candidatos) {
        const payload: Record<string, unknown> = { ...construirPayload(data, 'DRAFT'), sku };
        // Los montos digitales de la copia son nuevos: sin los ids del original
        if (Array.isArray(payload.digitalVariants)) {
          payload.digitalVariants = (payload.digitalVariants as Array<Record<string, unknown>>).map((v) => {
            const copia = { ...v };
            delete copia.id;
            return copia;
          });
        }
        const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
          const nuevo = (await res.json()) as { id: string };
          limpiarBorrador();
          toast.success('Guardado como producto nuevo, en borrador');
          router.push(`/admin/products/${nuevo.id}`);
          return;
        }
        const cuerpo = (await res.json().catch(() => ({}))) as { error?: string };
        if (!/SKU/i.test(cuerpo.error ?? '')) {
          toast.error(cuerpo.error || 'No se pudo guardar como producto nuevo');
          return;
        }
      }
      toast.error('No se encontró un SKU libre para la copia');
    } finally {
      setRestaurando(false);
    }
  };

  // ─── Borrador recuperado ───────────────────────────────────────────────────
  const recuperarBorrador = () => {
    if (!borrador) return;
    setData(borrador.datos);
    // La base del borrador, no la de ahora: si otra persona cambió algo mientras tanto, al guardar se combina
    fijarBase({ form: borrador.base, version: borrador.baseVersion, estado: baseRef.current?.estado ?? estadoGuardado });
    setDatosCargados(JSON.stringify(borrador.base));
    if (!isEditing) setStep(borrador.datos.productType ? 0 : -1);
  };

  // ─── Step labels ────────────────────────────────────────────────────────────
  const steps = data.productType === 'DIGITAL' ? DIGITAL_STEPS : PHYSICAL_STEPS;

  // ─── Render step content ───────────────────────────────────────────────────
  const renderStep = () => {
    const props = { data, onChange: merge, errors, categories };

    if (step === -1) return (
      <StepTypeSelector
        selected={data.productType}
        onSelect={(type) => { merge({ productType: type }); setStep(0); }}
        onSadesImport={(updates) => merge(updates)}
        isEditing={isEditing}
      />
    );

    if (data.productType === 'PHYSICAL') {
      if (step === 0) return <PhysicalStep1BasicInfo {...props} />;
      if (step === 1) return <PhysicalStep2Prices {...props} />;
      if (step === 2) return <PhysicalStep3Specs {...props} />;
      if (step === 3) return <StepSEO {...props} />;
    } else {
      if (step === 0) return <DigitalStep1Platform {...props} />;
      if (step === 1) return <DigitalStep2Variants {...props} />;
      if (step === 2) return <DigitalStep3Delivery {...props} />;
      if (step === 3) return <StepSEO {...props} />;
    }

    if (step === PUBLISH_STEP) return (
      <StepPublish
        data={data}
        errors={errors}
        isLoading={isLoading || bloqueado}
        isEditing={isEditing}
        estadoActual={isEditing ? estadoGuardado : undefined}
        onPublish={() => handleSubmit('PUBLISHED')}
        onDraft={() => handleSubmit('DRAFT')}
      />
    );

    return null;
  };

  const showSidebar = step >= 0; // Show image panel from step 0 onwards

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="font-medium text-muted">Cargando producto…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface pb-24">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-[var(--z-sticky)] border-b border-line bg-white">
        <div className="max-w-[1300px] mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Left: back + title */}
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Volver"
                className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-tight text-ink">
                  {isEditing ? 'Editar producto' : 'Nuevo producto'}
                </h1>
                {data.productType && step >= 0 && (
                  <p className="text-xs text-muted">
                    {data.productType === 'PHYSICAL' ? 'Producto físico' : 'Producto digital'}
                  </p>
                )}
              </div>
            </div>

            {/* Right: descartar y, al editar, guardar desde cualquier paso */}
            <div className="flex shrink-0 items-center gap-2">
              {/* En el teléfono la flecha de la izquierda ya vuelve: al editar, "Descartar" sobra y no cabía con "Guardar" */}
              <button
                type="button"
                onClick={() => { if (!sinCambios) limpiarBorrador(); router.back(); }}
                className={`${isEditing ? 'hidden sm:inline-flex' : 'inline-flex'} rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-ink`}
              >
                {sinCambios ? 'Volver' : 'Descartar'}
              </button>
              {isEditing && (
                <button type="button" onClick={guardarCambios} disabled={isLoading || sinCambios || bloqueado} className={`${wizardPrimaryButton} disabled:opacity-50`}>
                  <FiSave className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{isLoading ? 'Guardando…' : 'Guardar cambios'}</span>
                  <span className="sm:hidden">{isLoading ? '…' : 'Guardar'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Pasos en su propia fila (C-134: en escritorio compartían fila con el título, que se cortaba en "Edita…") */}
          {step >= 0 && (
            <div className="mt-2 pb-1">
              <WizardProgress
                steps={steps}
                current={step}
                onStepClick={(i) => { setErrors({}); setStep(i as WizardStep); }}
                freeNavigation={isEditing}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1300px] mx-auto px-2 sm:px-4 md:px-8 py-4 sm:py-6">

        {/* C-169: trabajo en equipo. Quién más está aquí, qué cambió, borrador del navegador y, si lo movieron a la papelera, la salida */}
        <AvisoPresencia otros={otros} recurso="este producto" />
        {borrador && (
          <BorradorRecuperado guardadoEn={borrador.guardadoEn} que={isEditing ? 'cambios sin guardar en este producto' : 'un producto sin terminar'} onRecuperar={recuperarBorrador} onDescartar={limpiarBorrador} />
        )}
        {aviso && (
          <AvisoCambioAjeno
            cambio={aviso}
            recurso="producto"
            ocupado={restaurando}
            onRestaurar={restaurarYSeguir}
            onGuardarComoNuevo={guardarComoNuevo}
            onCerrar={olvidarCambio}
          />
        )}

        {errors.general && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-deal/30 bg-deal-bg p-4 text-sm font-semibold text-deal" role="alert">
            <FiAlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            {errors.general}
          </div>
        )}

        <div className={showSidebar ? 'grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 lg:gap-6 items-start' : ''}>

          {/* Step content */}
          <div className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-6">
            {renderStep()}

            {/* Navigation — not on publish step (it has its own buttons) */}
            {step >= 0 && step < PUBLISH_STEP && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                {/* Al editar no se cambia el tipo: el paso 0 no tiene "Anterior" */}
                {isEditing && step === 0 ? <span /> : (
                  <button
                    type="button"
                    onClick={handleBack}
                    className={wizardSecondaryButton}
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    {step === 0 ? 'Cambiar tipo' : 'Anterior'}
                  </button>
                )}

                {/* Al editar, "Guardar cambios" está fijo arriba: aquí solo se navega (C-134: antes el pie se partía en dos filas) */}
                {isEditing ? (
                  <button type="button" onClick={handleNext} className={wizardSecondaryButton}>
                    Siguiente
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className={wizardPrimaryButton}
                  >
                    {step === steps.length - 2 ? 'Revisar y publicar' : 'Continuar'}
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Back button on publish step */}
            {step === PUBLISH_STEP && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Volver a SEO
                </button>
              </div>
            )}
          </div>

          {/* Sticky image panel */}
          {showSidebar && (
            <div>
              <ImagePanel
                images={data.images}
                onChange={(imgs) => merge({ images: imgs })}
                error={errors.images}
                badge={data.productType !== 'PHYSICAL' || data.condition === 'NEW'}
              />
            </div>
          )}
        </div>
      </div>

      {isEditing && productId && (
        <div className="mx-auto max-w-[1300px] px-2 sm:px-4 md:px-8">
          <HistorialRecurso recurso={`product:${productId}`} recargar={cambio?.en} />
        </div>
      )}

      {conflicto && (
        <DialogoConflicto
          quien={conflicto.quien}
          conflictos={conflicto.conflictos}
          etiquetas={ETIQUETAS}
          formatear={formatearConflicto}
          guardando={isLoading}
          onGuardar={resolverConflicto}
          onCancelar={() => setConflicto(null)}
        />
      )}
    </div>
  );
}
