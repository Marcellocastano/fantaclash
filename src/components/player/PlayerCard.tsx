import { Player } from '../../types';
import { useT } from '../../i18n/I18nProvider';
import { TFunction } from '../../i18n/translate';
import { playerOverall } from '../../services/auction/teamStrength';
import { seasonShort } from '../../services/seasons';
import { splitName } from '../../utils/playerName';
import { Icon } from '../Icon';
import { ROLE_KEY, ROLE_TAG, TIER_CLASSES, TIER_KEY, tierOf } from './tier';

type CardSize = 'sm' | 'lg';

interface PlayerCardProps {
  player: Player;
  size?: CardSize;
  /** Card non disponibile (venduta): desaturata */
  dimmed?: boolean;
  /** Difficile: carta coperta, niente overall/fascia/statistiche */
  covered?: boolean;
  /** Pagine pubbliche (landing, Top 11): niente media voto, al suo posto il valore */
  publicStats?: boolean;
  className?: string;
}

const pct = (x: number | undefined) => (x === undefined ? '-' : `${Math.round(x * 100)}%`);

function stats(player: Player, publicStats: boolean, t: TFunction): { label: string; value: string }[] {
  const mv = publicStats ? { label: t('ui.stats.val'), value: String(player.baseValue) } : { label: t('ui.stats.mv'), value: player.avgRating.toFixed(1) };
  if (player.role === 'P') {
    return [mv, { label: t('ui.stats.inv'), value: pct(player.cleanSheetProbability) }, { label: t('ui.stats.rig'), value: pct(player.penaltySaveProbability) }];
  }
  return [mv, { label: t('ui.stats.gol'), value: pct(player.goalProbability) }, { label: t('ui.stats.ass'), value: pct(player.assistProbability) }];
}

/**
 * Card stile figurina: overall e ruolo in alto, cognome grande, tre numeri.
 * Il colore dipende dalla fascia dell'overall (bronzo, argento, oro,
 * fuoriclasse).
 */
export function PlayerCard({ player, size = 'sm', dimmed = false, publicStats = false, covered = false, className = '' }: PlayerCardProps) {
  const tr = useT();
  const overall = playerOverall(player);
  const tier = tierOf(overall);
  const t = TIER_CLASSES[tier];
  const { surname, firstName } = splitName(player.name);
  const lg = size === 'lg';

  return (
    <div
      className={`relative ${covered ? 'bg-pitch-deep text-canvas' : `${t.bg} ${t.ink}`} border-2 border-ink ${lg ? 'p-5 shadow-block-lg' : 'p-3 shadow-block-sm'} ${
        dimmed ? 'grayscale opacity-50' : ''
      } ${className}`}
    >
      {!covered && tier === 'elite' && <span className={`absolute ${lg ? 'inset-2' : 'inset-1'} border border-tier-elite-ink/60 pointer-events-none`} aria-hidden="true" />}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex flex-col items-start leading-none">
          <span className={`font-display font-black tabular-nums ${lg ? 'text-7xl' : 'text-4xl'} ${covered ? 'text-highlight' : ''}`}>{covered ? player.role : overall}</span>
          {!covered && <span className={`${ROLE_TAG[player.role]} mt-1 ${lg ? '' : '!w-5 !h-5 !text-xs'}`}>{player.role}</span>}
        </div>
        <div className="text-right min-w-0">
          {/* Leggenda: stellina e annata d'origine al posto della fascia */}
          <p className={`font-display font-extrabold leading-none truncate ${lg ? 'text-2xl' : 'text-sm'}`}>
            {player.legend && <Icon name="star" className={`inline-block align-baseline ${lg ? 'w-4 h-4' : 'w-3 h-3'} text-highlight mr-1`} aria-hidden="true" />}
            {player.team}
          </p>
          <p className={`${covered ? 'text-canvas/70' : t.muted} ${lg ? 'text-sm mt-1' : 'text-[11px]'}`}>
            {player.legend
              ? lg ? `${tr(ROLE_KEY[player.role])} · ${player.season}` : seasonShort(player.season)
              : covered
                ? tr(ROLE_KEY[player.role])
                : lg ? `${tr(ROLE_KEY[player.role])} · ${tr(TIER_KEY[tier])}` : tr(TIER_KEY[tier])}
          </p>
        </div>
      </div>

      <div className={lg ? 'relative mt-6' : 'relative mt-3'}>
        {firstName && <p className={`${covered ? 'text-canvas/70' : t.muted} leading-none ${lg ? 'text-lg' : 'text-xs'}`}>{firstName}</p>}
        <p
          className={`font-display font-black leading-[0.9] ${lg ? 'text-6xl md:text-7xl' : 'text-2xl truncate'} ${covered || tier === 'elite' ? 'text-canvas' : ''}`}
          title={player.name}
        >
          {surname}
        </p>
      </div>

      {!covered && (
        <div className={`relative grid grid-cols-3 border-t-2 ${tier === 'elite' ? 'border-canvas/25' : 'border-ink/20'} ${lg ? 'mt-5 pt-3' : 'mt-3 pt-2'}`}>
          {stats(player, publicStats, tr).map(s => (
            <div key={s.label} className="text-center leading-none">
              <span className={`block font-display font-extrabold tabular-nums ${lg ? 'text-3xl' : 'text-lg'} ${tier === 'elite' ? 'text-canvas' : ''}`}>
                {s.value}
              </span>
              <span className={`${t.muted} font-semibold ${lg ? 'text-xs' : 'text-[10px]'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
