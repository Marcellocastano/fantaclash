// Utilità condivise per i CSV di transfermarkt-datasets: download con cache
// su disco e parsing di file .csv.gz.

import { gunzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CACHE_DIR = join(ROOT, 'cache', 'transfermarkt');
export const BASE_URL = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data';

export async function downloadCached(name: string): Promise<Buffer> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const path = join(CACHE_DIR, name);
  if (existsSync(path)) return readFileSync(path);
  const url = `${BASE_URL}/${name}`;
  console.log(`${name}: download da ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  return buf;
}

export type CsvTable = { header: string[]; rows: string[][] };

export function parseCsvText(text: string): CsvTable {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  return { header: parseLine(lines[0]), rows: lines.slice(1).map(parseLine) };
}

export async function loadCsvGz(name: string): Promise<CsvTable> {
  const buf = await downloadCached(name);
  return parseCsvText(gunzipSync(buf).toString('utf8'));
}

/** Converte una tabella in array di record colonna->valore. */
export function toRecords(table: CsvTable): Record<string, string>[] {
  return table.rows.map(r => {
    const rec: Record<string, string> = {};
    table.header.forEach((h, i) => {
      rec[h] = r[i] ?? '';
    });
    return rec;
  });
}
