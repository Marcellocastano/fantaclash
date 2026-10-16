import { buildRoutes, GUIDES } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { GameCta, PageTitle, Prose } from '../blocks';
import { Icon } from '../../components/Icon';
import { useT } from '../../i18n/I18nProvider';

const route = buildRoutes().find(r => r.kind === 'guide-index')!;

/** Indice delle guide al fantacalcio */
export function GuideIndexPage() {
  const t = useT();
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker={t('site.guideIndex.kicker')}>{t('site.guideIndex.title')}</PageTitle>
        <Prose>
          <p>{t('site.guideIndex.intro')}</p>
        </Prose>
        <ul className="mt-10 grid sm:grid-cols-2 gap-6 max-w-4xl">
          {GUIDES.map(g => (
            <li key={g.slug}>
              <a href={`/guida/${g.slug}/`} className="block bg-surface border-2 border-ink shadow-block p-5 h-full hover:bg-canvas">
                <span className="block font-display text-2xl font-black text-ink leading-tight">{g.title}</span>
                <span className="block text-ink-soft mt-2">{g.description}</span>
                <span className="mt-3 inline-flex items-center gap-2 font-bold text-pitch-deep">
                  {t('site.guideIndex.read')}
                  <Icon name="arrow" className="w-4 h-4" />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <GameCta />
      </article>
    </ContentLayout>
  );
}
