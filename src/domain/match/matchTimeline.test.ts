import { describe, it, expect } from 'vitest';
import { computeTimeline, nextStop, TICK_MS, tickDurationMs } from './matchTimeline';
import { lastTick } from './matchPlayback';
import { simulateMatch } from './matchEngine';
import { MatchResult, MatchTeamInput } from './matchTypes';
import { buildRoster, createTestTeam } from '../../test/testUtils';
import { toMatchTeam } from '../tournament';

const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;
const home: MatchTeamInput = toMatchTeam(createTestTeam({ id: 'h', roster: buildRoster(FULL) }));
const away: MatchTeamInput = toMatchTeam(createTestTeam({ id: 'a', roster: buildRoster(FULL) }));
const result: MatchResult = simulateMatch({ home, away, seed: 42 });

describe('matchTimeline', () => {
  it('tickDurationMs: base senza eventi, con eventi a 1x e 2x', () => {
    const quiet = result.ticks.find(t => !result.events.some(e => e.tick === t.index && t.index > 0))!.index;
    expect(tickDurationMs(result, quiet, 1)).toBe(TICK_MS);
    expect(tickDurationMs(result, quiet, 2)).toBe(TICK_MS / 2);
    const goalTick = result.events.find(e => e.type === 'goal')?.tick;
    if (goalTick !== undefined) {
      expect(tickDurationMs(result, goalTick, 1)).toBe(TICK_MS + 1800);
      expect(tickDurationMs(result, goalTick, 2)).toBe((TICK_MS + 1800) / 2);
    }
  });

  it('computeTimeline avanza sommando le durate e si ferma allo stop', () => {
    // Istante esatto per raggiungere il tick 10 da 0
    let at = 1000;
    for (let t = 0; t < 10; t++) at += tickDurationMs(result, t, 2);
    const r = computeTimeline({ result, anchorTick: 0, anchorAt: 1000, now: at - 1, speed: 2, stopTick: 20 });
    expect(r.tick).toBe(9);
    expect(r.reachedStopAt).toBeNull();
    const r2 = computeTimeline({ result, anchorTick: 0, anchorAt: 1000, now: at, speed: 2, stopTick: 20 });
    expect(r2.tick).toBe(10);
    // reachedStopAt solo quando si arriva ALLO stop
    const end = computeTimeline({ result, anchorTick: 0, anchorAt: 1000, now: at, speed: 2, stopTick: 10 });
    expect(end.tick).toBe(10);
    expect(end.reachedStopAt).toBe(at);
    // anchor nel futuro: non si muove
    expect(computeTimeline({ result, anchorTick: 0, anchorAt: 9999, now: 5000, speed: 2, stopTick: 10 }).tick).toBe(0);
    // ripresa: nuovo ancoraggio da uno stop
    const resumed = computeTimeline({ result, anchorTick: 10, anchorAt: at + 5000, now: at + 5000 + tickDurationMs(result, 10, 2), speed: 2, stopTick: 20 });
    expect(resumed.tick).toBe(11);
  });

  it('nextStop: decisioni, rigori, fine', () => {
    const end = lastTick(result);
    // primo stop: decisionTicks[0]-1 = 0 (pre-partita)
    expect(nextStop(result, 0, [], true)).toBe(result.decisionTicks[0] - 1);
    // risolto -> prossimo
    expect(nextStop(result, result.decisionTicks[0] - 1, [result.decisionTicks[0] - 1], true))
      .toBe(result.decisionTicks[1] - 1);
    // tutte le decisioni risolte: shootout ? fullTimeTick : end
    const resolved = result.decisionTicks.map(d => d - 1);
    const expected = result.shootout ? result.fullTimeTick : end;
    expect(nextStop(result, resolved[2], resolved, true)).toBe(expected);
    // senza umani si va dritti alla fine
    expect(nextStop(result, 0, [], false)).toBe(end);
    // dopo l'ultimo stop -> fine
    const all = [...resolved, result.fullTimeTick];
    expect(nextStop(result, result.fullTimeTick, all, true)).toBe(end);
  });
});
