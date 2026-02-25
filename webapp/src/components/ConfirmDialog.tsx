import { useRef, useEffect } from 'react';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { confirmRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-edge bg-surface p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-heading">{title}</h2>
        <p className="mb-4 text-sm text-body">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-lg px-4 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-heading"
          >
            {onConfirm ? 'Cancel' : 'OK'}
          </button>
          {onConfirm && (
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className={`min-h-[44px] rounded-lg px-4 text-sm font-medium text-white transition-colors ${
                danger ? 'bg-negative hover:bg-negative/90' : 'bg-accent hover:bg-accent/90'
              }`}
            >
              {confirmLabel ?? 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
