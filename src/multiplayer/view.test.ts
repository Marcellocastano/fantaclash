import { describe, it, expect } from 'vitest';
import { projectForViewer } from './view';
import { createRoom } from './roomReducer';
import { createTournament } from '../domain/tournament';
import { RoomState } from './protocol';
import { createTestTeam } from '../test/testUtils';

function roomWithTeams(): RoomState {
  const base = createRoom({
    code: 'ABC23', hostId: 'h1',
    host: { nickname: 'H', teamName: 'Host FC' },
    settings: { season: '2024-25', difficulty: 'normale' },
    now: 0,
  });
  const teams = [
    createTestTeam({ id: 'ta', isUserTeam: false, ownerId: 'h1', controller: 'human' }),
    createTestTeam({ id: 'tb', isUserTeam: false, ownerId: 'p2', controller: 'human' }),
    createTestTeam({ id: 'tc', isUserTeam: false, controller: 'bot' }),
  ];
  return {
    ...base,
    phase: 'tournament',
    teams,
    tournament: createTournament({ teams, seasonId: '2024-25', seed: 1 }),
  };
}

describe('projectForViewer', () => {
  it('marca isUserTeam sulla squadra del viewer, nel mondo e nel torneo', () => {
    const v = projectForViewer(roomWithTeams(), 'p2');
    expect(v.myTeamId).toBe('tb');
    expect(v.teams.find(t => t.id === 'tb')?.isUserTeam).toBe(true);
    expect(v.teams.find(t => t.id === 'ta')?.isUserTeam).toBe(false);
    expect(v.tournament?.userTeamId).toBe('tb');
    expect(v.tournament?.teams.find(t => t.id === 'tb')?.isUserTeam).toBe(true);
    expect(v.tournament?.teams.find(t => t.id === 'ta')?.isUserTeam).toBe(false);
  });

  it('myPlayerId null -> spettatore: nessuna squadra dell’utente', () => {
    const v = projectForViewer(roomWithTeams(), null);
    expect(v.myTeamId).toBeNull();
    expect(v.teams.every(t => !t.isUserTeam)).toBe(true);
    expect(v.tournament?.teams.every(t => !t.isUserTeam)).toBe(true);
    expect(v.tournament?.userTeamId).toBe('');
  });
});
