import { LineupPlayer, MatchResult, MatchSide, PlaybackState } from '../../domain/match';
import { PlayerRole } from '../../types';
import { PitchSurface } from '../PitchSurface';
import { PlayerMatchCard } from './PlayerMatchCard';

const HOME_COLUMNS: PlayerRole[] = ['P', 'D', 'C', 'A'];
const AWAY_COLUMNS: PlayerRole[] = ['A', 'C', 'D', 'P'];

interface PitchViewProps {
  result: MatchResult;
  state: PlaybackState;
}

/**
 * Le due formazioni 1-2-3-2 sul campo, una per metà: casa a sinistra
 * (portiere verso il bordo), ospiti a destra, specchiati.
 */
export function PitchView({ result, state }: PitchViewProps) {
  // Un evento può coinvolgere giocatori di entrambi i lati (parata, autogol)
  const involved = new Set(
    state.latest
      .filter(e => e.type !== 'tactic')
      .flatMap(e => [e.playerId, e.relatedPlayerId])
      .filter(Boolean)
      .flatMap(id => [`home:${id}`, `away:${id}`])
  );
  const perf = new Map(state.performances.map(p => [`${p.side}:${p.playerId}`, p]));

  const column = (side: MatchSide, role: PlayerRole) => {
    const players = result.lineups[side].filter(p => p.role === role);
    return (
      <div key={`${side}-${role}`} className="flex flex-col justify-around gap-2">
        {players.map((p: LineupPlayer) => (
          <PlayerMatchCard
            key={p.playerId}
            player={p}
            performance={perf.get(`${side}:${p.playerId}`)}
            highlighted={involved.has(`${side}:${p.playerId}`)}
            sentOff={state.sentOff.has(p.playerId)}
            showRating={state.tick.index > 0}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <PitchSurface orientation="horizontal" className="min-w-[820px]">
        <div className="absolute inset-0 grid grid-cols-8 gap-3 px-3 py-6">
          {HOME_COLUMNS.map(role => column('home', role))}
          {AWAY_COLUMNS.map(role => column('away', role))}
        </div>
      </PitchSurface>
    </div>
  );
}
