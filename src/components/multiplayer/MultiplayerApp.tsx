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
import { Icon } from '../Icon';
import { LobbyScreen } from './LobbyScreen';
import { RoomAuctionScreen } from './RoomAuctionScreen';
import { RoomFinalScreen, RoomTournamentScreen } from './RoomTournamentScreen';
import { useRoom } from './RoomProvider';
import { useRoomExit } from './useRoomExit';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { CatalogKey } from '../../i18n/translate';
import { useT } from '../../i18n/I18nProvider';


/** Inclinazioni alternate delle tessere del codice (classi letterali) */
const RESUME_TILTS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-2'];

const REJECT_KEY: Record<RejectReason, CatalogKey> = {
  protocol: 'room.reject.protocol',
  full: 'room.reject.full',
  started: 'room.reject.started',
  kicked: 'room.reject.kicked',
  bad_token: 'room.reject.badTokenLong',
  invalid: 'room.reject.invalid',
  name_taken: 'room.reject.nameTaken',
};

/** Contenuto interattivo di /multiplayer/: ingresso, connessione, lobby */
export function MultiplayerApp() {
  const t = useT();
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

  const sessionExit = useRoomExit();

  const startAuction = async () => {
    if (!room.state) return;
    setStarting(true);
    setStartError(null);
    try {
      const players = await loadSeasonPlayers(room.state.settings.season);
      room.startAuction(buildAuctionPool(players));
    } catch {
      setStartError(t('room.app.startFail'));
    } finally {
      setStarting(false);
    }
  };

  const leaveAndReset = async () => {
    await room.leave();
  };

  switch (room.status) {
    case 'rejected':
      return (
        <ContentLayout>
          <div className="py-16 text-center max-w-md mx-auto">
            <h1 className="font-display text-4xl font-black text-ink">{t('room.app.rejectedTitle')}</h1>
            <p className="text-lg text-ink-soft mt-4">
              {room.rejectReason === 'full' && room.role === 'spectator'
              ? t('room.app.rejectedSpectators')
              : room.rejectReason
                ? t(REJECT_KEY[room.rejectReason])
                : t('room.app.rejectedGeneric')}
            </p>
            <button type="button" onClick={() => void leaveAndReset()} className="btn-primary mt-8 px-6 py-3">
              {t('room.app.back')}
            </button>
          </div>
        </ContentLayout>
      );

    case 'closed':
      if (room.roomClosed) {
        return (
          <ContentLayout>
            <div className="py-16 text-center max-w-md mx-auto">
              <h1 className="font-display text-4xl font-black text-ink">{t('room.app.closedTitle')}</h1>
              <p className="text-lg text-ink-soft mt-4">{t('room.app.closedText')}</p>
              <a href="/multiplayer/" className="btn-primary mt-8 inline-block px-6 py-3">
                {t('room.app.backToMultiplayer')}
              </a>
            </div>
          </ContentLayout>
        );
      }
      return (
        <ContentLayout>
          <div className="py-16 text-center max-w-md mx-auto">
            <h1 className="font-display text-4xl font-black text-ink">{t('room.app.notFoundTitle')}</h1>
            <p className="text-lg text-ink-soft mt-4">
              {t('room.app.notFoundText')}
            </p>
            <button type="button" onClick={() => void leaveAndReset()} className="btn-primary mt-8 px-6 py-3">
              {t('room.app.retry')}
            </button>
          </div>
        </ContentLayout>
      );

    case 'ready': {
      const state = room.state;
      if (!state) return null;
      if (state.phase === 'lobby') {
        return (
          <ContentLayout sessionExit={sessionExit}>
            <LobbyScreen spectatorCount={room.spectatorCount} onStart={() => void startAuction()} starting={starting} />
            {startError && <p className="mt-3 text-center text-sm text-danger" role="alert">{startError}</p>}
          </ContentLayout>
        );
      }
      const game = (
        <>
          {!room.isHost && !room.hostOnline && (
            <div role="alert" className="fixed top-20 inset-x-4 sm:inset-x-auto sm:right-6 z-40 panel shadow-block px-4 py-3 font-semibold text-ink">
              {t('room.app.hostOffline')}
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
        <ContentLayout wide>
          {hostSave && codeParam && (
            <section className="mb-8 bg-pitch-deep text-canvas border-4 border-ink shadow-block-lg p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
              <div className="flex gap-1.5 shrink-0" aria-label={t('room.lobby.codeAria', { code: codeParam })}>
                {codeParam.split('').map((ch, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={`w-10 h-12 sm:w-12 sm:h-14 inline-flex items-center justify-center bg-canvas text-ink border-2 border-ink shadow-block-sm font-display text-3xl sm:text-4xl font-black ${RESUME_TILTS[i % RESUME_TILTS.length]}`}
                  >
                    {ch}
                  </span>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-2xl sm:text-3xl font-black leading-none">{t('room.app.resumeTitle')}</p>
                <p className="text-canvas/80 mt-2">{t('room.app.resumeText')}</p>
              </div>
              <button type="button" onClick={() => void room.resumeRoom(codeParam)} className="btn-cta shrink-0">
                {t('room.app.resume')}
                <Icon name="arrow" className="w-6 h-6" />
              </button>
            </section>
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
