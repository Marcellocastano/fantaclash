import { GuideBody } from './types';
import { H2, Li, Prose, Table, Ul } from '../../blocks';
import { useT } from '../../../i18n/I18nProvider';

/**
 * Guida: bonus, malus e fantavoto.
 * La tabella usa i valori esatti di FantaClash (types/index.ts FANTASY_BONUSES).
 * Testi nel catalogo i18n, namespace site.guides.bm.
 */
export const Body: GuideBody = () => {
  const t = useT();
  return (
    <Prose>
      <p>{t('site.guides.bm.p1')}</p>

      <H2>{t('site.guides.bm.h1')}</H2>
      <p>
        {t('site.guides.bm.p2a')}<strong>{t('site.guides.bm.p2b')}</strong>{t('site.guides.bm.p2c')}
      </p>
      <p>
        {t('site.guides.bm.p3a')}<strong>{t('site.guides.bm.p3b')}</strong>{t('site.guides.bm.p3c')}
      </p>

      <H2>{t('site.guides.bm.h2')}</H2>
      <Table
        head={[t('site.guides.bm.th1'), t('site.guides.bm.th2')]}
        rows={[
          [t('site.guides.bm.r1k'), '+3'],
          ['Assist', '+1'],
          [t('site.guides.bm.r3k'), '+3'],
          [t('site.guides.bm.r4k'), '+1'],
          [t('site.guides.bm.r5k'), t('site.guides.bm.r5v')],
          [t('site.guides.bm.r6k'), t('site.guides.bm.r6v')],
          [t('site.guides.bm.r7k'), t('site.guides.bm.r7v')],
          [t('site.guides.bm.r8k'), t('site.guides.bm.r8v')],
          [t('site.guides.bm.r9k'), t('site.guides.bm.r9v')],
          [t('site.guides.bm.r10k'), t('site.guides.bm.r10v')],
        ]}
      />
      <p>{t('site.guides.bm.p4')}</p>

      <H2>{t('site.guides.bm.h3')}</H2>
      <p>{t('site.guides.bm.p5')}</p>
      <Ul>
        <Li>
          <strong>{t('site.guides.bm.l1b')}</strong>{t('site.guides.bm.l1t')}
        </Li>
        <Li>
          <strong>{t('site.guides.bm.l2b')}</strong>{t('site.guides.bm.l2t')}
        </Li>
        <Li>
          <strong>{t('site.guides.bm.l3b')}</strong>{t('site.guides.bm.l3t')}
        </Li>
        <Li>
          <strong>{t('site.guides.bm.l4b')}</strong>{t('site.guides.bm.l4t')}
        </Li>
      </Ul>

      <H2>{t('site.guides.bm.h4')}</H2>
      <p>{t('site.guides.bm.p6')}</p>
      <p>{t('site.guides.bm.p7')}</p>
    </Prose>
  );
};
