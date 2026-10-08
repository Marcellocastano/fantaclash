import { describe, it, expect } from 'vitest';
import { stableStringify, stableHash, resultHash } from './hash';
import { MatchResult } from '../domain/match';

describe('stableStringify/stableHash', () => {
  it('stesso valore con ordine delle chiavi diverso -> stesso hash', () => {
    const a = { x: 1, y: { b: 2, a: 1 }, z: [3, 4] };
    const b = { z: [3, 4], y: { a: 1, b: 2 }, x: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(stableHash(a)).toBe(stableHash(b));
  });

  it('un campo diverso -> hash diverso', () => {
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 1, b: 2 }));
  });

  it('chiavi undefined omesse', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });
});

describe('resultHash', () => {
  const base = {
    homeTeamId: 't1',
    awayTeamId: 't2',
    homeScore: 2,
    awayScore: 1,
    shootout: null,
    winnerId: 't1',
    events: [
      { type: 'goal', tick: 10, side: 'home', id: 'e1', minute: 20, extra: 0, teamId: 't1', impact: 3, description: 'Gol' },
      { type: 'chance', tick: 30, side: 'away', id: 'e2', minute: 60, extra: 0, teamId: 't2', impact: 1, description: 'Occasione' },
    ],
    ticks: [{ index: 0, ball: 0.5, period: 1, minute: 0, extra: 0, pressure: 0.1, homeControl: 0.5, energy: { home: 1, away: 1 }, tactic: { home: 'equilibrata', away: 'equilibrata' } }],
  } as unknown as MatchResult;

  it('invariato se cambia ticks/ball', () => {
    const altered = {
      ...base,
      ticks: [{ ...base.ticks[0], ball: -0.9 }],
    } as MatchResult;
    expect(resultHash(altered)).toBe(resultHash(base));
  });

  it('cambia se cambia un campo rilevante', () => {
    expect(resultHash({ ...base, homeScore: 3 })).not.toBe(resultHash(base));
    expect(resultHash({ ...base, winnerId: 't2' })).not.toBe(resultHash(base));
    expect(
      resultHash({ ...base, events: [...base.events.slice(1)] })
    ).not.toBe(resultHash(base));
  });
});
