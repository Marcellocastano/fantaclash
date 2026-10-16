import { buildRoutes } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { H2, PageTitle, Prose, Ul, Li } from '../blocks';
import { useT } from '../../i18n/I18nProvider';

const route = buildRoutes().find(r => r.kind === 'privacy')!;

/** Privacy policy: nessun account, salvataggio nel browser, analytics anonime */
export function PrivacyPage() {
  const t = useT();
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker={t('site.privacy.kicker')}>{t('site.privacy.title')}</PageTitle>
        <Prose>
          <p>{t('site.privacy.intro')}</p>

          <H2>{t('site.privacy.hData')}</H2>
          <p>
            {t('site.privacy.d1a')}<strong>{t('site.privacy.d1b')}</strong>{t('site.privacy.d1c')}
          </p>
          <Ul>
            <Li>
              <strong>{t('site.privacy.d2b')}</strong>{t('site.privacy.d2t')}
            </Li>
            <Li>
              <strong>{t('site.privacy.d3b')}</strong>{t('site.privacy.d3t')}
            </Li>
            <Li>
              <strong>{t('site.privacy.d4b')}</strong>{t('site.privacy.d4t')}
            </Li>
          </Ul>

          <H2>{t('site.privacy.hMp')}</H2>
          <p>
            {t('site.privacy.m1a')}<strong>{t('site.privacy.m1b')}</strong> (
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">{t('site.privacy.m1link')}</a>
            {t('site.privacy.m1c')}
          </p>
          <Ul>
            <Li>
              <strong>{t('site.privacy.m2b')}</strong>{t('site.privacy.m2t')}
            </Li>
            <Li>
              <strong>{t('site.privacy.m3b')}</strong>{t('site.privacy.m3t')}
            </Li>
            <Li>
              <strong>{t('site.privacy.m4b')}</strong>{t('site.privacy.m4t')}
            </Li>
            <Li>
              <strong>{t('site.privacy.m5b')}</strong>{t('site.privacy.m5t')}
            </Li>
          </Ul>

          <H2>{t('site.privacy.hAnalytics')}</H2>
          <p>
            {t('site.privacy.an1a')}<strong>{t('site.privacy.an1b')}</strong>{t('site.privacy.an1c')}
          </p>

          <H2>{t('site.privacy.hExt')}</H2>
          <p>{t('site.privacy.e1')}</p>

          <H2>{t('site.privacy.hContact')}</H2>
          <p>{t('site.privacy.c1')}</p>
        </Prose>
      </article>
    </ContentLayout>
  );
}
