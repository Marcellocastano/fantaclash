import { describe, it, expect } from 'vitest';
import { FANTASY_BONUSES, Player, PlayerRole } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';
import { SEASON_PLAYERS, strongTeam, teamFromRank, weakTeam } from '../../test/matchFixtures';
import { assertInvariants, possessionMismatches, scoreBefore, SIDES, TACTICS } from '../../test/matchAudit';
import { departmentStrength, penaltySaveSkill, rosterRating } from '../teams/teamStrength';
import { autoLineup, lineupPlayers } from '../teams/formations';
import {
  computePerformances,
  getPlaybackState,
  lastTick,
  MatchEvent,
  MatchEventType,
  MatchOptions,
  MatchResult,
  MatchSide,
  MatchTeamInput,
  shortName,
  simulateMatch,
  TacticChange,
  withTacticChange,
} from './index';
import { LineupPlayer } from './matchTypes';
import { SHOOTOUT_MAX_ROUNDS } from './matchEngine';
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
  return { id, name: id, players, formation: MID.formation };
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

describe('moduli e formazioni', () => {
  const roster = (['P', 'D', 'C', 'A'] as PlayerRole[]).flatMap(role => {
    const n = role === 'P' ? 1 : role === 'A' ? 3 : 4;
    return SEASON_PLAYERS.filter(player => player.role === role).slice(0, n);
  });

  it('la formazione selezionata entra negli input del motore e nel risultato deterministico', () => {
    const make = (id: string, formation: MatchTeamInput['formation']): MatchTeamInput => {
      const lineup = autoLineup(roster, formation);
      return { id, name: id, formation, players: lineupPlayers(roster, lineup) };
    };
    const home = make('home', '3-3-1');
    const away = make('away', '2-4-1');
    const first = simulateMatch({ home, away, seed: 92 });
    expect(first.formations).toEqual({ home: '3-3-1', away: '2-4-1' });
    expect(first.profiles.home.formation).toBe('3-3-1');
    expect(first.profiles.away.formation).toBe('2-4-1');
    expect(first.lineups.home).toHaveLength(8);
    expect(simulateMatch({ home, away, seed: 92 })).toEqual(first);
    expect(simulateMatch({ home: make('home', '2-3-2'), away, seed: 92 })).not.toEqual(first);
  });

  it('consente il pareggio nei gironi senza avviare i rigori', () => {
    const home = teamFromRank('home', 8);
    const away = teamFromRank('away', 8);
    let drawn: MatchResult | undefined;
    for (let seed = 0; seed < 500 && !drawn; seed++) {
      const regulation = simulateMatch({ home, away, seed });
      if (regulation.homeScore === regulation.awayScore) {
        drawn = simulateMatch({ home, away, seed, options: { allowDraw: true } });
      }
    }
    expect(drawn).toBeDefined();
    expect(drawn?.homeScore).toBe(drawn?.awayScore);
    expect(drawn?.shootout).toBeNull();
    expect(drawn?.winnerId).toBeNull();
    expect(drawn?.events.some(event => event.type === 'shootout_start')).toBe(false);
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
    expect(mostFrequent / total).toBeLessThan(0.0125);
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

describe('motore partita — audit D1-D9', () => {
  it('deterministica con tattiche e ordine dei rigori fissati su entrambi i lati', () => {
    const options: MatchOptions = {
      tactics: {
        home: [{ fromTick: 8, tactic: 'attacca' }],
        away: [{ fromTick: 20, tactic: 'difendi' }],
      },
      shootoutOrder: {
        home: [...MID.players.map(p => p.id)].reverse(),
        away: [...OPP.players.map(p => p.id)].reverse(),
      },
    };
    const a = simulateMatch({ home: MID, away: OPP, seed: 99, options });
    const b = simulateMatch({ home: MID, away: OPP, seed: 99, options });
    expect(b).toEqual(a);
  });

  it('ingressi clonati -> stesso risultato; gli ingressi non vengono mutati', () => {
    const home = structuredClone(MID);
    const away = structuredClone(OPP);
    const before = JSON.stringify({ home, away });
    const r1 = simulateMatch({ home, away, seed: 11 });
    expect(JSON.stringify({ home, away })).toBe(before);
    const r2 = simulateMatch({ home: structuredClone(MID), away: structuredClone(OPP), seed: 11 });
    expect(r2).toEqual(r1);
  });

  it('un cambio tattico al tick k non riscrive il passato (tutti i punti di decisione, entrambi i lati)', () => {
    for (let i = 0; i < 40; i++) {
      const seed = 1000 + i * 104729;
      const base = simulateMatch({ home: MID, away: OPP, seed });
      // Piano fisso dal tick 1: aggiungere un cambio al tick k non deve
      // alterare il passato (il piano sostituisce anche l'IA precedente)
      for (const k of base.decisionTicks) {
        for (const side of SIDES) {
          for (const tactic of TACTICS) {
            const plan: TacticChange[] = [{ fromTick: 1, tactic: 'equilibrata' }];
            const changed = simulateMatch({
              home: MID,
              away: OPP,
              seed,
              options: { tactics: { [side]: [...plan, { fromTick: k, tactic }] } },
            });
            const fixed = simulateMatch({ home: MID, away: OPP, seed, options: { tactics: { [side]: plan } } });
            expect(changed.events.filter(e => e.tick < k)).toEqual(fixed.events.filter(e => e.tick < k));
            // Il pallone (`ball`) è presentazione: calcolato a posteriori
            // da TUTTI gli eventi, può differire anche prima di k
            const strip = (r: MatchResult) =>
              r.ticks.slice(0, k).map(t => {
                const { ball, ...rest } = t;
                void ball;
                return rest;
              });
            expect(strip(changed)).toEqual(strip(fixed));
          }
        }
      }
    }
  });

  it('la tattica non rimescola cartellini e infortuni (stream casuali separati)', () => {
    // Con carte/infortuni sullo stream "discipline" e le decisioni di gioco
    // su "tick", attacca ed equilibrata (stesso moltiplicatore cartellini)
    // devono produrre gli stessi eventi rari prima del primo gol/rosso.
    // Gli id degli eventi sono contatori globali: si confronta il contenuto
    const rare = (r: MatchResult, cutoff: number) =>
      r.events
        .filter(
          e => e.tick < cutoff && (e.type === 'yellow_card' || e.type === 'red_card' || e.type === 'injury')
        )
        .map(e => ({ tick: e.tick, type: e.type, side: e.side, playerId: e.playerId, secondYellow: e.secondYellow }));
    const cut = (r: MatchResult) =>
      Math.min(
        r.events.find(e => e.type === 'goal' || e.type === 'own_goal')?.tick ?? Infinity,
        r.events.find(e => e.type === 'red_card')?.tick ?? Infinity
      );
    for (let i = 0; i < 300; i++) {
      const seed = 5000 + i * 97;
      const att = simulateMatch({ home: MID, away: OPP, seed, options: { tactics: { home: [{ fromTick: 1, tactic: 'attacca' }] } } });
      const equ = simulateMatch({ home: MID, away: OPP, seed, options: { tactics: { home: [{ fromTick: 1, tactic: 'equilibrata' }] } } });
      const cutoff = Math.min(cut(att), cut(equ));
      expect(rare(att, cutoff)).toEqual(rare(equ, cutoff));
    }
  });

  it('invarianti su 400 partite, possesso motore = riproduzione', () => {
    const strong = strongTeam();
    const weak = weakTeam();
    const mismatchesBefore = possessionMismatches.count;
    for (let i = 0; i < 100; i++) {
      for (const [h, a] of [[MID, OPP], [strong, weak]] as const) {
        assertInvariants(simulateMatch({ home: h, away: a, seed: 7000 + i * 31 }));
        assertInvariants(
          simulateMatch({
            home: h,
            away: a,
            seed: 9000 + i * 17,
            options: {
              tactics: {
                home: [{ fromTick: 1, tactic: 'attacca' }],
                away: [{ fromTick: 1, tactic: 'difendi' }],
              },
            },
          })
        );
      }
    }
    expect(possessionMismatches.count).toBe(mismatchesBefore);
  });
});

describe('pagelle — portiere espulso (D3)', () => {
  const lp = (playerId: string, role: PlayerRole): LineupPlayer => ({
    playerId,
    name: playerId,
    role,
    club: 'X',
    overall: 80,
    form: 1,
  });
  const ev = (tick: number, type: MatchEventType, side: MatchSide, playerId?: string): MatchEvent => ({
    id: `e-${tick}-${type}`,
    tick,
    minute: tick,
    extra: 0,
    type,
    teamId: side === 'home' ? 'h' : 'a',
    side,
    playerId,
    impact: 1,
    description: '',
  });
  const lineups = {
    home: [lp('h-gk', 'P'), lp('h-d', 'D')],
    away: [lp('a-gk', 'P'), lp('a-f', 'A')],
  };
  const teamIds = { home: 'h', away: 'a' };

  it('i gol subiti dopo il rosso non vanno al portiere espulso, niente porta inviolata', () => {
    const perfs = computePerformances({
      teamIds,
      lineups,
      events: [ev(10, 'red_card', 'home', 'h-gk'), ev(20, 'goal', 'away', 'a-f')],
      finished: true,
    });
    const gk = perfs.find(p => p.playerId === 'h-gk')!;
    expect(gk.goalsConceded).toBe(0);
    expect(gk.cleanSheet).toBe(false);
    // Nessun malus GOAL_CONCEDED: resta solo quello del rosso
    expect(gk.bonus).toBe(FANTASY_BONUSES.RED_CARD);
    expect(gk.rating).toBeLessThanOrEqual(5);
    // Il difensore continua a scontare il gol di squadra
    const d = perfs.find(p => p.playerId === 'h-d')!;
    expect(d.cleanSheet).toBe(false);
  });

  it('un gol subito prima del rosso resta sul conto del portiere', () => {
    const perfs = computePerformances({
      teamIds,
      lineups,
      events: [ev(5, 'goal', 'away', 'a-f'), ev(10, 'red_card', 'home', 'h-gk')],
      finished: true,
    });
    const gk = perfs.find(p => p.playerId === 'h-gk')!;
    expect(gk.goalsConceded).toBe(1);
    expect(gk.bonus).toBe(FANTASY_BONUSES.RED_CARD + FANTASY_BONUSES.GOAL_CONCEDED);
  });

  it('vale anche a partita in corso (finished=false)', () => {
    const perfs = computePerformances({
      teamIds,
      lineups,
      events: [ev(10, 'red_card', 'home', 'h-gk'), ev(20, 'goal', 'away', 'a-f')],
      finished: false,
    });
    const gk = perfs.find(p => p.playerId === 'h-gk')!;
    expect(gk.goalsConceded).toBe(0);
    expect(gk.cleanSheet).toBe(false);
  });
});

describe('penaltySaveSkill — shrinkage verso la media a priori (D2)', () => {
  const gk = (saved: number | undefined, r?: number) =>
    ({ stats: saved === undefined ? undefined : { penaltiesSaved: saved }, penaltySaveProbability: r }) as unknown as Player;

  it('rapporto assente o zero -> media a priori 0.2', () => {
    expect(penaltySaveSkill(gk(0, undefined))).toBeCloseTo(0.2);
    expect(penaltySaveSkill(gk(0, 0))).toBeCloseTo(0.2);
  });

  it('campione piccolo viene ristretto verso il prior', () => {
    expect(penaltySaveSkill(gk(3, 1))).toBeCloseTo((3 + 2) / 13);
    expect(penaltySaveSkill(gk(2, 0.5))).toBeCloseTo((2 + 2) / 14);
  });

  it('resta sempre in (0, 1)', () => {
    for (const saved of [0, 1, 3, 20]) {
      for (const r of [undefined, 0, 0.1, 0.5, 1]) {
        const s = penaltySaveSkill(gk(saved, r));
        expect(s).toBeGreaterThan(0);
        expect(s).toBeLessThan(1);
      }
    }
  });
});

describe('rigori oltre il cap: decide la monetina (D5)', () => {
  // Rose piatte a overall 130 e portieri mai testati sui rigori:
  // le serie si allungano fino a superare SHOOTOUT_MAX_ROUNDS.
  const flat = (id: string, src: MatchTeamInput): MatchTeamInput => ({
    id,
    name: id,
    players: src.players.map(p => ({ ...p, overall: 130, penaltySaveProbability: 0 })),
    formation: src.formation,
  });
  const H = flat('piatti', teamFromRank('a', 4));
  const A = flat('specchio', teamFromRank('b', 5));
  // Semi trovati con una scansione offline (20M di semi): ognuno produce
  // una lotteria che supera SHOOTOUT_MAX_ROUNDS turni a testa
  const SEEDS: number[] = [
    1099491, 2549294, 2718992, 3156514, 3675764, 5485171,
    5831320, 8599138, 8660970, 9417493, 13841063, 15509757,
  ];

  it('serie oltre il cap decise dalla monetina, vincitori di entrambi i lati', () => {
    const winners = new Set<string>();
    for (const seed of SEEDS) {
      const r = simulateMatch({ home: H, away: A, seed });
      assertInvariants(r);
      expect(r.shootout).not.toBeNull();
      const kicks = r.events.filter(e => e.type === 'shootout_kick');
      expect(kicks.length).toBeGreaterThanOrEqual(2 * SHOOTOUT_MAX_ROUNDS + 1);
      if (r.winnerId) winners.add(r.winnerId);
    }
    expect(winners).toContain('piatti');
    expect(winners).toContain('specchio');
  });
});

describe('validazione della formazione (D6)', () => {
  it('rifiuta squadre con meno di otto titolari o distribuzione incompatibile', () => {
    const soloGk: MatchTeamInput = { id: 'solo-p', name: 'solo-p', players: MID.players.filter(p => p.role === 'P'), formation: '2-3-2' };
    const empty: MatchTeamInput = { id: 'vuota', name: 'vuota', players: [], formation: '2-3-2' };
    expect(() => simulateMatch({ home: soloGk, away: OPP, seed: 1 })).toThrow(/Formazione 2-3-2 non valida/);
    expect(() => simulateMatch({ home: OPP, away: empty, seed: 2 })).toThrow(/Formazione 2-3-2 non valida/);
  });
});

describe('IA e informazioni nascoste (D8)', () => {
  // Coppia di rose con forza "da tabellone" diversa di 1-2 punti:
  // la differenza non basta per giustificare "attacca" a punteggio pari.
  const strong = strongTeam('top');
  const quasi: MatchTeamInput = {
    id: 'quasi',
    name: 'quasi',
    players: strong.players.map((p, i) => (i === 0 ? { ...p, overall: playerOverall(p) - 6 } : p)),
    formation: strong.formation,
  };

  it('rosterRating delle due squadre differisce di 1 o 2', () => {
    const diff = rosterRating(strong.players) - rosterRating(quasi.players);
    expect(diff === 1 || diff === 2).toBe(true);
  });

  it('a punteggio pari l\u2019IA non passa mai ad "attacca" per via del rating', () => {
    for (let i = 0; i < 300; i++) {
      const seed = 60000 + i * 13;
      // La squadra forte gioca fuori casa ed è guidata dall'IA
      const r = simulateMatch({ home: quasi, away: strong, seed });
      const k = r.decisionTicks[2];
      if (scoreBefore(r, k, 'away') !== 0) continue;
      const ev = r.events.find(e => e.tick === k && e.type === 'tactic' && e.side === 'away');
      if (ev) expect(ev.tactic).not.toBe('attacca');
      expect(r.ticks[k].tactic.away).not.toBe('attacca');
    }
  });
});
