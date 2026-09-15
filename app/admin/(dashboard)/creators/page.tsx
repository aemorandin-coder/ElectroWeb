'use client';

import { adminModalOverlay, adminModalPanel } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { formatUSD } from '@/lib/currency';


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
  PENDING: 'bg-warning/10 text-warning-strong',
  APPROVED: 'bg-success/10 text-success-strong',
  REJECTED: 'bg-deal/10 text-deal',
  SUSPENDED: 'bg-surface text-ink-soft',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado', SUSPENDED: 'Suspendido',
};

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState<{ creator: Creator; action: 'APPROVED' | 'REJECTED' | 'SUSPENDED' } | null>(null);
  useBodyScrollLock(Boolean(modal));
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
          <h1 className="text-xl font-bold text-ink">Solicitudes de Creadores</h1>
          <p className="text-sm text-muted mt-0.5">Revisa y aprueba solicitudes para acceder a la plataforma de creadores.</p>
        </div>
        <span className="text-sm text-muted bg-surface px-3 py-1 rounded-full">{creators.length} total</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-line pb-4">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              filter === s
                ? 'bg-brand-500 text-white'
                : 'bg-surface text-muted hover:bg-line'
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
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted">No hay solicitudes {filter !== 'ALL' ? STATUS_LABELS[filter].toLowerCase() + 's' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((creator) => (
            <div key={creator.id} className="bg-white border border-line rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {creator.displayName[0]?.toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-ink">{creator.displayName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[creator.status]}`}>
                      {STATUS_LABELS[creator.status]}
                    </span>
                    {creator.expertise && (
                      <span className="text-xs bg-surface text-muted px-2 py-0.5 rounded-full">
                        {creator.expertise}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-muted mt-0.5">
                    {creator.user.name} · {creator.user.email}
                  </div>

                  {creator.bio && (
                    <p className="text-sm text-muted mt-2 line-clamp-2">{creator.bio}</p>
                  )}

                  {creator.notes && (
                    <div className="mt-2 px-3 py-2 bg-surface rounded-lg text-xs text-muted border border-line">
                      <strong>Notas:</strong> {creator.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                    <span>{creator._count.courses} cursos</span>
                    <span>{formatUSD(creator.totalRevenue)} ingresos</span>
                    <span>{new Date(creator.createdAt).toLocaleDateString('es-VE')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {creator.status !== 'APPROVED' && (
                    <button
                      onClick={() => { setModal({ creator, action: 'APPROVED' }); setNotes(''); }}
                      className="px-4 py-1.5 bg-success/10 text-success-strong text-xs font-semibold rounded-lg bg-success/10 transition-colors border border-success/20"
                    >
                      Aprobar
                    </button>
                  )}
                  {creator.status !== 'REJECTED' && (
                    <button
                      onClick={() => { setModal({ creator, action: 'REJECTED' }); setNotes(''); }}
                      className="px-4 py-1.5 bg-deal/10 text-deal text-xs font-semibold rounded-lg bg-deal/10 transition-colors border border-deal/30"
                    >
                      Rechazar
                    </button>
                  )}
                  {creator.status === 'APPROVED' && (
                    <button
                      onClick={() => { setModal({ creator, action: 'SUSPENDED' }); setNotes(''); }}
                      className="px-4 py-1.5 bg-surface text-muted text-xs font-semibold rounded-lg hover:bg-surface transition-colors border border-line"
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
        <div className={adminModalOverlay} onClick={() => setModal(null)}>
          <div className={`${adminModalPanel} sm:max-w-md p-6`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink mb-1">
              {modal.action === 'APPROVED' ? 'Aprobar' : modal.action === 'REJECTED' ? 'Rechazar' : 'Suspender'} a {modal.creator.displayName}
            </h3>
            <p className="text-sm text-muted mb-4">
              {modal.action === 'APPROVED'
                ? 'El creador podrá publicar cursos en la plataforma.'
                : modal.action === 'REJECTED'
                ? 'El creador no podrá acceder a la plataforma de creadores.'
                : 'El creador ya no podrá publicar nuevos cursos.'}
            </p>
            <label className="block text-xs font-semibold text-muted mb-1.5">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-line-strong rounded-xl text-sm text-ink focus:outline-none focus:border-brand-500 resize-none"
              placeholder="Razón del rechazo, instrucciones, etc."
            />
            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={() => { setModal(null); setNotes(''); }}
                className="px-5 py-2 bg-surface text-muted text-sm font-semibold rounded-xl hover:bg-line transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStatusChange}
                disabled={saving}
                className={`px-5 py-2 text-white text-sm font-bold rounded-xl transition-opacity disabled:opacity-50 ${
                  modal.action === 'APPROVED'
                    ? 'bg-success bg-success'
                    : modal.action === 'REJECTED'
                    ? 'bg-deal hover:bg-deal/90'
                    : 'bg-ink-soft hover:bg-ink'
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
