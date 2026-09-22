'use client';

import { useRef, useState } from 'react';
import { FiCheckCircle, FiExternalLink, FiHome, FiInfo, FiMapPin, FiPackage, FiTruck, FiUser } from 'react-icons/fi';
import { AYUDA_DOCUMENTO, ControlDocumento, ControlTelefono } from '@/components/forms/ControlesDatos';
import { adminCard, adminChoice, adminError, adminHint, adminInput, adminLabel, adminNotice } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import { leerDocumento, leerTelefono, nombreSchema } from '@/lib/validations/registro';
import { etiquetaModo, type Empresa, type ModoEnvio } from '@/lib/envios/empresas';
import type { DeliveryMethod, ShippingBreakdown } from '@/lib/pricing';

/**
 * Entrega del checkout (C-100). ZOOM o MRW con cobro a destino (oficina real de su lista o puerta a puerta),
 * delivery en Guanare o retiro en tienda, y quién recibe. El servidor vuelve a validar todo
 * (lib/envios/destino.ts): aquí solo se ayuda a llenarlo bien.
 */

export interface DestinatarioForm {
  name: string;
  docTipo: string;
  docNumero: string;
  telCodigo: string;
  telNumero: string;
}

export interface EnvioForm {
  deliveryMethod: DeliveryMethod;
  carrier: Empresa | '';
  mode: ModoEnvio;
  state: string;
  cityCode: string;
  city: string;
  officeCode: string;
  address: string;
  reference: string;
  /** `null`: recibe el cliente con los datos de su perfil */
  recipient: DestinatarioForm | null;
}

export const ENVIO_INICIAL: EnvioForm = {
  deliveryMethod: 'SHIPPING',
  carrier: '',
  mode: 'OFFICE',
  state: '',
  cityCode: '',
  city: '',
  officeCode: '',
  address: '',
  reference: '',
  recipient: null,
};

export interface ClienteEnvio {
  nombre: string;
  cedula: string;
  telefono: string;
}

interface Oficina {
  codigo: string;
  nombre: string;
  direccion: string;
}

interface DestinosZoom {
  estados: string[];
  ciudades: Array<{ codigo: string; nombre: string; estado: string }>;
}

interface DestinosMrw {
  estados: string[];
  agencias: Array<Oficina & { estado: string }>;
}

function destinatario(form: EnvioForm, cliente: ClienteEnvio) {
  if (!form.recipient) return { name: cliente.nombre.trim(), idNumber: cliente.cedula, phone: cliente.telefono };
  const r = form.recipient;
  return { name: r.name.trim(), idNumber: `${r.docTipo}-${r.docNumero}`, phone: `${r.telCodigo} ${r.telNumero}` };
}

/** Qué falta para poder pedir, con el mismo criterio que el servidor. `null` si está completo. */
export function validarEnvio(form: EnvioForm, cliente: ClienteEnvio): string | null {
  if (form.deliveryMethod === 'PICKUP') return null;
  const largo = (v: string) => v.trim().length;

  if (form.deliveryMethod === 'SHIPPING') {
    if (!form.carrier) return 'Elige ZOOM o MRW para tu envío.';
    if (!form.state) return 'Elige el estado de destino.';
    if (form.carrier === 'ZOOM' && !form.cityCode) return 'Elige la ciudad de destino.';
    if (form.mode === 'OFFICE' && !form.officeCode) return `Elige la ${form.carrier === 'MRW' ? 'agencia' : 'oficina'} donde vas a retirar.`;
    if (form.mode === 'DOOR' && form.carrier === 'MRW' && largo(form.city) < 2) return 'Escribe la ciudad.';
  }
  if ((form.deliveryMethod === 'LOCAL_DELIVERY' || form.mode === 'DOOR') && largo(form.address) < 10) {
    return 'Escribe la dirección completa: calle, casa o edificio.';
  }

  const d = destinatario(form, cliente);
  const nombre = nombreSchema.safeParse(d.name);
  if (!nombre.success) return `Quien recibe: ${nombre.error.issues[0]?.message ?? 'escribe su nombre y apellido'}.`;
  const doc = leerDocumento(d.idNumber);
  if (!doc.ok) return `Quien recibe: ${doc.error}.`;
  const tel = leerTelefono(d.phone);
  if (!tel.ok) return `Quien recibe: ${tel.error}.`;
  return null;
}

/** El objeto `shipping` que espera POST /api/orders. */
export function envioParaServidor(form: EnvioForm, cliente: ClienteEnvio) {
  if (form.deliveryMethod === 'PICKUP') return undefined;
  const recipient = destinatario(form, cliente);
  const conDireccion = form.deliveryMethod === 'LOCAL_DELIVERY' || form.mode === 'DOOR';
  if (form.deliveryMethod === 'LOCAL_DELIVERY') {
    return { address: form.address, reference: form.reference || undefined, recipient };
  }
  return {
    carrier: form.carrier || undefined,
    mode: form.mode,
    state: form.state || undefined,
    cityCode: form.carrier === 'ZOOM' ? form.cityCode || undefined : undefined,
    city: form.carrier === 'MRW' && form.mode === 'DOOR' ? form.city : undefined,
    officeCode: form.mode === 'OFFICE' ? form.officeCode || undefined : undefined,
    address: conDireccion ? form.address : undefined,
    reference: conDireccion ? form.reference || undefined : undefined,
    recipient,
  };
}

function partirDocumento(valor: string): { tipo: string; numero: string } {
  const m = valor.match(/^([VEJGP])-?(.*)$/);
  return m ? { tipo: m[1], numero: m[2] } : { tipo: 'V', numero: '' };
}

function partirTelefono(valor: string): { codigo: string; numero: string } {
  const m = valor.match(/^(\+\d{1,4})\s*(.*)$/);
  return m ? { codigo: m[1], numero: m[2] } : { codigo: '+58', numero: '' };
}

export default function EntregaEnvio({
  value,
  onChange,
  opciones,
  cliente,
  envio,
  items,
  direcciones,
  error,
}: {
  value: EnvioForm;
  onChange: (next: EnvioForm) => void;
  opciones: {
    nacional: boolean;
    local: boolean;
    retiro: boolean;
    tarifaLocal: number;
    retiroDireccion?: string | null;
    retiroInstrucciones?: string | null;
    tasaVES: number;
  };
  cliente: ClienteEnvio;
  envio: ShippingBreakdown;
  /** Artículos tal cual se mandan a /api/orders, para la tarifa de referencia de ZOOM */
  items: unknown[];
  direcciones: Array<{ address: string; city?: string; state?: string }>;
  error?: string;
}) {
  const [zoom, setZoom] = useState<DestinosZoom | null>(null);
  const [mrw, setMrw] = useState<DestinosMrw | null>(null);
  const [oficinasZoom, setOficinasZoom] = useState<Record<string, Oficina[]>>({});
  const [cargando, setCargando] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [tarifa, setTarifa] = useState<{ clave: string; totalBs: number; totalUSD: number | null } | null>(null);
  const ultimaTarifa = useRef('');

  const set = (cambios: Partial<EnvioForm>) => onChange({ ...value, ...cambios });
  const itemsClave = JSON.stringify(items);
  const claveTarifa = (f: EnvioForm) => `${f.cityCode}|${f.mode}|${f.mode === 'OFFICE' ? f.officeCode : ''}|${itemsClave}`;

  async function cargarJson<T>(url: string, etiqueta: string): Promise<T | null> {
    setCargando(etiqueta);
    setErrorCarga('');
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorCarga(data?.error || 'No pudimos cargar los destinos. Intenta de nuevo.');
        return null;
      }
      return data as T;
    } catch {
      setErrorCarga('Revisa tu conexión e intenta de nuevo.');
      return null;
    } finally {
      setCargando(null);
    }
  }

  async function cotizar(f: EnvioForm) {
    if (f.carrier !== 'ZOOM' || !f.cityCode || (f.mode === 'OFFICE' && !f.officeCode)) return;
    const clave = claveTarifa(f);
    ultimaTarifa.current = clave;
    try {
      const res = await fetch('/api/envios/cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, cityCode: f.cityCode, officeCode: f.officeCode, mode: f.mode }),
      });
      const data = await res.json().catch(() => null);
      if (ultimaTarifa.current !== clave) return;
      setTarifa(res.ok && data?.totalBs ? { clave, totalBs: data.totalBs, totalUSD: data.totalUSD ?? null } : null);
    } catch {
      if (ultimaTarifa.current === clave) setTarifa(null);
    }
  }

  async function elegirEmpresa(carrier: Empresa) {
    const siguiente: EnvioForm = { ...value, carrier, state: '', cityCode: '', city: '', officeCode: '' };
    onChange(siguiente);
    setTarifa(null);
    if (carrier === 'ZOOM' && !zoom) {
      const data = await cargarJson<DestinosZoom>('/api/envios/destinos?empresa=ZOOM', 'destinos');
      if (data) setZoom(data);
    }
    if (carrier === 'MRW' && !mrw) {
      const data = await cargarJson<DestinosMrw>('/api/envios/destinos?empresa=MRW', 'destinos');
      if (data) setMrw(data);
    }
  }

  function elegirModo(mode: ModoEnvio) {
    const siguiente = { ...value, mode, officeCode: '' };
    onChange(siguiente);
    setTarifa(null);
    void cotizar(siguiente);
  }

  function elegirEstado(state: string) {
    onChange({ ...value, state, cityCode: '', city: '', officeCode: '' });
    setTarifa(null);
  }

  async function elegirCiudadZoom(cityCode: string) {
    const ciudad = zoom?.ciudades.find((c) => c.codigo === cityCode);
    const siguiente: EnvioForm = { ...value, cityCode, city: ciudad?.nombre ?? '', officeCode: '' };
    onChange(siguiente);
    setTarifa(null);
    if (!cityCode) return;
    if (siguiente.mode === 'DOOR') void cotizar(siguiente);
    if (!oficinasZoom[cityCode]) {
      const data = await cargarJson<{ oficinas: Oficina[] }>(`/api/envios/oficinas?ciudad=${cityCode}`, 'oficinas');
      if (data) setOficinasZoom((prev) => ({ ...prev, [cityCode]: data.oficinas }));
    }
  }

  function elegirOficina(officeCode: string) {
    const siguiente = { ...value, officeCode };
    onChange(siguiente);
    void cotizar(siguiente);
  }

  function cambiarDestinatario(r: DestinatarioForm | null) {
    set({ recipient: r });
  }

  function editarDestinatario() {
    const doc = partirDocumento(cliente.cedula);
    const tel = partirTelefono(cliente.telefono);
    cambiarDestinatario({ name: cliente.nombre, docTipo: doc.tipo, docNumero: doc.numero, telCodigo: tel.codigo, telNumero: tel.numero });
  }

  const metodos: Array<{ id: DeliveryMethod; titulo: string; detalle: string; Icono: typeof FiTruck }> = [
    ...(opciones.nacional ? [{ id: 'SHIPPING' as const, titulo: 'Envío nacional', detalle: 'ZOOM o MRW, a oficina o a domicilio', Icono: FiTruck }] : []),
    ...(opciones.local
      ? [{
        id: 'LOCAL_DELIVERY' as const,
        titulo: 'Delivery en Guanare',
        detalle: envio.isFreeShipping || !(opciones.tarifaLocal > 0) ? 'Gratis' : formatUSD(opciones.tarifaLocal),
        Icono: FiHome,
      }]
      : []),
    ...(opciones.retiro ? [{ id: 'PICKUP' as const, titulo: 'Retiro en tienda', detalle: 'Sin costo de envío', Icono: FiMapPin }] : []),
  ];

  const ciudadesDelEstado = zoom?.ciudades.filter((c) => c.estado === value.state) ?? [];
  const agenciasDelEstado = mrw?.agencias.filter((a) => a.estado === value.state) ?? [];
  const oficinas = value.carrier === 'MRW' ? agenciasDelEstado : oficinasZoom[value.cityCode] ?? [];
  const oficina = oficinas.find((o) => o.codigo === value.officeCode);
  const estados = value.carrier === 'ZOOM' ? zoom?.estados ?? [] : value.carrier === 'MRW' ? mrw?.estados ?? [] : [];
  const pideDireccion = value.deliveryMethod === 'LOCAL_DELIVERY' || (value.deliveryMethod === 'SHIPPING' && value.mode === 'DOOR');
  const tarifaVigente = tarifa && tarifa.clave === claveTarifa(value) ? tarifa : null;
  const quien = destinatario(value, cliente);
  const otro = value.recipient;

  return (
    <section id="entrega" className={`${adminCard} space-y-5 p-5 sm:p-6`} aria-labelledby="entrega-titulo">
      <div>
        <h2 id="entrega-titulo" className="flex items-center gap-2 text-lg font-bold text-ink">
          <FiTruck className="h-5 w-5 text-brand-600" aria-hidden="true" /> Entrega
        </h2>
        <p className={adminHint}>Revisa bien los datos: el paquete sale a nombre de quien recibe.</p>
      </div>

      {metodos.length > 1 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label="Tipo de entrega">
          {metodos.map(({ id, titulo, detalle, Icono }) => (
            <button
              key={id}
              type="button"
              aria-pressed={value.deliveryMethod === id}
              onClick={() => { set({ deliveryMethod: id }); setTarifa(null); }}
              className={`${adminChoice(value.deliveryMethod === id)} flex items-center gap-3 px-3 py-3`}
            >
              <Icono className={`h-5 w-5 shrink-0 ${value.deliveryMethod === id ? 'text-brand-600' : 'text-muted'}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{titulo}</span>
                <span className="block text-xs text-muted">{detalle}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {envio.isFreeShipping && value.deliveryMethod !== 'PICKUP' && (
        <p className={`${adminNotice('success')} flex items-start gap-2`}>
          <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {envio.freeReason === 'PRODUCT'
              ? 'Tu pedido lleva un producto con envío gratis: la tienda paga el envío de todo el paquete.'
              : 'Tu compra llega al monto de envío gratis: la tienda paga el envío.'}
          </span>
        </p>
      )}

      {value.deliveryMethod === 'PICKUP' && (
        <div className={adminNotice('success')}>
          <p className="font-semibold">Retiro en nuestra tienda</p>
          {opciones.retiroDireccion && <p className="mt-1">{opciones.retiroDireccion}</p>}
          {opciones.retiroInstrucciones && <p className="mt-1">{opciones.retiroInstrucciones}</p>}
        </div>
      )}

      {value.deliveryMethod === 'SHIPPING' && (
        <div className="space-y-4">
          <div>
            <p className={adminLabel}>Empresa de envíos</p>
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Empresa de envíos">
              {(['ZOOM', 'MRW'] as const).map((empresa) => (
                <button
                  key={empresa}
                  type="button"
                  aria-pressed={value.carrier === empresa}
                  onClick={() => void elegirEmpresa(empresa)}
                  className={`${adminChoice(value.carrier === empresa)} h-12 text-center text-sm font-bold text-ink`}
                >
                  {empresa}
                </button>
              ))}
            </div>
          </div>

          {value.carrier && (
            <div>
              <p className={adminLabel}>¿Dónde lo recibes?</p>
              <div className="grid grid-cols-2 gap-3" role="group" aria-label="Dónde lo recibes">
                {(['OFFICE', 'DOOR'] as const).map((modo) => (
                  <button
                    key={modo}
                    type="button"
                    aria-pressed={value.mode === modo}
                    onClick={() => elegirModo(modo)}
                    className={`${adminChoice(value.mode === modo)} flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold text-ink`}
                  >
                    {modo === 'OFFICE' ? <FiPackage className="h-4 w-4" aria-hidden="true" /> : <FiHome className="h-4 w-4" aria-hidden="true" />}
                    {etiquetaModo(modo)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {cargando === 'destinos' && <p className={adminHint} role="status">Cargando destinos de {value.carrier}…</p>}
          {errorCarga && (
            <p className={adminNotice('danger')} role="alert">
              {errorCarga}{' '}
              {value.carrier && (
                <button type="button" className="font-semibold underline" onClick={() => void elegirEmpresa(value.carrier as Empresa)}>
                  Reintentar
                </button>
              )}
            </p>
          )}

          {value.carrier && estados.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="envio-estado" className={adminLabel}>Estado</label>
                <select id="envio-estado" value={value.state} onChange={(e) => elegirEstado(e.target.value)} className={adminInput()}>
                  <option value="">Elige el estado</option>
                  {estados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>

              {value.carrier === 'ZOOM' && value.state && (
                <div>
                  <label htmlFor="envio-ciudad" className={adminLabel}>Ciudad</label>
                  <select id="envio-ciudad" value={value.cityCode} onChange={(e) => void elegirCiudadZoom(e.target.value)} className={adminInput()}>
                    <option value="">Elige la ciudad</option>
                    {ciudadesDelEstado.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
                  </select>
                </div>
              )}

              {value.carrier === 'MRW' && value.mode === 'DOOR' && value.state && (
                <div>
                  <label htmlFor="envio-ciudad-mrw" className={adminLabel}>Ciudad</label>
                  <input id="envio-ciudad-mrw" value={value.city} maxLength={80} onChange={(e) => set({ city: e.target.value })} className={adminInput()} placeholder="Ej: Barquisimeto" />
                </div>
              )}
            </div>
          )}

          {value.mode === 'OFFICE' && value.state && (value.carrier === 'MRW' || value.cityCode) && (
            <div>
              <label htmlFor="envio-oficina" className={adminLabel}>{value.carrier === 'MRW' ? 'Agencia MRW' : 'Oficina ZOOM'}</label>
              {cargando === 'oficinas' ? (
                <p className={adminHint} role="status">Cargando oficinas…</p>
              ) : oficinas.length === 0 ? (
                <p className={adminNotice('warning')}>
                  {value.carrier === 'MRW' ? 'MRW no tiene agencias en ese estado.' : 'ZOOM no tiene oficinas con cobro a destino en esa ciudad.'} Prueba con envío a domicilio o con la otra empresa.
                </p>
              ) : (
                <select id="envio-oficina" value={value.officeCode} onChange={(e) => elegirOficina(e.target.value)} className={adminInput()}>
                  <option value="">Elige dónde retiras</option>
                  {oficinas.map((o) => <option key={o.codigo} value={o.codigo}>{o.nombre}</option>)}
                </select>
              )}
              {oficina?.direccion && (
                <p className={`${adminHint} flex items-start gap-1`}>
                  <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {oficina.direccion}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {pideDireccion && (
        <div className="space-y-4">
          <div>
            <label htmlFor="envio-direccion" className={adminLabel}>
              Dirección {value.deliveryMethod === 'LOCAL_DELIVERY' ? 'en Guanare' : 'de entrega'}
            </label>
            <input
              id="envio-direccion"
              value={value.address}
              maxLength={250}
              autoComplete="street-address"
              onChange={(e) => set({ address: e.target.value })}
              className={adminInput()}
              placeholder="Calle, casa o edificio, piso y apartamento"
            />
            {direcciones.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {direcciones.slice(0, 3).map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => set({ address: d.address, ...(value.carrier === 'MRW' && d.city && !value.city ? { city: d.city } : {}) })}
                    className="max-w-full truncate rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-200"
                  >
                    Usar: {d.address}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="envio-referencia" className={adminLabel}>Punto de referencia <span className="font-normal text-muted">(opcional)</span></label>
            <input id="envio-referencia" value={value.reference} maxLength={150} onChange={(e) => set({ reference: e.target.value })} className={adminInput()} placeholder="Frente a la plaza, casa de rejas blancas" />
          </div>
        </div>
      )}

      {value.deliveryMethod === 'SHIPPING' && value.carrier && !envio.isFreeShipping && (
        <div className={`${adminNotice('brand')} space-y-1`}>
          <p className="flex items-center gap-1.5 font-semibold"><FiInfo className="h-4 w-4" aria-hidden="true" /> Cobro a destino</p>
          <p>
            El flete se lo pagas a {value.carrier} cuando {value.mode === 'OFFICE' ? 'retires en la oficina' : 'recibas el paquete'}. Aquí solo pagas el embalaje.
          </p>
          {value.carrier === 'ZOOM' && tarifaVigente && (
            <p className="tabular-nums">
              ZOOM te cobrará aprox. <strong>{formatVES(tarifaVigente.totalBs)}</strong>
              {tarifaVigente.totalUSD ? ` (≈ ${formatUSD(tarifaVigente.totalUSD)})` : ''}. Es una referencia: la tarifa final la da ZOOM.
            </p>
          )}
          {value.carrier === 'MRW' && (
            <a href="https://mrwve.com/calcula-envio" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
              Calcula el flete en la web de MRW <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {value.deliveryMethod !== 'PICKUP' && (
        <div className="border-t border-line pt-4">
          <p className={`${adminLabel} flex items-center gap-1.5`}><FiUser className="h-4 w-4 text-brand-600" aria-hidden="true" /> Quién recibe</p>
          {!otro ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2.5 text-sm">
              <span className="min-w-0 text-ink-soft">
                <strong className="text-ink">{quien.name || 'Tú'}</strong>
                {quien.idNumber ? ` · ${quien.idNumber}` : ''}{quien.phone ? ` · ${quien.phone}` : ''}
              </span>
              <button type="button" onClick={editarDestinatario} className="text-sm font-semibold text-brand-600 hover:underline">
                Lo recibe otra persona
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="envio-quien-nombre" className={adminLabel}>Nombre y apellido</label>
                <input id="envio-quien-nombre" value={otro.name} maxLength={80} autoComplete="name" onChange={(e) => cambiarDestinatario({ ...otro, name: e.target.value })} className={adminInput()} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="envio-quien-doc" className={adminLabel}>Cédula</label>
                  <ControlDocumento
                    id="envio-quien-doc"
                    tipo={otro.docTipo}
                    numero={otro.docNumero}
                    onTipo={(docTipo) => cambiarDestinatario({ ...otro, docTipo })}
                    onNumero={(docNumero) => cambiarDestinatario({ ...otro, docNumero })}
                  />
                  <p className={adminHint}>{AYUDA_DOCUMENTO.split('.')[0]}.</p>
                </div>
                <div>
                  <label htmlFor="envio-quien-tel" className={adminLabel}>Teléfono</label>
                  <ControlTelefono
                    id="envio-quien-tel"
                    codigo={otro.telCodigo}
                    numero={otro.telNumero}
                    onCodigo={(telCodigo) => cambiarDestinatario({ ...otro, telCodigo })}
                    onNumero={(telNumero) => cambiarDestinatario({ ...otro, telNumero })}
                  />
                </div>
              </div>
              <button type="button" onClick={() => cambiarDestinatario(null)} className="text-sm font-semibold text-brand-600 hover:underline">
                Lo recibo yo
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className={adminError} role="alert">{error}</p>}
    </section>
  );
}

/** Fila "Envío" del resumen, con lo que paga el cliente aquí y lo que paga al recibir. */
export function ResumenEnvio({
  envio,
  form,
  tasaVES,
}: {
  envio: ShippingBreakdown;
  form: EnvioForm;
  tasaVES: number;
}) {
  const monto = envio.total;
  const soloDigital = envio.totalWeight === 0;
  let detalle = '';
  if (soloDigital) detalle = 'Productos digitales: sin envío';
  else if (form.deliveryMethod === 'PICKUP') detalle = 'Retiro en tienda';
  else if (envio.isFreeShipping) detalle = 'Envío gratis: lo paga la tienda';
  else if (form.deliveryMethod === 'LOCAL_DELIVERY') detalle = 'Delivery en Guanare';
  else detalle = `Embalaje. El flete lo pagas${form.carrier ? ` a ${form.carrier}` : ''} al recibir (cobro a destino)`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Envío:</span>
        {monto > 0 ? (
          <div className="text-right">
            <span className="text-base font-bold text-ink">{formatUSD(monto)}</span>
            {tasaVES > 0 && <div className="text-xs font-medium text-brand-500">{formatVES(monto * tasaVES)}</div>}
          </div>
        ) : (
          <span className="text-sm font-bold text-success-strong">Gratis</span>
        )}
      </div>
      {detalle && <p className="text-xs text-muted">{detalle}</p>}
    </div>
  );
}
