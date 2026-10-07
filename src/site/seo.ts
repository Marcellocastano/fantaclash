import { SITE_NAME } from '../config';
import { absoluteUrl, breadcrumbJsonLd, OG_IMAGE, SiteRoute } from './routes';

/** Escape per testo dentro attributi e contenuti HTML */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** JSON dentro <script>: niente "</script>" né commenti HTML che possano chiuderlo */
export function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** Tutti gli oggetti JSON-LD della pagina (breadcrumb compreso) */
export function routeJsonLd(route: SiteRoute): object[] {
  return route.breadcrumbs.length > 0 ? [...route.jsonLd, breadcrumbJsonLd(route.breadcrumbs)] : route.jsonLd;
}

/**
 * Tag del <head> di una pagina: title, description, canonical, robots,
 * Open Graph, Twitter e dati strutturati.
 */
export function renderHead(route: SiteRoute): string {
  const url = absoluteUrl(route.path);
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    route.indexable
      ? `<link rel="canonical" href="${url}" />`
      : '',
    `<meta name="robots" content="${route.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />`,
    `<meta property="og:type" content="${route.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="it_IT" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="FantaClash, l'asta del fantacalcio nostalgico" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    ...routeJsonLd(route).map(obj => `<script type="application/ld+json">${safeJson(obj)}</script>`),
  ];
  return tags.filter(Boolean).join('\n    ');
}

/** sitemap.xml delle pagine indicizzabili */
export function renderSitemap(routes: SiteRoute[]): string {
  const urls = routes
    .filter(r => r.indexable)
    .map(
      r => `  <url>
    <loc>${absoluteUrl(r.path)}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
