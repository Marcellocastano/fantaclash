import type { TournamentStatus } from '../../domain/tournament';
import type { CatalogKey } from '../../i18n/translate';
import type { GamePhase } from '../../types';

/** Tappe del percorso di gioco mostrate nella navbar (chiavi di catalogo) */
export const JOURNEY_STEPS: readonly CatalogKey[] = [
  'ui.journey.auction',
  'ui.journey.draw',
  'ui.journey.quarters',
  'ui.journey.semifinal',
  'ui.journey.final',
] as const;

/**
 * Indice della tappa corrente (0..4); 5 = percorso completato,
 * null = fuori dal percorso (landing).
 */
export function journeyStep(phase: GamePhase, status?: TournamentStatus | null): number | null {
  switch (phase) {
    case 'SETUP':
      return null;
    case 'ASTA':
      return 0;
    case 'FINALE':
      return 5;
    case 'TORNEO':
      switch (status) {
        case 'quarterfinals':
          return 2;
        case 'semifinals':
          return 3;
        case 'final':
          return 4;
        case 'completed':
          return 5;
        default:
          return 1;
      }
    default:
      return null;
  }
}
