import { Player, PlayerRole } from '../types';
import { playerOverall } from '../services/auction/teamStrength';
import { splitName } from '../utils/playerName';
import { tierOf, Tier } from '../services/playerTier';

/**
 * Selezione della "Top 11" di un'annata: formazione ideale 4-3-3 con i
 * migliori per overall (1 portiere, 4 difensori, 3 centrocampisti,
 * 3 attaccanti). Usata dalle pagine /top-11/<annata>/ e dal loro JSON-LD.
 */

/** Giocatore mostrato nella pagina: solo dati pubblici */
export interface Top11Player {
  name: string;
  surname: string;
  firstName: string;
  role: PlayerRole;
  team: string;
  overall: number;
  tier: Tier;
}

/** Dati della pagina di un'annata, scritti nell'HTML dal pre-rendering */
export interface Top11SeasonData {
  season: string;
  label: string;
  players: Top11Player[];
  stats: {
    elite: number;
    topPlayer: string;
    topClub: string;
    topClubCount: number;
  };
  prev: string | null;
  next: string | null;
}

/** Voce dell'indice /top-11/: il migliore di ogni reparto */
export interface Top11IndexEntry {
  season: string;
  best: { role: PlayerRole; surname: string; overall: number }[];
}

const FORMATION: { role: PlayerRole; count: number }[] = [
  { role: 'P', count: 1 },
  { role: 'D', count: 4 },
  { role: 'C', count: 3 },
  { role: 'A', count: 3 },
];

/** I migliori `count` per ruolo, ordinati per overall, poi valore, poi nome */
function topByRole(players: Player[], role: PlayerRole, count: number): Player[] {
  return players
    .filter(p => p.role === role)
    .sort((a, b) => playerOverall(b) - playerOverall(a) || b.baseValue - a.baseValue || a.name.localeCompare(b.name, 'it'))
    .slice(0, count);
}

/** La Top 11 di una stagione, in ordine di campo: P, 4D, 3C, 3A */
export function pickTop11(players: Player[]): Top11Player[] {
  return FORMATION.flatMap(({ role, count }) =>
    topByRole(players, role, count).map(p => {
      const { surname, firstName } = splitName(p.name);
      return {
        name: p.name,
        surname,
        firstName,
        role,
        team: p.team,
        overall: playerOverall(p),
        tier: tierOf(playerOverall(p)),
      };
    })
  );
}

/** Testo introduttivo della pagina, generato solo dai dati veri */
export function buildSeasonData(season: string, label: string, players: Player[], all: string[]): Top11SeasonData {
  const top = pickTop11(players);
  const byClub = new Map<string, number>();
  for (const p of top) byClub.set(p.team, (byClub.get(p.team) ?? 0) + 1);
  const [topClub, topClubCount] = [...byClub.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))[0];
  const i = all.indexOf(season);
  return {
    season,
    label,
    players: top,
    stats: {
      elite: top.filter(p => p.tier === 'elite').length,
      topPlayer: top.reduce((a, b) => (b.overall > a.overall ? b : a)).surname,
      topClub,
      topClubCount,
    },
    prev: all[i + 1] ?? null,
    next: all[i - 1] ?? null,
  };
}

/** Voce dell'indice per una stagione: P, D, C e A più forti dell'annata */
export function indexEntry(season: string, players: Player[]): Top11IndexEntry {
  return {
    season,
    best: FORMATION.map(({ role }) => {
      const p = topByRole(players, role, 1)[0];
      return { role, surname: splitName(p.name).surname, overall: playerOverall(p) };
    }),
  };
}

/** ItemList JSON-LD degli 11 giocatori */
export function top11JsonLd(data: Top11SeasonData): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Top 11 ${data.label}`,
    numberOfItems: data.players.length,
    itemListElement: data.players.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Person',
        name: `${p.firstName} ${p.surname}`.trim() || p.surname,
        affiliation: { '@type': 'SportsTeam', name: p.team },
      },
    })),
  };
}
