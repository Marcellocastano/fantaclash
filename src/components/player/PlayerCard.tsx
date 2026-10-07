import { Player } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';
import { splitName } from '../../utils/playerName';
import { ROLE_NAME, ROLE_TAG, TIER_CLASSES, TIER_LABEL, tierOf } from './tier';

type CardSize = 'sm' | 'lg';

interface PlayerCardProps {
  player: Player;
  size?: CardSize;
  /** Card non disponibile (venduta): desaturata */
  dimmed?: boolean;
  /** Pagine pubbliche (landing, Top 11): niente media voto, al suo posto il valore */
  publicStats?: boolean;
  className?: string;
}

const pct = (x: number | undefined) => (x === undefined ? '-' : `${Math.round(x * 100)}%`);

function stats(player: Player, publicStats: boolean): { label: string; value: string }[] {
  const mv = publicStats ? { label: 'Val', value: String(player.baseValue) } : { label: 'MV', value: player.avgRating.toFixed(1) };
  if (player.role === 'P') {
    return [mv, { label: 'Inv', value: pct(player.cleanSheetProbability) }, { label: 'Rig', value: pct(player.penaltySaveProbability) }];
  }
  return [mv, { label: 'Gol', value: pct(player.goalProbability) }, { label: 'Ass', value: pct(player.assistProbability) }];
}

/**
 * Card stile figurina: overall e ruolo in alto, cognome grande, tre numeri.
 * Il colore dipende dalla fascia dell'overall (bronzo, argento, oro,
 * fuoriclasse).
 */
export function PlayerCard({ player, size = 'sm', dimmed = false, publicStats = false, className = '' }: PlayerCardProps) {
  const overall = playerOverall(player);
  const tier = tierOf(overall);
  const t = TIER_CLASSES[tier];
  const { surname, firstName } = splitName(player.name);
  const lg = size === 'lg';

  return (
    <div
      className={`relative ${t.bg} ${t.ink} border-2 border-ink ${lg ? 'p-5 shadow-block-lg' : 'p-3 shadow-block-sm'} ${
        dimmed ? 'grayscale opacity-50' : ''
      } ${className}`}
    >
      {tier === 'elite' && <span className={`absolute ${lg ? 'inset-2' : 'inset-1'} border border-tier-elite-ink/60 pointer-events-none`} aria-hidden="true" />}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex flex-col items-start leading-none">
          <span className={`font-display font-black tabular-nums ${lg ? 'text-7xl' : 'text-4xl'}`}>{overall}</span>
          <span className={`${ROLE_TAG[player.role]} mt-1 ${lg ? '' : '!w-5 !h-5 !text-xs'}`}>{player.role}</span>
        </div>
        <div className="text-right min-w-0">
          <p className={`font-display font-extrabold leading-none truncate ${lg ? 'text-2xl' : 'text-sm'}`}>{player.team}</p>
          <p className={`${t.muted} ${lg ? 'text-sm mt-1' : 'text-[11px]'}`}>{lg ? `${ROLE_NAME[player.role]} · ${TIER_LABEL[tier]}` : TIER_LABEL[tier]}</p>
        </div>
      </div>

      <div className={lg ? 'relative mt-6' : 'relative mt-3'}>
        {firstName && <p className={`${t.muted} leading-none ${lg ? 'text-lg' : 'text-xs'}`}>{firstName}</p>}
        <p
          className={`font-display font-black leading-[0.9] ${lg ? 'text-6xl md:text-7xl' : 'text-2xl truncate'} ${tier === 'elite' ? 'text-canvas' : ''}`}
          title={player.name}
        >
          {surname}
        </p>
      </div>

      <div className={`relative grid grid-cols-3 border-t-2 ${tier === 'elite' ? 'border-canvas/25' : 'border-ink/20'} ${lg ? 'mt-5 pt-3' : 'mt-3 pt-2'}`}>
        {stats(player, publicStats).map(s => (
          <div key={s.label} className="text-center leading-none">
            <span className={`block font-display font-extrabold tabular-nums ${lg ? 'text-3xl' : 'text-lg'} ${tier === 'elite' ? 'text-canvas' : ''}`}>
              {s.value}
            </span>
            <span className={`${t.muted} font-semibold ${lg ? 'text-xs' : 'text-[10px]'}`}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
