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
    default:
      return <NotFoundPage />;
  }
}
