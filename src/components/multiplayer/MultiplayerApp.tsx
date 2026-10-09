import { useMemo, useState } from 'react';
import { normalizeRoomCode } from '../../multiplayer/roomCode';
import { getRoomIdentity } from '../../multiplayer/identity';
import { loadHostSave } from '../../multiplayer/hostPersistence';
import { loadSeasonPlayers } from '../../services/seasons';
import { buildAuctionPool } from '../../services/auction';
import { RejectReason } from '../../multiplayer/protocol';
import { ContentLayout } from '../../site/ContentLayout';
import { RoomGameShell } from './RoomGameShell';
import { EntryScreen } from './EntryScreen';
import { LobbyScreen } from './LobbyScreen';
import { RoomAuctionScreen } from './RoomAuctionScreen';
import { RoomFinalScreen, RoomTournamentScreen } from './RoomTournamentScreen';
import { useRoom } from './RoomProvider';
import { useScrollToTop } from '../../hooks/useScrollToTop';

const MP_BREADCRUMB = [{ name: 'Multiplayer', path: '/multiplayer/' }];

const REJECT_TEXT: Record<RejectReason, string> = {
  protocol: 'La stanza usa una versione diversa: ricarica la pagina.',
  full: 'La stanza è piena.',
  started: 'La partita è già iniziata.',
  kicked: 'Sei stato espulso dalla stanza.',
  bad_token: 'Rientro non riconosciuto: questo browser ha già un’altra identità per la stanza.',
  invalid: 'Nome non consentito: scegline un altro.',
};

/** Contenuto interattivo di /multiplayer/: ingresso, connessione, lobby */
export function MultiplayerApp() {
  const room = useRoom();
  const [starting, setStarting] = useState(false);
  useScrollToTop(`${room.status}:${room.state?.phase ?? ''}`);
  const [startError, setStartError] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const codeParam = normalizeRoomCode(params.get('codice') ?? '');
  const vista = params.get('vista');
  const hasIdentity = useMemo(
    () => (codeParam ? !!safeIdentity(codeParam) : false),
    [codeParam]
  );
  // Salvataggio host per questo codice: offre "Riprendi la stanza".
  // Va riletto a ogni ritorno in 'idle': dopo closeRoom il salvataggio
  // è già cancellato e il pannello non deve più comparire
  const hostSave = useMemo(() => {
    if (!codeParam || room.status !== 'idle') return null;
    const id = safeIdentity(codeParam);
    return id ? loadHostSave(codeParam, id.participantId) : null;
  }, [codeParam, room.status]);

  const sessionExit = useMemo(() => {
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
        <ContentLayout breadcrumbs={MP_BREADCRUMB}>
          <div className="py-16 text-center" role="status">
            <p className="font-display text-3xl font-extrabold text-ink">Entro nella stanza…</p>
          </div>
        </ContentLayout>
      );

    case 'rejected':
      return (
        <ContentLayout breadcrumbs={MP_BREADCRUMB}>
          <div className="py-16 text-center max-w-md mx-auto">
            <h1 className="font-display text-4xl font-black text-ink">Non sei entrato</h1>
            <p className="text-lg text-ink-soft mt-4">
              {room.rejectReason === 'full' && room.role === 'spectator'
              ? 'Troppi spettatori in questa stanza'
              : room.rejectReason
                ? REJECT_TEXT[room.rejectReason]
                : 'Richiesta rifiutata.'}
            </p>
            <button type="button" onClick={() => void leaveAndReset()} className="btn-primary mt-8 px-6 py-3">
              Torna indietro
            </button>
          </div>
        </ContentLayout>
      );

    case 'closed':
      if (room.roomClosed) {
        return (
          <ContentLayout breadcrumbs={MP_BREADCRUMB}>
            <div className="py-16 text-center max-w-md mx-auto">
              <h1 className="font-display text-4xl font-black text-ink">Stanza chiusa</h1>
              <p className="text-lg text-ink-soft mt-4">La stanza è stata chiusa dall'host.</p>
              <a href="/multiplayer/" className="btn-primary mt-8 inline-block px-6 py-3">
                Torna al multiplayer
              </a>
            </div>
          </ContentLayout>
        );
      }
      return (
        <ContentLayout breadcrumbs={MP_BREADCRUMB}>
          <div className="py-16 text-center max-w-md mx-auto">
            <h1 className="font-display text-4xl font-black text-ink">Stanza non trovata</h1>
            <p className="text-lg text-ink-soft mt-4">
              Stanza non trovata o host non raggiungibile. Controlla il codice e riprova.
            </p>
            <button type="button" onClick={() => void leaveAndReset()} className="btn-primary mt-8 px-6 py-3">
              Riprova
            </button>
          </div>
        </ContentLayout>
      );

    case 'ready': {
      const state = room.state;
      if (!state) return null;
      if (state.phase === 'lobby') {
        return (
          <ContentLayout breadcrumbs={MP_BREADCRUMB} sessionExit={sessionExit}>
            <LobbyScreen spectatorCount={room.spectatorCount} onStart={() => void startAuction()} starting={starting} />
            {startError && <p className="mt-3 text-center text-sm text-danger" role="alert">{startError}</p>}
          </ContentLayout>
        );
      }
      const game = (
        <>
          {!room.isHost && !room.hostOnline && (
            <div role="alert" className="fixed top-20 inset-x-4 sm:inset-x-auto sm:right-6 z-40 panel shadow-block px-4 py-3 font-semibold text-ink">
              L'host si è disconnesso: in attesa che rientri…
            </div>
          )}
          {state.phase === 'auction' && <RoomGameShell><RoomAuctionScreen /></RoomGameShell>}
          {state.phase === 'tournament' && <RoomGameShell><RoomTournamentScreen /></RoomGameShell>}
          {state.phase === 'final' && <RoomGameShell><RoomFinalScreen /></RoomGameShell>}
        </>
      );
      return game;
    }

    case 'idle':
    default:
      return (
        <ContentLayout breadcrumbs={MP_BREADCRUMB}>
          {hostSave && codeParam && (
            <div className="max-w-2xl mx-auto panel p-4 sm:p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
              <p className="font-semibold text-ink">
                Eri l'host della stanza <span className="font-display font-extrabold tracking-widest">{codeParam}</span>: la stanza può riprendere.
              </p>
              <button type="button" onClick={() => void room.resumeRoom(codeParam)} className="btn-cta">
                Riprendi la stanza {codeParam}
              </button>
            </div>
          )}
          <EntryScreen
          initialView={codeParam ? 'entra' : vista === 'crea' ? 'crea' : vista === 'entra' ? 'entra' : 'crea'}
          initialCode={codeParam}
          initialSpectator={vista === 'spettatore'}
          hasIdentity={hasIdentity}
          onCreate={room.createRoom}
          onJoin={room.joinRoom}
        />
        </ContentLayout>
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
