import { describe, it, expect } from 'vitest';
import { PlayerRole, ROSTER_REQUIREMENTS } from '../../types';
import { createRng, shuffle } from '../../services/auction/rng';
import { spearman } from '../../services/auction/balanceHarness';
import { SEASON_PLAYERS } from '../../test/matchFixtures';
import { rosterRating } from '../teams/teamStrength';
import { MatchTeamInput, simulateMatch } from './index';

/**
 * Suite di equilibrio del motore partita: migliaia di partite tra rose
 * casuali (senza giocatori condivisi) del listone 2015-16.
 * Obiettivo: risultati credibili + sorprese, non realismo perfetto.
 */

const N = 3000;
const ROLES: PlayerRole[] = ['P', 'D', 'C', 'A'];

function pair(seed: number): [MatchTeamInput, MatchTeamInput] {
  const rng = createRng(seed);
  const a: MatchTeamInput = { id: 'a', name: 'A', players: [] };
  const b: MatchTeamInput = { id: 'b', name: 'B', players: [] };
  for (const role of ROLES) {
    const n = ROSTER_REQUIREMENTS[role].total;
    const list = shuffle(SEASON_PLAYERS.filter(p => p.role === role), rng);
    a.players.push(...list.slice(0, n));
    b.players.push(...list.slice(n, 2 * n));
  }
  return [a, b];
}

interface Sample {
  diff: number;
  homeWin: boolean;
  draw: boolean;
  goals: number;
  chances: number;
  events: number;
  favWon: boolean | null;
}

const samples: Sample[] = Array.from({ length: N }, (_, i) => {
  const [home, away] = pair(1000 + i);
  const diff = rosterRating(home.players) - rosterRating(away.players);
  const r = simulateMatch({ home, away, seed: 50000 + i });
  return {
    diff,
    homeWin: r.homeScore > r.awayScore,
    draw: r.homeScore === r.awayScore,
    goals: r.homeScore + r.awayScore,
    chances: r.stats.home.chances + r.stats.away.chances,
    events: r.events.length,
    favWon: diff === 0 ? null : (r.winnerId === 'a') === diff > 0,
  };
});

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const rate = (xs: boolean[]) => xs.filter(Boolean).length / xs.length;

describe(`equilibrio motore partita (${N} partite)`, () => {
  const homeWins = rate(samples.map(s => s.homeWin));
  const draws = rate(samples.map(s => s.draw));
  const awayWins = 1 - homeWins - draws;
  const goals = mean(samples.map(s => s.goals));
  const withFav = samples.filter(s => s.favWon !== null);
  const clear = withFav.filter(s => Math.abs(s.diff) >= 4);
  const favWin = rate(withFav.map(s => !!s.favWon));
  const clearFavWin = rate(clear.map(s => !!s.favWon));
  const dist: Record<string, number> = {};
  for (const s of samples) {
    const k = s.goals >= 7 ? '7+' : String(s.goals);
    dist[k] = (dist[k] ?? 0) + 1;
  }

  console.log(
    [
      `vittorie casa ${homeWins.toFixed(3)} pareggi ${draws.toFixed(3)} vittorie ospiti ${awayWins.toFixed(3)}`,
      `gol medi ${goals.toFixed(2)} distribuzione ${JSON.stringify(dist)}`,
      `occasioni medie ${mean(samples.map(s => s.chances)).toFixed(1)} eventi medi ${mean(samples.map(s => s.events)).toFixed(1)}`,
      `favorito vince ${favWin.toFixed(3)} (divario >=4: ${clearFavWin.toFixed(3)} su ${clear.length}) sorprese ${(1 - favWin).toFixed(3)}`,
    ].join('\n')
  );

  it('gol medi plausibili e distribuzione credibile', () => {
    expect(goals).toBeGreaterThan(2.2);
    expect(goals).toBeLessThan(3.3);
    expect((dist['0'] ?? 0) / N).toBeLessThan(0.12);
    expect((dist['7+'] ?? 0) / N).toBeLessThan(0.05);
  });

  it('pareggi nei regolamentari tra 15% e 35% (poi rigori)', () => {
    expect(draws).toBeGreaterThan(0.15);
    expect(draws).toBeLessThan(0.35);
  });

  it('vantaggio casalingo presente ma molto contenuto', () => {
    expect(homeWins - awayWins).toBeGreaterThan(-0.02);
    expect(homeWins - awayWins).toBeLessThan(0.07);
  });

  it('la forza della squadra conta, ma le sorprese restano frequenti', () => {
    expect(favWin).toBeGreaterThan(0.55);
    expect(clearFavWin).toBeGreaterThan(favWin);
    expect(clearFavWin).toBeLessThan(0.9);
    expect(1 - favWin).toBeGreaterThan(0.15);
  });

  it('correlazione divario di forza -> probabilità di vittoria', () => {
    // Fasce di divario: la percentuale di vittorie di casa cresce col divario
    const buckets = [-99, -4, -1, 2, 5, 99];
    const winRates = buckets.slice(0, -1).map((lo, i) => {
      const inBucket = samples.filter(s => s.diff >= lo && s.diff < buckets[i + 1]);
      return rate(inBucket.map(s => s.homeWin)) + 0.5 * rate(inBucket.map(s => s.draw));
    });
    console.log('punti attesi casa per fascia di divario', winRates.map(x => x.toFixed(3)).join(' '));
    expect(spearman(winRates.map((_, i) => i), winRates)).toBeGreaterThan(0.9);
  });

  it('occasioni ed eventi per partita in un intervallo leggibile', () => {
    const chances = mean(samples.map(s => s.chances));
    const events = mean(samples.map(s => s.events));
    expect(chances).toBeGreaterThan(8);
    expect(chances).toBeLessThan(16);
    expect(events).toBeGreaterThan(15);
    expect(events).toBeLessThan(40);
  });
});
