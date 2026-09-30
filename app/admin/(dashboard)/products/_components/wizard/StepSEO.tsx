'use client';

import { StepProps } from './types';
import { wizardInput, wizardSectionTitle, wizardSectionHelp } from './ui';
import { Campo } from './Campo';

// C-134: sin el selector "Estado del producto: Publicado / Borrador". No hacía nada: lo que decide son los botones
// del último paso ("Publicar" o "Guardar como borrador") y, al editar, el producto conserva su estado.
// La vista previa usa los colores de la tienda (tenía hex de Google) y el dominio real (decía "tutienda.com").
const TITULO_MAX = 70;
const DESCRIPCION_MAX = 160;

export default function StepSEO({ data, onChange }: StepProps) {
  const titulo = data.seoTitle || data.name;
  const descripcion = data.seoDescription || data.description?.substring(0, DESCRIPCION_MAX) || '';
  const slug = data.name ? data.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'producto';

  return (
    <div className="space-y-5">
      <div>
        <h2 className={wizardSectionTitle}>Google y redes</h2>
        <p className={wizardSectionHelp}>Opcional. Si lo dejas vacío, se usan el nombre y la descripción.</p>
      </div>

      <Campo
        id="seo-titulo"
        label={<span className="flex w-full justify-between gap-2">Título <span className={`font-normal tabular-nums ${titulo.length > 60 ? 'text-warning-strong' : 'text-muted'}`}>{titulo.length}/{TITULO_MAX}</span></span>}
      >
        <input
          id="seo-titulo"
          type="text"
          value={data.seoTitle}
          maxLength={TITULO_MAX}
          onChange={(e) => onChange({ seoTitle: e.target.value })}
          placeholder={data.name || 'Título del producto'}
          className={wizardInput()}
        />
      </Campo>

      <Campo
        id="seo-descripcion"
        label={<span className="flex w-full justify-between gap-2">Descripción <span className={`font-normal tabular-nums ${data.seoDescription.length > 150 ? 'text-warning-strong' : 'text-muted'}`}>{data.seoDescription.length}/{DESCRIPCION_MAX}</span></span>}
      >
        <textarea
          id="seo-descripcion"
          value={data.seoDescription}
          maxLength={DESCRIPCION_MAX}
          onChange={(e) => onChange({ seoDescription: e.target.value })}
          rows={3}
          placeholder={data.description?.substring(0, DESCRIPCION_MAX) || 'Una o dos frases que hagan clic'}
          className={`${wizardInput()} h-auto resize-none py-2.5`}
        />
      </Campo>

      <div className="rounded-xl border border-line p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Así se ve en Google</p>
        <p className="truncate text-base font-medium text-brand-700">{titulo || 'Título del producto'} | Electro Shop</p>
        <p className="truncate text-xs text-success-strong">electroshopve.com › productos › {slug}</p>
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{descripcion || 'Descripción del producto…'}</p>
      </div>
    </div>
  );
}
