import { ReactNode } from 'react';
import { Footer } from '../components/Footer';
import { AppNavbar, AppNavbarProps } from '../components/layout/AppNavbar';
import { Breadcrumb } from './routes';
import { NAV_LINKS } from './navigation';

interface ContentLayoutProps {
  breadcrumbs?: Breadcrumb[];
  /** In una stanza multiplayer: il logo chiede conferma dell'uscita */
  sessionExit?: AppNavbarProps['sessionExit'];
  children: ReactNode;
}

/** Pagine di contenuto: navbar con i link del sito, breadcrumb visibili, testo a larghezza di lettura, footer */
export function ContentLayout({ breadcrumbs = [], sessionExit, children }: ContentLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNavbar links={NAV_LINKS} sessionExit={sessionExit} />
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 py-12">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Percorso" className="mb-8 text-sm font-semibold text-ink-muted">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((b, i) => (
                <li key={b.path} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {i < breadcrumbs.length - 1 ? (
                    <a href={b.path} className="underline underline-offset-4 decoration-line-strong hover:text-ink">
                      {b.name}
                    </a>
                  ) : (
                    <span aria-current="page" className="text-ink">
                      {b.name}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}
