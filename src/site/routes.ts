import { SITE_NAME, SITE_URL } from '../config';
import { t } from '../i18n/translate';
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
  | 'multiplayer'
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
    '/regole/': t('site.seo.crumbRules'),
    '/faq/': t('site.seo.crumbFaq'),
    '/guida/': t('site.seo.crumbGuides'),
    '/top-11/': t('site.seo.crumbTop11'),
    '/chi-siamo/': t('site.seo.crumbAbout'),
    '/privacy/': t('site.seo.crumbPrivacy'),
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
    title: t('site.guides.cf.title'),
    description: t('site.guides.cf.desc'),
  },
  {
    slug: 'strategie-asta-fantacalcio',
    title: t('site.guides.st.title'),
    description: t('site.guides.st.desc'),
  },
  {
    slug: 'simulatore-asta-fantacalcio',
    title: t('site.guides.sim.title'),
    description: t('site.guides.sim.desc'),
  },
  {
    slug: 'fantacalcio-stagioni-passate',
    title: t('site.guides.sta.title'),
    description: t('site.guides.sta.desc'),
  },
  {
    slug: 'bonus-malus-fantacalcio',
    title: t('site.guides.bm.title'),
    description: t('site.guides.bm.desc'),
  },
];

function guideRoute(guide: GuideInfo): SiteRoute {
  const path = `/guida/${guide.slug}/`;
  return {
    path,
    kind: 'guide',
    params: { slug: guide.slug },
    title: t('site.seo.guideTitleSuffix', { title: guide.title, site: SITE_NAME }),
    description: guide.description,
    breadcrumbs: [home, { name: t('site.seo.crumbGuides'), path: '/guida/' }, { name: guide.title.split(':')[0], path }],
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

const HOME_DESCRIPTION = t('site.seo.homeDesc');

export const HOME_ROUTE: SiteRoute = {
  path: '/',
  kind: 'home',
  title: t('site.seo.homeTitle'),
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
      genre: [t('site.seo.genre1'), t('site.seo.genre2'), t('site.seo.genre3')],
      gamePlatform: t('site.seo.platform'),
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
  title: t('site.seo.nfTitle'),
  description: t('site.seo.nfDesc'),
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
    title: t('site.seo.top11Title', { season: seasonId, site: SITE_NAME }),
    description: t('site.seo.top11Desc', { season: seasonId }),
    breadcrumbs: [home, { name: t('site.seo.crumbTop11'), path: '/top-11/' }, { name: t('site.top11.crumbSeason', { season: seasonId }), path }],
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
    staticRoute('rules', '/regole/', t('site.seo.rulesTitle'),
      t('site.seo.rulesDesc'), 0.8),
    staticRoute('faq', '/faq/', t('site.seo.faqTitle'),
      t('site.seo.faqDesc'), 0.6,
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
    staticRoute('guide-index', '/guida/', t('site.seo.guideIndexTitle'),
      t('site.seo.guideIndexDesc'), 0.6,
      [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: t('site.seo.collectionName'), url: absoluteUrl('/guida/'), isPartOf: { '@id': `${SITE_URL}/#website` }, inLanguage: 'it-IT' }]),
    ...GUIDES.map(guideRoute),
    staticRoute('top11-index', '/top-11/', t('site.seo.top11IndexTitle'),
      t('site.seo.top11IndexDesc'), 0.6),
    ...seasonIds.map(id => top11Route(id, top11JsonLd[id] ?? [])),
    staticRoute('about', '/chi-siamo/', t('site.seo.aboutTitle'),
      t('site.seo.aboutDesc'), 0.4),
    staticRoute('privacy', '/privacy/', t('site.seo.privacyTitle'),
      t('site.seo.privacyDesc'), 0.2),
    MULTIPLAYER_ROUTE,
  ];
}

/** Ingresso alle stanze multiplayer: pagina interattiva, non indicizzata */
export const MULTIPLAYER_ROUTE: SiteRoute = {
  path: '/multiplayer/',
  kind: 'multiplayer',
  title: t('site.seo.mpTitle', { site: SITE_NAME }),
  description: t('site.seo.mpDesc'),
  breadcrumbs: [home, { name: t('site.common.multiplayer'), path: '/multiplayer/' }],
  indexable: false,
  priority: 0,
  changefreq: 'yearly',
  lastmod: CONTENT_DATE,
  ogType: 'website',
  jsonLd: [],
};
