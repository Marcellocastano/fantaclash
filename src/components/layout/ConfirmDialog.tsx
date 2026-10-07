import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Conferma per le azioni distruttive (es. cancellare la partita in corso) */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="panel shadow-block-lg w-full max-w-md p-6 motion-safe:animate-pop"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display text-4xl font-extrabold text-ink leading-none">{title}</h2>
        <p className="text-ink-soft mt-4">{message}</p>
        <div className="flex flex-wrap justify-end gap-3 mt-8">
          <button ref={cancelRef} onClick={onCancel} className="btn-ghost">
            Annulla
          </button>
          <button onClick={onConfirm} className="btn-primary bg-danger hover:bg-ink">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
