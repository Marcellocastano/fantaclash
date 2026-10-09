import { useMemo } from 'react';
import { useRoom } from './RoomProvider';

/** Descrizione del dialogo di uscita dalla stanza (host chiude, altri escono) */
export function useRoomExit(): {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => void;
} {
  const room = useRoom();
  return useMemo(() => {
    if (!room.isHost) {
      return {
        title: 'Uscire dalla stanza?',
        message: 'Tornerai alla pagina multiplayer. Se la stanza continua potrai rientrare con il codice.',
        confirmLabel: 'Esci dalla stanza',
        action: () => void room.leave(),
      };
    }
    return {
      title: 'Chiudere la stanza per tutti?',
      message: 'La stanza si chiude per ogni partecipante e non sarà possibile riprenderla.',
      confirmLabel: 'Chiudi la stanza',
      action: () => void room.closeRoom(),
    };
  }, [room]);
}
