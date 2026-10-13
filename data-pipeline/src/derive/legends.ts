// Listone "Legends": i migliori calciatori delle 23 annate, una sola card
// per giocatore nella sua stagione migliore. Funzioni pure: nessuna I/O.
//
// 1. Chiave giocatore: cognome normalizzato + prime 3 lettere del nome
//    (i dati storici hanno il cognome in maiuscolo). Cognome solo se non
//    c'è il nome. Così "KAKA Ricardo" e "KAKA' Ricardo Izecso." sono la
//    stessa chiave, mentre MANCINI Alessandro/Amantino/Gianluca restano
//    tre giocatori diversi. Le eccezioni vanno in ALIASES.
// 2. Annata migliore: punteggio = overall stagionale + tiebreak/100.
// 3. Selezione: top N per ruolo (P 12, D 24, C 36, A 24).
// 4. Riscalatura: overall' = 99 - 15 * rank/(N-1), a parità di punteggio
//    lo stesso valore. Dentro le Legends conta solo l'ordine relativo:
//    il 99 è il migliore di sempre del ruolo, l'ultimo vale 84.
// 5. baseValue da overallToBaseValue sul campo riscalato.

import type { Player, PlayerRole } from '../../../src/types/index.ts';
import { FANTA_CONFIG } from './fantaOverall.ts';

export const LEGENDS_ID = 'legends';
export const LEGENDS_LABEL = 'Legends';
export const LEGENDS_COUNT: Record<PlayerRole, number> = { P: 12, D: 24, C: 36, A: 24 };
export const LEGENDS_MIN_OVR = 84;
export const LEGENDS_MAX_OVR = 99;
const ROLES: PlayerRole[] = ['P', 'D', 'C', 'A'];

/** Alias di chiave -> chiave canonica, per varianti di nome non coperte. */
export const ALIASES: Record<string, string> = {};

const isUpperWord = (w: string) => w.length > 1 && w === w.toUpperCase() && /\p{Lu}/u.test(w);

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cognome (token maiuscoli iniziali) e nome, come utils/playerName. */
export function splitIdentity(name: string): { surname: string; given: string } {
  const words = name.trim().split(/\s+/);
  if (isUpperWord(words[0])) {
    const surname: string[] = [];
    let i = 0;
    while (i < words.length && isUpperWord(words[i])) surname.push(words[i++]);
    return { surname: surname.join(' '), given: words.slice(i).join(' ') };
  }
  if (words.length === 1) return { surname: words[0], given: '' };
  return { surname: words[words.length - 1], given: words.slice(0, -1).join(' ') };
}

/**
 * Chiave grezza: "COGNOME|PRI" (cognome senza spazi, prime 3 lettere del
 * primo nome proprio). Il cognome solo se il nome non c'è.
 */
export function playerKey(name: string): string {
  const { surname, given } = splitIdentity(name);
  const sur = normalize(surname).replace(/ /g, '');
  const first = normalize(given.split(' ')[0] ?? '');
  return first ? `${sur}|${first.slice(0, 3)}` : sur;
}

/** Chiave canonica: alias, oppure cognome solo che ha un'unica variante. */
export function canonicalKey(name: string, allKeys: ReadonlySet<string>): string {
  const k = playerKey(name);
  if (ALIASES[k]) return ALIASES[k];
  if (k.includes('|')) return k;
  const prefixed = [...allKeys].filter(x => x.startsWith(`${k}|`));
  return prefixed.length === 1 ? prefixed[0] : k;
}

/** Tiebreak a parità di overall: affidabilità, poi produzione offensiva. */
export function legendTiebreak(p: Player): number {
  const s = p.stats;
  const apps = Math.max(1, s?.appearances ?? 1);
  if (p.role === 'P') return p.reliability - (s?.goalsConceded ?? 0) / apps;
  const prod = ((s?.goals ?? 0) + (p.role === 'A' ? 0.6 : 1) * (s?.assists ?? 0)) / apps;
  return p.reliability + prod;
}

/** Punteggio Legends: overall dell'annata, a parità il tiebreak. */
export function legendScore(p: Player): number {
  return (p.overall ?? 0) + legendTiebreak(p) / 100;
}

/** Possibili collisioni: stesso cognome con chiavi diverse (da verificare). */
export function collisionReport(byKey: Map<string, Player>): { surname: string; keys: string[] }[] {
  const bySurname = new Map<string, Set<string>>();
  for (const key of byKey.keys()) {
    const surname = key.split('|')[0];
    (bySurname.get(surname) ?? bySurname.set(surname, new Set()).get(surname)!).add(key);
  }
  return [...bySurname.entries()]
    .filter(([, keys]) => keys.size > 1)
    .map(([surname, keys]) => ({ surname, keys: [...keys].sort() }))
    .sort((a, b) => a.surname.localeCompare(b.surname));
}

/** Overall riscalato per il rank nel ruolo (0 = migliore di sempre). */
export function legendOverall(rank: number, count: number): number {
  if (count <= 1) return LEGENDS_MAX_OVR;
  const o = Math.round(LEGENDS_MAX_OVR - (LEGENDS_MAX_OVR - LEGENDS_MIN_OVR) * (rank / (count - 1)));
  return Math.min(LEGENDS_MAX_OVR, Math.max(LEGENDS_MIN_OVR, o));
}

export interface LegendsResult {
  players: Player[];
  /** Cognomi con più chiavi distinte: da controllare a mano. */
  collisions: { surname: string; keys: string[] }[];
  /** Per ruolo: selezionati e scartati (per il report dello script). */
  report: Record<PlayerRole, { picked: string[]; cut: string[] }>;
}

/**
 * Costruisce il listone Legends dall'unione dei giocatori di tutte le
 * annate (ognuno con overall, baseValue, season e stats già calcolati).
 */
export function buildLegends(
  allSeasons: Player[],
  counts: Record<PlayerRole, number> = LEGENDS_COUNT
): LegendsResult {
  // Dedup in due passate: prima tutte le chiavi grezze, così un cognome
  // solo si unisce alla sua unica variante "COGNOME|NOme" (es. RONALDO /
  // RONALDO Cristiano) indipendentemente dall'ordine delle annate
  const rawKeys = new Set(allSeasons.map(p => playerKey(p.name)));
  const byKey = new Map<string, Player>();
  for (const p of allSeasons) {
    const k = canonicalKey(p.name, rawKeys);
    const cur = byKey.get(k);
    if (!cur || legendScore(p) > legendScore(cur)) byKey.set(k, p);
  }

  const players: Player[] = [];
  const report = {} as LegendsResult['report'];
  for (const role of ROLES) {
    const candidates = [...byKey.values()]
      .filter(p => p.role === role)
      .sort((a, b) => legendScore(b) - legendScore(a) || a.name.localeCompare(b.name));
    const top = candidates.slice(0, counts[role]);
    report[role] = {
      picked: top.map(p => `${p.name} (${p.season}, ${p.overall})`),
      cut: candidates.slice(counts[role]).slice(0, 5).map(p => `${p.name} (${p.season}, ${p.overall})`),
    };
    // rank = posizione nel ruolo; a parità di punteggio lo stesso overall
    let rank = 0;
    let prev = -Infinity;
    for (const p of top) {
      const score = legendScore(p);
      if (score < prev) rank++;
      prev = score;
      const overall = legendOverall(rank, top.length);
      players.push({
        ...p,
        overall,
        baseValue: legendBaseValue(overall, p.role),
        legend: true,
      });
    }
  }

  players.sort((a, b) => b.overall! - a.overall! || a.name.localeCompare(b.name));
  return { players, collisions: collisionReport(byKey), report };
}

/** baseValue della formula, riferito al campo riscalato 70..99. */
export function legendBaseValue(overall: number, role: PlayerRole): number {
  const t = Math.min(1, Math.max(0, (overall - 70) / (LEGENDS_MAX_OVR - 70)));
  return Math.max(1, Math.round(FANTA_CONFIG.ROLE_MAX[role] * t * t));
}
