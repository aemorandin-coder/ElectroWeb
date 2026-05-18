'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import EmailSettingsPanel from '@/components/admin/EmailSettingsPanel';
import SocialMediaGenerator from '@/components/admin/SocialMediaGenerator';
import {
    FiMail, FiSend, FiImage, FiSettings, FiUsers, FiCheck, FiX,
    FiRefreshCw, FiEdit3, FiTrash2, FiPlus, FiEye, FiTarget,
    FiTrendingUp, FiServer, FiCheckCircle, FiAlertCircle,
    FiLink, FiCopy, FiDollarSign, FiUserCheck, FiToggleRight,
    FiActivity, FiUpload, FiRadio, FiTv, FiSave,
} from 'react-icons/fi';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Influencer {
    id: string;
    code: string;
    name: string;
    commissionRate: number;
    status: 'ACTIVE' | 'PAUSED';
    notes: string | null;
    createdAt: string;
    user: { id: string; name: string | null; email: string | null; image: string | null };
    stats: {
        totalConversions: number;
        pendingConversions: number;
        pendingCommission: number;
        approvedCommission: number;
        totalGross: number;
    };
}

interface Conversion {
    id: string;
    type: 'REGISTRATION' | 'PURCHASE' | 'RECHARGE';
    grossAmount: number;
    commission: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    referredUser: { id: string; name: string | null; email: string | null };
}

interface User { id: string; name: string | null; email: string | null }

interface EmailConfig {
    provider: string;
    host: string;
    user: string;
    fromName: string;
    fromEmail: string;
    notificationsEnabled: boolean;
    marketingEnabled: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success('Enlace copiado'));
}

function typeLabel(type: string) {
    if (type === 'REGISTRATION') return { label: 'Registro', color: 'bg-blue-50 text-blue-700' };
    if (type === 'PURCHASE') return { label: 'Compra', color: 'bg-green-50 text-green-700' };
    return { label: 'Recarga', color: 'bg-purple-50 text-purple-700' };
}

// ─── Influencer Tab ───────────────────────────────────────────────────────────

function InfluencersTab() {
    const [influencers, setInfluencers] = useState<Influencer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
    const [conversions, setConversions] = useState<Conversion[]>([]);
    const [convLoading, setConvLoading] = useState(false);
    const [selectedConversions, setSelectedConversions] = useState<string[]>([]);
    const [approving, setApproving] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Create form
    const [createForm, setCreateForm] = useState({ userId: '', code: '', name: '', commissionRate: '5', notes: '' });
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState<User[]>([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => { setMounted(true); fetchInfluencers(); }, []);

    const fetchInfluencers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/influencers');
            if (res.ok) setInfluencers(await res.json());
        } finally { setLoading(false); }
    };

    const fetchConversions = async (influencer: Influencer) => {
        setSelectedInfluencer(influencer);
        setConvLoading(true);
        setSelectedConversions([]);
        try {
            const res = await fetch(`/api/influencers/${influencer.id}`);
            if (res.ok) {
                const data = await res.json();
                setConversions(data.conversions || []);
            }
        } finally { setConvLoading(false); }
    };

    const searchUsers = async (q: string) => {
        if (q.length < 2) { setUserResults([]); return; }
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=8`);
        if (res.ok) {
            const data = await res.json();
            setUserResults(data.users || data || []);
        }
    };

    const handleCreate = async () => {
        if (!createForm.userId || !createForm.code || !createForm.name) {
            toast.error('Completa todos los campos requeridos');
            return;
        }
        setCreating(true);
        try {
            const res = await fetch('/api/influencers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...createForm, commissionRate: parseFloat(createForm.commissionRate) }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Influencer creado');
                setShowCreate(false);
                setCreateForm({ userId: '', code: '', name: '', commissionRate: '5', notes: '' });
                fetchInfluencers();
            } else {
                toast.error(data.error || 'Error al crear');
            }
        } finally { setCreating(false); }
    };

    const handleToggleStatus = async (inf: Influencer) => {
        const newStatus = inf.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        const res = await fetch(`/api/influencers/${inf.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
            toast.success(`Influencer ${newStatus === 'ACTIVE' ? 'activado' : 'pausado'}`);
            fetchInfluencers();
        }
    };

    const handleApproveSelected = async () => {
        if (selectedConversions.length === 0 || !selectedInfluencer) return;
        setApproving(true);
        try {
            const res = await fetch(`/api/influencers/${selectedInfluencer.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve_conversions', conversionIds: selectedConversions }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`${data.approved} comisión(es) aprobada(s) y saldo acreditado`);
                setSelectedConversions([]);
                fetchConversions(selectedInfluencer);
                fetchInfluencers();
            } else {
                toast.error('Error al aprobar');
            }
        } finally { setApproving(false); }
    };

    const handleDelete = async (inf: Influencer) => {
        if (!confirm(`¿Eliminar perfil de influencer de ${inf.name}? El usuario conserva su cuenta.`)) return;
        const res = await fetch(`/api/influencers/${inf.id}`, { method: 'DELETE' });
        if (res.ok) { toast.success('Eliminado'); fetchInfluencers(); }
    };

    const pendingCommissionTotal = influencers.reduce((s, i) => s + i.stats.pendingCommission, 0);
    const totalConversions = influencers.reduce((s, i) => s + i.stats.totalConversions, 0);

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <FiUserCheck className="w-5 h-5 opacity-80" />
                        <span className="text-xs opacity-70">Influencers</span>
                    </div>
                    <p className="text-2xl font-black">{influencers.length}</p>
                    <p className="text-xs opacity-60 mt-0.5">{influencers.filter(i => i.status === 'ACTIVE').length} activos</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
                    <div className="flex items-center justify-between mb-2">
                        <FiTrendingUp className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs text-[#6a6c6b]">Conversiones</span>
                    </div>
                    <p className="text-2xl font-black text-[#212529]">{totalConversions}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
                    <div className="flex items-center justify-between mb-2">
                        <FiDollarSign className="w-5 h-5 text-amber-500" />
                        <span className="text-xs text-[#6a6c6b]">Comisiones Pendientes</span>
                    </div>
                    <p className="text-2xl font-black text-[#212529]">${pendingCommissionTotal.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[#e9ecef]">
                    <div className="flex items-center justify-between mb-2">
                        <FiDollarSign className="w-5 h-5 text-[#2a63cd]" />
                        <span className="text-xs text-[#6a6c6b]">Total Generado</span>
                    </div>
                    <p className="text-2xl font-black text-[#212529]">
                        ${influencers.reduce((s, i) => s + i.stats.totalGross, 0).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Influencer List */}
            <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e9ecef] flex items-center justify-between">
                    <h2 className="font-bold text-sm text-[#212529]">Influencers</h2>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#2a63cd] text-white text-xs font-semibold rounded-lg hover:bg-[#1e4ba3] transition-colors"
                    >
                        <FiPlus className="w-3.5 h-3.5" />
                        Nuevo Influencer
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-7 h-7 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : influencers.length === 0 ? (
                    <div className="py-12">
                        <EmptyState
                            icon={<FiUsers className="w-8 h-8" />}
                            title="Sin influencers"
                            description="Crea el primero para empezar a trackear referidos"
                            action={
                                <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3]">
                                    Crear Influencer
                                </button>
                            }
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-[#e9ecef]">
                        {influencers.map((inf) => (
                            <div key={inf.id} className="p-4 hover:bg-[#f8f9fa] transition-colors">
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {inf.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-sm text-[#212529]">{inf.name}</p>
                                            <span className="font-mono text-xs bg-[#f8f9fa] border border-[#e9ecef] px-2 py-0.5 rounded-md text-[#2a63cd] font-semibold">
                                                {inf.code}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inf.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {inf.status === 'ACTIVE' ? 'Activo' : 'Pausado'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#6a6c6b] mt-0.5 truncate">{inf.user.email}</p>
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden sm:flex items-center gap-6 text-center flex-shrink-0">
                                        <div>
                                            <p className="text-xs text-[#6a6c6b]">Conversiones</p>
                                            <p className="font-bold text-sm text-[#212529]">{inf.stats.totalConversions}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#6a6c6b]">Comisión %</p>
                                            <p className="font-bold text-sm text-[#212529]">{inf.commissionRate}%</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#6a6c6b]">Pendiente</p>
                                            <p className={`font-bold text-sm ${inf.stats.pendingCommission > 0 ? 'text-amber-600' : 'text-[#212529]'}`}>
                                                ${inf.stats.pendingCommission.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => copyToClipboard(`${BASE_URL}/registro?ref=${inf.code}`)}
                                            className="p-1.5 text-[#6a6c6b] hover:text-[#2a63cd] hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Copiar link de referido"
                                        >
                                            <FiLink className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => fetchConversions(inf)}
                                            className="p-1.5 text-[#6a6c6b] hover:text-[#2a63cd] hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Ver conversiones"
                                        >
                                            <FiEye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(inf)}
                                            className="p-1.5 text-[#6a6c6b] hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                            title={inf.status === 'ACTIVE' ? 'Pausar' : 'Activar'}
                                        >
                                            <FiToggleRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inf)}
                                            className="p-1.5 text-[#6a6c6b] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Link preview */}
                                <div className="mt-2 ml-14 flex items-center gap-2">
                                    <span className="text-[11px] text-[#6a6c6b] font-mono truncate">
                                        {BASE_URL}/registro?ref={inf.code}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(`${BASE_URL}/registro?ref=${inf.code}`)}
                                        className="flex-shrink-0 text-[10px] text-[#2a63cd] hover:underline flex items-center gap-0.5"
                                    >
                                        <FiCopy className="w-3 h-3" />
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Conversions Panel */}
            {selectedInfluencer && mounted && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-end bg-black/40 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedInfluencer(null); }}
                >
                    <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-[#e9ecef] flex items-center justify-between bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white">
                            <div>
                                <h3 className="font-bold">Conversiones — {selectedInfluencer.name}</h3>
                                <p className="text-xs opacity-70 font-mono">{selectedInfluencer.code} · {selectedInfluencer.commissionRate}% comisión</p>
                            </div>
                            <button onClick={() => setSelectedInfluencer(null)} className="p-2 hover:bg-white/20 rounded-xl">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Approve bar */}
                        {selectedConversions.length > 0 && (
                            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold text-amber-800">
                                    {selectedConversions.length} seleccionada(s) — se acreditará saldo en tienda al influencer
                                </p>
                                <button
                                    onClick={handleApproveSelected}
                                    disabled={approving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {approving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck className="w-3 h-3" />}
                                    Aprobar y Acreditar Saldo
                                </button>
                            </div>
                        )}

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                            {convLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-7 h-7 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : conversions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-[#6a6c6b]">
                                    <FiTrendingUp className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm">Sin conversiones todavía</p>
                                </div>
                            ) : (
                                conversions.map((conv) => {
                                    const { label, color } = typeLabel(conv.type);
                                    const isPending = conv.status === 'PENDING';
                                    return (
                                        <div key={conv.id} className={`flex items-center gap-3 px-4 py-3 border-b border-[#f0f0f0] transition-colors ${isPending ? 'hover:bg-amber-50/50' : ''}`}>
                                            {isPending && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedConversions.includes(conv.id)}
                                                    onChange={(e) => setSelectedConversions(prev =>
                                                        e.target.checked ? [...prev, conv.id] : prev.filter(id => id !== conv.id)
                                                    )}
                                                    className="rounded border-gray-300 text-[#2a63cd]"
                                                />
                                            )}
                                            {!isPending && <div className="w-4 flex-shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>{label}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${conv.status === 'APPROVED' ? 'bg-green-100 text-green-700' : conv.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                                        {conv.status === 'APPROVED' ? 'Aprobado' : conv.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#6a6c6b] mt-0.5 truncate">
                                                    {conv.referredUser.name || conv.referredUser.email}
                                                </p>
                                                <p className="text-[10px] text-[#aaa] mt-0.5">
                                                    {new Date(conv.createdAt).toLocaleDateString('es-VE')}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {conv.grossAmount > 0 && (
                                                    <p className="text-xs text-[#6a6c6b]">${Number(conv.grossAmount).toFixed(2)}</p>
                                                )}
                                                <p className="text-sm font-bold text-emerald-600">+${Number(conv.commission).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Create Modal */}
            {showCreate && mounted && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] px-6 py-4 flex items-center justify-between">
                            <h2 className="font-bold text-white">Nuevo Influencer</h2>
                            <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/20 rounded-xl">
                                <FiX className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* User search */}
                            <div>
                                <label className="block text-xs font-semibold text-[#212529] mb-1.5">Usuario existente *</label>
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => { setUserSearch(e.target.value); searchUsers(e.target.value); }}
                                    placeholder="Buscar por nombre o email..."
                                    className="w-full px-3 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                />
                                {userResults.length > 0 && (
                                    <div className="mt-1 border border-[#e9ecef] rounded-lg overflow-hidden shadow-sm">
                                        {userResults.map((u) => (
                                            <button
                                                key={u.id}
                                                onClick={() => {
                                                    setCreateForm(f => ({ ...f, userId: u.id, name: u.name || '' }));
                                                    setUserSearch(u.email || u.name || '');
                                                    setUserResults([]);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-[#f8f9fa] border-b border-[#f0f0f0] last:border-0"
                                            >
                                                <p className="font-medium text-[#212529]">{u.name}</p>
                                                <p className="text-xs text-[#6a6c6b]">{u.email}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">Código único *</label>
                                    <input
                                        type="text"
                                        value={createForm.code}
                                        onChange={(e) => setCreateForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                        placeholder="GAMER2024"
                                        maxLength={20}
                                        className="w-full px-3 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] font-mono uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#212529] mb-1.5">Comisión %</label>
                                    <input
                                        type="number"
                                        min="1" max="50" step="0.5"
                                        value={createForm.commissionRate}
                                        onChange={(e) => setCreateForm(f => ({ ...f, commissionRate: e.target.value }))}
                                        className="w-full px-3 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#212529] mb-1.5">Nombre para mostrar *</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Ej: GamerPro VE"
                                    className="w-full px-3 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#212529] mb-1.5">Notas internas (opcional)</label>
                                <textarea
                                    value={createForm.notes}
                                    onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    placeholder="Canal, acuerdo, etc."
                                    className="w-full px-3 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd] resize-none"
                                />
                            </div>

                            {/* Preview link */}
                            {createForm.code && (
                                <div className="bg-[#f8f9fa] rounded-lg p-3 border border-[#e9ecef]">
                                    <p className="text-[10px] text-[#6a6c6b] font-semibold uppercase mb-1">Link de referido</p>
                                    <p className="text-xs text-[#2a63cd] font-mono break-all">
                                        {BASE_URL}/registro?ref={createForm.code}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-[#f8f9fa] border-t border-[#e9ecef] flex justify-end gap-3">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-[#6a6c6b] hover:text-[#212529] font-medium">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className="flex items-center gap-2 px-5 py-2 bg-[#2a63cd] text-white text-sm font-semibold rounded-lg hover:bg-[#1e4ba3] disabled:opacity-60"
                            >
                                {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiPlus className="w-4 h-4" />}
                                Crear Influencer
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// ─── Email Config Tab ────────────────────────────────────────────────────────

function EmailTab() {
    const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    useEffect(() => { fetchEmailConfig(); }, []);

    const fetchEmailConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/email');
            if (res.ok) {
                const data = await res.json();
                setEmailConfig(data.config);
            }
        } finally { setLoading(false); }
    };

    const sendTestEmail = async () => {
        if (!testEmail) { toast.error('Ingresa un email'); return; }
        setSendingTest(true);
        try {
            const res = await fetch('/api/admin/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'test', email: testEmail }),
            });
            const data = await res.json();
            if (res.ok) toast.success(`Email de prueba enviado a ${testEmail}`);
            else toast.error(data.error || 'Error al enviar');
        } catch { toast.error('Error de conexión'); }
        finally { setSendingTest(false); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e9ecef] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FiServer className="w-4 h-4 text-[#2a63cd]" />
                        <h2 className="font-bold text-sm text-[#212529]">Estado del Servicio</h2>
                    </div>
                    {emailConfig && (
                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${emailConfig.host === 'Configurado' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {emailConfig.host === 'Configurado' ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
                            {emailConfig.host === 'Configurado' ? 'Activo' : 'Inactivo'}
                        </span>
                    )}
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-7 h-7 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : emailConfig ? (
                    <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: 'Proveedor', value: emailConfig.provider },
                            { label: 'SMTP', value: emailConfig.host },
                            { label: 'Notificaciones', value: emailConfig.notificationsEnabled ? '✓ Activo' : '✗ Inactivo' },
                            { label: 'Marketing', value: emailConfig.marketingEnabled ? '✓ Activo' : '✗ Inactivo' },
                        ].map(({ label, value }) => (
                            <div key={label} className="text-center p-3 bg-[#f8f9fa] rounded-lg">
                                <p className="text-[10px] text-[#6a6c6b] uppercase font-semibold mb-0.5">{label}</p>
                                <p className="text-sm font-bold text-[#212529] capitalize">{value}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<FiAlertCircle className="w-6 h-6" />} title="Sin configuración" description="No se pudo cargar la configuración de email" />
                )}
            </div>

            <div className="bg-white rounded-xl border border-[#e9ecef] p-4">
                <p className="text-sm font-semibold text-[#212529] mb-3">Enviar email de prueba</p>
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6c6b]" />
                        <input
                            type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Dirección de email..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#e9ecef] rounded-lg focus:ring-2 focus:ring-[#2a63cd]/20 focus:border-[#2a63cd]"
                        />
                    </div>
                    <button
                        onClick={sendTestEmail} disabled={sendingTest || !testEmail}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#2a63cd] text-white text-sm font-medium rounded-lg hover:bg-[#1e4ba3] disabled:opacity-50 whitespace-nowrap"
                    >
                        {sendingTest ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSend className="w-4 h-4" />}
                        Enviar Prueba
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Preview Tab ─────────────────────────────────────────────────────────────

interface EmailTemplate { id: string; name: string; description: string }

function PreviewTab() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [selected, setSelected] = useState('welcome');
    const [previewHtml, setPreviewHtml] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

    useEffect(() => {
        fetch('/api/admin/email/preview').then(r => r.json()).then(d => setTemplates(d.templates || []));
    }, []);

    useEffect(() => {
        if (!selected) return;
        setLoading(true);
        fetch(`/api/admin/email/preview?template=${selected}`)
            .then(r => r.json())
            .then(d => setPreviewHtml(d.html || ''))
            .finally(() => setLoading(false));
    }, [selected]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[#e9ecef] p-4">
                <h3 className="font-bold text-sm text-[#212529] mb-3">Template</h3>
                <div className="space-y-2">
                    {templates.map((t) => (
                        <button key={t.id} onClick={() => setSelected(t.id)}
                            className={`w-full text-left p-3 rounded-lg transition-all ${selected === t.id ? 'bg-[#2a63cd]/10 border-[#2a63cd] border' : 'bg-[#f8f9fa] border border-transparent hover:border-[#e9ecef]'}`}
                        >
                            <p className={`font-semibold text-sm ${selected === t.id ? 'text-[#2a63cd]' : 'text-[#212529]'}`}>{t.name}</p>
                            <p className="text-xs text-[#6a6c6b] mt-0.5">{t.description}</p>
                        </button>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-3 bg-white rounded-xl border border-[#e9ecef] overflow-hidden">
                <div className="bg-[#f8f9fa] p-3 border-b border-[#e9ecef] flex items-center justify-between">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#e9ecef]">
                        {(['desktop', 'mobile'] as const).map((m) => (
                            <button key={m} onClick={() => setViewMode(m)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === m ? 'bg-[#2a63cd] text-white' : 'text-[#6a6c6b]'}`}
                            >{m === 'desktop' ? 'Desktop' : 'Mobile'}</button>
                        ))}
                    </div>
                </div>
                <div className="bg-[#f4f4f7] p-4 flex justify-center min-h-[600px] overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center w-full">
                            <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className={`bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 ${viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[650px]'}`}>
                            <iframe srcDoc={previewHtml} className="w-full h-[800px] border-0" title="Preview" sandbox="allow-same-origin" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Hot Ad Tab ───────────────────────────────────────────────────────────────

interface HotAdState {
    hotAdEnabled: boolean;
    hotAdImage: string | null;
    hotAdLink: string;
    hotAdTransparentBg: boolean;
    hotAdShadowEnabled: boolean;
    hotAdShadowBlur: number;
    hotAdShadowOpacity: number;
    hotAdBackdropOpacity: number;
    hotAdBackdropColor: string;
}

const HOT_AD_DEFAULTS: HotAdState = {
    hotAdEnabled: false, hotAdImage: null, hotAdLink: '',
    hotAdTransparentBg: false, hotAdShadowEnabled: true,
    hotAdShadowBlur: 20, hotAdShadowOpacity: 50,
    hotAdBackdropOpacity: 70, hotAdBackdropColor: '#000000',
};

function HotAdToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500" />
        </label>
    );
}

function HotAdTab() {
    const [ad, setAd] = useState<HotAdState>(HOT_AD_DEFAULTS);
    const [initial, setInitial] = useState<HotAdState>(HOT_AD_DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasChanges = JSON.stringify(ad) !== JSON.stringify(initial);

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                const loaded: HotAdState = {
                    hotAdEnabled:        data.hotAdEnabled        ?? false,
                    hotAdImage:          data.hotAdImage          || null,
                    hotAdLink:           data.hotAdLink           || '',
                    hotAdTransparentBg:  data.hotAdTransparentBg  ?? false,
                    hotAdShadowEnabled:  data.hotAdShadowEnabled  ?? true,
                    hotAdShadowBlur:     data.hotAdShadowBlur     ?? 20,
                    hotAdShadowOpacity:  data.hotAdShadowOpacity  ?? 50,
                    hotAdBackdropOpacity:data.hotAdBackdropOpacity ?? 70,
                    hotAdBackdropColor:  data.hotAdBackdropColor  || '#000000',
                };
                setAd(loaded);
                setInitial(loaded);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const set = <K extends keyof HotAdState>(key: K, value: HotAdState[K]) =>
        setAd(prev => ({ ...prev, [key]: value }));

    const uploadImage = async (file: File) => {
        if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return; }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'hotAd');
        try {
            const res = await fetch('/api/upload/settings', { method: 'POST', body: fd });
            if (!res.ok) { toast.error('Error al subir imagen'); return; }
            const { url } = await res.json();
            set('hotAdImage', url);
            toast.success('Imagen subida');
        } catch { toast.error('Error de conexión'); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ad),
            });
            if (res.ok) {
                setInitial(ad);
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
                toast.success('Publicidad guardada');
            } else {
                toast.error('Error al guardar');
            }
        } catch { toast.error('Error de conexión'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;

    return (
        <div className="space-y-5 max-w-2xl">
            {/* Header card */}
            <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${ad.hotAdEnabled ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300' : 'bg-white border-gray-200'}`}>
                <div className={`flex items-center justify-between px-5 py-4 border-b ${ad.hotAdEnabled ? 'border-orange-200 bg-gradient-to-r from-orange-100 to-red-100' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                        <FiRadio className={`w-5 h-5 ${ad.hotAdEnabled ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`} />
                        <div>
                            <h3 className="font-semibold text-gray-900">Publicidad Caliente</h3>
                            <p className="text-xs text-gray-500">Popup de imagen en la pantalla principal</p>
                        </div>
                        {ad.hotAdEnabled && (
                            <span className="px-2 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-bold animate-pulse">ACTIVO</span>
                        )}
                    </div>
                    <HotAdToggle checked={ad.hotAdEnabled} onChange={v => set('hotAdEnabled', v)} />
                </div>

                <div className="p-5 space-y-5">
                    <p className="text-xs text-gray-600 flex items-start gap-2">
                        <FiActivity className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                        Muestra una imagen promocional sobre la página principal cuando los visitantes llegan. Ideal para lanzamientos, ofertas especiales o eventos importantes.
                    </p>

                    {/* Image upload */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Imagen Promocional</p>
                        <div className="flex items-start gap-4">
                            <div
                                className={`w-36 h-24 rounded-xl border-2 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden relative group cursor-pointer transition-colors ${ad.hotAdImage ? 'border-green-300' : 'border-gray-300 hover:border-orange-400'}`}
                                onClick={() => inputRef.current?.click()}
                            >
                                {ad.hotAdImage ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={ad.hotAdImage} alt="Hot Ad" className="w-full h-full object-contain p-1" />
                                        <button
                                            onClick={e => { e.stopPropagation(); set('hotAdImage', null); }}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <FiX className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <FiUpload className="w-6 h-6 mx-auto mb-1" />
                                        <span className="text-[10px]">Subir imagen</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => inputRef.current?.click()}
                                    className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md transition-colors shadow-sm block"
                                >
                                    {ad.hotAdImage ? 'Cambiar imagen' : 'Seleccionar imagen'}
                                </button>
                                <span className="text-[10px] text-gray-400 block">PNG o JPG — máx 5MB</span>
                            </div>
                        </div>
                    </div>

                    {/* Link */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Link al hacer clic <span className="font-normal text-gray-400">(opcional)</span></p>
                        <input
                            type="url"
                            value={ad.hotAdLink}
                            onChange={e => set('hotAdLink', e.target.value)}
                            placeholder="https://tu-tienda.com/oferta"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Visual options */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                    <FiImage className="text-gray-500 w-4 h-4" />
                    <h3 className="font-semibold text-sm text-gray-800">Opciones Visuales</h3>
                </div>
                <div className="p-5 space-y-4">
                    {[
                        { key: 'hotAdTransparentBg' as const, label: 'Fondo Transparente', desc: 'Sin borde redondeado alrededor de la imagen' },
                        { key: 'hotAdShadowEnabled' as const, label: 'Sombra de imagen', desc: 'Agrega profundidad y destaca la imagen' },
                    ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                                <p className="text-sm font-medium text-gray-700">{label}</p>
                                <p className="text-xs text-gray-500">{desc}</p>
                            </div>
                            <HotAdToggle checked={ad[key] as boolean} onChange={v => set(key, v)} />
                        </div>
                    ))}

                    {ad.hotAdShadowEnabled && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <div>
                                <p className="text-xs font-semibold text-gray-700 mb-2">Grosor sombra: {ad.hotAdShadowBlur}px</p>
                                <input type="range" min="5" max="100" value={ad.hotAdShadowBlur} onChange={e => set('hotAdShadowBlur', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-700 mb-2">Opacidad sombra: {ad.hotAdShadowOpacity}%</p>
                                <input type="range" min="10" max="100" value={ad.hotAdShadowOpacity} onChange={e => set('hotAdShadowOpacity', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                            </div>
                        </div>
                    )}

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Opacidad del fondo: {ad.hotAdBackdropOpacity}%</p>
                        <input type="range" min="30" max="95" value={ad.hotAdBackdropOpacity} onChange={e => set('hotAdBackdropOpacity', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700" />
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Color del fondo</p>
                        <div className="flex items-center gap-3">
                            <input type="color" value={ad.hotAdBackdropColor} onChange={e => set('hotAdBackdropColor', e.target.value)} className="h-10 w-14 rounded-lg cursor-pointer border-2 border-gray-300 p-0" />
                            <span className="text-sm font-mono text-gray-600">{ad.hotAdBackdropColor}</span>
                            <div className="w-16 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-[8px] text-white font-bold flex-shrink-0" style={{ backgroundColor: ad.hotAdBackdropColor, opacity: ad.hotAdBackdropOpacity / 100 }}>
                                PREVIEW
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${hasChanges ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} disabled:opacity-60`}
                >
                    {saving ? <><FiRefreshCw className="w-4 h-4 animate-spin" /> Guardando...</>
                     : saved ? <><FiCheck className="w-4 h-4" /> Guardado</>
                     : <><FiSave className="w-4 h-4" /> {hasChanges ? 'Guardar publicidad' : 'Sin cambios'}</>}
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = 'influencers' | 'hotad' | 'email' | 'preview' | 'social' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'influencers', label: 'Influencers',    icon: FiUserCheck, badge: 'NUEVO' },
    { id: 'hotad',       label: 'Publicidad',      icon: FiTv },
    { id: 'email',       label: 'Email',            icon: FiMail },
    { id: 'preview',     label: 'Plantillas',       icon: FiEye },
    { id: 'social',      label: 'Redes Sociales',   icon: FiImage },
    { id: 'settings',    label: 'Configuración',    icon: FiSettings },
];

export default function MarketingPage() {
    const [activeTab, setActiveTab] = useState<Tab>('influencers');

    return (
        <div className="space-y-5">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {TABS.map(({ id, label, icon: Icon, badge }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id
                            ? 'bg-[#2a63cd] text-white shadow-sm'
                            : 'bg-white border border-[#e9ecef] text-[#6a6c6b] hover:border-[#2a63cd]/30 hover:text-[#2a63cd]'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                        {badge && (
                            <span className="ml-0.5 bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'influencers' && <InfluencersTab />}
            {activeTab === 'hotad'       && <HotAdTab />}
            {activeTab === 'email'       && <EmailTab />}
            {activeTab === 'preview'     && <PreviewTab />}
            {activeTab === 'social'      && <SocialMediaGenerator />}
            {activeTab === 'settings'    && <EmailSettingsPanel />}
        </div>
    );
}
