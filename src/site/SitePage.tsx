import { lazy, Suspense } from 'react';
import { MULTIPLAYER_ENABLED } from '../config';
import { Icon } from '../components/Icon';
import { ContentLayout } from './ContentLayout';
import App from '../App';
import { RouteMatch } from './router';
import { RulesPage } from './pages/RulesPage';
import { FaqPage } from './pages/FaqPage';
import { GuideIndexPage } from './pages/GuideIndexPage';
import { GuidePage } from './pages/GuidePage';
import { ChiSiamoPage } from './pages/ChiSiamoPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { Top11IndexPage } from './pages/Top11IndexPage';
import { Top11Page } from './pages/Top11Page';
import { Top11IndexEntry, Top11SeasonData } from './top11';
import { NotFoundPage } from './pages/NotFoundPage';

// Multiplayer è interattivo e fuori dal gioco singolo: chunk dedicato
const MultiplayerPage = lazy(() =>
  import('./pages/MultiplayerPage').then(m => ({ default: m.MultiplayerPage }))
);

/** Messaggio prerenderizzato quando il flag multiplayer è spento */
function MultiplayerUnavailable() {
  return (
    <ContentLayout breadcrumbs={[{ name: 'Multiplayer', path: '/multiplayer/' }]}>
      <div className="py-16 text-center">
        <h1 className="font-display text-4xl sm:text-6xl font-black text-ink">Multiplayer non ancora disponibile</h1>
        <p className="text-lg text-ink-soft mt-5">Le stanze online stanno arrivando. Intanto puoi giocare contro i bot.</p>
        <a href="/" className="btn-cta mt-10">
          Torna alla home
          <Icon name="arrow" className="w-7 h-7" />
        </a>
      </div>
    </ContentLayout>
  );
}

interface SitePageProps {
  match: RouteMatch;
  /** Dati della pagina scritti dal pre-rendering (es. Top 11) */
  data: unknown;
}

/** Pagina da mostrare per un indirizzo: stessa scelta lato build e nel browser */
export function SitePage({ match, data }: SitePageProps) {
  switch (match.kind) {
    case 'home':
      return <App />;
    case 'rules':
      return <RulesPage />;
    case 'faq':
      return <FaqPage />;
    case 'guide-index':
      return <GuideIndexPage />;
    case 'guide':
      return <GuidePage slug={match.params.slug ?? ''} />;
    case 'about':
      return <ChiSiamoPage />;
    case 'top11-index':
      return <Top11IndexPage data={data as Top11IndexEntry[] | null} />;
    case 'top11':
      return <Top11Page season={match.params.season ?? ''} data={data as Top11SeasonData | null} />;
    case 'privacy':
      return <PrivacyPage />;
    case 'multiplayer':
      // Col flag spento il chunk lazy non si carica nemmeno: testo prerenderizzato
      return MULTIPLAYER_ENABLED ? (
        <Suspense fallback={null}>
          <MultiplayerPage />
        </Suspense>
      ) : (
        <MultiplayerUnavailable />
      );
    default:
      return <NotFoundPage />;
  }
}
