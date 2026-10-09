import { describe, it, expect } from 'vitest';
import { applyHostAction, createRoom } from './roomReducer';
import { buildStartAuction, buildStartCalling, createHostBook, handleIntent } from './host';
import { resultHash, stateHash } from './hash';
import { PROTOCOL_VERSION } from './constants';
import { RoomAction, RoomState } from './protocol';
import {
  createRng,
  getCurrentCallerId,
  ROLE_ORDER,
} from '../services/auction';
import {
  drawOrder,
  findMatch,
  getMatchStatus,
  roundMatches,
  simulateBracketMatch,
} from '../domain/tournament';
import { createTestPlayer } from '../test/testUtils';
import { Player, PlayerRole } from '../types';

const T0 = 1_000_000;
const rng = createRng(1234);
let now = T0;
const tick = (ms = 100) => (now += ms);

/** Pool minimo per 8 squadre: 96 giocatori (1.5x8 per slot di ruolo) */
function makePool(): Player[] {
  const counts: Record<PlayerRole, number> = { P: 12, D: 24, C: 36, A: 24 };
  const pool: Player[] = [];
  for (const role of ROLE_ORDER) {
    for (let i = 0; i < counts[role]; i++) {
      pool.push(
        createTestPlayer({ id: `${role}${i}`, role, baseValue: 40 - (i % 20), avgRating: 7 })
      );
    }
  }
  return pool;
}

/** Prossima azione d'asta che fa avanzare il mondo (chiamata del primo del ruolo, niente rilanci) */
function nextAuctionAction(state: RoomState) {
  const a = state.auction!;
  switch (a.phase) {
    case 'idle':
      return null;
    case 'calling': {
      const callerId = getCurrentCallerId(a)!;
      const player = a.remainingPlayers.find(p => p.role === a.currentRole)!;
      return { type: 'CALL_PLAYER' as const, teamId: callerId, playerId: player.id, now: tick(500), seed: 1 };
    }
    case 'bidding':
      return { type: 'CLOSE_LOT' as const, now: a.lot!.deadline };
    case 'sold':
      return { type: 'ADVANCE' as const };
    case 'role_complete':
      return { type: 'CONTINUE' as const };
    default:
      return null;
  }
}

/** Applica un'azione su host e clone-client e verifica l'uguaglianza degli hash */
function applyBoth(host: RoomState, client: RoomState, rev: number, action: RoomAction) {
  const h = applyHostAction(host, rev, action);
  const c = applyHostAction(client, rev, action);
  expect(h === host).toBe(c === client); // accettata o rifiutata identicamente
  if (h !== host) {
    expect(stateHash(c)).toBe(stateHash(h));
  }
  return { host: h, client: c };
}

describe('simulazione stanza completa (host autorevole)', () => {
  it('lobby -> asta -> torneo -> finale con hash identico su host e client', () => {
    // Lobby: host + 2 giocatori via intenti HELLO/READY
    let book = createHostBook();
    let rev = 0;
    let host = createRoom({
      code: 'ABCDE', hostId: 'h1',
      host: { nickname: 'Host', teamName: 'Host FC' },
      settings: { season: '2024-25', difficulty: 'normale' },
      now: T0,
    });
    for (const id of ['p2', 'p3']) {
      const r = handleIntent(host, book, id, {
        type: 'HELLO', playerId: id, token: `tok-${id}`,
        nickname: `N${id}`, teamName: `Team ${id}`,
        protocol: PROTOCOL_VERSION, role: 'player',
      }, T0, rng);
      book = r.book;
      const joined = applyHostAction(host, ++rev, r.actions[0]);
      expect(joined).not.toBe(host);
      host = joined;
    }

    // Avvio: il client parte dallo SNAPSHOT iniziale (clone JSON)
    let client = JSON.parse(JSON.stringify(host)) as RoomState;
    expect(stateHash(client)).toBe(stateHash(host));

    // START_AUCTION + START (calling)
    const pool = makePool();
    const start = buildStartAuction(host, pool, rng)!;
    ({ host, client } = applyBoth(host, client, ++rev, start));
    ({ host, client } = applyBoth(host, client, ++rev, buildStartCalling(host, rng)));

    // Asta completa: ogni passo è un'azione AUCTION su entrambi gli stati
    let guard = 0;
    while (host.auction!.phase !== 'complete' && guard++ < 2000) {
      const action = nextAuctionAction(host)!;
      ({ host, client } = applyBoth(host, client, ++rev, { type: 'AUCTION', action }));
    }
    expect(host.auction!.phase).toBe('complete');

    // Invarianti di fine asta
    for (const t of host.teams) {
      expect(t.credits).toBeGreaterThanOrEqual(0);
      expect(t.roster).toHaveLength(8);
    }
    const assignedIds = host.teams.flatMap(t => t.roster.map(o => o.player.id));
    expect(new Set(assignedIds).size).toBe(assignedIds.length);
    expect(assignedIds).toHaveLength(64);

    // Torneo: sorteggio + tutte le partite via MATCH_RECORD verificato
    ({ host, client } = applyBoth(host, client, ++rev, { type: 'START_TOURNAMENT', seed: 777 }));
    const order = drawOrder(host.tournament!, rng);
    ({ host, client } = applyBoth(host, client, ++rev, { type: 'TOURNAMENT', action: { type: 'DRAW', order } }));

    guard = 0;
    while (host.tournament!.status !== 'completed' && guard++ < 20) {
      const round = host.tournament!.status as 'quarterfinals' | 'semifinals' | 'final';
      for (const m of roundMatches(host.tournament!.bracket, round)) {
        if (getMatchStatus(host.tournament!, m) !== 'ready') continue;
        // L'host simula (IA su entrambi i lati -> options vuote) e certifica l'hash
        const result = simulateBracketMatch(host.tournament!, host.teams, m.id, {});
        const action: RoomAction = {
          type: 'MATCH_RECORD',
          matchId: m.id,
          seed: findMatch(host.tournament!.bracket, m.id)!.seed,
          options: {},
          resultHash: resultHash(result),
        };
        ({ host, client } = applyBoth(host, client, ++rev, action));
      }
      // se nessuna partita era pronta qualcosa non va
      expect(guard).toBeLessThan(10);
    }
    expect(host.tournament!.status).toBe('completed');

    ({ host, client } = applyBoth(host, client, ++rev, { type: 'FINISH' }));
    expect(host.phase).toBe('final');
    expect(stateHash(client)).toBe(stateHash(host));
  });
});
