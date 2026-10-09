import { Team } from '../types';
import { auctionReducer, AuctionWorld } from '../services/auction';
import {
  createTournament,
  findMatch,
  getMatchStatus,
  simulateBracketMatch,
  tournamentReducer,
} from '../domain/tournament';
import { MatchOptions, withTacticChange } from '../domain/match';
import { resultHash } from './hash';
import {
  MAX_PLAYERS,
  PROTOCOL_VERSION,
} from './constants';
import {
  RoomAction,
  RoomPlayer,
  RoomSettings,
  RoomState,
} from './protocol';

/**
 * Macchina a stati pura della stanza. Stesse regole degli altri reducer
 * del repo: azione invalida -> STESSA referenza, così i chiamanti
 * possono rilevare il rifiuto con un confronto `===`.
 */

export interface CreateRoomInput {
  code: string;
  hostId: string;
  host: { nickname: string; teamName: string };
  settings: RoomSettings;
  now: number;
}

/** Crea la stanza in lobby con l'host come primo giocatore */
export function createRoom({ code, hostId, host, settings, now }: CreateRoomInput): RoomState {
  const hostPlayer: RoomPlayer = {
    id: hostId,
    nickname: host.nickname,
    teamName: host.teamName,
    connected: true,
    joinedAt: now,
    teamId: null,
  };
  return {
    protocol: PROTOCOL_VERSION,
    code,
    rev: 0,
    phase: 'lobby',
    hostId,
    settings,
    players: [hostPlayer],
    teams: [],
    auction: null,
    tournament: null,
    callDeadline: null,
    live: {},
  };
}

function withPlayers(state: RoomState, players: RoomPlayer[]): RoomState {
  return { ...state, players };
}

function updatePlayer(
  state: RoomState,
  playerId: string,
  patch: Partial<RoomPlayer>
): RoomState {
  if (!state.players.some(p => p.id === playerId)) return state;
  return withPlayers(
    state,
    state.players.map(p => (p.id === playerId ? { ...p, ...patch } : p))
  );
}

/** Segna connesso/assente e aggiorna il controller della sua squadra */
function setConnected(state: RoomState, playerId: string, connected: boolean): RoomState {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.connected === connected) return state;
  const next = updatePlayer(state, playerId, { connected });
  if (next.phase === 'lobby') return next;
  const team = next.teams.find(t => t.ownerId === playerId);
  const controller: Team['controller'] = connected ? 'human' : 'autopilot';
  if (!team || team.controller === controller) return next;
  return {
    ...next,
    teams: next.teams.map(t => (t.ownerId === playerId ? { ...t, controller } : t)),
  };
}

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'PLAYER_JOINED': {
      if (state.phase !== 'lobby') return state;
      if (state.players.length >= MAX_PLAYERS) return state;
      if (state.players.some(p => p.id === action.player.id)) return state;
      return withPlayers(state, [...state.players, action.player]);
    }

    case 'PLAYER_LEFT': {
      if (state.phase === 'lobby') {
        if (!state.players.some(p => p.id === action.playerId)) return state;
        return withPlayers(state, state.players.filter(p => p.id !== action.playerId));
      }
      // A partita iniziata equivale a una disconnessione
      return setConnected(state, action.playerId, false);
    }

    case 'PLAYER_CONNECTION':
      return setConnected(state, action.playerId, action.connected);

    case 'PLAYER_KICKED': {
      if (state.phase !== 'lobby') return state;
      if (action.playerId === state.hostId) return state;
      if (!state.players.some(p => p.id === action.playerId)) return state;
      return withPlayers(state, state.players.filter(p => p.id !== action.playerId));
    }

    case 'SETTINGS': {
      if (state.phase !== 'lobby') return state;
      // La difficoltà dei bot non si cambia in stanza: fissa a 'normale'
      const rest = { ...action.settings };
      delete rest.difficulty;
      return { ...state, settings: { ...state.settings, ...rest } };
    }

    case 'START_AUCTION': {
      if (state.phase !== 'lobby') return state;
      // Proietta teamId sui giocatori che possiedono una squadra
      const players = state.players.map(p => {
        const team = action.teams.find(t => t.ownerId === p.id);
        return team && p.teamId !== team.id ? { ...p, teamId: team.id } : p;
      });
      return {
        ...state,
        phase: 'auction',
        players,
        teams: action.teams,
        auction: action.auction,
      };
    }

    case 'AUCTION': {
      if (state.phase !== 'auction' || !state.auction) return state;
      const world: AuctionWorld = { teams: state.teams, auction: state.auction };
      const next = auctionReducer(world, action.action);
      if (next === world) return state;
      return { ...state, teams: next.teams, auction: next.auction };
    }

    case 'CALL_DEADLINE': {
      if (state.phase !== 'auction' || state.callDeadline === action.deadline) return state;
      return { ...state, callDeadline: action.deadline };
    }

    case 'START_TOURNAMENT': {
      if (state.phase !== 'auction' || state.auction?.phase !== 'complete') return state;
      return {
        ...state,
        phase: 'tournament',
        tournament: createTournament({
          teams: state.teams,
          seasonId: state.settings.season,
          seed: action.seed,
        }),
      };
    }

    case 'TOURNAMENT': {
      if (state.phase !== 'tournament' || !state.tournament) return state;
      const next = tournamentReducer(state.tournament, action.action);
      if (next === state.tournament) return state;
      return { ...state, tournament: next };
    }

    case 'MATCH_RECORD': {
      if (state.phase !== 'tournament' || !state.tournament) return state;
      const match = findMatch(state.tournament.bracket, action.matchId);
      // Il seme della partita vive nel tabellone: deve coincidere
      if (!match || match.seed !== action.seed) return state;
      // Per una partita live le opzioni autorevoli sono quelle accumulate
      // nella stanza (piani tattici e ordini dei rigori dei lati umani)
      const live = state.live[action.matchId];
      const options: MatchOptions = live
        ? { tactics: live.plans, shootoutOrder: live.shootoutOrder }
        : action.options;
      const result = simulateBracketMatch(state.tournament, state.teams, action.matchId, options);
      if (resultHash(result) !== action.resultHash) return state;
      const next = tournamentReducer(state.tournament, {
        type: 'RECORD_RESULT',
        matchId: action.matchId,
        result,
      });
      if (next === state.tournament) return state;
      const live2 = { ...state.live };
      delete live2[action.matchId];
      return { ...state, tournament: next, live: live2 };
    }

    case 'MATCH_START': {
      if (state.phase !== 'tournament' || !state.tournament) return state;
      const match = findMatch(state.tournament.bracket, action.matchId);
      if (!match || getMatchStatus(state.tournament, match) !== 'ready') return state;
      if (state.live[action.matchId]) return state;
      return {
        ...state,
        live: {
          ...state.live,
          [action.matchId]: {
            matchId: action.matchId,
            humanSides: action.humanSides,
            // Ogni lato umano ha SEMPRE un piano (vuoto = niente IA)
            plans: Object.fromEntries(action.humanSides.map(side => [side, []])),
            shootoutOrder: {},
            anchorTick: 0,
            anchorAt: action.startAt,
            resolvedStops: [],
          },
        },
      };
    }

    case 'MATCH_RESUME': {
      const live = state.live[action.matchId];
      if (!live || action.stopTick < live.anchorTick) return state;
      const plans = { ...live.plans };
      for (const [side, tactic] of Object.entries(action.tactics ?? {})) {
        if (!tactic) continue;
        const s = side as 'home' | 'away';
        plans[s] = withTacticChange(plans[s] ?? [], action.stopTick + 1, tactic);
      }
      return {
        ...state,
        live: {
          ...state.live,
          [action.matchId]: {
            ...live,
            plans,
            shootoutOrder: { ...live.shootoutOrder, ...(action.shootoutOrder ?? {}) },
            anchorTick: action.stopTick,
            anchorAt: action.at,
            resolvedStops: live.resolvedStops.includes(action.stopTick)
              ? live.resolvedStops
              : [...live.resolvedStops, action.stopTick],
          },
        },
      };
    }

    case 'TIME_SHIFT': {
      // Pausa dell'host (ricarica): le scadenze slittano in avanti di `by`
      if (action.by <= 0) return state;
      const auction = state.auction?.lot
        ? {
            ...state.auction,
            lot: { ...state.auction.lot, deadline: state.auction.lot.deadline + action.by },
          }
        : state.auction;
      const live = Object.keys(state.live).length
        ? Object.fromEntries(
            Object.entries(state.live).map(([id, m]) => [id, { ...m, anchorAt: m.anchorAt + action.by }])
          )
        : state.live;
      return {
        ...state,
        auction,
        callDeadline: state.callDeadline !== null ? state.callDeadline + action.by : null,
        live,
      };
    }

    case 'FINISH': {
      if (state.phase !== 'tournament' || state.tournament?.status !== 'completed') return state;
      return { ...state, phase: 'final' };
    }

    default:
      return state;
  }
}

/**
 * Applica un'azione numerata: se il reducer la accetta aggiorna `rev`,
 * altrimenti restituisce la stessa referenza (rifiuto rilevabile con `===`).
 */
export function applyHostAction(state: RoomState, rev: number, action: RoomAction): RoomState {
  const next = roomReducer(state, action);
  if (next === state) return state;
  return { ...next, rev };
}
