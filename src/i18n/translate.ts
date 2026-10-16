import { catalog, Catalog } from './catalog';
import { DEFAULT_LOCALE, Locale } from './types';

/**
 * Risoluzione delle stringhe del catalogo. Tipizzata sul catalogo:
 * una chiave inesistente è un errore di compilazione. Le chiavi che
 * puntano a un array di varianti accettano `variant` (default 0).
 */

export type TranslateParams = Record<string, string | number>;

export type TFunction = (key: CatalogKey, params?: TranslateParams, variant?: number) => string;

type Leaf = string | readonly string[];
type Flatten<T, Prefix extends string> = T extends Leaf
  ? Prefix
  : { [K in keyof T & string]: Flatten<T[K], Prefix extends '' ? K : `${Prefix}.${K}`> }[keyof T & string];

/** Chiavi valide del catalogo ("auction.start", "ui.nav.rules", …) */
export type CatalogKey = Flatten<Catalog, ''>;

function lookup(key: CatalogKey): Leaf | undefined {
  let node: unknown = catalog;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || Array.isArray(node) ? (node as Leaf) : undefined;
}

const PARAM_RE = /\{(\w+)\}/g;

/**
 * Traduce una chiave con parametri opzionali (`{name}` → params.name).
 * Chiave o segnaposto mancanti: restituisce la chiave/{nome} così com'è
 * — visibile in test e sviluppo, senza rompere il rendering.
 */
export function translate(locale: Locale, key: CatalogKey, params?: TranslateParams, variant = 0): string {
  // Oggi un solo catalogo; con più lingue: catalogs[locale] con fallback a DEFAULT_LOCALE
  void locale;
  const leaf = lookup(key);
  const raw = Array.isArray(leaf) ? (leaf[variant] ?? leaf[0]) : leaf;
  if (typeof raw !== 'string') return key;
  return raw.replace(PARAM_RE, (m, name: string) => (params?.[name] !== undefined ? String(params[name]) : m));
}

/** Scorciatoia sulla lingua di default per il codice non-React */
export const t: TFunction = (key, params, variant) => translate(DEFAULT_LOCALE, key, params, variant);

const SPLIT_MARKER = '';

/**
 * Frase in due pezzi attorno a un segnaposto: per quando il valore in mezzo
 * va reso con markup proprio (grassetto, colore). Uso:
 * `const [pre, post] = tParts(t, 'auction.nextRole', { role }, 'role')`
 * poi `{pre}<strong>{role}</strong>{post}`.
 */
export function tParts(t: TFunction, key: CatalogKey, params: TranslateParams | undefined, splitParam: string): [string, string] {
  const rendered = t(key, { ...params, [splitParam]: SPLIT_MARKER });
  const i = rendered.indexOf(SPLIT_MARKER);
  return i < 0 ? [rendered, ''] : [rendered.slice(0, i), rendered.slice(i + SPLIT_MARKER.length)];
}
