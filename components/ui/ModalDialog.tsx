'use client';

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { adminModalPanel } from '@/lib/admin-ui';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '4xl': 'sm:max-w-4xl',
};

export interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  ariaLabel?: string;
  closedBy?: 'any' | 'closerequest' | 'none';
  size?: ModalSize;
  role?: 'alertdialog';
  panelClassName?: string;
  children: ReactNode;
}

/** Modal nativo sobre `<dialog>` y `.showModal()` en Top Layer (sin scroll-lock manual). */
export default function ModalDialog({
  open,
  onClose,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaLabel,
  closedBy = 'any',
  size = 'lg',
  role,
  panelClassName = '',
  children,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.setAttribute('closedby', closedBy);
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, closedBy]);

  const handlePointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    pointerDownOnBackdrop.current = e.target === dialogRef.current;
  };

  const handlePointerUp = (e: PointerEvent<HTMLDialogElement>) => {
    if (closedBy === 'any' && pointerDownOnBackdrop.current && e.target === dialogRef.current) {
      onClose();
    }
    pointerDownOnBackdrop.current = false;
  };

  return (
    <dialog
      ref={dialogRef}
      role={role}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      onCancel={(e) => {
        if (closedBy === 'none') {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="es-dialog w-[calc(100vw-1.5rem)] sm:w-full"
    >
      <div className={`${adminModalPanel} mx-auto w-full rounded-2xl border border-line ${SIZE_CLASS[size]} ${panelClassName}`}>
        {children}
      </div>
    </dialog>
  );
}
