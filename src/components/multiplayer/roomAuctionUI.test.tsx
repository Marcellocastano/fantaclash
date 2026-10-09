import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRoom, roomReducer } from '../../multiplayer/roomReducer';
import { createInitialAuctionState } from '../../services/auction';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../../test/testUtils';
import { AuctionControllerProvider } from '../../hooks/auctionController';
import { AuctionRoom } from '../auction/AuctionRoom';
import { useRoomAuction } from './useRoomAuction';
import { RoomContextValue } from './RoomProvider';
import { ClientIntent, RoomState } from '../../multiplayer/protocol';
import { Player, Team } from '../../types';

// useRoom finto: useRoomAuction lo interroga, sendIntent è uno spy
let mockRoom: RoomContextValue;
const sent: ClientIntent[] = [];

vi.mock('./RoomProvider', () => ({
  useRoom: () => mockRoom,
}));

const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;

function pool(): Player[] {
  return [createTestPlayer({ id: 'p1', role: 'P', baseValue: 40 })];
}

function teams(): Team[] {
  const human = (id: string, ownerId: string, name: string): Team =>
    createTestTeam({ id, name, roster: [], controller: 'human', ownerId, botConfig: createTestBotConfig() });
  return [
    human('th', 'h1', 'Host FC'),
    human('tc', 'c1', 'Guest FC'),
    ...[1, 2, 3, 4, 5, 6].map(i =>
      createTestTeam({ id: `b${i}`, name: `Bot ${i}`, roster: buildRoster(FULL), controller: 'bot', botConfig: createTestBotConfig() })
    ),
  ];
}

/** Stanza in fase asta: host + guest, ordine di chiamata fisso */
function auctionState(opts: { bidding?: boolean; deadline?: number | null } = {}): RoomState {
  let s = createRoom({
    code: 'ABCDE', hostId: 'h1',
    host: { nickname: 'Host', teamName: 'Host FC' },
    settings: { season: '2024-25', difficulty: 'normale' },
    now: Date.now(),
  });
  s = roomReducer(s, {
    type: 'PLAYER_JOINED',
    player: { id: 'c1', nickname: 'Guest', teamName: 'Guest FC', connected: true, joinedAt: 1, teamId: null },
  });
  s = roomReducer(s, {
    type: 'START_AUCTION',
    teams: teams(),
    auction: createInitialAuctionState(pool()),
  });
  s = roomReducer(s, {
    type: 'AUCTION',
    action: {
      type: 'START',
      callingOrder: [opts.bidding ? 'th' : 'tc', opts.bidding ? 'tc' : 'th', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
    },
  });
  if (opts.bidding) {
    // Il lotto lo apre l'host: il guest può rilanciare
    s = roomReducer(s, {
      type: 'AUCTION',
      action: { type: 'CALL_PLAYER', teamId: 'th', playerId: 'p1', now: Date.now(), seed: 3 },
    });
  }
  if (opts.deadline !== undefined) {
    s = roomReducer(s, { type: 'CALL_DEADLINE', deadline: opts.deadline });
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
    hostOnline: true,
    roomClosed: false,
    isHost: role === 'host',
    createRoom: async () => {},
    joinRoom: async () => ({ ok: true }),
    leave: async () => {},
    sendIntent: (i: ClientIntent) => { sent.push(i); },
    hostNow: () => Date.now(),
    kick: () => {},
    updateSettings: () => {},
    startAuction: () => {},
    rematch: () => {},
    resumeRoom: async () => {},
    closeRoom: async () => {},
    dispatchRoomAction: () => false,
  };
}

function RoomAuctionHarness() {
  const controller = useRoomAuction();
  return (
    <AuctionControllerProvider value={controller}>
      <AuctionRoom onComplete={() => {}} />
    </AuctionControllerProvider>
  );
}

describe('AuctionRoom in stanza', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  it('nasconde i controlli di simulazione e manda BID come intento', () => {
    setRoom(auctionState({ bidding: true }), 'c1');
    render(<RoomAuctionHarness />);
    // Niente menu avanzamento/simulazione del gioco singolo
    expect(screen.queryByText(/Avanti veloce|Simula/i)).toBeNull();
    // Il rilancio è un intento BID per l'host, non un'azione locale
    fireEvent.click(screen.getByText('+5'));
    expect(sent).toEqual([{ type: 'BID', amount: 6 }]);
  });

  it('mostra "<nickname> sta scegliendo" quando chiama un altro umano', () => {
    setRoom(auctionState({ deadline: Date.now() + 15_000 }), 'h1', 'host');
    render(<RoomAuctionHarness />);
    // Chiama 'tc' (Guest, umano): niente animazione del bot, solo attesa
    expect(screen.getByText(/Guest sta scegliendo/)).toBeInTheDocument();
    expect(screen.getByText(/15s/)).toBeInTheDocument();
  });
});
