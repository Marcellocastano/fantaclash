import { Team, BotConfig, DifficultyLevel, Player, PlayerRole } from '../types';
import { getRandomBotNames } from '../mock/teamNames';
import { getRemainingSlots, getTotalRemainingSlots, LEAGUE_SIZE, INITIAL_CREDITS } from './auction/rules';
import {
  assignArchetypes,
  pickPupilli,
  randomRolePreferences,
} from './auction/personalities';
import type { Rng } from './auction/rng';

/**
 * Genera una configurazione Bot: difficoltà comune a tutta la lega,
 * archetipo e preferenze di ruolo casuali, pupilli solo per i cacciatori.
 * @param rng Sorgente di casualità (passare un Rng seedato per run riproducibili)
 */
function generateBotConfig(
  difficulty: DifficultyLevel,
  archetype: BotConfig['archetype'],
  pool: Player[],
  rng: Rng
): BotConfig {
  return {
    difficulty,
    archetype,
    rolePreferences: randomRolePreferences(rng),
    pupilli: archetype === 'cacciatore' ? pickPupilli(pool, rng) : [],
  };
}

/**
 * Genera l'ID di una squadra, univoco all'interno della lega grazie alla
 * posizione. Nessuno stato globale: con un rng seedato gli ID (e quindi il
 * rumore dei bot, che usa hashSeed(lotSeed, team.id)) sono riproducibili
 * anche tra più leghe generate nello stesso processo.
 * @param index Posizione della squadra nella lega (0 = utente)
 * @param rng Sorgente di casualità per la parte randomica dell'ID
 */
function generateTeamId(index: number, rng: Rng = Math.random): string {
  return `team-${index}-${rng().toString(36).substring(2, 9)}`;
}

/**
 * Genera la squadra dell'utente
 */
export function generateUserTeam(
  name: string,
  initialCredits: number,
  rng: Rng = Math.random
): Team {
  return {
    id: generateTeamId(0, rng),
    name,
    isUserTeam: true,
    credits: initialCredits,
    initialCredits,
    roster: [],
    botConfig: null,
  };
}

/**
 * Genera le squadre Bot per la lega
 * @param count Numero di squadre bot da generare
 * @param initialCredits Crediti iniziali per ogni squadra
 * @param difficulty Livello di difficoltà dei bot
 * @param pool Listone d'asta (per la scelta dei pupilli dei cacciatori)
 * @param userTeamName Nome della squadra utente (per evitare duplicati)
 * @param rng Sorgente di casualità (default Math.random)
 */
export function generateBotTeams(
  count: number,
  initialCredits: number,
  difficulty: DifficultyLevel,
  pool: Player[],
  userTeamName: string,
  rng: Rng = Math.random
): Team[] {
  const botNames = getRandomBotNames(count, userTeamName);
  const archetypes = assignArchetypes(count, rng);

  return Array.from({ length: count }, (_, index) => ({
    id: generateTeamId(index + 1, rng),
    name: botNames[index],
    isUserTeam: false,
    credits: initialCredits,
    initialCredits,
    roster: [],
    botConfig: generateBotConfig(difficulty, archetypes[index], pool, rng),
  }));
}

/**
 * Genera tutte le squadre della lega: l'utente più LEAGUE_SIZE - 1 bot,
 * tutte con INITIAL_CREDITS crediti.
 */
export function generateAllTeams(
  userTeamName: string,
  difficulty: DifficultyLevel,
  pool: Player[],
  rng: Rng = Math.random
): Team[] {
  const userTeam = generateUserTeam(userTeamName, INITIAL_CREDITS, rng);
  const botTeams = generateBotTeams(
    LEAGUE_SIZE - 1,
    INITIAL_CREDITS,
    difficulty,
    pool,
    userTeamName,
    rng
  );

  return [userTeam, ...botTeams];
}

/**
 * Calcola i requisiti rimanenti per completare la rosa di una squadra
 * (delega alle regole del motore d'asta)
 */
export function getRemainingRosterSlots(team: Team): Record<PlayerRole, number> {
  return getRemainingSlots(team);
}

/**
 * Verifica se una squadra ha completato la rosa
 */
export function isRosterComplete(team: Team): boolean {
  return getTotalRemainingSlots(team) === 0;
}

/**
 * Calcola i crediti minimi necessari per completare la rosa
 * (assumendo 1 credito minimo per giocatore)
 */
export function getMinCreditsToCompleteRoster(team: Team): number {
  return getTotalRemainingSlots(team);
}
