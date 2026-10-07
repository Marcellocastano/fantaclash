import { formatTick } from './matchEvents';
import { computePerformances } from './matchRatings';
import {
  MatchEvent,
  MatchPlayerPerformance,
  MatchResult,
  MatchSide,
  MatchTick,
  Tactic,
  TacticChange,
} from './matchTypes';

/**
 * "MatchPlayer" puro: dato un MatchResult già simulato e un tick,
 * ricostruisce tutto ciò che la UI deve mostrare in quell'istante.
 * Nessun timer qui: la velocità di riproduzione la decide l'hook.
 */

export type PlaybackPhase = 'prepartita' | 'primo_tempo' | 'intervallo' | 'secondo_tempo' | 'rigori' | 'finale';

export interface LiveTeamStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  bigChances: number;
  yellowCards: number;
  redCards: number;
}

export interface PlaybackState {
  tick: MatchTick;
  clock: string;
  phase: PlaybackPhase;
  score: Record<MatchSide, number>;
  shootout: Record<MatchSide, number> | null;
  /** Eventi accaduti fino al tick (inclusi) */
  events: MatchEvent[];
  /** Eventi accaduti esattamente in questo tick */
  latest: MatchEvent[];
  performances: MatchPlayerPerformance[];
  stats: Record<MatchSide, LiveTeamStats>;
  sentOff: Set<string>;
  finished: boolean;
}

const SHOT_TYPES = new Set(['save', 'miss', 'woodwork', 'penalty_missed']);

export function lastTick(result: MatchResult): number {
  return result.ticks.length - 1;
}

export function getPhase(result: MatchResult, tick: number): PlaybackPhase {
  if (tick <= 0) return 'prepartita';
  if (tick >= lastTick(result)) return 'finale';
  if (tick > result.fullTimeTick) return 'rigori';
  if (tick === result.fullTimeTick && result.shootout) return 'rigori';
  if (tick === result.halfTimeTick) return 'intervallo';
  return tick < result.halfTimeTick ? 'primo_tempo' : 'secondo_tempo';
}

export function getPlaybackState(result: MatchResult, rawTick: number): PlaybackState {
  const t = Math.max(0, Math.min(rawTick, lastTick(result)));
  const tick = result.ticks[t];
  const events = result.events.filter(e => e.tick <= t);
  const latest = events.filter(e => e.tick === t);
  const score = { home: 0, away: 0 };
  let shootout: Record<MatchSide, number> | null = null;
  const sentOff = new Set<string>();
  const emptyStats = (): LiveTeamStats => ({
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    bigChances: 0,
    yellowCards: 0,
    redCards: 0,
  });
  const stats = { home: emptyStats(), away: emptyStats() };

  for (const e of events) {
    const s = stats[e.side];
    if (e.type === 'goal' || e.type === 'own_goal') {
      score[e.side]++;
      if (e.type === 'goal') {
        s.shots++;
        s.shotsOnTarget++;
      }
    } else if (SHOT_TYPES.has(e.type)) {
      s.shots++;
      if (e.type === 'save' || (e.type === 'penalty_missed' && e.relatedPlayerId)) s.shotsOnTarget++;
    } else if (e.type === 'shootout_kick' && e.score) {
      shootout = { ...e.score };
    } else if (e.type === 'yellow_card') {
      s.yellowCards++;
    } else if (e.type === 'red_card') {
      s.redCards++;
      if (e.playerId) sentOff.add(e.playerId);
    }
    if (e.type === 'chance' && e.chanceKind === 'grande') s.bigChances++;
  }

  const played = result.ticks.slice(1, Math.min(t, result.fullTimeTick) + 1);
  if (played.length) {
    const home = Math.round((100 * played.reduce((sum, k) => sum + k.homeControl, 0)) / played.length);
    stats.home.possession = home;
    stats.away.possession = 100 - home;
  }

  const finished = t >= lastTick(result);
  return {
    tick,
    clock: formatTick(tick),
    phase: getPhase(result, t),
    score,
    shootout,
    events,
    latest,
    performances: computePerformances({
      teamIds: { home: result.homeTeamId, away: result.awayTeamId },
      lineups: result.lineups,
      events,
      finished,
    }),
    stats,
    sentOff,
    finished,
  };
}

/** Prossimo punto di decisione strettamente dopo il tick dato (o null) */
export function nextDecisionTick(result: MatchResult, afterTick: number): number | null {
  return result.decisionTicks.find(d => d > afterTick) ?? null;
}

/** Aggiunge/sostituisce una scelta tattica dal tick dato in poi */
export function withTacticChange(plan: TacticChange[], fromTick: number, tactic: Tactic): TacticChange[] {
  return [...plan.filter(c => c.fromTick < fromTick), { fromTick, tactic }];
}

/** Eventi salienti per riepiloghi rapidi (gol, rigori sbagliati, espulsioni) */
export function keyEvents(result: MatchResult): MatchEvent[] {
  return result.events.filter(
    e => e.type === 'goal' || e.type === 'own_goal' || e.type === 'red_card' || e.type === 'penalty_missed'
  );
}
