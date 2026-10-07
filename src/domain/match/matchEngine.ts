import { Player, PlayerRole } from '../../types';
import { createRng, hashSeed, pickWeighted, Rng } from '../../services/auction/rng';
import { playerOverall } from '../../services/auction/teamStrength';
import {
  computeSynergy,
  departmentStrength,
  formFromUniforms,
  INJURY_FACTOR,
  playerQuality,
  weightedRating,
} from '../teams/teamStrength';
import { shortName, text } from './matchEvents';
import { computePerformances, pickMvpAndWorst } from './matchRatings';
import { computeBallPath } from './matchBall';
import {
  ChanceKind,
  LineupPlayer,
  MatchEvent,
  MatchEventType,
  MatchOptions,
  MatchResult,
  MatchSide,
  MatchTeamInput,
  MatchTick,
  ShootoutResult,
  Tactic,
  TacticChange,
  TeamMatchStats,
  TeamProfile,
} from './matchTypes';

/**
 * ============================================================================
 * MOTORE PARTITA — puro e deterministico
 * ============================================================================
 *
 * simulateMatch(home, away, seed, options) genera l'intera partita PRIMA
 * che la UI la riproduca: stessa coppia di squadre + stesso seme + stesso
 * piano tattico = stesso MatchResult.
 *
 * Ogni minuto (tick) usa un Rng derivato da hashSeed(seed, 'tick', i):
 * cambiare tattica al tick k lascia identici tutti gli eventi prima di k,
 * così la partita interattiva può essere ri-simulata dal punto di
 * decisione senza riscrivere il passato.
 *
 * Pipeline di ogni tick:
 *   reparti (forma, sinergia, espulsioni) -> controllo del gioco
 *   -> possesso -> occasione? -> tipo e qualità -> tiro -> parata/gol
 *   + eventi rari (cartellini, infortuni) + momentum.
 */

/** Vantaggio casalingo sul controllo del gioco (molto contenuto) */
export const HOME_ADVANTAGE = 0.004;
/** Probabilità base di occasione per tick per la squadra in possesso */
export const BASE_CHANCE_RATE = 0.125;
/** Qualità base per tipo di occasione (prima di attaccante/difesa/portiere) */
export const CHANCE_QUALITY: Record<ChanceKind, number> = {
  normale: 0.16,
  contropiede: 0.28,
  grande: 0.42,
};
/** Probabilità che un'occasione diventi rigore / autogol */
export const PENALTY_RATE = 0.05;
export const OWN_GOAL_RATE = 0.012;
/** Probabilità che un gol abbia un assist */
export const ASSIST_RATE = 0.72;
/** Eventi rari per squadra per tick */
export const YELLOW_RATE = 0.0095;
export const STRAIGHT_RED_RATE = 0.0006;
export const INJURY_RATE = 0.0012;
/** Decadimento del momentum per tick */
export const MOMENTUM_DECAY = 0.9;
/** Malus di controllo per ogni espulso */
export const RED_CARD_CONTROL = 0.07;

/** Effetti degli atteggiamenti tattici (leggeri ma percepibili) */
export const TACTIC_EFFECTS: Record<
  Tactic,
  { chance: number; concede: number; control: number; energyDrain: number; cards: number }
> = {
  attacca: { chance: 1.22, concede: 1.18, control: 0.03, energyDrain: 0.55, cards: 1 },
  equilibrata: { chance: 1, concede: 1, control: 0, energyDrain: 0.33, cards: 1 },
  difendi: { chance: 0.75, concede: 0.78, control: -0.03, energyDrain: 0.2, cards: 1.15 },
};

/** Peso del ruolo nella scelta del tiratore e dell'assistman */
const SHOOTER_ROLE_WEIGHT: Record<PlayerRole, number> = { P: 0, D: 0.18, C: 0.45, A: 1 };
const ASSIST_ROLE_WEIGHT: Record<PlayerRole, number> = { P: 0.05, D: 0.5, C: 1, A: 0.8 };
const ROLE_ORDER: PlayerRole[] = ['P', 'D', 'C', 'A'];

// ----------------------------------------------------------------------------
// Calendario dei tick
// ----------------------------------------------------------------------------

/** Struttura temporale della partita: tick 0 = calcio d'inizio */
export interface MatchSchedule {
  ticks: Pick<MatchTick, 'index' | 'period' | 'minute' | 'extra'>[];
  halfTimeTick: number;
  fullTimeTick: number;
  decisionTicks: number[];
}

/** Recuperi 1-3' e 2-5', poi i tre punti di decisione: 1', 46', 75' */
export function buildSchedule(seed: number): MatchSchedule {
  const rng = createRng(hashSeed(seed, 'stoppage'));
  const extra1 = 1 + Math.floor(rng() * 3);
  const extra2 = 2 + Math.floor(rng() * 4);
  const ticks: MatchSchedule['ticks'] = [{ index: 0, period: 1, minute: 0, extra: 0 }];
  const push = (period: 1 | 2, minute: number, extra: number) =>
    ticks.push({ index: ticks.length, period, minute, extra });
  for (let m = 1; m <= 45; m++) push(1, m, 0);
  for (let e = 1; e <= extra1; e++) push(1, 45, e);
  const halfTimeTick = ticks.length - 1;
  for (let m = 46; m <= 90; m++) push(2, m, 0);
  for (let e = 1; e <= extra2; e++) push(2, 90, e);
  const fullTimeTick = ticks.length - 1;
  const tick75 = ticks.findIndex(t => t.period === 2 && t.minute === 75 && t.extra === 0);
  return { ticks, halfTimeTick, fullTimeTick, decisionTicks: [1, halfTimeTick + 1, tick75] };
}

// ----------------------------------------------------------------------------
// Stato interno
// ----------------------------------------------------------------------------

interface LivePlayer {
  lineup: LineupPlayer;
  player: Player;
  quality: number;
  active: boolean;
  injured: boolean;
  yellow: number;
}

interface SideState {
  side: MatchSide;
  id: string;
  name: string;
  players: LivePlayer[];
  synergy: number;
  chemistryClub: string | null;
  chemistryCount: number;
  plan: TacticChange[] | null;
  tactic: Tactic;
  energy: number;
  goals: number;
  reds: number;
  possessionSum: number;
  stats: Omit<TeamMatchStats, 'possession'>;
}

interface Depts {
  gk: number;
  def: number;
  mid: number;
  att: number;
}

function depts(s: SideState): Depts {
  const sp = s.players.map(p => ({
    role: p.player.role,
    quality: p.quality,
    active: p.active,
    injured: p.injured,
  }));
  return {
    gk: departmentStrength(sp, 'P') * s.synergy,
    def: departmentStrength(sp, 'D') * s.synergy,
    mid: departmentStrength(sp, 'C') * s.synergy,
    att: departmentStrength(sp, 'A') * s.synergy,
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function buildSide(team: MatchTeamInput, side: MatchSide, seed: number, plan: TacticChange[] | null): SideState {
  const players = [...team.players]
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
    .map(player => {
      const r = createRng(hashSeed(seed, 'form', player.id));
      const form = formFromUniforms(r(), r());
      const lineup: LineupPlayer = {
        playerId: player.id,
        name: player.name,
        role: player.role,
        club: player.team,
        overall: playerOverall(player),
        form,
      };
      return { lineup, player, quality: playerQuality(player, form), active: true, injured: false, yellow: 0 };
    });
  const syn = computeSynergy(players.map(p => ({ role: p.player.role, quality: p.quality, club: p.player.team })));
  return {
    side,
    id: team.id,
    name: team.name,
    players,
    synergy: syn.synergy,
    chemistryClub: syn.chemistryClub,
    chemistryCount: syn.chemistryCount,
    plan,
    tactic: 'equilibrata',
    energy: 100,
    goals: 0,
    reds: 0,
    possessionSum: 0,
    stats: { chances: 0, bigChances: 0, shots: 0, shotsOnTarget: 0, yellowCards: 0, redCards: 0 },
  };
}

function profileOf(s: SideState): TeamProfile {
  const d = depts(s);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    rating: weightedRating(d),
    gk: r2(d.gk),
    def: r2(d.def),
    mid: r2(d.mid),
    att: r2(d.att),
    synergy: s.synergy,
    chemistryClub: s.chemistryClub,
    chemistryCount: s.chemistryCount,
  };
}

/** Tattica dal piano: ultimo cambio con fromTick <= tick */
function planTactic(plan: TacticChange[], tick: number): Tactic {
  let tactic: Tactic = 'equilibrata';
  for (const c of plan) if (c.fromTick <= tick) tactic = c.tactic;
  return tactic;
}

/** IA dei bot: decide solo ai punti di decisione, in base al punteggio */
export function aiTactic(decisionIndex: number, goalDiff: number, ratingDiff: number): Tactic {
  if (decisionIndex === 0) return 'equilibrata';
  if (decisionIndex === 1) {
    if (goalDiff < 0) return 'attacca';
    if (goalDiff >= 2) return 'difendi';
    return 'equilibrata';
  }
  if (goalDiff < 0) return 'attacca';
  if (goalDiff > 0) return 'difendi';
  return ratingDiff >= 3 ? 'attacca' : 'equilibrata';
}

// ----------------------------------------------------------------------------
// Simulazione
// ----------------------------------------------------------------------------

export interface SimulateMatchInput {
  home: MatchTeamInput;
  away: MatchTeamInput;
  seed: number;
  options?: MatchOptions;
}

export function simulateMatch({ home, away, seed, options = {} }: SimulateMatchInput): MatchResult {
  const schedule = buildSchedule(seed);
  const sides: Record<MatchSide, SideState> = {
    home: buildSide(home, 'home', seed, options.tactics?.home ?? null),
    away: buildSide(away, 'away', seed, options.tactics?.away ?? null),
  };
  const profiles = { home: profileOf(sides.home), away: profileOf(sides.away) };
  const homeAdvantage = options.homeAdvantage ?? HOME_ADVANTAGE;
  const events: MatchEvent[] = [];
  const ticks: MatchTick[] = [];
  let momentum = 0;

  const opp = (s: MatchSide): MatchSide => (s === 'home' ? 'away' : 'home');
  const sgn = (s: MatchSide) => (s === 'home' ? 1 : -1);
  const score = () => ({ home: sides.home.goals, away: sides.away.goals });
  const nm = (p: LivePlayer) => shortName(p.player.name);
  const active = (s: SideState) => s.players.filter(p => p.active);
  const keeper = (s: SideState) => s.players.find(p => p.player.role === 'P' && p.active) ?? null;

  let tickInfo = schedule.ticks[0];
  const emit = (
    type: MatchEventType,
    side: MatchSide,
    description: string,
    impact: number,
    extra: Partial<MatchEvent> = {}
  ) => {
    events.push({
      id: `${tickInfo.index}-${events.length}`,
      tick: tickInfo.index,
      minute: tickInfo.minute,
      extra: tickInfo.extra,
      type,
      teamId: sides[side].id,
      side,
      impact,
      description,
      ...extra,
    });
  };

  const snapshot = (homeControl: number) => {
    ticks.push({
      ...tickInfo,
      ball: 0,
      pressure: Math.round(clamp(1.2 * (homeControl - 0.5) + 0.7 * momentum, -1, 1) * 1000) / 1000,
      homeControl: Math.round(homeControl * 1000) / 1000,
      energy: { home: Math.round(sides.home.energy), away: Math.round(sides.away.energy) },
      tactic: { home: sides.home.tactic, away: sides.away.tactic },
    });
  };

  const pickShooter = (s: SideState, rng: Rng): LivePlayer => {
    const cands = active(s).filter(p => p.player.role !== 'P');
    const pool = cands.length ? cands : active(s);
    return pickWeighted(
      pool,
      pool.map(p => SHOOTER_ROLE_WEIGHT[p.player.role] * (0.15 + p.player.goalProbability) * (0.5 + p.quality) + 0.001),
      rng
    );
  };

  const scoreGoal = (
    att: SideState,
    rng: Rng,
    scorer: LivePlayer,
    kind: ChanceKind | 'rigore',
    gkError = false
  ) => {
    att.goals++;
    att.stats.shotsOnTarget++;
    emit('goal', att.side, text.goal(rng, nm(scorer), kind, gkError), 3, {
      playerId: scorer.player.id,
      isPenalty: kind === 'rigore',
      chanceKind: kind === 'rigore' ? undefined : kind,
      score: score(),
    });
    if (kind !== 'rigore' && rng() < ASSIST_RATE) {
      const mates = active(att).filter(p => p !== scorer);
      if (mates.length) {
        const passer = pickWeighted(
          mates,
          mates.map(p => ASSIST_ROLE_WEIGHT[p.player.role] * (0.08 + p.player.assistProbability) * (0.5 + p.quality)),
          rng
        );
        emit('assist', att.side, text.assist(nm(passer), nm(scorer)), 2, {
          playerId: passer.player.id,
          relatedPlayerId: scorer.player.id,
        });
      }
    }
    momentum = clamp(momentum + sgn(att.side) * 0.3, -1, 1);
  };

  const resolveChance = (att: SideState, def: SideState, d: Record<MatchSide, Depts>, rng: Rng) => {
    att.stats.chances++;
    const roll = rng();
    const gk = keeper(def);

    if (roll < PENALTY_RATE) {
      const fouled = pickShooter(att, rng);
      const takers = active(att).filter(p => p.player.role !== 'P').sort((a, b) => b.quality - a.quality);
      const taker = takers.find(p => p.player.role === 'A') ?? takers[0] ?? fouled;
      emit('penalty', att.side, text.penalty(att.name, nm(fouled)), 2, {
        playerId: taker.player.id,
        relatedPlayerId: fouled.player.id,
      });
      att.stats.shots++;
      const gkPen = gk ? gk.player.penaltySaveProbability ?? 0.2 : 0.05;
      const pScore = clamp(0.84 - 0.45 * gkPen + 0.05 * (taker.quality - 0.5), 0.55, 0.9);
      if (rng() < pScore) {
        scoreGoal(att, rng, taker, 'rigore');
      } else {
        const saved = !!gk && rng() < 0.75;
        if (saved) att.stats.shotsOnTarget++;
        emit('penalty_missed', att.side, text.penaltyMissed(nm(taker), gk ? nm(gk) : '', saved), 2, {
          playerId: taker.player.id,
          relatedPlayerId: saved && gk ? gk.player.id : undefined,
        });
        momentum = clamp(momentum - sgn(att.side) * 0.15, -1, 1);
      }
      return;
    }

    if (roll < PENALTY_RATE + OWN_GOAL_RATE) {
      const defenders = active(def).filter(p => p.player.role === 'D' || p.player.role === 'C');
      if (defenders.length) {
        const unlucky = pickWeighted(defenders, defenders.map(p => (p.player.role === 'D' ? 1 : 0.4)), rng);
        att.goals++;
        emit('own_goal', att.side, text.ownGoal(nm(unlucky)), 3, {
          playerId: unlucky.player.id,
          score: score(),
        });
        momentum = clamp(momentum + sgn(att.side) * 0.25, -1, 1);
        return;
      }
    }

    const kindRoll = rng();
    const counterRate = 0.12 * (def.tactic === 'attacca' ? 1.6 : 1);
    const kind: ChanceKind = kindRoll < 0.18 ? 'grande' : kindRoll < 0.18 + counterRate ? 'contropiede' : 'normale';
    const shooter = pickShooter(att, rng);
    const energyFactor = 0.85 + 0.15 * (att.energy / 100);
    const shooterQ = shooter.quality * (shooter.injured ? INJURY_FACTOR : 1);
    const quality =
      CHANCE_QUALITY[kind] * (0.85 + 0.25 * shooterQ) * (1.1 - 0.18 * d[def.side].def) * energyFactor;

    if (kind !== 'normale') {
      emit('chance', att.side, text.chance(rng, kind, att.name, nm(shooter)), 1, {
        playerId: shooter.player.id,
        chanceKind: kind,
      });
    }
    if (kind === 'grande') att.stats.bigChances++;
    att.stats.shots++;
    momentum = clamp(momentum + sgn(att.side) * (kind === 'normale' ? 0.1 : 0.15), -1, 1);

    const pGoal = clamp(quality * (1.2 - 0.35 * d[def.side].gk), 0.02, 0.85);
    if (rng() < pGoal) {
      scoreGoal(att, rng, shooter, kind, !!gk && rng() < 0.06);
      return;
    }
    const r = rng();
    if (r < 0.08) {
      emit('woodwork', att.side, text.woodwork(rng, nm(shooter)), 2, { playerId: shooter.player.id, chanceKind: kind });
    } else if (gk && r < 0.5 + 0.15 * d[def.side].gk) {
      att.stats.shotsOnTarget++;
      emit('save', att.side, text.save(rng, nm(gk), nm(shooter)), kind === 'normale' ? 1 : 2, {
        playerId: shooter.player.id,
        relatedPlayerId: gk.player.id,
        chanceKind: kind,
      });
    } else {
      const blockers = active(def).filter(p => p.player.role === 'D');
      const blocker = blockers.length && rng() < 0.4 ? blockers[Math.floor(rng() * blockers.length)] : null;
      emit('miss', att.side, text.miss(rng, nm(shooter), blocker ? nm(blocker) : null), 0, {
        playerId: shooter.player.id,
        relatedPlayerId: blocker?.player.id,
        chanceKind: kind,
      });
    }
  };

  const rareEvents = (s: SideState, rng: Rng) => {
    const losing = s.goals < sides[opp(s.side)].goals;
    if (rng() < YELLOW_RATE * TACTIC_EFFECTS[s.tactic].cards * (losing ? 1.15 : 1)) {
      const cands = active(s);
      const p = pickWeighted(cands, cands.map(c => 0.03 + c.player.yellowCardProbability), rng);
      if (p.yellow >= 1) {
        p.active = false;
        s.reds++;
        s.stats.redCards++;
        emit('red_card', s.side, text.red(nm(p), true), 3, { playerId: p.player.id, secondYellow: true });
        momentum = clamp(momentum - sgn(s.side) * 0.2, -1, 1);
      } else {
        p.yellow++;
        s.stats.yellowCards++;
        emit('yellow_card', s.side, text.yellow(nm(p)), 1, { playerId: p.player.id });
      }
    }
    if (rng() < STRAIGHT_RED_RATE) {
      const cands = active(s);
      if (cands.length > 5) {
        const p = pickWeighted(cands, cands.map(c => 0.01 + c.player.redCardProbability), rng);
        p.active = false;
        s.reds++;
        s.stats.redCards++;
        emit('red_card', s.side, text.red(nm(p), false), 3, { playerId: p.player.id });
        momentum = clamp(momentum - sgn(s.side) * 0.2, -1, 1);
      }
    }
    if (rng() < INJURY_RATE) {
      const cands = active(s).filter(p => !p.injured);
      if (cands.length) {
        const p = cands[Math.floor(rng() * cands.length)];
        p.injured = true;
        emit('injury', s.side, text.injury(nm(p)), 1, { playerId: p.player.id });
      }
    }
  };

  const applyTactics = (t: number) => {
    const decisionIndex = schedule.decisionTicks.indexOf(t);
    for (const side of ['home', 'away'] as MatchSide[]) {
      const s = sides[side];
      const o = sides[opp(side)];
      let next = s.tactic;
      if (s.plan) next = planTactic(s.plan, t);
      else if (decisionIndex >= 0) {
        next = aiTactic(decisionIndex, s.goals - o.goals, profiles[side].rating - profiles[opp(side)].rating);
      }
      if (next !== s.tactic) {
        s.tactic = next;
        emit('tactic', side, text.tactic(s.name, next), 1, { tactic: next });
      }
    }
  };

  // Tick 0: calcio d'inizio
  snapshot(0.5);

  for (let t = 1; t <= schedule.fullTimeTick; t++) {
    tickInfo = schedule.ticks[t];
    const rng = createRng(hashSeed(seed, 'tick', t));
    if (t === 1) emit('kickoff', 'home', "Calcio d'inizio!", 0);
    applyTactics(t);

    for (const s of [sides.home, sides.away]) {
      s.energy = Math.max(0, s.energy - TACTIC_EFFECTS[s.tactic].energyDrain);
    }
    const d = { home: depts(sides.home), away: depts(sides.away) };
    const homeControl = clamp(
      0.5 +
        0.32 * (d.home.mid - d.away.mid) +
        0.05 * (d.home.att + d.home.def - d.away.att - d.away.def) +
        homeAdvantage +
        0.12 * momentum +
        TACTIC_EFFECTS[sides.home.tactic].control -
        TACTIC_EFFECTS[sides.away.tactic].control -
        RED_CARD_CONTROL * (sides.home.reds - sides.away.reds),
      0.2,
      0.8
    );
    sides.home.possessionSum += homeControl;
    sides.away.possessionSum += 1 - homeControl;
    momentum *= MOMENTUM_DECAY;

    const attSide: MatchSide = rng() < homeControl ? 'home' : 'away';
    const att = sides[attSide];
    const def = sides[opp(attSide)];
    const creation = 0.6 * d[attSide].att + 0.4 * d[attSide].mid;
    const energyFactor = 0.85 + 0.15 * (att.energy / 100);
    const pChance =
      BASE_CHANCE_RATE *
      clamp(1 + 0.55 * (creation - d[def.side].def), 0.6, 1.45) *
      TACTIC_EFFECTS[att.tactic].chance *
      TACTIC_EFFECTS[def.tactic].concede *
      energyFactor;
    if (rng() < pChance) resolveChance(att, def, d, rng);

    rareEvents(sides.home, rng);
    rareEvents(sides.away, rng);

    if (t === schedule.halfTimeTick) {
      const sc = score();
      emit('half_time', 'home', `Fine primo tempo: ${home.name} ${sc.home} - ${sc.away} ${away.name}.`, 2);
    }
    snapshot(homeControl);
  }

  // Lotteria dei rigori in caso di parità
  let shootout: ShootoutResult | null = null;
  let shootoutOrder: Record<MatchSide, string[]> | null = null;
  const fullTime = score();
  if (fullTime.home === fullTime.away) {
    emit('shootout_start', 'home', `Fine dei tempi regolamentari: ${fullTime.home} - ${fullTime.away}. Si va ai rigori!`, 2);
    shootout = runShootout();
  }
  const winnerSide: MatchSide = shootout
    ? shootout.home > shootout.away ? 'home' : 'away'
    : fullTime.home > fullTime.away ? 'home' : 'away';
  const winnerName = sides[winnerSide].name;
  emit(
    'full_time',
    winnerSide,
    shootout
      ? `Fischio finale. ${winnerName} vince ai rigori ${Math.max(shootout.home, shootout.away)} - ${Math.min(shootout.home, shootout.away)}.`
      : `Fischio finale: ${home.name} ${fullTime.home} - ${fullTime.away} ${away.name}.`,
    3
  );

  function runShootout(): ShootoutResult {
    const rng = createRng(hashSeed(seed, 'shootout'));
    const result = { home: 0, away: 0 };
    const kickers = (s: SideState, side: MatchSide) => {
      const outfield = active(s).filter(p => p.player.role !== 'P').sort((a, b) => b.quality - a.quality);
      const gk = keeper(s);
      const auto = gk ? [...outfield, gk] : outfield;
      // Ordine scelto: i giocatori non elencati restano in coda nell'ordine automatico
      const chosen = options.shootoutOrder?.[side];
      if (!chosen) return auto;
      const rank = (id: string) => {
        const i = chosen.indexOf(id);
        return i < 0 ? chosen.length : i;
      };
      return auto.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p.player.id) - rank(b.p.player.id) || a.i - b.i).map(x => x.p);
    };
    const order = { home: kickers(sides.home, 'home'), away: kickers(sides.away, 'away') };
    shootoutOrder = { home: order.home.map(p => p.player.id), away: order.away.map(p => p.player.id) };
    const taken = { home: 0, away: 0 };
    const last = schedule.ticks[schedule.fullTimeTick];
    let round = 0;
    const decided = () => {
      if (round < 5) {
        const leftHome = 5 - taken.home;
        const leftAway = 5 - taken.away;
        return result.home + leftHome < result.away || result.away + leftAway < result.home;
      }
      return taken.home === taken.away && result.home !== result.away;
    };
    while (!decided()) {
      for (const side of ['home', 'away'] as MatchSide[]) {
        if (decided()) break;
        const kicker = order[side][taken[side] % order[side].length];
        const gk = keeper(sides[opp(side)]);
        const gkPen = gk ? gk.player.penaltySaveProbability ?? 0.2 : 0.05;
        // In caso di serie infinita (oltre 30 rigori a testa) decide la monetina
        const p = round >= 30 ? (side === 'home' ? 1 : 0) : clamp(0.8 - 0.4 * gkPen + 0.08 * (kicker.quality - 0.5), 0.5, 0.92);
        const scored = rng() < p;
        if (scored) result[side]++;
        taken[side]++;
        tickInfo = { index: ticks.length, period: 2, minute: last.minute, extra: last.extra };
        emit('shootout_kick', side, text.shootoutKick(nm(kicker), scored), 2, {
          playerId: kicker.player.id,
          relatedPlayerId: gk?.player.id,
          scored,
          score: { ...result },
        });
        ticks.push({ ...ticks[ticks.length - 1], index: ticks.length });
      }
      if (taken.home === taken.away) round++;
    }
    return result;
  }

  // Traiettoria del pallone per l'indicatore d'attacco (solo presentazione)
  const ballPath = computeBallPath({
    seed,
    ticks,
    events,
    halfTimeTick: schedule.halfTimeTick,
    fullTimeTick: schedule.fullTimeTick,
  });
  ballPath.forEach((ball, i) => {
    ticks[i].ball = ball;
  });

  const teamIds = { home: home.id, away: away.id };
  const lineups = { home: sides.home.players.map(p => p.lineup), away: sides.away.players.map(p => p.lineup) };
  const playerPerformances = computePerformances({ teamIds, lineups, events, finished: true });
  const { mvpId, worstId } = pickMvpAndWorst(playerPerformances, lineups);
  const playedTicks = schedule.fullTimeTick;
  const stats = {
    home: { ...sides.home.stats, possession: Math.round((100 * sides.home.possessionSum) / playedTicks) },
    away: { ...sides.away.stats, possession: 100 - Math.round((100 * sides.home.possessionSum) / playedTicks) },
  };
  const teamPerformance = {
    home: playerPerformances.filter(p => p.side === 'home').reduce((s, p) => s + p.fantasyScore, 0),
    away: playerPerformances.filter(p => p.side === 'away').reduce((s, p) => s + p.fantasyScore, 0),
  };

  return {
    seed,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeName: home.name,
    awayName: away.name,
    homeScore: fullTime.home,
    awayScore: fullTime.away,
    shootout,
    shootoutOrder,
    winnerId: sides[winnerSide].id,
    events,
    ticks,
    decisionTicks: schedule.decisionTicks,
    halfTimeTick: schedule.halfTimeTick,
    fullTimeTick: schedule.fullTimeTick,
    lineups,
    profiles,
    stats,
    teamPerformance,
    playerPerformances,
    mvpId,
    worstId,
  };
}
