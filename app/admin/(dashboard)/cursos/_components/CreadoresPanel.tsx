'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Filtros from '@/components/admin/Filtros';
import ModalDialog from '@/components/ui/ModalDialog';
import { IconoCerrar, IconoConfirmado, IconoLista, IconoRechazado, IconoReloj } from '@/components/iconos';
import {
  adminBadge, adminCard, adminDangerButton, adminIconButton, adminInput, adminLabel, adminModalBody, adminModalFooter,
  adminModalHeader, adminModalTitle, adminPrimaryButton, adminSecondaryButton, adminSpinner, adminSuccessButton,
} from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';

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
  PENDING: adminBadge('warning'),
  APPROVED: adminBadge('success'),
  REJECTED: adminBadge('danger'),
  SUSPENDED: adminBadge('neutral'),
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SUSPENDED: 'Suspendido',
};

export default function CreadoresPanel() {
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
          prev.map((c) => (c.id === modal.creator.id ? { ...c, status: modal.action, notes } : c))
        );
        toast.success(`Creador ${STATUS_LABELS[modal.action].toLowerCase()}`);
        setModal(null);
        setNotes('');
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'No se pudo actualizar la solicitud');
      }
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter === 'ALL' ? creators : creators.filter((c) => c.status === filter);
  const counts = {
    ALL: creators.length,
    PENDING: creators.filter((c) => c.status === 'PENDING').length,
    APPROVED: creators.filter((c) => c.status === 'APPROVED').length,
    REJECTED: creators.filter((c) => c.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-5">
      <Filtros
        etiqueta="Filtrar creadores"
        valor={filter}
        onCambiar={setFilter}
        filtros={[
          { valor: 'ALL', etiqueta: 'Todos', ayuda: 'Todas las solicitudes', Icono: IconoLista, cuenta: counts.ALL },
          { valor: 'PENDING', etiqueta: 'Pendientes', ayuda: 'Esperan tu revisión', Icono: IconoReloj, tono: 'aviso', cuenta: counts.PENDING },
          { valor: 'APPROVED', etiqueta: 'Aprobados', ayuda: 'Ya tienen acceso', Icono: IconoConfirmado, cuenta: counts.APPROVED },
          { valor: 'REJECTED', etiqueta: 'Rechazados', ayuda: 'Con sus notas', Icono: IconoRechazado, cuenta: counts.REJECTED },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <span className={adminSpinner} aria-label="Cargando creadores" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${adminCard} py-12 text-center`}>
          <p className="text-sm text-muted">
            {filter === 'ALL' ? 'No hay solicitudes.' : `No hay solicitudes ${STATUS_LABELS[filter].toLowerCase()}s.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((creator) => (
            <div key={creator.id} className={adminCard}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
                  {creator.displayName[0]?.toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ink">{creator.displayName}</h3>
                    <span className={STATUS_STYLES[creator.status] ?? adminBadge('neutral')}>
                      {STATUS_LABELS[creator.status]}
                    </span>
                    {creator.expertise && (
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted ring-1 ring-inset ring-line">
                        {creator.expertise}
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 text-sm text-muted">
                    {creator.user.name} · {creator.user.email}
                  </div>

                  {creator.bio && (
                    <p className="mt-2 line-clamp-2 max-w-prose text-sm text-ink-soft">{creator.bio}</p>
                  )}

                  {creator.notes && (
                    <div className="mt-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
                      <strong>Notas:</strong> {creator.notes}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs tabular-nums text-muted">
                    <span>{creator._count.courses} cursos</span>
                    <span>{formatUSD(creator.totalRevenue)} ingresos</span>
                    <span>{new Date(creator.createdAt).toLocaleDateString('es-VE')}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:flex-col sm:shrink-0">
                  {creator.status !== 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => { setModal({ creator, action: 'APPROVED' }); setNotes(''); }}
                      className={adminSuccessButton}
                    >
                      Aprobar
                    </button>
                  )}
                  {creator.status !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => { setModal({ creator, action: 'REJECTED' }); setNotes(''); }}
                      className={`${adminSecondaryButton} text-deal!`}
                    >
                      Rechazar
                    </button>
                  )}
                  {creator.status === 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => { setModal({ creator, action: 'SUSPENDED' }); setNotes(''); }}
                      className={adminSecondaryButton}
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

      <ModalDialog
        open={Boolean(modal)}
        onClose={() => { setModal(null); setNotes(''); }}
        ariaLabelledBy="creador-modal-titulo"
        size="md"
      >
        {modal && (
          <>
            <div className={adminModalHeader}>
              <h3 id="creador-modal-titulo" className={adminModalTitle}>
                {modal.action === 'APPROVED' ? 'Aprobar' : modal.action === 'REJECTED' ? 'Rechazar' : 'Suspender'} a {modal.creator.displayName}
              </h3>
              <button
                type="button"
                onClick={() => { setModal(null); setNotes(''); }}
                aria-label="Cerrar"
                className={adminIconButton}
              >
                <IconoCerrar className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className={`${adminModalBody} space-y-4`}>
              <p className="text-sm text-muted">
                {modal.action === 'APPROVED'
                  ? 'El creador podrá publicar cursos en la plataforma.'
                  : modal.action === 'REJECTED'
                  ? 'El creador no podrá acceder a la plataforma de creadores.'
                  : 'El creador ya no podrá publicar nuevos cursos.'}
              </p>
              <div>
                <label htmlFor="creador-notas" className={adminLabel}>Notas (opcional)</label>
                <textarea
                  id="creador-notas"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={`${adminInput()} h-auto resize-none py-2.5`}
                  placeholder="Razón del rechazo, instrucciones, etc."
                />
              </div>
            </div>
            <div className={adminModalFooter}>
              <button
                type="button"
                onClick={() => { setModal(null); setNotes(''); }}
                className={adminSecondaryButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={saving}
                className={
                  modal.action === 'APPROVED'
                    ? adminSuccessButton
                    : modal.action === 'REJECTED'
                    ? adminDangerButton
                    : adminPrimaryButton
                }
              >
                {saving ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </ModalDialog>
    </div>
  );
}
