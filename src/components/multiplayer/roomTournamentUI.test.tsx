import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRoom, roomReducer } from '../../multiplayer/roomReducer';
import { buildRoundRecords } from '../../multiplayer/hostTournament';
import { RoomAction, RoomState } from '../../multiplayer/protocol';
import { createInitialAuctionState } from '../../services/auction';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { RoomContextValue } from './RoomProvider';
import { Team } from '../../types';
import { RoomAuctionScreen } from './RoomAuctionScreen';
import { RoomFinalScreen, RoomTournamentScreen } from './RoomTournamentScreen';

// useRoom finto: le schermate leggono stato e ruolo da qui
let mockRoom: RoomContextValue;
const dispatched: RoomAction[] = [];

vi.mock('./RoomProvider', () => ({
  useRoom: () => mockRoom,
}));

const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;

function teams(): Team[] {
  const mk = (id: string, name: string, ownerId: string | null): Team =>
    createTestTeam({
      id, name, roster: buildRoster(FULL),
      controller: ownerId ? 'human' : 'bot',
      ownerId: ownerId ?? undefined,
      botConfig: createTestBotConfig(),
    });
  return [
    mk('th', 'Host FC', 'h1'),
    mk('tc', 'Guest FC', 'c1'),
    ...[1, 2, 3, 4, 5, 6].map(i => mk(`b${i}`, `Bot ${i}`, null)),
  ];
}

/** Asta completata -> torneo sorteggiato (ordine deterministico) */
function tournamentState(opts: { finish?: boolean } = {}): RoomState {
  let s = createRoom({
    code: 'ABCDE', hostId: 'h1',
    host: { nickname: 'Host', teamName: 'Host FC' },
    settings: { season: '2024-25', difficulty: 'normale', fillWithBots: true },
    now: Date.now(),
  });
  s = roomReducer(s, {
    type: 'PLAYER_JOINED',
    player: { id: 'c1', nickname: 'Guest', teamName: 'Guest FC', ready: true, connected: true, joinedAt: 1, teamId: null },
  });
  s = roomReducer(s, {
    type: 'START_AUCTION',
    teams: teams(),
    auction: { ...createInitialAuctionState([createTestPlayer({ id: 'p1', role: 'P' })]), phase: 'complete' },
  });
  s = roomReducer(s, { type: 'START_TOURNAMENT', seed: 42 });
  s = roomReducer(s, {
    type: 'TOURNAMENT',
    action: { type: 'DRAW', order: teams().map(t => t.id) },
  });
  if (opts.finish) {
    for (let g = 0; g < 10 && s.tournament!.status !== 'completed'; g++) {
      for (const a of buildRoundRecords(s)) s = roomReducer(s, a);
    }
    s = roomReducer(s, { type: 'FINISH' });
  }
  return s;
}

function setRoom(state: RoomState, me: string | null, role: 'host' | 'player' | 'spectator' = 'player') {
  mockRoom = {
    status: 'ready',
    rejectReason: null,
    state,
    role,
    me,
    spectatorCount: 0,
    isHost: role === 'host',
    createRoom: async () => {},
    joinRoom: async () => {},
    leave: async () => {},
    sendIntent: () => {},
    hostNow: () => Date.now(),
    kick: () => {},
    updateSettings: () => {},
    startAuction: () => {},
    dispatchRoomAction: (a: RoomAction) => { dispatched.push(a); return true; },
  };
}

describe('torneo in stanza (UI)', () => {
  beforeEach(() => {
    dispatched.length = 0;
  });

  it("l'host avvia il torneo dall'asta completata, l'ospite aspetta", () => {
    const s = createRoom({
      code: 'ABCDE', hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale', fillWithBots: true },
      now: Date.now(),
    });
    const done = roomReducer(s, {
      type: 'START_AUCTION',
      teams: teams(),
      auction: { ...createInitialAuctionState([createTestPlayer({ id: 'p1', role: 'P' })]), phase: 'complete' },
    });

    setRoom(done, 'h1', 'host');
    const { unmount } = render(<RoomAuctionScreen />);
    fireEvent.click(screen.getByText('Avvia il torneo'));
    expect(dispatched).toEqual([{ type: 'START_TOURNAMENT', seed: expect.any(Number) }]);
    unmount();

    setRoom(done, 'c1', 'player');
    render(<RoomAuctionScreen />);
    expect(screen.getByText(/attesa che l'host avvii il torneo/)).toBeInTheDocument();
    expect(screen.queryByText('Avvia il torneo')).toBeNull();
  });

  it("l'host vede 'Gioca il turno' e avvia le partite live, l'ospite aspetta", () => {
    const s = tournamentState();
    setRoom(s, 'h1', 'host');
    const { unmount } = render(<RoomTournamentScreen />);
    // La propria partita non si gioca dal tasto dell'hub: nessun "Gioca i quarti"
    expect(screen.queryByText(/Gioca i quarti/)).toBeNull();
    fireEvent.click(screen.getByText('Gioca il turno'));
    // Le partite con umani vanno live; i record dei bot li manda il driver
    expect(dispatched.every(a => a.type === 'MATCH_START')).toBe(true);
    expect(dispatched).toHaveLength(1); // th vs tc, gli altri quarti sono tra bot
    expect(dispatched[0]).toMatchObject({ humanSides: ['home', 'away'], startAt: expect.any(Number) });
    unmount();

    dispatched.length = 0;
    setRoom(s, 'c1', 'player');
    render(<RoomTournamentScreen />);
    expect(screen.getByText(/attesa che l'host avvii il turno/)).toBeInTheDocument();
    expect(screen.queryByText('Gioca il turno')).toBeNull();
    expect(screen.queryByText(/Gioca i quarti/)).toBeNull();
  });

  it("a torneo chiuso l'host va al riepilogo con FINISH", () => {
    const s = tournamentState();
    let x = s;
    for (let g = 0; g < 10 && x.tournament!.status !== 'completed'; g++) {
      for (const a of buildRoundRecords(x)) x = roomReducer(x, a);
    }
    setRoom(x, 'h1', 'host');
    render(<RoomTournamentScreen />);
    fireEvent.click(screen.getByText('Vai al riepilogo'));
    expect(dispatched).toEqual([{ type: 'FINISH' }]);
  });

  it("in 'final' l'ospite vede il riepilogo della propria squadra", () => {
    const s = tournamentState({ finish: true });
    expect(s.phase).toBe('final');
    setRoom(s, 'c1', 'player');
    render(<RoomFinalScreen />);
    // Riepilogo personale: nome squadra del guest e pulsante di uscita
    expect(screen.getAllByText('Guest FC').length).toBeGreaterThan(0);
    expect(screen.getByText('Esci dalla stanza')).toBeInTheDocument();
    expect(screen.queryByText('Nuova partita')).toBeNull();
  });

  it("in 'final' lo spettatore vede campione e tabellone", () => {
    const s = tournamentState({ finish: true });
    setRoom(s, null, 'spectator');
    render(<RoomFinalScreen />);
    const champion = s.tournament!.teams.find(t => t.id === s.tournament!.winnerId)!;
    expect(screen.getByText(`Campione: ${champion.name}`)).toBeInTheDocument();
    expect(screen.queryByText('Esci dalla stanza')).toBeNull();
    expect(screen.queryByText('Nuova partita')).toBeNull();
  });
});
