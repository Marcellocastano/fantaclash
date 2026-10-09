import { useState } from 'react';
import { ConfirmDialog } from '../layout/ConfirmDialog';
import { useRoomExit } from './useRoomExit';

/** Link-action con il ConfirmDialog dell'uscita dalla stanza (host chiude, altri escono) */
export function RoomExitLink({ label, className = '' }: { label?: string; className?: string }) {
  const exit = useRoomExit();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`link-action ${className}`}>
        {label ?? exit.confirmLabel}
      </button>
      {open && (
        <ConfirmDialog
          title={exit.title}
          message={exit.message}
          confirmLabel={exit.confirmLabel}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            exit.action();
          }}
        />
      )}
    </>
  );
}
