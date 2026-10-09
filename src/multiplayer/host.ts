import { Player, Team } from '../types';
import {
  auctionReducer,
  AuctionWorld,
  createInitialAuctionState,
  INITIAL_CREDITS,
  LEAGUE_SIZE,
  shuffle,
} from '../services/auction';
import {
  generateBotConfig,
  generateBotTeams,
  generateTeamId,
} from '../services/teamGenerator';
import {
  BID_GRACE_MS,
  MAX_PLAYERS,
  MIN_HUMANS,
  NICKNAME_MAX,
  PROTOCOL_VERSION,
  TEAM_NAME_MAX,
} from './constants';
import { sameKey } from './crypto';
import { stateHash } from './hash';
import { isOffensiveName } from './moderation';
import { MatchResult, MatchSide, nextStop, Tactic } from '../domain/match';
import { findMatch, simulateBracketMatch } from '../domain/tournament';
import {
  ClientIntent,
  HostMessage,
  RejectReason,
  RoomAction,
  RoomState,
} from './protocol';
/**
 * Logica pura dell'host: traduce gli INTENTI dei client in RoomAction
 * e risposte. Nessun timer e nessuna rete: il chiamante (loop dell'host)
 * passa hostNow e rng, e si occupa di trasmettere azioni e replies.
 *
 * Il libro dei segreti (token, espulsi) resta FUORI da RoomState, che
 * viene trasmesso per intero ai client.
 */

export interface PendingMatchChoices {
  /** Tattica scelta da un lato per lo stop corrente */
  tactics: Partial<Record<MatchSide, { stopTick: number; tactic: Tactic }>>;
  /** Ordine dei rigoristi scelto da un lato */
  orders: Partial<Record<MatchSide, string[]>>;
}

export interface HostBook {
  /** Token segreto per giocatore (rilasciato al primo HELLO) */
  tokens: Record<string, string>;
  /** Giocatori espulsi: non possono rientrare */
  kicked: Set<string>;
  /**
   * Chiave pubblica JWK fissata al primo ingresso accettato di ogni
   * partecipante: gli intenti successivi devono essere firmati con la
   * privata corrispondente. Serializzabile, va nel salvataggio host.
   */
  publicKeys: Record<string, JsonWebKey>;
  /**
   * Scelte delle partite live, segrete fino al MATCH_RESUME:
   * restano in memoria dell'host, mai in RoomState.
   */
  matchChoices: Record<string, PendingMatchChoices>;
}

export function createHostBook(): HostBook {
  return { tokens: {}, kicked: new Set(), publicKeys: {}, matchChoices: {} };
}

export interface HandleResult {
  actions: RoomAction[];
  replies: HostMessage[];
  book: HostBook;
}

function sanitize(text: string, max: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Confronto dei nomi squadra: niente maiuscole, accenti e spazi doppi */
function sameName(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(a) === norm(b);
}

function reject(to: string, reason: RejectReason): HostMessage {
  return { type: 'REJECT', to, reason };
}

function auctionWorld(state: RoomState): AuctionWorld | null {
  return state.auction ? { teams: state.teams, auction: state.auction } : null;
}

function teamIdOf(state: RoomState, playerId: string): string | null {
  return state.teams.find(t => t.ownerId === playerId)?.id ?? null;
}

/** Lato della partita live occupato dal giocatore, null se non gioca */
function liveSideOf(state: RoomState, matchId: string, playerId: string): MatchSide | null {
  const match = state.tournament ? findMatch(state.tournament.bracket, matchId) : undefined;
  const teamId = teamIdOf(state, playerId);
  if (!match || !teamId) return null;
  if (match.homeId === teamId) return 'home';
  if (match.awayId === teamId) return 'away';
  return null;
}

/** Risultato deterministico di una partita live con le opzioni correnti */
function liveResult(state: RoomState, matchId: string): MatchResult | null {
  const live = state.live[matchId];
  if (!state.tournament || !live) return null;
  return simulateBracketMatch(state.tournament, state.teams, matchId, {
    tactics: live.plans,
    shootoutOrder: live.shootoutOrder,
  });
}

function choicesFor(book: HostBook, matchId: string): PendingMatchChoices {
  return book.matchChoices[matchId] ?? { tactics: {}, orders: {} };
}

export function handleIntent(
  state: RoomState,
  book: HostBook,
  fromPlayerId: string,
  intent: ClientIntent,
  hostNow: number,
  rng: () => number
): HandleResult {
  const ok = (actions: RoomAction[] = [], replies: HostMessage[] = []): HandleResult =>
    ({ actions, replies, book });

  switch (intent.type) {
    case 'HELLO': {
      if (intent.protocol !== PROTOCOL_VERSION) {
        return ok([], [reject(fromPlayerId, 'protocol')]);
      }
      // Chiave pubblica fissata al primo ingresso: un rientro con una
      // chiave diversa è rifiutato anche se il token è giusto
      const pinned = book.publicKeys[fromPlayerId];
      if (pinned && (!intent.pubKey || !sameKey(pinned, intent.pubKey))) {
        return ok([], [reject(fromPlayerId, 'bad_token')]);
      }
      const withKey = (b: HostBook): HostBook =>
        pinned || !intent.pubKey ? b : { ...b, publicKeys: { ...b.publicKeys, [fromPlayerId]: intent.pubKey } };
      if (intent.role === 'spectator') {
        // Lo spettatore riceverà lo SNAPSHOT deciso dal trasporto:
        // nessuna azione di stanza, ma la chiave si fissa lo stesso
        return { actions: [], replies: [], book: withKey(book) };
      }
      if (book.kicked.has(fromPlayerId)) {
        return ok([], [reject(fromPlayerId, 'kicked')]);
      }
      const known = state.players.find(p => p.id === fromPlayerId);
      if (known) {
        if (book.tokens[fromPlayerId] !== intent.token) {
          return ok([], [reject(fromPlayerId, 'bad_token')]);
        }
        return ok([{ type: 'PLAYER_CONNECTION', playerId: fromPlayerId, connected: true }]);
      }
      if (state.phase !== 'lobby') {
        return ok([], [reject(fromPlayerId, 'started')]);
      }
      if (state.players.length >= MAX_PLAYERS) {
        return ok([], [reject(fromPlayerId, 'full')]);
      }
      const nickname = sanitize(intent.nickname, NICKNAME_MAX);
      const teamName = sanitize(intent.teamName, TEAM_NAME_MAX);
      if (!nickname || !teamName || isOffensiveName(nickname) || isOffensiveName(teamName)) {
        return ok([], [reject(fromPlayerId, 'invalid')]);
      }
      // Due squadre con lo stesso nome non possono stare nella stanza
      if (state.players.some(p => sameName(p.teamName, teamName))) {
        return ok([], [reject(fromPlayerId, 'name_taken')]);
      }
      const player = {
        id: fromPlayerId,
        nickname,
        teamName,
        connected: true,
        joinedAt: hostNow,
        teamId: null,
      };
      return {
        actions: [{ type: 'PLAYER_JOINED', player }],
        replies: [],
        book: withKey({ ...book, tokens: { ...book.tokens, [fromPlayerId]: intent.token } }),
      };
    }

    case 'CALL': {
      const world = auctionWorld(state);
      const teamId = teamIdOf(state, fromPlayerId);
      if (!world || !teamId) return ok();
      const action = {
        type: 'CALL_PLAYER' as const,
        teamId,
        playerId: intent.footballerId,
        now: hostNow,
        seed: Math.floor(rng() * 0xffffffff),
      };
      // Solo se il turno e le regole lo accettano
      if (auctionReducer(world, action) === world) return ok();
      return ok([{ type: 'AUCTION', action }]);
    }

    case 'BID': {
      const world = auctionWorld(state);
      const teamId = teamIdOf(state, fromPlayerId);
      const lot = world?.auction.lot;
      if (!world || !teamId || !lot || world.auction.phase !== 'bidding') return ok();
      // Tolleranza: un rilancio in viaggio entro BID_GRACE resta valido
      // e la nuova deadline riparte dalla vecchia
      if (hostNow > lot.deadline + BID_GRACE_MS) return ok();
      const action = {
        type: 'BID' as const,
        teamId,
        amount: intent.amount,
        now: Math.min(hostNow, lot.deadline),
      };
      if (auctionReducer(world, action) === world) return ok();
      return ok([{ type: 'AUCTION', action }]);
    }

    case 'TACTIC': {
      const live = state.live[intent.matchId];
      const side = liveSideOf(state, intent.matchId, fromPlayerId);
      if (!live || !side || !live.humanSides.includes(side)) return ok();
      const result = liveResult(state, intent.matchId);
      if (!result) return ok();
      const stop = nextStop(result, live.anchorTick, live.resolvedStops, true);
      // Vale solo la scelta per lo stop di decisione corrente
      if (intent.stopTick !== stop || !result.decisionTicks.includes(stop + 1)) return ok();
      const cur = choicesFor(book, intent.matchId);
      return {
        actions: [],
        replies: [],
        book: {
          ...book,
          matchChoices: {
            ...book.matchChoices,
            [intent.matchId]: {
              ...cur,
              tactics: { ...cur.tactics, [side]: { stopTick: stop, tactic: intent.tactic } },
            },
          },
        },
      };
    }

    case 'SHOOTOUT_ORDER': {
      const live = state.live[intent.matchId];
      const side = liveSideOf(state, intent.matchId, fromPlayerId);
      if (!live || !side || !live.humanSides.includes(side)) return ok();
      const result = liveResult(state, intent.matchId);
      if (!result || !result.shootout) return ok();
      const stop = nextStop(result, live.anchorTick, live.resolvedStops, true);
      if (stop !== result.fullTimeTick) return ok();
      const cur = choicesFor(book, intent.matchId);
      return {
        actions: [],
        replies: [],
        book: {
          ...book,
          matchChoices: {
            ...book.matchChoices,
            [intent.matchId]: {
              ...cur,
              orders: { ...cur.orders, [side]: intent.order },
            },
          },
        },
      };
    }

    case 'PING':
      return ok([], [{ type: 'PONG', to: fromPlayerId, t: intent.t, hostNow }]);

    case 'RESYNC':
      return ok([], [{
        type: 'SNAPSHOT',
        rev: state.rev,
        state,
        hash: stateHash(state),
        hostNow,
      }]);

    default:
      return ok();
  }
}

// ---------------------------------------------------------------------------
// Comandi dell'host (non intenti)
// ---------------------------------------------------------------------------

/**
 * Costruisce il mondo iniziale dell'asta multiplayer.
 * Richiede almeno MIN_HUMANS giocatori; i posti liberi vanno sempre
 * ai bot. Ogni umano (in ordine di ingresso) ottiene una squadra col
 * suo teamName, controller 'human' e un botConfig 'equilibrato' per
 * l'autopilota in caso di disconnessione.
 */
export function buildStartAuction(
  state: RoomState,
  pool: Player[],
  rng: () => number
): RoomAction | null {
  const humans = state.players;
  // In sviluppo basta l'host, come promesso dal pulsante della lobby
  const minHumans = import.meta.env.DEV ? 1 : MIN_HUMANS;
  if (humans.length < minHumans) return null;
  if (state.phase !== 'lobby') return null;

  const difficulty = state.settings.difficulty;

  const humanTeams: Team[] = humans.map((p, index) => ({
    // Indici oltre LEAGUE_SIZE: mai in collisione con quelli dei bot (1..7)
    id: generateTeamId(LEAGUE_SIZE + index, rng),
    name: p.teamName,
    isUserTeam: false,
    credits: INITIAL_CREDITS,
    initialCredits: INITIAL_CREDITS,
    roster: [],
    // Per l'autopilota in caso di disconnessione: stessa forma dei bot
    botConfig: generateBotConfig(difficulty, 'equilibrato', pool, rng),
    controller: 'human',
    ownerId: p.id,
  }));

  const botCount = LEAGUE_SIZE - humanTeams.length;
  const botTeams = generateBotTeams(
    botCount,
    INITIAL_CREDITS,
    difficulty,
    pool,
    '',                       // nessun "nome utente" nel senso classico
    rng,
    humans.map(p => p.teamName)
  ).map(t => ({ ...t, controller: 'bot' as const }));

  return {
    type: 'START_AUCTION',
    teams: [...humanTeams, ...botTeams],
    auction: createInitialAuctionState(pool),
  };
}

/** Azione START dell'asta: tutte le 8 squadre in ordine casuale */
export function buildStartCalling(
  state: RoomState,
  rng: () => number
): RoomAction {
  return {
    type: 'AUCTION',
    action: {
      type: 'START',
      callingOrder: shuffle(state.teams.map(t => t.id), rng),
    },
  };
}
