import { PlayerRole, ROSTER_REQUIREMENTS, Team } from '../../types';
import { useT } from '../../i18n/I18nProvider';
import { CatalogKey } from '../../i18n/translate';
import { TeamBadge } from '../tournament/TeamBadge';

interface MobileAuctionBarProps {
  team: Team;
  role: PlayerRole;
  maxBid: number;
  /** L'utente sta vincendo il lotto: la barra si tinge di giallo */
  leading: boolean;
}

const ROLE_PLURAL: Record<PlayerRole, CatalogKey> = {
  P: 'ui.roles.plural.P',
  D: 'ui.roles.plural.D',
  C: 'ui.roles.plural.C',
  A: 'ui.roles.plural.A',
};

/**
 * Barra appiccicosa sotto la navbar (solo mobile): stemma della squadra,
 * crediti, offerta massima e riempimento del reparto in corso — i dati
 * che nell'asta servono a colpo d'occhio senza scendere alla colonna
 * Squadre.
 */
export function MobileAuctionBar({ team, role, maxBid, leading }: MobileAuctionBarProps) {
  const t = useT();
  const owned = team.roster.filter(o => o.player.role === role).length;
  const stats: [CatalogKey, string, string][] = [
    ['auction.call.credits', String(team.credits), 'text-pitch'],
    ['auction.call.maxBid', String(maxBid), 'text-ink'],
    [ROLE_PLURAL[role], `${owned}/${ROSTER_REQUIREMENTS[role].total}`, 'text-ink'],
  ];

  return (
    <div
      className={`lg:hidden sticky top-[68px] z-20 -mx-4 px-4 py-2 border-b-2 border-ink flex items-center gap-3 ${
        leading ? 'bg-highlight' : 'bg-canvas'
      }`}
    >
      <TeamBadge team={team} size="sm" />
      <div className="flex-1 flex items-center justify-between">
        {stats.map(([label, value, tone]) => (
          <span key={label} className="leading-none">
            <span className="block text-[10px] font-bold uppercase text-ink-muted">{t(label)}</span>
            <span className={`block font-display text-xl font-black tabular-nums leading-none ${tone}`}>{value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
