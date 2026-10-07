import { describe, it, expect } from 'vitest';
import { runAuction } from './simulator';
import { createRng, hashSeed } from './rng';
import { createInitialAuctionState, auctionReducer, getCurrentCallerId, AuctionWorld } from './session';
import { buildAuctionPool, LEAGUE_SIZE, getMaxBid } from './rules';
import { PLAYERS_DATABASE } from '../../mock/players';
import { generateAllTeams } from '../teamGenerator';
import { ROSTER_REQUIREMENTS, DifficultyLevel } from '../../types';

function makeWorld(difficulty: DifficultyLevel): AuctionWorld {
  const pool = buildAuctionPool(PLAYERS_DATABASE);
  return {
    teams: generateAllTeams(
      'User',
      difficulty,
      pool,
      createRng(hashSeed('teams', difficulty))
    ),
    auction: createInitialAuctionState(pool),
  };
}

function start(world: AuctionWorld): AuctionWorld {
  return auctionReducer(world, {
    type: 'START',
    callingOrder: world.teams.map(t => t.id),
  });
}

describe('simulator — asta completa', () => {
  const difficulties: DifficultyLevel[] = ['normale', 'difficile'];
  const seeds = [11, 22, 33];

  for (const difficulty of difficulties) {
    for (const seed of seeds) {
      it(`${difficulty} x ${LEAGUE_SIZE} squadre, seed ${seed}: completa e coerente`, () => {
        const world = runAuction(start(makeWorld(difficulty)), {
          rng: createRng(seed),
          until: 'auction_end',
          startTime: 0,
          userAutopilot: true,
        });

        expect(world.auction.phase).toBe('complete');
        expect(world.auction.assignedPlayers).toHaveLength(LEAGUE_SIZE * 8);

        // Nessun giocatore assegnato due volte
        const ids = world.auction.assignedPlayers.map(a => a.playerId);
        expect(new Set(ids).size).toBe(ids.length);

        for (const team of world.teams) {
          // Rosa completa P1 D2 C3 A2
          expect(team.roster).toHaveLength(8);
          const counts = { P: 0, D: 0, C: 0, A: 0 };
          for (const o of team.roster) counts[o.player.role]++;
          for (const role of ['P', 'D', 'C', 'A'] as const) {
            expect(counts[role]).toBe(ROSTER_REQUIREMENTS[role].total);
          }
          expect(team.credits).toBeGreaterThanOrEqual(0);
          const spent = team.roster.reduce((s, o) => s + o.purchasePrice, 0);
          expect(team.credits + spent).toBe(team.initialCredits);
        }
      });
    }

    it(`${difficulty} x ${LEAGUE_SIZE} squadre: spesa media e minima dei bot`, () => {
      const ratios: number[] = [];
      for (const seed of seeds) {
        const world = runAuction(start(makeWorld(difficulty)), {
          rng: createRng(seed),
          until: 'auction_end',
          startTime: 0,
          userAutopilot: true,
        });
        for (const team of world.teams.filter(t => !t.isUserTeam)) {
          const spent = team.roster.reduce((s, o) => s + o.purchasePrice, 0);
          ratios.push(spent / team.initialCredits);
        }
      }
      const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const min = Math.min(...ratios);
      console.log(`spend ${difficulty} x ${LEAGUE_SIZE}: mean=${avg.toFixed(3)} min=${min.toFixed(3)}`);
      expect(avg).toBeGreaterThanOrEqual(0.9);
      expect(min).toBeGreaterThanOrEqual(0.5);
    });
  }
});

describe('simulator — utente scriptato (userPolicy)', () => {
  it('l\'utente chiama e rilancia; onLotClosed chiamato una volta per lotto (64)', () => {
    const world = start(makeWorld('normale'));
    const userId = world.teams.find(t => t.isUserTeam)!.id;
    const closedLots: string[] = [];
    const userBids: string[] = [];
    let userCalls = 0;

    const end = runAuction(world, {
      rng: createRng(7),
      until: 'auction_end',
      startTime: 0,
      userPolicy: {
        // Chiama il giocatore più economico del ruolo corrente
        call: (_user, role, ctx) =>
          ctx.pool
            .filter(p => p.role === role)
            .sort((a, b) => a.baseValue - b.baseValue)[0] ?? null,
        // Rilancia fino al massimo consentito
        limit: user => getMaxBid(user),
      },
      onCall: teamId => {
        if (teamId === userId) userCalls++;
      },
      onLotClosed: lot => {
        closedLots.push(lot.player.id);
        for (const bid of lot.bidHistory) {
          if (bid.teamId === userId) userBids.push(lot.player.id);
        }
      },
    });

    expect(end.auction.phase).toBe('complete');
    // Esattamente una chiamata a onLotClosed per lotto: 64 lotti, giocatori distinti
    expect(closedLots).toHaveLength(LEAGUE_SIZE * 8);
    expect(new Set(closedLots).size).toBe(LEAGUE_SIZE * 8);
    // L'utente ha chiamato almeno una volta e ha rilanciato in almeno un lotto
    expect(userCalls).toBeGreaterThan(0);
    expect(userBids.length).toBeGreaterThan(0);
    const user = end.teams.find(t => t.id === userId)!;
    expect(user.roster.length).toBeGreaterThan(0);
  });

  it('onLotClosed riceve il mondo con il lotto ancora aperto', () => {
    const world = start(makeWorld('normale'));
    let seen = 0;
    runAuction(world, {
      rng: createRng(3),
      until: 'role_end',
      startTime: 0,
      userAutopilot: true,
      onLotClosed: (lot, w) => {
        seen++;
        // Il mondo è quello prima della chiusura: fase bidding e lotto attivo
        expect(w.auction.phase).toBe('bidding');
        expect(w.auction.lot).toBe(lot);
        // Il giocatore non è ancora stato assegnato a nessuno
        expect(
          w.teams.every(t => !t.roster.some(o => o.player.id === lot.player.id))
        ).toBe(true);
        expect(
          w.auction.assignedPlayers.every(a => a.playerId !== lot.player.id)
        ).toBe(true);
      },
    });
    expect(seen).toBeGreaterThan(0);
  });
});

describe('simulator — condizioni di stop', () => {
  it('until role_end si ferma a role_complete', () => {
    const world = runAuction(start(makeWorld('normale')), {
      rng: createRng(1),
      until: 'role_end',
      startTime: 0,
      userAutopilot: true,
    });
    expect(world.auction.phase).toBe('role_complete');
    // I portieri di tutte le squadre sono completi
    for (const team of world.teams) {
      const pCount = team.roster.filter(o => o.player.role === 'P').length;
      expect(pCount).toBe(ROSTER_REQUIREMENTS.P.total);
    }
  });

  it('senza autopilot si ferma al turno di chiamata dell\'utente', () => {
    // L'utente chiama per primo nell'ordine -> stop immediato
    const world = runAuction(start(makeWorld('normale')), {
      rng: createRng(1),
      until: 'auction_end',
      startTime: 0,
      userAutopilot: false,
    });
    expect(world.auction.phase).toBe('calling');
    const callerId = getCurrentCallerId(world.auction);
    expect(world.teams.find(t => t.id === callerId)?.isUserTeam).toBe(true);
  });

  it('until lot_end chiude solo il lotto aperto, senza rilanci dell\'utente', () => {
    let world = start(makeWorld('normale'));
    const userId = world.teams.find(t => t.isUserTeam)!.id;
    const playerId = world.auction.remainingPlayers.find(
      p => p.role === world.auction.currentRole
    )!.id;
    world = auctionReducer(world, {
      type: 'CALL_PLAYER', teamId: userId, playerId, now: 0, seed: 42,
    });

    const result = runAuction(world, { rng: createRng(9), until: 'lot_end', startTime: 0 });

    expect(result.auction.phase).toBe('sold');
    expect(result.auction.assignedPlayers).toHaveLength(1);
    const assigned = result.auction.assignedPlayers[0];
    expect(assigned.playerId).toBe(playerId);
    // L'utente ha solo l'offerta d'apertura: nessun rilancio simulato per lui
    const lot = result.auction.lot!;
    expect(lot.bidHistory.filter(b => b.teamId === userId)).toHaveLength(1);
    expect(assigned.price).toBe(lot.currentBid);
    expect(assigned.teamId).toBe(lot.currentBidderId);
    // Da 'sold' non avanza al lotto successivo
    expect(runAuction(result, { rng: createRng(9), until: 'lot_end', startTime: 0 })).toBe(result);
  });

  it('until lot_end in turno di chiamata bot: il bot chiama e il lotto si chiude', () => {
    // L'utente non è il primo chiamante: tocca a un bot
    const base = makeWorld('normale');
    const bots = base.teams.filter(t => !t.isUserTeam).map(t => t.id);
    const userId = base.teams.find(t => t.isUserTeam)!.id;
    const world = auctionReducer(base, { type: 'START', callingOrder: [...bots, userId] });

    const result = runAuction(world, { rng: createRng(4), until: 'lot_end', startTime: 0 });
    expect(result.auction.phase).toBe('sold');
    expect(result.auction.assignedPlayers).toHaveLength(1);
  });

  it('until lot_end non procede oltre role_complete', () => {
    const atRoleEnd = runAuction(start(makeWorld('normale')), {
      rng: createRng(1), until: 'role_end', startTime: 0, userAutopilot: true,
    });
    expect(runAuction(atRoleEnd, { rng: createRng(1), until: 'lot_end', startTime: 0 })).toBe(atRoleEnd);
  });

  it('avviata a metà lotto lo chiude senza doppie assegnazioni', () => {
    // Portiamo il mondo a 'bidding' con un lotto aperto
    let world = start(makeWorld('normale'));
    const caller = getCurrentCallerId(world.auction)!;
    const playerId = world.auction.remainingPlayers.find(
      p => p.role === world.auction.currentRole
    )!.id;
    world = auctionReducer(world, {
      type: 'CALL_PLAYER', teamId: caller, playerId, now: 0, seed: 99,
    });
    expect(world.auction.phase).toBe('bidding');

    const result = runAuction(world, {
      rng: createRng(5),
      until: 'auction_end',
      startTime: 0,
      userAutopilot: true,
    });

    expect(result.auction.phase).toBe('complete');
    const ids = result.auction.assignedPlayers.map(a => a.playerId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.auction.assignedPlayers).toHaveLength(LEAGUE_SIZE * 8);
    expect(ids.filter(id => id === playerId)).toHaveLength(1);
  });
});
