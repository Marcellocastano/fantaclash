import { Player, PlayerRole, ROSTER_REQUIREMENTS, Team } from '../types';
import { MatchTeamInput } from '../domain/match';
import { autoLineup, lineupPlayers } from '../domain/teams/formations';
import { Rng, shuffle } from '../services/auction/rng';
import { playerOverall } from '../services/auction/teamStrength';
import seasonDoc from '../../public/data/seasons/2015-16.json';

/** Listone reale 2015-16 per i test del motore partita */
export const SEASON_PLAYERS = seasonDoc.players as Player[];

const ROLES: PlayerRole[] = ['P', 'D', 'C', 'A'];

function byRole(players: Player[], role: PlayerRole): Player[] {
  return players
    .filter(p => p.role === role)
    .sort((a, b) => playerOverall(b) - playerOverall(a));
}

function rankedRoster(offset: number, players = SEASON_PLAYERS): Player[] {
  return ROLES.flatMap(role => {
    const list = byRole(players, role);
    const n = ROSTER_REQUIREMENTS[role].total;
    const start = Math.min(offset * n, list.length - n);
    return list.slice(start, start + n);
  });
}

export function teamFromRank(id: string, offset: number, players = SEASON_PLAYERS, formation: MatchTeamInput['formation'] = '2-3-2'): MatchTeamInput {
  const roster = rankedRoster(offset, players);
  const lineup = autoLineup(roster, formation);
  return { id, name: id, players: lineupPlayers(roster, lineup), formation };
}

/** I migliori per ruolo */
export function strongTeam(id = 'forte'): MatchTeamInput {
  return teamFromRank(id, 0);
}

/** I peggiori per ruolo */
export function weakTeam(id = 'debole'): MatchTeamInput {
  return teamFromRank(id, 99);
}

export function randomTeam(id: string, rng: Rng, players = SEASON_PLAYERS, formation: MatchTeamInput['formation'] = '2-3-2'): MatchTeamInput {
  const roster = ROLES.flatMap(role =>
    shuffle(players.filter(p => p.role === role), rng).slice(0, ROSTER_REQUIREMENTS[role].total)
  );
  const lineup = autoLineup(roster, formation);
  return { id, name: id, players: lineupPlayers(roster, lineup), formation };
}

/** Copia della squadra con id/nome diversi (stessi giocatori) */
export function cloneTeam(team: MatchTeamInput, id: string): MatchTeamInput {
  return { ...team, id, name: id };
}

/** 8 squadre complete (Team) per i test del torneo: rose a fasce di forza */
export function tournamentTeams(): Team[] {
  return Array.from({ length: 8 }, (_, i) => {
    const players = rankedRoster(i);
    const lineup = autoLineup(players, '2-3-2');
    return {
      id: i === 0 ? 'user' : `bot-${i}`,
      name: i === 0 ? 'Fanta United' : `Bot ${i}`,
      isUserTeam: i === 0,
      credits: 0,
      initialCredits: 250,
      roster: players.map(player => ({ player, purchasePrice: 10 })),
      botConfig: null,
      lineup,
    };
  });
}
