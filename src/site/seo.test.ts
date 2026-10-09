import { describe, it, expect } from 'vitest';
import { SITE_URL } from '../config';
import { buildRoutes, NOT_FOUND_ROUTE } from './routes';
import { escapeHtml, renderHead, renderSitemap, routeJsonLd, safeJson } from './seo';

const routes = buildRoutes();

describe('SEO delle pagine', () => {
  it('title e description unici e nei limiti di lunghezza', () => {
    // i limiti di lunghezza contano per le pagine indicizzabili
    for (const r of routes.filter(x => x.indexable)) {
      expect(r.title.length, r.path).toBeLessThanOrEqual(60);
      expect(r.description.length, r.path).toBeGreaterThanOrEqual(110);
      expect(r.description.length, r.path).toBeLessThanOrEqual(160);
    }
    expect(new Set(routes.map(r => r.title)).size).toBe(routes.length);
    expect(new Set(routes.map(r => r.description)).size).toBe(routes.length);
  });

  it('percorsi con la barra finale e canonical assolute sul dominio www', () => {
    for (const r of routes.filter(x => x.indexable)) {
      expect(r.path === '/' || /^\/[a-z0-9/-]+\/$/.test(r.path), r.path).toBe(true);
      expect(renderHead(r)).toContain(`<link rel="canonical" href="${SITE_URL}${r.path}" />`);
    }
    expect(SITE_URL).toBe('https://www.fantaclash.it');
  });

  it('dati strutturati serializzabili e sicuri dentro <script>', () => {
    for (const r of routes) {
      for (const obj of routeJsonLd(r)) expect(JSON.parse(safeJson(obj))).toEqual(obj);
    }
    expect(safeJson({ t: '</script><!--' })).not.toMatch(/<|>/);
  });

  it('la 404 non è indicizzabile e non ha canonical', () => {
    const head = renderHead(NOT_FOUND_ROUTE);
    expect(head).toContain('noindex');
    expect(head).not.toContain('rel="canonical"');
  });

  it('sitemap con tutte e sole le pagine indicizzabili', () => {
    const xml = renderSitemap([...routes, NOT_FOUND_ROUTE]);
    for (const r of routes.filter(x => x.indexable)) expect(xml).toContain(`<loc>${SITE_URL}${r.path}</loc>`);
    expect(xml).not.toContain('/404/');
  });

  it('escape dei testi nei tag', () => {
    expect(escapeHtml('a "b" <c> & d')).toBe('a &quot;b&quot; &lt;c&gt; &amp; d');
  });
});
