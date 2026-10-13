import { describe, it, expect } from 'vitest';
import {
  buildStartAuction,
  buildStartCalling,
  createHostBook,
  handleIntent,
  HostBook,
} from './host';
import { applyHostAction, createRoom, roomReducer } from './roomReducer';
import { RoomState, RoomAction } from './protocol';
import { createInitialAuctionState } from '../services/auction';
import { createRng } from '../services/auction';
import { LOT_DURATION_MS } from '../services/auction';
import { BID_GRACE_MS, PROTOCOL_VERSION } from './constants';
import { buildLineupWindow } from './hostTournament';
import { autoLineup, bestLineup } from '../domain/teams/formations';
import { buildRoster, createTestPlayer, createTestTeam } from '../test/testUtils';
import { Player, Team } from '../types';

const T0 = 1_000_000;
const rng = createRng(7);
const FULL = { P: 1, D: 4, C: 4, A: 3 } as const;
const SETTINGS = { season: '2024-25', difficulty: 'normale' as const };

function lobby(): RoomState {
  return createRoom({
    code: 'ABC23',
    hostId: 'h1',
    host: { nickname: 'Host', teamName: 'Host FC' },
    settings: SETTINGS,
    now: T0,
  });
}

function hello(id: string, overrides = {}) {
  return {
    type: 'HELLO' as const, playerId: id, token: `tok-${id}`,
    nickname: `Nick ${id}`, teamName: `Team ${id}`,
    protocol: PROTOCOL_VERSION, role: 'player' as const, ...overrides,
  };
}

function joinPlayer(state: RoomState, book: HostBook, id: string): { state: RoomState; book: HostBook } {
  const r = handleIntent(state, book, id, hello(id), T0, rng);
  const next = applyHostAction(state, state.rev + 1, r.actions[0]);
  return { state: next === state ? state : next, book: r.book };
}

function makePool(n = 4): Player[] {
  return Array.from({ length: n }, (_, i) =>
    createTestPlayer({ id: `fp${i}`, role: 'P', baseValue: 10 + i })
  );
}

/** Stanza in fase asta con 2 umani + 1 bot, caller = squadra di h1 */
function auctionRoom(): RoomState {
  const base = lobby();
  const teams: Team[] = [
    createTestTeam({ id: 'ta', isUserTeam: false, controller: 'human', ownerId: 'h1' }),
    createTestTeam({ id: 'tb', isUserTeam: false, controller: 'human', ownerId: 'p2' }),
    createTestTeam({ id: 'tc', isUserTeam: false, controller: 'bot' }),
  ];
  const auction = createInitialAuctionState(makePool());
  const withPlayers = {
    ...base,
    players: [
      ...base.players,
      { id: 'p2', nickname: 'P2', teamName: 'T2', connected: true, joinedAt: T0, teamId: 'tb' },
    ],
  };
  const started = applyHostAction(withPlayers, 1, { type: 'START_AUCTION', teams, auction });
  return applyHostAction(started, 2, {
    type: 'AUCTION',
    action: { type: 'START', callingOrder: ['ta', 'tb', 'tc'] },
  });
}

describe('handleIntent HELLO', () => {
  it('protocol diverso -> REJECT protocol', () => {
    const r = handleIntent(lobby(), createHostBook(), 'x', hello('x', { protocol: 99 }), T0, rng);
    expect(r.replies).toEqual([{ type: 'REJECT', to: 'x', reason: 'protocol' }]);
    expect(r.actions).toHaveLength(0);
  });

  it('spectator -> nessuna azione', () => {
    const r = handleIntent(lobby(), createHostBook(), 's1', hello('s1', { role: 'spectator' }), T0, rng);
    expect(r.actions).toHaveLength(0);
    expect(r.replies).toHaveLength(0);
  });

  it('nuovo giocatore in lobby -> PLAYER_JOINED + token registrato', () => {
    const book = createHostBook();
    const r = handleIntent(lobby(), book, 'p2', hello('p2'), T0, rng);
    expect(r.actions[0].type).toBe('PLAYER_JOINED');
    expect(r.book.tokens['p2']).toBe('tok-p2');
  });

  it('nickname/teamName ripuliti e troncati; vuoti -> REJECT invalid', () => {
    const r = handleIntent(
      lobby(), createHostBook(), 'p2',
      hello('p2', { nickname: '  abc  ', teamName: 'X'.repeat(100) }), T0, rng
    );
    const joined = r.actions[0] as Extract<RoomAction, { type: 'PLAYER_JOINED' }>;
    expect(joined.player.nickname).toBe('abc');
    expect(joined.player.teamName).toHaveLength(30);

    const empty = handleIntent(lobby(), createHostBook(), 'p3', hello('p3', { nickname: '   ' }), T0, rng);
    expect(empty.replies[0]).toMatchObject({ type: 'REJECT', reason: 'invalid' });
  });

  it('nome squadra già in stanza (maiuscole/accenti/spazi a parte) -> REJECT name_taken', () => {
    for (const teamName of ['Host FC', '  host   fc ', 'HÒST FC']) {
      const r = handleIntent(lobby(), createHostBook(), 'p2', hello('p2', { teamName }), T0, rng);
      expect(r.actions).toHaveLength(0);
      expect(r.replies).toEqual([{ type: 'REJECT', to: 'p2', reason: 'name_taken' }]);
    }
    const ok = handleIntent(lobby(), createHostBook(), 'p2', hello('p2', { teamName: 'Host FC 2' }), T0, rng);
    expect(ok.actions[0].type).toBe('PLAYER_JOINED');
  });

  it('giocatore noto con token giusto -> PLAYER_CONNECTION; token errato -> bad_token', () => {
    let book = createHostBook();
    let s = lobby();
    ({ state: s, book } = joinPlayer(s, book, 'p2'));
    const again = handleIntent(s, book, 'p2', hello('p2'), T0, rng);
    expect(again.actions).toEqual([{ type: 'PLAYER_CONNECTION', playerId: 'p2', connected: true }]);

    const bad = handleIntent(s, book, 'p2', hello('p2', { token: 'nope' }), T0, rng);
    expect(bad.replies[0]).toMatchObject({ type: 'REJECT', reason: 'bad_token' });
  });

  it('partita iniziata e sconosciuto -> REJECT started', () => {
    const s = auctionRoom();
    const r = handleIntent(s, createHostBook(), 'newbie', hello('newbie'), T0, rng);
    expect(r.replies[0]).toMatchObject({ type: 'REJECT', reason: 'started' });
  });

  it('lobby piena -> REJECT full', () => {
    let s = lobby();
    let book = createHostBook();
    for (let i = 0; i < 7; i++) ({ state: s, book } = joinPlayer(s, book, `p${i}`));
    const r = handleIntent(s, book, 'overflow', hello('overflow'), T0, rng);
    expect(r.replies[0]).toMatchObject({ type: 'REJECT', reason: 'full' });
  });

  it('espulso -> REJECT kicked', () => {
    const book = createHostBook();
    book.kicked.add('p2');
    const r = handleIntent(lobby(), book, 'p2', hello('p2'), T0, rng);
    expect(r.replies[0]).toMatchObject({ type: 'REJECT', reason: 'kicked' });
  });
});

describe('handleIntent CALL/BID', () => {
  it('CALL accettata solo al proprio turno', () => {
    const s = auctionRoom();
    const book = createHostBook();
    const mine = handleIntent(s, book, 'h1', { type: 'CALL', footballerId: 'fp0' }, T0, rng);
    expect(mine.actions).toHaveLength(1);
    expect(mine.actions[0]).toMatchObject({
      type: 'AUCTION',
      action: { type: 'CALL_PLAYER', teamId: 'ta', playerId: 'fp0', now: T0 },
    });
    const notMine = handleIntent(s, book, 'p2', { type: 'CALL', footballerId: 'fp0' }, T0, rng);
    expect(notMine.actions).toHaveLength(0);
  });

  function biddingRoom(): RoomState {
    const s = auctionRoom();
    return applyHostAction(s, s.rev + 1, {
      type: 'AUCTION',
      action: { type: 'CALL_PLAYER', teamId: 'ta', playerId: 'fp0', now: T0, seed: 1 },
    });
  }

  it('BID entro la grazia è accettato con now = deadline; oltre è rifiutato', () => {
    const s = biddingRoom();
    const deadline = s.auction!.lot!.deadline;
    expect(deadline).toBe(T0 + LOT_DURATION_MS);

    const inGrace = handleIntent(s, createHostBook(), 'p2', { type: 'BID', amount: 5 }, deadline + 200, rng);
    expect(inGrace.actions[0]).toMatchObject({
      type: 'AUCTION',
      action: { type: 'BID', teamId: 'tb', amount: 5, now: deadline },
    });
    expect(deadline + 200).toBeLessThanOrEqual(deadline + BID_GRACE_MS);

    const tooLate = handleIntent(s, createHostBook(), 'p2', { type: 'BID', amount: 5 }, deadline + 400, rng);
    expect(tooLate.actions).toHaveLength(0);
  });

  it('BID rifiutato se il giocatore non ha bisogno del ruolo', () => {
    const s = biddingRoom();
    const full = s.teams.map(t =>
      t.id === 'tb' ? { ...t, roster: buildRoster({ P: 1 }) } : t
    );
    const s2 = { ...s, teams: full };
    const r = handleIntent(s2, createHostBook(), 'p2', { type: 'BID', amount: 5 }, T0 + 100, rng);
    expect(r.actions).toHaveLength(0);
  });
});

describe('comandi host e formazioni multiplayer', () => {
  it('una lineup valida resta segreta nell’HostBook fino alla chiusura della finestra', () => {
    const roster = buildRoster(FULL);
    const teams = [
      createTestTeam({ id: 'human', controller: 'human', ownerId: 'h1', roster }),
      createTestTeam({ id: 'bot', controller: 'bot', roster: buildRoster(FULL) }),
    ];
    const base = lobby();
    const started = roomReducer(base, {
      type: 'START_AUCTION',
      teams,
      auction: { ...createInitialAuctionState(makePool()), phase: 'complete' },
    });
    const windowAction = buildLineupWindow(started, 'post_auction', T0 + 30_000)!;
    const state = roomReducer(started, windowAction);
    expect(state.phase).toBe('lineup');
    const lineup = autoLineup(roster, '3-1-3');
    const book = createHostBook();
    const chosen = handleIntent(state, book, 'h1', { type: 'LINEUP', lineup }, T0 + 1, rng);
    expect(chosen.actions).toEqual([]);
    expect(chosen.book.lineupChoices.human).toEqual(lineup);
    expect(state.teams[0].lineup).toBeUndefined();
    expect(handleIntent(state, book, 'h1', { type: 'LINEUP', lineup: { ...lineup, starters: lineup.starters.slice(1) } }, T0 + 1, rng).book.lineupChoices.human).toBeUndefined();
    const committed = roomReducer(state, { type: 'SET_LINEUPS', lineups: { human: lineup, bot: bestLineup(teams[1].roster, '2-3-2') } });
    expect(committed.lineupWindow).toBeNull();
    expect(committed.teams.find(team => team.id === 'human')?.lineup).toEqual(lineup);
  });

  it('buildStartAuction con 2 umani -> 8 squadre, 6 bot, nomi unici', () => {
    let s = lobby();
    let book = createHostBook();
    ({ state: s, book } = joinPlayer(s, book, 'p2'));
    const action = buildStartAuction(s, makePool(), rng);
    expect(action?.type).toBe('START_AUCTION');
    const teams = (action as Extract<RoomAction, { type: 'START_AUCTION' }>).teams;
    expect(teams).toHaveLength(8);
    const humans = teams.filter(t => t.controller === 'human');
    const bots = teams.filter(t => t.controller === 'bot');
    expect(humans.map(t => t.ownerId).sort()).toEqual(['h1', 'p2']);
    expect(bots).toHaveLength(6);
    const names = new Set(teams.map(t => t.name));
    expect(names.size).toBe(8);
    for (const human of humans) {
      expect(human.isUserTeam).toBe(false);
      expect(human.botConfig?.archetype).toBe('equilibrato');
    }
  });

  it('buildStartAuction: meno di 8 umani -> i posti liberi vanno ai bot', () => {
    let s = createRoom({
      code: 'ABC23', hostId: 'h1',
      host: { nickname: 'H', teamName: 'T' },
      settings: SETTINGS, now: T0,
    });
    let book = createHostBook();
    ({ state: s, book } = joinPlayer(s, book, 'p2'));
    ({ state: s, book } = joinPlayer(s, book, 'p3'));
    const action = buildStartAuction(s, makePool(), rng);
    expect(action).not.toBeNull();
    if (action?.type === 'START_AUCTION') {
      expect(action.teams).toHaveLength(8);
      expect(action.teams.filter(t => t.controller === 'human')).toHaveLength(3);
      expect(action.teams.filter(t => t.controller === 'bot')).toHaveLength(5);
    }
  });

  it('buildStartCalling produce START con tutte le squadre', () => {
    const s = auctionRoom();
    const a = buildStartCalling(s, rng);
    expect(a).toMatchObject({ type: 'AUCTION' });
    const inner = (a as Extract<typeof a, { type: 'AUCTION' }>).action;
    expect(inner.type).toBe('START');
    if (inner.type === 'START') expect(inner.callingOrder.sort()).toEqual(['ta', 'tb', 'tc']);
  });
});
