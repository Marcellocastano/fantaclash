import { BotArchetype, DifficultyLevel, Player, Team } from '../../types';
import { createRng, hashSeed, Rng } from './rng';
import { auctionReducer, AuctionWorld, createInitialAuctionState } from './session';
import { buildAuctionPool, getMaxBid, LEAGUE_SIZE } from './rules';
import { buildMarketSnapshot, getFairPrice } from './market';
import { CallStrategy } from './botCalling';
import { runAuction, UserPolicy } from './simulator';
import { playerOverall, teamStrength } from './teamStrength';
import { generateAllTeams } from '../teamGenerator';

/**
 * Harness della suite di equilibrio: simula aste complete con l'utente
 * guidato da una strategia scriptata e raccoglie le metriche usate dai
 * test di bilanciamento (balance.test.ts) e dai report di calibrazione.
 */

/** Stili di gioco simulati per l'utente */
export type UserStyle = 'passivo' | 'equilibrato' | 'stelle' | 'cecchino' | 'furbo';

/** Quota massima del budget discrezionale che l'utente "equilibrato" mette su un giocatore */
const BALANCED_MAX_SHARE = 0.55;

/** Margine sul prezzo equo del cecchino */
const SNIPER_MARKUP = 1.1;

/** Lo stile furbo paga fino a questo multiplo del prezzo equo per i migliori 3 rimasti del ruolo */
const SHREWD_STAR_MARKUP = 1.3;

/** ...e solo fino a questo multiplo per tutti gli altri */
const SHREWD_OTHER_MARKUP = 0.85;

/** Giocatori più economici prima (per le chiamate di riempimento) */
function cheapest(pool: Player[], role: Player['role']): Player | null {
  let best: Player | null = null;
  for (const p of pool) {
    if (p.role !== role) continue;
    if (!best || p.baseValue < best.baseValue) best = p;
  }
  return best;
}

/**
 * Limite "da prezzo equo" con soft cap sul budget, come un bot neutro:
 * la quota spendibile su un giocatore cresce man mano che la rosa si riempie
 */
function fairLimit(user: Team, fair: number, markup: number): number {
  const slots = user.roster.length < 8 ? 8 - user.roster.length : 0;
  const share = BALANCED_MAX_SHARE + (1 - BALANCED_MAX_SHARE) * (1 - (slots - 1) / 7);
  const softCap = slots > 1 ? 1 + share * (user.credits - slots) : Infinity;
  return Math.floor(Math.min(fair * markup, softCap, getMaxBid(user)));
}

/** Soglia di valore relativo (sul migliore rimasto del ruolo) per considerare un giocatore un campione */
const SHREWD_STAR_REL = 0.85;

/**
 * Costruisce la strategia dell'utente. `stars` è l'insieme dei migliori
 * 2 per ruolo del listone (usato solo dallo stile "stelle").
 */
export function makeUserPolicy(style: UserStyle, stars: Set<string>): UserPolicy {
  switch (style) {
    case 'passivo':
      return {
        call: (_u, role, ctx) => cheapest(ctx.pool, role),
        limit: () => 0,
      };
    case 'equilibrato':
      return {
        call: () => null,
        limit: (user, lot, ctx) => fairLimit(user, getFairPrice(lot.player, ctx.market), 1),
      };
    case 'stelle':
      return {
        call: (_u, role, ctx) =>
          ctx.pool.find(p => p.role === role && stars.has(p.id)) ?? cheapest(ctx.pool, role),
        limit: (user, lot) => (stars.has(lot.player.id) ? getMaxBid(user) : 0),
      };
    case 'cecchino':
      return {
        call: () => null,
        // Rilancia solo quando nessun bot vuole più rilanciare
        limit: (user, lot, ctx, botsActive) =>
          botsActive ? 0 : fairLimit(user, getFairPrice(lot.player, ctx.market), SNIPER_MARKUP),
      };
    case 'furbo':
      // Cerca i campioni a buon prezzo: rilancia oltre il prezzo equo sui
      // migliori rimasti del ruolo, sotto il prezzo equo su tutti gli altri
      return {
        call: () => null,
        limit: (user, lot, ctx) => {
          const max = ctx.market.maxBaseValue[lot.player.role];
          const isStar = max > 0 && lot.player.baseValue / max >= SHREWD_STAR_REL;
          const markup = isStar ? SHREWD_STAR_MARKUP : SHREWD_OTHER_MARKUP;
          return fairLimit(user, getFairPrice(lot.player, ctx.market), markup);
        },
      };
  }
}

/** Metriche di una singola asta */
export interface RunMetrics {
  season: string;
  difficulty: DifficultyLevel;
  style: UserStyle;
  seed: number;
  /** Forza (overall medio) di ogni bot */
  botStrengths: number[];
  userStrength: number;
  /** Spesa / budget iniziale di ogni bot */
  botSpend: number[];
  userSpend: number;
  /** Numero di giocatori del top-10 per overall del listone, per squadra (utente incluso) */
  top10PerTeam: number[];
  /** Prezzo pagato per il miglior giocatore (overall) di ogni ruolo */
  topPrice: Record<Player['role'], number>;
  maxPrice: number;
  /** Correlazione di rango (Spearman) prezzo-overall degli acquisti, media sui ruoli */
  priceQuality: number;
  /** Prezzo pagato / prezzo equo iniziale per i migliori 3 di ogni ruolo */
  topFairRatios: number[];
  /** Quanti dei migliori 3 di ogni ruolo (12) prende l'utente */
  userTop3: number;
  /** Migliori 3 di ruolo presi dall'utente a meno del 40% del prezzo equo iniziale */
  userCheapStars: number;
  /** Quota della spesa totale della lega per ruolo */
  roleSpendShare: Record<Player['role'], number>;
  /** Rilanci per lotto */
  bidsPerLot: number[];
  /** Per archetipo: metriche dei bot (un bot può comparire più volte per archetipo) */
  byArchetype: {
    archetype: BotArchetype;
    strength: number;
    spend: number;
    /** Quota della spesa avvenuta nella prima metà dei lotti */
    earlySpendShare: number;
    /** Somma degli overall / crediti spesi */
    overallPerCredit: number;
    /** Quota delle chiamate di tipo drain sul totale delle chiamate del bot */
    drainShare: number;
    /** Il bot ha vinto almeno un suo pupillo (solo cacciatore) */
    wonPupillo: boolean;
  }[];
  /** true se tutte le invarianti d'integrità sono rispettate */
  integrityOk: boolean;
}

/** Migliori `perRole` giocatori di ogni ruolo per overall */
function topByRole(pool: Player[], perRole: number): Set<string> {
  const ids = new Set<string>();
  for (const role of ['P', 'D', 'C', 'A'] as const) {
    pool
      .filter(p => p.role === role)
      .sort((a, b) => playerOverall(b) - playerOverall(a) || b.baseValue - a.baseValue)
      .slice(0, perRole)
      .forEach(p => ids.add(p.id));
  }
  return ids;
}

/**
 * Simula un'asta completa con 8 squadre (utente scriptato + 7 bot) e ne
 * restituisce le metriche. Deterministica per (season, difficulty, style, seed).
 */
export function simulateBalanceRun(
  season: string,
  players: Player[],
  difficulty: DifficultyLevel,
  style: UserStyle,
  seed: number
): RunMetrics {
  const pool = buildAuctionPool(players, LEAGUE_SIZE);
  const teamRng: Rng = createRng(hashSeed('teams', season, difficulty, seed));
  const teams = generateAllTeams('Utente', difficulty, pool, teamRng);
  let world: AuctionWorld = { teams, auction: createInitialAuctionState(pool) };
  world = auctionReducer(world, { type: 'START', callingOrder: teams.map(t => t.id) });

  const stars = topByRole(pool, 2);
  const startMarket = buildMarketSnapshot(world.teams, pool);
  const calls = new Map<string, CallStrategy[]>();
  const lotSpendIndex = new Map<string, number>(); // playerId -> indice del lotto
  const bidsPerLot: number[] = [];
  let lotIndex = 0;

  const end = runAuction(world, {
    rng: createRng(hashSeed('auction', season, difficulty, style, seed)),
    until: 'auction_end',
    startTime: 0,
    userPolicy: makeUserPolicy(style, stars),
    onCall: (teamId, decision) => {
      const list = calls.get(teamId) ?? [];
      list.push(decision.strategy);
      calls.set(teamId, list);
    },
    onLotClosed: lot => {
      bidsPerLot.push(lot.bidHistory.length);
      lotSpendIndex.set(lot.player.id, lotIndex++);
    },
  });

  // Integrità
  const assigned = end.auction.assignedPlayers.map(a => a.playerId);
  let integrityOk =
    end.auction.phase === 'complete' &&
    assigned.length === LEAGUE_SIZE * 8 &&
    new Set(assigned).size === assigned.length;
  for (const team of end.teams) {
    const counts = { P: 0, D: 0, C: 0, A: 0 };
    for (const o of team.roster) counts[o.player.role]++;
    const spent = team.roster.reduce((s, o) => s + o.purchasePrice, 0);
    if (
      counts.P !== 1 || counts.D !== 2 || counts.C !== 3 || counts.A !== 2 ||
      team.credits < 0 || team.credits + spent !== team.initialCredits
    ) {
      integrityOk = false;
    }
  }

  const top10 = new Set(
    [...pool].sort((a, b) => playerOverall(b) - playerOverall(a)).slice(0, 10).map(p => p.id)
  );
  const bestOfRole = topByRole(pool, 1);
  const topPrice: Record<Player['role'], number> = { P: 0, D: 0, C: 0, A: 0 };
  let maxPrice = 0;
  const roleSpend: Record<Player['role'], number> = { P: 0, D: 0, C: 0, A: 0 };
  for (const team of end.teams) {
    for (const o of team.roster) {
      if (bestOfRole.has(o.player.id)) topPrice[o.player.role] = o.purchasePrice;
      maxPrice = Math.max(maxPrice, o.purchasePrice);
      roleSpend[o.player.role] += o.purchasePrice;
    }
  }
  const totalSpend = roleSpend.P + roleSpend.D + roleSpend.C + roleSpend.A;
  const roleSpendShare: Record<Player['role'], number> = {
    P: roleSpend.P / Math.max(1, totalSpend),
    D: roleSpend.D / Math.max(1, totalSpend),
    C: roleSpend.C / Math.max(1, totalSpend),
    A: roleSpend.A / Math.max(1, totalSpend),
  };

  const top3 = topByRole(pool, 3);
  const topFairRatios: number[] = [];
  const bought: Record<Player['role'], { price: number; ovr: number }[]> = { P: [], D: [], C: [], A: [] };
  let userTop3 = 0;
  let userCheapStars = 0;
  for (const team of end.teams) {
    for (const o of team.roster) {
      bought[o.player.role].push({ price: o.purchasePrice, ovr: playerOverall(o.player) });
      if (top3.has(o.player.id)) {
        const ratio = o.purchasePrice / getFairPrice(o.player, startMarket);
        topFairRatios.push(ratio);
        if (team.isUserTeam) {
          userTop3++;
          if (ratio < 0.4) userCheapStars++;
        }
      }
    }
  }
  const priceQuality = mean(
    (['P', 'D', 'C', 'A'] as const).map(r =>
      spearman(bought[r].map(b => b.price), bought[r].map(b => b.ovr))
    )
  );

  const spendOf = (t: Team) => t.roster.reduce((s, o) => s + o.purchasePrice, 0);
  const half = lotIndex / 2;
  const bots = end.teams.filter(t => !t.isUserTeam);
  const user = end.teams.find(t => t.isUserTeam) as Team;

  return {
    season,
    difficulty,
    style,
    seed,
    botStrengths: bots.map(teamStrength),
    userStrength: teamStrength(user),
    botSpend: bots.map(t => spendOf(t) / t.initialCredits),
    userSpend: spendOf(user) / user.initialCredits,
    top10PerTeam: end.teams.map(t => t.roster.filter(o => top10.has(o.player.id)).length),
    topPrice,
    maxPrice,
    priceQuality,
    topFairRatios,
    userTop3,
    userCheapStars,
    roleSpendShare,
    bidsPerLot,
    integrityOk,
    byArchetype: bots.map(t => {
      const spent = spendOf(t);
      const early = t.roster
        .filter(o => (lotSpendIndex.get(o.player.id) ?? 0) < half)
        .reduce((s, o) => s + o.purchasePrice, 0);
      const myCalls = calls.get(t.id) ?? [];
      const config = t.botConfig!;
      return {
        archetype: config.archetype,
        strength: teamStrength(t),
        spend: spent / t.initialCredits,
        earlySpendShare: spent > 0 ? early / spent : 0,
        overallPerCredit: t.roster.reduce((s, o) => s + playerOverall(o.player), 0) / Math.max(1, spent),
        drainShare: myCalls.length > 0 ? myCalls.filter(c => c === 'drain').length / myCalls.length : 0,
        wonPupillo: t.roster.some(o => config.pupilli.includes(o.player.id)),
      };
    }),
  };
}

/** Media aritmetica (0 se vuoto) */
export function mean(xs: number[]): number {
  return xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Ranghi medi (pari merito = media dei ranghi) */
function ranks(xs: number[]): number[] {
  const idx = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}

/** Correlazione di Spearman (0 se una serie è costante o vuota) */
export function spearman(a: number[], b: number[]): number {
  const ra = ranks(a);
  const rb = ranks(b);
  const ma = mean(ra);
  const mb = mean(rb);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/** Mediana (0 se vuoto) */
export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
