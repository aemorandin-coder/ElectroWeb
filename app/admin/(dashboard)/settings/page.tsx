'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { IconoAdvertencia, IconoCheck, IconoChevronDerecha, IconoFlechaIzquierda, IconoGuardar, IconoRestablecer } from '@/components/iconos';
import {
  adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton, adminSpinner,
} from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { formatVES } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import {
  buildPatch, CAMPOS_DELICADOS, EN_MARKETING, ENLACES, GRUPOS, isDirty, SECCION_VIEJA, SECTIONS, sectionOf, toSettingsForm,
  type FieldErrors, type SectionId, type SetField, type SettingsForm, type SettingsKey,
} from './_components/settings-form';
import BusinessSection from './_components/BusinessSection';
import PricesSection from './_components/PricesSection';
import ShippingSection from './_components/ShippingSection';
import StorefrontSection from './_components/StorefrontSection';
import SystemSection from './_components/SystemSection';
import ChannelMatrix from '../notifications/_components/ChannelMatrix';
import TelegramPanel from '../notifications/_components/TelegramPanel';
import BackupsSection from './_components/BackupsSection';
import SeccionIA from '@/components/admin/ia/SeccionIA';
import EmailSettingsPanel from '@/components/admin/EmailSettingsPanel';
import MetodosDePago from '../payments/_components/MetodosDePago';

// Configuración (C-50b): secciones por tarea. Antes: 1.594 líneas en un archivo y 29 campos sin efecto en la tienda.
// C-293 · Ajustes (AJUSTES.md §3; el equipo, 18/11: "inputs anchísimos, muchos textos, semánticas ilógicas, ajustes repetidos"):
// - el menú por grupos (Tu negocio, Vender, Avisos, Conexiones, La tienda en línea, Equipo y acceso), cada sección con su estado
//   en una línea (D1). En el teléfono, primero la lista y, al tocar, la sección con "Ajustes" para volver;
// - cada sección guarda sola: la barra de abajo es de la sección que se ve, y lo que toca dinero se revisa antes → después
//   con a qué afecta. Las demás secciones con cambios llevan su punto en el menú;
// - Métodos de pago entra aquí (D5); las direcciones viejas (#negocio, #precios, #tienda) llevan a su sección nueva.
// C-294: "Qué avisar" y Telegram entran a Avisos (D6) y el mantenimiento a La tienda en línea. Portada y "Google y redes" pasaron a
// Marketing (D2): el menú los lleva allá, y sus direcciones viejas también.

function sectionFromHash(): SectionId | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (SECTIONS.some((section) => section.id === hash)) return hash as SectionId;
  // C-298: una parte de IA (#ia-motor, #ia-proveedores…) abre la sección IA, y esa parte se abre sola (components/admin/Plegable)
  if (hash.startsWith('ia-')) return 'ia';
  return SECCION_VIEJA[hash] ?? null;
}

export default function SettingsPage() {
  const { confirm } = useConfirm();
  const router = useRouter();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [initial, setInitial] = useState<SettingsForm | null>(null);
  const [meta, setMeta] = useState<{ updatedAt: string | null; lastRateUpdate: string | null }>({ updatedAt: null, lastRateUpdate: null });
  const [loadError, setLoadError] = useState(false);
  // null: en el teléfono se ve la lista; en la computadora, la primera sección. La primera pintura es el indicador de carga,
  // así que leer el hash aquí no desajusta la hidratación
  const [elegida, setElegida] = useState<SectionId | null>(sectionFromHash);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState<SectionId | null>(null);
  const active: SectionId = elegida ?? SECTIONS[0].id;

  const applyServerData = useCallback((data: Record<string, unknown>, campos?: readonly SettingsKey[]) => {
    const loaded = toSettingsForm(data);
    // Al guardar una sección, lo que se estaba cambiando en las demás se conserva
    if (campos) {
      setInitial(loaded);
      setForm((previo) => (previo ? { ...loaded, ...Object.fromEntries(Object.entries(previo).filter(([k]) => !campos.includes(k as SettingsKey))) } as SettingsForm : loaded));
    } else {
      setForm(loaded);
      setInitial(loaded);
    }
    setMeta({
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
      lastRateUpdate: typeof data.lastRateUpdate === 'string' ? data.lastRateUpdate : null,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((data) => {
        if (!cancelled) applyServerData(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    const onHash = () => setElegida(sectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onHash);
    };
  }, [applyServerData]);

  // Al llegar desde otra pantalla del panel (un enlace a /admin/settings#pagos), el hash llega a la dirección después del primer
  // dibujo: se lee otra vez al montar
  useCargarAlMontar(() => {
    const hash = window.location.hash.slice(1);
    if (EN_MARKETING[hash]) {
      router.replace(EN_MARKETING[hash]);
      return;
    }
    const desdeLaDireccion = sectionFromHash();
    if (desdeLaDireccion) setElegida(desdeLaDireccion);
  });

  const goTo = useCallback((id: SectionId | null) => {
    setElegida(id);
    window.history.replaceState(null, '', id ? `#${id}` : window.location.pathname);
    window.scrollTo({ top: 0 });
  }, []);

  const set: SetField = useCallback((key, value) => {
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous));
    setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));
    setJustSaved(null);
  }, []);

  const dirtySections = useMemo(() => {
    if (!form || !initial) return new Set<SectionId>();
    return new Set(SECTIONS.filter((section) => section.fields.some((field) => isDirty(form, initial, field))).map((section) => section.id));
  }, [form, initial]);
  const errorSections = useMemo(
    () => new Set(Object.entries(errors).filter(([, message]) => message).map(([field]) => sectionOf(field)).filter(Boolean) as SectionId[]),
    [errors]
  );
  const hasChanges = dirtySections.size > 0;
  const section = SECTIONS.find((item) => item.id === active) ?? SECTIONS[0];
  const cambiosAqui = form && initial ? section.fields.filter((field) => isDirty(form, initial, field)) : [];

  // Aviso del navegador al cerrar o recargar con cambios sin guardar
  useEffect(() => {
    if (!hasChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasChanges]);

  // `confirmarSaltoTasa` solo va al reenviar, después de que quien guarda confirmó el salto de la tasa (S-08)
  const guardar = async (confirmarSaltoTasa: boolean) => {
    if (!form || !initial || cambiosAqui.length === 0) return;
    setSaving(true);
    setErrors({});
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPatch(form, initial, section.fields), ...(confirmarSaltoTasa ? { confirmarSaltoTasa: true } : {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        applyServerData(data, section.fields);
        setJustSaved(section.id);
        toast.success(`${section.label}: guardado`);
        return;
      }
      // S-08: la tasa cambia más de 50 %: se muestra antes → después y, si lo confirma, se reenvía
      if (response.status === 409 && data.code === 'TASA_SALTO') {
        const seguir = await confirm({
          title: 'La tasa cambia más de 50 %',
          message: `De ${formatVES(Number(data.antes))} a ${formatVES(Number(data.despues))} por dólar. Todos los precios en bolívares y los Pagos Móvil usarían la nueva tasa. ¿Está bien escrita?`,
          confirmText: 'Sí, guardar esa tasa',
          cancelText: 'Revisar',
          type: 'warning',
        });
        if (seguir) await guardar(true);
        return;
      }
      if (data.fields && typeof data.fields === 'object') {
        setErrors(data.fields);
        // Lleva al primer campo marcado (en el teléfono puede quedar fuera de la pantalla)
        requestAnimationFrame(() => {
          const invalid = document.querySelector<HTMLElement>('main [aria-invalid="true"]');
          invalid?.scrollIntoView({ block: 'center' });
          invalid?.focus({ preventScroll: true });
        });
      }
      toast.error(data.error || 'No se pudo guardar');
    } catch {
      toast.error('Sin conexión. Tus cambios siguen aquí; intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!initial) return;
    setForm((previo) => (previo ? { ...previo, ...Object.fromEntries(section.fields.map((k) => [k, initial[k]])) } as SettingsForm : previo));
    setErrors({});
  };

  if (loadError) {
    return (
      <div className="max-w-xl py-16">
        <p className={adminNotice('danger')}>No se pudieron cargar los ajustes.</p>
        <button type="button" onClick={() => window.location.reload()} className={`${adminSecondaryButton} mt-4`}>Reintentar</button>
      </div>
    );
  }

  if (!form || !initial) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className={adminSpinner} aria-label="Cargando los ajustes" />
      </div>
    );
  }

  const sectionProps = { form, set, errors };
  const delicados = cambiosAqui.filter((k) => CAMPOS_DELICADOS[k]);
  const afecta = [...new Set(delicados.map((k) => CAMPOS_DELICADOS[k]!.afecta))];

  return (
    <div className="max-w-6xl">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Ajustes</h1>
          <p className={adminPageSubtitle}>
            Cómo funciona la tienda: lo que se decide una vez y casi no se toca.
            {meta.updatedAt && <span className="block">Último cambio: {new Date(meta.updatedAt).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
          </p>
        </div>
      </div>

      {initial.maintenanceMode && active !== 'mantenimiento' && (
        <button type="button" onClick={() => goTo('mantenimiento')} className={`${adminNotice('warning')} mb-5 flex w-full items-center gap-2 text-left`}>
          <IconoAdvertencia className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1"><strong>La tienda está en mantenimiento.</strong> Los clientes no pueden comprar.</span>
          <span className="font-semibold underline">Ver</span>
        </button>
      )}

      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
        {/* El menú por grupos: en la computadora, al lado; en el teléfono, la lista entera mientras no se elija una sección */}
        <nav aria-label="Secciones de los ajustes" className={elegida ? 'max-lg:hidden' : undefined}>
          <div className="space-y-5 lg:sticky lg:top-22">
            {GRUPOS.map((grupo) => {
              const secciones = SECTIONS.filter((s) => s.grupo === grupo.id);
              return (
                <div key={grupo.id}>
                  <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted">{grupo.label}</p>
                  <ul className="space-y-0.5">
                    {secciones.map((item) => {
                      const Icon = item.icon;
                      // En la computadora se marca la que se ve; en el teléfono la lista sale sola, sin marcar ninguna
                      const vista = item.id === active;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => goTo(item.id)}
                            aria-current={vista ? 'page' : undefined}
                            className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-ink transition-colors hover:bg-brand-50 max-lg:border max-lg:border-line max-lg:bg-white ${vista ? 'lg:bg-brand-500 lg:text-white lg:hover:bg-brand-600' : ''}`}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">{item.label}</span>
                              <span className={`block truncate text-xs text-muted ${vista ? 'lg:text-white/85' : ''}`}>{item.estado(form)}</span>
                            </span>
                            {errorSections.has(item.id) ? (
                              <span className={`h-2 w-2 shrink-0 rounded-full bg-deal ${vista ? 'lg:bg-white' : ''}`} aria-label="con errores" />
                            ) : dirtySections.has(item.id) ? (
                              <span className={`h-2 w-2 shrink-0 rounded-full bg-brand-700 ${vista ? 'lg:bg-white' : ''}`} aria-label="con cambios sin guardar" />
                            ) : null}
                            <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted lg:hidden" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                    {ENLACES.filter((e) => e.grupo === grupo.id).map(({ href, label, estado, icon: Icon }) => (
                      <li key={href}>
                        <Link href={href} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-ink transition-colors hover:bg-brand-50 max-lg:border max-lg:border-line max-lg:bg-white">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{label}</span>
                            <span className="block truncate text-xs text-muted">{estado}</span>
                          </span>
                          <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        <div className={`min-w-0 ${elegida ? '' : 'max-lg:hidden'}`}>
          <button type="button" onClick={() => goTo(null)} aria-label="Volver a la lista de ajustes" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-600 lg:hidden">
            <IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /> Ajustes
          </button>
          <header className="mb-4">
            <h2 id="ajustes-seccion" className="text-xl font-semibold text-ink">{section.label}</h2>
            <p className="mt-0.5 max-w-prose text-sm text-muted">{section.description}</p>
          </header>

          <div className="space-y-5">
            {active === 'datos' && <BusinessSection {...sectionProps} parte="datos" />}
            {active === 'marca' && <BusinessSection {...sectionProps} parte="marca" />}
            {(active === 'tasa' || active === 'compras') && (
              <PricesSection
                {...sectionProps}
                parte={active}
                savedAutoExchangeRates={initial.autoExchangeRates}
                lastRateUpdate={meta.lastRateUpdate}
                onRateRefreshed={(rate, lastRateUpdate) => {
                  const value = String(rate);
                  setForm((previous) => (previous ? { ...previous, exchangeRateVES: value } : previous));
                  setInitial((previous) => (previous ? { ...previous, exchangeRateVES: value } : previous));
                  setMeta((previous) => ({ ...previous, lastRateUpdate }));
                }}
              />
            )}
            {active === 'pagos' && <MetodosDePago enAjustes />}
            {active === 'inventario' && <StorefrontSection {...sectionProps} parte="inventario" />}
            {active === 'envios' && <ShippingSection {...sectionProps} />}
            {active === 'avisos' && (
              <>
                <SystemSection {...sectionProps} parte="avisos" />
                <ChannelMatrix onGoToTelegram={() => goTo('telegram')} />
              </>
            )}
            {active === 'telegram' && <TelegramPanel />}
            {active === 'mantenimiento' && <SystemSection {...sectionProps} parte="mantenimiento" />}
            {active === 'correo' && <EmailSettingsPanel />}
            {active === 'respaldos' && <BackupsSection />}
            {active === 'ia' && <SeccionIA />}
          </div>

          {/* La barra de la sección: aparece con cambios y queda pegada abajo mientras se edita */}
          {section.fields.length > 0 && (
            <div className="sticky bottom-0 z-[var(--z-sticky)] -mx-3 mt-6 px-3 pb-3 pt-2 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0" aria-live="polite">
              {cambiosAqui.length > 0 ? (
                <div className="rounded-2xl border border-brand-200 bg-white p-3 shadow-lg sm:pl-5">
                  {delicados.length > 0 && (
                    <div className="mb-3 border-b border-line pb-3">
                      <p className="text-sm font-semibold text-ink">Revisa antes de guardar</p>
                      <ul className="mt-1 space-y-0.5 text-sm">
                        {delicados.map((k) => {
                          const d = CAMPOS_DELICADOS[k]!;
                          return (
                            <li key={k} className="tabular-nums text-ink-soft">
                              {d.nombre}: <span className="text-muted line-through">{d.formato(initial[k])}</span> → <strong className="text-ink">{d.formato(form[k])}</strong>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-1 text-xs text-muted">Afecta: {afecta.join(' ')}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-ink">
                      <strong>{cambiosAqui.length === 1 ? '1 cambio sin guardar' : `${cambiosAqui.length} cambios sin guardar`}</strong>
                      {dirtySections.size > 1 && <span className="text-muted"> · y en otras secciones (con su punto en el menú)</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button type="button" onClick={discard} disabled={saving} className={`${adminSecondaryButton} whitespace-nowrap px-3 sm:px-5`}>
                        <IconoRestablecer className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                        Descartar
                      </button>
                      <button type="button" onClick={() => void guardar(false)} disabled={saving} className={`${adminPrimaryButton} whitespace-nowrap px-3 sm:px-5`}>
                        {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <IconoGuardar className="hidden h-4 w-4 sm:block" aria-hidden="true" />}
                        {saving ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : justSaved === section.id ? (
                <p className="flex items-center justify-center gap-2 text-sm font-semibold text-success-strong">
                  <IconoCheck className="h-4 w-4" aria-hidden="true" />
                  Guardado
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
