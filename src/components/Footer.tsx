import { SUPPORT_URL } from '../config';
import { Icon } from './Icon';
import { LogoMark } from './Logo';

interface FooterLink {
  label: string;
  href: string;
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'Come si gioca', href: '#come-si-gioca' },
  { label: 'Regole', href: '#regole' },
];

/**
 * Footer comune: bottone di supporto, link utili e note sui dati.
 */
export function Footer({ links = DEFAULT_LINKS }: { links?: FooterLink[] }) {
  return (
    <footer className="border-t border-line-strong mt-16">
      <div className="max-w-[1200px] mx-auto px-4 py-10 flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <SupportButton />
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <LogoMark className="h-5 w-5" />
            FantaClash · Asta · Torneo · Serie A 2003-2026
          </p>
        </div>
        {links.length > 0 && (
          <nav aria-label="Link del sito" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-ink-soft underline underline-offset-4 decoration-line-strong hover:text-ink hover:decoration-ink transition-colors duration-150"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
        <p className="text-xs text-ink-muted max-w-xl">
          Gioco amatoriale senza scopo di lucro. Statistiche storiche della Serie A usate solo per calcolare
          valori e simulazioni; nessun legame con la Lega Serie A o con i club.
        </p>
      </div>
    </footer>
  );
}

/** Bottone "Supporta": attivo solo se SUPPORT_URL è configurato */
export function SupportButton() {
  const base =
    'inline-flex items-center gap-2 px-5 py-2.5 font-display font-bold text-lg border-2 transition-colors duration-150 focus-visible:outline outline-2 outline-offset-2 outline-pitch';
  if (!SUPPORT_URL) {
    return (
      <span className={`${base} border-line-strong text-ink-muted cursor-not-allowed`} aria-disabled="true" title="Link di supporto in arrivo">
        <Icon name="heart" className="w-4 h-4" />
        Supporta FantaClash
      </span>
    );
  }
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} border-pitch bg-pitch text-on-pitch hover:bg-pitch/90`}
    >
      <Icon name="heart" className="w-4 h-4" />
      Supporta FantaClash
    </a>
  );
}
