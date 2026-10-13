import type { TournamentStatus } from '../../domain/tournament';
import type { CompetitionFormat, GamePhase } from '../../types';

export const JOURNEY_STEPS = ['Asta', 'Formazione', 'Sorteggio', 'Quarti', 'Semifinale', 'Finale'] as const;
export const GROUP_JOURNEY_STEPS = ['Asta', 'Formazione', 'Sorteggio', 'Gironi', 'Semifinale', 'Finale'] as const;

export function journeySteps(format: CompetitionFormat = 'knockout'): readonly string[] {
  return format === 'groups' ? GROUP_JOURNEY_STEPS : JOURNEY_STEPS;
}

export function journeyStep(phase: GamePhase, status?: TournamentStatus | null, format: CompetitionFormat = 'knockout'): number | null {
  switch (phase) {
    case 'SETUP':
      return null;
    case 'ASTA':
      return 0;
    case 'FORMAZIONE':
      return 1;
    case 'FINALE':
      return 6;
    case 'TORNEO':
      if (status === 'draw') return 2;
      if (status === 'groups') return format === 'groups' ? 3 : 2;
      if (status === 'quarterfinals') return 3;
      if (status === 'semifinals') return 4;
      if (status === 'final') return 5;
      if (status === 'completed') return 6;
      return 2;
    default:
      return null;
  }
}
