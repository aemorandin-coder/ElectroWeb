'use client';

import { useState, useEffect } from 'react';

type Creator = {
  id: string;
  displayName: string;
  bio: string | null;
  expertise: string | null;
  status: string;
  notes: string | null;
  commissionRate: number;
  totalRevenue: number;
  createdAt: string;
  user: { name: string | null; email: string; image: string | null };
  _count: { courses: number };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-gray-100 text-gray-700',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado', SUSPENDED: 'Suspendido',
};

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState<{ creator: Creator; action: 'APPROVED' | 'REJECTED' | 'SUSPENDED' } | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/creators')
      .then((r) => r.json())
      .then((data) => setCreators(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange() {
    if (!modal) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/creators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modal.creator.id, status: modal.action, notes }),
      });
      if (res.ok) {
        setCreators((prev) =>
          prev.map((c) => c.id === modal.creator.id ? { ...c, status: modal.action, notes } : c)
        );
        setModal(null);
        setNotes('');
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
      }
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter === 'ALL' ? creators : creators.filter((c) => c.status === filter);
  const counts = { ALL: creators.length, PENDING: creators.filter((c) => c.status === 'PENDING').length, APPROVED: creators.filter((c) => c.status === 'APPROVED').length, REJECTED: creators.filter((c) => c.status === 'REJECTED').length };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#212529]">Solicitudes de Creadores</h1>
          <p className="text-sm text-[#6a6c6b] mt-0.5">Revisa y aprueba solicitudes para acceder a la plataforma de creadores.</p>
        </div>
        <span className="text-sm text-[#6a6c6b] bg-[#f8f9fa] px-3 py-1 rounded-full">{creators.length} total</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#e9ecef] pb-4">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              filter === s
                ? 'bg-[#2a63cd] text-white'
                : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'
            }`}
          >
            {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
            <span className="ml-1.5 text-xs opacity-70">
              {counts[s as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#6a6c6b]">No hay solicitudes {filter !== 'ALL' ? STATUS_LABELS[filter].toLowerCase() + 's' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((creator) => (
            <div key={creator.id} className="bg-white border border-[#e9ecef] rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a63cd] to-cyan-500 flex items-center justify-center text-white text-lg font-black flex-shrink-0">
                  {creator.displayName[0]?.toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-[#212529]">{creator.displayName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[creator.status]}`}>
                      {STATUS_LABELS[creator.status]}
                    </span>
                    {creator.expertise && (
                      <span className="text-xs bg-[#f8f9fa] text-[#6a6c6b] px-2 py-0.5 rounded-full">
                        {creator.expertise}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-[#6a6c6b] mt-0.5">
                    {creator.user.name} · {creator.user.email}
                  </div>

                  {creator.bio && (
                    <p className="text-sm text-[#6a6c6b] mt-2 line-clamp-2">{creator.bio}</p>
                  )}

                  {creator.notes && (
                    <div className="mt-2 px-3 py-2 bg-[#f8f9fa] rounded-lg text-xs text-[#6a6c6b] border border-[#e9ecef]">
                      <strong>Notas:</strong> {creator.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-[#6a6c6b]">
                    <span>{creator._count.courses} cursos</span>
                    <span>${creator.totalRevenue.toFixed(2)} ingresos</span>
                    <span>{new Date(creator.createdAt).toLocaleDateString('es-VE')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {creator.status !== 'APPROVED' && (
                    <button
                      onClick={() => { setModal({ creator, action: 'APPROVED' }); setNotes(''); }}
                      className="px-4 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                    >
                      Aprobar
                    </button>
                  )}
                  {creator.status !== 'REJECTED' && (
                    <button
                      onClick={() => { setModal({ creator, action: 'REJECTED' }); setNotes(''); }}
                      className="px-4 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                      Rechazar
                    </button>
                  )}
                  {creator.status === 'APPROVED' && (
                    <button
                      onClick={() => { setModal({ creator, action: 'SUSPENDED' }); setNotes(''); }}
                      className="px-4 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      Suspender
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h3 className="text-lg font-bold text-[#212529] mb-1">
              {modal.action === 'APPROVED' ? 'Aprobar' : modal.action === 'REJECTED' ? 'Rechazar' : 'Suspender'} a {modal.creator.displayName}
            </h3>
            <p className="text-sm text-[#6a6c6b] mb-4">
              {modal.action === 'APPROVED'
                ? 'El creador podrá publicar cursos en la plataforma.'
                : modal.action === 'REJECTED'
                ? 'El creador no podrá acceder a la plataforma de creadores.'
                : 'El creador ya no podrá publicar nuevos cursos.'}
            </p>
            <label className="block text-xs font-semibold text-[#6a6c6b] mb-1.5">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-[#dee2e6] rounded-xl text-sm text-[#212529] focus:outline-none focus:border-[#2a63cd] resize-none"
              placeholder="Razón del rechazo, instrucciones, etc."
            />
            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={() => { setModal(null); setNotes(''); }}
                className="px-5 py-2 bg-[#f8f9fa] text-[#6a6c6b] text-sm font-semibold rounded-xl hover:bg-[#e9ecef] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStatusChange}
                disabled={saving}
                className={`px-5 py-2 text-white text-sm font-bold rounded-xl transition-opacity disabled:opacity-50 ${
                  modal.action === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : modal.action === 'REJECTED'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
