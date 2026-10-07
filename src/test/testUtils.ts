import { Player, Team, PlayerRole, BotArchetype, BotConfig, DifficultyLevel, GameConfig, OwnedPlayer } from '../types';

/**
 * Crea un giocatore di test
 */
export function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Player',
    role: 'C',
    team: 'Test FC',
    baseValue: 10,
    avgRating: 6.5,
    goalProbability: 0.1,
    assistProbability: 0.15,
    yellowCardProbability: 0.1,
    redCardProbability: 0.01,
    penaltySaveProbability: 0,
    cleanSheetProbability: 0,
    reliability: 0.9,
    ...overrides,
  };
}

/**
 * Crea una squadra di test
 */
export function createTestTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: `team-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Team',
    credits: 500,
    initialCredits: 500,
    roster: [],
    isUserTeam: false,
    botConfig: null,
    ...overrides,
  };
}

/**
 * Crea una configurazione bot di test
 */
export function createTestBotConfig(
  difficulty: DifficultyLevel = 'normale',
  archetype: BotArchetype = 'equilibrato',
  pupilli: string[] = []
): BotConfig {
  return {
    difficulty,
    archetype,
    rolePreferences: { P: 1, D: 1, C: 1, A: 1 },
    pupilli,
  };
}

/**
 * Crea una configurazione di gioco di test
 */
export function createTestGameConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    userTeamName: 'User Team',
    difficulty: 'normale',
    season: '2015-16',
    ...overrides,
  };
}

/**
 * Costruisce una rosa con i conteggi dati per ruolo.
 * I giocatori hanno id univoci `roster-<ruolo>-<indice>` e baseValue 10.
 */
export function buildRoster(roleCounts: Partial<Record<PlayerRole, number>>): OwnedPlayer[] {
  const roster: OwnedPlayer[] = [];
  let position = 1;
  for (const role of ['P', 'D', 'C', 'A'] as PlayerRole[]) {
    const count = roleCounts[role] ?? 0;
    for (let i = 0; i < count; i++) {
      roster.push({
        player: createTestPlayer({ id: `roster-${role}-${i}`, role }),
        purchasePrice: 10,
        isStarter: false,
        formationPosition: position++,
      });
    }
  }
  return roster;
}

/**
 * Crea un set di giocatori per ruolo
 */
export function createPlayersForRole(role: PlayerRole, count: number): Player[] {
  return Array.from({ length: count }, (_, i) => 
    createTestPlayer({
      id: `${role}-${i}`,
      name: `${role} Player ${i + 1}`,
      role,
      baseValue: 20 - i, // Valori decrescenti
    })
  );
}

/**
 * Crea un set completo di giocatori per l'asta
 */
export function createFullPlayerSet(): Player[] {
  return [
    ...createPlayersForRole('P', 10),
    ...createPlayersForRole('D', 20),
    ...createPlayersForRole('C', 20),
    ...createPlayersForRole('A', 15),
  ];
}

/**
 * Crea squadre per una lega di test
 */
export function createTestLeague(numTeams: number, credits: number = 500): Team[] {
  const teams: Team[] = [];
  
  // Squadra utente
  teams.push(createTestTeam({
    id: 'user-team',
    name: 'User Team',
    credits,
    initialCredits: credits,
    isUserTeam: true,
    botConfig: null,
  }));
  
  // Squadre bot
  for (let i = 1; i < numTeams; i++) {
    teams.push(createTestTeam({
      id: `bot-team-${i}`,
      name: `Bot Team ${i}`,
      credits,
      initialCredits: credits,
      isUserTeam: false,
      botConfig: createTestBotConfig('normale'),
    }));
  }
  
  return teams;
}
