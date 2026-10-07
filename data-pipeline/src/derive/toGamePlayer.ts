// Mappa un aggregato di stagione transfermarkt nel tipo Player del gioco.
// Pure: nessuna I/O.

import type { Player } from '../../../src/types/index.ts';
import { minutesShare } from './overall.ts';
import type { PlayerAgg, Role } from './overall.ts';

export const ROLE_MAX: Record<Role, number> = { P: 35, D: 30, C: 40, A: 50 };

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export interface GamePlayerInput extends PlayerAgg {
  playerId: string;
  name: string;
  clubName: string;
  overall: number;
  seasonLabel: string; // es. '2015-16'
}

/**
 * Converte l'aggregato nel Player del gioco:
 *   t = clamp((overall-50)/45, 0, 1)
 *   baseValue = max(1, round(ROLE_MAX[ruolo] * t^2))
 *   avgRating = 5.5 + 1.5*t; probabilità = conteggio/presenze.
 */
export function toGamePlayer(input: GamePlayerInput): Player {
  const t = clamp((input.overall - 50) / 45, 0, 1);
  const apps = input.apps;
  const perApp = (count: number) => (apps > 0 ? count / apps : 0);

  const player: Player = {
    id: `tm-${input.playerId}-${input.seasonLabel}`,
    name: input.name,
    role: input.role,
    team: input.clubName,
    baseValue: Math.max(1, Math.round(ROLE_MAX[input.role] * t * t)),
    avgRating: round2(5.5 + 1.5 * t),
    goalProbability: perApp(input.goals),
    assistProbability: perApp(input.assists),
    yellowCardProbability: perApp(input.yellow),
    redCardProbability: perApp(input.red),
    reliability: round2(minutesShare(input.minutes)),
    season: input.seasonLabel,
    overall: input.overall,
    stats: {
      appearances: apps,
      minutes: input.minutes,
      goals: input.goals,
      assists: input.assists,
      yellowCards: input.yellow,
      redCards: input.red,
      goalsConceded: input.goalsConceded,
      cleanSheets: input.cleanSheets,
    },
  };
  if (input.role === 'P' || input.role === 'D') {
    player.cleanSheetProbability = perApp(input.cleanSheets);
  }
  if (input.role === 'P') {
    player.penaltySaveProbability = 0;
  }
  return player;
}
