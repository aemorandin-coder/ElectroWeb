'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiMapPin, FiPlus, FiEdit, FiTrash2, FiCheck, FiHome, FiBriefcase, FiPackage, FiTruck, FiX } from 'react-icons/fi';

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
    <div className="space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FiMapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mis Direcciones</h1>
              <p className="text-sm text-blue-100">{addresses.length} direcciones guardadas</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingAddress(null);
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-white text-[#2a63cd] font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-md flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Consejo:</strong> Puedes agregar direcciones físicas para entrega a domicilio o seleccionar una agencia de
          <strong> Zoom Envíos</strong> o <strong>MRW</strong> como punto de retiro.
        </p>
      </div>

      {/* Addresses Grid */}
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {address.firstName} {address.lastName}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${address.type === 'ZOOM' ? 'bg-orange-100 text-orange-700' :
                            address.type === 'MRW' ? 'bg-red-100 text-red-700' :
                              address.type === 'WORK' ? 'bg-purple-100 text-purple-700' :
                                'bg-blue-100 text-blue-700'
                          }`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      {address.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full mt-1">
                          <FiCheck className="w-3 h-3" />
                          Predeterminada
                        </span>
                      )}
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
                  {address.addressLine2 && <p>{address.addressLine2}</p>}
                  <p>{address.city}, {address.state} {address.postalCode}</p>
                  <p>{address.country}</p>
                  <p className="pt-2 border-t border-[#e9ecef] text-[#212529] font-medium">
                    {address.phone}
                  </p>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <FiMapPin className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-bold">
                    {editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}
                  </h3>
                  <p className="text-sm text-white/80">Completa los datos de envío</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Address Type Selection */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-[#212529] mb-3 uppercase tracking-wider">
                  Tipo de Dirección *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ADDRESS_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`p-3 rounded-xl border-2 transition-all text-left ${formData.type === type.id
                            ? 'border-[#2a63cd] bg-blue-50'
                            : 'border-[#e9ecef] hover:border-[#2a63cd]/50'
                          }`}
                      >
                        <TypeIcon className={`w-5 h-5 mb-1 ${formData.type === type.id ? 'text-[#2a63cd]' : 'text-[#6a6c6b]'
                          }`} />
                        <p className={`text-sm font-semibold ${formData.type === type.id ? 'text-[#2a63cd]' : 'text-[#212529]'
                          }`}>{type.label}</p>
                        <p className="text-xs text-[#6a6c6b]">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Agency Info for ZOOM/MRW */}
              {isShippingCompany && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800 mb-4">
                    <strong>📦 {formData.type === 'ZOOM' ? 'Zoom Envíos' : 'MRW'}:</strong> Ingresa los datos de la agencia donde retirarás tu pedido.
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
                {/* Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Nombre *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Apellido *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                    />
                  </div>
                </div>

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

                {/* Postal & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Código Postal</label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Teléfono *</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0414-1234567"
                      className="w-full px-4 py-2.5 border-2 border-[#e9ecef] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a63cd] focus:border-[#2a63cd]"
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
                      className="w-4 h-4 text-[#2a63cd] rounded focus:ring-[#2a63cd]"
                    />
                    <span className="text-sm text-[#212529]">Establecer como dirección predeterminada</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="p-6 border-t border-[#e9ecef] bg-white flex gap-3 flex-shrink-0">
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
