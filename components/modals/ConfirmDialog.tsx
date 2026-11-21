'use client';

import { useEffect, useRef } from 'react';
import ModalDialog from '@/components/ui/ModalDialog';
import { IconoAdvertencia, IconoCerrar, IconoError, IconoInfo } from '@/components/iconos';
import {
  adminDangerButton,
  adminIconChip,
  adminModalTitle,
  adminPrimaryButton,
  adminSecondaryButton,
  type AdminTone,
} from '@/lib/admin-ui';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'warning',
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const tone: AdminTone = type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'brand';
  const confirmButtonClass = type === 'danger' ? adminDangerButton : adminPrimaryButton;

  useEffect(() => {
    if (!isOpen || type !== 'danger') return;
    const id = requestAnimationFrame(() => cancelButtonRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen, type]);

  return (
    <ModalDialog
      open={isOpen}
      onClose={onCancel}
      closedBy={type === 'danger' ? 'closerequest' : 'any'}
      role="alertdialog"
      size="md"
      ariaLabelledBy="confirm-dialog-title"
      ariaDescribedBy="confirm-dialog-message"
      panelClassName="relative p-6 text-center sm:p-8"
    >
      <button
        type="button"
        onClick={onCancel}
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
        aria-label="Cerrar"
      >
        <IconoCerrar className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${adminIconChip(tone)}`}>
        {type === 'danger' ? (
          <IconoError className="h-7 w-7" aria-hidden="true" />
        ) : type === 'info' ? (
          <IconoInfo className="h-7 w-7" aria-hidden="true" />
        ) : (
          <IconoAdvertencia className="h-7 w-7" aria-hidden="true" />
        )}
      </div>

      <h3 id="confirm-dialog-title" className={`${adminModalTitle} mb-2 text-lg lg:text-xl`}>
        {title}
      </h3>

      <div id="confirm-dialog-message" className="mb-6">
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted">
          {message}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
        <button
          ref={cancelButtonRef}
          type="button"
          autoFocus={type === 'danger'}
          className={`flex-1 justify-center ${adminSecondaryButton}`}
          onClick={onCancel}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`flex-1 justify-center ${confirmButtonClass}`}
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </div>
    </ModalDialog>
  );
}
