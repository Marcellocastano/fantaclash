import { describe, it, expect } from 'vitest';
import { buildDraw, buildRoundRecords, buildStartTournament } from './hostTournament';
import { createRoom, roomReducer } from './roomReducer';
import { createTournament, roundMatches, findMatch, simulateBracketMatch } from '../domain/tournament';
import { resultHash } from './hash';
import { RoomState } from './protocol';
import { createRng } from '../services/auction';
import { createTestTeam, buildRoster } from '../test/testUtils';
import { Team } from '../types';

const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;

function teams(): Team[] {
  return Array.from({ length: 8 }, (_, i) =>
    createTestTeam({ id: `t${i}`, name: `Team ${i}`, roster: buildRoster(FULL) })
  );
}

function lobbyRoom(): RoomState {
  return createRoom({
    code: 'ABCDE', hostId: 'h1',
    host: { nickname: 'H', teamName: 'T' },
    settings: { season: '2024-25', difficulty: 'normale' },
    now: 1000,
  });
}

function tournamentRoom(): RoomState {
  return {
    ...lobbyRoom(),
    phase: 'tournament',
    teams: teams(),
    tournament: createTournament({ teams: teams(), seasonId: '2024-25', seed: 42 }),
  };
}

describe('hostTournament', () => {
  it('buildStartTournament produce START_TOURNAMENT con un seme', () => {
    const a = buildStartTournament(createRng(1));
    expect(a.type).toBe('START_TOURNAMENT');
    expect(typeof (a as { seed: number }).seed).toBe('number');
  });

  it('buildDraw solo in status draw, ordine di 8 squadre valide', () => {
    expect(buildDraw(lobbyRoom(), createRng(1))).toBeNull();
    const s = tournamentRoom();
    const a = buildDraw(s, createRng(7));
    expect(a).not.toBeNull();
    const next = roomReducer(s, a!);
    expect(next.tournament?.status).toBe('quarterfinals');
    // riapplicarlo non serve: status non è più 'draw'
    expect(buildDraw(next, createRng(7))).toBeNull();
  });

  it('buildRoundRecords: un MATCH_RECORD verificabile per ogni partita pronta', () => {
    const rng = createRng(3);
    let s = tournamentRoom();
    s = roomReducer(s, buildDraw(s, rng)!);
    const records = buildRoundRecords(s);
    const ready = roundMatches(s.tournament!.bracket, 'quarterfinals').filter(
      m => m.homeId && m.awayId
    );
    expect(records).toHaveLength(ready.length);
    for (const a of records) {
      expect(a.type).toBe('MATCH_RECORD');
      const { matchId, seed, resultHash: rh } = a as Extract<typeof a, { type: 'MATCH_RECORD' }>;
      expect(seed).toBe(findMatch(s.tournament!.bracket, matchId)!.seed);
      const result = simulateBracketMatch(s.tournament!, s.teams, matchId, {});
      expect(rh).toBe(resultHash(result));
      const applied = roomReducer(s, a);
      expect(applied).not.toBe(s);
    }
  });

  it('buildRoundRecords fuori torneo o senza partite pronte -> []', () => {
    expect(buildRoundRecords(lobbyRoom())).toEqual([]);
    // turno finito ma non ancora avanzato: nessuna 'ready'
    const rng = createRng(3);
    let s = tournamentRoom();
    s = roomReducer(s, buildDraw(s, rng)!);
    for (const a of buildRoundRecords(s)) s = roomReducer(s, a);
    expect(s.tournament?.status).toBe('semifinals');
    // le semifinali sono 'ready' solo quando hanno entrambe le squadre: ne hanno
    const rec = buildRoundRecords(s);
    expect(rec.length).toBeGreaterThan(0);
    // torneo completato -> []
    for (let g = 0; g < 10 && s.tournament!.status !== 'completed'; g++) {
      for (const a of buildRoundRecords(s)) s = roomReducer(s, a);
    }
    expect(s.tournament?.status).toBe('completed');
    expect(buildRoundRecords(s)).toEqual([]);
  });
});
