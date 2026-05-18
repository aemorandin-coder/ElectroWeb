'use client';

import { FiSend, FiLayers } from 'react-icons/fi';
import { StepProps } from '../types';

export default function DigitalStep3Delivery({ data, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Método de entrega</h2>
        <p className="text-sm text-gray-500 mt-1">
          Define cómo recibirá el cliente su producto después del pago.
        </p>
      </div>

      {/* Delivery method */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            val: 'INSTANT' as const,
            icon: <FiSend className="w-6 h-6" />,
            title: 'Envío Instantáneo',
            desc: 'El sistema entrega el código automáticamente al completar el pago.',
            badge: 'Automático',
            color: 'blue',
          },
          {
            val: 'MANUAL' as const,
            icon: <FiLayers className="w-6 h-6" />,
            title: 'Recarga Directa',
            desc: 'El admin recarga manualmente en la plataforma del cliente. Se solicita username al comprar.',
            badge: 'Manual',
            color: 'purple',
          },
        ].map(({ val, icon, title, desc, badge, color }) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange({ deliveryMethod: val })}
            className={[
              'p-6 rounded-2xl border-2 text-left transition-all',
              data.deliveryMethod === val
                ? color === 'blue' ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100' : 'border-purple-500 bg-purple-50 shadow-sm shadow-purple-100'
                : 'border-gray-200 hover:border-gray-300',
            ].join(' ')}
          >
            <div className={[
              'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
              data.deliveryMethod === val
                ? color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                : 'bg-gray-100 text-gray-400',
            ].join(' ')}>
              {icon}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`text-sm font-bold ${data.deliveryMethod === val ? color === 'blue' ? 'text-blue-800' : 'text-purple-800' : 'text-gray-800'}`}>
                {title}
              </h3>
              <span className={[
                'text-xs px-2 py-0.5 rounded-full font-medium',
                data.deliveryMethod === val
                  ? color === 'blue' ? 'bg-blue-200 text-blue-700' : 'bg-purple-200 text-purple-700'
                  : 'bg-gray-100 text-gray-500',
              ].join(' ')}>
                {badge}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>

      {/* MANUAL note */}
      {data.deliveryMethod === 'MANUAL' && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
          <p className="text-sm font-semibold text-purple-800 mb-1">Nota sobre Recarga Directa</p>
          <p className="text-sm text-purple-700">
            Al seleccionar este método, el cliente deberá ingresar su <strong>usuario o ID de cuenta</strong> en la plataforma antes de agregar al carrito. Recibirás esta información en el pedido.
          </p>
        </div>
      )}

      {/* Stock */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock disponible</label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="0"
            value={data.stock}
            onChange={(e) => onChange({ stock: e.target.value })}
            className="w-36 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
          <div>
            <button
              type="button"
              onClick={() => onChange({ stock: '999' })}
              className="text-xs text-purple-600 hover:underline font-medium"
            >
              Establecer en 999 (ilimitado)
            </button>
            <p className="text-xs text-gray-400 mt-0.5">Para productos digitales se recomienda un stock alto.</p>
          </div>
        </div>
      </div>

      {/* Redemption instructions */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Instrucciones de canje{' '}
          <span className="text-gray-400 font-normal text-xs">(opcional)</span>
        </label>
        <textarea
          value={data.redemptionInstructions}
          onChange={(e) => onChange({ redemptionInstructions: e.target.value })}
          rows={5}
          placeholder={`1. Abre la tienda de ${data.digitalPlatform || 'la plataforma'}\n2. Ve a "Canjear código"\n3. Ingresa el código recibido\n4. ¡Listo! Disfruta tu recarga`}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-y text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Estas instrucciones se muestran al cliente en la confirmación del pedido.
        </p>
      </div>
    </div>
  );
}
