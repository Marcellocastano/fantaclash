import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRoom, roomReducer } from '../../multiplayer/roomReducer';
import { RoomContextValue } from './RoomProvider';
import { ClientIntent, RoomState } from '../../multiplayer/protocol';
import { createInitialAuctionState } from '../../services/auction';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { roundMatches } from '../../domain/tournament';
import { Team } from '../../types';
import { RoomMatchScreen } from './RoomTournamentScreen';

let mockRoom: RoomContextValue;
const sent: ClientIntent[] = [];

vi.mock('./RoomProvider', () => ({
  useRoom: () => mockRoom,
}));

const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;
const NOW = 1_000_000;

function teams(): Team[] {
  const mk = (id: string, ownerId: string | null): Team =>
    createTestTeam({
      id, name: `T ${id}`, roster: buildRoster(FULL),
      controller: ownerId ? 'human' : 'bot',
      ownerId: ownerId ?? undefined,
      botConfig: createTestBotConfig(),
    });
  return [mk('th', 'h1'), mk('tc', 'c1'), ...[1, 2, 3, 4, 5, 6].map(i => mk(`b${i}`, null))];
}

function liveState(): { state: RoomState; matchId: string } {
  let s = createRoom({
    code: 'ABCDE', hostId: 'h1',
    host: { nickname: 'H', teamName: 'T' },
    settings: { season: '2024-25', difficulty: 'normale' },
    now: NOW,
  });
  s = roomReducer(s, {
    type: 'START_AUCTION',
    teams: teams(),
    auction: { ...createInitialAuctionState([createTestPlayer({ id: 'p1', role: 'P' })]), phase: 'complete' },
  });
  s = roomReducer(s, { type: 'START_TOURNAMENT', seed: 7 });
  s = roomReducer(s, {
    type: 'TOURNAMENT',
    action: { type: 'DRAW', order: ['th', 'tc', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'] },
  });
  const matchId = roundMatches(s.tournament!.bracket, 'quarterfinals')[0].id;
  s = roomReducer(s, {
    type: 'MATCH_START', matchId, startAt: NOW, humanSides: ['home', 'away'],
  });
  return { state: s, matchId };
}

function setRoom(state: RoomState, me: string | null, role: 'host' | 'player' | 'spectator' = 'player') {
  mockRoom = {
    status: 'ready',
    rejectReason: null,
    state,
    role,
    me,
    spectatorCount: 0,
    hostOnline: true,
    roomClosed: false,
    isHost: role === 'host',
    createRoom: async () => {},
    joinRoom: async () => {},
    leave: async () => {},
    sendIntent: (i: ClientIntent) => { sent.push(i); },
    hostNow: () => NOW,
    kick: () => {},
    updateSettings: () => {},
    startAuction: () => {},
    resumeRoom: async () => {},
    closeRoom: async () => {},
    dispatchRoomAction: () => false,
  };
}

describe('partita live in stanza (UI)', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it('overlay tattico con conto alla rovescia: invia TACTIC poi mostra attesa', () => {
    const { state, matchId } = liveState();
    setRoom(state, 'c1', 'player'); // c1 è away, lato umano
    render(<RoomMatchScreen matchId={matchId} onExit={() => {}} />);
    // Overlay di decisione con countdown (15s default)
    expect(screen.getByRole('timer')).toHaveTextContent('15s');
    // Niente controlli del singolo: velocità, pausa, skip, test rigori
    expect(screen.queryByText('Fischio finale')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Velocità' })).toBeNull();
    expect(screen.queryByText('Test rigori')).toBeNull();
    // Scelta -> intento TACTIC (segreto), poi "in attesa dell'avversario"
    fireEvent.click(screen.getByText('Attacca'));
    expect(sent).toEqual([{ type: 'TACTIC', matchId, stopTick: 0, tactic: 'attacca' }]);
    expect(screen.getByText(/in attesa dell'avversario/)).toBeInTheDocument();
  });

  it('spettatore sulla partita altrui: niente overlay, solo attesa', () => {
    const { state, matchId } = liveState();
    setRoom(state, null, 'spectator');
    render(<RoomMatchScreen matchId={matchId} onExit={() => {}} />);
    expect(screen.queryByRole('dialog', { name: 'Scelta tattica' })).toBeNull();
    expect(screen.getByText(/In attesa delle scelte/)).toBeInTheDocument();
    expect(screen.queryByText('Fischio finale')).toBeNull();
  });
});
