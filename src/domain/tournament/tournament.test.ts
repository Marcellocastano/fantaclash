import { describe, it, expect } from 'vitest';
import { createRng } from '../../services/auction/rng';
import { tournamentTeams } from '../../test/matchFixtures';
import {
  buildTournamentSummary,
  createTournament,
  drawOrder,
  findMatch,
  findUserMatch,
  getMatchStatus,
  getTeamOutcome,
  isUserEliminated,
  monogram,
  roundMatches,
  simulateBracketMatch,
  simulateRemaining,
  simulateRound,
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
