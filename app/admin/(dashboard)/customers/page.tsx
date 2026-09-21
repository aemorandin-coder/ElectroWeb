'use client';
import { toast } from 'react-hot-toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';
import {
  adminPageHeader,
  adminModalBody,
  adminModalFooter,
  adminIconButton,
  adminTab,
  adminPageTitle,
  adminPageSubtitle,
  adminStatCard,
  adminStatLabel,
  adminStatValue,
  adminIconChip,
  adminPrimaryButton,
  adminSecondaryButton,
  adminDangerButton,
  adminModalOverlay,
  adminModalPanel,
  adminTableWrap,
  adminTh,
  adminTd,
  adminRowHover,
  adminInput,
  adminBadge,
  adminCardFlush,
} from '@/lib/admin-ui';
import { FiCalendar, FiZap } from 'react-icons/fi';

import { useState, useEffect, useRef } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import Image from 'next/image';
import Link from 'next/link';
import { FiUser, FiBriefcase, FiBarChart2, FiCheck, FiX, FiFileText, FiDownload, FiShield } from 'react-icons/fi';

interface CustomerOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalUSD: number;
  total?: number | string;
}

interface Customer {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  activeOrders: number;
  profile?: {
    customerType?: string | null;
    companyName?: string | null;
    taxId?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    isBusinessAccount?: boolean;
    businessVerified?: boolean;
  };
}

interface CustomerDetails extends Customer {
  profile?: {
    phone: string | null;
    whatsapp: string | null;
    customerType: string | null;
    companyName: string | null;
    taxId: string | null;
    addresses?: unknown[];
    // Business Verification
    isBusinessAccount: boolean;
    businessVerified: boolean;
    businessVerificationStatus: string; // NONE, PENDING, APPROVED, REJECTED
    businessRIF: string | null;
    businessConstitutiveAct: string | null;
    businessRIFDocument: string | null;
    businessVerificationNotes: string | null;
  };
  orders: CustomerOrder[];
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
  useBodyScrollLock(showModal);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'COMPANY' | 'STATS'>('PERSONAL');
  const [pendingVerifications, setPendingVerifications] = useState(0);

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
    // Fetch pending verifications count
    const fetchPendingCount = async () => {
      try {
        const res = await fetch('/api/admin/verifications/pending-count');
        if (res.ok) {
          const data = await res.json();
          setPendingVerifications(data.count || 0);
        }
      } catch (e) {
        console.error('Error fetching pending count:', e);
        toast.error('No se pudo cargar el conteo de verificaciones');
      }
    };
    fetchPendingCount();
  }, []);

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

  async function fetchCustomers() {
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
  }

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
        return <span className={adminBadge('success')}><FiCheck className="w-3 h-3" /> Verificado</span>;
      case 'PENDING':
        return <span className={adminBadge('warning')}>Pendiente</span>;
      case 'REJECTED':
        return <span className={adminBadge('danger')}><FiX className="w-3 h-3" /> Rechazado</span>;
      default:
        return <span className={adminBadge('neutral')}>No verificado</span>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Epic Header Section */}
      <div className="flex-shrink-0 space-y-4">
        <div className={adminPageHeader}>
          <div className="flex items-center gap-3">
            <div className={`${adminIconChip('brand')} hidden sm:flex`}>
              <FiUser className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h1 className={adminPageTitle}>Clientes</h1>
              <p className={adminPageSubtitle}>Busca un cliente para consultar su cuenta y sus pedidos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/verifications"
              className={`relative flex items-center gap-2 px-3 py-2 border rounded-lg transition-all text-sm font-medium ${pendingVerifications > 0
                  ? 'bg-deal text-white border-deal hover:bg-deal/90'
                  : 'bg-white border-line text-muted hover:bg-surface hover:text-brand-700'
                }`}
              title="Verificaciones Empresariales"
            >
              <FiShield className="w-4 h-4" />
              <span>Verificaciones</span>
              {pendingVerifications > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-deal text-white text-xs font-bold rounded-full shadow-md">
                  {pendingVerifications > 99 ? '99+' : pendingVerifications}
                </span>
              )}
            </Link>
            <button
              onClick={() => fetchCustomers()}
              className={`${adminSecondaryButton} w-11 px-0`}
              aria-label="Actualizar clientes"
              title="Actualizar"
            >
              <svg className={`w-5 h-5 text-muted ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-deal-bg border border-deal/30 text-deal px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

          <div className="rounded-xl border border-line bg-white p-2">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar clientes por nombre o correo"
                  placeholder="Nombre o correo del cliente"
                  className={`${adminInput()} pl-10`}
                />
              </div>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-3">
          <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
            <span className={`${adminIconChip('brand')} hidden sm:flex`}>
              <FiUser className="w-5 h-5" />
            </span>
            <div>
              <p className={`${adminStatValue} text-lg tabular-nums`}>{stats.total}</p>
              <p className={adminStatLabel}>Clientes</p>
            </div>
          </div>

          <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
            <span className={`${adminIconChip('success')} hidden sm:flex`}>
              <FiCalendar className="w-5 h-5" />
            </span>
            <div>
              <p className={`${adminStatValue} text-lg tabular-nums`}>{stats.thisMonth}</p>
              <p className={adminStatLabel}>Nuevos este mes</p>
            </div>
          </div>

          <div className={`${adminStatCard} min-w-max shrink-0 p-3`}>
            <span className={`${adminIconChip('brand')} hidden sm:flex`}>
              <FiZap className="w-5 h-5" />
            </span>
            <div>
              <p className={`${adminStatValue} text-lg tabular-nums`}>{stats.active}</p>
              <p className={adminStatLabel}>Con órdenes activas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="mt-4 min-w-0 flex-1">
        <div className={adminCardFlush}>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface mb-2">
                <svg className="animate-spin h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-xs text-muted">Cargando clientes...</p>
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
              <div className="grid grid-cols-1 divide-y divide-line xl:hidden">
                {customers.map((customer: Customer) => (
                  <div key={customer.id} className="relative bg-white p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {customer.image ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-line-strong flex-shrink-0">
                          <Image src={customer.image} alt={customer.name || ''} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(customer.name || customer.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-ink truncate">{customer.name || 'Sin nombre'}</h3>
                        <p className="text-xs text-muted truncate">{customer.email}</p>
                      </div>
                      {customer.profile?.customerType === 'COMPANY' ? (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 bg-brand-50 text-brand-700 rounded-full">
                          <FiBriefcase className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 bg-surface text-ink-soft rounded-full">
                          <FiUser className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-surface p-2 rounded-lg">
                        <p className="text-xs text-muted font-semibold">Órdenes</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-ink">{customer.orderCount}</span>
                          {customer.activeOrders > 0 && (
                            <span className="text-xs text-success-strong font-bold">({customer.activeOrders} activas)</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-surface p-2 rounded-lg">
                        <p className="text-xs text-muted font-semibold">Total Gastado</p>
                        <p className="whitespace-nowrap text-base font-bold tabular-nums text-brand-600 sm:text-lg">
                          {formatUSD(customer.totalSpent)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-line">
                      <span className="text-xs text-muted">
                        Registrado: {formatDate(customer.createdAt)}
                      </span>
                      <button
                        onClick={() => fetchCustomerDetails(customer.id)}
                        className={`${adminSecondaryButton} after:absolute after:inset-0`}
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className={`${adminTableWrap} hidden xl:block`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={adminTh}>Cliente</th>
                      <th className={adminTh}>Correo</th>
                      <th className={adminTh}>Tipo</th>
                      <th className={adminTh}>Registro</th>
                      <th className={adminTh}>Órdenes</th>
                      <th className={adminTh}>Total</th>
                      <th className={`${adminTh} text-right`}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer: Customer) => (
                      <tr key={customer.id} className={adminRowHover}>
                        <td className={adminTd}>
                          <div className="flex items-center gap-2">
                            {customer.image ? (
                              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-line-strong">
                                <Image src={customer.image} alt={customer.name || ''} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                                {(customer.name || customer.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium text-ink">{customer.name || 'Sin nombre'}</span>
                          </div>
                        </td>
                        <td className={`${adminTd} text-muted`}>{customer.email}</td>
                        <td className={adminTd}>
                          {customer.profile?.customerType === 'COMPANY' ? (
                            <span className={adminBadge('brand')}>
                              <FiBriefcase className="w-3 h-3" /> Empresa
                            </span>
                          ) : (
                            <span className={adminBadge('neutral')}>
                              <FiUser className="w-3 h-3" /> Persona
                            </span>
                          )}
                        </td>
                        <td className={`${adminTd} text-muted text-xs`}>{formatDate(customer.createdAt)}</td>
                        <td className={adminTd}>
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium text-ink">{customer.orderCount}</span>
                            {customer.activeOrders > 0 && (
                              <span className="px-1.5 py-0.5 bg-success-strong/15 text-success-strong text-xs rounded-full">
                                {customer.activeOrders} activas
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={adminTd}>
                          <span className="font-semibold text-brand-600">
                            {formatUSD(customer.totalSpent)}
                          </span>
                        </td>
                        <td className={`${adminTd} text-right`}>
                          <button
                            onClick={() => fetchCustomerDetails(customer.id)}
                            className={adminSecondaryButton}
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
        <div
          className={adminModalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setIsEditing(false);
              setIsDeleting(false);
            }
          }}
        >
          <div
            ref={modalRef}
            className={`${adminModalPanel} sm:max-w-3xl`}
            role="dialog" aria-modal="true" aria-label="Detalle del cliente"
          >
            {/* Header */}
            <div className="border-b border-line px-5 py-4 text-ink">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {selectedCustomer.image ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                      <Image src={selectedCustomer.image} alt={selectedCustomer.name || ''} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-lg font-bold text-ink sm:flex">
                      {(selectedCustomer.name || selectedCustomer.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      {isEditing ? 'Editar Cliente' : 'Detalles del Cliente'}
                    </h3>
                    <p className="text-sm text-muted [overflow-wrap:anywhere]">{selectedCustomer.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setIsEditing(false);
                    setIsDeleting(false);
                  }}
                  aria-label="Cerrar"
                  title="Cerrar" className={`${adminIconButton} h-11 w-11 shrink-0`}
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              {!isEditing && !isDeleting && (
                <div className="mt-3 flex gap-1 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('PERSONAL')}
                    aria-pressed={activeTab === 'PERSONAL'} className={`${adminTab(activeTab === 'PERSONAL')} h-11 shrink-0`}
                  >
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4" />
                      Personal
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('COMPANY')}
                    aria-pressed={activeTab === 'COMPANY'} className={`${adminTab(activeTab === 'COMPANY')} h-11 shrink-0`}
                  >
                    <div className="flex items-center gap-2">
                      <FiBriefcase className="w-4 h-4" />
                      Empresa
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('STATS')}
                    aria-pressed={activeTab === 'STATS'} className={`${adminTab(activeTab === 'STATS')} h-11 shrink-0`}
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
              <div className={`${adminModalBody} [overflow-wrap:anywhere]`}>
                {isDeleting ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-deal-bg rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-deal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-ink mb-2">¿Eliminar cliente?</h4>
                    <p className="text-sm text-muted mb-6">
                      Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar a {selectedCustomer.name || selectedCustomer.email}?
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setIsDeleting(false)}
                        className={adminSecondaryButton}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className={adminDangerButton}
                      >
                        {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5">Nombre</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={adminInput()}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5">Correo electrónico</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={adminInput()}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5">Teléfono</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={adminInput()}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5">WhatsApp</label>
                        <input
                          type="tel"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className={adminInput()}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Tipo de Cliente</label>
                      <select
                        value={formData.customerType}
                        onChange={(e) => setFormData({ ...formData, customerType: e.target.value as 'PERSON' | 'COMPANY' })}
                        className={adminInput()}
                      >
                        <option value="PERSON">Persona Natural</option>
                        <option value="COMPANY">Empresa</option>
                      </select>
                    </div>
                    {formData.customerType === 'COMPANY' && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-ink mb-1.5">Nombre Empresa</label>
                          <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            className={adminInput()}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ink mb-1.5">RIF/NIT</label>
                          <input
                            type="text"
                            value={formData.taxId}
                            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                            className={adminInput()}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-ink mb-1.5">Estado de Verificación</label>
                          <select
                            value={formData.businessVerificationStatus}
                            onChange={(e) => setFormData({ ...formData, businessVerificationStatus: e.target.value })}
                            className={adminInput()}
                          >
                            <option value="NONE">No solicitado</option>
                            <option value="PENDING">Pendiente</option>
                            <option value="APPROVED">Aprobado</option>
                            <option value="REJECTED">Rechazado</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-ink mb-1.5">Notas de Verificación</label>
                          <textarea
                            value={formData.businessVerificationNotes}
                            onChange={(e) => setFormData({ ...formData, businessVerificationNotes: e.target.value })}
                            className={adminInput()}
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
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold text-muted mb-1 block">Nombre</label>
                            <p className="text-sm text-ink font-medium">{selectedCustomer.name || 'Sin nombre'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted mb-1 block">Correo electrónico</label>
                            <p className="text-sm text-ink font-medium">{selectedCustomer.email}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted mb-1 block">Teléfono</label>
                            <p className="text-sm text-ink">{selectedCustomer.profile?.phone || 'No registrado'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted mb-1 block">WhatsApp</label>
                            <p className="text-sm text-ink">{selectedCustomer.profile?.whatsapp || 'No registrado'}</p>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted mb-1 block">Fecha de Registro</label>
                            <p className="text-sm text-ink">{formatDate(selectedCustomer.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* COMPANY TAB */}
                    {activeTab === 'COMPANY' && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-line">
                          <div>
                            <p className="text-xs font-semibold text-muted mb-1">Tipo de Cliente</p>
                            <div className="flex items-center gap-2">
                              {selectedCustomer.profile?.customerType === 'COMPANY' ? (
                                <>
                                  <FiBriefcase className="w-5 h-5 text-brand-600" />
                                  <span className="font-bold text-ink">Empresa</span>
                                </>
                              ) : (
                                <>
                                  <FiUser className="w-5 h-5 text-muted" />
                                  <span className="font-bold text-ink">Persona Natural</span>
                                </>
                              )}
                            </div>
                          </div>
                          {selectedCustomer.profile?.customerType === 'COMPANY' && (
                            <div>
                              <p className="text-xs font-semibold text-muted mb-1">Estado de Verificación</p>
                              {getVerificationStatusBadge(selectedCustomer.profile?.businessVerificationStatus || 'NONE')}
                            </div>
                          )}
                        </div>

                        {selectedCustomer.profile?.customerType === 'COMPANY' ? (
                          <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="text-xs font-semibold text-muted mb-1 block">Nombre de la Empresa</label>
                                <p className="text-sm text-ink font-medium">{selectedCustomer.profile?.companyName || 'No registrado'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-muted mb-1 block">RIF / NIT</label>
                                <p className="text-sm text-ink font-medium">{selectedCustomer.profile?.taxId || 'No registrado'}</p>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
                                <FiFileText className="w-4 h-4" /> Documentos
                              </h4>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="p-3 border border-line rounded-lg hover:bg-surface transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-muted">Acta Constitutiva</span>
                                    {selectedCustomer.profile?.businessConstitutiveAct ? (
                                      <span className="text-xs text-success-strong font-bold">Subido</span>
                                    ) : (
                                      <span className="text-xs text-muted">No disponible</span>
                                    )}
                                  </div>
                                  {selectedCustomer.profile?.businessConstitutiveAct && (
                                    <a
                                      href={selectedCustomer.profile.businessConstitutiveAct}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-brand-600 text-xs font-bold hover:underline flex items-center gap-1"
                                    >
                                      <FiDownload className="w-3 h-3" /> Descargar
                                    </a>
                                  )}
                                </div>
                                <div className="p-3 border border-line rounded-lg hover:bg-surface transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-muted">RIF Digital</span>
                                    {selectedCustomer.profile?.businessRIFDocument ? (
                                      <span className="text-xs text-success-strong font-bold">Subido</span>
                                    ) : (
                                      <span className="text-xs text-muted">No disponible</span>
                                    )}
                                  </div>
                                  {selectedCustomer.profile?.businessRIFDocument && (
                                    <a
                                      href={selectedCustomer.profile.businessRIFDocument}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-brand-600 text-xs font-bold hover:underline flex items-center gap-1"
                                    >
                                      <FiDownload className="w-3 h-3" /> Descargar
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {selectedCustomer.profile?.businessVerificationNotes && (
                              <div className="bg-warning/10 p-3 rounded-lg border border-warning/30">
                                <p className="text-xs font-bold text-warning-strong mb-1">Notas de Verificación</p>
                                <p className="text-sm text-warning-strong">{selectedCustomer.profile.businessVerificationNotes}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8 text-muted">
                            <p>Este cliente está registrado como Persona Natural.</p>
                            <button
                              onClick={() => setIsEditing(true)}
                              className="mt-2 text-brand-600 text-sm font-medium hover:underline"
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
                        <div className="flex gap-3 overflow-x-auto">
                          <div className="min-w-max border-r border-line pr-4 last:border-0">
                            <p className="text-xs text-muted mb-1">Total Gastado</p>
                            <p className="text-xl font-bold text-ink">
                              {formatUSD(Number(selectedCustomer.stats?.totalSpent) || 0)}
                            </p>
                          </div>
                          <div className="min-w-max border-r border-line pr-4 last:border-0">
                            <p className="text-xs text-muted mb-1">Órdenes Totales</p>
                            <p className="text-xl font-bold text-ink">{selectedCustomer.stats?.orderCount || 0}</p>
                          </div>
                          <div className="min-w-max border-r border-line pr-4 last:border-0">
                            <p className="text-xs text-muted mb-1">Órdenes Activas</p>
                            <p className="text-xl font-bold text-ink">{selectedCustomer.stats?.activeOrders || 0}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-ink mb-3">Últimas Órdenes</h4>
                          {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                            <div className={adminTableWrap}>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr>
                                    <th className={adminTh}>Orden</th>
                                    <th className={adminTh}>Fecha</th>
                                    <th className={adminTh}>Estado</th>
                                    <th className={`${adminTh} text-right`}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedCustomer.orders.map((order: CustomerOrder) => (
                                    <tr key={order.id} className={adminRowHover}>
                                      <td className={`${adminTd} font-medium text-brand-600`}>{order.orderNumber}</td>
                                      <td className={`${adminTd} text-muted`}>{formatDate(order.createdAt)}</td>
                                      <td className={adminTd}>
                                        <span className={adminBadge(
                                          order.status === 'PAID' ? 'success' :
                                          order.status === 'PENDING' ? 'warning' : 'neutral'
                                        )}>
                                          {order.status}
                                        </span>
                                      </td>
                                      <td className={`${adminTd} text-right font-medium text-ink`}>
                                        {formatUSD(Number(order.total) || 0)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-muted text-center py-4">No hay órdenes registradas.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={adminModalFooter}>
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className={adminSecondaryButton}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveLoading}
                      className={adminPrimaryButton}
                    >
                      {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsDeleting(true)}
                      className={adminDangerButton}
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={adminPrimaryButton}
                    >
                      Editar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
