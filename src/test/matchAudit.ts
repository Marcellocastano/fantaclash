import { readFileSync, readdirSync } from 'node:fs';
import { Player, PlayerRole, Team } from '../types';
import { createRng, hashSeed } from '../services/auction/rng';
import { auctionReducer, createInitialAuctionState } from '../services/auction/session';
import { buildAuctionPool, LEAGUE_SIZE } from '../services/auction/rules';
import { runAuction } from '../services/auction/simulator';
import { playerOverall } from '../services/auction/teamStrength';
import { generateAllTeams } from '../services/teamGenerator';
import { rosterRating } from '../domain/teams/teamStrength';
import {
  getPlaybackState,
  lastTick,
  MatchEvent,
  MatchOptions,
  MatchResult,
  MatchSide,
  MatchTeamInput,
  simulateMatch,
  Tactic,
  TacticChange,
} from '../domain/match';

/**
 * Harness dell'audit del motore partita: squadre realistiche (aste vere),
 * varianti controllate, aggregazione delle metriche, intervalli di
 * confidenza e controllo delle invarianti su ogni partita simulata.
 * Usato da src/domain/match/matchAudit.test.ts (opt-in, MATCH_AUDIT=1).
 */

export const SIDES: MatchSide[] = ['home', 'away'];
export const TACTICS: Tactic[] = ['attacca', 'equilibrata', 'difendi'];
export const other = (s: MatchSide): MatchSide => (s === 'home' ? 'away' : 'home');

// ----------------------------------------------------------------------------
// Dati e squadre
// ----------------------------------------------------------------------------

export function loadSeason(season: string): Player[] {
  return JSON.parse(readFileSync(`public/data/seasons/${season}.json`, 'utf8')).players as Player[];
}

export function allSeasons(): string[] {
  return readdirSync('public/data/seasons')
    .filter(f => f !== 'index.json')
    .map(f => f.replace('.json', ''));
}

/** Rose uscite da aste complete (utente in autopilota + 7 bot) */
export function auctionTeams(seasons: string[], seedsPerSeason: number): MatchTeamInput[] {
  const out: MatchTeamInput[] = [];
  for (const season of seasons) {
    const players = loadSeason(season);
    for (let s = 0; s < seedsPerSeason; s++) {
      const pool = buildAuctionPool(players, LEAGUE_SIZE);
      const teams: Team[] = generateAllTeams('Utente', 'normale', pool, createRng(hashSeed('audit-teams', season, s)));
      let world = { teams, auction: createInitialAuctionState(pool) };
      world = auctionReducer(world, { type: 'START', callingOrder: teams.map(t => t.id) });
      const end = runAuction(world, {
        rng: createRng(hashSeed('audit-auction', season, s)),
        until: 'auction_end',
        startTime: 0,
        userAutopilot: true,
      });
      for (const t of end.teams) {
        out.push({ id: `${season}-${s}-${t.id}`, name: t.name, players: t.roster.map(o => o.player) });
      }
    }
  }
  return out;
}

export function rating(t: MatchTeamInput): number {
  return rosterRating(t.players);
}

/** Squadra con la rosa ordinata per mediana di forza */
export function medianTeam(teams: MatchTeamInput[]): MatchTeamInput {
  const sorted = [...teams].sort((a, b) => rating(a) - rating(b));
  return sorted[Math.floor(sorted.length / 2)];
}

export function withId(t: MatchTeamInput, id: string): MatchTeamInput {
  return { ...t, id, name: id };
}

/**
 * Variante con overall spostato di delta per i ruoli indicati (o un solo
 * giocatore). Gli id restano uguali: stessa forma del giorno a parità di
 * seme (numeri casuali comuni tra le varianti).
 */
export function shifted(
  t: MatchTeamInput,
  id: string,
  delta: number,
  filter: (p: Player, index: number) => boolean = () => true
): MatchTeamInput {
  return {
    id,
    name: id,
    players: t.players.map((p, i) => (filter(p, i) ? { ...p, overall: playerOverall(p) + delta } : p)),
  };
}

/** Variante con overall fisso per tutti */
export function flat(t: MatchTeamInput, id: string, overall: number): MatchTeamInput {
  return { id, name: id, players: t.players.map(p => ({ ...p, overall })) };
}

export function firstOfRole(t: MatchTeamInput, role: PlayerRole): (p: Player) => boolean {
  const target = t.players.find(p => p.role === role)!.id;
  return p => p.id === target;
}

// ----------------------------------------------------------------------------
// Statistica
// ----------------------------------------------------------------------------

/** Intervallo di Wilson per una proporzione (z=1.96 → 95%, 3.29 → 99.9%) */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}

export function meanSd(xs: number[]): { mean: number; sd: number; se: number } {
  const n = xs.length;
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const v = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1);
  return { mean, sd: Math.sqrt(v), se: Math.sqrt(v / n) };
}

/** Intervallo della media (z) */
export function meanCi(xs: number[], z = 1.96): [number, number] {
  const { mean, se } = meanSd(xs);
  return [mean - z * se, mean + z * se];
}

export const pct = (x: number, d = 1) => `${(100 * x).toFixed(d)}%`;
export const f2 = (x: number) => x.toFixed(2);
export const f3 = (x: number) => x.toFixed(3);

/** Tabella leggibile in console */
export function table(title: string, header: string[], rows: (string | number)[][]): string {
  const cells = [header, ...rows.map(r => r.map(String))];
  const w = header.map((_, i) => Math.max(...cells.map(r => (r[i] ?? '').length)));
  const line = (r: string[]) => r.map((c, i) => c.padEnd(w[i])).join('  ');
  return [`\n## ${title}`, line(header), w.map(x => '-'.repeat(x)).join('  '), ...cells.slice(1).map(line)].join('\n');
}

// ----------------------------------------------------------------------------
// Simulazione e metriche
// ----------------------------------------------------------------------------

export function seeds(scenario: string, n: number): number[] {
  return Array.from({ length: n }, (_, i) => hashSeed('audit', scenario, i));
}

/** Esito per la squadra A (che gioca sul lato aSide) */
export interface Outcome {
  r: MatchResult;
  aSide: MatchSide;
  gf: number;
  ga: number;
  /** Esito nei regolamentari: 1 vittoria, 0 pareggio, -1 sconfitta */
  reg: 1 | 0 | -1;
  /** A passa il turno (rigori inclusi) */
  won: boolean;
}

export function outcome(r: MatchResult, aSide: MatchSide): Outcome {
  const gf = aSide === 'home' ? r.homeScore : r.awayScore;
  const ga = aSide === 'home' ? r.awayScore : r.homeScore;
  const aId = aSide === 'home' ? r.homeTeamId : r.awayTeamId;
  return { r, aSide, gf, ga, reg: gf > ga ? 1 : gf < ga ? -1 : 0, won: r.winnerId === aId };
}

export type OptionsFor = (aSide: MatchSide, seed: number) => MatchOptions | undefined;

/**
 * Gioca A contro B su tutti i semi. sides='both' fa giocare ogni seme due
 * volte, A in casa e A fuori (annulla il vantaggio casalingo nelle medie).
 */
export function play(
  a: MatchTeamInput,
  b: MatchTeamInput,
  seedList: number[],
  opts: { sides?: 'home' | 'away' | 'both'; options?: OptionsFor; check?: boolean } = {}
): Outcome[] {
  const sides: MatchSide[] = opts.sides === 'both' ? SIDES : [opts.sides ?? 'home'];
  const out: Outcome[] = [];
  for (const seed of seedList) {
    for (const aSide of sides) {
      const [home, away] = aSide === 'home' ? [a, b] : [b, a];
      const r = simulateMatch({ home, away, seed, options: opts.options?.(aSide, seed) });
      if (opts.check !== false) assertInvariants(r);
      out.push(outcome(r, aSide));
    }
  }
  return out;
}

/** Piano tattico fisso dal primo minuto */
export function fixedPlan(t: Tactic): TacticChange[] {
  return [{ fromTick: 1, tactic: t }];
}

export interface Summary {
  n: number;
  win: number;
  draw: number;
  loss: number;
  /** Passaggio del turno (rigori inclusi) */
  adv: number;
  advCi: [number, number];
  gf: number;
  ga: number;
  gd: number;
  gdCi: [number, number];
  chancesFor: number;
  chancesAgainst: number;
  possession: number;
}

export function summarize(os: Outcome[]): Summary {
  const n = os.length;
  const k = (f: (o: Outcome) => boolean) => os.filter(f).length;
  const side = (o: Outcome) => o.aSide;
  const gd = os.map(o => o.gf - o.ga);
  const adv = k(o => o.won);
  return {
    n,
    win: k(o => o.reg === 1) / n,
    draw: k(o => o.reg === 0) / n,
    loss: k(o => o.reg === -1) / n,
    adv: adv / n,
    advCi: wilson(adv, n),
    gf: meanSd(os.map(o => o.gf)).mean,
    ga: meanSd(os.map(o => o.ga)).mean,
    gd: meanSd(gd).mean,
    gdCi: meanCi(gd),
    chancesFor: meanSd(os.map(o => o.r.stats[side(o)].chances)).mean,
    chancesAgainst: meanSd(os.map(o => o.r.stats[other(side(o))].chances)).mean,
    possession: meanSd(os.map(o => o.r.stats[side(o)].possession)).mean,
  };
}

export function summaryRow(label: string, s: Summary): (string | number)[] {
  return [
    label,
    s.n,
    pct(s.win),
    pct(s.draw),
    pct(s.loss),
    `${pct(s.adv)} [${pct(s.advCi[0])}-${pct(s.advCi[1])}]`,
    f2(s.gf),
    f2(s.ga),
    `${f2(s.gd)} [${f2(s.gdCi[0])},${f2(s.gdCi[1])}]`,
    f2(s.chancesFor),
    f2(s.chancesAgainst),
    s.possession.toFixed(1),
  ];
}

export const SUMMARY_HEADER = ['scenario', 'n', 'V', 'N', 'P', 'passa (IC95)', 'GF', 'GS', 'DR (IC95)', 'occ.F', 'occ.S', 'poss.'];

/** Punteggio di A nell'ultimo istante prima del tick dato */
export function scoreBefore(r: MatchResult, tick: number, aSide: MatchSide): number {
  let d = 0;
  for (const e of r.events) {
    if (e.tick >= tick) break;
    if (e.type === 'goal' || e.type === 'own_goal') d += e.side === aSide ? 1 : -1;
  }
  return d;
}

/**
 * Politica adattiva per A: decide ai tre punti di decisione in base a
 * (indice decisione, differenza reti). Ri-simula a ogni punto come la UI.
 */
export function playPolicy(
  a: MatchTeamInput,
  b: MatchTeamInput,
  seed: number,
  aSide: MatchSide,
  policy: (decisionIndex: number, goalDiff: number) => Tactic,
  bOptions?: TacticChange[]
): MatchResult {
  const [home, away] = aSide === 'home' ? [a, b] : [b, a];
  let plan: TacticChange[] = [];
  const opts = (): MatchOptions => ({ tactics: { [aSide]: plan, ...(bOptions ? { [other(aSide)]: bOptions } : {}) } });
  let r = simulateMatch({ home, away, seed, options: opts() });
  for (let i = 0; i < r.decisionTicks.length; i++) {
    const k = r.decisionTicks[i];
    plan = [...plan, { fromTick: k, tactic: policy(i, scoreBefore(r, k, aSide)) }];
    r = simulateMatch({ home, away, seed, options: opts() });
  }
  return r;
}

// ----------------------------------------------------------------------------
// Invarianti di una partita
// ----------------------------------------------------------------------------

/** Lato a cui appartiene il giocatore indicato da un campo dell'evento */
function ownerSide(e: MatchEvent, field: 'playerId' | 'relatedPlayerId'): MatchSide {
  if (field === 'playerId') return e.type === 'own_goal' ? other(e.side) : e.side;
  // relatedPlayerId: portiere/difensore avversario o compagno
  if (e.type === 'assist' || e.type === 'penalty') return e.side;
  return other(e.side);
}

export class InvariantError extends Error {}

/** Contatore delle differenze di possesso (±1) tra statistiche del motore e riproduzione */
export const possessionMismatches = { count: 0, checked: 0 };

function fail(r: MatchResult, msg: string): never {
  throw new InvariantError(`seme ${r.seed} ${r.homeTeamId}-${r.awayTeamId}: ${msg}`);
}

export function assertInvariants(r: MatchResult): void {
  const last = lastTick(r);
  if (r.ticks.length === 0 || r.ticks[0].index !== 0) fail(r, 'tick 0 mancante');
  r.ticks.forEach((t, i) => {
    if (t.index !== i) fail(r, `indice tick ${t.index} != ${i}`);
    if (!(t.homeControl >= 0.2 - 1e-9 && t.homeControl <= 0.8 + 1e-9)) fail(r, `controllo fuori scala ${t.homeControl}`);
    if (t.energy.home < 0 || t.energy.away < 0 || t.energy.home > 100 || t.energy.away > 100) fail(r, 'energia fuori scala');
    if (!Number.isFinite(t.ball) || Math.abs(t.ball) > 1) fail(r, 'pallone fuori scala');
  });
  // Minuti monotoni nei regolamentari
  for (let i = 2; i <= r.fullTimeTick; i++) {
    const a = r.ticks[i - 1];
    const b = r.ticks[i];
    if (b.minute * 100 + b.extra <= a.minute * 100 + a.extra && b.period === a.period) fail(r, `minuti non crescenti al tick ${i}`);
  }
  const dt = r.decisionTicks;
  if (dt.length !== 3 || new Set(dt).size !== 3 || !(dt[0] < dt[1] && dt[1] < dt[2] && dt[2] <= r.fullTimeTick)) fail(r, 'tick di decisione');

  const score = { home: 0, away: 0 };
  const sentOff = new Map<string, number>(); // side:id -> indice evento
  const yellows = new Map<string, number>();
  const injured = new Set<string>();
  let prevTick = 0;
  r.events.forEach((e, idx) => {
    if (e.tick < prevTick) fail(r, `evento ${idx} fuori ordine`);
    prevTick = e.tick;
    if (e.tick < 1 || e.tick > last) fail(r, `evento ${idx} fuori dalla partita (tick ${e.tick})`);
    const tk = r.ticks[e.tick];
    if (e.minute !== tk.minute || e.extra !== tk.extra) fail(r, `minuto evento ${idx} incoerente`);
    if (e.type !== 'shootout_kick' && e.type !== 'full_time' && e.type !== 'shootout_start' && e.tick > r.fullTimeTick) {
      fail(r, `evento ${e.type} dopo i 90'`);
    }
    for (const field of ['playerId', 'relatedPlayerId'] as const) {
      const id = e[field];
      if (!id) continue;
      const side = ownerSide(e, field);
      if (!r.lineups[side].some(p => p.playerId === id)) fail(r, `${e.type}.${field} ${id} non è nella formazione ${side}`);
      if (sentOff.has(`${side}:${id}`)) fail(r, `${e.type} di un espulso (${id}) all'evento ${idx}`);
    }
    if (e.type === 'goal' || e.type === 'own_goal') {
      score[e.side]++;
      if (!e.score || e.score.home !== score.home || e.score.away !== score.away) fail(r, 'punteggio dell\'evento incoerente');
    }
    if (e.type === 'assist') {
      const g = r.events[idx - 1];
      if (!g || g.type !== 'goal' || g.side !== e.side || g.playerId !== e.relatedPlayerId || e.playerId === e.relatedPlayerId) {
        fail(r, 'assist non collegato al gol');
      }
    }
    if (e.type === 'yellow_card') {
      const key = `${e.side}:${e.playerId}`;
      yellows.set(key, (yellows.get(key) ?? 0) + 1);
      if (yellows.get(key)! > 1) fail(r, 'due gialli senza rosso');
    }
    if (e.type === 'red_card') {
      const key = `${e.side}:${e.playerId}`;
      if (e.secondYellow && yellows.get(key) !== 1) fail(r, 'secondo giallo senza primo');
      sentOff.set(key, idx);
    }
    if (e.type === 'injury') {
      const key = `${e.side}:${e.playerId}`;
      if (injured.has(key)) fail(r, 'doppio infortunio');
      injured.add(key);
    }
  });
  if (score.home !== r.homeScore || score.away !== r.awayScore) fail(r, 'risultato finale diverso dagli eventi');
  const fin = r.events[r.events.length - 1];
  if (!fin || fin.type !== 'full_time') fail(r, 'manca il fischio finale');

  // Rigori finali: mai all'andata; al ritorno contano i gol complessivi
  const kicks = r.events.filter(e => e.type === 'shootout_kick');
  const tied = r.aggregate ? r.aggregate.home === r.aggregate.away : r.homeScore === r.awayScore;
  const expectsShootout = r.leg === 1 ? false : tied;
  if (expectsShootout !== !!r.shootout) fail(r, 'rigori incoerenti col pareggio');
  if (r.shootout) {
    const so = { home: 0, away: 0 };
    const taken = { home: 0, away: 0 };
    kicks.forEach((k, i) => {
      if (k.side !== (i % 2 === 0 ? 'home' : 'away')) fail(r, 'alternanza dei rigori');
      if (k.scored) so[k.side]++;
      taken[k.side]++;
      if (k.score?.home !== so.home || k.score?.away !== so.away) fail(r, 'punteggio dei rigori');
      // Nessun rigore dopo che la serie era già decisa
      const remaining = (s: MatchSide) => Math.max(0, 5 - taken[s]);
      const decided =
        taken.home <= 5 && taken.away <= 5 && !(taken.home === 5 && taken.away === 5)
          ? so.home + remaining('home') < so.away || so.away + remaining('away') < so.home
          : taken.home === taken.away && so.home !== so.away;
      if (decided && i < kicks.length - 1) fail(r, `rigori proseguiti a serie decisa (calcio ${i})`);
    });
    if (so.home !== r.shootout.home || so.away !== r.shootout.away || so.home === so.away) fail(r, 'esito dei rigori');
  } else if (kicks.length) fail(r, 'calci di rigore senza lotteria');
  const dec = r.aggregate ?? { home: r.homeScore, away: r.awayScore };
  const winnerSide: MatchSide | null = r.shootout
    ? r.shootout.home > r.shootout.away ? 'home' : 'away'
    : dec.home === dec.away ? null : dec.home > dec.away ? 'home' : 'away';
  if (r.winnerId !== (winnerSide === null ? null : winnerSide === 'home' ? r.homeTeamId : r.awayTeamId)) fail(r, 'vincitore');

  // Statistiche del motore = statistiche ricostruite dalla riproduzione
  const pb = getPlaybackState(r, last);
  possessionMismatches.checked++;
  for (const s of SIDES) {
    const a = r.stats[s];
    const b = pb.stats[s];
    if (a.possession !== b.possession) possessionMismatches.count++;
    if (Math.abs(a.possession - b.possession) > 1) fail(r, 'possesso motore≠riproduzione oltre l\'arrotondamento');
    if (a.shots !== b.shots || a.shotsOnTarget !== b.shotsOnTarget || a.yellowCards !== b.yellowCards || a.redCards !== b.redCards || a.bigChances !== b.bigChances) {
      fail(r, `statistiche ${s} motore≠riproduzione ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    }
    if (a.shotsOnTarget > a.shots) fail(r, 'tiri in porta > tiri');
  }
  // Pagelle
  if (r.playerPerformances.length !== r.lineups.home.length + r.lineups.away.length) fail(r, 'pagelle mancanti');
  for (const p of r.playerPerformances) {
    if (![p.rating, p.bonus, p.fantasyScore].every(Number.isFinite)) fail(r, `pagella non finita ${p.playerId}`);
    if (p.rating < 4 || p.rating > 9) fail(r, `voto fuori scala ${p.rating}`);
    if (p.redCards > 0 && p.rating > 5) fail(r, 'espulso con voto > 5');
  }
  for (const s of SIDES) {
    const own = r.events.filter(e => e.type === 'own_goal' && e.side === s).length;
    const goals = r.playerPerformances.filter(p => p.side === s).reduce((t, p) => t + p.goals, 0);
    if (goals + own !== (s === 'home' ? r.homeScore : r.awayScore)) fail(r, 'gol individuali ≠ punteggio');
    const ownBy = r.playerPerformances.filter(p => p.side === other(s)).reduce((t, p) => t + p.ownGoals, 0);
    if (ownBy !== own) fail(r, 'autogol attribuiti alla squadra sbagliata');
  }
}
