import { describe, it, expect } from 'vitest';
import { createRoom, roomReducer } from './roomReducer';
import { createHostBook, handleIntent } from './host';
import { buildBotRecords, buildRoundStart, liveHumanSides } from './hostTournament';
import { findMatch, roundMatches, simulateBracketMatch } from '../domain/tournament';
import { createInitialAuctionState } from '../services/auction';
import { resultHash } from './hash';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../test/testUtils';
import { RoomState } from './protocol';
import { Team } from '../types';

const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;

function teams(): Team[] {
  const mk = (id: string, ownerId: string | null): Team =>
    createTestTeam({
      id, name: `T ${id}`, roster: buildRoster(FULL),
      controller: ownerId ? 'human' : 'bot',
      ownerId: ownerId ?? undefined,
      botConfig: createTestBotConfig(),
    });
  return [mk('th', 'h1'), mk('tc', 'c1'), ...[1, 2, 3, 4, 5, 6].map(i => mk(`b${i}`, null))];
}

function tournamentRoom(): RoomState {
  let s = createRoom({
    code: 'ABCDE', hostId: 'h1',
    host: { nickname: 'H', teamName: 'T' },
    settings: { season: '2024-25', difficulty: 'normale', fillWithBots: true },
    now: 1000,
  });
  s = roomReducer(s, {
    type: 'START_AUCTION',
    teams: teams(),
    auction: { ...createInitialAuctionState([createTestPlayer({ id: 'p1', role: 'P' })]), phase: 'complete' },
  });
  s = roomReducer(s, { type: 'START_TOURNAMENT', seed: 7 });
  // th vs tc ai quarti
  const order = ['th', 'tc', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'];
  s = roomReducer(s, { type: 'TOURNAMENT', action: { type: 'DRAW', order } });
  return s;
}

const QF0 = () => roundMatches(tournamentRoom().tournament!.bracket, 'quarterfinals')[0].id;

describe('partite live: reducer, intenti, helper host', () => {
  it('MATCH_START crea la live solo per partite ready e non live', () => {
    const s = tournamentRoom();
    const id = QF0();
    const start = roomReducer(s, { type: 'MATCH_START', matchId: id, startAt: 5000, humanSides: ['home', 'away'] });
    expect(start).not.toBe(s);
    const live = start.live[id];
    expect(live.anchorTick).toBe(0);
    expect(live.anchorAt).toBe(5000);
    expect(live.plans).toEqual({ home: [], away: [] });
    // di nuovo -> no-op
    expect(roomReducer(start, { type: 'MATCH_START', matchId: id, startAt: 6000, humanSides: [] })).toBe(start);
    // semifinale non pronta -> rifiutata
    const sf = roundMatches(start.tournament!.bracket, 'semifinals')[0];
    expect(roomReducer(start, { type: 'MATCH_START', matchId: sf.id, startAt: 0, humanSides: ['home'] })).toBe(start);
  });

  it('MATCH_RESUME aggiunge scelte, risolve lo stop e riancora la timeline', () => {
    let s = tournamentRoom();
    const id = QF0();
    s = roomReducer(s, { type: 'MATCH_START', matchId: id, startAt: 1000, humanSides: ['home', 'away'] });
    const r = roomReducer(s, {
      type: 'MATCH_RESUME', matchId: id, stopTick: 0, at: 2000,
      tactics: { home: 'attacca' },
    });
    const live = r.live[id];
    expect(live.plans.home).toEqual([{ fromTick: 1, tactic: 'attacca' }]);
    expect(live.plans.away).toEqual([]); // resta vuoto: niente IA
    expect(live.resolvedStops).toEqual([0]);
    expect(live.anchorTick).toBe(0);
    expect(live.anchorAt).toBe(2000);
    // stopTick < anchorTick -> rifiutata
    expect(roomReducer(r, { type: 'MATCH_RESUME', matchId: 'x', stopTick: 0, at: 0 })).toBe(r);
  });

  it('MATCH_RECORD su partita live usa le options della stanza e chiude la live', () => {
    let s = tournamentRoom();
    const id = QF0();
    s = roomReducer(s, { type: 'MATCH_START', matchId: id, startAt: 0, humanSides: ['home'] });
    s = roomReducer(s, { type: 'MATCH_RESUME', matchId: id, stopTick: 0, at: 1, tactics: { home: 'difendi' } });
    const live = s.live[id];
    const options = { tactics: live.plans, shootoutOrder: live.shootoutOrder };
    const result = simulateBracketMatch(s.tournament!, s.teams, id, options);
    const ok = roomReducer(s, {
      type: 'MATCH_RECORD', matchId: id,
      seed: findMatch(s.tournament!.bracket, id)!.seed,
      options: {}, // ignorata: vale live.plans
      resultHash: resultHash(result),
    });
    expect(ok).not.toBe(s);
    expect(ok.live[id]).toBeUndefined();
    expect(ok.tournament!.matches[id].winnerId).toBe(result.winnerId);
    // hash sbagliato -> rifiutata e live intatta
    const bad = roomReducer(s, {
      type: 'MATCH_RECORD', matchId: id, seed: findMatch(s.tournament!.bracket, id)!.seed,
      options: {}, resultHash: 'deadbeef',
    });
    expect(bad).toBe(s);
  });

  it('TACTIC e SHOOTOUT_ORDER: solo il proprietario di un lato umano, segrete in book', () => {
    let s = tournamentRoom();
    const id = QF0();
    s = roomReducer(s, { type: 'MATCH_START', matchId: id, startAt: 0, humanSides: ['home', 'away'] });
    let book = createHostBook();
    // guest (c1) è away: scelta valida per lo stop 0
    const r1 = handleIntent(s, book, 'c1', { type: 'TACTIC', matchId: id, stopTick: 0, tactic: 'attacca' }, 0, Math.random);
    expect(r1.actions).toEqual([]); // niente azioni: segreta
    book = r1.book;
    expect(book.matchChoices[id].tactics.away).toEqual({ stopTick: 0, tactic: 'attacca' });
    // host (h1) home
    const r2 = handleIntent(s, book, 'h1', { type: 'TACTIC', matchId: id, stopTick: 0, tactic: 'difendi' }, 0, Math.random);
    book = r2.book;
    expect(book.matchChoices[id].tactics.home).toEqual({ stopTick: 0, tactic: 'difendi' });
    // stopTick sbagliato -> ignorato
    const r3 = handleIntent(s, book, 'c1', { type: 'TACTIC', matchId: id, stopTick: 30, tactic: 'attacca' }, 0, Math.random);
    expect(r3.book).toBe(book);
    // uno spettatore non gioca -> ignorato
    const r4 = handleIntent(s, book, 'sx', { type: 'TACTIC', matchId: id, stopTick: 0, tactic: 'attacca' }, 0, Math.random);
    expect(r4.book).toBe(book);
    // ordine rigori ora non valido (non siamo allo stop dei rigori)
    const r5 = handleIntent(s, book, 'c1', { type: 'SHOOTOUT_ORDER', matchId: id, order: ['x'] }, 0, Math.random);
    expect(r5.book).toBe(book);
  });

  it('liveHumanSides, buildRoundStart, buildBotRecords', () => {
    const s = tournamentRoom();
    const qf = roundMatches(s.tournament!.bracket, 'quarterfinals');
    expect(liveHumanSides(s, qf[0].id)).toEqual(['home', 'away']); // th vs tc
    expect(liveHumanSides(s, qf[1].id)).toEqual([]); // bot vs bot
    const starts = buildRoundStart(s, 999);
    expect(starts).toEqual([{ type: 'MATCH_START', matchId: qf[0].id, startAt: 999, humanSides: ['home', 'away'] }]);
    const bots = buildBotRecords(s);
    expect(bots).toHaveLength(3); // gli altri quarti
    expect(bots.every(a => a.type === 'MATCH_RECORD')).toBe(true);
    // con la live aperta, i bot non vengono registrati
    const s2 = roomReducer(s, starts[0]);
    expect(buildBotRecords(s2).length).toBe(3); // restano pronte, ma buildBotRecords le dà lo stesso (le live sono umane)
    expect(buildRoundStart(s2, 0)).toEqual([]); // niente di nuovo da avviare
  });
});
