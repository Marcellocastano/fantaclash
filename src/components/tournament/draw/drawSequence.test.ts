import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildDrawSequence, occupiedAfter, slotOf, USER_SPIN_MS } from './drawSequence';

const ORDER = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

describe('buildDrawSequence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('estrae una permutazione degli slot 0-7, ognuno una sola volta', () => {
    const steps = buildDrawSequence(ORDER, null);
    expect(steps).toHaveLength(8);
    expect(steps.map(s => s.slot).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('il tabellone finale coincide con order: slot j -> order[j]', () => {
    const steps = buildDrawSequence(ORDER, null);
    const bySlot = new Map(steps.map(s => [s.slot, s.teamId]));
    ORDER.forEach((id, j) => expect(bySlot.get(j)).toBe(id));
    expect(occupiedAfter(steps, 8).size).toBe(8);
  });

  it('ogni path tocca solo slot liberi, senza ripetizioni consecutive, e finisce sul target', () => {
    const steps = buildDrawSequence(ORDER, null);
    const filled = new Set<number>();
    for (const s of steps) {
      expect(filled.has(s.slot)).toBe(false);
      for (let h = 0; h < s.path.length; h++) {
        expect(filled.has(s.path[h])).toBe(false);
        if (h > 0) expect(s.path[h]).not.toBe(s.path[h - 1]);
      }
      if (s.path.length > 0) expect(s.path[s.path.length - 1]).toBe(s.slot);
      expect(s.hopDelays).toHaveLength(s.path.length);
      expect(s.spinMs > 0).toBe(s.path.length > 0);
      filled.add(s.slot);
    }
  });

  it('è deterministica: stesso order -> stessa sequenza; ordini diversi -> sequenze diverse', () => {
    const a = buildDrawSequence(ORDER, null);
    expect(buildDrawSequence(ORDER, null)).toEqual(a);
    expect(buildDrawSequence([...ORDER].reverse(), null)).not.toEqual(a);
  });

  it('non usa Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    buildDrawSequence(ORDER, 'a');
    expect(spy).not.toHaveBeenCalled();
  });

  it('crescendo: le durate calano man mano che restano meno slot, ultima senza roulette', () => {
    const steps = buildDrawSequence(ORDER, null);
    const spins = steps.map(s => s.spinMs);
    for (let i = 1; i < spins.length; i++) expect(spins[i]).toBeLessThanOrEqual(spins[i - 1]);
    const last = steps[steps.length - 1];
    expect(last.spinMs).toBe(0);
    expect(last.path).toHaveLength(0);
  });

  it("roulette piena quando esce la squadra dell'utente o finisce nel suo quarto", () => {
    const steps = buildDrawSequence(ORDER, 'a'); // 'a' è order[0] -> quarto 0
    for (const s of steps) {
      const hitsUser = s.teamId === 'a' || slotOf(s.slot).quarter === 0;
      if (hitsUser && s.path.length > 0) expect(s.spinMs).toBeGreaterThanOrEqual(USER_SPIN_MS);
    }
  });

  it('senza squadra dell\'utente (spettatore) le durate seguono solo il crescendo', () => {
    const steps = buildDrawSequence(ORDER, null);
    steps.slice(0, -1).forEach((s, i) => expect(s.spinMs).toBe([1800, 1500, 1300, 1100, 900, 700, 450][i]));
  });
});
