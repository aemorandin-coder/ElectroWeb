'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiMapPin, FiPlus, FiEdit, FiTrash2, FiCheck, FiHome, FiBriefcase, FiPackage, FiTruck, FiX, FiInfo } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  adminCard,
  adminPrimaryButton,
  adminSecondaryButton,
  adminLabel,
  adminModalOverlay,
  adminModalPanel,
} from '@/lib/admin-ui';

// Address types including shipping companies
const ADDRESS_TYPES = [
  { id: 'HOME', label: 'Dirección Física', description: 'Entrega a domicilio', icon: FiHome },
  { id: 'WORK', label: 'Trabajo/Oficina', description: 'Dirección laboral', icon: FiBriefcase },
  { id: 'ZOOM', label: 'Zoom Envíos', description: 'Agencia Zoom más cercana', icon: FiPackage },
  { id: 'MRW', label: 'MRW', description: 'Agencia MRW más cercana', icon: FiTruck },
];

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  type?: string;
  agencyName?: string;
  agencyCode?: string;
}

export default function AddressesPage() {
  const { confirm } = useConfirm();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Partial<Address>>({
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Venezuela',
    phone: '',
    isDefault: false,
    type: 'HOME',
    agencyName: '',
    agencyCode: '',
  });

  useBodyScrollLock(showModal);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/customer/addresses');
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      } else {
        toast.error('No se pudieron cargar tus direcciones');
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast.error('No se pudieron cargar tus direcciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.addressLine1 || !formData.city || !formData.state) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if ((formData.type === 'ZOOM' || formData.type === 'MRW') && !formData.agencyName) {
      toast.error('Por favor ingresa el nombre de la agencia');
      return;
    }

    try {
      const url = editingAddress
        ? `/api/customer/addresses/${editingAddress.id}`
        : '/api/customer/addresses';
      const method = editingAddress ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAddress ? { id: editingAddress.id, ...formData } : formData),
      });

      if (response.ok) {
        toast.success(editingAddress ? 'Dirección actualizada' : 'Dirección guardada');
        setShowModal(false);
        setEditingAddress(null);
        resetForm();
        fetchAddresses();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'No se pudo guardar la dirección');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('No se pudo guardar la dirección');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Venezuela',
      phone: '',
      isDefault: false,
      type: 'HOME',
      agencyName: '',
      agencyCode: '',
    });
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData(address);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ title: 'Eliminar dirección', message: '¿Estás seguro de eliminar esta dirección?', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/customer/addresses?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Dirección eliminada');
        fetchAddresses();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'No se pudo eliminar la dirección');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('No se pudo eliminar la dirección');
    }
  };

  const getTypeInfo = (type: string) => {
    return ADDRESS_TYPES.find(t => t.id === type) || ADDRESS_TYPES[0];
  };

  const isShippingCompany = formData.type === 'ZOOM' || formData.type === 'MRW';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className={`${adminCard} p-4 lg:p-6 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0">
            <FiMapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-ink">Direcciones</h1>
            <p className="text-xs lg:text-sm text-muted">{addresses.length} guardadas</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingAddress(null);
            resetForm();
            setShowModal(true);
          }}
          className={`${adminPrimaryButton} text-xs lg:text-sm`}
        >
          <FiPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-surface border border-line rounded-xl p-3 lg:p-4">
        <p className="text-xs lg:text-sm text-ink-soft flex items-start gap-2">
          <FiInfo className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
          <span><strong>Tip:</strong> Agrega direcciones físicas o agencias de <strong>Zoom</strong> / <strong>MRW</strong>.</span>
        </p>
      </div>

      {/* Addresses Grid */}
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
          {addresses.map((address) => {
            const typeInfo = getTypeInfo(address.type || 'HOME');
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={address.id}
                className={`${adminCard} p-5 lg:p-6 transition-all hover:border-brand-500/40`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      address.type === 'ZOOM' ? 'bg-warning/10 text-warning-strong' :
                      address.type === 'MRW' ? 'bg-deal-bg text-deal' :
                      'bg-brand-50 text-brand-500'
                    }`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-ink text-sm lg:text-base">
                          {typeInfo.label}
                        </h3>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success-strong text-xs font-semibold rounded-full">
                            <FiCheck className="w-3 h-3" />
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{address.city}, {address.state}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(address)}
                      className="p-2 text-brand-500 hover:bg-surface rounded-lg transition-all"
                      aria-label="Editar"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className="p-2 text-deal hover:bg-deal-bg rounded-lg transition-all"
                      aria-label="Eliminar"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted">
                  {(address.type === 'ZOOM' || address.type === 'MRW') && address.agencyName && (
                    <p className="font-medium text-ink">
                      Agencia: {address.agencyName} {address.agencyCode && `(${address.agencyCode})`}
                    </p>
                  )}
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p className="text-xs text-subtle">{address.addressLine2}</p>}
                  <p>{address.city}, {address.state} {address.postalCode && `- ${address.postalCode}`}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${adminCard} p-12 text-center`}>
          <FiMapPin className="w-16 h-16 text-subtle mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink mb-2">
            No tienes direcciones guardadas
          </h3>
          <p className="text-muted text-sm mb-6">
            Agrega direcciones de envío para agilizar tus compras
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={`${adminPrimaryButton} inline-flex items-center gap-2`}
          >
            <FiPlus className="w-5 h-5" />
            Agregar Dirección
          </button>
        </div>
      )}

      {/* Modal - Using Portal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className={adminModalOverlay}>
          {/* FLOATING CLOSE BUTTON - OUTSIDE MODAL (Desktop Only) */}
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="hidden sm:flex fixed top-4 right-4 w-10 h-10 bg-white hover:bg-surface text-ink rounded-full items-center justify-center border border-line shadow-md active:scale-95 transition-all z-10"
            aria-label="Cerrar"
          >
            <FiX className="w-5 h-5 text-ink-soft" />
          </button>

          <div className={`${adminModalPanel} w-full max-w-[700px] h-[92dvh] sm:h-auto sm:max-h-[90dvh] overflow-hidden flex flex-col`}>
            {/* Modal Header */}
            <div className="bg-surface border-b border-line px-5 lg:px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0">
                    <FiMapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base lg:text-lg font-bold text-ink">
                      {editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}
                    </h3>
                    <p className="text-xs lg:text-sm text-muted">Completa los datos de envío</p>
                  </div>
                </div>
                {/* Save & Close Icons in Header - Mobile Only */}
                <div className="flex sm:hidden items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2 text-muted hover:bg-surface rounded-lg transition-all"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="p-2 bg-brand-500 text-white rounded-lg transition-all shadow-sm"
                  >
                    <FiCheck className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-4 lg:p-6 overflow-y-auto flex-1 space-y-5">
              {/* Address Type Selection */}
              <div>
                <label className={adminLabel}>
                  Tipo de Dirección *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ADDRESS_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`p-2 lg:p-3 rounded-xl border transition-all text-left group ${
                          formData.type === type.id
                            ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                            : 'border-line hover:border-brand-500/40 bg-white'
                        }`}
                      >
                        <TypeIcon className={`w-4 h-4 lg:w-5 lg:h-5 mb-1 ${
                          formData.type === type.id ? 'text-brand-500' : 'text-muted'
                        }`} />
                        <p className={`text-xs lg:text-sm font-bold leading-tight mb-0.5 ${
                          formData.type === type.id ? 'text-brand-500' : 'text-ink'
                        }`}>{type.label}</p>
                        <p className={`text-xs ${
                          formData.type === type.id ? 'text-brand-500/70' : 'text-muted'
                        }`}>{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Agency Info for ZOOM/MRW */}
              {isShippingCompany && (
                <div className="bg-surface border border-line rounded-xl p-4">
                  <p className="text-sm text-ink-soft mb-4 flex items-center gap-2">
                    <FiPackage className="w-4 h-4 flex-shrink-0 text-brand-500" />
                    <span><strong>{formData.type === 'ZOOM' ? 'Zoom Envíos' : 'MRW'}:</strong> Ingresa los datos de la agencia donde retirarás tu pedido.</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={adminLabel}>Nombre de la Agencia *</label>
                      <div className="relative">
                        <FiPackage className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                        <input
                          type="text"
                          value={formData.agencyName || ''}
                          onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                          placeholder="Ej: Agencia Principal La Florida"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={adminLabel}>Código de Agencia</label>
                      <div className="relative">
                        <FiInfo className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                        <input
                          type="text"
                          value={formData.agencyCode || ''}
                          onChange={(e) => setFormData({ ...formData, agencyCode: e.target.value })}
                          placeholder="Ej: GUA-001"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Address */}
                <div>
                  <label className={adminLabel}>
                    {isShippingCompany ? 'Dirección de la Agencia *' : 'Dirección *'}
                  </label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                    <input
                      type="text"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      placeholder={isShippingCompany ? 'Av. Principal, Centro Comercial...' : 'Calle, Avenida, Casa/Apto...'}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                    />
                  </div>
                </div>

                <div>
                  <label className={adminLabel}>Referencia (Opcional)</label>
                  <div className="relative">
                    <FiInfo className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                    <input
                      type="text"
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                      placeholder="Punto de referencia, local, piso..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                    />
                  </div>
                </div>

                {/* City & State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={adminLabel}>Ciudad *</label>
                    <div className="relative">
                      <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={adminLabel}>Estado *</label>
                    <div className="relative">
                      <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                      />
                    </div>
                  </div>
                </div>

                {/* Postal Code */}
                <div>
                  <label className={adminLabel}>Código Postal</label>
                  <div className="relative">
                    <FiInfo className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="(Opcional)"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-line focus:border-brand-500 focus:bg-white rounded-xl outline-none transition-all text-ink placeholder:text-subtle"
                    />
                  </div>
                </div>

                {/* Default */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-brand-500 rounded border-line focus:ring-brand-500"
                    />
                    <span className="text-sm text-ink">Establecer como dirección predeterminada</span>
                  </label>
                </div>

                {/* Info Note */}
                <div className="p-3 bg-surface border border-line rounded-xl">
                  <p className="text-xs text-muted flex items-start gap-2">
                    <FiInfo className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Nota:</strong> Los datos de contacto (nombre, teléfono, cédula) se tomarán automáticamente de tu perfil registrado.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer - Desktop only */}
            <div className="hidden sm:flex p-6 border-t border-line bg-white gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`${adminSecondaryButton} flex-1`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className={`${adminPrimaryButton} flex-1`}
              >
                {editingAddress ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
