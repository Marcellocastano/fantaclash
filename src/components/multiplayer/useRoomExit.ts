import { useMemo } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { useRoom } from './RoomProvider';

/** Descrizione del dialogo di uscita dalla stanza (host chiude, altri escono) */
export function useRoomExit(): {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => void;
} {
  const t = useT();
  const room = useRoom();
  return useMemo(() => {
    if (!room.isHost) {
      return {
        title: t('room.exit.leaveTitle'),
        message: t('room.exit.leaveMsg'),
        confirmLabel: t('room.exit.leaveConfirm'),
        action: () => void room.leave(),
      };
    }
    return {
      title: t('room.exit.closeTitle'),
      message: t('room.exit.closeMsg'),
      confirmLabel: t('room.exit.closeConfirm'),
      action: () => void room.closeRoom(),
    };
  }, [room, t]);
}
