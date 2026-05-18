'use client';

import { StepProps } from './types';

export default function StepSEO({ data, onChange }: StepProps) {
  const displayTitle = data.seoTitle || data.name || 'Título del producto';
  const displayDesc = data.seoDescription || data.description?.substring(0, 160) || 'Descripción del producto...';
  const appUrl = 'https://tutienda.com';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">SEO</h2>
        <p className="text-sm text-gray-500 mt-1">
          Optimiza cómo aparece tu producto en Google y redes sociales. Este paso es opcional.
        </p>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-700">Título SEO</label>
            <span className={`text-xs font-medium ${(data.seoTitle || data.name).length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
              {(data.seoTitle || data.name).length}/70
            </span>
          </div>
          <input
            type="text"
            value={data.seoTitle}
            onChange={(e) => onChange({ seoTitle: e.target.value })}
            placeholder={data.name || 'Título del producto'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <p className="text-xs text-gray-400 mt-1">Si lo dejas vacío, se usará el nombre del producto.</p>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-700">Meta descripción</label>
            <span className={`text-xs font-medium ${(data.seoDescription || '').length > 155 ? 'text-red-500' : 'text-gray-400'}`}>
              {(data.seoDescription || '').length}/160
            </span>
          </div>
          <textarea
            value={data.seoDescription}
            onChange={(e) => onChange({ seoDescription: e.target.value })}
            rows={3}
            placeholder={data.description?.substring(0, 160) || 'Descripción breve del producto para los buscadores...'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Si lo dejas vacío, se usarán los primeros 160 caracteres de la descripción.</p>
        </div>

        {/* Google Preview */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Vista previa en Google</p>
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
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Estado del producto</p>
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
                    ? val ? 'border-green-500 bg-green-50' : 'border-gray-400 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <p className={`text-sm font-bold ${data.isActive === val ? val ? 'text-green-700' : 'text-gray-700' : 'text-gray-500'}`}>
                  {label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
