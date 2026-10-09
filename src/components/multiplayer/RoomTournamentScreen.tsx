import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { TournamentControllerProvider } from '../../hooks/tournamentController';
import { MatchSide } from '../../domain/match';
import { findMatch, roundMatches, toMatchTeam } from '../../domain/tournament';
import { MATCH_LEAD_MS } from '../../multiplayer/constants';
import { buildBotRecords, buildDraw, buildRoundStart } from '../../multiplayer/hostTournament';
import { MatchPlaybackView } from '../match/MatchScreen';
import { useRoomMatchPlayback } from './useRoomMatchPlayback';
import { Icon } from '../Icon';
import { useRoom } from './RoomProvider';
import { useScrollToTop } from '../../hooks/useScrollToTop';
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

  // Partite con umani -> MATCH_START (stesso startAt per tutte); solo
  // bot -> MATCH_RECORD subito. Le partite tra bot dei turni misti le
  // registra il driver dell'host a fine turno live.
  return (
    <button
      type="button"
      onClick={() => {
        if (!room.state) return;
        const starts = buildRoundStart(room.state, room.hostNow() + MATCH_LEAD_MS);
        const actions = starts.length ? starts : buildBotRecords(room.state);
        actions.forEach(a => room.dispatchRoomAction(a));
      }}
      className="btn-cta"
    >
      <Icon name="play" className="w-7 h-7" />
      Gioca il turno
    </button>
  );
}

/**
 * Una partita live della stanza: vista condivisa col singolo, velocità
 * fissa 2x, niente controlli locali. Chi ha una squadra in campo decide;
 * gli altri guardano senza interazioni.
 */
export function RoomMatchScreen({ matchId, onExit }: { matchId: string; onExit: () => void }) {
  const controller = useRoomTournament();
  const room = useRoom();
  const t = controller.tournament;
  const match = t ? findMatch(t.bracket, matchId) : undefined;
  const myTeamId = controller.myTeamId;
  const userSide: MatchSide | null = match
    ? match.homeId === myTeamId ? 'home' : match.awayId === myTeamId ? 'away' : null
    : null;
  const pb = useRoomMatchPlayback(matchId, userSide);
  const live = room.state?.live[matchId];
  const teams = controller.teams;
  const home = useMemo(() => (match ? teams.find(x => x.id === match.homeId) : undefined), [match, teams]);
  const away = useMemo(() => (match ? teams.find(x => x.id === match.awayId) : undefined), [match, teams]);
  if (!match || !t || !home || !away || !pb.result) return null;

  // Ferma a uno stop senza una scelta da fare: attesa degli altri
  const waiting =
    pb.decisionDeadline !== null && pb.pendingDecision === null && !pb.pendingShootoutOrder;
  const twoHumans = (live?.humanSides.length ?? 0) > 1;

  return (
    <MatchPlaybackView
      tournament={t}
      home={toMatchTeam(home)}
      away={toMatchTeam(away)}
      round={match.round}
      pb={pb}
      userSide={userSide ?? 'home'}
      onFinish={() => {}}
      room={{
        onExit,
        waitingText: waiting ? 'In attesa delle scelte…' : null,
        sentLabel: twoHumans ? undefined : 'In attesa…',
      }}
    />
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

  // Partite live: la propria sempre; altrimenti si guarda la prima
  const liveIds = Object.keys(room.state?.live ?? {});
  const [watchId, setWatchId] = useState<string | null>(null);
  const [backToHub, setBackToHub] = useState(false);
  const liveKey = liveIds.join(',');
  useEffect(() => {
    setWatchId(null);
    setBackToHub(false);
  }, [liveKey]);
  const myLive = liveIds.find(id => {
    const m = t ? findMatch(t.bracket, id) : undefined;
    return m && (m.homeId === controller.myTeamId || m.awayId === controller.myTeamId);
  });
  const activeLive = backToHub ? null : (watchId && liveIds.includes(watchId) ? watchId : myLive ?? liveIds[0] ?? null);
  useScrollToTop(activeLive ?? (sawDraw && !animDone ? 'draw' : 'hub'));

  if (!t) return null;

  let body: ReactNode;
  if (activeLive) {
    body = (
      <div className="flex-1 flex flex-col">
        {liveIds.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {liveIds.map(id => {
              const m = findMatch(t.bracket, id);
              const name = (tid: string | null) => t.teams.find(x => x.id === tid)?.name ?? '?';
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWatchId(id)}
                  className={`btn-ghost !py-1 text-xs ${id === activeLive ? 'bg-ink text-canvas' : ''}`}
                >
                  {name(m?.homeId ?? null)} - {name(m?.awayId ?? null)}
                </button>
              );
            })}
          </div>
        )}
        <RoomMatchScreen matchId={activeLive} onExit={() => setBackToHub(true)} />
      </div>
    );
  } else if (sawDraw && !animDone) {
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

  return body;
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
        <div className="max-w-3xl mx-auto py-8 text-center">
          <p className="section-heading">{t.name}</p>
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
    <TournamentControllerProvider value={controller}>
      <TournamentSummaryScreen />
    </TournamentControllerProvider>
  );
}
