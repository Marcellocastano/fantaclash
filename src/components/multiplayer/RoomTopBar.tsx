import { useState } from 'react';
import { Icon } from '../Icon';
import { useRoom } from './RoomProvider';
import { RoomExitLink } from './RoomExitLink';

/** Striscia compatta sotto la navbar nelle fasi di stanza: codice, ruolo, online, uscita */
export function RoomTopBar() {
  const room = useRoom();
  const state = room.state;
  const [copied, setCopied] = useState(false);
  if (!state) return null;

  const code = state.code;
  const inviteLink = `${window.location.origin}/multiplayer/?codice=${code}`;
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard non disponibile
    }
  };

  const online = state.players.filter(p => p.connected).length;

  return (
    <div className="flex items-center gap-3 py-2 border-b-2 border-ink">
      <span className="label hidden sm:inline">Stanza</span>
      <button
        type="button"
        onClick={() => void copyInvite()}
        title="Copia il link d'invito"
        className="inline-flex items-center gap-1.5 font-display text-lg font-black tracking-[0.2em] bg-canvas border-2 border-ink px-2 shadow-block-sm text-ink hover:bg-surface transition-colors duration-150"
      >
        {code}
        <Icon name="copy" className="w-4 h-4" />
      </button>
      {copied && <span className="text-xs font-bold text-pitch">Copiato</span>}

      {room.isHost && (
        <span className="shrink-0 text-[10px] font-black bg-highlight text-on-highlight border border-ink px-1 py-px">
          Host
        </span>
      )}
      {room.role === 'spectator' && (
        <span className="shrink-0 text-[10px] font-black border border-ink px-1 py-px text-ink-soft">
          Spettatore
        </span>
      )}

      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
        <span className="w-2 h-2 rounded-full bg-pitch" aria-hidden="true" />
        {online}/{state.players.length} online
      </span>

      {room.isHost && (
        <span
          className="hidden lg:inline text-xs text-ink-muted"
          title="Tieni aperta questa scheda: se la chiudi la stanza si ferma."
        >
          Tieni aperta questa scheda
        </span>
      )}

      <RoomExitLink label={room.isHost ? 'Chiudi stanza' : 'Esci'} className="ml-auto" />
    </div>
  );
}
