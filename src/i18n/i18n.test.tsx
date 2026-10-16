import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { catalog } from './catalog';
import { translate, t } from './translate';
import { DEFAULT_LOCALE } from './types';
import { I18nProvider, useT } from './I18nProvider';

describe('translate', () => {
  it('risolve chiavi semplici e annidate', () => {
    expect(t('common.appName')).toBe('FantaClash');
    expect(t('ui.nav.rules')).toBe('Regole');
    expect(t('ui.roles.plural.A')).toBe('Attaccanti');
  });

  it('interpola i parametri {nome}', () => {
    expect(t('ui.listone.serieA', { season: '2015-16' })).toBe('Serie A 2015-16');
  });

  it('chiave mancante -> la chiave stessa; parametro mancante -> segnaposto', () => {
    expect(translate(DEFAULT_LOCALE, 'non.esiste' as never)).toBe('non.esiste');
    expect(t('ui.listone.serieA')).toBe('Serie A {season}');
  });

  it('varianti su stringhe singole: parametro ignorato', () => {
    // le varianti vere si aggiungono col namespace match; qui il contratto base
    expect(t('common.play', undefined, 2)).toBe('Gioca');
  });

  it('il catalogo non ha chiavi vuote', () => {
    const leaves: string[] = [];
    const walk = (o: unknown) => {
      if (typeof o === 'string') leaves.push(o);
      else if (Array.isArray(o)) o.forEach(x => leaves.push(String(x)));
      else if (o && typeof o === 'object') Object.values(o).forEach(walk);
    };
    walk(catalog);
    expect(leaves.length).toBeGreaterThan(20);
    expect(leaves.every(s => s.trim().length > 0)).toBe(true);
  });
});

describe('I18nProvider', () => {
  function Probe() {
    const t = useT();
    return <span data-testid="v">{t('ui.nav.rules')}</span>;
  }

  it('useT funziona col provider e senza (default it)', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByTestId('v')).toHaveTextContent('Regole');
  });

  it('senza provider usa il catalogo italiano di default', () => {
    render(<Probe />);
    expect(screen.getByTestId('v')).toHaveTextContent('Regole');
  });
});
