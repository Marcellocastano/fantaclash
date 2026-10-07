/**
 * Link di navigazione del sito (navbar delle pagine pubbliche e footer).
 * Indirizzi assoluti: funzionano da qualsiasi pagina.
 */
export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Come si gioca', href: '/#come-si-gioca' },
  { label: 'Regole', href: '/#regole' },
  { label: 'Guide', href: '/guida/' },
  { label: 'Top 11', href: '/top-11/' },
];

/** Link nel footer: gioco da una parte, guide e pagine dall'altra */
export const FOOTER_LINK_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Il gioco',
    links: [
      { label: 'Come si gioca', href: '/#come-si-gioca' },
      { label: 'Regole', href: '/regole/' },
      { label: 'Domande frequenti', href: '/faq/' },
      { label: 'Chi siamo', href: '/chi-siamo/' },
      { label: 'Privacy', href: '/privacy/' },
    ],
  },
  {
    title: 'Guide',
    links: [
      { label: "Come funziona l'asta del fantacalcio", href: '/guida/come-funziona-asta-fantacalcio/' },
      { label: 'Strategie per l’asta', href: '/guida/strategie-asta-fantacalcio/' },
      { label: 'Simulatore d’asta', href: '/guida/simulatore-asta-fantacalcio/' },
      { label: 'Stagioni storiche', href: '/guida/fantacalcio-stagioni-passate/' },
      { label: 'Bonus e malus', href: '/guida/bonus-malus-fantacalcio/' },
      { label: 'Top 11 delle stagioni', href: '/top-11/' },
    ],
  },
];
