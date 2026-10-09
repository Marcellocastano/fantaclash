import { describe, it, expect } from 'vitest';
import { createRoom, roomReducer } from './roomReducer';
import { RoomState } from './protocol';
import { CUP_NAME_MAX } from './constants';
import { TOURNAMENT_NAME } from '../domain/tournament';
import { createInitialAuctionState } from '../services/auction';

function makeRoom(overrides: Partial<RoomState> = {}): RoomState {
  return {
    ...createRoom({
      code: 'ABCDE',
      hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale' },
      now: 1000,
    }),
    ...overrides,
  };
}

describe('roomReducer CALL_DEADLINE', () => {
  it('è null alla creazione e rifiutata fuori dalla fase auction', () => {
    const room = makeRoom();
    expect(room.callDeadline).toBeNull();
    expect(roomReducer(room, { type: 'CALL_DEADLINE', deadline: 5000 })).toBe(room);
  });

  it('in fase auction imposta e azzera la scadenza', () => {
    const auctionRoom = makeRoom({ phase: 'auction' });
    const set = roomReducer(auctionRoom, { type: 'CALL_DEADLINE', deadline: 60_000 });
    expect(set).not.toBe(auctionRoom);
    expect(set.callDeadline).toBe(60_000);
    // stesso valore -> stessa referenza (azione nulla)
    expect(roomReducer(set, { type: 'CALL_DEADLINE', deadline: 60_000 })).toBe(set);
    const cleared = roomReducer(set, { type: 'CALL_DEADLINE', deadline: null });
    expect(cleared.callDeadline).toBeNull();
  });
});

describe('nome della coppa (settings.cupName)', () => {
  const auctionDone = (room: RoomState): RoomState => ({
    ...room,
    phase: 'auction',
    auction: { ...createInitialAuctionState([]), phase: 'complete' },
  });

  it('è normalizzato alla creazione e finisce nel torneo', () => {
    const room = createRoom({
      code: 'ABCDE', hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale', cupName: '  Coppa   Skiantos  ' },
      now: 1000,
    });
    expect(room.settings.cupName).toBe('Coppa Skiantos');
    const next = roomReducer(auctionDone(room), { type: 'START_TOURNAMENT', seed: 7 });
    expect(next.tournament?.name).toBe('Coppa Skiantos');
  });

  it('senza nome personalizzato il torneo usa il default', () => {
    const next = roomReducer(auctionDone(makeRoom()), { type: 'START_TOURNAMENT', seed: 7 });
    expect(next.tournament?.name).toBe(TOURNAMENT_NAME);
  });

  it('nomi offensivi o troppo lunghi tornano al default', () => {
    const offensive = createRoom({
      code: 'ABCDE', hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale', cupName: 'Coppa del cazzo' },
      now: 1000,
    });
    expect(offensive.settings.cupName).toBeUndefined();
    const long = createRoom({
      code: 'ABCDE', hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale', cupName: 'x'.repeat(CUP_NAME_MAX + 20) },
      now: 1000,
    });
    expect(long.settings.cupName).toHaveLength(CUP_NAME_MAX);
  });

  it('SETTINGS in lobby lo aggiorna; vuoto o offensivo torna al default', () => {
    const room = makeRoom();
    const renamed = roomReducer(room, { type: 'SETTINGS', settings: { cupName: 'Coppa Brago' } });
    expect(renamed.settings.cupName).toBe('Coppa Brago');
    const cleared = roomReducer(renamed, { type: 'SETTINGS', settings: { cupName: '   ' } });
    expect(cleared.settings.cupName).toBeUndefined();
    const bad = roomReducer(renamed, { type: 'SETTINGS', settings: { cupName: 'vaffanculo cup' } });
    expect(bad.settings.cupName).toBeUndefined();
    // fuori lobby non si cambia
    const inGame = auctionDone(renamed);
    expect(roomReducer(inGame, { type: 'SETTINGS', settings: { cupName: 'Altra' } })).toBe(inGame);
  });
});
