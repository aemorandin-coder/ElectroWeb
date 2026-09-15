'use client';

import { StepProps } from './types';
import { wizardInput, wizardLabel, wizardHint, wizardSectionTitle, wizardSectionHelp } from './ui';

export default function StepSEO({ data, onChange }: StepProps) {
  const displayTitle = data.seoTitle || data.name || 'Título del producto';
  const displayDesc = data.seoDescription || data.description?.substring(0, 160) || 'Descripción del producto...';
  const appUrl = 'https://tutienda.com';

  return (
    <div className="space-y-6">
      <div>
        <h2 className={wizardSectionTitle}>SEO</h2>
        <p className={wizardSectionHelp}>
          Optimiza cómo aparece tu producto en Google y redes sociales. Este paso es opcional.
        </p>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={wizardLabel}>Título SEO</label>
            <span className={`text-xs font-medium ${(data.seoTitle || data.name).length > 60 ? 'text-deal' : 'text-muted'}`}>
              {(data.seoTitle || data.name).length}/70
            </span>
          </div>
          <input
            type="text"
            value={data.seoTitle}
            onChange={(e) => onChange({ seoTitle: e.target.value })}
            placeholder={data.name || 'Título del producto'}
            className={wizardInput()}
          />
          <p className={wizardHint}>Si lo dejas vacío, se usará el nombre del producto.</p>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={wizardLabel}>Meta descripción</label>
            <span className={`text-xs font-medium ${(data.seoDescription || '').length > 155 ? 'text-deal' : 'text-muted'}`}>
              {(data.seoDescription || '').length}/160
            </span>
          </div>
          <textarea
            value={data.seoDescription}
            onChange={(e) => onChange({ seoDescription: e.target.value })}
            rows={3}
            placeholder={data.description?.substring(0, 160) || 'Descripción breve del producto para los buscadores...'}
            className={`${wizardInput()} h-auto resize-none py-2.5`}
          />
          <p className={wizardHint}>Si lo dejas vacío, se usarán los primeros 160 caracteres de la descripción.</p>
        </div>

        {/* Google Preview */}
        <div className="bg-white border border-line rounded-2xl p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-4">Vista previa en Google</p>
          <div className="space-y-0.5">
            <p className="text-sm text-[#1a0dab] hover:underline cursor-pointer font-medium truncate">
              {displayTitle} | Electro Shop
            </p>
            <p className="text-xs text-[#006621]">
              {appUrl}/productos/{data.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '...'}
            </p>
            <p className="text-sm text-[#4d5156] line-clamp-2 mt-1">
              {displayDesc}
            </p>
          </div>
        </div>

        {/* Status toggle */}
        <div className="bg-white border border-line rounded-2xl p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Estado del producto</p>
          <div className="flex gap-3">
            {[
              { val: true, label: 'Publicado', desc: 'Visible en la tienda' },
              { val: false, label: 'Borrador', desc: 'Oculto al público' },
            ].map(({ val, label, desc }) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onChange({ isActive: val })}
                className={[
                  'flex-1 p-3 rounded-xl border-2 text-left transition-all',
                  data.isActive === val
                    ? val ? 'border-success-strong bg-success-strong/10' : 'border-line-strong bg-surface'
                    : 'border-line hover:border-line-strong',
                ].join(' ')}
              >
                <p className={`text-sm font-bold ${data.isActive === val ? val ? 'text-success-strong' : 'text-ink-soft' : 'text-muted'}`}>
                  {label}
                </p>
                <p className="text-xs text-muted mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
