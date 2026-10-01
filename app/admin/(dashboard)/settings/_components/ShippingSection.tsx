'use client';

import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { adminError, adminIconButton, adminInput, adminNotice, adminSecondaryButton } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { MAX_EMPAQUES, armarPaquetes, empaquesSugeridos, leerReglasEmbalaje, resumenEmbalaje, type LineaEmbalaje } from '@/lib/embalaje';
import { empaqueAForm, type EmpaqueForm, type SectionProps } from './settings-form';
import { NumberField, SettingsCard, SwitchRow, TextAreaField, TextField } from './fields';

// C-153: pedidos de ejemplo para que el dueño vea, mientras escribe, qué empaque elige la tienda y cuánto cobra
const EJEMPLOS: Array<{ titulo: string; lineas: LineaEmbalaje[] }> = [
  { titulo: 'Unos audífonos (15 × 5 × 5 cm)', lineas: [{ nombre: 'Audífonos', cantidad: 1, pesoKg: 0.25, dimensions: '{"length":15,"width":5,"height":5}', consolidable: true }] },
  { titulo: 'Un teclado (45 × 15 × 4 cm)', lineas: [{ nombre: 'Teclado', cantidad: 1, pesoKg: 0.8, dimensions: '{"length":45,"width":15,"height":4}', consolidable: true }] },
  {
    titulo: 'Los audífonos y el teclado juntos',
    lineas: [
      { nombre: 'Audífonos', cantidad: 1, pesoKg: 0.25, dimensions: '{"length":15,"width":5,"height":5}', consolidable: true },
      { nombre: 'Teclado', cantidad: 1, pesoKg: 0.8, dimensions: '{"length":45,"width":15,"height":4}', consolidable: true },
    ],
  },
  { titulo: 'Un monitor marcado "Bulto aparte"', lineas: [{ nombre: 'Monitor', cantidad: 1, pesoKg: 4, dimensions: '{"length":60,"width":40,"height":15}', consolidable: false }] },
];

const CAMPOS_EMPAQUE = [['largoCm', 'Largo'], ['anchoCm', 'Ancho'], ['altoCm', 'Alto']] as const;

// C-100: ZOOM y MRW con cobro a destino (el cliente paga el flete al recibir), envío gratis por producto
// o desde un monto (la tienda paga la guía), y delivery propio en Guanare con tarifa fija.
export default function ShippingSection({ form, set, errors }: SectionProps) {
  const packaging = Number(form.packagingFeeUSD) || 0;
  const freeFrom = Number(form.freeDeliveryThresholdUSD) || 0;
  const freePackagingFrom = Number(form.freePackagingThresholdUSD) || 0;
  const localFee = Number(form.deliveryFeeUSD) || 0;

  // C-153: empaques de la tienda
  const reglas = form.packagingRules;
  const setReglas = (cambio: Partial<typeof reglas>) => set('packagingRules', { ...reglas, ...cambio });
  const setEmpaque = (indice: number, cambio: Partial<EmpaqueForm>) =>
    setReglas({ empaques: reglas.empaques.map((e, i) => (i === indice ? { ...e, ...cambio } : e)) });
  const activar = (activo: boolean) =>
    // La primera vez se ofrecen empaques sugeridos a partir del precio único de hoy (la caja mediana queda en ese
    // precio) y ese mismo precio como "bulto aparte": un punto de partida que el dueño ajusta
    setReglas(activo && reglas.empaques.length === 0
      ? { activo, empaques: empaquesSugeridos(packaging).map(empaqueAForm), bultoAparteUSD: form.packagingFeeUSD || '0' }
      : { activo });
  const agregarEmpaque = () =>
    setReglas({ empaques: [...reglas.empaques, { id: `empaque-${Date.now().toString(36)}`, nombre: '', largoCm: '', anchoCm: '', altoCm: '', precioUSD: '' }] });
  // Lo que la tienda haría con lo escrito hasta ahora (los empaques a medio llenar no cuentan)
  const reglasVivas = leerReglasEmbalaje(reglas);
  const ejemplos = reglas.activo && reglasVivas.empaques.length > 0
    ? EJEMPLOS.map((ejemplo) => ({ titulo: ejemplo.titulo, plan: armarPaquetes(ejemplo.lineas, reglasVivas) }))
    : [];

  return (
    <>
      <SettingsCard title="Envíos nacionales con ZOOM y MRW" description="Para productos físicos. Los digitales se entregan siempre sin envío.">
        <div className="space-y-5">
          <SwitchRow
            label="Hacer envíos nacionales"
            description="Apagado, el checkout no ofrece ZOOM ni MRW y la tienda deja de anunciar envíos a toda Venezuela."
            checked={form.deliveryEnabled}
            onChange={(v) => set('deliveryEnabled', v)}
            error={errors.deliveryEnabled}
          />
          {form.deliveryEnabled && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {reglas.activo ? (
                  <NumberField
                    label="Embalaje gratis desde"
                    prefix="$"
                    value={form.freePackagingThresholdUSD}
                    onChange={(v) => set('freePackagingThresholdUSD', v)}
                    error={errors.freePackagingThresholdUSD}
                    step={0.01}
                    placeholder="Siempre se cobra"
                    hint="Compras físicas desde este monto no pagan embalaje. El flete lo sigue pagando el cliente."
                  />
                ) : (
                  <NumberField label="Embalaje" prefix="$" value={form.packagingFeeUSD} onChange={(v) => set('packagingFeeUSD', v)} error={errors.packagingFeeUSD} step={0.01} hint="Precio único por pedido: lo único que cobra la tienda por el envío" />
                )}
                <NumberField
                  label="Envío gratis desde"
                  prefix="$"
                  value={form.freeDeliveryThresholdUSD}
                  onChange={(v) => set('freeDeliveryThresholdUSD', v)}
                  error={errors.freeDeliveryThresholdUSD}
                  step={0.01}
                  placeholder="Sin envío gratis"
                  hint="Compras físicas desde este monto: la tienda paga la guía."
                />
                {!reglas.activo && (
                  <NumberField
                    label="Embalaje gratis desde"
                    prefix="$"
                    value={form.freePackagingThresholdUSD}
                    onChange={(v) => set('freePackagingThresholdUSD', v)}
                    error={errors.freePackagingThresholdUSD}
                    step={0.01}
                    placeholder="Siempre se cobra"
                    hint="Compras físicas desde este monto no pagan embalaje. El flete lo sigue pagando el cliente."
                  />
                )}
              </div>
              <div className={adminNotice('brand')}>
                <p className="font-semibold">Cobro a destino</p>
                <p className="mt-1">
                  El cliente le paga el flete a ZOOM o MRW cuando retira o recibe su paquete. En el checkout paga solo el embalaje
                  ({reglas.activo ? 'según el paquete' : formatUSD(packaging)}) y ve la tarifa de ZOOM como referencia.
                </p>
                {freePackagingFrom > 0 && (
                  <p className="mt-1">
                    Embalaje gratis: la compra física de {formatUSD(freePackagingFrom)} o más no paga embalaje, pero el flete sigue siendo del cliente.
                    El carrito le avisa cuánto le falta.
                  </p>
                )}
                <p className="mt-1">
                  Envío gratis (no paga nada y la tienda paga la guía): si el paquete lleva un producto con &quot;Envío gratis&quot; en su ficha
                  {freeFrom > 0 ? ` o la compra física es de ${formatUSD(freeFrom)} o más` : ''}.
                </p>
              </div>
            </>
          )}
        </div>
      </SettingsCard>

      {form.deliveryEnabled && (
        <SettingsCard title="Embalaje según el paquete" description="La tienda arma el paquete con las medidas de cada producto y cobra el empaque que hace falta.">
          <div className="space-y-5">
            <SwitchRow
              label="Calcular el embalaje con las medidas de los productos"
              description="Un sobre para unos audífonos, una caja para un teclado, y todo lo que se pueda en un solo paquete. Apagado, se cobra el precio único por pedido."
              checked={reglas.activo}
              onChange={activar}
            />
            {reglas.activo && (
              <>
                <div>
                  <p className="text-sm font-semibold text-ink">Tus empaques</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Las medidas de adentro, en centímetros, y lo que cobras por cada uno. La tienda elige el más barato en el que quepa el pedido.
                  </p>
                  <ul className="mt-3 space-y-3">
                    {reglas.empaques.map((empaque, i) => (
                      <li key={empaque.id} className="grid grid-cols-6 items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[minmax(0,1fr)_4.75rem_4.75rem_4.75rem_6.5rem_2.75rem]">
                        <label className="col-span-6 min-w-0 sm:col-span-1">
                          <span className="mb-1 block text-xs font-medium text-muted">Empaque</span>
                          <input value={empaque.nombre} maxLength={40} onChange={(e) => setEmpaque(i, { nombre: e.target.value })} placeholder="Caja pequeña" className={adminInput()} />
                        </label>
                        {CAMPOS_EMPAQUE.map(([campo, etiqueta]) => (
                          <label key={campo} className="col-span-2 min-w-0 sm:col-span-1">
                            <span className="mb-1 block text-xs font-medium text-muted">{etiqueta} <span aria-hidden="true">cm</span></span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="any"
                              value={empaque[campo]}
                              onChange={(e) => setEmpaque(i, { [campo]: e.target.value })}
                              aria-label={`${etiqueta} de ${empaque.nombre || 'el empaque'} en centímetros`}
                              className={`${adminInput()} px-2 tabular-nums`}
                            />
                          </label>
                        ))}
                        <label className="col-span-4 min-w-0 sm:col-span-1">
                          <span className="mb-1 block text-xs font-medium text-muted">Precio</span>
                          <span className="relative block">
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-muted">$</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step={0.01}
                              value={empaque.precioUSD}
                              onChange={(e) => setEmpaque(i, { precioUSD: e.target.value })}
                              aria-label={`Precio de ${empaque.nombre || 'el empaque'}`}
                              className={`${adminInput()} pl-7 tabular-nums`}
                            />
                          </span>
                        </label>
                        <div className="col-span-2 flex justify-end sm:col-span-1">
                          <button
                            type="button"
                            onClick={() => setReglas({ empaques: reglas.empaques.filter((_, j) => j !== i) })}
                            className={adminIconButton}
                            aria-label={`Quitar ${empaque.nombre || 'el empaque'}`}
                          >
                            <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {errors.packagingRules && <p className={adminError} role="alert">{errors.packagingRules}</p>}
                  {reglas.empaques.length < MAX_EMPAQUES && (
                    <button type="button" onClick={agregarEmpaque} className={`${adminSecondaryButton} mt-3`}>
                      <FiPlus className="h-4 w-4" aria-hidden="true" /> Agregar empaque
                    </button>
                  )}
                </div>

                <NumberField
                  label="Bulto aparte"
                  prefix="$"
                  value={reglas.bultoAparteUSD}
                  onChange={(v) => setReglas({ bultoAparteUSD: v })}
                  step={0.01}
                  hint='Por cada producto que viaja en su propia caja: los marcados "Bulto aparte" y los que no caben en ningún empaque.'
                  className="max-w-xs"
                />

                {ejemplos.length > 0 && (
                  <div className={adminNotice('neutral')}>
                    <p className="font-semibold text-ink">Así cobra la tienda con estos empaques</p>
                    <ul className="mt-1 space-y-0.5 tabular-nums">
                      {ejemplos.map(({ titulo, plan }) => plan && (
                        <li key={titulo}>
                          {titulo}: <strong className="text-ink">{resumenEmbalaje(plan)}</strong>, {formatUSD(plan.totalUSD)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2">
                      Cada pedido guarda su plan: en la orden verás qué empaque usar, qué va dentro, cuántas piezas son y el peso para la guía.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </SettingsCard>
      )}

      <SettingsCard title="Delivery en Guanare" description="Tu propio delivery dentro de la ciudad.">
        <div className="space-y-5">
          <SwitchRow
            label="Ofrecer delivery en Guanare"
            description="El cliente escribe su dirección y paga la tarifa fija. Gratis si el pedido tiene envío gratis."
            checked={form.localDeliveryEnabled}
            onChange={(v) => set('localDeliveryEnabled', v)}
          />
          {form.localDeliveryEnabled && (
            <NumberField
              label="Tarifa del delivery"
              prefix="$"
              value={form.deliveryFeeUSD}
              onChange={(v) => set('deliveryFeeUSD', v)}
              error={errors.deliveryFeeUSD}
              step={0.01}
              hint={localFee > 0 ? `El cliente paga ${formatUSD(localFee)} por pedido.` : 'Con 0, el delivery es gratis siempre.'}
              className="max-w-xs"
            />
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Retiro en tienda">
        <div className="space-y-5">
          <SwitchRow
            label="Permitir retiro en tienda"
            description="El cliente elige retirar en el checkout y no paga envío."
            checked={form.pickupEnabled}
            onChange={(v) => set('pickupEnabled', v)}
          />
          {form.pickupEnabled && (
            <div className="grid grid-cols-1 gap-4">
              <TextField label="Dirección de retiro" value={form.pickupAddress} onChange={(v) => set('pickupAddress', v)} error={errors.pickupAddress} maxLength={250} placeholder="Carrera 5, frente a la plaza Miranda, Guanare" hint="Se muestra en la ficha del producto y en el checkout." />
              <TextAreaField label="Instrucciones" value={form.pickupInstructions} onChange={(v) => set('pickupInstructions', v)} error={errors.pickupInstructions} maxLength={500} rows={2} placeholder="Horario de retiro y qué traer (cédula, número de orden)" />
            </div>
          )}
        </div>
      </SettingsCard>
    </>
  );
}
