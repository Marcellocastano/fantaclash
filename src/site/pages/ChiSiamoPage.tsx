import { buildRoutes } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { GameCta, H2, PageTitle, Prose } from '../blocks';
import { useT } from '../../i18n/I18nProvider';

const route = buildRoutes().find(r => r.kind === 'about')!;

/**
 * Chi siamo: il progetto FantaClash, senza nomi di persona (autore
 * organizzazione).
 */
export function ChiSiamoPage() {
  const t = useT();
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker={t('site.about.kicker')}>FantaClash</PageTitle>
        <Prose>
          <p>{t('site.about.p1')}</p>
          <H2>{t('site.about.h1')}</H2>
          <p>{t('site.about.p2')}</p>
          <p>{t('site.about.p3')}</p>
          <GameCta />
        </Prose>
      </article>
    </ContentLayout>
  );
}
