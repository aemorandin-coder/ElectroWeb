'use client';

import Image from 'next/image';
import { FiCheck, FiAlertCircle, FiTag, FiPackage, FiMonitor } from 'react-icons/fi';
import { MdOutlineLocalShipping } from 'react-icons/md';
import { WizardData } from './types';

interface Props {
  data: WizardData;
  errors: Record<string, string>;
  isLoading: boolean;
  isEditing: boolean;
  onPublish: () => void;
  onDraft: () => void;
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? 'text-green-700' : 'text-amber-700'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-100' : 'bg-amber-100'}`}>
        {ok ? <FiCheck className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
      </div>
      {label}
    </div>
  );
}

export default function StepPublish({ data, errors, isLoading, isEditing, onPublish, onDraft }: Props) {
  const mainImage = data.images[0] ?? null;

  const isPhysical = data.productType === 'PHYSICAL';
  const isDigital = data.productType === 'DIGITAL';

  const enabledDenominations = data.digitalPricing.filter(p => p.enabled);
  const displayPrice = isDigital && enabledDenominations.length > 0
    ? Math.min(...enabledDenominations.map(p => p.salePrice))
    : parseFloat(data.priceUSD || '0');

  const comparePrice = parseFloat(data.compareAtPriceUSD || '0');
  const hasDiscount = comparePrice > 0 && comparePrice > displayPrice;

  // Readiness checklist
  const checks = isPhysical ? [
    { ok: !!data.name.trim(), label: 'Nombre del producto' },
    { ok: !!data.sku.trim(), label: 'SKU' },
    { ok: !!data.categoryId, label: 'Categoría asignada' },
    { ok: data.images.length > 0, label: 'Al menos una imagen' },
    { ok: displayPrice > 0, label: 'Precio de venta' },
    { ok: !!data.weightKg && parseFloat(data.weightKg) > 0, label: 'Peso (requerido para envío)' },
    { ok: Object.keys(data.specifications).length >= 3, label: 'Mínimo 3 especificaciones técnicas' },
  ] : [
    { ok: !!data.name.trim(), label: 'Nombre del producto' },
    { ok: !!data.sku.trim(), label: 'SKU' },
    { ok: !!data.digitalPlatform, label: 'Plataforma seleccionada' },
    { ok: !!data.categoryId, label: 'Categoría asignada' },
    { ok: data.images.length > 0, label: 'Al menos una imagen' },
    { ok: enabledDenominations.length >= 2, label: 'Mínimo 2 denominaciones activas' },
  ];

  const allGood = checks.every(c => c.ok);
  const warningCount = checks.filter(c => !c.ok).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Vista previa y publicación</h2>
        <p className="text-sm text-gray-500 mt-1">Así verá el cliente tu producto en la tienda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product card preview */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Vista de tarjeta</p>
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm max-w-xs">
            {/* Image */}
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              {mainImage ? (
                <Image src={mainImage} alt={data.name} fill className="object-cover" sizes="300px" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                  {isPhysical ? <MdOutlineLocalShipping className="w-12 h-12 mb-2" /> : <FiMonitor className="w-12 h-12 mb-2" />}
                  <p className="text-xs font-medium">Sin imagen</p>
                </div>
              )}
              {hasDiscount && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  -{Math.round((1 - displayPrice / comparePrice) * 100)}%
                </div>
              )}
              {data.isFeatured && (
                <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                  Destacado
                </div>
              )}
              {isDigital && (
                <div className="absolute bottom-3 left-3 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <FiMonitor className="w-3 h-3" /> Digital
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-1">{data.categoryId ? '(categoría)' : 'Sin categoría'}</p>
              <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 mb-3">
                {data.name || 'Nombre del producto'}
              </h3>

              {isDigital && enabledDenominations.length > 0 ? (
                <div className="flex flex-wrap gap-1 mb-3">
                  {enabledDenominations.slice(0, 4).map(d => (
                    <span key={d.amount} className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                      ${d.amount}
                    </span>
                  ))}
                  {enabledDenominations.length > 4 && (
                    <span className="text-xs text-gray-400 font-medium">+{enabledDenominations.length - 4}</span>
                  )}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {displayPrice > 0 ? `$${displayPrice.toFixed(2)}` : '—'}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-gray-400 line-through">${comparePrice.toFixed(2)}</span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs">
                {isPhysical ? (
                  parseInt(data.stock || '0') > 0
                    ? <span className="text-green-600 font-medium">✓ En stock ({data.stock} unidades)</span>
                    : <span className="text-red-500 font-medium">✗ Sin stock</span>
                ) : (
                  <span className="text-purple-600 font-medium flex items-center gap-1">
                    <FiMonitor className="w-3 h-3" />
                    {data.deliveryMethod === 'INSTANT' ? 'Entrega instantánea' : 'Recarga directa'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Lista de verificación</p>

          <div className={[
            'p-4 rounded-2xl border-2',
            allGood ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
          ].join(' ')}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${allGood ? 'bg-green-500' : 'bg-amber-500'}`}>
                {allGood ? <FiCheck className="w-4 h-4 text-white" /> : <FiAlertCircle className="w-4 h-4 text-white" />}
              </div>
              <p className={`text-sm font-bold ${allGood ? 'text-green-800' : 'text-amber-800'}`}>
                {allGood ? '¡Listo para publicar!' : `${warningCount} campo${warningCount !== 1 ? 's' : ''} pendiente${warningCount !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="space-y-2">
              {checks.map((c, i) => <CheckRow key={i} ok={c.ok} label={c.label} />)}
            </div>
          </div>

          {errors.images && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
              {errors.images}
            </div>
          )}

          {/* Summary */}
          {data.name && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                  {isPhysical ? <><MdOutlineLocalShipping className="w-4 h-4 text-blue-500" /> Físico</> : <><FiMonitor className="w-4 h-4 text-purple-500" /> Digital</>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SKU</span>
                <span className="font-mono text-gray-900 text-xs">{data.sku || '—'}</span>
              </div>
              {isPhysical && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Precio</span>
                  <span className="font-bold text-gray-900">{displayPrice > 0 ? `$${displayPrice.toFixed(2)}` : '—'}</span>
                </div>
              )}
              {isDigital && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Denominaciones</span>
                  <span className="font-bold text-purple-700">{enabledDenominations.length} activas</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Imágenes</span>
                <span className={`font-semibold ${data.images.length > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {data.images.length} / 8
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onDraft}
          disabled={isLoading}
          className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          Guardar como Borrador
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={isLoading || !allGood}
          className="flex-1 px-6 py-3.5 bg-[#1a1a1a] text-white font-bold rounded-xl hover:bg-[#333] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/10"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <FiCheck className="w-5 h-5" />
              {isEditing ? 'Guardar cambios' : 'Publicar producto'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
