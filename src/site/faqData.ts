import { CatalogKey, t } from '../i18n/translate';

/**
 * Domande frequenti sulla home di FantaClash: il testo di /faq/ e i dati
 * strutturati FAQPage condividono questa lista (routes.ts, FaqPage.tsx).
 * Le coppie q/a risolvono le chiavi del catalogo nella lingua di default.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

const KEY_PAIRS: [CatalogKey, CatalogKey][] = [
  ['site.faq.q1', 'site.faq.a1'],
  ['site.faq.q2', 'site.faq.a2'],
  ['site.faq.q3', 'site.faq.a3'],
  ['site.faq.q4', 'site.faq.a4'],
  ['site.faq.q5', 'site.faq.a5'],
  ['site.faq.q6', 'site.faq.a6'],
  ['site.faq.q7', 'site.faq.a7'],
  ['site.faq.q8', 'site.faq.a8'],
  ['site.faq.q9', 'site.faq.a9'],
  ['site.faq.q10', 'site.faq.a10'],
  ['site.faq.q11', 'site.faq.a11'],
  ['site.faq.q12', 'site.faq.a12'],
];

export const FAQ_ITEMS: FaqItem[] = KEY_PAIRS.map(([q, a]) => ({ question: t(q), answer: t(a) }));
