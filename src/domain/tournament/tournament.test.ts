import { describe, it, expect } from 'vitest';
import { createRng } from '../../services/auction/rng';
import { tournamentTeams } from '../../test/matchFixtures';
import { MatchResult } from '../match/matchTypes';
import {
  buildTournamentSummary,
  createTournament,
  drawOrder,
  findMatch,
  findUserMatch,
  getMatchStatus,
  getTeamOutcome,
  isUserEliminated,
  legKey,
  matchLegs,
  monogram,
  nextLeg,
  roundLeg,
  roundMatches,
  simulateBracketMatch,
  simulateOthers,
  simulateRemaining,
  simulateRound,
  tieScore,
  tournamentReducer,
  TournamentState,
} from './index';

const TEAMS = tournamentTeams();

function drawn(seed = 1): TournamentState {
  const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed });
  return tournamentReducer(t, { type: 'DRAW', order: drawOrder(t, createRng(seed)) });
}

describe('torneo — sorteggio e tabellone', () => {
  it('createTournament: 8 squadre, 7 partite, stato draw', () => {
    const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed: 3 });
    expect(t.status).toBe('draw');
    expect(t.teams).toHaveLength(8);
    expect(t.bracket).toHaveLength(7);
    expect(t.userTeamId).toBe('user');
    expect(new Set(t.bracket.map(m => m.seed)).size).toBe(7);
  });

  it('il sorteggio genera 8 squadre senza ripetizioni nei quarti', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const t = drawn(seed);
      expect(t.status).toBe('quarterfinals');
      const ids = roundMatches(t.bracket, 'quarterfinals').flatMap(m => [m.homeId, m.awayId]);
      expect(ids).toHaveLength(8);
      expect(new Set(ids).size).toBe(8);
      expect(ids.every(id => TEAMS.some(team => team.id === id))).toBe(true);
    }
  });

  it('il sorteggio è casuale: semi diversi danno accoppiamenti diversi', () => {
    const orders = new Set(
      Array.from({ length: 10 }, (_, i) =>
        roundMatches(drawn(i + 1).bracket, 'quarterfinals').map(m => `${m.homeId}-${m.awayId}`).join('|')
      )
    );
    expect(orders.size).toBeGreaterThan(5);
  });

  it('sorteggi invalidi lasciano lo stato invariato (stessa referenza)', () => {
    const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed: 3 });
    const ids = TEAMS.map(x => x.id);
    expect(tournamentReducer(t, { type: 'DRAW', order: ids.slice(0, 7) })).toBe(t);
    expect(tournamentReducer(t, { type: 'DRAW', order: [...ids.slice(0, 7), ids[0]] })).toBe(t);
    expect(tournamentReducer(t, { type: 'DRAW', order: [...ids.slice(0, 7), 'intruso'] })).toBe(t);
    const d = tournamentReducer(t, { type: 'DRAW', order: ids });
    expect(tournamentReducer(d, { type: 'DRAW', order: ids })).toBe(d);
  });

  it('bracket valido: semifinali e finale vuote e "upcoming" dopo il sorteggio', () => {
    const t = drawn();
    for (const m of roundMatches(t.bracket, 'quarterfinals')) expect(getMatchStatus(t, m)).toBe('ready');
    for (const id of ['SF1', 'SF2', 'F']) {
      const m = findMatch(t.bracket, id)!;
      expect(m.homeId).toBeNull();
      expect(getMatchStatus(t, m)).toBe('upcoming');
    }
  });

  it('monogram: due iniziali', () => {
    expect(monogram('Fanta United')).toBe('FU');
    expect(monogram('Bot')).toBe('BO');
    expect(monogram("Real Sbronza d'Annata")).toBe('RS');
  });
});

describe('torneo — avanzamento', () => {
  it('il vincitore passa al turno successivo nello slot giusto', () => {
    let t = drawn();
    const result = simulateBracketMatch(t, TEAMS, 'QF2');
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF2', result });
    const qf2 = findMatch(t.bracket, 'QF2')!;
    expect(qf2.winnerId).toBe(result.winnerId);
    expect(findMatch(t.bracket, 'SF1')!.awayId).toBe(result.winnerId);
    expect(t.matches.QF2).toBe(result);
    expect(t.status).toBe('quarterfinals');
  });

  it('un risultato non può essere registrato due volte né per partite non pronte', () => {
    let t = drawn();
    const r = simulateBracketMatch(t, TEAMS, 'QF1');
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1', result: r });
    expect(tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1', result: r })).toBe(t);
    // SF1 non è pronta (manca il vincitore di QF2)
    expect(tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'SF1', result: r })).toBe(t);
    // Risultato con squadre sbagliate
    const other = simulateBracketMatch(t, TEAMS, 'QF3');
    expect(tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF4', result: other })).toBe(t);
  });

  it('l\'eliminato non può avanzare', () => {
    let t = simulateRound(drawn(4), TEAMS);
    expect(t.status).toBe('semifinals');
    const losers = roundMatches(t.bracket, 'quarterfinals').map(m =>
      m.winnerId === m.homeId ? m.awayId : m.homeId
    );
    t = simulateRemaining(t, TEAMS);
    const later = t.bracket.filter(m => m.round !== 'quarterfinals');
    for (const loser of losers) {
      expect(later.some(m => m.homeId === loser || m.awayId === loser)).toBe(false);
    }
    for (const m of roundMatches(t.bracket, 'quarterfinals')) {
      const loser = m.winnerId === m.homeId ? m.awayId : m.homeId;
      expect(getTeamOutcome(m, loser)).toBe('eliminated');
      expect(getTeamOutcome(m, m.winnerId)).toBe('winner');
    }
  });

  it('il torneo termina con un solo vincitore e 7 risultati', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const t = simulateRemaining(drawn(seed), TEAMS);
      expect(t.status).toBe('completed');
      expect(Object.keys(t.matches)).toHaveLength(7);
      const final = findMatch(t.bracket, 'F')!;
      expect(t.winnerId).toBe(final.winnerId);
      expect([final.homeId, final.awayId]).toContain(t.winnerId);
      expect(t.bracket.every(m => m.winnerId)).toBe(true);
    }
  });

  it('simulateRound salta la partita dell\'utente; START_MATCH la apre e RECORD la chiude', () => {
    let t = drawn(2);
    const userMatch = findUserMatch(t)!;
    t = simulateRound(t, TEAMS, [userMatch.id]);
    expect(t.status).toBe('quarterfinals');
    expect(findMatch(t.bracket, userMatch.id)!.winnerId).toBeNull();

    t = tournamentReducer(t, { type: 'START_MATCH', matchId: userMatch.id });
    expect(t.currentMatchId).toBe(userMatch.id);
    expect(getMatchStatus(t, findMatch(t.bracket, userMatch.id)!)).toBe('in_progress');
    // Una sola partita alla volta
    expect(tournamentReducer(t, { type: 'START_MATCH', matchId: userMatch.id })).toBe(t);

    const r = simulateBracketMatch(t, TEAMS, userMatch.id);
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: userMatch.id, result: r });
    expect(t.currentMatchId).toBeNull();
    expect(t.status).toBe('semifinals');
    expect(isUserEliminated(t)).toBe(r.winnerId !== 'user');
  });

  it('stesso seme di torneo -> stessi risultati', () => {
    const a = simulateRemaining(drawn(9), TEAMS);
    const b = simulateRemaining(drawn(9), TEAMS);
    expect(a.winnerId).toBe(b.winnerId);
    for (const id of Object.keys(a.matches)) {
      expect(a.matches[id].homeScore).toBe(b.matches[id].homeScore);
      expect(a.matches[id].awayScore).toBe(b.matches[id].awayScore);
    }
  });

  it('lo stato è serializzabile (JSON round-trip)', () => {
    const t = simulateRemaining(drawn(5), TEAMS);
    expect(JSON.parse(JSON.stringify(t))).toEqual(t);
  });
});

describe('torneo — riepilogo', () => {
  it('posizione finale coerente con il percorso dell\'utente', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const t = simulateRemaining(drawn(seed), TEAMS);
      const s = buildTournamentSummary(t, TEAMS);
      expect(s.matches.length).toBeGreaterThanOrEqual(1);
      expect(s.matches.length).toBeLessThanOrEqual(3);
      expect(s.lineup).toHaveLength(8);
      expect(s.lineup[0].role).toBe('P');
      const expected = ['quarti', 'semifinalista', 'finalista'][s.matches.length - 1];
      if (t.winnerId === 'user') expect(s.placement).toBe('campione');
      else expect(s.placement).toBe(expected);
      expect(s.stats.goalsFor).toBe(s.matches.reduce((n, m) => n + m.goalsFor, 0));
      const scorerGoals = s.scorers.reduce((n, x) => n + x.goals, 0);
      expect(scorerGoals).toBeLessThanOrEqual(s.stats.goalsFor);
      expect(s.championName).not.toBeNull();
    }
  });
});

// ----------------------------------------------------------------------------
// Formato andata/ritorno
// ----------------------------------------------------------------------------

function drawnDouble(seed = 1): TournamentState {
  const t = createTournament({ teams: TEAMS, seasonId: '2015-16', seed, format: 'double' });
  return tournamentReducer(t, { type: 'DRAW', order: drawOrder(t, createRng(seed)) });
}

/** Risultato finto per testare le transizioni senza dipendere dal motore */
function fakeLeg(
  homeId: string,
  awayId: string,
  homeScore: number,
  awayScore: number,
  leg: 1 | 2,
  opts: { shootout?: { home: number; away: number } | null } = {}
): MatchResult {
  const shootout = opts.shootout ?? null;
  const winnerId =
    shootout !== null
      ? shootout.home > shootout.away ? homeId : awayId
      : homeScore === awayScore ? null : homeScore > awayScore ? homeId : awayId;
  return {
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeName: homeId,
    awayName: awayId,
    homeScore,
    awayScore,
    shootout,
    leg,
    winnerId,
    events: [],
    ticks: [],
    fullTimeTick: 0,
    halfTimeTick: 0,
    decisionTicks: [],
    lineups: { home: [], away: [] },
    stats: {},
    playerPerformances: [],
  } as unknown as MatchResult;
}

describe('torneo — formato andata e ritorno', () => {
  it('tabellone: quarti e semifinali a due gare, finale secca', () => {
    const t = drawnDouble();
    expect(t.format).toBe('double');
    for (const m of t.bracket) {
      if (m.round === 'final') {
        expect(matchLegs(m)).toBe(1);
        expect(m.returnSeed).toBeUndefined();
      } else {
        expect(matchLegs(m)).toBe(2);
        expect(m.returnSeed).not.toBe(m.seed);
      }
    }
  });

  it("l'andata pari vale e non decide il confronto", () => {
    let t = drawnDouble();
    const qf1 = findMatch(t.bracket, 'QF1')!;
    const r = fakeLeg(qf1.homeId!, qf1.awayId!, 1, 1, 1);
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1', result: r });
    expect(t.matches.QF1.homeScore).toBe(1);
    expect(findMatch(t.bracket, 'QF1')!.winnerId).toBeNull();
    expect(t.status).toBe('quarterfinals');
    expect(nextLeg(t, findMatch(t.bracket, 'QF1')!)).toBe(2);
    // Un ritorno prima delle altre andate non è registrabile
    const r2 = fakeLeg(qf1.awayId!, qf1.homeId!, 0, 0, 2, { shootout: { home: 4, away: 2 } });
    expect(tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1-R', result: r2 })).toBe(t);
    expect(getMatchStatus(t, findMatch(t.bracket, 'QF1')!)).toBe('upcoming');
  });

  it('i ritorni sono pronti solo dopo tutte le andate e invertono la casa', () => {
    let t = drawnDouble();
    t = simulateRound(t, TEAMS);
    expect(Object.keys(t.matches)).toHaveLength(4);
    expect(t.bracket.every(m => m.round === 'quarterfinals' ? !m.winnerId : true)).toBe(true);
    for (const m of roundMatches(t.bracket, 'quarterfinals')) {
      expect(getMatchStatus(t, m)).toBe('ready');
      const r2 = simulateBracketMatch(t, TEAMS, m.id);
      // al ritorno in casa gioca chi era ospite all'andata
      expect(r2.homeTeamId).toBe(m.awayId);
      expect(r2.leg).toBe(2);
      expect(r2.aggregate).toEqual({
        home: r2.homeScore + t.matches[m.id].awayScore,
        away: r2.awayScore + t.matches[m.id].homeScore,
      });
    }
  });

  it('il ritorno con aggregato pari ma senza rigori è incoerente e viene rifiutato', () => {
    let t = drawnDouble();
    const qf1 = findMatch(t.bracket, 'QF1')!;
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1', result: fakeLeg(qf1.homeId!, qf1.awayId!, 2, 1, 1) });
    t = simulateRound(t, TEAMS); // le altre andate
    // 2-1 all'andata, 1-0 al ritorno per l'ospite: aggregato 2-2 senza rigori
    const bad = fakeLeg(qf1.awayId!, qf1.homeId!, 1, 0, 2);
    expect(tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1-R', result: bad })).toBe(t);
    // Aggregato pari con rigori: il vincitore è quello dei rigori.
    // shootout.home = lato di casa del ritorno = awayId del tie; vince 4-3
    // chi era in casa all'andata
    const rig = fakeLeg(qf1.awayId!, qf1.homeId!, 1, 0, 2, { shootout: { home: 3, away: 4 } });
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1-R', result: rig });
    expect(findMatch(t.bracket, 'QF1')!.winnerId).toBe(qf1.homeId);
    const score = tieScore(t, findMatch(t.bracket, 'QF1')!);
    expect(score).toMatchObject({ played: 2, home: 2, away: 2, shootout: { home: 4, away: 3 } });
  });

  it('un risultato incoerente con l\'aggregato viene rifiutato', () => {
    let t = drawnDouble();
    const qf1 = findMatch(t.bracket, 'QF1')!;
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1', result: fakeLeg(qf1.homeId!, qf1.awayId!, 3, 0, 1) });
    t = simulateRound(t, TEAMS);
    // awayId del ritorno vince 1-0 ma l'aggregato resta 3-1 per homeId:
    // il winnerId dichiarato (awayId del tie) è incoerente
    const bad = fakeLeg(qf1.awayId!, qf1.homeId!, 1, 0, 2);
    expect(tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1-R', result: bad })).toBe(t);
    // Stesso punteggio ma winnerId corretto (homeId del tie, cioè l'ospite del ritorno)
    const good = { ...bad, winnerId: qf1.homeId };
    const after = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: 'QF1-R', result: good });
    expect(after).not.toBe(t);
    expect(findMatch(after.bracket, 'QF1')!.winnerId).toBe(qf1.homeId);
  });

  it('torneo completo a due gare: 13 risultati, finale secca, un vincitore', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const t = simulateRemaining(drawnDouble(seed), TEAMS);
      expect(t.status).toBe('completed');
      const keys = Object.keys(t.matches);
      // 4 andate + 4 ritorni ai quarti, 2+2 in semifinale, finale secca
      expect(keys).toHaveLength(13);
      expect(keys.filter(k => k.endsWith('-R'))).toHaveLength(6);
      const final = findMatch(t.bracket, 'F')!;
      expect(final.legs).toBe(1);
      expect(t.winnerId).toBe(final.winnerId);
      // Chi avanza ha il record coerente con l'aggregato
      for (const m of t.bracket.filter(x => x.legs === 2)) {
        const score = tieScore(t, m);
        const winnerTotal = m.winnerId === m.homeId ? score.home : score.away;
        const loserTotal = m.winnerId === m.homeId ? score.away : score.home;
        expect(winnerTotal >= loserTotal).toBe(true);
      }
      expect(JSON.parse(JSON.stringify(t))).toEqual(t);
    }
  });

  it("flusso utente: stessa partita tiene occupata l'andata e il ritorno", () => {
    let t = drawnDouble(3);
    const userMatch = findUserMatch(t)!;
    expect(roundLeg(t, 'quarterfinals')).toBe(1);
    t = simulateRound(t, TEAMS, [userMatch.id]);
    t = tournamentReducer(t, { type: 'START_MATCH', matchId: userMatch.id });
    const r1 = simulateBracketMatch(t, TEAMS, userMatch.id);
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: userMatch.id, result: r1 });
    expect(t.currentMatchId).toBeNull();
    // L'utente non è eliminato e può rigiocare lo stesso tie per il ritorno
    expect(isUserEliminated(t)).toBe(false);
    expect(findUserMatch(t)!.id).toBe(userMatch.id);
    // I ritorni degli altri si completano; poi tocca a quello dell'utente
    t = simulateRound(t, TEAMS, [userMatch.id]);
    expect(getMatchStatus(t, findMatch(t.bracket, userMatch.id)!)).toBe('ready');
    t = tournamentReducer(t, { type: 'START_MATCH', matchId: userMatch.id });
    const r2 = simulateBracketMatch(t, TEAMS, userMatch.id);
    t = tournamentReducer(t, { type: 'RECORD_RESULT', matchId: legKey(userMatch.id, 2), result: r2 });
    expect(findMatch(t.bracket, userMatch.id)!.winnerId).not.toBeNull();
    expect(t.status).toBe('semifinals');
  });

  it('il riepilogo contiene entrambe le gare e l\'aggregato', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const t = simulateRemaining(drawnDouble(seed), TEAMS);
      const s = buildTournamentSummary(t, TEAMS);
      for (const m of s.matches) {
        if (m.round === 'final') {
          expect(m.legs).toBeUndefined();
        } else {
          expect(m.legs).toHaveLength(2);
          expect(m.legs!.reduce((n, l) => n + l.for, 0)).toBe(m.goalsFor);
        }
      }
      expect(s.stats.played).toBe(s.matches.reduce((n, m) => n + (m.legs?.length ?? 1), 0));
    }
  });

  it("simulateOthers non simula il ritorno dell'utente, anche se il suo tie è l'ultimo del turno", () => {
    // Utente in QF4 (slot 6/7 del sorteggio): il suo confronto viene
    // valutato per ultimo dal ciclo di simulateRound. Senza skip, quando il
    // ciclo lo raggiunge tutte le andate sono registrate e il ritorno è
    // 'ready' -> verrebbe simulato dall'IA (bug).
    const order = TEAMS.map(x => x.id).filter(id => id !== 'user');
    order.splice(6, 0, 'user');
    let t = tournamentReducer(
      createTournament({ teams: TEAMS, seasonId: '2015-16', seed: 1, format: 'double' }),
      { type: 'DRAW', order }
    );
    const qf4 = findMatch(t.bracket, 'QF4')!;
    expect(qf4.homeId).toBe('user');
    expect(findUserMatch(t)!.id).toBe('QF4');

    // L'utente gioca la sua andata
    t = tournamentReducer(t, { type: 'START_MATCH', matchId: 'QF4' });
    t = tournamentReducer(t, {
      type: 'RECORD_RESULT',
      matchId: 'QF4',
      result: simulateBracketMatch(t, TEAMS, 'QF4'),
    });
    const pre = t;

    // Causa documentata: simulateRound senza skip simulerebbe QF4-R
    expect(simulateRound(pre, TEAMS).matches['QF4-R']).toBeDefined();

    // Con simulateOthers si registrano le 4 andate e basta
    t = simulateOthers(pre, TEAMS);
    expect(Object.keys(t.matches)).toHaveLength(4);
    for (const id of ['QF1', 'QF2', 'QF3', 'QF4']) expect(t.matches[id]).toBeDefined();
    expect(t.matches['QF4-R']).toBeUndefined();
    expect(findMatch(t.bracket, 'QF4')!.winnerId).toBeNull();
    expect(t.status).toBe('quarterfinals');
    for (const id of ['QF1', 'QF2', 'QF3']) {
      expect(t.matches[`${id}-R`]).toBeUndefined();
      expect(findMatch(t.bracket, id)!.winnerId).toBeNull();
    }

    // L'utente gioca il ritorno: il turno si chiude
    t = tournamentReducer(t, { type: 'START_MATCH', matchId: 'QF4' });
    t = tournamentReducer(t, {
      type: 'RECORD_RESULT',
      matchId: 'QF4-R',
      result: simulateBracketMatch(t, TEAMS, 'QF4'),
    });
    t = simulateOthers(t, TEAMS);
    for (const m of roundMatches(t.bracket, 'quarterfinals')) expect(m.winnerId).not.toBeNull();
    expect(t.status).toBe('semifinals');
  });
});
