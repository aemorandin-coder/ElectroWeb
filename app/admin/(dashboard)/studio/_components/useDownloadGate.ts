'use client';

import { useCallback } from 'react';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { downloadIssues, type FlyerCheck } from '@/lib/studio/checks';

const sentence = (list: FlyerCheck[]) => `${list.map((c) => c.text.replace(/\.$/, '')).join('. ')}.`;

/**
 * Revisión antes de cada descarga (C-116). Lo que impide descargar ofrece ir a completarlo;
 * los avisos (foto, agotado, texto que no cabe…) dejan seguir si la persona confirma.
 * Devuelve true si se puede descargar.
 */
export function useDownloadGate() {
  const { confirm } = useConfirm();
  return useCallback(
    async (checks: FlyerCheck[], onFix: (step: number) => void): Promise<boolean> => {
      const { blocks, warns } = downloadIssues(checks);
      if (blocks.length) {
        const fix = await confirm({
          title: 'Todavía no se puede descargar',
          message: sentence(blocks),
          confirmText: 'Completarla',
          cancelText: 'Cerrar',
          type: 'warning',
        });
        if (fix) onFix(blocks[0].step ?? 1);
        return false;
      }
      if (warns.length) {
        return confirm({
          title: 'Revisa antes de descargar',
          message: sentence(warns),
          confirmText: 'Descargar igual',
          cancelText: 'Revisar',
          type: 'warning',
        });
      }
      return true;
    },
    [confirm],
  );
}
