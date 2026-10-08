import { describe, it, expect } from 'vitest';
import { createRoom, roomReducer } from './roomReducer';
import { RoomState } from './protocol';

function makeRoom(overrides: Partial<RoomState> = {}): RoomState {
  return {
    ...createRoom({
      code: 'ABCDE',
      hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale', fillWithBots: true },
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
