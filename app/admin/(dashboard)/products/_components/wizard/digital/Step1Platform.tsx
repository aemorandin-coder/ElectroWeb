'use client';

import { useState, type ReactNode } from 'react';
import { BsNintendoSwitch } from 'react-icons/bs';
import { FaAmazon, FaXbox } from 'react-icons/fa6';
import { FiCheck, FiGift, FiKey, FiPackage, FiStar, FiX } from 'react-icons/fi';
import { MdSportsEsports } from 'react-icons/md';
import { SiApple, SiGoogleplay, SiNetflix, SiPlaystation, SiRoblox, SiSpotify, SiSteam } from 'react-icons/si';
import { DIGITAL_PLATFORMS, DIGITAL_REGIONS, DIGITAL_UNITS, getPlatform } from '@/lib/digital-catalog';
import { rowsFromPlatform, type StepProps } from '../types';
import { wizardCard, wizardChoice, wizardError, wizardHint, wizardInput, wizardLabel, wizardSectionHelp, wizardSectionTitle } from '../ui';

const PLATFORM_ICONS: Record<string, ReactNode> = {
  PLAYSTATION: <SiPlaystation />, XBOX: <FaXbox />, ROBLOX: <SiRoblox />, STEAM: <SiSteam />, NINTENDO: <BsNintendoSwitch />,
  NETFLIX: <SiNetflix />, SPOTIFY: <SiSpotify />, APPLE: <SiApple />, GOOGLE_PLAY: <SiGoogleplay />, AMAZON: <FaAmazon />,
  GIFT_CARD: <FiGift />, SOFTWARE: <FiKey />, OTHER: <FiPackage />,
};
const iconFor = (value: string) => PLATFORM_ICONS[value] ?? <MdSportsEsports />;

/**
 * Paso 1 del producto digital (C-60): plataforma, región y datos básicos.
 * Elegir la plataforma carga su plantilla (unidad, montos típicos, entrega, dato de cuenta e instrucciones)
 * sin pisar lo que el admin ya escribió.
 */
export default function DigitalStep1Platform({ data, onChange, errors, categories }: StepProps) {
  const [tagInput, setTagInput] = useState('');
  const featured = DIGITAL_PLATFORMS.filter((p) => p.featured);
  const others = DIGITAL_PLATFORMS.filter((p) => !p.featured);

  const choosePlatform = (value: string) => {
    const preset = getPlatform(value);
    if (!preset) return;
    // Los montos solo se reemplazan si todavía no hay precios cargados
    const untouched = data.digitalVariants.every((v) => !v.id && !v.priceUSD && !v.costUSD);
    onChange({
      digitalPlatform: value,
      digitalRegion: preset.region,
      deliveryMethod: preset.delivery,
      ...(untouched ? { digitalVariants: rowsFromPlatform(value) } : {}),
      accountFieldLabel: data.accountFieldLabel || preset.accountFieldLabel,
      accountFieldHint: data.accountFieldHint || preset.accountFieldHint,
      redemptionInstructions: data.redemptionInstructions || preset.instructions,
    });
  };

  const addTag = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const value = tagInput.trim();
    if (value && !data.tags.includes(value)) onChange({ tags: [...data.tags, value] });
    setTagInput('');
  };

  const selected = getPlatform(data.digitalPlatform);

  return (
    <div className="space-y-7">
      <div>
        <h2 className={wizardSectionTitle}>Plataforma</h2>
        <p className={wizardSectionHelp}>Al elegirla cargamos sus montos típicos, cómo se entrega y las instrucciones de canje. Luego puedes cambiar todo.</p>
      </div>

      <fieldset>
        <legend className={wizardLabel}>
          Las que más vendes <span className="text-deal" aria-hidden="true">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {featured.map((p) => {
            const isSelected = data.digitalPlatform === p.value;
            return (
              <button key={p.value} type="button" onClick={() => choosePlatform(p.value)} aria-pressed={isSelected} className={`${wizardChoice(isSelected)} relative flex flex-col items-start gap-3 p-4`}>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${isSelected ? 'bg-brand-500 text-white' : 'bg-surface text-ink'}`}>{iconFor(p.value)}</span>
                <span>
                  <span className="block text-sm font-bold text-ink">{p.label}</span>
                  <span className="block text-xs text-muted">{DIGITAL_UNITS[p.unit].name}</span>
                </span>
                {isSelected && <FiCheck className="absolute right-3 top-3 h-5 w-5 text-brand-600" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Otras plataformas</p>
        <div className="flex flex-wrap gap-2">
          {others.map((p) => {
            const isSelected = data.digitalPlatform === p.value;
            return (
              <button key={p.value} type="button" onClick={() => choosePlatform(p.value)} aria-pressed={isSelected} className={`${wizardChoice(isSelected)} inline-flex h-10 items-center gap-2 px-3 text-sm font-medium text-ink`}>
                <span className={isSelected ? 'text-brand-600' : 'text-muted'} aria-hidden="true">{iconFor(p.value)}</span>
                {p.label}
              </button>
            );
          })}
        </div>
        {errors.digitalPlatform && <p className={wizardError}>{errors.digitalPlatform}</p>}
      </fieldset>

      <fieldset>
        <legend className={wizardLabel}>Región donde funciona el código</legend>
        <div className="flex flex-wrap gap-2">
          {DIGITAL_REGIONS.map((r) => (
            <button key={r.value} type="button" onClick={() => onChange({ digitalRegion: r.value })} aria-pressed={data.digitalRegion === r.value} className={`${wizardChoice(data.digitalRegion === r.value)} h-10 px-3 text-sm font-medium text-ink`}>
              {r.label}
            </button>
          ))}
        </div>
        <p className={wizardHint}>Se muestra en la tienda para que el cliente sepa si le sirve en su cuenta.</p>
      </fieldset>

      <div className={`${wizardCard} space-y-4`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Información del producto</p>
        <div>
          <label htmlFor="digital-name" className={wizardLabel}>Nombre <span className="text-deal" aria-hidden="true">*</span></label>
          <input
            id="digital-name"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={selected ? `Ej: Tarjeta ${selected.label} (${selected.region === 'USA' ? 'Estados Unidos' : 'Global'})` : 'Nombre del producto digital'}
            className={wizardInput(Boolean(errors.name))}
          />
          {errors.name && <p className={wizardError}>{errors.name}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="digital-sku" className={wizardLabel}>SKU <span className="text-deal" aria-hidden="true">*</span></label>
            <input id="digital-sku" value={data.sku} onChange={(e) => onChange({ sku: e.target.value.toUpperCase() })} placeholder="Ej: GC-PSN-USA" className={`${wizardInput(Boolean(errors.sku))} font-mono`} />
            {errors.sku && <p className={wizardError}>{errors.sku}</p>}
          </div>
          <div>
            <label htmlFor="digital-category" className={wizardLabel}>Categoría <span className="text-deal" aria-hidden="true">*</span></label>
            <select id="digital-category" value={data.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })} className={wizardInput(Boolean(errors.categoryId))}>
              <option value="">Seleccionar…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className={wizardError}>{errors.categoryId}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="digital-description" className={wizardLabel}>Descripción</label>
          <textarea
            id="digital-description"
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            placeholder="¿Qué puede comprar el cliente con este saldo o tarjeta?"
            className={`${wizardInput()} h-auto resize-none py-2.5`}
          />
        </div>
        <div>
          <label htmlFor="digital-tags" className={wizardLabel}>Etiquetas</label>
          <input id="digital-tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Escribe y presiona Enter" className={wizardInput()} />
          {data.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <li key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {tag}
                  <button type="button" onClick={() => onChange({ tags: data.tags.filter((t) => t !== tag) })} aria-label={`Quitar etiqueta ${tag}`} className="text-brand-700 hover:text-ink"><FiX className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface">
          <input type="checkbox" checked={data.isFeatured} onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-4 w-4 accent-brand-500" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink">Producto destacado</span>
            <span className="block text-xs text-muted">Aparece en “Destacados de la semana” del home</span>
          </span>
          <FiStar className={`h-5 w-5 ${data.isFeatured ? 'fill-current text-warning' : 'text-line'}`} aria-hidden="true" />
        </label>
      </div>
    </div>
  );
}
