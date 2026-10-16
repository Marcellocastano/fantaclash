import { GuideBody } from './types';
import { H2, Li, Prose, Ul } from '../../blocks';
import { useT } from '../../../i18n/I18nProvider';

const LINK = 'text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40 font-semibold';

/**
 * Guida: il fantacalcio sulle stagioni storiche.
 * Spiega cosa rende diverso un'asta sul 2006-07 rispetto a una sull'anno
 * corrente, e come nasce l'overall dei giocatori.
 * Testi nel catalogo i18n, namespace site.guides.sta.
 */
export const Body: GuideBody = () => {
  const t = useT();
  return (
    <Prose>
      <p>{t('site.guides.sta.p1')}</p>

      <H2>{t('site.guides.sta.h1')}</H2>
      <p>{t('site.guides.sta.p2')}</p>

      <H2>{t('site.guides.sta.h2')}</H2>
      <Ul>
        <Li>
          <strong>{t('site.guides.sta.l1b')}</strong>{t('site.guides.sta.l1t')}
        </Li>
        <Li>
          <strong>{t('site.guides.sta.l2b')}</strong>{t('site.guides.sta.l2t')}
        </Li>
        <Li>
          <strong>{t('site.guides.sta.l3b')}</strong>{t('site.guides.sta.l3t')}
        </Li>
      </Ul>

      <H2>{t('site.guides.sta.h3')}</H2>
      <p>{t('site.guides.sta.p3')}</p>
      <Ul>
        <Li>
          <strong>{t('site.guides.sta.l4b')}</strong>{t('site.guides.sta.l4t')}
        </Li>
        <Li>
          <strong>{t('site.guides.sta.l5b')}</strong>{t('site.guides.sta.l5t')}
        </Li>
      </Ul>
      <p>{t('site.guides.sta.p4')}</p>

      <H2>{t('site.guides.sta.h5')}</H2>
      <p>{t('site.guides.sta.p5')}</p>
      <Ul>
        <Li>
          <strong>{t('site.guides.sta.l6b')}</strong>{t('site.guides.sta.l6t')}
        </Li>
        <Li>
          <strong>{t('site.guides.sta.l7b')}</strong>{t('site.guides.sta.l7t')}
        </Li>
        <Li>
          <strong>{t('site.guides.sta.l8b')}</strong>{t('site.guides.sta.l8t')}
        </Li>
      </Ul>

      <H2>{t('site.guides.sta.h6')}</H2>
      <p>
        {t('site.guides.sta.p6a')}
        <a href="/top-11/" className={LINK}>{t('site.guides.sta.p6link')}</a>
        {t('site.guides.sta.p6b')}
      </p>
    </Prose>
  );
};
