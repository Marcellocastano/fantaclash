import { AuctionLot, BotConfig, Player, PlayerRole, Team } from '../../types';
import { Rng } from './rng';
import { getMaxBid, needsRole } from './rules';
import { STANDARD_INCREMENT_RATE } from './botBidding';
import { buildMarketSnapshot } from './market';
import { ValuationContext } from './botValuation';
import { chooseBotResponder } from './botBidding';
import { CallDecision, chooseBotCall } from './botCalling';
import {
  AuctionWorld,
  auctionReducer,
  getCurrentCallerId,
} from './session';

/**
 * Simulatore d'asta: fa avanzare la macchina a stati con un orologio
 * virtuale, usando le stesse decisioni dei bot del gioco reale.
 * Poiché passa solo da auctionReducer, una simulazione avviata a metà
 * di un lotto lo chiude correttamente senza doppie assegnazioni.
 */

/** Numero massimo di passi prima di abortire (protezione anti-loop) */
const MAX_STEPS = 20000;

/**
 * BotConfig neutro usato quando la squadra utente è in autopilota
 */
export const AUTOPILOT_BOT_CONFIG: BotConfig = {
  difficulty: 'normale',
  archetype: 'equilibrato',
  rolePreferences: { P: 1, D: 1, C: 1, A: 1 },
  pupilli: [],
};

/**
 * Opzioni di esecuzione della simulazione
 */
export interface RunOptions {
  /** Sorgente di casualità */
  rng: Rng;
  /**
   * Condizione di stop: 'lot_end' alla chiusura del lotto corrente (o del
   * prossimo, se un bot deve ancora chiamare), 'role_end' alla fine del
   * reparto, 'auction_end' alla fine dell'asta
   */
  until: 'lot_end' | 'role_end' | 'auction_end';
  /** Orologio virtuale di partenza (timestamp ms) */
  startTime: number;
  /** Se true, la squadra utente chiama e rilancia come un bot medio */
  userAutopilot?: boolean;
  /** Callback opzionale invocata ad ogni chiamata decisa */
  onCall?: (teamId: string, decision: CallDecision) => void;
  /** Strategia scriptata della squadra utente (ha la precedenza sull'autopilota) */
  userPolicy?: UserPolicy;
  /** Callback opzionale invocata con il lotto un istante prima della chiusura */
  onLotClosed?: (lot: AuctionLot, world: AuctionWorld) => void;
}

/**
 * Strategia scriptata dell'utente, usata dalla suite di equilibrio per
 * simulare stili di gioco umani contro i bot.
 */
export interface UserPolicy {
  /** Giocatore da chiamare; null = scelta dell'autopilota */
  call(user: Team, role: PlayerRole, ctx: ValuationContext & { pool: Player[] }, rng: Rng): Player | null;
  /**
   * Limite dell'utente sul lotto (0 = non rilancia).
   * botsActive indica se almeno un bot vuole ancora rilanciare.
   */
  limit(user: Team, lot: AuctionLot, ctx: ValuationContext, botsActive: boolean): number;
}

/** Offerta dell'utente scriptato, o null se non rilancia */
function decideUserBid(
  user: Team,
  lot: AuctionLot,
  ctx: ValuationContext,
  policy: UserPolicy,
  botsActive: boolean
): { teamId: string; amount: number; limit: number } | null {
  if (user.id === lot.currentBidderId || !needsRole(user, lot.player.role)) return null;
  const limit = Math.min(policy.limit(user, lot, ctx, botsActive), getMaxBid(user));
  if (limit <= lot.currentBid) return null;
  const increment = Math.max(1, Math.round(lot.currentBid * STANDARD_INCREMENT_RATE));
  return { teamId: user.id, amount: Math.min(lot.currentBid + increment, limit), limit };
}

/** Restituisce la squadra trattata come bot (autopilota per l'utente) */
function asBot(team: Team): Team {
  return team.botConfig ? team : { ...team, botConfig: AUTOPILOT_BOT_CONFIG };
}

/**
 * Esegue la simulazione fino alla condizione richiesta o finché
 * la macchina a stati si ferma in attesa di input dell'utente.
 */
export function runAuction(world: AuctionWorld, opts: RunOptions): AuctionWorld {
  const { rng, until, userPolicy, onCall, onLotClosed } = opts;
  const userAutopilot = !userPolicy && (opts.userAutopilot ?? false);
  let current = world;
  let clock = opts.startTime;
  let lotSnapshotKey: string | null = null;
  let lotCtx: ValuationContext | null = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const { auction, teams } = current;

    switch (auction.phase) {
      case 'idle':
      case 'complete':
        return current;

      case 'calling': {
        const callerId = getCurrentCallerId(auction);
        const caller = callerId ? teams.find(t => t.id === callerId) : undefined;
        if (!caller || !auction.currentRole) return current;
        if (caller.isUserTeam && !userAutopilot && !userPolicy) return current;

        const ctx: ValuationContext & { pool: typeof auction.remainingPlayers } = {
          teams,
          market: buildMarketSnapshot(teams, auction.remainingPlayers),
          pool: auction.remainingPlayers,
        };
        const scripted =
          caller.isUserTeam && userPolicy
            ? userPolicy.call(caller, auction.currentRole, ctx, rng)
            : null;
        const decision: CallDecision | null = scripted
          ? { player: scripted, strategy: 'value', score: 0 }
          : chooseBotCall(asBot(caller), auction.currentRole, ctx, rng);
        if (!decision) return current;
        onCall?.(caller.id, decision);

        const seed = Math.floor(rng() * 0xffffffff);
        const next = auctionReducer(current, {
          type: 'CALL_PLAYER',
          teamId: caller.id,
          playerId: decision.player.id,
          now: clock,
          seed,
        });
        if (next === current) return current;
        current = next;
        break;
      }

      case 'bidding': {
        const lot = auction.lot as AuctionLot;
        // Snapshot di mercato costruito una sola volta per lotto
        const key = `${lot.player.id}:${lot.seed}`;
        if (lotSnapshotKey !== key || !lotCtx) {
          lotSnapshotKey = key;
          lotCtx = { teams, market: buildMarketSnapshot(teams, auction.remainingPlayers) };
        }

        const bidders = teams
          .filter(t => !t.isUserTeam || userAutopilot)
          .map(asBot);

        const botResponder = chooseBotResponder(bidders, lot, lotCtx, rng);
        let responder: { teamId: string; amount: number; limit: number } | null = botResponder;
        const user = userPolicy ? teams.find(t => t.isUserTeam) : undefined;
        if (user && userPolicy) {
          const userBid = decideUserBid(user, lot, lotCtx, userPolicy, !!botResponder);
          if (userBid) {
            const userGap = userBid.limit - lot.currentBid;
            const botGap = botResponder ? botResponder.limit - lot.currentBid : 0;
            if (!botResponder || rng() * (userGap + botGap) < userGap) responder = userBid;
          }
        }
        if (!responder) onLotClosed?.(lot, current);
        if (responder) {
          clock = Math.max(clock, lot.deadline - 1);
          const next = auctionReducer(current, {
            type: 'BID',
            teamId: responder.teamId,
            amount: responder.amount,
            now: clock,
          });
          if (next === current) {
            // Rilancio rifiutato: chiudi il lotto per evitare loop
            onLotClosed?.(lot, current);
            clock = Math.max(clock, lot.deadline);
            current = auctionReducer(current, { type: 'CLOSE_LOT', now: clock });
          } else {
            current = next;
          }
        } else {
          clock = Math.max(clock, lot.deadline);
          current = auctionReducer(current, { type: 'CLOSE_LOT', now: clock });
        }
        break;
      }

      case 'sold':
        if (until === 'lot_end') return current;
        current = auctionReducer(current, { type: 'ADVANCE' });
        break;

      case 'role_complete':
        if (until !== 'auction_end') return current;
        current = auctionReducer(current, { type: 'CONTINUE' });
        break;

      default:
        return current;
    }
  }

  throw new Error(`runAuction: superato il limite di ${MAX_STEPS} passi`);
}
