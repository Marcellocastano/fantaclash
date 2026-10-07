import { Player } from '../../types';
import { playerOverall } from '../../services/auction/teamStrength';
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
  onSelect?: () => void;
}

/** Riga "figurina" del listone: overall per fascia, nome, club, numeri */
export function PlayerRow({ player, soldTo, selectable, scanning = false, locked = false, onSelect }: PlayerRowProps) {
  const { surname, firstName } = splitName(player.name);
  const goalLabel = player.role === 'P' ? 'Inv' : 'Gol';
  const goalValue = player.role === 'P' ? player.cleanSheetProbability ?? 0 : player.goalProbability;
  const body = (
    <>
      <OvrBadge overall={playerOverall(player)} role={player.role} />
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
          ) : (
            <>
              {player.team} · MV {player.avgRating.toFixed(1)} · {goalLabel} {Math.round(goalValue * 100)}%
            </>
          )}
        </span>
      </span>
      <span className="text-right shrink-0 leading-none">
        <span className="block font-display text-2xl font-extrabold tabular-nums text-ink">{player.baseValue}</span>
        <span className="text-xs font-semibold text-ink-muted">valore</span>
      </span>
      {selectable && (
        <span className="hidden group-hover:inline-flex group-focus-visible:inline-flex items-center px-3 py-2 bg-pitch text-on-pitch font-display font-extrabold text-lg leading-none border-2 border-ink">
          Chiama
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
