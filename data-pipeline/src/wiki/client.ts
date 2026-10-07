// Client per l'API MediaWiki di it.wikipedia.org.
// Regole: una richiesta alla volta, >= 1000 ms tra richieste di rete,
// retry con backoff su 429/5xx (max 3 tentativi, rispetta Retry-After),
// cache su disco in data-pipeline/cache/wiki/<sha1(query)>.json.

import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = 'https://it.wikipedia.org/w/api.php';
const USER_AGENT =
  'FantaClashDataPipeline/0.1 (open-data research for a free fantasy football game)';
const MIN_DELAY_MS = 1000;
const MAX_RETRIES = 3;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE_DIR = join(ROOT, 'cache', 'wiki');

let lastRequestAt = 0;
let networkRequests = 0;

/** Numero di richieste di rete effettuate (le risposte in cache non contano). */
export function getNetworkRequestCount(): number {
  return networkRequests;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cachePath(query: string): string {
  const sha1 = createHash('sha1').update(query).digest('hex');
  return join(CACHE_DIR, `${sha1}.json`);
}

async function fetchApi(query: string): Promise<unknown> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const path = cachePath(query);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf8'));
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const wait = MIN_DELAY_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    networkRequests++;

    let res: Response;
    try {
      res = await fetch(`${API_URL}?${query}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await sleep(1000 * (attempt + 1));
      continue;
    }

    if (res.ok) {
      const json = await res.json();
      writeFileSync(path, JSON.stringify(json));
      return json;
    }

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('Retry-After'));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2000 * (attempt + 1);
      lastError = new Error(`HTTP ${res.status}`);
      await sleep(backoff);
      continue;
    }

    throw new Error(`HTTP ${res.status} per query: ${query}`);
  }

  throw lastError ?? new Error('richiesta fallita');
}

function baseQuery(params: Record<string, string>): string {
  const q = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    redirects: '1',
    ...params,
  });
  return q.toString();
}

type ParseResponse = {
  parse?: {
    title?: string;
    sections?: { index: string; line: string; anchor?: string }[];
    wikitext?: string;
    links?: { ns: number; title: string; exists?: string }[];
  };
  error?: { code: string; info: string };
};

export type WikiSection = { index: string; line: string };

function isMissingPage(res: ParseResponse): boolean {
  return !!res.error || !res.parse;
}

/** Sezioni della pagina (action=parse&prop=sections). null se la pagina manca. */
export async function getSections(title: string): Promise<WikiSection[] | null> {
  const res = (await fetchApi(
    baseQuery({ action: 'parse', prop: 'sections', page: title })
  )) as ParseResponse;
  if (isMissingPage(res)) return null;
  return (res.parse?.sections ?? []).map(s => ({ index: s.index, line: s.line }));
}

/** Wikitesto di una sezione (prop=wikitext&section=N). null se manca. */
export async function getSectionWikitext(
  title: string,
  index: string
): Promise<string | null> {
  const res = (await fetchApi(
    baseQuery({ action: 'parse', prop: 'wikitext', page: title, section: index })
  )) as ParseResponse;
  if (isMissingPage(res)) return null;
  return typeof res.parse?.wikitext === 'string' ? res.parse.wikitext : null;
}

/** Link ns 0 di una sezione (prop=links&section=N). null se la pagina manca. */
export async function getSectionLinks(
  title: string,
  index: string
): Promise<string[] | null> {
  const res = (await fetchApi(
    baseQuery({ action: 'parse', prop: 'links', page: title, section: index })
  )) as ParseResponse;
  if (isMissingPage(res)) return null;
  return (res.parse?.links ?? [])
    .filter(l => l.ns === 0)
    .map(l => l.title);
}
