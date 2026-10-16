/**
 * Link di navigazione del sito (navbar delle pagine pubbliche e footer).
 * Indirizzi assoluti: funzionano da qualsiasi pagina.
 */
import { MULTIPLAYER_ENABLED } from '../config';
import { t } from '../i18n/translate';

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: t('ui.nav.howToPlay'), href: '/#come-si-gioca' },
  { label: t('ui.nav.rules'), href: '/#regole' },
  { label: t('ui.nav.guides'), href: '/guida/' },
  { label: t('ui.nav.top11'), href: '/top-11/' },
  // Voce multiplayer solo con il flag attivo (stanza su /multiplayer/)
  ...(MULTIPLAYER_ENABLED ? [{ label: t('ui.nav.multiplayer'), href: '/multiplayer/' }] : []),
];

/** Link nel footer: gioco da una parte, guide e pagine dall'altra */
export const FOOTER_LINK_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: t('site.footer.game'),
    links: [
      { label: t('ui.nav.howToPlay'), href: '/#come-si-gioca' },
      { label: t('ui.nav.rules'), href: '/regole/' },
      { label: t('site.footer.faq'), href: '/faq/' },
      { label: t('site.footer.about'), href: '/chi-siamo/' },
      { label: t('site.footer.privacy'), href: '/privacy/' },
    ],
  },
  {
    title: t('site.footer.guides'),
    links: [
      { label: t('site.footer.g1'), href: '/guida/come-funziona-asta-fantacalcio/' },
      { label: t('site.footer.g2'), href: '/guida/strategie-asta-fantacalcio/' },
      { label: t('site.footer.g3'), href: '/guida/simulatore-asta-fantacalcio/' },
      { label: t('site.footer.g4'), href: '/guida/fantacalcio-stagioni-passate/' },
      { label: t('site.footer.g5'), href: '/guida/bonus-malus-fantacalcio/' },
      { label: t('site.footer.g6'), href: '/top-11/' },
    ],
  },
];
