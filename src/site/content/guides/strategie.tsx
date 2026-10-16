import { GuideBody } from './types';
import { H2, Prose, Table } from '../../blocks';
import { useT } from '../../../i18n/I18nProvider';

const LINK = 'text-pitch-deep underline underline-offset-4 decoration-2 decoration-pitch/40 font-semibold';

/**
 * Guida: strategie per l'asta del fantacalcio.
 * Le sette mosse sono descritte sulle meccaniche di FantaClash (personalità
 * dei bot, rilanci a 5 secondi, reparti a fasi) ma valgono in ogni asta.
 * Testi nel catalogo i18n, namespace site.guides.st.
 */
export const Body: GuideBody = () => {
  const t = useT();
  return (
    <Prose>
      <p>{t('site.guides.st.p1')}</p>

      <H2>{t('site.guides.st.h1')}</H2>
      <p>{t('site.guides.st.p2')}</p>

      <H2>{t('site.guides.st.h2')}</H2>
      <p>{t('site.guides.st.p3')}</p>

      <H2>{t('site.guides.st.h3')}</H2>
      <p>{t('site.guides.st.p4')}</p>

      <H2>{t('site.guides.st.h4')}</H2>
      <p>{t('site.guides.st.p5')}</p>

      <H2>{t('site.guides.st.h5')}</H2>
      <p>{t('site.guides.st.p6')}</p>

      <H2>{t('site.guides.st.h6')}</H2>
      <p>{t('site.guides.st.p7')}</p>
      <Table
        head={[t('site.guides.st.th1'), t('site.guides.st.th2'), t('site.guides.st.th3')]}
        rows={[
          [t('site.guides.st.pa'), t('site.guides.st.pb'), t('site.guides.st.pc')],
          [t('site.guides.st.sa'), t('site.guides.st.sb'), t('site.guides.st.sc')],
          [t('site.guides.st.ca'), t('site.guides.st.cb'), t('site.guides.st.cc')],
          [t('site.guides.st.fa'), t('site.guides.st.fb'), t('site.guides.st.fc')],
        ]}
      />
      <p>{t('site.guides.st.p8')}</p>

      <H2>{t('site.guides.st.h7')}</H2>
      <p>{t('site.guides.st.p9')}</p>

      <H2>{t('site.guides.st.h8')}</H2>
      <p>
        {t('site.guides.st.p10a')}
        <a href="/guida/simulatore-asta-fantacalcio/" className={LINK}>{t('site.guides.st.p10link')}</a>
        {t('site.guides.st.p10b')}
      </p>
    </Prose>
  );
};
