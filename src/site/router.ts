import { PageKind } from './routes';

export interface RouteMatch {
  kind: PageKind;
  params: Record<string, string>;
}

/** Schemi degli indirizzi: la barra finale è facoltativa nel confronto */
const PATTERNS: { kind: PageKind; re: RegExp; keys: string[] }[] = [
  { kind: 'home', re: /^\/$/, keys: [] },
  { kind: 'rules', re: /^\/regole$/, keys: [] },
  { kind: 'faq', re: /^\/faq$/, keys: [] },
  { kind: 'guide-index', re: /^\/guida$/, keys: [] },
  { kind: 'guide', re: /^\/guida\/([a-z0-9-]+)$/, keys: ['slug'] },
  { kind: 'top11-index', re: /^\/top-11$/, keys: [] },
  { kind: 'top11', re: /^\/top-11\/(\d{4}-\d{2})$/, keys: ['season'] },
  { kind: 'about', re: /^\/chi-siamo$/, keys: [] },
  { kind: 'privacy', re: /^\/privacy$/, keys: [] },
];

/** Pagina corrispondente a un percorso; un indirizzo sconosciuto è la 404 */
export function matchRoute(pathname: string): RouteMatch {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname || '/';
  for (const p of PATTERNS) {
    const m = p.re.exec(path);
    if (m) return { kind: p.kind, params: Object.fromEntries(p.keys.map((k, i) => [k, m[i + 1]])) };
  }
  return { kind: 'not-found', params: {} };
}
