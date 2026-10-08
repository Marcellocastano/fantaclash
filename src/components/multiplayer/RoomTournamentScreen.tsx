import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { TournamentControllerProvider } from '../../hooks/tournamentController';
import { roundMatches } from '../../domain/tournament';
import { buildDraw, buildRoundRecords } from '../../multiplayer/hostTournament';
import { Icon } from '../Icon';
import { RoomTopBar } from './RoomTopBar';
import { useRoom } from './RoomProvider';
import { useRoomTournament } from './useRoomTournament';
import { TournamentDraw } from '../tournament/TournamentDraw';
import { TournamentHub } from '../tournament/TournamentHub';
import { TournamentBracket } from '../tournament/TournamentBracket';
import { TournamentSummaryScreen } from '../tournament/TournamentSummaryScreen';

const noop = () => {};

/**
 * Controlli dell'hero dell'hub in stanza: la partita del viewer non si
 * gioca live. L'host simula il turno con MATCH_RECORD o chiude con FINISH;
 * gli altri aspettano.
 */
function RoomControls() {
  const room = useRoom();
  const state = room.state;
  const t = state?.tournament;
  if (!t) return null;

  if (!room.isHost) {
    return (
      <p className="text-ink-soft font-semibold">
        {t.status === 'completed'
          ? 'In attesa del riepilogo…'
          : "In attesa che l'host avvii il turno…"}
      </p>
    );
  }

  if (t.status === 'completed') {
    return (
      <button
        type="button"
        onClick={() => room.dispatchRoomAction({ type: 'FINISH' })}
        className="btn-cta"
      >
        Vai al riepilogo
        <Icon name="arrow" className="w-7 h-7" />
      </button>
    );
  }

  // Simulare le partite costa: i record si calcolano solo al click
  return (
    <button
      type="button"
      onClick={() => {
        if (room.state) buildRoundRecords(room.state).forEach(a => room.dispatchRoomAction(a));
      }}
      className="btn-cta"
    >
      <Icon name="play" className="w-7 h-7" />
      Gioca il turno
    </button>
  );
}

/**
 * Torneo della stanza: sorteggio replicato dall'host, hub con i controlli
 * remoti e rivelazione dei risultati in arrivo. La presentazione è quella
 * del gioco singolo; lo stato cambia solo via RoomAction dell'host.
 */
export function RoomTournamentScreen() {
  const room = useRoom();
  const controller = useRoomTournament();
  const t = controller.tournament;

  // Chi monta la schermata a sorteggio già fatto va diretto all'hub
  const [sawDraw] = useState(() => t?.status === 'draw');
  const [animDone, setAnimDone] = useState(false);

  // L'host sorteggia subito dopo START_TOURNAMENT (una sola volta)
  const drawSent = useRef(false);
  useEffect(() => {
    if (!room.isHost || drawSent.current || !room.state) return;
    const action = buildDraw(room.state, Math.random);
    if (action) {
      drawSent.current = true;
      room.dispatchRoomAction(action);
    }
  }, [room]);

  // Partite appena decise rispetto allo snapshot precedente -> revealIds
  const knownWinners = useRef<Set<string> | null>(null);
  const [revealIds, setRevealIds] = useState<string[]>([]);
  useEffect(() => {
    if (!t) return;
    const now = new Set(t.bracket.filter(m => m.winnerId).map(m => m.id));
    if (knownWinners.current === null) {
      knownWinners.current = now;
      return;
    }
    const fresh = t.bracket.filter(m => m.winnerId && !knownWinners.current!.has(m.id)).map(m => m.id);
    knownWinners.current = now;
    if (fresh.length) setRevealIds(fresh);
  }, [t]);

  // L'ordine del sorteggio è nel tabellone: coppie dei quarti
  const order = useMemo(
    () =>
      t && t.status !== 'draw'
        ? roundMatches(t.bracket, 'quarterfinals').flatMap(m => [m.homeId!, m.awayId!])
        : null,
    [t]
  );

  if (!t) return null;

  let body: ReactNode;
  if (sawDraw && !animDone) {
    body = order ? (
      <TournamentDraw tournament={t} order={order} onDone={() => setAnimDone(true)} />
    ) : (
      <p className="py-20 text-center font-display text-2xl font-extrabold text-ink-muted">
        Sorteggio in corso…
      </p>
    );
  } else {
    body = (
      <TournamentHub
        tournament={t}
        revealIds={revealIds}
        onPlay={noop}
        onCompleteRound={noop}
        onSummary={noop}
        controls={<RoomControls />}
      />
    );
  }

  return (
    <div className="px-1">
      <RoomTopBar />
      {body}
    </div>
  );
}

/** Fase 'final': riepilogo personale per i giocatori, campione+tabellone per gli spettatori */
export function RoomFinalScreen() {
  const controller = useRoomTournament();
  const t = controller.tournament;
  if (!t) return null;

  if (!controller.myTeamId) {
    const champion = t.teams.find(x => x.id === t.winnerId);
    return (
      <div className="px-1">
        <RoomTopBar />
        <div className="max-w-3xl mx-auto py-8 text-center">
          <p className="section-heading">Torneo concluso</p>
          <h1 className="font-display text-4xl sm:text-6xl font-black text-ink mt-4">
            Campione: {champion?.name ?? '—'}
          </h1>
          <section className="mt-10" aria-label="Tabellone">
            <TournamentBracket tournament={t} />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="px-1">
      <RoomTopBar />
      <TournamentControllerProvider value={controller}>
        <TournamentSummaryScreen />
      </TournamentControllerProvider>
    </div>
  );
}
