import { GuideBody } from './types';
import { H2, Li, Prose, Ul } from '../../blocks';
import { useT } from '../../../i18n/I18nProvider';

const LINK = 'text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40 font-semibold';

/**
 * Guida: il simulatore d'asta come allenamento.
 * Descrivi qui FantaClash come strumento per allenarsi in vista delle aste
 * vere, non come gioco fine a se stesso.
 * Testi nel catalogo i18n, namespace site.guides.sim.
 */
export const Body: GuideBody = () => {
  const t = useT();
  return (
    <Prose>
      <p>{t('site.guides.sim.p1')}</p>

      <H2>{t('site.guides.sim.h1')}</H2>
      <Ul>
        <Li>
          <strong>{t('site.guides.sim.l1b')}</strong>{t('site.guides.sim.l1t')}
        </Li>
        <Li>
          <strong>{t('site.guides.sim.l2b')}</strong>{t('site.guides.sim.l2t')}
        </Li>
        <Li>
          <strong>{t('site.guides.sim.l3b')}</strong>{t('site.guides.sim.l3t')}
        </Li>
        <Li>
          <strong>{t('site.guides.sim.l4b')}</strong>{t('site.guides.sim.l4t')}
        </Li>
      </Ul>

      <H2>{t('site.guides.sim.h2')}</H2>
      <p>{t('site.guides.sim.p2')}</p>
      <p>{t('site.guides.sim.p3')}</p>

      <H2>{t('site.guides.sim.h3')}</H2>
      <p>{t('site.guides.sim.p4')}</p>

      <H2>{t('site.guides.sim.h4')}</H2>
      <p>{t('site.guides.sim.p5')}</p>
      <p>
        {t('site.guides.sim.p6a')}
        <a href="/guida/come-funziona-asta-fantacalcio/" className={LINK}>{t('site.guides.sim.p6link1')}</a>
        {t('site.guides.sim.p6b')}
        <a href="/guida/strategie-asta-fantacalcio/" className={LINK}>{t('site.guides.sim.p6link2')}</a>
        {t('site.guides.sim.p6c')}
      </p>
    </Prose>
  );
};
