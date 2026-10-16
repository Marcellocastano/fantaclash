import { buildRoutes } from '../routes';
import { ContentLayout } from '../ContentLayout';
import { GameCta, H2, Li, PageTitle, Prose, Table, Ul } from '../blocks';
import { useT } from '../../i18n/I18nProvider';

const route = buildRoutes().find(r => r.kind === 'rules')!;

/**
 * Le regole di FantaClash: numeri presi dalle costanti del gioco
 * (src/services/auction/rules.ts, src/types/index.ts). Se cambiano le
 * regole, aggiornare questa pagina.
 */
export function RulesPage() {
  const t = useT();
  return (
    <ContentLayout breadcrumbs={route.breadcrumbs}>
      <article>
        <PageTitle kicker={t('site.rules.kicker')}>{t('site.rules.title')}</PageTitle>
        <Prose>
          <p>{t('site.rules.intro')}</p>

          <H2>{t('site.rules.hTeam')}</H2>
          <Ul>
            <Li>
              <strong>{t('site.rules.t1b')}</strong> {t('site.rules.t1t')}
            </Li>
            <Li>
              <strong>{t('site.rules.t2b')}</strong> {t('site.rules.t2t')}
            </Li>
            <Li>
              <strong>{t('site.rules.t3b1')}</strong> {t('site.rules.t3m')}{' '}
              <strong>{t('site.rules.t3b2')}</strong>{t('site.rules.t3t')}
            </Li>
          </Ul>

          <H2>{t('site.rules.hListone')}</H2>
          <p>
            {t('site.rules.l1a')}<strong>{t('site.rules.l1b')}</strong>{t('site.rules.l1c')}
          </p>
          <p>
            {t('site.rules.l2a')}<strong>{t('site.rules.l2b')}</strong>{t('site.rules.l2c')}
          </p>

          <H2>{t('site.rules.hAsta')}</H2>
          <Ul>
            <Li>
              {t('site.rules.a1a')}<strong>{t('site.rules.a1b')}</strong>{t('site.rules.a1c')}
            </Li>
            <Li>
              {t('site.rules.a2a')}<strong>{t('site.rules.a2b')}</strong>{t('site.rules.a2c')}
            </Li>
            <Li>
              {t('site.rules.a3a')}<strong>{t('site.rules.a3b')}</strong>{t('site.rules.a3c')}
            </Li>
            <Li>
              <strong>{t('site.rules.a4b')}</strong>{t('site.rules.a4t')}
            </Li>
            <Li>{t('site.rules.a5')}</Li>
          </Ul>

          <H2>{t('site.rules.hTournament')}</H2>
          <Ul>
            <Li>
              {t('site.rules.c1a')}<strong>{t('site.rules.c1b')}</strong>{t('site.rules.c1c')}
            </Li>
            <Li>
              {t('site.rules.c2a')}<strong>{t('site.rules.c2b1')}</strong>{t('site.rules.c2m1')}
              <strong>{t('site.rules.c2b2')}</strong>{t('site.rules.c2m2')}
              <strong>{t('site.rules.c2b3')}</strong>{t('site.rules.c2m3')}
            </Li>
            <Li>
              {t('site.rules.c3a')}<strong>{t('site.rules.c3b')}</strong>{t('site.rules.c3c')}
            </Li>
            <Li>
              {t('site.rules.c4a')}<strong>{t('site.rules.c4b')}</strong>{t('site.rules.c4c')}
            </Li>
            <Li>
              {t('site.rules.c5a')}<strong>{t('site.rules.c5b')}</strong>{t('site.rules.c5c')}
            </Li>
            <Li>{t('site.rules.c6')}</Li>
          </Ul>

          <H2>{t('site.rules.hVoti')}</H2>
          <p>
            {t('site.rules.v1a')}<strong>{t('site.rules.v1b1')}</strong>{t('site.rules.v1m')}
            <strong>{t('site.rules.v1b2')}</strong>{t('site.rules.v1c')}
          </p>
          <Table
            head={[t('site.rules.th1'), t('site.rules.th2')]}
            rows={[
              [t('site.rules.r1k'), '+3'],
              ['Assist', '+1'],
              [t('site.rules.r3k'), '−1'],
              [t('site.rules.r4k'), '+3'],
              [t('site.rules.r5k'), '−3'],
              [t('site.rules.r6k'), '−0,5'],
              [t('site.rules.r7k'), '−1'],
              [t('site.rules.r8k'), '−2'],
              [t('site.rules.r9k'), '+1'],
            ]}
          />
          <p>{t('site.rules.v2')}</p>

          <GameCta text={t('site.rules.ctaText')} />
        </Prose>
      </article>
    </ContentLayout>
  );
}
