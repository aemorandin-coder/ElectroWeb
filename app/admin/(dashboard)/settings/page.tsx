'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiCheck, FiRotateCcw, FiSave } from 'react-icons/fi';
import {
  adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton, adminSpinner, adminTab,
} from '@/lib/admin-ui';
import {
  buildPatch, isDirty, SECTIONS, sectionOf, toSettingsForm,
  type FieldErrors, type SectionId, type SetField, type SettingsForm,
} from './_components/settings-form';
import BusinessSection from './_components/BusinessSection';
import PricesSection from './_components/PricesSection';
import ShippingSection from './_components/ShippingSection';
import StorefrontSection from './_components/StorefrontSection';
import SeoSection from './_components/SeoSection';
import SystemSection from './_components/SystemSection';

// Configuración (C-50b): 6 secciones por tarea, un solo guardado con los cambios de todas.
// Antes: 1.594 líneas en un archivo, 29 campos sin efecto en la tienda y un botón de guardar por pestaña.

function sectionFromHash(): SectionId {
  if (typeof window === 'undefined') return 'negocio';
  const hash = window.location.hash.slice(1);
  return SECTIONS.some((section) => section.id === hash) ? (hash as SectionId) : 'negocio';
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [initial, setInitial] = useState<SettingsForm | null>(null);
  const [meta, setMeta] = useState<{ updatedAt: string | null; lastRateUpdate: string | null }>({ updatedAt: null, lastRateUpdate: null });
  const [loadError, setLoadError] = useState(false);
  // La primera pintura es el indicador de carga, así que leer el hash aquí no desajusta la hidratación
  const [active, setActive] = useState<SectionId>(sectionFromHash);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const applyServerData = useCallback((data: Record<string, unknown>) => {
    const loaded = toSettingsForm(data);
    setForm(loaded);
    setInitial(loaded);
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
    const onHash = () => setActive(sectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onHash);
    };
  }, [applyServerData]);

  const goTo = useCallback((id: SectionId) => {
    setActive(id);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  }, []);

  const set: SetField = useCallback((key, value) => {
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous));
    setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));
    setJustSaved(false);
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

  // Aviso del navegador al cerrar o recargar con cambios sin guardar
  useEffect(() => {
    if (!hasChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasChanges]);

  const save = async () => {
    if (!form || !initial || !hasChanges) return;
    setSaving(true);
    setErrors({});
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPatch(form, initial)),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        applyServerData(data);
        setJustSaved(true);
        toast.success('Configuración guardada');
        return;
      }
      if (data.fields && typeof data.fields === 'object') {
        setErrors(data.fields);
        const first = sectionOf(Object.keys(data.fields)[0]);
        if (first && first !== active) goTo(first);
        // Lleva al primer campo marcado (en móvil puede quedar fuera de la pantalla)
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
    setForm(initial);
    setErrors({});
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className={adminNotice('danger')}>No se pudo cargar la configuración.</p>
        <button type="button" onClick={() => window.location.reload()} className={`${adminSecondaryButton} mt-4`}>Reintentar</button>
      </div>
    );
  }

  if (!form || !initial) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className={adminSpinner} aria-label="Cargando configuración" />
      </div>
    );
  }

  const section = SECTIONS.find((item) => item.id === active) ?? SECTIONS[0];
  const sectionProps = { form, set, errors };
  const dirtyLabels = SECTIONS.filter((item) => dirtySections.has(item.id)).map((item) => item.label);

  return (
    <div className="mx-auto max-w-6xl">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Configuración</h1>
          <p className={adminPageSubtitle}>
            Datos del negocio, precios, envíos y cómo se ve la tienda.
            {meta.updatedAt && <span className="block">Último cambio: {new Date(meta.updatedAt).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
          </p>
        </div>
      </div>

      {initial.maintenanceMode && active !== 'sistema' && (
        <button type="button" onClick={() => goTo('sistema')} className={`${adminNotice('warning')} mb-5 flex w-full items-center gap-2 text-left`}>
          <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1"><strong>La tienda está en mantenimiento.</strong> Los clientes no pueden comprar.</span>
          <span className="font-semibold underline">Ver</span>
        </button>
      )}

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        {/* Menú de secciones: lateral fijo en escritorio, deslizable en móvil */}
        <nav aria-label="Secciones de configuración" className="-mx-3 mb-5 overflow-x-auto px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:mb-0 lg:overflow-visible lg:px-0">
          <ul className="flex w-max gap-1 lg:sticky lg:top-22 lg:w-auto lg:flex-col">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const selected = item.id === active;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(item.id)}
                    aria-current={selected ? 'page' : undefined}
                    className={`${adminTab(selected)} w-full lg:h-11 lg:justify-start`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {errorSections.has(item.id) ? (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${selected ? 'bg-white' : 'bg-deal'}`} aria-label="con errores" />
                    ) : dirtySections.has(item.id) ? (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${selected ? 'bg-white' : 'bg-warning'}`} aria-label="con cambios sin guardar" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-ink">{section.label}</h2>
            <p className="mt-0.5 text-sm text-muted">{section.description}</p>
          </header>

          <div className="space-y-5">
            {active === 'negocio' && <BusinessSection {...sectionProps} />}
            {active === 'precios' && (
              <PricesSection
                {...sectionProps}
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
            {active === 'envios' && <ShippingSection {...sectionProps} />}
            {active === 'tienda' && <StorefrontSection {...sectionProps} hasAlertEmails={form.adminAlertEmails.length > 0} onGoToAlerts={() => goTo('sistema')} />}
            {active === 'seo' && <SeoSection {...sectionProps} />}
            {active === 'sistema' && <SystemSection {...sectionProps} />}
          </div>

          {/* Barra de guardado: aparece con cambios y queda pegada abajo mientras se edita */}
          <div className="sticky bottom-0 z-[var(--z-sticky)] -mx-3 mt-6 px-3 pb-3 pt-2 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0" aria-live="polite">
            {hasChanges ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-white p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:pl-5">
                <p className="text-sm text-ink">
                  <strong>Cambios sin guardar</strong>
                  <span className="text-muted"> en {dirtyLabels.join(', ')}</span>
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={discard} disabled={saving} className={`${adminSecondaryButton} flex-1 whitespace-nowrap px-4 sm:flex-none`}>
                    <FiRotateCcw className="h-4 w-4" aria-hidden="true" />
                    Descartar
                  </button>
                  <button type="button" onClick={save} disabled={saving} className={`${adminPrimaryButton} flex-1 whitespace-nowrap px-4 sm:flex-none`}>
                    {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <FiSave className="h-4 w-4" aria-hidden="true" />}
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            ) : justSaved ? (
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-success-strong">
                <FiCheck className="h-4 w-4" aria-hidden="true" />
                Todo guardado
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
