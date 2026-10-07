// Derivazione dell'overall 50-95 da statistiche aggregate di stagione.
// Funzioni pure: nessuna I/O. Formula esatta concordata:
//   minutesShare = min(1, minutes / (38*90)) — usata grezza, mai in percentile
//   rate rimpicciolita con K=15 partite da 90': (count + K*mean) / (min90 + K)
//   s(x) = sqrt(x / max_ruolo(x)) — "produzione scalata" (0 se il max è 0)
//   pct(x) = midrank percentile nel ruolo; per metriche "minore è meglio" pct(-x)
//   score per ruolo -> overall = round(50 + 45*score)

export type Role = 'P' | 'D' | 'C' | 'A';

export interface PlayerAgg {
  role: Role;
  apps: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  /** Gol subiti attribuiti (approssimato, rilevante solo per P) */
  goalsConceded: number;
  cleanSheets: number;
  /** Punti/partita della squadra del giocatore */
  teamPPG: number;
  /** Gol subiti/partita della squadra del giocatore */
  teamGA: number;
}

export const FULL_MINUTES = 38 * 90;
export const SHRINK_K = 15;

export function minutesShare(minutes: number): number {
  return Math.min(1, minutes / FULL_MINUTES);
}

/** Midrank percentile in [0,1]: (#valori < x + 0.5*#valori = x) / n */
export function percentileRank(values: number[], x: number): number {
  const n = values.length;
  if (n === 0) return 0;
  let below = 0;
  let equal = 0;
  for (const v of values) {
    if (v < x) below++;
    else if (v === x) equal++;
  }
  return (below + 0.5 * equal) / n;
}

/** Media di lega per-90' di un conteggio sul ruolo: Σcount / Σ(min/90). */
function roleMeanPer90(aggs: PlayerAgg[], pick: (p: PlayerAgg) => number): number {
  let count = 0;
  let min90 = 0;
  for (const p of aggs) {
    count += pick(p);
    min90 += p.minutes / 90;
  }
  return min90 > 0 ? count / min90 : 0;
}

/** Tasso per-90' rimpicciolito verso la media di ruolo (K presenze-equivalenti). */
export function shrunkRate(count: number, minutes: number, meanPer90: number): number {
  return (count + SHRINK_K * meanPer90) / (minutes / 90 + SHRINK_K);
}

/** Produzione scalata: sqrt(x / max). Ritorna 0 se max <= 0 o x <= 0. */
export function scaledProduction(x: number, max: number): number {
  if (max <= 0 || x <= 0) return 0;
  return Math.sqrt(x / max);
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

type Feats = {
  ms: number;
  g90: number;
  a90: number;
  ga90: number;
  c90: number;
  sGoals: number;
  sAssists: number;
  sGA: number;
  sCleanSheets: number;
};

/** Calcola l'overall di ogni giocatore; l'output è allineato all'input. */
export function computeOveralls(players: PlayerAgg[]): number[] {
  const overalls = new Array<number>(players.length).fill(50);

  const roleIndex = new Map<Role, number[]>();
  players.forEach((p, i) => {
    let arr = roleIndex.get(p.role);
    if (!arr) roleIndex.set(p.role, (arr = []));
    arr.push(i);
  });

  for (const [role, idxs] of roleIndex) {
    const group = idxs.map(i => players[i]);
    const meanG = roleMeanPer90(group, p => p.goals);
    const meanA = roleMeanPer90(group, p => p.assists);
    const meanGA = roleMeanPer90(group, p => p.goals + p.assists);
    const meanC = roleMeanPer90(group, p => p.goalsConceded);

    const maxG = Math.max(0, ...group.map(p => p.goals));
    const maxA = Math.max(0, ...group.map(p => p.assists));
    const maxGA = Math.max(0, ...group.map(p => p.goals + p.assists));
    const maxCS = Math.max(0, ...group.map(p => p.cleanSheets));

    const feats: Feats[] = idxs.map(i => {
      const p = players[i];
      return {
        ms: minutesShare(p.minutes),
        g90: shrunkRate(p.goals, p.minutes, meanG),
        a90: shrunkRate(p.assists, p.minutes, meanA),
        ga90: shrunkRate(p.goals + p.assists, p.minutes, meanGA),
        c90: shrunkRate(p.goalsConceded, p.minutes, meanC),
        sGoals: scaledProduction(p.goals, maxG),
        sAssists: scaledProduction(p.assists, maxA),
        sGA: scaledProduction(p.goals + p.assists, maxGA),
        sCleanSheets: scaledProduction(p.cleanSheets, maxCS),
      };
    });

    const gVals = feats.map(f => f.g90);
    const aVals = feats.map(f => f.a90);
    const gaVals = feats.map(f => f.ga90);
    const cVals = feats.map(f => f.c90);
    const ppgVals = group.map(p => p.teamPPG);
    const gaTeamVals = group.map(p => p.teamGA);

    for (let j = 0; j < idxs.length; j++) {
      const p = group[j];
      const f = feats[j];
      let score = 0;
      switch (role) {
        case 'A':
          score =
            0.4 * f.sGoals +
            0.15 * f.sAssists +
            0.15 * percentileRank(gVals, f.g90) +
            0.15 * f.ms +
            0.15 * percentileRank(ppgVals, p.teamPPG);
          break;
        case 'C':
          score =
            0.2 * f.sGoals +
            0.25 * f.sAssists +
            0.1 * percentileRank(gaVals, f.ga90) +
            0.25 * f.ms +
            0.2 * percentileRank(ppgVals, p.teamPPG);
          break;
        case 'D':
          score =
            0.1 * f.sGA +
            0.4 * f.ms +
            0.3 * percentileRank(ppgVals, p.teamPPG) +
            0.2 * percentileRank(gaTeamVals, -p.teamGA);
          break;
        case 'P':
          score =
            0.35 * f.ms +
            0.3 * percentileRank(cVals, -f.c90) +
            0.15 * f.sCleanSheets +
            0.2 * percentileRank(ppgVals, p.teamPPG);
          break;
      }
      overalls[idxs[j]] = Math.round(50 + 45 * clamp01(score));
    }
  }

  return overalls;
}
