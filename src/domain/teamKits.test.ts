import { describe, expect, it, vi } from 'vitest';
import {
  assignKits,
  isKitId,
  KITS,
  KIT_NAME_KEY,
  kitOf,
  randomKitId,
} from './teamKits';
import type { KitId } from './teamKits';
import { createRng } from '../services/auction/rng';

describe('teamKits', () => {
  it('ha 13 preset con id unici, tutti KitId, con nomi catalogo', () => {
    expect(KITS).toHaveLength(13);
    expect(new Set(KITS.map(k => k.id)).size).toBe(KITS.length);
    for (const kit of KITS) {
      expect(isKitId(kit.id)).toBe(true);
      expect(KIT_NAME_KEY[kit.id]).toBe(`ui.kits.${kit.id}`);
      for (const hex of [kit.primary, kit.secondary, kit.on]) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
    expect(isKitId('blu')).toBe(false);
    expect(isKitId(undefined)).toBe(false);
  });

  it('kitOf usa il kit scelto; senza kit ripiega su un preset deterministico', () => {
    expect(kitOf({ id: 'a', name: 'X', kit: 'granata' }).id).toBe('granata');
    const first = kitOf({ id: 'team-1', name: 'Uno' });
    expect(KITS).toContainEqual(first);
    expect(kitOf({ id: 'team-1', name: 'Uno' })).toEqual(first);
    // Stabile anche a nome cambiato: conta l'id
    expect(kitOf({ id: 'team-1', name: 'Rinominata' })).toEqual(first);
    // Senza id conta il nome
    expect(kitOf({ name: 'Uno' })).toEqual(kitOf({ name: 'Uno' }));
    // Valori non validi (dati corrotti) tornano al fallback
    const bad = { id: 'b', name: 'Y', kit: 'blu' as never };
    expect(kitOf(bad)).toEqual(kitOf({ id: 'b', name: 'Y' }));
  });

  it('assignKits conserva i kit dati e completa gli altri con preset distinti', () => {
    const teams: { id: string; kit?: KitId }[] = [
      { id: 'h1', kit: 'nerazzurro' },
      { id: 'h2', kit: 'granata' },
      ...Array.from({ length: 6 }, (_, i) => ({ id: `b${i}` })),
    ];
    const out = assignKits(teams);
    expect(out[0].kit).toBe('nerazzurro');
    expect(out[1].kit).toBe('granata');
    const kits = out.map(t => t.kit);
    expect(kits.every(isKitId)).toBe(true);
    expect(new Set(kits).size).toBe(8);
    // I riempimenti evitano i kit già assegnati esplicitamente
    expect(out.slice(2).every(t => t.kit !== 'nerazzurro' && t.kit !== 'granata')).toBe(true);
    // Gli oggetti già assegnati restano la stessa referenza
    expect(out[0]).toBe(teams[0]);
  });

  it('assignKits è deterministico sugli id e non tocca Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    const mk = (): { id: string; kit?: KitId }[] => Array.from({ length: 8 }, (_, i) => ({ id: `team-${i}` }));
    const a = assignKits(mk());
    const b = assignKits(mk());
    expect(a.map(t => t.kit)).toEqual(b.map(t => t.kit));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('randomKitId restituisce sempre un preset valido', () => {
    const rng = createRng(42);
    for (let i = 0; i < 40; i++) expect(isKitId(randomKitId(rng))).toBe(true);
    expect(randomKitId(() => 0)).toBe(KITS[0].id);
    expect(randomKitId(() => 0.999)).toBe(KITS[KITS.length - 1].id);
  });
});
