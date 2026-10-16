import { createRng, hashSeed, shuffle } from '../services/auction/rng';
import type { CatalogKey } from '../i18n/translate';

/**
 * Colori sociali delle squadre: preset fissi in stile Serie A classica,
 * non tinte libere. L'utente ne sceglie uno in setup; ai bot (e ai dati
 * precedenti ai kit) se ne assegnano di deterministici: niente
 * Math.random, niente la Rng del chiamante — così i seed di id e bot
 * non cambiano rispetto a prima.
 */

export type KitId =
  | 'nerazzurro'
  | 'rossonero'
  | 'bianconero'
  | 'giallorosso'
  | 'biancoceleste'
  | 'granata'
  | 'viola'
  | 'azzurro'
  | 'rossoblu'
  | 'blucerchiato'
  | 'gialloblu'
  | 'neroverde'
  | 'biancorosso';

export interface Kit {
  id: KitId;
  /** Colore principale dello stemma */
  primary: string;
  /** Banda in fondo allo stemma */
  secondary: string;
  /** Colore della sigla sul primario */
  on: string;
}

export const KITS: readonly Kit[] = [
  { id: 'nerazzurro', primary: '#1E4FA8', secondary: '#111111', on: '#FFFFFF' },
  { id: 'rossonero', primary: '#C8102E', secondary: '#111111', on: '#FFFFFF' },
  { id: 'bianconero', primary: '#111111', secondary: '#FFFFFF', on: '#FFFFFF' },
  { id: 'giallorosso', primary: '#8E1F2F', secondary: '#F5B500', on: '#FFFFFF' },
  { id: 'biancoceleste', primary: '#8FC8EA', secondary: '#FFFFFF', on: '#15201A' },
  { id: 'granata', primary: '#7A1F2B', secondary: '#FFFFFF', on: '#FFFFFF' },
  { id: 'viola', primary: '#5B2A86', secondary: '#FFFFFF', on: '#FFFFFF' },
  { id: 'azzurro', primary: '#1D8FD8', secondary: '#FFFFFF', on: '#FFFFFF' },
  { id: 'rossoblu', primary: '#A6192E', secondary: '#0E2A5C', on: '#FFFFFF' },
  { id: 'blucerchiato', primary: '#1C3F94', secondary: '#FFFFFF', on: '#FFFFFF' },
  { id: 'gialloblu', primary: '#1A3E8C', secondary: '#FFD23F', on: '#FFFFFF' },
  { id: 'neroverde', primary: '#0B7A43', secondary: '#111111', on: '#FFFFFF' },
  { id: 'biancorosso', primary: '#FFFFFF', secondary: '#C8102E', on: '#15201A' },
];

/** Chiave catalogo del nome mostrato di ogni preset */
export const KIT_NAME_KEY: Record<KitId, CatalogKey> = {
  nerazzurro: 'ui.kits.nerazzurro',
  rossonero: 'ui.kits.rossonero',
  bianconero: 'ui.kits.bianconero',
  giallorosso: 'ui.kits.giallorosso',
  biancoceleste: 'ui.kits.biancoceleste',
  granata: 'ui.kits.granata',
  viola: 'ui.kits.viola',
  azzurro: 'ui.kits.azzurro',
  rossoblu: 'ui.kits.rossoblu',
  blucerchiato: 'ui.kits.blucerchiato',
  gialloblu: 'ui.kits.gialloblu',
  neroverde: 'ui.kits.neroverde',
  biancorosso: 'ui.kits.biancorosso',
};

const KIT_BY_ID = new Map<KitId, Kit>(KITS.map(k => [k.id, k]));

export function isKitId(v: unknown): v is KitId {
  return typeof v === 'string' && KIT_BY_ID.has(v as KitId);
}

/**
 * Kit di una squadra: quello scelto se valido, altrimenti un preset
 * deterministico da id (o nome) — serve per i salvataggi precedenti ai
 * colori sociali, che restano giocabili e sempre identici a se stessi.
 */
export function kitOf(team: { id?: string; name: string; kit?: KitId }): Kit {
  if (team.kit && isKitId(team.kit)) return KIT_BY_ID.get(team.kit)!;
  return KITS[hashSeed(team.id ?? team.name) % KITS.length];
}

/**
 * Riempie i kit mancanti con preset distinti, senza toccare quelli già
 * scelti (anche se due squadre hanno lo stesso: resta com'è). Le
 * assegnazioni evitano i preset già in uso e sono deterministiche sugli
 * id delle squadre.
 */
export function assignKits<T extends { id: string; kit?: KitId }>(teams: T[]): T[] {
  const rng = createRng(hashSeed(...teams.map(t => t.id)));
  const taken = new Set(teams.map(t => t.kit).filter(isKitId));
  const free = shuffle(
    KITS.map(k => k.id).filter(id => !taken.has(id)),
    rng
  );
  let next = 0;
  return teams.map(t => {
    if (isKitId(t.kit)) return t;
    const kit = free.length ? free[next++ % free.length] : undefined;
    return { ...t, kit };
  });
}

/** Preset a caso (valore iniziale dei picker); rng iniettabile per i test */
export function randomKitId(rng: () => number = Math.random): KitId {
  return KITS[Math.floor(rng() * KITS.length)].id;
}
