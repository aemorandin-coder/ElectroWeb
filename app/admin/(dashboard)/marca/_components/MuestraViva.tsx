'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import ModalDialog from '@/components/ui/ModalDialog';
import { IconoCerrar, IconoCheck, IconoInfo, IconoNovedad } from '@/components/iconos';
import {
  adminBadge, adminModalBody, adminModalFooter, adminModalHeader, adminModalTitle, adminPrimaryButton,
  adminSecondaryButton, adminTab, adminTabList, adminTabScroll,
} from '@/lib/admin-ui';

/** Piezas interactivas del Kit 2.0 en /admin/marca: Snackbar Top Layer, modal nativo <dialog> y pestañas accesibles. */
export default function MuestraViva() {
  const [modalOpen, setModalOpen] = useState(false);
  const [vistaTab, setVistaTab] = useState<'resumen' | 'flujo'>('resumen');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Pestañas en riel segmentado con foco visible (adminTabScroll + adminTabList + adminTab)</p>
        <div className={adminTabScroll}>
          <div className={adminTabList} role="tablist" aria-label="Muestra de pestañas">
            <button type="button" role="tab" aria-selected={vistaTab === 'resumen'} onClick={() => setVistaTab('resumen')} className={adminTab(vistaTab === 'resumen')}>
              <IconoCheck className="h-4 w-4" aria-hidden="true" /> Vista activa
            </button>
            <button type="button" role="tab" aria-selected={vistaTab === 'flujo'} onClick={() => setVistaTab('flujo')} className={adminTab(vistaTab === 'flujo')}>
              <IconoNovedad className="h-4 w-4" aria-hidden="true" /> Segunda pestaña
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Snackbar Top Layer y modal nativo &lt;dialog&gt;</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toast.success('Cambio guardado en el kit de prueba')}
            className={adminSecondaryButton}
          >
            <IconoCheck className="h-4 w-4 text-success-strong" aria-hidden="true" /> Probar aviso
          </button>
          <button
            type="button"
            onClick={() => toast.error('Ejemplo de aviso de error con cierre manual')}
            className={`${adminSecondaryButton} text-deal!`}
          >
            <IconoInfo className="h-4 w-4" aria-hidden="true" /> Probar error
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className={adminPrimaryButton}>
            Abrir modal &lt;dialog&gt;
          </button>
        </div>
      </div>

      <ModalDialog open={modalOpen} onClose={() => setModalOpen(false)} ariaLabelledBy="kit-modal-titulo" size="md">
        <div className={adminModalHeader}>
          <h3 id="kit-modal-titulo" className={adminModalTitle}>Modal nativo en Top Layer</h3>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            aria-label="Cerrar muestra"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
          >
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className={`${adminModalBody} space-y-2 text-sm text-ink-soft`}>
          <p>
            Usa el elemento <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">&lt;dialog&gt;</code> con <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">.showModal()</code>: bloquea el fondo sin manipular <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">body</code>, cierra con Escape y los avisos siguen quedando por encima.
          </p>
          <span className={adminBadge('brand')}>Kit 2.0 activo</span>
        </div>
        <div className={adminModalFooter}>
          <button type="button" onClick={() => setModalOpen(false)} className={adminSecondaryButton}>Cerrar</button>
          <button
            type="button"
            onClick={() => {
              setModalOpen(false);
              toast.success('Confirmado sobre el Top Layer');
            }}
            className={adminPrimaryButton}
          >
            Confirmar y avisar
          </button>
        </div>
      </ModalDialog>
    </div>
  );
}
