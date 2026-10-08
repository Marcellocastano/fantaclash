import { useMemo, useState } from 'react';
import { normalizeRoomCode } from '../../multiplayer/roomCode';
import { getRoomIdentity } from '../../multiplayer/identity';
import { loadSeasonPlayers } from '../../services/seasons';
import { buildAuctionPool } from '../../services/auction';
import { RejectReason } from '../../multiplayer/protocol';
import { EntryScreen } from './EntryScreen';
import { LobbyScreen } from './LobbyScreen';
import { RoomAuctionScreen } from './RoomAuctionScreen';
import { RoomFinalScreen, RoomTournamentScreen } from './RoomTournamentScreen';
import { useRoom } from './RoomProvider';

const REJECT_TEXT: Record<RejectReason, string> = {
  protocol: 'La stanza usa una versione diversa: ricarica la pagina.',
  full: 'La stanza è piena.',
  started: 'La partita è già iniziata.',
  kicked: 'Sei stato espulso dalla stanza.',
  bad_token: 'Rientro non riconosciuto: questo browser ha già un’altra identità per la stanza.',
  invalid: 'Dati non validi.',
};

/** Contenuto interattivo di /multiplayer/: ingresso, connessione, lobby */
export function MultiplayerApp() {
  const room = useRoom();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const codeParam = normalizeRoomCode(params.get('codice') ?? '');
  const vista = params.get('vista');
  const hasIdentity = useMemo(
    () => (codeParam ? !!safeIdentity(codeParam) : false),
    [codeParam]
  );

  const startAuction = async () => {
    if (!room.state) return;
    setStarting(true);
    setStartError(null);
    try {
      const players = await loadSeasonPlayers(room.state.settings.season);
      room.startAuction(buildAuctionPool(players));
    } catch {
      setStartError('Impossibile caricare il listone, riprova');
      setStarting(false);
    }
  };

  const leaveAndReset = async () => {
    await room.leave();
  };

  switch (room.status) {
    case 'connecting':
    case 'joining':
      return (
        <div className="py-16 text-center" role="status">
          <p className="font-display text-3xl font-extrabold text-ink">Entro nella stanza…</p>
        </div>
      );

    case 'rejected':
      return (
        <div className="py-16 text-center max-w-md mx-auto">
          <h1 className="font-display text-4xl font-black text-ink">Non sei entrato</h1>
          <p className="text-lg text-ink-soft mt-4">
            {room.rejectReason ? REJECT_TEXT[room.rejectReason] : 'Richiesta rifiutata.'}
          </p>
          <button type="button" onClick={() => void leaveAndReset()} className="btn-primary mt-8 px-6 py-3">
            Torna indietro
          </button>
        </div>
      );

    case 'closed':
      return (
        <div className="py-16 text-center max-w-md mx-auto">
          <h1 className="font-display text-4xl font-black text-ink">Stanza non trovata</h1>
          <p className="text-lg text-ink-soft mt-4">
            Stanza non trovata o host non raggiungibile. Controlla il codice e riprova.
          </p>
          <button type="button" onClick={() => void leaveAndReset()} className="btn-primary mt-8 px-6 py-3">
            Riprova
          </button>
        </div>
      );

    case 'ready': {
      const state = room.state;
      if (!state) return null;
      if (state.phase === 'lobby') {
        return (
          <>
            <LobbyScreen spectatorCount={room.spectatorCount} onStart={() => void startAuction()} starting={starting} />
            {startError && <p className="mt-3 text-center text-sm text-danger" role="alert">{startError}</p>}
          </>
        );
      }
      if (state.phase === 'auction') return <RoomAuctionScreen />;
      if (state.phase === 'tournament') return <RoomTournamentScreen />;
      if (state.phase === 'final') return <RoomFinalScreen />;
      return null;
    }

    case 'idle':
    default:
      return (
        <EntryScreen
          initialView={codeParam ? 'entra' : vista === 'crea' ? 'crea' : vista === 'entra' ? 'entra' : 'crea'}
          initialCode={codeParam}
          initialSpectator={vista === 'spettatore'}
          hasIdentity={hasIdentity}
          onCreate={room.createRoom}
          onJoin={room.joinRoom}
        />
      );
  }
}

function safeIdentity(code: string) {
  try {
    return localStorage.getItem(`fanta-fc-room-id-${code}`) ? getRoomIdentity(code) : null;
  } catch {
    return null;
  }
}
