/**
 * API pubblica del dominio torneo (nessuna dipendenza da React).
 */
export type * from './tournamentTypes';
export {
  TOURNAMENT_SIZE,
  ROUNDS,
  ROUND_LABELS,
  ROUND_SHORT,
  createBracket,
  createFinalFourBracket,
  fillQuarterfinals,
  roundMatches,
  findMatch,
  currentRound,
  getMatchStatus,
  getTeamOutcome,
  involves,
  findUserMatch,
  isUserEliminated,
  userPath,
} from './bracket';
export { tournamentReducer } from './tournamentReducer';
export { buildGroupStage, currentGroupMatchday, groupMatchday, computeStandings } from './groups';
export {
  TOURNAMENT_NAME,
  monogram,
  toTournamentTeam,
  toMatchTeam,
  createTournament,
  drawOrder,
  findCompetitionMatch,
  currentStageMatches,
  simulateCompetitionMatch,
  simulateBracketMatch,
  simulateStage,
  simulateRound,
  simulateRemaining,
  randomTournamentSeed,
} from './tournamentEngine';
export type { CreateTournamentInput, CompetitionMatch } from './tournamentEngine';
export type { Placement, SummaryMatch, TournamentSummary } from './tournamentSummary';
export { PLACEMENT_LABELS, buildTournamentSummary, shareText } from './tournamentSummary';
