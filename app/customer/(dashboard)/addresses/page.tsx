'use client';

import { useState, useEffect } from 'react';
import { FiMapPin, FiPlus, FiEdit, FiTrash2, FiCheck, FiHome, FiBriefcase } from 'react-icons/fi';

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
        });
        fetchAddresses();
      }
    } catch (error) {
      console.error('Error saving address:', error);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2a63cd]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-white text-[#2a63cd] font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-md flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      {/* Addresses Grid */}
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white rounded-xl border border-[#e9ecef] shadow-sm hover:shadow-md transition-all p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] flex items-center justify-center">
                    {address.type === 'HOME' ? (
                      <FiHome className="w-4 h-4 text-[#2a63cd]" />
                    ) : (
                      <FiBriefcase className="w-4 h-4 text-[#2a63cd]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#212529]">
                      {address.firstName} {address.lastName}
                    </h3>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
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
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>{address.city}, {address.state} {address.postalCode}</p>
                <p>{address.country}</p>
                <p className="pt-2 border-t border-[#e9ecef] text-[#212529] font-medium">
                  {address.phone}
                </p>
              </div>
            </div>
          ))}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-[#212529] mb-6">
                {editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Nombre</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Apellido</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#212529] mb-2">Dirección Línea 1</label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="w-full px-4 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#212529] mb-2">Dirección Línea 2 (Opcional)</label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="w-full px-4 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Ciudad</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Estado</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Código Postal</label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#212529] mb-2">Teléfono</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e9ecef] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2a63cd]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-[#2a63cd] rounded focus:ring-[#2a63cd]"
                    />
                    <span className="text-sm text-[#212529]">Dirección predeterminada</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-[#f8f9fa] text-[#212529] font-semibold rounded-lg hover:bg-[#e9ecef] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-3 bg-[#2a63cd] text-white font-semibold rounded-lg hover:bg-[#1e4ba3] transition-all shadow-lg"
                >
                  {editingAddress ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
