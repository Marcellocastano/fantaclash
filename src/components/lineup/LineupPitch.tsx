import { FORMATIONS } from '../../domain/teams/formations';
import type { Lineup } from '../../domain/teams/formations';
import type { Player } from '../../types';
import { shortName } from '../../utils/playerName';
import { PitchSurface } from '../PitchSurface';
import { ROLE_TAG } from '../player/tier';

export function LineupPitch({ players, lineup, selectedIndex, onSelect, readOnly = false }: {
  players: Player[];
  lineup: Lineup;
  selectedIndex: number;
  onSelect: (index: number) => void;
  readOnly?: boolean;
}) {
  const definition = FORMATIONS[lineup.formation];
  return (
    <PitchSurface orientation="vertical" className="min-h-[500px]">
      <div className="absolute inset-0" aria-label={`Campo modulo ${lineup.formation}`}>
        {definition.layout.map((slot, index) => {
          const player = players.find(candidate => candidate.id === lineup.starters[index]);
          return (
            <button
              key={`${slot.role}-${index}`}
              type="button"
              disabled={readOnly}
              onClick={() => onSelect(index)}
              aria-label={`Posto ${slot.role}: ${player ? shortName(player.name) : 'vuoto'}`}
              aria-pressed={selectedIndex === index}
              className={`absolute flex w-[23%] -translate-x-1/2 -translate-y-1/2 flex-col items-center border-2 border-ink px-1 py-1 text-center shadow-block-sm ${selectedIndex === index ? 'bg-highlight text-on-highlight' : player ? 'bg-canvas text-ink' : 'bg-surface text-ink-muted'}`}
              style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
            >
              <span className={`${ROLE_TAG[slot.role]} !w-5 !h-5 !text-xs`}>{slot.role}</span>
              <span className="mt-1 w-full truncate text-[10px] font-bold leading-tight sm:text-xs">{player ? shortName(player.name) : 'Scegli'}</span>
            </button>
          );
        })}
      </div>
    </PitchSurface>
  );
}
