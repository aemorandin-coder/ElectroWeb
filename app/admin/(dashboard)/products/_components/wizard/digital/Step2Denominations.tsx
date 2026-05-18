'use client';

import { StepProps } from '../types';

export default function DigitalStep2Denominations({ data, onChange, errors }: StepProps) {
  const updateRow = (index: number, field: 'cost' | 'salePrice' | 'enabled', value: any) => {
    const next = [...data.digitalPricing];
    next[index] = { ...next[index], [field]: value };
    onChange({ digitalPricing: next });
  };

  const applyMargin = () => {
    const m = data.digitalMarginPercent / 100;
    onChange({
      digitalPricing: data.digitalPricing.map((p) => ({
        ...p,
        salePrice: parseFloat((p.cost * (1 + m)).toFixed(2)),
      })),
    });
  };

  const enabledRows = data.digitalPricing.filter(p => p.enabled);
  const avgMargin = enabledRows.length > 0
    ? (enabledRows.reduce((acc, p) => acc + (p.cost > 0 ? (p.salePrice - p.cost) / p.cost * 100 : 0), 0) / enabledRows.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Denominaciones y precios</h2>
        <p className="text-sm text-gray-500 mt-1">
          Habilita los montos disponibles y define el costo y precio de venta de cada uno.
          Mínimo <strong>2 denominaciones</strong>.
        </p>
      </div>

      {/* Margin controls */}
      <div className="flex items-center gap-4 p-4 bg-purple-50 border border-purple-100 rounded-2xl">
        <div className="flex-1">
          <p className="text-sm font-semibold text-purple-900">Aplicar margen global</p>
          <p className="text-xs text-purple-600 mt-0.5">Recalcula todos los precios de venta basado en el margen.</p>
        </div>
        <div className="flex items-center bg-white rounded-xl border border-purple-200 overflow-hidden">
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={data.digitalMarginPercent}
            onChange={(e) => onChange({ digitalMarginPercent: parseFloat(e.target.value) || 0 })}
            className="w-16 px-2 py-2 text-center text-sm font-bold text-purple-700 focus:outline-none"
          />
          <span className="pr-3 text-sm text-purple-500 font-medium">%</span>
        </div>
        <button
          type="button"
          onClick={applyMargin}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
        >
          Aplicar
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-purple-50 to-indigo-50">
              <th className="px-4 py-3 text-left">
                <label className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.digitalPricing.every(p => p.enabled)}
                    onChange={(e) => onChange({ digitalPricing: data.digitalPricing.map(p => ({ ...p, enabled: e.target.checked })) })}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300"
                  />
                  Monto
                </label>
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Costo (USD)</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Precio Venta</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Ganancia</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Margen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.digitalPricing.map((row, i) => {
              const rowProfit = row.salePrice - row.cost;
              const rowMargin = row.cost > 0 ? ((rowProfit / row.cost) * 100).toFixed(1) : '0';
              return (
                <tr
                  key={row.amount}
                  className={row.enabled ? 'bg-white hover:bg-purple-50/30 transition-colors' : 'bg-gray-50 opacity-50'}
                >
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => updateRow(i, 'enabled', e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300"
                      />
                      <span className={`text-lg font-bold ${row.enabled ? 'text-purple-700' : 'text-gray-400'}`}>
                        ${row.amount}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.cost}
                        onChange={(e) => updateRow(i, 'cost', parseFloat(e.target.value) || 0)}
                        disabled={!row.enabled}
                        className="w-24 pl-5 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.salePrice}
                        onChange={(e) => updateRow(i, 'salePrice', parseFloat(e.target.value) || 0)}
                        disabled={!row.enabled}
                        className="w-24 pl-5 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold text-sm ${rowProfit > 0 ? 'text-green-600' : rowProfit < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {rowProfit >= 0 ? '+' : ''}{rowProfit.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                      parseFloat(rowMargin) >= 10 ? 'bg-green-100 text-green-700' :
                      parseFloat(rowMargin) > 0   ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700',
                    ].join(' ')}>
                      {rowMargin}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-purple-900">Habilitados: </span>
          <span className="text-sm text-purple-700">
            {enabledRows.length > 0 ? enabledRows.map(p => `$${p.amount}`).join(', ') : 'Ninguno'}
          </span>
        </div>
        {avgMargin && (
          <div className="text-right">
            <span className="text-xs text-purple-500">Margen promedio</span>
            <p className="text-lg font-bold text-purple-800">{avgMargin}%</p>
          </div>
        )}
      </div>

      {errors.digitalPricing && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700 font-medium">{errors.digitalPricing}</p>
        </div>
      )}
    </div>
  );
}
