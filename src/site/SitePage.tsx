import { lazy, Suspense } from 'react';
import { MULTIPLAYER_ENABLED } from '../config';
import { I18nProvider } from '../i18n/I18nProvider';
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
import { useT } from '../i18n/I18nProvider';

// Multiplayer è interattivo e fuori dal gioco singolo: chunk dedicato
const MultiplayerPage = lazy(() =>
  import('./pages/MultiplayerPage').then(m => ({ default: m.MultiplayerPage }))
);

/** Messaggio prerenderizzato quando il flag multiplayer è spento */
function MultiplayerUnavailable() {
  const t = useT();
  return (
    <ContentLayout breadcrumbs={[{ name: t('site.common.multiplayer'), path: '/multiplayer/' }]}>
      <div className="py-16 text-center">
        <h1 className="font-display text-4xl sm:text-6xl font-black text-ink">{t('site.mpOff.title')}</h1>
        <p className="text-lg text-ink-soft mt-5">{t('site.mpOff.text')}</p>
        <a href="/" className="btn-cta mt-10">
          {t('site.common.backHome')}
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
function RoutedPage({ match, data }: SitePageProps) {
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

/** Contesto i18n attorno a tutto il sito e al gioco (client e prerender) */
export function SitePage(props: SitePageProps) {
  return (
    <I18nProvider>
      <RoutedPage {...props} />
    </I18nProvider>
  );
}
