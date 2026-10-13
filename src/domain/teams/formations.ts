import type { Player, PlayerRole, Team } from '../../types/index.js';

export type FormationId = '2-3-2' | '3-2-2' | '2-2-3' | '3-3-1' | '2-4-1' | '3-1-3';

export interface FormationSlot {
  role: PlayerRole;
  x: number;
  y: number;
}

export interface TacticalProfile {
  creationAttack: number;
  creationMidfield: number;
  chance: number;
  concede: number;
  control: number;
  counterThreat: number;
  counterExposure: number;
  bigChance: number;
  insertion: number;
  energyDrain: number;
}

export interface FormationDefinition {
  id: FormationId;
  label: string;
  identity: string;
  counts: { D: number; C: number; A: number };
  profile: TacticalProfile;
  layout: FormationSlot[];
}

function formation(
  id: FormationId,
  identity: string,
  counts: FormationDefinition['counts'],
  profile: TacticalProfile,
  lines: { role: PlayerRole; y: number; xs: number[] }[]
): FormationDefinition {
  const layout: FormationSlot[] = [{ role: 'P', x: 0.5, y: 0.91 }];
  for (const line of lines) {
    for (const x of line.xs) layout.push({ role: line.role, x, y: line.y });
  }
  return { id, label: id, identity, counts, profile, layout };
}

const balanced: TacticalProfile = {
  creationAttack: 0.6,
  creationMidfield: 0.4,
  chance: 1,
  concede: 1,
  control: 0,
  counterThreat: 1,
  counterExposure: 1,
  bigChance: 1,
  insertion: 1,
  energyDrain: 1,
};

export const FORMATION_IDS: FormationId[] = ['2-3-2', '3-2-2', '2-2-3', '3-3-1', '2-4-1', '3-1-3'];
export const DEFAULT_FORMATION: FormationId = '2-3-2';

export const FORMATIONS: Record<FormationId, FormationDefinition> = {
  '2-3-2': formation('2-3-2', 'Equilibrio generale', { D: 2, C: 3, A: 2 }, balanced, [
    { role: 'D', y: 0.72, xs: [0.35, 0.65] },
    { role: 'C', y: 0.51, xs: [0.25, 0.5, 0.75] },
    { role: 'A', y: 0.27, xs: [0.35, 0.65] },
  ]),
  '3-2-2': formation('3-2-2', 'Solidità difensiva', { D: 3, C: 2, A: 2 }, {
    ...balanced, creationAttack: 0.65, creationMidfield: 0.35, chance: 0.94,
    concede: 0.86, control: -0.02, counterThreat: 1.1, counterExposure: 0.85,
    bigChance: 0.95, insertion: 0.9, energyDrain: 0.97,
  }, [
    { role: 'D', y: 0.72, xs: [0.25, 0.5, 0.75] },
    { role: 'C', y: 0.5, xs: [0.37, 0.63] },
    { role: 'A', y: 0.27, xs: [0.35, 0.65] },
  ]),
  '2-2-3': formation('2-2-3', 'Potenza offensiva', { D: 2, C: 2, A: 3 }, {
    ...balanced, creationAttack: 0.7, creationMidfield: 0.3, chance: 1.1,
    concede: 1.06, control: -0.02, counterThreat: 1.05, counterExposure: 1.15,
    bigChance: 1.12, insertion: 0.85, energyDrain: 1.02,
  }, [
    { role: 'D', y: 0.72, xs: [0.35, 0.65] },
    { role: 'C', y: 0.5, xs: [0.37, 0.63] },
    { role: 'A', y: 0.27, xs: [0.22, 0.5, 0.78] },
  ]),
  '3-3-1': formation('3-3-1', 'Controllo e possesso', { D: 3, C: 3, A: 1 }, {
    ...balanced, creationAttack: 0.45, creationMidfield: 0.55, chance: 0.95,
    concede: 0.96, control: 0.015, counterThreat: 0.95, counterExposure: 0.97,
    bigChance: 0.93, insertion: 1.2, energyDrain: 0.98,
  }, [
    { role: 'D', y: 0.72, xs: [0.25, 0.5, 0.75] },
    { role: 'C', y: 0.49, xs: [0.25, 0.5, 0.75] },
    { role: 'A', y: 0.25, xs: [0.5] },
  ]),
  '2-4-1': formation('2-4-1', 'Superiorità a centrocampo', { D: 2, C: 4, A: 1 }, {
    ...balanced, creationAttack: 0.4, creationMidfield: 0.6, chance: 0.98,
    concede: 1, control: 0.02, counterThreat: 0.95, counterExposure: 1.05,
    bigChance: 0.95, insertion: 1.3, energyDrain: 1,
  }, [
    { role: 'D', y: 0.72, xs: [0.35, 0.65] },
    { role: 'C', y: 0.49, xs: [0.18, 0.39, 0.61, 0.82] },
    { role: 'A', y: 0.25, xs: [0.5] },
  ]),
  '3-1-3': formation('3-1-3', 'Ampiezza e pressione', { D: 3, C: 1, A: 3 }, {
    ...balanced, creationAttack: 0.7, creationMidfield: 0.3, chance: 1.05,
    concede: 0.92, control: -0.02, counterThreat: 1.3, counterExposure: 1.08,
    bigChance: 1.05, insertion: 0.8, energyDrain: 1.08,
  }, [
    { role: 'D', y: 0.72, xs: [0.25, 0.5, 0.75] },
    { role: 'C', y: 0.5, xs: [0.5] },
    { role: 'A', y: 0.27, xs: [0.15, 0.5, 0.85] },
  ]),
};

export interface Lineup {
  formation: FormationId;
  /** Giocatori nell'ordine delle posizioni di FORMATIONS[formation].layout */
  starters: string[];
}

export type LineupErrorCode = 'count' | 'duplicate' | 'not_in_roster' | 'wrong_role' | 'missing_gk';

export interface LineupError {
  code: LineupErrorCode;
  message: string;
}

function asPlayers(roster: Player[] | Team['roster']): Player[] {
  return roster.map(item => 'player' in item ? item.player : item);
}

export function validateLineup(roster: Player[] | Team['roster'], lineup: Lineup): LineupError[] {
  const players = asPlayers(roster);
  const errors: LineupError[] = [];
  const definition = FORMATIONS[lineup.formation];
  if (!definition || lineup.starters.length !== 8) {
    return [{ code: 'count', message: 'La formazione deve avere esattamente 8 titolari.' }];
  }
  if (new Set(lineup.starters).size !== lineup.starters.length) {
    errors.push({ code: 'duplicate', message: 'Un giocatore non può occupare più di un posto.' });
  }
  const rosterIds = new Set(players.map(player => player.id));
  for (let i = 0; i < lineup.starters.length; i++) {
    const player = players.find(candidate => candidate.id === lineup.starters[i]);
    if (!rosterIds.has(lineup.starters[i]) || !player) {
      errors.push({ code: 'not_in_roster', message: 'La formazione include un giocatore non presente in rosa.' });
      continue;
    }
    if (player.role !== definition.layout[i]?.role) {
      errors.push({ code: 'wrong_role', message: `${player.name} non è compatibile con questo posto.` });
    }
  }
  if (!lineup.starters.some(id => players.some(player => player.id === id && player.role === 'P'))) {
    errors.push({ code: 'missing_gk', message: 'La formazione deve includere il portiere.' });
  }
  return errors;
}

export function isValidLineup(roster: Player[] | Team['roster'], lineup: Lineup): boolean {
  return validateLineup(roster, lineup).length === 0;
}

function playerScore(player: Player): number {
  return player.overall ?? Math.round(50 + 45 * Math.min(1, Math.max(0, (player.avgRating - 5.5) / 1.5)));
}

export function autoLineup(roster: Player[] | Team['roster'], formation: FormationId): Lineup {
  const players = asPlayers(roster);
  const definition = FORMATIONS[formation];
  const used = new Set<string>();
  const starters = definition.layout.map(slot => {
    const player = players
      .filter(candidate => candidate.role === slot.role && !used.has(candidate.id))
      .sort((a, b) => playerScore(b) - playerScore(a) || a.id.localeCompare(b.id))[0];
    if (!player) return '';
    used.add(player.id);
    return player.id;
  });
  return { formation, starters };
}

export function bestLineup(roster: Player[] | Team['roster'], preferred: FormationId = DEFAULT_FORMATION, preferredBias = 16): Lineup {
  const players = asPlayers(roster);
  return FORMATION_IDS.reduce((best, id) => {
    const candidate = autoLineup(players, id);
    const candidateScore = lineupPlayers(players, candidate).reduce((sum, player) => sum + playerScore(player), 0) + (id === preferred ? preferredBias : 0);
    const bestScore = lineupPlayers(players, best).reduce((sum, player) => sum + playerScore(player), 0) + (best.formation === preferred ? preferredBias : 0);
    return candidateScore > bestScore ? candidate : best;
  }, autoLineup(players, preferred));
}

export function lineupPlayers(roster: Player[] | Team['roster'], lineup: Lineup): Player[] {
  const players = asPlayers(roster);
  return lineup.starters.flatMap(id => {
    const player = players.find(candidate => candidate.id === id);
    return player ? [player] : [];
  });
}

export function benchPlayers(roster: Player[] | Team['roster'], lineup: Lineup): Player[] {
  const starters = new Set(lineup.starters);
  return asPlayers(roster).filter(player => !starters.has(player.id));
}

export function formationCoverage(roster: Player[] | Team['roster']): Record<FormationId, { filled: number; total: number }> {
  const players = asPlayers(roster);
  return Object.fromEntries(FORMATION_IDS.map(id => {
    const required = new Map<PlayerRole, number>();
    for (const slot of FORMATIONS[id].layout) required.set(slot.role, (required.get(slot.role) ?? 0) + 1);
    const filled = [...required].reduce((sum, [role, count]) => sum + Math.min(count, players.filter(player => player.role === role).length), 0);
    return [id, { filled, total: FORMATIONS[id].layout.length }];
  })) as Record<FormationId, { filled: number; total: number }>;
}
