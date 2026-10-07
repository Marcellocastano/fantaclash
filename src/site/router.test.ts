import { describe, it, expect } from 'vitest';
import { matchRoute } from './router';

describe('router del sito', () => {
  it('riconosce le pagine, con o senza barra finale', () => {
    expect(matchRoute('/')).toEqual({ kind: 'home', params: {} });
    expect(matchRoute('/regole/').kind).toBe('rules');
    expect(matchRoute('/regole').kind).toBe('rules');
    expect(matchRoute('/faq/').kind).toBe('faq');
    expect(matchRoute('/guida/').kind).toBe('guide-index');
    expect(matchRoute('/guida/strategie-asta-fantacalcio/')).toEqual({ kind: 'guide', params: { slug: 'strategie-asta-fantacalcio' } });
    expect(matchRoute('/top-11/').kind).toBe('top11-index');
    expect(matchRoute('/top-11/2015-16/')).toEqual({ kind: 'top11', params: { season: '2015-16' } });
    expect(matchRoute('/chi-siamo/').kind).toBe('about');
    expect(matchRoute('/privacy/').kind).toBe('privacy');
  });

  it('un indirizzo sconosciuto è la 404', () => {
    expect(matchRoute('/inesistente/').kind).toBe('not-found');
    expect(matchRoute('/top-11/2015').kind).toBe('not-found');
    expect(matchRoute('/guida/Maiuscole/').kind).toBe('not-found');
  });
});
