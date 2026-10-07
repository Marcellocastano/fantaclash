// Parsing dei CSV fantacalcio (BOM UTF-8, campi quotati, decimali con
// virgola, '-' = 0) e join del listone sulle statistiche per
// (club, ruolo) + nome normalizzato.

import { readFileSync } from 'node:fs';
import type { FantaRow, FantaRole } from '../derive/fantaOverall.ts';

export const STATS_CSV = 'LISTE/statistiche_storiche_totali_2003_2026.csv';
export const LISTONE_DIR = 'LISTE/all-seasons';

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Parser CSV generico: gestisce campi "..." con virgole interne. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = stripBom(text);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cur.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      cur.push(field);
      field = '';
      if (cur.length > 1 || cur[0] !== '') rows.push(cur);
      cur = [];
    } else field += ch;
  }
  if (field !== '' || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

/** "5,83" -> 5.83; "-", "" e valori non numerici -> 0. */
export function parseNum(raw: string): number {
  const t = (raw ?? '').trim().replace(',', '.');
  if (t === '' || t === '-') return 0;
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : 0;
}

/** Rig "parati/affrontati" o "realizzati/calciati": "-/2" = 0/2. */
export function parseRig(raw: string): { scored: number; taken: number } {
  const t = (raw ?? '').trim();
  const m = /^(.+)\/(.+)$/.exec(t);
  if (!m) return { scored: 0, taken: 0 };
  return { scored: parseNum(m[1]), taken: parseNum(m[2]) };
}

function toRole(s: string): FantaRole | null {
  const r = s.trim().toUpperCase();
  return r === 'P' || r === 'D' || r === 'C' || r === 'A' ? r : null;
}

/** Carica e tipizza tutte le righe delle statistiche storiche. */
export function loadStatsRows(path: string): FantaRow[] {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  // header: Squadra,Ruolo,Calciatore,MP,MV,Go,As,Am,Es,Au,Rig,Resa,Fantasquadra,Pr,Ti,Qu,Stagione
  const out: FantaRow[] = [];
  for (const r of rows.slice(1)) {
    const role = toRole(r[1] ?? '');
    if (!role) continue;
    const rig = parseRig(r[10] ?? '');
    out.push({
      club: (r[0] ?? '').trim(),
      role,
      name: (r[2] ?? '').trim(),
      mv: parseNum(r[4] ?? ''),
      go: parseNum(r[5] ?? ''),
      assists: parseNum(r[6] ?? ''),
      yellow: parseNum(r[7] ?? ''),
      red: parseNum(r[8] ?? ''),
      ownGoals: parseNum(r[9] ?? ''),
      penScored: rig.scored,
      penTaken: rig.taken,
      pr: parseNum(r[13] ?? ''),
      ti: parseNum(r[14] ?? ''),
      qu: parseNum(r[15] ?? ''),
      season: (r[16] ?? '').trim(),
    });
  }
  return out;
}

export interface ListoneRow {
  role: FantaRole;
  name: string;
  club: string;
  quotazioneFinale: number;
  quotazioneIniziale: number;
}

/** Carica il listone di una stagione (file listone_<YYYY-YYYY>.csv). */
export function loadListone(path: string): ListoneRow[] {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  // header: Ruolo,Calciatore,Squadra,Quotazione Finale,Quotazione Iniziale
  const out: ListoneRow[] = [];
  for (const r of rows.slice(1)) {
    const role = toRole(r[0] ?? '');
    if (!role) continue;
    out.push({
      role,
      name: (r[1] ?? '').trim(),
      club: (r[2] ?? '').trim(),
      quotazioneFinale: parseNum(r[3] ?? ''),
      quotazioneIniziale: parseNum(r[4] ?? ''),
    });
  }
  return out;
}

/**
 * Normalizza un nome per il join: maiuscolo, senza accenti, apostrofi e
 * punti, spazi compressi. Esempio: "HIGUAIN Gonzalo Gera." -> "HIGUAIN GONZALO GERA"
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''.`]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match tra un nome del listone e le righe stats dello stesso
 * (club, ruolo): esatto, altrimenti uno prefisso dell'altro (nomi troncati),
 * altrimenti stesso cognome (primo token) se unico nel gruppo.
 */
export function findStatsMatch(
  listoneName: string,
  candidates: FantaRow[]
): FantaRow | null {
  const norm = normalizeName(listoneName);
  const byNorm = candidates.map(r => normalizeName(r.name));

  const exact = candidates.find((_, i) => byNorm[i] === norm);
  if (exact) return exact;

  const prefix = candidates.filter(
    (_, i) => byNorm[i].startsWith(norm) || norm.startsWith(byNorm[i])
  );
  if (prefix.length === 1) return prefix[0];

  const surname = norm.split(' ')[0];
  const sameSurname = candidates.filter(
    (_, i) => byNorm[i].split(' ')[0] === surname
  );
  if (sameSurname.length === 1) return sameSurname[0];
  return null;
}
