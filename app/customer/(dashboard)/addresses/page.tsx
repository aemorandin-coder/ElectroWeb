'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiMapPin, FiPlus, FiEdit, FiTrash2, FiCheck, FiHome, FiBriefcase, FiPackage, FiTruck, FiX, FiInfo, FiZap } from 'react-icons/fi';

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

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/customer/addresses');
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingAddress
        ? '/api/customer/addresses'
        : '/api/customer/addresses';
      const method = editingAddress ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAddress ? { id: editingAddress.id, ...formData } : formData),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingAddress(null);
        resetForm();
        fetchAddresses();
      }
    } catch (error) {
      console.error('Error saving address:', error);
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
    if (!confirm('¿Estás seguro de eliminar esta dirección?')) return;

    try {
      const response = await fetch(`/api/customer/addresses?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchAddresses();
      }
    } catch (error) {
      console.error('Error deleting address:', error);
    }
  };

  const getTypeInfo = (type: string) => {
    return ADDRESS_TYPES.find(t => t.id === type) || ADDRESS_TYPES[0];
  };

  const isShippingCompany = formData.type === 'ZOOM' || formData.type === 'MRW';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 lg:space-y-6 overflow-y-auto h-full">
      {/* Header - Responsive */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-lg lg:rounded-xl p-3 lg:p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FiMapPin className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
            <div>
              <h1 className="text-base lg:text-2xl font-bold">Direcciones</h1>
              <p className="text-[10px] lg:text-sm text-blue-100">{addresses.length} guardadas</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingAddress(null);
              resetForm();
              setShowModal(true);
            }}
            className="px-3 lg:px-4 py-2 bg-white text-[#2a63cd] font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-md flex items-center gap-1.5 lg:gap-2 text-xs lg:text-base"
          >
            <FiPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {/* Info Box - Compact on mobile */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg lg:rounded-xl p-2.5 lg:p-4">
        <p className="text-xs lg:text-sm text-blue-800 flex items-start gap-2">
          <FiZap className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
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
                className="bg-white rounded-xl border border-[#e9ecef] shadow-sm hover:shadow-md transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${address.type === 'ZOOM' ? 'bg-orange-100' :
                      address.type === 'MRW' ? 'bg-red-100' :
                        'bg-[#f8f9fa]'
                      }`}>
                      <TypeIcon className={`w-4 h-4 ${address.type === 'ZOOM' ? 'text-orange-600' :
                        address.type === 'MRW' ? 'text-red-600' :
                          'text-[#2a63cd]'
                        }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#212529]">
                          {typeInfo.label}
                        </h3>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            <FiCheck className="w-3 h-3" />
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6a6c6b] mt-0.5">{address.city}, {address.state}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(address)}
                      className="p-2 text-[#2a63cd] hover:bg-[#f8f9fa] rounded-lg transition-all"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-[#6a6c6b]">
                  {(address.type === 'ZOOM' || address.type === 'MRW') && address.agencyName && (
                    <p className="font-medium text-[#212529]">
                      Agencia: {address.agencyName} {address.agencyCode && `(${address.agencyCode})`}
                    </p>
                  )}
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p className="text-xs">{address.addressLine2}</p>}
                  <p>{address.city}, {address.state} {address.postalCode && `- ${address.postalCode}`}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm p-12 text-center">
          <FiMapPin className="w-16 h-16 text-[#6a6c6b] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#212529] mb-2">
            No tienes direcciones guardadas
          </h3>
          <p className="text-[#6a6c6b] mb-6">
            Agrega direcciones de envío para agilizar tus compras
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-md"
          >
            <FiPlus className="w-5 h-5" />
            Agregar Dirección
          </button>
        </div>
      )}

      {/* Modal - Using Portal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100001] flex items-center justify-center p-3 lg:p-4 bg-black/60 backdrop-blur-sm">
          {/* FLOATING CLOSE BUTTON - OUTSIDE MODAL */}
          <button
            onClick={() => setShowModal(false)}
            className="fixed top-3 right-3 lg:top-4 lg:right-4 w-11 h-11 lg:w-12 lg:h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-10"
            aria-label="Cerrar"
          >
            <FiX className="w-6 h-6 text-gray-700" />
          </button>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white px-4 lg:px-6 py-2.5 lg:py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 lg:gap-3">
                  <FiMapPin className="w-5 h-5 lg:w-6 lg:h-6" />
                  <div>
                    <h3 className="text-sm lg:text-lg font-bold">
                      {editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}
                    </h3>
                    <p className="text-[9px] lg:text-sm text-white/80">Completa los datos</p>
                  </div>
                </div>
                {/* Save Icon in Header - Mobile Only */}
                <button
                  onClick={handleSubmit}
                  className="sm:hidden p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all active:scale-90"
                >
                  <FiCheck className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-4 lg:p-6 overflow-y-auto flex-1">
              {/* Address Type Selection */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-[#212529] mb-3 uppercase tracking-wider">
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
                        className={`p-2 lg:p-3 rounded-xl border-2 transition-all text-left group ${formData.type === type.id
                          ? 'border-[#2a63cd] bg-blue-50/50 shadow-sm'
                          : 'border-[#e9ecef] hover:border-[#2a63cd]/30'
                          }`}
                      >
                        <TypeIcon className={`w-4 h-4 lg:w-5 lg:h-5 mb-1 ${formData.type === type.id ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'
                          }`} />
                        <p className={`text-[11px] lg:text-sm font-bold leading-tight mb-0.5 ${formData.type === type.id ? 'text-[#2a63cd]' : 'text-[#212529]'
                          }`}>{type.label}</p>
                        <p className={`text-[9px] ${formData.type === type.id ? 'text-[#2a63cd]/70' : 'text-[#6a6c6b]'}`}>{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Agency Info for ZOOM/MRW */}
              {isShippingCompany && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800 mb-4 flex items-center gap-2">
                    <FiPackage className="w-4 h-4 flex-shrink-0" />
                    <span><strong>{formData.type === 'ZOOM' ? 'Zoom Envíos' : 'MRW'}:</strong> Ingresa los datos de la agencia donde retirarás tu pedido.</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#212529] mb-2">Nombre de Agencia *</label>
                      <input
                        type="text"
                        value={formData.agencyName || ''}
                        onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                        placeholder={formData.type === 'ZOOM' ? 'Zoom Centro Guanare' : 'MRW Guanare'}
                        className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#212529] mb-2">Código de Agencia</label>
                      <input
                        type="text"
                        value={formData.agencyCode || ''}
                        onChange={(e) => setFormData({ ...formData, agencyCode: e.target.value })}
                        placeholder="Ej: GUA-001"
                        className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-[#212529] mb-2">
                    {isShippingCompany ? 'Dirección de la Agencia *' : 'Dirección *'}
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    placeholder={isShippingCompany ? 'Av. Principal, Centro Comercial...' : 'Calle, Avenida, Casa/Apto...'}
                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#212529] mb-2">Referencia (Opcional)</label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    placeholder="Punto de referencia, local, piso..."
                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                  />
                </div>

                {/* City & State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Ciudad *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Estado *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                    />
                  </div>
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-[#212529] mb-2">Código Postal</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="(Opcional)"
                    className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                  />
                </div>

                {/* Default */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-[#2a63cd] rounded focus:ring-[#2a63cd]"
                    />
                    <span className="text-sm text-[#212529]">Establecer como dirección predeterminada</span>
                  </label>
                </div>

                {/* Info Note */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <FiInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Nota:</strong> Los datos de contacto (nombre, teléfono, cédula) se tomarán automáticamente de tu perfil registrado.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer - Desktop only */}
            <div className="hidden sm:flex p-6 border-t border-[#e9ecef] bg-white gap-3 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 bg-[#f8f9fa] text-[#212529] font-semibold rounded-xl hover:bg-[#e9ecef] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
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
