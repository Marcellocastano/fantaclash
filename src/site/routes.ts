import { SITE_NAME, SITE_URL } from '../config';
import { FAQ_ITEMS } from './faqData';

/**
 * Registro delle pagine del sito: ogni indirizzo pubblico passa da qui
 * (titolo, descrizione, breadcrumb, sitemap, dati strutturati). Lo usano
 * il pre-rendering (head, sitemap) e i test SEO.
 */

export type PageKind =
  | 'home'
  | 'rules'
  | 'faq'
  | 'guide-index'
  | 'guide'
  | 'top11-index'
  | 'top11'
  | 'about'
  | 'privacy'
  | 'not-found';

export interface Breadcrumb {
  name: string;
  path: string;
}

export interface SiteRoute {
  /** Percorso con la barra finale (tranne la home: '/') */
  path: string;
  kind: PageKind;
  /** Parametri della pagina (es. slug della guida, annata) */
  params?: Record<string, string>;
  /** <title>: al massimo 60 caratteri */
  title: string;
  /** meta description: 110-160 caratteri */
  description: string;
  breadcrumbs: Breadcrumb[];
  indexable: boolean;
  /** Valori per la sitemap */
  priority: number;
  changefreq: 'weekly' | 'monthly' | 'yearly';
  /** Data dell'ultima modifica (YYYY-MM-DD) */
  lastmod: string;
  /** Tipo Open Graph */
  ogType: 'website' | 'article';
  /** Oggetti JSON-LD della pagina */
  jsonLd: object[];
}

/** Data di riferimento dei contenuti statici (aggiornarla quando cambiano) */
export const CONTENT_DATE = '2026-10-07';

const home: Breadcrumb = { name: 'Home', path: '/' };

function staticRoute(
  kind: Exclude<PageKind, 'home' | 'guide' | 'top11' | 'not-found'>,
  path: string,
  title: string,
  description: string,
  priority: number,
  extraJsonLd: object[] = []
): SiteRoute {
  const name = breadcrumbsLabel(path);
  return {
    path,
    kind,
    title,
    description,
    breadcrumbs: [home, { name, path }],
    indexable: true,
    priority,
    changefreq: 'monthly',
    lastmod: CONTENT_DATE,
    ogType: kind === 'guide-index' || kind === 'top11-index' ? 'website' : 'article',
    jsonLd: extraJsonLd,
  };
}

function breadcrumbsLabel(path: string): string {
  const labels: Record<string, string> = {
    '/regole/': 'Regole',
    '/faq/': 'Domande frequenti',
    '/guida/': 'Guide',
    '/top-11/': 'Top 11',
    '/chi-siamo/': 'Chi siamo',
    '/privacy/': 'Privacy',
  };
  return labels[path] ?? path;
}

/** Metadati di una guida: il testo sta in src/site/content/guides/<slug>.tsx */
export interface GuideInfo {
  slug: string;
  title: string;
  description: string;
}

export const GUIDES: GuideInfo[] = [
  {
    slug: 'come-funziona-asta-fantacalcio',
    title: "Come funziona l'asta del fantacalcio",
    description:
      'Chiamata, rilanci, budget e offerta massima: le regole dell’asta del fantacalcio spiegate con un esempio pratico e gli errori da evitare.',
  },
  {
    slug: 'strategie-asta-fantacalcio',
    title: "Strategie per l'asta del fantacalcio",
    description:
      'Come gestire i crediti tra i reparti, quando rilanciare, l’ultimo secondo e come leggere gli avversari: le mosse che decidono un’asta.',
  },
  {
    slug: 'simulatore-asta-fantacalcio',
    title: 'Simulatore d’asta del fantacalcio',
    description:
      'Perché arrivare preparato all’asta cambia la stagione, e come allenarsi gratis con FantaClash contro 7 bot su 23 annate storiche.',
  },
  {
    slug: 'fantacalcio-stagioni-passate',
    title: 'Fantacalcio con le stagioni passate',
    description:
      'Dal 2003-04 al 2025-26: com’è fare il fantacalcio con i campioni di vent’anni di Serie A, e come nasce l’overall di ogni giocatore.',
  },
  {
    slug: 'bonus-malus-fantacalcio',
    title: 'Bonus e malus del fantacalcio',
    description:
      'Gol, assist, cartellini, rigori e autogol: la tabella completa di bonus e malus di FantaClash e come si ottiene il fantavoto.',
  },
];

function guideRoute(guide: GuideInfo): SiteRoute {
  const path = `/guida/${guide.slug}/`;
  return {
    path,
    kind: 'guide',
    params: { slug: guide.slug },
    title: `${guide.title} · ${SITE_NAME}`,
    description: guide.description,
    breadcrumbs: [home, { name: 'Guide', path: '/guida/' }, { name: guide.title.split(':')[0], path }],
    indexable: true,
    priority: 0.7,
    changefreq: 'monthly',
    lastmod: CONTENT_DATE,
    ogType: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: guide.title,
        description: guide.description,
        inLanguage: 'it-IT',
        datePublished: CONTENT_DATE,
        dateModified: CONTENT_DATE,
        mainEntityOfPage: absoluteUrl(path),
        image: OG_IMAGE,
        author: { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;
export const OG_IMAGE = absoluteUrl('/og-image.png');
export const LOGO_URL = absoluteUrl('/icon-512.png');

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: LOGO_URL,
};

/** BreadcrumbList a partire dalle voci (la home è sempre la prima) */
export function breadcrumbJsonLd(items: Breadcrumb[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: absoluteUrl(b.path),
    })),
  };
}

const HOME_DESCRIPTION =
  "Gioco di fantacalcio online gratis: scegli un'annata della Serie A dal 2003-04, vinci l'asta contro 7 bot e porta la tua rosa fino alla finale.";

export const HOME_ROUTE: SiteRoute = {
  path: '/',
  kind: 'home',
  title: "FantaClash · Fantacalcio d'asta con la Serie A di ieri",
  description: HOME_DESCRIPTION,
  breadcrumbs: [],
  indexable: true,
  priority: 1,
  changefreq: 'weekly',
  lastmod: CONTENT_DATE,
  ogType: 'website',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      inLanguage: 'it-IT',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    { '@context': 'https://schema.org', ...ORGANIZATION },
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: HOME_DESCRIPTION,
      image: OG_IMAGE,
      genre: ['Fantacalcio', 'Calcio', 'Manageriale'],
      gamePlatform: 'Web browser',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      inLanguage: 'it-IT',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

export const NOT_FOUND_ROUTE: SiteRoute = {
  path: '/404/',
  kind: 'not-found',
  title: 'Pagina non trovata · FantaClash',
  description: "La pagina che cerchi non esiste o è stata spostata. Torna alla home di FantaClash e inizia un'asta con le stagioni storiche della Serie A.",
  breadcrumbs: [],
  indexable: false,
  priority: 0,
  changefreq: 'yearly',
  lastmod: CONTENT_DATE,
  ogType: 'website',
  jsonLd: [],
};

function top11Route(seasonId: string, jsonLd: object[] = []): SiteRoute {
  const path = `/top-11/${seasonId}/`;
  return {
    path,
    kind: 'top11',
    params: { season: seasonId },
    title: `Top 11 Serie A ${seasonId}: la formazione ideale · ${SITE_NAME}`,
    description: `I migliori giocatori della Serie A ${seasonId} schierati in una formazione ideale 4-3-3: overall, squadra e il link per rifare quell’asta.`,
    breadcrumbs: [home, { name: 'Top 11', path: '/top-11/' }, { name: `Serie A ${seasonId}`, path }],
    indexable: true,
    priority: 0.6,
    changefreq: 'yearly',
    lastmod: CONTENT_DATE,
    ogType: 'article',
    jsonLd,
  };
}

/** Tutte le pagine pubbliche generate dal pre-rendering */
export function buildRoutes(seasonIds: string[] = [], top11JsonLd: Record<string, object[]> = {}): SiteRoute[] {
  return [
    HOME_ROUTE,
    staticRoute('rules', '/regole/', 'Regole di FantaClash: asta, rosa e torneo',
      'Tutte le regole del gioco: asta da 100 crediti con rilanci, modulo 1-2-3-2, torneo a eliminazione diretta, bonus e malus del fantavoto.', 0.8),
    staticRoute('faq', '/faq/', 'Domande frequenti su FantaClash · FantaClash',
      "Costo, registrazione, stagioni disponibili, funzionamento dell'asta e del torneo: le risposte alle domande più comuni su FantaClash.", 0.6,
      [
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ_ITEMS.map(f => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        },
      ]),
    staticRoute('guide-index', '/guida/', 'Guide al fantacalcio: asta e strategia · FantaClash',
      "Guide pratiche al fantacalcio ad asta: come funziona l'asta, le strategie vincenti, bonus e malus e il fantacalcio sulle stagioni storiche.", 0.6,
      [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Guide al fantacalcio', url: absoluteUrl('/guida/'), isPartOf: { '@id': `${SITE_URL}/#website` }, inLanguage: 'it-IT' }]),
    ...GUIDES.map(guideRoute),
    staticRoute('top11-index', '/top-11/', 'Top 11 della Serie A dal 2003-04 al 2025-26 · FantaClash',
      'La formazione ideale 4-3-3 di ognuna delle 23 stagioni della Serie A: i migliori giocatori per annata, anno dopo anno.', 0.6),
    ...seasonIds.map(id => top11Route(id, top11JsonLd[id] ?? [])),
    staticRoute('about', '/chi-siamo/', 'Chi siamo · FantaClash',
      "FantaClash è un progetto amatoriale nato per chi il fantacalcio d'asta lo ama davvero: storia del gioco, come è fatto e contatti.", 0.4),
    staticRoute('privacy', '/privacy/', 'Privacy · FantaClash',
      'FantaClash non raccoglie dati personali: nessun account, nessun cookie di profilazione e analytics anonime senza cookie.', 0.2),
  ];
}
