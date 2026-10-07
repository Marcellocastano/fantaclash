import { FANTASY_BONUSES } from '../../types';
import { OVERALL_FLOOR, OVERALL_SPAN } from '../teams/teamStrength';
import { LineupPlayer, MatchEvent, MatchPlayerPerformance, MatchSide } from './matchTypes';

/**
 * Pagelle stile fantacalcio: voto (rendimento) + bonus/malus (eventi).
 * La stessa funzione serve per le pagelle finali e per quelle "live"
 * durante la riproduzione (basta passarle gli eventi fino al tick).
 */

export interface RatingsInput {
  teamIds: Record<MatchSide, string>;
  lineups: Record<MatchSide, LineupPlayer[]>;
  /** Eventi già accaduti (in ordine) */
  events: MatchEvent[];
  /** Se true la partita è finita: si assegna il bonus porta inviolata del portiere */
  finished: boolean;
}

const SIDES: MatchSide[] = ['home', 'away'];

function roundHalf(x: number): number {
  return Math.round(x * 2) / 2;
}

function emptyPerformance(p: LineupPlayer, side: MatchSide, teamId: string): MatchPlayerPerformance {
  return {
    playerId: p.playerId,
    teamId,
    side,
    name: p.name,
    role: p.role,
    rating: 6,
    bonus: 0,
    fantasyScore: 6,
    goals: 0,
    assists: 0,
    saves: 0,
    goalsConceded: 0,
    penaltiesSaved: 0,
    penaltiesMissed: 0,
    ownGoals: 0,
    yellowCards: 0,
    redCards: 0,
    injured: false,
    cleanSheet: false,
  };
}

export function computePerformances(input: RatingsInput): MatchPlayerPerformance[] {
  const { teamIds, lineups, events, finished } = input;
  // Chiave per lato: robusto anche se le due squadre condividono un giocatore (test)
  const perf = new Map<string, MatchPlayerPerformance>();
  for (const side of SIDES) {
    for (const p of lineups[side]) perf.set(`${side}:${p.playerId}`, emptyPerformance(p, side, teamIds[side]));
  }
  const keeperOf = (side: MatchSide) => lineups[side].find(p => p.role === 'P')?.playerId;
  const other = (side: MatchSide): MatchSide => (side === 'home' ? 'away' : 'home');
  const goalsAgainst: Record<MatchSide, number> = { home: 0, away: 0 };
  const get = (side: MatchSide, id?: string) => (id ? perf.get(`${side}:${id}`) : undefined);

  for (const e of events) {
    switch (e.type) {
      case 'goal': {
        const scorer = get(e.side, e.playerId);
        if (scorer) scorer.goals++;
        goalsAgainst[other(e.side)]++;
        const gk = get(other(e.side), keeperOf(other(e.side)));
        if (gk) gk.goalsConceded++;
        break;
      }
      case 'own_goal': {
        const p = get(other(e.side), e.playerId);
        if (p) p.ownGoals++;
        goalsAgainst[other(e.side)]++;
        const gk = get(other(e.side), keeperOf(other(e.side)));
        if (gk) gk.goalsConceded++;
        break;
      }
      case 'assist': {
        const p = get(e.side, e.playerId);
        if (p) p.assists++;
        break;
      }
      case 'save': {
        const gk = get(other(e.side), e.relatedPlayerId);
        if (gk) gk.saves++;
        break;
      }
      case 'penalty_missed': {
        const taker = get(e.side, e.playerId);
        if (taker) taker.penaltiesMissed++;
        const gk = get(other(e.side), e.relatedPlayerId);
        if (gk) gk.penaltiesSaved++;
        break;
      }
      case 'yellow_card': {
        const p = get(e.side, e.playerId);
        if (p) p.yellowCards++;
        break;
      }
      case 'red_card': {
        const p = get(e.side, e.playerId);
        if (p) p.redCards++;
        break;
      }
      case 'injury': {
        const p = get(e.side, e.playerId);
        if (p) p.injured = true;
        break;
      }
      default:
        break;
    }
  }

  // Punteggio corrente per l'aggiustamento del voto
  const score: Record<MatchSide, number> = { home: goalsAgainst.away, away: goalsAgainst.home };

  const result: MatchPlayerPerformance[] = [];
  for (const side of SIDES) {
    const diff = Math.sign(score[side] - score[other(side)]);
    for (const lp of lineups[side]) {
      const p = perf.get(`${side}:${lp.playerId}`) as MatchPlayerPerformance;
      const q = (lp.overall - OVERALL_FLOOR) / OVERALL_SPAN;
      const conceded = goalsAgainst[side];
      p.cleanSheet = finished && conceded === 0;

      let rating = 6 + (lp.form - 1) * 5 + 0.6 * (q - 0.55) + 0.25 * diff;
      rating += 0.5 * p.goals + 0.25 * p.assists;
      if (p.role === 'P') {
        rating += Math.min(1, 0.25 * p.saves) - 0.25 * Math.max(0, conceded - 1);
        if (conceded === 0) rating += 0.25;
      } else if (p.role === 'D') {
        rating += conceded === 0 ? 0.25 : -Math.min(0.5, 0.15 * conceded);
      }
      if (p.injured) rating -= 0.5;
      if (p.redCards > 0) rating = Math.min(rating, 5);
      p.rating = roundHalf(Math.min(9, Math.max(4, rating)));

      let bonus =
        FANTASY_BONUSES.GOAL_SCORED * p.goals +
        FANTASY_BONUSES.ASSIST * p.assists +
        FANTASY_BONUSES.PENALTY_MISSED * p.penaltiesMissed +
        FANTASY_BONUSES.OWN_GOAL * p.ownGoals;
      // L'espulsione sostituisce l'eventuale giallo
      bonus += p.redCards > 0 ? FANTASY_BONUSES.RED_CARD : FANTASY_BONUSES.YELLOW_CARD * p.yellowCards;
      if (p.role === 'P') {
        bonus += FANTASY_BONUSES.GOAL_CONCEDED * p.goalsConceded;
        bonus += FANTASY_BONUSES.PENALTY_SAVED * p.penaltiesSaved;
        if (p.cleanSheet) bonus += FANTASY_BONUSES.CLEAN_SHEET_GK;
      }
      p.bonus = bonus;
      p.fantasyScore = p.rating + bonus;
      result.push(p);
    }
  }
  return result;
}

/** Migliore e peggiore in campo (fantavoto, poi voto, poi overall) */
export function pickMvpAndWorst(
  performances: MatchPlayerPerformance[],
  lineups: Record<MatchSide, LineupPlayer[]>
): { mvpId: string; worstId: string } {
  const overall = new Map<string, number>();
  for (const side of SIDES) for (const p of lineups[side]) overall.set(p.playerId, p.overall);
  const sorted = [...performances].sort(
    (a, b) =>
      b.fantasyScore - a.fantasyScore ||
      b.rating - a.rating ||
      (overall.get(b.playerId) ?? 0) - (overall.get(a.playerId) ?? 0)
  );
  return { mvpId: sorted[0]?.playerId ?? '', worstId: sorted[sorted.length - 1]?.playerId ?? '' };
}
