import { Player } from '../../types';
import { useT } from '../../i18n/I18nProvider';
import { playerOverall } from '../../services/auction/teamStrength';
import { seasonShort } from '../../services/seasons';
import { splitName } from '../../utils/playerName';
import { OvrBadge } from './OvrBadge';

interface PlayerRowProps {
  player: Player;
  /** Venduto: a chi e a quanto */
  soldTo?: { team: string; price: number } | null;
  selectable: boolean;
  /** Evidenziato dallo scanner del bot */
  scanning?: boolean;
  /** Scelto dal bot (fine scanner) */
  locked?: boolean;
  /** Difficile: overall, statistiche e valore coperti */
  covered?: boolean;
  onSelect?: () => void;
}

/** Riga "figurina" del listone: overall per fascia, nome, club, numeri */
export function PlayerRow({ player, soldTo, selectable, scanning = false, locked = false, covered = false, onSelect }: PlayerRowProps) {
  const t = useT();
  const { surname, firstName } = splitName(player.name);
  const goalLabel = player.role === 'P' ? t('ui.stats.inv') : t('ui.stats.gol');
  const goalValue = player.role === 'P' ? player.cleanSheetProbability ?? 0 : player.goalProbability;
  const body = (
    <>
      {covered ? (
        <span className="w-12 h-12 shrink-0 inline-flex flex-col items-center justify-center border-2 border-ink leading-none bg-pitch-deep text-highlight">
          <span className="font-display font-black text-2xl">{player.role}</span>
        </span>
      ) : (
        <OvrBadge overall={playerOverall(player)} role={player.role} />
      )}
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline gap-2 min-w-0">
          <span className={`font-display text-2xl font-extrabold leading-none truncate ${soldTo ? 'text-ink-muted line-through decoration-2' : 'text-ink'}`}>
            {surname}
          </span>
          {firstName && <span className="text-sm text-ink-muted truncate hidden sm:inline">{firstName}</span>}
        </span>
        <span className="block text-sm text-ink-soft truncate mt-0.5">
          {soldTo ? (
            <>
              <span className="font-semibold text-ink">{soldTo.team}</span> · {soldTo.price} Cr
            </>
          ) : covered ? (
            <>
              {player.team}
              {player.legend && ` ${seasonShort(player.season)}`}
            </>
          ) : (
            <>
              {player.team}
              {player.legend && ` ${seasonShort(player.season)}`} · {t('ui.stats.mv')} {player.avgRating.toFixed(1)} · {goalLabel} {Math.round(goalValue * 100)}%
            </>
          )}
        </span>
      </span>
      {!covered && (
        <span className="text-right shrink-0 leading-none">
          <span className="block font-display text-2xl font-extrabold tabular-nums text-ink">{player.baseValue}</span>
          <span className="text-xs font-semibold text-ink-muted">{t('ui.stats.value')}</span>
        </span>
      )}
      {selectable && (
        <span className="hidden group-hover:inline-flex group-focus-visible:inline-flex items-center px-3 py-2 bg-pitch text-on-pitch font-display font-extrabold text-lg leading-none border-2 border-ink">
          {t('auction.call.now')}
        </span>
      )}
    </>
  );

  const base = `group w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ${
    locked
      ? 'bg-highlight'
      : scanning
        ? 'motion-safe:animate-sweep bg-highlight/25'
        : selectable
          ? 'hover:bg-pitch/10'
          : ''
  }`;

  return selectable ? (
    <button onClick={onSelect} className={`${base} focus-visible:outline outline-2 outline-offset-[-2px] outline-pitch`}>
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
}
