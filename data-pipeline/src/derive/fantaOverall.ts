// Overall (50-95) derivato dalle statistiche storiche fantacalcio (LISTE/).
// Funzioni pure: nessuna I/O. Formula decisa a monte; non modificarla senza
// nuova decisione: le soglie dei test di integrazione la verificano.
//
// Popolazione = righe di (stagione, ruolo) con Pr >= 1.
// 1. Fantavoto per presenza:
//    movimento: FV = MV + (3G + A - 0.5Am - Es - 2Au - 3rigSbagliati) / Pr
//    portiere:  FV = MV + (-GS + 3RP - 0.5Am - Es) / Pr
// 2. Shrinkage: FV* = (FV*Pr + K*m) / (Pr + K), m = media FV pesata per Pr
// 3. q = percentile midrank di FV* nel gruppo
// 4. cont = min(1, Ti/38)
// 5. A,C: T = G + w*A; prod = sqrt(T / max(T))
// 6. score + overall; 7. baseValue quadratico su ROLE_MAX

export type FantaRole = 'P' | 'D' | 'C' | 'A';

/** Tutte le costanti della formula in un unico punto (ricalibrabili). */
export const FANTA_CONFIG = {
  /** K dello shrinkage del fantavoto (in presenze-equivalenti) */
  SHRINK_K: 8,
  /** Bonus/malus del fantavoto per evento */
  BONUS_GOAL: 3,
  BONUS_ASSIST: 1,
  MALUS_YELLOW: 0.5,
  MALUS_RED: 1,
  MALUS_OWNGOAL: 2,
  MALUS_MISSED_PEN: 3,
  BONUS_SAVED_PEN: 3,
  /** Peso degli assist nella produzione offensiva T = G + w*A */
  PROD_ASSIST_WEIGHT: { A: 0.6, C: 1.0, D: 1.0 } as Record<'A' | 'C' | 'D', number>,
  /** Pesi del rendimento per ruolo (prod = produzione gol+assist) */
  SCORE_WEIGHTS: {
    A: { q: 0.45, prod: 0.3, cont: 0.25 },
    C: { q: 0.45, prod: 0.3, cont: 0.25 },
    D: { q: 0.45, prod: 0.15, cont: 0.4 },
    P: { q: 0.6, prod: 0, cont: 0.4 },
  } as Record<FantaRole, { q: number; prod: number; cont: number }>,
  /**
   * Qualità q = Q_PCT_WEIGHT·percentile + (1−Q_PCT_WEIGHT)·magnitudine:
   * il percentile da solo appiattisce la cima (il primo con largo margine
   * vale come il primo di poco), la magnitudine conserva il distacco
   */
  Q_PCT_WEIGHT: 0.5,
  /** Percentile di FV* usato come zero della magnitudine */
  MAG_FLOOR_PCT: 0.1,
  /** Peso del rendimento della stagione nello score finale */
  PERF_WEIGHT: 0.7,
  /** Peso della reputazione (quotazioni del listone) nello score finale */
  REP_WEIGHT: 0.3,
  /** Presenze da titolare per la "titolarità" piena */
  FULL_SEASON_STARTS: 38,
  /** Mappatura overall -> baseValue */
  ROLE_MAX: { P: 28, D: 30, C: 40, A: 55 } as Record<FantaRole, number>,
  VALUE_EXPONENT: 2,
} as const;

/** Riga delle statistiche storiche, già tipizzata (vedi fantaCsv.ts). */
export interface FantaRow {
  season: string; // 'YYYY-YYYY'
  club: string;
  role: FantaRole;
  name: string;
  /** Media voto (può mancare se Pr=0) */
  mv: number;
  /** Gol fatti; NEGATIVO per i portieri = gol subiti */
  go: number;
  assists: number;
  yellow: number;
  red: number;
  ownGoals: number;
  /** Rigori: movimento = segnati/calciati; portiere = parati/affrontati */
  penScored: number;
  penTaken: number;
  /** Presenze con voto */
  pr: number;
  /** Partite da titolare */
  ti: number;
  /** Quotazione finale */
  qu: number;
  /** Quotazione iniziale dal listone (assente se il giocatore non è nel listone) */
  qi?: number;
}

export interface FantaResult {
  /** Fantavoto ricostruito per presenza */
  fv: number;
  /** Fantavoto rimpicciolito (dopo shrinkage) */
  fvStar: number;
  /** Percentile midrank di FV* nel gruppo */
  q: number;
  /** Titolarità: min(1, Ti/38) */
  cont: number;
  /** Produzione offensiva scalata (A/C/D; 0 per P) */
  prod: number;
  /** Rendimento della stagione in [0,1] */
  perf: number;
  /** Reputazione da quotazioni in [0,1] */
  rep: number;
  score: number;
  overall: number;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Fantavoto ricostruito per singola presenza. */
export function fantavoto(row: FantaRow): number {
  const C = FANTA_CONFIG;
  const cards = -C.MALUS_YELLOW * row.yellow - C.MALUS_RED * row.red;
  if (row.pr <= 0) return 0;
  if (row.role === 'P') {
    const conceded = Math.abs(Math.min(0, row.go));
    const saved = row.penScored; // per i portieri Rig = parati/affrontati
    return row.mv + (-conceded + C.BONUS_SAVED_PEN * saved + cards) / row.pr;
  }
  const goals = Math.max(0, row.go);
  const missedPens = Math.max(0, row.penTaken - row.penScored);
  return (
    row.mv +
    (C.BONUS_GOAL * goals +
      C.BONUS_ASSIST * row.assists +
      cards -
      C.MALUS_OWNGOAL * row.ownGoals -
      C.MALUS_MISSED_PEN * missedPens) /
      row.pr
  );
}

/** Percentile midrank: (n_minori + 0.5*n_uguali)/n in [0,1]. */
export function midrankPercentile(values: number[], x: number): number {
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

/**
 * Calcola i risultati di una popolazione omogenea (stessa stagione e ruolo,
 * righe con Pr >= 1). L'output è allineato all'input.
 */
export function computeFantaGroup(rows: FantaRow[]): FantaResult[] {
  const C = FANTA_CONFIG;
  const fvs = rows.map(fantavoto);
  let sumW = 0;
  let sumFV = 0;
  rows.forEach((r, i) => {
    sumW += r.pr;
    sumFV += fvs[i] * r.pr;
  });
  const mean = sumW > 0 ? sumFV / sumW : 0;

  const fvStars = rows.map(
    (r, i) => (fvs[i] * r.pr + C.SHRINK_K * mean) / (r.pr + C.SHRINK_K)
  );
  const productions = rows.map(r => {
    if (r.role === 'P') return 0;
    const w = C.PROD_ASSIST_WEIGHT[r.role];
    return Math.max(0, r.go) + w * r.assists;
  });
  const maxT = Math.max(0, ...productions);

  // Magnitudine di FV*: 0 al percentile MAG_FLOOR_PCT, 1 al massimo
  const sortedFv = [...fvStars].sort((a, b) => a - b);
  const floor = sortedFv[Math.floor(C.MAG_FLOOR_PCT * (sortedFv.length - 1))] ?? 0;
  const maxFv = sortedFv[sortedFv.length - 1] ?? 0;

  // Reputazione: quotazioni scalate sul massimo del gruppo (radice)
  const maxQu = Math.max(0, ...rows.map(r => r.qu));
  const maxQi = Math.max(0, ...rows.map(r => r.qi ?? 0));
  const scaled = (x: number, max: number) => (max > 0 && x > 0 ? Math.sqrt(x / max) : 0);

  return rows.map((r, i) => {
    const fvStar = fvStars[i];
    const pct = midrankPercentile(fvStars, fvStar);
    const mag = maxFv > floor ? clamp01((fvStar - floor) / (maxFv - floor)) : 0;
    const q = C.Q_PCT_WEIGHT * pct + (1 - C.Q_PCT_WEIGHT) * mag;
    const cont = Math.min(1, r.ti / C.FULL_SEASON_STARTS);
    const prod = r.role !== 'P' && maxT > 0 ? Math.sqrt(productions[i] / maxT) : 0;
    const W = C.SCORE_WEIGHTS[r.role];
    const perf = W.q * q + W.prod * prod + W.cont * cont;
    const repFinal = scaled(r.qu, maxQu);
    const rep =
      r.qi !== undefined && maxQi > 0 ? 0.5 * repFinal + 0.5 * scaled(r.qi, maxQi) : repFinal;
    const score = C.PERF_WEIGHT * perf + C.REP_WEIGHT * rep;
    return {
      fv: fvs[i],
      fvStar,
      q,
      cont,
      prod,
      perf,
      rep,
      score,
      overall: Math.round(50 + 45 * clamp01(score)),
    };
  });
}

/** t = clamp01((overall-50)/45) */
export function overallT(overall: number): number {
  return clamp01((overall - 50) / 45);
}

/** baseValue = max(1, round(ROLE_MAX[r] * t^VALUE_EXPONENT)) */
export function overallToBaseValue(overall: number, role: FantaRole): number {
  const t = overallT(overall);
  return Math.max(1, Math.round(FANTA_CONFIG.ROLE_MAX[role] * Math.pow(t, FANTA_CONFIG.VALUE_EXPONENT)));
}
