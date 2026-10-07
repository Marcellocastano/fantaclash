import { SUPPORT_URL } from '../config';
import { Icon } from './Icon';
import { LogoMark } from './Logo';
import { FOOTER_LINK_GROUPS } from '../site/navigation';


/**
 * Footer comune su fascia verde scura (chiude la pagina come la navbar la
 * apre): supporto, link utili e note sui dati.
 */
export function Footer({ linkGroups = FOOTER_LINK_GROUPS }: { linkGroups?: { title: string; links: { label: string; href: string }[] }[] }) {
  return (
    <footer className="bg-pitch-deep text-canvas border-t-4 border-ink mt-20">
      <div className="max-w-[1250px] mx-auto px-4 py-12 grid gap-10 md:grid-cols-[1.2fr_auto_auto_auto] items-start">
        <div>
          <p className="flex items-center gap-3 font-display text-3xl font-black leading-none">
            <LogoMark className="h-10 w-10" />
            FantaClash
          </p>
          <p className="text-canvas/70 mt-4 max-w-xl">
            Asta e torneo con i giocatori veri della Serie A, dal 2003-04 al 2025-26. Gioco amatoriale senza scopo di lucro:
            le statistiche storiche servono solo a calcolare valori e simulazioni, nessun legame con la Lega Serie A o con i club.
          </p>
          <p className="text-canvas/75 text-sm mt-4">
            FantaClash non è affiliato a Lega Serie A, ai club o a Fantacalcio®: nomi e marchi appartengono ai rispettivi titolari.
          </p>
        </div>
        {linkGroups.map(g => (
          <nav key={g.title} aria-label={g.title}>
            <p className="font-display text-sm font-extrabold tracking-wide text-highlight">{g.title.toUpperCase()}</p>
            <ul className="mt-4 space-y-2">
              {g.links.map(l => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="font-semibold text-canvas underline underline-offset-4 decoration-2 decoration-canvas/30 hover:decoration-highlight transition-colors duration-150"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <SupportButton />
      </div>
    </footer>
  );
}

/** Bottone "Supporta": attivo solo se SUPPORT_URL è configurato */
export function SupportButton() {
  const base = 'btn-primary bg-whistle text-on-whistle hover:bg-highlight hover:text-on-highlight text-2xl px-6 py-4';
  if (!SUPPORT_URL) {
    return (
      <span className={`${base} opacity-60 cursor-not-allowed hover:bg-whistle hover:text-on-whistle`} aria-disabled="true" title="Link di supporto in arrivo">
        <Icon name="heart" className="w-5 h-5" />
        Supporta FantaClash
      </span>
    );
  }
  return (
    <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={base}>
      <Icon name="heart" className="w-5 h-5" />
      Supporta FantaClash
    </a>
  );
}
