'use client';

import { useState } from 'react';
import { LogoEmpresa } from '@/components/envios/LogoEmpresa';
import { createPortal } from 'react-dom';
import { FiEdit2, FiHome, FiMapPin, FiPackage, FiPlus, FiStar, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useMontado } from '@/lib/hooks/useMontado';
import { ESTADOS_VENEZUELA } from '@/lib/envios/empresas';
import {
  adminBadge,
  adminChoice,
  adminHint,
  adminInput,
  adminLabel,
  adminModalBody,
  adminModalFooter,
  adminModalHeader,
  adminModalOverlay,
  adminModalPanel,
  adminModalTitle,
  adminPrimaryButton,
  adminSecondaryButton,
} from '@/lib/admin-ui';
import SelectorOficina, { OFICINA_VACIA, type EmpresaEnvio, type OficinaElegida } from '@/components/envios/SelectorOficina';

// Mis direcciones (C-24; C-137 la adapta a cómo se envía en Venezuela):
// - "Retiro en agencia" (ZOOM o MRW): la oficina se elige de la lista real (Estado → Ciudad → Oficina), con su código.
//   Antes se escribía a mano ("zoom de barquisimeto") y el checkout no la podía usar. La predeterminada, el checkout
//   la propone sola.
// - "Entrega a domicilio" (casa o trabajo): dirección escrita.
// - Quién recibe: nombre, cédula y teléfono (la agencia pide la cédula al entregar). Vacío = recibe el cliente.
// - Editar una dirección fallaba siempre: la página llamaba a /api/customer/addresses/<id>, que no existe.

type Tipo = 'HOME' | 'WORK' | 'ZOOM' | 'MRW';

interface Direccion {
  id: string;
  type: Tipo;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  phone: string;
  recipientIdNumber: string;
  isDefault: boolean;
  agencyName: string;
  agencyCode: string;
  cityCode: string;
}

interface Formulario {
  entrega: 'AGENCIA' | 'DOMICILIO';
  empresa: EmpresaEnvio;
  oficina: OficinaElegida;
  lugar: 'HOME' | 'WORK';
  addressLine1: string;
  addressLine2: string;
  state: string;
  city: string;
  firstName: string;
  lastName: string;
  recipientIdNumber: string;
  phone: string;
  isDefault: boolean;
}

const VACIO: Formulario = {
  entrega: 'AGENCIA', empresa: 'ZOOM', oficina: OFICINA_VACIA, lugar: 'HOME', addressLine1: '', addressLine2: '',
  state: '', city: '', firstName: '', lastName: '', recipientIdNumber: '', phone: '', isDefault: false,
};

const esAgencia = (t: Tipo) => t === 'ZOOM' || t === 'MRW';

function aFormulario(d: Direccion): Formulario {
  const agencia = esAgencia(d.type);
  return {
    entrega: agencia ? 'AGENCIA' : 'DOMICILIO',
    empresa: d.type === 'MRW' ? 'MRW' : 'ZOOM',
    oficina: agencia
      ? { state: d.state, cityCode: d.cityCode, city: d.city, officeCode: d.agencyCode, officeName: d.agencyName, officeAddress: d.addressLine1 !== d.agencyName ? d.addressLine1 : '' }
      : OFICINA_VACIA,
    lugar: d.type === 'WORK' ? 'WORK' : 'HOME',
    addressLine1: agencia ? '' : d.addressLine1,
    addressLine2: d.addressLine2,
    state: agencia ? '' : d.state,
    city: agencia ? '' : d.city,
    firstName: d.firstName,
    lastName: d.lastName,
    recipientIdNumber: d.recipientIdNumber,
    phone: d.phone,
    isDefault: d.isDefault,
  };
}

/** Lo que espera la API (lib/saved-addresses.ts). La agencia guarda su dirección como línea 1. */
function aCuerpo(f: Formulario) {
  const receptor = { firstName: f.firstName.trim(), lastName: f.lastName.trim(), recipientIdNumber: f.recipientIdNumber.trim(), phone: f.phone.trim(), isDefault: f.isDefault };
  if (f.entrega === 'AGENCIA') {
    return {
      type: f.empresa,
      agencyName: f.oficina.officeName,
      agencyCode: f.oficina.officeCode,
      cityCode: f.empresa === 'ZOOM' ? f.oficina.cityCode : '',
      state: f.oficina.state,
      city: f.oficina.city || f.oficina.state,
      addressLine1: f.oficina.officeAddress || f.oficina.officeName,
      addressLine2: '',
      ...receptor,
    };
  }
  return {
    type: f.lugar, agencyName: '', agencyCode: '', cityCode: '',
    state: f.state, city: f.city.trim(), addressLine1: f.addressLine1.trim(), addressLine2: f.addressLine2.trim(), ...receptor,
  };
}

function falta(f: Formulario): string | null {
  if (f.entrega === 'AGENCIA') {
    if (!f.oficina.state) return 'Elige el estado de la agencia.';
    if (f.empresa === 'ZOOM' && !f.oficina.cityCode) return 'Elige la ciudad.';
    if (!f.oficina.officeCode) return `Elige la ${f.empresa === 'MRW' ? 'agencia MRW' : 'oficina ZOOM'}.`;
  } else {
    if (f.addressLine1.trim().length < 10) return 'Escribe la dirección completa: calle, casa o edificio.';
    if (!f.state) return 'Elige el estado.';
    if (f.city.trim().length < 2) return 'Escribe la ciudad.';
  }
  return null;
}

const ETIQUETA_TIPO: Record<Tipo, string> = { ZOOM: 'Retiro en ZOOM', MRW: 'Retiro en MRW', HOME: 'Domicilio', WORK: 'Trabajo' };

export default function AddressesPage() {
  const { confirm } = useConfirm();
  const montado = useMontado();
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Direccion | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Formulario>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  useBodyScrollLock(abierto);

  const set = (cambios: Partial<Formulario>) => { setForm((f) => ({ ...f, ...cambios })); setError(''); };

  async function cargar() {
    try {
      const res = await fetch('/api/customer/addresses');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDirecciones(data.addresses || []);
    } catch {
      toast.error('No se pudieron cargar tus direcciones');
    } finally {
      setCargando(false);
    }
  }
  useCargarAlMontar(() => { void cargar(); });

  const abrir = (d: Direccion | null) => {
    setEditando(d);
    setForm(d ? aFormulario(d) : { ...VACIO, isDefault: direcciones.length === 0 });
    setError('');
    setAbierto(true);
  };

  const guardar = async () => {
    const problema = falta(form);
    if (problema) { setError(problema); return; }
    setGuardando(true);
    try {
      const res = await fetch('/api/customer/addresses', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando ? { id: editando.id, ...aCuerpo(form) } : aCuerpo(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'No se pudo guardar la dirección'); return; }
      setDirecciones(data.addresses || []);
      setAbierto(false);
      toast.success(editando ? 'Dirección actualizada' : 'Dirección guardada');
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const predeterminar = async (d: Direccion) => {
    const res = await fetch('/api/customer/addresses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id, isDefault: true }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'No se pudo cambiar'); return; }
    setDirecciones(data.addresses || []);
    toast.success('Ahora es tu dirección predeterminada');
  };

  const borrar = async (d: Direccion) => {
    const ok = await confirm({ title: 'Eliminar dirección', message: `¿Eliminar "${esAgencia(d.type) ? d.agencyName : d.addressLine1}"?`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    const res = await fetch(`/api/customer/addresses?id=${encodeURIComponent(d.id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'No se pudo eliminar'); return; }
    setDirecciones(data.addresses || []);
    toast.success('Dirección eliminada');
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink lg:text-2xl">Direcciones de envío</h1>
          <p className="mt-0.5 text-sm text-ink-soft">Guarda tu agencia ZOOM o MRW y el checkout la usa sola.</p>
        </div>
        <button type="button" onClick={() => abrir(null)} className={`${adminPrimaryButton} h-11 shrink-0`}>
          <FiPlus className="h-4 w-4" aria-hidden="true" /> Agregar
        </button>
      </header>

      {cargando ? (
        <div className="grid gap-3 lg:grid-cols-2" aria-label="Cargando direcciones">
          {[1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-line bg-white" />)}
        </div>
      ) : direcciones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-white px-4 py-10 text-center">
          <FiMapPin className="mx-auto h-8 w-8 text-subtle" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-ink">Todavía no tienes direcciones</p>
          <p className="mt-1 text-sm text-muted">Agrega la agencia donde retiras tus pedidos.</p>
          <button type="button" onClick={() => abrir(null)} className={`${adminPrimaryButton} mt-4 h-11`}>
            <FiPlus className="h-4 w-4" aria-hidden="true" /> Agregar dirección
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {direcciones.map((d) => {
            const agencia = esAgencia(d.type);
            const receptor = [[d.firstName, d.lastName].filter(Boolean).join(' '), d.recipientIdNumber, d.phone].filter(Boolean).join(' · ');
            return (
              <li key={d.id} className={`flex flex-col rounded-2xl border bg-white p-4 ${d.isDefault ? 'border-brand-200 ring-1 ring-brand-200' : 'border-line'}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {agencia ? (
                    // C-137: logo oficial de la empresa (pedido de Andrés), como en el checkout
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                      Retiro en <LogoEmpresa empresa={d.type as EmpresaEnvio} className="h-3.5" />
                    </span>
                  ) : (
                    <span className={adminBadge('neutral')}>
                      <FiHome className="h-3.5 w-3.5" aria-hidden="true" />
                      {ETIQUETA_TIPO[d.type] ?? 'Dirección'}
                    </span>
                  )}
                  {d.isDefault && <span className={adminBadge('success')}><FiStar className="h-3.5 w-3.5" aria-hidden="true" />Predeterminada</span>}
                </div>
                <p className="mt-2 text-sm font-semibold text-ink [overflow-wrap:anywhere]">
                  {agencia ? d.agencyName || 'Agencia sin elegir' : d.addressLine1}
                  {agencia && d.agencyCode && <span className="font-normal text-muted"> · {d.agencyCode}</span>}
                </p>
                <p className="text-sm text-ink-soft [overflow-wrap:anywhere]">
                  {agencia ? (d.addressLine1.trim().toLowerCase() !== d.agencyName.trim().toLowerCase() ? d.addressLine1 : '') : d.addressLine2}
                </p>
                <p className="text-sm text-muted">{[d.city, d.state].filter(Boolean).join(', ')}</p>
                {receptor && <p className="mt-1 text-xs text-ink-soft">Recibe: {receptor}</p>}
                {agencia && !d.agencyCode && (
                  <p className="mt-1 text-xs font-medium text-warning-strong">Escrita a mano: edítala y elige la oficina de la lista para usarla en el checkout.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {!d.isDefault && (
                    <button type="button" onClick={() => void predeterminar(d)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface">
                      <FiStar className="h-4 w-4" aria-hidden="true" /> Predeterminada
                    </button>
                  )}
                  <button type="button" onClick={() => abrir(d)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface">
                    <FiEdit2 className="h-4 w-4" aria-hidden="true" /> Editar
                  </button>
                  <button type="button" onClick={() => void borrar(d)} aria-label="Eliminar dirección" className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-deal-bg hover:text-deal">
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {montado && abierto && createPortal(
        <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="dir-titulo">
          <div className={`${adminModalPanel} max-w-xl`}>
            <div className={adminModalHeader}>
              <h2 id="dir-titulo" className={adminModalTitle}>{editando ? 'Editar dirección' : 'Nueva dirección'}</h2>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink">
                <FiX className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className={`${adminModalBody} space-y-5`}>
              <fieldset>
                <legend className={adminLabel}>¿Cómo recibes tus pedidos?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([['AGENCIA', 'Retiro en agencia', 'ZOOM o MRW, cobro a destino', FiPackage], ['DOMICILIO', 'A domicilio', 'Casa o trabajo', FiHome]] as const).map(([id, titulo, detalle, Icono]) => (
                    <label key={id} className={`${adminChoice(form.entrega === id)} flex cursor-pointer items-start gap-2 p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500`}>
                      <input type="radio" name="entrega" className="sr-only" checked={form.entrega === id} onChange={() => set({ entrega: id })} />
                      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{titulo}</span>
                        <span className="block text-xs text-muted">{detalle}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.entrega === 'AGENCIA' ? (
                <div className="space-y-3">
                  <fieldset>
                    <legend className={adminLabel}>Empresa</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {(['ZOOM', 'MRW'] as const).map((e) => (
                        <label key={e} className={`${adminChoice(form.empresa === e)} flex h-11 cursor-pointer items-center justify-center text-sm font-bold text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500`}>
                          <input type="radio" name="empresa" className="sr-only" checked={form.empresa === e} onChange={() => set({ empresa: e, oficina: OFICINA_VACIA })} />
                          <LogoEmpresa empresa={e} className={e === 'MRW' ? 'h-5' : 'h-6'} />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <SelectorOficina key={form.empresa} empresa={form.empresa} value={form.oficina} onChange={(oficina) => set({ oficina })} idBase="dir-oficina" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {([['HOME', 'Casa'], ['WORK', 'Trabajo']] as const).map(([id, titulo]) => (
                      <label key={id} className={`${adminChoice(form.lugar === id)} flex h-11 cursor-pointer items-center justify-center text-sm font-semibold text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500`}>
                        <input type="radio" name="lugar" className="sr-only" checked={form.lugar === id} onChange={() => set({ lugar: id })} />
                        {titulo}
                      </label>
                    ))}
                  </div>
                  <div>
                    <label htmlFor="dir-linea1" className={adminLabel}>Dirección</label>
                    <input id="dir-linea1" value={form.addressLine1} maxLength={200} onChange={(e) => set({ addressLine1: e.target.value })} placeholder="Calle, casa o edificio, número" className={adminInput()} />
                  </div>
                  <div>
                    <label htmlFor="dir-linea2" className={adminLabel}>Punto de referencia <span className="font-normal text-muted">(opcional)</span></label>
                    <input id="dir-linea2" value={form.addressLine2} maxLength={200} onChange={(e) => set({ addressLine2: e.target.value })} placeholder="Frente a la plaza, portón azul" className={adminInput()} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="dir-estado" className={adminLabel}>Estado</label>
                      <select id="dir-estado" value={form.state} onChange={(e) => set({ state: e.target.value })} className={adminInput()}>
                        <option value="">Elige el estado</option>
                        {ESTADOS_VENEZUELA.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="dir-ciudad" className={adminLabel}>Ciudad</label>
                      <input id="dir-ciudad" value={form.city} maxLength={80} onChange={(e) => set({ city: e.target.value })} placeholder="Ej: Guanare" className={adminInput()} />
                    </div>
                  </div>
                </div>
              )}

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-ink">Quién recibe</legend>
                <p className={adminHint}>Si lo dejas vacío, recibes tú con los datos de tu perfil.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dir-nombre" className={adminLabel}>Nombre</label>
                    <input id="dir-nombre" value={form.firstName} maxLength={60} onChange={(e) => set({ firstName: e.target.value })} autoComplete="given-name" className={adminInput()} />
                  </div>
                  <div>
                    <label htmlFor="dir-apellido" className={adminLabel}>Apellido</label>
                    <input id="dir-apellido" value={form.lastName} maxLength={60} onChange={(e) => set({ lastName: e.target.value })} autoComplete="family-name" className={adminInput()} />
                  </div>
                  <div>
                    <label htmlFor="dir-cedula" className={adminLabel}>Cédula</label>
                    <input id="dir-cedula" value={form.recipientIdNumber} maxLength={20} onChange={(e) => set({ recipientIdNumber: e.target.value.toUpperCase() })} placeholder="V-12345678" autoCapitalize="characters" className={adminInput()} />
                  </div>
                  <div>
                    <label htmlFor="dir-telefono" className={adminLabel}>Teléfono</label>
                    <input id="dir-telefono" value={form.phone} maxLength={20} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} placeholder="04121234567" autoComplete="tel" className={adminInput()} />
                  </div>
                </div>
              </fieldset>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} className="h-4 w-4 rounded text-brand-600" />
                <span className="text-sm text-ink"><strong className="font-semibold">Predeterminada:</strong> el checkout la propone primero</span>
              </label>

              {error && <p className="text-sm font-medium text-deal" role="alert">{error}</p>}
            </div>
            <div className={adminModalFooter}>
              <button type="button" onClick={() => setAbierto(false)} className={`${adminSecondaryButton} h-11`}>Cancelar</button>
              <button type="button" onClick={() => void guardar()} disabled={guardando} className={`${adminPrimaryButton} h-11`}>
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar dirección'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
