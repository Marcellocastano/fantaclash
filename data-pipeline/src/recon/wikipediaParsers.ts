// Parser puri per il wikitesto delle pagine di stagione dei club su it.wiki.
// Nessuna I/O: tutte le funzioni prendono stringhe e restituiscono dati.

export type StatRow = {
  /** Nome completo dal {{Sortname}} che precede il {{Sommastat}} sulla stessa riga */
  name: string;
  /** true se il nome è in corsivo (''…''): giocatore ceduto a stagione in corso */
  leftMidSeason: boolean;
  /** Numeri del {{Sommastat}} (interi, anche negativi; vuoti finali ignorati) */
  numbers: number[];
};

export type StatsSection = {
  hasStatsTemplate: boolean;
  /** Valori dei parametri CompetizioneN nell'ordine in cui compaiono */
  competitions: string[];
  /** Indice della prima competizione che inizia con 'Serie A' (-1 se assente) */
  serieAIndex: number;
  rows: StatRow[];
};

export type RosaEntry = {
  ruolo: 'P' | 'D' | 'C' | 'A' | 'other';
  name: string;
  linkTarget: string | null;
};

export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim();
}

/** Divide i parametri di un template wiki: toglie {{ }} e split su '|'. */
function templateParams(template: string): string[] {
  const inner = template.replace(/^\{\{/, '').replace(/\}\}\s*$/, '');
  return inner.split('|');
}

function findBalancedTemplate(text: string, start: number): string {
  // start punta a '{{'. Restituisce la sottostringa fino al '}}' corrispondente.
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{') depth++;
    else if (two === '}}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 2);
    }
  }
  return text.slice(start);
}

function parseSortname(segment: string): { name: string; leftMidSeason: boolean } | null {
  const m = /\{\{[Ss]ortname/.exec(segment);
  if (!m) return null;
  const tpl = findBalancedTemplate(segment, m.index);
  const params = templateParams(tpl).slice(1).map(p => p.trim());
  const [a = '', b = '', c = ''] = params;
  const full = (c !== '' ? c : `${a} ${b}`).trim();
  // il corsivo (''…'' intorno al nome) segnala la cessione a stagione in corso
  return { name: full, leftMidSeason: segment.includes("''") };
}

/** Estrae i parametri CompetizioneN nel loro ordine di apparizione. */
function parseCompetitions(header: string): string[] {
  const out: string[] = [];
  const re = /Competizione\d+\s*=\s*([^\n|}]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header)) !== null) {
    out.push(m[1].replace(/\[\[|\]\]/g, '').trim());
  }
  return out;
}

function parseIntegers(paramList: string[]): number[] {
  // toglie il nome del template, trim, ignora i vuoti finali;
  // i segnaposto non interi ('-' = nessuna presenza in quella competizione)
  // contano come 0 per preservare l'allineamento dei blocchi da 4
  const rest = paramList.map(p => p.trim());
  while (rest.length > 0 && rest[rest.length - 1] === '') rest.pop();
  return rest.map(p => (/^-?\d+$/.test(p) ? parseInt(p, 10) : 0));
}

/** Parsa la sezione 'Statistiche dei giocatori'. */
export function parseStatsSection(wikitext: string): StatsSection {
  const hasStatsTemplate = wikitext.includes('{{Statistiche dei giocatori');
  const competitions: string[] = [];
  const rows: StatRow[] = [];

  for (const line of wikitext.split('\n')) {
    if (line.includes('Competizione')) {
      competitions.push(...parseCompetitions(line));
    }
    const statIdx = line.indexOf('{{Sommastat');
    if (statIdx === -1) continue;
    const tpl = findBalancedTemplate(line, statIdx);
    const numbers = parseIntegers(templateParams(tpl).slice(1));
    const sn = parseSortname(line.slice(0, statIdx));
    rows.push({
      name: sn?.name ?? '',
      leftMidSeason: sn?.leftMidSeason ?? false,
      numbers,
    });
  }

  const serieAIndex = competitions.findIndex(c => c.startsWith('Serie A'));
  return { hasStatsTemplate, competitions, serieAIndex, rows };
}

export type StatsMetrics = {
  statsRows: number;
  rowsWithBadArity: number;
  serieAAppsSum: number;
  serieAGoalsPositiveSum: number;
  serieAGoalsNegativeSum: number;
  hasStats: boolean;
};

/** Metriche sulle righe statistiche: blocco k = numeri [4k..4k+3]. */
export function statsMetrics(stats: StatsSection): StatsMetrics {
  const k = stats.serieAIndex;
  let bad = 0;
  let apps = 0;
  let goalsPos = 0;
  let goalsNeg = 0;
  for (const row of stats.rows) {
    const n = row.numbers.length;
    if (n % 4 !== 0 || (k >= 0 && n < 4 * (k + 1))) bad++;
    if (k >= 0 && n >= 4 * (k + 1)) {
      apps += row.numbers[4 * k];
      const goals = row.numbers[4 * k + 1];
      if (goals >= 0) goalsPos += goals;
      else goalsNeg += goals;
    }
  }
  return {
    statsRows: stats.rows.length,
    rowsWithBadArity: bad,
    serieAAppsSum: apps,
    serieAGoalsPositiveSum: goalsPos,
    serieAGoalsNegativeSum: goalsNeg,
    hasStats: stats.hasStatsTemplate && stats.serieAIndex >= 0 && stats.rows.length >= 11,
  };
}

const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;

function cleanWikilinks(text: string): { name: string; linkTarget: string | null } {
  let linkTarget: string | null = null;
  const name = text.replace(WIKI_LINK, (_all, target: string, label?: string) => {
    linkTarget = target.trim();
    return label !== undefined && label.trim() !== '' ? label : target;
  });
  return { name: name.replace(/''/g, '').trim(), linkTarget };
}

/** Parsa la sezione 'Rosa': voci {{Calciatore in rosa|ruolo=…|nome=…}}. */
export function parseRosaSection(wikitext: string): RosaEntry[] {
  const entries: RosaEntry[] = [];
  const re = /\{\{Calciatore in rosa\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wikitext)) !== null) {
    const tpl = findBalancedTemplate(wikitext, m.index);
    const params = templateParams(tpl).slice(1);
    let ruolo: RosaEntry['ruolo'] = 'other';
    let name = '';
    let linkTarget: string | null = null;
    for (const raw of params) {
      const eq = raw.indexOf('=');
      if (eq === -1) continue;
      const key = raw.slice(0, eq).trim().toLowerCase();
      const value = raw.slice(eq + 1).trim();
      if (key === 'ruolo') {
        const r = value.toUpperCase();
        ruolo = r === 'P' || r === 'D' || r === 'C' || r === 'A' ? r : 'other';
      } else if (key === 'nome') {
        const cleaned = cleanWikilinks(value);
        name = cleaned.name;
        linkTarget = cleaned.linkTarget;
      }
    }
    entries.push({ ruolo, name, linkTarget });
  }
  return entries;
}

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function surname(name: string): string {
  const parts = normalizeName(name).split(' ');
  return parts[parts.length - 1] ?? '';
}

/** Quota di righe statistiche il cui nome matcha una voce di rosa. */
export function matchRate(stats: StatsSection, rosa: RosaEntry[]): number {
  if (stats.rows.length === 0) return 0;
  const rosaNames = new Set<string>();
  for (const e of rosa) {
    if (e.name) rosaNames.add(normalizeName(e.name));
    if (e.linkTarget) rosaNames.add(normalizeName(e.linkTarget));
  }
  // conteggio cognomi per il fallback "cognome unico nella rosa"
  const surnameCount = new Map<string, number>();
  for (const n of rosaNames) {
    const parts = n.split(' ');
    const last = parts[parts.length - 1];
    if (last) surnameCount.set(last, (surnameCount.get(last) ?? 0) + 1);
  }
  let matched = 0;
  for (const row of stats.rows) {
    const norm = normalizeName(row.name);
    if (norm && rosaNames.has(norm)) {
      matched++;
      continue;
    }
    const last = surname(row.name);
    if (last && surnameCount.get(last) === 1) matched++;
  }
  return matched / stats.rows.length;
}
