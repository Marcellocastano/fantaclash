import { OwnedPlayer, Team } from '../../types';
import { playerOverall, teamStrength } from '../../services/auction/teamStrength';

/**
 * I tre "titoli" della schermata di fine asta, derivati dalle rose.
 * Pura e deterministica: a parità di merito vince la prima squadra in
 * ordine di `teams`.
 */

export interface Purchase {
  entry: OwnedPlayer;
  team: Team;
}

function allPurchases(teams: Team[]): Purchase[] {
  return teams.flatMap(team => team.roster.map(entry => ({ entry, team })));
}

/** Il colpo più pagato dell'asta (parità: prima squadra in ordine) */
export function topPurchase(teams: Team[]): Purchase | null {
  let best: Purchase | null = null;
  for (const p of allPurchases(teams)) {
    if (!best || p.entry.purchasePrice > best.entry.purchasePrice) best = p;
  }
  return best;
}

/**
 * L'affare: tra gli acquisti a 3 Cr o meno quello con l'overall più alto;
 * se non ce ne sono, il miglior rapporto overall/prezzo.
 */
export function bestBargain(teams: Team[]): Purchase | null {
  const purchases = allPurchases(teams);
  const cheap = purchases.filter(p => p.entry.purchasePrice <= 3);
  if (cheap.length > 0) {
    let best = cheap[0];
    for (const p of cheap) {
      const o = playerOverall(p.entry.player);
      const bo = playerOverall(best.entry.player);
      if (o > bo) best = p;
    }
    return best;
  }
  let best: Purchase | null = null;
  let bestRatio = -1;
  for (const p of purchases) {
    const ratio = playerOverall(p.entry.player) / Math.max(1, p.entry.purchasePrice);
    if (ratio > bestRatio) {
      best = p;
      bestRatio = ratio;
    }
  }
  return best;
}

/** La squadra con la forza di rosa più alta (parità: prima in ordine) */
export function strongestTeam(teams: Team[]): { team: Team; strength: number } | null {
  let best: Team | null = null;
  let bestS = -1;
  for (const team of teams) {
    if (team.roster.length === 0) continue;
    const s = teamStrength(team);
    if (s > bestS) {
      best = team;
      bestS = s;
    }
  }
  return best ? { team: best, strength: bestS } : null;
}

export function auctionHighlights(teams: Team[]): {
  top: Purchase | null;
  bargain: Purchase | null;
  strongest: { team: Team; strength: number } | null;
} {
  return { top: topPurchase(teams), bargain: bestBargain(teams), strongest: strongestTeam(teams) };
}
