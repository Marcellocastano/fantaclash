import { describe, expect, it } from 'vitest';
import { generateAllTeams } from './teamGenerator';
import { createRng } from './auction/rng';
import { isKitId } from '../domain/teamKits';
import { createFullPlayerSet } from '../test/testUtils';
import { Team } from '../types';

const pool = createFullPlayerSet();

describe('generateAllTeams — colori sociali', () => {
  it('applica il kit scelto alla squadra utente e riempie i bot con preset distinti', () => {
    const teams = generateAllTeams('Mia Squadra', 'normale', pool, createRng(7), 'rossonero');
    expect(teams).toHaveLength(8);
    expect(teams[0].isUserTeam).toBe(true);
    expect(teams[0].kit).toBe('rossonero');
    const botKits = teams.slice(1).map(t => t.kit);
    expect(botKits.every(isKitId)).toBe(true);
    // Bot distinti tra loro e diversi dal kit scelto dall'utente
    expect(new Set(botKits).size).toBe(botKits.length);
    expect(botKits).not.toContain('rossonero');
  });

  it('senza kit scelto ogni squadra riceve comunque un preset', () => {
    const teams = generateAllTeams('Mia Squadra', 'normale', pool, createRng(7));
    expect(teams.every(t => isKitId(t.kit))).toBe(true);
    expect(new Set(teams.map(t => t.kit)).size).toBe(8);
  });

  it('i kit non consumano la rng: stessi id e stesse configurazioni bot a parità di seed', () => {
    const withoutKit = generateAllTeams('Mia Squadra', 'normale', pool, createRng(7));
    const withKit = generateAllTeams('Mia Squadra', 'normale', pool, createRng(7), 'granata');
    // I nomi bot pescano da Math.random: si confrontano i campi seedati
    const strip = (teams: Team[]) => teams.map(t => ({ ...t, kit: undefined, name: undefined }));
    expect(strip(withKit)).toEqual(strip(withoutKit));
    expect(withKit[0].kit).toBe('granata');
  });
});
