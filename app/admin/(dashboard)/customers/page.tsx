'use client';

import { useState, useEffect, useRef } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import Image from 'next/image';
import { FiUser, FiBriefcase, FiBarChart2, FiCheck, FiX, FiFileText, FiDownload } from 'react-icons/fi';

interface Customer {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  activeOrders: number;
}

interface CustomerDetails extends Customer {
  profile?: {
    phone: string | null;
    whatsapp: string | null;
    customerType: string | null;
    companyName: string | null;
    taxId: string | null;
    addresses: any[];
    // Business Verification
    isBusinessAccount: boolean;
    businessVerified: boolean;
    businessVerificationStatus: string; // NONE, PENDING, APPROVED, REJECTED
    businessRIF: string | null;
    businessConstitutiveAct: string | null;
    businessRIFDocument: string | null;
    businessVerificationNotes: string | null;
  };
  orders: any[];
  stats: {
    totalSpent: number;
    orderCount: number;
    activeOrders: number;
  };
}

interface Stats {
  total: number;
  thisMonth: number;
  active: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, thisMonth: 0, active: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'COMPANY' | 'STATS'>('PERSONAL');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    customerType: 'PERSON' as 'PERSON' | 'COMPANY',
    companyName: '',
    taxId: '',
    businessVerificationStatus: 'NONE',
    businessVerificationNotes: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
        setIsEditing(false);
      }
    }

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModal]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/customers?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }

      const data = await response.json();
      setCustomers(data.customers || []);
      setStats(data.stats || { total: 0, thisMonth: 0, active: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`);
      if (!response.ok) {
        throw new Error('Error al cargar detalles del cliente');
      }
      const data = await response.json();
      setSelectedCustomer(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.profile?.phone || '',
        whatsapp: data.profile?.whatsapp || '',
        customerType: (data.profile?.customerType as 'PERSON' | 'COMPANY') || 'PERSON',
        companyName: data.profile?.companyName || '',
        taxId: data.profile?.taxId || '',
        businessVerificationStatus: data.profile?.businessVerificationStatus || 'NONE',
        businessVerificationNotes: data.profile?.businessVerificationNotes || '',
      });
      setShowModal(true);
      setIsEditing(false);
      setActiveTab('PERSONAL');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const handleSave = async () => {
    if (!selectedCustomer) return;

    setSaveLoading(true);
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }

      setIsEditing(false);
      await fetchCustomerDetails(selectedCustomer.id);
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer || !isDeleting) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }

      setShowModal(false);
      setIsDeleting(false);
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsDeleting(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1"><FiCheck className="w-3 h-3" /> Verificado</span>;
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full flex items-center gap-1">Pendiente</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1"><FiX className="w-3 h-3" /> Rechazado</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">No verificado</span>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Epic Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl flex items-center justify-center shadow-lg shadow-[#2a63cd]/30">
              <FiUser className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#212529]">Gestión de Clientes</h1>
              <p className="text-sm text-[#6a6c6b]">Administra y analiza tu base de clientes</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => fetchCustomers()}
              className="p-2 bg-white border border-[#e9ecef] rounded-lg hover:bg-[#f8f9fa] transition-colors"
              title="Actualizar"
            >
              <svg className={`w-5 h-5 text-[#6a6c6b] ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Epic Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="relative bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white overflow-hidden group hover:shadow-xl hover:shadow-[#2a63cd]/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/80">Total Clientes</span>
              </div>
              <p className="text-3xl font-black">{stats.total}</p>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white overflow-hidden group hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/80">Nuevos Este Mes</span>
              </div>
              <p className="text-3xl font-black">{stats.thisMonth}</p>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white overflow-hidden group hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/80">Clientes Activos</span>
              </div>
              <p className="text-3xl font-black">{stats.active}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 overflow-y-auto pr-2 mt-4">
        <div className="bg-white rounded-xl border border-[#e9ecef] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#e9ecef] bg-gradient-to-r from-[#f8f9fa] to-white">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar clientes por nombre, email..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#dee2e6] rounded-lg focus:outline-none focus:border-[#2a63cd] focus:ring-2 focus:ring-[#2a63cd]/10 transition-all"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#f8f9fa] mb-2">
                <svg className="animate-spin h-5 w-5 text-[#2a63cd]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-xs text-[#6a6c6b]">Cargando clientes...</p>
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              title="No hay clientes"
              description={search ? 'No se encontraron clientes con ese criterio de búsqueda' : 'Aún no hay clientes registrados'}
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {customers.map((customer: any) => (
                  <div key={customer.id} className="bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      {customer.image ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#dee2e6] flex-shrink-0">
                          <Image src={customer.image} alt={customer.name || ''} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(customer.name || customer.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-[#212529] truncate">{customer.name || 'Sin nombre'}</h3>
                        <p className="text-xs text-[#6a6c6b] truncate">{customer.email}</p>
                      </div>
                      {customer.profile?.customerType === 'COMPANY' ? (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 bg-blue-50 text-blue-700 rounded-full">
                          <FiBriefcase className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 bg-gray-50 text-gray-600 rounded-full">
                          <FiUser className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-[#f8f9fa] p-2 rounded-lg">
                        <p className="text-[10px] text-[#6a6c6b] uppercase tracking-wider font-semibold">Órdenes</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-[#212529]">{customer.orderCount}</span>
                          {customer.activeOrders > 0 && (
                            <span className="text-[10px] text-green-600 font-bold">({customer.activeOrders} activas)</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] p-2 rounded-lg">
                        <p className="text-[10px] text-[#6a6c6b] uppercase tracking-wider font-semibold">Total Gastado</p>
                        <p className="text-lg font-bold text-[#2a63cd]">
                          ${customer.totalSpent.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#e9ecef]">
                      <span className="text-xs text-[#6a6c6b]">
                        Registrado: {formatDate(customer.createdAt)}
                      </span>
                      <button
                        onClick={() => fetchCustomerDetails(customer.id)}
                        className="text-[#2a63cd] hover:text-[#1e4ba3] text-xs font-bold hover:underline"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#f8f9fa]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Cliente</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Tipo</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Registro</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Órdenes</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Total</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-[#6a6c6b]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e9ecef]">
                    {customers.map((customer: any) => (
                      <tr key={customer.id} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {customer.image ? (
                              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#dee2e6]">
                                <Image src={customer.image} alt={customer.name || ''} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white text-xs font-bold">
                                {(customer.name || customer.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium text-[#212529]">{customer.name || 'Sin nombre'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#6a6c6b]">{customer.email}</td>
                        <td className="px-4 py-3">
                          {customer.profile?.customerType === 'COMPANY' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                              <FiBriefcase className="w-3 h-3" /> Empresa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-100">
                              <FiUser className="w-3 h-3" /> Persona
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#6a6c6b] text-xs">{formatDate(customer.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium text-[#212529]">{customer.orderCount}</span>
                            {customer.activeOrders > 0 && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                {customer.activeOrders} activas
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-[#212529]">
                            ${customer.totalSpent.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => fetchCustomerDetails(customer.id)}
                            className="text-[#2a63cd] hover:text-[#1e4ba3] text-xs font-medium transition-colors"
                          >
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-center min-h-screen px-4 py-8 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => {
                setShowModal(false);
                setIsEditing(false);
                setIsDeleting(false);
              }}
            />
            <div
              ref={modalRef}
              className="relative inline-block align-bottom sm:align-middle bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-3xl my-8 animate-scaleIn"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {selectedCustomer.image ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                        <Image src={selectedCustomer.image} alt={selectedCustomer.name || ''} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-lg font-bold">
                        {(selectedCustomer.name || selectedCustomer.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {isEditing ? 'Editar Cliente' : 'Detalles del Cliente'}
                      </h3>
                      <p className="text-sm text-white/80">{selectedCustomer.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setIsEditing(false);
                      setIsDeleting(false);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Tabs */}
                {!isEditing && !isDeleting && (
                  <div className="flex gap-1 mt-4">
                    <button
                      onClick={() => setActiveTab('PERSONAL')}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'PERSONAL'
                        ? 'bg-white text-[#2a63cd]'
                        : 'text-white/80 hover:bg-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <FiUser className="w-4 h-4" />
                        Personal
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('COMPANY')}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'COMPANY'
                        ? 'bg-white text-[#2a63cd]'
                        : 'text-white/80 hover:bg-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <FiBriefcase className="w-4 h-4" />
                        Empresa
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('STATS')}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'STATS'
                        ? 'bg-white text-[#2a63cd]'
                        : 'text-white/80 hover:bg-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <FiBarChart2 className="w-4 h-4" />
                        Estadísticas
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-6 max-h-[85vh] overflow-y-auto">
                {isDeleting ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-[#212529] mb-2">¿Eliminar cliente?</h4>
                    <p className="text-sm text-[#6a6c6b] mb-6">
                      Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar a {selectedCustomer.name || selectedCustomer.email}?
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setIsDeleting(false)}
                        className="px-4 py-2 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#212529] rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1.5">Nombre</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1.5">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1.5">Teléfono</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#212529] mb-1.5">WhatsApp</label>
                        <input
                          type="tel"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#212529] mb-1.5">Tipo de Cliente</label>
                      <select
                        value={formData.customerType}
                        onChange={(e) => setFormData({ ...formData, customerType: e.target.value as 'PERSON' | 'COMPANY' })}
                        className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                      >
                        <option value="PERSON">Persona Natural</option>
                        <option value="COMPANY">Empresa</option>
                      </select>
                    </div>
                    {formData.customerType === 'COMPANY' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#212529] mb-1.5">Nombre Empresa</label>
                          <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#212529] mb-1.5">RIF/NIT</label>
                          <input
                            type="text"
                            value={formData.taxId}
                            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-[#212529] mb-1.5">Estado de Verificación</label>
                          <select
                            value={formData.businessVerificationStatus}
                            onChange={(e) => setFormData({ ...formData, businessVerificationStatus: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                          >
                            <option value="NONE">No solicitado</option>
                            <option value="PENDING">Pendiente</option>
                            <option value="APPROVED">Aprobado</option>
                            <option value="REJECTED">Rechazado</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-[#212529] mb-1.5">Notas de Verificación</label>
                          <textarea
                            value={formData.businessVerificationNotes}
                            onChange={(e) => setFormData({ ...formData, businessVerificationNotes: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:bg-white focus:border-[#2a63cd] focus:ring-1 focus:ring-[#2a63cd]/20"
                            rows={3}
                            placeholder="Notas internas sobre la verificación..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* PERSONAL TAB */}
                    {activeTab === 'PERSONAL' && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs font-semibold text-[#6a6c6b] mb-1 block">Nombre</label>
                            <p className="text-sm text-[#212529] font-medium">{selectedCustomer.name || 'Sin nombre'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[#6a6c6b] mb-1 block">Email</label>
                            <p className="text-sm text-[#212529] font-medium">{selectedCustomer.email}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[#6a6c6b] mb-1 block">Teléfono</label>
                            <p className="text-sm text-[#212529]">{selectedCustomer.profile?.phone || 'No registrado'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[#6a6c6b] mb-1 block">WhatsApp</label>
                            <p className="text-sm text-[#212529]">{selectedCustomer.profile?.whatsapp || 'No registrado'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[#6a6c6b] mb-1 block">Fecha de Registro</label>
                            <p className="text-sm text-[#212529]">{formatDate(selectedCustomer.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* COMPANY TAB */}
                    {activeTab === 'COMPANY' && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl border border-[#e9ecef]">
                          <div>
                            <p className="text-xs font-semibold text-[#6a6c6b] mb-1">Tipo de Cliente</p>
                            <div className="flex items-center gap-2">
                              {selectedCustomer.profile?.customerType === 'COMPANY' ? (
                                <>
                                  <FiBriefcase className="w-5 h-5 text-[#2a63cd]" />
                                  <span className="font-bold text-[#212529]">Empresa</span>
                                </>
                              ) : (
                                <>
                                  <FiUser className="w-5 h-5 text-gray-500" />
                                  <span className="font-bold text-[#212529]">Persona Natural</span>
                                </>
                              )}
                            </div>
                          </div>
                          {selectedCustomer.profile?.customerType === 'COMPANY' && (
                            <div>
                              <p className="text-xs font-semibold text-[#6a6c6b] mb-1">Estado de Verificación</p>
                              {getVerificationStatusBadge(selectedCustomer.profile?.businessVerificationStatus || 'NONE')}
                            </div>
                          )}
                        </div>

                        {selectedCustomer.profile?.customerType === 'COMPANY' ? (
                          <>
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <label className="text-xs font-semibold text-[#6a6c6b] mb-1 block">Nombre de la Empresa</label>
                                <p className="text-sm text-[#212529] font-medium">{selectedCustomer.profile?.companyName || 'No registrado'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-[#6a6c6b] mb-1 block">RIF / NIT</label>
                                <p className="text-sm text-[#212529] font-medium">{selectedCustomer.profile?.taxId || 'No registrado'}</p>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-[#212529] mb-3 flex items-center gap-2">
                                <FiFileText className="w-4 h-4" /> Documentos
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border border-[#e9ecef] rounded-lg hover:bg-[#f8f9fa] transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-[#6a6c6b]">Acta Constitutiva</span>
                                    {selectedCustomer.profile?.businessConstitutiveAct ? (
                                      <span className="text-xs text-green-600 font-bold">Subido</span>
                                    ) : (
                                      <span className="text-xs text-gray-400">No disponible</span>
                                    )}
                                  </div>
                                  {selectedCustomer.profile?.businessConstitutiveAct && (
                                    <a
                                      href={selectedCustomer.profile.businessConstitutiveAct}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#2a63cd] text-xs font-bold hover:underline flex items-center gap-1"
                                    >
                                      <FiDownload className="w-3 h-3" /> Descargar
                                    </a>
                                  )}
                                </div>
                                <div className="p-3 border border-[#e9ecef] rounded-lg hover:bg-[#f8f9fa] transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-[#6a6c6b]">RIF Digital</span>
                                    {selectedCustomer.profile?.businessRIFDocument ? (
                                      <span className="text-xs text-green-600 font-bold">Subido</span>
                                    ) : (
                                      <span className="text-xs text-gray-400">No disponible</span>
                                    )}
                                  </div>
                                  {selectedCustomer.profile?.businessRIFDocument && (
                                    <a
                                      href={selectedCustomer.profile.businessRIFDocument}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#2a63cd] text-xs font-bold hover:underline flex items-center gap-1"
                                    >
                                      <FiDownload className="w-3 h-3" /> Descargar
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {selectedCustomer.profile?.businessVerificationNotes && (
                              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                <p className="text-xs font-bold text-yellow-800 mb-1">Notas de Verificación</p>
                                <p className="text-sm text-yellow-700">{selectedCustomer.profile.businessVerificationNotes}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8 text-[#6a6c6b]">
                            <p>Este cliente está registrado como Persona Natural.</p>
                            <button
                              onClick={() => setIsEditing(true)}
                              className="mt-2 text-[#2a63cd] text-sm font-medium hover:underline"
                            >
                              Cambiar a Empresa
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STATS TAB */}
                    {activeTab === 'STATS' && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-[#f8f9fa] rounded-lg p-4 text-center border border-[#e9ecef]">
                            <p className="text-xs text-[#6a6c6b] mb-1">Total Gastado</p>
                            <p className="text-xl font-bold text-[#212529]">
                              ${(Number(selectedCustomer.stats?.totalSpent) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            </p>
                          </div>
                          <div className="bg-[#f8f9fa] rounded-lg p-4 text-center border border-[#e9ecef]">
                            <p className="text-xs text-[#6a6c6b] mb-1">Órdenes Totales</p>
                            <p className="text-xl font-bold text-[#212529]">{selectedCustomer.stats?.orderCount || 0}</p>
                          </div>
                          <div className="bg-[#f8f9fa] rounded-lg p-4 text-center border border-[#e9ecef]">
                            <p className="text-xs text-[#6a6c6b] mb-1">Órdenes Activas</p>
                            <p className="text-xl font-bold text-[#212529]">{selectedCustomer.stats?.activeOrders || 0}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-[#212529] mb-3">Últimas Órdenes</h4>
                          {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                            <div className="border border-[#e9ecef] rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-[#f8f9fa]">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Orden</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Fecha</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#6a6c6b]">Estado</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-[#6a6c6b]">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e9ecef]">
                                  {selectedCustomer.orders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-[#f8f9fa]">
                                      <td className="px-4 py-2 font-medium text-[#2a63cd]">{order.orderNumber}</td>
                                      <td className="px-4 py-2 text-[#6a6c6b]">{formatDate(order.createdAt)}</td>
                                      <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${order.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                          {order.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-right font-medium text-[#212529]">
                                        ${Number(order.total).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-[#6a6c6b] text-center py-4">No hay órdenes registradas.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-[#f8f9fa] px-6 py-4 flex items-center justify-end gap-3 border-t border-[#e9ecef]">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] rounded-lg transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="px-4 py-2 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] hover:from-[#1e4ba3] hover:to-[#2a63cd] text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm font-medium"
                    >
                      {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsDeleting(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] hover:from-[#1e4ba3] hover:to-[#2a63cd] text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-medium"
                    >
                      Editar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
