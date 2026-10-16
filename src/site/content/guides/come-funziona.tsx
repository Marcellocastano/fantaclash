import { GuideBody } from './types';
import { H2, Li, Prose, Table, Ul } from '../../blocks';
import { useT } from '../../../i18n/I18nProvider';

/**
 * Guida: come funziona l'asta del fantacalcio.
 * I numeri citati (100 crediti, 5 secondi, modulo 1-2-3-2) sono quelli di
 * FantaClash; le meccaniche generali valgono per ogni asta fantacalcistica.
 * Testi nel catalogo i18n, namespace site.guides.cf.
 */
export const Body: GuideBody = () => {
  const t = useT();
  return (
    <Prose>
      <p>{t('site.guides.cf.p1')}</p>
      <p>{t('site.guides.cf.p2')}</p>

      <H2>{t('site.guides.cf.h1')}</H2>
      <p>{t('site.guides.cf.p3')}</p>
      <Ul>
        <Li>
          <strong>{t('site.guides.cf.l1b')}</strong>{t('site.guides.cf.l1t')}
        </Li>
        <Li>
          <strong>{t('site.guides.cf.l2b')}</strong>{t('site.guides.cf.l2t')}
        </Li>
        <Li>
          <strong>{t('site.guides.cf.l3b')}</strong>{t('site.guides.cf.l3t')}
        </Li>
      </Ul>
      <p>{t('site.guides.cf.p4')}</p>

      <H2>{t('site.guides.cf.h2')}</H2>
      <p>{t('site.guides.cf.p5')}</p>
      <p>{t('site.guides.cf.p6')}</p>
      <p>
        <strong>{t('site.guides.cf.rule')}</strong>
      </p>
      <p>{t('site.guides.cf.p7')}</p>

      <H2>{t('site.guides.cf.h3')}</H2>
      <p>{t('site.guides.cf.ex')}</p>
      <Table
        head={[t('site.guides.cf.th1'), t('site.guides.cf.th2'), t('site.guides.cf.th3')]}
        rows={[
          [t('site.guides.cf.r1a'), '1', t('site.guides.cf.r1c')],
          [t('site.guides.cf.r2a'), '4', t('site.guides.cf.r2c')],
          [t('site.guides.cf.r3a'), '7', t('site.guides.cf.r2c')],
          [t('site.guides.cf.r4a'), '9', t('site.guides.cf.r2c')],
          [t('site.guides.cf.r5a'), '—', t('site.guides.cf.r5c')],
        ]}
      />
      <p>{t('site.guides.cf.p8')}</p>

      <H2>{t('site.guides.cf.h4')}</H2>
      <p>{t('site.guides.cf.p9')}</p>

      <H2>{t('site.guides.cf.h5')}</H2>
      <Ul>
        <Li>
          <strong>{t('site.guides.cf.e1b')}</strong>{t('site.guides.cf.e1t')}
        </Li>
        <Li>
          <strong>{t('site.guides.cf.e2b')}</strong>{t('site.guides.cf.e2t')}
        </Li>
        <Li>
          <strong>{t('site.guides.cf.e3b')}</strong>{t('site.guides.cf.e3t')}
        </Li>
        <Li>
          <strong>{t('site.guides.cf.e4b')}</strong>{t('site.guides.cf.e4t')}
        </Li>
      </Ul>

      <H2>{t('site.guides.cf.h6')}</H2>
      <p>{t('site.guides.cf.p10')}</p>
    </Prose>
  );
};
