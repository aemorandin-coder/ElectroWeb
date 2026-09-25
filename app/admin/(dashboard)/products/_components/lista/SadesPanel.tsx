'use client';

import { useEffect, useState } from 'react';
import { FiDatabase, FiRefreshCw } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/contexts/ConfirmDialogContext';

// Conexión con ElectroCaja/SADES (C-51: movida tal cual desde products/page.tsx, con los colores del sistema)
export default function SadesPanel({ onSincronizado }: { onSincronizado: () => void }) {
  const { confirm } = useConfirm();
  const [sadesHealth, setSadesHealth] = useState<'checking' | 'ok' | 'error'>('checking');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, totalEstimado: 0, created: 0, updated: 0, status: 'idle' });
  const [syncLogs, setSyncLogs] = useState<{ message: string; timestamp: string }[]>([]);

  const addSyncLog = (message: string) => {
    setSyncLogs(prev => [{ message, timestamp: new Date().toLocaleTimeString() }, ...prev]);
  };

  // --- SADES LOGIC ---
  const checkSadesHealth = async () => {
    setSadesHealth('checking');
    try {
      const res = await fetch('/api/admin/sades/health');
      setSadesHealth(res.ok ? 'ok' : 'error');
    } catch {
      setSadesHealth('error');
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;

    const confirmSync = await confirm({
      title: "Iniciar sincronización",
      message: "¿Estás seguro de iniciar la sincronización?\n\n• Se actualizarán precios y stocks de productos existentes (por SKU).\n• Se crearán nuevos productos como BORRADOR.\n• Se descargarán las imágenes.\n\nEste proceso puede tardar varios minutos.",
      confirmText: "Sincronizar",
      cancelText: "Cancelar",
      type: "warning"
    });

    if (!confirmSync) return;

    setIsSyncing(true);
    setSyncProgress({ processed: 0, totalEstimado: 0, created: 0, updated: 0, status: 'starting' });
    setSyncLogs([{ message: 'Iniciando sincronización...', timestamp: new Date().toLocaleTimeString() }]);

    let cursor = 0;
    let hasMore = true;
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;

    try {
      while (hasMore) {
        addSyncLog(`Solicitando lote (cursor: ${cursor})...`);

        const res = await fetch('/api/admin/sades/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursor })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error en la sincronización');
        }

        const data = await res.json();

        totalProcessed += data.processed;
        totalCreated += data.created;
        totalUpdated += data.updated;

        setSyncProgress({
          processed: totalProcessed,
          totalEstimado: data.hasMore ? totalProcessed + 100 : totalProcessed,
          created: totalCreated,
          updated: totalUpdated,
          status: 'processing'
        });

        addSyncLog(`Lote procesado: ${data.processed} items (${data.created} nuevos, ${data.updated} actualizados)`);

        cursor = data.nextCursor;
        hasMore = data.hasMore;

        await new Promise(r => setTimeout(r, 1000));
      }

      addSyncLog('Sincronización completada con éxito.');
      setSyncProgress(prev => ({ ...prev, status: 'completed' }));

      onSincronizado();

    } catch (error) {
      console.error('Sync error:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      addSyncLog(`Error crítico: ${msg}`);
      setSyncProgress(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsSyncing(false);
    }
  };


  useEffect(() => {
    const t = setTimeout(() => { void checkSadesHealth(); }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-line p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${sadesHealth === 'ok' ? 'bg-success/10 text-success-strong' : 'bg-deal-bg text-deal'}`}>
              <FiDatabase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Conexión ElectroCaja / Sades</h2>
              <p className="text-sm text-muted">Sincroniza inventario, precios e imágenes en tiempo real.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex h-3 w-3 rounded-full ${sadesHealth === 'ok' ? 'bg-success' : 'bg-deal'}`} />
            <span className="text-sm font-medium text-ink-soft">
              {sadesHealth === 'ok' ? 'Conectado' : 'Sin Conexión'}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-line flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Fuente de Verdad</p>
              <p className="font-medium text-ink">SADES (Remoto)</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Modo de Sync</p>
              <p className="font-medium text-ink">Actualizar + Crear Borradores</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Identificador</p>
              <p className="font-medium text-ink">SKU (Código de Barras)</p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleSync}
            isLoading={isSyncing}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            <FiRefreshCw className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Todo Ahora'}
          </Button>
        </div>
      </div>

      {/* Sync Progress UI */}
      {(isSyncing || syncProgress.status !== 'idle') && (
        <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
          <div className="p-4 bg-surface border-b border-line flex justify-between items-center">
            <h3 className="font-semibold text-ink">Progreso de Sincronización</h3>
            <span className="text-xs font-mono text-muted">
              {syncProgress.processed} items procesados
            </span>
          </div>

          <div className="p-6 space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-line rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-brand-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min((syncProgress.processed / (syncProgress.totalEstimado || 1)) * 100, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-success/5 rounded-lg">
                <p className="text-2xl font-bold text-success-strong">{syncProgress.created}</p>
                <p className="text-xs text-success-strong">Nuevos (Borradores)</p>
              </div>
              <div className="p-3 bg-brand-50 rounded-lg">
                <p className="text-2xl font-bold text-brand-600">{syncProgress.updated}</p>
                <p className="text-xs text-brand-700">Actualizados</p>
              </div>
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-2xl font-bold text-ink-soft">{syncProgress.processed}</p>
                <p className="text-xs text-ink">Total Escaneados</p>
              </div>
            </div>

            {/* Logs Console */}
            <div className="mt-4 bg-ink rounded-lg p-4 font-mono text-xs text-subtle h-48 overflow-y-auto custom-scrollbar">
              {syncLogs.length === 0 ? (
                <span className="text-ink-soft italic">Esperando inicio de logs...</span>
              ) : (
                syncLogs.map((log, i) => (
                  <div key={i} className="mb-1 border-b border-ink pb-1 last:border-0">
                    <span className="text-brand-200 mr-2">[{log.timestamp}]</span>
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
