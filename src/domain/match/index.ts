/**
 * API pubblica del motore partita (nessuna dipendenza da React).
 */
export type * from './matchTypes';
export {
  HOME_ADVANTAGE,
  BASE_CHANCE_RATE,
  TACTIC_EFFECTS,
  buildSchedule,
  aiTactic,
  simulateMatch,
} from './matchEngine';
export type { MatchSchedule, SimulateMatchInput } from './matchEngine';
export { shortName, formatMinute, formatTick, TACTIC_LABELS } from './matchEvents';
export { computePerformances, pickMvpAndWorst } from './matchRatings';
export type { PlaybackPhase, PlaybackState, LiveTeamStats } from './matchPlayback';
export {
  getPlaybackState,
  getPhase,
  lastTick,
  nextDecisionTick,
  withTacticChange,
  keyEvents,
} from './matchPlayback';
export {
  TICK_MS,
  HOLD_MS,
  KICK_SUSPENSE_MS,
  KICK_RESULT_MS,
  DECISIVE_EXTRA_MS,
  tickDurationMs,
  computeTimeline,
  nextStop,
} from './matchTimeline';
export type { TimelineInput, Timeline } from './matchTimeline';
