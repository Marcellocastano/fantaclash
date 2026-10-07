import { describe, it, expect } from 'vitest';
import { Player, PlayerRole } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';
import { SEASON_PLAYERS, strongTeam, teamFromRank, weakTeam } from '../../test/matchFixtures';
import { departmentStrength } from '../teams/teamStrength';
import {
  getPlaybackState,
  lastTick,
  MatchResult,
  MatchSide,
  MatchTeamInput,
  shortName,
  simulateMatch,
  withTacticChange,
} from './index';
import { BALL_BOX_MAX, BALL_BOX_MIN } from './matchBall';

const MID = teamFromRank('mid', 4);
const OPP = teamFromRank('opp', 5);

function run(home: MatchTeamInput, away: MatchTeamInput, n: number, base = 1): MatchResult[] {
  return Array.from({ length: n }, (_, i) => simulateMatch({ home, away, seed: base + i * 7919 }));
}

function ranked(role: PlayerRole, from: 'top' | 'bottom', count: number): Player[] {
  const list = SEASON_PLAYERS.filter(p => p.role === role).sort((a, b) => playerOverall(b) - playerOverall(a));
  return from === 'top' ? list.slice(0, count) : list.slice(-count);
}

/** Squadra MID con i reparti indicati sostituiti dai migliori/peggiori */
function variant(id: string, roles: PlayerRole[], from: 'top' | 'bottom'): MatchTeamInput {
  const counts: Record<PlayerRole, number> = { P: 1, D: 2, C: 3, A: 2 };
  const players = MID.players.filter(p => !roles.includes(p.role));
  for (const r of roles) players.push(...ranked(r, from, counts[r]));
  return { id, name: id, players };
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const goalsOf = (r: MatchResult, side: MatchSide) => (side === 'home' ? r.homeScore : r.awayScore);

describe('motore partita — determinismo', () => {
  it('stesso seme -> stesso risultato', () => {
    const a = simulateMatch({ home: MID, away: OPP, seed: 42 });
    const b = simulateMatch({ home: MID, away: OPP, seed: 42 });
    expect(b).toEqual(a);
  });

  it('semi diversi -> risultati potenzialmente diversi', () => {
    const scores = new Set(run(MID, OPP, 20).map(r => `${r.homeScore}-${r.awayScore}-${r.events.length}`));
    expect(scores.size).toBeGreaterThan(5);
  });

  it('cambiare tattica al tick k non altera gli eventi precedenti', () => {
    const base = simulateMatch({ home: MID, away: OPP, seed: 7 });
    const k = base.decisionTicks[1];
    const changed = simulateMatch({
      home: MID,
      away: OPP,
      seed: 7,
      options: { tactics: { home: withTacticChange([], k, 'attacca') } },
    });
    expect(changed.events.filter(e => e.tick < k)).toEqual(base.events.filter(e => e.tick < k));
    expect(changed.ticks[k].tactic.home).toBe('attacca');
  });
});

describe('motore partita — coerenza della timeline', () => {
  const results = run(MID, OPP, 200);

  it('gli eventi rispettano l\'ordine temporale', () => {
    for (const r of results) {
      for (let i = 1; i < r.events.length; i++) expect(r.events[i].tick).toBeGreaterThanOrEqual(r.events[i - 1].tick);
      for (const e of r.events) {
        expect(e.minute).toBe(r.ticks[e.tick].minute);
        expect(e.extra).toBe(r.ticks[e.tick].extra);
      }
      expect(r.events[r.events.length - 1].type).toBe('full_time');
    }
  });

  it('ogni gol aggiorna correttamente il punteggio', () => {
    for (const r of results) {
      const score = { home: 0, away: 0 };
      for (const e of r.events) {
        if (e.type === 'goal' || e.type === 'own_goal') {
          score[e.side]++;
          expect(e.score).toEqual(score);
        }
      }
      expect(score).toEqual({ home: r.homeScore, away: r.awayScore });
      const final = getPlaybackState(r, lastTick(r));
      expect(final.score).toEqual(score);
      expect(final.finished).toBe(true);
      expect(getPlaybackState(r, 0).score).toEqual({ home: 0, away: 0 });
    }
  });

  it('pareggio -> rigori, sempre un vincitore', () => {
    for (const r of results) {
      expect([r.homeTeamId, r.awayTeamId]).toContain(r.winnerId);
      if (r.homeScore === r.awayScore) {
        expect(r.shootout).not.toBeNull();
        expect(r.shootout!.home).not.toBe(r.shootout!.away);
        expect(r.winnerId).toBe(r.shootout!.home > r.shootout!.away ? r.homeTeamId : r.awayTeamId);
      } else {
        expect(r.shootout).toBeNull();
        expect(r.winnerId).toBe(r.homeScore > r.awayScore ? r.homeTeamId : r.awayTeamId);
      }
    }
    expect(results.some(r => r.shootout)).toBe(true);
  });

  it('ordine dei rigoristi scelto: cambia solo la lotteria, i 90 minuti restano identici', () => {
    const base = results.find(r => r.shootout)!;
    const chosen = [...base.shootoutOrder!.home].reverse();
    const r = simulateMatch({ home: MID, away: OPP, seed: base.seed, options: { shootoutOrder: { home: chosen } } });
    const regulation = (x: MatchResult) => x.events.filter(e => e.tick <= x.fullTimeTick && e.type !== 'full_time');
    expect(regulation(r)).toEqual(regulation(base));
    expect(r.shootoutOrder!.home).toEqual(chosen);
    expect(r.shootoutOrder!.away).toEqual(base.shootoutOrder!.away);
    const homeKicks = r.events.filter(e => e.type === 'shootout_kick' && e.side === 'home');
    homeKicks.forEach((k, i) => expect(k.playerId).toBe(chosen[i % chosen.length]));
  });

  it('pagelle: gol individuali coerenti con il punteggio, MVP e peggiore definiti', () => {
    for (const r of results) {
      for (const side of ['home', 'away'] as MatchSide[]) {
        const own = r.events.filter(e => e.type === 'own_goal' && e.side === side).length;
        const goals = r.playerPerformances.filter(p => p.side === side).reduce((s, p) => s + p.goals, 0);
        expect(goals + own).toBe(goalsOf(r, side));
      }
      expect(r.playerPerformances).toHaveLength(16);
      expect(r.playerPerformances.some(p => p.playerId === r.mvpId)).toBe(true);
      expect(r.mvpId).not.toBe(r.worstId);
      for (const p of r.playerPerformances) {
        expect(p.rating).toBeGreaterThanOrEqual(4);
        expect(p.rating).toBeLessThanOrEqual(9);
        expect(p.fantasyScore).toBe(p.rating + p.bonus);
      }
    }
  });

  it('pallone: gol a fondo campo, occasioni in area, movimento graduale e variato', () => {
    const allPositions: number[] = [];
    let steps = 0;
    let fastSteps = 0;
    let bounces = 0;
    let beyondCenter = 0;
    let total = 0;
    for (const r of results) {
      for (const e of r.events) {
        if (e.tick > r.fullTimeTick) continue;
        const sign = e.side === 'home' ? 1 : -1;
        const ball = r.ticks[e.tick].ball;
        if (e.type === 'goal' || e.type === 'own_goal') expect(ball).toBe(sign);
        const goalTick = r.events.some(g => g.tick === e.tick && (g.type === 'goal' || g.type === 'own_goal'));
        if (!goalTick && (e.type === 'save' || e.type === 'woodwork' || e.type === 'chance')) {
          expect(ball * sign).toBeGreaterThanOrEqual(BALL_BOX_MIN);
          expect(ball * sign).toBeLessThanOrEqual(BALL_BOX_MAX);
        }
      }
      // Movimento graduale: spostamenti oltre 0.5 di metà campo al minuto
      // solo in rari casi (due azioni ravvicinate), niente rimbalzi
      // avanti-indietro; le riprese dal centro (gol, intervallo) sono escluse
      const isRestart = (t: number) => Math.abs(r.ticks[t - 1].ball) === 1 || t === r.halfTimeTick + 1;
      for (let t = 1; t <= r.fullTimeTick; t++) {
        const prev = r.ticks[t - 1].ball;
        const cur = r.ticks[t].ball;
        if (!isRestart(t)) {
          steps++;
          if (Math.abs(cur - prev) > 0.5) fastSteps++;
          if (t + 1 <= r.fullTimeTick && !isRestart(t + 1)) {
            const d1 = cur - prev;
            const d2 = r.ticks[t + 1].ball - cur;
            // Un'inversione su un tiro è fisiologica (tiro e rinvio): conta solo il resto
            const shotTick = r.events.some(e => e.tick === t && e.impact >= 1 && e.type !== 'tactic' && e.type !== 'yellow_card' && e.type !== 'injury');
            if (!shotTick && Math.sign(d1) !== Math.sign(d2) && Math.abs(d1) > 0.25 && Math.abs(d2) > 0.25) bounces++;
          }
        }
        allPositions.push(cur);
        total++;
        if (Math.abs(cur) > 0.25) beyondCenter++;
      }
    }
    // Mai fermo sugli stessi punti (esclusi centro e porte), e non sempre a centrocampo
    const freq = new Map<number, number>();
    for (const p of allPositions) if (Math.abs(p) > 0.05 && Math.abs(p) < 1) freq.set(p, (freq.get(p) ?? 0) + 1);
    const mostFrequent = Math.max(...freq.values());
    console.log(`pallone: valore più ripetuto ${(100 * mostFrequent / total).toFixed(2)}% dei minuti`);
    expect(mostFrequent / total).toBeLessThan(0.01);
    expect(beyondCenter / total).toBeGreaterThan(0.3);
    console.log(`pallone: ${(100 * fastSteps / steps).toFixed(2)}% spostamenti rapidi, ${(100 * bounces / steps).toFixed(2)}% rimbalzi`);
    expect(fastSteps / steps).toBeLessThan(0.04);
    expect(bounces / steps).toBeLessThan(0.03);
  });

  it('forma tra 0.90 e 1.10, tre punti di decisione', () => {
    for (const r of results.slice(0, 20)) {
      for (const p of [...r.lineups.home, ...r.lineups.away]) {
        expect(p.form).toBeGreaterThanOrEqual(0.9);
        expect(p.form).toBeLessThanOrEqual(1.1);
      }
      expect(r.decisionTicks).toHaveLength(3);
      expect(r.ticks[r.decisionTicks[1]].minute).toBe(46);
      expect(r.ticks[r.decisionTicks[2]].minute).toBe(75);
    }
  });
});

describe('motore partita — fattori', () => {
  it('squadre molto più forti vincono più spesso, ma non sempre', () => {
    const rs = run(strongTeam(), weakTeam(), 500);
    const strongWins = rs.filter(r => r.winnerId === 'forte').length / rs.length;
    expect(strongWins).toBeGreaterThan(0.75);
    // L'RNG permette sorprese
    expect(strongWins).toBeLessThan(0.99);
  });

  it('il numero di gol resta plausibile', () => {
    const rs = run(MID, OPP, 500);
    const goals = rs.map(r => r.homeScore + r.awayScore);
    expect(avg(goals)).toBeGreaterThan(1.8);
    expect(avg(goals)).toBeLessThan(3.6);
    expect(Math.max(...goals)).toBeLessThanOrEqual(12);
  });

  it('portiere e difesa influenzano i gol subiti', () => {
    const good = run(variant('muro', ['P', 'D'], 'top'), OPP, 600);
    const bad = run(variant('colabrodo', ['P', 'D'], 'bottom'), OPP, 600);
    expect(avg(good.map(r => r.awayScore))).toBeLessThan(avg(bad.map(r => r.awayScore)) - 0.2);
  });

  it('attacco e centrocampo influenzano la produzione offensiva', () => {
    const good = run(variant('bomber', ['C', 'A'], 'top'), OPP, 600);
    const bad = run(variant('sterile', ['C', 'A'], 'bottom'), OPP, 600);
    expect(avg(good.map(r => r.homeScore))).toBeGreaterThan(avg(bad.map(r => r.homeScore)) + 0.3);
    expect(avg(good.map(r => r.stats.home.chances))).toBeGreaterThan(avg(bad.map(r => r.stats.home.chances)));
    expect(avg(good.map(r => r.stats.home.possession))).toBeGreaterThan(avg(bad.map(r => r.stats.home.possession)));
  });

  it('un\'espulsione indebolisce la squadra (controllo del gioco in calo)', () => {
    let before = 0;
    let after = 0;
    let n = 0;
    for (const r of run(MID, OPP, 3000)) {
      const red = r.events.find(e => e.type === 'red_card');
      if (!red || red.tick < 16 || red.tick > r.fullTimeTick - 16) continue;
      const control = (t: number) => (red.side === 'home' ? r.ticks[t].homeControl : 1 - r.ticks[t].homeControl);
      for (let k = 1; k <= 15; k++) {
        before += control(red.tick - k);
        after += control(red.tick + k);
      }
      n++;
    }
    expect(n).toBeGreaterThan(20);
    expect(after / (15 * n)).toBeLessThan(before / (15 * n) - 0.03);
    // E nel calcolo dei reparti
    const full = [0.8, 0.8].map(q => ({ role: 'D' as const, quality: q, active: true, injured: false }));
    const down = [{ ...full[0] }, { ...full[1], active: false }];
    expect(departmentStrength(down, 'D')).toBeLessThan(departmentStrength(full, 'D'));
  });

  it('attaccare crea più occasioni ma ne concede di più rispetto a difendere', () => {
    const plan = (tactic: 'attacca' | 'difendi') => ({ home: [{ fromTick: 1, tactic }] });
    const att = Array.from({ length: 500 }, (_, i) =>
      simulateMatch({ home: MID, away: OPP, seed: i + 1, options: { tactics: plan('attacca') } })
    );
    const def = Array.from({ length: 500 }, (_, i) =>
      simulateMatch({ home: MID, away: OPP, seed: i + 1, options: { tactics: plan('difendi') } })
    );
    expect(avg(att.map(r => r.stats.home.chances))).toBeGreaterThan(avg(def.map(r => r.stats.home.chances)));
    expect(avg(att.map(r => r.stats.away.chances))).toBeGreaterThan(avg(def.map(r => r.stats.away.chances)));
    // L'attacco costa energia
    expect(att[0].ticks[att[0].fullTimeTick].energy.home).toBeLessThan(def[0].ticks[def[0].fullTimeTick].energy.home);
  });
});

describe('cronaca', () => {
  it('shortName estrae il cognome', () => {
    expect(shortName('HIGUAIN Gonzalo Gera.')).toBe('Higuain');
    expect(shortName('MILINKOVIC-SAVIC Sergej')).toBe('Milinkovic-Savic');
    expect(shortName('DE ROSSI Daniele')).toBe('De Rossi');
    expect(shortName('Mike Maignan')).toBe('Maignan');
  });
});
