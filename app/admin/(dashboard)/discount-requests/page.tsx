'use client';

import { adminPageHeader, adminPageTitle, adminTab, adminModalOverlay, adminModalPanel, adminStatCard, adminStatLabel, adminStatValue, adminIconChip } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';


import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiPercent, FiCheck, FiX, FiClock, FiUser, FiPackage, FiDollarSign, FiSearch, FiFilter, FiChevronDown, FiAlertCircle } from 'react-icons/fi';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface DiscountRequest {
 id: string;
 productId: string;
 productName: string;
 originalPrice: number;
 requestedDiscount: number;
 approvedDiscount?: number;
 customerMessage?: string;
 adminResponse?: string;
 status: string;
 expiresAt?: string;
 createdAt: string;
 user: {
 id: string;
 name: string;
 email: string;
 image?: string;
 };
}

interface Stats {
 PENDING?: number;
 APPROVED?: number;
 REJECTED?: number;
 EXPIRED?: number;
 USED?: number;
}

export default function DiscountRequestsPage() {
 const [requests, setRequests] = useState<DiscountRequest[]>([]);
 const [stats, setStats] = useState<Stats>({});
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
 const [searchTerm, setSearchTerm] = useState('');

 // Action modal state
 const [selectedRequest, setSelectedRequest] = useState<DiscountRequest | null>(null);
 const [showActionModal, setShowActionModal] = useState(false);
 useBodyScrollLock(showActionModal);
 const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
 const [approvedDiscount, setApprovedDiscount] = useState(0);
 const [expirationHours, setExpirationHours] = useState(24);
 const [adminResponse, setAdminResponse] = useState('');
 const [processing, setProcessing] = useState(false);

 useEffect(() => {
 fetchRequests();
 }, [filter]);

 const fetchRequests = async () => {
 try {
 const response = await fetch(`/api/admin/discount-requests?status=${filter}`);
 if (response.ok) {
 const data = await response.json();
 setRequests(data.requests || []);
 setStats(data.stats || {});
 }
 } catch (error) {
 console.error('Error fetching requests:', error);
 toast.error('No se pudieron cargar las solicitudes');
 } finally {
 setLoading(false);
 }
 };

 const openActionModal = (request: DiscountRequest, action: 'approve' | 'reject') => {
 setSelectedRequest(request);
 setActionType(action);
 setApprovedDiscount(request.requestedDiscount);
 setExpirationHours(24);
 setAdminResponse('');
 setShowActionModal(true);
 };

 const handleAction = async () => {
 if (!selectedRequest) return;

 setProcessing(true);
 try {
 const response = await fetch('/api/admin/discount-requests', {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 requestId: selectedRequest.id,
 action: actionType,
 approvedDiscount: actionType === 'approve' ? approvedDiscount : undefined,
 expirationHours: actionType === 'approve' ? expirationHours : undefined,
 adminResponse: adminResponse || undefined,
 }),
 });

 if (response.ok) {
 toast.success(actionType === 'approve' ? 'Descuento aprobado' : 'Solicitud rechazada');
 setShowActionModal(false);
 fetchRequests();
 window.dispatchEvent(new Event('refresh-sidebar-counts'));
 } else {
 const data = await response.json();
 toast.error(data.error || 'Error al procesar');
 }
 } catch (error) {
 toast.error('Error de conexion');
 } finally {
 setProcessing(false);
 }
 };

 const filteredRequests = requests.filter(r =>
 r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 r.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 r.user.email.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'PENDING':
 return <span className="px-2.5 py-1 bg-warning/10 text-warning-strong text-xs font-bold rounded-full">Pendiente</span>;
 case 'APPROVED':
 return <span className="px-2.5 py-1 bg-success/10 text-success-strong text-xs font-bold rounded-full">Aprobado</span>;
 case 'REJECTED':
 return <span className="px-2.5 py-1 bg-deal/10 text-deal text-xs font-bold rounded-full">Rechazado</span>;
 case 'EXPIRED':
 return <span className="px-2.5 py-1 bg-surface text-muted text-xs font-bold rounded-full">Expirado</span>;
 case 'USED':
 return <span className="px-2.5 py-1 bg-brand-100 text-brand-600 text-xs font-bold rounded-full">Usado</span>;
 default:
 return null;
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-surface rounded-2xl p-6 text-white shadow-xl">
 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
 <FiPercent className="w-7 h-7" />
 </div>
 <div>
 <h1 className="text-2xl md:text-3xl font-bold">Solicitudes de Descuento</h1>
 <p className="text-muted">Gestiona las solicitudes de descuento de clientes</p>
 </div>
 </div>

 {/* Stats */}
 <div className="flex gap-3">
 <div className="px-4 py-2 bg-white/20 rounded-xl">
 <div className="text-2xl font-bold">{stats.PENDING || 0}</div>
 <div className="text-xs text-muted">Pendientes</div>
 </div>
 <div className="px-4 py-2 bg-white/20 rounded-xl">
 <div className="text-2xl font-bold">{stats.APPROVED || 0}</div>
 <div className="text-xs text-muted">Aprobados</div>
 </div>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-xl border border-line p-4">
 <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
 {/* Search */}
 <div className="relative flex-1 w-full md:max-w-md">
 <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
 <input
 type="text"
 placeholder="Buscar por producto o cliente..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 bg-surface border border-line rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
 />
 </div>

 {/* Filter tabs */}
 <div className="flex gap-2 overflow-x-auto pb-1">
 {[
 { value: 'all', label: 'Todos' },
 { value: 'PENDING', label: 'Pendientes' },
 { value: 'APPROVED', label: 'Aprobados' },
 { value: 'REJECTED', label: 'Rechazados' },
 ].map((tab) => (
 <button
 key={tab.value}
 onClick={() => setFilter(tab.value as any)}
 className={adminTab(filter === tab.value)}
 >
 {tab.label}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Requests List */}
 {filteredRequests.length > 0 ? (
 <div className="bg-white rounded-xl border border-line overflow-hidden">
 <div className="divide-y divide-line">
 {filteredRequests.map((request) => (
 <div key={request.id} className="p-4 hover:bg-surface transition-colors">
 <div className="flex flex-col md:flex-row gap-4">
 {/* Customer Info */}
 <div className="flex items-center gap-3 md:w-48">
 <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center overflow-hidden">
 {request.user.image ? (
 <Image src={request.user.image} alt="" width={40} height={40} className="rounded-full" />
 ) : (
 <FiUser className="w-5 h-5 text-muted" />
 )}
 </div>
 <div className="min-w-0">
 <p className="font-semibold text-ink text-sm truncate">{request.user.name || 'Usuario'}</p>
 <p className="text-xs text-muted truncate">{request.user.email}</p>
 </div>
 </div>

 {/* Product Info */}
 <div className="flex-1 flex items-center gap-3">
 <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center">
 <FiPackage className="w-6 h-6 text-muted" />
 </div>
 <div className="min-w-0 flex-1">
 <p className="font-semibold text-ink text-sm truncate">{request.productName}</p>
 <div className="flex items-center gap-3 mt-1">
 <span className="text-xs text-muted">Precio: {formatUSD(Number(request.originalPrice))}</span>
 <span className="text-xs font-bold text-warning-strong">Solicita: {request.requestedDiscount}%</span>
 <span className="text-xs text-success-strong">(-{formatUSD(Number(request.originalPrice) * request.requestedDiscount / 100)})</span>
 </div>
 </div>
 </div>

 {/* Status & Actions */}
 <div className="flex items-center gap-3">
 {getStatusBadge(request.status)}

 {request.status === 'PENDING' && (
 <div className="flex gap-2">
 <button
 onClick={() => openActionModal(request, 'approve')}
 className="p-2 bg-success/10 text-success-strong rounded-lg hover:bg-success/20 transition-all"
 title="Aprobar"
 >
 <FiCheck className="w-4 h-4" />
 </button>
 <button
 onClick={() => openActionModal(request, 'reject')}
 className="p-2 bg-deal/10 text-deal rounded-lg hover:bg-deal/20 transition-all"
 title="Rechazar"
 >
 <FiX className="w-4 h-4" />
 </button>
 </div>
 )}

 <span className="text-xs text-muted">
 {new Date(request.createdAt).toLocaleDateString('es-VE')}
 </span>
 </div>
 </div>

 {/* Customer Message */}
 {request.customerMessage && (
 <div className="mt-3 ml-13 pl-4 border-l-2 border-warning/20">
 <p className="text-xs text-muted italic">"{request.customerMessage}"</p>
 </div>
 )}

 {/* Approved Info */}
 {request.status === 'APPROVED' && request.expiresAt && (
 <div className="mt-3 flex items-center gap-2 text-xs">
 <FiClock className="w-3.5 h-3.5 text-success-strong" />
 <span className="text-success-strong font-semibold">
 Descuento de {request.approvedDiscount}% aprobado -
 Expira: {new Date(request.expiresAt).toLocaleString('es-VE')}
 </span>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="bg-white rounded-xl border border-line p-12 text-center">
 <FiPercent className="w-16 h-16 text-subtle mx-auto mb-4" />
 <h3 className="text-lg font-bold text-ink mb-2">No hay solicitudes</h3>
 <p className="text-muted">
 {filter === 'PENDING' ? 'No hay solicitudes pendientes de revisar' : 'No se encontraron solicitudes'}
 </p>
 </div>
 )}

 {/* Action Modal - Using Portal */}
 {showActionModal && selectedRequest && typeof document !== 'undefined' && createPortal(
 <div
 onClick={() => setShowActionModal(false)}
 className={adminModalOverlay}
 >
 <div
 onClick={(e) => e.stopPropagation()}
 className={`${adminModalPanel} sm:max-w-md`}
 >
 {/* Header */}
 <div className={`p-5 text-white ${actionType === 'approve' ? 'bg-success' : 'bg-deal'}`}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
 {actionType === 'approve' ? <FiCheck className="w-6 h-6" /> : <FiX className="w-6 h-6" />}
 </div>
 <div>
 <h2 className="text-lg font-bold">{actionType === 'approve' ? 'Aprobar Descuento' : 'Rechazar Solicitud'}</h2>
 <p className="text-sm opacity-80">{selectedRequest.productName}</p>
 </div>
 </div>
 <button onClick={() => setShowActionModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
 <FiX className="w-5 h-5" />
 </button>
 </div>
 </div>

 <div className="p-5 space-y-5">
 {/* Request Info */}
 <div className="bg-surface rounded-xl p-4">
 <div className="flex justify-between text-sm mb-2">
 <span className="text-muted">Cliente:</span>
 <span className="font-semibold">{selectedRequest.user.name || selectedRequest.user.email}</span>
 </div>
 <div className="flex justify-between text-sm mb-2">
 <span className="text-muted">Precio original:</span>
 <span className="font-semibold">{formatUSD(Number(selectedRequest.originalPrice))}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted">Descuento solicitado:</span>
 <span className="font-bold text-warning-strong">{selectedRequest.requestedDiscount}%</span>
 </div>
 </div>

 {actionType === 'approve' && (
 <>
 {/* Discount to approve */}
 <div>
 <label className="block text-sm font-bold text-ink mb-3">Descuento a aprobar</label>
 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map((percent) => (
 <button
 key={percent}
 onClick={() => setApprovedDiscount(percent)}
 className={`flex-1 py-3 rounded-xl font-bold transition-all ${approvedDiscount === percent
 ? 'bg-success text-white shadow-lg'
 : 'bg-surface text-ink hover:bg-line'
 }`}
 >
 {percent}%
 </button>
 ))}
 </div>
 </div>

 {/* Expiration */}
 <div>
 <label className="block text-sm font-bold text-ink mb-2">Horas de validez</label>
 <div className="flex gap-2">
 {[12, 24, 48, 72].map((hours) => (
 <button
 key={hours}
 onClick={() => setExpirationHours(hours)}
 className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${expirationHours === hours
 ? 'bg-brand-500 text-white'
 : 'bg-surface text-ink hover:bg-line'
 }`}
 >
 {hours}h
 </button>
 ))}
 </div>
 </div>

 {/* Final Price Preview */}
 <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
 <p className="text-sm text-success-strong mb-1">Precio final para el cliente</p>
 <p className="text-3xl font-bold text-success-strong">
 {formatUSD(Number(selectedRequest.originalPrice) * (1 - approvedDiscount / 100))}
 </p>
 <p className="text-xs text-success-strong mt-1">
 Ahorra {formatUSD(Number(selectedRequest.originalPrice) * approvedDiscount / 100)}
 </p>
 </div>
 </>
 )}

 {/* Response message */}
 <div>
 <label className="block text-sm font-bold text-ink mb-2">
 {actionType === 'approve' ? 'Mensaje (opcional)' : 'Razon del rechazo (opcional)'}
 </label>
 <textarea
 value={adminResponse}
 onChange={(e) => setAdminResponse(e.target.value)}
 placeholder={actionType === 'approve' ? 'Ej: Aprovecha tu descuento!' : 'Ej: El precio ya es competitivo'}
 className="w-full px-4 py-3 border border-line rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 resize-none"
 rows={2}
 />
 </div>

 {/* Action Button */}
 <button
 onClick={handleAction}
 disabled={processing}
 className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${actionType === 'approve'
 ? 'bg-success text-white'
 : 'bg-deal text-white'
 }`}
 >
 {processing ? (
 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
 ) : actionType === 'approve' ? (
 <>
 <FiCheck className="w-5 h-5" />
 Aprobar Descuento
 </>
 ) : (
 <>
 <FiX className="w-5 h-5" />
 Rechazar Solicitud
 </>
 )}
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}
 </div>
 );
}
