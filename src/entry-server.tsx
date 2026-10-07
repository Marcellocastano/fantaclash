/* eslint-disable react-refresh/only-export-components -- entry del pre-rendering, mai caricato dal fast refresh */
import { renderToString } from 'react-dom/server';
import { matchRoute } from './site/router';
import { SitePage } from './site/SitePage';

/**
 * Pre-rendering (vedi scripts/prerender.ts): HTML della pagina per un
 * percorso. Niente StrictMode: non cambia il markup.
 */
export function render(path: string, data: unknown): string {
  return renderToString(<SitePage match={matchRoute(path)} data={data} />);
}

export { buildRoutes, NOT_FOUND_ROUTE } from './site/routes';
export { renderHead, renderSitemap, safeJson } from './site/seo';
export { GOATCOUNTER_CODE } from './config';
export { buildSeasonData, indexEntry, top11JsonLd } from './site/top11';
