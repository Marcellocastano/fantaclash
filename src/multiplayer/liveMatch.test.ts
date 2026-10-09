import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClientSession } from './clientSession';
import { createHostSession } from './hostSession';
import { createMemoryNetwork } from './transport/memory';
import { createRoom } from './roomReducer';
import { stateHash } from './hash';
import { buildRoundStart } from './hostTournament';
import { MATCH_LEAD_MS, DECISION_TIMEOUT_MS, MATCH_SPEED } from './constants';
import { computeTimeline, nextStop } from '../domain/match';
import { createInitialAuctionState, createRng } from '../services/auction';
import { createTournament, findMatch, roundMatches, simulateBracketMatch, tournamentReducer } from '../domain/tournament';
import { buildRoster, createTestBotConfig, createTestPlayer, createTestTeam } from '../test/testUtils';
import { LiveMatch, RoomState } from './protocol';
import { Player, Team } from '../types';

const CODE = 'ABCDE';
const FULL = { P: 1, D: 2, C: 3, A: 2 } as const;

function makePool(): Player[] {
  return [createTestPlayer({ id: 'p1', role: 'P', baseValue: 40 })];
}

/** th (host) e tc (guest) umani, gli altri bot, tutti a rosa piena */
function makeTeams(): Team[] {
  const mk = (id: string, name: string, ownerId: string | null): Team =>
    createTestTeam({
      id, name, roster: buildRoster(FULL),
      controller: ownerId ? 'human' : 'bot',
      ownerId: ownerId ?? undefined,
      botConfig: createTestBotConfig(),
    });
  return [
    mk('th', 'Host FC', 'h1'),
    mk('tc', 'Guest FC', 'c1'),
    ...[1, 2, 3, 4, 5, 6].map(i => mk(`b${i}`, `Bot ${i}`, null)),
  ];
}

/** Seme di torneo per cui la partita dei due umani finisce ai rigori */
function shootoutSeed(teams: Team[]): { seed: number; order: string[]; matchId: string } {
  const order = [teams[0].id, teams[1].id, ...teams.slice(2).map(t => t.id)];
  for (let s = 1; s < 400; s++) {
    let t = createTournament({ teams, seasonId: '2024-25', seed: s });
    t = tournamentReducer(t, { type: 'DRAW', order });
    const m = roundMatches(t.bracket, 'quarterfinals')[0];
    const r = simulateBracketMatch(t, teams, m.id, {});
    if (r.shootout) return { seed: s, order, matchId: m.id };
  }
  throw new Error('nessun seme con rigori trovato');
}

function lobbyRoom(): RoomState {
  return createRoom({
    code: CODE, hostId: 'h1',
    host: { nickname: 'Host', teamName: 'Host FC' },
    settings: { season: '2024-25', difficulty: 'normale' },
    now: Date.now(),
  });
}

describe('partita live umano contro umano (host autorevole)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('decisioni, rigori, segretezza delle scelte e hash identico a fine partita', async () => {
    const net = createMemoryNetwork({ rng: createRng(7), latency: { min: 20, max: 60 }, dropRate: 0 });
    const pump = (ms: number) => vi.advanceTimersByTimeAsync(ms);
    const pumpUntil = async (cond: () => boolean, maxMs = 180_000) => {
      for (let t = 0; t < maxMs; t += 100) {
        if (cond()) return true;
        await pump(100);
      }
      return false;
    };

    const teams = makeTeams();
    const { seed, order, matchId } = shootoutSeed(teams);
    const initial = lobbyRoom();

    const hostTransport = net.createTransport({ code: CODE, selfId: 'h1', role: 'host' });
    const hc = hostTransport.connect();
    await pump(500);
    await hc;
    const host = createHostSession({
      transport: hostTransport, initialState: initial, hostToken: 'tok-h1', rng: createRng(9),
    });

    const guest = createClientSession({
      transport: net.createTransport({ code: CODE, selfId: 'c1', role: 'player' }),
      identity: { participantId: 'c1', token: 'tok-c1' },
      role: 'player', nickname: 'Guest', teamName: 'Guest FC',
    });
    // Un secondo client-spettatore per verificare la sincronia della vista
    const spec = createClientSession({
      transport: net.createTransport({ code: CODE, selfId: 's1', role: 'spectator' }),
      identity: { participantId: 's1', token: 'tok-s1' },
      role: 'spectator', nickname: '', teamName: '',
    } as Parameters<typeof createClientSession>[0]);
    const gp = guest.connect();
    const sp = spec.connect();
    await pumpUntil(() => guest.getStatus() === 'ready');
    await gp;
    await pump(500);
    await sp;
    expect(guest.getStatus()).toBe('ready');
    // Setup: asta completata, torneo, sorteggio (il guest osserva tutto)
    expect(host.dispatch({
      type: 'START_AUCTION',
      teams,
      auction: { ...createInitialAuctionState(makePool()), phase: 'complete' },
    })).toBe(true);
    expect(host.dispatch({ type: 'START_TOURNAMENT', seed })).toBe(true);
    expect(host.dispatch({ type: 'TOURNAMENT', action: { type: 'DRAW', order } })).toBe(true);
    await pumpUntil(() => guest.getState()?.phase === 'tournament', 20000);

    // L'host avvia il turno: solo la partita degli umani va live
    const starts = buildRoundStart(host.getState(), Date.now() + MATCH_LEAD_MS);
    expect(starts).toHaveLength(1);
    for (const a of starts) expect(host.dispatch(a)).toBe(true);
    await pumpUntil(() => !!guest.getState()?.live[matchId]);
    const live0 = guest.getState()!.live[matchId];
    expect(live0.humanSides).toEqual(['home', 'away']);
    expect(live0.plans).toEqual({ home: [], away: [] });
    expect(stateHash(guest.getState()!)).toBe(stateHash(host.getState()));

    // Attesa calcio d'inizio + primo stop (tattica a inizio partita)
    const res = () => simulateBracketMatch(host.getState().tournament!, host.getState().teams, matchId, {
      tactics: host.getState().live[matchId]?.plans,
      shootoutOrder: host.getState().live[matchId]?.shootoutOrder,
    });
    await pumpUntil(() => {
      const l = host.getState().live[matchId];
      return !!l && l.anchorTick === 0 && Date.now() >= l.anchorAt;
    });
    // Entrambi scelgono la prima tattica: ripresa immediata, niente attesa di timeout
    const plansBefore = JSON.stringify(host.getState().live[matchId].plans);
    guest.sendIntent({ type: 'TACTIC', matchId, stopTick: 0, tactic: 'attacca' });
    await pump(300);
    // Segretezza: la scelta NON è nello stato prima della ripresa
    expect(JSON.stringify(host.getState().live[matchId].plans)).toBe(plansBefore);
    host.submitLocal({ type: 'TACTIC', matchId, stopTick: 0, tactic: 'difendi' });
    await pumpUntil(() => host.getState().live[matchId]?.anchorTick === 0 && host.getState().live[matchId].anchorAt > live0.anchorAt, 5000);
    const live1 = host.getState().live[matchId];
    expect(live1.plans.home?.[0]).toEqual({ fromTick: 1, tactic: 'difendi' });
    expect(live1.plans.away?.[0]).toEqual({ fromTick: 1, tactic: 'attacca' });
    await pumpUntil(() => stateHash(guest.getState()!) === stateHash(host.getState()), 10000);

    // Stesso tick per hostNow su host e guest (stessa timeline)
    const r0 = res();
    const now0 = Date.now();
    const stopOf = (l: LiveMatch) => {
      const rr = simulateBracketMatch(host.getState().tournament!, host.getState().teams, matchId, {
        tactics: l.plans, shootoutOrder: l.shootoutOrder,
      });
      return rr;
    };
    const tl = (l: LiveMatch) => {
      const rr = stopOf(l);
      return computeTimeline({ result: rr, anchorTick: l.anchorTick, anchorAt: l.anchorAt, now: now0, speed: MATCH_SPEED, stopTick: nextStop(rr, l.anchorTick, l.resolvedStops, true) }).tick;
    };
    await pumpUntil(() => stateHash(guest.getState()!) === stateHash(host.getState()), 10000);
    expect(tl(guest.getState()!.live[matchId])).toBe(tl(host.getState().live[matchId]));

    // Seconda decisione: solo il guest sceglie, l'host va in timeout
    const stop2 = r0.decisionTicks[1] - 1;
    await pumpUntil(() => {
      const l = host.getState().live[matchId];
      if (!l || l.anchorTick !== 0 && l.anchorTick !== stop2) return false;
      const rr = stopOf(l);
      return computeTimeline({ result: rr, anchorTick: l.anchorTick, anchorAt: l.anchorAt, now: Date.now(), speed: MATCH_SPEED, stopTick: stop2 }).reachedStopAt !== null && l.anchorTick === 0;
    });
    guest.sendIntent({ type: 'TACTIC', matchId, stopTick: stop2, tactic: 'difendi' });
    // entro il timeout NON riprende (manca la scelta dell'host)
    await pump(5000);
    expect(host.getState().live[matchId].anchorTick).toBe(0);
    // scaduto il timeout riprende comunque
    await pumpUntil(() => host.getState().live[matchId].anchorTick === stop2, DECISION_TIMEOUT_MS + 10000);
    const live2 = host.getState().live[matchId];
    expect(live2.plans.away?.[live2.plans.away.length - 1]).toEqual({ fromTick: stop2 + 1, tactic: 'difendi' });
    // l'host non ha scelto: il suo piano resta com'era
    expect(live2.plans.home?.length).toBe(1);

    // Terza decisione: nessuno sceglie -> timeout
    const stop3 = r0.decisionTicks[2] - 1;
    await pumpUntil(() => {
      const l = host.getState().live[matchId];
      return !!l && l.anchorTick === stop3;
    }, 120_000);
    await pump(500);

    // Rigori: entrambi mandano l'ordine
    const r = res();
    expect(r.shootout).not.toBeNull();
    await pumpUntil(() => {
      const l = host.getState().live[matchId];
      if (!l) return false;
      return computeTimeline({ result: r, anchorTick: l.anchorTick, anchorAt: l.anchorAt, now: Date.now(), speed: MATCH_SPEED, stopTick: r.fullTimeTick }).reachedStopAt !== null;
    }, 120_000);
    const orderHome = r.lineups.home.map(p => p.playerId);
    const orderAway = r.lineups.away.map(p => p.playerId);
    guest.sendIntent({ type: 'SHOOTOUT_ORDER', matchId, order: [...orderAway].reverse() });
    host.submitLocal({ type: 'SHOOTOUT_ORDER', matchId, order: orderHome });
    await pumpUntil(() => (host.getState().live[matchId]?.anchorTick ?? -1) === r.fullTimeTick, 10000);
    expect(host.getState().live[matchId].shootoutOrder.home).toEqual(orderHome);
    expect(host.getState().live[matchId].shootoutOrder.away).toEqual([...orderAway].reverse());

    // Fine partita -> MATCH_RECORD -> live vuota -> record dei bot del turno
    await pumpUntil(() => !host.getState().live[matchId], 120_000);
    await pumpUntil(() => host.getState().tournament!.status === 'semifinals', 20000);
    await pump(500);

    const tHost = host.getState().tournament!;
    const mDone = findMatch(tHost.bracket, matchId)!;
    expect(mDone.winnerId).not.toBeNull();
    // Il risultato registrato è quello ricalcolato localmente con le opzioni live
    const finalLive = { plans: live2.plans, shootoutOrder: { home: orderHome, away: [...orderAway].reverse() } };
    const local = simulateBracketMatch(
      { ...tHost }, teams, matchId,
      { tactics: finalLive.plans, shootoutOrder: finalLive.shootoutOrder }
    );
    expect(tHost.matches[matchId].homeScore).toBe(local.homeScore);
    expect(tHost.matches[matchId].awayScore).toBe(local.awayScore);
    expect(tHost.matches[matchId].winnerId).toBe(local.winnerId);

    // Tutte le partite del turno registrate dai bot record
    expect(roundMatches(tHost.bracket, 'quarterfinals').every(m => m.winnerId)).toBe(true);
    // Hash identico su host e guest a fine turno
    await pumpUntil(() => guest.getState()?.tournament?.status === 'semifinals', 10000);
    expect(stateHash(guest.getState()!)).toBe(stateHash(host.getState()));
    await pump(1000);
    expect(stateHash(spec.getState()!)).toBe(stateHash(host.getState()));

    host.destroy();
    guest.close();
    spec.close();
  }, 60_000);
});
