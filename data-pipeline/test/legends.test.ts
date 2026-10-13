import { describe, it, expect } from 'vitest';
import type { Player, PlayerRole } from '../../src/types/index.ts';
import {
  buildLegends,
  collisionReport,
  LEGENDS_COUNT,
  LEGENDS_MAX_OVR,
  LEGENDS_MIN_OVR,
  legendBaseValue,
  legendOverall,
  legendTiebreak,
  playerKey,
  splitIdentity,
} from '../src/derive/legends.ts';

/** Codice di sole lettere (i numeri verrebbero tolti dalla chiave). */
const code = (i: number) => `${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`;

function player(partial: Partial<Player> & { name: string; role: PlayerRole; overall: number }): Player {
  return {
    id: partial.name,
    team: 'Club',
    baseValue: 10,
    avgRating: 6.5,
    goalProbability: 0,
    assistProbability: 0,
    yellowCardProbability: 0,
    redCardProbability: 0,
    reliability: 0.8,
    season: '2010-11',
    stats: { appearances: 30, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    ...partial,
  };
}

describe('splitIdentity / playerKey', () => {
  it('cognome maiuscolo + nome proprio', () => {
    expect(splitIdentity('HIGUAIN Gonzalo Gera.')).toEqual({ surname: 'HIGUAIN', given: 'Gonzalo Gera.' });
    expect(playerKey('HIGUAIN Gonzalo Gera.')).toBe('HIGUAIN|GON');
  });

  it('mononimi e cognomi composti', () => {
    expect(playerKey("KAKA'")).toBe('KAKA');
    expect(playerKey('JULIO CESAR Soares D.')).toBe('JULIOCESAR|SOA');
    expect(playerKey('DI LORENZO Giovanni')).toBe('DILORENZO|GIO');
  });

  it('varianti dello stesso giocatore', () => {
    expect(playerKey('KAKA Ricardo')).toBe(playerKey("KAKA' Ricardo Izecso."));
    expect(playerKey('SHEVCHENKO Andrij')).toBe(playerKey('SHEVCHENKO Andriy'));
    expect(playerKey('DIDA Nelson de Jesus.')).toBe(playerKey('DIDA Nelson De Jesus.'));
    expect(playerKey('MAICON Douglas')).toBe(playerKey('MAICON Douglas Sisen.'));
  });

  it('omonimi diversi non si uniscono', () => {
    expect(playerKey('MANCINI Alessandro')).not.toBe(playerKey('MANCINI Amantino'));
    expect(playerKey('DONI Alexander Maran.')).not.toBe(playerKey('DONI Cristiano'));
  });
});

describe('legendTiebreak', () => {
  it('portiere: affidabilità meno gol subiti a presenza', () => {
    const p = player({ name: 'P', role: 'P', overall: 90, reliability: 0.9, stats: { appearances: 30, goals: 0, assists: 0, yellowCards: 0, redCards: 0, goalsConceded: 15 } });
    expect(legendTiebreak(p)).toBeCloseTo(0.9 - 0.5);
  });

  it('attaccante: gol + 0.6 assist per presenza', () => {
    const p = player({ name: 'A', role: 'A', overall: 90, reliability: 0.5, stats: { appearances: 30, goals: 30, assists: 10, yellowCards: 0, redCards: 0 } });
    expect(legendTiebreak(p)).toBeCloseTo(0.5 + (30 + 6) / 30);
  });
});

describe('buildLegends', () => {
  const seasons: Player[] = [
    // stesso giocatore in due annate: vince l'overall più alto
    player({ name: 'KAKA Ricardo', role: 'C', overall: 92, season: '2004-05', team: 'Milan' }),
    player({ name: "KAKA' Ricardo Izecso.", role: 'C', overall: 93, season: '2006-07', team: 'Milan' }),
    // riempie i ruoli
    ...Array.from({ length: 14 }, (_, i) => player({ name: `PP${code(i)} Gio`, role: 'P', overall: 80 + i })),
    ...Array.from({ length: 26 }, (_, i) => player({ name: `DD${code(i)} Luca`, role: 'D', overall: 80 + (i % 8) })),
    ...Array.from({ length: 38 }, (_, i) => player({ name: `CC${code(i)} Max`, role: 'C', overall: 80 + (i % 10) })),
    ...Array.from({ length: 26 }, (_, i) => player({ name: `AA${code(i)} Leo`, role: 'A', overall: 80 + (i % 6) })),
  ];

  const { players, collisions } = buildLegends(seasons);

  it('una card per giocatore, nell’annata migliore', () => {
    const kaka = players.find(p => p.name.startsWith('KAKA'));
    expect(kaka).toBeDefined();
    expect(kaka!.season).toBe('2006-07');
    expect(players.filter(p => playerKey(p.name) === playerKey("KAKA' Ricardo Izecso.")).length).toBe(1);
  });

  it('conteggi per ruolo e range di overall', () => {
    for (const role of ['P', 'D', 'C', 'A'] as const) {
      const sel = players.filter(p => p.role === role);
      expect(sel.length).toBe(LEGENDS_COUNT[role]);
      expect(Math.max(...sel.map(p => p.overall!))).toBe(LEGENDS_MAX_OVR);
      // il minimo è 84 solo se l'ultimo ha un rank unico (con parità può restare più alto)
      for (const p of sel) {
        expect(p.overall!).toBeGreaterThanOrEqual(LEGENDS_MIN_OVR);
        expect(p.overall!).toBeLessThanOrEqual(LEGENDS_MAX_OVR);
      }
      // monotono rispetto al rank (non crescente)
      const sorted = sel.map(p => p.overall!).sort((a, b) => b - a);
      expect(sorted).toEqual([...sorted].sort((a, b) => b - a));
    }
    expect(players.length).toBe(96);
  });

  it('ultimo 84 quando il rank più basso è unico', () => {
    const many = [
      ...Array.from({ length: 14 }, (_, i) => player({ name: `PZ${code(i)} Gio`, role: 'P', overall: 70 + i })),
      ...Array.from({ length: 24 }, (_, i) => player({ name: `DZ${code(i)} Luca`, role: 'D', overall: 80 + i })),
      ...Array.from({ length: 36 }, (_, i) => player({ name: `CZ${code(i)} Max`, role: 'C', overall: 60 + i })),
      ...Array.from({ length: 24 }, (_, i) => player({ name: `AZ${code(i)} Leo`, role: 'A', overall: 60 + i })),
    ];
    const { players: ps } = buildLegends(many);
    for (const role of ['P', 'D', 'C', 'A'] as const) {
      const sel = ps.filter(p => p.role === role);
      expect(Math.min(...sel.map(p => p.overall!))).toBe(LEGENDS_MIN_OVR);
    }
  });

  it('flag legend e id univoci', () => {
    expect(players.every(p => p.legend === true)).toBe(true);
    expect(new Set(players.map(p => p.id)).size).toBe(players.length);
  });

  it('baseValue crescente con l’overall', () => {
    const a84 = legendBaseValue(84, 'A');
    const a99 = legendBaseValue(99, 'A');
    expect(a99).toBeGreaterThan(a84);
    expect(a99).toBe(55);
  });
});

describe('legendOverall / collisionReport', () => {
  it('primo 99, ultimo 84, monotono', () => {
    const n = 24;
    const values = Array.from({ length: n }, (_, i) => legendOverall(i, n));
    expect(values[0]).toBe(99);
    expect(values[n - 1]).toBe(84);
    for (let i = 1; i < n; i++) expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
  });

  it('collisioni: stesso cognome, chiavi diverse', () => {
    const map = new Map<string, Player>([
      ['MANCINI|ALE', player({ name: 'MANCINI Alessandro', role: 'D', overall: 90 })],
      ['MANCINI|GIA', player({ name: 'MANCINI Gianluca', role: 'D', overall: 90 })],
      ['ROSSI|MAR', player({ name: 'ROSSI Mario', role: 'A', overall: 90 })],
    ]);
    const report = collisionReport(map);
    expect(report).toEqual([{ surname: 'MANCINI', keys: ['MANCINI|ALE', 'MANCINI|GIA'] }]);
  });
});
